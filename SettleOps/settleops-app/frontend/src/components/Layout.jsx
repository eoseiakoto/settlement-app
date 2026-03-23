import { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Building2, Receipt,
  Scale, FileBarChart, DollarSign, ChevronLeft, Menu, Upload,
  X, CheckCircle, AlertCircle, Loader2, FolderOpen,
} from 'lucide-react';
import { uploadPackage } from '../utils/api';

export default function Layout({ children, currentPackageDate, onUploadComplete }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { path: '/settlement', icon: Building2, label: 'Settlement' },
    { path: '/fees', icon: Receipt, label: 'Fees & Charges' },
    { path: '/reconciliation', icon: Scale, label: 'Reconciliation' },
    { path: '/control-reports', icon: FileBarChart, label: 'Control Reports' },
    { path: '/currency-rates', icon: DollarSign, label: 'Currency Rates' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('files', f));
      const result = await uploadPackage(formData);
      setUploadResult(result);
      // Trigger a page reload after successful upload so data refreshes
      if (onUploadComplete) onUploadComplete(result);
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUploadFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const closeModal = () => {
    setShowUploadModal(false);
    setUploadResult(null);
    setUploadError(null);
    if (uploadResult) window.location.reload();
  };

  return (
    <div className="flex h-screen mesh-bg">

      {/* ── Sidebar ── */}
      <div
        className={`text-white transition-all duration-300 flex flex-col relative z-20 ${
          sidebarOpen ? 'w-60' : 'w-[72px]'
        }`}
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #131c33 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-extrabold tracking-wider"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff' }}>
                SO
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>ADB</p>
                <p className="text-sm font-bold text-white leading-tight">SettleOps</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 group"
                title={item.label}
                style={{
                  background: active ? 'rgba(37,99,235,0.20)' : 'transparent',
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.45)',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                  }
                }}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {sidebarOpen && (
                  <span className={`text-[13px] truncate ${active ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                )}
                {active && sidebarOpen && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#60a5fa' }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Upload Button */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setShowUploadModal(true)}
            className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold ${
              !sidebarOpen ? 'justify-center' : ''
            }`}
            style={{
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 2px 12px rgba(37,99,235,0.30)',
            }}
          >
            <Upload className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span className="text-[13px]">Upload Package</span>}
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <div className="h-14 glass-strong flex items-center justify-between px-6 relative z-10"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#6b7280' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-[15px] font-bold" style={{ color: '#0f172a' }}>SettleOps</h1>
              <p className="text-[11px] font-medium" style={{ color: '#94a3b8' }}>ADB Visa VSS Settlement Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentPackageDate && (
              <span className="text-xs font-medium" style={{ color: '#64748b' }}>Package: {currentPackageDate}</span>
            )}
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white' }}>
              EO
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-5 lg:p-8 w-full">
            {children}
          </div>
        </div>
      </div>

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="glass-strong" style={{
            width: '100%', maxWidth: '32rem', borderRadius: '1.25rem',
            padding: '2rem', position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            {/* Close button */}
            <button
              onClick={closeModal}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                width: '2rem', height: '2rem', borderRadius: '0.5rem',
                border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
            </button>

            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>
              Upload VSS Edit Package
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Select EP report files (EP705, EP707, EP727, EP746, EP747, EP756, EP999, etc.)
            </p>

            {/* Drop Zone & Upload Options */}
            {!uploadResult && !uploadError && (
              <>
                {uploading ? (
                  <div style={{
                    border: '2px dashed rgba(37,99,235,0.25)',
                    borderRadius: '0.875rem', padding: '2.5rem 1.5rem',
                    textAlign: 'center', background: 'rgba(37,99,235,0.02)',
                  }}>
                    <Loader2 style={{ width: '2rem', height: '2rem', color: '#2563eb', margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Processing package...</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Parsing EP reports and ingesting data</p>
                  </div>
                ) : (
                  <>
                    {/* Drag & Drop Zone */}
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      style={{
                        border: `2px dashed ${dragOver ? '#2563eb' : 'rgba(0,0,0,0.12)'}`,
                        borderRadius: '0.875rem', padding: '2rem 1.5rem',
                        textAlign: 'center',
                        background: dragOver ? 'rgba(37,99,235,0.04)' : 'rgba(0,0,0,0.01)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Upload style={{ width: '1.75rem', height: '1.75rem', color: '#94a3b8', margin: '0 auto 0.5rem' }} />
                      <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                        Drag &amp; drop files here
                      </p>
                      <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        Supports .TXT EP report files (EP705, EP707, EP727, EP746, EP747, EP756, EP999)
                      </p>
                    </div>

                    {/* Upload Buttons: Files or Folder */}
                    <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.875rem' }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          flex: 1, padding: '0.75rem', borderRadius: '0.75rem',
                          border: '1px solid rgba(37,99,235,0.20)', background: 'rgba(37,99,235,0.04)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: '0.5rem', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,99,235,0.04)'}
                      >
                        <Upload style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1d4ed8' }}>Select Files</span>
                      </button>
                      <button
                        onClick={() => folderInputRef.current?.click()}
                        style={{
                          flex: 1, padding: '0.75rem', borderRadius: '0.75rem',
                          border: '1px solid rgba(5,150,105,0.20)', background: 'rgba(5,150,105,0.04)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: '0.5rem', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(5,150,105,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(5,150,105,0.04)'}
                      >
                        <FolderOpen style={{ width: '1rem', height: '1rem', color: '#059669' }} />
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#047857' }}>Select Folder</span>
                      </button>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.TXT,.dat,.DAT"
                  style={{ display: 'none' }}
                  onChange={(e) => handleUploadFiles(e.target.files)}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleUploadFiles(e.target.files)}
                />
              </>
            )}

            {/* Success */}
            {uploadResult && (
              <div style={{
                padding: '1.5rem', borderRadius: '0.875rem',
                background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: '#059669' }} />
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#047857', margin: 0 }}>
                    Package Uploaded Successfully
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {[
                    ['Files Uploaded', uploadResult.files_uploaded],
                    ['Files Parsed', uploadResult.files_parsed],
                    ['New Transactions', uploadResult.new_transactions],
                    ['Duplicates Skipped', uploadResult.duplicate_transactions],
                    ['Total Transactions', uploadResult.total_transactions],
                    ['Currency Rates', uploadResult.currency_rates],
                  ].map(([label, val]) => (
                    <div key={label} style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.6)', borderRadius: '0.5rem' }}>
                      <p style={{ fontSize: '0.625rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                      <p style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{val ?? '—'}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={closeModal}
                  style={{
                    marginTop: '1rem', width: '100%', padding: '0.625rem',
                    borderRadius: '0.625rem', border: 'none',
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    color: 'white', fontSize: '0.8125rem', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Done — Refresh Data
                </button>
              </div>
            )}

            {/* Error */}
            {uploadError && (
              <div style={{
                padding: '1.5rem', borderRadius: '0.875rem',
                background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#b91c1c', margin: 0 }}>Upload Failed</p>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#7f1d1d', marginBottom: '0.75rem' }}>{uploadError}</p>
                <button
                  onClick={() => { setUploadError(null); }}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '0.5rem',
                    border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)',
                    color: '#b91c1c', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
