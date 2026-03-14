import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, TextInput, Modal, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { QueueItem, JOURNEY_TYPES } from '../types';
import { getGlassStyle, getGlowShadow, getElevation } from '../utils/styles';
import api from '../api/client';
// ApprovalTimeline now used in FormDetailScreen
import AlertModal, { useAlert } from '../components/AlertModal';

type TabKey = 'queue' | 'myItems';

export default function SupervisorDashboard({ navigation }: { navigation?: any }) {
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [actionResult, setActionResult] = useState<any>(null);
  const [claiming, setClaiming] = useState<number | null>(null);

  // ── My Items State ──
  const [myItems, setMyItems] = useState<any[]>([]);
  const [myItemsPage, setMyItemsPage] = useState(0);
  const [myItemsTotal, setMyItemsTotal] = useState(0);
  const [myItemsLoading, setMyItemsLoading] = useState(false);
  const [myItemsLoadingMore, setMyItemsLoadingMore] = useState(false);

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
      const rawItems = data?.content || data || [];
      // Filter out DRAFT forms — drafts belong in My Submissions, not Approvals
      const items = rawItems.filter((item: any) => item.form?.status !== 'DRAFT');
      const total = (data?.totalElements ?? rawItems.length) - (rawItems.length - items.length);
      if (append) setMyItems(prev => [...prev, ...items]);
      else setMyItems(items);
      setMyItemsPage(page);
      setMyItemsTotal(Math.max(0, total));
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
    } catch (e: any) {
      showAlert('error', 'Cannot Release', e.message);
    }
  };

  // ── Open Review (navigates to FormDetailScreen in review mode) ──
  const openDetail = (item: QueueItem) => {
    navigation?.navigate('FormDetail', {
      formId: item.form.id,
      form: item.form,
      reviewMode: true,
      workflowData: item.workflow,
      onActionComplete: () => refreshAll(),
    });
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

  // ── Search ──
  const handleSearch = async (page = 0) => {
    if (!searchQuery && !searchJourney && !searchStatus && !searchDateFrom && !searchDateTo) return;
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
      // Filter out DRAFT forms — supervisors shouldn't see incomplete drafts in search
      const rawResults = res.content || [];
      const filteredResults = rawResults.filter((f: any) => f.status !== 'DRAFT');
      const filteredTotal = (res.totalElements || 0) - (rawResults.length - filteredResults.length);
      if (page === 0) setSearchResults(filteredResults);
      else setSearchResults(prev => [...prev, ...filteredResults]);
      setSearchTotal(Math.max(0, filteredTotal));
      setSearchPage(page);
      setIsSearchActive(true);
    } catch (e: any) { showAlert('error', 'Search Failed', e.message); }
    finally { setSearchLoading(false); }
  };

  // ── My Item Detail (navigate to FormDetailScreen) ──
  const openMyItemDetail = (item: any) => {
    navigation?.navigate('FormDetail', { formId: item.form.id, form: item.form });
  };

  const openSearchItemDetail = (form: any) => {
    navigation?.navigate('FormDetail', { formId: form.id, form });
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
  const STATUS_OPTIONS = ['PENDING_APPROVAL', 'COMPLETED', 'APPROVED', 'REJECTED', 'RETURNED', 'FAILED'];

  // ── Inline Search State (merged into My Items) ──
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const hasActiveFilters = !!searchJourney || !!searchStatus || !!searchDateFrom || !!searchDateTo;

  const clearSearch = () => {
    setSearchQuery('');
    setSearchJourney('');
    setSearchStatus('');
    setSearchDateFrom('');
    setSearchDateTo('');
    setSearchResults([]);
    setSearchTotal(0);
    setSearchPage(0);
    setIsSearchActive(false);
    setShowFilters(false);
  };

  // ── Tab Bar ──
  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: 'queue', label: 'My Queue', icon: 'layers', badge: queue.length },
    { key: 'myItems', label: 'Picked Up', icon: 'person' },
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
            <View style={{ height: 4 }} />
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
                const statusColor = STATUS_COLORS[form.status] || STATUS_COLORS[wf?.currentState] || theme.warningColor;
                const slaInfo = calculateTimeRemaining(wf?.slaDeadline);
                const claimedByMe = isClaimedByMe(wf);
                const claimedByOther = isClaimedByOther(wf);
                const journeyInfo = JOURNEY_TYPES[form.journeyType] || { label: form.journeyType, color: '#888' };
                const fmtQueueDate = (ds: string) => {
                  if (!ds) return '';
                  const d = new Date(ds);
                  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
                    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                };

                return (
                  <TouchableOpacity
                    key={form.id}
                    style={[
                      styles.pickedUpCard,
                      {
                        backgroundColor: claimedByMe ? theme.accentColor + '06' : theme.surfaceElevated,
                        borderColor: claimedByMe ? theme.accentColor + '40' : theme.borderColor,
                        borderLeftColor: claimedByMe ? theme.accentColor : statusColor,
                      },
                    ]}
                    onPress={() => claimedByMe ? openDetail(item) : handleClaim(form.id)}
                    activeOpacity={0.7}
                    disabled={claimedByOther || claiming === form.id}
                  >
                    <View style={styles.pickedUpCardBody}>
                      <View style={styles.pickedUpCardRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pickedUpRef, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
                          <Text style={[styles.pickedUpJourney, { color: theme.textSecondary }]}>{journeyInfo.label}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <View style={[styles.pickedUpStatusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
                            <Ionicons name="hourglass" size={12} color={statusColor} />
                            <Text style={[styles.pickedUpStatusText, { color: statusColor }]}>TIER {wf?.currentTier || 1}</Text>
                          </View>
                          {wf?.escalated && (
                            <View style={[styles.pickedUpStatusBadge, { backgroundColor: theme.dangerColor + '15', borderColor: theme.dangerColor + '30' }]}>
                              <Ionicons name="alert-circle" size={10} color={theme.dangerColor} />
                              <Text style={[styles.pickedUpStatusText, { color: theme.dangerColor }]}>ESCALATED</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.pickedUpDetails}>
                        <View style={styles.pickedUpDetailItem}>
                          <Ionicons name="cash-outline" size={13} color={theme.textTertiary} />
                          <Text style={[styles.pickedUpDetailText, { color: theme.textPrimary }]}>{form.currency} {form.amount?.toLocaleString()}</Text>
                        </View>
                        <View style={styles.pickedUpDetailItem}>
                          <Ionicons name="person-outline" size={13} color={theme.textTertiary} />
                          <Text style={[styles.pickedUpDetailText, { color: theme.textPrimary }]} numberOfLines={1}>{form.customerName || form.createdBy}</Text>
                        </View>
                        <View style={styles.pickedUpDetailItem}>
                          <Ionicons name="time-outline" size={13} color={theme.textTertiary} />
                          <Text style={[styles.pickedUpDetailText, { color: theme.textTertiary }]}>{fmtQueueDate(form.submittedAt || form.createdAt)}</Text>
                        </View>
                      </View>
                      {/* Action row: claim status or pickup prompt */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                        {claimedByMe ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="lock-closed" size={12} color={theme.accentColor} />
                              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.accentColor }}>Picked up by you</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.textTertiary + '15' }}
                                onPress={() => handleRelease(form.id)}
                              >
                                <Ionicons name="lock-open" size={12} color={theme.textSecondary} />
                                <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary }}>Release</Text>
                              </TouchableOpacity>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.accentColor }}>
                                <Ionicons name="eye" size={12} color="#FFF" />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>Review</Text>
                              </View>
                            </View>
                          </View>
                        ) : claimedByOther ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="lock-closed" size={12} color={theme.textTertiary} />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textTertiary }}>Picked up by {wf?.claimedByName}</Text>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
                            {slaInfo.isWarning ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: theme.dangerColor + '15' }}>
                                <Ionicons name="alert-circle" size={12} color={theme.dangerColor} />
                                <Text style={{ fontSize: 11, fontWeight: '600', color: theme.dangerColor }}>{slaInfo.display}</Text>
                              </View>
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="timer-outline" size={12} color={theme.textTertiary} />
                                <Text style={{ fontSize: 11, fontWeight: '500', color: theme.textTertiary }}>{slaInfo.display}</Text>
                              </View>
                            )}
                            {claiming === form.id ? (
                              <ActivityIndicator size="small" color={theme.primaryColor} />
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.primaryColor }}>
                                <Ionicons name="hand-left" size={12} color="#FFF" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Pick Up</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
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
          </ScrollView>
        </>
      )}

      {/* ═══════════════ TAB 2: MY ITEMS (with inline search) ═══════════════ */}
      {activeTab === 'myItems' && (
        <ScrollView refreshControl={<RefreshControl refreshing={myItemsLoading} onRefresh={() => { if (isSearchActive) handleSearch(0); else loadMyItems(); }} />}>
          {/* ── Inline Search Bar ── */}
          <View style={[styles.searchPanel, { backgroundColor: theme.surfaceColor, borderBottomColor: theme.borderColor, borderBottomWidth: 1 }]}>
            <View style={styles.searchRow}>
              <View style={[styles.searchInputContainer, { flex: 1, borderColor: theme.borderColor, backgroundColor: theme.inputBackground || theme.surfaceElevated }]}>
                <Ionicons name="search" size={16} color={theme.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                  placeholder="Search by reference or customer name..."
                  placeholderTextColor={theme.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => handleSearch(0)}
                  returnKeyType="search"
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
              <TouchableOpacity
                style={[
                  styles.filterToggleBtn,
                  {
                    backgroundColor: showFilters || hasActiveFilters ? theme.accentColor + '15' : theme.surfaceElevated,
                    borderColor: showFilters || hasActiveFilters ? theme.accentColor : theme.borderColor,
                  },
                ]}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Ionicons name="options" size={18} color={showFilters || hasActiveFilters ? theme.accentColor : theme.textSecondary} />
                {hasActiveFilters && <View style={[styles.filterDot, { backgroundColor: theme.accentColor }]} />}
              </TouchableOpacity>
            </View>

            {/* ── Collapsible Advanced Filters ── */}
            {showFilters && (
              <View style={styles.filtersPanel}>
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

                {(isSearchActive || hasActiveFilters) && (
                  <TouchableOpacity style={[styles.clearFiltersBtn, { borderColor: theme.borderColor }]} onPress={clearSearch}>
                    <Ionicons name="close-circle-outline" size={14} color={theme.textSecondary} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>Clear Search & Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* ── Summary Bar ── */}
          <View style={[styles.summaryBar, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}>
            <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
              {myItemsLoading || searchLoading ? 'Loading...' : isSearchActive
                ? `${searchTotal} result${searchTotal !== 1 ? 's' : ''} found`
                : `${myItemsTotal} item${myItemsTotal !== 1 ? 's' : ''}`}
            </Text>
            {isSearchActive && (
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={clearSearch}>
                <Ionicons name="close-circle" size={14} color={theme.accentColor} />
                <Text style={{ fontSize: 12, color: theme.accentColor, fontWeight: '600' }}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Display: Search Results or My Items ── */}
          {isSearchActive ? (
            <>
              {searchResults.length === 0 && !searchLoading && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color={theme.textTertiary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No results found</Text>
                  <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>Try adjusting your search terms or filters.</Text>
                </View>
              )}
              {searchResults.map((form, idx) => {
                const journeyInfo = JOURNEY_TYPES[form.journeyType] || { label: form.journeyType, color: '#888' };
                const statusColor = STATUS_COLORS[form.status] || '#888';
                const statusIconMap2: Record<string, string> = {
                  DRAFT: 'create', PENDING_APPROVAL: 'hourglass', COMPLETED: 'checkmark-circle',
                  REJECTED: 'close-circle', RETURNED: 'arrow-undo', FAILED: 'warning',
                };
                const fmtDate = (ds: string) => {
                  if (!ds) return '';
                  const d = new Date(ds);
                  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
                    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                };
                return (
                  <TouchableOpacity
                    key={form.id || idx}
                    style={[
                      styles.pickedUpCard,
                      {
                        backgroundColor: theme.surfaceElevated,
                        borderColor: theme.borderColor,
                        borderLeftColor: statusColor,
                      },
                    ]}
                    onPress={() => openSearchItemDetail(form)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickedUpCardBody}>
                      <View style={styles.pickedUpCardRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pickedUpRef, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
                          <Text style={[styles.pickedUpJourney, { color: theme.textSecondary }]}>{journeyInfo.label}</Text>
                        </View>
                        <View style={[styles.pickedUpStatusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
                          <Ionicons name={(statusIconMap2[form.status] || 'help-circle') as any} size={12} color={statusColor} />
                          <Text style={[styles.pickedUpStatusText, { color: statusColor }]}>{form.status.replace(/_/g, ' ')}</Text>
                        </View>
                      </View>
                      <View style={styles.pickedUpDetails}>
                        <View style={styles.pickedUpDetailItem}>
                          <Ionicons name="cash-outline" size={13} color={theme.textTertiary} />
                          <Text style={[styles.pickedUpDetailText, { color: theme.textPrimary }]}>{form.currency} {form.amount?.toLocaleString()}</Text>
                        </View>
                        {(form.customerName || form.createdBy) ? (
                          <View style={styles.pickedUpDetailItem}>
                            <Ionicons name="person-outline" size={13} color={theme.textTertiary} />
                            <Text style={[styles.pickedUpDetailText, { color: theme.textPrimary }]} numberOfLines={1}>{form.customerName || form.createdBy}</Text>
                          </View>
                        ) : null}
                        <View style={styles.pickedUpDetailItem}>
                          <Ionicons name="time-outline" size={13} color={theme.textTertiary} />
                          <Text style={[styles.pickedUpDetailText, { color: theme.textTertiary }]}>{fmtDate(form.createdAt)}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {searchResults.length > 0 && searchResults.length < searchTotal && (
                <TouchableOpacity
                  style={[styles.loadMoreBtn, { borderColor: theme.accentColor }]}
                  onPress={() => handleSearch(searchPage + 1)}
                  disabled={searchLoading}
                >
                  <Text style={[styles.loadMoreText, { color: theme.accentColor }]}>{searchLoading ? 'Loading...' : `Load More (${searchResults.length} of ${searchTotal})`}</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              {myItems.length === 0 && !myItemsLoading ? (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open" size={48} color={theme.textTertiary} />
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
                  const statusIconMap: Record<string, string> = {
                    DRAFT: 'create', PENDING_APPROVAL: 'hourglass', COMPLETED: 'checkmark-circle',
                    REJECTED: 'close-circle', RETURNED: 'arrow-undo', FAILED: 'warning',
                  };
                  const formatItemDate = (dateStr: string) => {
                    if (!dateStr) return '';
                    const d = new Date(dateStr);
                    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
                      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  };
                  return (
                    <TouchableOpacity
                      key={form.id || idx}
                      style={[
                        styles.pickedUpCard,
                        {
                          backgroundColor: theme.surfaceElevated,
                          borderColor: theme.borderColor,
                          borderLeftColor: statusColor,
                        },
                      ]}
                      onPress={() => openMyItemDetail(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.pickedUpCardBody}>
                        <View style={styles.pickedUpCardRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.pickedUpRef, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
                            <Text style={[styles.pickedUpJourney, { color: theme.textSecondary }]}>{journeyInfo.label}</Text>
                          </View>
                          <View style={[styles.pickedUpStatusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
                            <Ionicons name={(statusIconMap[form.status] || 'help-circle') as any} size={12} color={statusColor} />
                            <Text style={[styles.pickedUpStatusText, { color: statusColor }]}>{wfState.replace(/_/g, ' ')}</Text>
                          </View>
                        </View>
                        <View style={styles.pickedUpDetails}>
                          <View style={styles.pickedUpDetailItem}>
                            <Ionicons name="cash-outline" size={13} color={theme.textTertiary} />
                            <Text style={[styles.pickedUpDetailText, { color: theme.textPrimary }]}>{form.currency} {form.amount?.toLocaleString()}</Text>
                          </View>
                          {form.customerName ? (
                            <View style={styles.pickedUpDetailItem}>
                              <Ionicons name="person-outline" size={13} color={theme.textTertiary} />
                              <Text style={[styles.pickedUpDetailText, { color: theme.textPrimary }]} numberOfLines={1}>{form.customerName}</Text>
                            </View>
                          ) : null}
                          <View style={styles.pickedUpDetailItem}>
                            <Ionicons name="time-outline" size={13} color={theme.textTertiary} />
                            <Text style={[styles.pickedUpDetailText, { color: theme.textTertiary }]}>{formatItemDate(form.submittedAt || form.createdAt)}</Text>
                          </View>
                        </View>
                        {item.relationship && (
                          <View style={styles.pickedUpRelationRow}>
                            <Ionicons name={item.relationship?.includes('Created') ? 'create' : 'checkmark-done'} size={12} color={theme.primaryColor} />
                            <Text style={[styles.pickedUpRelationText, { color: theme.primaryColor }]}>{item.relationship}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
              {myItems.length > 0 && myItems.length < myItemsTotal && (
                <TouchableOpacity
                  style={[styles.loadMoreBtn, { borderColor: theme.accentColor }]}
                  onPress={loadMoreMyItems}
                  disabled={myItemsLoadingMore}
                >
                  <Text style={[styles.loadMoreText, { color: theme.accentColor }]}>{myItemsLoadingMore ? 'Loading...' : `Load More (${myItems.length} of ${myItemsTotal})`}</Text>
                </TouchableOpacity>
              )}
            </>
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
  // Picked Up cards (matches TellerSubmissions style)
  pickedUpCard: {
    marginHorizontal: 12, marginBottom: 10, borderRadius: 12, borderLeftWidth: 4, borderWidth: 1, overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    }),
  },
  pickedUpCardBody: { padding: 14 },
  pickedUpCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pickedUpRef: { fontWeight: '700', fontSize: 14 },
  pickedUpJourney: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  pickedUpStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  pickedUpStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' as any },
  pickedUpDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  pickedUpDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pickedUpDetailText: { fontSize: 12, fontWeight: '500' },
  pickedUpRelationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  pickedUpRelationText: { fontSize: 11, fontWeight: '600' },
  detailMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  // Filter toggle
  filterToggleBtn: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  filterDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4 },
  filtersPanel: { marginTop: 10, gap: 8 },
  clearFiltersBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  // Summary
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 12, marginTop: 10, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  summaryText: { fontSize: 13, fontWeight: '600' },
  // Search
  searchPanel: { padding: 12, paddingBottom: 8 },
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
