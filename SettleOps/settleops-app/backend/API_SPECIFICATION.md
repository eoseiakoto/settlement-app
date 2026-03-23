# SettleOps API Specification

Complete REST API specification for the SettleOps settlement operations platform.

## Base URL
```
http://127.0.0.1:5000/api
```

## Response Format

All responses are JSON. Success responses include status codes 2xx, error responses include 4xx or 5xx.

### Success Response
```json
{
  "data": {},
  "status": 200,
  "message": "Optional message"
}
```

### Error Response
```json
{
  "error": "Error description",
  "status": 400
}
```

## Endpoints

### 1. Health Check

#### GET /health
Health check endpoint with data store status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-03-10T16:00:00",
  "data_store_keys": ["packages", "transactions", "settlement", "control", "raw_reports"]
}
```

---

## 2. Upload & Parse

### POST /upload
Upload a ZIP file or directory path containing EP/VSS reports.

**Request:**
```bash
# File upload
curl -X POST -F "file=@reports.zip" http://127.0.0.1:5000/api/upload

# Path-based (for local directories)
curl -X POST -H "Content-Type: application/json" \
  -d '{"path": "/path/to/vss_reports"}' \
  http://127.0.0.1:5000/api/upload
```

**Response:**
```json
{
  "status": "uploaded",
  "filename": "reports.zip",
  "message": "File upload handler ready when parsers module available"
}
```

**Status:** 202 Accepted

---

### GET /packages
List all uploaded/parsed report packages.

**Response:**
```json
{
  "count": 1,
  "packages": [
    {
      "id": "PKG001",
      "timestamp": "2023-03-10T16:00:00",
      "file_count": 8,
      "status": "parsed",
      "reports": ["EP-746", "EP-747", "VSS-100-W", "VSS-120", "EP-210", "EP-999"],
      "transaction_count": 4
    }
  ]
}
```

**Status:** 200 OK

---

### GET /packages/<package_id>
Get summary of a specific parsed package.

**Parameters:**
- `package_id` (path) - Package identifier

**Response:**
```json
{
  "id": "PKG001",
  "timestamp": "2023-03-10T16:00:00",
  "file_count": 8,
  "status": "parsed",
  "reports": ["EP-746", "EP-747", "VSS-100-W"],
  "transaction_count": 4
}
```

**Status:** 200 OK (or 404 if not found)

---

## 3. Transaction Data

### GET /transactions
List transactions with filtering and pagination.

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| page | int | Page number (default: 1) | 1 |
| per_page | int | Results per page (default: 50, max: 500) | 50 |
| type | string | Transaction type (sales, cash, reversal) | sales |
| start_date | string | Start date (YYYY-MM-DD) | 2023-03-01 |
| end_date | string | End date (YYYY-MM-DD) | 2023-03-31 |
| min_amount | float | Minimum amount | 100.00 |
| max_amount | float | Maximum amount | 5000.00 |
| currency | string | Currency code (USD, EUR, GHS) | USD |
| merchant | string | Merchant name (partial match) | Accra |
| country | string | Country (code or name) | Ghana |

**Example:**
```bash
curl "http://127.0.0.1:5000/api/transactions?type=sales&currency=USD&page=1&per_page=25"
```

**Response:**
```json
{
  "total": 150,
  "page": 1,
  "per_page": 25,
  "pages": 6,
  "transactions": [
    {
      "id": "TXN001",
      "type": "sales",
      "date": "2023-03-10T10:30:00",
      "amount": 1500.00,
      "currency": "USD",
      "merchant": "Accra Electronics Ltd",
      "country": "Ghana",
      "description": "Point of sale transaction"
    }
  ]
}
```

**Status:** 200 OK

---

### GET /transactions/<transaction_id>
Get detailed information for a specific transaction.

**Parameters:**
- `transaction_id` (path) - Transaction identifier

**Response:**
```json
{
  "id": "TXN001",
  "type": "sales",
  "date": "2023-03-10T10:30:00",
  "amount": 1500.00,
  "currency": "USD",
  "merchant": "Accra Electronics Ltd",
  "country": "Ghana",
  "description": "Point of sale transaction",
  "batch_id": "BATCH001",
  "merchant_id": "MID001",
  "card_type": "VISA",
  "processing_code": "000000"
}
```

**Status:** 200 OK (or 404 if not found)

---

### GET /transactions/summary
Get aggregated transaction summary statistics.

**Response:**
```json
{
  "total_count": 150,
  "total_amount": 245678.50,
  "by_type": {
    "sales": 120,
    "cash": 25,
    "reversal": 5
  },
  "by_currency": {
    "USD": {
      "count": 100,
      "total": 150000.00
    },
    "GHS": {
      "count": 50,
      "total": 95678.50
    }
  },
  "by_country": {
    "Ghana": {
      "count": 140,
      "total": 240000.00
    },
    "Other": {
      "count": 10,
      "total": 5678.50
    }
  }
}
```

**Status:** 200 OK

---

## 4. Settlement Data

### GET /settlement
Get settlement summary from EP-746/EP-747 VSS reports.

**Response:**
```json
{
  "period": "2023-03-10",
  "currency": "USD",
  "total_transactions": 150,
  "total_amount": 245678.50,
  "settlement_date": "2023-03-15",
  "status": "pending",
  "breakdown": {
    "sales": 200000.00,
    "cash": 40000.00,
    "reversals": -5678.50,
    "fees": -1500.00
  }
}
```

**Status:** 200 OK

---

### GET /settlement/hierarchy
Get settlement reporting hierarchy from VSS-100-W report.

**Response:**
```json
{
  "report_type": "VSS-100-W",
  "hierarchy": {
    "organization": "Agricultural Development Bank",
    "country": "Ghana",
    "settlement_entity": "ADB_VISA_001",
    "parent_entities": [...]
  },
  "loaded": true
}
```

**Status:** 200 OK

---

### GET /settlement/interchange
Get interchange value data from VSS-120 report.

**Response:**
```json
{
  "report_type": "VSS-120",
  "interchange": {
    "sales_interchange": 5000.00,
    "cash_interchange": 750.00,
    "recurring_interchange": 250.00,
    "discounts": -500.00,
    "net_interchange": 5500.00
  },
  "loaded": true
}
```

**Status:** 200 OK

---

### GET /settlement/fees
Get fee breakdowns from VSS reports.

**Response:**
```json
{
  "reimbursement": {
    "acquirer_processing_fees": 200.00,
    "other_fees": 50.00
  },
  "visa_charges": {
    "assessment_fees": 100.00,
    "gateway_fees": 50.00,
    "other_charges": 25.00
  },
  "currency_conversion": {
    "conversion_amount": 1000.00,
    "conversion_rate": 12.50,
    "conversion_fee": 50.00
  }
}
```

**Status:** 200 OK

---

### GET /settlement/reconciliation
Get reconciliation data from VSS-900 series reports.

**Response:**
```json
{
  "reconciliation_reports": {
    "VSS-900": {
      "summary_type": "Complete reconciliation summary"
    },
    "VSS-910": {
      "summary_type": "By-product summary"
    }
  },
  "loaded": true
}
```

**Status:** 200 OK

---

## 5. Control & Operations

### GET /control/batch-summary
Get batch/file/run summaries from EP-210 series reports.

**Response:**
```json
{
  "report_type": "EP-210",
  "batch_summary": {
    "batch_id": "BATCH001",
    "batch_date": "2023-03-10",
    "file_count": 8,
    "status": "completed",
    "processing_date": "2023-03-10T23:59:59"
  },
  "loaded": true
}
```

**Status:** 200 OK

---

### GET /control/reconciliation
Get collected reconciliation data from EP-220 report.

**Response:**
```json
{
  "report_type": "EP-220",
  "reconciliation": {
    "batch_id": "BATCH001",
    "reconciliation_date": "2023-03-11",
    "total_records_reported": 150,
    "total_amount_reported": 245678.50,
    "reconciliation_status": "balanced"
  },
  "loaded": true
}
```

**Status:** 200 OK

---

### GET /control/index
Get report index from EP-999 report.

**Response:**
```json
{
  "report_type": "EP-999",
  "index": {
    "report_list": [
      "EP-746",
      "EP-747",
      "VSS-100-W",
      "VSS-120",
      "EP-210",
      "EP-220",
      "EP-999"
    ],
    "total_reports": 7
  },
  "loaded": true
}
```

**Status:** 200 OK

---

### GET /control/currency-rates
Get currency conversion rates from EP-756 report.

**Response:**
```json
{
  "report_type": "EP-756",
  "currency_rates": {
    "USD_to_GHS": {
      "rate": 12.50,
      "effective_date": "2023-03-10",
      "source": "Visa"
    },
    "EUR_to_GHS": {
      "rate": 13.75,
      "effective_date": "2023-03-10",
      "source": "Visa"
    }
  },
  "loaded": true
}
```

**Status:** 200 OK

---

## 6. Dashboard

### GET /dashboard
Get aggregated dashboard data combining key metrics from all reports.

**Response:**
```json
{
  "timestamp": "2023-03-10T16:00:00",
  "transactions": {
    "total_count": 150,
    "total_amount": 245678.50,
    "by_type": {
      "sales": 120,
      "cash": 25,
      "reversal": 5
    },
    "by_currency": {
      "USD": 100,
      "GHS": 50
    }
  },
  "settlement": {
    "period": "2023-03-10",
    "currency": "USD",
    "total_amount": 245678.50,
    "settlement_date": "2023-03-15",
    "status": "pending"
  },
  "data_loaded": true
}
```

**Status:** 200 OK

---

## Error Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 202 | Accepted | Request accepted (async processing) |
| 400 | Bad Request | Invalid parameters or missing required fields |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## Rate Limiting

Currently no rate limiting. Will be added in production.

---

## Authentication

Currently no authentication required. Will be added in production using JWT or OAuth2.

---

## Pagination

List endpoints support pagination:
- `page`: Current page (default: 1)
- `per_page`: Results per page (default: 50, max: 500)

Response includes:
- `total`: Total number of items
- `page`: Current page
- `per_page`: Results per page
- `pages`: Total number of pages

---

## Filtering

Transaction filtering supports:
- Type filtering (sales, cash, reversal)
- Date range filtering (start_date, end_date)
- Amount range filtering (min_amount, max_amount)
- Currency filtering
- Merchant filtering (partial match)
- Country filtering (partial match)

Filters can be combined using query parameters.

---

## Examples

### Get sales transactions over $1000 in USD
```bash
curl "http://127.0.0.1:5000/api/transactions?type=sales&currency=USD&min_amount=1000"
```

### Get transactions for a date range
```bash
curl "http://127.0.0.1:5000/api/transactions?start_date=2023-03-01&end_date=2023-03-31"
```

### Get transaction summary
```bash
curl http://127.0.0.1:5000/api/transactions/summary
```

### Get dashboard data
```bash
curl http://127.0.0.1:5000/api/dashboard
```

---

## Implementation Notes

- All timestamps are ISO 8601 format
- All amounts are numeric (float)
- Currency codes follow ISO 4217
- Country codes follow ISO 3166-1 alpha-2
- Data is currently stored in-memory; will be moved to database in production
- Parsers module integration pending completion of individual parser modules

