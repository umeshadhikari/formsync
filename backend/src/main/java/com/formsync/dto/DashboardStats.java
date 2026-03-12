package com.formsync.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data @Builder
public class DashboardStats {
    // ── Common fields ──
    private String role;
    private long totalForms;
    private long pendingApproval;
    private long approvedToday;
    private long rejectedToday;
    private Map<String, Long> byJourneyType;
    private Map<String, Long> byStatus;

    // ── Teller (MAKER) specific ──
    private long myDrafts;
    private long myPending;
    private long myReturned;
    private long myRejected;
    private long myCompleted;
    private long myResubmissions;

    // ── Supervisor (CHECKER / BRANCH_MANAGER / OPS_ADMIN) specific ──
    private long queueDepth;
    private long myPickedUp;
    private long slaAtRisk;
    private long escalated;
    private long todayApproved;
    private long todayRejected;
    private long todayReturned;

    // ── Admin (SYSTEM_ADMIN) specific ──
    private long activeRules;
    private long totalUsers;
    private long formsToday;
    private long autoApproved;
    private double avgApprovalTiers;

    // ── Auditor specific ──
    private long slaBreach;
    private long multiResubmit;
    private double rejectionRate;
    private long highValuePending;

    // ── Insight cards (universal) ──
    private List<InsightCard> insights;

    @Data @Builder
    public static class InsightCard {
        private String id;
        private String label;
        private long value;
        private String icon;
        private String color;
        private String trend;      // "up", "down", "neutral"
        private String action;     // optional: navigation target
    }
}
