import { createContext, useContext, type ReactNode } from 'react';
import { useAuthControllerGetUser, useAuthControllerLogout, type UserResponseDto } from '@/api/hooks.gen';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type User = UserResponseDto;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
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

  // Token now stored in HTTP-only cookie, attempt to fetch user to check auth status
  const { data: user, isLoading } = useAuthControllerGetUser({
    query: {
      retry: false,
    },
  });

  const logoutMutation = useAuthControllerLogout();

  const loading = isLoading;

  const login = () => {
    window.location.href = `${API_URL}/auth/login`;
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      queryClient.clear();
      // Redirect to home after logout
      window.location.href = '/';
    }
  };

  const value = {
    user: user ?? null,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
