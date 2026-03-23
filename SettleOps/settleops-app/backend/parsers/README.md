# SettleOps Parsing Engine

A comprehensive Python parsing engine for Visa Edit Package (EP) reports and VSS settlement reports used in post-clearing Visa/Mastercard settlement operations.

## Overview

This parsing engine transforms fixed-width text files from Visa interchange and settlement operations into structured Python dictionaries, enabling programmatic analysis of settlement data.

## Report Types Supported

### Transaction Reports

- **EP-705**: Sales Drafts (107 pages, ~650KB)
  - Print-ready format with labeled fields
  - ~214 transactions parsed in test data
  - Fields: Account, Acquirer Reference, Purchase Date, Amounts, Merchant Info, Auth Code, etc.

- **EP-707**: Cash Disbursements (3,539 pages, ~23MB)
  - ATM/cash withdrawal transactions
  - ~7,077 transactions parsed in test data
  - Same field structure as EP-705
  - Optimized for streaming large files

- **EP-727**: Cash Disbursement Reversals (62 pages, ~319KB)
  - Reversal/reversal transactions
  - Same format as EP-705/EP-707

### Summary/Control Reports

- **EP-210B**: Incoming Interchange Batch Summary
  - Batch-level financial summaries with counts and amounts
  - Parsed: 19 batches with transaction details

- **EP-210C/D/E/F**: File/CPD/Run Summaries
  - Different aggregation levels of financial data

- **EP-211C/D/E**: Summary by Currency Code
  - Breakdown by currency (GHS/0, GHS/8, USD, etc.)
  - Transaction counts and totals per currency

- **EP-220**: Collected Reconciliation Summary
  - E/P batch acknowledgement status
  - Visanet accepted vs. sent amounts

### Settlement Reports

- **EP-746**: Member Settlement Data (116 pages, ~799KB)
  - Raw fixed-width settlement hierarchy records (4600... format)
  - ~1,142 records parsed
  - Settlement entity relationships and hierarchy

- **EP-747**: VSS Settlement Reports (98 pages, ~460KB)
  - Multiple VSS sub-reports:
    - VSS-100-W: Hierarchy List
    - VSS-110: Settlement Summary
    - VSS-120: Interchange Value
    - VSS-130: Reimbursement Fees
    - VSS-140: Visa Charges
    - VSS-210: Currency Conversion Fees
    - VSS-300: SRE Financial Recap
    - VSS-900 series: Reconciliation

### Miscellaneous Reports

- **EP-750**: Text Messages
  - Message text with identifiers

- **EP-756**: Currency Conversion Rates (25 pages, ~143KB)
  - ~221 conversion rate entries
  - Counter currency, base currency, buy/sell rates
  - Effective dates and rate table IDs

- **EP-999**: Index of Reports
  - Report directory with page counts
  - 67 report entries indexed
  - Identifies which reports are empty (NULL)

### Raw Data

- **AD3103.TXT**: Machine-Readable Records (1.9MB)
  - Fixed-width record types:
    - 0500: Required transaction data (main record)
    - 0501: Additional data
    - 0505: Extended data
    - 0507: Chip card data
  - 71 transactions with ~3.2 record types per transaction
  - Records grouped by transaction

## Architecture

### Module Structure

```
parsers/
├── __init__.py              # Package exports
├── common.py                # Shared utilities and fixed-width parsing
├── ep_transactions.py       # EP-705, EP-707, EP-727 parsers
├── ep_summaries.py         # EP-210, EP-211, EP-220 parsers
├── ep_settlement.py        # EP-746, EP-747 parsers
├── ep_misc.py              # EP-750, EP-756, EP-999 parsers
├── ad_raw.py               # AD3103.TXT parser
└── package_parser.py       # Main orchestrator
```

### Core Components

**common.py**: `FixedWidthParser`
- `extract_field()`: Extract string fields from fixed positions
- `extract_numeric()`: Extract and convert numeric fields
- `extract_integer()`: Extract and convert integer fields
- Utility functions for parsing headers, dates, amounts

**ep_transactions.py**: Print-Ready Transaction Parsers
- Handles labeled field format (Field Name    VALUE)
- Two-column layout typical of print reports
- Normalizes raw parsed data to standard keys

**ep_summaries.py**: Summary Report Parsers
- Tabular format with column headers
- Batch/file/CPD/run level aggregations
- Currency-based summaries

**ep_settlement.py**: Settlement Data Parsers
- 4600 record parsing for EP-746
- VSS sub-report detection and parsing for EP-747
- Hierarchy extraction from raw records

**ep_misc.py**: Miscellaneous Report Parsers
- Key-value format for currency rates
- Tabular report index
- Text message handling

**ad_raw.py**: Raw Record Parser
- Fixed-width record type detection
- Transaction grouping by 0500 record boundaries
- Field position extraction for each record type

**package_parser.py**: Orchestrator
- `PackageParser` class: Parses entire directory
- `parse_package()`: Convenience function
- Summary statistics and export functions

## Usage

### Basic Usage

```python
from parsers.package_parser import parse_package

# Parse an entire directory
results = parse_package("/path/to/VSS_Reports/310323/")

# Access parsed data
transactions = results["transaction_reports"]["ep_705"]["transactions"]
batches = results["summary_reports"]["ep_210b"]["batches"]
settlement_entities = results["settlement_reports"]["ep_746"]["records"]
```

