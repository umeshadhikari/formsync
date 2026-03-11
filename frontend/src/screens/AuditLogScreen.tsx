import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { AuditLog } from '../types';
import api from '../api/client';

export default function AuditLogScreen() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');

  async function loadLogs() {
    try {
      const params: Record<string, string> = { size: '100' };
      if (entityTypeFilter) params.entityType = entityTypeFilter;
      const data = await api.getAuditLogs(params);
      setLogs(data.content || []);
    } catch {}
  }

  useEffect(() => { loadLogs(); }, [entityTypeFilter]);

  const onRefresh = async () => { setRefreshing(true); await loadLogs(); setRefreshing(false); };

  const filtered = logs.filter(l =>
    !filter || l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.actorId?.toLowerCase().includes(filter.toLowerCase()) ||
    l.entityId?.toLowerCase().includes(filter.toLowerCase())
  );

  const entityTypes = ['', 'FORM_INSTANCE', 'FORM_TEMPLATE', 'WORKFLOW'];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <View style={[styles.filterBar, { backgroundColor: theme.surfaceColor }]}>
        <TextInput style={[styles.searchInput, { borderColor: '#DDD' }]} placeholder="Search logs..." value={filter} onChangeText={setFilter} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {entityTypes.map(et => (
            <TouchableOpacity key={et} style={[styles.filterChip, entityTypeFilter === et && { backgroundColor: theme.primaryColor }]}
              onPress={() => setEntityTypeFilter(et)}>
              <Text style={[styles.filterChipText, entityTypeFilter === et && { color: '#FFF' }]}>{et || 'All'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {filtered.map(log => (
          <View key={log.id} style={[styles.logCard, { backgroundColor: theme.surfaceColor }]}>
            <View style={styles.logHeader}>
              <View style={[styles.actionBadge, { backgroundColor: getActionColor(log.action) + '20' }]}>
                <Text style={[styles.actionText, { color: getActionColor(log.action) }]}>{log.action}</Text>
              </View>
              <Text style={[styles.logTime, { color: theme.textSecondary }]}>{new Date(log.createdAt).toLocaleString()}</Text>
            </View>
            <Text style={[styles.logEntity, { color: theme.textPrimary }]}>{log.entityType} #{log.entityId}</Text>
            <Text style={[styles.logActor, { color: theme.textSecondary }]}>
              By: {log.actorName || log.actorId} ({log.actorRole}) {log.branchCode ? `| Branch: ${log.branchCode}` : ''}
            </Text>
            {log.details && <Text style={[styles.logDetails, { color: theme.textSecondary }]}>{JSON.stringify(log.details)}</Text>}
          </View>
        ))}
        {filtered.length === 0 && <Text style={[styles.empty, { color: theme.textSecondary }]}>No audit logs found</Text>}
      </ScrollView>
    </View>
  );
}

function getActionColor(action: string): string {
  if (action.includes('SUBMIT') || action.includes('CREAT')) return '#27AE60';
  if (action.includes('APPROV')) return '#27AE60';
  if (action.includes('REJECT')) return '#E74C3C';
  if (action.includes('RETURN')) return '#F39C12';
  return '#3498DB';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { padding: 12, gap: 8 },
  searchInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 8 },
  filterChip: { borderWidth: 1, borderColor: '#DDD', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
  filterChipText: { fontSize: 12 },
  logCard: { margin: 12, marginBottom: 4, borderRadius: 10, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  actionBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  actionText: { fontSize: 10, fontWeight: '700' },
  logTime: { fontSize: 10 },
  logEntity: { fontSize: 13, fontWeight: '600' },
  logActor: { fontSize: 11, marginTop: 4 },
  logDetails: { fontSize: 10, marginTop: 4, fontFamily: 'monospace' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
