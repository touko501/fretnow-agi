const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('fretnow_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    const refreshToken = localStorage.getItem('fretnow_refresh');
    if (refreshToken) {
      try {
        const rr = await fetch(`${BASE}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
        if (rr.ok) {
          const d = await rr.json();
          localStorage.setItem('fretnow_token', d.token);
          headers['Authorization'] = `Bearer ${d.token}`;
          return fetch(`${BASE}${path}`, { ...options, headers });
        }
      } catch (e) {}
    }
    localStorage.removeItem('fretnow_token');
    localStorage.removeItem('fretnow_refresh');
    window.location.href = '/login';
    return;
  }
  return res;
}

async function json(promise) {
  const res = await promise;
  if (!res?.ok) {
    const err = await res?.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Erreur ${res?.status}`);
  }
  return res.json();
}

export const api = {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: 'POST', body: JSON.stringify(b) }),
  put: (p, b) => request(p, { method: 'PUT', body: JSON.stringify(b) }),
  patch: (p, b) => request(p, { method: 'PATCH', body: JSON.stringify(b) }),
  del: (p) => request(p, { method: 'DELETE' }),

  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (d) => request('/auth/register', { method: 'POST', body: JSON.stringify(d) }),
  me: () => request('/auth/me'),
  updateProfile: (d) => json(request('/auth/profile', { method: 'PUT', body: JSON.stringify(d) })),

  getMissions: (params = '') => json(request(`/missions${params ? '?' + params : ''}`)),
  getMission: (id) => json(request(`/missions/${id}`)),
  createMission: (d) => json(request('/missions', { method: 'POST', body: JSON.stringify(d) })),
  publishMission: (id) => json(request(`/missions/${id}/publish`, { method: 'PATCH' })),

  getBids: (missionId) => json(request(`/missions/${missionId}/bids`)),
  placeBid: (missionId, d) => json(request(`/missions/${missionId}/bids`, { method: 'POST', body: JSON.stringify(d) })),
  acceptBid: (missionId, bidId) => json(request(`/missions/${missionId}/bids/${bidId}/accept`, { method: 'PATCH' })),

  getVehicles: () => json(request('/vehicles')),
  createVehicle: (d) => json(request('/vehicles', { method: 'POST', body: JSON.stringify(d) })),

  getBalance: () => json(request('/wallet/balance')),
  getTransactions: (params = '') => json(request(`/wallet/transactions${params ? '?' + params : ''}`)),

  createMessagerMission: (d) => json(request('/messagerie/missions', { method: 'POST', body: JSON.stringify(d) })),
  getMessagerMissions: (params = '') => json(request(`/messagerie/missions${params ? '?' + params : ''}`)),
  getNearbyMissions: (lat, lng, r = 50) => json(request(`/messagerie/missions/nearby?lat=${lat}&lng=${lng}&radius=${r}`)),
  confirmDelivery: (id, d) => json(request(`/messagerie/missions/${id}/confirm-delivery`, { method: 'POST', body: JSON.stringify(d) })),
  getSlaOverview: () => json(request('/messagerie/sla/overview')),
  getSlaStats: () => json(request('/messagerie/sla/stats')),

  getMobilicConnectUrl: () => json(request('/mobilic/connect')),
  getMobilicStatus: () => json(request('/mobilic/status')),
  startActivity: (d) => json(request('/mobilic/activity/start', { method: 'POST', body: JSON.stringify(d) })),
  endActivity: (logId) => json(request(`/mobilic/activity/${logId}/end`, { method: 'POST' })),
  getDriverToday: (driverId) => json(request(`/mobilic/driver/${driverId}/today`)),
  getDriverLogs: (driverId) => json(request(`/mobilic/driver/${driverId}/logs`)),
  getDriverAvailability: (driverId) => json(request(`/mobilic/driver/${driverId}/availability`)),
  getComplianceDashboard: () => json(request('/mobilic/compliance/dashboard')),
  getComplianceScore: () => json(request('/mobilic/compliance/score')),
  getComplianceAlerts: () => json(request('/mobilic/compliance/alerts')),
  resolveAlert: (id, d) => json(request(`/mobilic/compliance/alerts/${id}/resolve`, { method: 'POST', body: JSON.stringify(d) })),

  getAgentsStatus: () => json(request('/agents/status')),
  analyzeCompliance: (driverId) => json(request(`/agents/compliance/analyze/${driverId}`, { method: 'POST' })),
  getCertification: (companyId) => json(request(`/agents/compliance/certification/${companyId}`)),
  getAvailableDrivers: (companyId) => json(request(`/agents/compliance/available/${companyId}`)),

  getAdminDashboard: () => json(request('/admin/dashboard')),
  getNotifications: () => json(request('/notifications')),
  markNotificationRead: (id) => json(request(`/notifications/${id}/read`, { method: 'PATCH' })),
};
