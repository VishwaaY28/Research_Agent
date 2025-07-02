import { useState, useEffect } from 'react';

type User = {
  username: string;
  email: string;
  avatar: string;
}

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true
  });

  useEffect(() => {
    setTimeout(() => {
      setAuthState({
        user: {
          username: 'johndoe',
          email: 'john.doe@example.com',
          avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=3C2DDA&color=fff&size=40'
        },
        isAuthenticated: true,
        loading: false
      });
    }, 500);
  }, []);

  const logout = () => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      loading: false
    });
  };

  return {
    ...authState,
    logout
  };
};