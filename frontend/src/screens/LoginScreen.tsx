import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getGlassStyle, getGlowShadow, getInputStyle, getGradientStyle, typography } from '../utils/styles';
import AlertModal, { useAlert } from '../components/AlertModal';

export default function LoginScreen() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { alert, showAlert, hideAlert } = useAlert();

  async function handleLogin() {
    if (!username || !password) {
      showAlert('warning', 'Required', 'Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
    } catch (e: any) {
      const msg = e.message || 'Invalid credentials';
      showAlert('error', 'Login Failed', msg);
    } finally { setLoading(false); }
  }

  const gradientBg = Platform.OS === 'web'
    ? { background: getGradientStyle(theme.gradientStart, theme.gradientEnd) }
    : {};
  const glassCardStyle = Platform.OS === 'web' ? getGlassStyle(theme) : {};
  const buttonGlow = Platform.OS === 'web' ? getGlowShadow(theme.accentColor, 0.8) : {};

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundColor }, gradientBg]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>C</Text>
          </View>
          <Text style={[styles.logo, { color: theme.textPrimary }]}>coral<Text style={{ color: theme.accentColor }}>bank</Text></Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Digital Banking Platform</Text>
      </View>

      <View style={[
        styles.card,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.borderColor,
        },
        Platform.OS === 'web' && glassCardStyle,
      ]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Sign In</Text>

        <View style={[
          styles.inputWrapper,
          Platform.OS === 'web' && getInputStyle(theme, usernameFocused),
        ]}>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.textPrimary,
                borderBottomColor: usernameFocused ? theme.accentColor : theme.borderColor,
              },
            ]}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            onFocus={() => setUsernameFocused(true)}
            onBlur={() => setUsernameFocused(false)}
            autoCapitalize="none"
            placeholderTextColor={theme.textTertiary}
          />
        </View>

        <View style={[
          styles.inputWrapper,
          Platform.OS === 'web' && getInputStyle(theme, passwordFocused),
        ]}>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.textPrimary,
                borderBottomColor: passwordFocused ? theme.accentColor : theme.borderColor,
              },
            ]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            secureTextEntry
            placeholderTextColor={theme.textTertiary}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.accentColor,
              opacity: loading ? 0.6 : 1,
            },
            Platform.OS === 'web' && buttonGlow,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: '#FFF' }]}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.demoBox, { borderTopColor: theme.borderColor }]}>
          <Text style={[styles.demoTitle, { color: theme.textSecondary }]}>Demo Credentials</Text>
          {[
            { user: 'teller1', role: 'Teller (Maker)' },
            { user: 'supervisor1', role: 'Supervisor (Checker)' },
            { user: 'manager1', role: 'Branch Manager' },
            { user: 'admin1', role: 'System Admin' },
            { user: 'auditor1', role: 'Auditor' },
          ].map(d => (
            <TouchableOpacity
              key={d.user}
              style={[
                styles.demoChip,
                { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor },
              ]}
              onPress={() => { setUsername(d.user); setPassword('demo123'); }}
            >
              <Text style={[styles.demoUser, { color: theme.accentColor }]}>{d.user}</Text>
              <Text style={[styles.demoRole, { color: theme.textTertiary }]}>{d.role}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[styles.demoPass, { color: theme.textTertiary }]}>Password for all: demo123</Text>
        </View>
      </View>
      <AlertModal alert={alert} onClose={hideAlert} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: Platform.OS === 'web' ? '100vh' as any : undefined,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F35B54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMarkText: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
  },
  logo: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    padding: 36,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 40px rgba(243, 91, 84, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 10,
      },
    }),
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
  },
  inputWrapper: {
    marginBottom: 18,
  },
  input: {
    borderBottomWidth: 2,
    padding: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    fontWeight: '700',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  demoBox: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  demoChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 6,
  },
  demoUser: {
    fontWeight: '600',
    fontSize: 13,
  },
  demoRole: {
    fontSize: 12,
  },
  demoPass: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 11,
  },
});
