import { createContext, useContext, type ReactNode, useEffect } from 'react';
import { useAuthControllerGetUser, type UserResponseDto } from '@/api/hooks.gen';
import { useQueryClient } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/api/client';
import { posthog } from '@/lib/posthog';

const API_URL = getApiBaseUrl();

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

  const loading = isLoading;

  const login = () => {
    window.location.href = `${API_URL}/auth/login`;
  };

  const logout = () => {
    // Clear React Query cache before navigating
    queryClient.clear();
    // Navigate to logout endpoint - backend will clear cookies and redirect to WorkOS logout
    window.location.href = `${API_URL}/auth/logout`;
  };

  // Identify user with PostHog when authenticated
  useEffect(() => {
    if (user) {
      posthog.identify(String(user.id), {
        email: user.email,
        name: user.name,
        subscriptionStatus: user.subscriptionStatus,
        interviewsRemaining: user.interviewsRemaining,
      });
    } else {
      posthog.reset();
    }
  }, [user]);

  const value = {
    user: user ?? null,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
