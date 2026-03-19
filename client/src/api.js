const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('sf_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Anfrage fehlgeschlagen.');
  }
  return data;
}

export const api = {
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  staff: () => request('/staff'),
  createStaff: (payload) => request('/staff', { method: 'POST', body: JSON.stringify(payload) }),
  updateStaff: (id, payload) => request(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteStaff: (id) => request(`/staff/${id}`, { method: 'DELETE' }),
  groups: () => request('/groups'),
  createGroup: (payload) => request('/groups', { method: 'POST', body: JSON.stringify(payload) }),
  updateGroup: (id, payload) => request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteGroup: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  units: () => request('/units'),
  createUnit: (payload) => request('/units', { method: 'POST', body: JSON.stringify(payload) }),
  updateUnit: (id, payload) => request(`/units/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteUnit: (id) => request(`/units/${id}`, { method: 'DELETE' }),
  authLevels: () => request('/auth-levels'),
  createAuthLevel: (payload) => request('/auth-levels', { method: 'POST', body: JSON.stringify(payload) }),
  updateAuthLevel: (id, payload) => request(`/auth-levels/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAuthLevel: (id) => request(`/auth-levels/${id}`, { method: 'DELETE' }),
  strafakten: (query = '') => request(`/strafakten${query}`),
  createStrafakte: (payload) => request('/strafakten', { method: 'POST', body: JSON.stringify(payload) }),
  updateStrafakte: (id, payload) => request(`/strafakten/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteStrafakte: (id) => request(`/strafakten/${id}`, { method: 'DELETE' }),
  strafaktenLogs: () => request('/strafakten/logs'),
  strafaktenStats: () => request('/strafakten/stats'),
};
