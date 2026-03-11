import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { WorkflowRule, JOURNEY_TYPES } from '../types';
import api from '../api/client';

export default function WorkflowConfigScreen() {
  const { theme } = useTheme();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<Partial<WorkflowRule>>({});

  useEffect(() => { loadRules(); }, []);

  async function loadRules() {
    try { setRules(await api.getAllWorkflowRules()); } catch {}
  }

  function openNew() {
    setEditRule({ journeyType: 'CASH_DEPOSIT', conditionField: 'amount', conditionOp: 'GT', requiredTiers: 1, approvalMode: 'SEQUENTIAL', priority: 10, isActive: true });
    setShowModal(true);
  }

  async function saveRule() {
    if (!editRule.ruleName || !editRule.conditionValue) { Alert.alert('Error', 'Name and value required'); return; }
    try {
      if (editRule.id) {
        await api.updateWorkflowRule(editRule.id, editRule);
      } else {
        await api.createWorkflowRule(editRule);
      }
      setShowModal(false);
      loadRules();
    } catch (e: any) { Alert.alert('Error', e.message); }
  }

  async function deleteRule(id: number) {
    Alert.alert('Confirm', 'Delete this rule?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.deleteWorkflowRule(id); loadRules(); }},
    ]);
  }

  const ops = ['GT', 'GTE', 'LT', 'LTE', 'EQ'];
  const modes = ['SEQUENTIAL', 'PARALLEL', 'NONE'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Text style={[styles.heading, { color: theme.textPrimary }]}>Approval Routing Rules</Text>
      <Text style={[styles.subText, { color: theme.textSecondary }]}>Configure when approvals are required and how many tiers. Rules are evaluated by priority (highest first).</Text>

      <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primaryColor }]} onPress={openNew}>
        <Ionicons name="add" size={20} color="#FFF" />
        <Text style={styles.addBtnText}>New Rule</Text>
      </TouchableOpacity>

      {/* Rules grouped by journey type */}
      {Object.keys(JOURNEY_TYPES).map(jt => {
        const jtRules = rules.filter(r => r.journeyType === jt);
        if (jtRules.length === 0) return null;
        return (
          <View key={jt}>
            <Text style={[styles.groupTitle, { color: JOURNEY_TYPES[jt].color }]}>{JOURNEY_TYPES[jt].label}</Text>
            {jtRules.sort((a, b) => b.priority - a.priority).map(rule => (
              <View key={rule.id} style={[styles.ruleCard, { backgroundColor: theme.surfaceColor, opacity: rule.isActive ? 1 : 0.5 }]}>
                <View style={styles.ruleHeader}>
                  <Text style={[styles.ruleName, { color: theme.textPrimary }]}>{rule.ruleName}</Text>
                  <Text style={[styles.priority, { color: theme.textSecondary }]}>P{rule.priority}</Text>
                </View>
                <Text style={[styles.ruleCondition, { color: theme.accentColor }]}>
                  IF {rule.conditionField} {rule.conditionOp} {Number(rule.conditionValue).toLocaleString()} → {rule.requiredTiers} tier(s) [{rule.approvalMode}]
                </Text>
                <View style={styles.ruleActions}>
                  <TouchableOpacity onPress={() => { setEditRule(rule); setShowModal(true); }}>
                    <Ionicons name="create" size={18} color={theme.accentColor} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteRule(rule.id)}>
                    <Ionicons name="trash" size={18} color={theme.dangerColor} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        );
      })}

      {/* Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: theme.surfaceColor }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{editRule.id ? 'Edit' : 'New'} Rule</Text>
            <TextInput style={styles.input} placeholder="Rule Name *" value={editRule.ruleName || ''} onChangeText={v => setEditRule({ ...editRule, ruleName: v })} />
            <Text style={styles.inputLabel}>Journey Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {Object.entries(JOURNEY_TYPES).map(([k, v]) => (
                <TouchableOpacity key={k} style={[styles.chip, editRule.journeyType === k && { backgroundColor: theme.primaryColor }]}
                  onPress={() => setEditRule({ ...editRule, journeyType: k })}>
                  <Text style={[styles.chipText, editRule.journeyType === k && { color: '#FFF' }]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Condition</Text>
            <View style={styles.conditionRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={editRule.conditionField || 'amount'} onChangeText={v => setEditRule({ ...editRule, conditionField: v })} />
              <View style={styles.opsRow}>
                {ops.map(op => (
                  <TouchableOpacity key={op} style={[styles.opChip, editRule.conditionOp === op && { backgroundColor: theme.accentColor }]}
                    onPress={() => setEditRule({ ...editRule, conditionOp: op })}>
                    <Text style={[styles.opText, editRule.conditionOp === op && { color: '#FFF' }]}>{op}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Value" value={editRule.conditionValue || ''} onChangeText={v => setEditRule({ ...editRule, conditionValue: v })} keyboardType="numeric" />
            </View>
            <Text style={styles.inputLabel}>Required Tiers: {editRule.requiredTiers}</Text>
            <View style={styles.tierRow}>
              {[0, 1, 2, 3].map(n => (
                <TouchableOpacity key={n} style={[styles.tierBtn, editRule.requiredTiers === n && { backgroundColor: theme.primaryColor }]}
                  onPress={() => setEditRule({ ...editRule, requiredTiers: n })}>
                  <Text style={[styles.tierText, editRule.requiredTiers === n && { color: '#FFF' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.inputLabel}>Mode</Text>
            <View style={styles.tierRow}>
              {modes.map(m => (
                <TouchableOpacity key={m} style={[styles.chip, editRule.approvalMode === m && { backgroundColor: theme.primaryColor }]}
                  onPress={() => setEditRule({ ...editRule, approvalMode: m })}>
                  <Text style={[styles.chipText, editRule.approvalMode === m && { color: '#FFF' }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Priority (higher = evaluated first)" value={editRule.priority?.toString() || ''} onChangeText={v => setEditRule({ ...editRule, priority: parseInt(v) || 0 })} keyboardType="numeric" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primaryColor }]} onPress={saveRule}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Save Rule</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subText: { fontSize: 12, marginBottom: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, padding: 14, marginBottom: 16 },
  addBtnText: { color: '#FFF', fontWeight: '700' },
  groupTitle: { fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  ruleCard: { borderRadius: 10, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  ruleHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  ruleName: { fontSize: 14, fontWeight: '600' },
  priority: { fontSize: 11 },
  ruleCondition: { fontSize: 12, marginTop: 6, fontFamily: 'monospace' },
  ruleActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6 },
  conditionRow: { gap: 8, marginBottom: 12 },
  opsRow: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  opChip: { borderWidth: 1, borderColor: '#DDD', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4 },
  opText: { fontSize: 12 },
  tierRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tierBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  tierText: { fontWeight: '700' },
  chip: { borderWidth: 1, borderColor: '#DDD', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginRight: 6 },
  chipText: { fontSize: 11 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  cancelBtn: { padding: 12 },
  saveBtn: { borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
});
