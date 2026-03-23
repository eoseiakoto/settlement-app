#!/usr/bin/env python3
"""
Test script for SettleOps parsing engine.

Tests the parsers against actual Visa Edit Package files.
"""

import sys
from pathlib import Path

# Add parsers to path
sys.path.insert(0, str(Path(__file__).parent / "parsers"))

from parsers.package_parser import parse_package, get_package_summary
from parsers.ep_transactions import parse_ep_705, parse_ep_707, parse_ep_727
from parsers.ep_summaries import parse_ep_210b, parse_ep_220
from parsers.ep_settlement import parse_ep_746, parse_ep_747
from parsers.ep_misc import parse_ep_756, parse_ep_999
from parsers.ad_raw import parse_ad3103


def test_ep_705():
    """Test EP-705 (Sales Drafts) parser."""
    print("\n=== Testing EP-705 (Sales Drafts) ===")
    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/EP705.TXT"

    try:
        result = parse_ep_705(filepath)
        print(f"Header: {result.get('header', {}).get('report_number')}")
        print(f"Transactions parsed: {len(result.get('transactions', []))}")
        if result.get('transactions'):
            first_trans = result['transactions'][0]
            print(f"First transaction account: {first_trans.get('account_number', 'N/A')}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_ep_707():
    """Test EP-707 (Cash Disbursements) parser."""
    print("\n=== Testing EP-707 (Cash Disbursements) ===")
    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/EP707.TXT"

    try:
        result = parse_ep_707(filepath)
        print(f"Header: {result.get('header', {}).get('report_number')}")
        print(f"Transactions parsed: {len(result.get('transactions', []))}")
        if result.get('transactions'):
            first_trans = result['transactions'][0]
            print(f"First transaction: {first_trans.get('merchant_name', 'N/A')}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_ep_210b():
    """Test EP-210B (Batch Summary) parser."""
    print("\n=== Testing EP-210B (Batch Summary) ===")
    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/EP210B.TXT"

    try:
        result = parse_ep_210b(filepath)
        print(f"Header: {result.get('header', {}).get('report_number')}")
        print(f"Batches parsed: {len(result.get('batches', []))}")
        if result.get('batches'):
            first_batch = result['batches'][0]
            print(f"First batch file ID: {first_batch.get('file_id', 'N/A')}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_ep_220():
    """Test EP-220 (Reconciliation Summary) parser."""
    print("\n=== Testing EP-220 (Collected Reconciliation Summary) ===")
    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/EP220.TXT"

    try:
        result = parse_ep_220(filepath)
        print(f"Header: {result.get('header', {}).get('report_number')}")
        print(f"Files parsed: {len(result.get('files', []))}")
        if result.get('files'):
            first_file = result['files'][0]
            print(f"First file ID: {first_file.get('file_id', 'N/A')}")
            print(f"Batches in file: {len(first_file.get('batches', []))}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_ep_746():
    """Test EP-746 (Settlement Data) parser."""
    print("\n=== Testing EP-746 (Member Settlement Data) ===")
    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/EP746.TXT"

    try:
        result = parse_ep_746(filepath)
        print(f"Header: {result.get('header', {}).get('report_number')}")
        print(f"Records parsed: {len(result.get('records', []))}")
        if result.get('records'):
            first_record = result['records'][0]
            print(f"First record SRE ID: {first_record.get('settlement_entity_id', 'N/A')}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_ep_747():
    """Test EP-747 (VSS Reports) parser."""
    print("\n=== Testing EP-747 (VSS Settlement Reports) ===")
    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/EP747.TXT"

    try:
        result = parse_ep_747(filepath)
        print(f"Header: {result.get('header', {}).get('report_number')}")
        print(f"Sub-reports parsed: {len(result.get('sub_reports', {}))}")
        if result.get('sub_reports'):
            print(f"Sub-report IDs: {list(result['sub_reports'].keys())[:3]}...")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_ep_756():
    """Test EP-756 (Currency Rates) parser."""
    print("\n=== Testing EP-756 (Currency Conversion Rates) ===")
    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/EP756.TXT"

    try:
        result = parse_ep_756(filepath)
        print(f"Header: {result.get('header', {}).get('report_number')}")
        print(f"Rates parsed: {len(result.get('rates', []))}")
        if result.get('rates'):
            first_rate = result['rates'][0]
            print(f"First rate counter currency: {first_rate.get('counter_currency', 'N/A')}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_ep_999():
    """Test EP-999 (Index) parser."""
    print("\n=== Testing EP-999 (Index of Reports) ===")
    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/EP999.TXT"

    try:
        result = parse_ep_999(filepath)
        print(f"Header: {result.get('header', {}).get('report_number')}")
        print(f"Reports indexed: {len(result.get('reports', []))}")
        if result.get('reports'):
            # Find EP-705
            ep705 = next((r for r in result['reports'] if r.get('report_number') == 'EP-705'), None)
            if ep705:
                print(f"EP-705: {ep705.get('title')} - {ep705.get('pages')} pages")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_ad3103():
    """Test AD3103.TXT (Raw Data) parser."""
    print("\n=== Testing AD3103.TXT (Raw Machine-Readable Data) ===")
    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/AD3103.TXT"

    try:
        result = parse_ad3103(filepath)
        print(f"Transactions parsed: {len(result.get('transactions', []))}")
        print(f"Record types found: {result.get('record_count', {})}")
        if result.get('transactions'):
            first_trans = result['transactions'][0]
            print(f"First transaction account: {first_trans.get('data', {}).get('account_number', 'N/A')}")
            print(f"Additional records in first transaction: {len(first_trans.get('additional_records', []))}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_package_parser():
    """Test the complete package parser."""
    print("\n=== Testing Package Parser ===")
    package_dir = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323"

    try:
        summary = get_package_summary(package_dir)
        print(f"Total files parsed: {summary.get('total_files_parsed')}")
        print(f"Failed files: {summary.get('failed_files')}")
        print(f"Transaction count (print-ready): {summary.get('transaction_count')}")
        print(f"Transaction count (raw): {summary.get('raw_transaction_count')}")
        print(f"Reports with transactions: {len(summary.get('reports_parsed', {}))}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("SettleOps Parsing Engine Test Suite")
    print("=" * 60)

    tests = [
        ("EP-705", test_ep_705),
        ("EP-707", test_ep_707),
        ("EP-210B", test_ep_210b),
        ("EP-220", test_ep_220),
        ("EP-746", test_ep_746),
        ("EP-747", test_ep_747),
        ("EP-756", test_ep_756),
        ("EP-999", test_ep_999),
        ("AD3103", test_ad3103),
        ("Package Parser", test_package_parser),
    ]

    results = {}
    for test_name, test_func in tests:
        results[test_name] = test_func()

    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    for test_name, passed in results.items():
        status = "PASSED" if passed else "FAILED"
        print(f"{test_name}: {status}")

    all_passed = all(results.values())
    print("\n" + ("All tests passed!" if all_passed else "Some tests failed"))
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
