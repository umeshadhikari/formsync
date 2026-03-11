import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';

export default function AdminPanel({ navigation }: any) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'themes'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    try {
      if (activeTab === 'users') setUsers(await api.getUsers());
      if (activeTab === 'roles') setRoles(await api.getRoles());
      if (activeTab === 'themes') setThemes(await api.getThemes());
    } catch {}
  }

  async function activateTheme(id: number) {
    try {
      await api.activateTheme(id);
      Alert.alert('Success', 'Theme activated. Restart app to see changes.');
      loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.surfaceColor }]}>
        {(['users', 'roles', 'themes'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && { borderBottomColor: theme.primaryColor, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && { color: theme.primaryColor, fontWeight: '700' }]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Nav */}
      <TouchableOpacity style={[styles.navCard, { backgroundColor: theme.surfaceColor }]} onPress={() => navigation.navigate('WorkflowConfig')}>
        <Ionicons name="git-branch" size={24} color={theme.accentColor} />
        <View style={styles.navCardContent}>
          <Text style={[styles.navCardTitle, { color: theme.textPrimary }]}>Workflow Rules</Text>
          <Text style={[styles.navCardDesc, { color: theme.textSecondary }]}>Configure approval tiers and routing</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      {/* Users */}
      {activeTab === 'users' && users.map(u => (
        <View key={u.id} style={[styles.card, { backgroundColor: theme.surfaceColor }]}>
          <View style={styles.cardRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primaryColor + '20' }]}>
              <Text style={[styles.avatarText, { color: theme.primaryColor }]}>{u.fullName?.charAt(0)}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: theme.textPrimary }]}>{u.fullName}</Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{u.username} | {u.role} | {u.branchCode}</Text>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: u.isActive ? theme.successColor : theme.dangerColor }]} />
          </View>
        </View>
      ))}

      {/* Roles */}
      {activeTab === 'roles' && roles.map(r => (
        <View key={r.id} style={[styles.card, { backgroundColor: theme.surfaceColor }]}>
          <Text style={[styles.cardName, { color: theme.textPrimary }]}>{r.bankRole} → {r.formsyncRole}</Text>
          <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
            Permissions: {r.permissions?.join(', ')}
          </Text>
        </View>
      ))}

      {/* Themes */}
      {activeTab === 'themes' && themes.map(t => (
        <View key={t.id} style={[styles.card, { backgroundColor: theme.surfaceColor }]}>
          <View style={styles.cardRow}>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: theme.textPrimary }]}>{t.name}</Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Bank: {t.bankId}</Text>
            </View>
            {t.isActive ? (
              <View style={[styles.activeBadge, { backgroundColor: theme.successColor + '20' }]}>
                <Text style={{ color: theme.successColor, fontSize: 11, fontWeight: '700' }}>Active</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.activateBtn, { borderColor: theme.primaryColor }]} onPress={() => activateTheme(t.id)}>
                <Text style={{ color: theme.primaryColor, fontSize: 11, fontWeight: '600' }}>Activate</Text>
              </TouchableOpacity>
            )}
          </View>
          {t.designTokens && (
            <View style={styles.colorRow}>
              {Object.entries(t.designTokens).filter(([k]) => k.includes('Color')).map(([k, v]) => (
                <View key={k} style={[styles.colorSwatch, { backgroundColor: v as string }]} />
              ))}
            </View>
          )}
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 14, color: '#888' },
  navCard: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, padding: 16, borderRadius: 12, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  navCardContent: { flex: 1 },
  navCardTitle: { fontSize: 15, fontWeight: '600' },
  navCardDesc: { fontSize: 12, marginTop: 2 },
  card: { margin: 16, marginBottom: 8, borderRadius: 10, padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600' },
  cardSub: { fontSize: 11, marginTop: 3 },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  activeBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  activateBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  colorRow: { flexDirection: 'row', marginTop: 8, gap: 6 },
  colorSwatch: { width: 24, height: 24, borderRadius: 4, borderWidth: 0.5, borderColor: '#DDD' },
});
