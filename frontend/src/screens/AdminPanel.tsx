import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '../components/Icon';
import { useTheme } from '../context/ThemeContext';
import { getGlassStyle, getGlowShadow, getElevation } from '../utils/styles';
import api from '../api/client';
import AlertModal, { useAlert } from '../components/AlertModal';
import WorkflowConfigScreen from './WorkflowConfigScreen';

// ── Role metadata for rich display ──
const ROLE_META: Record<string, { icon: string; color: string; description: string }> = {
  MAKER:          { icon: 'create-outline',       color: '#10B981', description: 'Creates and submits banking forms' },
  SENIOR_MAKER:   { icon: 'ribbon-outline',       color: '#3B82F6', description: 'Creates forms with Tier 1 approval authority' },
  CHECKER:        { icon: 'checkmark-circle-outline', color: '#8B5CF6', description: 'Reviews and approves submitted forms' },
  BRANCH_MANAGER: { icon: 'business-outline',     color: '#F59E0B', description: 'Full branch authority with Tier 3 approval' },
  OPS_ADMIN:      { icon: 'speedometer-outline',  color: '#EF4444', description: 'Operations oversight and SLA monitoring' },
  SYSTEM_ADMIN:   { icon: 'settings-outline',     color: '#EC4899', description: 'Full system configuration and management' },
  AUDITOR:        { icon: 'eye-outline',           color: '#6366F1', description: 'Read-only audit and compliance access' },
};

// ── Permission display helpers ──
const PERM_ICONS: Record<string, string> = {
  FORM_CREATE: 'add-circle-outline',
  FORM_SUBMIT: 'send-outline',
  FORM_VIEW_OWN: 'document-outline',
  FORM_VIEW_BRANCH: 'documents-outline',
  APPROVE_TIER1: 'checkmark-outline',
  APPROVE_TIER2: 'checkmark-done-outline',
  APPROVE_TIER3: 'shield-checkmark-outline',
  QUEUE_VIEW: 'list-outline',
  BULK_APPROVE: 'layers-outline',
  BRANCH_CONFIG: 'construct-outline',
  DELEGATION: 'people-outline',
  DASHBOARD_ALL: 'analytics-outline',
  SLA_MONITOR: 'timer-outline',
  ESCALATION_OVERRIDE: 'alert-circle-outline',
  CROSS_BRANCH: 'globe-outline',
  FORM_BUILDER: 'hammer-outline',
  WORKFLOW_CONFIG: 'swap-horizontal-outline',
  THEME_MANAGE: 'color-palette-outline',
  USER_MANAGE: 'person-add-outline',
  ROLE_MAPPING: 'key-outline',
  AUDIT_VIEW: 'search-outline',
  COMPLIANCE_REPORT: 'document-text-outline',
};

