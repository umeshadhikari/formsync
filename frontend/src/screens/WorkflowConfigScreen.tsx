import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Platform, Switch } from 'react-native';
import { Ionicons } from '../components/Icon';
import { useTheme } from '../context/ThemeContext';
import { WorkflowRule, JOURNEY_TYPES } from '../types';
import { getGlassStyle, getInputStyle, getGlowShadow, getElevation } from '../utils/styles';
import api from '../api/client';
import AlertModal, { useAlert } from '../components/AlertModal';

const ALL_KEY = '__ALL__';

export default function WorkflowConfigScreen() {
  const { theme } = useTheme();
  const { alert, showAlert, hideAlert } = useAlert();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<Partial<WorkflowRule>>({});
  const [selectedJourney, setSelectedJourney] = useState(ALL_KEY);

  useEffect(() => { loadRules(); }, []);

  async function loadRules() {
    try {
      const res = await api.getAllWorkflowRules();
      setRules(res?.content || res || []);
    } catch {}
  }

  // Count rules per journey type
  const ruleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rules.forEach(r => { counts[r.journeyType] = (counts[r.journeyType] || 0) + 1; });
    return counts;
  }, [rules]);

  // Journey types that have rules, plus those that don't (for the selector)
  const journeyKeys = Object.keys(JOURNEY_TYPES);

  // Filtered rules
  const filteredRules = useMemo(() => {
    const filtered = selectedJourney === ALL_KEY
      ? [...rules]
      : rules.filter(r => r.journeyType === selectedJourney);
    return filtered.sort((a, b) => b.priority - a.priority);
  }, [rules, selectedJourney]);

  const [newRejectionReason, setNewRejectionReason] = useState('');

  function openNew() {
    setEditRule({
      journeyType: selectedJourney !== ALL_KEY ? selectedJourney : 'CASH_DEPOSIT',
      conditionField: 'amount', conditionOp: 'GT', requiredTiers: 1,
      approvalMode: 'SEQUENTIAL', priority: 10, isActive: true,
      rejectionPolicy: 'PERMANENT', returnPolicy: 'ALLOW_RESUBMIT',
      maxResubmissions: 3, rejectionReasons: [],
      requireRejectionReason: true, requireReturnInstructions: true,
    });
    setNewRejectionReason('');
    setShowModal(true);
  }

  async function saveRule() {
    if (!editRule.ruleName || !editRule.conditionValue) { showAlert('error', 'Error', 'Name and value required'); return; }
    try {
      if (editRule.id) {
        await api.updateWorkflowRule(editRule.id, editRule);
      } else {
        await api.createWorkflowRule(editRule);
      }
      setShowModal(false);
      loadRules();
    } catch (e: any) { showAlert('error', 'Error', e.message); }
  }

  async function deleteRule(id: number) {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this rule?')) {
        await api.deleteWorkflowRule(id);
        loadRules();
      }
    } else {
      require('react-native').Alert.alert('Confirm', 'Delete this rule?', [
        { text: 'Cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await api.deleteWorkflowRule(id); loadRules(); }},
      ]);
    }
  }

  async function toggleActive(rule: WorkflowRule) {
    try {
      await api.updateWorkflowRule(rule.id, { ...rule, isActive: !rule.isActive });
      loadRules();
    } catch (e: any) { showAlert('error', 'Error', e.message); }
  }

  const ops = ['GT', 'GTE', 'LT', 'LTE', 'EQ'];
  const opsLabels: Record<string, string> = { GT: '>', GTE: '≥', LT: '<', LTE: '≤', EQ: '=' };
  const modes = ['SEQUENTIAL', 'PARALLEL', 'NONE'];

  const totalRules = rules.length;
  const activeRules = rules.filter(r => r.isActive).length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Header */}
      <Text style={[styles.heading, { color: theme.textPrimary }]}>Approval Routing Rules</Text>
      <Text style={[styles.subText, { color: theme.textSecondary }]}>
        Configure when approvals are required and how many tiers.{'\n'}Rules are evaluated by priority (highest first).
      </Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statPill, { backgroundColor: theme.primaryColor + '12' }]}>
          <Text style={[styles.statNum, { color: theme.primaryColor }]}>{totalRules}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: '#10B98112' }]}>
          <Text style={[styles.statNum, { color: '#10B981' }]}>{activeRules}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: theme.dangerColor + '12' }]}>
          <Text style={[styles.statNum, { color: theme.dangerColor }]}>{totalRules - activeRules}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Inactive</Text>
        </View>
      </View>

      {/* Journey Type Selector */}
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>FILTER BY JOURNEY TYPE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll} contentContainerStyle={styles.selectorContent}>
        {/* "All" pill */}
        <TouchableOpacity
          onPress={() => setSelectedJourney(ALL_KEY)}
          style={[
            styles.journeyPill,
            { borderColor: theme.borderColor },
            selectedJourney === ALL_KEY && { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor },
          ]}
        >
          <Ionicons name="grid" size={16} color={selectedJourney === ALL_KEY ? '#FFF' : theme.textSecondary} />
          <Text style={[
            styles.journeyPillLabel,
            { color: theme.textSecondary },
            selectedJourney === ALL_KEY && { color: '#FFF' },
          ]}>All</Text>
          <View style={[styles.countBadge, { backgroundColor: selectedJourney === ALL_KEY ? 'rgba(255,255,255,0.25)' : theme.primaryColor + '18' }]}>
            <Text style={[styles.countBadgeText, { color: selectedJourney === ALL_KEY ? '#FFF' : theme.primaryColor }]}>{totalRules}</Text>
          </View>
        </TouchableOpacity>

        {journeyKeys.map(jt => {
          const meta = JOURNEY_TYPES[jt];
          const count = ruleCounts[jt] || 0;
          const isSelected = selectedJourney === jt;
          return (
            <TouchableOpacity
              key={jt}
              onPress={() => setSelectedJourney(jt)}
              style={[
                styles.journeyPill,
                { borderColor: theme.borderColor },
                isSelected && { backgroundColor: meta.color, borderColor: meta.color },
              ]}
            >
              <Ionicons name={meta.icon as any} size={16} color={isSelected ? '#FFF' : meta.color} />
              <Text style={[
                styles.journeyPillLabel,
                { color: theme.textPrimary },
                isSelected && { color: '#FFF' },
              ]}>{meta.label}</Text>
              {count > 0 && (
                <View style={[styles.countBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : meta.color + '18' }]}>
                  <Text style={[styles.countBadgeText, { color: isSelected ? '#FFF' : meta.color }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* + New Rule button */}
      <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accentColor, ...getGlowShadow(theme.accentColor, 0.25) }]} onPress={openNew}>
        <Ionicons name="add-circle" size={18} color="#FFF" />
        <Text style={styles.addBtnText}>New Rule{selectedJourney !== ALL_KEY ? ` — ${JOURNEY_TYPES[selectedJourney]?.label}` : ''}</Text>
      </TouchableOpacity>

      {/* Rules list */}
      {filteredRules.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={40} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No rules{selectedJourney !== ALL_KEY ? ` for ${JOURNEY_TYPES[selectedJourney]?.label}` : ''}</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>Tap "New Rule" to create one</Text>
        </View>
      ) : (
        filteredRules.map((rule, idx) => {
          const meta = JOURNEY_TYPES[rule.journeyType];
          const color = meta?.color || theme.accentColor;
          return (
            <View
              key={rule.id}
              style={[
                styles.ruleCard,
                getGlassStyle(theme),
                getElevation(1, theme),
                { borderLeftColor: color, borderLeftWidth: 3, opacity: rule.isActive ? 1 : 0.55 },
              ]}
            >
              {/* Top row: Journey badge + Priority + Actions */}
              <View style={styles.ruleTopRow}>
                <View style={styles.ruleTopLeft}>
                  {selectedJourney === ALL_KEY && (
                    <View style={[styles.journeyTag, { backgroundColor: color + '15' }]}>
                      <Ionicons name={meta?.icon as any} size={12} color={color} />
                      <Text style={[styles.journeyTagText, { color }]}>{meta?.label}</Text>
                    </View>
                  )}
                  <View style={[styles.priorityBadge, { backgroundColor: theme.primaryColor + '12' }]}>
                    <Text style={[styles.priorityText, { color: theme.primaryColor }]}>P{rule.priority}</Text>
                  </View>
                  {!rule.isActive && (
                    <View style={[styles.inactiveBadge, { backgroundColor: theme.dangerColor + '15' }]}>
                      <Text style={[styles.inactiveBadgeText, { color: theme.dangerColor }]}>INACTIVE</Text>
                    </View>
                  )}
                </View>
                <View style={styles.ruleActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: rule.isActive ? '#10B98112' : theme.dangerColor + '12' }]}
                    onPress={() => toggleActive(rule)}
                  >
                    <Ionicons name={rule.isActive ? 'pause' : 'play'} size={14} color={rule.isActive ? '#10B981' : theme.dangerColor} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.accentColor + '12' }]} onPress={() => { setEditRule(rule); setShowModal(true); }}>
                    <Ionicons name="create" size={14} color={theme.accentColor} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.dangerColor + '12' }]} onPress={() => deleteRule(rule.id)}>
                    <Ionicons name="trash" size={14} color={theme.dangerColor} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Rule name */}
              <Text style={[styles.ruleName, { color: theme.textPrimary }]}>{rule.ruleName}</Text>

              {/* Condition - visual display */}
              <View style={[styles.conditionBox, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: theme.borderColor }]}>
                <View style={styles.conditionRow1}>
                  <Text style={[styles.condLabel, { color: theme.textSecondary }]}>IF</Text>
                  <View style={[styles.condChip, { backgroundColor: theme.primaryColor + '12' }]}>
                    <Text style={[styles.condChipText, { color: theme.primaryColor }]}>{rule.conditionField}</Text>
                  </View>
                  <View style={[styles.condOp, { backgroundColor: color + '18' }]}>
                    <Text style={[styles.condOpText, { color }]}>{opsLabels[rule.conditionOp] || rule.conditionOp}</Text>
                  </View>
                  <Text style={[styles.condValue, { color: theme.textPrimary }]}>{Number(rule.conditionValue).toLocaleString()}</Text>
                  <Ionicons name="arrow-forward" size={13} color={theme.textTertiary} style={{ marginHorizontal: 4 }} />
                  <View style={[styles.tierPill, { backgroundColor: theme.primaryColor + '12' }]}>
                    <Text style={[styles.tierPillText, { color: theme.primaryColor }]}>{rule.requiredTiers} tier{rule.requiredTiers !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={[styles.modePill, { backgroundColor: color + '12' }]}>
                    <Text style={[styles.modePillText, { color }]}>{rule.approvalMode}</Text>
                  </View>
                </View>
              </View>

              {/* Rejection / Return Policy Row */}
              <View style={styles.policyRow}>
                <View style={[styles.policyChip, { backgroundColor: (rule as any).rejectionPolicy === 'ALLOW_RESUBMIT' ? '#10B98112' : theme.dangerColor + '12' }]}>
                  <Ionicons name={(rule as any).rejectionPolicy === 'ALLOW_RESUBMIT' ? 'refresh' : 'lock-closed'} size={11} color={(rule as any).rejectionPolicy === 'ALLOW_RESUBMIT' ? '#10B981' : theme.dangerColor} />
                  <Text style={[styles.policyChipText, { color: (rule as any).rejectionPolicy === 'ALLOW_RESUBMIT' ? '#10B981' : theme.dangerColor }]}>
                    {(rule as any).rejectionPolicy === 'ALLOW_RESUBMIT' ? 'Resubmit OK' : 'Permanent Reject'}
                  </Text>
                </View>
                {(rule as any).maxResubmissions != null && (rule as any).maxResubmissions > 0 && (
                  <View style={[styles.policyChip, { backgroundColor: theme.primaryColor + '10' }]}>
                    <Text style={[styles.policyChipText, { color: theme.primaryColor }]}>Max {(rule as any).maxResubmissions} retries</Text>
                  </View>
                )}
                {(rule as any).rejectionReasons?.length > 0 && (
                  <View style={[styles.policyChip, { backgroundColor: theme.textTertiary + '12' }]}>
                    <Ionicons name="list" size={11} color={theme.textSecondary} />
                    <Text style={[styles.policyChipText, { color: theme.textSecondary }]}>{(rule as any).rejectionReasons.length} reasons</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]}>
          <ScrollView style={[styles.modalContent, getGlassStyle(theme)]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{editRule.id ? 'Edit' : 'New'} Rule</Text>
            <TextInput
              style={[styles.input, getInputStyle(theme)]}
              placeholder="Rule Name *"
              value={editRule.ruleName || ''}
              onChangeText={v => setEditRule({ ...editRule, ruleName: v })}
              placeholderTextColor={theme.textTertiary}
            />
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Journey Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {Object.entries(JOURNEY_TYPES).map(([k, v]) => (
                <TouchableOpacity key={k} style={[styles.modalChip, { borderColor: theme.borderColor }, editRule.journeyType === k && { backgroundColor: v.color, borderColor: v.color }]}
                  onPress={() => setEditRule({ ...editRule, journeyType: k })}>
                  <Ionicons name={v.icon as any} size={14} color={editRule.journeyType === k ? '#FFF' : v.color} />
                  <Text style={[styles.modalChipText, { color: theme.textPrimary }, editRule.journeyType === k && { color: '#FFF' }]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Condition</Text>
            <View style={styles.conditionRow}>
              <TextInput
                style={[styles.input, { flex: 1 }, getInputStyle(theme)]}
                value={editRule.conditionField || 'amount'}
                onChangeText={v => setEditRule({ ...editRule, conditionField: v })}
                placeholderTextColor={theme.textTertiary}
              />
              <View style={styles.opsRow}>
                {ops.map(op => (
                  <TouchableOpacity
                    key={op}
                    style={[styles.opChip, { borderColor: theme.borderColor }, editRule.conditionOp === op && { backgroundColor: theme.accentColor, borderColor: theme.accentColor }]}
                    onPress={() => setEditRule({ ...editRule, conditionOp: op })}>
                    <Text style={[styles.opText, { color: theme.textPrimary }, editRule.conditionOp === op && { color: '#FFF' }]}>{opsLabels[op] || op}  <Text style={{ fontSize: 9, opacity: 0.7 }}>{op}</Text></Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, { flex: 1 }, getInputStyle(theme)]}
                placeholder="Value"
                value={editRule.conditionValue || ''}
                onChangeText={v => setEditRule({ ...editRule, conditionValue: v })}
                keyboardType="numeric"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Required Tiers: {editRule.requiredTiers}</Text>
            <View style={styles.tierRow}>
              {[0, 1, 2, 3].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.tierBtn, { borderColor: theme.borderColor }, editRule.requiredTiers === n && { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }]}
                  onPress={() => setEditRule({ ...editRule, requiredTiers: n })}>
                  <Text style={[styles.tierText, { color: theme.textPrimary }, editRule.requiredTiers === n && { color: '#FFF' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Approval Mode</Text>
            <View style={styles.tierRow}>
              {modes.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modalChip, { borderColor: theme.borderColor }, editRule.approvalMode === m && { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }]}
                  onPress={() => setEditRule({ ...editRule, approvalMode: m })}>
                  <Text style={[styles.modalChipText, { color: theme.textPrimary }, editRule.approvalMode === m && { color: '#FFF' }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, getInputStyle(theme)]}
              placeholder="Priority (higher = evaluated first)"
              value={editRule.priority?.toString() || ''}
              onChangeText={v => setEditRule({ ...editRule, priority: parseInt(v) || 0 })}
              keyboardType="numeric"
              placeholderTextColor={theme.textTertiary}
            />

            {/* ── Rejection / Return Policy ── */}
            <View style={[styles.policySeparator, { borderTopColor: theme.borderColor }]}>
              <Text style={[styles.policySectionTitle, { color: theme.textPrimary }]}>Rejection & Return Policy</Text>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>On Rejection</Text>
            <View style={styles.tierRow}>
              {['PERMANENT', 'ALLOW_RESUBMIT'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.modalChip, { borderColor: theme.borderColor }, (editRule as any).rejectionPolicy === p && { backgroundColor: p === 'PERMANENT' ? theme.dangerColor : '#10B981', borderColor: p === 'PERMANENT' ? theme.dangerColor : '#10B981' }]}
                  onPress={() => setEditRule({ ...editRule, rejectionPolicy: p } as any)}>
                  <Ionicons name={p === 'PERMANENT' ? 'lock-closed' : 'refresh'} size={14} color={(editRule as any).rejectionPolicy === p ? '#FFF' : theme.textSecondary} />
                  <Text style={[styles.modalChipText, { color: theme.textPrimary }, (editRule as any).rejectionPolicy === p && { color: '#FFF' }]}>
                    {p === 'PERMANENT' ? 'Permanent Reject' : 'Allow Resubmit'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Max Resubmissions (0 = unlimited)</Text>
            <View style={styles.tierRow}>
              {[0, 1, 2, 3, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.tierBtn, { borderColor: theme.borderColor }, (editRule as any).maxResubmissions === n && { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }]}
                  onPress={() => setEditRule({ ...editRule, maxResubmissions: n } as any)}>
                  <Text style={[styles.tierText, { color: theme.textPrimary }, (editRule as any).maxResubmissions === n && { color: '#FFF' }]}>{n === 0 ? '∞' : n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Toggle switches */}
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>Require rejection reason</Text>
              <Switch
                value={(editRule as any).requireRejectionReason ?? true}
                onValueChange={v => setEditRule({ ...editRule, requireRejectionReason: v } as any)}
                trackColor={{ true: theme.accentColor + '60', false: theme.borderColor }}
                thumbColor={(editRule as any).requireRejectionReason ? theme.accentColor : theme.textTertiary}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>Require return instructions</Text>
              <Switch
                value={(editRule as any).requireReturnInstructions ?? true}
                onValueChange={v => setEditRule({ ...editRule, requireReturnInstructions: v } as any)}
                trackColor={{ true: theme.accentColor + '60', false: theme.borderColor }}
                thumbColor={(editRule as any).requireReturnInstructions ? theme.accentColor : theme.textTertiary}
              />
            </View>

            {/* Predefined Rejection Reasons */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 8 }]}>Predefined Rejection Reasons</Text>
            {((editRule as any).rejectionReasons || []).map((reason: string, idx: number) => (
              <View key={idx} style={[styles.reasonRow, { borderColor: theme.borderColor }]}>
                <Text style={[styles.reasonText, { color: theme.textPrimary }]}>{reason}</Text>
                <TouchableOpacity onPress={() => {
                  const reasons = [...((editRule as any).rejectionReasons || [])];
                  reasons.splice(idx, 1);
                  setEditRule({ ...editRule, rejectionReasons: reasons } as any);
                }}>
                  <Ionicons name="close-circle" size={18} color={theme.dangerColor} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }, getInputStyle(theme)]}
                placeholder="Add a rejection reason..."
                value={newRejectionReason}
                onChangeText={setNewRejectionReason}
                placeholderTextColor={theme.textTertiary}
                onSubmitEditing={() => {
                  if (newRejectionReason.trim()) {
                    setEditRule({ ...editRule, rejectionReasons: [...((editRule as any).rejectionReasons || []), newRejectionReason.trim()] } as any);
                    setNewRejectionReason('');
                  }
                }}
              />
              <TouchableOpacity
                style={[styles.addReasonBtn, { backgroundColor: theme.accentColor, opacity: newRejectionReason.trim() ? 1 : 0.4 }]}
                onPress={() => {
                  if (newRejectionReason.trim()) {
                    setEditRule({ ...editRule, rejectionReasons: [...((editRule as any).rejectionReasons || []), newRejectionReason.trim()] } as any);
                    setNewRejectionReason('');
                  }
                }}
                disabled={!newRejectionReason.trim()}
              >
                <Ionicons name="add" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.borderColor }]} onPress={() => setShowModal(false)}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accentColor, ...getGlowShadow(theme.accentColor, 0.3) }]} onPress={saveRule}>
                <Ionicons name="checkmark" size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Save Rule</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
      <AlertModal alert={alert} onClose={hideAlert} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subText: { fontSize: 13, marginBottom: 16, lineHeight: 18 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statPill: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  // Journey type selector
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  selectorScroll: { marginBottom: 16 },
  selectorContent: { gap: 8, paddingRight: 16 },
  journeyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  journeyPillLabel: { fontSize: 13, fontWeight: '600' },
  countBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, marginLeft: 2 },
  countBadgeText: { fontSize: 11, fontWeight: '700' },

  // Add button
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, marginBottom: 16 },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600' },
  emptySubtitle: { fontSize: 13 },

  // Rule cards
  ruleCard: { borderRadius: 12, marginBottom: 10, padding: 14, overflow: 'hidden' },
  ruleTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ruleTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
  journeyTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  journeyTagText: { fontSize: 11, fontWeight: '600' },
  priorityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  inactiveBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  ruleActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  // Rule content
  ruleName: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  conditionBox: { borderRadius: 10, padding: 10, borderWidth: 1 },
  conditionRow1: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  condLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  condChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  condChipText: { fontSize: 12, fontWeight: '600' },
  condOp: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  condOpText: { fontSize: 14, fontWeight: '700' },
  condValue: { fontSize: 14, fontWeight: '700' },
  tierPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tierPillText: { fontSize: 12, fontWeight: '600' },
  modePill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  modePillText: { fontSize: 11, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  conditionRow: { gap: 8, marginBottom: 12 },
  opsRow: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  opChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  opText: { fontSize: 13, fontWeight: '600' },
  tierRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tierBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  tierText: { fontWeight: '700', fontSize: 15 },
  modalChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginRight: 6 },
  modalChipText: { fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  cancelBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { flexDirection: 'row', gap: 6, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },

  // Policy display on cards
  policyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  policyChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  policyChipText: { fontSize: 11, fontWeight: '600' },

  // Policy section in modal
  policySeparator: { borderTopWidth: 1, paddingTop: 16, marginTop: 4, marginBottom: 12 },
  policySectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, marginBottom: 4 },
  switchLabel: { fontSize: 14, fontWeight: '500' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  reasonText: { fontSize: 13, flex: 1, marginRight: 8 },
  addReasonBtn: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
