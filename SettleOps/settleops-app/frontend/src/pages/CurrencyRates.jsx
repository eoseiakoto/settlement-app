import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { getCurrencyRates, getMarketRates } from '../utils/api';
import DataTable from '../components/DataTable';
import { DollarSign, TrendingUp, RefreshCw, ArrowLeftRight, Globe, Shield, ArrowRight } from 'lucide-react';
import { formatNumber } from '../utils/format';

/* ── ISO 4217 Numeric → Alpha Currency Map ── */
const CURRENCY_MAP = {
  '004': 'AFN', '008': 'ALL', '012': 'DZD', '031': 'AZN', '032': 'ARS',
  '036': 'AUD', '044': 'BSD', '048': 'BHD', '050': 'BDT', '051': 'AMD',
  '052': 'BBD', '056': 'BEF', '060': 'BMD', '064': 'BTN', '068': 'BOB',
  '072': 'BWP', '084': 'BZD', '090': 'SBD', '096': 'BND', '104': 'MMK',
  '108': 'BIF', '116': 'KHR', '124': 'CAD', '132': 'CVE', '136': 'KYD',
  '144': 'LKR', '152': 'CLP', '156': 'CNY', '170': 'COP', '174': 'KMF',
  '188': 'CRC', '191': 'HRK', '192': 'CUP', '203': 'CZK', '208': 'DKK',
  '214': 'DOP', '222': 'SVC', '230': 'ETB', '232': 'ERN', '238': 'FKP',
  '242': 'FJD', '262': 'DJF', '270': 'GMD', '292': 'GIP', '320': 'GTQ',
  '324': 'GNF', '328': 'GYD', '332': 'HTG', '340': 'HNL', '344': 'HKD',
  '348': 'HUF', '352': 'ISK', '356': 'INR', '360': 'IDR', '364': 'IRR',
  '368': 'IQD', '376': 'ILS', '388': 'JMD', '392': 'JPY', '398': 'KZT',
  '400': 'JOD', '404': 'KES', '408': 'KPW', '410': 'KRW', '414': 'KWD',
  '417': 'KGS', '418': 'LAK', '422': 'LBP', '426': 'LSL', '430': 'LRD',
  '434': 'LYD', '446': 'MOP', '454': 'MWK', '458': 'MYR', '462': 'MVR',
  '478': 'MRO', '480': 'MUR', '484': 'MXN', '496': 'MNT', '498': 'MDL',
  '504': 'MAD', '508': 'MZN', '512': 'OMR', '516': 'NAD', '524': 'NPR',
  '532': 'ANG', '533': 'AWG', '548': 'VUV', '554': 'NZD', '558': 'NIO',
  '566': 'NGN', '578': 'NOK', '586': 'PKR', '590': 'PAB', '598': 'PGK',
  '600': 'PYG', '604': 'PEN', '608': 'PHP', '634': 'QAR', '643': 'RUB',
  '646': 'RWF', '654': 'SHP', '678': 'STD', '682': 'SAR', '690': 'SCR',
  '694': 'SLL', '702': 'SGD', '704': 'VND', '706': 'SOS', '710': 'ZAR',
  '716': 'ZWD', '748': 'SZL', '752': 'SEK', '756': 'CHF', '760': 'SYP',
  '764': 'THB', '776': 'TOP', '780': 'TTD', '784': 'AED', '788': 'TND',
  '800': 'UGX', '807': 'MKD', '818': 'EGP', '826': 'GBP', '834': 'TZS',
  '840': 'USD', '858': 'UYU', '860': 'UZS', '882': 'WST', '886': 'YER',
  '901': 'TWD', '928': 'VES', '929': 'MRU', '930': 'STN', '932': 'ZWL',
  '933': 'BYN', '934': 'TMT', '936': 'GHS', '938': 'SDG', '941': 'RSD',
  '943': 'MZN', '944': 'AZN', '946': 'RON', '947': 'CHE', '949': 'TRY',
  '950': 'XAF', '951': 'XCD', '952': 'XOF', '953': 'XPF', '960': 'XDR',
  '967': 'ZMW', '968': 'SRD', '969': 'MGA', '971': 'AFN', '972': 'TJS',
  '973': 'AOA', '975': 'BGN', '976': 'CDF', '977': 'BAM', '978': 'EUR',
  '980': 'UAH', '981': 'GEL', '985': 'PLN', '986': 'BRL',
};

