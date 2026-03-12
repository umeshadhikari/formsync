import { Platform, ViewStyle, TextStyle } from 'react-native';
import { AppTheme } from '../context/ThemeContext';

/** Glass-morphism card style */
export function getGlassStyle(theme: AppTheme): ViewStyle {
  const base: ViewStyle = {
    backgroundColor: theme.surfaceGlass,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    borderRadius: theme.borderRadius,
  };
  if (Platform.OS === 'web') {
    return {
      ...base,
      // @ts-ignore — web-only CSS property
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    } as any;
  }
  return base;
}

/** Glow box-shadow for web, fallback shadow for native */
export function getGlowShadow(color: string, intensity: number = 1): ViewStyle {
  if (Platform.OS === 'web') {
    const spread = Math.round(20 * intensity);
    return {
      // @ts-ignore
      boxShadow: `0 0 ${spread}px ${color}`,
    } as any;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4 * intensity,
    shadowRadius: 12 * intensity,
    elevation: 6,
  };
}

/** Elevation shadow system — low / medium / high */
export function getElevation(level: 'low' | 'medium' | 'high', theme: AppTheme): ViewStyle {
  if (Platform.OS === 'web') {
    const shadows: Record<string, string> = theme.isDark
      ? {
          low: '0 2px 8px rgba(0,0,0,0.3)',
          medium: '0 4px 16px rgba(0,0,0,0.4)',
          high: '0 8px 32px rgba(0,0,0,0.5)',
        }
      : {
          low: '0 1px 4px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
          medium: '0 2px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
          high: '0 4px 12px rgba(0,0,0,0.1), 0 8px 32px rgba(0,0,0,0.08)',
        };
    return { boxShadow: shadows[level] } as any;
  }
  const configs = {
    low: { shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    medium: { shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    high: { shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  };
  const c = configs[level];
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: c.shadowOpacity,
    shadowRadius: c.shadowRadius,
    elevation: c.elevation,
  };
}

/** CSS linear-gradient string for web backgrounds */
export function getGradientStyle(startColor: string, endColor: string, angle: number = 135): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      // @ts-ignore
      background: `linear-gradient(${angle}deg, ${startColor}, ${endColor})`,
    } as any;
  }
  return { backgroundColor: startColor };
}

/** Modern input style */
export function getInputStyle(theme: AppTheme, focused?: boolean, error?: boolean): ViewStyle {
  const base: ViewStyle = {
    backgroundColor: theme.inputBackground,
    borderWidth: 1.5,
    borderColor: error ? theme.dangerColor : focused ? theme.accentColor : theme.borderColor,
    borderRadius: theme.borderRadius,
    padding: 14,
  };
  if (Platform.OS === 'web' && focused && !error) {
    return {
      ...base,
      ...getGlowShadow(theme.glowAccent, 0.6),
    };
  }
  return base;
}

/** Status color with glow for dark mode */
export function getStatusGlow(color: string, theme: AppTheme): ViewStyle {
  if (theme.isDark && Platform.OS === 'web') {
    return {
      // @ts-ignore
      boxShadow: `0 0 12px ${color}40`,
    } as any;
  }
  return {};
}

/** Modern text styles */
export const typography = {
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 } as TextStyle,
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 } as TextStyle,
  h3: { fontSize: 18, fontWeight: '700' } as TextStyle,
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 } as TextStyle,
  bodyBold: { fontSize: 14, fontWeight: '600' } as TextStyle,
  caption: { fontSize: 12, fontWeight: '500' } as TextStyle,
  small: { fontSize: 11, fontWeight: '500' } as TextStyle,
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' } as TextStyle,
};
