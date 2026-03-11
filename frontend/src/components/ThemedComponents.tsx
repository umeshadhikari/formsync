import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function ThemedButton({ title, onPress, variant = 'primary', disabled, style, icon }: ThemedButtonProps) {
  const { theme } = useTheme();
  const colorMap = {
    primary: theme.primaryColor,
    secondary: theme.secondaryColor,
    danger: theme.dangerColor,
    success: theme.successColor,
    outline: 'transparent',
  };
  const bg = colorMap[variant];
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: bg, borderWidth: isOutline ? 1.5 : 0, borderColor: theme.primaryColor, opacity: disabled ? 0.5 : 1 }, style]}
      onPress={onPress} disabled={disabled}>
      {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
      <Text style={[styles.buttonText, { color: isOutline ? theme.primaryColor : '#FFF' }]}>{title}</Text>
    </TouchableOpacity>
  );
}

interface ThemedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function ThemedCard({ children, style, onPress }: ThemedCardProps) {
  const { theme } = useTheme();
  const card = (
    <View style={[styles.card, { backgroundColor: theme.surfaceColor }, style]}>
      {children}
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress}>{card}</TouchableOpacity> : card;
}

interface ThemedInputProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  editable?: boolean;
  keyboardType?: any;
  secureTextEntry?: boolean;
}

export function ThemedInput({ label, value, onChangeText, placeholder, error, multiline, editable = true, keyboardType, secureTextEntry }: ThemedInputProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: theme.textPrimary, borderColor: error ? theme.dangerColor : theme.textSecondary + '40', backgroundColor: editable ? theme.surfaceColor : theme.backgroundColor }, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.textSecondary + '80'}
        multiline={multiline} editable={editable} keyboardType={keyboardType} secureTextEntry={secureTextEntry} />
      {error && <Text style={[styles.errorText, { color: theme.dangerColor }]}>{error}</Text>}
    </View>
  );
}

interface ThemedBadgeProps {
  label: string;
  color: string;
  style?: ViewStyle;
}

export function ThemedBadge({ label, color, style }: ThemedBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '18' }, style]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

interface ThemedHeaderProps {
  title: string;
  subtitle?: string;
}

export function ThemedHeader({ title, subtitle }: ThemedHeaderProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: theme.primaryColor }]}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20 },
  buttonText: { fontWeight: '700', fontSize: 15 },
  card: { borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, marginBottom: 12 },
  inputContainer: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 8, padding: 12, fontSize: 15 },
  errorText: { fontSize: 11, marginTop: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#FFFFFF90', fontSize: 13, marginTop: 4 },
});
