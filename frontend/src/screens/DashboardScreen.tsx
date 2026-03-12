import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Platform, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { JOURNEY_TYPES, DashboardStats, FormTemplate } from '../types';
import api from '../api/client';
import ApprovalTimeline from '../components/ApprovalTimeline';
import AlertModal, { useAlert } from '../components/AlertModal';
import { getGlassStyle, getElevation, getGlowShadow, getGradientStyle, typography } from '../utils/styles';

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentForms, setRecentForms] = useState<any[]>([]);
  const [statusModal, setStatusModal] = useState<{ form: any; workflow: any; history: any[] } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const { alert, showAlert, hideAlert } = useAlert();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(0);

  // ── Resubmission State ──
  const [resubmitInfo, setResubmitInfo] = useState<any>(null);
  const [resubmitting, setResubmitting] = useState(false);

  const handleSearch = async (page = 0) => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await api.searchForms({ q: searchQuery, page, size: 15 });
      if (page === 0) setSearchResults(res.content || []);
      else setSearchResults(prev => [...prev, ...(res.content || [])]);
      setSearchTotal(res.totalElements || 0);
      setSearchPage(page);
    } catch (e: any) { showAlert('error', 'Search Failed', e.message); }
    finally { setSearchLoading(false); }
  };

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

  // Reload templates whenever Dashboard tab gains focus (e.g., after creating new template in Builder)
  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const openJourney = (journeyType: string) => {
    const tpl = templates.find(t => t.journeyType === journeyType);
    if (tpl) {
      navigation.navigate('FormEntry', { template: tpl });
    } else {
      const msg = `No published template found for ${JOURNEY_TYPES[journeyType]?.label}`;
      showAlert('warning', 'No Template', msg);
    }
  };

  const openFormStatus = async (form: any) => {
    setStatusModal({ form, workflow: null, history: [] });
    setStatusLoading(true);
    setResubmitInfo(null);
    try {
      const [workflow, history] = await Promise.all([
        api.getWorkflowByForm(form.id).catch(() => null),
        api.getApprovalHistory(form.id).catch(() => []),
      ]);
      // If workflow endpoint isn't available, infer from history + form status
      const inferredWorkflow = workflow || inferWorkflow(form, history);
      setStatusModal({ form, workflow: inferredWorkflow, history });

      // Load resubmission info for rejected/returned forms
      if (['REJECTED', 'RETURNED'].includes(form.status)) {
        try {
          const info = await api.getResubmissionInfo(form.id);
          setResubmitInfo(info);
        } catch { /* ignore */ }
      }
    } catch {
      // Keep modal open with whatever data we have
    } finally {
      setStatusLoading(false);
    }
  };

  const handleResubmit = async () => {
    if (!statusModal?.form) return;
    setResubmitting(true);
    try {
      await api.resubmitForm(statusModal.form.id);
      showAlert('success', 'Resubmitted', 'Your form has been resubmitted for approval.');
      setStatusModal(null);
      setResubmitInfo(null);
      loadData(); // Refresh the list
    } catch (e: any) {
      showAlert('error', 'Resubmit Failed', e.message);
    } finally {
      setResubmitting(false);
    }
  };

  // Infer workflow state from approval history when backend endpoint is unavailable
  const inferWorkflow = (form: any, history: any[]) => {
    if (!history || history.length === 0) {
      if (form.status === 'DRAFT') return null;
      // Form submitted but no history yet — single tier pending
      return { currentTier: 1, requiredTiers: 1, currentState: 'PENDING_TIER_1' };
    }
    const maxTier = Math.max(...history.map((a: any) => a.tier || 1));
    const lastAction = history[history.length - 1];
    const isTerminal = ['COMPLETED', 'REJECTED', 'RETURNED', 'FAILED'].includes(form.status);

    if (isTerminal) {
      return {
        currentTier: maxTier,
        requiredTiers: maxTier,
        currentState: form.status === 'COMPLETED' ? 'COMPLETED' : form.status === 'REJECTED' ? 'REJECTED' : form.status === 'RETURNED' ? 'RETURNED' : 'FAILED',
      };
    }
    // Still pending — currently at next tier after max approved
    const approvedTiers = history.filter((a: any) => a.action === 'APPROVE').map((a: any) => a.tier);
    const highestApproved = approvedTiers.length > 0 ? Math.max(...approvedTiers) : 0;
    return {
      currentTier: highestApproved + 1,
      requiredTiers: Math.max(maxTier, highestApproved + 1),
      currentState: `PENDING_TIER_${highestApproved + 1}`,
    };
  };

  const journeyKeys = Object.keys(JOURNEY_TYPES);

  const gradientBg = Platform.OS === 'web'
    ? { background: getGradientStyle(theme.gradientStart, theme.gradientEnd) }
    : {};

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentColor} />}
    >
      {/* Welcome Banner with Gradient */}
      <View
        style={[
          styles.banner,
          {
            backgroundColor: theme.primaryColor,
            borderColor: theme.borderColor,
          },
          Platform.OS === 'web' && gradientBg,
        ]}
      >
        <View style={styles.bannerContent}>
          <View style={styles.bannerText}>
            <Text style={[styles.greeting, { color: 'rgba(255,255,255,0.75)' }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: '#FFF' }]}>{user?.fullName}</Text>
            <Text style={[styles.userRole, { color: 'rgba(255,255,255,0.65)' }]}>
              {user?.role} | Branch: {user?.branchCode}
            </Text>
          </View>
          <TouchableOpacity
            onPress={logout}
            style={[
              styles.logoutBtn,
              {
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderColor: 'rgba(255,255,255,0.25)',
              },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={16} color="#FFF" />
            <Text style={styles.logoutLabel}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Role-Specific Insight Cards */}
      {stats?.insights && stats.insights.length > 0 && (
        <View style={styles.statsRow}>
          {stats.insights.map((insight, i) => {
            const glassStyle = Platform.OS === 'web' ? getGlassStyle(theme) : {};
            const glowStyle = Platform.OS === 'web' ? getGlowShadow(insight.color, 0.4) : {};
            const isUrgent = insight.trend === 'up' && insight.value > 0;
            return (
              <View
                key={insight.id || i}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: isUrgent ? insight.color + '40' : theme.borderColor,
                  },
                  Platform.OS === 'web' && glassStyle,
                  Platform.OS === 'web' && glowStyle,
                ]}
              >
                <View style={[styles.statIcon, { backgroundColor: insight.color + '20' }]}>
                  <Ionicons name={insight.icon as any} size={20} color={insight.color} />
                </View>
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>{insight.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{insight.label}</Text>
                {isUrgent && (
                  <View style={[styles.urgentDot, { backgroundColor: insight.color }]} />
                )}
              </View>
            );
          })}
        </View>
      )}
      {/* Fallback for old API without insights */}
      {stats && !stats.insights && (
        <View style={styles.statsRow}>
          {[
            { label: 'Total Forms', value: stats.totalForms, color: theme.accentColor, icon: 'documents' },
            { label: 'Pending', value: stats.pendingApproval, color: theme.warningColor, icon: 'hourglass' },
            { label: 'Completed', value: stats.approvedToday, color: theme.successColor, icon: 'checkmark-circle' },
            { label: 'Rejected', value: stats.rejectedToday, color: theme.dangerColor, icon: 'close-circle' },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
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
          const glassStyle = Platform.OS === 'web' ? getGlassStyle(theme) : {};
          const glowStyle = Platform.OS === 'web' ? getGlowShadow(j.color, 0.6) : {};

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.journeyTile,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.borderColor,
                  opacity: hasTpl ? 1 : 0.5,
                },
                Platform.OS === 'web' && glassStyle,
                Platform.OS === 'web' && glowStyle,
              ]}
              onPress={() => openJourney(key)}
              disabled={!hasTpl}
            >
              <View style={[styles.journeyIcon, { backgroundColor: j.color + '20', borderColor: j.color + '40' }]}>
                <Ionicons name={j.icon as any} size={28} color={j.color} />
              </View>
              <Text style={[styles.journeyLabel, { color: theme.textPrimary }]} numberOfLines={2}>
                {j.label}
              </Text>
              {!hasTpl && (
                <Text style={[styles.noTemplate, { color: theme.textTertiary }]}>No template</Text>
              )}
            </TouchableOpacity>
          );
        })}
        {/* Invisible spacers to keep last row tiles same size as others */}
        {Array.from({ length: (4 - (journeyKeys.length % 4)) % 4 }).map((_, i) => (
          <View key={`spacer-${i}`} style={styles.journeyTileSpacer} />
        ))}
      </View>

      {/* Recent Forms */}
      {recentForms.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>Recent Submissions</Text>
            <TouchableOpacity
              style={[styles.searchHistoryBtn, { backgroundColor: theme.accentColor + '15', borderColor: theme.accentColor + '30' }]}
              onPress={() => setShowSearchModal(true)}
            >
              <Ionicons name="search" size={14} color={theme.accentColor} />
              <Text style={[styles.searchHistoryText, { color: theme.accentColor }]}>Search History</Text>
            </TouchableOpacity>
          </View>
          {recentForms.map((form: any) => {
            const statusColor = getStatusColor(form.status, theme);
            const elevationStyle = Platform.OS === 'web' ? getElevation('low', theme) : {};
            return (
              <TouchableOpacity
                key={form.id}
                style={[
                  styles.recentCard,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.borderColor,
                    borderLeftColor: statusColor,
                  },
                  Platform.OS === 'web' && elevationStyle,
                ]}
                onPress={() => navigation.navigate('FormDetail', { formId: form.id, form })}
              >
                <View style={styles.recentRow}>
                  <Text style={[styles.recentRef, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: statusColor + '20',
                        borderColor: statusColor + '40',
                      },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusColor }]}>{form.status}</Text>
                  </View>
                </View>
                <Text style={[styles.recentJourney, { color: theme.textSecondary }]}>
                  {JOURNEY_TYPES[form.journeyType]?.label} | {form.currency} {form.amount?.toLocaleString()}
                </Text>
                {form.status === 'RETURNED' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Ionicons name="arrow-undo" size={12} color={theme.warningColor} />
                    <Text style={{ fontSize: 11, color: theme.warningColor, fontWeight: '600' }}>Returned for corrections</Text>
                  </View>
                )}
                {form.status === 'REJECTED' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Ionicons name="close-circle" size={12} color={theme.dangerColor} />
                    <Text style={{ fontSize: 11, color: theme.dangerColor, fontWeight: '600' }}>Rejected — tap to view</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </>
      )}

      <View style={{ height: 40 }} />

      {/* Search History Modal */}
      <Modal visible={showSearchModal} animationType="slide" transparent>
        <View style={[styles.statusModalOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]}>
          <View style={[styles.statusModalContent, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
            <View style={[styles.statusModalHeader, { borderBottomColor: theme.borderColor }]}>
              <Text style={[styles.statusModalTitle, { color: theme.textPrimary }]}>Search Forms</Text>
              <TouchableOpacity onPress={() => { setShowSearchModal(false); setSearchResults([]); setSearchQuery(''); }}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <View style={[styles.searchInputRow, { borderColor: theme.borderColor, backgroundColor: theme.surfaceElevated }]}>
                <Ionicons name="search" size={18} color={theme.textTertiary} />
                <TextInput
                  style={[styles.searchInputField, { color: theme.textPrimary }]}
                  placeholder="Reference number or customer name..."
                  placeholderTextColor={theme.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => handleSearch(0)}
                  autoFocus
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                    <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={[styles.searchGoBtn, { backgroundColor: theme.primaryColor, opacity: searchLoading || !searchQuery.trim() ? 0.5 : 1 }]}
                onPress={() => handleSearch(0)}
                disabled={searchLoading || !searchQuery.trim()}
              >
                <Ionicons name="search" size={16} color="#FFF" />
                <Text style={styles.searchGoBtnText}>{searchLoading ? 'Searching...' : 'Search'}</Text>
              </TouchableOpacity>
              {searchResults.length > 0 && (
                <Text style={[{ fontSize: 12, color: theme.textTertiary, marginTop: 8 }]}>{searchTotal} result{searchTotal !== 1 ? 's' : ''}</Text>
              )}
            </View>
            <ScrollView style={{ maxHeight: 400, paddingHorizontal: 16, paddingTop: 8 }}>
              {searchResults.map((form: any) => {
                const statusColor = getStatusColor(form.status, theme);
                return (
                  <TouchableOpacity
                    key={form.id}
                    style={[styles.recentCard, {
                      backgroundColor: theme.surfaceElevated,
                      borderColor: theme.borderColor,
                      borderLeftColor: statusColor,
                      marginHorizontal: 0,
                    }]}
                    onPress={() => { setShowSearchModal(false); navigation.navigate('FormDetail', { formId: form.id, form }); }}
                  >
                    <View style={styles.recentRow}>
                      <Text style={[styles.recentRef, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{form.status}</Text>
                      </View>
                    </View>
                    <Text style={[styles.recentJourney, { color: theme.textSecondary }]}>
                      {JOURNEY_TYPES[form.journeyType]?.label} | {form.currency} {form.amount?.toLocaleString()}
                    </Text>
                    <Text style={[{ fontSize: 11, color: theme.textTertiary, marginTop: 4 }]}>
                      {form.customerName || form.createdBy} | {new Date(form.createdAt).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {searchResults.length > 0 && searchResults.length < searchTotal && (
                <TouchableOpacity
                  style={[{ borderWidth: 1.5, borderColor: theme.accentColor, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 16 }]}
                  onPress={() => handleSearch(searchPage + 1)}
                  disabled={searchLoading}
                >
                  <Text style={[{ color: theme.accentColor, fontWeight: '700', fontSize: 13 }]}>{searchLoading ? 'Loading...' : 'Load More'}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Form Status Modal */}
      <Modal visible={!!statusModal} animationType="slide" transparent>
        <View style={[styles.statusModalOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]}>
          <View style={[styles.statusModalContent, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
            <View style={[styles.statusModalHeader, { borderBottomColor: theme.borderColor }]}>
              <Text style={[styles.statusModalTitle, { color: theme.textPrimary }]}>Form Status</Text>
              <TouchableOpacity onPress={() => setStatusModal(null)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            {statusModal?.form && (
              <ScrollView style={styles.statusModalBody}>
                {/* Form Info Header */}
                <Text style={[styles.statusRef, { color: theme.accentColor }]}>{statusModal.form.referenceNumber}</Text>
                <Text style={[styles.statusJourney, { color: theme.textSecondary }]}>
                  {JOURNEY_TYPES[statusModal.form.journeyType]?.label || statusModal.form.journeyType}
                </Text>
                <View style={styles.statusInfoRow}>
                  <Text style={[styles.statusAmount, { color: theme.textPrimary }]}>
                    {statusModal.form.currency} {statusModal.form.amount?.toLocaleString()}
                  </Text>
                  <View style={[styles.statusBadgeLg, {
                    backgroundColor: getStatusColor(statusModal.form.status, theme) + '20',
                    borderColor: getStatusColor(statusModal.form.status, theme) + '40',
                  }]}>
                    <Text style={[styles.statusBadgeLgText, { color: getStatusColor(statusModal.form.status, theme) }]}>
                      {statusModal.form.status?.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                {/* Timeline */}
                {statusLoading ? (
                  <View style={[{ backgroundColor: theme.surfaceElevated, borderRadius: 12, padding: 20, marginTop: 16, alignItems: 'center' }]}>
                    <Text style={{ color: theme.textTertiary, fontSize: 12 }}>Loading approval history...</Text>
                  </View>
                ) : statusModal.workflow ? (
                  <ApprovalTimeline
                    approvalHistory={statusModal.history}
                    currentTier={statusModal.workflow.currentTier || 1}
                    requiredTiers={statusModal.workflow.requiredTiers || 0}
                    currentState={statusModal.workflow.currentState || ''}
                    formStatus={statusModal.form.status}
                    submittedAt={statusModal.form.submittedAt || statusModal.form.createdAt}
                    submitterName={user?.fullName}
                    tierRoles={statusModal.workflow.tierRoles}
                    resubmissionCount={statusModal.form.resubmissionCount}
                    rejectionReason={statusModal.form.lastRejectionReason}
                    returnInstructions={statusModal.form.lastReturnInstructions}
                  />
                ) : statusModal.form.status === 'DRAFT' ? (
                  <View style={[{ backgroundColor: theme.surfaceElevated, borderRadius: 12, padding: 16, marginTop: 16 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.primaryColor || theme.accentColor, marginHorizontal: 0, marginTop: 0 }]}>
                      Approval History
                    </Text>
                    <Text style={{ color: theme.textTertiary, fontSize: 12 }}>This form has not been submitted yet.</Text>
                  </View>
                ) : (
                  <View style={[{ backgroundColor: theme.surfaceElevated, borderRadius: 12, padding: 16, marginTop: 16 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.primaryColor || theme.accentColor, marginHorizontal: 0, marginTop: 0 }]}>
                      Approval History
                    </Text>
                    <Text style={{ color: theme.textTertiary, fontSize: 12 }}>No workflow data available.</Text>
                  </View>
                )}

                {/* Rejection / Return Info Banner */}
                {statusModal.form.status === 'REJECTED' && statusModal.form.lastRejectionReason && (
                  <View style={[styles.rejectionBanner, { backgroundColor: theme.dangerColor + '10', borderColor: theme.dangerColor + '30' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Ionicons name="close-circle" size={16} color={theme.dangerColor} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.dangerColor }}>Rejection Reason</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 18 }}>{statusModal.form.lastRejectionReason}</Text>
                  </View>
                )}
                {statusModal.form.status === 'RETURNED' && statusModal.form.lastReturnInstructions && (
                  <View style={[styles.rejectionBanner, { backgroundColor: theme.warningColor + '10', borderColor: theme.warningColor + '30' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Ionicons name="arrow-undo" size={16} color={theme.warningColor} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.warningColor }}>Correction Instructions</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: theme.textPrimary, lineHeight: 18 }}>{statusModal.form.lastReturnInstructions}</Text>
                  </View>
                )}

                {/* Resubmission Info */}
                {resubmitInfo && ['REJECTED', 'RETURNED'].includes(statusModal.form.status) && (
                  <View style={[styles.resubmitSection, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}>
                    {resubmitInfo.canResubmit ? (
                      <>
                        <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>
                          {resubmitInfo.remainingAttempts != null && resubmitInfo.remainingAttempts > 0
                            ? `You can resubmit this form (${resubmitInfo.remainingAttempts} attempt${resubmitInfo.remainingAttempts !== 1 ? 's' : ''} remaining).`
                            : 'You can resubmit this form for review.'}
                        </Text>
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
                              <Text style={styles.resubmitBtnText}>Resubmit for Approval</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="lock-closed" size={16} color={theme.dangerColor} />
                        <Text style={{ fontSize: 13, color: theme.dangerColor, flex: 1 }}>
                          {resubmitInfo.reason || 'This form cannot be resubmitted.'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Resubmission Count Badge */}
                {statusModal.form.resubmissionCount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                    <Ionicons name="repeat" size={14} color={theme.textTertiary} />
                    <Text style={{ fontSize: 12, color: theme.textTertiary }}>
                      Resubmitted {statusModal.form.resubmissionCount} time{statusModal.form.resubmissionCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
            <View style={styles.statusModalFooter}>
              <TouchableOpacity
                style={[styles.statusDoneBtn, { backgroundColor: theme.accentColor }]}
                onPress={() => setStatusModal(null)}
              >
                <Text style={styles.statusDoneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <AlertModal alert={alert} onClose={hideAlert} />
    </ScrollView>
  );
}

function getStatusColor(status: string, theme: any): string {
  const statusMap: Record<string, string> = {
    DRAFT: theme.textTertiary,
    PENDING_APPROVAL: theme.warningColor,
    COMPLETED: theme.successColor,
    REJECTED: theme.dangerColor,
    RETURNED: theme.warningColor,
    FAILED: theme.dangerColor,
  };
  return statusMap[status] || theme.textTertiary;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    padding: 24,
    paddingTop: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(20, 35, 60, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  userRole: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 16,
  },
  logoutLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
  },
  statCard: {
    flexBasis: '22%',
    flexGrow: 1,
    minWidth: 140,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  urgentDot: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 14,
  },
  journeyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  journeyTile: {
    flexBasis: '22%',
    flexGrow: 1,
    maxWidth: '24%',
    minWidth: 120,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.3s ease',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  journeyIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  journeyLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  noTemplate: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  recentCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentRef: {
    fontWeight: '700',
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recentJourney: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '400',
  },
  // Section header with search
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 24, marginBottom: 14 },
  searchHistoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  searchHistoryText: { fontSize: 12, fontWeight: '600' },
  searchInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInputField: { flex: 1, fontSize: 14 },
  searchGoBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 10, paddingVertical: 10, marginTop: 8 },
  searchGoBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  // Status Modal styles
  statusModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  statusModalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', borderWidth: 1, borderBottomWidth: 0 },
  statusModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  statusModalTitle: { fontSize: 18, fontWeight: '700' },
  statusModalBody: { padding: 20, maxHeight: 500 },
  statusRef: { fontSize: 16, fontWeight: '700' },
  statusJourney: { fontSize: 13, marginTop: 4 },
  statusInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  statusAmount: { fontSize: 22, fontWeight: '800' },
  statusBadgeLg: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  statusBadgeLgText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' as any },
  statusModalFooter: { padding: 20 },
  statusDoneBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  statusDoneBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  journeyTileSpacer: {
    flexBasis: '22%',
    flexGrow: 1,
    maxWidth: '24%',
    minWidth: 120,
    padding: 16,
  },
  // Rejection / Return banners
  rejectionBanner: {
    marginTop: 12,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  // Resubmit section
  resubmitSection: {
    marginTop: 12,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
  },
  resubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  resubmitBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
