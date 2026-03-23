"""
Parsers for EP-210 (Batch/File/CPD/Run Summaries) and EP-211 (Summary by Currency Code).

These are tabular format summary reports with column headers and financial data rows.
Also includes EP-220 (Collected Reconciliation Summary).
"""

from typing import List, Dict, Optional
from .common import parse_header, is_page_header, is_empty_or_spacing, parse_currency_amount


def _parse_currency_summary_table(lines: List[str], start_idx: int) -> tuple:
    """
    Parse a currency summary table (EP-211 format).

    Format:
        CURRENCY CODE         / SETTLEMENT         AMOUNT    COUNT
        GHS/0 INTERNATIONAL SETTLEMENT SERVICE
        Originals                                   19,222.80 DB    23
        CASH DISBURSEMENTS
        TOTAL NET - FINANCIAL                      24,134.64 DB    27

    Args:
        lines: All lines from file
        start_idx: Index to start parsing from

    Returns:
        Tuple of (summary_dict, next_line_idx)
    """
    summary = {}
    idx = start_idx
    current_currency = None
    current_section = None

    while idx < len(lines):
        line = lines[idx]

        # Stop at page header or empty section
        if is_page_header(line) or (is_empty_or_spacing(line) and idx > start_idx + 2):
            break

        # Detect currency code line (e.g., "GHS/0 INTERNATIONAL SETTLEMENT SERVICE")
        if re.match(r"^\s*GHS/\d+|USD|EUR", line):
            current_currency = line.strip()
            summary[current_currency] = {"transactions": []}
            idx += 1
            continue

        # Detect section headers (SALES DRAFTS, CASH DISBURSEMENTS, etc.)
        if any(x in line for x in ["SALES DRAFTS", "CASH DISBURSEMENTS", "CREDIT VOUCHERS"]):
            current_section = line.strip()
            idx += 1
            continue

        # Parse data rows with amounts and counts
        if current_currency and ("DB" in line or "CR" in line or re.search(r"\d+,\d+\.\d+", line)):
            # Format: Originals                                   19,222.80 DB    23
            parts = line.split()
            if len(parts) >= 2:
                # Look for numeric patterns
                trans_type = " ".join(parts[:-2]) if len(parts) > 2 else ""
                try:
                    # Amount with direction (DB/CR)
                    amount_part = parts[-2]
                    count_part = parts[-1]
                    amount_str = f"{amount_part} {parts[-1] if parts[-1] in ['DB', 'CR'] else ''}"
                    count = int(parts[-1]) if parts[-1].isdigit() else None

                    if current_currency not in summary:
                        summary[current_currency] = {"transactions": []}

                    summary[current_currency]["transactions"].append(
                        {
                            "type": trans_type.strip(),
                            "amount": amount_str.strip(),
                            "count": count,
                        }
                    )
                except (ValueError, IndexError):
                    pass

        idx += 1

    return summary, idx


