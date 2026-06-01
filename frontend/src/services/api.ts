import axios from 'axios';

const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
  timeout:         60000,
});

// ─── Request interceptor — attach access token ─────────────
// Do NOT add Authorization to /auth/refresh — it causes an infinite 401 loop
// when the access token is expired (the refresh call itself gets 401-retried).
api.interceptors.request.use((config) => {
  const isRefresh = config.url?.includes('/auth/refresh');
  if (!isRefresh) {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — auto refresh on 401 ───────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt token refresh for authenticated requests (those that had an
    // Authorization header). Public endpoints like /distributor/login return 401
    // for "not found" — we must NOT retry those or the user gets a duplicate
    // request and a confusing redirect.
    const hadAuthHeader = !!original.headers?.Authorization;

    if (error.response?.status === 401 && !original._retry && hadAuthHeader) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken',  data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          // Refresh failed — clear tokens and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth/login';
        }
      } else {
        // No refresh token available — clear any stale access token
        localStorage.removeItem('accessToken');
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
