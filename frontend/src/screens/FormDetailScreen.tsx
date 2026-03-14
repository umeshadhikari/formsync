import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { JOURNEY_TYPES } from '../types';
import { getGlassStyle, getElevation, getGradientStyle } from '../utils/styles';
import api from '../api/client';
import ApprovalTimeline from '../components/ApprovalTimeline';
import AlertModal, { useAlert } from '../components/AlertModal';

interface Props {
  navigation: any;
  route: {
    params: {
      formId: number;
      form?: any;
      // Review mode props (passed from SupervisorDashboard queue)
      reviewMode?: boolean;
      workflowData?: any;
      onActionComplete?: () => void;
    };
  };
}

export default function FormDetailScreen({ navigation, route }: Props) {
  const { formId, form: initialForm, reviewMode, workflowData, onActionComplete } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const { alert, showAlert, hideAlert } = useAlert();

  const [form, setForm] = useState<any>(initialForm || null);
  const [loading, setLoading] = useState(!initialForm);
  const [workflow, setWorkflow] = useState<any>(workflowData || null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [resubmitInfo, setResubmitInfo] = useState<any>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [template, setTemplate] = useState<any>(null);

  // Review mode state
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState('');
  const [returnInstructions, setReturnInstructions] = useState('');
  const [rejectionPolicy, setRejectionPolicy] = useState('PERMANENT');
  const [requireRejectionReason, setRequireRejectionReason] = useState(true);
  const [requireReturnInstructions, setRequireReturnInstructions] = useState(true);
  const [showReviewInputs, setShowReviewInputs] = useState(false);

  const loadFormDetails = useCallback(async () => {
    try {
      let formData = form;
      if (!formData) {
        formData = await api.getForm(formId);
        setForm(formData);
      }

      const [wf, hist] = await Promise.all([
        api.getWorkflowByForm(formData.id).catch(() => null),
        api.getApprovalHistory(formData.id).catch(() => []),
      ]);

      const inferredWorkflow = wf || inferWorkflow(formData, hist);
      setWorkflow(inferredWorkflow);
      setHistory(hist);

      // Load rejection config from workflow
      if (reviewMode && wf) {
        setRejectionReasons(wf.rejectionReasons || []);
        setRejectionPolicy(wf.rejectionPolicy || 'PERMANENT');
        setRequireRejectionReason(wf.requireRejectionReason !== false);
        setRequireReturnInstructions(wf.requireReturnInstructions !== false);
      }

      if (['REJECTED', 'RETURNED'].includes(formData.status)) {
        try {
          const info = await api.getResubmissionInfo(formData.id);
          setResubmitInfo(info);
        } catch { /* ignore */ }
      }

      if (formData.templateId) {
        try {
          const tpl = await api.getTemplate(formData.templateId);
          setTemplate(tpl);
        } catch { /* ignore */ }
      }
    } catch (e: any) {
      showAlert('error', 'Load Failed', e.message);
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  }, [formId, form]);

  useEffect(() => { loadFormDetails(); }, []);

  // Load rejection config from workflowData prop if available
  useEffect(() => {
    if (reviewMode && workflowData) {
      setRejectionReasons(workflowData.rejectionReasons || []);
      setRejectionPolicy(workflowData.rejectionPolicy || 'PERMANENT');
      setRequireRejectionReason(workflowData.requireRejectionReason !== false);
      setRequireReturnInstructions(workflowData.requireReturnInstructions !== false);
    }
  }, [reviewMode, workflowData]);

  const inferWorkflow = (formData: any, hist: any[]) => {
    if (!hist || hist.length === 0) {
      if (formData.status === 'DRAFT') return null;
      return { currentTier: 1, requiredTiers: 1, currentState: 'PENDING_TIER_1' };
    }
    const maxTier = Math.max(...hist.map((a: any) => a.tier || 1));
    const isTerminal = ['COMPLETED', 'REJECTED', 'RETURNED', 'FAILED'].includes(formData.status);
    if (isTerminal) {
      return { currentTier: maxTier, requiredTiers: maxTier, currentState: formData.status };
    }
    const approvedTiers = hist.filter((a: any) => a.action === 'APPROVE').map((a: any) => a.tier);
    const highestApproved = approvedTiers.length > 0 ? Math.max(...approvedTiers) : 0;
    return {
      currentTier: highestApproved + 1,
      requiredTiers: Math.max(maxTier, highestApproved + 1),
      currentState: `PENDING_TIER_${highestApproved + 1}`,
    };
  };

  const handleResubmit = async () => {
    if (!form) return;
    setResubmitting(true);
    try {
      await api.resubmitForm(form.id);
      showAlert('success', 'Resubmitted', 'Your form has been resubmitted for approval.');
      const updatedForm = await api.getForm(form.id);
      setForm(updatedForm);
      setResubmitInfo(null);
      const [wf, hist] = await Promise.all([
        api.getWorkflowByForm(form.id).catch(() => null),
        api.getApprovalHistory(form.id).catch(() => []),
      ]);
      setWorkflow(wf || inferWorkflow(updatedForm, hist));
      setHistory(hist);
    } catch (e: any) {
      showAlert('error', 'Resubmit Failed', e.message);
    } finally {
      setResubmitting(false);
    }
  };

  // ── Review Actions ──
  const handleReviewAction = async (action: 'APPROVE' | 'REJECT' | 'RETURN') => {
    if (!form) return;
    if (action === 'REJECT' && requireRejectionReason && !selectedRejectionReason && !comments) {
      showAlert('warning', 'Required', 'Please select a rejection reason or provide comments');
      return;
    }
    if (action === 'RETURN' && requireReturnInstructions && !returnInstructions && !comments) {
      showAlert('warning', 'Required', 'Please provide correction instructions for the teller');
      return;
    }
    setProcessing(true);
    try {
      const payload: any = { action, comments };
      if (action === 'REJECT') payload.rejectionReason = selectedRejectionReason || comments;
      if (action === 'RETURN') payload.returnInstructions = returnInstructions || comments;

      if (action === 'APPROVE') await api.approveForm(form.id, payload);
      else if (action === 'REJECT') await api.rejectForm(form.id, payload);
      else await api.returnForm(form.id, payload);

      const actionLabels: Record<string, string> = { APPROVE: 'Approved', REJECT: 'Rejected', RETURN: 'Returned' };
      const actionColors: Record<string, string> = { APPROVE: theme.successColor, REJECT: theme.dangerColor, RETURN: theme.warningColor };
      showAlert(
        action === 'APPROVE' ? 'success' : action === 'REJECT' ? 'error' : 'warning',
        actionLabels[action],
        `${form.referenceNumber} has been ${actionLabels[action].toLowerCase()}.`
      );

      // Navigate back after brief delay
      setTimeout(() => {
        if (onActionComplete) onActionComplete();
        if (navigation?.goBack) navigation.goBack();
      }, 1200);
    } catch (e: any) {
      showAlert('error', 'Action Failed', e.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const map: Record<string, string> = {
      DRAFT: theme.textTertiary,
      PENDING_APPROVAL: theme.warningColor,
      COMPLETED: theme.successColor,
      REJECTED: theme.dangerColor,
      RETURNED: theme.warningColor,
      FAILED: theme.dangerColor,
    };
    // Handle PENDING_TIER_X statuses
    if (status?.startsWith('PENDING_TIER')) return theme.warningColor;
    return map[status] || theme.textTertiary;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const getFieldLabel = (key: string): string => {
    if (!template?.schema?.sections) return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    for (const section of template.schema.sections) {
      for (const field of section.fields || []) {
        if (field.id === key || field.dataMapping === key) return field.label;
      }
    }
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  };

  // Group form data fields into logical sections using template schema
  const getGroupedFormData = () => {
    const formData = form?.formData;
    if (!formData) return [];

    const entries = Object.entries(formData).filter(([_, v]) => v !== null && v !== undefined && v !== '');

    // If we have a template with sections, group by section
    if (template?.schema?.sections) {
      const groups: { title: string; fields: { key: string; label: string; value: string }[] }[] = [];
      const usedKeys = new Set<string>();

      for (const section of template.schema.sections) {
        const sectionFields: { key: string; label: string; value: string }[] = [];
        for (const field of section.fields || []) {
          const key = field.dataMapping || field.id;
          const value = formData[key];
          if (value !== null && value !== undefined && value !== '') {
            sectionFields.push({ key, label: field.label || getFieldLabel(key), value: String(value) });
            usedKeys.add(key);
          }
        }
        if (sectionFields.length > 0) {
          groups.push({ title: section.title || section.label || 'Details', fields: sectionFields });
        }
      }

      // Any remaining fields not in template sections
      const remaining = entries.filter(([k]) => !usedKeys.has(k));
      if (remaining.length > 0) {
        groups.push({
          title: 'Additional Details',
          fields: remaining.map(([k, v]) => ({ key: k, label: getFieldLabel(k), value: String(v) })),
        });
      }
      return groups;
    }

    // Fallback: auto-group by common field patterns
    const transactionFields = ['amount', 'currency', 'narrative', 'amountInWords'];
    const accountFields = ['accountName', 'accountNumber', 'accountType', 'branchCode'];
    const customerFields = ['depositorName', 'depositorPhone', 'depositorIdType', 'depositorIdNumber',
      'customerName', 'customerPhone', 'beneficiaryName', 'beneficiaryAccount'];
    const otherFields: string[] = [];

    const txnGroup: { key: string; label: string; value: string }[] = [];
    const acctGroup: { key: string; label: string; value: string }[] = [];
    const custGroup: { key: string; label: string; value: string }[] = [];
    const otherGroup: { key: string; label: string; value: string }[] = [];

    for (const [key, value] of entries) {
      const entry = { key, label: getFieldLabel(key), value: String(value) };
      if (transactionFields.includes(key)) txnGroup.push(entry);
      else if (accountFields.includes(key)) acctGroup.push(entry);
      else if (customerFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) custGroup.push(entry);
      else otherGroup.push(entry);
    }

    const groups = [];
    if (txnGroup.length > 0) groups.push({ title: 'Transaction Details', fields: txnGroup });
    if (acctGroup.length > 0) groups.push({ title: 'Account Information', fields: acctGroup });
    if (custGroup.length > 0) groups.push({ title: 'Customer / Depositor', fields: custGroup });
    if (otherGroup.length > 0) groups.push({ title: groups.length === 0 ? 'Form Data' : 'Other Details', fields: otherGroup });
    return groups;
  };

  const gradientBg = Platform.OS === 'web'
    ? { background: getGradientStyle(theme.gradientStart, theme.gradientEnd) }
    : {};

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.accentColor} />
        <Text style={[{ color: theme.textTertiary, marginTop: 12, fontSize: 14 }]}>Loading form details...</Text>
      </View>
    );
  }

  if (!form) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.dangerColor} />
        <Text style={[{ color: theme.textPrimary, marginTop: 12, fontSize: 16, fontWeight: '600' }]}>Form not found</Text>
      </View>
    );
  }

  const statusColor = getStatusColor(form.status);
  // Only the original creator can see resubmit/action options for returned/rejected forms
  const isActionable = ['RETURNED', 'REJECTED'].includes(form.status) && form.createdBy === user?.username;
  const groupedFormData = getGroupedFormData();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: reviewMode ? 160 : 40 }}>
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: theme.primaryColor }, Platform.OS === 'web' && gradientBg]}>
          <View style={styles.headerTop}>
            <Text style={styles.headerRef}>{form.referenceNumber}</Text>
            <View style={[styles.headerBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.headerBadgeText}>{form.status?.replace(/_/g, ' ')}</Text>
            </View>
          </View>
          <Text style={styles.headerJourney}>{JOURNEY_TYPES[form.journeyType]?.label || form.journeyType}</Text>
          <Text style={styles.headerAmount}>{form.currency} {form.amount?.toLocaleString()}</Text>
          {form.customerName && (
            <View style={styles.headerCustomer}>
              <Ionicons name="person" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.headerCustomerText}>{form.customerName}</Text>
            </View>
          )}
          {/* Review mode: tier info */}
          {reviewMode && workflow && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Tier {workflow.currentTier || 1}</Text>
              </View>
              {workflow.escalated && (
                <View style={{ backgroundColor: 'rgba(255,80,80,0.3)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Escalated</Text>
                </View>
              )}
              {workflow.resubmissionCount > 0 && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Resubmission #{workflow.resubmissionCount}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Action Required Banner (for maker's returned/rejected forms) */}
        {isActionable && !reviewMode && (
          <View style={[styles.actionBanner, { backgroundColor: statusColor + '10', borderColor: statusColor + '30' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={form.status === 'RETURNED' ? 'arrow-undo' : 'close-circle'} size={20} color={statusColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { color: statusColor }]}>
                  {form.status === 'RETURNED' ? 'Correction Required' : 'Form Rejected'}
                </Text>
                <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                  {form.status === 'RETURNED'
                    ? 'This form has been returned for corrections. Please review and resubmit.'
                    : 'This form has been rejected by the approver.'}
                </Text>
              </View>
            </View>
            {form.status === 'RETURNED' && form.lastReturnInstructions && (
              <View style={[styles.reasonBox, { borderColor: theme.warningColor + '30', backgroundColor: theme.warningColor + '08' }]}>
                <Text style={[styles.reasonLabel, { color: theme.warningColor }]}>Correction Instructions</Text>
                <Text style={[styles.reasonBody, { color: theme.textPrimary }]}>{form.lastReturnInstructions}</Text>
              </View>
            )}
            {form.status === 'REJECTED' && form.lastRejectionReason && (
              <View style={[styles.reasonBox, { borderColor: theme.dangerColor + '30', backgroundColor: theme.dangerColor + '08' }]}>
                <Text style={[styles.reasonLabel, { color: theme.dangerColor }]}>Rejection Reason</Text>
                <Text style={[styles.reasonBody, { color: theme.textPrimary }]}>{form.lastRejectionReason}</Text>
              </View>
            )}
            {resubmitInfo?.canResubmit && (
              <TouchableOpacity style={[styles.resubmitBtn, { backgroundColor: theme.accentColor }]} onPress={handleResubmit} disabled={resubmitting}>
                {resubmitting ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <>
                    <Ionicons name="refresh" size={16} color="#FFF" />
                    <Text style={styles.resubmitBtnText}>
                      Resubmit for Approval{resubmitInfo.remainingAttempts != null ? ` (${resubmitInfo.remainingAttempts} left)` : ''}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {resubmitInfo && !resubmitInfo.canResubmit && (
              <View style={[styles.noResubmitBox, { backgroundColor: theme.dangerColor + '08', borderColor: theme.dangerColor + '20' }]}>
                <Ionicons name="lock-closed" size={14} color={theme.dangerColor} />
                <Text style={{ fontSize: 13, color: theme.dangerColor, flex: 1 }}>{resubmitInfo.reason || 'This form cannot be resubmitted.'}</Text>
              </View>
            )}
          </View>
        )}

        {/* Submission Details Section */}
        <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Submission Details</Text>
          <DetailRow label="Status" value={form.status?.replace(/_/g, ' ')} valueColor={statusColor} theme={theme} />
          <DetailRow label="Journey Type" value={JOURNEY_TYPES[form.journeyType]?.label || form.journeyType} theme={theme} />
          <DetailRow label="Branch" value={form.branchCode} theme={theme} />
          <DetailRow label="Submitted By" value={form.createdBy} theme={theme} />
          <DetailRow label="Created" value={formatDate(form.createdAt)} theme={theme} />
          {form.submittedAt && <DetailRow label="Submitted" value={formatDate(form.submittedAt)} theme={theme} />}
          {form.completedAt && <DetailRow label="Completed" value={formatDate(form.completedAt)} theme={theme} />}
          {form.cbsReference && <DetailRow label="CBS Reference" value={form.cbsReference} theme={theme} />}
          {form.resubmissionCount > 0 && (
            <DetailRow label="Resubmissions" value={`${form.resubmissionCount} time${form.resubmissionCount !== 1 ? 's' : ''}`} theme={theme} />
          )}
        </View>

        {/* Form Data — Grouped Sections */}
        {groupedFormData.map((group, gi) => (
          <View key={gi} style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{group.title}</Text>
            {group.fields.map((field) => (
              <DetailRow key={field.key} label={field.label} value={field.value} theme={theme} />
            ))}
          </View>
        ))}

        {/* Approval Timeline Section */}
        <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Approval Progress</Text>
          {historyLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={theme.accentColor} />
              <Text style={[{ color: theme.textTertiary, fontSize: 12, marginTop: 8 }]}>Loading approval history...</Text>
            </View>
          ) : workflow ? (
            <ApprovalTimeline
              approvalHistory={history}
              currentTier={workflow.currentTier || 1}
              requiredTiers={workflow.requiredTiers || 0}
              currentState={workflow.currentState || ''}
              formStatus={form.status}
              submittedAt={form.submittedAt || form.createdAt}
              submitterName={form.submitterName || form.createdBy || user?.fullName}
              tierRoles={workflow.tierRoles}
              resubmissionCount={form.resubmissionCount}
              rejectionReason={form.lastRejectionReason}
              returnInstructions={form.lastReturnInstructions}
            />
          ) : form.status === 'DRAFT' ? (
            <Text style={[{ color: theme.textTertiary, fontSize: 13 }]}>This form has not been submitted yet.</Text>
          ) : (
            <Text style={[{ color: theme.textTertiary, fontSize: 13 }]}>No workflow data available.</Text>
          )}
        </View>

        {/* Review Inputs (collapsible, above action bar) */}
        {reviewMode && showReviewInputs && (
          <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Review Notes</Text>

            {/* Rejection Reasons Picker */}
            {rejectionReasons.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={[{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 8 }]}>
                  Rejection Reason {requireRejectionReason ? '*' : ''}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {rejectionReasons.map((reason: string) => (
                    <TouchableOpacity
                      key={reason}
                      style={[{
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
                        borderColor: selectedRejectionReason === reason ? theme.dangerColor : theme.borderColor,
                        backgroundColor: selectedRejectionReason === reason ? theme.dangerColor + '15' : 'transparent',
                      }]}
                      onPress={() => setSelectedRejectionReason(selectedRejectionReason === reason ? '' : reason)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: selectedRejectionReason === reason ? theme.dangerColor : theme.textSecondary }}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Return Instructions */}
            <Text style={[{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 }]}>
              Correction Instructions (for Send Back) {requireReturnInstructions ? '*' : ''}
            </Text>
            <TextInput
              style={[styles.reviewInput, { borderColor: theme.borderColor, color: theme.textPrimary, backgroundColor: theme.inputBackground || theme.surfaceColor }]}
              placeholder="Describe what needs correction..."
              value={returnInstructions}
              onChangeText={setReturnInstructions}
              multiline
              numberOfLines={2}
              placeholderTextColor={theme.textTertiary}
            />

            {/* General Comments */}
            <Text style={[{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6, marginTop: 12 }]}>
              Comments
            </Text>
            <TextInput
              style={[styles.reviewInput, { borderColor: theme.borderColor, color: theme.textPrimary, backgroundColor: theme.inputBackground || theme.surfaceColor }]}
              placeholder="Additional comments..."
              value={comments}
              onChangeText={setComments}
              multiline
              numberOfLines={2}
              placeholderTextColor={theme.textTertiary}
            />

            {/* Rejection Policy Info */}
            {rejectionPolicy && (
              <View style={[{
                flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, marginTop: 10,
                backgroundColor: rejectionPolicy === 'PERMANENT' ? theme.dangerColor + '08' : theme.successColor + '08',
              }]}>
                <Ionicons
                  name={rejectionPolicy === 'PERMANENT' ? 'alert-circle' : 'refresh-circle'}
                  size={14}
                  color={rejectionPolicy === 'PERMANENT' ? theme.dangerColor : theme.successColor}
                />
                <Text style={{ fontSize: 11, color: rejectionPolicy === 'PERMANENT' ? theme.dangerColor : theme.successColor, fontWeight: '500', flex: 1 }}>
                  {rejectionPolicy === 'PERMANENT'
                    ? 'Rejection is permanent — teller cannot resubmit'
                    : 'Teller can correct and resubmit after rejection'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky Review Action Bar */}
      {reviewMode && (
        <View style={[styles.reviewActionBar, {
          backgroundColor: theme.surfaceColor,
          borderTopColor: theme.borderColor,
          ...Platform.select({
            web: { boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' } as any,
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8 },
          }),
        }]}>
          {/* Toggle review inputs button */}
          <TouchableOpacity
            style={[styles.reviewToggle, { backgroundColor: theme.accentColor + '12' }]}
            onPress={() => setShowReviewInputs(!showReviewInputs)}
          >
            <Ionicons name={showReviewInputs ? 'chevron-down' : 'chatbox-ellipses'} size={14} color={theme.accentColor} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.accentColor }}>
              {showReviewInputs ? 'Hide notes' : 'Add notes / reason'}
            </Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.reviewActions}>
            <TouchableOpacity
              style={[styles.reviewBtn, { backgroundColor: theme.dangerColor, opacity: processing ? 0.5 : 1 }]}
              onPress={() => handleReviewAction('REJECT')}
              disabled={processing}
            >
              <Ionicons name="close-circle" size={16} color="#FFF" />
              <Text style={styles.reviewBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewBtn, { backgroundColor: theme.warningColor, opacity: processing ? 0.5 : 1 }]}
              onPress={() => handleReviewAction('RETURN')}
              disabled={processing}
            >
              <Ionicons name="arrow-undo" size={16} color="#FFF" />
              <Text style={styles.reviewBtnText}>Send Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewBtn, styles.approveBtn, { backgroundColor: theme.successColor, opacity: processing ? 0.5 : 1 }]}
              onPress={() => handleReviewAction('APPROVE')}
              disabled={processing}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFF" />
              <Text style={styles.reviewBtnText}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <AlertModal alert={alert} onClose={hideAlert} />
    </View>
  );
}

function DetailRow({ label, value, valueColor, theme }: { label: string; value: string; valueColor?: string; theme: any }) {
  return (
    <View style={detailStyles.row}>
      <Text style={[detailStyles.label, { color: theme.textTertiary }]}>{label}</Text>
      <Text style={[detailStyles.value, { color: valueColor || theme.textPrimary }]} numberOfLines={3}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  label: { fontSize: 13, fontWeight: '500', width: '35%' },
  value: { fontSize: 13, fontWeight: '600', width: '62%', textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: {
    padding: 24,
    paddingTop: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(20, 35, 60, 0.2)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
    }),
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRef: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  headerBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  headerBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' as any },
  headerJourney: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 6, fontWeight: '500' },
  headerAmount: { color: '#FFF', fontSize: 28, fontWeight: '800', marginTop: 8 },
  headerCustomer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  headerCustomerText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  actionBanner: { margin: 16, borderRadius: 12, padding: 16, borderWidth: 1, gap: 12 },
  actionTitle: { fontSize: 15, fontWeight: '700' },
  actionSubtitle: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  reasonBox: { borderRadius: 8, padding: 12, borderWidth: 1 },
  reasonLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  reasonBody: { fontSize: 13, lineHeight: 18 },
  resubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  resubmitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  noResubmitBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1 },
  section: {
    margin: 16, marginBottom: 0, borderRadius: 12, padding: 16, borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    }),
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  // Review mode styles
  reviewInput: { borderWidth: 1.5, borderRadius: 8, padding: 12, minHeight: 60, textAlignVertical: 'top', fontSize: 13 },
  reviewActionBar: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 16 },
  reviewToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginBottom: 10 },
  reviewActions: { flexDirection: 'row', gap: 8 },
  reviewBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, borderRadius: 10, paddingVertical: 12 },
  approveBtn: { flex: 2 },
  reviewBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
