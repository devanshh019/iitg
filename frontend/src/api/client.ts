// API Client for HACKOS Mission Control

export const API_BASE = '/api';

export interface AuthState {
  token: string | null;
  userId: string | null;
  isSuperAdmin: boolean;
  roles: Array<{ event_id: string; role: string }>;
  email: string | null;
}

export const getStoredAuth = (): AuthState => {
  try {
    const raw = localStorage.getItem('hackos_auth');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { token: null, userId: null, isSuperAdmin: false, roles: [], email: null };
};

export const setStoredAuth = (auth: AuthState) => {
  localStorage.setItem('hackos_auth', JSON.stringify(auth));
};

export const clearStoredAuth = () => {
  localStorage.removeItem('hackos_auth');
};

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const auth = getStoredAuth();
  const headers = new Headers(options.headers || {});

  if (auth.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${auth.token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  let retries = 2;
  while (retries >= 0) {
    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        let errDetail = 'Request failed';
        try {
          const errData = await res.json();
          errDetail = errData.detail || errData.message || JSON.stringify(errData);
        } catch (_) {
          errDetail = await res.text();
        }
        throw new Error(errDetail);
      }
      return (await res.json()) as T;
    } catch (err: any) {
      if (retries === 0) throw err;
      retries--;
      await new Promise(r => setTimeout(r, 600));
    }
  }
  throw new Error('Network error');
}
