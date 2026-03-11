import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { JOURNEY_TYPES, DashboardStats, FormTemplate } from '../types';
import api from '../api/client';

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentForms, setRecentForms] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [tpls, dashboard, myForms] = await Promise.all([
        api.getTemplates(),
        api.getDashboard().catch(() => null),
        api.getMyForms(0, 5).catch(() => ({ content: [] })),
      ]);
      setTemplates(tpls);
      if (dashboard) setStats(dashboard);
      setRecentForms(myForms.content || []);
    } catch (e: any) {
      if (e.message === 'Session expired') logout();
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const openJourney = (journeyType: string) => {
    const tpl = templates.find(t => t.journeyType === journeyType);
    if (tpl) {
      navigation.navigate('FormEntry', { template: tpl });
    } else {
      Alert.alert('No Template', `No published template found for ${JOURNEY_TYPES[journeyType]?.label}`);
    }
  };

  const journeyKeys = Object.keys(JOURNEY_TYPES);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primaryColor} />}>

      {/* Welcome Banner */}
      <View style={[styles.banner, { backgroundColor: theme.primaryColor }]}>
        <View style={styles.bannerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.fullName}</Text>
            <Text style={styles.userRole}>{user?.role} | Branch: {user?.branchCode}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsRow}>
          {[
            { label: 'Total Forms', value: stats.totalForms, color: theme.accentColor, icon: 'documents' },
            { label: 'Pending', value: stats.pendingApproval, color: theme.warningColor, icon: 'hourglass' },
            { label: 'Completed', value: stats.approvedToday, color: theme.successColor, icon: 'checkmark-circle' },
            { label: 'Rejected', value: stats.rejectedToday, color: theme.dangerColor, icon: 'close-circle' },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: theme.surfaceColor }]}>
              <Ionicons name={s.icon as any} size={24} color={s.color} />
              <Text style={[styles.statValue, { color: theme.textPrimary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Journey Tiles */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Select Journey</Text>
      <View style={styles.journeyGrid}>
        {journeyKeys.map(key => {
          const j = JOURNEY_TYPES[key];
          const hasTpl = templates.some(t => t.journeyType === key);
          return (
            <TouchableOpacity key={key} style={[styles.journeyTile, { backgroundColor: theme.surfaceColor, opacity: hasTpl ? 1 : 0.5 }]}
              onPress={() => openJourney(key)} disabled={!hasTpl}>
              <View style={[styles.journeyIcon, { backgroundColor: j.color + '20' }]}>
                <Ionicons name={j.icon as any} size={28} color={j.color} />
              </View>
              <Text style={[styles.journeyLabel, { color: theme.textPrimary }]} numberOfLines={2}>{j.label}</Text>
              {!hasTpl && <Text style={[styles.noTemplate, { color: theme.textSecondary }]}>No template</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Recent Forms */}
      {recentForms.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Submissions</Text>
          {recentForms.map((form: any) => (
            <TouchableOpacity key={form.id} style={[styles.recentCard, { backgroundColor: theme.surfaceColor }]}
              onPress={() => navigation.navigate('FormEntry', { formId: form.id, viewMode: true })}>
              <View style={styles.recentRow}>
                <Text style={[styles.recentRef, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(form.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(form.status) }]}>{form.status}</Text>
                </View>
              </View>
              <Text style={[styles.recentJourney, { color: theme.textSecondary }]}>
                {JOURNEY_TYPES[form.journeyType]?.label} | {form.currency} {form.amount?.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: '#95A5A6', PENDING_APPROVAL: '#F39C12', COMPLETED: '#27AE60',
    REJECTED: '#E74C3C', RETURNED: '#9B59B6', FAILED: '#C0392B',
  };
  return colors[status] || '#95A5A6';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { padding: 24, paddingTop: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  bannerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  userName: { color: '#FFF', fontSize: 22, fontWeight: '700', marginTop: 2 },
  userRole: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
  logoutBtn: { padding: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { flex: 1, minWidth: 70, borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  journeyGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  journeyTile: { width: '22%', minWidth: 80, borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  journeyIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  journeyLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  noTemplate: { fontSize: 9, marginTop: 2 },
  recentCard: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  recentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recentRef: { fontWeight: '600', fontSize: 14 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  recentJourney: { fontSize: 12, marginTop: 4 },
});
