"""
Parser for AD3103.TXT - Raw machine-readable Visa data records.

Parses fixed-width record types:
- 0500: Required transaction data
- 0501: Additional data
- 0505: Extended data
- 0507: Chip card data

Records are grouped by transaction (each 0500 starts a new transaction).
"""

from typing import List, Dict, Optional
import re


def parse_ad3103(filepath: str) -> Dict:
    """
    Parse AD3103.TXT raw machine-readable records.

    Format: Fixed-width records, each starting with a record type code (0500, 0501, 0505, 0507).

    Each transaction consists of:
    - One 0500 record (required data)
    - Zero or more 0501 records (additional data)
    - Zero or more 0505 records (extended data)
    - Zero or more 0507 records (chip card data)

    Args:
        filepath: Path to AD3103.TXT file

    Returns:
        Dictionary with 'transactions' key containing list of transaction records
    """
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    result = {"transactions": [], "record_count": {}}

    if not lines:
        return result

    current_transaction = None

    for line in lines:
        line = line.rstrip("\n")

        if not line.strip():
            continue

        # Detect record type from first 4 characters
        record_type = line[0:4].strip()

        if record_type == "0500":
            # Start of new transaction
            if current_transaction:
                result["transactions"].append(current_transaction)

            current_transaction = {
                "record_type": "0500",
                "data": _parse_0500_record(line),
                "additional_records": [],
            }
            result["record_count"]["0500"] = result["record_count"].get("0500", 0) + 1

        elif record_type in ("0501", "0505", "0507") and current_transaction:
            # Add to current transaction
            parsed = None
            if record_type == "0501":
                parsed = _parse_0501_record(line)
            elif record_type == "0505":
                parsed = _parse_0505_record(line)
            elif record_type == "0507":
                parsed = _parse_0507_record(line)

            if parsed:
                current_transaction["additional_records"].append(
                    {"record_type": record_type, "data": parsed}
                )

            result["record_count"][record_type] = result["record_count"].get(record_type, 0) + 1

    # Add last transaction
    if current_transaction:
        result["transactions"].append(current_transaction)

    return result


def _parse_0500_record(line: str) -> Dict:
    """
    Parse a 0500 (Required Data) record.

    This is the main transaction record with core transaction data.
    Format is fixed-width with positions varying by field.

    Args:
        line: The 0500 record line

    Returns:
        Dictionary with parsed fields
    """
    record = {}

    # Record type
    record["record_type"] = line[0:4].strip()

    # Account number (approximately positions 4-27)
    record["account_number"] = line[4:27].strip()

    # Acquirer reference number (approximately positions 27-52)
    record["acquirer_ref_number"] = line[27:52].strip()

    # Acquirer business ID (approximately positions 52-61)
    record["acquirer_business_id"] = line[52:61].strip()

    # Purchase date (YYMMDD format)
    record["purchase_date"] = line[61:67].strip()

    # Destination amount (approximately positions 67-79)
    dest_amount = line[67:79].strip()
    record["destination_amount"] = _parse_amount(dest_amount)

    # Destination currency (3 digits)
    record["destination_currency"] = line[79:82].strip()

    # Source amount
    record["source_amount"] = line[82:94].strip()

    # Source currency
    record["source_currency"] = line[94:97].strip()

    # Merchant name (approximately positions 97-122)
    record["merchant_name"] = line[97:122].strip()

    # Merchant city (approximately positions 122-137)
    record["merchant_city"] = line[122:137].strip()

    # Merchant country code (2 chars, approximately 137-139)
    record["merchant_country"] = line[137:139].strip()

    # Merchant category code (approximately 139-143)
    record["merchant_category_code"] = line[139:143].strip()

    # Merchant ZIP code
    record["merchant_zip"] = line[143:149].strip()

    # Floor limit indicator and other flags
    record["floor_limit_indicator"] = line[149:150].strip() if len(line) > 149 else ""

    # Additional parsing for remaining fields
    if len(line) > 150:
        # Authorization code (approximately 151-157)
        record["authorization_code"] = line[151:157].strip()

    if len(line) > 157:
        # POS entry mode
        record["pos_entry_mode"] = line[157:159].strip()

    if len(line) > 159:
        # Central processing date
        record["cpd"] = line[159:165].strip()

    if len(line) > 165:
        # Reimbursement attribute
        record["reimbursement_attribute"] = line[165:166].strip()

    return record