function formatPermission(perm: string): string {
  return perm.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdminPanel({ navigation }: any) {
  const { theme, toggleTheme, themeMode, autoSwitch, setAutoSwitch } = useTheme();
  const { alert, showAlert, hideAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'rules' | 'themes'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'users') {
        const res = await api.getUsers();
        setUsers(res?.content || res || []);
      }
      if (activeTab === 'roles') {
        const res = await api.getRoles();
        setRoles(res?.content || res || []);
      }
      if (activeTab === 'themes') {
        const res = await api.getThemes();
        setThemes(res?.content || res || []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function activateTheme(id: number) {
    try {
      await api.activateTheme(id);
      showAlert('success', 'Success', 'Theme activated. Restart app to see changes.');
      loadData();
    } catch (e: any) { showAlert('error', 'Error', e.message); }
  }

  // ── Role stats ──
  const roleStats = useMemo(() => {
    const total = roles.length;
    const totalPerms = new Set(roles.flatMap(r => r.permissions || [])).size;
    return { total, totalPerms };
  }, [roles]);

  const tabBar = (
    <View style={[styles.tabBar, getGlassStyle(theme), { borderBottomColor: theme.borderColor }]}>
      {([
        { key: 'users', label: 'Users', icon: 'people-outline' },
        { key: 'roles', label: 'Roles', icon: 'key-outline' },
        { key: 'rules', label: 'Workflow Rules', icon: 'swap-horizontal-outline' },
        { key: 'themes', label: 'Themes', icon: 'color-palette-outline' },
      ] as const).map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && { borderBottomColor: theme.accentColor, borderBottomWidth: 3 }]}
          onPress={() => setActiveTab(tab.key as any)}
          activeOpacity={0.7}>
          <View style={styles.tabInner}>
            <Ionicons name={tab.icon as any} size={15} color={activeTab === tab.key ? theme.accentColor : theme.textTertiary} />
            <Text style={[styles.tabText, { color: theme.textTertiary }, activeTab === tab.key && { color: theme.accentColor, fontWeight: '700' }]}>
              {tab.label}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Workflow Rules tab renders its own ScrollView, so don't nest in another one
  if (activeTab === 'rules') {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
        {tabBar}
        <WorkflowConfigScreen />
        <AlertModal alert={alert} onClose={hideAlert} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {tabBar}

      {/* Loading State */}
      {loading && (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={theme.accentColor} />
          <Text style={[styles.centerStateText, { color: theme.textSecondary }]}>Loading...</Text>
        </View>
      )}

      {/* Error State */}
      {!loading && error && (
        <View style={[styles.errorCard, getGlassStyle(theme), { borderColor: theme.dangerColor + '40' }]}>
          <Ionicons name="alert-circle" size={32} color={theme.dangerColor} />
          <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>Failed to load {activeTab}</Text>
          <Text style={[styles.errorMsg, { color: theme.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.accentColor }]} onPress={loadData} activeOpacity={0.7}>
            <Ionicons name="refresh" size={16} color="#FFF" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Users */}
      {!loading && !error && activeTab === 'users' && (
        <>
          {users.length === 0 && (
            <View style={styles.centerState}>
              <Ionicons name="people-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.centerStateTitle, { color: theme.textPrimary }]}>No users found</Text>
              <Text style={[styles.centerStateText, { color: theme.textSecondary }]}>User accounts will appear here</Text>
            </View>
          )}
          {users.map(u => (
            <View key={u.id} style={[styles.card, getGlassStyle(theme), getElevation(1, theme)]}>
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: theme.primaryColor + '25', borderWidth: 2, borderColor: theme.primaryColor + '40' }]}>
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
        </>
      )}

      {/* Roles */}
      {!loading && !error && activeTab === 'roles' && (
        <>
          {roles.length === 0 && (
            <View style={styles.centerState}>
              <Ionicons name="key-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.centerStateTitle, { color: theme.textPrimary }]}>No roles configured</Text>
              <Text style={[styles.centerStateText, { color: theme.textSecondary }]}>Role mappings will appear here once configured</Text>
            </View>
          )}

          {roles.length > 0 && (
            <>
              {/* Role Stats Row */}
              <View style={styles.statsRow}>
                <View style={[styles.statCard, getGlassStyle(theme), getElevation(1, theme)]}>
                  <Text style={[styles.statNumber, { color: theme.accentColor }]}>{roleStats.total}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Roles</Text>
                </View>
                <View style={[styles.statCard, getGlassStyle(theme), getElevation(1, theme)]}>
                  <Text style={[styles.statNumber, { color: theme.successColor }]}>{roleStats.totalPerms}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Permissions</Text>
                </View>
                <View style={[styles.statCard, getGlassStyle(theme), getElevation(1, theme)]}>
                  <Text style={[styles.statNumber, { color: theme.warningColor }]}>{roles.filter(r => r.isActive).length}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active</Text>
                </View>
              </View>

              {/* Role Cards */}
              {roles.map(r => {
                const meta = ROLE_META[r.formsyncRole] || { icon: 'shield-outline', color: '#6B7280', description: 'System role' };
                const perms = r.permissions || [];

                return (
                  <View key={r.id} style={[styles.roleCard, getGlassStyle(theme), getElevation(1, theme), { borderLeftColor: meta.color, borderLeftWidth: 4 }]}>
                    {/* Header */}
                    <View style={styles.roleHeader}>
                      <View style={[styles.roleIcon, { backgroundColor: meta.color + '15' }]}>
                        <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                      </View>
                      <View style={styles.roleHeaderInfo}>
                        <View style={styles.roleMapping}>
                          <Text style={[styles.bankRoleText, { color: theme.textPrimary }]}>{r.bankRole}</Text>
                          <Ionicons name="arrow-forward" size={14} color={theme.textTertiary} style={{ marginHorizontal: 6 }} />
                          <View style={[styles.systemRoleBadge, { backgroundColor: meta.color + '15' }]}>
                            <Text style={[styles.systemRoleText, { color: meta.color }]}>{r.formsyncRole}</Text>
                          </View>
                        </View>
                        <Text style={[styles.roleDesc, { color: theme.textTertiary }]}>{meta.description}</Text>
                      </View>
                      {r.isActive && (
                        <View style={[styles.activeChip, { backgroundColor: theme.successColor + '15' }]}>
                          <View style={[styles.activeDot, { backgroundColor: theme.successColor }]} />
                        </View>
                      )}
                    </View>

                    {/* Permissions */}
                    {perms.length > 0 && (
                      <View style={styles.permSection}>
                        <Text style={[styles.permSectionLabel, { color: theme.textTertiary }]}>
                          {perms.length} Permission{perms.length !== 1 ? 's' : ''}
                        </Text>
                        <View style={styles.permGrid}>
                          {perms.map((p: string) => (
                            <View key={p} style={[styles.permChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}>
                              <Ionicons name={(PERM_ICONS[p] || 'checkmark-outline') as any} size={12} color={meta.color} />
                              <Text style={[styles.permChipText, { color: theme.textSecondary }]}>{formatPermission(p)}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Scope info */}
                    {(r.branchScope || r.journeyScope) && (
                      <View style={[styles.scopeRow, { borderTopColor: theme.borderColor }]}>
                        {r.branchScope && (
                          <View style={styles.scopeItem}>
                            <Ionicons name="business-outline" size={12} color={theme.textTertiary} />
                            <Text style={[styles.scopeText, { color: theme.textTertiary }]}>Branch: {r.branchScope}</Text>
                          </View>
                        )}
                        {r.journeyScope && (
                          <View style={styles.scopeItem}>
                            <Ionicons name="map-outline" size={12} color={theme.textTertiary} />
                            <Text style={[styles.scopeText, { color: theme.textTertiary }]}>
                              Journeys: {Array.isArray(r.journeyScope) ? r.journeyScope.join(', ') : r.journeyScope}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </>
      )}

      {/* Themes with Dark/Light Mode Controls */}
      {!loading && !error && activeTab === 'themes' && (
        <>
          {/* Theme Mode Controls */}
          <View style={[styles.themeModeCard, getGlassStyle(theme), getElevation(1, theme)]}>
            <Text style={[styles.themeModeTitle, { color: theme.textPrimary }]}>Appearance Settings</Text>

            {/* Dark/Light Toggle */}
            <View style={styles.themeModeSection}>
              <Text style={[styles.themeModeLabel, { color: theme.textSecondary }]}>Current Mode</Text>
              <View style={styles.themeModeButtons}>
                <TouchableOpacity
                  style={[styles.themeModeBtn, { borderColor: theme.borderColor }, themeMode === 'dark' && { backgroundColor: theme.accentColor, borderColor: theme.accentColor }]}
                  onPress={() => toggleTheme('dark')}
                  activeOpacity={0.7}>
                  <Ionicons name="moon" size={16} color={themeMode === 'dark' ? '#FFF' : theme.textSecondary} />
                  <Text style={[styles.themeModeBtnText, { color: theme.textSecondary }, themeMode === 'dark' && { color: '#FFF', fontWeight: '700' }]}>Dark</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeModeBtn, { borderColor: theme.borderColor }, themeMode === 'light' && { backgroundColor: theme.accentColor, borderColor: theme.accentColor }]}
                  onPress={() => toggleTheme('light')}
                  activeOpacity={0.7}>
                  <Ionicons name="sunny" size={16} color={themeMode === 'light' ? '#FFF' : theme.textSecondary} />
                  <Text style={[styles.themeModeBtnText, { color: theme.textSecondary }, themeMode === 'light' && { color: '#FFF', fontWeight: '700' }]}>Light</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Auto Switch Toggle */}
            <View style={[styles.themeModeSection, { borderTopWidth: 1, borderTopColor: theme.borderColor, paddingTopVertical: 12 }]}>
              <View style={styles.autoSwitchRow}>
                <View>
                  <Text style={[styles.themeModeLabel, { color: theme.textSecondary }]}>Auto Switch</Text>
                  <Text style={[styles.autoSwitchDesc, { color: theme.textTertiary }]}>Follow system settings</Text>
                </View>
                <TouchableOpacity
                  style={[styles.autoSwitchToggle, autoSwitch && { backgroundColor: theme.successColor }]}
                  onPress={() => setAutoSwitch(!autoSwitch)}
                  activeOpacity={0.7}>
                  <View style={[styles.autoSwitchKnob, autoSwitch && { transform: [{ translateX: 20 }] }]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* App Themes */}
          {themes.length === 0 && !loading && (
            <View style={styles.centerState}>
              <Ionicons name="color-palette-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.centerStateTitle, { color: theme.textPrimary }]}>No themes available</Text>
              <Text style={[styles.centerStateText, { color: theme.textSecondary }]}>Custom themes will appear here</Text>
            </View>
          )}
          {themes.map(t => (
            <View key={t.id} style={[styles.card, getGlassStyle(theme), getElevation(1, theme)]}>
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: theme.textPrimary }]}>{t.name}</Text>
                  <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Bank: {t.bankId}</Text>
                </View>
                {t.isActive ? (
                  <View style={[styles.activeBadge, { backgroundColor: theme.successColor + '25' }]}>
                    <Text style={{ color: theme.successColor, fontSize: 11, fontWeight: '700' }}>Active</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.activateBtn, { borderColor: theme.accentColor }]} onPress={() => activateTheme(t.id)} activeOpacity={0.7}>
                    <Text style={{ color: theme.accentColor, fontSize: 11, fontWeight: '600' }}>Activate</Text>
                  </TouchableOpacity>
                )}
              </View>
              {t.designTokens && (
                <View style={styles.colorRow}>
                  {Object.entries(t.designTokens).filter(([k]) => k.includes('Color')).map(([k, v]) => (
                    <View key={k} style={[styles.colorSwatch, { backgroundColor: v as string, borderColor: theme.borderColor }]} />
                  ))}
                </View>
              )}
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
      <AlertModal alert={alert} onClose={hideAlert} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 4 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },

  // ── Loading / Error / Empty states ──
  centerState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  centerStateTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  centerStateText: { fontSize: 13, marginTop: 4 },
  errorCard: { margin: 16, padding: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 8 },
  errorTitle: { fontSize: 15, fontWeight: '600' },
  errorMsg: { fontSize: 12, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // ── Stats Row ──
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, gap: 8 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
  statNumber: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Cards ──
  card: { margin: 16, marginBottom: 8, borderRadius: 12, padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600' },
  cardSub: { fontSize: 11, marginTop: 3 },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },

  // ── Role Cards ──
  roleCard: { margin: 16, marginBottom: 8, borderRadius: 12, padding: 16 },
  roleHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  roleIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  roleHeaderInfo: { flex: 1 },
  roleMapping: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  bankRoleText: { fontSize: 15, fontWeight: '600' },
  systemRoleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  systemRoleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  roleDesc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  activeChip: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  activeDot: { width: 8, height: 8, borderRadius: 4 },

  // ── Permissions ──
  permSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 0 },
  permSectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  permGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  permChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  permChipText: { fontSize: 10, fontWeight: '600' },

  // ── Scope ──
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  scopeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scopeText: { fontSize: 11 },

  // ── Theme Mode ──
  themeModeCard: { margin: 16, marginBottom: 8, borderRadius: 12, padding: 16 },
  themeModeTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  themeModeSection: { paddingVertical: 12 },
  themeModeLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  themeModeButtons: { flexDirection: 'row', gap: 8 },
  themeModeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
  themeModeBtnText: { fontSize: 13, fontWeight: '600' },
  autoSwitchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  autoSwitchDesc: { fontSize: 11, marginTop: 2 },
  autoSwitchToggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', paddingHorizontal: 2 },
  autoSwitchKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF' },

  // ── Theme list ──
  activeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  activateBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  colorRow: { flexDirection: 'row', marginTop: 8, gap: 6 },
  colorSwatch: { width: 24, height: 24, borderRadius: 6, borderWidth: 0.5 },
});
