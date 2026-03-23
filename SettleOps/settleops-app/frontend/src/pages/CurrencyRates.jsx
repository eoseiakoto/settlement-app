import { useEffect, useState, useCallback } from 'react';
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

/* ── Accent colour palette (matches Dashboard.jsx) ── */
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

function currencyLabel(code) {
  return CURRENCY_MAP[code] || code;
}

function parseVisaRate(rawRate) {
  // Visa EP-756 "SCL FACT & RATE" encoding:
  // 8-character field = 2-digit exponent + 6-digit mantissa
  // Rate (counter per base) = 10^exponent / mantissa
  if (!rawRate || typeof rawRate !== 'string' || rawRate.length < 8) return 0;
  const exponent = parseInt(rawRate.substring(0, 2), 10);
  const mantissa = parseInt(rawRate.substring(2), 10);
  if (mantissa === 0 || isNaN(exponent) || isNaN(mantissa)) return 0;
  return Math.pow(10, exponent) / mantissa;
}

/* ── Preferred currencies shown at top of dropdown ── */
const PREFERRED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'GHS', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR',
  'AED', 'SAR', 'NGN', 'ZAR', 'KES', 'BRL', 'MXN', 'SGD', 'HKD',
];


export default function CurrencyRates() {
  /* ── Visa settlement rates state ── */
  const [ratesData, setRatesData] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── Live market rates state ── */
  const [marketRates, setMarketRates] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState(null);
  const [marketLastUpdated, setMarketLastUpdated] = useState(null);

  /* ── Converter state ── */
  const [conversionFrom, setConversionFrom] = useState('USD');
  const [conversionTo, setConversionTo] = useState('GHS');
  const [conversionAmount, setConversionAmount] = useState(1000);

  /* ── Load Visa settlement rates ── */
  useEffect(() => {
    const loadRates = async () => {
      setLoading(true);
      try {
        const data = await getCurrencyRates();
        setRatesData(data);
      } catch (error) {
        console.warn('Failed to load VSS rates:', error.message);
      } finally {
        setLoading(false);
      }
    };
    loadRates();
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
      setMarketError('Unable to fetch live market rates. Please try again.');
      console.warn('Market rates error:', error.message);
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketRates(conversionFrom);
  }, [conversionFrom, fetchMarketRates]);

  /* ── Build dynamic currency list from market rates response ── */
  const converterCurrencies = (() => {
    const available = marketRates?.rates ? Object.keys(marketRates.rates) : [];
    // Always include the base currency
    const allCodes = new Set([conversionFrom, ...PREFERRED_CURRENCIES, ...available]);
    // Sort with preferred currencies first, then alphabetical
    const preferred = PREFERRED_CURRENCIES.filter(c => allCodes.has(c));
    const rest = [...allCodes].filter(c => !PREFERRED_CURRENCIES.includes(c)).sort();
    return [...preferred, ...rest];
  })();

  const marketSource = marketRates?.source || 'Open Exchange Rates';

  /* ── Process EP-756 Visa settlement rates ── */
  const rates = ratesData?.rates || [];
  const header = ratesData?.header || {};
  const hasRates = rates.length > 0;
  const settlementDate = header.cpd || header.processing_date || '—';

  const rawRows = rates.map((r, i) => {
    const buyRate = parseVisaRate(r.buy_rate);
    const sellRate = parseVisaRate(r.sell_rate);
    const fromAlpha = currencyLabel(r.base_currency || '');
    const toAlpha = currencyLabel(r.counter_currency || '');
    return {
      id: i,
      fromCurrency: fromAlpha,
      toCurrency: toAlpha,
      rate: buyRate,
      sellRate: sellRate,
      spread: buyRate && sellRate ? Math.abs(((buyRate - sellRate) / buyRate) * 100) : 0,
      inverseRate: buyRate ? 1 / buyRate : 0,
      effectiveDate: r.effective_date || settlementDate,
      pairKey: `${fromAlpha}-${toAlpha}`,
    };
  });

  const seen = new Set();
  const rateRows = rawRows.filter(r => {
    if (r.fromCurrency === r.toCurrency) return false;
    if (seen.has(r.pairKey)) return false;
    seen.add(r.pairKey);
    return true;
  });

  /* ── Live market conversion ── */
  const marketConversionRate = marketRates?.rates?.[conversionTo] || null;
  const convertedAmount = marketConversionRate ? conversionAmount * marketConversionRate : null;

  /* ── Swap currencies ── */
  const handleSwap = () => {
    setConversionFrom(conversionTo);
    setConversionTo(conversionFrom);
  };

  /* ── VSS rates table columns ── */
  const rateColumns = [
    {
      key: 'fromCurrency',
      label: 'Base Currency',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#1e293b', letterSpacing: '0.04em' }}>{val}</span>
      ),
    },
    {
      key: 'toCurrency',
      label: 'Counter Currency',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#1e293b', letterSpacing: '0.04em' }}>{val}</span>
      ),
    },
    {
      key: 'rate',
      label: 'Buy Rate',
      render: (val) => val ? (
        <span style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", color: '#047857', fontWeight: 600 }}>
          {formatNumber(val, 6)}
        </span>
      ) : '—',
    },
    {
      key: 'sellRate',
      label: 'Sell Rate',
      render: (val) => val ? (
        <span style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", color: '#b45309', fontWeight: 600 }}>
          {formatNumber(val, 6)}
        </span>
      ) : '—',
    },
    {
      key: 'spread',
      label: 'Spread %',
      render: (val) => val ? (
        <span style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", color: '#6b7280', fontSize: '0.8rem' }}>
          {val.toFixed(4)}%
        </span>
      ) : '—',
    },
    {
      key: 'inverseRate',
      label: 'Inverse',
      render: (val) => val ? (
        <span style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", color: '#6b7280' }}>
          {formatNumber(val, 6)}
        </span>
      ) : '—',
    },
  ];

  /* ── Major rates spotlight cards ── */
  const majorPairs = ['GHS', 'EUR', 'GBP', 'JPY', 'CHF', 'AED', 'INR', 'ZAR'];
  const spotlightRates = rateRows
    .filter(r => r.fromCurrency === 'USD' && majorPairs.includes(r.toCurrency))
    .sort((a, b) => majorPairs.indexOf(a.toCurrency) - majorPairs.indexOf(b.toCurrency))
    .slice(0, 8);

  const accentCycle = ['blue', 'green', 'purple', 'amber'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ══════════════ PAGE HEADER ══════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Currency Rates
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
            Live market conversion &amp; Visa VSS settlement rates
          </p>
        </div>
        {hasRates && (
          <div className="glass-subtle" style={{
            padding: '0.375rem 0.875rem', borderRadius: '9999px',
            fontSize: '0.75rem', fontWeight: 600, color: '#475569',
          }}>
            {formatNumber(rateRows.length)} settlement rate pairs
          </div>
        )}
      </div>

      {/* ══════════════ LIVE MARKET RATE CONVERTER ══════════════ */}
      <div className="glass-strong" style={{ borderRadius: '1rem', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle accent orb */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px',
          borderRadius: '50%', background: 'rgba(37,99,235,0.06)', filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', position: 'relative' }}>
          <div style={{
            width: '2rem', height: '2rem', borderRadius: '0.625rem',
            background: ACCENT.blue.bg, border: `1.5px solid ${ACCENT.blue.ring}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe style={{ width: '1rem', height: '1rem', color: ACCENT.blue.fill }} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Live Market Rate Converter
            </h3>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: 0 }}>
              Powered by {marketSource}
              {marketLastUpdated && ` • Updated ${marketLastUpdated.toLocaleTimeString()}`}
            </p>
          </div>
          <button
            onClick={() => fetchMarketRates(conversionFrom)}
            disabled={marketLoading}
            style={{
              marginLeft: 'auto', padding: '0.375rem', borderRadius: '0.5rem',
              border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            title="Refresh rates"
          >
            <RefreshCw style={{
              width: '0.875rem', height: '0.875rem', color: '#64748b',
              animation: marketLoading ? 'spin 1s linear infinite' : 'none',
            }} />
          </button>
        </div>

        {/* Converter Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          {/* From */}
          <div>
            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              From
            </label>
            <select
              value={conversionFrom}
              onChange={(e) => setConversionFrom(e.target.value)}
              style={{
                width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.625rem',
                border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.7)',
                fontSize: '0.875rem', fontWeight: 600, color: '#0f172a',
                outline: 'none', cursor: 'pointer', appearance: 'auto',
              }}
            >
              {converterCurrencies.map(c => (
                <option key={c} value={c}>{c}{CURRENCY_NAMES[c] ? ` — ${CURRENCY_NAMES[c]}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Swap button */}
          <button
            onClick={handleSwap}
            style={{
              width: '2.25rem', height: '2.25rem', borderRadius: '50%',
              border: '1.5px solid rgba(37,99,235,0.25)', background: ACCENT.blue.bg,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '0.125rem', transition: 'all 0.2s',
            }}
            title="Swap currencies"
          >
            <ArrowLeftRight style={{ width: '0.875rem', height: '0.875rem', color: ACCENT.blue.fill }} />
          </button>

          {/* To */}
          <div>
            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              To
            </label>
            <select
              value={conversionTo}
              onChange={(e) => setConversionTo(e.target.value)}
              style={{
                width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.625rem',
                border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.7)',
                fontSize: '0.875rem', fontWeight: 600, color: '#0f172a',
                outline: 'none', cursor: 'pointer', appearance: 'auto',
              }}
            >
              {converterCurrencies.map(c => (
                <option key={c} value={c}>{c}{CURRENCY_NAMES[c] ? ` — ${CURRENCY_NAMES[c]}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Amount
            </label>
            <input
              type="number"
              value={conversionAmount}
              onChange={(e) => setConversionAmount(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.625rem',
                border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.7)',
                fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Conversion Result */}
        {marketLoading ? (
          <div style={{
            marginTop: '1.25rem', padding: '1.25rem', borderRadius: '0.75rem',
            background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.10)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>Fetching live rates...</p>
          </div>
        ) : marketError ? (
          <div style={{
            marginTop: '1.25rem', padding: '1.25rem', borderRadius: '0.75rem',
            background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.12)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.8125rem', color: '#b91c1c', margin: 0 }}>{marketError}</p>
          </div>
        ) : conversionFrom === conversionTo ? (
          <div style={{
            marginTop: '1.25rem', padding: '1.5rem', borderRadius: '0.75rem',
            background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.10)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {formatNumber(conversionAmount, 2)} <span style={{ fontSize: '0.875rem', color: '#475569' }}>{conversionFrom}</span>
                </p>
              </div>
              <ArrowRight style={{ width: '1.25rem', height: '1.25rem', color: '#94a3b8' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Converted</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {formatNumber(conversionAmount, 2)} <span style={{ fontSize: '0.875rem', color: '#475569' }}>{conversionTo}</span>
                </p>
              </div>
            </div>
            <p style={{ fontSize: '0.6875rem', textAlign: 'center', color: '#94a3b8', marginTop: '0.75rem' }}>
              Same currency — rate is 1:1
            </p>
          </div>
        ) : marketConversionRate ? (
          <div style={{
            marginTop: '1.25rem', padding: '1.5rem', borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.04) 0%, rgba(5,150,105,0.04) 100%)',
            border: '1px solid rgba(37,99,235,0.10)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {formatNumber(conversionAmount, 2)} <span style={{ fontSize: '0.875rem', color: '#475569' }}>{conversionFrom}</span>
                </p>
              </div>
              <ArrowRight style={{ width: '1.25rem', height: '1.25rem', color: ACCENT.blue.fill }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Converted</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: ACCENT.green.text, margin: 0 }}>
                  {formatNumber(convertedAmount, 2)} <span style={{ fontSize: '0.875rem', color: '#475569' }}>{conversionTo}</span>
                </p>
              </div>
            </div>
            <p style={{ fontSize: '0.6875rem', textAlign: 'center', color: '#64748b', marginTop: '0.75rem' }}>
              1 {conversionFrom} = {formatNumber(marketConversionRate, 6)} {conversionTo}
              <span style={{ color: '#94a3b8' }}> • {marketSource}</span>
            </p>
          </div>
        ) : (
          <div style={{
            marginTop: '1.25rem', padding: '1.25rem', borderRadius: '0.75rem',
            background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: 0 }}>
              No market rate available for {conversionFrom} → {conversionTo}
            </p>
          </div>
        )}
      </div>

      {/* ══════════════ VSS SETTLEMENT RATES SECTION ══════════════ */}
      {loading ? (
        <div className="glass" style={{ borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
          <RefreshCw style={{ width: '1.5rem', height: '1.5rem', color: '#94a3b8', margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading settlement rates...</p>
        </div>
      ) : !hasRates ? (
        <div className="glass" style={{ borderRadius: '1rem', padding: '2rem', textAlign: 'center' }}>
          <RefreshCw style={{ width: '2rem', height: '2rem', color: '#d97706', margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 500 }}>
            No EP-756 currency rate data available in the parsed reports.
          </p>
          <p style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
            Upload a VSS Edit Package containing EP756.TXT to view settlement rates.
          </p>
        </div>
      ) : (
        <>
          {/* ── Major VSS Rate Spotlight Cards ── */}
          {spotlightRates.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                  background: ACCENT.purple.bg, border: `1.5px solid ${ACCENT.purple.ring}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TrendingUp style={{ width: '0.875rem', height: '0.875rem', color: ACCENT.purple.fill }} />
                </div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  VSS Settlement Rates — Key Pairs
                </h3>
                <span style={{ fontSize: '0.6875rem', color: '#94a3b8', marginLeft: '0.25rem' }}>
                  Settlement period: {settlementDate}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {spotlightRates.map((rate, idx) => {
                  const accent = ACCENT[accentCycle[idx % accentCycle.length]];
                  return (
                    <div key={rate.pairKey} className="glass" style={{
                      borderRadius: '0.875rem', padding: '1rem',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'default',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                        <span style={{
                          fontSize: '0.6875rem', fontWeight: 700, color: accent.text,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {rate.fromCurrency} → {rate.toCurrency}
                        </span>
                        <div style={{
                          width: '0.375rem', height: '0.375rem', borderRadius: '50%',
                          background: accent.fill,
                        }} />
                      </div>
                      <p style={{
                        fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem',
                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                      }}>
                        {formatNumber(rate.rate, 4)}
                      </p>
                      <p style={{ fontSize: '0.625rem', color: '#94a3b8', margin: 0 }}>
                        Sell: {formatNumber(rate.sellRate, 4)} • Spread: {rate.spread.toFixed(3)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Full VSS Rates Table ── */}
          <div className="glass-strong" style={{ borderRadius: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                  background: ACCENT.green.bg, border: `1.5px solid ${ACCENT.green.ring}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Shield style={{ width: '0.875rem', height: '0.875rem', color: ACCENT.green.fill }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Visa Settlement Rates (EP-756)
                  </h3>
                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: 0 }}>
                    Rates used by Visa for settlement processing • {formatNumber(rateRows.length)} pairs
                  </p>
                </div>
              </div>
              <div className="glass-subtle" style={{
                padding: '0.25rem 0.625rem', borderRadius: '9999px',
                fontSize: '0.6875rem', fontWeight: 600, color: '#475569',
              }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="glass" style={{ borderRadius: '0.875rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Globe style={{ width: '1rem', height: '1rem', color: ACCENT.blue.fill }} />
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: ACCENT.blue.text, margin: 0 }}>
                  Live Market Rates
                </h4>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                The converter uses live market rates covering 160+ currencies worldwide including African currencies. Rates are updated daily from open exchange rate feeds.
              </p>
            </div>
            <div className="glass" style={{ borderRadius: '0.875rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Shield style={{ width: '1rem', height: '1rem', color: ACCENT.green.fill }} />
                <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: ACCENT.green.text, margin: 0 }}>
                  VSS Settlement Rates
                </h4>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                EP-756 rates are Visa's proprietary settlement rates, which include Visa's markup (typically 0–3%). These are the actual rates applied during settlement processing.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
