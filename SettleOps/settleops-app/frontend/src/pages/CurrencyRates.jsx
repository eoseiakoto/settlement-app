import { useEffect, useState, useCallback, useMemo } from 'react';
import { getCurrencyRates, getMarketRates } from '../utils/api';
import DataTable from '../components/DataTable';
import { DollarSign, TrendingUp, RefreshCw, ArrowLeftRight, Globe, Shield, ArrowRight } from 'lucide-react';
import { formatNumber } from '../utils/format';
import { numericToAlpha, getCurrencyName, currencyOption, CURRENCY_NAMES, PREFERRED_CURRENCIES } from '../utils/currency';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ── Accent colour palette (matches Dashboard.jsx) ── */
const ACCENT = {
  blue:   { bg: 'rgba(37,99,235,0.12)',  ring: 'rgba(37,99,235,0.22)',  text: '#1d4ed8', fill: '#2563eb' },
  green:  { bg: 'rgba(5,150,105,0.12)',   ring: 'rgba(5,150,105,0.22)',  text: '#047857', fill: '#059669' },
  purple: { bg: 'rgba(109,40,217,0.12)',  ring: 'rgba(109,40,217,0.22)', text: '#6d28d9', fill: '#7c3aed' },
  amber:  { bg: 'rgba(217,119,6,0.12)',   ring: 'rgba(217,119,6,0.22)',  text: '#b45309', fill: '#d97706' },
};

