"""
Parsers for EP-746 (Member Settlement Data) and EP-747 (VSS Settlement Reports).

EP-746 contains fixed-width settlement hierarchy records starting with "4600...".
EP-747 contains VSS sub-reports (VSS-100-W, VSS-110, VSS-120, etc.).
"""

from typing import List, Dict, Optional
import re
from .common import parse_header, is_page_header, is_empty_or_spacing


def parse_ep_746(filepath: str) -> Dict:
    """
    Parse EP-746 (Member Settlement Data).

    Raw fixed-width records starting with "4600..." containing settlement hierarchy info.

    Format example:
        4600408319000000100047996200120230891202307...

    Args:
        filepath: Path to EP746.TXT file

    Returns:
        Dictionary with 'header' and 'records' keys
    """
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    result = {"header": {}, "records": []}

    if not lines:
        return result

    result["header"] = parse_header(lines)

    # Parse 4600 records
    for line in lines:
        # Look for lines starting with "4600"
        if line.strip().startswith("4600"):
            record = _parse_4600_record(line)
            if record:
                result["records"].append(record)

    return result


def _parse_4600_record(line: str) -> Optional[Dict]:
    """
    Parse a single 4600 record.

    Format (approximate):
    - Positions 0-3: Record type (4600)
    - Positions 4-10: Acquirer ID
    - Positions 11-18: Settlement ID
    - Positions 19-26: Settlement hierarchy level
    - Positions 27-33: Date fields
    - Positions 34-45: VSS reference/hierarchy
    - Positions 46-95: Entity name/details

    Args:
        line: The 4600 record line

    Returns:
        Dictionary with parsed fields or None
    """
    if len(line) < 50:
        return None

    record = {}

    # Extract record type
    record["record_type"] = line[0:4].strip()

    # Try to extract known fields (positions are approximate based on observation)
    record["acquirer_id"] = line[4:11].strip()
    record["processor_id"] = line[11:18].strip()

    # Extract settlement hierarchy ID (typically 10 digits)
    match = re.search(r"(\d{10})", line[15:30])
    if match:
        record["settlement_entity_id"] = match.group(1)

    # Extract dates (format YYMMDD)
    date_matches = re.findall(r"(\d{6})", line[27:50])
    if len(date_matches) >= 2:
        record["processing_date"] = date_matches[0]
        record["posting_date"] = date_matches[1]

    # Extract VSS reference (VSS-\d+)
    vss_match = re.search(r"(VSS-?\d+[A-Z-]*)", line)
    if vss_match:
        record["vss_reference"] = vss_match.group(1)

    # Extract entity name (usually alphanumeric after VSS reference)
    name_match = re.search(r"[VW]\s+(\d{10})\s+([A-Z\s]+)", line[30:100])
    if name_match:
        record["entity_id"] = name_match.group(1)
        record["entity_name"] = name_match.group(2).strip()

    return record if record else None


def parse_ep_747(filepath: str) -> Dict:
    """
    Parse EP-747 (VSS Settlement Reports).

    Contains multiple sub-reports:
    - VSS-100-W: Hierarchy List
    - VSS-110: Settlement Summary
    - VSS-120: Interchange Value
    - VSS-130: Reimbursement Fees
    - VSS-140: Visa Charges
    - VSS-210: Currency Conversion Fees
    - VSS-300: SRE Financial Recap
    - VSS-900 series: Reconciliation

    Args:
        filepath: Path to EP747.TXT file

    Returns:
        Dictionary with sub-reports
    """
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    result = {"header": {}, "sub_reports": {}}

    if not lines:
        return result

    # Extract main header from first 3 lines
    result["header"] = parse_header(lines)

    # Parse sub-reports
    idx = 0
    while idx < len(lines):
        line = lines[idx]

        # Detect sub-report headers (REPORT ID: VSS-XXX)
        if "REPORT ID:" in line or "VSS-" in line:
            report_id = _extract_report_id(line)
            if report_id:
                sub_report = _parse_vss_subreport(lines, idx)
                if sub_report:
                    result["sub_reports"][report_id] = sub_report
                    idx = sub_report.get("_last_line_idx", idx + 1)
                else:
                    idx += 1
            else:
                idx += 1
        else:
            idx += 1

    return result


