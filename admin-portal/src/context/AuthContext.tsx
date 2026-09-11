import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';

interface UserSession {
  userId: string;
  email: string;
  phone: string;
  fullName: string;
  firstName: string;
  lastName: string;
  branchId: string;
  branchName: string;
  roleName: string;
  roleCode: string;
  isAdmin: boolean;
  adminLevel: 'none' | 'branch_admin' | 'church_admin' | 'super_admin';
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await api.getProfile();
        setUser(profile);
        if (profile.adminLevel === 'super_admin') {
          setSelectedBranchId(''); // all branches
        } else {
          setSelectedBranchId(profile.branchId);
        }
      } catch (err) {
        console.error('Session validation failed:', err);
        removeAuthToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    if (res.token && res.user) {
      setAuthToken(res.token);
      setUser(res.user);
      if (res.user.adminLevel !== 'super_admin') {
        setSelectedBranchId(res.user.branchId);
      }
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      selectedBranchId,
      setSelectedBranchId,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
