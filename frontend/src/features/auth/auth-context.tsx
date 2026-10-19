'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ApiError, apiRequest, type AuthenticationResponse, type SafeUser } from '@/lib/api';

type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput extends LoginInput {
  displayName: string;
}

interface AuthContextValue {
  accessToken: string | null;
  user: SafeUser | null;
  status: SessionStatus;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  authenticatedRequest: <T>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');

  const applyAuthentication = useCallback((result: AuthenticationResponse) => {
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus('authenticated');
  }, []);

  const clearAuthentication = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    let active = true;

    apiRequest<AuthenticationResponse>('/api/auth/refresh', {
      method: 'POST',
    })
      .then((result) => {
        if (active) applyAuthentication(result);
      })
      .catch(() => {
        if (active) clearAuthentication();
      });

    return () => {
      active = false;
    };
  }, [applyAuthentication, clearAuthentication]);

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await apiRequest<AuthenticationResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });

      applyAuthentication(result);
    },
    [applyAuthentication],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      await apiRequest<SafeUser>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });

      await login({ email: input.email, password: input.password });
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest<void>('/api/auth/logout', { method: 'POST' });
    } finally {
      clearAuthentication();
    }
  }, [clearAuthentication]);

  const authenticatedRequest = useCallback(
    async <T,>(path: string, init: RequestInit = {}) => {
      if (!accessToken) {
        throw new Error('You need to sign in to continue.');
      }

      const requestWithToken = (token: string) => {
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${token}`);
        return apiRequest<T>(path, { ...init, headers });
      };

      try {
        return await requestWithToken(accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        try {
          const refreshed = await apiRequest<AuthenticationResponse>('/api/auth/refresh', {
            method: 'POST',
          });
          applyAuthentication(refreshed);
          return await requestWithToken(refreshed.accessToken);
        } catch (refreshError) {
          clearAuthentication();
          throw refreshError;
        }
      }
    },
    [accessToken, applyAuthentication, clearAuthentication],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      user,
      status,
      login,
      register,
      logout,
      authenticatedRequest,
    }),
    [accessToken, authenticatedRequest, login, logout, register, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
