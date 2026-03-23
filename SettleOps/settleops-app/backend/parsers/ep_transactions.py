"""
Parsers for EP-705 (Sales Drafts), EP-707 (Cash Disbursements), EP-727 (Reversals).

These are print-ready transaction reports with a two-column labeled field format.
Each transaction has Required Data and Additional Data sections separated by section headers.

Line format (columns are 0-indexed):
  Col 1-27:  Left field label
  Col 28-55: Left field value
  Col 56-83: Right field label
  Col 84+:   Right field value
"""

from typing import List, Dict
from .common import parse_header, is_page_header, is_empty_or_spacing


# Column boundaries for the two-column layout (0-indexed)
# Verified from actual EP-705/707/727 data:
#   Left label:  cols 1-26   Right label: cols 67-92
#   Left value:  cols 27-66  Right value: cols 93-132
LEFT_LABEL_START = 1
LEFT_LABEL_END = 27
LEFT_VALUE_START = 27
LEFT_VALUE_END = 67
RIGHT_LABEL_START = 67
RIGHT_LABEL_END = 93
RIGHT_VALUE_START = 93
RIGHT_VALUE_END = 133


def _extract_two_column_fields(line: str) -> Dict[str, str]:
    """
    Extract fields from a two-column labeled line.

    Returns dict of {field_label: field_value} for non-empty pairs found.
    """
    fields = {}
    if len(line) < 30:
        return fields

    # Pad line to ensure we can slice safely
    padded = line.ljust(130)

    # Left column
    left_label = padded[LEFT_LABEL_START:LEFT_LABEL_END].strip()
    left_value = padded[LEFT_VALUE_START:LEFT_VALUE_END].strip()
    if left_label and left_value:
        fields[left_label] = left_value

    # Right column
    right_label = padded[RIGHT_LABEL_START:RIGHT_LABEL_END].strip()
    right_value = padded[RIGHT_VALUE_START:RIGHT_VALUE_END].strip()
    if right_label and right_value:
        fields[right_label] = right_value

    return fields


def _is_section_header(line: str) -> bool:
    """Check if line is a section header (e.g., '      Sales Draft - Original  ---- Required Data')."""
    return "----" in line


def _is_transaction_start(line: str) -> bool:
    """Check if line starts a new transaction section."""
    stripped = line.strip()
    return (
        "----" in stripped
        and ("Required Data" in stripped or "Additional Data" in stripped)
    )


# Master field mapping from print-ready labels to normalized keys
FIELD_MAP = {
    "Acct Number & Extension": "account_number",
    "Acquirer Reference Nbr": "acquirer_ref_number",
    "Purchase Date": "purchase_date",
    "Destination Amount": "destination_amount",
    "Destination Currency Code": "destination_currency",
    "Source Amount": "source_amount",
    "Source Currency Code": "source_currency",
    "Merchant Name": "merchant_name",
    "Merchant City": "merchant_city",
    "Merchant Country Code": "merchant_country",
    "Merchant Category Code": "merchant_category_code",
    "Authorization Code": "auth_code",
    "POS Entry Mode": "pos_entry_mode",
    "Central Processing Date": "cpd",
    "Reimbursement Attribute": "reimbursement_attr",
    "Merchant ZIP Code": "merchant_zip",
    "Floor Limit Indicator": "floor_limit_indicator",
    "CRB/Exception File Ind": "crb_exception_indicator",
    "Acquirer's Business ID": "acquirer_business_id",
    "Merchant State/Prov. Code": "merchant_state",
    "Settlement Flag": "settlement_flag",
    "Auth Characteristics Ind": "auth_characteristics",
    "POS Terminal Capability": "pos_terminal_capability",
    "Cardholder ID Method": "cardholder_id_method",
    "Collection-Only Flag": "collection_only_flag",
    "Chargeback Reason Code": "chargeback_reason_code",
    "Requested Payment Service": "requested_payment_service",
    "Number of Payment Forms": "number_of_payment_forms",
    "Usage Code": "usage_code",
    "Business Format Code": "business_format_code",
    "Token Assurance Method": "token_assurance_method",
    "Rate Table ID": "rate_table_id",
    "Conversion Date": "conversion_date",
    "Additional Token Response": "additional_token_response",
    "Reserved Data": "reserved_data",
    "Reserved": "reserved",
    "Acceptance Terminal Ind": "acceptance_terminal_ind",
    "Documentation Indicator": "documentation_indicator",
    "Prepaid Card Indicator": "prepaid_card_indicator",
    "Member Message Text": "member_message_text",
    "Service Development Field": "service_development_field",
    "Special Condition Ind": "special_condition_ind",
    "Fee Program Indicator": "fee_program_indicator",
    "Issuer Charge": "issuer_charge",
    "Transaction Identifier": "transaction_id",
    "Authorized Amount": "authorized_amount",
    "Auth Currency Cd": "auth_currency",
    "Nat'l Reimbursement Fee": "national_reimb_fee",
    "Card Acceptor ID": "card_acceptor_id",
    "Terminal ID": "terminal_id",
}


