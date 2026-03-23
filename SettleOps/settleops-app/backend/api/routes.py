"""
SettleOps API Routes
Handles all endpoints for the SettleOps platform, working with real parsed data
from the Visa Edit Package parser engine.

Data is persisted in SQLite and aggregated across multiple uploads.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime

api = Blueprint('api', __name__, url_prefix='/api')

# In-memory data store - acts as a READ CACHE backed by SQLite
# Populated on startup from persistent storage and refreshed after each upload
data_store = {}


def _refresh_data_store():
    """Reload data_store from persistent SQLite database."""
    from storage import get_store
    store = get_store()
    fresh = store.get_all_data()
    data_store.clear()
    data_store.update(fresh)


def _get_all_transactions():
    """Collect all transactions from parsed EP reports into a flat list."""
    txns = []
    tr = data_store.get('transaction_reports', {})

    for report_key in ['ep_705', 'ep_707', 'ep_727']:
        report = tr.get(report_key)
        if report and 'transactions' in report:
            for t in report['transactions']:
                txns.append(t)
    return txns


def _get_settlement_data():
    """Get settlement data from EP-746 and EP-747."""
    sr = data_store.get('settlement_reports', {})
    return {
        'ep_746': sr.get('ep_746'),
        'ep_747': sr.get('ep_747'),
    }


def _get_summary_reports():
    """Get summary/control reports."""
    return data_store.get('summary_reports', {})


def _get_misc_reports():
    """Get miscellaneous reports (rates, index, text messages)."""
    return data_store.get('misc_reports', {})


# ============================================================================
# HEALTH & INFO
# ============================================================================

@api.route('/health', methods=['GET'])
def health():
    from storage import get_store
    store = get_store()
    stats = store.get_stats()
    pkg = data_store.get('package_info', {})
    return jsonify({
        'status': 'ok',
        'data_loaded': stats['total_transactions'] > 0,
        'total_transactions': stats['total_transactions'],
        'total_packages': stats['total_packages'],
        'total_rates': stats['total_rates'],
        'files_parsed': len(pkg.get('parsed_files', [])),
    })


# ============================================================================
# PACKAGES
# ============================================================================

@api.route('/packages', methods=['GET'])
def list_packages():
    from storage import get_store
    store = get_store()
    packages = store.get_packages()
    return jsonify(packages)


@api.route('/packages/<int:pkg_id>', methods=['GET'])
def get_package(pkg_id):
    from storage import get_store
    store = get_store()
    packages = store.get_packages()
    for p in packages:
        if p['id'] == pkg_id:
            return jsonify(p)
    return jsonify({'error': 'Package not found'}), 404


# ============================================================================
# UPLOAD
# ============================================================================

@api.route('/upload', methods=['POST'])
def upload_reports():
    """Upload VSS report files and parse them as a package.

    Now uses persistent storage with merge/deduplication instead of replacing data.
    """
    import os, tempfile, shutil

    try:
        # Accept either file uploads or a JSON path
        if request.files:
            # File upload mode
            files = request.files.getlist('files')
            if not files or all(f.filename == '' for f in files):
                return jsonify({'error': 'No files provided'}), 400

            # Save uploaded files to a temp directory
            upload_dir = tempfile.mkdtemp(prefix='settleops_upload_')
            saved_files = []
            for f in files:
                if f.filename:
                    safe_name = os.path.basename(f.filename)
                    dest = os.path.join(upload_dir, safe_name)
                    f.save(dest)
                    saved_files.append(safe_name)

            if not saved_files:
                shutil.rmtree(upload_dir, ignore_errors=True)
                return jsonify({'error': 'No valid files uploaded'}), 400

            parse_path = upload_dir
        else:
            # JSON path mode (backward compatible)
            body = request.get_json(silent=True) or {}
            path = body.get('path', '')
            if not path:
                return jsonify({'error': 'No path or files provided'}), 400
            if not os.path.isdir(path):
                return jsonify({'error': f'Directory not found: {path}'}), 404
            parse_path = path
            saved_files = os.listdir(path)

        # Parse the package
        from parsers.package_parser import parse_package
        result = parse_package(parse_path)

        # Ingest into persistent storage (merge + deduplicate)
        from storage import get_store
        store = get_store()
        ingest_stats = store.ingest_package(result)

        # Refresh the in-memory cache from the database
        _refresh_data_store()

        # Gather summary stats from the FULL aggregated data
        all_txns = _get_all_transactions()
        all_rates = data_store.get('misc_reports', {}).get('ep_756', {})
        rate_count = len(all_rates.get('rates', [])) if isinstance(all_rates, dict) else 0

        return jsonify({
            'status': 'parsed',
            'files_uploaded': len(saved_files),
            'files_parsed': len(result.get('package_info', {}).get('parsed_files', [])),
            'new_transactions': ingest_stats['new_transactions'],
            'duplicate_transactions': ingest_stats['duplicate_transactions'],
            'total_transactions': len(all_txns),
            'currency_rates': rate_count,
            'is_reupload': ingest_stats['is_reupload'],
            'package_id': ingest_stats['package_id'],
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# TRANSACTIONS
# ============================================================================

@api.route('/transactions', methods=['GET'])
def list_transactions():
    """List transactions with filtering and pagination."""
    txns = _get_all_transactions()

    # Filters
    txn_type = request.args.get('type', '')
    currency = request.args.get('currency', '')
    country = request.args.get('country', '')
    merchant = request.args.get('merchant', '')
    min_amount = request.args.get('min_amount', type=float)
    max_amount = request.args.get('max_amount', type=float)

    if txn_type:
        txns = [t for t in txns if t.get('type', '').lower() == txn_type.lower()]
    if currency:
        txns = [t for t in txns if t.get('destination_currency', '') == currency or t.get('source_currency', '') == currency]
    if country:
        txns = [t for t in txns if t.get('merchant_country', '').upper() == country.upper()]
    if merchant:
        txns = [t for t in txns if merchant.lower() in t.get('merchant_name', '').lower()]
    if min_amount is not None:
        txns = [t for t in txns if (t.get('destination_amount_numeric') or 0) >= min_amount]
    if max_amount is not None:
        txns = [t for t in txns if (t.get('destination_amount_numeric') or 0) <= max_amount]

    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    per_page = min(per_page, 500)

    total = len(txns)
    start = (page - 1) * per_page
    end = start + per_page
    page_txns = txns[start:end]

    return jsonify({
        'transactions': page_txns,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page if per_page else 0,
        }
    })


@api.route('/transactions/<int:txn_idx>', methods=['GET'])
def get_transaction(txn_idx):
    txns = _get_all_transactions()
    if 0 <= txn_idx < len(txns):
        return jsonify(txns[txn_idx])
    return jsonify({'error': 'Transaction not found'}), 404


@api.route('/transactions/summary', methods=['GET'])
def transaction_summary():
    """Aggregated transaction summary."""
    txns = _get_all_transactions()

    summary = {
        'total_count': len(txns),
        'by_type': {},
        'by_currency': {},
        'by_country': {},
        'total_destination_amount': 0,
        'total_source_amount': 0,
    }

    for t in txns:
        # By type
        ttype = t.get('type', 'unknown')
        if ttype not in summary['by_type']:
            summary['by_type'][ttype] = {'count': 0, 'total_amount': 0}
        summary['by_type'][ttype]['count'] += 1
        summary['by_type'][ttype]['total_amount'] += t.get('destination_amount_numeric', 0) or 0

        # By currency
        curr = t.get('destination_currency', 'unknown')
        if curr not in summary['by_currency']:
            summary['by_currency'][curr] = {'count': 0, 'total_amount': 0}
        summary['by_currency'][curr]['count'] += 1
        summary['by_currency'][curr]['total_amount'] += t.get('destination_amount_numeric', 0) or 0

        # By country
        country = t.get('merchant_country', 'unknown')
        if country not in summary['by_country']:
            summary['by_country'][country] = {'count': 0, 'total_amount': 0}
        summary['by_country'][country]['count'] += 1
        summary['by_country'][country]['total_amount'] += t.get('destination_amount_numeric', 0) or 0

        # Totals
        summary['total_destination_amount'] += t.get('destination_amount_numeric', 0) or 0
        summary['total_source_amount'] += t.get('source_amount_numeric', 0) or 0

    return jsonify(summary)


# ============================================================================
# SETTLEMENT
# ============================================================================

@api.route('/settlement', methods=['GET'])
def settlement_overview():
    sdata = _get_settlement_data()
    result = {}

    ep746 = sdata.get('ep_746')
    if ep746:
        result['ep_746'] = {
            'record_count': len(ep746) if isinstance(ep746, list) else len(ep746.get('records', [])),
            'data': ep746,
        }

    ep747 = sdata.get('ep_747')
    if ep747:
        result['ep_747'] = ep747

    return jsonify(result)


@api.route('/settlement/hierarchy', methods=['GET'])
def settlement_hierarchy():
    """Get VSS-100-W settlement reporting hierarchy from EP-747."""
    ep747 = data_store.get('settlement_reports', {}).get('ep_747', {})
    if isinstance(ep747, dict):
        hierarchy = ep747.get('vss_100_w') or ep747.get('hierarchy') or ep747.get('reports', {}).get('VSS-100-W')
        if hierarchy:
            return jsonify(hierarchy)
    return jsonify({'message': 'No hierarchy data available', 'raw': ep747})


@api.route('/settlement/interchange', methods=['GET'])
def settlement_interchange():
    """Get VSS-120 Interchange Value data."""
    ep747 = data_store.get('settlement_reports', {}).get('ep_747', {})
    if isinstance(ep747, dict):
        interchange = ep747.get('vss_120') or ep747.get('reports', {}).get('VSS-120')
        if interchange:
            return jsonify(interchange)
    return jsonify({'message': 'No interchange data available'})


@api.route('/settlement/fees', methods=['GET'])
def settlement_fees():
    """Get fee breakdowns (VSS-130, VSS-140, VSS-210)."""
    ep747 = data_store.get('settlement_reports', {}).get('ep_747', {})
    fees = {}
    if isinstance(ep747, dict):
        reports = ep747.get('reports', ep747)
        for key in ['VSS-130', 'VSS-140', 'VSS-210', 'VSS-215', 'vss_130', 'vss_140', 'vss_210']:
            if key in reports:
                fees[key] = reports[key]
    return jsonify(fees)


@api.route('/settlement/reconciliation', methods=['GET'])
def settlement_reconciliation():
    """Get VSS-900 series reconciliation data."""
    ep747 = data_store.get('settlement_reports', {}).get('ep_747', {})
    recon = {}
    if isinstance(ep747, dict):
        reports = ep747.get('reports', ep747)
        for key in reports:
            if 'VSS-900' in str(key) or 'vss_900' in str(key) or 'reconciliation' in str(key).lower():
                recon[key] = reports[key]
    return jsonify(recon)


# ============================================================================
# CONTROL & OPERATIONS
# ============================================================================

@api.route('/control/batch-summary', methods=['GET'])
def batch_summary():
    """Batch/file/run summaries from EP-210 series."""
    sr = _get_summary_reports()
    result = {}
    for key in ['ep_210b', 'ep_210c', 'ep_210d', 'ep_210e', 'ep_210f']:
        if sr.get(key):
            result[key] = sr[key]
    return jsonify(result)


@api.route('/control/reconciliation', methods=['GET'])
def control_reconciliation():
    """Collected reconciliation from EP-220."""
    sr = _get_summary_reports()
    return jsonify(sr.get('ep_220') or {'message': 'No EP-220 data'})


@api.route('/control/index', methods=['GET'])
def report_index():
    """Report index from EP-999."""
    mr = _get_misc_reports()
    return jsonify(mr.get('ep_999') or {'message': 'No EP-999 data'})


@api.route('/control/currency-rates', methods=['GET'])
def currency_rates():
    """Currency conversion rates from EP-756."""
    mr = _get_misc_reports()
    return jsonify(mr.get('ep_756') or {'message': 'No EP-756 data'})


@api.route('/control/market-rates', methods=['GET'])
def market_rates():
    """Proxy live market exchange rates.

    Uses open.er-api.com (160+ currencies including GHS, NGN, KES etc.)
    with Frankfurter/ECB as fallback.

    Query params:
        base: base currency (default USD)
        symbols: comma-separated target currencies (optional, for filtering response)
    """
    import urllib.request, json as _json

    base = request.args.get('base', 'USD')
    symbols = request.args.get('symbols', '')

    # Primary: open.er-api.com — free, 160+ currencies, daily updates
    try:
        url = f'https://open.er-api.com/v6/latest/{base}'
        req = urllib.request.Request(url, headers={'User-Agent': 'SettleOps/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = _json.loads(resp.read().decode())
        if data.get('result') == 'success':
            rates = data.get('rates', {})
            # Filter by symbols if requested
            if symbols:
                wanted = set(s.strip().upper() for s in symbols.split(','))
                rates = {k: v for k, v in rates.items() if k in wanted}
            return jsonify({
                'base': data.get('base_code', base),
                'date': data.get('time_last_update_utc', ''),
                'source': 'Open Exchange Rates',
                'rates': rates,
            })
    except Exception:
        pass

    # Fallback: Frankfurter (ECB) — fewer currencies but highly reliable
    try:
        url2 = f'https://api.frankfurter.dev/v1/latest?base={base}'
        if symbols:
            url2 += f'&symbols={symbols}'
        req2 = urllib.request.Request(url2, headers={'User-Agent': 'SettleOps/1.0'})
        with urllib.request.urlopen(req2, timeout=10) as resp2:
            data2 = _json.loads(resp2.read().decode())
        data2['source'] = 'ECB (Frankfurter)'
        return jsonify(data2)
    except Exception as e2:
        return jsonify({
            'error': f'Could not fetch market rates: {str(e2)}',
            'base': base,
            'rates': {}
        }), 502


# ============================================================================
# DASHBOARD (AGGREGATED)
# ============================================================================

@api.route('/dashboard', methods=['GET'])
def dashboard():
    """Main dashboard data combining key metrics from all reports."""
    txns = _get_all_transactions()
    pkg = data_store.get('package_info', {})

    # Count by type
    sales_count = sum(1 for t in txns if t.get('type') == 'sale')
    cash_count = sum(1 for t in txns if t.get('type') == 'cash_disbursement')
    reversal_count = sum(1 for t in txns if t.get('type') == 'reversal')

    # Amounts by type
    sales_amount = sum(t.get('destination_amount_numeric', 0) or 0 for t in txns if t.get('type') == 'sale')
    cash_amount = sum(t.get('destination_amount_numeric', 0) or 0 for t in txns if t.get('type') == 'cash_disbursement')
    reversal_amount = sum(t.get('destination_amount_numeric', 0) or 0 for t in txns if t.get('type') == 'reversal')

    # Currency breakdown
    by_currency = {}
    for t in txns:
        curr = t.get('destination_currency', 'unknown')
        if curr not in by_currency:
            by_currency[curr] = {'count': 0, 'amount': 0}
        by_currency[curr]['count'] += 1
        by_currency[curr]['amount'] += t.get('destination_amount_numeric', 0) or 0

    # Country breakdown
    by_country = {}
    for t in txns:
        country = t.get('merchant_country', 'unknown')
        if country not in by_country:
            by_country[country] = {'count': 0, 'amount': 0}
        by_country[country]['count'] += 1
        by_country[country]['amount'] += t.get('destination_amount_numeric', 0) or 0

    # Recent transactions (last 20)
    recent = txns[-20:] if len(txns) > 20 else txns

    # Settlement info
    ep747 = data_store.get('settlement_reports', {}).get('ep_747', {})
    ep756 = _get_misc_reports().get('ep_756', {})
    ep999 = _get_misc_reports().get('ep_999', {})

    return jsonify({
        'package': {
            'directory': pkg.get('directory', ''),
            'files_parsed': len(pkg.get('parsed_files', [])),
            'failed_files': len(pkg.get('failed_files', [])),
            'total_packages': pkg.get('total_packages', 0),
        },
        'transactions': {
            'total': len(txns),
            'sales': {'count': sales_count, 'amount': round(sales_amount, 2)},
            'cash_disbursements': {'count': cash_count, 'amount': round(cash_amount, 2)},
            'reversals': {'count': reversal_count, 'amount': round(reversal_amount, 2)},
            'net_amount': round(sales_amount + cash_amount - reversal_amount, 2),
        },
        'by_currency': by_currency,
        'by_country': by_country,
        'recent_transactions': recent,
        'settlement': {
            'has_data': bool(ep747),
        },
        'currency_rates': {
            'has_data': bool(ep756),
            'rate_count': len(ep756.get('rates', [])) if isinstance(ep756, dict) else 0,
        },
        'report_index': {
            'has_data': bool(ep999),
            'report_count': len(ep999.get('reports', [])) if isinstance(ep999, dict) else 0,
        },
    })
