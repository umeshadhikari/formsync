import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';

export interface AppTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  fontFamily: string;
  borderRadius: number;
}

const DEFAULT_THEME: AppTheme = {
  primaryColor: '#1B4F72',
  secondaryColor: '#2C3E50',
  accentColor: '#3498DB',
  successColor: '#27AE60',
  warningColor: '#F39C12',
  dangerColor: '#E74C3C',
  backgroundColor: '#F0F2F5',
  surfaceColor: '#FFFFFF',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  fontFamily: 'System',
  borderRadius: 8,
};

interface ThemeContextType {
  theme: AppTheme;
  refreshTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: DEFAULT_THEME, refreshTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(DEFAULT_THEME);

  useEffect(() => { loadTheme(); }, []);

  async function loadTheme() {
    try {
      const active = await api.getActiveTheme();
      if (active?.designTokens) {
        const tokens = active.designTokens;
        setTheme({
          ...DEFAULT_THEME,
          ...tokens,
          borderRadius: parseInt(tokens.borderRadius) || 8,
        });
      }
    } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme, refreshTheme: loadTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
