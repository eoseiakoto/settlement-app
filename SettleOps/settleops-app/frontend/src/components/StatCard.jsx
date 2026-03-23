import { TrendingUp, TrendingDown } from 'lucide-react';

const ACCENT = {
  blue:   { bg: 'rgba(37,99,235,0.12)',  ring: 'rgba(37,99,235,0.22)',  text: '#1d4ed8', fill: '#2563eb' },
  green:  { bg: 'rgba(5,150,105,0.12)',   ring: 'rgba(5,150,105,0.22)',  text: '#047857', fill: '#059669' },
  red:    { bg: 'rgba(220,38,38,0.10)',   ring: 'rgba(220,38,38,0.18)',  text: '#b91c1c', fill: '#dc2626' },
  purple: { bg: 'rgba(109,40,217,0.12)',  ring: 'rgba(109,40,217,0.22)', text: '#6d28d9', fill: '#7c3aed' },
  orange: { bg: 'rgba(234,88,12,0.12)',   ring: 'rgba(234,88,12,0.22)',  text: '#c2410c', fill: '#ea580c' },
  amber:  { bg: 'rgba(217,119,6,0.12)',   ring: 'rgba(217,119,6,0.22)',  text: '#b45309', fill: '#d97706' },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  change,
  changeType,
  accent,
  color,
}) {
  const accentKey = accent || color || 'blue';
  const a = ACCENT[accentKey] || ACCENT.blue;

  const isPositive = changeType === 'positive';

  return (
    <div className="glass rounded-2xl" style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </p>
          <p style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a', marginTop: '0.375rem' }}>
            {value}
          </p>
          {subtext && (
            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.25rem' }}>{subtext}</p>
          )}
          {change && (
            <p style={{
              fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.375rem',
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              color: isPositive ? '#059669' : '#dc2626',
            }}>
              {isPositive ? <TrendingUp style={{ width: '0.875rem', height: '0.875rem' }} /> : <TrendingDown style={{ width: '0.875rem', height: '0.875rem' }} />}
              {change}
            </p>
          )}
        </div>
        {Icon && (
          <div style={{
            padding: '0.625rem', borderRadius: '0.75rem',
            background: a.bg, border: `1.5px solid ${a.ring}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon style={{ width: '1.25rem', height: '1.25rem', color: a.fill }} />
          </div>
        )}
      </div>
    </div>
  );
}