function parseVisaRate(rawRate) {
  if (!rawRate || typeof rawRate !== 'string' || rawRate.length < 8) return 0;
  const exponent = parseInt(rawRate.substring(0, 2), 10);
  const mantissa = parseInt(rawRate.substring(2), 10);
  if (mantissa === 0 || isNaN(exponent) || isNaN(mantissa)) return 0;
  return Math.pow(10, exponent) / mantissa;
}


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

  /* ── Chart pair selector ── */
  const [chartBase, setChartBase] = useState('USD');

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

  /* ── Build deduplicated currency list from market rates ── */
  const converterCurrencies = useMemo(() => {
    const available = marketRates?.rates ? Object.keys(marketRates.rates) : [];
    const allCodes = new Set([conversionFrom, ...PREFERRED_CURRENCIES, ...available]);
    const preferred = PREFERRED_CURRENCIES.filter(c => allCodes.has(c));
    const rest = [...allCodes].filter(c => !PREFERRED_CURRENCIES.includes(c)).sort();
    // Deduplicate — Set already handles this, but build final array once
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
      const fromAlpha = numericToAlpha(r.base_currency || '');
      const toAlpha = numericToAlpha(r.counter_currency || '');
      return {
        id: i,
        fromCurrency: fromAlpha,
        fromName: getCurrencyName(fromAlpha),
        toCurrency: toAlpha,
        toName: getCurrencyName(toAlpha),
        rate: buyRate,
        sellRate: sellRate,
        spread: buyRate && sellRate ? Math.abs(((buyRate - sellRate) / buyRate) * 100) : 0,
        inverseRate: buyRate ? 1 / buyRate : 0,
        effectiveDate: r.effective_date || settlementDate,
        pairKey: `${fromAlpha}-${toAlpha}`,
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

  /* ── Build chart data — top counter currencies for selected base ── */
  const chartData = useMemo(() => {
    const baseRates = rateRows.filter(r => r.fromCurrency === chartBase && r.rate > 0);
    if (baseRates.length === 0) return [];
    // Pick top 8 by relevance (prefer major currencies)
    const majors = ['GHS', 'EUR', 'GBP', 'JPY', 'CHF', 'AED', 'INR', 'ZAR', 'CNY', 'CAD', 'AUD', 'NGN', 'KES'];
    const sorted = baseRates.sort((a, b) => {
      const aIdx = majors.indexOf(a.toCurrency);
      const bIdx = majors.indexOf(b.toCurrency);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.toCurrency.localeCompare(b.toCurrency);
    }).slice(0, 10);
    return sorted.map(r => ({
      pair: `${r.toCurrency}`,
      name: getCurrencyName(r.toCurrency),
      buy: parseFloat(r.rate.toFixed(6)),
      sell: parseFloat(r.sellRate.toFixed(6)),
      spread: parseFloat(r.spread.toFixed(4)),
    }));
  }, [rateRows, chartBase]);

  /* ── Available base currencies for chart selector ── */
  const chartBaseCurrencies = useMemo(() => {
    const bases = new Set(rateRows.map(r => r.fromCurrency));
    return [...bases].sort();
  }, [rateRows]);

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
      render: (val, row) => (
        <span style={{ fontWeight: 600, color: '#1e293b' }}>
          {val} <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.75rem' }}>({row.fromName})</span>
        </span>
      ),
    },
    {
      key: 'toCurrency',
      label: 'Counter Currency',
      render: (val, row) => (
        <span style={{ fontWeight: 600, color: '#1e293b' }}>
          {val} <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.75rem' }}>({row.toName})</span>
        </span>
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

      {/* ══════════════ SPLIT LAYOUT: CONVERTER (left) + RATE PATTERN (right) ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── LEFT: LIVE MARKET RATE CONVERTER ── */}
        <div className="glass-strong" style={{ borderRadius: '1rem', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
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
                Exchange Rate Converter
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

          {/* Converter Fields — stacked for the narrower column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                  <option key={c} value={c}>{currencyOption(c)}</option>
                ))}
              </select>
            </div>

            {/* Swap + Amount row */}
            <div style={{ display: 'flex', alignItems: 'end', gap: '0.75rem' }}>
              <button
                onClick={handleSwap}
                style={{
                  width: '2.25rem', height: '2.25rem', borderRadius: '50%', flexShrink: 0,
                  border: '1.5px solid rgba(37,99,235,0.25)', background: ACCENT.blue.bg,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                title="Swap currencies"
              >
                <ArrowLeftRight style={{ width: '0.875rem', height: '0.875rem', color: ACCENT.blue.fill }} />
              </button>
              <div style={{ flex: 1 }}>
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
                  <option key={c} value={c}>{currencyOption(c)}</option>
                ))}
              </select>
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
              marginTop: '1.25rem', padding: '1.25rem', borderRadius: '0.75rem',
              background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.10)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
                {formatNumber(conversionAmount, 2)} <span style={{ fontSize: '0.8125rem', color: '#475569' }}>{conversionFrom}</span>
              </p>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: 0 }}>Same currency — rate is 1:1</p>
            </div>
          ) : marketConversionRate ? (
            <div style={{
              marginTop: '1.25rem', padding: '1.25rem', borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.04) 0%, rgba(5,150,105,0.04) 100%)',
              border: '1px solid rgba(37,99,235,0.10)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {formatNumber(conversionAmount, 2)} <span style={{ fontSize: '0.75rem', color: '#475569' }}>{conversionFrom}</span>
                  </p>
                </div>
                <ArrowRight style={{ width: '1.125rem', height: '1.125rem', color: ACCENT.blue.fill }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Converted</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: ACCENT.green.text, margin: 0 }}>
                    {formatNumber(convertedAmount, 2)} <span style={{ fontSize: '0.75rem', color: '#475569' }}>{conversionTo}</span>
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

        {/* ── RIGHT: EXCHANGE RATE PATTERN CHART ── */}
        <div className="glass-strong" style={{ borderRadius: '1rem', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '-40px', left: '-40px', width: '160px', height: '160px',
            borderRadius: '50%', background: 'rgba(109,40,217,0.06)', filter: 'blur(40px)', pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', position: 'relative' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '0.625rem',
              background: ACCENT.purple.bg, border: `1.5px solid ${ACCENT.purple.ring}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp style={{ width: '1rem', height: '1rem', color: ACCENT.purple.fill }} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                VSS Rate Pattern
              </h3>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: 0 }}>
                Buy vs Sell rates — Visa settlement (EP-756)
              </p>
            </div>
            {/* Base currency selector */}
            <select
              value={chartBase}
              onChange={(e) => setChartBase(e.target.value)}
              style={{
                padding: '0.375rem 0.5rem', borderRadius: '0.5rem',
                border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.7)',
                fontSize: '0.75rem', fontWeight: 600, color: '#0f172a',
                outline: 'none', cursor: 'pointer',
              }}
            >
              {chartBaseCurrencies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {chartData.length > 0 ? (
            <div style={{ width: '100%', height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="pair"
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }}
                    axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(0,0,0,0.08)', borderRadius: '0.75rem',
                      fontSize: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    formatter={(value, name) => [value.toFixed(6), name === 'buy' ? 'Buy Rate' : 'Sell Rate']}
                    labelFormatter={(label) => `${chartBase} → ${label} (${getCurrencyName(label)})`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '0.75rem', fontWeight: 600 }}
                    formatter={(val) => val === 'buy' ? 'Buy Rate' : 'Sell Rate'}
                  />
                  <Line type="monotone" dataKey="buy" stroke={ACCENT.green.fill} strokeWidth={2.5} dot={{ r: 4, fill: ACCENT.green.fill }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="sell" stroke={ACCENT.amber.fill} strokeWidth={2.5} dot={{ r: 4, fill: ACCENT.amber.fill }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px' }}>
              <RefreshCw style={{ width: '1.25rem', height: '1.25rem', color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
              <span style={{ marginLeft: '0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>Loading rates...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px', color: '#94a3b8', fontSize: '0.8125rem' }}>
              No VSS rate data available for {chartBase}
            </div>
          )}

          {/* Spread summary */}
          {chartData.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {chartData.slice(0, 6).map((d) => (
                <div key={d.pair} style={{
                  padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 600,
                  background: 'rgba(109,40,217,0.06)', color: '#6d28d9',
                }}>
                  {d.pair}: {d.spread}% spread
                </div>
              ))}
            </div>
          )}
        </div>
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
                      <p style={{ fontSize: '0.625rem', color: '#64748b', margin: 0 }}>
                        {getCurrencyName(rate.toCurrency)}
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
              searchFields={['fromCurrency', 'toCurrency', 'fromName', 'toName']}
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
