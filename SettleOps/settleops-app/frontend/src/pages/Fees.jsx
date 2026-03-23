import { useEffect, useState } from 'react';
import { getSettlementFees } from '../utils/api';
import { Receipt, RefreshCw } from 'lucide-react';

const ACCENT = {
  blue:   { bg: 'rgba(37,99,235,0.12)',  ring: 'rgba(37,99,235,0.22)',  text: '#1d4ed8', fill: '#2563eb' },
  green:  { bg: 'rgba(5,150,105,0.12)',   ring: 'rgba(5,150,105,0.22)',  text: '#047857', fill: '#059669' },
  orange: { bg: 'rgba(234,88,12,0.12)',   ring: 'rgba(234,88,12,0.22)',  text: '#c2410c', fill: '#ea580c' },
  purple: { bg: 'rgba(109,40,217,0.12)',  ring: 'rgba(109,40,217,0.22)', text: '#6d28d9', fill: '#7c3aed' },
};

const FEE_INFO = [
  { key: 'VSS-130', title: 'Reimbursement Fees', desc: 'Interchange reimbursement fees charged by issuer to acquirer for processing transactions.', sub: 'Calculated per transaction based on Fee Program Indicator', accent: 'blue' },
  { key: 'VSS-140', title: 'Visa Charges', desc: 'Service fees charged by Visa for network access and transaction processing.', sub: 'Includes assessment fees, authorization charges, and network access fees', accent: 'orange' },
  { key: 'VSS-210', title: 'Currency Conversion', desc: 'Foreign exchange margins applied when settlement and transaction currencies differ.', sub: 'Applied to cross-border transactions requiring currency conversion', accent: 'green' },
  { key: 'VSS-215', title: 'ISA Adjustments', desc: 'Interchange Settlement Adjustments for clearing and settlement differences.', sub: 'Monthly reconciliation-based adjustments', accent: 'purple' },
];

export default function Fees() {
  const [fees, setFees] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFees = async () => {
      setLoading(true);
      try {
        const data = await getSettlementFees();
        setFees(data || {});
      } catch (error) {
        console.warn('Failed to load fees:', error.message);
      } finally {
        setLoading(false);
      }
    };
    loadFees();
  }, []);

  const feeKeys = Object.keys(fees);
  const tabs = [{ id: 'all', label: 'All Fee Reports' }, ...feeKeys.map(k => ({ id: k, label: k }))];
  const visibleFees = activeTab === 'all' ? feeKeys : [activeTab];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          Fees &amp; Charges
        </h2>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
          Interchange, Visa service fees &amp; currency conversion charges
        </p>
      </div>

      {loading ? (
        <div className="glass" style={{ borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
          <RefreshCw style={{ width: '1.5rem', height: '1.5rem', color: '#94a3b8', margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading fee data...</p>
        </div>
      ) : feeKeys.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass" style={{ borderRadius: '1rem', padding: '2rem', textAlign: 'center' }}>
            <Receipt style={{ width: '2rem', height: '2rem', color: '#d97706', margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 500 }}>
              No detailed fee data available in the parsed reports.
            </p>
            <p style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
              Fee reports (VSS-130, VSS-140, VSS-210) may not be present in the current Edit Package.
            </p>
          </div>

          {/* Fee Category Info Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {FEE_INFO.map(info => {
              const a = ACCENT[info.accent];
              return (
                <div key={info.key} className="glass" style={{ borderRadius: '0.875rem', padding: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: a.text, marginBottom: '0.375rem' }}>
                    {info.key}: {info.title}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5', margin: '0 0 0.25rem' }}>
                    {info.desc}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: 0 }}>{info.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="glass-strong" style={{ borderRadius: '0.875rem', padding: '0 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto' }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '0.875rem 0.25rem', fontSize: '0.8125rem', fontWeight: 600,
                    borderBottom: `2px solid ${activeTab === tab.id ? '#2563eb' : 'transparent'}`,
                    color: activeTab === tab.id ? '#2563eb' : '#64748b',
                    background: 'none', border: 'none', borderBottomStyle: 'solid',
                    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fee Report Content */}
          {visibleFees.map(key => (
            <div key={key} className="glass-strong" style={{ borderRadius: '1rem', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>{key}</h3>
              <div style={{ overflow: 'auto', maxHeight: '24rem' }}>
                <pre style={{ fontSize: '0.6875rem', color: '#1e293b', background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '0.625rem', whiteSpace: 'pre-wrap', margin: 0, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                  {JSON.stringify(fees[key], null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
