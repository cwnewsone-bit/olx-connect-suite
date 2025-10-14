import { api } from './api';
import { MeSchema, type Me } from './schemas';

export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
}

export async function login(credentials: LoginCredentials): Promise<string> {
  const response = await api.post<LoginResponse>('/auth/login', credentials);
  const token = response.token;
  
  // Salva token
  localStorage.setItem('auth_token', token);
  
  return token;
}

export async function logout(): Promise<void> {
  localStorage.removeItem('auth_token');
  window.location.href = '/login';
}

export async function me(): Promise<Me> {
  const data = await api.get('/auth/me');
  return MeSchema.parse(data);
}

export type { Me } from './schemas';

export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