def _extract_report_id(line: str) -> Optional[str]:
    """
    Extract report ID from a line (e.g., VSS-100-W).

    Args:
        line: The line to search

    Returns:
        Report ID string or None
    """
    match = re.search(r"(VSS-\d+-?[A-Z]?)", line)
    if match:
        return match.group(1)
    return None


def _parse_vss_subreport(lines: List[str], start_idx: int) -> Optional[Dict]:
    """
    Parse a single VSS sub-report.

    Args:
        lines: All lines from file
        start_idx: Index to start parsing from

    Returns:
        Dictionary with sub-report data or None
    """
    if start_idx >= len(lines):
        return None

    report = {}
    idx = start_idx
    report_id = _extract_report_id(lines[idx])

    if not report_id:
        return None

    report["report_id"] = report_id
    report["lines"] = []
    idx += 1

    # Parse report content until we hit END OF REPORT or next REPORT ID
    while idx < len(lines):
        line = lines[idx]

        # Stop at end markers
        if "END OF" in line or "*** END" in line:
            report["_last_line_idx"] = idx + 1
            break

        # Stop at next report
        if "REPORT ID:" in line and idx > start_idx + 1:
            report["_last_line_idx"] = idx
            break

        # Store lines for parsing (different reports have different formats)
        if line.strip():
            report["lines"].append(line)

        idx += 1

    # Parse specific sub-report types
    if "VSS-100" in report_id:
        report["data"] = _parse_vss_100_hierarchy(report["lines"])
    elif "VSS-110" in report_id:
        report["data"] = _parse_vss_110_settlement(report["lines"])
    elif "VSS-120" in report_id or "VSS-130" in report_id or "VSS-140" in report_id:
        report["data"] = _parse_vss_tabular(report["lines"])
    elif "VSS-300" in report_id:
        report["data"] = _parse_vss_300_recap(report["lines"])

    return report


def _parse_vss_100_hierarchy(lines: List[str]) -> Dict:
    """
    Parse VSS-100-W (Hierarchy List).

    Format shows SRE hierarchy with indentation indicating levels.

    Args:
        lines: Content lines of the report

    Returns:
        Dictionary with hierarchy tree
    """
    hierarchy = {"entities": []}

    for line in lines:
        if not line.strip():
            continue

        # Extract SRE ID (usually 10 digits)
        sre_match = re.search(r"(\d{10})", line)
        if sre_match:
            sre_id = sre_match.group(1)

            # Extract name (after the ID)
            name_match = re.search(r"\d{10}\s+([A-Z\s\-]+)", line)
            name = name_match.group(1).strip() if name_match else ""

            # Determine hierarchy level by counting leading spaces
            level = len(line) - len(line.lstrip())

            entity = {"sre_id": sre_id, "name": name, "level": level}

            # Extract processor and network IDs if present
            processor_match = re.search(r"(\d{6})\s+(\d{10})", line)
            if processor_match:
                entity["processor_id"] = processor_match.group(1)
                entity["network_id"] = processor_match.group(2)

            hierarchy["entities"].append(entity)

    return hierarchy


def _parse_vss_110_settlement(lines: List[str]) -> Dict:
    """
    Parse VSS-110 (Settlement Summary).

    Args:
        lines: Content lines of the report

    Returns:
        Dictionary with settlement data
    """
    return {"lines": lines, "parsed": False}  # Placeholder


def _parse_vss_tabular(lines: List[str]) -> Dict:
    """
    Parse VSS tabular reports (120, 130, 140).

    Args:
        lines: Content lines of the report

    Returns:
        Dictionary with tabular data
    """
    return {"lines": lines, "parsed": False}  # Placeholder


def _parse_vss_300_recap(lines: List[str]) -> Dict:
    """
    Parse VSS-300 (SRE Financial Recap).

    Args:
        lines: Content lines of the report

    Returns:
        Dictionary with financial recap data
    """
    return {"lines": lines, "parsed": False}  # Placeholder
