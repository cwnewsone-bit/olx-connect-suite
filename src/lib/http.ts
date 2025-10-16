import axios from 'axios';

// 1) Pega da env se existir (preferencial)
//    Ex.: VITE_API_URL=http://80.190.82.217:4000
const envUrl =
  (import.meta as any)?.env?.VITE_API_URL ||
  (import.meta as any)?.env?.VITE_API_BASE_URL ||
  '';

// 2) Fallback: mesmo host do front, porta 4000 (sem "localhost")
function deriveBaseURL(): string {
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4000`;
}

const baseURL = (envUrl || deriveBaseURL()).replace(/\/+$/, '');
console.log('[http] baseURL =', baseURL);

export const http = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request interceptor - adiciona token JWT
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - trata 401
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('auth_token');
      const currentPath = window.location.pathname + window.location.search;
      if (!['/login', '/register'].includes(window.location.pathname)) {
        window.location.href = `/login?expired=1&from=${encodeURIComponent(currentPath)}`;
      }
    }
    return Promise.reject(error);
  }
);
