import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../api/client';

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  // Core colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  // Surfaces
  backgroundColor: string;
  surfaceColor: string;
  surfaceElevated: string;
  surfaceGlass: string;
  inputBackground: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  // Borders & effects
  borderColor: string;
  glowAccent: string;
  gradientStart: string;
  gradientEnd: string;
  // Meta
  fontFamily: string;
  borderRadius: number;
  isDark: boolean;
}

// ── Coral Bank – Monzo-inspired design system ──
const DARK_THEME: AppTheme = {
  primaryColor: '#14233C',           // Monzo deep navy
  secondaryColor: '#1C2F4A',
  accentColor: '#F35B54',            // Monzo hot coral
  successColor: '#10B981',
  warningColor: '#E9AD3C',           // Monzo warm yellow
  dangerColor: '#EF4444',
  backgroundColor: '#0D1929',
  surfaceColor: '#14233C',
  surfaceElevated: '#1C2F4A',
  surfaceGlass: 'rgba(20, 35, 60, 0.8)',
  inputBackground: '#1C2F4A',
  textPrimary: '#F7F7F8',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  borderColor: 'rgba(51, 65, 85, 0.5)',
  glowAccent: 'rgba(243, 91, 84, 0.2)',
  gradientStart: '#14233C',
  gradientEnd: '#1C2F4A',
  fontFamily: 'System',
  borderRadius: 14,
  isDark: true,
};

const LIGHT_THEME: AppTheme = {
  primaryColor: '#14233C',           // Monzo deep navy
  secondaryColor: '#1C2F4A',
  accentColor: '#F35B54',            // Monzo hot coral
  successColor: '#059669',
  warningColor: '#D97706',
  dangerColor: '#DC2626',
  backgroundColor: '#F7F7F8',        // Monzo soft white
  surfaceColor: '#FFFFFF',
  surfaceElevated: '#F1F2F4',
  surfaceGlass: 'rgba(255, 255, 255, 0.9)',
  inputBackground: '#FFFFFF',
  textPrimary: '#14233C',            // Navy text
  textSecondary: '#4A5568',
  textTertiary: '#94A3B8',
  borderColor: 'rgba(203, 213, 225, 0.5)',
  glowAccent: 'rgba(243, 91, 84, 0.1)',
  gradientStart: '#14233C',          // Navy gradient
  gradientEnd: '#243B5C',
  fontFamily: 'System',
  borderRadius: 14,
  isDark: false,
};

interface ThemeContextType {
  theme: AppTheme;
  themeMode: ThemeMode;
  autoSwitch: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAutoSwitch: (enabled: boolean) => void;
  refreshTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: LIGHT_THEME,
  themeMode: 'light',
  autoSwitch: false,
  toggleTheme: () => {},
  setThemeMode: () => {},
  setAutoSwitch: () => {},
  refreshTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function getThemeForMode(mode: ThemeMode): AppTheme {
  return mode === 'dark' ? DARK_THEME : LIGHT_THEME;
}

function getAutoMode(): ThemeMode {
  const hour = new Date().getHours();
  return (hour >= 18 || hour < 6) ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [autoSwitch, setAutoSwitchState] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(LIGHT_THEME);

  // Time-based auto-switching
  useEffect(() => {
    if (!autoSwitch) return;
    const check = () => {
      const autoMode = getAutoMode();
      setThemeModeState(autoMode);
      setTheme(getThemeForMode(autoMode));
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [autoSwitch]);

  const toggleTheme = useCallback(() => {
    const newMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeModeState(newMode);
    setTheme(getThemeForMode(newMode));
    if (autoSwitch) setAutoSwitchState(false);
  }, [themeMode, autoSwitch]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    setTheme(getThemeForMode(mode));
  }, []);

  const setAutoSwitch = useCallback((enabled: boolean) => {
    setAutoSwitchState(enabled);
    if (enabled) {
      const autoMode = getAutoMode();
      setThemeModeState(autoMode);
      setTheme(getThemeForMode(autoMode));
    }
  }, []);

  // Try to load backend theme (optional override)
  const refreshTheme = useCallback(async () => {
    try {
      const active = await api.getActiveTheme();
      if (active?.designTokens) {
        const tokens = active.designTokens;
        setTheme(prev => ({
          ...prev,
          ...tokens,
          borderRadius: parseInt(tokens.borderRadius) || 12,
        }));
      }
    } catch {
      // 403 for non-admin users — use local theme
    }
  }, []);

  useEffect(() => { refreshTheme(); }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, autoSwitch, toggleTheme, setThemeMode, setAutoSwitch, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
