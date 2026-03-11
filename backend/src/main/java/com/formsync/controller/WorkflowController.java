package com.formsync.controller;

import com.formsync.dto.ApprovalRequest;
import com.formsync.dto.WorkflowRuleRequest;
import com.formsync.model.*;
import com.formsync.repository.*;
import com.formsync.service.WorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController @RequestMapping("/api/v1/workflows") @RequiredArgsConstructor
public class WorkflowController {
    private final WorkflowService workflowService;
    private final WorkflowInstanceRepository workflowRepo;
    private final FormInstanceRepository formRepo;
    private final WorkflowRuleRepository ruleRepo;

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

    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('CHECKER','BRANCH_MANAGER','OPS_ADMIN','SENIOR_MAKER')")
    public ResponseEntity<List<Map<String, Object>>> pendingQueue(@AuthenticationPrincipal User actor) {
        List<WorkflowInstance> pending = workflowService.getPendingApprovals();
        List<Map<String, Object>> result = pending.stream().map(wf -> {
            FormInstance form = formRepo.findById(wf.getFormInstanceId()).orElse(null);
            Map<String, Object> item = new HashMap<>();
            item.put("workflow", wf);
            item.put("form", form);
            return item;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ── Workflow Rules CRUD ──
    @GetMapping("/rules")
    public ResponseEntity<List<WorkflowRule>> listRules() {
        return ResponseEntity.ok(ruleRepo.findByIsActiveTrueOrderByJourneyTypeAscPriorityDesc());
    }

    @GetMapping("/rules/all")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN')")
    public ResponseEntity<List<WorkflowRule>> listAllRules() {
        return ResponseEntity.ok(ruleRepo.findAll());
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
        return ResponseEntity.ok(ruleRepo.save(rule));
    }

    @DeleteMapping("/rules/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        ruleRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
