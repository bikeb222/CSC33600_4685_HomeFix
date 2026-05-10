const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'homefix_token';

function url(path) {
  return `${API_BASE_URL}${path}`;
}

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(url(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload.message;
    throw new Error(message || 'Request failed');
  }

  return payload;
}

function withParams(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

async function download(path, filename) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(url(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    throw new Error('Export failed');
  }
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export const api = {
  auth: {
    tokenKey: TOKEN_KEY,
    login: (body) => request('/auth/login', { method: 'POST', body }),
    register: (body) => request('/auth/register', { method: 'POST', body }),
    me: () => request('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' })
  },
  users: {
    list: (params = {}) => request(withParams('/users', params)),
    create: (body) => request('/users', { method: 'POST', body }),
    update: (id, body) => request(`/users/${id}`, { method: 'PUT', body })
  },
  dashboard: {
    stats: () => request('/dashboard/stats')
  },
  receivers: {
    list: (search = '') => request(withParams('/receivers', { search })),
    get: (id) => request(`/receivers/${id}`),
    create: (body) => request('/receivers/register', { method: 'POST', body }),
    update: (id, body) => request(`/receivers/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/receivers/${id}`, { method: 'DELETE' }),
    addresses: (id) => request(`/receivers/${id}/addresses`),
    addAddress: (id, body) => request(`/receivers/${id}/addresses`, { method: 'POST', body }),
    setDefaultAddress: (receiverId, addressId) => request(`/receivers/${receiverId}/addresses/${addressId}/default`, { method: 'PUT', body: {} }),
    appointments: (id) => request(`/receivers/${id}/appointments`)
  },
  providers: {
    list: (params = {}) => request(withParams('/providers', params)),
    create: (body) => request('/providers/register', { method: 'POST', body }),
    update: (id, body) => request(`/providers/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/providers/${id}`, { method: 'DELETE' }),
    services: (id) => request(`/providers/${id}/services`),
    unavailableTimes: (id) => request(`/providers/${id}/unavailable-times`),
    unavailableBlocks: (id) => request(`/providers/${id}/unavailable-blocks`),
    addUnavailableBlock: (id, body) => request(`/providers/${id}/unavailable-blocks`, { method: 'POST', body }),
    removeUnavailableBlock: (providerId, blockId) => request(`/providers/${providerId}/unavailable-blocks/${blockId}`, { method: 'DELETE' }),
    addService: (id, body) => request(`/providers/${id}/services`, { method: 'POST', body }),
    serviceApprovals: (params = {}) => request(withParams('/providers/service-approvals', params)),
    reviewService: (providerId, serviceId, approval_status) => request(`/providers/${providerId}/services/${serviceId}/review`, { method: 'PUT', body: { approval_status } }),
    removeService: (providerId, serviceId) => request(`/providers/${providerId}/services/${serviceId}`, { method: 'DELETE' }),
    appointments: (id) => request(`/providers/${id}/appointments`),
    reviews: (id) => request(`/providers/${id}/reviews`)
  },
  services: {
    list: (search = '') => request(withParams('/services', { search })),
    create: (body) => request('/services', { method: 'POST', body }),
    update: (id, body) => request(`/services/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/services/${id}`, { method: 'DELETE' })
  },
  addresses: {
    update: (id, body) => request(`/addresses/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/addresses/${id}`, { method: 'DELETE' })
  },
  appointments: {
    list: () => request('/appointments'),
    create: (body) => request('/appointments', { method: 'POST', body }),
    updateStatus: (id, appointment_status) => request(`/appointments/${id}/status`, { method: 'PUT', body: { appointment_status } }),
    updateActualHours: (id, actual_hours) => request(`/appointments/${id}/actual-hours`, { method: 'PUT', body: { actual_hours } }),
    updateRequest: (id, body) => request(`/appointments/${id}/request`, { method: 'PUT', body }),
    remove: (id) => request(`/appointments/${id}`, { method: 'DELETE' })
  },
  payments: {
    list: () => request('/payments'),
    create: (body) => request('/payments', { method: 'POST', body }),
    updateStatus: (id, payment_status) => request(`/payments/${id}/status`, { method: 'PUT', body: { payment_status } }),
    recharge: (receiverId, amount) => request(`/receivers/${receiverId}/recharge`, { method: 'POST', body: { amount } }),
    rechargeSelf: (amount) => request('/wallet/recharge', { method: 'POST', body: { amount } })
  },
  reviews: {
    list: () => request('/reviews'),
    create: (body) => request('/reviews', { method: 'POST', body }),
    remove: (id) => request(`/reviews/${id}`, { method: 'DELETE' })
  },
  reports: {
    download,
    appointments: () => request('/reports/appointments'),
    payments: () => request('/reports/payments'),
    providerPerformance: () => request('/reports/provider-performance'),
    jsonUrls: [
      '/api/reports/appointments',
      '/api/reports/payments',
      '/api/reports/provider-performance'
    ]
  }
};
