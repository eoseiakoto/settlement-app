"""
Parsers for miscellaneous EP reports:
- EP-756: Currency Conversion Rates (key-value format)
- EP-999: Index of Reports (tabular)
- EP-750: Text Messages
"""

from typing import List, Dict, Optional
import re
from .common import parse_header, is_page_header, is_empty_or_spacing


def parse_ep_756(filepath: str) -> Dict:
    """
    Parse EP-756 (Currency Conversion Rates).

    Format: Key-value pairs with rate information for currency conversions.

    Structure:
        ACTION CODE   - 1        A
        CNTR CUR CODE - 1        004
        BASE CUR CODE - 1        840
        BUY  SCL FACT & RATE- 1  07115207
        SELL SCL FACT & RATE- 1  07115207

    Args:
        filepath: Path to EP756.TXT file

    Returns:
        Dictionary with rate entries
    """
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    result = {"header": {}, "destination_id": "", "source_id": "", "rate_table_id": "", "rates": []}

    if not lines:
        return result

    result["header"] = parse_header(lines)

    # Extract metadata from header section
    for i in range(3, min(10, len(lines))):
        line = lines[i]
        dest_match = re.search(r"DESTINATION IDENTIFIER\s+(\d+)", line)
        if dest_match:
            result["destination_id"] = dest_match.group(1)
        src_match = re.search(r"SOURCE IDENTIFIER\s+(\d+)", line)
        if src_match:
            result["source_id"] = src_match.group(1)
        rate_match = re.search(r"RATE TABLE ID\s+(\S+)", line)
        if rate_match:
            result["rate_table_id"] = rate_match.group(1)

    # Parse rate entries
    idx = 3
    current_rate_group = None

    while idx < len(lines):
        line = lines[idx]

        # Look for rate group markers (ACTION CODE - N)
        action_match = re.search(r"ACTION CODE\s+-\s+(\d+)\s+(\S+)", line)
        if action_match:
            if current_rate_group:
                result["rates"].append(current_rate_group)

            current_rate_group = {
                "rate_number": int(action_match.group(1)),
                "action_code": action_match.group(2),
            }
            idx += 1
            continue

        # Parse rate fields
        if current_rate_group:
            # CNTR CUR CODE
            cntr_match = re.search(r"CNTR CUR CODE\s+-\s+\d+\s+(\d+)", line)
            if cntr_match:
                current_rate_group["counter_currency"] = cntr_match.group(1)

            # BASE CUR CODE
            base_match = re.search(r"BASE CUR CODE\s+-\s+\d+\s+(\d+)", line)
            if base_match:
                current_rate_group["base_currency"] = base_match.group(1)

            # EFFECTIVE DATE
            eff_match = re.search(r"EFFECTIVE DATE\s+-\s+\d+\s+(\d+)", line)
            if eff_match:
                current_rate_group["effective_date"] = eff_match.group(1)

            # BUY SCALE FACTOR & RATE
            buy_match = re.search(r"BUY\s+SCL FACT & RATE-\s+\d+\s+(\S+)", line)
            if buy_match:
                current_rate_group["buy_rate"] = buy_match.group(1)

            # SELL SCALE FACTOR & RATE
            sell_match = re.search(r"SELL SCL FACT & RATE-\s+\d+\s+(\S+)", line)
            if sell_match:
                current_rate_group["sell_rate"] = sell_match.group(1)

        idx += 1

    # Add the last rate group
    if current_rate_group:
        result["rates"].append(current_rate_group)

    return result


def parse_ep_999(filepath: str) -> Dict:
    """
    Parse EP-999 (Index of Reports).

    Tabular format listing all reports with page counts and status (NULL for empty).

    Format:
        REPORT NO.   TITLE                                                               NO OF PAGES
        EP-705       SALES DRAFTS                                                       107
        EP-706       CREDIT VOUCHERS                                                    1  NULL

    Args:
        filepath: Path to EP999.TXT file

    Returns:
        Dictionary with report index
    """
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    result = {"header": {}, "reports": []}

    if not lines:
        return result

    result["header"] = parse_header(lines)

    # Start parsing after header and section headers
    idx = 3
    while idx < len(lines):
        line = lines[idx]

        # Skip empty lines and section headers
        if (
            is_empty_or_spacing(line)
            or "REPORT NO." in line
            or "INCOMING INTERCHANGE CONTROL REPORTS" in line
            or "PROCESS CONTROL REPORTS" in line
            or "OPTIONAL TRANSACTION REPORTS" in line
        ):
            idx += 1
            continue

        # Parse report lines (start with spaces and EP-XXX)
        if re.match(r"^\s+EP-", line):
            report = _parse_report_index_line(line)
            if report:
                result["reports"].append(report)

        idx += 1

    return result


def _parse_report_index_line(line: str) -> Optional[Dict]:
    """
    Parse a single report index line.

    Args:
        line: The report index line

    Returns:
        Dictionary with report information or None
    """
    # Format: "EP-705     SALES DRAFTS                                                       107"
    match = re.match(r"\s+(EP-\d+[A-Z]*)\s+(.+?)\s{2,}(\d+|NULL)\s*$", line)
    if match:
        report_num = match.group(1).strip()
        title = match.group(2).strip()
        pages = match.group(3).strip()

        return {
            "report_number": report_num,
            "title": title,
            "pages": pages if pages == "NULL" else int(pages),
            "is_empty": pages == "NULL",
        }

    return None


def parse_ep_750(filepath: str) -> Dict:
    """
    Parse EP-750 (Text Messages).

    Contains message text with identifiers.

    Args:
        filepath: Path to EP750.TXT file

    Returns:
        Dictionary with messages
    """
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    result = {"header": {}, "messages": []}

    if not lines:
        return result

    result["header"] = parse_header(lines)

    # Messages are typically simple text, parse as-is
    message_started = False
    current_message = ""

    for idx in range(3, len(lines)):
        line = lines[idx]

        if is_page_header(line):
            if current_message:
                result["messages"].append(current_message.strip())
                current_message = ""
            continue

        if not is_empty_or_spacing(line):
            current_message += line

    if current_message:
        result["messages"].append(current_message.strip())

    return result
