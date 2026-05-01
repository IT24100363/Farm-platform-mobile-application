import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { clearAuth, getStoredUser, getToken, saveAuth } from '../storage/tokenStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([getToken(), getStoredUser()]);
        if (savedToken) {
          setToken(savedToken);
          setUser(savedUser);
          try {
            const { data } = await api.get('/users/me');
            setUser(data);
            await saveAuth({ token: savedToken, user: data });
          } catch {
            await clearAuth();
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        setBooting(false);
      }
    };
    restore();
  }, []);

  const login = async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password });
    await saveAuth({ token: data.accessToken, user: data.user });
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    await saveAuth({ token: data.accessToken, user: data.user });
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const refreshProfile = async () => {
    const { data } = await api.get('/users/me');
    setUser(data);
    await saveAuth({ token, user: data });
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Token cleanup should still happen even if the network is unavailable.
    }
    await clearAuth();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, booting, isAuthenticated: Boolean(token && user), login, register, logout, refreshProfile, setUser }),
    [user, token, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
