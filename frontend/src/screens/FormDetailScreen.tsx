import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
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
  route: { params: { formId: number; form?: any } };
}

export default function FormDetailScreen({ navigation, route }: Props) {
  const { formId, form: initialForm } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const { alert, showAlert, hideAlert } = useAlert();

  const [form, setForm] = useState<any>(initialForm || null);
  const [loading, setLoading] = useState(!initialForm);
  const [workflow, setWorkflow] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [resubmitInfo, setResubmitInfo] = useState<any>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [template, setTemplate] = useState<any>(null);

  const loadFormDetails = useCallback(async () => {
    try {
      // Load form if not provided
      let formData = form;
      if (!formData) {
        formData = await api.getForm(formId);
        setForm(formData);
      }

      // Load workflow + history + template in parallel
      const [wf, hist] = await Promise.all([
        api.getWorkflowByForm(formData.id).catch(() => null),
        api.getApprovalHistory(formData.id).catch(() => []),
      ]);

      const inferredWorkflow = wf || inferWorkflow(formData, hist);
      setWorkflow(inferredWorkflow);
      setHistory(hist);

      // Load resubmission info for rejected/returned forms
      if (['REJECTED', 'RETURNED'].includes(formData.status)) {
        try {
          const info = await api.getResubmissionInfo(formData.id);
          setResubmitInfo(info);
        } catch { /* ignore */ }
      }

      // Try to load template for field labels
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

  const inferWorkflow = (formData: any, hist: any[]) => {
    if (!hist || hist.length === 0) {
      if (formData.status === 'DRAFT') return null;
      return { currentTier: 1, requiredTiers: 1, currentState: 'PENDING_TIER_1' };
    }
    const maxTier = Math.max(...hist.map((a: any) => a.tier || 1));
    const isTerminal = ['COMPLETED', 'REJECTED', 'RETURNED', 'FAILED'].includes(formData.status);
    if (isTerminal) {
      return {
        currentTier: maxTier,
        requiredTiers: maxTier,
        currentState: formData.status,
      };
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
      // Reload details
      const updatedForm = await api.getForm(form.id);
      setForm(updatedForm);
      setResubmitInfo(null);
      // Reload workflow
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

  const getStatusColor = (status: string): string => {
    const map: Record<string, string> = {
      DRAFT: theme.textTertiary,
      PENDING_APPROVAL: theme.warningColor,
      COMPLETED: theme.successColor,
      REJECTED: theme.dangerColor,
      RETURNED: theme.warningColor,
      FAILED: theme.dangerColor,
    };
    return map[status] || theme.textTertiary;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  // Build field label map from template schema
  const getFieldLabel = (key: string): string => {
    if (!template?.schema?.sections) return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    for (const section of template.schema.sections) {
      for (const field of section.fields || []) {
        if (field.id === key || field.dataMapping === key) return field.label;
      }
    }
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
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
  const isActionable = ['RETURNED', 'REJECTED'].includes(form.status);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
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
      </View>

      {/* Action Required Banner */}
      {isActionable && (
        <View style={[styles.actionBanner, {
          backgroundColor: statusColor + '10',
          borderColor: statusColor + '30',
        }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons
              name={form.status === 'RETURNED' ? 'arrow-undo' : 'close-circle'}
              size={20}
              color={statusColor}
            />
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

          {/* Reason/Instructions */}
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

          {/* Resubmit Button */}
          {resubmitInfo?.canResubmit && (
            <TouchableOpacity
              style={[styles.resubmitBtn, { backgroundColor: theme.accentColor }]}
              onPress={handleResubmit}
              disabled={resubmitting}
            >
              {resubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#FFF" />
                  <Text style={styles.resubmitBtnText}>
                    Resubmit for Approval
                    {resubmitInfo.remainingAttempts != null ? ` (${resubmitInfo.remainingAttempts} left)` : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {resubmitInfo && !resubmitInfo.canResubmit && (
            <View style={[styles.noResubmitBox, { backgroundColor: theme.dangerColor + '08', borderColor: theme.dangerColor + '20' }]}>
              <Ionicons name="lock-closed" size={14} color={theme.dangerColor} />
              <Text style={{ fontSize: 13, color: theme.dangerColor, flex: 1 }}>
                {resubmitInfo.reason || 'This form cannot be resubmitted.'}
              </Text>
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
          <DetailRow
            label="Resubmissions"
            value={`${form.resubmissionCount} time${form.resubmissionCount !== 1 ? 's' : ''}`}
            theme={theme}
          />
        )}
      </View>

      {/* Form Data Section */}
      {form.formData && Object.keys(form.formData).length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Form Data</Text>
          {Object.entries(form.formData).map(([key, value]) => {
            if (value === null || value === undefined || value === '') return null;
            const label = getFieldLabel(key);
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            return <DetailRow key={key} label={label} value={displayValue} theme={theme} />;
          })}
        </View>
      )}

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
            submitterName={user?.fullName}
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

      <View style={{ height: 40 }} />
      <AlertModal alert={alert} onClose={hideAlert} />
    </ScrollView>
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
  actionBanner: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  actionTitle: { fontSize: 15, fontWeight: '700' },
  actionSubtitle: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  reasonBox: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  reasonLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  reasonBody: { fontSize: 13, lineHeight: 18 },
  resubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  resubmitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  noResubmitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  section: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    }),
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
});
