# SettleOps — ADB Settlement Operations Platform

Single-bank platform for ADB (Agricultural Development Bank, Ghana) that parses and visualizes Visa VisaNet Settlement Service (VSS) Edit Package reports for post-clearing settlement operations.

## Tech Stack

- **Backend**: Python Flask 3.x + Flask-CORS, serves API + SPA on port 5001
- **Frontend**: React 19 + Vite 8 + Tailwind CSS v4 + Recharts + Lucide React icons
- **Database**: SQLite (WAL mode) at `backend/data/settleops.db`
- **No external Python deps** beyond Flask/Flask-CORS (parsers use stdlib only)

## Quick Start

```bash
cd backend && python app.py    # serves everything on http://localhost:5001
```

## Build Pipeline

Frontend builds with Vite to a temp dir then copies to `frontend/dist/` which Flask serves as static files. **Never** build directly into `frontend/dist/` — Vite will try to empty it and hit EPERM on archived files.

```bash
cd frontend
npx vite build --outDir /tmp/settleops-dist
cp -rf /tmp/settleops-dist/* dist/
```

When overwriting dist files, **archive** the old build into `dist/archive_YYYY-MM-DD/` instead of deleting — user preference.

## Project Structure

```
settleops-app/
├── backend/
│   ├── app.py                 # Flask app factory, CORS, blueprint registration
│   ├── storage.py             # SQLite persistent storage with dedup & aggregation
│   ├── api/routes.py          # All REST endpoints (22 total)
│   └── parsers/
│       ├── package_parser.py  # Orchestrator — parses 15+ EP report types
│       ├── ep_transactions.py # EP-705 (sales), EP-707 (cash), EP-727 (reversals)
│       ├── ep_settlement.py   # EP-746 (member settlement), EP-747 (VSS reports)
│       ├── ep_summaries.py    # EP-210B-F, EP-211C-E, EP-220 batch/reconciliation
│       ├── ep_misc.py         # EP-756 (FX rates), EP-999 (report index), EP-750
│       ├── ad_raw.py          # AD3103 raw acquirer data
│       └── common.py          # Shared header/line parsing utilities
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # React Router — 7 routes
│   │   ├── index.css          # Glass design system + mesh gradient + Tailwind
│   │   ├── components/
│   │   │   ├── Layout.jsx     # Sidebar nav + upload modal (file & folder)
│   │   │   ├── DataTable.jsx  # Reusable sortable/searchable/paginated table
│   │   │   ├── StatCard.jsx   # KPI metric cards with accent colors
│   │   │   └── TransactionDrawer.jsx  # Slide-in detail panel with 8 sections
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Hero + 6 KPIs + 4 charts + recent txns
│   │   │   ├── Transactions.jsx    # Filterable table + row-click drawer
│   │   │   ├── Settlement.jsx      # EP-746/747 hierarchy + fees overview
│   │   │   ├── Fees.jsx            # VSS-130/140/210/215 fee categories
│   │   │   ├── CurrencyRates.jsx   # Live market converter + VSS rate table
│   │   │   ├── Reconciliation.jsx  # VSS-900 + EP-210 batch controls
│   │   │   └── ControlReports.jsx  # EP-999 report index browser
│   │   └── utils/
│   │       ├── api.js         # Fetch wrapper + all endpoint functions
│   │       └── format.js      # Currency, number, date, filesize formatters
│   └── dist/                  # Production build (served by Flask)
└── start.sh
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | System status |
| GET | /api/dashboard | Aggregated KPIs, charts, recent txns |
| GET | /api/transactions | Paginated + filterable (type, currency, country, merchant, amount range) |
| GET | /api/transactions/summary | Counts/amounts by type, currency, country |
| GET | /api/settlement | Raw EP-746/747 settlement records |
| GET | /api/settlement/hierarchy | VSS-100-W hierarchy |
| GET | /api/settlement/interchange | VSS-120 interchange data |
| GET | /api/settlement/fees | VSS-130/140/210/215 fee breakdowns |
| GET | /api/settlement/reconciliation | VSS-900 reconciliation |
| GET | /api/control/batch-summary | EP-210 series batch/file/run summaries |
| GET | /api/control/reconciliation | EP-220 reconciliation summary |
| GET | /api/control/index | EP-999 report index |
| GET | /api/control/currency-rates | EP-756 Visa settlement rates |
| GET | /api/control/market-rates | Live rates (open.er-api.com, ECB fallback) |
| GET | /api/packages | List uploaded packages |
| POST | /api/upload | Upload & parse files (multipart FormData) |

## Design System — Glass Morphism

All pages use a unified frosted-glass aesthetic. **Never** use plain `bg-white` — use the glass classes:

| Class | Use For | Opacity |
|-------|---------|---------|
| `glass` | Default panels, cards, sections | 68% white, blur 24px |
| `glass-strong` | Primary content panels, tables | 82% white, blur 40px |
| `glass-subtle` | Nested/secondary content | 45% white, blur 16px |
| `glass-dark` | Dark variant (sidebar) | 88% dark, blur 40px |

**Accent color palette** (use inline `style` with rgba for backgrounds, not Tailwind bg-color-100):
- Blue: `#2563eb` — primary actions, sales badges
- Green: `#059669` — cash disbursements, success states
- Purple: `#7c3aed` — settlement, VSS
- Red: `#dc2626` — reversals, errors
- Amber: `#d97706` — rates, warnings

**Typography**: Inter font, `font-weight: 800` for page titles, `700` for section headers.

**Background**: `.mesh-bg` class on Layout wrapper (multi-layer radial gradient in blue/green/purple).

## EP-756 Rate Encoding (Critical Domain Knowledge)

Visa's "SCL FACT & RATE" field is 8 characters: `EEMMMMMM`

```
rate = 10^EE / MMMMMM
```

- `EE` = first 2 chars (exponent)
- `MMMMMM` = last 6 chars (mantissa/divisor)
- Example: `06272361` → 10^6 / 272361 = 3.6716 (AED/USD)
- These are Visa proprietary settlement rates, NOT market exchange rates

## Data Context

Current loaded data is **March 2023 ADB settlement** (CPD 2023-03-30):
- 2,471 transactions: 71 sales (GHS 42,217), 2,359 cash (GHS 2,040,492), 41 reversals (GHS 37,160)
- Net settlement: GHS 2,045,549
- 218 FX rate pairs, 67 indexed reports
- Center/BIN: 408319
- Primary currencies: GHS (936), USD (840), EUR (978), GBP (826)

## Important Conventions

1. **Read before writing**: Always read existing files before modifying to preserve functionality. Previous overwrites broke the transaction drawer and upload modal.
2. **Archive, don't delete**: When overwriting files, move old versions to `archive_YYYY-MM-DD/` folder.
3. **Transaction dedup**: SHA256 on ARN (acquirer reference number) per report type. Fallback: SHA256(type:txn_id:amount:date:merchant:account).
4. **Upload modal**: Supports both file selection AND folder upload (`webkitdirectory` attribute). Don't remove either.
5. **TransactionDrawer**: Critical component — slide-in panel on row click with 8 collapsible sections, prev/next navigation, keyboard shortcuts.
6. **Market rates vs VSS rates**: CurrencyRates page has TWO distinct sections — live market converter (open.er-api.com) and Visa settlement rate table (EP-756). Keep them separate.

## Sensitive Data Warning

The database and transaction data contain simulated PANs and financial account numbers. **Do not** output raw transaction JSON in responses — summarize or reference fields by name instead. This avoids content filtering issues.