def parse_ep_210b(filepath: str) -> Dict:
    """
    Parse EP-210B (Incoming Interchange Batch Summary).

    Contains batch-level financial summaries with transaction counts and amounts.

    Args:
        filepath: Path to EP210B.TXT file

    Returns:
        Dictionary with 'header' and 'batches' keys
    """
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    result = {"header": {}, "batches": []}

    if not lines:
        return result

    result["header"] = parse_header(lines)

    idx = 3
    while idx < len(lines):
        line = lines[idx]

        # Look for batch identifiers
        if "BASE II FILE ID:" in line:
            batch = {"file_id": "", "batches": []}

            # Extract file ID
            match = re.search(r"BASE II FILE ID:\s+(\S+)", line)
            if match:
                batch["file_id"] = match.group(1)

            # Extract batch number
            match = re.search(r"BATCH\s+(\d+)", line)
            if match:
                batch["batch_number"] = int(match.group(1))

            # Look for file/batch info on same line
            match = re.search(r"FILE\s+(\d+)\s+BATCH\s+(\d+)", line)
            if match:
                batch["file_number"] = int(match.group(1))
                batch["batch_number"] = int(match.group(2))

            idx += 1

            # Parse batch content
            financial_data = []
            while idx < len(lines) and not ("BASE II FILE ID:" in lines[idx]):
                line = lines[idx]

                # Parse financial rows
                if any(
                    x in line
                    for x in ["Originals", "Reversals", "TOT FINANCIAL", "TOTAL NON-FINANCIAL"]
                ):
                    # Parse: "Originals    GHS/0            321.91 DB     2"
                    row = {}
                    parts = line.split()

                    if "Originals" in line:
                        row["type"] = "Originals"
                    elif "Reversals" in line:
                        row["type"] = "Reversals"
                    elif "TOT FINANCIAL" in line:
                        row["type"] = "TOT_FINANCIAL"
                    elif "TOTAL NON-FINANCIAL" in line:
                        row["type"] = "TOTAL_NON_FINANCIAL"

                    # Extract currency code
                    match = re.search(r"(GHS/\d+|USD|EUR|[A-Z]{3}/\d+)", line)
                    if match:
                        row["currency"] = match.group(1)

                    # Extract amounts (with DB/CR indicators)
                    amount_matches = re.findall(r"(\d+,\d+\.\d+|\d+\.\d+)\s+(DB|CR)?", line)
                    if amount_matches:
                        for amount, direction in amount_matches:
                            if direction:
                                row["amount"] = amount
                                row["direction"] = direction
                                break

                    # Extract count
                    match = re.search(r"(?:DB|CR)?\s+(\d+)\s*$", line)
                    if match:
                        row["count"] = int(match.group(1))

                    if row:
                        financial_data.append(row)

                # Parse BATCH TOTALS
                elif "BATCH TOTALS" in line:
                    batch["transactions_total"] = ""
                    match = re.search(r"TRANSACTIONS\s+(\d+)", line)
                    if match:
                        batch["total_transactions"] = int(match.group(1))
                    match = re.search(r"GROSS AMOUNT\s+([A-Z/\d]*)\s+(\d+,\d+\.\d+|\d+\.\d+)", line)
                    if match:
                        batch["gross_amount"] = match.group(2)

                idx += 1

            batch["financial_data"] = financial_data
            result["batches"].append(batch)
            continue

        idx += 1

    return result


def parse_ep_210c(filepath: str) -> Dict:
    """Parse EP-210C (Incoming Interchange File Summary)."""
    return _parse_tabular_summary(filepath, "File Summary")


def parse_ep_210d(filepath: str) -> Dict:
    """Parse EP-210D (Incoming Interchange CPD Summary)."""
    return _parse_tabular_summary(filepath, "CPD Summary")


def parse_ep_210e(filepath: str) -> Dict:
    """Parse EP-210E (Incoming Interchange Run Summary)."""
    return _parse_tabular_summary(filepath, "Run Summary")


def parse_ep_210f(filepath: str) -> Dict:
    """Parse EP-210F (Incoming Batch Summary)."""
    return _parse_tabular_summary(filepath, "Batch Summary")


def _parse_tabular_summary(filepath: str, summary_type: str) -> Dict:
    """
    Generic parser for tabular summary reports.

    Args:
        filepath: Path to file
        summary_type: Type of summary for header

    Returns:
        Dictionary with header and summary data
    """
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    result = {"header": {}, "summary_type": summary_type, "data": []}

    if not lines:
        return result

    result["header"] = parse_header(lines)

    return result


