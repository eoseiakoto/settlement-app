import { useEffect, useState } from 'react';
import { getSettlement, getSettlementHierarchy, getSettlementFees } from '../utils/api';
import StatCard from '../components/StatCard';
import { Building2, Scale, Layers, RefreshCw } from 'lucide-react';
import { formatNumber } from '../utils/format';

const ACCENT = {
  blue:   { bg: 'rgba(37,99,235,0.12)',  ring: 'rgba(37,99,235,0.22)',  text: '#1d4ed8', fill: '#2563eb' },
  green:  { bg: 'rgba(5,150,105,0.12)',   ring: 'rgba(5,150,105,0.22)',  text: '#047857', fill: '#059669' },
  purple: { bg: 'rgba(109,40,217,0.12)',  ring: 'rgba(109,40,217,0.22)', text: '#6d28d9', fill: '#7c3aed' },
};

export default function Settlement() {
  const [settlementData, setSettlementData] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [sData, hData, fData] = await Promise.allSettled([
          getSettlement(),
          getSettlementHierarchy(),
          getSettlementFees(),
        ]);
        if (sData.status === 'fulfilled') setSettlementData(sData.value);
        if (hData.status === 'fulfilled') setHierarchy(hData.value);
        if (fData.status === 'fulfilled') setFees(fData.value);
      } catch (error) {
        console.warn('Failed to load settlement:', error.message);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const ep746Records = settlementData?.ep_746?.data || [];
  const ep746List = Array.isArray(ep746Records) ? ep746Records : ep746Records?.records || [];
  const ep747Data = settlementData?.ep_747 || {};
  const vssReports = ep747Data?.reports || ep747Data || {};
  const feeKeys = fees ? Object.keys(fees) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Settlement Overview
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
            VSS settlement hierarchy, member data &amp; fee reporting
          </p>
        </div>
      </div>

      {loading ? (
        <div className="glass" style={{ borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
          <RefreshCw style={{ width: '1.5rem', height: '1.5rem', color: '#94a3b8', margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading settlement data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <StatCard icon={Layers} label="EP-746 Records" value={formatNumber(ep746List.length)} accent="blue" />
            <StatCard icon={Scale} label="VSS Report Sections" value={formatNumber(Object.keys(vssReports).length)} accent="green" />
            <StatCard icon={Building2} label="Fee Categories" value={formatNumber(feeKeys.length)} accent="purple" />
          </div>

          {/* Hierarchy / VSS-100-W */}
          <div className="glass-strong" style={{ borderRadius: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{
                width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                background: ACCENT.blue.bg, border: `1.5px solid ${ACCENT.blue.ring}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Building2 style={{ width: '0.875rem', height: '0.875rem', color: ACCENT.blue.fill }} />
              </div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Settlement Reporting Hierarchy
              </h3>
            </div>
            {hierarchy && !hierarchy.message ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Array.isArray(hierarchy) ? (
                  hierarchy.map((item, i) => (
                    <div key={i} className="glass-subtle" style={{ padding: '0.75rem 1rem', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 style={{ width: '1rem', height: '1rem', color: ACCENT.blue.fill, flexShrink: 0 }} />
                      <pre style={{ fontSize: '0.75rem', color: '#1e293b', whiteSpace: 'pre-wrap', margin: 0, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>{JSON.stringify(item, null, 2)}</pre>
                    </div>
                  ))
                ) : (
                  <pre style={{ fontSize: '0.75rem', color: '#1e293b', background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '0.625rem', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '20rem', margin: 0, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                    {typeof hierarchy === 'string' ? hierarchy : JSON.stringify(hierarchy, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <div className="glass-subtle" style={{ padding: '1rem', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Building2 style={{ width: '1.25rem', height: '1.25rem', color: ACCENT.blue.fill, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>ADB Main Settlement Account</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.125rem 0 0' }}>Center: 408319 | BIN: 408319 | Settlement Currency: USD (840)</p>
                </div>
              </div>
            )}
          </div>

          {/* EP-746 Member Settlement Data */}
          {ep746List.length > 0 && (
            <div className="glass-strong" style={{ borderRadius: '1rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                  background: ACCENT.green.bg, border: `1.5px solid ${ACCENT.green.ring}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Layers style={{ width: '0.875rem', height: '0.875rem', color: ACCENT.green.fill }} />
                </div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  EP-746 Member Settlement Data
                </h3>
              </div>
              <div style={{ overflow: 'auto', maxHeight: '24rem' }}>
                <pre style={{ fontSize: '0.6875rem', color: '#1e293b', background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '0.625rem', whiteSpace: 'pre-wrap', margin: 0, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                  {JSON.stringify(ep746List.slice(0, 20), null, 2)}
                </pre>
              </div>
              {ep746List.length > 20 && (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>Showing first 20 of {ep746List.length} records</p>
              )}
            </div>
          )}

          {/* VSS Report Sections */}
          {Object.keys(vssReports).length > 0 && (
            <div className="glass-strong" style={{ borderRadius: '1rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                  background: ACCENT.purple.bg, border: `1.5px solid ${ACCENT.purple.ring}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Scale style={{ width: '0.875rem', height: '0.875rem', color: ACCENT.purple.fill }} />
                </div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  EP-747 VSS Report Sections
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.625rem' }}>
                {Object.entries(vssReports).map(([key, val]) => (
                  <div key={key} className="glass" style={{ padding: '0.875rem', borderRadius: '0.75rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>{key}</p>
                    <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      {Array.isArray(val) ? `${val.length} records` :
                       typeof val === 'object' ? `${Object.keys(val).length} fields` : String(val).substring(0, 50)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fee Summary */}
          {feeKeys.length > 0 && (
            <div className="glass-strong" style={{ borderRadius: '1rem', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem' }}>
                Settlement Fees (VSS-130/140/210)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {feeKeys.map(key => (
                  <div key={key} className="glass-subtle" style={{ padding: '1rem', borderRadius: '0.75rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>{key}</p>
                    <pre style={{ fontSize: '0.6875rem', color: '#475569', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '10rem', margin: 0, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                      {JSON.stringify(fees[key], null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="glass" style={{ borderRadius: '0.875rem', padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: ACCENT.blue.text, marginBottom: '0.375rem' }}>Settlement Cycle</h4>
              <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                Daily settlement with ADB main account via Visa VisaNet Settlement Service (VSS)
              </p>
            </div>
            <div className="glass" style={{ borderRadius: '0.875rem', padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: ACCENT.green.text, marginBottom: '0.375rem' }}>Settlement Currency</h4>
              <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                Settlement in USD (840), transactions primarily in GHS (936)
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
