import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Platform, ActivityIndicator, TextInput, Modal } from 'react-native';
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

  // Action Required badge count
  const [actionRequiredCount, setActionRequiredCount] = useState(0);

  // ── Search State ──
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchJourney, setSearchJourney] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);

  const loadForms = useCallback(async (tab: StatusTab, pageNum = 0, append = false) => {
    const statusFilter = STATUS_TABS.find(t => t.key === tab)?.apiStatus;
    try {
      const res = await api.getMyForms(pageNum, PAGE_SIZE, statusFilter);
      const items = res?.content || res || [];
      const total = res?.totalElements || items.length;
      if (append) {
        setForms(prev => [...prev, ...items]);
      } else {
        setForms(items);
      }
      setTotalElements(total);
      setPage(pageNum);
    } catch (e: any) {
      showAlert('error', 'Load Failed', e.message);
    }
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

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [activeTab])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadForms(activeTab, 0), loadActionRequiredCount()]);
    setRefreshing(false);
  };

  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
    setForms([]);
    setPage(0);
    setTotalElements(0);
    setLoading(true);
    loadForms(tab, 0).finally(() => setLoading(false));
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadForms(activeTab, page + 1, true);
    setLoadingMore(false);
  };

  // ── Search Handlers ──
  const handleSearch = async (pageNum = 0, append = false) => {
    if (!searchQuery && !searchJourney && !searchStatus && !searchDateFrom && !searchDateTo) return;
    if (!append) setSearchLoading(true);
    try {
      const res = await api.searchForms({
        q: searchQuery || undefined,
        journeyType: searchJourney || undefined,
        status: searchStatus || undefined,
        dateFrom: searchDateFrom || undefined,
        dateTo: searchDateTo || undefined,
        page: pageNum,
        size: PAGE_SIZE,
      });
      const items = res?.content || res || [];
      const total = res?.totalElements || items.length;
      if (append) {
        setSearchResults(prev => [...prev, ...items]);
      } else {
        setSearchResults(items);
      }
      setSearchTotal(total);
      setSearchPage(pageNum);
    } catch (e: any) {
      showAlert('error', 'Search Failed', e.message);
    } finally {
      setSearchLoading(false);
      setSearchLoadingMore(false);
    }
  };

  const handleSearchLoadMore = () => {
    setSearchLoadingMore(true);
    handleSearch(searchPage + 1, true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchJourney('');
    setSearchStatus('');
    setSearchDateFrom('');
    setSearchDateTo('');
    setSearchResults([]);
    setSearchTotal(0);
    setSearchPage(0);
  };

  const openFormDetail = (form: any) => {
    navigation.navigate('FormDetail', { formId: form.id, form });
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
      DRAFT: 'create',
      PENDING_APPROVAL: 'hourglass',
      COMPLETED: 'checkmark-circle',
      REJECTED: 'close-circle',
      RETURNED: 'arrow-undo',
      FAILED: 'warning',
    };
    return map[status] || 'help-circle';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  // ── Render a single form card (shared between tabs & search) ──
  const renderFormCard = (form: any) => {
    const statusColor = getStatusColor(form.status);
    const isActionable = ['RETURNED', 'REJECTED'].includes(form.status);
    return (
      <TouchableOpacity
        key={form.id}
        style={[
          styles.formCard,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: isActionable ? statusColor + '60' : theme.borderColor,
            borderLeftColor: statusColor,
          },
          isActionable && { borderWidth: 1.5 },
        ]}
        onPress={() => openFormDetail(form)}
        activeOpacity={0.7}
      >
        {isActionable && (
          <View style={[styles.actionBanner, { backgroundColor: statusColor + '10' }]}>
            <Ionicons
              name={(form.status === 'RETURNED' ? 'arrow-undo' : 'close-circle') as any}
              size={14}
              color={statusColor}
            />
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
              <Text style={[styles.statusText, { color: statusColor }]}>
                {form.status?.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.formCardDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={13} color={theme.textTertiary} />
              <Text style={[styles.detailText, { color: theme.textPrimary }]}>
                {form.currency} {form.amount?.toLocaleString()}
              </Text>
            </View>
            {form.customerName && (
              <View style={styles.detailItem}>
                <Ionicons name="person-outline" size={13} color={theme.textTertiary} />
                <Text style={[styles.detailText, { color: theme.textPrimary }]} numberOfLines={1}>
                  {form.customerName}
                </Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={13} color={theme.textTertiary} />
              <Text style={[styles.detailText, { color: theme.textTertiary }]}>
                {formatDate(form.submittedAt || form.createdAt)}
              </Text>
            </View>
          </View>

          {form.status === 'RETURNED' && form.lastReturnInstructions && (
            <View style={[styles.reasonPreview, { backgroundColor: '#9B59B6' + '08', borderColor: '#9B59B6' + '20' }]}>
              <Ionicons name="chatbox-ellipses" size={12} color="#9B59B6" />
              <Text style={[styles.reasonText, { color: theme.textSecondary }]} numberOfLines={2}>
                {form.lastReturnInstructions}
              </Text>
            </View>
          )}
          {form.status === 'REJECTED' && form.lastRejectionReason && (
            <View style={[styles.reasonPreview, { backgroundColor: theme.dangerColor + '08', borderColor: theme.dangerColor + '20' }]}>
              <Ionicons name="chatbox-ellipses" size={12} color={theme.dangerColor} />
              <Text style={[styles.reasonText, { color: theme.textSecondary }]} numberOfLines={2}>
                {form.lastRejectionReason}
              </Text>
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

  const journeyKeys = Object.keys(JOURNEY_TYPES);
  const statusOptions = ['DRAFT', 'PENDING_APPROVAL', 'RETURNED', 'REJECTED', 'COMPLETED'];

  return (
    <View style={[{ flex: 1 }, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentColor} />}
      >
        {/* Search Bar */}
        <TouchableOpacity
          style={[styles.searchBar, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}
          onPress={() => setShowSearch(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={18} color={theme.textTertiary} />
          <Text style={[styles.searchBarText, { color: theme.textTertiary }]}>Search by reference or customer name...</Text>
        </TouchableOpacity>

        {/* Status Tab Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
          {STATUS_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const isActionRequired = tab.key === 'action_required';
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive ? theme.accentColor : theme.surfaceElevated,
                    borderColor: isActive ? theme.accentColor : theme.borderColor,
                  },
                ]}
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

        {/* Summary Bar */}
        <View style={[styles.summaryBar, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}>
          <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
            {loading ? 'Loading...' : `${totalElements} submission${totalElements !== 1 ? 's' : ''}`}
          </Text>
          {activeTab === 'action_required' && actionRequiredCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="alert-circle" size={14} color={theme.dangerColor} />
              <Text style={{ fontSize: 12, color: theme.dangerColor, fontWeight: '600' }}>
                {actionRequiredCount} need{actionRequiredCount === 1 ? 's' : ''} your attention
              </Text>
            </View>
          )}
        </View>

        {/* Loading State */}
        {loading && forms.length === 0 && (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={theme.accentColor} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>Loading submissions...</Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && forms.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
              {activeTab === 'action_required' ? 'No items need your attention' : 'No submissions found'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              {activeTab === 'action_required'
                ? 'Returned or rejected forms will appear here for correction.'
                : activeTab === 'draft'
                ? 'Saved drafts will appear here.'
                : 'Forms you submit will appear here.'}
            </Text>
          </View>
        )}

        {/* Form Cards */}
        {forms.map(renderFormCard)}

        {/* Load More */}
        {forms.length > 0 && forms.length < totalElements && (
          <TouchableOpacity
            style={[styles.loadMoreBtn, { borderColor: theme.accentColor }]}
            onPress={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={theme.accentColor} />
            ) : (
              <Text style={[styles.loadMoreText, { color: theme.accentColor }]}>
                Load More ({forms.length} of {totalElements})
              </Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Search Modal ── */}
      <Modal visible={showSearch} animationType="slide" transparent onRequestClose={() => setShowSearch(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.searchModal, { backgroundColor: theme.backgroundColor }]}>
            {/* Search Modal Header */}
            <View style={[styles.searchModalHeader, { borderBottomColor: theme.borderColor }]}>
              <Text style={[styles.searchModalTitle, { color: theme.textPrimary }]}>Search Forms</Text>
              <TouchableOpacity onPress={() => { setShowSearch(false); clearSearch(); }}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.searchModalBody} keyboardShouldPersistTaps="handled">
              {/* Search Input */}
              <View style={[styles.searchInputRow, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor }]}>
                <Ionicons name="search" size={18} color={theme.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                  placeholder="Reference number or customer name..."
                  placeholderTextColor={theme.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => handleSearch(0)}
                  returnKeyType="search"
                  autoFocus
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Filters Row */}
              <View style={styles.filtersRow}>
                {/* Journey Type Filter */}
                <View style={styles.filterCol}>
                  <Text style={[styles.filterLabel, { color: theme.textTertiary }]}>Journey Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36 }}>
                    <TouchableOpacity
                      style={[styles.filterChip, { backgroundColor: !searchJourney ? theme.accentColor : theme.surfaceElevated, borderColor: !searchJourney ? theme.accentColor : theme.borderColor }]}
                      onPress={() => setSearchJourney('')}
                    >
                      <Text style={[styles.filterChipText, { color: !searchJourney ? '#FFF' : theme.textSecondary }]}>All</Text>
                    </TouchableOpacity>
                    {journeyKeys.map(key => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.filterChip, { backgroundColor: searchJourney === key ? theme.accentColor : theme.surfaceElevated, borderColor: searchJourney === key ? theme.accentColor : theme.borderColor }]}
                        onPress={() => setSearchJourney(searchJourney === key ? '' : key)}
                      >
                        <Text style={[styles.filterChipText, { color: searchJourney === key ? '#FFF' : theme.textSecondary }]}>
                          {JOURNEY_TYPES[key]?.label || key}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Status Filter */}
                <View style={styles.filterCol}>
                  <Text style={[styles.filterLabel, { color: theme.textTertiary }]}>Status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36 }}>
                    <TouchableOpacity
                      style={[styles.filterChip, { backgroundColor: !searchStatus ? theme.accentColor : theme.surfaceElevated, borderColor: !searchStatus ? theme.accentColor : theme.borderColor }]}
                      onPress={() => setSearchStatus('')}
                    >
                      <Text style={[styles.filterChipText, { color: !searchStatus ? '#FFF' : theme.textSecondary }]}>All</Text>
                    </TouchableOpacity>
                    {statusOptions.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.filterChip, { backgroundColor: searchStatus === s ? theme.accentColor : theme.surfaceElevated, borderColor: searchStatus === s ? theme.accentColor : theme.borderColor }]}
                        onPress={() => setSearchStatus(searchStatus === s ? '' : s)}
                      >
                        <Text style={[styles.filterChipText, { color: searchStatus === s ? '#FFF' : theme.textSecondary }]}>
                          {s.replace(/_/g, ' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Date Range */}
                <View style={styles.filterCol}>
                  <Text style={[styles.filterLabel, { color: theme.textTertiary }]}>Date Range</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.dateInput, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor, color: theme.textPrimary }]}
                      placeholder="From (YYYY-MM-DD)"
                      placeholderTextColor={theme.textTertiary}
                      value={searchDateFrom}
                      onChangeText={setSearchDateFrom}
                    />
                    <TextInput
                      style={[styles.dateInput, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor, color: theme.textPrimary }]}
                      placeholder="To (YYYY-MM-DD)"
                      placeholderTextColor={theme.textTertiary}
                      value={searchDateTo}
                      onChangeText={setSearchDateTo}
                    />
                  </View>
                </View>
              </View>

              {/* Search & Clear Buttons */}
              <View style={styles.searchBtns}>
                <TouchableOpacity
                  style={[styles.searchBtn, { backgroundColor: theme.accentColor }]}
                  onPress={() => handleSearch(0)}
                  disabled={searchLoading}
                >
                  {searchLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="search" size={16} color="#FFF" />
                      <Text style={styles.searchBtnText}>Search</Text>
                    </>
                  )}
                </TouchableOpacity>
                {(searchQuery || searchJourney || searchStatus || searchDateFrom || searchDateTo) && (
                  <TouchableOpacity
                    style={[styles.clearBtn, { borderColor: theme.borderColor }]}
                    onPress={clearSearch}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Results */}
              {searchLoading && searchResults.length === 0 && (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="large" color={theme.accentColor} />
                </View>
              )}

              {!searchLoading && searchResults.length === 0 && (searchQuery || searchJourney || searchStatus) && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={40} color={theme.textTertiary} />
                  <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No results found</Text>
                </View>
              )}

              {searchResults.length > 0 && (
                <View style={styles.searchResultsHeader}>
                  <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                    Showing {searchResults.length} of {searchTotal} results
                  </Text>
                </View>
              )}

              {searchResults.map(form => {
                const statusColor = getStatusColor(form.status);
                return (
                  <TouchableOpacity
                    key={form.id}
                    style={[styles.searchResultCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor, borderLeftColor: statusColor }]}
                    onPress={() => { setShowSearch(false); openFormDetail(form); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.formCardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formRef, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
                        <Text style={[styles.formJourney, { color: theme.textSecondary }]}>
                          {JOURNEY_TYPES[form.journeyType]?.label || form.journeyType} | {form.currency} {form.amount?.toLocaleString()}
                        </Text>
                        {form.customerName && (
                          <Text style={[{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }]}>{form.customerName}</Text>
                        )}
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{form.status?.replace(/_/g, ' ')}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {searchResults.length > 0 && searchResults.length < searchTotal && (
                <TouchableOpacity
                  style={[styles.loadMoreBtn, { borderColor: theme.accentColor }]}
                  onPress={handleSearchLoadMore}
                  disabled={searchLoadingMore}
                >
                  {searchLoadingMore ? (
                    <ActivityIndicator size="small" color={theme.accentColor} />
                  ) : (
                    <Text style={[styles.loadMoreText, { color: theme.accentColor }]}>
                      Load More ({searchResults.length} of {searchTotal})
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AlertModal alert={alert} onClose={hideAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchBarText: { fontSize: 14 },
  tabsContainer: { marginTop: 12, maxHeight: 48 },
  tabsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabChipText: { fontSize: 13, fontWeight: '600' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  formCard: {
    marginHorizontal: 16,
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
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionBannerText: { flex: 1, fontSize: 12, fontWeight: '600' },
  formCardBody: { padding: 14 },
  formCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  formRef: { fontWeight: '700', fontSize: 14 },
  formJourney: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' as any },
  formCardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, fontWeight: '500' },
  reasonPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  reasonText: { flex: 1, fontSize: 12, lineHeight: 16 },
  resubmitBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  resubmitBadgeText: { fontSize: 11, fontWeight: '500' },
  loadMoreBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  loadMoreText: { fontWeight: '700', fontSize: 13 },

  // ── Search Modal ──
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  searchModal: {
    height: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 -8px 30px rgba(0,0,0,0.15)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    }),
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  searchModalTitle: { fontSize: 18, fontWeight: '700' },
  searchModalBody: { flex: 1, paddingHorizontal: 16 },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filtersRow: { marginTop: 16, gap: 14 },
  filterCol: { gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: '600' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  dateInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
  },
  searchBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  searchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  searchBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearBtnText: { fontWeight: '600', fontSize: 13 },
  searchResultsHeader: { marginTop: 16, marginBottom: 8 },
  searchResultCard: {
    marginBottom: 8,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    padding: 14,
  },
});