/* ── Accent colours ── */
const ACCENT = {
  blue:   { bg: 'rgba(37,99,235,0.12)',  ring: 'rgba(37,99,235,0.22)',  text: '#1d4ed8', fill: '#2563eb' },
  green:  { bg: 'rgba(5,150,105,0.12)',   ring: 'rgba(5,150,105,0.22)',  text: '#047857', fill: '#059669' },
  purple: { bg: 'rgba(109,40,217,0.12)',  ring: 'rgba(109,40,217,0.22)', text: '#6d28d9', fill: '#7c3aed' },
  amber:  { bg: 'rgba(217,119,6,0.12)',   ring: 'rgba(217,119,6,0.22)',  text: '#b45309', fill: '#d97706' },
};

/* ── Currency display names ── */
const CURRENCY_NAMES = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', GHS: 'Ghana Cedi',
  JPY: 'Japanese Yen', CHF: 'Swiss Franc', CAD: 'Canadian Dollar', AUD: 'Australian Dollar',
  CNY: 'Chinese Yuan', INR: 'Indian Rupee', AED: 'UAE Dirham', SAR: 'Saudi Riyal',
  NGN: 'Nigerian Naira', ZAR: 'South African Rand', KES: 'Kenyan Shilling',
  BRL: 'Brazilian Real', MXN: 'Mexican Peso', SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar', SEK: 'Swedish Krona', NOK: 'Norwegian Krone',
  DKK: 'Danish Krone', PLN: 'Polish Zloty', CZK: 'Czech Koruna', HUF: 'Hungarian Forint',
  TRY: 'Turkish Lira', THB: 'Thai Baht', MYR: 'Malaysian Ringgit', IDR: 'Indonesian Rupiah',
  PHP: 'Philippine Peso', KRW: 'South Korean Won', TWD: 'Taiwan Dollar',
  NZD: 'New Zealand Dollar', ILS: 'Israeli Shekel', EGP: 'Egyptian Pound',
  RON: 'Romanian Leu', BGN: 'Bulgarian Lev', ISK: 'Icelandic Krona',
};

/* ── Preferred currencies shown at top of dropdown ── */
const PREFERRED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'GHS', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR',
  'AED', 'SAR', 'NGN', 'ZAR', 'KES', 'BRL', 'MXN', 'SGD', 'HKD',
];

function currencyLabel(code) { return CURRENCY_MAP[code] || code; }

function parseVisaRate(rawRate) {
  if (!rawRate || typeof rawRate !== 'string' || rawRate.length < 8) return 0;
  const exponent = parseInt(rawRate.substring(0, 2), 10);
  const mantissa = parseInt(rawRate.substring(2), 10);
  if (mantissa === 0 || isNaN(exponent) || isNaN(mantissa)) return 0;
  return Math.pow(10, exponent) / mantissa;
}

/* ── Glass tooltip for charts ── */
function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong" style={{
      borderRadius: '0.75rem', padding: '0.75rem 1rem',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)',
    }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#4b5563', margin: '0.125rem 0' }}>
          <span style={{ display: 'inline-block', width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: p.color, marginRight: '0.375rem', verticalAlign: 'middle' }} />
          {p.name}: {typeof p.value === 'number' ? formatNumber(p.value, 4) : p.value}
        </p>
      ))}
    </div>
  );
}


