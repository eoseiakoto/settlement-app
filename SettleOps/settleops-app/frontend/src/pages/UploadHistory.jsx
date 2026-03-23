import { useEffect, useState, useCallback } from 'react';
import { getPackagesHistory, deletePackage, cleanupDuplicates } from '../utils/api';
import DataTable from '../components/DataTable';
import { History, Calendar, Trash2, Package, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { formatNumber } from '../utils/format';

const ACCENT = {
  blue:   { bg: 'rgba(37,99,235,0.12)',  ring: 'rgba(37,99,235,0.22)',  text: '#1d4ed8', fill: '#2563eb' },
  green:  { bg: 'rgba(5,150,105,0.12)',   ring: 'rgba(5,150,105,0.22)',  text: '#047857', fill: '#059669' },
  purple: { bg: 'rgba(109,40,217,0.12)',  ring: 'rgba(109,40,217,0.22)', text: '#6d28d9', fill: '#7c3aed' },
  amber:  { bg: 'rgba(217,119,6,0.12)',   ring: 'rgba(217,119,6,0.22)',  text: '#b45309', fill: '#d97706' },
  red:    { bg: 'rgba(220,38,38,0.10)',   ring: 'rgba(220,38,38,0.18)',  text: '#b91c1c', fill: '#dc2626' },
};

export default function UploadHistory() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState(null);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPackagesHistory(fromDate || undefined, toDate || undefined);
      setPackages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('Failed to load packages:', error.message);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { loadPackages(); }, [loadPackages]);

  const handleDelete = async (pkgId, folderName) => {
    if (!window.confirm(`Delete package "${folderName}" (ID ${pkgId}) and all its data? This cannot be undone.`)) return;
    try {
      await deletePackage(pkgId);
      setMessage({ type: 'success', text: `Package ${pkgId} deleted.` });
      loadPackages();
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to delete package: ${error.message}` });
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('Remove all duplicate packages? This keeps the earliest upload per unique package and removes duplicates with 0 transactions.')) return;
    setCleaning(true);
    setMessage(null);
    try {
      const result = await cleanupDuplicates();
      setMessage({
        type: 'success',
        text: `Cleanup complete: ${result.deleted_packages} duplicates removed, ${result.remaining_packages} packages remaining.`,
      });
      loadPackages();
    } catch (error) {
      setMessage({ type: 'error', text: `Cleanup failed: ${error.message}` });
    } finally {
      setCleaning(false);
    }
  };

  const clearDates = () => { setFromDate(''); setToDate(''); };

  // Stats
  const totalPackages = packages.length;
  const totalTransactions = packages.reduce((sum, p) => sum + (p.transaction_count || 0), 0);
  const totalRates = packages.reduce((sum, p) => sum + (p.rate_count || 0), 0);
  const totalFiles = packages.reduce((sum, p) => sum + (p.file_count || 0), 0);

  // Table columns
  const columns = [
    {
      key: 'id',
      label: 'ID',
      width: '60px',
      render: (val) => (
        <span style={{ fontFamily: "'SF Mono', monospace", fontSize: '0.75rem', color: '#64748b' }}>#{val}</span>
      ),
    },
    {
      key: 'folder_name',
      label: 'Package',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem' }}>{val || '—'}</span>
      ),
    },
    {
      key: 'upload_date',
      label: 'Upload Date',
      render: (val) => {
        if (!val) return '—';
        const d = new Date(val);
        return (
          <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
            {d.toLocaleDateString()} <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{d.toLocaleTimeString()}</span>
          </span>
        );
      },
    },
    {
      key: 'file_count',
      label: 'Files',
      width: '70px',
      render: (val) => (
        <span style={{ fontFamily: "'SF Mono', monospace", fontWeight: 600, color: '#475569' }}>{val || 0}</span>
      ),
    },
    {
      key: 'transaction_count',
      label: 'Transactions',
      width: '100px',
      render: (val) => (
        <span style={{
          fontFamily: "'SF Mono', monospace", fontWeight: 600,
          color: val > 0 ? '#047857' : '#94a3b8',
        }}>
          {formatNumber(val || 0)}
        </span>
      ),
    },
    {
      key: 'rate_count',
      label: 'Rates',
      width: '70px',
      render: (val) => (
        <span style={{
          fontFamily: "'SF Mono', monospace", fontWeight: 600,
          color: val > 0 ? '#1d4ed8' : '#94a3b8',
        }}>
          {val || 0}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '50px',
      sortable: false,
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(row.id, row.folder_name); }}
          style={{
            padding: '0.375rem', borderRadius: '0.5rem',
            border: '1px solid rgba(220,38,38,0.15)', background: 'rgba(220,38,38,0.04)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.10)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.04)'}
          title="Delete package"
        >
          <Trash2 style={{ width: '0.875rem', height: '0.875rem', color: '#dc2626' }} />
        </button>
      ),
    },
  ];

  // Add actions field to data for the table
  const tableData = packages.map(p => ({ ...p, actions: null }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ══════════════ PAGE HEADER ══════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Upload History
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>
            View and manage uploaded VSS Edit Packages
          </p>
        </div>
        <button
          onClick={handleCleanup}
          disabled={cleaning}
          style={{
            padding: '0.5rem 1rem', borderRadius: '0.75rem',
            border: '1.5px solid rgba(217,119,6,0.25)', background: 'rgba(217,119,6,0.06)',
            cursor: cleaning ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            transition: 'all 0.2s', opacity: cleaning ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!cleaning) e.currentTarget.style.background = 'rgba(217,119,6,0.12)'; }}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(217,119,6,0.06)'}
        >
          {cleaning ? (
            <RefreshCw style={{ width: '0.875rem', height: '0.875rem', color: '#b45309', animation: 'spin 1s linear infinite' }} />
          ) : (
            <Shield style={{ width: '0.875rem', height: '0.875rem', color: '#b45309' }} />
          )}
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#b45309' }}>
            Clean Up Duplicates
          </span>
        </button>
      </div>

      {/* ══════════════ MESSAGE ══════════════ */}
      {message && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '0.75rem',
          background: message.type === 'success' ? 'rgba(5,150,105,0.06)' : 'rgba(220,38,38,0.06)',
          border: `1px solid ${message.type === 'success' ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)'}`,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          {message.type === 'success' ? (
            <Shield style={{ width: '1rem', height: '1rem', color: '#059669', flexShrink: 0 }} />
          ) : (
            <AlertTriangle style={{ width: '1rem', height: '1rem', color: '#dc2626', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.8125rem', color: message.type === 'success' ? '#047857' : '#b91c1c', fontWeight: 500 }}>
            {message.text}
          </span>
          <button
            onClick={() => setMessage(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem' }}
          >
            ×
          </button>
        </div>
      )}

      {/* ══════════════ STAT CARDS ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'Total Packages', value: totalPackages, accent: 'blue', icon: Package },
          { label: 'Files Processed', value: totalFiles, accent: 'purple', icon: History },
          { label: 'Transactions', value: totalTransactions, accent: 'green', icon: Shield },
          { label: 'FX Rates', value: totalRates, accent: 'amber', icon: Calendar },
        ].map(({ label, value, accent, icon: Icon }) => (
          <div key={label} className="glass" style={{ borderRadius: '0.875rem', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </span>
              <div style={{
                width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                background: ACCENT[accent].bg, border: `1.5px solid ${ACCENT[accent].ring}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon style={{ width: '0.875rem', height: '0.875rem', color: ACCENT[accent].fill }} />
              </div>
            </div>
            <p style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {formatNumber(value)}
            </p>
          </div>
        ))}
      </div>

      {/* ══════════════ DATE FILTER ══════════════ */}
      <div className="glass" style={{ borderRadius: '0.875rem', padding: '1rem', display: 'flex', alignItems: 'end', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar style={{ width: '1rem', height: '1rem', color: ACCENT.blue.fill }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>Filter by Date</span>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            From
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '0.625rem',
              border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.7)',
              fontSize: '0.8125rem', fontWeight: 500, color: '#0f172a', outline: 'none',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            To
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '0.625rem',
              border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.7)',
              fontSize: '0.8125rem', fontWeight: 500, color: '#0f172a', outline: 'none',
            }}
          />
        </div>
        {(fromDate || toDate) && (
          <button
            onClick={clearDates}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '0.625rem',
              border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)',
              cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500, color: '#64748b',
              transition: 'all 0.2s',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ══════════════ PACKAGES TABLE ══════════════ */}
      <div className="glass-strong" style={{ borderRadius: '1rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{
            width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
            background: ACCENT.blue.bg, border: `1.5px solid ${ACCENT.blue.ring}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Package style={{ width: '0.875rem', height: '0.875rem', color: ACCENT.blue.fill }} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Uploaded Packages
            </h3>
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: 0 }}>
              {formatNumber(totalPackages)} packages
              {fromDate || toDate ? ' (filtered)' : ''}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <RefreshCw style={{ width: '1.5rem', height: '1.5rem', color: '#94a3b8', margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading packages...</p>
          </div>
        ) : packages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Package style={{ width: '2rem', height: '2rem', color: '#94a3b8', margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
              {fromDate || toDate ? 'No packages found in the selected date range.' : 'No packages uploaded yet.'}
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={tableData}
            paginated={true}
            pageSize={15}
            searchable={true}
            searchFields={['folder_name', 'upload_date']}
            loading={false}
          />
        )}
      </div>
    </div>
  );
}
