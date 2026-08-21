import React, { createContext, useContext, useMemo } from 'react';
import { DarkTheme, DefaultTheme, Theme as NavTheme } from '@react-navigation/native';
import { useSettingsStore } from '@/store/useSettingsStore';

export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
}

const lightPalette: Palette = {
  background: '#f6f8f5',
  surface: '#ffffff',
  surfaceAlt: '#eef3ec',
  border: '#e2e8e0',
  text: '#14211a',
  textMuted: '#5f7267',
  primary: '#166534',
  primaryDark: '#14532d',
  primarySoft: '#dcf0e2',
  accent: '#b98a2f',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
};

const darkPalette: Palette = {
  background: '#0c120e',
  surface: '#161f19',
  surfaceAlt: '#1d2921',
  border: '#28352c',
  text: '#eef4ef',
  textMuted: '#9db3a4',
  primary: '#4ade80',
  primaryDark: '#22c55e',
  primarySoft: '#173324',
  accent: '#d9a94a',
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#f87171',
};

interface ThemeContextValue {
  isDark: boolean;
  palette: Palette;
  navTheme: NavTheme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>(null as unknown as ThemeContextValue);

function toNavTheme(p: Palette, dark: boolean): NavTheme {
  return {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme : DefaultTheme).colors,
      primary: p.primary,
      background: p.background,
      card: p.surface,
      text: p.text,
      border: p.border,
      notification: p.accent,
    },
  };
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mode = useSettingsStore((s) => s.themeMode);
  const toggle = useSettingsStore((s) => s.toggleTheme);
  const isDark = mode === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      palette: isDark ? darkPalette : lightPalette,
      navTheme: toNavTheme(isDark ? darkPalette : lightPalette, isDark),
      toggle,
    }),
    [isDark, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
