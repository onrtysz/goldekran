import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

/**
 * Backend should set role: "admin" | "viewer" (or isAdmin).
 * If role is omitted (legacy), user is treated as admin so existing accounts keep working.
 */
export function deriveIsAdmin(adminUser) {
  if (!adminUser) return false;
  if (adminUser.isAdmin === true) return true;
  if (adminUser.isAdmin === false) return false;
  const r = adminUser.role;
  if (r === 'viewer' || r === 'user' || r === 'readonly') return false;
  if (r === 'admin') return true;
  return true;
}

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = useMemo(() => deriveIsAdmin(admin), [admin]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await authService.verify();
      if (response.success) {
        setIsAuthenticated(true);
        setAdmin(response.admin);
        if (response.admin?.tenantId) {
          localStorage.setItem('tenantId', response.admin.tenantId);
        }
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
      } else {
        // Network error - keep token, try to use cached session
        const cachedTenant = localStorage.getItem('tenantId');
        if (cachedTenant) {
          setIsAuthenticated(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const response = await authService.login(username, password);
    if (response.success) {
      localStorage.setItem('adminToken', response.token);
      if (response.admin?.tenantId) {
        localStorage.setItem('tenantId', response.admin.tenantId);
      }
      setIsAuthenticated(true);
      setAdmin(response.admin);
    }
    return response;
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('hesaplananFiyat');
    localStorage.removeItem('calculatedPrices');
    setIsAuthenticated(false);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, admin, isAdmin, loading, login, logout, checkAuth }}>
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
