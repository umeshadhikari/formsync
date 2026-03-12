package com.formsync.controller;

import com.formsync.dto.DashboardStats;
import com.formsync.model.*;
import com.formsync.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController @RequestMapping("/api/v1/admin") @RequiredArgsConstructor
public class AdminController {
    private final UserRepository userRepo;
    private final RoleMappingRepository roleMappingRepo;
    private final ThemeConfigRepository themeRepo;
    private final FormInstanceRepository formRepo;
    private final WorkflowInstanceRepository workflowRepo;
    private final WorkflowRuleRepository ruleRepo;
    private final ApprovalActionRepository actionRepo;

    // ── Users ──
    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN')")
    public ResponseEntity<Page<User>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(userRepo.findAll(PageRequest.of(page, size)));
    }

    // ── Role Mappings ──
    @GetMapping("/roles")
    public ResponseEntity<Page<RoleMapping>> listRoles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(roleMappingRepo.findAll(PageRequest.of(page, size)));
    }

    @PutMapping("/roles/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<RoleMapping> updateRole(@PathVariable Long id, @RequestBody RoleMapping mapping) {
        RoleMapping existing = roleMappingRepo.findById(id).orElseThrow();
        if (mapping.getPermissions() != null) existing.setPermissions(mapping.getPermissions());
        if (mapping.getBranchScope() != null) existing.setBranchScope(mapping.getBranchScope());
        if (mapping.getJourneyScope() != null) existing.setJourneyScope(mapping.getJourneyScope());
        return ResponseEntity.ok(roleMappingRepo.save(existing));
    }

    // ── Themes ──
    @GetMapping("/themes")
    public ResponseEntity<Page<ThemeConfig>> listThemes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(themeRepo.findAll(PageRequest.of(page, size)));
    }

    @GetMapping("/themes/active")
    public ResponseEntity<ThemeConfig> activeTheme() {
        return ResponseEntity.ok(themeRepo.findByIsActiveTrue().orElse(null));
    }

    @PostMapping("/themes")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<ThemeConfig> createTheme(@RequestBody ThemeConfig theme) {
        return ResponseEntity.ok(themeRepo.save(theme));
    }

    @PutMapping("/themes/{id}/activate")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<ThemeConfig> activateTheme(@PathVariable Long id) {
        themeRepo.findAll().forEach(t -> { t.setIsActive(false); themeRepo.save(t); });
        ThemeConfig theme = themeRepo.findById(id).orElseThrow();
        theme.setIsActive(true);
        return ResponseEntity.ok(themeRepo.save(theme));
    }

    // ── Dashboard Stats (Role-Aware) ──
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardStats> dashboard(@AuthenticationPrincipal User actor) {
        String role = actor.getRole();
        String username = actor.getUsername();

        // Common data
        List<FormInstance> allForms = formRepo.findAll();
        Map<String, Long> byStatus = allForms.stream().collect(Collectors.groupingBy(FormInstance::getStatus, Collectors.counting()));
        Map<String, Long> byJourney = allForms.stream().collect(Collectors.groupingBy(FormInstance::getJourneyType, Collectors.counting()));
        long totalForms = allForms.size();
        long pendingApproval = byStatus.getOrDefault("PENDING_APPROVAL", 0L);
        long completed = byStatus.getOrDefault("COMPLETED", 0L);
        long rejected = byStatus.getOrDefault("REJECTED", 0L);

        List<DashboardStats.InsightCard> insights = new ArrayList<>();

        DashboardStats.DashboardStatsBuilder builder = DashboardStats.builder()
                .role(role)
                .totalForms(totalForms)
                .pendingApproval(pendingApproval)
                .approvedToday(completed)
                .rejectedToday(rejected)
                .byJourneyType(byJourney)
                .byStatus(byStatus);

        switch (role) {
            case "MAKER":
            case "SENIOR_MAKER": {
                // Teller: "What do I need to act on?"
                long myDrafts = formRepo.countByCreatedByAndStatus(username, "DRAFT");
                long myPending = formRepo.countByCreatedByAndStatus(username, "PENDING_APPROVAL");
                long myReturned = formRepo.countByCreatedByAndStatus(username, "RETURNED");
                long myRejected = formRepo.countByCreatedByAndStatus(username, "REJECTED");
                long myCompleted = formRepo.countByCreatedByAndStatus(username, "COMPLETED");
                long myTotal = formRepo.countByCreatedBy(username);
                long myResubs = formRepo.countResubmissionsByUser(username);

                builder.myDrafts(myDrafts).myPending(myPending).myReturned(myReturned)
                       .myRejected(myRejected).myCompleted(myCompleted).myResubmissions(myResubs);

                insights.add(DashboardStats.InsightCard.builder().id("returned").label("Returned").value(myReturned)
                        .icon("arrow-undo").color("#F97316").trend(myReturned > 0 ? "up" : "neutral").action("returned").build());
                insights.add(DashboardStats.InsightCard.builder().id("pending").label("In Review").value(myPending)
                        .icon("hourglass").color("#F59E0B").trend("neutral").build());
                insights.add(DashboardStats.InsightCard.builder().id("completed").label("Approved").value(myCompleted)
                        .icon("checkmark-circle").color("#10B981").trend("neutral").build());
                insights.add(DashboardStats.InsightCard.builder().id("drafts").label("Drafts").value(myDrafts)
                        .icon("create").color("#3B82F6").trend("neutral").action("drafts").build());
                break;
            }
            case "CHECKER":
            case "BRANCH_MANAGER":
            case "OPS_ADMIN": {
                // Supervisor: "What's waiting for me?"
                long queueDepth = workflowRepo.countPendingApproval();
                long myPickedUp = workflowRepo.countClaimedByUser(username);
                long slaAtRisk = workflowRepo.countSlaAtRisk(LocalDateTime.now().plusHours(2));
                long escalatedCount = workflowRepo.countEscalated();
                long todayApproved = workflowRepo.countCompletedToday();
                long todayRejected = workflowRepo.countRejectedToday();
                long todayReturned = workflowRepo.countReturnedToday();

                builder.queueDepth(queueDepth).myPickedUp(myPickedUp).slaAtRisk(slaAtRisk)
                       .escalated(escalatedCount).todayApproved(todayApproved)
                       .todayRejected(todayRejected).todayReturned(todayReturned);

                insights.add(DashboardStats.InsightCard.builder().id("queue").label("Queue").value(queueDepth)
                        .icon("layers").color("#F59E0B").trend(queueDepth > 5 ? "up" : "neutral").action("queue").build());
                insights.add(DashboardStats.InsightCard.builder().id("picked").label("Picked Up").value(myPickedUp)
                        .icon("hand-left").color("#3B82F6").trend("neutral").action("queue").build());
                insights.add(DashboardStats.InsightCard.builder().id("sla").label("SLA at Risk").value(slaAtRisk)
                        .icon("alert-circle").color("#EF4444").trend(slaAtRisk > 0 ? "up" : "neutral").build());
                insights.add(DashboardStats.InsightCard.builder().id("today_done").label("Done Today").value(todayApproved + todayRejected + todayReturned)
                        .icon("checkmark-done").color("#10B981").trend("neutral").build());
                break;
            }
            case "SYSTEM_ADMIN": {
                // Admin: system-wide overview
                long activeRules = ruleRepo.findByIsActiveTrueOrderByJourneyTypeAscPriorityDesc().size();
                long totalUsers = userRepo.findAll().size();
                long formsToday = formRepo.countFormsCreatedToday();
                long autoApproved = workflowRepo.countAutoApproved();
                double avgTiers = workflowRepo.avgApprovalTiers();
                long queueDepth = workflowRepo.countPendingApproval();
                long escalatedCount = workflowRepo.countEscalated();

                builder.activeRules(activeRules).totalUsers(totalUsers).formsToday(formsToday)
                       .autoApproved(autoApproved).avgApprovalTiers(avgTiers)
                       .queueDepth(queueDepth).escalated(escalatedCount);

                insights.add(DashboardStats.InsightCard.builder().id("forms_today").label("Forms Today").value(formsToday)
                        .icon("document-text").color("#3B82F6").trend("neutral").build());
                insights.add(DashboardStats.InsightCard.builder().id("queue").label("Pending Queue").value(queueDepth)
                        .icon("layers").color("#F59E0B").trend(queueDepth > 10 ? "up" : "neutral").build());
                insights.add(DashboardStats.InsightCard.builder().id("rules").label("Active Rules").value(activeRules)
                        .icon("swap-horizontal").color("#8B5CF6").trend("neutral").action("rules").build());
                insights.add(DashboardStats.InsightCard.builder().id("users").label("Users").value(totalUsers)
                        .icon("people").color("#10B981").trend("neutral").action("users").build());
                break;
            }
            case "AUDITOR": {
                // Auditor: compliance-focused
                long slaBreach = workflowRepo.countSlaBreached();
                long multiResub = formRepo.countMultiResubmissions();
                long highValue = formRepo.countHighValuePending(new BigDecimal("500000"));
                double rejectionRate = totalForms > 0 ? (double) rejected / totalForms * 100 : 0;

                builder.slaBreach(slaBreach).multiResubmit(multiResub)
                       .rejectionRate(rejectionRate).highValuePending(highValue);

                insights.add(DashboardStats.InsightCard.builder().id("sla_breach").label("SLA Breaches").value(slaBreach)
                        .icon("warning").color("#EF4444").trend(slaBreach > 0 ? "up" : "neutral").build());
                insights.add(DashboardStats.InsightCard.builder().id("multi_resub").label("Multi-Resubmit").value(multiResub)
                        .icon("repeat").color("#F97316").trend(multiResub > 0 ? "up" : "neutral").build());
                insights.add(DashboardStats.InsightCard.builder().id("high_value").label("High-Value Pending").value(highValue)
                        .icon("diamond").color("#8B5CF6").trend(highValue > 0 ? "up" : "neutral").build());
                insights.add(DashboardStats.InsightCard.builder().id("rejection_rate").label("Rejection Rate %").value(Math.round(rejectionRate))
                        .icon("trending-down").color(rejectionRate > 10 ? "#EF4444" : "#10B981").trend(rejectionRate > 10 ? "up" : "neutral").build());
                break;
            }
            default: {
                // Fallback: generic stats
                insights.add(DashboardStats.InsightCard.builder().id("total").label("Total Forms").value(totalForms)
                        .icon("documents").color("#3B82F6").trend("neutral").build());
                insights.add(DashboardStats.InsightCard.builder().id("pending").label("Pending").value(pendingApproval)
                        .icon("hourglass").color("#F59E0B").trend("neutral").build());
                insights.add(DashboardStats.InsightCard.builder().id("completed").label("Completed").value(completed)
                        .icon("checkmark-circle").color("#10B981").trend("neutral").build());
                insights.add(DashboardStats.InsightCard.builder().id("rejected").label("Rejected").value(rejected)
                        .icon("close-circle").color("#EF4444").trend("neutral").build());
                break;
            }
        }

        builder.insights(insights);
        return ResponseEntity.ok(builder.build());
    }
}