def _parse_0501_record(line: str) -> Dict:
    """
    Parse a 0501 (Additional Data) record.

    Args:
        line: The 0501 record line

    Returns:
        Dictionary with parsed fields
    """
    record = {}

    record["record_type"] = line[0:4].strip()

    # Extract structured fields from the record
    # Format varies, so we extract what we can identify

    # Rate table ID (typically "A" followed by digits)
    rate_match = re.search(r"(A\d{4})", line)
    if rate_match:
        record["rate_table_id"] = rate_match.group(1)

    # Card acceptor ID and terminal ID are often present
    acceptor_match = re.search(r"\s([A-Z0-9]{8,16})\s([A-Z0-9]{8})", line)
    if acceptor_match:
        record["card_acceptor_id"] = acceptor_match.group(1)
        record["terminal_id"] = acceptor_match.group(2)

    # National reimbursement fee (12 digits)
    fee_match = re.search(r"(\d{12})\s", line)
    if fee_match:
        record["national_reimb_fee"] = fee_match.group(1)

    # Mail/Phone/Ecomm indicator and conversion date
    conversion_match = re.search(r"(\d{4})\s", line[-20:])
    if conversion_match:
        record["conversion_date"] = conversion_match.group(1)

    return record


def _parse_0505_record(line: str) -> Dict:
    """
    Parse a 0505 (Extended Data) record.

    Contains additional authorization and processing information.

    Args:
        line: The 0505 record line

    Returns:
        Dictionary with parsed fields
    """
    record = {}

    record["record_type"] = line[0:4].strip()

    # Transaction identifier (typically 15 digits)
    trans_id_match = re.search(r"(\d{15})", line[4:25])
    if trans_id_match:
        record["transaction_identifier"] = trans_id_match.group(1)

    # Authorized amount (12 digits)
    auth_amount_match = re.search(r"(\d{12})", line[25:45])
    if auth_amount_match:
        record["authorized_amount"] = auth_amount_match.group(1)

    # Auth currency code (3 digits)
    auth_currency_match = re.search(r"([0-9]{3})", line[37:50])
    if auth_currency_match:
        record["auth_currency"] = auth_currency_match.group(1)

    # Interchange fee amount (15 digits with possible decimal)
    interchange_match = re.search(r"(\d{15})", line[70:90])
    if interchange_match:
        record["interchange_fee"] = interchange_match.group(1)

    # Exchange rates
    rate_match = re.search(r"(\d{8})", line[100:120])
    if rate_match:
        record["exchange_rate"] = rate_match.group(1)

    return record


def _parse_0507_record(line: str) -> Dict:
    """
    Parse a 0507 (Chip Card Data) record.

    Contains EMV/chip card specific transaction data.

    Args:
        line: The 0507 record line

    Returns:
        Dictionary with parsed fields
    """
    record = {}

    record["record_type"] = line[0:4].strip()

    # Transaction type (typically 2 digits)
    record["transaction_type"] = line[4:6].strip()

    # Card sequence number (3 digits)
    record["card_sequence_number"] = line[6:9].strip()

    # Terminal transaction date (YYMMDD)
    record["terminal_transaction_date"] = line[9:15].strip()

    # Terminal capability profile (6 digits)
    record["terminal_capability_profile"] = line[15:21].strip()

    # Terminal country code (3 digits)
    record["terminal_country_code"] = line[21:24].strip()

    # Terminal serial number (8 bytes)
    record["terminal_serial_number"] = line[24:32].strip()

    # Unpredictable number (4 bytes hex)
    record["unpredictable_number"] = line[32:36].strip()

    # Application transaction counter (4 bytes hex)
    record["atc"] = line[36:40].strip()

    # Application interchange profile (4 bytes hex)
    record["aip"] = line[40:44].strip()

    # Cryptogram (8 bytes hex)
    record["cryptogram"] = line[44:52].strip()

    # Issuer application data fields
    iad_match = re.search(r"([0-9A-F]{32})", line[52:])
    if iad_match:
        record["issuer_app_data"] = iad_match.group(1)

    return record


def _parse_amount(amount_str: str) -> Optional[float]:
    """
    Parse a numeric amount string.

    Args:
        amount_str: String containing the amount (may have leading zeros)

    Returns:
        Float value or None
    """
    if not amount_str or amount_str == "NULL":
        return None

    try:
        # Remove leading zeros and convert
        amount = float(amount_str)
        return amount
    except ValueError:
        return None
