import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Platform, TextInput, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { JOURNEY_TYPES, DashboardStats, FormTemplate } from '../types';
import api from '../api/client';
import AlertModal, { useAlert } from '../components/AlertModal';
import { getElevation, getGradientStyle } from '../utils/styles';

// ── Journey Categories ──
const JOURNEY_CATEGORIES: { title: string; icon: string; keys: string[] }[] = [
  {
    title: 'Deposits & Withdrawals',
    icon: 'cash',
    keys: ['CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'FIXED_DEPOSIT'],
  },
  {
    title: 'Transfers & Payments',
    icon: 'swap-horizontal',
    keys: ['FUNDS_TRANSFER', 'DEMAND_DRAFT', 'INSTRUMENT_CLEARING'],
  },
  {
    title: 'Account Services',
    icon: 'person-circle',
    keys: ['ACCOUNT_OPENING', 'ACCOUNT_SERVICING', 'CHEQUE_BOOK_REQUEST'],
  },
  {
    title: 'Lending',
    icon: 'trending-up',
    keys: ['LOAN_DISBURSEMENT'],
  },
];

export default function DashboardScreen({ navigation }: any) {
  const { user, logout, hasRole, hasPermission } = useAuth();
  const { theme } = useTheme();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentForms, setRecentForms] = useState<any[]>([]);
  const { alert, showAlert, hideAlert } = useAlert();

  // Journey search
  const [journeySearch, setJourneySearch] = useState('');
  // Collapsed categories
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(0);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Permission-driven dashboard sections (configurable via Admin > Roles)
  const canSubmitForms = hasPermission('FORM_CREATE');
  const canApprove = hasPermission('QUEUE_VIEW');
  const canManageUsers = hasPermission('USER_MANAGE');
  // Legacy aliases for stat pill logic (mapped to permissions)
  const isMaker = canSubmitForms;
  const isChecker = canApprove;
  const isAuditor = hasPermission('AUDIT_VIEW') && !canSubmitForms && !canApprove;
  const isAdmin = canManageUsers;

  const handleSearch = async (page = 0) => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await api.searchForms({ q: searchQuery, page, size: 15 });
      if (page === 0) setSearchResults(res.content || []);
      else setSearchResults(prev => [...prev, ...(res.content || [])]);
      setSearchTotal(res.totalElements || 0);
      setSearchPage(page);
      setIsSearchActive(true);
    } catch (e: any) { showAlert('error', 'Search Failed', e.message); }
    finally { setSearchLoading(false); }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchTotal(0);
    setSearchPage(0);
    setIsSearchActive(false);
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
  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const openJourney = (journeyType: string) => {
    const tpl = templates.find(t => t.journeyType === journeyType);
    if (tpl) {
      navigation.navigate('FormEntry', { template: tpl });
    } else {
      showAlert('warning', 'No Template', `No published template found for ${JOURNEY_TYPES[journeyType]?.label}`);
    }
  };

  const toggleCategory = (title: string) => {
    setCollapsedCats(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // Filter journeys by search
  const filteredJourneyKeys = journeySearch.trim()
    ? Object.keys(JOURNEY_TYPES).filter(key =>
        JOURNEY_TYPES[key].label.toLowerCase().includes(journeySearch.toLowerCase())
      )
    : null; // null = show categorized view

  const gradientBg = Platform.OS === 'web'
    ? { background: getGradientStyle(theme.gradientStart, theme.gradientEnd) }
    : {};

  // ── Stat pills from backend insights ──
  const insights = stats?.insights || [];
  const fallbackStats = stats && !stats.insights ? [
    { label: 'Total Forms', value: stats.totalForms, color: theme.accentColor, icon: 'documents' },
    { label: 'Pending', value: stats.pendingApproval, color: theme.warningColor, icon: 'hourglass' },
    { label: 'Completed', value: stats.approvedToday, color: theme.successColor, icon: 'checkmark-circle' },
    { label: 'Rejected', value: stats.rejectedToday, color: theme.dangerColor, icon: 'close-circle' },
  ] : [];
  const displayInsights = insights.length > 0 ? insights : fallbackStats;

  // ── Quick action items based on role stats ──
  const quickActions: { label: string; value: number; icon: string; color: string; tab?: string }[] = [];
  if (stats) {
    if (isMaker) {
      if ((stats.myDrafts || 0) > 0) quickActions.push({ label: 'Drafts', value: stats.myDrafts!, icon: 'create', color: theme.textTertiary, tab: 'draft' });
      if ((stats.myReturned || 0) > 0) quickActions.push({ label: 'Returned', value: stats.myReturned!, icon: 'arrow-undo', color: '#9B59B6', tab: 'action_required' });
      if ((stats.myPending || 0) > 0) quickActions.push({ label: 'In Review', value: stats.myPending!, icon: 'hourglass', color: theme.warningColor, tab: 'pending' });
      if ((stats.myCompleted || 0) > 0) quickActions.push({ label: 'Approved', value: stats.myCompleted!, icon: 'checkmark-circle', color: theme.successColor, tab: 'completed' });
    }
    if (isChecker) {
      if ((stats.queueDepth || 0) > 0) quickActions.push({ label: 'Queue', value: stats.queueDepth!, icon: 'layers', color: theme.accentColor });
      if ((stats.myPickedUp || 0) > 0) quickActions.push({ label: 'Picked Up', value: stats.myPickedUp!, icon: 'hand-left', color: theme.primaryColor });
      if ((stats.slaAtRisk || 0) > 0) quickActions.push({ label: 'SLA at Risk', value: stats.slaAtRisk!, icon: 'alert-circle', color: theme.dangerColor });
      if ((stats.todayApproved || 0) > 0) quickActions.push({ label: 'Done Today', value: stats.todayApproved!, icon: 'checkmark-done', color: theme.successColor });
    }
    if (isAuditor) {
      quickActions.push({ label: 'SLA Breaches', value: stats.slaBreach || 0, icon: 'alert-circle', color: theme.dangerColor });
      quickActions.push({ label: 'Multi-Resubmit', value: stats.multiResubmit || 0, icon: 'repeat', color: theme.warningColor });
      quickActions.push({ label: 'High-Value', value: stats.highValuePending || 0, icon: 'diamond', color: '#8B5CF6' });
      quickActions.push({ label: 'Rejection %', value: stats.rejectionRate || 0, icon: 'trending-down', color: theme.successColor });
    }
    if (isAdmin) {
      quickActions.push({ label: 'Forms Today', value: stats.formsToday || 0, icon: 'documents', color: theme.accentColor });
      quickActions.push({ label: 'Active Rules', value: stats.activeRules || 0, icon: 'git-branch', color: '#8B5CF6' });
      quickActions.push({ label: 'Users', value: stats.totalUsers || 0, icon: 'people', color: theme.primaryColor });
      if ((stats.autoApproved || 0) > 0) quickActions.push({ label: 'Auto-Approved', value: stats.autoApproved!, icon: 'flash', color: theme.successColor });
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accentColor} />}
    >
      {/* ═══════ WELCOME BANNER ═══════ */}
      <View
        style={[
          styles.banner,
          { backgroundColor: theme.primaryColor, borderColor: theme.borderColor },
          Platform.OS === 'web' && gradientBg,
        ]}
      >
        <View style={styles.bannerContent}>
          <View style={styles.bannerText}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.fullName}</Text>
            <Text style={styles.userRole}>{user?.role} | Branch: {user?.branchCode}</Text>
          </View>
          <TouchableOpacity
            onPress={logout}
            style={styles.logoutBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={16} color="#FFF" />
            <Text style={styles.logoutLabel}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══════ STATS STRIP ═══════ */}
      {displayInsights.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsStrip} contentContainerStyle={styles.statsStripContent}>
          {displayInsights.map((insight: any, i: number) => {
            const isUrgent = insight.trend === 'up' && insight.value > 0;
            return (
              <View
                key={insight.id || i}
                style={[
                  styles.statPill,
                  {
                    backgroundColor: insight.color + '10',
                    borderColor: isUrgent ? insight.color + '50' : insight.color + '25',
                  },
                ]}
              >
                <View style={[styles.statPillIcon, { backgroundColor: insight.color + '20' }]}>
                  <Ionicons name={insight.icon as any} size={16} color={insight.color} />
                </View>
                <Text style={[styles.statPillValue, { color: insight.color }]}>{insight.value}</Text>
                <Text style={[styles.statPillLabel, { color: theme.textSecondary }]}>{insight.label}</Text>
                {isUrgent && <View style={[styles.statPillDot, { backgroundColor: insight.color }]} />}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ═══════ QUICK ACTIONS (role-aware) ═══════ */}
      {quickActions.length > 0 && (
        <View style={styles.quickActionsSection}>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((qa, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.quickActionCard, { backgroundColor: theme.surfaceElevated, borderColor: qa.value > 0 ? qa.color + '30' : theme.borderColor }]}
                activeOpacity={0.7}
              >
                <View style={[styles.qaIconWrap, { backgroundColor: qa.color + '12' }]}>
                  <Ionicons name={qa.icon as any} size={18} color={qa.color} />
                </View>
                <Text style={[styles.qaValue, { color: qa.value > 0 ? qa.color : theme.textTertiary }]}>
                  {Number.isInteger(qa.value) ? qa.value : qa.value.toFixed(1)}
                </Text>
                <Text style={[styles.qaLabel, { color: theme.textSecondary }]} numberOfLines={1}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ═══════ JOURNEY SECTION (users with FORM_CREATE permission) ═══════ */}
      {canSubmitForms && (
      <View style={[styles.journeySection, { backgroundColor: theme.backgroundColor }]}>
        <View style={styles.journeySectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Select Journey</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textTertiary }]}>Choose a form type to begin</Text>
          </View>
        </View>

        {/* Journey Search */}
        <View style={[styles.journeySearchBar, { borderColor: theme.borderColor, backgroundColor: theme.inputBackground || theme.surfaceElevated }]}>
          <Ionicons name="search" size={15} color={theme.textTertiary} />
          <TextInput
            style={[styles.journeySearchInput, { color: theme.textPrimary }]}
            placeholder="Search journeys..."
            placeholderTextColor={theme.textTertiary}
            value={journeySearch}
            onChangeText={setJourneySearch}
            returnKeyType="search"
          />
          {journeySearch ? (
            <TouchableOpacity onPress={() => setJourneySearch('')}>
              <Ionicons name="close-circle" size={15} color={theme.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Flat search results */}
        {filteredJourneyKeys !== null ? (
          <View style={styles.journeyCompactGrid}>
            {filteredJourneyKeys.length === 0 ? (
              <Text style={[styles.noResults, { color: theme.textTertiary }]}>No journeys match "{journeySearch}"</Text>
            ) : (
              filteredJourneyKeys.map(key => renderCompactJourneyTile(key, templates, theme, openJourney))
            )}
          </View>
        ) : (
          /* Categorized view */
          JOURNEY_CATEGORIES.map(cat => {
            const isCollapsed = collapsedCats[cat.title];
            const catJourneys = cat.keys.filter(k => JOURNEY_TYPES[k]);
            if (catJourneys.length === 0) return null;
            return (
              <View key={cat.title} style={styles.categoryBlock}>
                <TouchableOpacity
                  style={[styles.categoryHeader, { borderBottomColor: theme.borderColor }]}
                  onPress={() => toggleCategory(cat.title)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <Ionicons name={cat.icon as any} size={16} color={theme.textSecondary} />
                    <Text style={[styles.categoryTitle, { color: theme.textPrimary }]}>{cat.title}</Text>
                    <View style={[styles.categoryCount, { backgroundColor: theme.accentColor + '15' }]}>
                      <Text style={[styles.categoryCountText, { color: theme.accentColor }]}>{catJourneys.length}</Text>
                    </View>
                  </View>
                  <Ionicons name={isCollapsed ? 'chevron-forward' : 'chevron-down'} size={16} color={theme.textTertiary} />
                </TouchableOpacity>
                {!isCollapsed && (
                  <View style={styles.journeyCompactGrid}>
                    {catJourneys.map(key => renderCompactJourneyTile(key, templates, theme, openJourney))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
      )}

      {/* ═══════ RECENT SUBMISSIONS + SEARCH ═══════ */}
      {recentForms.length > 0 && (
        <View style={[styles.recentSection, { borderTopColor: theme.borderColor }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>Recent Submissions</Text>
          </View>

          {/* Inline Search */}
          <View style={[styles.searchBar, { borderColor: theme.borderColor, backgroundColor: theme.inputBackground || theme.surfaceElevated }]}>
            <Ionicons name="search" size={16} color={theme.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search by reference or customer..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleSearch(0)}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={clearSearch}>
                <Ionicons name="close-circle" size={16} color={theme.textTertiary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.searchGoBtn, { backgroundColor: theme.primaryColor, opacity: searchLoading || !searchQuery.trim() ? 0.5 : 1 }]}
              onPress={() => handleSearch(0)}
              disabled={searchLoading || !searchQuery.trim()}
            >
              <Ionicons name="search" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Search results summary */}
          {isSearchActive && (
            <View style={[styles.searchSummary, { borderColor: theme.borderColor, backgroundColor: theme.surfaceElevated }]}>
              <Text style={[styles.searchSummaryText, { color: theme.textSecondary }]}>
                {searchLoading ? 'Searching...' : `${searchTotal} result${searchTotal !== 1 ? 's' : ''} found`}
              </Text>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={clearSearch}>
                <Ionicons name="close-circle" size={14} color={theme.accentColor} />
                <Text style={{ fontSize: 12, color: theme.accentColor, fontWeight: '600' }}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Display: search results or recent forms */}
          {(isSearchActive ? searchResults : recentForms).map((form: any) => {
            const statusColor = getStatusColor(form.status, theme);
            const statusIconMap: Record<string, string> = {
              DRAFT: 'create', PENDING_APPROVAL: 'hourglass', COMPLETED: 'checkmark-circle',
              REJECTED: 'close-circle', RETURNED: 'arrow-undo', FAILED: 'warning',
            };
            const fmtDate = (ds: string) => {
              if (!ds) return '';
              const d = new Date(ds);
              return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
                ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            };
            const isDraft = form.status === 'DRAFT';
            const isOwner = form.createdBy === user?.username;
            return (
              <TouchableOpacity
                key={form.id}
                style={[styles.recentCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.borderColor, borderLeftColor: statusColor }]}
                onPress={() => {
                  if (isDraft && isOwner) {
                    navigation.navigate('FormEntry', { formId: form.id });
                  } else {
                    navigation.navigate('FormDetail', { formId: form.id, form });
                  }
                }}
                activeOpacity={0.7}
              >
                {isDraft && isOwner && (
                  <View style={[styles.draftResumeBanner, { backgroundColor: theme.accentColor + '10' }]}>
                    <Ionicons name="pencil" size={13} color={theme.accentColor} />
                    <Text style={[styles.draftResumeBannerText, { color: theme.accentColor }]}>Tap to resume this draft</Text>
                    <Ionicons name="chevron-forward" size={13} color={theme.accentColor} />
                  </View>
                )}
                <View style={styles.recentCardBody}>
                  <View style={styles.recentCardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recentRef, { color: theme.accentColor }]}>{form.referenceNumber}</Text>
                      <Text style={[styles.recentJourney, { color: theme.textSecondary }]}>
                        {JOURNEY_TYPES[form.journeyType]?.label || form.journeyType}
                      </Text>
                    </View>
                    <View style={[styles.recentStatusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
                      <Ionicons name={(statusIconMap[form.status] || 'help-circle') as any} size={12} color={statusColor} />
                      <Text style={[styles.recentStatusText, { color: statusColor }]}>{form.status?.replace(/_/g, ' ')}</Text>
                    </View>
                  </View>
                  <View style={styles.recentDetails}>
                    <View style={styles.recentDetailItem}>
                      <Ionicons name="cash-outline" size={13} color={theme.textTertiary} />
                      <Text style={[styles.recentDetailText, { color: theme.textPrimary }]}>{form.currency} {form.amount?.toLocaleString()}</Text>
                    </View>
                    {form.customerName ? (
                      <View style={styles.recentDetailItem}>
                        <Ionicons name="person-outline" size={13} color={theme.textTertiary} />
                        <Text style={[styles.recentDetailText, { color: theme.textPrimary }]} numberOfLines={1}>{form.customerName}</Text>
                      </View>
                    ) : null}
                    <View style={styles.recentDetailItem}>
                      <Ionicons name="time-outline" size={13} color={theme.textTertiary} />
                      <Text style={[styles.recentDetailText, { color: theme.textTertiary }]}>{fmtDate(form.submittedAt || form.createdAt)}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Load More for search */}
          {isSearchActive && searchResults.length > 0 && searchResults.length < searchTotal && (
            <TouchableOpacity
              style={[styles.loadMoreBtn, { borderColor: theme.accentColor }]}
              onPress={() => handleSearch(searchPage + 1)}
              disabled={searchLoading}
            >
              <Text style={[styles.loadMoreText, { color: theme.accentColor }]}>
                {searchLoading ? 'Loading...' : `Load More (${searchResults.length} of ${searchTotal})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
      <AlertModal alert={alert} onClose={hideAlert} />
    </ScrollView>
  );
}

// ── Compact Journey Tile renderer ──
function renderCompactJourneyTile(key: string, templates: FormTemplate[], theme: any, openJourney: (k: string) => void) {
  const j = JOURNEY_TYPES[key];
  if (!j) return null;
  const hasTpl = templates.some(t => t.journeyType === key);

  return (
    <TouchableOpacity
      key={key}
      style={[
        styles.compactTile,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: hasTpl ? j.color + '25' : theme.borderColor,
          opacity: hasTpl ? 1 : 0.45,
        },
      ]}
      onPress={() => openJourney(key)}
      disabled={!hasTpl}
      activeOpacity={0.7}
    >
      <View style={[styles.compactTileIcon, { backgroundColor: j.color + '12' }]}>
        <Ionicons name={j.icon as any} size={18} color={j.color} />
      </View>
      <Text style={[styles.compactTileLabel, { color: theme.textPrimary }]} numberOfLines={1}>
        {j.label}
      </Text>
      {hasTpl ? (
        <Ionicons name="chevron-forward" size={14} color={j.color + '80'} style={{ marginLeft: 'auto' }} />
      ) : (
        <Text style={[styles.compactNoTpl, { color: theme.textTertiary }]}>—</Text>
      )}
    </TouchableOpacity>
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
  container: { flex: 1 },

  // ── Banner ──
  banner: {
    padding: 24,
    paddingTop: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(20, 35, 60, 0.2)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
    }),
  },
  bannerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerText: { flex: 1 },
  greeting: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.75)' },
  userName: { fontSize: 26, fontWeight: '800', marginTop: 4, color: '#FFF' },
  userRole: { fontSize: 12, marginTop: 6, fontWeight: '500', color: 'rgba(255,255,255,0.65)' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginLeft: 16, backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)' },
  logoutLabel: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  // ── Stats Strip ──
  statsStrip: { marginTop: 12, maxHeight: 56 },
  statsStripContent: { paddingHorizontal: 16, gap: 8 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  statPillIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statPillValue: { fontSize: 20, fontWeight: '800' },
  statPillLabel: { fontSize: 12, fontWeight: '600' },
  statPillDot: { width: 7, height: 7, borderRadius: 4, marginLeft: 2 },

  // ── Quick Actions ──
  quickActionsSection: { marginTop: 16, paddingHorizontal: 16 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickActionCard: {
    flexBasis: '22%',
    flexGrow: 1,
    minWidth: 80,
    maxWidth: '48%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.04)' } as any,
      default: { elevation: 1 },
    }),
  },
  qaIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  qaValue: { fontSize: 22, fontWeight: '800' },
  qaLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // ── Journey Section ──
  journeySection: { marginTop: 20 },
  journeySectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionSubtitle: { fontSize: 13, fontWeight: '400', marginTop: 2 },

  // ── Journey Search ──
  journeySearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  journeySearchInput: { flex: 1, fontSize: 13, outlineStyle: 'none' } as any,

  // ── Category Blocks ──
  categoryBlock: { marginBottom: 4 },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  categoryHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryTitle: { fontSize: 14, fontWeight: '700' },
  categoryCount: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  categoryCountText: { fontSize: 11, fontWeight: '700' },

  // ── Compact Journey Grid ──
  journeyCompactGrid: { paddingHorizontal: 16, gap: 6, marginBottom: 8 },
  compactTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as any,
      default: { elevation: 1 },
    }),
  },
  compactTileIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  compactTileLabel: { fontSize: 14, fontWeight: '600' },
  compactNoTpl: { fontSize: 11, marginLeft: 'auto', fontWeight: '500' },
  noResults: { fontSize: 13, textAlign: 'center', paddingVertical: 20, fontWeight: '500' },

  // ── Recent Section ──
  recentSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 12 },

  // ── Inline Search ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13, outlineStyle: 'none' } as any,
  searchGoBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  searchSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchSummaryText: { fontSize: 12, fontWeight: '600' },

  // ── Recent Cards ──
  recentCard: {
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
  recentCardBody: { padding: 14 },
  recentCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recentRef: { fontWeight: '700', fontSize: 14 },
  recentJourney: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  recentStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  recentStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' as any },
  recentDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  recentDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recentDetailText: { fontSize: 12, fontWeight: '500' },
  draftResumeBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  draftResumeBannerText: { flex: 1, fontSize: 12, fontWeight: '600' },
  loadMoreBtn: { marginHorizontal: 16, marginTop: 4, marginBottom: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  loadMoreText: { fontWeight: '700', fontSize: 13 },
});
