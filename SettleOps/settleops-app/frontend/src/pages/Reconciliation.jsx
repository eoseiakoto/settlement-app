import { useEffect, useState } from 'react';
import { getReconciliation, getBatchSummary } from '../utils/api';
import StatCard from '../components/StatCard';
import { CheckCircle, AlertCircle, FileBarChart, Layers, RefreshCw } from 'lucide-react';
import { formatNumber } from '../utils/format';

const ACCENT = {
  blue:   { bg: 'rgba(37,99,235,0.12)',  ring: 'rgba(37,99,235,0.22)',  text: '#1d4ed8', fill: '#2563eb' },
  green:  { bg: 'rgba(5,150,105,0.12)',   ring: 'rgba(5,150,105,0.22)',  text: '#047857', fill: '#059669' },
  purple: { bg: 'rgba(109,40,217,0.12)',  ring: 'rgba(109,40,217,0.22)', text: '#6d28d9', fill: '#7c3aed' },
};

export default function Reconciliation() {
  const [reconData, setReconData] = useState({});
  const [batchData, setBatchData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [rData, bData] = await Promise.allSettled([
          getReconciliation(),
          getBatchSummary(),
        ]);
        if (rData.status === 'fulfilled') setReconData(rData.value || {});
        if (bData.status === 'fulfilled') setBatchData(bData.value || {});
      } catch (error) {
        console.warn('Failed to load reconciliation:', error.message);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const reconKeys = Object.keys(reconData);
  const batchKeys = Object.keys(batchData);
  const hasData = reconKeys.length > 0 || batchKeys.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          Reconciliation
        </h2>
        <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
          VSS-900 settlement reconciliation &amp; EP-210 batch controls
        </p>
      </div>

      {loading ? (
        <div className="glass" style={{ borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
          <RefreshCw style={{ width: '1.5rem', height: '1.5rem', color: '#94a3b8', margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading reconciliation data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <StatCard icon={CheckCircle} label="VSS-900 Sections" value={formatNumber(reconKeys.length)} accent="green" />
            <StatCard icon={FileBarChart} label="Batch Reports" value={formatNumber(batchKeys.length)} accent="blue" />
            <StatCard icon={Layers} label="EP-210 Series" value={batchKeys.filter(k => k.startsWith('ep_210')).length.toString()} accent="purple" />
            <StatCard icon={AlertCircle} label="Data Status" value={hasData ? 'Available' : 'No Data'} accent={hasData ? 'green' : 'orange'} />
          </div>

          {/* VSS-900 Reconciliation Data */}
          {reconKeys.length > 0 ? (
            <div className="glass-strong" style={{ borderRadius: '1rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                  background: ACCENT.green.bg, border: `1.5px solid ${ACCENT.green.ring}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle style={{ width: '0.875rem', height: '0.875rem', color: ACCENT.green.fill }} />
                </div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  VSS-900 Reconciliation Data
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {reconKeys.map(key => (
                  <div key={key} className="glass-subtle" style={{ padding: '1rem', borderRadius: '0.75rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>{key}</p>
                    <pre style={{ fontSize: '0.6875rem', color: '#475569', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '12rem', margin: 0, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                      {JSON.stringify(reconData[key], null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass" style={{ borderRadius: '1rem', padding: '2rem', textAlign: 'center' }}>
              <AlertCircle style={{ width: '2rem', height: '2rem', color: '#d97706', margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 500 }}>
                No VSS-900 reconciliation data found in parsed reports.
              </p>
            </div>
          )}

          {/* Batch Summary (EP-210 series) */}
          {batchKeys.length > 0 && (
            <div className="glass-strong" style={{ borderRadius: '1rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                  background: ACCENT.blue.bg, border: `1.5px solid ${ACCENT.blue.ring}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileBarChart style={{ width: '0.875rem', height: '0.875rem', color: ACCENT.blue.fill }} />
                </div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Batch &amp; Control Reports (EP-210 Series)
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {batchKeys.map(key => {
                  const report = batchData[key];
                  const label = key.replace('ep_', 'EP-').toUpperCase();
                  return (
                    <div key={key} className="glass-subtle" style={{ padding: '1rem', borderRadius: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>{label}</p>
                        {report?.header && (
                          <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{report.header.report_id || ''}</span>
                        )}
                      </div>
                      {report?.summaries && Array.isArray(report.summaries) ? (
                        <div style={{ overflow: 'auto', maxHeight: '12rem' }}>
                          <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                            <tbody>
                              {report.summaries.slice(0, 10).map((s, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                  <td style={{ padding: '0.375rem 0.75rem 0.375rem 0', color: '#64748b' }}>{s.label || s.description || `Item ${i+1}`}</td>
                                  <td style={{ padding: '0.375rem 0', fontFamily: "'SF Mono', 'Fira Code', monospace", color: '#0f172a', fontWeight: 600 }}>{s.value || s.count || JSON.stringify(s)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <pre style={{ fontSize: '0.6875rem', color: '#475569', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '10rem', margin: 0, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                          {JSON.stringify(report, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="glass" style={{ borderRadius: '0.875rem', padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: ACCENT.green.text, marginBottom: '0.375rem' }}>EP-220 Collected Reconciliation</h4>
              <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                Compares collected financial totals against settled amounts for the processing date.
              </p>
            </div>
            <div className="glass" style={{ borderRadius: '0.875rem', padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: ACCENT.blue.text, marginBottom: '0.375rem' }}>VSS-900 Settlement Reconciliation</h4>
              <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                Provides reconciliation between VSS computed settlements and BASE II/SMS financial totals.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
