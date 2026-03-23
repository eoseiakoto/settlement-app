import { useEffect, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, DollarSign, ArrowLeftRight, Receipt,
  Building2, Scale, Zap, CheckCircle2,
} from 'lucide-react';
import { getDashboard } from '../utils/api';
import { formatCurrency, formatNumber } from '../utils/format';
import TransactionDrawer, { getTypeLabel } from '../components/TransactionDrawer';

/* ── deeper, more saturated colour palette ── */
const ACCENT = {
  blue:   { bg: 'rgba(37,99,235,0.12)',  ring: 'rgba(37,99,235,0.22)',  text: '#1d4ed8', fill: '#2563eb', glow: 'glow-blue' },
  green:  { bg: 'rgba(5,150,105,0.12)',   ring: 'rgba(5,150,105,0.22)',  text: '#047857', fill: '#059669', glow: 'glow-green' },
  purple: { bg: 'rgba(109,40,217,0.12)',  ring: 'rgba(109,40,217,0.22)', text: '#6d28d9', fill: '#7c3aed', glow: 'glow-purple' },
  red:    { bg: 'rgba(220,38,38,0.10)',   ring: 'rgba(220,38,38,0.18)',  text: '#b91c1c', fill: '#dc2626', glow: 'glow-red' },
  amber:  { bg: 'rgba(217,119,6,0.12)',   ring: 'rgba(217,119,6,0.22)',  text: '#b45309', fill: '#d97706', glow: 'glow-amber' },
};

const PIE_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2'];
const BAR_BLUE = ['#1d4ed8', '#3b82f6'];
const BAR_GREEN = ['#047857', '#10b981'];

/* ── transform API payload ── */
function transformApiData(apiData) {
  if (!apiData?.transactions) return null;
  const t = apiData.transactions;

  const byCurrency = Object.entries(apiData.by_currency || {}).map(([code, data]) => ({
    currency: code === '936' ? 'GHS' : code === '840' ? 'USD' : code === '978' ? 'EUR' : code,
    value: Math.round(data.amount),
    count: data.count,
    percentage: t.total > 0 ? Math.round((data.count / t.total) * 1000) / 10 : 0,
  }));

  const byCountry = Object.entries(apiData.by_country || {})
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([code, data]) => ({ country: code, count: data.count, amount: Math.round(data.amount) }));

  const recent = (apiData.recent_transactions || []).map((txn, i) => ({
    id: i,
    date: txn.purchase_date || '',
    type: txn.type === 'sale' ? 'SALE' : txn.type === 'cash_disbursement' ? 'CASH' : 'REVERSAL',
    merchant: txn.merchant_name || '-',
    city: txn.merchant_city || '-',
    country: txn.merchant_country || '-',
    amount: txn.destination_amount_numeric || 0,
    currency: txn.destination_currency === '936' ? 'GHS' : txn.destination_currency || '-',
    authCode: txn.auth_code || '-',
    _raw: txn,
  }));

  return {
    totalTransactions: t.total,
    salesDrafts: t.sales.count,
    cashDisbursements: t.cash_disbursements.count,
    reversals: t.reversals.count,
    salesAmount: t.sales.amount,
    cashAmount: t.cash_disbursements.amount,
    reversalAmount: t.reversals.amount,
    netAmount: t.net_amount,
    currencyPairs: apiData.currency_rates?.rate_count || 0,
    filesParsed: apiData.package?.files_parsed || 0,
    reportCount: apiData.report_index?.report_count || 0,
    volume: [
      { type: 'Sales', count: t.sales.count, amount: t.sales.amount },
      { type: 'Cash', count: t.cash_disbursements.count, amount: t.cash_disbursements.amount },
      { type: 'Reversals', count: t.reversals.count, amount: t.reversals.amount },
    ],
    byCurrency,
    byCountry,
    recent,
  };
}

/* ── fallback mock ── */
const MOCK = {
  totalTransactions: 2471, salesDrafts: 71, cashDisbursements: 2359, reversals: 41,
  salesAmount: 42217.26, cashAmount: 2040492.14, reversalAmount: 37160.0, netAmount: 2045549.40,
  currencyPairs: 221, filesParsed: 18, reportCount: 67,
  volume: [
    { type: 'Sales', count: 71, amount: 42217.26 },
    { type: 'Cash', count: 2359, amount: 2040492.14 },
    { type: 'Reversals', count: 41, amount: 37160.0 },
  ],
  byCurrency: [{ currency: 'GHS', value: 2119869, count: 2471, percentage: 100 }],
  byCountry: [
    { country: 'GH', count: 2444, amount: 2095735 },
    { country: 'US', count: 13, amount: 17717 },
    { country: 'IE', count: 7, amount: 370 },
  ],
  recent: [],
};

