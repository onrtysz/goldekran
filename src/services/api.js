import axios from 'axios';

const getBackendUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  return "https://apiharem.kuyumcufatih.com";
};

const API_URL = getBackendUrl();

export const getTenantId = () => {
  const userTenantId = localStorage.getItem('tenantId');
  if (userTenantId) return userTenantId;
  if (process.env.REACT_APP_TENANT_ID) {
    return process.env.REACT_APP_TENANT_ID.toLowerCase();
  }
  return 'kuyumcular-odasi';
};

export const TENANT_ID = getTenantId();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  const isAuthRequest = config.url?.includes('/api/auth/login') || config.url?.includes('/api/auth/setup');
  if (!isAuthRequest) {
    config.headers['X-Tenant-Id'] = getTenantId();
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = error.config?.url?.includes('/api/auth/login') || error.config?.url?.includes('/api/auth/setup');
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('tenantId');
      window.location.hash = '#/';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/api/auth/login', { username, password });
    return response.data;
  },
  
  verify: async () => {
    const response = await api.get('/api/auth/verify');
    return response.data;
  },
  
  setup: async (username, password) => {
    const response = await api.post('/api/auth/setup', { username, password });
    return response.data;
  },
  
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/api/auth/change-password', { currentPassword, newPassword });
    return response.data;
  }
};

export const settingsService = {
  getSettings: async () => {
    const response = await api.get('/api/settings');
    return response.data;
  },
  
  updateSettings: async (settings) => {
    const response = await api.put('/api/settings', settings);
    return response.data;
  }
};

export default api;
