/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from 'react';
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
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    error: null,
  });

  const navigate = useNavigate();

  const fetchSession = async () => {
    setAuthState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(
        API.BASE_URL() + API.ENDPOINTS.AUTH.BASE_URL() + API.ENDPOINTS.AUTH.SESSION(),
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
        },
      );
      if (!res.ok) throw new Error('Not authenticated');
      const data = await res.json();
      setAuthState({
        user: {
          name: data.name,
          email: data.email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=3C2DDA&color=fff&size=40`,
        },
        isAuthenticated: true,
        error: null,
      });
    } catch {
      setAuthState({
        user: null,
        isAuthenticated: false,
        error: null,
      });
      navigate('/auth');
    }
  };

  const login = useCallback(async (email: string, password: string) => {
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
      }
      navigate('/dashboard');
    } catch (err: any) {
      setAuthState((s) => ({
        ...s,
        loading: false,
        error: err.message || 'Login failed',
      }));
    }
  }, []);

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

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setAuthState({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  }, []);

  return {
    ...authState,
    login,
    register,
    fetchSession,
    logout,
  };
};