/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function CurrencyRates() {
  const [ratesData, setRatesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marketRates, setMarketRates] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState(null);
  const [marketLastUpdated, setMarketLastUpdated] = useState(null);
  const [conversionFrom, setConversionFrom] = useState('USD');
  const [conversionTo, setConversionTo] = useState('GHS');
  const [conversionAmount, setConversionAmount] = useState(1000);

  /* ── Load Visa settlement rates ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getCurrencyRates();
        setRatesData(data);
      } catch (error) {
        console.warn('Failed to load VSS rates:', error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Load live market rates ── */
  const fetchMarketRates = useCallback(async (base) => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      const data = await getMarketRates(base);
      if (data?.rates) {
        setMarketRates(data);
        setMarketLastUpdated(new Date());
      } else if (data?.error) {
        setMarketError(data.error);
      }
    } catch (error) {
      setMarketError('Unable to fetch live rates.');
      console.warn('Market rates error:', error.message);
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketRates(conversionFrom);
  }, [conversionFrom, fetchMarketRates]);

  /* ── Build deduplicated currency list ── */
  const converterCurrencies = useMemo(() => {
    const available = marketRates?.rates ? Object.keys(marketRates.rates) : [];
    const allCodes = [...new Set([conversionFrom, ...PREFERRED_CURRENCIES, ...available])];
    // Split preferred (in order) vs rest (alphabetical)
    const preferred = PREFERRED_CURRENCIES.filter(c => allCodes.includes(c));
    const rest = allCodes.filter(c => !PREFERRED_CURRENCIES.includes(c)).sort();
    return [...preferred, ...rest];
  }, [marketRates, conversionFrom]);

  const marketSource = marketRates?.source || 'Open Exchange Rates';

  /* ── Process EP-756 Visa settlement rates ── */
  const rates = ratesData?.rates || [];
  const header = ratesData?.header || {};
  const hasRates = rates.length > 0;
  const settlementDate = header.cpd || header.processing_date || '—';

  const rateRows = useMemo(() => {
    const rawRows = rates.map((r, i) => {
      const buyRate = parseVisaRate(r.buy_rate);
      const sellRate = parseVisaRate(r.sell_rate);
      const fromAlpha = currencyLabel(r.base_currency || '');
      const toAlpha = currencyLabel(r.counter_currency || '');
      return {
        id: i, fromCurrency: fromAlpha, toCurrency: toAlpha,
        rate: buyRate, sellRate, pairKey: `${fromAlpha}-${toAlpha}`,
        spread: buyRate && sellRate ? Math.abs(((buyRate - sellRate) / buyRate) * 100) : 0,
        inverseRate: buyRate ? 1 / buyRate : 0,
        effectiveDate: r.effective_date || settlementDate,
      };
    });
    const seen = new Set();
    return rawRows.filter(r => {
      if (r.fromCurrency === r.toCurrency) return false;
      if (seen.has(r.pairKey)) return false;
      seen.add(r.pairKey);
      return true;
    });
  }, [rates, settlementDate]);

  /* ── Spotlight: major USD pairs ── */
  const majorPairs = ['GHS', 'EUR', 'GBP', 'JPY', 'CHF', 'AED', 'INR', 'ZAR'];
  const spotlightRates = rateRows
    .filter(r => r.fromCurrency === 'USD' && majorPairs.includes(r.toCurrency))
    .sort((a, b) => majorPairs.indexOf(a.toCurrency) - majorPairs.indexOf(b.toCurrency))
    .slice(0, 8);

  /* ── Spread comparison chart data (Visa buy vs sell for major pairs) ── */
  const spreadChartData = useMemo(() => {
    return spotlightRates.map(r => ({
      pair: `${r.toCurrency}`,
      'Buy Rate': r.rate,
      'Sell Rate': r.sellRate,
      'Spread %': r.spread,
    }));
  }, [spotlightRates]);

  /* ── Visa vs Market rate comparison chart ── */
  const comparisonChartData = useMemo(() => {
    if (!marketRates?.rates) return [];
    return spotlightRates
      .filter(r => r.toCurrency !== 'JPY') // exclude JPY (different magnitude)
      .map(r => {
        const marketRate = marketRates.rates[r.toCurrency];
        if (!marketRate) return null;
        const markup = marketRate > 0 ? ((r.rate - marketRate) / marketRate * 100) : 0;
        return {
          pair: r.toCurrency,
          'Visa Rate': r.rate,
          'Market Rate': marketRate,
          'Visa Markup %': Math.abs(markup),
        };
      })
      .filter(Boolean);
  }, [spotlightRates, marketRates]);

  /* ── Converter logic ── */
  const marketConversionRate = marketRates?.rates?.[conversionTo] || null;
  const convertedAmount = marketConversionRate ? conversionAmount * marketConversionRate : null;

  const handleSwap = () => {
    setConversionFrom(conversionTo);
    setConversionTo(conversionFrom);
  };

  /* ── VSS rates table columns ── */
  const rateColumns = [
    {
      key: 'fromCurrency', label: 'Base',
      render: (val) => <span style={{ fontWeight: 600, color: '#1e293b', letterSpacing: '0.04em' }}>{val}</span>,
    },
    {
      key: 'toCurrency', label: 'Counter',
      render: (val) => <span style={{ fontWeight: 600, color: '#1e293b', letterSpacing: '0.04em' }}>{val}</span>,
    },
    {
      key: 'rate', label: 'Buy Rate',
      render: (val) => val ? <span style={{ fontFamily: 'monospace', color: '#047857', fontWeight: 600 }}>{formatNumber(val, 6)}</span> : '—',
    },
    {
      key: 'sellRate', label: 'Sell Rate',
      render: (val) => val ? <span style={{ fontFamily: 'monospace', color: '#b45309', fontWeight: 600 }}>{formatNumber(val, 6)}</span> : '—',
    },
    {
      key: 'spread', label: 'Spread %',
      render: (val) => val ? <span style={{ fontFamily: 'monospace', color: '#6b7280', fontSize: '0.8rem' }}>{val.toFixed(4)}%</span> : '—',
    },
    {
      key: 'inverseRate', label: 'Inverse',
      render: (val) => val ? <span style={{ fontFamily: 'monospace', color: '#6b7280' }}>{formatNumber(val, 6)}</span> : '—',
    },
  ];

  const accentCycle = ['blue', 'green', 'purple', 'amber'];

  return (
    <div className="space-y-5 xl:space-y-6 w-full">

      {/* ══════════════ PAGE HEADER ══════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl xl:text-[26px] font-extrabold tracking-tight" style={{ color: '#0f172a' }}>
            Currency Rates
          </h2>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: '#64748b' }}>
            Live market conversion &amp; Visa VSS settlement rates
          </p>
        </div>
        {hasRates && (
          <div className="glass-subtle rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ color: '#475569' }}>
            {formatNumber(rateRows.length)} settlement rate pairs
          </div>
        )}
      </div>

      {/* ══════════════ TWO-COLUMN: CONVERTER + RATE PATTERN ══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xl:gap-5">

        {/* ── LEFT: Live Market Rate Converter ── */}
        <div className="glass-strong rounded-2xl p-5 xl:p-6 relative overflow-hidden">
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px',
            borderRadius: '50%', background: 'rgba(37,99,235,0.06)', filter: 'blur(40px)', pointerEvents: 'none',
          }} />

          <div className="flex items-center gap-2 mb-4 relative z-10">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: ACCENT.blue.bg, border: `1.5px solid ${ACCENT.blue.ring}` }}>
              <Globe className="w-4 h-4" style={{ color: ACCENT.blue.fill }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Live Market Converter</h3>
              <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                {marketSource}{marketLastUpdated && ` • ${marketLastUpdated.toLocaleTimeString()}`}
              </p>
            </div>
            <button onClick={() => fetchMarketRates(conversionFrom)} disabled={marketLoading}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-100 transition-colors"
              style={{ border: '1px solid rgba(0,0,0,0.08)' }} title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" style={{
                color: '#64748b', animation: marketLoading ? 'spin 1s linear infinite' : 'none',
              }} />
            </button>
          </div>

          {/* Currency selectors */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end mb-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748b' }}>From</label>
              <select value={conversionFrom} onChange={(e) => setConversionFrom(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm font-semibold outline-none"
                style={{ border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.7)', color: '#0f172a' }}>
                {converterCurrencies.map(c => (
                  <option key={c} value={c}>{c} — {CURRENCY_NAMES[c] || c}</option>
                ))}
              </select>
            </div>
            <button onClick={handleSwap} title="Swap"
              className="w-8 h-8 rounded-full flex items-center justify-center mb-0.5"
              style={{ border: '1.5px solid rgba(37,99,235,0.25)', background: ACCENT.blue.bg, cursor: 'pointer' }}>
              <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: ACCENT.blue.fill }} />
            </button>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748b' }}>To</label>
              <select value={conversionTo} onChange={(e) => setConversionTo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm font-semibold outline-none"
                style={{ border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.7)', color: '#0f172a' }}>
                {converterCurrencies.map(c => (
                  <option key={c} value={c}>{c} — {CURRENCY_NAMES[c] || c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount input */}
          <div className="mb-4">
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748b' }}>Amount</label>
            <input type="number" value={conversionAmount}
              onChange={(e) => setConversionAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2.5 rounded-lg text-sm font-semibold outline-none"
              style={{ border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.7)', color: '#0f172a' }}
            />
          </div>

          {/* Conversion Result */}
          {marketLoading ? (
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.10)' }}>
              <p className="text-sm" style={{ color: '#64748b' }}>Fetching live rates...</p>
            </div>
          ) : marketError ? (
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.12)' }}>
              <p className="text-sm" style={{ color: '#b91c1c' }}>{marketError}</p>
            </div>
          ) : conversionFrom === conversionTo ? (
            <div className="rounded-xl p-5" style={{ background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.10)' }}>
              <div className="flex justify-center items-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#64748b' }}>Amount</p>
                  <p className="text-xl font-extrabold" style={{ color: '#0f172a' }}>
                    {formatNumber(conversionAmount, 2)} <span className="text-sm" style={{ color: '#475569' }}>{conversionFrom}</span>
                  </p>
                </div>
                <ArrowRight className="w-4 h-4" style={{ color: '#94a3b8' }} />
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#64748b' }}>Converted</p>
                  <p className="text-xl font-extrabold" style={{ color: '#0f172a' }}>
                    {formatNumber(conversionAmount, 2)} <span className="text-sm" style={{ color: '#475569' }}>{conversionTo}</span>
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-center mt-2" style={{ color: '#94a3b8' }}>Same currency — 1:1</p>
            </div>
          ) : marketConversionRate ? (
            <div className="rounded-xl p-5" style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,0.04) 0%, rgba(5,150,105,0.04) 100%)',
              border: '1px solid rgba(37,99,235,0.10)',
            }}>
              <div className="flex justify-center items-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#64748b' }}>Amount</p>
                  <p className="text-xl font-extrabold" style={{ color: '#0f172a' }}>
                    {formatNumber(conversionAmount, 2)} <span className="text-sm" style={{ color: '#475569' }}>{conversionFrom}</span>
                  </p>
                </div>
                <ArrowRight className="w-4 h-4" style={{ color: ACCENT.blue.fill }} />
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#64748b' }}>Converted</p>
                  <p className="text-xl font-extrabold" style={{ color: ACCENT.green.text }}>
                    {formatNumber(convertedAmount, 2)} <span className="text-sm" style={{ color: '#475569' }}>{conversionTo}</span>
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-center mt-2" style={{ color: '#64748b' }}>
                1 {conversionFrom} = {formatNumber(marketConversionRate, 6)} {conversionTo}
                <span style={{ color: '#94a3b8' }}> • {marketSource}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-sm" style={{ color: '#94a3b8' }}>No rate available for {conversionFrom} → {conversionTo}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Exchange Rate Pattern ── */}
        <div className="glass-strong rounded-2xl p-5 xl:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: ACCENT.purple.bg, border: `1.5px solid ${ACCENT.purple.ring}` }}>
              <TrendingUp className="w-4 h-4" style={{ color: ACCENT.purple.fill }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Visa vs Market Rates</h3>
              <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                Settlement rate markup over market rates (USD base)
              </p>
            </div>
          </div>

          {comparisonChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonChartData} barGap={2} barSize={18}>
                  <defs>
                    <linearGradient id="visaBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.5} />
                    </linearGradient>
                    <linearGradient id="marketBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="pair" axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: '#4b5563', fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fontSize: 10, fill: '#6b7280' }} width={50}
                    tickFormatter={(v) => formatNumber(v, 2)} />
                  <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(109,40,217,0.04)' }} />
                  <Legend iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize: '0.6875rem', fontWeight: 600 }} />
                  <Bar dataKey="Visa Rate" fill="url(#visaBar)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Market Rate" fill="url(#marketBar)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Spread % mini chart below */}
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
                  Buy vs Sell Spread (%)
                </p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={spreadChartData} barSize={24}>
                    <defs>
                      <linearGradient id="spreadBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d97706" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="pair" axisLine={false} tickLine={false}
                      tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false}
                      tick={{ fontSize: 10, fill: '#9ca3af' }} width={35}
                      tickFormatter={(v) => `${v.toFixed(1)}%`} />
                    <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(217,119,6,0.04)' }} />
                    <Bar dataKey="Spread %" fill="url(#spreadBar)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px]" style={{ color: '#94a3b8' }}>
              <div className="text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2" style={{ opacity: 0.3 }} />
                <p className="text-sm">Loading rate comparison…</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ VSS SETTLEMENT RATES SECTION ══════════════ */}
      {loading ? (
        <div className="glass rounded-2xl p-8 text-center">
          <RefreshCw className="w-5 h-5 mx-auto mb-3" style={{ color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>Loading settlement rates...</p>
        </div>
      ) : !hasRates ? (
        <div className="glass rounded-2xl p-6 text-center">
          <RefreshCw className="w-6 h-6 mx-auto mb-3" style={{ color: '#d97706' }} />
          <p className="text-sm font-medium" style={{ color: '#92400e' }}>
            No EP-756 currency rate data available.
          </p>
          <p className="text-xs mt-1" style={{ color: '#b45309' }}>
            Upload a VSS Edit Package containing EP756.TXT to view settlement rates.
          </p>
        </div>
      ) : (
        <>
          {/* ── Major VSS Rate Spotlight Cards ── */}
          {spotlightRates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: ACCENT.purple.bg, border: `1.5px solid ${ACCENT.purple.ring}` }}>
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: ACCENT.purple.fill }} />
                </div>
                <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>VSS Settlement Rates — Key Pairs</h3>
                <span className="text-[11px] ml-1" style={{ color: '#94a3b8' }}>Period: {settlementDate}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
                {spotlightRates.map((rate, idx) => {
                  const accent = ACCENT[accentCycle[idx % accentCycle.length]];
                  return (
                    <div key={rate.pairKey} className="glass rounded-xl p-3.5 transition-all hover:scale-[1.02]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent.text }}>
                          {rate.fromCurrency} → {rate.toCurrency}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent.fill }} />
                      </div>
                      <p className="text-base font-extrabold font-mono" style={{ color: '#0f172a' }}>
                        {formatNumber(rate.rate, 4)}
                      </p>
                      <p className="text-[9px] mt-0.5" style={{ color: '#94a3b8' }}>
                        Sell: {formatNumber(rate.sellRate, 4)} • {rate.spread.toFixed(3)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Full VSS Rates Table ── */}
          <div className="glass-strong rounded-2xl p-5 xl:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: ACCENT.green.bg, border: `1.5px solid ${ACCENT.green.ring}` }}>
                  <Shield className="w-3.5 h-3.5" style={{ color: ACCENT.green.fill }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>Visa Settlement Rates (EP-756)</h3>
                  <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                    Rates used for settlement processing • {formatNumber(rateRows.length)} pairs
                  </p>
                </div>
              </div>
              <div className="glass-subtle rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ color: '#475569' }}>
                Period: {settlementDate}
              </div>
            </div>
            <DataTable
              columns={rateColumns}
              data={rateRows}
              paginated={true}
              pageSize={20}
              searchable={true}
              searchFields={['fromCurrency', 'toCurrency']}
              loading={false}
            />
          </div>

          {/* ── Info Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4" style={{ color: ACCENT.blue.fill }} />
                <h4 className="text-xs font-bold" style={{ color: ACCENT.blue.text }}>Live Market Rates</h4>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#475569' }}>
                The converter uses live market rates covering 160+ currencies. Rates updated daily from open exchange rate feeds.
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4" style={{ color: ACCENT.green.fill }} />
                <h4 className="text-xs font-bold" style={{ color: ACCENT.green.text }}>VSS Settlement Rates</h4>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#475569' }}>
                EP-756 rates are Visa's proprietary settlement rates, which include Visa's markup (typically 0–3%). These are the actual rates applied during settlement.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
