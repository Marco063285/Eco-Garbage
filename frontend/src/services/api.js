import axios from 'axios';

// In dev: Vite proxies /api to http://localhost:5000 (see vite.config.js)
// In production (Vercel): set VITE_API_URL to your Render backend URL,
//   e.g. VITE_API_URL=https://eco-garbage-backend.onrender.com/api
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eco_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('eco_token');
      localStorage.removeItem('eco_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyEmail: (token) => api.get('/auth/verify-email', { params: { token } }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
};

// ── Requests ──────────────────────────────────────
export const requestApi = {
  list: (params) => api.get('/requests', { params }),
  get: (uuid) => api.get(`/requests/${uuid}`),
  create: (data) => api.post('/requests', data),
  estimate: (data) => api.post('/requests/estimate', data),
  updateStatus: (uuid, data) => api.put(`/requests/${uuid}/status`, data),
  updateLocation: (uuid, data) => api.put(`/requests/${uuid}/location`, data),
  assign: (uuid, data) => api.put(`/requests/${uuid}/assign`, data),
  archive: (uuid) => api.put(`/requests/${uuid}/archive`),
  restore: (uuid) => api.put(`/requests/${uuid}/restore`),
  cancel: (uuid) => api.delete(`/requests/${uuid}`),
};

// ── Categories ────────────────────────────────────
export const categoryApi = {
  list: () => api.get('/categories'),
};

// ── Notifications ─────────────────────────────────
export const notifApi = {
  list: () => api.get('/notifications'),
  readAll: () => api.put('/notifications/read-all'),
};

// ── Payments ──────────────────────────────────────
export const paymentApi = {
  list: () => api.get('/payments'),
  pay: (data) => api.post('/payments/pay', data),
};

// ── Complaints ────────────────────────────────────
export const complaintApi = {
  mine: () => api.get('/complaints/mine'),
  create: (data) => api.post('/complaints', data),
};

// ── Ratings ───────────────────────────────────────
export const ratingApi = {
  create: (data) => api.post('/ratings', data),
};

// ── Collector ─────────────────────────────────────
export const collectorApi = {
  tasks: (params) => api.get('/collector/tasks', { params }),
  availableRequests: (params) => api.get('/collector/available-requests', { params }),
  stats: () => api.get('/collector/stats'),
  setAvailability: (data) => api.put('/collector/availability', data),
  updateLocation: (data) => api.put('/collector/location', data),
};

// ── Admin ─────────────────────────────────────────
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  users: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  toggleUser: (id, data) => api.put(`/admin/users/${id}/status`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getCollectorDetails: (id) => api.get(`/admin/collectors/${id}`),
  complaints: () => api.get('/admin/complaints'),
  respondComplaint: (uuid, data) => api.put(`/admin/complaints/${uuid}`, data),
  reports: (params) => api.get('/admin/reports', { params }),
  categories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  requests: (params) => api.get('/admin/requests', { params }),
};