/* ═══════════════ GLASS KPI CARD ═══════════════ */
function GlassKPI({ icon: Icon, label, value, sub, accent = 'blue' }) {
  const a = ACCENT[accent];
  return (
    <div className={`glass rounded-2xl p-4 xl:p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${a.glow}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] xl:text-[11px] font-semibold tracking-wide uppercase" style={{ color: '#6b7280' }}>{label}</p>
          <p className="text-lg xl:text-[22px] font-extrabold mt-1 truncate" style={{ color: '#111827' }}>{value}</p>
          {sub && <p className="text-[10px] xl:text-[11px] font-semibold mt-0.5" style={{ color: a.text }}>{sub}</p>}
        </div>
        <div
          className="w-9 h-9 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: a.bg, border: `1px solid ${a.ring}` }}
        >
          <Icon className="w-4 h-4 xl:w-5 xl:h-5" style={{ color: a.text }} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ GLASS PANEL ═══════════════ */
function GlassPanel({ title, subtitle, children, className = '' }) {
  return (
    <div className={`glass-strong rounded-2xl p-5 xl:p-6 ${className}`}>
      <div className="mb-4 xl:mb-5">
        <h3 className="text-sm xl:text-[15px] font-bold" style={{ color: '#111827' }}>{title}</h3>
        {subtitle && <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ═══════════════ CUSTOM TOOLTIP ═══════════════ */
function GlassTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-4 py-3 shadow-lg" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
      <p className="text-xs font-bold mb-1" style={{ color: '#111827' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: '#4b5563' }}>
          <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ background: p.color }} />
          {p.name}: {prefix}{typeof p.value === 'number' ? formatNumber(p.value) : p.value}{suffix}
        </p>
      ))}
    </div>
  );
}

/* ═══════════════ COUNTRY NAMES ═══════════════ */
const COUNTRY_NAMES = {
  GH: 'Ghana', US: 'United States', IE: 'Ireland', JP: 'Japan',
  GB: 'United Kingdom', ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya',
  IN: 'India', CN: 'China', DE: 'Germany', FR: 'France', GA: 'Gabon',
};

/* assign a richer distinct color per country row */
const COUNTRY_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#4f46e5', '#b45309'];

/* ═══════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════ */
export default function Dashboard() {
  const [dashboard, setDashboard] = useState(MOCK);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getDashboard();
        const transformed = transformApiData(data);
        if (transformed) setDashboard(transformed);
      } catch (e) {
        console.warn('Using mock data:', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const d = dashboard;

  return (
    <div className="space-y-5 xl:space-y-6 w-full">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl xl:text-[26px] font-extrabold tracking-tight" style={{ color: '#0f172a' }}>
            Settlement Dashboard
          </h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: '#64748b' }}>
            ADB Ghana &middot; Center 408319 &middot; CPD 23/03/30
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="glass-subtle rounded-full px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5"
            style={{ color: '#047857' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#059669' }} />
            {d.filesParsed} files parsed
          </span>
          <span className="glass-subtle rounded-full px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5"
            style={{ color: '#1d4ed8' }}>
            <Zap className="w-3 h-3" />
            {d.reportCount} reports
          </span>
        </div>
      </div>

      {/* ── NET SETTLEMENT HERO ── */}
      <div className="relative overflow-hidden rounded-2xl xl:rounded-3xl p-5 sm:p-6 xl:p-8"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #1a2744 40%, #162032 100%)',
        }}
      >
        {/* Orbs */}
        <div className="orb w-56 h-56 -top-16 -left-16" style={{ position: 'absolute', background: 'rgba(37,99,235,0.25)' }} />
        <div className="orb w-36 h-36 top-4 right-24" style={{ position: 'absolute', background: 'rgba(109,40,217,0.18)', animationDelay: '-7s' }} />
        <div className="orb w-28 h-28 bottom-0 right-8" style={{ position: 'absolute', background: 'rgba(5,150,105,0.15)', animationDelay: '-13s' }} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-[10px] xl:text-xs font-bold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.50)' }}>Net Settlement Amount</p>
            <p className="text-3xl sm:text-4xl xl:text-5xl font-extrabold tracking-tight mt-1"
              style={{ color: '#ffffff' }}>
              GHS {formatNumber(d.netAmount, 2)}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(5,150,105,0.20)', color: '#6ee7b7' }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Settlement Complete
              </span>
              <span className="text-[11px] xl:text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {formatNumber(d.totalTransactions)} transactions processed
              </span>
            </div>
          </div>

          {/* Breakdown pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2 lg:min-w-[240px] xl:min-w-[520px]">
            {[
              { label: 'Sales', val: d.salesAmount, count: d.salesDrafts, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
              { label: 'Cash Disbursements', val: d.cashAmount, count: d.cashDisbursements, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
              { label: 'Reversals', val: d.reversalAmount, count: d.reversals, color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
            ].map(item => (
              <div key={item.label} className="rounded-xl px-4 py-2.5 flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] xl:text-[11px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.50)' }}>{item.label}</p>
                  <p className="text-xs xl:text-sm font-bold" style={{ color: '#ffffff' }}>GHS {formatNumber(item.val, 2)}</p>
                </div>
                <span className="text-[10px] xl:text-[11px] font-bold flex-shrink-0" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  {formatNumber(item.count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <GlassKPI icon={ArrowLeftRight} label="Transactions" value={formatNumber(d.totalTransactions)} accent="blue" />
        <GlassKPI icon={Receipt} label="Sales" value={formatNumber(d.salesDrafts)} sub={`GHS ${formatNumber(d.salesAmount)}`} accent="blue" />
        <GlassKPI icon={DollarSign} label="Cash" value={formatNumber(d.cashDisbursements)} sub={`GHS ${formatNumber(d.cashAmount)}`} accent="green" />
        <GlassKPI icon={TrendingUp} label="Reversals" value={formatNumber(d.reversals)} sub={`GHS ${formatNumber(d.reversalAmount)}`} accent="red" />
        <GlassKPI icon={Scale} label="Net Settlement" value={`GHS ${formatNumber(d.netAmount)}`} accent="purple" />
        <GlassKPI icon={Building2} label="FX Rates" value={formatNumber(d.currencyPairs)} accent="amber" />
      </div>

      {/* ── CHARTS ROW 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-5">
        <GlassPanel title="Transaction Volume" subtitle="Count by transaction type">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.volume} barSize={48}>
              <defs>
                <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BAR_BLUE[0]} stopOpacity={1} />
                  <stop offset="100%" stopColor={BAR_BLUE[1]} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} width={50} />
              <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(37,99,235,0.06)' }} />
              <Bar dataKey="count" fill="url(#barBlue)" name="Count" radius={[8, 8, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassPanel>

        <GlassPanel title="Transaction Amounts" subtitle="GHS value by type">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.volume} barSize={48}>
              <defs>
                <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BAR_GREEN[0]} stopOpacity={1} />
                  <stop offset="100%" stopColor={BAR_GREEN[1]} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 600 }} />
              <YAxis
                axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                width={60}
                tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
              />
              <Tooltip content={<GlassTooltip prefix="GHS " />} cursor={{ fill: 'rgba(5,150,105,0.06)' }} />
              <Bar dataKey="amount" fill="url(#barGreen)" name="Amount" radius={[8, 8, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassPanel>
      </div>

      {/* ── CHARTS ROW 2 — even 50/50 split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-5">

        {/* Country Breakdown */}
        <GlassPanel title="Transactions by Origin" subtitle="Top originating countries">
          <div className="space-y-3.5">
            {(d.byCountry || []).map((item, i) => {
              const pct = d.totalTransactions > 0 ? (item.count / d.totalTransactions) * 100 : 0;
              const name = COUNTRY_NAMES[item.country] || item.country;
              const color = COUNTRY_COLORS[i % COUNTRY_COLORS.length];
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] xl:text-[11px] font-extrabold tracking-wider flex-shrink-0"
                        style={{ background: `${color}18`, color: color, border: `1px solid ${color}30` }}
                      >
                        {item.country}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs xl:text-sm font-semibold truncate" style={{ color: '#111827' }}>{name}</p>
                        <p className="text-[10px] xl:text-[11px] font-medium" style={{ color: '#6b7280' }}>
                          {formatNumber(item.count)} transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-xs xl:text-sm font-bold" style={{ color: '#111827' }}>GHS {formatNumber(item.amount)}</p>
                      <p className="text-[10px] xl:text-[11px] font-semibold" style={{ color: '#9ca3af' }}>{pct.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.04)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(pct, 1.5)}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}99)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>

        {/* Currency Split — donut + stats side by side */}
        <GlassPanel title="Currency Split" subtitle="Transaction distribution by currency">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Donut */}
            <div className="flex-shrink-0 w-[180px] h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={d.byCurrency}
                    dataKey="count"
                    nameKey="currency"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    strokeWidth={2}
                    stroke="rgba(255,255,255,0.8)"
                    paddingAngle={2}
                  >
                    {d.byCurrency.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Currency detail cards */}
            <div className="flex-1 w-full space-y-2.5">
              {d.byCurrency.map((item, i) => {
                const avgTxn = item.count > 0 ? item.value / item.count : 0;
                return (
                  <div key={i} className="rounded-xl p-3.5 flex items-center gap-3"
                    style={{ background: `${PIE_COLORS[i % PIE_COLORS.length]}0c`, border: `1px solid ${PIE_COLORS[i % PIE_COLORS.length]}1a` }}>
                    <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold" style={{ color: '#111827' }}>{item.currency}</p>
                        <p className="text-sm font-extrabold" style={{ color: '#111827' }}>{item.percentage}%</p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[11px] font-medium" style={{ color: '#6b7280' }}>
                          {formatNumber(item.count)} txns &middot; GHS {formatNumber(item.value)}
                        </p>
                        <p className="text-[11px] font-semibold" style={{ color: '#9ca3af' }}>
                          avg GHS {formatNumber(avgTxn, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Summary row */}
              <div className="pt-2 mt-1" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold" style={{ color: '#374151' }}>Total Volume</p>
                  <p className="text-xs font-extrabold" style={{ color: '#111827' }}>
                    GHS {formatNumber(d.byCurrency.reduce((s, c) => s + c.value, 0))}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] font-medium" style={{ color: '#9ca3af' }}>
                    {d.byCurrency.length} {d.byCurrency.length === 1 ? 'currency' : 'currencies'} &middot; {formatNumber(d.currencyPairs)} FX rates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* ── RECENT TRANSACTIONS ── */}
      {d.recent.length > 0 && (
        <GlassPanel title="Recent Transactions" subtitle={`Latest ${d.recent.length} transactions`}>
          <div className="overflow-x-auto -mx-5 xl:-mx-6 px-5 xl:px-6">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
                  {['Date', 'Type', 'Merchant', 'City', 'Country', 'Amount', 'Auth'].map(h => (
                    <th key={h} className="py-2.5 px-3 text-left text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.recent.slice(0, 10).map((txn, idx) => (
                  <tr key={txn.id}
                    onClick={() => setSelectedIdx(idx)}
                    className="transition-colors hover:bg-white/50 cursor-pointer"
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <td className="py-3 px-3 text-xs font-medium" style={{ color: '#4b5563' }}>{txn.date}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        txn.type === 'SALE' ? 'text-blue-800' :
                        txn.type === 'CASH' ? 'text-emerald-800' :
                        'text-red-800'
                      }`}
                        style={{
                          background: txn.type === 'SALE' ? 'rgba(37,99,235,0.12)' :
                                     txn.type === 'CASH' ? 'rgba(5,150,105,0.12)' :
                                     'rgba(220,38,38,0.10)',
                        }}>
                        {txn.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-semibold max-w-[200px] truncate" style={{ color: '#111827' }}>{txn.merchant}</td>
                    <td className="py-3 px-3 text-xs font-medium" style={{ color: '#6b7280' }}>{txn.city}</td>
                    <td className="py-3 px-3 text-xs font-medium" style={{ color: '#6b7280' }}>{txn.country}</td>
                    <td className="py-3 px-3 text-xs font-mono font-bold" style={{ color: '#111827' }}>
                      {formatCurrency(txn.amount, txn.currency)}
                    </td>
                    <td className="py-3 px-3 text-xs font-mono font-medium" style={{ color: '#9ca3af' }}>{txn.authCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}

      {/* ── TRANSACTION DRAWER ── */}
      {selectedIdx !== null && d.recent[selectedIdx] && (
        <TransactionDrawer
          txn={d.recent[selectedIdx]._raw || d.recent[selectedIdx]}
          displayType={d.recent[selectedIdx].type}
          onClose={() => setSelectedIdx(null)}
          onPrev={() => setSelectedIdx(i => Math.max(0, i - 1))}
          onNext={() => setSelectedIdx(i => Math.min(d.recent.length - 1, i + 1))}
          hasPrev={selectedIdx > 0}
          hasNext={selectedIdx < d.recent.length - 1}
        />
      )}
    </div>
  );
}