def parse_ep_211c(filepath: str) -> Dict:
    """
    Parse EP-211C (File Summary by Currency Code).

    Shows breakdown by currency (GHS/0, GHS/8, USD, etc.) with transaction counts and totals.

    Args:
        filepath: Path to EP211C.TXT file

    Returns:
        Dictionary with currency summaries
    """
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    result = {"header": {}, "currencies": {}}

    if not lines:
        return result

    result["header"] = parse_header(lines)

    idx = 3
    current_currency = None

    while idx < len(lines):
        line = lines[idx]

        # Detect currency sections
        if re.match(r"^\s+(GHS/\d+|USD|EUR)", line):
            match = re.search(r"(GHS/\d+|USD|EUR)", line)
            if match:
                current_currency = match.group(1)
                result["currencies"][current_currency] = {
                    "transactions": [],
                    "totals": {}
                }
            idx += 1
            continue

        # Parse transaction rows (SALES DRAFTS, CASH DISBURSEMENTS, etc.)
        if current_currency and any(
            x in line for x in ["SALES DRAFTS", "CASH DISBURSEMENTS", "CREDIT VOUCHERS"]
        ):
            trans_type = line.strip()
            idx += 1

            # Parse Originals/Reversals sub-rows
            while idx < len(lines):
                sub_line = lines[idx]

                if any(x in sub_line for x in ["Originals", "Reversals"]):
                    # Extract amount and count
                    amount_match = re.search(r"(\d+,\d+\.\d+|\d+\.\d+)\s+(DB|CR)?", sub_line)
                    count_match = re.search(r"(DB|CR)?\s+(\d+)\s*$", sub_line)

                    trans_entry = {
                        "transaction_type": trans_type,
                        "sub_type": "Originals" if "Originals" in sub_line else "Reversals",
                    }

                    if amount_match:
                        trans_entry["amount"] = amount_match.group(1)
                        if amount_match.group(2):
                            trans_entry["direction"] = amount_match.group(2)

                    if count_match:
                        trans_entry["count"] = int(count_match.group(2))

                    result["currencies"][current_currency]["transactions"].append(trans_entry)
                    idx += 1
                elif "TOTAL NET - FINANCIAL" in sub_line:
                    result["currencies"][current_currency]["totals"] = {}
                    amount_match = re.search(r"(\d+,\d+\.\d+|\d+\.\d+)\s+(DB|CR)?", sub_line)
                    if amount_match:
                        result["currencies"][current_currency]["totals"]["total_amount"] = (
                            amount_match.group(1)
                        )
                    count_match = re.search(r"(DB|CR)?\s+(\d+)\s*$", sub_line)
                    if count_match:
                        result["currencies"][current_currency]["totals"]["total_count"] = int(
                            count_match.group(2)
                        )
                    idx += 1
                    break
                else:
                    break

            continue

        # Parse FILE TOTALS line
        if "FILE TOTALS" in line:
            match = re.search(r"TRANSACTIONS\s+(\d+)", line)
            if match and current_currency:
                result["currencies"][current_currency]["file_total_transactions"] = int(
                    match.group(1)
                )

        idx += 1

    return result


def parse_ep_211d(filepath: str) -> Dict:
    """Parse EP-211D (CPD Summary by Currency Code)."""
    return parse_ep_211c(filepath)  # Same format


def parse_ep_211e(filepath: str) -> Dict:
    """Parse EP-211E (Run Summary by Currency Code)."""
    return parse_ep_211c(filepath)  # Same format


def parse_ep_220(filepath: str) -> Dict:
    """
    Parse EP-220 (Collected Reconciliation Summary).

    Contains E/P batch information with member sent and visanet accepted data.

    Args:
        filepath: Path to EP220.TXT file

    Returns:
        Dictionary with reconciliation data
    """
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    result = {"header": {}, "files": []}

    if not lines:
        return result

    result["header"] = parse_header(lines)

    idx = 3
    current_file_id = None
    current_file = None

    while idx < len(lines):
        line = lines[idx]

        # Detect file ID
        if "E/P FILE ID:" in line:
            match = re.search(r"E/P FILE ID:\s+(\S+)", line)
            if match:
                current_file_id = match.group(1)
                current_file = {"file_id": current_file_id, "batches": []}
                result["files"].append(current_file)
            idx += 1
            continue

        # Parse batch rows
        if current_file and re.match(r"^\s+\d{5}\s+", line):
            # Format: "23089   30890001      1 23089     0       299            363,390.00     ACCEPTED"
            parts = line.split()
            batch = {}

            try:
                # Rough parsing
                batch["ep_batch_date"] = parts[0]
                if len(parts) > 1:
                    batch["center_id"] = parts[1]
                if len(parts) > 2:
                    batch["batch_number"] = parts[2]
                if len(parts) > 3:
                    batch["base_ii_date"] = parts[3]

                # Find amount (contains decimal point)
                for i, part in enumerate(parts):
                    if "." in part and part[0].isdigit():
                        batch["amount"] = part.replace(",", "")
                        # Next part after amount might be status
                        if i + 1 < len(parts):
                            status_parts = []
                            for j in range(i + 1, len(parts)):
                                status_parts.append(parts[j])
                            batch["disposition"] = " ".join(status_parts)
                        break

                current_file["batches"].append(batch)
            except (IndexError, ValueError):
                pass

        # Parse RUN TOTALS
        if "RUN TOTALS" in line:
            # Extract total transaction count and amount
            match = re.search(r"RUN TOTALS\s+(\d+)\s+(\d+,\d+\.\d+)", line)
            if match:
                result["run_totals"] = {
                    "member_sent_count": int(match.group(1)),
                    "member_sent_amount": match.group(2),
                }

        idx += 1

    return result


import re
