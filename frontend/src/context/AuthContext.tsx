import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, getStoredAuth, setStoredAuth, clearStoredAuth, AuthState } from '../api/client';

export interface UserRole {
  event_id: string;
  role: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  is_super_admin: boolean;
  roles: UserRole[];
}

const USER_NAVIGATION = ['crew-portal', 'squads', 'problems', 'launch', 'announcements', 'passport'];

export const ROLE_NAVIGATION: Record<string, string[]> = {
  participant: USER_NAVIGATION,
  judge: USER_NAVIGATION,
  volunteer: USER_NAVIGATION,
  organizer: USER_NAVIGATION,
  super_admin: USER_NAVIGATION
};

export const ROLE_DEFAULT_VIEWS: Record<string, string> = {
  participant: 'crew-portal',
  judge: 'crew-portal',
  volunteer: 'crew-portal',
  organizer: 'crew-portal',
  super_admin: 'crew-portal'
};

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: string;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password?: string, name?: string) => Promise<void>;
  logout: () => void;
  canAccessView: (viewId: string) => boolean;
  getAllowedViews: () => string[];
  getDefaultView: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeRole, setActiveRole] = useState<string>('participant');

  // Verify and hydrate session on initial mount
  useEffect(() => {
    const hydrate = async () => {
      const stored = getStoredAuth();
      if (stored.token && stored.email) {
        setToken(stored.token);
        setUser({
          id: stored.userId || '',
          email: stored.email,
          is_super_admin: stored.isSuperAdmin,
          roles: stored.roles || []
        });
        const matchedRole = stored.roles?.[0]?.role || (stored.isSuperAdmin ? 'super_admin' : 'participant');
        setActiveRole(matchedRole);
        try {
          const me = await apiFetch<any>('/auth/me');
          setUser({
            id: me.id,
            email: me.email,
            is_super_admin: me.is_super_admin,
            roles: me.roles || []
          });
          if (me.roles?.length) {
            setActiveRole(me.roles[0].role);
          }
        } catch (err) {
          console.warn('Session expired or invalid, clearing stored credentials:', err);
          clearStoredAuth();
          setToken(null);
          setUser(null);
          setActiveRole('participant');
        }
      }
      setIsLoading(false);
    };

    hydrate();
  }, []);

  const executeLogin = async (email: string, password = 'Password123!') => {
    const res = await apiFetch<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password })
    });

    const authState: AuthState = {
      token: res.access_token,
      userId: res.user_id,
      isSuperAdmin: res.is_super_admin,
      roles: res.roles || [],
      email: email.trim().toLowerCase()
    };
    setStoredAuth(authState);
    setToken(res.access_token);
    setUser({
      id: res.user_id,
      email: email.trim().toLowerCase(),
      is_super_admin: res.is_super_admin,
      roles: res.roles || []
    });

    const determinedRole = res.roles?.[0]?.role || (res.is_super_admin ? 'super_admin' : 'participant');
    setActiveRole(determinedRole);
  };

  const login = async (email: string, password = 'Password123!') => {
    setIsLoading(true);
    try {
      await executeLogin(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password = 'Password123!', name?: string) => {
    setIsLoading(true);
    try {
      await apiFetch<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name ? name.trim() : undefined,
          is_super_admin: false
        })
      });
      // Automatically log in after registration
      await executeLogin(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
    setToken(null);
    setActiveRole('participant');
  };

  const canAccessView = (viewId: string): boolean => {
    const allowed = ROLE_NAVIGATION[activeRole] || ROLE_NAVIGATION.participant;
    return allowed.includes(viewId);
  };

  const getAllowedViews = (): string[] => {
    return ROLE_NAVIGATION[activeRole] || ROLE_NAVIGATION.participant;
  };

  const getDefaultView = (): string => {
    return ROLE_DEFAULT_VIEWS[activeRole] || 'crew-portal';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        activeRole,
        login,
        register,
        logout,
        canAccessView,
        getAllowedViews,
        getDefaultView
      }}
    >
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
