package com.formsync.controller;

import com.formsync.dto.ApprovalRequest;
import com.formsync.dto.BulkApprovalRequest;
import com.formsync.dto.WorkflowRuleRequest;
import com.formsync.model.*;
import com.formsync.repository.*;
import com.formsync.service.WorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController @RequestMapping("/api/v1/workflows") @RequiredArgsConstructor
public class WorkflowController {
    private final WorkflowService workflowService;
    private final WorkflowInstanceRepository workflowRepo;
    private final FormInstanceRepository formRepo;
    private final WorkflowRuleRepository ruleRepo;

    private static final int CLAIM_EXPIRY_MINUTES = 15;

    // ── Approval Actions ──

    @PutMapping("/{formInstanceId}/approve")
    @PreAuthorize("hasAnyRole('CHECKER','BRANCH_MANAGER','OPS_ADMIN','SENIOR_MAKER')")
    public ResponseEntity<WorkflowInstance> approve(@PathVariable Long formInstanceId, @Valid @RequestBody ApprovalRequest req, @AuthenticationPrincipal User actor) {
        req.setAction("APPROVE");
        return ResponseEntity.ok(workflowService.processApproval(formInstanceId, req, actor));
    }

    @PutMapping("/{formInstanceId}/reject")
    @PreAuthorize("hasAnyRole('CHECKER','BRANCH_MANAGER','OPS_ADMIN')")
    public ResponseEntity<WorkflowInstance> reject(@PathVariable Long formInstanceId, @Valid @RequestBody ApprovalRequest req, @AuthenticationPrincipal User actor) {
        req.setAction("REJECT");
        return ResponseEntity.ok(workflowService.processApproval(formInstanceId, req, actor));
    }

    @PutMapping("/{formInstanceId}/return")
    @PreAuthorize("hasAnyRole('CHECKER','BRANCH_MANAGER','OPS_ADMIN')")
    public ResponseEntity<WorkflowInstance> returnForm(@PathVariable Long formInstanceId, @Valid @RequestBody ApprovalRequest req, @AuthenticationPrincipal User actor) {
        req.setAction("RETURN");
        return ResponseEntity.ok(workflowService.processApproval(formInstanceId, req, actor));
    }

    @PostMapping("/bulk-approve")
    @PreAuthorize("hasAnyRole('CHECKER','BRANCH_MANAGER','OPS_ADMIN','SENIOR_MAKER')")
    public ResponseEntity<Map<String, Object>> bulkApprove(@Valid @RequestBody BulkApprovalRequest req, @AuthenticationPrincipal User actor) {
        ApprovalRequest approvalRequest = new ApprovalRequest();
        approvalRequest.setAction("APPROVE");
        approvalRequest.setComments(req.getComments());
        workflowService.bulkApprove(req.getFormInstanceIds(), approvalRequest, actor);
        return ResponseEntity.ok(Map.of("message", "Bulk approval processed", "count", req.getFormInstanceIds().size()));
    }

    // ── Resubmission ──

    @PostMapping("/{formInstanceId}/resubmit")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<WorkflowInstance> resubmitForm(
            @PathVariable Long formInstanceId,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal User actor) {
        Map<String, Object> updatedFormData = null;
        if (body != null && body.containsKey("formData")) {
            @SuppressWarnings("unchecked")
            Map<String, Object> fd = (Map<String, Object>) body.get("formData");
            updatedFormData = fd;
        }
        return ResponseEntity.ok(workflowService.resubmitForm(formInstanceId, updatedFormData, actor));
    }

    @GetMapping("/{formInstanceId}/resubmission-info")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getResubmissionInfo(@PathVariable Long formInstanceId) {
        return ResponseEntity.ok(workflowService.getResubmissionInfo(formInstanceId));
    }

    // ── Rejection Config ──

