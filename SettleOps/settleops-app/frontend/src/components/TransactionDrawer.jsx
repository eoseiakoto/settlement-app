import { useEffect, useState, useRef, useCallback } from 'react';
import { formatNumber } from '../utils/format';
import { X, CreditCard, MapPin, Terminal, Shield, ArrowLeftRight, Hash, FileText, ChevronLeft, ChevronRight, Copy, Check, ChevronDown } from 'lucide-react';

const CURRENCY_MAP = { '936': 'GHS', '840': 'USD', '978': 'EUR', '826': 'GBP', '392': 'JPY', '971': 'AFN' };

const POS_ENTRY = {
  '00': 'Unknown', '01': 'Manual', '02': 'Magnetic Stripe', '05': 'Chip (ICC)',
  '07': 'Contactless Chip', '09': 'E-Commerce', '10': 'Credential on File',
  '80': 'Fallback to Mag Stripe', '81': 'E-Commerce', '91': 'Contactless Magnetic',
};

const CARDHOLDER_ID = {
  '0': 'Unknown', '1': 'Signature', '2': 'PIN', '3': 'PIN + Signature',
  '4': 'No CVM Required', '5': 'Signature (Electronic)', '9': 'No Verification',
};

const MCC_MAP = {
  '5411': 'Grocery Stores', '5812': 'Restaurants', '5813': 'Bars/Drinking Places',
  '5814': 'Fast Food', '5912': 'Drug Stores/Pharmacies', '5999': 'Miscellaneous Retail',
  '6011': 'ATM/Cash Disbursement', '6012': 'Financial Institution',
  '7392': 'Consulting/Management', '4814': 'Telecom Services', '4816': 'Computer Network',
  '5310': 'Discount Stores', '5311': 'Department Stores', '5331': 'Variety Stores',
  '5541': 'Service Stations', '5542': 'Fuel Dispensers', '7011': 'Hotels/Lodging',
  '4511': 'Airlines', '7523': 'Parking Lots/Garages',
};

const TYPE_STYLES = {
  SALE:     { bg: 'rgba(37,99,235,0.10)', color: '#1d4ed8', dot: '#3b82f6' },
  CASH:     { bg: 'rgba(5,150,105,0.10)',  color: '#047857', dot: '#10b981' },
  REVERSAL: { bg: 'rgba(220,38,38,0.08)',  color: '#b91c1c', dot: '#ef4444' },
};

function currLabel(code) { return CURRENCY_MAP[code] || code || '-'; }
function maskPan(pan) {
  if (!pan || pan.length < 10) return pan || '-';
  return pan.substring(0, 6) + ' •••• ' + pan.substring(pan.length - 4);
}
function formatRawAmount(raw) {
  if (!raw) return '-';
  const n = parseInt(raw, 10);
  return isNaN(n) ? raw : (n / 100).toFixed(2);
}

export function getTypeLabel(type) {
  if (type === 'sale') return 'SALE';
  if (type === 'cash_disbursement') return 'CASH';
  if (type === 'reversal') return 'REVERSAL';
  return (type || '').toUpperCase();
}

