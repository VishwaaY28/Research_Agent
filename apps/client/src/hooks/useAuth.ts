/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { API } from '../utils/constants';

type User = {
  name: string;
  email: string;
  avatar?: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  error?: string | null;
  loading?: boolean;
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    error: null,
    loading: false,
  });

  const navigate = useNavigate();
  const sessionFetchedRef = useRef(false);
  const fetchingSessionRef = useRef(false);

  const fetchSession = useCallback(async () => {
    if (fetchingSessionRef.current || sessionFetchedRef.current) {
      return;
    }

    fetchingSessionRef.current = true;
    setAuthState((s) => ({ ...s, loading: true, error: null }));

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const res = await fetch(
        API.BASE_URL() + API.ENDPOINTS.AUTH.BASE_URL() + API.ENDPOINTS.AUTH.SESSION(),
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
        }
        throw new Error('Not authenticated');
      }

      const data = await res.json();
      console.log('Session data:', data);

      setAuthState({
        user: {
          name: data.name,
          email: data.email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=3C2DDA&color=fff&size=40`,
        },
        isAuthenticated: true,
        error: null,
        loading: false,
      });

      sessionFetchedRef.current = true;
    } catch (err) {
      console.error('Session fetch error:', err);
      setAuthState({
        user: null,
        isAuthenticated: false,
        error: null,
        loading: false,
      });

      if (window.location.pathname !== '/auth') {
        navigate('/auth');
      }
    } finally {
      fetchingSessionRef.current = false;
    }
  }, [navigate]);

  const login = useCallback(
    async (email: string, password: string) => {
      setAuthState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(
          API.BASE_URL() + API.ENDPOINTS.AUTH.BASE_URL() + API.ENDPOINTS.AUTH.LOGIN(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');

        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
          sessionFetchedRef.current = false;
          fetchingSessionRef.current = false;
        }

        navigate('/dashboard');
      } catch (err: any) {
        setAuthState((s) => ({
          ...s,
          loading: false,
          error: err.message || 'Login failed',
        }));
      }
    },
    [navigate],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setAuthState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(
          API.BASE_URL() + API.ENDPOINTS.AUTH.BASE_URL() + API.ENDPOINTS.AUTH.REGISTER(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');
        await login(email, password);
      } catch (err: any) {
        setAuthState((s) => ({
          ...s,
          loading: false,
          error: err.message || 'Registration failed',
        }));
      }
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(API.BASE_URL() + API.ENDPOINTS.AUTH.BASE_URL() + API.ENDPOINTS.AUTH.LOGOUT(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      sessionFetchedRef.current = false;
      fetchingSessionRef.current = false;
      setAuthState({
        user: null,
        isAuthenticated: false,
        error: null,
        loading: false,
      });
      navigate('/auth');
    }
  }, [navigate]);

  return {
    ...authState,
    login,
    register,
    fetchSession,
    logout,
  };
};
