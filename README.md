# SettleOps

**Visa Settlement Operations Platform for ADB (Agricultural Development Bank, Ghana)**

SettleOps is a full-stack web application that parses, stores, and visualizes Visa VisaNet Settlement Service (VSS) Edit Package reports. It transforms fixed-width settlement text files into an interactive dashboard with transaction analytics, fee breakdowns, currency rate tracking, and reconciliation tools.

---

## Features

- **Settlement Dashboard** — Real-time KPIs: net settlement amount, transaction counts by type (sales, cash disbursements, reversals), and settlement status
- **Transaction Explorer** — Paginated, filterable table with a slide-out detail drawer showing card data, merchant info, authorization details, and POS entry modes
- **Settlement Hierarchy** — EP-746/747 member settlement data with VSS-100-W reporting hierarchy visualization
- **Fees & Charges** — VSS-130/140/210/215 fee category breakdowns for interchange, service fees, and assessments
- **Currency Rates** — Dual-panel view with a live market exchange rate converter (powered by Open Exchange Rates) alongside Visa's EP-756 settlement rate table with buy/sell spread analysis
- **Reconciliation** — VSS-900 reconciliation data and EP-220 batch control summaries
- **Control Reports** — EP-210 batch/file/CPD/run summaries and EP-999 report index browser
- **Upload History** — Calendar-based view of all uploaded VSS report packages with cleanup tools
- **VSS Package Upload** — Drag-and-drop folder upload for complete VSS report packages with automatic parsing and deduplication

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.10+ / Flask / Flask-CORS |
| **Frontend** | React 19 / Vite 8 / Tailwind CSS v4 / Recharts / Lucide Icons |
| **Database** | SQLite (WAL mode) with SHA-256 deduplication |
| **Parsers** | Pure Python (stdlib only) — no external parsing dependencies |

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/eoseiakoto/settlement-app.git
cd settlement-app

# 2. Set up Python environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
cd SettleOps/settleops-app/backend
pip install -r requirements.txt

# 4. Start the server
python3 app.py
```

Open **http://localhost:5001** in your browser.

The app auto-loads sample data from `VSS_Reports/` on startup and serves the pre-built React frontend.

## Frontend Development

To run the frontend with hot-reload during development:

```bash
# Terminal 1 — Backend API
cd SettleOps/settleops-app/backend
python3 app.py

# Terminal 2 — Vite dev server (proxies /api to Flask)
cd SettleOps/settleops-app/frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api/*` requests to Flask on port 5001.

### Rebuilding the Production Frontend

```bash
cd SettleOps/settleops-app/frontend
npx vite build --outDir /tmp/settleops-dist --emptyOutDir
cp -rf /tmp/settleops-dist/* dist/
```

> **Note:** Never build directly into `dist/` — Vite will attempt to clear the directory and may fail on archived files.

## Project Structure

```
SettleOps/
├── VSS_Reports/                    # Visa settlement data files (not committed)
│   └── 310323/                     # March 2023 ADB settlement package
├── User_Guides/                    # Visa VSS specification PDFs
└── settleops-app/
    ├── backend/
    │   ├── app.py                  # Flask app factory + SPA server (port 5001)
    │   ├── storage.py              # SQLite persistence with dedup & aggregation
    │   ├── api/
    │   │   └── routes.py           # 22 REST API endpoints
    │   └── parsers/
    │       ├── package_parser.py   # Orchestrator — routes files to correct parser
    │       ├── ep_transactions.py  # EP-705 sales, EP-707 cash, EP-727 reversals
    │       ├── ep_settlement.py    # EP-746 member settlement, EP-747 VSS reports
    │       ├── ep_summaries.py     # EP-210 batch summaries, EP-211/220 reconciliation
    │       ├── ep_misc.py          # EP-756 FX rates, EP-999 report index, EP-750
    │       ├── ad_raw.py           # AD3103 raw acquirer data
    │       └── common.py           # Shared header/line parsing utilities
    ├── frontend/
    │   ├── src/
    │   │   ├── App.jsx             # React Router (8 routes)
    │   │   ├── components/         # Layout, DataTable, StatCard, TransactionDrawer
    │   │   ├── pages/              # Dashboard, Transactions, Settlement, Fees,
    │   │   │                       # Reconciliation, ControlReports, CurrencyRates,
    │   │   │                       # UploadHistory
    │   │   └── utils/              # API client, formatters
    │   ├── dist/                   # Production build (served by Flask)
    │   └── package.json
    └── start.sh                    # Convenience start script
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server status, data loading info, counts |
| GET | `/api/dashboard` | Aggregated KPIs, chart data, recent transactions |
| GET | `/api/transactions` | Paginated transactions with filters (type, currency, country, merchant, amount range) |
| GET | `/api/transactions/summary` | Aggregations by type, currency, and country |
| GET | `/api/settlement` | Raw EP-746/747 settlement records |
| GET | `/api/settlement/hierarchy` | VSS-100-W reporting hierarchy |
| GET | `/api/settlement/interchange` | VSS-120 interchange data |
| GET | `/api/settlement/fees` | VSS-130/140/210/215 fee breakdowns |
| GET | `/api/settlement/reconciliation` | VSS-900 reconciliation |
| GET | `/api/control/batch-summary` | EP-210 series batch/file/run summaries |
| GET | `/api/control/reconciliation` | EP-220 reconciliation summary |
| GET | `/api/control/index` | EP-999 report index |
| GET | `/api/control/currency-rates` | EP-756 Visa settlement rates |
| GET | `/api/control/market-rates` | Live market rates (Open Exchange Rates / ECB fallback) |
| GET | `/api/packages` | List all uploaded packages with metadata |
| POST | `/api/upload` | Upload & parse VSS report files (multipart FormData) |
| DELETE | `/api/packages/<id>` | Delete a specific package |
| POST | `/api/cleanup/duplicates` | Remove duplicate transactions |
| POST | `/api/cleanup/all` | Reset all data |

## Supported Visa Report Types

| Report | Description |
|--------|-------------|
| EP-705 | Sales draft transactions |
| EP-707 | Cash disbursement transactions |
| EP-727 | Cash disbursement reversals |
| EP-210B/C/D/E/F | Batch, file, CPD, run, and grand total summaries |
| EP-211C/D/E | Currency-based summaries |
| EP-220 | Reconciliation summary |
| EP-746 | Member settlement (4600-format records) |
| EP-747 | VSS sub-reports (VSS-100-W hierarchy, VSS-130/140 fees, VSS-900 recon) |
| EP-750 | Settlement file header |
| EP-756 | Currency conversion rates (Visa proprietary encoding) |
| EP-999 | Report index |
| AD3103 | Raw acquirer data records |

## Data Handling

- **Deduplication**: Transactions are deduplicated using SHA-256 hashes of the Acquirer Reference Number (ARN). Fallback uses a composite key of type, ID, amount, date, merchant, and account.
- **Multi-package support**: Multiple VSS packages can be uploaded and merged. The system tracks which package each record belongs to.
- **In-memory caching**: On startup, all data is loaded into memory for fast reads. The cache refreshes automatically after each upload.

## Design

The frontend uses a **frosted-glass (glassmorphism)** design system with a mesh gradient background, Inter font family, and a consistent accent color palette (blue for sales, green for cash, purple for settlement, red for reversals, amber for rates).

## License

Private — ADB Internal Use

## Author

Emmanuel Osei-Akoto (eoseiakoto@gmail.com)
