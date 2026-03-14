import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Platform, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { JOURNEY_TYPES } from '../types';
import api from '../api/client';
import AlertModal, { useAlert } from '../components/AlertModal';

type StatusTab = 'all' | 'action_required' | 'pending' | 'completed' | 'rejected' | 'draft';

const STATUS_TABS: { key: StatusTab; label: string; icon: string; apiStatus?: string }[] = [
  { key: 'all', label: 'All', icon: 'list' },
  { key: 'action_required', label: 'Action Required', icon: 'alert-circle', apiStatus: 'ACTION_REQUIRED' },
  { key: 'pending', label: 'Pending', icon: 'hourglass', apiStatus: 'PENDING_APPROVAL' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-circle', apiStatus: 'COMPLETED' },
  { key: 'rejected', label: 'Rejected', icon: 'close-circle', apiStatus: 'REJECTED' },
  { key: 'draft', label: 'Drafts', icon: 'create', apiStatus: 'DRAFT' },
];

const JOURNEY_LABELS = Object.keys(JOURNEY_TYPES);
const STATUS_OPTIONS = ['DRAFT', 'PENDING_APPROVAL', 'RETURNED', 'REJECTED', 'COMPLETED'];
const PAGE_SIZE = 15;

interface Props {
  navigation: any;
}

export default function TellerSubmissionsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { alert, showAlert, hideAlert } = useAlert();

  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionRequiredCount, setActionRequiredCount] = useState(0);

  // ── Inline Search / Filter State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJourney, setFilterJourney] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [searchTotal, setSearchTotal] = useState(0);

  const hasActiveFilters = !!filterJourney || !!filterDateFrom || !!filterDateTo;

  // ── My Forms Loading (tab-filtered, paginated) ──
  const loadForms = useCallback(async (tab: StatusTab, pageNum = 0, append = false) => {
    const statusFilter = STATUS_TABS.find(t => t.key === tab)?.apiStatus;
    try {
      const res = await api.getMyForms(pageNum, PAGE_SIZE, statusFilter);
      const items = res?.content || res || [];
      const total = res?.totalElements || items.length;
      if (append) setForms(prev => [...prev, ...items]);
      else setForms(items);
      setTotalElements(total);
      setPage(pageNum);
    } catch (e: any) { showAlert('error', 'Load Failed', e.message); }
  }, []);

  const loadActionRequiredCount = useCallback(async () => {
    try {
      const res = await api.getMyForms(0, 1, 'ACTION_REQUIRED');
      setActionRequiredCount(res?.totalElements || 0);
    } catch { /* ignore */ }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadForms(activeTab, 0), loadActionRequiredCount()]);
    setLoading(false);
  }, [activeTab]);

  useFocusEffect(useCallback(() => { refresh(); }, [activeTab]));

  const onRefresh = async () => {
    setRefreshing(true);
    if (isSearchActive) {
      await handleSearch(0);
    } else {
      await Promise.all([loadForms(activeTab, 0), loadActionRequiredCount()]);
    }
    setRefreshing(false);
  };

  const handleTabChange = (tab: StatusTab) => {
    // Switching tabs exits search mode
    setIsSearchActive(false);
    setSearchResults([]);
    setActiveTab(tab);
    setForms([]);
    setPage(0);
    setTotalElements(0);
    setLoading(true);
    loadForms(tab, 0).finally(() => setLoading(false));
  };

  const handleLoadMore = async () => {
    if (isSearchActive) {
      const nextPage = searchPage + 1;
      setLoadingMore(true);
      await handleSearch(nextPage, true);
      setLoadingMore(false);
    } else {
      setLoadingMore(true);
      await loadForms(activeTab, page + 1, true);
      setLoadingMore(false);
    }
  };

  // ── Search ──
  const handleSearch = async (pageNum = 0, append = false) => {
    const tabStatus = STATUS_TABS.find(t => t.key === activeTab)?.apiStatus;
    if (!searchQuery && !filterJourney && !filterDateFrom && !filterDateTo && !tabStatus) return;
    if (!append) setSearchLoading(true);
    try {
      const res = await api.searchForms({
        q: searchQuery || undefined,
        journeyType: filterJourney || undefined,
        status: tabStatus || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        page: pageNum,
        size: PAGE_SIZE,
      });
      const items = res?.content || res || [];
      const total = res?.totalElements || items.length;
      if (append) setSearchResults(prev => [...prev, ...items]);
      else setSearchResults(items);
      setSearchTotal(total);
      setSearchPage(pageNum);
      setIsSearchActive(true);
    } catch (e: any) { showAlert('error', 'Search Failed', e.message); }
    finally { setSearchLoading(false); }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilterJourney('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchResults([]);
    setSearchTotal(0);
    setSearchPage(0);
    setIsSearchActive(false);
    setShowFilters(false);
  };

  const openFormDetail = (form: any) => {
    const isOwner = form.createdBy === user?.username;
    if (form.status === 'DRAFT' && isOwner) {
      // Resume draft — open in FormEntry with the form's ID so it loads & pre-fills
      navigation.navigate('FormEntry', { formId: form.id });
    } else {
      navigation.navigate('FormDetail', { formId: form.id, form });
    }
  };

  const getStatusColor = (status: string): string => {
    const map: Record<string, string> = {
      DRAFT: theme.textTertiary,
      PENDING_APPROVAL: '#F39C12',
      COMPLETED: theme.successColor,
      REJECTED: theme.dangerColor,
      RETURNED: '#9B59B6',
      FAILED: theme.dangerColor,
    };
    return map[status] || theme.textTertiary;
  };

  const getStatusIcon = (status: string): string => {
    const map: Record<string, string> = {
      DRAFT: 'create', PENDING_APPROVAL: 'hourglass', COMPLETED: 'checkmark-circle',
      REJECTED: 'close-circle', RETURNED: 'arrow-undo', FAILED: 'warning',
    };
    return map[status] || 'help-circle';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const renderFormCard = (form: any) => {
    const statusColor = getStatusColor(form.status);
    const isOwner = form.createdBy === user?.username;
    const isActionable = ['RETURNED', 'REJECTED'].includes(form.status) && isOwner;
    const isDraft = form.status === 'DRAFT' && isOwner;
    return (
      <TouchableOpacity
        key={form.id}
        style={[
          styles.formCard,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: (isActionable || isDraft) ? statusColor + '60' : theme.borderColor,
            borderLeftColor: statusColor,
          },
          (isActionable || isDraft) && { borderWidth: 1.5 },
        ]}
        onPress={() => openFormDetail(form)}
        activeOpacity={0.7}
      >
        {isDraft && (
          <View style={[styles.actionBanner, { backgroundColor: theme.accentColor + '10' }]}>
            <Ionicons name="pencil" size={14} color={theme.accentColor} />
            <Text style={[styles.actionBannerText, { color: theme.accentColor }]}>
              Tap to resume this draft
            </Text>
            <Ionicons name="chevron-forward" size={14} color={theme.accentColor} />
          </View>
        )}
        {isActionable && (
          <View style={[styles.actionBanner, { backgroundColor: statusColor + '10' }]}>
            <Ionicons name={(form.status === 'RETURNED' ? 'arrow-undo' : 'close-circle') as any} size={14} color={statusColor} />
            <Text style={[styles.actionBannerText, { color: statusColor }]}>
              {form.status === 'RETURNED' ? 'Returned for corrections' : 'Rejected — tap to view details'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={statusColor} />
          </View>
        )}
        <View style={styles.formCardBody}>
          <View style={styles.formCardRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formRef, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
              <Text style={[styles.formJourney, { color: theme.textSecondary }]}>
                {JOURNEY_TYPES[form.journeyType]?.label || form.journeyType}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
              <Ionicons name={getStatusIcon(form.status) as any} size={12} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>{form.status?.replace(/_/g, ' ')}</Text>
            </View>
          </View>
          <View style={styles.formCardDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={13} color={theme.textTertiary} />
              <Text style={[styles.detailText, { color: theme.textPrimary }]}>{form.currency} {form.amount?.toLocaleString()}</Text>
            </View>
            {form.customerName && (
              <View style={styles.detailItem}>
                <Ionicons name="person-outline" size={13} color={theme.textTertiary} />
                <Text style={[styles.detailText, { color: theme.textPrimary }]} numberOfLines={1}>{form.customerName}</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={13} color={theme.textTertiary} />
              <Text style={[styles.detailText, { color: theme.textTertiary }]}>{formatDate(form.submittedAt || form.createdAt)}</Text>
            </View>
          </View>
          {form.status === 'RETURNED' && form.lastReturnInstructions && (
            <View style={[styles.reasonPreview, { backgroundColor: '#9B59B6' + '08', borderColor: '#9B59B6' + '20' }]}>
              <Ionicons name="chatbox-ellipses" size={12} color="#9B59B6" />
              <Text style={[styles.reasonText, { color: theme.textSecondary }]} numberOfLines={2}>{form.lastReturnInstructions}</Text>
            </View>
          )}
          {form.status === 'REJECTED' && form.lastRejectionReason && (
            <View style={[styles.reasonPreview, { backgroundColor: theme.dangerColor + '08', borderColor: theme.dangerColor + '20' }]}>
              <Ionicons name="chatbox-ellipses" size={12} color={theme.dangerColor} />
              <Text style={[styles.reasonText, { color: theme.textSecondary }]} numberOfLines={2}>{form.lastRejectionReason}</Text>
            </View>
          )}
          {form.resubmissionCount > 0 && (
            <View style={styles.resubmitBadgeRow}>
              <Ionicons name="repeat" size={12} color={theme.textTertiary} />
              <Text style={[styles.resubmitBadgeText, { color: theme.textTertiary }]}>
                Resubmitted {form.resubmissionCount} time{form.resubmissionCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Determine what to display
  const displayForms = isSearchActive ? searchResults : forms;
  const displayTotal = isSearchActive ? searchTotal : totalElements;

  return (
    <View style={[{ flex: 1 }, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentColor} />}
      >
        {/* ── Inline Search Bar ── */}
        <View style={[styles.searchSection, { backgroundColor: theme.surfaceColor, borderBottomColor: theme.borderColor }]}>
          <View style={styles.searchRow}>
            <View style={[styles.searchInputContainer, { borderColor: theme.borderColor, backgroundColor: theme.inputBackground || theme.surfaceElevated }]}>
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
                    style={[styles.chip, !filterJourney ? { backgroundColor: theme.accentColor } : { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor, borderWidth: 1 }]}
                    onPress={() => setFilterJourney('')}
                  >
                    <Text style={[styles.chipText, { color: !filterJourney ? '#FFF' : theme.textSecondary }]}>All</Text>
                  </TouchableOpacity>
                  {JOURNEY_LABELS.map(j => {
                    const info = JOURNEY_TYPES[j];
                    return (
                      <TouchableOpacity
                        key={j}
                        style={[styles.chip, filterJourney === j ? { backgroundColor: info?.color || theme.accentColor } : { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor, borderWidth: 1 }]}
                        onPress={() => setFilterJourney(filterJourney === j ? '' : j)}
                      >
                        <Text style={[styles.chipText, { color: filterJourney === j ? '#FFF' : theme.textSecondary }]}>{info?.label || j}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              <View style={styles.filterRow}>
                <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Date:</Text>
                <View style={styles.dateInlineRow}>
                  <TextInput
                    style={[styles.dateInputCompact, { borderColor: theme.borderColor, color: theme.textPrimary, backgroundColor: theme.inputBackground || theme.surfaceElevated }]}
                    placeholder="From (YYYY-MM-DD)"
                    placeholderTextColor={theme.textTertiary}
                    value={filterDateFrom}
                    onChangeText={setFilterDateFrom}
                  />
                  <Text style={{ color: theme.textTertiary, fontSize: 11 }}>—</Text>
                  <TextInput
                    style={[styles.dateInputCompact, { borderColor: theme.borderColor, color: theme.textPrimary, backgroundColor: theme.inputBackground || theme.surfaceElevated }]}
                    placeholder="To (YYYY-MM-DD)"
                    placeholderTextColor={theme.textTertiary}
                    value={filterDateTo}
                    onChangeText={setFilterDateTo}
                  />
                </View>
              </View>
              {(isSearchActive || hasActiveFilters) && (
                <TouchableOpacity style={[styles.clearFiltersBtn, { borderColor: theme.borderColor }]} onPress={clearSearch}>
                  <Ionicons name="close-circle-outline" size={14} color={theme.textSecondary} />
                  <Text style={[{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }]}>Clear Search & Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Status Tab Chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
          {STATUS_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const isActionRequired = tab.key === 'action_required';
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabChip, { backgroundColor: isActive ? theme.accentColor : theme.surfaceElevated, borderColor: isActive ? theme.accentColor : theme.borderColor }]}
                onPress={() => handleTabChange(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={tab.icon as any} size={14} color={isActive ? '#FFF' : theme.textSecondary} />
                <Text style={[styles.tabChipText, { color: isActive ? '#FFF' : theme.textSecondary }]}>{tab.label}</Text>
                {isActionRequired && actionRequiredCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.dangerColor }]}>
                    <Text style={styles.badgeText}>{actionRequiredCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Summary Bar ── */}
        <View style={[styles.summaryBar, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}>
          <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
            {loading || searchLoading ? 'Loading...' : isSearchActive
              ? `${searchTotal} result${searchTotal !== 1 ? 's' : ''} found`
              : `${totalElements} submission${totalElements !== 1 ? 's' : ''}`}
          </Text>
          {isSearchActive && (
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={clearSearch}>
              <Ionicons name="close-circle" size={14} color={theme.accentColor} />
              <Text style={{ fontSize: 12, color: theme.accentColor, fontWeight: '600' }}>Clear Search</Text>
            </TouchableOpacity>
          )}
          {!isSearchActive && activeTab === 'action_required' && actionRequiredCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="alert-circle" size={14} color={theme.dangerColor} />
              <Text style={{ fontSize: 12, color: theme.dangerColor, fontWeight: '600' }}>
                {actionRequiredCount} need{actionRequiredCount === 1 ? 's' : ''} your attention
              </Text>
            </View>
          )}
        </View>

        {/* ── Loading State ── */}
        {(loading || searchLoading) && displayForms.length === 0 && (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={theme.accentColor} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>Loading...</Text>
          </View>
        )}

        {/* ── Empty State ── */}
        {!loading && !searchLoading && displayForms.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name={isSearchActive ? 'search-outline' : 'document-text-outline'} size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
              {isSearchActive ? 'No results found' : activeTab === 'action_required' ? 'No items need your attention' : 'No submissions found'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              {isSearchActive
                ? 'Try adjusting your search terms or filters.'
                : activeTab === 'action_required'
                ? 'Returned or rejected forms will appear here for correction.'
                : activeTab === 'draft'
                ? 'Saved drafts will appear here.'
                : 'Forms you submit will appear here.'}
            </Text>
          </View>
        )}

        {/* ── Form Cards ── */}
        {displayForms.map(renderFormCard)}

        {/* ── Load More ── */}
        {displayForms.length > 0 && displayForms.length < displayTotal && (
          <TouchableOpacity
            style={[styles.loadMoreBtn, { borderColor: theme.accentColor }]}
            onPress={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={theme.accentColor} />
            ) : (
              <Text style={[styles.loadMoreText, { color: theme.accentColor }]}>
                Load More ({displayForms.length} of {displayTotal})
              </Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <AlertModal alert={alert} onClose={hideAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Search Section
  searchSection: { padding: 12, paddingBottom: 8, borderBottomWidth: 1 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, outlineStyle: 'none' } as any,
  searchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  searchBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  filterToggleBtn: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  filterDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4 },
  // Filters Panel
  filtersPanel: { marginTop: 10, gap: 8 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: '600', width: 56 },
  chipScroll: { flex: 1 },
  chip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginRight: 4 },
  chipText: { fontSize: 11, fontWeight: '600' },
  dateInlineRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInputCompact: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12 },
  clearFiltersBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  // Status Tabs
  tabsContainer: { marginTop: 10, maxHeight: 48 },
  tabsContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabChipText: { fontSize: 13, fontWeight: '600' },
  badge: { minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, marginLeft: 2 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  // Summary
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 12, marginTop: 10, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  summaryText: { fontSize: 13, fontWeight: '600' },
  // Empty
  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  // Form Cards
  formCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    }),
  },
  actionBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  actionBannerText: { flex: 1, fontSize: 12, fontWeight: '600' },
  formCardBody: { padding: 14 },
  formCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  formRef: { fontWeight: '700', fontSize: 14 },
  formJourney: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' as any },
  formCardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, fontWeight: '500' },
  reasonPreview: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  reasonText: { flex: 1, fontSize: 12, lineHeight: 16 },
  resubmitBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  resubmitBadgeText: { fontSize: 11, fontWeight: '500' },
  loadMoreBtn: { marginHorizontal: 12, marginTop: 4, marginBottom: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  loadMoreText: { fontWeight: '700', fontSize: 13 },
});
