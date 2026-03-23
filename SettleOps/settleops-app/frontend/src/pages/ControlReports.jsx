import { useEffect, useState } from 'react';
import { getReportIndex } from '../utils/api';
import { FileBarChart, BarChart3, Eye, ListFilter, RefreshCw } from 'lucide-react';
import { formatNumber } from '../utils/format';

const ACCENT = {
  blue:   { bg: 'rgba(37,99,235,0.12)',  ring: 'rgba(37,99,235,0.22)',  text: '#1d4ed8', fill: '#2563eb' },
  green:  { bg: 'rgba(5,150,105,0.12)',   ring: 'rgba(5,150,105,0.22)',  text: '#047857', fill: '#059669' },
  purple: { bg: 'rgba(109,40,217,0.12)',  ring: 'rgba(109,40,217,0.22)', text: '#6d28d9', fill: '#7c3aed' },
};

export default function ControlReports() {
  const [reportIndex, setReportIndex] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      try {
        const data = await getReportIndex();
        const reports = data?.reports || [];
        if (Array.isArray(reports)) setReportIndex(reports);
      } catch (error) {
        console.warn('Failed to load report index:', error.message);
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  const reportTypes = [...new Set(reportIndex.map(r => r.report_number || r.report_id || 'UNKNOWN'))];
  const filteredReports = filterType
    ? reportIndex.filter(r => (r.report_number || r.report_id || '') === filterType)
    : reportIndex;

  const getTypeBadge = (type) => {
    const t = (type || '').toUpperCase();
    if (t.includes('705') || t.includes('SALE')) return { bg: 'rgba(37,99,235,0.10)', color: '#1d4ed8' };
    if (t.includes('707') || t.includes('CASH')) return { bg: 'rgba(5,150,105,0.10)', color: '#047857' };
    if (t.includes('727') || t.includes('REVERSAL')) return { bg: 'rgba(220,38,38,0.10)', color: '#b91c1c' };
    if (t.includes('746') || t.includes('747') || t.includes('VSS')) return { bg: 'rgba(109,40,217,0.10)', color: '#6d28d9' };
    if (t.includes('210') || t.includes('BATCH')) return { bg: 'rgba(234,88,12,0.10)', color: '#c2410c' };
    if (t.includes('756') || t.includes('RATE')) return { bg: 'rgba(217,119,6,0.10)', color: '#b45309' };
    if (t.includes('220') || t.includes('RECON')) return { bg: 'rgba(99,102,241,0.10)', color: '#4338ca' };
    return { bg: 'rgba(0,0,0,0.05)', color: '#475569' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Control Reports
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
            EP-999 report index &amp; batch control summaries
          </p>
        </div>
        {reportIndex.length > 0 && (
          <div className="glass-subtle" style={{
            padding: '0.375rem 0.875rem', borderRadius: '9999px',
            fontSize: '0.75rem', fontWeight: 600, color: '#475569',
          }}>
            {formatNumber(reportIndex.length)} reports indexed
          </div>
        )}
      </div>

      {loading ? (
        <div className="glass" style={{ borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
          <RefreshCw style={{ width: '1.5rem', height: '1.5rem', color: '#94a3b8', margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading report index...</p>
        </div>
      ) : reportIndex.length === 0 ? (
        <div className="glass" style={{ borderRadius: '1rem', padding: '2rem', textAlign: 'center' }}>
          <FileBarChart style={{ width: '2rem', height: '2rem', color: '#d97706', margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: 500 }}>No EP-999 report index data available.</p>
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="glass-strong" style={{ borderRadius: '0.875rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ListFilter style={{ width: '1rem', height: '1rem', color: '#94a3b8' }} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.7)',
                fontSize: '0.8125rem', color: '#0f172a', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">All Report Types ({reportIndex.length})</option>
              {reportTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Showing {filteredReports.length} of {reportIndex.length}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            {/* Report List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {filteredReports.map((report, idx) => {
                const reportId = report.report_number || report.report_id || `RPT-${idx}`;
                const name = report.title || report.report_name || reportId;
                const description = report.is_empty ? 'No data (NULL)' : '';
                const pageCount = report.pages || '';
                const badge = getTypeBadge(reportId);
                const isSelected = selectedReport?._idx === idx;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedReport({ ...report, _idx: idx })}
                    className={isSelected ? 'glass-strong' : 'glass'}
                    style={{
                      borderRadius: '0.75rem', padding: '0.875rem 1rem',
                      cursor: 'pointer', transition: 'all 0.2s',
                      border: isSelected ? '1.5px solid rgba(37,99,235,0.30)' : '1.5px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>{name}</span>
                          <span style={{
                            padding: '0.125rem 0.5rem', borderRadius: '9999px',
                            fontSize: '0.6875rem', fontWeight: 600,
                            background: badge.bg, color: badge.color,
                          }}>
                            {reportId}
                          </span>
                        </div>
                        {description && (
                          <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: '0.125rem 0' }}>{description}</p>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.6875rem', color: '#94a3b8' }}>
                          {pageCount && <span>Pages: {pageCount}</span>}
                          {report.sequence_number && <span>Seq: {report.sequence_number}</span>}
                        </div>
                      </div>
                      <Eye style={{ width: '0.875rem', height: '0.875rem', color: '#94a3b8', flexShrink: 0, marginTop: '0.125rem' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Report Details */}
            <div>
              {selectedReport ? (
                <div className="glass-strong" style={{ borderRadius: '1rem', padding: '1.25rem', position: 'sticky', top: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <BarChart3 style={{ width: '1rem', height: '1rem', color: ACCENT.blue.fill }} />
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Report Details</h4>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {Object.entries(selectedReport)
                      .filter(([k]) => !k.startsWith('_'))
                      .map(([key, val]) => (
                        <div key={key}>
                          <p style={{ fontSize: '0.625rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p style={{ fontSize: '0.8125rem', color: '#0f172a', fontFamily: "'SF Mono', 'Fira Code', monospace", wordBreak: 'break-all', margin: 0 }}>
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </p>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ) : (
                <div className="glass" style={{
                  borderRadius: '1rem', padding: '2rem', textAlign: 'center',
                  border: '2px dashed rgba(0,0,0,0.08)',
                }}>
                  <FileBarChart style={{ width: '2rem', height: '2rem', color: '#94a3b8', margin: '0 auto 0.75rem' }} />
                  <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#94a3b8' }}>Select a report to view details</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Report Categories Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <div className="glass" style={{ borderRadius: '0.875rem', padding: '1rem' }}>
          <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: ACCENT.blue.text, marginBottom: '0.375rem' }}>EP-999 Report Index</h4>
          <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
            Complete listing and routing of all reports in the Edit Package
          </p>
        </div>
        <div className="glass" style={{ borderRadius: '0.875rem', padding: '1rem' }}>
          <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: ACCENT.green.text, marginBottom: '0.375rem' }}>EP-210 Batch Summary</h4>
          <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
            Summary of batch/file/CPD/run processing totals
          </p>
        </div>
        <div className="glass" style={{ borderRadius: '0.875rem', padding: '1rem' }}>
          <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: ACCENT.purple.text, marginBottom: '0.375rem' }}>EP-220 Reconciliation</h4>
          <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
            Collected vs settled reconciliation details
          </p>
        </div>
      </div>
    </div>
  );
}
