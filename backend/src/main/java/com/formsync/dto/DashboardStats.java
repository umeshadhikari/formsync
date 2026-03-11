package com.formsync.dto;

import lombok.Builder;
import lombok.Data;
import java.util.Map;

@Data @Builder
public class DashboardStats {
    private long totalForms;
    private long pendingApproval;
    private long approvedToday;
    private long rejectedToday;
    private Map<String, Long> byJourneyType;
    private Map<String, Long> byStatus;
}
