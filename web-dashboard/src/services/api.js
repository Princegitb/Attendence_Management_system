const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('guard_access_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function login(mobile, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, password }),
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem('guard_access_token', data.data.accessToken);
    localStorage.setItem('guard_refresh_token', data.data.refreshToken);
    localStorage.setItem('guard_user', JSON.stringify(data.data.user));
  }
  return data;
}

export function logout() {
  localStorage.removeItem('guard_access_token');
  localStorage.removeItem('guard_refresh_token');
  localStorage.removeItem('guard_user');
}

export function getCurrentUser() {
  const user = localStorage.getItem('guard_user');
  return user ? JSON.parse(user) : null;
}

async function refreshToken() {
  const refreshTok = localStorage.getItem('guard_refresh_token');
  if (!refreshTok) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshTok })
    });
    const data = await res.json();
    if (data.success && data.data?.accessToken) {
      localStorage.setItem('guard_access_token', data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem('guard_refresh_token', data.data.refreshToken);
      }
      return data.data.accessToken;
    }
  } catch (err) {
    console.error('Silent token refresh error:', err);
  }
  return null;
}

async function request(endpoint, options = {}, isRetry = false) {
  const token = localStorage.getItem('guard_access_token');
  const headers = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json();

  if ((res.status === 401 || (res.status === 403 && data.message && data.message.includes('token'))) && !isRetry) {
    const newToken = await refreshToken();
    if (newToken) {
      return request(endpoint, options, true);
    } else {
      logout();
      window.location.reload();
      throw new Error('Your session expired. Please log in again.');
    }
  }

  return data;
}

export const api = {
  // Attendance
  getAttendance: (date, officerId, postId, status) => {
    let url = `/attendance?date=${date || ''}`;
    if (officerId) url += `&officer_id=${officerId}`;
    if (postId) url += `&post_id=${postId}`;
    if (status) url += `&status=${status}`;
    return request(url);
  },
  correctAttendance: (id, status, reason) => request(`/attendance/${id}/correction`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reason })
  }),

  // Guards
  getGuards: () => request('/guards'),
  createGuard: (data) => request('/guards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateGuard: (id, data) => request(`/guards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteGuard: (id) => request(`/guards/${id}`, { method: 'DELETE' }),
  importGuardsBulk: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/guards/import', {
      method: 'POST',
      body: formData
    });
  },

  // Posts
  getPosts: () => request('/posts'),
  createPost: (data) => request('/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updatePost: (id, data) => request(`/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),

  // Officers
  getOfficers: () => request('/officers'),
  createOfficer: (data) => request('/officers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  resetOfficerPassword: (id) => request(`/officers/${id}/reset-password`, {
    method: 'POST'
  }),
  deleteOfficer: (id) => request(`/officers/${id}`, { method: 'DELETE' }),

  // Shifts
  getShifts: () => request('/shifts'),
  createShift: (data) => request('/shifts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteShift: (id) => request(`/shifts/${id}`, { method: 'DELETE' }),

  // Assignments
  getAssignments: () => request('/assignments'),
  createAssignment: (data) => request('/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteAssignment: (id) => request(`/assignments/${id}`, { method: 'DELETE' }),

  // Audit Logs & Reports
  getAuditLogs: () => request('/audit-logs'),
  getReportExportUrl: (fromDate, toDate) => {
    const token = localStorage.getItem('guard_access_token');
    return `${API_BASE}/reports/export?from_date=${fromDate}&to_date=${toDate}&token=${token}`;
  }
};
