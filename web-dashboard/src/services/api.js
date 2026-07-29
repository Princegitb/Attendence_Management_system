const API_BASE = '/api';

let inMemoryAccessToken = null;

export function setAccessToken(token) {
  inMemoryAccessToken = token;
}

function getAuthHeader() {
  return inMemoryAccessToken ? { 'Authorization': `Bearer ${inMemoryAccessToken}` } : {};
}

export async function login(mobile, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, password }),
  });
  const data = await res.json();
  if (data.success) {
    inMemoryAccessToken = data.data.accessToken;
    localStorage.setItem('guard_user', JSON.stringify(data.data.user));
  }
  return data;
}

export async function logout() {
  try {
    const headers = getAuthHeader();
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers,
      credentials: 'include'
    });
  } catch (err) {
    console.error('Logout error:', err);
  }
  inMemoryAccessToken = null;
  localStorage.removeItem('guard_user');
}

export function getCurrentUser() {
  const user = localStorage.getItem('guard_user');
  return user ? JSON.parse(user) : null;
}

async function refreshToken() {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.success && data.data?.accessToken) {
      inMemoryAccessToken = data.data.accessToken;
      return data.data.accessToken;
    }
  } catch (err) {
    console.error('Silent token refresh error:', err);
  }
  inMemoryAccessToken = null;
  return null;
}

async function request(endpoint, options = {}, isRetry = false) {
  const headers = {
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  const data = await res.json();

  if ((res.status === 401 || (res.status === 403 && data.message && data.message.includes('token'))) && !isRetry) {
    const newToken = await refreshToken();
    if (newToken) {
      return request(endpoint, options, true);
    } else {
      await logout();
      window.location.reload();
      throw new Error('Your session expired. Please log in again.');
    }
  }

  return data;
}

export const api = {
  // Session verification
  getMe: () => request('/auth/me'),

  // Attendance
  getAttendance: (date, officerId, postId, status, shiftId) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (officerId) params.append('officer_id', officerId);
    if (postId) params.append('post_id', postId);
    if (status) params.append('status', status);
    if (shiftId) params.append('shift_id', shiftId);
    return request(`/attendance?${params.toString()}`);
  },
  correctAttendance: (id, status, reason, scope) => request(`/attendance/${id}/correction`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reason, scope })
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
  deleteGuardsBulk: (ids) => request('/guards/bulk', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  }),
  updateGuardsBulk: (ids, data) => request('/guards/bulk', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, ...data })
  }),
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
  downloadReportCSV: async (fromDate, toDate) => {
    const headers = {
      ...getAuthHeader()
    };
    const res = await fetch(`${API_BASE}/reports/export?from_date=${fromDate}&to_date=${toDate}`, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    if (res.status === 401 || res.status === 403) {
      const newToken = await refreshToken();
      if (newToken) {
        const retryRes = await fetch(`${API_BASE}/reports/export?from_date=${fromDate}&to_date=${toDate}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${newToken}`
          },
          credentials: 'include'
        });
        if (retryRes.ok) return await retryRes.blob();
      }
      throw new Error('Failed to export report: session expired or unauthorized.');
    }
    if (!res.ok) {
      throw new Error('Failed to export report.');
    }
    return await res.blob();
  },

  // Payroll
  getPayrollConfigs: () => request('/payroll/configurations'),
  updatePayrollConfig: (data) => request('/payroll/configurations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  bulkUpdatePayrollConfig: (data) => request('/payroll/configurations/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  getAdvances: (guardId) => request(`/payroll/advances?guard_id=${guardId || ''}`),
  createAdvance: (data) => request('/payroll/advances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateAdvance: (id, data) => request(`/payroll/advances/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteAdvance: (id) => request(`/payroll/advances/${id}`, { method: 'DELETE' }),
  calculatePayroll: (month, year) => request(`/payroll/calculate?month=${month}&year=${year}`),
  getGuardPayrollDetail: (guardId, month, year) => request(`/payroll/guard-detail?guard_id=${guardId}&month=${month}&year=${year}`),
  generatePayroll: (month, year, salaries) => request('/payroll/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month, year, employee_salaries: salaries })
  }),
  getPayrollHistory: () => request('/payroll/history'),
  getPayrollDetails: (id) => request(`/payroll/details/${id}`)
};