/* ── Section inside drawer ── */
function DrawerSection({ icon: Icon, title, items, color = '#2563eb', defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const filtered = items.filter(i => {
    const v = i.value;
    return v && v !== '-' && !/^0+$/.test(String(v));
  });
  if (filtered.length === 0) return null;

  return (
    <div className="mx-4 mb-3">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2.5 py-2.5">
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: `${color}12` }}>
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] flex-1 text-left"
          style={{ color: '#94a3b8' }}>{title}</span>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform duration-200"
          style={{ color: '#cbd5e1', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>
      {open && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: 'rgba(248, 250, 252, 0.8)', border: '1px solid rgba(0,0,0,0.04)' }}>
          {filtered.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3.5 py-2.5"
              style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.035)' : 'none' }}>
              <span className="text-[11px]" style={{ color: '#94a3b8' }}>{item.label}</span>
              <span className={`text-[12px] font-medium text-right max-w-[55%] ${item.mono ? 'font-mono tracking-wide' : ''}`}
                style={{ color: '#1e293b', wordBreak: 'break-all' }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Drawer ── */
export default function TransactionDrawer({ txn, displayType, onClose, onPrev, onNext, hasPrev, hasNext }) {
  const drawerRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const handleEsc = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  useEffect(() => {
    if (drawerRef.current) drawerRef.current.scrollTop = 0;
  }, [txn]);

  const copyTxnId = () => {
    if (txn.transaction_id) {
      navigator.clipboard.writeText(txn.transaction_id).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  const typeLabel = displayType || getTypeLabel(txn.type);
  const badge = TYPE_STYLES[typeLabel] || TYPE_STYLES.SALE;
  const isCrossCurrency = txn.source_currency && txn.source_currency !== txn.destination_currency;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(15, 23, 42, 0.18)',
          backdropFilter: 'blur(3px)',
        }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: '440px', maxWidth: '92vw',
        background: '#ffffff',
        borderLeft: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '-12px 0 40px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column',
        animation: 'drawerSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Header */}
        <div style={{ flexShrink: 0 }}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
            <div className="flex items-center gap-1">
              {onPrev && (
                <button onClick={onPrev} disabled={!hasPrev}
                  className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-25 transition-colors hover:bg-gray-100"
                  style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                  <ChevronLeft className="w-3.5 h-3.5" style={{ color: '#475569' }} />
                </button>
              )}
              {onNext && (
                <button onClick={onNext} disabled={!hasNext}
                  className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-25 transition-colors hover:bg-gray-100"
                  style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                  <ChevronRight className="w-3.5 h-3.5" style={{ color: '#475569' }} />
                </button>
              )}
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:bg-gray-100"
              style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <X className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
            </button>
          </div>

          {/* Summary */}
          <div className="px-4 pt-2 pb-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold leading-snug truncate" style={{ color: '#0f172a' }}>
                  {txn.merchant_name || 'Unknown Merchant'}
                </h3>
                <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: '#94a3b8' }}>
                  {[txn.merchant_city, txn.merchant_country].filter(Boolean).join(', ')}
                  {txn.merchant_category_code ? ` · ${MCC_MAP[txn.merchant_category_code] || 'MCC ' + txn.merchant_category_code}` : ''}
                </p>
              </div>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex-shrink-0"
                style={{ background: badge.bg, color: badge.color }}>
                <span className="w-[5px] h-[5px] rounded-full" style={{ background: badge.dot }} />
                {typeLabel}
              </span>
            </div>

            <div className="mt-3 mb-3.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-bold tracking-tight leading-none"
                  style={{ color: typeLabel === 'REVERSAL' ? '#dc2626' : '#0f172a', fontFeatureSettings: '"tnum"' }}>
                  {txn.destination_amount_numeric ? formatNumber(txn.destination_amount_numeric, 2) : '0.00'}
                </span>
                <span className="text-[13px] font-semibold" style={{ color: '#94a3b8' }}>
                  {currLabel(txn.destination_currency)}
                </span>
              </div>
              {isCrossCurrency && (
                <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>
                  from {txn.source_amount_numeric ? formatNumber(txn.source_amount_numeric, 2) : '-'} {currLabel(txn.source_currency)}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {txn.purchase_date && (
                <span className="text-[10px] font-medium px-2 py-[3px] rounded-md"
                  style={{ background: '#f1f5f9', color: '#64748b' }}>
                  {txn.purchase_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
                </span>
              )}
              {txn.auth_code && (
                <span className="text-[10px] font-mono font-medium px-2 py-[3px] rounded-md"
                  style={{ background: '#f1f5f9', color: '#64748b' }}>
                  Auth {txn.auth_code}
                </span>
              )}
              {txn.pos_entry_mode && (
                <span className="text-[10px] font-medium px-2 py-[3px] rounded-md"
                  style={{ background: '#f1f5f9', color: '#64748b' }}>
                  {POS_ENTRY[txn.pos_entry_mode] || txn.pos_entry_mode}
                </span>
              )}
              {txn.transaction_id && (
                <button onClick={copyTxnId}
                  className="text-[10px] font-mono font-medium px-2 py-[3px] rounded-md flex items-center gap-1 transition-all"
                  style={{ background: copied ? '#ecfdf5' : '#f1f5f9', color: copied ? '#059669' : '#64748b' }}>
                  {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                  {txn.transaction_id.substring(0, 12)}…
                </button>
              )}
            </div>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.06) 10%, rgba(0,0,0,0.06) 90%, transparent)' }} />
        </div>

        {/* Scrollable sections */}
        <div ref={drawerRef} className="flex-1 overflow-y-auto pt-3 pb-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>

          <DrawerSection icon={CreditCard} title="Card & Account" color="#3b82f6" items={[
            { label: 'Card Number', value: maskPan(txn.account_number), mono: true },
            { label: 'Card Product', value: txn.product_id === 'F' ? 'Visa Classic' : txn.product_id === 'G' ? 'Visa Gold' : txn.product_id === 'I' ? 'Visa Infinite' : txn.product_id || null },
            { label: 'PAN Token', value: txn.pan_token && txn.pan_token !== '0000000000000000' ? txn.pan_token : null, mono: true },
            { label: 'Card Seq #', value: txn.card_sequence_number && txn.card_sequence_number !== '000' ? txn.card_sequence_number : null, mono: true },
            { label: 'Account Selection', value: txn.account_selection === '1' ? 'Checking' : txn.account_selection === '2' ? 'Savings' : txn.account_selection || null },
            { label: 'Usage Code', value: txn.usage_code, mono: true },
          ]} />

          <DrawerSection icon={MapPin} title="Merchant & Location" color="#10b981" items={[
            { label: 'Merchant Name', value: txn.merchant_name },
            { label: 'City', value: txn.merchant_city },
            { label: 'State', value: txn.merchant_state },
            { label: 'Country', value: txn.merchant_country },
            { label: 'ZIP', value: txn.merchant_zip && txn.merchant_zip !== '00000' ? txn.merchant_zip : null, mono: true },
            { label: 'MCC', value: txn.merchant_category_code ? `${txn.merchant_category_code} — ${MCC_MAP[txn.merchant_category_code] || 'Other'}` : null },
            { label: 'Acceptor ID', value: txn.card_acceptor_id, mono: true },
            { label: 'Acquirer BID', value: txn.acquirer_business_id && txn.acquirer_business_id !== '00000000' ? txn.acquirer_business_id : null, mono: true },
            { label: 'Acquirer Ref #', value: txn.acquirer_ref_number, mono: true },
          ]} />

          <DrawerSection icon={Terminal} title="Terminal & POS" color="#8b5cf6" items={[
            { label: 'Terminal ID', value: txn.terminal_id, mono: true },
            { label: 'POS Entry', value: txn.pos_entry_mode ? `${txn.pos_entry_mode} — ${POS_ENTRY[txn.pos_entry_mode] || 'Other'}` : null },
            { label: 'Terminal Cap.', value: txn.pos_terminal_capability, mono: true },
            { label: 'CVM', value: txn.cardholder_id_method ? `${txn.cardholder_id_method} — ${CARDHOLDER_ID[txn.cardholder_id_method] || 'Other'}` : null },
            { label: 'POS Environment', value: txn.pos_environment === 'R' ? 'Attended' : txn.pos_environment === 'U' ? 'Unattended' : txn.pos_environment || null },
            { label: 'Channel', value: txn['mail_phn_ecomm_&_pymt_ind'] === '2' ? 'E-Commerce' : txn['mail_phn_ecomm_&_pymt_ind'] === '1' ? 'Mail/Phone' : txn['mail_phn_ecomm_&_pymt_ind'] || null },
            { label: 'Floor Limit', value: txn.floor_limit_indicator, mono: true },
          ]} />

          <DrawerSection icon={ArrowLeftRight} title="Amounts & Currency" color="#f59e0b" items={[
            { label: 'Dest. Amount', value: txn.destination_amount_numeric ? `${currLabel(txn.destination_currency)} ${formatNumber(txn.destination_amount_numeric, 2)}` : null },
            { label: 'Source Amount', value: txn.source_amount_numeric ? `${currLabel(txn.source_currency)} ${formatNumber(txn.source_amount_numeric, 2)}` : null },
            { label: 'Authorized', value: txn.authorized_amount && txn.authorized_amount !== '000000000000' ? formatRawAmount(txn.authorized_amount) : null, mono: true },
            { label: 'Total Authorized', value: txn.total_authorized_amount && txn.total_authorized_amount !== '000000000000' ? formatRawAmount(txn.total_authorized_amount) : null, mono: true },
            { label: 'Cashback', value: txn.cashback && txn.cashback !== '000000000' ? formatRawAmount(txn.cashback) : null, mono: true },
            { label: 'Src → Base FX', value: txn.src_to_base_curr_ex_rate && txn.src_to_base_curr_ex_rate !== '00000000' ? txn.src_to_base_curr_ex_rate : null, mono: true },
            { label: 'Base → Dest FX', value: txn.base_to_dest_curr_ex_rate && txn.base_to_dest_curr_ex_rate !== '00000000' ? txn.base_to_dest_curr_ex_rate : null, mono: true },
            { label: 'Rate Table', value: txn.rate_table_id, mono: true },
            { label: 'Conv. Date', value: txn.conversion_date, mono: true },
          ]} />

          <DrawerSection icon={Hash} title="Settlement & Fees" color="#ef4444" defaultOpen={false} items={[
            { label: 'Settlement Flag', value: txn.settlement_flag, mono: true },
            { label: 'Fee Program', value: txn.fee_program_indicator, mono: true },
            { label: 'Interchange Fee', value: txn.interchange_fee_amount && txn.interchange_fee_amount !== '000000000000000' ? txn.interchange_fee_amount : null, mono: true },
            { label: 'Nat. Reimb Fee', value: txn.national_reimb_fee && txn.national_reimb_fee !== '000000000000' ? txn.national_reimb_fee : null, mono: true },
            { label: 'Reimb Attr', value: txn.reimbursement_attr, mono: true },
            { label: 'Issuer Charge', value: txn.issuer_charge, mono: true },
            { label: 'ISA Amount', value: txn.optional_issuer_isa_amt && txn.optional_issuer_isa_amt !== '000000000000' ? txn.optional_issuer_isa_amt : null, mono: true },
            { label: 'Chargeback Code', value: txn.chargeback_reason_code && txn.chargeback_reason_code !== '00' ? txn.chargeback_reason_code : null, mono: true },
            { label: 'Clearing Seq', value: txn.multiple_clearing_seq_nbr && txn.multiple_clearing_seq_nbr !== '00' ? `${txn.multiple_clearing_seq_nbr} of ${txn.multiple_clearing_seq_cnt}` : null },
          ]} />

          <DrawerSection icon={Shield} title="EMV / Chip Data" color="#6366f1" defaultOpen={false} items={[
            { label: 'Cryptogram', value: txn.cryptogram, mono: true },
            { label: 'Crypto Amount', value: txn.cryptogram_amount && txn.cryptogram_amount !== '000000000000' ? formatRawAmount(txn.cryptogram_amount) : null, mono: true },
            { label: 'ATC', value: txn.appl_transaction_counter, mono: true },
            { label: 'AIP', value: txn.appl_interchange_profile, mono: true },
            { label: 'TVR', value: txn.term_verification_results, mono: true },
            { label: 'Terminal Cap. Profile', value: txn['terminal_capability_prof.'], mono: true },
            { label: 'Terminal Txn Date', value: txn.terminal_transaction_date, mono: true },
            { label: 'Terminal Country', value: txn.terminal_country_code, mono: true },
            { label: 'Unpredictable #', value: txn.unpredictable_number, mono: true },
            { label: 'Chip Condition', value: txn.chip_condition_code, mono: true },
          ]} />

          <DrawerSection icon={FileText} title="References & IDs" color="#64748b" defaultOpen={false} items={[
            { label: 'Transaction ID', value: txn.transaction_id, mono: true },
            { label: 'Auth Code', value: txn.auth_code, mono: true },
            { label: 'Auth Source', value: txn.authorization_source_code, mono: true },
            { label: 'Auth Chars', value: txn.auth_characteristics, mono: true },
            { label: 'Purchase Date', value: txn.purchase_date, mono: true },
            { label: 'CPD', value: txn.cpd, mono: true },
            { label: 'Txn Type', value: txn.transaction_type, mono: true },
            { label: 'Merchant Verif.', value: txn.merchant_verification_val, mono: true },
            { label: 'Service Dev', value: txn.service_development_field && txn.service_development_field !== '0' ? txn.service_development_field : null, mono: true },
          ]} />
        </div>
      </div>

      <style>{`
        @keyframes drawerSlide {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
