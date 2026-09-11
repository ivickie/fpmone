const API_HOST = typeof window !== 'undefined' && window.location.hostname
  ? window.location.hostname
  : '192.168.1.234';
const API_BASE = `http://${API_HOST}:5000/api`;

export const getAuthToken = () => localStorage.getItem('fpm_admin_token');
export const setAuthToken = (token: string) => localStorage.setItem('fpm_admin_token', token);
export const removeAuthToken = () => localStorage.removeItem('fpm_admin_token');

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    removeAuthToken();
    window.dispatchEvent(new Event('auth:unauthorized'));
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }
    return data;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'API request failed');
  }

  return (await response.text()) as unknown as T;
}

export const api = {
  // Auth
  login: (emailOrPhone: string, password: string) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ emailOrPhone, password }) }),
  getProfile: () => apiRequest('/auth/profile'),

  // Approvals
  getApprovals: (branchId?: string) =>
    apiRequest(`/approvals${branchId ? `?branchId=${branchId}` : ''}`),
  approveMember: (userId: string) =>
    apiRequest(`/approvals/${userId}/approve`, { method: 'POST' }),
  rejectMember: (userId: string, reason: string) =>
    apiRequest(`/approvals/${userId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  requestChanges: (userId: string, notes: string) =>
    apiRequest(`/approvals/${userId}/request-changes`, { method: 'POST', body: JSON.stringify({ notes }) }),


  // Branches
  getBranches: () => apiRequest('/branches'),
  createBranch: (data: any) => apiRequest('/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id: string, data: any) => apiRequest(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBranch: (id: string) => apiRequest(`/branches/${id}`, { method: 'DELETE' }),

  // Departments & Roles
  getDepartments: (branchId?: string, includeArchived?: boolean) => {
    const qs = new URLSearchParams({
      ...(branchId ? { branchId } : {}),
      ...(includeArchived ? { includeArchived: 'true' } : {})
    }).toString();
    return apiRequest(`/departments${qs ? `?${qs}` : ''}`);
  },
  createDepartment: (data: any) => apiRequest('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: any) => apiRequest(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDepartment: (id: string) => apiRequest(`/departments/${id}`, { method: 'DELETE' }),
  getPositions: (deptId: string) => apiRequest(`/departments/${deptId}/positions`),
  createPosition: (deptId: string, data: any) => apiRequest(`/departments/${deptId}/positions`, { method: 'POST', body: JSON.stringify(data) }),
  deletePosition: (deptId: string, positionId: string) => apiRequest(`/departments/${deptId}/positions/${positionId}`, { method: 'DELETE' }),

  getRoles: () => apiRequest('/roles'),
  createRole: (data: any) => apiRequest('/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: string, data: any) => apiRequest(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id: string) => apiRequest(`/roles/${id}`, { method: 'DELETE' }),

  // Members & Workers
  createMember: (data: any) => apiRequest('/members', { method: 'POST', body: JSON.stringify(data) }),
  getMembers: (params: { search?: string; branchId?: string; roleId?: string; departmentId?: string; status?: string } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'undefined') {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    return apiRequest(`/members${qs ? `?${qs}` : ''}`);
  },
  getMemberById: (id: string) => apiRequest(`/members/${id}`),
  updateMember: (id: string, data: any) => apiRequest(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateMemberStatus: (userId: string, status: string) =>
    apiRequest(`/members/${userId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updateMemberAssignment: (memberId: string, data: any) =>
    apiRequest(`/members/${memberId}/assignment`, { method: 'PUT', body: JSON.stringify(data) }),

  getWorkers: (params: { search?: string; branchId?: string; departmentId?: string; status?: string } = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'undefined') {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    return apiRequest(`/workers${qs ? `?${qs}` : ''}`);
  },
  getWorkerById: (id: string) => apiRequest(`/workers/${id}`),
  updateWorker: (id: string, data: any) => apiRequest(`/workers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Services
  getServices: (branchId?: string, includeArchived?: boolean) => {
    const qs = new URLSearchParams({
      ...(branchId ? { branchId } : {}),
      ...(includeArchived ? { includeArchived: 'true' } : {})
    }).toString();
    return apiRequest(`/services${qs ? `?${qs}` : ''}`);
  },
  createService: (data: any) => apiRequest('/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id: string, data: any) => apiRequest(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteService: (id: string) => apiRequest(`/services/${id}`, { method: 'DELETE' }),

  // Events
  getEvents: (branchId?: string, includeArchived?: boolean) => {
    const qs = new URLSearchParams({
      ...(branchId ? { branchId } : {}),
      ...(includeArchived ? { includeArchived: 'true' } : {})
    }).toString();
    return apiRequest(`/events${qs ? `?${qs}` : ''}`);
  },
  getEventById: (id: string) => apiRequest(`/events/${id}`),
  createEvent: (data: any) => apiRequest('/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: string, data: any) => apiRequest(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id: string) => apiRequest(`/events/${id}`, { method: 'DELETE' }),
  getEventRegistrations: (id: string) => apiRequest(`/events/${id}/registrations`),

  // Feed & Posts
  getFeed: () => apiRequest('/feed'),
  createPost: (data: any) => apiRequest('/feed', { method: 'POST', body: JSON.stringify(data) }),
  updatePost: (id: string, data: any) => apiRequest(`/feed/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePost: (id: string) => apiRequest(`/feed/${id}`, { method: 'DELETE' }),

  // Highlights
  getHighlights: () => apiRequest('/highlights'),
  createHighlight: (data: any) => apiRequest('/highlights', { method: 'POST', body: JSON.stringify(data) }),
  updateHighlight: (id: string, data: any) => apiRequest(`/highlights/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHighlight: (id: string) => apiRequest(`/highlights/${id}`, { method: 'DELETE' }),

  // Testimonies
  getTestimoniesQueue: () => apiRequest('/testimonies/queue'),
  reviewTestimony: (id: string, data: any) =>
    apiRequest(`/testimonies/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),
  deleteTestimony: (id: string) => apiRequest(`/testimonies/${id}`, { method: 'DELETE' }),

  // Attendance
  getAttendanceDashboard: (branchId?: string, date?: string) => {
    const qs = new URLSearchParams({ ...(branchId ? { branchId } : {}), ...(date ? { date } : {}) }).toString();
    return apiRequest(`/attendance/dashboard${qs ? `?${qs}` : ''}`);
  },
  getAttendanceMatrix: (branchId?: string, month?: string) => {
    const qs = new URLSearchParams({ ...(branchId ? { branchId } : {}), ...(month ? { month } : {}) }).toString();
    return apiRequest(`/attendance/matrix${qs ? `?${qs}` : ''}`);
  },
  clockIn: (data: { workerIdentifier: string; serviceId: string; method: string; pin?: string }) =>
    apiRequest('/attendance/clock-in', { method: 'POST', body: JSON.stringify(data) }),
  clockOut: (attendanceId: string, source = 'manual') =>
    apiRequest('/attendance/clock-out', { method: 'POST', body: JSON.stringify({ attendanceId, source }) }),
  autoClockOut: () => apiRequest('/attendance/auto-clock-out', { method: 'POST' }),
  excuseAbsence: (attendanceId: string, reason: string) =>
    apiRequest('/attendance/excuse', { method: 'POST', body: JSON.stringify({ attendanceId, reason }) }),
  getAttendanceExportUrl: (branchId?: string, month?: string) => {
    const qs = new URLSearchParams({ ...(branchId ? { branchId } : {}), ...(month ? { month } : {}) }).toString();
    return `${API_BASE}/attendance/export${qs ? `?${qs}` : ''}`;
  },

  // Notifications
  getNotifications: () => apiRequest('/notifications'),
  broadcastNotification: (data: any) =>
    apiRequest('/notifications/broadcast', { method: 'POST', body: JSON.stringify(data) }),
  deleteNotification: (id: string) => apiRequest(`/notifications/${id}`, { method: 'DELETE' }),

  // Media Management (Supabase Storage)
  uploadMedia: async (file: File, entityType: string, entityId?: string, branchId?: string) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    if (entityId) formData.append('entityId', entityId);
    if (branchId) formData.append('branchId', branchId);

    const response = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    return response.json();
  },
  deleteMedia: (id: string) => apiRequest(`/media/${id}`, { method: 'DELETE' }),
  listMedia: (params: { entityType?: string; entityId?: string; branchId?: string } = {}) => {
    const qs = new URLSearchParams(params as any).toString();
    return apiRequest(`/media${qs ? `?${qs}` : ''}`);
  },

  // Audit Logs
  getAuditLogs: () => apiRequest('/audit-logs'),

  // Settings
  getSettings: () => apiRequest('/settings'),
  updateSettings: (data: any) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify(data) })
};
