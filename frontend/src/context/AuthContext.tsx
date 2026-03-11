import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import api from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null, isLoading: true,
  login: async () => {}, logout: () => {},
  hasPermission: () => false, hasRole: () => false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      await api.init();
      const stored = await AsyncStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch {} finally { setIsLoading(false); }
  }

  async function login(username: string, password: string) {
    const response = await api.login(username, password);
    api.setToken(response.accessToken);
    await AsyncStorage.setItem('refreshToken', response.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
  }

  function logout() {
    api.clearToken();
    setUser(null);
  }

  function hasPermission(permission: string) {
    return user?.permissions?.includes(permission) || false;
  }

  function hasRole(role: string) {
    return user?.role === role;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}
