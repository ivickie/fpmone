import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';

export interface UserSession {
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
  accountStatus?: string;
  isWorker?: boolean;
  workerDetails?: {
    workerId: string;
    workerCode: string;
    departmentId?: string;
    departmentName?: string;
    positionName?: string;
    status: string;
  };
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

/**
 * Determines whether a user session has permission to access the FPM Global Admin Portal.
 * Permitted roles & access levels:
 * - Admin (super_admin, church_admin, branch_admin, isAdmin = true, SUPER_ADMIN)
 * - Branch Admin (BRANCH_ADMIN or branch_admin)
 * - Branch Pastor (BRANCH_PASTOR)
 * - Associate Pastor (ASSOCIATE_PASTOR)
 * - Pastor (PASTOR)
 * - HOD (Head of Department)
 *
 * Workers and members who do not hold one of these roles are not authorized on the Admin Portal.
 */
export const isAuthorizedAdminPortalUser = (user: UserSession | any): boolean => {
  if (!user) return false;

  // 1. Admin status
  if (user.isAdmin) return true;
  if (user.adminLevel && user.adminLevel !== 'none') return true;

  // 2. Role code check
  const roleCode = (user.roleCode || '').toUpperCase();
  const authorizedRoleCodes = [
    'SUPER_ADMIN',
    'BRANCH_ADMIN',
    'BRANCH_PASTOR',
    'ASSOCIATE_PASTOR',
    'PASTOR',
    'HOD'
  ];
  if (authorizedRoleCodes.includes(roleCode)) return true;

  // 3. Role name check
  const roleName = (user.roleName || '').toLowerCase();
  if (
    roleName.includes('admin') ||
    roleName.includes('branch pastor') ||
    roleName.includes('associate pastor') ||
    roleName.includes('pastor') ||
    roleName.includes('hod') ||
    roleName.includes('head of department')
  ) {
    return true;
  }

  // 4. Worker position check
  const posName = (user.workerDetails?.positionName || '').toLowerCase();
  if (posName.includes('hod') || posName.includes('head of department')) {
    return true;
  }

  return false;
};

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
        if (!isAuthorizedAdminPortalUser(profile)) {
          removeAuthToken();
          setUser(null);
          return;
        }
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
      if (!isAuthorizedAdminPortalUser(res.user)) {
        removeAuthToken();
        setUser(null);
        throw new Error("You're not authorized here.");
      }
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
