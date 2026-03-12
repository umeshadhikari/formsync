import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, themeMode, autoSwitch, toggleTheme, setAutoSwitch } = useTheme();

  return (
    <View style={styles.container}>
      {/* Auto toggle */}
      <TouchableOpacity
        style={[
          styles.autoPill,
          { borderColor: autoSwitch ? theme.accentColor : theme.borderColor, backgroundColor: autoSwitch ? theme.accentColor + '15' : 'transparent' },
        ]}
        onPress={() => setAutoSwitch(!autoSwitch)}
        activeOpacity={0.7}
      >
        <Text style={[styles.autoText, { color: autoSwitch ? theme.accentColor : theme.textTertiary }]}>
          Auto
        </Text>
      </TouchableOpacity>
      {/* Mode toggle */}
      <TouchableOpacity
        style={[
          styles.toggleBtn,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: theme.borderColor,
            ...(Platform.OS === 'web' ? { boxShadow: theme.isDark ? '0 0 12px rgba(243, 91, 84, 0.12)' : '0 1px 4px rgba(0,0,0,0.08)' } as any : {}),
          },
        ]}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>{themeMode === 'dark' ? '🌙' : '☀️'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  autoPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  autoText: { fontSize: 12, fontWeight: '600' },
  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { fontSize: 18 },
});
