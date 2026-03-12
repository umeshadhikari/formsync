import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, TextInput, Modal, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { QueueItem, JOURNEY_TYPES } from '../types';
import { getGlassStyle, getGlowShadow, getElevation } from '../utils/styles';
import api from '../api/client';
import ApprovalTimeline from '../components/ApprovalTimeline';
import AlertModal, { useAlert } from '../components/AlertModal';

type TabKey = 'queue' | 'myItems' | 'search';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { alert, showAlert, hideAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<TabKey>('queue');

  // ── Queue State ──
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queuePage, setQueuePage] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueLoadingMore, setQueueLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [actionResult, setActionResult] = useState<any>(null);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);

  // ── Rejection/Return Policy State ──
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState('');
  const [returnInstructions, setReturnInstructions] = useState('');
  const [rejectionPolicy, setRejectionPolicy] = useState('PERMANENT');
  const [requireRejectionReason, setRequireRejectionReason] = useState(true);
  const [requireReturnInstructions, setRequireReturnInstructions] = useState(true);

  // ── My Items State ──
  const [myItems, setMyItems] = useState<any[]>([]);
  const [myItemsPage, setMyItemsPage] = useState(0);
  const [myItemsTotal, setMyItemsTotal] = useState(0);
  const [myItemsLoading, setMyItemsLoading] = useState(false);
  const [myItemsLoadingMore, setMyItemsLoadingMore] = useState(false);
  const [myItemDetail, setMyItemDetail] = useState<any>(null);
  const [myItemHistory, setMyItemHistory] = useState<any[]>([]);
  const [myItemHistoryLoading, setMyItemHistoryLoading] = useState(false);

  // ── Search State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchJourney, setSearchJourney] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [searchTotal, setSearchTotal] = useState(0);

  // ── Dashboard Insights State ──
  const [insights, setInsights] = useState<any[]>([]);

  const loadInsights = useCallback(async () => {
    try {
      const data = await api.getDashboard();
      if (data?.insights) setInsights(data.insights);
    } catch { /* ignore */ }
  }, []);

  // ── Queue Loading (role-filtered, paginated) ──
  const loadQueue = useCallback(async (page = 0, append = false) => {
    try {
      const data = await api.getPendingQueue(user?.role, page, 20);
      const items = data?.content || data || [];
      const total = data?.totalElements ?? items.length;
      if (append) setQueue(prev => [...prev, ...items]);
      else setQueue(items);
      setQueuePage(page);
      setQueueTotal(total);
    } catch (e: any) { console.error(e); }
  }, [user?.role]);

  const loadMoreQueue = async () => {
    if (queue.length >= queueTotal || queueLoadingMore) return;
    setQueueLoadingMore(true);
    await loadQueue(queuePage + 1, true);
    setQueueLoadingMore(false);
  };

  // ── Unified refresh: reloads queue + insights together ──
  const refreshAll = useCallback(async () => {
    await Promise.all([loadQueue(), loadInsights()]);
  }, [loadQueue, loadInsights]);

  useEffect(() => { refreshAll(); }, []);

  // Refresh data whenever the screen gains focus (e.g., navigating back from another tab)
  useFocusEffect(
    useCallback(() => { refreshAll(); }, [refreshAll])
  );

  // Auto-refresh queue + insights every 30 seconds
  useEffect(() => {
    if (activeTab !== 'queue') return;
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, [activeTab, refreshAll]);

  const onRefresh = async () => { setRefreshing(true); await refreshAll(); setRefreshing(false); };

  // ── My Items Loading (paginated) ──
  const loadMyItems = useCallback(async (page = 0, append = false) => {
    if (!append) setMyItemsLoading(true);
    try {
      const data = await api.getMyItems(page, 20);
      const items = data?.content || data || [];
      const total = data?.totalElements ?? items.length;
      if (append) setMyItems(prev => [...prev, ...items]);
      else setMyItems(items);
      setMyItemsPage(page);
      setMyItemsTotal(total);
    } catch (e: any) { console.error(e); }
    finally { setMyItemsLoading(false); }
  }, []);

  const loadMoreMyItems = async () => {
    if (myItems.length >= myItemsTotal || myItemsLoadingMore) return;
    setMyItemsLoadingMore(true);
    await loadMyItems(myItemsPage + 1, true);
    setMyItemsLoadingMore(false);
  };

  // Always reload My Items when the tab is selected (ensures fresh data after actions)
  useEffect(() => { if (activeTab === 'myItems') loadMyItems(); }, [activeTab, loadMyItems]);

  // ── Claim / Pickup ──
  const handleClaim = async (formId: number) => {
    setClaiming(formId);
    try {
      await api.claimForm(formId);
      const freshData = await api.getPendingQueue(user?.role, 0, 20);
      const freshItems = freshData?.content || freshData || [];
      setQueue(freshItems);
      setQueuePage(0);
      setQueueTotal(freshData?.totalElements ?? freshItems.length);
      loadInsights();
      // Find the item from freshly loaded queue (not stale state)
      const item = freshItems.find((q: QueueItem) => q.form.id === formId);
      if (item) openDetail(item);
    } catch (e: any) {
      showAlert('error', 'Cannot Pick Up', e.message);
    } finally { setClaiming(null); }
  };

  const handleRelease = async (formId: number) => {
    try {
      await api.releaseForm(formId);
      await refreshAll();
      setShowModal(false);
    } catch (e: any) {
      showAlert('error', 'Cannot Release', e.message);
    }
  };

  // ── Detail Modal ──
  const openDetail = (item: QueueItem) => {
    setSelectedItem(item);
    setShowModal(true);
    setComments('');
    setSelectedRejectionReason('');
    setReturnInstructions('');
    setApprovalHistory([]);
    setHistoryLoading(true);
    api.getApprovalHistory(item.form.id)
      .then(history => setApprovalHistory(history))
      .catch(() => setApprovalHistory([]))
      .finally(() => setHistoryLoading(false));
    // Load rejection config from the queue item's workflow data (API adds extra fields beyond the typed interface)
    const wf: any = item.workflow;
    if (wf) {
      setRejectionReasons(wf.rejectionReasons || []);
      setRejectionPolicy(wf.rejectionPolicy || 'PERMANENT');
      setRequireRejectionReason(wf.requireRejectionReason !== false);
      setRequireReturnInstructions(wf.requireReturnInstructions !== false);
    }
  };

  const toggleSelection = (formId: number) => {
    const newSet = new Set(selectedIds);
    newSet.has(formId) ? newSet.delete(formId) : newSet.add(formId);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === queue.length ? new Set() : new Set(queue.map(item => item.form.id)));
  };

  const calculateTimeRemaining = (slaDeadline?: string) => {
    if (!slaDeadline) return { display: 'No SLA', isWarning: false };
    const diffMs = new Date(slaDeadline).getTime() - Date.now();
    if (diffMs < 0) return { display: 'Overdue', isWarning: true };
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    if (hours > 0) return { display: `${hours}h ${minutes}m`, isWarning: hours < 2 };
    return { display: `${minutes}m`, isWarning: minutes < 30 };
  };

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      await api.bulkApprove(Array.from(selectedIds), comments);
      setActionResult({ type: 'BULK_APPROVE', count: selectedIds.size });
      setSelectedIds(new Set());
      setComments('');
      refreshAll();
    } catch (e: any) { setActionResult({ type: 'ERROR', errorMsg: e.message }); }
    finally { setBulkProcessing(false); }
  }

  async function handleAction(action: 'APPROVE' | 'REJECT' | 'RETURN') {
    if (!selectedItem) return;
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
      const formId = selectedItem.form.id;
      const payload: any = { action, comments };
      if (action === 'REJECT') {
        payload.rejectionReason = selectedRejectionReason || comments;
      }
      if (action === 'RETURN') {
        payload.returnInstructions = returnInstructions || comments;
      }
      if (action === 'APPROVE') await api.approveForm(formId, payload);
      else if (action === 'REJECT') await api.rejectForm(formId, payload);
      else await api.returnForm(formId, payload);
      const form = selectedItem.form;
      const journeyLabel = JOURNEY_TYPES[form.journeyType]?.label || form.journeyType;
      const resultData: any = { type: action, ref: form.referenceNumber, journey: journeyLabel, amount: `${form.currency} ${form.amount?.toLocaleString()}` };
      if (action === 'REJECT') resultData.rejectionPolicy = rejectionPolicy;
      setActionResult(resultData);
      setShowModal(false);
      refreshAll();
    } catch (e: any) { setActionResult({ type: 'ERROR', errorMsg: e.message }); }
    finally { setProcessing(false); }
  }

  // ── Search ──
  const handleSearch = async (page = 0) => {
    setSearchLoading(true);
    try {
      const res = await api.searchForms({
        q: searchQuery || undefined,
        journeyType: searchJourney || undefined,
        status: searchStatus || undefined,
        dateFrom: searchDateFrom || undefined,
        dateTo: searchDateTo || undefined,
        page,
        size: 20,
      });
      if (page === 0) setSearchResults(res.content || []);
      else setSearchResults(prev => [...prev, ...(res.content || [])]);
      setSearchTotal(res.totalElements || 0);
      setSearchPage(page);
    } catch (e: any) { showAlert('error', 'Search Failed', e.message); }
    finally { setSearchLoading(false); }
  };

  // ── My Item Detail ──
  const openMyItemDetail = (item: any) => {
    setMyItemDetail(item);
    setMyItemHistory([]);
    setMyItemHistoryLoading(true);
    api.getApprovalHistory(item.form.id)
      .then(history => setMyItemHistory(history))
      .catch(() => setMyItemHistory([]))
      .finally(() => setMyItemHistoryLoading(false));
  };

  const openSearchItemDetail = (form: any) => {
    setMyItemHistory([]);
    setMyItemHistoryLoading(true);
    // Wrap the flat form object into the structure the detail modal expects
    const wrapped: any = { form, workflow: null, relationship: 'Search Result' };
    setMyItemDetail(wrapped);
    // Fetch workflow + approval history in parallel
    Promise.all([
      api.getWorkflowByForm(form.id).catch(() => null),
      api.getApprovalHistory(form.id).catch(() => []),
    ]).then(([workflow, history]) => {
      setMyItemDetail((prev: any) => prev ? { ...prev, workflow } : prev);
      setMyItemHistory(history);
    }).finally(() => setMyItemHistoryLoading(false));
  };

  // ── Helpers ──
  const isClaimedByMe = (wf: any) => wf?.claimedBy === user?.username;
  const isClaimedByOther = (wf: any) => wf?.claimedBy && wf.claimedBy !== user?.username;

  const STATUS_COLORS: Record<string, string> = {
    PENDING_APPROVAL: theme.warningColor, PENDING_TIER_1: theme.warningColor, PENDING_TIER_2: '#E67E22', PENDING_TIER_3: '#D35400',
    COMPLETED: theme.successColor, APPROVED: theme.successColor, REJECTED: theme.dangerColor,
    RETURNED: '#F97316', FAILED: theme.dangerColor, DRAFT: theme.textTertiary, SUBMITTING_CBS: '#3B82F6', ARCHIVING_DMS: '#8B5CF6',
  };

  const JOURNEY_LABELS = ['CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'DEMAND_DRAFT', 'FUNDS_TRANSFER', 'ACCOUNT_OPENING', 'LOAN_DISBURSEMENT'];
  const STATUS_OPTIONS = ['PENDING_APPROVAL', 'COMPLETED', 'APPROVED', 'REJECTED', 'RETURNED', 'FAILED', 'DRAFT'];

  // ── Tab Bar ──
  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: 'queue', label: 'My Queue', icon: 'layers', badge: queue.length },
    { key: 'myItems', label: 'My Items', icon: 'person' },
    { key: 'search', label: 'Search', icon: 'search' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.surfaceColor, borderBottomColor: theme.borderColor }]}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: theme.accentColor, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? theme.accentColor : theme.textTertiary} />
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? theme.accentColor : theme.textTertiary }]}>{tab.label}</Text>
            {tab.badge != null && tab.badge > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: theme.dangerColor }]}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══════════════ TAB 1: MY QUEUE ═══════════════ */}
      {activeTab === 'queue' && (
        <>
          {/* Role-Specific Insight Pills */}
          {insights.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsBar} contentContainerStyle={styles.insightsBarContent}>
              {insights.map((insight: any) => {
                const isUrgent = insight.trend === 'up' && insight.value > 0;
                return (
                  <View key={insight.id} style={[styles.insightPill, { backgroundColor: insight.color + '12', borderColor: isUrgent ? insight.color + '40' : 'transparent' }]}>
                    <Ionicons name={insight.icon as any} size={14} color={insight.color} />
                    <Text style={[styles.insightValue, { color: insight.color }]}>{insight.value}</Text>
                    <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>{insight.label}</Text>
                    {isUrgent && <View style={[styles.insightDot, { backgroundColor: insight.color }]} />}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Select All Bar */}
          {queue.length > 0 && (
            <View style={[styles.selectAllBar, { backgroundColor: theme.surfaceColor, borderBottomColor: theme.borderColor }]}>
              <TouchableOpacity style={[styles.checkbox, { borderColor: theme.accentColor, backgroundColor: selectedIds.size === queue.length ? theme.accentColor : 'transparent' }]} onPress={toggleSelectAll}>
                {selectedIds.size === queue.length && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </TouchableOpacity>
              <Text style={[styles.selectAllText, { color: theme.textPrimary }]}>Select All</Text>
              {selectedIds.size > 0 && <Text style={[styles.selectedCount, { color: theme.accentColor }]}>({selectedIds.size} selected)</Text>}
            </View>
          )}

          <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {queue.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-done-circle" size={64} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No pending approvals for your role</Text>
                <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>Items requiring {user?.role?.replace('_', ' ')} review will appear here</Text>
              </View>
            ) : (
              queue.map(item => {
                const form = item.form;
                const wf = item.workflow;
                if (!form) return null;
                const journeyInfo = JOURNEY_TYPES[form.journeyType] || { label: form.journeyType, color: '#888' };
                const isSelected = selectedIds.has(form.id);
                const slaInfo = calculateTimeRemaining(wf?.slaDeadline);
                const claimedByMe = isClaimedByMe(wf);
                const claimedByOther = isClaimedByOther(wf);

                return (
                  <View key={form.id} style={[styles.cardWrapper, { backgroundColor: claimedByMe ? theme.accentColor + '08' : isSelected ? theme.accentColor + '10' : 'transparent' }]}>
                    <View style={styles.cardRow}>
                      <TouchableOpacity
                        style={[styles.checkbox, { borderColor: theme.accentColor, backgroundColor: isSelected ? theme.accentColor : 'transparent', marginTop: 16 }]}
                        onPress={() => toggleSelection(form.id)}
                      >
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                      </TouchableOpacity>
                      <View style={[styles.card, getGlassStyle(theme), getElevation(2, theme), { flex: 1 }]}>
                        <View style={[styles.cardBorder, { backgroundColor: claimedByMe ? theme.accentColor : journeyInfo.color }]} />
                        <View style={styles.cardHeader}>
                          <View style={[styles.journeyBadge, { backgroundColor: journeyInfo.color + '20' }]}>
                            <Text style={[styles.journeyBadgeText, { color: journeyInfo.color }]}>{journeyInfo.label}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <View style={[styles.tierBadge, { backgroundColor: theme.warningColor + '20' }]}>
                              <Text style={[styles.tierText, { color: theme.warningColor }]}>Tier {wf?.currentTier || 1}</Text>
                            </View>
                            {wf?.escalated && (
                              <View style={[styles.tierBadge, { backgroundColor: theme.dangerColor + '20' }]}>
                                <Text style={[styles.tierText, { color: theme.dangerColor }]}>Escalated</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <Text style={[styles.refNumber, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
                        <View style={styles.cardDetails}>
                          <Text style={[styles.detailText, { color: theme.textPrimary, fontWeight: '700' }]}>{form.currency} {form.amount?.toLocaleString()}</Text>
                          <Text style={[styles.detailText, { color: theme.textSecondary }]}>By: {form.createdBy}</Text>
                        </View>

                        {/* Claim Status + Actions */}
                        <View style={[styles.claimRow, { borderTopColor: theme.borderColor }]}>
                          {claimedByMe ? (
                            <>
                              <View style={[styles.claimBadge, { backgroundColor: theme.accentColor + '15' }]}>
                                <Ionicons name="lock-closed" size={12} color={theme.accentColor} />
                                <Text style={[styles.claimBadgeText, { color: theme.accentColor }]}>Picked up by you</Text>
                              </View>
                              <View style={{ flexDirection: 'row', gap: 6 }}>
                                <TouchableOpacity style={[styles.claimActionBtn, { backgroundColor: theme.textTertiary + '20' }]} onPress={() => handleRelease(form.id)}>
                                  <Ionicons name="lock-open" size={14} color={theme.textSecondary} />
                                  <Text style={[styles.claimActionText, { color: theme.textSecondary }]}>Release</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.claimActionBtn, { backgroundColor: theme.accentColor }]} onPress={() => openDetail(item)}>
                                  <Ionicons name="eye" size={14} color="#FFF" />
                                  <Text style={[styles.claimActionText, { color: '#FFF' }]}>Review</Text>
                                </TouchableOpacity>
                              </View>
                            </>
                          ) : claimedByOther ? (
                            <View style={[styles.claimBadge, { backgroundColor: theme.textTertiary + '15' }]}>
                              <Ionicons name="lock-closed" size={12} color={theme.textTertiary} />
                              <Text style={[styles.claimBadgeText, { color: theme.textTertiary }]}>Picked up by {wf?.claimedByName}</Text>
                            </View>
                          ) : (
                            <>
                              <View style={styles.slaRow}>
                                <View style={[styles.slaTimer, { backgroundColor: slaInfo.isWarning ? theme.dangerColor + '20' : theme.successColor + '20' }]}>
                                  <Ionicons name={slaInfo.isWarning ? 'alert-circle' : 'timer'} size={12} color={slaInfo.isWarning ? theme.dangerColor : theme.successColor} />
                                  <Text style={[styles.slaText, { color: slaInfo.isWarning ? theme.dangerColor : theme.successColor }]}>{slaInfo.display}</Text>
                                </View>
                                <Text style={[styles.dateText, { color: theme.textTertiary }]}>{new Date(form.createdAt).toLocaleDateString()}</Text>
                              </View>
                              <TouchableOpacity
                                style={[styles.pickupBtn, { backgroundColor: theme.primaryColor, ...getGlowShadow(theme.primaryColor, 0.3) }]}
                                onPress={() => handleClaim(form.id)}
                                disabled={claiming === form.id}
                              >
                                <Ionicons name="hand-left" size={14} color="#FFF" />
                                <Text style={styles.pickupBtnText}>{claiming === form.id ? 'Picking up...' : 'Pick Up'}</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
            {/* Load More Queue */}
            {queue.length > 0 && queue.length < queueTotal && (
              <TouchableOpacity
                style={[styles.loadMoreBtn, { borderColor: theme.accentColor }]}
                onPress={loadMoreQueue}
                disabled={queueLoadingMore}
              >
                <Text style={[styles.loadMoreText, { color: theme.accentColor }]}>{queueLoadingMore ? 'Loading...' : `Load More (${queue.length} of ${queueTotal})`}</Text>
              </TouchableOpacity>
            )}
            {selectedIds.size > 0 && <View style={{ height: 100 }} />}
          </ScrollView>

          {/* Bulk Approve Floating Button */}
          {selectedIds.size > 0 && (
            <View style={[styles.floatingBulkBar, { backgroundColor: theme.accentColor, ...getGlowShadow(theme.accentColor, 0.5) }]}>
              <Text style={styles.bulkCountText}>{selectedIds.size} selected</Text>
              <TouchableOpacity style={[styles.bulkApproveBtn, { backgroundColor: theme.successColor, opacity: bulkProcessing ? 0.6 : 1 }]} onPress={handleBulkApprove} disabled={bulkProcessing}>
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.bulkApproveBtnText}>Bulk Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* ═══════════════ TAB 2: MY ITEMS ═══════════════ */}
      {activeTab === 'myItems' && (
        <ScrollView refreshControl={<RefreshControl refreshing={myItemsLoading} onRefresh={loadMyItems} />}>
          {myItems.length === 0 && !myItemsLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open" size={64} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No items yet</Text>
              <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>Forms you create or action will appear here</Text>
            </View>
          ) : (
            myItems.map((item, idx) => {
              const form = item.form;
              if (!form) return null;
              const journeyInfo = JOURNEY_TYPES[form.journeyType] || { label: form.journeyType, color: '#888' };
              const statusColor = STATUS_COLORS[form.status] || '#888';
              const wfState = item.workflow?.currentState || form.status;

              return (
                <TouchableOpacity key={form.id || idx} style={[styles.cardWrapper, { paddingHorizontal: 16 }]} onPress={() => openMyItemDetail(item)} activeOpacity={0.7}>
                  <View style={[styles.card, getGlassStyle(theme), getElevation(1, theme)]}>
                    <View style={[styles.cardBorder, { backgroundColor: journeyInfo.color }]} />
                    <View style={styles.cardHeader}>
                      <View style={[styles.journeyBadge, { backgroundColor: journeyInfo.color + '20' }]}>
                        <Text style={[styles.journeyBadgeText, { color: journeyInfo.color }]}>{journeyInfo.label}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{wfState.replace(/_/g, ' ')}</Text>
                      </View>
                    </View>
                    <Text style={[styles.refNumber, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
                    <View style={styles.cardDetails}>
                      <Text style={[styles.detailText, { color: theme.textPrimary, fontWeight: '700' }]}>{form.currency} {form.amount?.toLocaleString()}</Text>
                      <Text style={[styles.detailText, { color: theme.textSecondary }]}>{form.customerName}</Text>
                    </View>
                    <View style={[styles.myItemFooter, { borderTopColor: theme.borderColor }]}>
                      <View style={[styles.relationBadge, { backgroundColor: theme.primaryColor + '15' }]}>
                        <Ionicons name={item.relationship?.includes('Created') ? 'create' : 'checkmark-done'} size={12} color={theme.primaryColor} />
                        <Text style={[styles.relationText, { color: theme.primaryColor }]}>{item.relationship}</Text>
                      </View>
                      <Text style={[styles.dateText, { color: theme.textTertiary }]}>{new Date(form.submittedAt || form.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          {/* Load More My Items */}
          {myItems.length > 0 && myItems.length < myItemsTotal && (
            <TouchableOpacity
              style={[styles.loadMoreBtn, { borderColor: theme.accentColor }]}
              onPress={loadMoreMyItems}
              disabled={myItemsLoadingMore}
            >
              <Text style={[styles.loadMoreText, { color: theme.accentColor }]}>{myItemsLoadingMore ? 'Loading...' : `Load More (${myItems.length} of ${myItemsTotal})`}</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ═══════════════ TAB 3: SEARCH ═══════════════ */}
      {activeTab === 'search' && (
        <ScrollView>
          <View style={[styles.searchPanel, { backgroundColor: theme.surfaceColor }]}>
            {/* Search Input with inline button */}
            <View style={styles.searchRow}>
              <View style={[styles.searchInputContainer, { flex: 1, borderColor: theme.borderColor, backgroundColor: theme.inputBackground || theme.surfaceElevated }]}>
                <Ionicons name="search" size={16} color={theme.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                  placeholder="Reference or customer name..."
                  placeholderTextColor={theme.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => handleSearch(0)}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={theme.textTertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={[styles.searchBtn, { backgroundColor: theme.primaryColor, opacity: searchLoading ? 0.6 : 1 }]}
                onPress={() => handleSearch(0)}
                disabled={searchLoading}
              >
                <Ionicons name="search" size={16} color="#FFF" />
                <Text style={styles.searchBtnText}>{searchLoading ? '...' : 'Search'}</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Journey:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <TouchableOpacity
                  style={[styles.chip, !searchJourney ? { backgroundColor: theme.accentColor } : { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor, borderWidth: 1 }]}
                  onPress={() => setSearchJourney('')}
                >
                  <Text style={[styles.chipText, { color: !searchJourney ? '#FFF' : theme.textSecondary }]}>All</Text>
                </TouchableOpacity>
                {JOURNEY_LABELS.map(j => {
                  const info = JOURNEY_TYPES[j];
                  return (
                    <TouchableOpacity
                      key={j}
                      style={[styles.chip, searchJourney === j ? { backgroundColor: info?.color || theme.accentColor } : { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor, borderWidth: 1 }]}
                      onPress={() => setSearchJourney(searchJourney === j ? '' : j)}
                    >
                      <Text style={[styles.chipText, { color: searchJourney === j ? '#FFF' : theme.textSecondary }]}>{info?.label || j}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Status:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <TouchableOpacity
                  style={[styles.chip, !searchStatus ? { backgroundColor: theme.accentColor } : { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor, borderWidth: 1 }]}
                  onPress={() => setSearchStatus('')}
                >
                  <Text style={[styles.chipText, { color: !searchStatus ? '#FFF' : theme.textSecondary }]}>All</Text>
                </TouchableOpacity>
                {STATUS_OPTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, searchStatus === s ? { backgroundColor: STATUS_COLORS[s] || theme.accentColor } : { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor, borderWidth: 1 }]}
                    onPress={() => setSearchStatus(searchStatus === s ? '' : s)}
                  >
                    <Text style={[styles.chipText, { color: searchStatus === s ? '#FFF' : theme.textSecondary }]}>{s.replace(/_/g, ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Date Filters - inline with labels */}
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Date:</Text>
              <View style={styles.dateInlineRow}>
                <TextInput
                  style={[styles.dateInputCompact, { borderColor: theme.borderColor, color: theme.textPrimary, backgroundColor: theme.inputBackground || theme.surfaceElevated }]}
                  placeholder="From (YYYY-MM-DD)"
                  placeholderTextColor={theme.textTertiary}
                  value={searchDateFrom}
                  onChangeText={setSearchDateFrom}
                />
                <Text style={{ color: theme.textTertiary, fontSize: 11 }}>—</Text>
                <TextInput
                  style={[styles.dateInputCompact, { borderColor: theme.borderColor, color: theme.textPrimary, backgroundColor: theme.inputBackground || theme.surfaceElevated }]}
                  placeholder="To (YYYY-MM-DD)"
                  placeholderTextColor={theme.textTertiary}
                  value={searchDateTo}
                  onChangeText={setSearchDateTo}
                />
              </View>
            </View>
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.searchResultsHeader}>
              <Text style={[styles.searchResultsCount, { color: theme.textSecondary }]}>{searchTotal} result{searchTotal !== 1 ? 's' : ''} found</Text>
            </View>
          )}

          {searchResults.map((form, idx) => {
            const journeyInfo = JOURNEY_TYPES[form.journeyType] || { label: form.journeyType, color: '#888' };
            const statusColor = STATUS_COLORS[form.status] || '#888';
            return (
              <TouchableOpacity key={form.id || idx} style={[styles.cardWrapper, { paddingHorizontal: 16 }]} onPress={() => openSearchItemDetail(form)} activeOpacity={0.7}>
                <View style={[styles.card, getGlassStyle(theme), getElevation(1, theme)]}>
                  <View style={[styles.cardBorder, { backgroundColor: journeyInfo.color }]} />
                  <View style={styles.cardHeader}>
                    <View style={[styles.journeyBadge, { backgroundColor: journeyInfo.color + '20' }]}>
                      <Text style={[styles.journeyBadgeText, { color: journeyInfo.color }]}>{journeyInfo.label}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>{form.status.replace(/_/g, ' ')}</Text>
                    </View>
                  </View>
                  <Text style={[styles.refNumber, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
                  <View style={styles.cardDetails}>
                    <Text style={[styles.detailText, { color: theme.textPrimary, fontWeight: '700' }]}>{form.currency} {form.amount?.toLocaleString()}</Text>
                    <Text style={[styles.detailText, { color: theme.textSecondary }]}>{form.customerName || form.createdBy}</Text>
                  </View>
                  <View style={[styles.myItemFooter, { borderTopColor: theme.borderColor }]}>
                    <Text style={[styles.dateText, { color: theme.textTertiary }]}>By: {form.createdBy}</Text>
                    <Text style={[styles.dateText, { color: theme.textTertiary }]}>{new Date(form.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Load More */}
          {searchResults.length > 0 && searchResults.length < searchTotal && (
            <TouchableOpacity
              style={[styles.loadMoreBtn, { borderColor: theme.accentColor }]}
              onPress={() => handleSearch(searchPage + 1)}
              disabled={searchLoading}
            >
              <Text style={[styles.loadMoreText, { color: theme.accentColor }]}>{searchLoading ? 'Loading...' : 'Load More'}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ═══════════════ ACTION RESULT MODAL ═══════════════ */}
      <Modal visible={!!actionResult} animationType="fade" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[styles.resultCard, { backgroundColor: theme.surfaceColor, ...(Platform.OS === 'web' ? { boxShadow: '0 20px 60px rgba(0,0,0,0.3)' } as any : {}) }]}>
            <View style={[styles.resultIconCircle, {
              backgroundColor: (actionResult?.type === 'APPROVE' || actionResult?.type === 'BULK_APPROVE' ? theme.successColor : actionResult?.type === 'ERROR' || actionResult?.type === 'REJECT' ? theme.dangerColor : theme.warningColor) + '15',
            }]}>
              <View style={[styles.resultIconInner, {
                backgroundColor: actionResult?.type === 'APPROVE' || actionResult?.type === 'BULK_APPROVE' ? theme.successColor : actionResult?.type === 'ERROR' || actionResult?.type === 'REJECT' ? theme.dangerColor : theme.warningColor,
              }]}>
                <Ionicons name={actionResult?.type === 'APPROVE' || actionResult?.type === 'BULK_APPROVE' ? 'checkmark' : actionResult?.type === 'ERROR' ? 'alert-circle' : actionResult?.type === 'REJECT' ? 'close' : 'arrow-undo'} size={32} color="#FFF" />
              </View>
            </View>
            <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>
              {actionResult?.type === 'APPROVE' ? 'Approved Successfully' : actionResult?.type === 'BULK_APPROVE' ? 'Bulk Approval Complete' : actionResult?.type === 'ERROR' ? 'Action Failed' : actionResult?.type === 'REJECT' ? 'Form Rejected' : 'Returned to Maker'}
            </Text>
            {actionResult?.type === 'ERROR' ? (
              <Text style={[styles.resultSubtitle, { color: theme.dangerColor }]}>{actionResult.errorMsg}</Text>
            ) : actionResult?.type === 'BULK_APPROVE' ? (
              <Text style={[styles.resultSubtitle, { color: theme.textSecondary }]}>{actionResult.count} form{(actionResult.count || 0) > 1 ? 's' : ''} approved.</Text>
            ) : (
              <View style={styles.resultDetails}>
                <Text style={[styles.resultAmount, { color: theme.textPrimary }]}>{actionResult?.amount}</Text>
                <Text style={[{ color: theme.accentColor, fontWeight: '600', fontSize: 13, marginBottom: 4 }]}>{actionResult?.ref}</Text>
                <Text style={[styles.resultSubtitle, { color: theme.textSecondary }]}>{actionResult?.journey}</Text>
              </View>
            )}
            <Text style={[styles.resultTimestamp, { color: theme.textTertiary }]}>{new Date().toLocaleString()}</Text>
            <TouchableOpacity style={[styles.resultDoneBtn, {
              backgroundColor: actionResult?.type === 'APPROVE' || actionResult?.type === 'BULK_APPROVE' ? theme.successColor : actionResult?.type === 'ERROR' || actionResult?.type === 'REJECT' ? theme.dangerColor : theme.warningColor,
            }]} onPress={() => setActionResult(null)}>
              <Text style={styles.resultDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══════════════ APPROVAL MODAL ═══════════════ */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]}>
          <View style={[styles.modalContent, getGlassStyle(theme)]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderColor }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Review Form</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); }}><Ionicons name="close" size={24} color={theme.textSecondary} /></TouchableOpacity>
            </View>
            {selectedItem?.form && (
              <ScrollView style={styles.modalBody}>
                <Text style={[styles.modalRef, { color: theme.accentColor }]}>{selectedItem.form.referenceNumber}</Text>
                <Text style={[styles.modalJourney, { color: theme.textSecondary }]}>{JOURNEY_TYPES[selectedItem.form.journeyType]?.label}</Text>
                <Text style={[styles.modalAmount, { color: theme.textPrimary }]}>{selectedItem.form.currency} {selectedItem.form.amount?.toLocaleString()}</Text>

                {/* Form Data */}
                <View style={[styles.dataSection, { backgroundColor: theme.surfaceElevated }]}>
                  <Text style={[styles.dataSectionTitle, { color: theme.primaryColor }]}>Form Data</Text>
                  {Object.entries(selectedItem.form.formData || {}).filter(([_, v]) => v).map(([k, v]) => (
                    <View key={k} style={[styles.dataRow, { borderBottomColor: theme.borderColor }]}>
                      <Text style={[styles.dataKey, { color: theme.textSecondary }]}>{k.replace(/([A-Z])/g, ' $1')}</Text>
                      <Text style={[styles.dataVal, { color: theme.textPrimary }]}>{String(v)}</Text>
                    </View>
                  ))}
                </View>

                {/* Approval Timeline */}
                {historyLoading ? (
                  <View style={[styles.dataSection, { backgroundColor: theme.surfaceElevated, alignItems: 'center', paddingVertical: 20 }]}>
                    <Text style={{ color: theme.textTertiary, fontSize: 12 }}>Loading approval history...</Text>
                  </View>
                ) : selectedItem?.workflow ? (
                  <ApprovalTimeline
                    approvalHistory={approvalHistory}
                    currentTier={selectedItem.workflow.currentTier || 1}
                    requiredTiers={selectedItem.workflow.requiredTiers || 1}
                    currentState={selectedItem.workflow.currentState || 'PENDING_TIER_1'}
                    formStatus={selectedItem.form.status}
                    submittedAt={selectedItem.form.submittedAt || selectedItem.form.createdAt}
                    submitterName={selectedItem.form.submitterName || selectedItem.form.createdBy}
                    tierRoles={selectedItem.workflow.tierRoles}
                  />
                ) : null}

                {/* Resubmission Badge */}
                {(selectedItem?.workflow?.resubmissionCount ?? 0) > 0 && (
                  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 8, borderRadius: 8, backgroundColor: theme.warningColor + '12' }]}>
                    <Ionicons name="refresh" size={14} color={theme.warningColor} />
                    <Text style={{ color: theme.warningColor, fontSize: 12, fontWeight: '600' }}>
                      Resubmission #{selectedItem.workflow.resubmissionCount}
                    </Text>
                  </View>
                )}

                {/* Rejection Reasons Picker */}
                {rejectionReasons.length > 0 && (
                  <View style={{ marginTop: 14 }}>
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
                <View style={{ marginTop: 14 }}>
                  <Text style={[{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 }]}>
                    Correction Instructions (for Return) {requireReturnInstructions ? '*' : ''}
                  </Text>
                  <TextInput
                    style={[styles.commentInput, { borderColor: theme.borderColor, color: theme.textPrimary, backgroundColor: theme.inputBackground || theme.surfaceElevated, marginTop: 0 }]}
                    placeholder="Describe what the teller needs to correct..."
                    value={returnInstructions}
                    onChangeText={setReturnInstructions}
                    multiline
                    numberOfLines={2}
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>

                {/* General Comments */}
                <TextInput
                  style={[styles.commentInput, { borderColor: theme.borderColor, color: theme.textPrimary, backgroundColor: theme.inputBackground || theme.surfaceElevated }]}
                  placeholder="Additional comments..."
                  value={comments}
                  onChangeText={setComments}
                  multiline
                  numberOfLines={2}
                  placeholderTextColor={theme.textTertiary}
                />

                {/* Rejection Policy Info */}
                {rejectionPolicy && (
                  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: rejectionPolicy === 'PERMANENT' ? theme.dangerColor + '08' : theme.successColor + '08', marginTop: 4 }]}>
                    <Ionicons name={rejectionPolicy === 'PERMANENT' ? 'alert-circle' : 'refresh-circle'} size={14} color={rejectionPolicy === 'PERMANENT' ? theme.dangerColor : theme.successColor} />
                    <Text style={{ fontSize: 11, color: rejectionPolicy === 'PERMANENT' ? theme.dangerColor : theme.successColor, fontWeight: '500' }}>
                      {rejectionPolicy === 'PERMANENT' ? 'Rejection is permanent — teller cannot resubmit' : 'Teller can correct and resubmit after rejection'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.dangerColor, opacity: processing ? 0.5 : 1 }]} onPress={() => handleAction('REJECT')} disabled={processing}>
                <Ionicons name="close-circle" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.warningColor, opacity: processing ? 0.5 : 1 }]} onPress={() => handleAction('RETURN')} disabled={processing}>
                <Ionicons name="arrow-undo" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Send Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtn, { backgroundColor: theme.successColor, opacity: processing ? 0.5 : 1 }]} onPress={() => handleAction('APPROVE')} disabled={processing}>
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════ MY ITEM DETAIL MODAL ═══════════════ */}
      <Modal visible={!!myItemDetail} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]}>
          <View style={[styles.modalContent, getGlassStyle(theme)]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderColor }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Item Details</Text>
              <TouchableOpacity onPress={() => setMyItemDetail(null)}><Ionicons name="close" size={24} color={theme.textSecondary} /></TouchableOpacity>
            </View>
            {myItemDetail?.form && (
              <ScrollView style={styles.modalBody}>
                <Text style={[styles.modalRef, { color: theme.accentColor }]}>{myItemDetail.form.referenceNumber}</Text>
                <Text style={[styles.modalJourney, { color: theme.textSecondary }]}>{JOURNEY_TYPES[myItemDetail.form.journeyType]?.label}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <Text style={[styles.modalAmount, { color: theme.textPrimary, marginTop: 0 }]}>{myItemDetail.form.currency} {myItemDetail.form.amount?.toLocaleString()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[myItemDetail.form.status] || '#888') + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[myItemDetail.form.status] || '#888' }]} />
                    <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[myItemDetail.form.status] || '#888' }]}>{(myItemDetail.workflow?.currentState || myItemDetail.form.status).replace(/_/g, ' ')}</Text>
                  </View>
                </View>

                {/* Relationship + Meta */}
                <View style={[styles.detailMetaRow, { borderColor: theme.borderColor }]}>
                  <View style={[styles.relationBadge, { backgroundColor: theme.primaryColor + '15' }]}>
                    <Ionicons name={myItemDetail.relationship?.includes('Created') ? 'create' : 'checkmark-done'} size={12} color={theme.primaryColor} />
                    <Text style={[styles.relationText, { color: theme.primaryColor }]}>{myItemDetail.relationship}</Text>
                  </View>
                  <Text style={[styles.dateText, { color: theme.textTertiary }]}>
                    {myItemDetail.form.customerName || myItemDetail.form.createdBy} | {new Date(myItemDetail.form.submittedAt || myItemDetail.form.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {/* Form Data */}
                {myItemDetail.form.formData && Object.keys(myItemDetail.form.formData).length > 0 && (
                  <View style={[styles.dataSection, { backgroundColor: theme.surfaceElevated }]}>
                    <Text style={[styles.dataSectionTitle, { color: theme.primaryColor }]}>Form Data</Text>
                    {Object.entries(myItemDetail.form.formData).filter(([_, v]) => v).map(([k, v]) => (
                      <View key={k} style={[styles.dataRow, { borderBottomColor: theme.borderColor }]}>
                        <Text style={[styles.dataKey, { color: theme.textSecondary }]}>{k.replace(/([A-Z])/g, ' $1')}</Text>
                        <Text style={[styles.dataVal, { color: theme.textPrimary }]}>{String(v)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Approval Timeline */}
                {myItemHistoryLoading ? (
                  <View style={[styles.dataSection, { backgroundColor: theme.surfaceElevated, alignItems: 'center', paddingVertical: 20 }]}>
                    <Text style={{ color: theme.textTertiary, fontSize: 12 }}>Loading approval history...</Text>
                  </View>
                ) : myItemDetail?.workflow ? (
                  <ApprovalTimeline
                    approvalHistory={myItemHistory}
                    currentTier={myItemDetail.workflow.currentTier || 1}
                    requiredTiers={myItemDetail.workflow.requiredTiers || 1}
                    currentState={myItemDetail.workflow.currentState || 'PENDING_TIER_1'}
                    formStatus={myItemDetail.form.status}
                    submittedAt={myItemDetail.form.submittedAt || myItemDetail.form.createdAt}
                    submitterName={myItemDetail.form.submitterName || myItemDetail.form.createdBy}
                    tierRoles={myItemDetail.workflow?.tierRoles}
                  />
                ) : (
                  <View style={[styles.dataSection, { backgroundColor: theme.surfaceElevated, alignItems: 'center', paddingVertical: 20 }]}>
                    <Text style={{ color: theme.textTertiary, fontSize: 12 }}>No workflow data available.</Text>
                  </View>
                )}
              </ScrollView>
            )}
            <View style={{ padding: 16 }}>
              <TouchableOpacity style={[styles.resultDoneBtn, { backgroundColor: theme.accentColor }]} onPress={() => setMyItemDetail(null)}>
                <Text style={styles.resultDoneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AlertModal alert={alert} onClose={hideAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Insights Bar
  insightsBar: { maxHeight: 52, borderBottomWidth: 0 },
  insightsBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  insightPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  insightValue: { fontSize: 16, fontWeight: '800' },
  insightLabel: { fontSize: 11, fontWeight: '600' },
  insightDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },
  // Tab Bar
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 4 },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  // Select All
  selectAllBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 12 },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  selectAllText: { fontSize: 13, fontWeight: '600', flex: 1 },
  selectedCount: { fontSize: 12, fontWeight: '600' },
  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtext: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  // Cards
  cardWrapper: { paddingHorizontal: 12, paddingVertical: 4, marginBottom: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
  card: { borderRadius: 12, padding: 14, overflow: 'hidden' },
  cardBorder: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  journeyBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  journeyBadgeText: { fontSize: 11, fontWeight: '600' },
  tierBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tierText: { fontSize: 11, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  refNumber: { fontSize: 14, fontWeight: '700' },
  cardDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  detailText: { fontSize: 13, fontWeight: '400' },
  dateText: { fontSize: 12, fontWeight: '400' },
  // Claim Row
  claimRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  claimBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  claimBadgeText: { fontSize: 12, fontWeight: '600' },
  claimActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  claimActionText: { fontSize: 13, fontWeight: '600' },
  pickupBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  pickupBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  slaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slaTimer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  slaText: { fontSize: 11, fontWeight: '600' },
  // My Items footer
  myItemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  relationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  relationText: { fontSize: 11, fontWeight: '600' },
  detailMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  // Search
  searchPanel: { padding: 16, gap: 10 },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, outlineStyle: 'none' } as any,
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: '600', width: 52 },
  chipScroll: { flex: 1 },
  chip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginRight: 4 },
  chipText: { fontSize: 11, fontWeight: '600' },
  dateInlineRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInputCompact: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12 },
  searchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  searchBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  searchResultsHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  searchResultsCount: { fontSize: 12, fontWeight: '600' },
  loadMoreBtn: { marginHorizontal: 16, marginTop: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  loadMoreText: { fontWeight: '700', fontSize: 14 },
  // Bulk
  floatingBulkBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  bulkCountText: { color: '#FFF', fontSize: 14, fontWeight: '700', minWidth: 80 },
  bulkApproveBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 10, paddingVertical: 12 },
  bulkApproveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 16, maxHeight: 550 },
  modalRef: { fontSize: 16, fontWeight: '700' },
  modalJourney: { fontSize: 13, fontWeight: '400', marginTop: 3 },
  modalAmount: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  dataSection: { marginTop: 14, padding: 12, borderRadius: 8 },
  dataSectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 0.5 },
  dataKey: { fontSize: 12, fontWeight: '400', flex: 1, textTransform: 'capitalize' },
  dataVal: { fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },
  commentInput: { borderWidth: 1.5, borderRadius: 8, padding: 12, marginTop: 14, minHeight: 70, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', padding: 16, gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, borderRadius: 10, padding: 12 },
  approveBtn: { flex: 2 },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  // Result modal
  resultCard: { width: '90%', maxWidth: 400, borderRadius: 20, padding: 28, alignItems: 'center' },
  resultIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  resultIconInner: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  resultTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  resultSubtitle: { fontSize: 14, fontWeight: '400', textAlign: 'center', lineHeight: 20 },
  resultDetails: { alignItems: 'center', width: '100%', marginTop: 4 },
  resultAmount: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  resultTimestamp: { fontSize: 12, fontWeight: '400', marginTop: 14, marginBottom: 16 },
  resultDoneBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  resultDoneBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
