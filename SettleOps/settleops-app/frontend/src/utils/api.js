const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = new Error(`API error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

export function getDashboard() {
  return apiCall('/dashboard');
}

export function getTransactions(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return apiCall(`/transactions${queryString ? '?' + queryString : ''}`);
}

export function getTransactionsSummary() {
  return apiCall('/transactions/summary');
}

export function getSettlement() {
  return apiCall('/settlement');
}

export function getSettlementHierarchy() {
  return apiCall('/settlement/hierarchy');
}

export function getSettlementFees() {
  return apiCall('/settlement/fees');
}

export function getReconciliation() {
  return apiCall('/settlement/reconciliation');
}

export function getBatchSummary() {
  return apiCall('/control/batch-summary');
}

export function getCurrencyRates() {
  return apiCall('/control/currency-rates');
}

export function getMarketRates(base = 'USD', symbols = '') {
  const params = new URLSearchParams({ base });
  if (symbols) params.set('symbols', symbols);
  return apiCall(`/control/market-rates?${params.toString()}`);
}

export function getReportIndex() {
  return apiCall('/control/index');
}

export function getPackages() {
  return apiCall('/packages');
}

export function uploadPackage(formData) {
  return fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  }).then(res => {
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  });
}
