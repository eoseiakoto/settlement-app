#!/usr/bin/env python3
"""
Example usage of SettleOps parsing engine.

Demonstrates how to parse Visa settlement reports and work with the structured data.
"""

import sys
from pathlib import Path
from json import dumps

# Add parsers to path
sys.path.insert(0, str(Path(__file__).parent / "parsers"))

from parsers.package_parser import parse_package, get_package_summary, export_to_json
from parsers.ep_transactions import parse_ep_705, parse_ep_707
from parsers.ep_summaries import parse_ep_210b, parse_ep_220
from parsers.ep_settlement import parse_ep_746
from parsers.ad_raw import parse_ad3103


def example_1_quick_summary():
    """Example 1: Get a quick summary of a settlement package."""
    print("\n" + "=" * 70)
    print("EXAMPLE 1: Quick Package Summary")
    print("=" * 70)

    package_dir = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323"

    summary = get_package_summary(package_dir)

    print(f"\nPackage: {package_dir}")
    print(f"Files parsed: {summary['total_files_parsed']}")
    print(f"Failed files: {summary['failed_files']}")
    print(f"Transaction count (print-ready): {summary['transaction_count']}")
    print(f"Transaction count (raw): {summary['raw_transaction_count']}")
    print(f"\nReports with transaction data:")
    for report, count in summary.get('reports_parsed', {}).items():
        print(f"  {report}: {count} transactions")


def example_2_analyze_sales_drafts():
    """Example 2: Analyze sales drafts and extract key metrics."""
    print("\n" + "=" * 70)
    print("EXAMPLE 2: Analyze Sales Drafts (EP-705)")
    print("=" * 70)

    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/EP705.TXT"
    result = parse_ep_705(filepath)

    print(f"\nReport: {result['header'].get('report_number')}")
    print(f"System Date: {result['header'].get('system_date')}")
    print(f"Total transactions: {len(result['transactions'])}")

    # Aggregate metrics
    if result['transactions']:
        print("\nTop 5 merchants by transaction count:")
        merchant_counts = {}
        for trans in result['transactions']:
            merchant = trans.get('merchant_name', 'Unknown')
            merchant_counts[merchant] = merchant_counts.get(merchant, 0) + 1

        sorted_merchants = sorted(merchant_counts.items(), key=lambda x: x[1], reverse=True)
        for merchant, count in sorted_merchants[:5]:
            print(f"  {merchant}: {count} transactions")

        # Currency breakdown
        currencies = {}
        for trans in result['transactions']:
            curr = trans.get('destination_currency', 'Unknown')
            currencies[curr] = currencies.get(curr, 0) + 1

        print("\nDestination currencies:")
        for curr, count in sorted(currencies.items()):
            print(f"  {curr}: {count} transactions")


def example_3_batch_analysis():
    """Example 3: Analyze batch summaries."""
    print("\n" + "=" * 70)
    print("EXAMPLE 3: Batch Analysis (EP-210B)")
    print("=" * 70)

    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/EP210B.TXT"
    result = parse_ep_210b(filepath)

    print(f"\nReport: {result['header'].get('report_number')}")
    print(f"Total batches: {len(result['batches'])}")

    # Analyze first 5 batches
    print("\nFirst 5 batches:")
    for i, batch in enumerate(result['batches'][:5], 1):
        print(f"\nBatch {i}:")
        print(f"  File ID: {batch.get('file_id')}")
        print(f"  Batch Number: {batch.get('batch_number')}")
        print(f"  Total Transactions: {batch.get('total_transactions')}")
        print(f"  Gross Amount: {batch.get('gross_amount')}")

        # Financial data breakdown
        if batch.get('financial_data'):
            currencies = {}
            for row in batch['financial_data']:
                curr = row.get('currency', 'Total')
                if curr not in currencies:
                    currencies[curr] = []
                currencies[curr].append(row)

            for curr, rows in currencies.items():
                total = sum(float(r.get('amount', 0).replace(',', '')) for r in rows if r.get('amount'))
                count = sum(r.get('count', 0) for r in rows)
                print(f"  {curr}: {total:.2f} ({count} items)")


def example_4_reconciliation_check():
    """Example 4: Check reconciliation data."""
    print("\n" + "=" * 70)
    print("EXAMPLE 4: Reconciliation Check (EP-220)")
    print("=" * 70)

    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/EP220.TXT"
    result = parse_ep_220(filepath)

    print(f"\nReport: {result['header'].get('report_number')}")
    print(f"Files in reconciliation: {len(result['files'])}")

    # Analyze each file
    for file_data in result['files']:
        file_id = file_data.get('file_id')
        batches = file_data.get('batches', [])
        print(f"\nFile: {file_id}")
        print(f"  Batches: {len(batches)}")

        # Check batch statuses
        accepted = sum(1 for b in batches if 'ACCEPTED' in b.get('disposition', ''))
        not_accepted = len(batches) - accepted
        print(f"  Accepted: {accepted}")
        print(f"  Not accepted: {not_accepted}")

        # Show any unaccepted batches
        if not_accepted > 0:
            print("  Unaccepted batches:")
            for batch in batches:
                if 'ACCEPTED' not in batch.get('disposition', ''):
                    print(f"    Batch {batch.get('batch_number')}: {batch.get('disposition')}")


