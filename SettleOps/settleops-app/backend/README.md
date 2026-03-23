# SettleOps Backend API

Flask-based REST API for Visa settlement operations and settlement report parsing for ADB (Agricultural Development Bank, Ghana).

## Setup

### Installation

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

### Running the Application

```bash
python app.py
```

The API will start on `http://127.0.0.1:5000`

**Note:** The app automatically loads sample data from `/sessions/upbeat-kind-goodall/mnt/SettleOps/VSS_Reports/310323` if available, or falls back to mock data for testing.

## API Endpoints

### Health Check
- `GET /api/health` - Health check with data store status

### Upload & Parse
- `POST /api/upload` - Upload a ZIP file or directory path containing EP/VSS reports
- `GET /api/packages` - List all uploaded/parsed report packages
- `GET /api/packages/<id>` - Get summary of a specific package

### Transaction Data
- `GET /api/transactions` - List transactions with filtering and pagination
  - Query params: `page`, `per_page`, `type`, `start_date`, `end_date`, `min_amount`, `max_amount`, `currency`, `merchant`, `country`
- `GET /api/transactions/<id>` - Get transaction detail
- `GET /api/transactions/summary` - Transaction summary statistics

### Settlement Data
- `GET /api/settlement` - Settlement summary from EP-746/EP-747
- `GET /api/settlement/hierarchy` - Settlement reporting hierarchy (VSS-100-W)
- `GET /api/settlement/interchange` - Interchange value data (VSS-120)
- `GET /api/settlement/fees` - Fee breakdowns (VSS-130, VSS-140, VSS-210)
- `GET /api/settlement/reconciliation` - Reconciliation data (VSS-900 series)

### Control & Operations
- `GET /api/control/batch-summary` - Batch/file/run summaries (EP-210)
- `GET /api/control/reconciliation` - Reconciliation data (EP-220)
- `GET /api/control/index` - Report index (EP-999)
- `GET /api/control/currency-rates` - Currency conversion rates (EP-756)

### Dashboard
- `GET /api/dashboard` - Aggregated dashboard data with key metrics

## Architecture

### Files

- **app.py** - Flask application factory, configuration, initialization
- **api/routes.py** - All API endpoint implementations with shared data_store
- **api/__init__.py** - API module initialization
- **requirements.txt** - Python dependencies
- **load_sample.py** - Utility to load sample data from VSS_Reports directory
- **.gitignore** - Git ignore patterns

### Data Storage

Currently uses in-memory dictionary (`data_store`) for fast access:

```python
data_store = {
    'packages': [],           # Parsed report packages
    'transactions': [],       # Transaction records
    'settlement': {},         # Settlement summaries
    'control': {},           # Control/operations data
    'raw_reports': {}        # Raw report references
}
```

**Future Enhancement:** Add SQLite persistence layer for production use.

### Parser Integration

The API is designed to work with the `parsers` module:

```python
from parsers.package_parser import parse_package
result = parse_package(directory_path)
data_store.update(result)
```

When `parsers.package_parser` is available, the app will:
1. Use it to parse EP/VSS reports from uploaded files or directories
2. Store parsed results in `data_store`
3. Serve them via REST endpoints

Until parsers are fully implemented, the app uses mock data for testing.

## CORS Configuration

CORS is enabled for the React frontend running on:
- `http://localhost:5173` (Vite development server)
- `http://localhost:3000` (Create React App)
- `http://127.0.0.1:5173`

## Error Handling

All endpoints return JSON responses:

**Success:**
```json
{
  "status": 200,
  "data": {}
}
```

**Error:**
```json
{
  "error": "Description of error",
  "status": 400
}
```

## Development

### Adding New Endpoints

1. Add route function to `api/routes.py`
2. Decorate with `@api.route('/path', methods=['GET/POST/etc'])`
3. Use `data_store` to access/modify data
4. Return JSON response with appropriate HTTP status code

### Testing

Use curl or Postman to test endpoints:

```bash
# Health check
curl http://127.0.0.1:5000/api/health

# List transactions
curl http://127.0.0.1:5000/api/transactions

# Get transaction summary
curl http://127.0.0.1:5000/api/transactions/summary

# Filter transactions
curl "http://127.0.0.1:5000/api/transactions?type=sales&currency=USD"
```

## Performance Notes

- In-memory storage provides fast read access for dashboard and filtering
- Pagination implemented with `page` and `per_page` query parameters
- Aggregations (by type, currency, country) calculated on-demand
- For large datasets, consider database persistence in production

## Future Enhancements

1. **Database Persistence** - Add SQLite/PostgreSQL for data persistence
2. **Authentication** - Add JWT or OAuth2 for security
3. **Caching** - Add Redis for frequently accessed aggregations
4. **Validation** - Add request validation and error handling
5. **Async Processing** - Use Celery for long-running parse operations
6. **File Storage** - Upload to cloud storage (S3, Azure Blob)
7. **Webhooks** - Notify frontend of parse completion

## Troubleshooting

**ModuleNotFoundError: No module named 'parsers'**
- Ensure you're running from the backend directory
- Check that parsers module is properly set up

**CORS errors in frontend**
- Verify frontend is running on allowed origin
- Check CORS configuration in app.py

**Data not loading**
- Check console output for data loading messages
- Verify VSS_Reports directory exists at expected path
- Use `load_sample.py` manually to debug

## License

Copyright 2024 - SettleOps
