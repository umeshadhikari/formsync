import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { QueueItem, JOURNEY_TYPES, STATUS_COLORS } from '../types';
import api from '../api/client';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const data = await api.getPendingQueue();
      setQueue(data);
    } catch (e: any) { console.error(e); }
  }, []);

  useEffect(() => { loadQueue(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadQueue(); setRefreshing(false); };

  const openDetail = (item: QueueItem) => { setSelectedItem(item); setShowModal(true); setComments(''); };

  async function handleAction(action: 'APPROVE' | 'REJECT' | 'RETURN') {
    if (!selectedItem) return;
    if (action === 'REJECT' && !comments) { Alert.alert('Required', 'Please provide a reason for rejection'); return; }
    setProcessing(true);
    try {
      const fn = action === 'APPROVE' ? api.approveForm : action === 'REJECT' ? api.rejectForm : api.returnForm;
      await fn(selectedItem.form.id, { action, comments });
      Alert.alert('Success', `Form ${action.toLowerCase()}ed`);
      setShowModal(false);
      loadQueue();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setProcessing(false); }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Header Stats */}
      <View style={[styles.statsBar, { backgroundColor: theme.surfaceColor }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: theme.warningColor }]}>{queue.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</Text>
        </View>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {queue.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No pending approvals</Text>
          </View>
        ) : (
          queue.map(item => {
            const form = item.form;
            const wf = item.workflow;
            if (!form) return null;
            const journeyInfo = JOURNEY_TYPES[form.journeyType] || { label: form.journeyType, color: '#888' };
            return (
              <TouchableOpacity key={form.id} style={[styles.card, { backgroundColor: theme.surfaceColor }]} onPress={() => openDetail(item)}>
                <View style={styles.cardHeader}>
                  <View style={[styles.journeyBadge, { backgroundColor: journeyInfo.color + '15' }]}>
                    <Text style={[styles.journeyBadgeText, { color: journeyInfo.color }]}>{journeyInfo.label}</Text>
                  </View>
                  <View style={[styles.tierBadge, { backgroundColor: theme.warningColor + '20' }]}>
                    <Text style={[styles.tierText, { color: theme.warningColor }]}>Tier {wf?.currentTier || 1}</Text>
                  </View>
                </View>
                <Text style={[styles.refNumber, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
                <View style={styles.cardDetails}>
                  <Text style={[styles.detailText, { color: theme.textPrimary }]}>{form.currency} {form.amount?.toLocaleString()}</Text>
                  <Text style={[styles.detailText, { color: theme.textSecondary }]}>By: {form.createdBy}</Text>
                </View>
                <Text style={[styles.dateText, { color: theme.textSecondary }]}>{new Date(form.createdAt).toLocaleString()}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Approval Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surfaceColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Review Form</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={theme.textSecondary} /></TouchableOpacity>
            </View>
            {selectedItem?.form && (
              <ScrollView style={styles.modalBody}>
                <Text style={[styles.modalRef, { color: theme.accentColor }]}>{selectedItem.form.referenceNumber}</Text>
                <Text style={[styles.modalJourney, { color: theme.textSecondary }]}>{JOURNEY_TYPES[selectedItem.form.journeyType]?.label}</Text>
                <Text style={[styles.modalAmount, { color: theme.textPrimary }]}>{selectedItem.form.currency} {selectedItem.form.amount?.toLocaleString()}</Text>

                {/* Form Data */}
                <View style={styles.dataSection}>
                  <Text style={[styles.dataSectionTitle, { color: theme.primaryColor }]}>Form Data</Text>
                  {Object.entries(selectedItem.form.formData || {}).filter(([_, v]) => v).map(([k, v]) => (
                    <View key={k} style={styles.dataRow}>
                      <Text style={[styles.dataKey, { color: theme.textSecondary }]}>{k.replace(/([A-Z])/g, ' $1')}</Text>
                      <Text style={[styles.dataVal, { color: theme.textPrimary }]}>{String(v)}</Text>
                    </View>
                  ))}
                </View>

                <TextInput style={[styles.commentInput, { borderColor: theme.textSecondary }]} placeholder="Comments (required for rejection)"
                  value={comments} onChangeText={setComments} multiline numberOfLines={3} placeholderTextColor={theme.textSecondary} />
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.dangerColor, opacity: processing ? 0.5 : 1 }]}
                onPress={() => handleAction('REJECT')} disabled={processing}>
                <Ionicons name="close-circle" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.warningColor, opacity: processing ? 0.5 : 1 }]}
                onPress={() => handleAction('RETURN')} disabled={processing}>
                <Ionicons name="arrow-undo" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Return</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtn, { backgroundColor: theme.successColor, opacity: processing ? 0.5 : 1 }]}
                onPress={() => handleAction('APPROVE')} disabled={processing}>
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsBar: { flexDirection: 'row', padding: 16, justifyContent: 'center' },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, marginTop: 12 },
  card: { margin: 16, marginBottom: 8, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  journeyBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  journeyBadgeText: { fontSize: 11, fontWeight: '700' },
  tierBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  tierText: { fontSize: 11, fontWeight: '700' },
  refNumber: { fontSize: 15, fontWeight: '700' },
  cardDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  detailText: { fontSize: 13 },
  dateText: { fontSize: 11, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20, maxHeight: 400 },
  modalRef: { fontSize: 16, fontWeight: '700' },
  modalJourney: { fontSize: 13, marginTop: 4 },
  modalAmount: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  dataSection: { marginTop: 16, padding: 12, backgroundColor: '#F8F9FA', borderRadius: 8 },
  dataSectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0' },
  dataKey: { fontSize: 12, flex: 1, textTransform: 'capitalize' },
  dataVal: { fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },
  commentInput: { borderWidth: 1.5, borderRadius: 8, padding: 12, marginTop: 16, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', padding: 20, gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 10, padding: 14 },
  approveBtn: { flex: 2 },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