def example_5_settlement_hierarchy():
    """Example 5: Explore settlement hierarchy."""
    print("\n" + "=" * 70)
    print("EXAMPLE 5: Settlement Hierarchy (EP-746)")
    print("=" * 70)

    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/EP746.TXT"
    result = parse_ep_746(filepath)

    print(f"\nReport: {result['header'].get('report_number')}")
    print(f"Total records: {len(result['records'])}")

    # Show unique entities
    if result['records']:
        entities = {}
        for record in result['records']:
            entity_id = record.get('settlement_entity_id', 'Unknown')
            entity_name = record.get('entity_name', 'Unknown')
            if entity_id not in entities:
                entities[entity_id] = entity_name

        print(f"\nUnique settlement entities: {len(entities)}")
        print("\nFirst 10 entities:")
        for i, (ent_id, ent_name) in enumerate(list(entities.items())[:10], 1):
            print(f"  {i}. {ent_id}: {ent_name}")


def example_6_raw_transaction_analysis():
    """Example 6: Analyze raw machine-readable transaction data."""
    print("\n" + "=" * 70)
    print("EXAMPLE 6: Raw Transaction Analysis (AD3103)")
    print("=" * 70)

    filepath = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323/AD3103.TXT"
    result = parse_ad3103(filepath)

    print(f"\nTotal transactions: {len(result['transactions'])}")
    print(f"Record type distribution: {result['record_count']}")

    # Analyze first transaction
    if result['transactions']:
        trans = result['transactions'][0]
        data = trans.get('data', {})

        print(f"\nFirst transaction:")
        print(f"  Account: {data.get('account_number')}")
        print(f"  Merchant: {data.get('merchant_name')}")
        print(f"  Destination Amount: {data.get('destination_amount')}")
        print(f"  Destination Currency: {data.get('destination_currency')}")
        print(f"  Purchase Date: {data.get('purchase_date')}")

        # Show additional records
        additional = trans.get('additional_records', [])
        print(f"  Additional records: {len(additional)}")
        for add_rec in additional:
            record_type = add_rec.get('record_type')
            add_data = add_rec.get('data', {})
            print(f"    {record_type}: {list(add_data.keys())[:3]}...")


def example_7_full_package_export():
    """Example 7: Parse and export entire package."""
    print("\n" + "=" * 70)
    print("EXAMPLE 7: Full Package Parsing & Export")
    print("=" * 70)

    package_dir = "/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323"

    print(f"\nParsing package: {package_dir}")
    results = parse_package(package_dir)

    # Show overall summary
    summary = {
        "parsing_timestamp": "2024-03-23T00:00:00Z",
        "package_directory": package_dir,
        "files_parsed": results["package_info"]["parsed_files"],
        "files_failed": results["package_info"]["failed_files"],
        "statistics": {
            "sales_drafts": len(results["transaction_reports"].get("ep_705", {}).get("transactions", [])),
            "cash_disbursements": len(results["transaction_reports"].get("ep_707", {}).get("transactions", [])),
            "reversals": len(results["transaction_reports"].get("ep_727", {}).get("transactions", [])),
            "batches_summarized": len(results["summary_reports"].get("ep_210b", {}).get("batches", [])),
            "settlement_records": len(results["settlement_reports"].get("ep_746", {}).get("records", [])),
        }
    }

    print("\nPackage Summary:")
    print(dumps(summary, indent=2))

    # Export to JSON (example output path)
    output_file = "/tmp/settlement_package_parsed.json"
    print(f"\nExporting to {output_file}...")
    export_to_json(results, output_file)
    print("Export complete!")


def main():
    """Run all examples."""
    print("\n" + "=" * 70)
    print("SettleOps Parsing Engine - Usage Examples")
    print("=" * 70)

    examples = [
        ("Quick Summary", example_1_quick_summary),
        ("Sales Drafts Analysis", example_2_analyze_sales_drafts),
        ("Batch Analysis", example_3_batch_analysis),
        ("Reconciliation Check", example_4_reconciliation_check),
        ("Settlement Hierarchy", example_5_settlement_hierarchy),
        ("Raw Transaction Analysis", example_6_raw_transaction_analysis),
        ("Full Package Export", example_7_full_package_export),
    ]

    for title, example_func in examples:
        try:
            example_func()
        except Exception as e:
            print(f"\nError in {title}: {e}")

    print("\n" + "=" * 70)
    print("All examples completed!")
    print("=" * 70)


if __name__ == "__main__":
    main()
