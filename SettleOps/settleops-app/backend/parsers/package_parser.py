"""
Main orchestrator for parsing a complete Visa Edit Package directory.

Takes a directory containing EP reports and AD3103 raw data, parses everything,
and returns a comprehensive dictionary with all parsed data.
"""

import os
from pathlib import Path
from typing import Dict, Optional
import json

from .ep_transactions import parse_ep_705, parse_ep_707, parse_ep_727
from .ep_summaries import (
    parse_ep_210b,
    parse_ep_210c,
    parse_ep_210d,
    parse_ep_210e,
    parse_ep_210f,
    parse_ep_211c,
    parse_ep_211d,
    parse_ep_211e,
    parse_ep_220,
)
from .ep_settlement import parse_ep_746, parse_ep_747
from .ep_misc import parse_ep_756, parse_ep_999, parse_ep_750
from .ad_raw import parse_ad3103


class PackageParser:
    """Orchestrator for parsing a complete Visa Edit Package."""

    def __init__(self, package_dir: str):
        """
        Initialize the parser with a package directory.

        Args:
            package_dir: Path to directory containing EP files and AD3103.TXT
        """
        self.package_dir = Path(package_dir)
        self.results = {}

    def parse_all(self) -> Dict:
        """
        Parse all available reports in the package directory.

        Returns:
            Dictionary with parsed data from all reports
        """
        # Initialize results structure
        self.results = {
            "package_info": {
                "directory": str(self.package_dir),
                "parsed_files": [],
                "failed_files": [],
                "summary": {},
            },
            "transaction_reports": {
                "ep_705": None,
                "ep_707": None,
                "ep_727": None,
            },
            "summary_reports": {
                "ep_210b": None,
                "ep_210c": None,
                "ep_210d": None,
                "ep_210e": None,
                "ep_210f": None,
                "ep_211c": None,
                "ep_211d": None,
                "ep_211e": None,
                "ep_220": None,
            },
            "settlement_reports": {
                "ep_746": None,
                "ep_747": None,
            },
            "misc_reports": {
                "ep_750": None,
                "ep_756": None,
                "ep_999": None,
            },
            "raw_data": {
                "ad3103": None,
            },
        }

        # Parse transaction reports
        self._parse_transaction_reports()

        # Parse summary reports
        self._parse_summary_reports()

        # Parse settlement reports
        self._parse_settlement_reports()

        # Parse misc reports
        self._parse_misc_reports()

        # Parse raw data
        self._parse_raw_data()

        return self.results

    def _parse_transaction_reports(self):
        """Parse EP-705, EP-707, EP-727 transaction reports."""
        reports = [
            ("EP705.TXT", "ep_705", parse_ep_705),
            ("EP707.TXT", "ep_707", parse_ep_707),
            ("EP727.TXT", "ep_727", parse_ep_727),
        ]

        for filename, key, parser_func in reports:
            filepath = self.package_dir / filename
            if filepath.exists():
                try:
                    self.results["transaction_reports"][key] = parser_func(str(filepath))
                    self.results["package_info"]["parsed_files"].append(filename)
                except Exception as e:
                    self.results["package_info"]["failed_files"].append(
                        {"file": filename, "error": str(e)}
                    )

    def _parse_summary_reports(self):
        """Parse EP-210 and EP-211 summary reports."""
        reports = [
            ("EP210B.TXT", "ep_210b", parse_ep_210b),
            ("EP210C.TXT", "ep_210c", parse_ep_210c),
            ("EP210D.TXT", "ep_210d", parse_ep_210d),
            ("EP210E.TXT", "ep_210e", parse_ep_210e),
            ("EP210F.TXT", "ep_210f", parse_ep_210f),
            ("EP211C.TXT", "ep_211c", parse_ep_211c),
            ("EP211D.TXT", "ep_211d", parse_ep_211d),
            ("EP211E.TXT", "ep_211e", parse_ep_211e),
            ("EP220.TXT", "ep_220", parse_ep_220),
        ]

        for filename, key, parser_func in reports:
            filepath = self.package_dir / filename
            if filepath.exists():
                try:
                    self.results["summary_reports"][key] = parser_func(str(filepath))
                    self.results["package_info"]["parsed_files"].append(filename)
                except Exception as e:
                    self.results["package_info"]["failed_files"].append(
                        {"file": filename, "error": str(e)}
                    )

    def _parse_settlement_reports(self):
        """Parse EP-746 and EP-747 settlement reports."""
        reports = [
            ("EP746.TXT", "ep_746", parse_ep_746),
            ("EP747.TXT", "ep_747", parse_ep_747),
        ]

        for filename, key, parser_func in reports:
            filepath = self.package_dir / filename
            if filepath.exists():
                try:
                    self.results["settlement_reports"][key] = parser_func(str(filepath))
                    self.results["package_info"]["parsed_files"].append(filename)
                except Exception as e:
                    self.results["package_info"]["failed_files"].append(
                        {"file": filename, "error": str(e)}
                    )

    def _parse_misc_reports(self):
        """Parse EP-750, EP-756, EP-999 misc reports."""
        reports = [
            ("EP750.TXT", "ep_750", parse_ep_750),
            ("EP756.TXT", "ep_756", parse_ep_756),
            ("EP999.TXT", "ep_999", parse_ep_999),
        ]

        for filename, key, parser_func in reports:
            filepath = self.package_dir / filename
            if filepath.exists():
                try:
                    self.results["misc_reports"][key] = parser_func(str(filepath))
                    self.results["package_info"]["parsed_files"].append(filename)
                except Exception as e:
                    self.results["package_info"]["failed_files"].append(
                        {"file": filename, "error": str(e)}
                    )

    def _parse_raw_data(self):
        """Parse AD3103.TXT raw machine-readable records."""
        filepath = self.package_dir / "AD3103.TXT"
        if filepath.exists():
            try:
                self.results["raw_data"]["ad3103"] = parse_ad3103(str(filepath))
                self.results["package_info"]["parsed_files"].append("AD3103.TXT")
            except Exception as e:
                self.results["package_info"]["failed_files"].append(
                    {"file": "AD3103.TXT", "error": str(e)}
                )

    def get_transaction_count(self) -> int:
        """Get total transaction count from all transaction reports."""
        count = 0
        if self.results["transaction_reports"]["ep_705"]:
            count += len(self.results["transaction_reports"]["ep_705"].get("transactions", []))
        if self.results["transaction_reports"]["ep_707"]:
            count += len(self.results["transaction_reports"]["ep_707"].get("transactions", []))
        if self.results["transaction_reports"]["ep_727"]:
            count += len(self.results["transaction_reports"]["ep_727"].get("transactions", []))
        return count

    def get_raw_transaction_count(self) -> int:
        """Get total transaction count from raw data."""
        if self.results["raw_data"]["ad3103"]:
            return len(self.results["raw_data"]["ad3103"].get("transactions", []))
        return 0

    def get_summary(self) -> Dict:
        """
        Get a summary of parsed data.

        Returns:
            Dictionary with summary statistics
        """
        summary = {
            "total_files_parsed": len(self.results["package_info"]["parsed_files"]),
            "failed_files": len(self.results["package_info"]["failed_files"]),
            "transaction_count": self.get_transaction_count(),
            "raw_transaction_count": self.get_raw_transaction_count(),
            "reports_parsed": {},
        }

        # Count transactions in each report
        for report_type, reports in self.results.items():
            if isinstance(reports, dict) and report_type not in ["package_info", "raw_data"]:
                for key, data in reports.items():
                    if data and "transactions" in data:
                        summary["reports_parsed"][key] = len(data["transactions"])

        return summary


def parse_package(package_dir: str) -> Dict:
    """
    Parse a complete Visa Edit Package directory.

    Convenience function to parse all reports in a directory in one call.

    Args:
        package_dir: Path to directory containing EP files

    Returns:
        Dictionary with all parsed data
    """
    parser = PackageParser(package_dir)
    return parser.parse_all()


def export_to_json(results: Dict, output_file: str) -> None:
    """
    Export parsed results to JSON file.

    Note: Some objects may not be JSON-serializable; only basic types are preserved.

    Args:
        results: Parsed results dictionary
        output_file: Path to output JSON file
    """
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2, default=str)


def get_package_summary(package_dir: str) -> Dict:
    """
    Get a quick summary of a package without storing full results.

    Args:
        package_dir: Path to directory containing EP files

    Returns:
        Summary dictionary
    """
    parser = PackageParser(package_dir)
    parser.parse_all()
    return parser.get_summary()
