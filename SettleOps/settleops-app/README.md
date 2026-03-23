# SettleOps — Visa Settlement Operations Platform

A full-stack platform for parsing and visualizing Visa VisaNet Settlement Service (VSS) Edit Package reports. Built for ADB (Agricultural Development Bank, Ghana) as a single-bank implementation.

## Prerequisites

- **Python 3.10+** (tested with 3.14)
- **Node.js 18+** and npm (only needed if rebuilding the frontend)

## Quick Start

```bash
# 1. Install Python dependencies
cd settleops-app/backend
pip3 install -r requirements.txt

# 2. Start the server
python3 app.py
```

Open **http://localhost:5000** in your browser.

The app auto-loads the March 2023 ADB data from `VSS_Reports/310323/` on startup.

## Full Setup (if rebuilding the frontend)

```bash
# 1. Install Python dependencies
cd settleops-app/backend
pip3 install -r requirements.txt

# 2. Install Node.js dependencies
cd ../frontend
npm install

# 3. Build the React frontend
npm run build

# 4. Start the server
cd ../backend
python3 app.py
```

## Project Structure

```
SettleOps/
├── VSS_Reports/
│   └── 310323/              # March 2023 ADB settlement data (18 EP/AD files)
├── User_Guides/             # Visa VSS specification PDFs
└── settleops-app/
    ├── backend/
    │   ├── app.py           # Flask entry point (serves API + frontend)
    │   ├── requirements.txt
    │   ├── api/
    │   │   └── routes.py    # All API endpoints
    │   └── parsers/
    │       ├── package_parser.py   # Orchestrator
    │       ├── ep_transactions.py  # EP-705, EP-707, EP-727
    │       ├── ep_summaries.py     # EP-210, EP-211, EP-220
    │       ├── ep_settlement.py    # EP-746, EP-747
    │       ├── ep_misc.py          # EP-756, EP-999, EP-750
    │       ├── ad_raw.py           # AD3103.TXT
    │       └── common.py           # Shared utilities
    ├── frontend/
    │   ├── src/              # React source code
    │   ├── dist/             # Production build (served by Flask)
    │   ├── package.json
    │   └── vite.config.js
    ├── start.sh              # Convenience start script
    └── README.md             # This file
```

## Frontend Development

To run the frontend in dev mode with hot-reload:

```bash
# Terminal 1 — Backend
cd settleops-app/backend
python3 app.py

# Terminal 2 — Frontend dev server (proxies API to Flask)
cd settleops-app/frontend
npm run dev
```

The dev server runs on **http://localhost:5173** and proxies `/api/*` requests to Flask on port 5000.

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | Server status and data loading info |
| `GET /api/dashboard` | Aggregated metrics for all parsed data |
| `GET /api/transactions` | Paginated transactions with filters |
| `GET /api/transactions/summary` | Transaction aggregations by type/currency/country |
| `GET /api/settlement` | EP-746 and EP-747 settlement data |
| `GET /api/settlement/hierarchy` | VSS-100 settlement reporting hierarchy |
| `GET /api/settlement/fees` | VSS-130/140/210 fee data |
| `GET /api/settlement/reconciliation` | VSS-900 reconciliation data |
| `GET /api/control/batch-summary` | EP-210 batch/file/CPD/run summaries |
| `GET /api/control/index` | EP-999 report index |
| `GET /api/control/currency-rates` | EP-756 currency conversion rates |
| `POST /api/upload` | Parse a new data directory |

## March 2023 ADB Data Summary

- **2,471 transactions**: 71 sales (GHS 42,217), 2,359 cash disbursements (GHS 2,040,492), 41 reversals (GHS 37,160)
- **Net settlement**: GHS 2,045,549.40
- **221 currency conversion rates** (EP-756)
- **67 reports** in index (EP-999)
- **Center/BIN**: 408319