### Individual Report Parsing

```python
from parsers.ep_transactions import parse_ep_705
from parsers.ep_summaries import parse_ep_220
from parsers.ad_raw import parse_ad3103

# Parse specific report
ep705_data = parse_ep_705("/path/to/EP705.TXT")
transactions = ep705_data["transactions"]

# Access transaction fields
for trans in transactions:
    account = trans.get("account_number")
    amount = trans.get("destination_amount")
    merchant = trans.get("merchant_name")
```

### Get Summary Statistics

```python
from parsers.package_parser import get_package_summary

summary = get_package_summary("/path/to/VSS_Reports/310323/")
print(f"Total transactions parsed: {summary['transaction_count']}")
print(f"Raw transactions: {summary['raw_transaction_count']}")
print(f"Files parsed: {summary['total_files_parsed']}")
```

### Export Results

```python
from parsers.package_parser import parse_package, export_to_json

results = parse_package("/path/to/VSS_Reports/310323/")
export_to_json(results, "parsed_settlement_data.json")
```

## Data Structures

### Transaction (EP-705/EP-707/EP-727)

```python
{
    "account_number": "4083191304090243000",
    "acquirer_ref_number": "24011343088000025900024",
    "purchase_date": "20230329",
    "destination_amount": "25908",
    "destination_currency": "936",
    "source_amount": "1900",
    "source_currency": "978",
    "merchant_name": "CONSULTING",
    "merchant_city": "HTTPSDOCUMENT",
    "merchant_country": "US",
    "merchant_category_code": "7392",
    "auth_code": "210919",
    "pos_entry_mode": "10",
    "cpd": "20230330",
    "reimbursement_attr": "0",
    # ... additional fields
}
```

### Batch Summary (EP-210B)

```python
{
    "file_id": "408319020230330A1036OCW",
    "batch_number": 1,
    "financial_data": [
        {
            "type": "Originals",
            "currency": "GHS/0",
            "amount": "321.91",
            "direction": "DB",
            "count": 2
        }
    ],
    "total_transactions": 37,
    "gross_amount": "17,032.09"
}
```

### Settlement Record (EP-746)

```python
{
    "record_type": "4600",
    "acquirer_id": "408319",
    "processor_id": "0000001",
    "settlement_entity_id": "1000479962",
    "processing_date": "230891",
    "posting_date": "20230075",
    "vss_reference": "V1100W",
    "entity_id": "1000479962",
    "entity_name": "AGRICULTURAL DEVELOPMENT BANK"
}
```

### Raw Transaction (AD3103)

```python
{
    "record_type": "0500",
    "data": {
        "record_type": "0500",
        "account_number": "4083191304090243000",
        "acquirer_ref_number": "24011343088000025900024",
        "purchase_date": "230329",
        "destination_amount": 25908,
        "destination_currency": "936",
        # ... more fields
    },
    "additional_records": [
        {
            "record_type": "0501",
            "data": {
                "rate_table_id": "A0505",
                # ... more fields
            }
        },
        {
            "record_type": "0505",
            "data": {
                "transaction_identifier": "583088494968638",
                # ... more fields
            }
        }
    ]
}
```

## Test Results

All parsers have been tested against actual Visa settlement data:

```
EP-705 (Sales Drafts):                  214 transactions
EP-707 (Cash Disbursements):          7,077 transactions
EP-210B (Batch Summary):                  19 batches
EP-220 (Reconciliation Summary):           2 files
EP-746 (Settlement Data):              1,142 records
EP-747 (VSS Reports):                     11 sub-reports
EP-756 (Currency Rates):                 221 rate entries
EP-999 (Report Index):                    67 reports
AD3103 (Raw Data):                        71 transactions
```

**Total**: 7,414 transactions parsed from print-ready reports, 71 from raw records

## Performance Considerations

- **EP-707** (23MB): Optimized for streaming large files to avoid memory overload
- **Fixed-width parsing**: Uses efficient string slicing rather than regex when positions are known
- **Record grouping**: AD3103 groups records by transaction for coherent data structures
- **Lazy parsing**: VSS sub-reports are partially parsed; deep parsing deferred as needed

## Error Handling

- Gracefully handles missing fields (returns None)
- Handles file encoding issues with UTF-8 with error='ignore'
- Continues parsing on malformed lines (skips them)
- Reports failed files in summary statistics

## Known Limitations

1. VSS sub-reports (EP-747) are partially parsed; detailed parsing varies by report type
2. Some fixed-width positions are inferred from observation; may require adjustment for different Visa versions
3. Page break detection is basic; multi-line field values may not parse perfectly
4. Currency amount parsing assumes standard format; unusual formats may not parse correctly

## Future Enhancements

1. Deep parsing of all VSS sub-report types (currently basic structure only)
2. Validation rules for transaction fields
3. Cross-report reconciliation checking
4. Performance profiling and optimization for even larger files
5. Streaming JSON export for memory-efficient processing of large datasets

## Dependencies

- Python 3.6+
- Standard library only (no external dependencies)

## License

Part of SettleOps platform
