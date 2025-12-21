import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuthControllerGetUser, useAuthControllerLogout, type UserResponseDto } from '../api/hooks.gen';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type User = UserResponseDto;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  accessToken: string | null;
  setAccessToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const queryClient = useQueryClient();
  const [accessToken, setAccessTokenState] = useState<string | null>(
    localStorage.getItem('accessToken')
  );

  const { data: user, isLoading, error } = useAuthControllerGetUser({
    query: {
      enabled: !!accessToken,
      retry: false,
    },
  });

  const logoutMutation = useAuthControllerLogout();

  const loading = isLoading;

  useEffect(() => {
    if (error && accessToken) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('accessToken');
      setAccessTokenState(null);
    }
  }, [error, accessToken]);

  const setAccessToken = (token: string) => {
    localStorage.setItem('accessToken', token);
    setAccessTokenState(token);
  };

  const login = () => {
    window.location.href = `${API_URL}/api/auth/login`;
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      setAccessTokenState(null);
      queryClient.clear();
    }
  };

  const value = {
    user: user ?? null,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    accessToken,
    setAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
