"""
Common utilities for parsing Visa Edit Package (EP) reports.

Handles header parsing, fixed-width field extraction, and shared utilities.
"""

from typing import Dict, Optional, Tuple, List
from datetime import datetime
import re


class FixedWidthParser:
    """Utility class for parsing fixed-width text fields."""

    @staticmethod
    def extract_field(line: str, start: int, end: int) -> str:
        """
        Extract a fixed-width field from a line.

        Args:
            line: The input line
            start: 0-based starting position (inclusive)
            end: 0-based ending position (exclusive)

        Returns:
            Trimmed field value
        """
        if start >= len(line):
            return ""
        return line[start:min(end, len(line))].strip()

    @staticmethod
    def extract_numeric(line: str, start: int, end: int) -> Optional[float]:
        """
        Extract and convert a numeric field.

        Args:
            line: The input line
            start: 0-based starting position (inclusive)
            end: 0-based ending position (exclusive)

        Returns:
            Float value or None if empty/invalid
        """
        value = FixedWidthParser.extract_field(line, start, end)
        if not value or value == "NULL":
            return None
        try:
            return float(value.replace(",", ""))
        except ValueError:
            return None

    @staticmethod
    def extract_integer(line: str, start: int, end: int) -> Optional[int]:
        """
        Extract and convert an integer field.

        Args:
            line: The input line
            start: 0-based starting position (inclusive)
            end: 0-based ending position (exclusive)

        Returns:
            Integer value or None if empty/invalid
        """
        value = FixedWidthParser.extract_field(line, start, end)
        if not value or value == "NULL":
            return None
        try:
            return int(value)
        except ValueError:
            return None


def parse_header(lines: List[str]) -> Dict:
    """
    Parse the standard EP report header (first 3 lines).

    Expected format:
        REPORT EP-XXX   INCOMING INTERCHANGE                    VISANET EDIT PACKAGE     ...  PAGE      N
        SYSTEM DATE YY/MM/DD    RELEASE  4.00                       [REPORT TITLE]      ...  CPD   YY/MM/DD
        ADB                                                        CENTER 408319         ...  RUN NO    NNN

    Args:
        lines: List of at least 3 lines containing the header

    Returns:
        Dictionary with header information
    """
    if not lines or len(lines) < 3:
        return {}

    header = {}

    # Parse line 1: Report number and page number
    line1 = lines[0]
    report_match = re.search(r"REPORT\s+EP-(\d+)", line1)
    if report_match:
        header["report_number"] = f"EP-{report_match.group(1)}"
    page_match = re.search(r"PAGE\s+(\d+)", line1)
    if page_match:
        header["page_number"] = int(page_match.group(1))

    # Parse line 2: System date, release, title, and CPD date
    line2 = lines[1]
    date_match = re.search(r"SYSTEM DATE\s+(\d{2}/\d{2}/\d{2})", line2)
    if date_match:
        header["system_date"] = date_match.group(1)
    release_match = re.search(r"RELEASE\s+([\d.]+)", line2)
    if release_match:
        header["release"] = release_match.group(1)
    cpd_match = re.search(r"CPD\s+(\d{2}/\d{2}/\d{2})", line2)
    if cpd_match:
        header["cpd_date"] = cpd_match.group(1)
    # Extract title (usually between position 60-120)
    if len(line2) > 60:
        title = line2[50:115].strip()
        if title:
            header["title"] = title

    # Parse line 3: Center ID and run number
    line3 = lines[2]
    center_match = re.search(r"CENTER\s+(\d+)", line3)
    if center_match:
        header["center_id"] = center_match.group(1)
    run_match = re.search(r"RUN NO\s+(\d+)", line3)
    if run_match:
        header["run_number"] = run_match.group(1)

    return header


def is_page_header(line: str) -> bool:
    """
    Check if a line is a page header (contains 'REPORT EP-' or 'PAGE').

    Args:
        line: The line to check

    Returns:
        True if this appears to be a page header line
    """
    return "REPORT EP-" in line or (line.startswith(" ") and "PAGE" in line)


def is_empty_or_spacing(line: str) -> bool:
    """
    Check if a line is empty or just spacing.

    Args:
        line: The line to check

    Returns:
        True if the line is empty or contains only whitespace
    """
    return len(line.strip()) == 0


def extract_labeled_field(line: str, field_name: str) -> Optional[str]:
    """
    Extract a value from a labeled field line.

    Format: "Field Name    VALUE" or "Field Name    VALUE     Next Field    VALUE"

    Args:
        line: The input line containing labeled fields
        field_name: The field name to look for

    Returns:
        The value following the field name, or None if not found
    """
    pattern = field_name + r"\s{2,}([^\s].+?)(?:\s{2,}[A-Z]|\s*$)"
    match = re.search(pattern, line)
    if match:
        return match.group(1).strip()
    return None


def parse_currency_amount(amount_str: str) -> Tuple[float, str]:
    """
    Parse currency amounts with direction indicators (DB for debit, space for credit).

    Examples:
        "17,032.09 DB" -> (17032.09, "DB")
        "321.91 DB" -> (321.91, "DB")
        "0.00" -> (0.0, "CR")

    Args:
        amount_str: String containing amount and optional direction

    Returns:
        Tuple of (amount, direction) where direction is "DB" or "CR"
    """
    amount_str = amount_str.strip()
    if not amount_str:
        return 0.0, "CR"

    direction = "CR"
    if amount_str.endswith("DB"):
        direction = "DB"
        amount_str = amount_str[:-2].strip()

    try:
        amount = float(amount_str.replace(",", ""))
    except ValueError:
        amount = 0.0

    return amount, direction


def format_date(date_str: str, from_format: str = "%y/%m/%d") -> Optional[str]:
    """
    Format date string to ISO format (YYYY-MM-DD).

    Args:
        date_str: Date string in input format
        from_format: Input format (default: YY/MM/DD)

    Returns:
        ISO formatted date string or None if parsing fails
    """
    if not date_str or date_str == "NULL":
        return None
    try:
        dt = datetime.strptime(date_str.strip(), from_format)
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None
