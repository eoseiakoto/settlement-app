export function formatCurrency(value, currency = 'USD', locale = 'en-US') {
  if (value === null || value === undefined) return '-';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined) return '-';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function abbreviateNumber(value) {
  if (value === null || value === undefined) return '-';

  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  } else if (absValue >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(0);
}

export function formatDate(date, format = 'MMM DD, YYYY') {
  if (!date) return '-';

  const d = new Date(date);
  if (isNaN(d)) return '-';

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };

  if (format === 'short') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } else if (format === 'long') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } else if (format === 'datetime') {
    return d.toLocaleDateString('en-US', { ...options, hour: '2-digit', minute: '2-digit' });
  }

  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return '-';

  return (value).toFixed(decimals) + '%';
}

export function getCurrencySymbol(currency) {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    GHS: 'GHS',
    XOF: 'CFA',
  };
  return symbols[currency] || currency;
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
