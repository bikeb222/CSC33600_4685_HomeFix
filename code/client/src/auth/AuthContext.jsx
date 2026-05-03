import React from 'react';
import { api } from '../api/client';

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [initializing, setInitializing] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      const token = localStorage.getItem(api.auth.tokenKey);
      if (!token) {
        setInitializing(false);
        return;
      }
      try {
        const currentUser = await api.auth.me();
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch (_error) {
        localStorage.removeItem(api.auth.tokenKey);
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }
    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(credentials) {
    const result = await api.auth.login(credentials);
    localStorage.setItem(api.auth.tokenKey, result.token);
    setUser(result.user);
    return result.user;
  }

  async function register(payload) {
    return api.auth.register(payload);
  }

  async function logout() {
    localStorage.removeItem(api.auth.tokenKey);
    setUser(null);
    try {
      await api.auth.logout();
    } catch (_error) {
      // Token removal is enough for JWT logout.
    }
  }

  const value = React.useMemo(() => ({
    user,
    initializing,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout
  }), [user, initializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
