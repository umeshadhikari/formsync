import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username || !password) { Alert.alert('Error', 'Please enter username and password'); return; }
    setLoading(true);
    try {
      await login(username, password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials');
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.primaryColor }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Text style={styles.logo}>FORMSYNC</Text>
        <Text style={styles.subtitle}>Bank Digital Form Platform</Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.surfaceColor }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Sign In</Text>
        <TextInput style={[styles.input, { borderColor: theme.accentColor }]} placeholder="Username" value={username}
          onChangeText={setUsername} autoCapitalize="none" placeholderTextColor={theme.textSecondary} />
        <TextInput style={[styles.input, { borderColor: theme.accentColor }]} placeholder="Password" value={password}
          onChangeText={setPassword} secureTextEntry placeholderTextColor={theme.textSecondary} />
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.primaryColor, opacity: loading ? 0.6 : 1 }]}
          onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>
        <View style={styles.demoBox}>
          <Text style={[styles.demoTitle, { color: theme.textSecondary }]}>Demo Credentials</Text>
          {[
            { user: 'teller1', role: 'Teller (Maker)' },
            { user: 'supervisor1', role: 'Supervisor (Checker)' },
            { user: 'manager1', role: 'Branch Manager' },
            { user: 'admin1', role: 'System Admin' },
            { user: 'auditor1', role: 'Auditor' },
          ].map(d => (
            <TouchableOpacity key={d.user} style={styles.demoRow} onPress={() => { setUsername(d.user); setPassword('demo123'); }}>
              <Text style={[styles.demoUser, { color: theme.accentColor }]}>{d.user}</Text>
              <Text style={[styles.demoRole, { color: theme.textSecondary }]}>{d.role}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[styles.demoPass, { color: theme.textSecondary }]}>Password for all: demo123</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  logo: { fontSize: 36, fontWeight: '800', color: '#FFF', letterSpacing: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  card: { width: '100%', maxWidth: 420, borderRadius: 16, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1.5, borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 16 },
  button: { borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  demoBox: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  demoTitle: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  demoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  demoUser: { fontWeight: '600', fontSize: 13 },
  demoRole: { fontSize: 12 },
  demoPass: { textAlign: 'center', marginTop: 8, fontSize: 11 },
});