def _normalize_transaction(raw_fields: Dict[str, str], txn_type: str = "sale") -> Dict:
    """Normalize raw labeled fields to standard keys, with computed fields."""
    trans = {"type": txn_type}

    # Labels that are actually page header artifacts, not real fields
    SKIP_LABELS = {"SYSTEM DATE", "ADB", "REPORT EP-", "RELEASE", "408319"}

    for raw_key, raw_val in raw_fields.items():
        # Skip page header artifacts
        if any(raw_key.upper().startswith(s) for s in SKIP_LABELS):
            continue
        if any(s in raw_key.upper() for s in ["SYSTEM DATE", "RELEASE  4"]):
            continue

        norm_key = FIELD_MAP.get(raw_key)
        if norm_key:
            trans[norm_key] = raw_val
        # Keep unmapped fields too, under a cleaned-up name
        else:
            clean_key = raw_key.lower().replace(" ", "_").replace("'", "").replace("/", "_")
            # Skip obviously bogus keys (too short, or look like report header parts)
            if len(clean_key) > 2 and "release" not in clean_key and "page" not in clean_key:
                trans[clean_key] = raw_val

    # Computed fields
    if "destination_amount" in trans:
        try:
            trans["destination_amount_numeric"] = int(trans["destination_amount"]) / 100.0
        except (ValueError, TypeError):
            pass
    if "source_amount" in trans:
        try:
            trans["source_amount_numeric"] = int(trans["source_amount"]) / 100.0
        except (ValueError, TypeError):
            pass

    return trans


def _parse_print_ready_transactions(filepath: str, txn_type: str = "sale") -> Dict:
    """
    Parse a print-ready EP transaction report (EP-705, EP-707, EP-727).

    The format alternates between:
    - Page headers (REPORT EP-XXX ...)
    - Section headers (... ---- Required Data / ---- Additional Data)
    - Field lines (two-column labeled fields)
    - Blank lines (separate sections/transactions)

    A transaction consists of a Required Data section followed by an Additional Data section.
    """
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    result = {"header": {}, "transactions": []}

    if not lines:
        return result

    result["header"] = parse_header(lines)

    current_fields = {}
    in_required = False
    in_additional = False

    for line in lines:
        # Skip page headers
        if is_page_header(line):
            continue

        # Detect section headers
        if _is_section_header(line):
            if "Required Data" in line:
                # If we have accumulated fields from a previous transaction, save it
                if current_fields:
                    trans = _normalize_transaction(current_fields, txn_type)
                    if trans.get("account_number"):
                        result["transactions"].append(trans)
                current_fields = {}
                in_required = True
                in_additional = False
            elif "Additional Data" in line:
                in_required = False
                in_additional = True
            continue

        # Skip blank lines
        if is_empty_or_spacing(line):
            continue

        # Parse field lines when we're inside a section
        if in_required or in_additional:
            fields = _extract_two_column_fields(line)
            current_fields.update(fields)

    # Don't forget the last transaction
    if current_fields:
        trans = _normalize_transaction(current_fields, txn_type)
        if trans.get("account_number"):
            result["transactions"].append(trans)

    return result


def parse_ep_705(filepath: str) -> Dict:
    """Parse EP-705 (Sales Drafts) report."""
    return _parse_print_ready_transactions(filepath, txn_type="sale")


def parse_ep_707(filepath: str) -> Dict:
    """
    Parse EP-707 (Cash Disbursements) report.

    This file can be very large (23MB+), but we use the same line-by-line approach.
    """
    return _parse_print_ready_transactions(filepath, txn_type="cash_disbursement")


def parse_ep_727(filepath: str) -> Dict:
    """Parse EP-727 (Cash Disbursement Reversals) report."""
    return _parse_print_ready_transactions(filepath, txn_type="reversal")
