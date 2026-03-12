import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from './Icon';
import { useTheme } from '../context/ThemeContext';
import { QueueItem, JOURNEY_TYPES, STATUS_COLORS } from '../types';
import { getElevation, getStatusGlow } from '../utils/styles';

interface ApprovalCardProps {
  item: QueueItem;
  onPress: () => void;
}

export default function ApprovalCard({ item, onPress }: ApprovalCardProps) {
  const { theme } = useTheme();
  const form = item.form;
  const wf = item.workflow;
  if (!form) return null;

  const journeyInfo = JOURNEY_TYPES[form.journeyType] || { label: form.journeyType, color: theme.textSecondary, icon: 'document' };
  const statusColor = STATUS_COLORS[form.status] || theme.textSecondary;

  const timeSinceSubmit = form.submittedAt
    ? getTimeAgo(new Date(form.submittedAt))
    : '';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceColor,
          ...getElevation(2, theme),
        }
      ]}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <View style={[styles.journeyBadge, { backgroundColor: journeyInfo.color + '15' }]}>
          <Ionicons name={journeyInfo.icon as any} size={12} color={journeyInfo.color} />
          <Text style={[styles.journeyText, { color: journeyInfo.color }]}>{journeyInfo.label}</Text>
        </View>
        <View style={styles.rightBadges}>
          <View style={[styles.tierBadge, { backgroundColor: theme.warningColor + '20' }]}>
            <Text style={[styles.tierText, { color: theme.warningColor }]}>Tier {wf?.currentTier || 1}</Text>
          </View>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: statusColor,
                ...(theme.isDark && getStatusGlow(statusColor, theme))
              }
            ]}
          />
        </View>
      </View>

      <Text style={[styles.refNumber, { color: theme.accentColor }]}>{form.referenceNumber}</Text>

      <View style={styles.detailRow}>
        <Text style={[styles.amount, { color: theme.textPrimary }]}>
          {form.currency} {form.amount?.toLocaleString()}
        </Text>
        {form.customerName && (
          <Text style={[styles.customer, { color: theme.textSecondary }]}>{form.customerName}</Text>
        )}
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.submitter, { color: theme.textSecondary }]}>
          <Ionicons name="person-outline" size={11} color={theme.textSecondary} /> {form.createdBy}
        </Text>
        {timeSinceSubmit ? (
          <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>
            <Ionicons name="time-outline" size={11} color={theme.textSecondary} /> {timeSinceSubmit}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  journeyBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  journeyText: { fontSize: 11, fontWeight: '700' },
  rightBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  tierText: { fontSize: 11, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  refNumber: { fontSize: 15, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  amount: { fontSize: 14, fontWeight: '600' },
  customer: { fontSize: 12 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  submitter: { fontSize: 11 },
  timeAgo: { fontSize: 11 },
});
