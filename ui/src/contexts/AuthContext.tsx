import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getUser as getUserFromApi, type User as ApiUser } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type User = ApiUser;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessTokenState] = useState<string | null>(
    localStorage.getItem('accessToken')
  );

  const setAccessToken = (token: string) => {
    localStorage.setItem('accessToken', token);
    setAccessTokenState(token);
  };

  const login = () => {
    window.location.href = `${API_URL}/api/auth/login`;
  };

  const logout = async () => {
    try {
      // Logout endpoint doesn't return anything, just make the request
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      setAccessTokenState(null);
      setUser(null);
    }
  };

  const fetchUser = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      const userData = await getUserFromApi();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('accessToken');
      setAccessTokenState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [accessToken]);

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    setAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