    @GetMapping("/rejection-config")
    @PreAuthorize("hasAnyRole('CHECKER','BRANCH_MANAGER','OPS_ADMIN','SENIOR_MAKER','SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, Object>> getRejectionConfig(
            @RequestParam String journeyType,
            @RequestParam(required = false) BigDecimal amount) {
        return ResponseEntity.ok(workflowService.getRejectionConfig(journeyType, amount));
    }

    // ── Claim / Pickup ──

    @PutMapping("/{formInstanceId}/claim")
    @PreAuthorize("hasAnyRole('CHECKER','BRANCH_MANAGER','OPS_ADMIN','SENIOR_MAKER')")
    public ResponseEntity<Map<String, Object>> claimForm(@PathVariable Long formInstanceId, @AuthenticationPrincipal User actor) {
        WorkflowInstance wf = workflowService.claimForm(formInstanceId, actor);
        return ResponseEntity.ok(Map.of(
            "message", "Form claimed successfully",
            "claimedBy", wf.getClaimedBy(),
            "claimedByName", wf.getClaimedByName(),
            "claimedAt", wf.getClaimedAt().toString(),
            "expiresAt", wf.getClaimedAt().plusMinutes(CLAIM_EXPIRY_MINUTES).toString()
        ));
    }

    @PutMapping("/{formInstanceId}/release")
    @PreAuthorize("hasAnyRole('CHECKER','BRANCH_MANAGER','OPS_ADMIN','SENIOR_MAKER','SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, Object>> releaseForm(@PathVariable Long formInstanceId, @AuthenticationPrincipal User actor) {
        workflowService.releaseForm(formInstanceId, actor);
        return ResponseEntity.ok(Map.of("message", "Form released successfully"));
    }

