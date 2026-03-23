import { useEffect, useState } from 'react';
import { getTransactions } from '../utils/api';
import { formatNumber } from '../utils/format';
import TransactionDrawer, { getTypeLabel } from '../components/TransactionDrawer';

const CURRENCY_MAP = { '936': 'GHS', '840': 'USD', '978': 'EUR', '826': 'GBP', '392': 'JPY', '971': 'AFN' };
function currLabel(code) { return CURRENCY_MAP[code] || code || '-'; }

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [rawTransactions, setRawTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const [filters, setFilters] = useState({
    type: '', currency: '', country: '', merchant: '', min_amount: '', max_amount: '',
  });

  const loadTransactions = async (page = 1) => {
    setLoading(true);
    setSelectedRow(null);
    try {
      const params = { page, per_page: 50 };
      if (filters.type) params.type = filters.type;
      if (filters.currency) params.currency = filters.currency;
      if (filters.country) params.country = filters.country;
      if (filters.merchant) params.merchant = filters.merchant;
      if (filters.min_amount) params.min_amount = filters.min_amount;
      if (filters.max_amount) params.max_amount = filters.max_amount;

      const data = await getTransactions(params);
      const raw = data.transactions || [];
      setRawTransactions(raw);
      setTransactions(raw.map((t, i) => ({
        _idx: i,
        date: t.purchase_date || '-',
        type: getTypeLabel(t.type),
        merchant: t.merchant_name || '-',
        city: t.merchant_city || '-',
        country: t.merchant_country || '-',
        amount: t.destination_amount_numeric || 0,
        currency: currLabel(t.destination_currency),
        authCode: t.auth_code || '-',
        mcc: t.merchant_category_code || '-',
        terminalId: t.terminal_id || '-',
      })));
      setPagination(data.pagination || { page: 1, per_page: 50, total: raw.length, pages: 1 });
    } catch (error) {
      console.warn('Failed to load transactions:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTransactions(1); }, []);

  const applyFilters = () => loadTransactions(1);
  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const handlePageChange = (newPage) => loadTransactions(newPage);
  const selectRow = (idx) => setSelectedRow(prev => prev === idx ? null : idx);
  const navigateDrawer = (dir) => {
    if (selectedRow === null) return;
    const next = selectedRow + dir;
    if (next >= 0 && next < rawTransactions.length) setSelectedRow(next);
  };

  const selectedRaw = selectedRow !== null ? rawTransactions[selectedRow] : null;
  const selectedDisplay = selectedRow !== null ? transactions[selectedRow] : null;

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl xl:text-2xl font-extrabold" style={{ color: '#0f172a' }}>Transactions</h2>
        <span className="text-xs font-semibold" style={{ color: '#6b7280' }}>
          {formatNumber(pagination.total)} total transactions
        </span>
      </div>

      {/* Filters */}
      <div className="glass-strong rounded-2xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Type</label>
            <select value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: 'rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.8)' }}>
              <option value="">All Types</option>
              <option value="sale">Sales</option>
              <option value="cash_disbursement">Cash</option>
              <option value="reversal">Reversals</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Currency</label>
            <select value={filters.currency} onChange={(e) => handleFilterChange('currency', e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: 'rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.8)' }}>
              <option value="">All</option>
              <option value="936">GHS</option>
              <option value="840">USD</option>
              <option value="978">EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Country</label>
            <select value={filters.country} onChange={(e) => handleFilterChange('country', e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: 'rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.8)' }}>
              <option value="">All</option>
              <option value="GH">Ghana</option>
              <option value="US">USA</option>
              <option value="IE">Ireland</option>
              <option value="JP">Japan</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Merchant</label>
            <input type="text" placeholder="Search..." value={filters.merchant}
              onChange={(e) => handleFilterChange('merchant', e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: 'rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.8)' }} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Min Amt</label>
            <input type="number" placeholder="0" value={filters.min_amount}
              onChange={(e) => handleFilterChange('min_amount', e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: 'rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.8)' }} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Max Amt</label>
            <input type="number" placeholder="∞" value={filters.max_amount}
              onChange={(e) => handleFilterChange('max_amount', e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: 'rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.8)' }} />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={applyFilters}
              className="flex-1 px-3 py-2 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: '#2563eb' }}>
              Apply
            </button>
            <button onClick={() => { setFilters({ type: '', currency: '', country: '', merchant: '', min_amount: '', max_amount: '' }); setTimeout(() => loadTransactions(1), 0); }}
              className="px-3 py-2 rounded-xl text-sm font-bold transition-colors"
              style={{ background: 'rgba(0,0,0,0.06)', color: '#374151' }}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-strong rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center" style={{ color: '#6b7280' }}>Loading transactions...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
                  {['Date', 'Type', 'Merchant', 'City', 'Country', 'Amount', 'Currency', 'Auth Code', 'MCC', 'Terminal'].map(h => (
                    <th key={h} className="py-3 px-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-sm" style={{ color: '#9ca3af' }}>No transactions found</td>
                  </tr>
                ) : transactions.map((txn) => {
                  const isSelected = selectedRow === txn._idx;
                  return (
                    <tr key={txn._idx}
                      onClick={() => selectRow(txn._idx)}
                      className="cursor-pointer transition-all"
                      style={{
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        background: isSelected ? 'rgba(37,99,235,0.06)' : 'transparent',
                        borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.015)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'rgba(37,99,235,0.06)' : 'transparent'; }}
                    >
                      <td className="py-3 px-3 text-xs font-medium" style={{ color: '#4b5563' }}>{txn.date}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold"
                          style={{
                            background: txn.type === 'SALE' ? 'rgba(37,99,235,0.12)' : txn.type === 'CASH' ? 'rgba(5,150,105,0.12)' : 'rgba(220,38,38,0.10)',
                            color: txn.type === 'SALE' ? '#1d4ed8' : txn.type === 'CASH' ? '#047857' : '#b91c1c',
                          }}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs font-semibold max-w-[180px] truncate" style={{ color: '#111827' }}>{txn.merchant}</td>
                      <td className="py-3 px-3 text-xs font-medium" style={{ color: '#6b7280' }}>{txn.city}</td>
                      <td className="py-3 px-3 text-xs font-medium" style={{ color: '#6b7280' }}>{txn.country}</td>
                      <td className="py-3 px-3 text-xs font-mono font-bold" style={{ color: txn.type === 'REVERSAL' ? '#dc2626' : '#111827' }}>
                        {formatNumber(txn.amount, 2)}
                      </td>
                      <td className="py-3 px-3 text-xs font-medium" style={{ color: '#6b7280' }}>{txn.currency}</td>
                      <td className="py-3 px-3 text-xs font-mono" style={{ color: '#6b7280' }}>{txn.authCode}</td>
                      <td className="py-3 px-3 text-xs font-mono" style={{ color: '#9ca3af' }}>{txn.mcc}</td>
                      <td className="py-3 px-3 text-xs font-mono" style={{ color: '#9ca3af' }}>{txn.terminalId}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium" style={{ color: '#6b7280' }}>
            Page {pagination.page} of {pagination.pages} ({formatNumber(pagination.total)} transactions)
          </p>
          <div className="flex gap-2">
            <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}
              className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
              style={{ background: 'rgba(0,0,0,0.05)', color: '#374151' }}>
              Previous
            </button>
            <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.pages}
              className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
              style={{ background: 'rgba(0,0,0,0.05)', color: '#374151' }}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedRaw && (
        <TransactionDrawer
          txn={selectedRaw}
          displayType={selectedDisplay?.type}
          onClose={() => setSelectedRow(null)}
          onPrev={() => navigateDrawer(-1)}
          onNext={() => navigateDrawer(1)}
          hasPrev={selectedRow > 0}
          hasNext={selectedRow < rawTransactions.length - 1}
        />
      )}
    </div>
  );
}
