# SettleOps Frontend - Setup Guide

SettleOps is a React-based settlement operations platform for ADB (Agricultural Development Bank, Ghana) built for Visa VSS (Visa Settlement Services) operations.

## Technology Stack

- **Framework**: React 19.2.4
- **Build Tool**: Vite 8.0.1
- **Styling**: Tailwind CSS v4 (via @tailwindcss/vite plugin)
- **Icons**: Lucide React (0.577.0)
- **Charts**: Recharts 3.8.0
- **Routing**: React Router DOM 7.13.1

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (optional, defaults are provided):
```bash
cp .env.example .env
```

## Development

### Start Development Server

The development server runs on `http://localhost:5173` and proxies API calls to `http://localhost:5000`:

```bash
npm run dev
```

### API Integration

The frontend expects a Flask backend API running on `http://localhost:5000`. The Vite proxy configuration in `vite.config.js` automatically routes all `/api/*` requests to the backend.

**Required API Endpoints:**
- `GET /api/dashboard` - Dashboard aggregated metrics
- `GET /api/transactions` - Paginated transactions
- `GET /api/transactions/summary` - Transaction summary stats
- `GET /api/settlement` - Settlement data
- `GET /api/settlement/hierarchy` - Reporting hierarchy
- `GET /api/settlement/fees` - Fee breakdowns
- `GET /api/settlement/reconciliation` - Reconciliation data
- `GET /api/control/batch-summary` - Batch summaries
- `GET /api/control/currency-rates` - FX rates
- `GET /api/control/index` - Report index
- `GET /api/packages` - Uploaded packages
- `POST /api/upload` - Upload new package

### Mock Data

Each page includes realistic mock data for ADB Visa settlement operations:
- Transactions with Ghanaian merchants (GHS currency)
- Settlement in USD with GHS base currency
- Visa card center 408319, BIN 408319
- Real-world scenarios (sales, cash disbursements, reversals)

**When the API is unavailable, the frontend gracefully falls back to mock data.**

## Project Structure

```
src/
├── components/
│   ├── Layout.jsx          # Main layout with sidebar & top bar
│   ├── StatCard.jsx        # Reusable stat card component
│   └── DataTable.jsx       # Sortable, paginated data table
├── pages/
│   ├── Dashboard.jsx       # Main dashboard with stats & charts
│   ├── Transactions.jsx    # Transaction browser with filters
│   ├── Settlement.jsx      # Settlement overview & hierarchy
│   ├── Fees.jsx           # Fees & charges breakdown
│   ├── Reconciliation.jsx # Reconciliation status
│   ├── ControlReports.jsx # Control & operations reports
│   └── CurrencyRates.jsx  # Currency rates & converter
├── utils/
│   ├── api.js             # API client functions
│   └── format.js          # Formatting utilities
├── data/
│   └── mockData.js        # Mock data for all pages
├── App.jsx                # Router setup
├── main.jsx               # Entry point with BrowserRouter
└── index.css              # Tailwind imports
```

## Key Features

### Dashboard
- 6 summary stat cards (transactions, settlement amount, fees, etc.)
- Transaction volume bar chart
- Transaction by currency pie chart
- Recent transactions table
- Quick links to detailed views

### Transactions
- Advanced filtering (type, currency, country, date range)
- Sortable data table with search
- Transaction detail view
- Status indicators (settled, pending, etc.)

### Settlement
- Settlement summary cards (debits, credits, net position)
- Settlement by currency breakdown
- Settlement reporting entities (SRE) table
- Hierarchy visualization

### Fees & Charges
- Category breakdown (Reimbursement, Visa, FX, ISA)
- Summary stat cards per category
- Detailed fee line items
- Fee information panels

### Reconciliation
- Matched/unmatched/pending status
- Overall reconciliation progress bar
- Batch-level reconciliation details
- Variance reporting

### Control Reports
- Report index (EP-999 series)
- Batch summaries (EP-210)
- Reconciliation data (EP-220)
- Clickable report list with details panel

### Currency Rates
- Exchange rate table with buy/sell rates
- Currency converter calculator
- Major rates summary
- Rate information panels

## Styling

### Tailwind CSS v4
- No config file needed - automatic class detection
- Uses Inter font from Google Fonts
- Professional banking/fintech aesthetic
- Color scheme: Slate-900 sidebar, white content area, blue-600 primary accent

### Color Palette
- Primary: `blue-600`
- Success: `green-600`
- Danger: `red-600`
- Warning: `orange-600`
- Accent: `purple-600`, `indigo-600`

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

### Preview Production Build
```bash
npm run preview
```

## Linting

```bash
npm run lint
```

## Design Specifications

### Layout
- **Sidebar**: Dark navy (`bg-slate-900`) with collapsible navigation
- **Top Bar**: White with ADB branding and current package date
- **Main Content**: White background with subtle shadows and rounded corners

### Components
- **Stat Cards**: Icon on right, label and value on left, optional change indicator
- **Data Tables**: Sortable columns, pagination, search bar, hover effects
- **Forms**: Clean styling with focus states and helpful labels

### Responsive Design
- Mobile-optimized navigation
- Grid layouts adapt to screen size
- Tables scroll on small screens
- Desktop-primary (back-office application)

## Error Handling

- API errors gracefully fall back to mock data
- Form validation on key inputs
- Loading states on async operations
- Error messages displayed to users

## Future Enhancements

- Real-time data updates with WebSocket
- Advanced filtering and search
- Export functionality (CSV, Excel, PDF)
- User authentication & authorization
- Multi-language support
- Dark mode toggle
- Custom report builder
- Batch processing operations

## Support

For issues or questions about the SettleOps frontend, contact the development team.
