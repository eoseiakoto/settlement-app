"""
SettleOps Persistent Storage Layer

SQLite-backed storage that aggregates VSS report data across multiple uploads.
Provides merge/deduplication logic for transactions, rates, settlement data,
and tracks upload history for analytics.
"""

import sqlite3
import json
import hashlib
import os
from datetime import datetime
from typing import Dict, List, Optional


# Default database path — inside a 'data' folder relative to this file
DEFAULT_DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
DEFAULT_DB_PATH = os.path.join(DEFAULT_DB_DIR, 'settleops.db')


class SettleOpsStore:
    """Persistent storage for aggregated VSS report data."""

    def __init__(self, db_path: str = None):
        self.db_path = db_path or DEFAULT_DB_PATH
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def _init_db(self):
        """Create tables if they don't exist."""
        conn = self._get_conn()
        try:
            conn.executescript("""
                -- Upload/package history
                CREATE TABLE IF NOT EXISTS packages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    folder_name TEXT,
                    directory TEXT,
                    upload_date TEXT NOT NULL,
                    files_parsed TEXT,       -- JSON array of filenames
                    failed_files TEXT,        -- JSON array of {file, error}
                    file_count INTEGER DEFAULT 0,
                    transaction_count INTEGER DEFAULT 0,
                    rate_count INTEGER DEFAULT 0,
                    fingerprint TEXT UNIQUE   -- hash of parsed filenames to detect re-uploads
                );

                -- Transactions (EP-705, EP-707, EP-727)
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    package_id INTEGER REFERENCES packages(id),
                    report_type TEXT NOT NULL,  -- 'ep_705', 'ep_707', 'ep_727'
                    dedup_key TEXT UNIQUE,       -- hash for deduplication
                    data TEXT NOT NULL,          -- full transaction JSON
                    purchase_date TEXT,
                    destination_amount REAL,
                    destination_currency TEXT,
                    merchant_name TEXT,
                    merchant_country TEXT,
                    txn_type TEXT               -- 'sale', 'cash_disbursement', 'reversal'
                );

                -- Currency rates (EP-756)
                CREATE TABLE IF NOT EXISTS currency_rates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    package_id INTEGER REFERENCES packages(id),
                    dedup_key TEXT UNIQUE,
                    data TEXT NOT NULL
                );

                -- Settlement reports (EP-746, EP-747) — stored per-package
                CREATE TABLE IF NOT EXISTS settlement_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    package_id INTEGER REFERENCES packages(id),
                    report_type TEXT NOT NULL,  -- 'ep_746', 'ep_747'
                    data TEXT NOT NULL
                );

                -- Summary reports (EP-210 series, EP-220) — stored per-package
                CREATE TABLE IF NOT EXISTS summary_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    package_id INTEGER REFERENCES packages(id),
                    report_type TEXT NOT NULL,
                    data TEXT NOT NULL
                );

                -- Misc reports (EP-750, EP-999) — stored per-package
                CREATE TABLE IF NOT EXISTS misc_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    package_id INTEGER REFERENCES packages(id),
                    report_type TEXT NOT NULL,
                    data TEXT NOT NULL
                );

                -- Raw data (AD3103) — stored per-package
                CREATE TABLE IF NOT EXISTS raw_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    package_id INTEGER REFERENCES packages(id),
                    report_type TEXT NOT NULL,
                    data TEXT NOT NULL
                );

                -- Create indexes for common queries
                CREATE INDEX IF NOT EXISTS idx_txn_type ON transactions(txn_type);
                CREATE INDEX IF NOT EXISTS idx_txn_currency ON transactions(destination_currency);
                CREATE INDEX IF NOT EXISTS idx_txn_country ON transactions(merchant_country);
                CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(purchase_date);
                CREATE INDEX IF NOT EXISTS idx_txn_package ON transactions(package_id);
            """)
            conn.commit()
        finally:
            conn.close()

    # ========================================================================
    # DEDUPLICATION HELPERS
    # ========================================================================

    @staticmethod
    def _transaction_dedup_key(txn: dict, report_type: str) -> str:
        """
        Generate a deduplication key for a transaction.

        Uses a combination of fields that uniquely identify a transaction:
        - acquirer_ref_number (ARN) is the primary unique ID in Visa systems
        - Falls back to transaction_id + amount + date + merchant for non-ARN cases
        """
        arn = txn.get('acquirer_ref_number', '').strip()
        if arn:
            raw = f"{report_type}:{arn}"
        else:
            # Fallback composite key
            tid = txn.get('transaction_id', '')
            amt = txn.get('destination_amount', txn.get('destination_amount_numeric', ''))
            date = txn.get('purchase_date', '')
            merchant = txn.get('merchant_name', '')
            acct = txn.get('account_number', '')
            raw = f"{report_type}:{tid}:{amt}:{date}:{merchant}:{acct}"
        return hashlib.sha256(raw.encode()).hexdigest()

    @staticmethod
    def _rate_dedup_key(rate: dict) -> str:
        """Generate dedup key for a currency rate entry."""
        # EP-756 fields: counter_currency, base_currency, buy_rate, sell_rate, rate_number
        counter = rate.get('counter_currency', '')
        base = rate.get('base_currency', '')
        buy = rate.get('buy_rate', '')
        sell = rate.get('sell_rate', '')
        raw = f"{counter}:{base}:{buy}:{sell}"
        return hashlib.sha256(raw.encode()).hexdigest()

    @staticmethod
    def _package_fingerprint(parsed_files: list, directory: str) -> str:
        """Generate a fingerprint for a package to detect re-uploads."""
        # Sort files for consistent hashing
        sorted_files = sorted(parsed_files)
        # Include directory basename (package folder name) for uniqueness
        folder = os.path.basename(directory) if directory else ''
        raw = f"{folder}:{','.join(sorted_files)}"
        return hashlib.sha256(raw.encode()).hexdigest()

    # ========================================================================
    # MERGE / INGEST
    # ========================================================================

    def ingest_package(self, parsed_result: dict) -> dict:
        """
        Ingest a parsed VSS package into the persistent store.

        Merges new data with existing data, deduplicating transactions and rates.

        Args:
            parsed_result: Output from parse_package()

        Returns:
            dict with ingest stats: new_transactions, duplicate_transactions, etc.
        """
        conn = self._get_conn()
        stats = {
            'new_transactions': 0,
            'duplicate_transactions': 0,
            'new_rates': 0,
            'duplicate_rates': 0,
            'package_id': None,
            'is_reupload': False,
        }

        try:
            pkg_info = parsed_result.get('package_info', {})
            parsed_files = pkg_info.get('parsed_files', [])
            failed_files = pkg_info.get('failed_files', [])
            directory = pkg_info.get('directory', '')

            # Check for re-upload via fingerprint
            fingerprint = self._package_fingerprint(parsed_files, directory)
            existing = conn.execute(
                "SELECT id FROM packages WHERE fingerprint = ?", (fingerprint,)
            ).fetchone()

            if existing:
                stats['is_reupload'] = True
                stats['package_id'] = existing['id']
                # Still merge — in case data was partially loaded before
                pkg_id = existing['id']
            else:
                # Insert new package record
                folder_name = os.path.basename(directory) if directory else ''
                cursor = conn.execute(
                    """INSERT INTO packages
                       (folder_name, directory, upload_date, files_parsed, failed_files, file_count)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        folder_name,
                        directory,
                        datetime.now().isoformat(),
                        json.dumps(parsed_files),
                        json.dumps(failed_files, default=str),
                        len(parsed_files),
                    )
                )
                pkg_id = cursor.lastrowid
                stats['package_id'] = pkg_id

            # ----- Transactions -----
            txn_reports = parsed_result.get('transaction_reports', {})
            type_map = {
                'ep_705': 'sale',
                'ep_707': 'cash_disbursement',
                'ep_727': 'reversal',
            }
            for report_key in ['ep_705', 'ep_707', 'ep_727']:
                report = txn_reports.get(report_key)
                if report and 'transactions' in report:
                    for txn in report['transactions']:
                        dedup = self._transaction_dedup_key(txn, report_key)
                        try:
                            conn.execute(
                                """INSERT INTO transactions
                                   (package_id, report_type, dedup_key, data,
                                    purchase_date, destination_amount, destination_currency,
                                    merchant_name, merchant_country, txn_type)
                                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                                (
                                    pkg_id,
                                    report_key,
                                    dedup,
                                    json.dumps(txn, default=str),
                                    txn.get('purchase_date', ''),
                                    txn.get('destination_amount_numeric', 0),
                                    txn.get('destination_currency', ''),
                                    txn.get('merchant_name', ''),
                                    txn.get('merchant_country', ''),
                                    type_map.get(report_key, 'unknown'),
                                )
                            )
                            stats['new_transactions'] += 1
                        except sqlite3.IntegrityError:
                            # Duplicate — skip
                            stats['duplicate_transactions'] += 1

            # ----- Currency Rates (EP-756) -----
            misc = parsed_result.get('misc_reports', {})
            ep756 = misc.get('ep_756')
            if ep756 and isinstance(ep756, dict):
                rates = ep756.get('rates', [])
                for rate in rates:
                    dedup = self._rate_dedup_key(rate)
                    try:
                        conn.execute(
                            "INSERT INTO currency_rates (package_id, dedup_key, data) VALUES (?, ?, ?)",
                            (pkg_id, dedup, json.dumps(rate, default=str))
                        )
                        stats['new_rates'] += 1
                    except sqlite3.IntegrityError:
                        stats['duplicate_rates'] += 1

            # ----- Settlement Reports (EP-746, EP-747) -----
            settlement = parsed_result.get('settlement_reports', {})
            for rtype in ['ep_746', 'ep_747']:
                data = settlement.get(rtype)
                if data:
                    # Store per-package (don't dedup — each package may have different settlement)
                    # But avoid duplicate for same package
                    existing_sr = conn.execute(
                        "SELECT id FROM settlement_reports WHERE package_id = ? AND report_type = ?",
                        (pkg_id, rtype)
                    ).fetchone()
                    if not existing_sr:
                        conn.execute(
                            "INSERT INTO settlement_reports (package_id, report_type, data) VALUES (?, ?, ?)",
                            (pkg_id, rtype, json.dumps(data, default=str))
                        )

            # ----- Summary Reports (EP-210 series, EP-220) -----
            summaries = parsed_result.get('summary_reports', {})
            for rtype, data in summaries.items():
                if data:
                    existing_sm = conn.execute(
                        "SELECT id FROM summary_reports WHERE package_id = ? AND report_type = ?",
                        (pkg_id, rtype)
                    ).fetchone()
                    if not existing_sm:
                        conn.execute(
                            "INSERT INTO summary_reports (package_id, report_type, data) VALUES (?, ?, ?)",
                            (pkg_id, rtype, json.dumps(data, default=str))
                        )

            # ----- Misc Reports (EP-750, EP-999) -----
            for rtype in ['ep_750', 'ep_999']:
                data = misc.get(rtype)
                if data:
                    existing_mr = conn.execute(
                        "SELECT id FROM misc_reports WHERE package_id = ? AND report_type = ?",
                        (pkg_id, rtype)
                    ).fetchone()
                    if not existing_mr:
                        conn.execute(
                            "INSERT INTO misc_reports (package_id, report_type, data) VALUES (?, ?, ?)",
                            (pkg_id, rtype, json.dumps(data, default=str))
                        )

            # ----- Raw Data (AD3103) -----
            raw = parsed_result.get('raw_data', {})
            ad3103 = raw.get('ad3103')
            if ad3103:
                existing_rd = conn.execute(
                    "SELECT id FROM raw_data WHERE package_id = ? AND report_type = ?",
                    (pkg_id, 'ad3103')
                ).fetchone()
                if not existing_rd:
                    conn.execute(
                        "INSERT INTO raw_data (package_id, report_type, data) VALUES (?, ?, ?)",
                        (pkg_id, 'ad3103', json.dumps(ad3103, default=str))
                    )

            # Update package stats
            conn.execute(
                "UPDATE packages SET transaction_count = ?, rate_count = ? WHERE id = ?",
                (stats['new_transactions'], stats['new_rates'], pkg_id)
            )

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return stats

    # ========================================================================
    # READ / QUERY — builds the same dict shape the API routes expect
    # ========================================================================

    def get_all_data(self) -> dict:
        """
        Load all aggregated data from the database into the same dict structure
        that the API routes expect (matching parse_package output shape).

        This is used to populate the in-memory data_store on startup and after uploads.
        """
        conn = self._get_conn()
        try:
            result = {
                'package_info': self._build_package_info(conn),
                'transaction_reports': self._build_transaction_reports(conn),
                'summary_reports': self._build_summary_reports(conn),
                'settlement_reports': self._build_settlement_reports(conn),
                'misc_reports': self._build_misc_reports(conn),
                'raw_data': self._build_raw_data(conn),
            }
            return result
        finally:
            conn.close()

    def _build_package_info(self, conn) -> dict:
        """Aggregate package info across all uploads."""
        packages = conn.execute(
            "SELECT * FROM packages ORDER BY upload_date DESC"
        ).fetchall()

        all_parsed = []
        all_failed = []
        total_files = 0
        directory = ''

        for pkg in packages:
            parsed = json.loads(pkg['files_parsed'] or '[]')
            failed = json.loads(pkg['failed_files'] or '[]')
            all_parsed.extend(parsed)
            all_failed.extend(failed)
            total_files += pkg['file_count'] or 0
            if not directory:
                directory = pkg['directory'] or ''

        return {
            'directory': directory,
            'parsed_files': all_parsed,
            'failed_files': all_failed,
            'total_packages': len(packages),
            'total_files': total_files,
        }

    def _build_transaction_reports(self, conn) -> dict:
        """Build transaction_reports dict from all stored transactions."""
        reports = {'ep_705': None, 'ep_707': None, 'ep_727': None}

        for rtype in ['ep_705', 'ep_707', 'ep_727']:
            rows = conn.execute(
                "SELECT data FROM transactions WHERE report_type = ? ORDER BY id",
                (rtype,)
            ).fetchall()
            if rows:
                txns = [json.loads(r['data']) for r in rows]
                reports[rtype] = {'transactions': txns}

        return reports

    def _build_summary_reports(self, conn) -> dict:
        """Build summary_reports — uses latest per report type."""
        result = {}
        rows = conn.execute(
            """SELECT report_type, data FROM summary_reports
               WHERE id IN (SELECT MAX(id) FROM summary_reports GROUP BY report_type)"""
        ).fetchall()
        for row in rows:
            result[row['report_type']] = json.loads(row['data'])
        return result

    def _build_settlement_reports(self, conn) -> dict:
        """Build settlement_reports — uses latest per report type."""
        result = {'ep_746': None, 'ep_747': None}
        rows = conn.execute(
            """SELECT report_type, data FROM settlement_reports
               WHERE id IN (SELECT MAX(id) FROM settlement_reports GROUP BY report_type)"""
        ).fetchall()
        for row in rows:
            result[row['report_type']] = json.loads(row['data'])
        return result

    def _build_misc_reports(self, conn) -> dict:
        """Build misc_reports — rates are aggregated, others use latest."""
        result = {'ep_750': None, 'ep_756': None, 'ep_999': None}

        # EP-756: aggregate all rates
        rate_rows = conn.execute(
            "SELECT data FROM currency_rates ORDER BY id"
        ).fetchall()
        if rate_rows:
            all_rates = [json.loads(r['data']) for r in rate_rows]
            result['ep_756'] = {'rates': all_rates}

        # EP-750, EP-999: use latest
        for rtype in ['ep_750', 'ep_999']:
            row = conn.execute(
                "SELECT data FROM misc_reports WHERE report_type = ? ORDER BY id DESC LIMIT 1",
                (rtype,)
            ).fetchone()
            if row:
                result[rtype] = json.loads(row['data'])

        return result

    def _build_raw_data(self, conn) -> dict:
        """Build raw_data — uses latest."""
        result = {'ad3103': None}
        row = conn.execute(
            "SELECT data FROM raw_data WHERE report_type = 'ad3103' ORDER BY id DESC LIMIT 1"
        ).fetchone()
        if row:
            result['ad3103'] = json.loads(row['data'])
        return result

    # ========================================================================
    # PACKAGE HISTORY
    # ========================================================================

    def get_packages(self, from_date=None, to_date=None) -> list:
        """Get list of uploaded packages with metadata, optionally filtered by date range."""
        conn = self._get_conn()
        try:
            query = "SELECT * FROM packages WHERE 1=1"
            params = []
            if from_date:
                query += " AND upload_date >= ?"
                params.append(from_date)
            if to_date:
                query += " AND upload_date <= ?"
                params.append(to_date + 'T23:59:59')
            query += " ORDER BY upload_date DESC"
            rows = conn.execute(query, params).fetchall()
            packages = []
            for row in rows:
                packages.append({
                    'id': row['id'],
                    'folder_name': row['folder_name'],
                    'directory': row['directory'],
                    'upload_date': row['upload_date'],
                    'files_parsed': json.loads(row['files_parsed'] or '[]'),
                    'failed_files': json.loads(row['failed_files'] or '[]'),
                    'file_count': row['file_count'],
                    'transaction_count': row['transaction_count'],
                    'rate_count': row['rate_count'],
                })
            return packages
        finally:
            conn.close()

    def get_stats(self) -> dict:
        """Get overall database statistics."""
        conn = self._get_conn()
        try:
            txn_count = conn.execute("SELECT COUNT(*) as c FROM transactions").fetchone()['c']
            rate_count = conn.execute("SELECT COUNT(*) as c FROM currency_rates").fetchone()['c']
            pkg_count = conn.execute("SELECT COUNT(*) as c FROM packages").fetchone()['c']
            return {
                'total_transactions': txn_count,
                'total_rates': rate_count,
                'total_packages': pkg_count,
            }
        finally:
            conn.close()

    def delete_package(self, pkg_id: int) -> dict:
        """Delete a package and all its associated data (cascade)."""
        conn = self._get_conn()
        try:
            pkg = conn.execute("SELECT id, folder_name FROM packages WHERE id = ?", (pkg_id,)).fetchone()
            if not pkg:
                return {'deleted': False, 'error': 'Package not found'}
            for table in ['transactions', 'currency_rates', 'settlement_reports',
                          'summary_reports', 'misc_reports', 'raw_data']:
                conn.execute(f"DELETE FROM {table} WHERE package_id = ?", (pkg_id,))
            conn.execute("DELETE FROM packages WHERE id = ?", (pkg_id,))
            conn.commit()
            return {'deleted': True, 'package_id': pkg_id, 'folder_name': pkg['folder_name']}
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def cleanup_duplicate_packages(self) -> dict:
        """Remove duplicate packages, keeping the earliest per fingerprint.
        Also removes packages with NULL fingerprint and 0 transactions."""
        conn = self._get_conn()
        try:
            deleted_count = 0
            # Find fingerprints with multiple packages — keep earliest (lowest ID)
            dupes = conn.execute("""
                SELECT fingerprint, MIN(id) as keep_id, COUNT(*) as cnt
                FROM packages WHERE fingerprint IS NOT NULL
                GROUP BY fingerprint HAVING COUNT(*) > 1
            """).fetchall()
            for row in dupes:
                to_delete = conn.execute(
                    "SELECT id FROM packages WHERE fingerprint = ? AND id != ?",
                    (row['fingerprint'], row['keep_id'])
                ).fetchall()
                for pkg in to_delete:
                    for table in ['transactions', 'currency_rates', 'settlement_reports',
                                  'summary_reports', 'misc_reports', 'raw_data']:
                        conn.execute(f"DELETE FROM {table} WHERE package_id = ?", (pkg['id'],))
                    conn.execute("DELETE FROM packages WHERE id = ?", (pkg['id'],))
                    deleted_count += 1
            # Remove orphaned packages with no fingerprint and 0 transactions/rates
            empty = conn.execute(
                "SELECT id FROM packages WHERE fingerprint IS NULL AND transaction_count = 0 AND rate_count = 0"
            ).fetchall()
            for pkg in empty:
                for table in ['transactions', 'currency_rates', 'settlement_reports',
                              'summary_reports', 'misc_reports', 'raw_data']:
                    conn.execute(f"DELETE FROM {table} WHERE package_id = ?", (pkg['id'],))
                conn.execute("DELETE FROM packages WHERE id = ?", (pkg['id'],))
                deleted_count += 1
            conn.commit()
            remaining = conn.execute("SELECT COUNT(*) as c FROM packages").fetchone()['c']
            return {'deleted_packages': deleted_count, 'remaining_packages': remaining}
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def clear_all(self):
        """Clear all data (for testing or reset)."""
        conn = self._get_conn()
        try:
            for table in ['transactions', 'currency_rates', 'settlement_reports',
                          'summary_reports', 'misc_reports', 'raw_data', 'packages']:
                conn.execute(f"DELETE FROM {table}")
            conn.commit()
        finally:
            conn.close()


# Singleton instance
_store = None


def get_store(db_path: str = None) -> SettleOpsStore:
    """Get or create the singleton store instance."""
    global _store
    if _store is None:
        _store = SettleOpsStore(db_path)
    return _store