    // ── Queue ──

    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('CHECKER','BRANCH_MANAGER','OPS_ADMIN','SENIOR_MAKER','SYSTEM_ADMIN')")
    public ResponseEntity<Page<Map<String, Object>>> pendingQueue(
            @AuthenticationPrincipal User actor,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String filterRole = role != null ? role : (actor != null ? actor.getRole() : null);
        List<WorkflowInstance> pending = filterRole != null
            ? workflowService.getPendingApprovalsForRole(filterRole)
            : workflowService.getPendingApprovals();

        List<WorkflowRule> allRules = ruleRepo.findByIsActiveTrueOrderByJourneyTypeAscPriorityDesc();
        List<Map<String, Object>> allItems = pending.stream().map(wf -> {
            FormInstance form = formRepo.findById(wf.getFormInstanceId()).orElse(null);
            Map<String, Object> wfMap = new HashMap<>();
            wfMap.put("id", wf.getId());
            wfMap.put("formInstanceId", wf.getFormInstanceId());
            wfMap.put("currentState", wf.getCurrentState());
            wfMap.put("currentTier", wf.getCurrentTier());
            wfMap.put("requiredTiers", wf.getRequiredTiers());
            wfMap.put("approvalMode", wf.getApprovalMode());
            wfMap.put("slaDeadline", wf.getSlaDeadline());
            wfMap.put("escalated", wf.getEscalated());
            wfMap.put("resubmissionCount", wf.getResubmissionCount());

            boolean claimExpired = wf.getClaimedAt() != null &&
                wf.getClaimedAt().plusMinutes(CLAIM_EXPIRY_MINUTES).isBefore(LocalDateTime.now());
            if (wf.getClaimedBy() != null && !claimExpired) {
                wfMap.put("claimedBy", wf.getClaimedBy());
                wfMap.put("claimedByName", wf.getClaimedByName());
                wfMap.put("claimedAt", wf.getClaimedAt());
                wfMap.put("claimExpiresAt", wf.getClaimedAt().plusMinutes(CLAIM_EXPIRY_MINUTES));
            }

            if (form != null) {
                allRules.stream()
                    .filter(r -> r.getJourneyType().equals(form.getJourneyType()))
                    .filter(r -> Objects.equals(r.getRequiredTiers(), wf.getRequiredTiers()))
                    .findFirst()
                    .ifPresent(rule -> {
                        wfMap.put("tierRoles", rule.getTierRoles());
                        wfMap.put("rejectionReasons", rule.getRejectionReasons());
                        wfMap.put("rejectionPolicy", rule.getRejectionPolicy());
                        wfMap.put("returnPolicy", rule.getReturnPolicy());
                        wfMap.put("requireRejectionReason", rule.getRequireRejectionReason());
                        wfMap.put("requireReturnInstructions", rule.getRequireReturnInstructions());
                    });
            }
            Map<String, Object> item = new HashMap<>();
            item.put("workflow", wfMap);
            item.put("form", form);
            return item;
        }).collect(Collectors.toList());

        // Manual pagination of the role-filtered list
        int total = allItems.size();
        int fromIndex = Math.min(page * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        List<Map<String, Object>> pageContent = allItems.subList(fromIndex, toIndex);
        return ResponseEntity.ok(new PageImpl<>(pageContent, PageRequest.of(page, size), total));
    }

    // ── My Items ──

    @GetMapping("/my-items")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<Map<String, Object>>> myItems(
            @AuthenticationPrincipal User actor,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<Map<String, Object>> allItems = workflowService.getMyItems(actor.getUsername());
        int total = allItems.size();
        int fromIndex = Math.min(page * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        List<Map<String, Object>> pageContent = allItems.subList(fromIndex, toIndex);
        return ResponseEntity.ok(new PageImpl<>(pageContent, PageRequest.of(page, size), total));
    }

    // ── Workflow by Form ──

    @GetMapping("/by-form/{formInstanceId}")
    public ResponseEntity<Map<String, Object>> getByForm(@PathVariable Long formInstanceId) {
        WorkflowInstance wf = workflowRepo.findByFormInstanceId(formInstanceId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found for form: " + formInstanceId));
        FormInstance form = formRepo.findById(formInstanceId).orElse(null);

        Map<String, Object> result = new HashMap<>();
        result.put("id", wf.getId());
        result.put("formInstanceId", wf.getFormInstanceId());
        result.put("currentState", wf.getCurrentState());
        result.put("currentTier", wf.getCurrentTier());
        result.put("requiredTiers", wf.getRequiredTiers());
        result.put("approvalMode", wf.getApprovalMode());
        result.put("slaDeadline", wf.getSlaDeadline());
        result.put("escalated", wf.getEscalated());
        result.put("createdAt", wf.getCreatedAt());
        result.put("updatedAt", wf.getUpdatedAt());
        result.put("resubmissionCount", wf.getResubmissionCount());
        result.put("rejectionReason", wf.getRejectionReason());
        result.put("returnInstructions", wf.getReturnInstructions());

        boolean claimExpired = wf.getClaimedAt() != null &&
            wf.getClaimedAt().plusMinutes(CLAIM_EXPIRY_MINUTES).isBefore(LocalDateTime.now());
        if (wf.getClaimedBy() != null && !claimExpired) {
            result.put("claimedBy", wf.getClaimedBy());
            result.put("claimedByName", wf.getClaimedByName());
            result.put("claimedAt", wf.getClaimedAt());
        }

        if (form != null) {
            List<WorkflowRule> rules = ruleRepo.findByIsActiveTrueOrderByJourneyTypeAscPriorityDesc();
            rules.stream()
                .filter(r -> r.getJourneyType().equals(form.getJourneyType()))
                .filter(r -> Objects.equals(r.getRequiredTiers(), wf.getRequiredTiers()))
                .findFirst()
                .ifPresent(rule -> {
                    result.put("tierRoles", rule.getTierRoles());
                    result.put("rejectionReasons", rule.getRejectionReasons());
                    result.put("rejectionPolicy", rule.getRejectionPolicy());
                    result.put("returnPolicy", rule.getReturnPolicy());
                });
        }

        return ResponseEntity.ok(result);
    }

    // ── Escalation ──

    @PostMapping("/escalate-overdue")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, Object>> escalateOverdue() {
        int escalatedCount = workflowService.escalateOverdue();
        return ResponseEntity.ok(Map.of("message", "Escalation check completed", "escalatedCount", escalatedCount));
    }

    // ── Workflow Rules CRUD ──
    @GetMapping("/rules")
    public ResponseEntity<Page<WorkflowRule>> listRules(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        List<WorkflowRule> all = ruleRepo.findByIsActiveTrueOrderByJourneyTypeAscPriorityDesc();
        int total = all.size();
        int fromIndex = Math.min(page * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        return ResponseEntity.ok(new PageImpl<>(all.subList(fromIndex, toIndex), PageRequest.of(page, size), total));
    }

    @GetMapping("/rules/all")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN')")
    public ResponseEntity<Page<WorkflowRule>> listAllRules(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ruleRepo.findAll(PageRequest.of(page, size)));
    }

    @PostMapping("/rules")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<WorkflowRule> createRule(@RequestBody WorkflowRuleRequest req) {
        WorkflowRule rule = WorkflowRule.builder()
                .ruleName(req.getRuleName()).journeyType(req.getJourneyType())
                .conditionField(req.getConditionField()).conditionOp(req.getConditionOp())
                .conditionValue(req.getConditionValue()).requiredTiers(req.getRequiredTiers())
                .approvalMode(req.getApprovalMode()).tierRoles(req.getTierRoles())
                .priority(req.getPriority()).isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .rejectionPolicy(req.getRejectionPolicy() != null ? req.getRejectionPolicy() : "PERMANENT")
                .returnPolicy(req.getReturnPolicy() != null ? req.getReturnPolicy() : "ALLOW_RESUBMIT")
                .maxResubmissions(req.getMaxResubmissions() != null ? req.getMaxResubmissions() : 3)
                .rejectionReasons(req.getRejectionReasons())
                .requireRejectionReason(req.getRequireRejectionReason() != null ? req.getRequireRejectionReason() : true)
                .requireReturnInstructions(req.getRequireReturnInstructions() != null ? req.getRequireReturnInstructions() : true)
                .build();
        return ResponseEntity.ok(ruleRepo.save(rule));
    }

    @PutMapping("/rules/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<WorkflowRule> updateRule(@PathVariable Long id, @RequestBody WorkflowRuleRequest req) {
        WorkflowRule rule = ruleRepo.findById(id).orElseThrow(() -> new IllegalArgumentException("Rule not found"));
        if (req.getRuleName() != null) rule.setRuleName(req.getRuleName());
        if (req.getConditionField() != null) rule.setConditionField(req.getConditionField());
        if (req.getConditionOp() != null) rule.setConditionOp(req.getConditionOp());
        if (req.getConditionValue() != null) rule.setConditionValue(req.getConditionValue());
        if (req.getRequiredTiers() != null) rule.setRequiredTiers(req.getRequiredTiers());
        if (req.getApprovalMode() != null) rule.setApprovalMode(req.getApprovalMode());
        if (req.getTierRoles() != null) rule.setTierRoles(req.getTierRoles());
        if (req.getPriority() != null) rule.setPriority(req.getPriority());
        if (req.getIsActive() != null) rule.setIsActive(req.getIsActive());
        if (req.getRejectionPolicy() != null) rule.setRejectionPolicy(req.getRejectionPolicy());
        if (req.getReturnPolicy() != null) rule.setReturnPolicy(req.getReturnPolicy());
        if (req.getMaxResubmissions() != null) rule.setMaxResubmissions(req.getMaxResubmissions());
        if (req.getRejectionReasons() != null) rule.setRejectionReasons(req.getRejectionReasons());
        if (req.getRequireRejectionReason() != null) rule.setRequireRejectionReason(req.getRequireRejectionReason());
        if (req.getRequireReturnInstructions() != null) rule.setRequireReturnInstructions(req.getRequireReturnInstructions());
        return ResponseEntity.ok(ruleRepo.save(rule));
    }

    @DeleteMapping("/rules/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        ruleRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
