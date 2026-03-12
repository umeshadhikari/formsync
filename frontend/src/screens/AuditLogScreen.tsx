import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '../components/Icon';
import { useTheme } from '../context/ThemeContext';
import { AuditLog } from '../types';
import { getGlassStyle, getInputStyle, getElevation } from '../utils/styles';
import api from '../api/client';

const PAGE_SIZE = 30;

export default function AuditLogScreen() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadLogs(pageNum = 0, append = false) {
    try {
      const params: Record<string, string> = { size: String(PAGE_SIZE), page: String(pageNum) };
      if (entityTypeFilter) params.entityType = entityTypeFilter;
      const data = await api.getAuditLogs(params);
      const items = data.content || [];
      const total = data.totalElements ?? items.length;
      if (append) setLogs(prev => [...prev, ...items]);
      else setLogs(items);
      setPage(pageNum);
      setTotalElements(total);
    } catch {}
  }

  useEffect(() => { loadLogs(0); }, [entityTypeFilter]);

  const onRefresh = async () => { setRefreshing(true); await loadLogs(0); setRefreshing(false); };

  const loadMore = async () => {
    if (logs.length >= totalElements || loadingMore) return;
    setLoadingMore(true);
    await loadLogs(page + 1, true);
    setLoadingMore(false);
  };

  const filtered = logs.filter(l =>
    !filter || l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.actorId?.toLowerCase().includes(filter.toLowerCase()) ||
    l.entityId?.toLowerCase().includes(filter.toLowerCase())
  );

  const entityTypes = ['', 'FORM_INSTANCE', 'FORM_TEMPLATE', 'WORKFLOW'];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <View style={[styles.filterBar, getGlassStyle(theme)]}>
        <TextInput
          style={[styles.searchInput, getInputStyle(theme, filter.length > 0)]}
          placeholder="Search logs..."
          value={filter}
          onChangeText={setFilter}
          placeholderTextColor={theme.textTertiary}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {entityTypes.map(et => (
            <TouchableOpacity
              key={et}
              style={[styles.filterChip, entityTypeFilter === et && { backgroundColor: theme.accentColor }]}
              onPress={() => setEntityTypeFilter(et)}>
              <Text style={[styles.filterChipText, entityTypeFilter === et && { color: '#FFF', fontWeight: '700' }]}>
                {et || 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {totalElements > 0 && (
          <Text style={[styles.countText, { color: theme.textTertiary }]}>
            Showing {logs.length} of {totalElements} logs
          </Text>
        )}
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {filtered.map(log => {
          const actionColor = getActionColor(log.action);
          return (
            <View key={log.id} style={[styles.logCard, getGlassStyle(theme), getElevation(1, theme)]}>
              <View style={[styles.logBorder, { backgroundColor: actionColor }]} />
              <View style={styles.logHeader}>
                <View style={[styles.actionBadge, { backgroundColor: actionColor + '25' }]}>
                  <Text style={[styles.actionText, { color: actionColor }]}>{log.action}</Text>
                </View>
                <Text style={[styles.logTime, { color: theme.textSecondary }]}>{new Date(log.createdAt).toLocaleString()}</Text>
              </View>
              <Text style={[styles.logEntity, { color: theme.textPrimary }]}>{log.entityType} #{log.entityId}</Text>
              <Text style={[styles.logActor, { color: theme.textSecondary }]}>
                By: {log.actorName || log.actorId} ({log.actorRole}) {log.branchCode ? `| Branch: ${log.branchCode}` : ''}
              </Text>
              {log.details && <Text style={[styles.logDetails, { color: theme.textSecondary }]}>{JSON.stringify(log.details)}</Text>}
            </View>
          );
        })}
        {/* Load More */}
        {logs.length > 0 && logs.length < totalElements && (
          <TouchableOpacity
            style={[styles.loadMoreBtn, { borderColor: theme.accentColor }]}
            onPress={loadMore}
            disabled={loadingMore}
          >
            <Text style={[styles.loadMoreText, { color: theme.accentColor }]}>
              {loadingMore ? 'Loading...' : `Load More (${logs.length} of ${totalElements})`}
            </Text>
          </TouchableOpacity>
        )}
        {filtered.length === 0 && <Text style={[styles.empty, { color: theme.textSecondary }]}>No audit logs found</Text>}
        <View style={{ height: 20 }} />
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
  searchInput: { borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 8 },
  chipScroll: { marginHorizontal: -12 },
  filterChip: { borderWidth: 1, borderColor: 'transparent', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginHorizontal: 4, marginRight: 0 },
  filterChipText: { fontSize: 12 },
  countText: { fontSize: 11, fontWeight: '600', marginTop: 4, marginLeft: 4 },
  logCard: { margin: 12, marginBottom: 4, borderRadius: 10, padding: 12, overflow: 'hidden' },
  logBorder: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 10 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  actionBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  actionText: { fontSize: 10, fontWeight: '700' },
  logTime: { fontSize: 10 },
  logEntity: { fontSize: 13, fontWeight: '600' },
  logActor: { fontSize: 11, marginTop: 4 },
  logDetails: { fontSize: 10, marginTop: 4, fontFamily: 'monospace' },
  loadMoreBtn: { marginHorizontal: 16, marginTop: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  loadMoreText: { fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
