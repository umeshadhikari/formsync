import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from './Icon';
import { useTheme } from '../context/ThemeContext';

interface ApprovalAction {
  id: number;
  tier: number;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  comments?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface ApprovalTimelineProps {
  approvalHistory: ApprovalAction[];
  currentTier: number;
  requiredTiers: number;
  currentState: string;
  formStatus?: string;
  submittedAt?: string;
  submitterName?: string;
  tierRoles?: string[];
  resubmissionCount?: number;
  rejectionReason?: string;
  returnInstructions?: string;
}

const ROLE_LABELS: Record<string, string> = {
  CHECKER: 'Supervisor',
  BRANCH_MANAGER: 'Branch Manager',
  OPS_ADMIN: 'Operations Admin',
  SENIOR_MAKER: 'Senior Maker',
  SYSTEM_ADMIN: 'System Admin',
};

const TIER_DEFAULT_ROLES = ['CHECKER', 'BRANCH_MANAGER', 'OPS_ADMIN'];

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

export default function ApprovalTimeline({
  approvalHistory, currentTier, requiredTiers, currentState, formStatus,
  submittedAt, submitterName, tierRoles,
  resubmissionCount, rejectionReason, returnInstructions,
}: ApprovalTimelineProps) {
  const { theme } = useTheme();

  if (requiredTiers === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surfaceElevated, borderRadius: 12, padding: 16 }]}>
        <Text style={[styles.sectionTitle, { color: theme.primaryColor || theme.accentColor }]}>Approval Timeline</Text>
        {submittedAt && (
          <View style={styles.timelineRow}>
            <View style={styles.nodeCol}>
              <View style={[styles.nodeCircle, styles.nodeSmall, { backgroundColor: theme.accentColor }]}>
                <Ionicons name="paper-plane" size={12} color="#FFF" />
              </View>
              <View style={[styles.connector, { backgroundColor: theme.successColor + '40' }]} />
            </View>
            <View style={styles.contentCol}>
              <Text style={[styles.tierLabel, { color: theme.textPrimary }]}>Submitted</Text>
              {submitterName && <Text style={[styles.nodeSubtext, { color: theme.textSecondary }]}>by {submitterName}</Text>}
              <Text style={[styles.timestamp, { color: theme.textTertiary, marginLeft: 0, marginTop: 2 }]}>{formatDate(submittedAt)}</Text>
            </View>
          </View>
        )}
        <View style={styles.timelineRow}>
          <View style={styles.nodeCol}>
            <View style={[styles.nodeCircle, styles.nodeSmall, { backgroundColor: theme.successColor }]}>
              <Ionicons name="flash" size={12} color="#FFF" />
            </View>
          </View>
          <View style={styles.contentCol}>
            <Text style={[styles.tierLabel, { color: theme.successColor }]}>Auto-Approved</Text>
            <Text style={[styles.nodeSubtext, { color: theme.textTertiary }]}>No approval tiers required for this form</Text>
          </View>
        </View>
      </View>
    );
  }

  const isTerminal = ['REJECTED', 'RETURNED', 'COMPLETED', 'APPROVED', 'FAILED'].includes(currentState) ||
                     ['REJECTED', 'RETURNED', 'COMPLETED', 'APPROVED', 'FAILED'].includes(formStatus || '');

  // Build tier data — match approval actions to tiers
  // Handle bulk approve case where tier numbers in history may not match sequential tiers
  const sortedHistory = [...approvalHistory].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const tiers = [];
  for (let t = 1; t <= requiredTiers; t++) {
    // First try exact tier match
    let tierActions = sortedHistory.filter(a => a.tier === t);

    // If no exact match and form is terminal+approved, check if there's a bulk/sequential action we can attribute
    if (tierActions.length === 0 && isTerminal && (currentState === 'COMPLETED' || formStatus === 'COMPLETED')) {
      // For completed forms, if we have fewer history records than tiers,
      // it means some tiers were bulk-approved. Find the Nth approval action.
      const allApprovals = sortedHistory.filter(a => a.action === 'APPROVE');
      if (allApprovals.length > 0) {
        // If only one approval record for multi-tier (bulk approve), apply it to all tiers
        if (allApprovals.length === 1 && requiredTiers > 1) {
          tierActions = [allApprovals[0]];
        } else if (allApprovals[t - 1]) {
          tierActions = [allApprovals[t - 1]];
        }
      }
    }

    const lastAction = tierActions.length > 0 ? tierActions[tierActions.length - 1] : null;

    // Determine role label: use tierRoles prop > action's actorRole > default
    const configuredRole = tierRoles && tierRoles[t - 1] ? tierRoles[t - 1] : TIER_DEFAULT_ROLES[t - 1];
    const roleLabel = lastAction
      ? (ROLE_LABELS[lastAction.actorRole] || lastAction.actorRole)
      : (ROLE_LABELS[configuredRole] || configuredRole || `Tier ${t} Approver`);

    let status: 'completed' | 'rejected' | 'returned' | 'current' | 'future';
    if (lastAction) {
      if (lastAction.action === 'APPROVE') status = 'completed';
      else if (lastAction.action === 'REJECT') status = 'rejected';
      else if (lastAction.action === 'RETURN') status = 'returned';
      else status = 'completed';
    } else if (t === currentTier && !isTerminal) {
      status = 'current';
    } else if (t < currentTier || (isTerminal && (currentState === 'COMPLETED' || formStatus === 'COMPLETED'))) {
      // Tiers before current must have been approved (even if no record)
      status = 'completed';
    } else {
      status = 'future';
    }

    tiers.push({ tier: t, status, action: lastAction, roleLabel });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceElevated, borderRadius: 12, padding: 16 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={[styles.sectionTitle, { color: theme.primaryColor || theme.accentColor, marginBottom: 0 }]}>Approval Timeline</Text>
        {resubmissionCount != null && resubmissionCount > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.warningColor + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Ionicons name="repeat" size={12} color={theme.warningColor} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.warningColor }}>
              Cycle {resubmissionCount + 1}
            </Text>
          </View>
        )}
      </View>

      {/* Submission Node */}
      <View style={styles.timelineRow}>
        <View style={styles.nodeCol}>
          <View style={[styles.nodeCircle, styles.nodeSmall, { backgroundColor: theme.accentColor }]}>
            <Ionicons name="paper-plane" size={12} color="#FFF" />
          </View>
          {tiers.length > 0 && <View style={[styles.connector, { backgroundColor: theme.borderColor }]} />}
        </View>
        <View style={styles.contentCol}>
          <Text style={[styles.tierLabel, { color: theme.textPrimary }]}>Submitted</Text>
          {submitterName && (
            <Text style={[styles.nodeSubtext, { color: theme.textSecondary }]}>by {submitterName}</Text>
          )}
          {submittedAt && (
            <Text style={[styles.timestamp, { color: theme.textTertiary, marginLeft: 0, marginTop: 2 }]}>
              {formatDate(submittedAt)}
            </Text>
          )}
          {!submittedAt && (
            <Text style={[styles.nodeSubtext, { color: theme.textTertiary }]}>Form submitted for approval</Text>
          )}
        </View>
      </View>

      {/* Tier Nodes */}
      {tiers.map((tier, index) => {
        const isLast = index === tiers.length - 1;
        const nodeColor = tier.status === 'completed' ? theme.successColor
          : tier.status === 'rejected' ? theme.dangerColor
          : tier.status === 'returned' ? theme.warningColor
          : tier.status === 'current' ? theme.warningColor
          : theme.textTertiary;

        const iconName = tier.status === 'completed' ? 'checkmark'
          : tier.status === 'rejected' ? 'close'
          : tier.status === 'returned' ? 'arrow-undo'
          : tier.status === 'current' ? 'hourglass'
          : 'ellipse-outline';

        const nodeOpacity = tier.status === 'future' ? 0.5 : 1;

        return (
          <View key={tier.tier} style={[styles.timelineRow, { opacity: nodeOpacity }]}>
            <View style={styles.nodeCol}>
              <View style={[
                styles.nodeCircle,
                { backgroundColor: tier.status === 'future' ? 'transparent' : nodeColor,
                  borderWidth: tier.status === 'future' ? 2 : 0,
                  borderColor: theme.textTertiary,
                  borderStyle: tier.status === 'future' ? 'dashed' : 'solid',
                },
                tier.status === 'current' && Platform.OS === 'web' && {
                  boxShadow: `0 0 12px ${theme.warningColor}60`,
                } as any,
              ]}>
                <Ionicons name={iconName as any} size={16} color={tier.status === 'future' ? theme.textTertiary : '#FFF'} />
              </View>
              {!isLast && <View style={[styles.connector, {
                backgroundColor: tier.status === 'completed' ? theme.successColor + '40' : theme.borderColor,
              }]} />}
              {isLast && isTerminal && (currentState === 'COMPLETED' || formStatus === 'COMPLETED') && (
                <View style={[styles.connector, { backgroundColor: theme.successColor + '40' }]} />
              )}
            </View>
            <View style={[styles.contentCol, { paddingBottom: isLast && !isTerminal ? 0 : 4 }]}>
              <View style={styles.tierHeader}>
                <Text style={[styles.tierLabel, { color: theme.textPrimary }]}>
                  Tier {tier.tier} — {tier.roleLabel}
                </Text>
              </View>
              {tier.action ? (
                <View style={styles.actionDetail}>
                  <View style={styles.actionRow}>
                    <Ionicons
                      name={tier.status === 'completed' ? 'checkmark-circle' : tier.status === 'rejected' ? 'close-circle' : 'arrow-undo-circle'}
                      size={14}
                      color={nodeColor}
                    />
                    <Text style={[styles.actionText, { color: nodeColor }]}>
                      {tier.action.action === 'APPROVE' ? 'Approved' : tier.action.action === 'REJECT' ? 'Rejected' : 'Returned'}
                    </Text>
                    <Text style={[styles.byText, { color: theme.textSecondary }]}>
                      by {tier.action.actorName}
                    </Text>
                  </View>
                  <Text style={[styles.timestamp, { color: theme.textTertiary }]}>
                    {formatDate(tier.action.createdAt)}
                  </Text>
                  {tier.action.rejectionReason && tier.action.rejectionReason.trim() !== '' ? (
                    <View style={[styles.commentBubble, { backgroundColor: theme.dangerColor + '08', borderColor: theme.dangerColor + '20' }]}>
                      <Ionicons name="alert-circle-outline" size={12} color={theme.dangerColor} />
                      <Text style={[styles.commentText, { color: theme.textSecondary }]}>
                        {tier.action.rejectionReason}
                      </Text>
                    </View>
                  ) : null}
                  {tier.action.comments && tier.action.comments.trim() !== '' ? (
                    <View style={[styles.commentBubble, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: theme.borderColor }]}>
                      <Ionicons name="chatbubble-ellipses-outline" size={12} color={theme.textTertiary} />
                      <Text style={[styles.commentText, { color: theme.textSecondary }]}>
                        "{tier.action.comments}"
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : tier.status === 'completed' ? (
                // Completed but no action record (bulk approve or missing data)
                <View style={styles.actionDetail}>
                  <View style={styles.actionRow}>
                    <Ionicons name="checkmark-circle" size={14} color={nodeColor} />
                    <Text style={[styles.actionText, { color: nodeColor }]}>Approved</Text>
                  </View>
                </View>
              ) : tier.status === 'current' ? (
                <View style={styles.actionDetail}>
                  <View style={styles.actionRow}>
                    <Ionicons name="time-outline" size={14} color={theme.warningColor} />
                    <Text style={[styles.awaitingText, { color: theme.warningColor }]}>
                      Awaiting approval
                    </Text>
                  </View>
                  <Text style={[styles.nodeSubtext, { color: theme.textTertiary }]}>
                    Requires {tier.roleLabel} review
                  </Text>
                </View>
              ) : (
                // Future tier — show expected route
                <View style={styles.actionDetail}>
                  <View style={styles.actionRow}>
                    <Ionicons name="arrow-forward-outline" size={13} color={theme.textTertiary} />
                    <Text style={[styles.nodeSubtext, { color: theme.textTertiary, marginTop: 0 }]}>
                      Requires {tier.roleLabel} approval
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        );
      })}

      {/* Completion Node */}
      {isTerminal && (currentState === 'COMPLETED' || formStatus === 'COMPLETED') && (
        <View style={styles.timelineRow}>
          <View style={styles.nodeCol}>
            <View style={[styles.nodeCircle, styles.nodeSmall, { backgroundColor: theme.successColor }]}>
              <Ionicons name="ribbon" size={12} color="#FFF" />
            </View>
          </View>
          <View style={styles.contentCol}>
            <Text style={[styles.tierLabel, { color: theme.successColor }]}>Completed</Text>
            <Text style={[styles.nodeSubtext, { color: theme.textTertiary }]}>Processed via CBS & archived</Text>
          </View>
        </View>
      )}

      {/* Rejection / Return terminal node */}
      {isTerminal && (currentState === 'REJECTED' || formStatus === 'REJECTED') && (
        <View style={styles.timelineRow}>
          <View style={styles.nodeCol}>
            <View style={[styles.nodeCircle, styles.nodeSmall, { backgroundColor: theme.dangerColor }]}>
              <Ionicons name="close" size={12} color="#FFF" />
            </View>
          </View>
          <View style={styles.contentCol}>
            <Text style={[styles.tierLabel, { color: theme.dangerColor }]}>Rejected</Text>
            {rejectionReason ? (
              <View style={[styles.commentBubble, { backgroundColor: theme.dangerColor + '08', borderColor: theme.dangerColor + '20' }]}>
                <Ionicons name="alert-circle-outline" size={12} color={theme.dangerColor} />
                <Text style={[styles.commentText, { color: theme.textSecondary }]}>{rejectionReason}</Text>
              </View>
            ) : (
              <Text style={[styles.nodeSubtext, { color: theme.textTertiary }]}>Form has been rejected</Text>
            )}
          </View>
        </View>
      )}

      {isTerminal && (currentState === 'RETURNED' || formStatus === 'RETURNED') && (
        <View style={styles.timelineRow}>
          <View style={styles.nodeCol}>
            <View style={[styles.nodeCircle, styles.nodeSmall, { backgroundColor: theme.warningColor }]}>
              <Ionicons name="arrow-undo" size={12} color="#FFF" />
            </View>
          </View>
          <View style={styles.contentCol}>
            <Text style={[styles.tierLabel, { color: theme.warningColor }]}>Returned to Maker</Text>
            {returnInstructions ? (
              <View style={[styles.commentBubble, { backgroundColor: theme.warningColor + '08', borderColor: theme.warningColor + '20' }]}>
                <Ionicons name="create-outline" size={12} color={theme.warningColor} />
                <Text style={[styles.commentText, { color: theme.textSecondary }]}>{returnInstructions}</Text>
              </View>
            ) : (
              <Text style={[styles.nodeSubtext, { color: theme.textTertiary }]}>Form returned for corrections</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 16 },
  timelineRow: { flexDirection: 'row', minHeight: 56 },
  nodeCol: { width: 36, alignItems: 'center' },
  nodeCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  nodeSmall: { width: 26, height: 26, borderRadius: 13 },
  connector: { width: 2, flex: 1, minHeight: 20, marginVertical: 2 },
  contentCol: { flex: 1, marginLeft: 12, paddingBottom: 12 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierLabel: { fontSize: 13, fontWeight: '700' },
  nodeSubtext: { fontSize: 11, marginTop: 2 },
  actionDetail: { marginTop: 4, gap: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 12, fontWeight: '700' },
  byText: { fontSize: 12 },
  awaitingText: { fontSize: 12, fontWeight: '600' },
  timestamp: { fontSize: 11, marginLeft: 20 },
  commentBubble: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4, padding: 8, borderRadius: 8, borderWidth: 1 },
  commentText: { fontSize: 11, fontStyle: 'italic', flex: 1 },
});
