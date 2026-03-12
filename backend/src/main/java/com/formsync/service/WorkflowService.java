package com.formsync.service;

import com.formsync.dto.ApprovalRequest;
import com.formsync.model.*;
import com.formsync.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j
public class WorkflowService {
    private final WorkflowInstanceRepository workflowRepo;
    private final FormInstanceRepository formRepo;
    private final ApprovalActionRepository approvalRepo;
    private final WorkflowRuleRepository ruleRepo;
    private final DigitalSignatureRepository signatureRepo;
    private final CbsConnector cbsConnector;
    private final DmsConnector dmsConnector;
    private final AuditService auditService;

    private static final int CLAIM_EXPIRY_MINUTES = 15;

    @Transactional
    public WorkflowInstance startWorkflow(FormInstance form) {
        List<WorkflowRule> rules = ruleRepo.findByJourneyTypeAndIsActiveTrueOrderByPriorityDesc(form.getJourneyType());
        int requiredTiers = 0;
        String approvalMode = "SEQUENTIAL";
        List<String> tierRoles = new ArrayList<>();
        Integer slaMinutes = 30;

        BigDecimal amount = form.getAmount() != null ? form.getAmount() : BigDecimal.ZERO;

        for (WorkflowRule rule : rules) {
            if (evaluateCondition(amount, rule.getConditionOp(), rule.getConditionValue())) {
                requiredTiers = rule.getRequiredTiers();
                approvalMode = rule.getApprovalMode();
                tierRoles = rule.getTierRoles() != null ? rule.getTierRoles() : List.of();
                slaMinutes = rule.getSlaMinutes() != null ? rule.getSlaMinutes() : 30;
                break;
            }
        }

        String initialState = requiredTiers > 0 ? "PENDING_TIER_1" : "APPROVED";
        WorkflowInstance wf = WorkflowInstance.builder()
                .formInstanceId(form.getId())
                .currentState(initialState)
                .currentTier(requiredTiers > 0 ? 1 : 0)
                .requiredTiers(requiredTiers)
                .approvalMode(approvalMode)
                .slaDeadline(LocalDateTime.now().plusMinutes(slaMinutes))
                .escalated(false)
                .resubmissionCount(form.getResubmissionCount() != null ? form.getResubmissionCount() : 0)
                .originalWorkflowId(form.getOriginalFormId() != null ? findOriginalWorkflowId(form.getOriginalFormId()) : null)
                .build();
        wf = workflowRepo.save(wf);

        form.setStatus(initialState.equals("APPROVED") ? "APPROVED" : "PENDING_APPROVAL");
        form.setSubmittedAt(LocalDateTime.now());
        formRepo.save(form);

        log.info("Workflow started for form {}: {} tiers required, state={}, resubmission={}",
            form.getReferenceNumber(), requiredTiers, initialState, wf.getResubmissionCount());

        if (requiredTiers == 0) {
            processApproved(form, wf);
        }

        return wf;
    }

    private Long findOriginalWorkflowId(Long originalFormId) {
        return workflowRepo.findByFormInstanceId(originalFormId)
            .map(WorkflowInstance::getId)
            .orElse(null);
    }

    @Transactional
    public WorkflowInstance processApproval(Long formInstanceId, ApprovalRequest request, User actor) {
        FormInstance form = formRepo.findById(formInstanceId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found: " + formInstanceId));
        WorkflowInstance wf = workflowRepo.findByFormInstanceId(formInstanceId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found for form: " + formInstanceId));

        validateTierRole(form, wf, actor);

        if (wf.getClaimedBy() != null && !isClaimExpired(wf) && !wf.getClaimedBy().equals(actor.getUsername())) {
            throw new IllegalStateException("Form is currently claimed by " + wf.getClaimedByName() + ". Release or wait for expiry.");
        }

        // Validate rejection/return requirements based on workflow rule
        WorkflowRule matchedRule = findMatchingRuleForForm(form);
        if ("REJECT".equalsIgnoreCase(request.getAction())) {
            validateRejection(request, matchedRule);
        } else if ("RETURN".equalsIgnoreCase(request.getAction())) {
            validateReturn(request, matchedRule);
        }

        ApprovalAction action = ApprovalAction.builder()
                .workflowId(wf.getId()).formInstanceId(formInstanceId)
                .tier(wf.getCurrentTier()).action(request.getAction())
                .actorId(actor.getUsername()).actorName(actor.getFullName())
                .actorRole(actor.getRole()).comments(request.getComments())
                .rejectionReason(request.getRejectionReason())
                .build();

        if (request.getSignature() != null) {
            DigitalSignature sig = saveSignature(formInstanceId, "APPROVER", actor.getUsername(), request.getSignature(), form.getFormData());
            action.setSignatureId(sig.getId());
        }
        approvalRepo.save(action);

        wf.setClaimedBy(null);
        wf.setClaimedByName(null);
        wf.setClaimedAt(null);

        switch (request.getAction().toUpperCase()) {
            case "APPROVE" -> handleApprove(form, wf, actor);
            case "REJECT" -> handleReject(form, wf, actor, request.getComments(), request.getRejectionReason(), matchedRule);
            case "RETURN" -> handleReturn(form, wf, actor, request.getComments(), request.getReturnInstructions(), matchedRule);
            default -> throw new IllegalArgumentException("Invalid action: " + request.getAction());
        }

        auditService.log("WORKFLOW", wf.getId().toString(), request.getAction(), actor,
                Map.of("formRef", form.getReferenceNumber(), "tier", wf.getCurrentTier(),
                       "rejectionReason", request.getRejectionReason() != null ? request.getRejectionReason() : "",
                       "resubmissionCount", wf.getResubmissionCount() != null ? wf.getResubmissionCount() : 0));
        return wf;
    }

    private void validateRejection(ApprovalRequest request, WorkflowRule rule) {
        if (rule != null && Boolean.TRUE.equals(rule.getRequireRejectionReason())) {
            boolean hasReason = (request.getRejectionReason() != null && !request.getRejectionReason().isBlank())
                             || (request.getComments() != null && !request.getComments().isBlank());
            if (!hasReason) {
                throw new IllegalStateException("A rejection reason is required for this journey type.");
            }
        }
    }

    private void validateReturn(ApprovalRequest request, WorkflowRule rule) {
        if (rule != null && Boolean.TRUE.equals(rule.getRequireReturnInstructions())) {
            boolean hasInstructions = (request.getReturnInstructions() != null && !request.getReturnInstructions().isBlank())
                                   || (request.getComments() != null && !request.getComments().isBlank());
            if (!hasInstructions) {
                throw new IllegalStateException("Correction instructions are required when returning a form.");
            }
        }
    }

    private WorkflowRule findMatchingRuleForForm(FormInstance form) {
        List<WorkflowRule> rules = ruleRepo.findByJourneyTypeAndIsActiveTrueOrderByPriorityDesc(form.getJourneyType());
        BigDecimal amount = form.getAmount() != null ? form.getAmount() : BigDecimal.ZERO;
        for (WorkflowRule rule : rules) {
            if (evaluateCondition(amount, rule.getConditionOp(), rule.getConditionValue())) {
                return rule;
            }
        }
        return null;
    }

    private void validateTierRole(FormInstance form, WorkflowInstance wf, User actor) {
        if ("SYSTEM_ADMIN".equals(actor.getRole())) return;
        List<String> tierRoles = getTierRolesForWorkflow(form, wf);
        if (tierRoles != null && !tierRoles.isEmpty()) {
            int tierIndex = wf.getCurrentTier() - 1;
            if (tierIndex >= 0 && tierIndex < tierRoles.size()) {
                String requiredRole = tierRoles.get(tierIndex);
                if (!requiredRole.equals(actor.getRole())) {
                    throw new IllegalStateException(
                        "Your role (" + actor.getRole() + ") is not authorized for Tier " + wf.getCurrentTier() +
                        ". Required: " + requiredRole);
                }
            }
        }
    }

    private List<String> getTierRolesForWorkflow(FormInstance form, WorkflowInstance wf) {
        List<WorkflowRule> rules = ruleRepo.findByIsActiveTrueOrderByJourneyTypeAscPriorityDesc();
        return rules.stream()
            .filter(r -> r.getJourneyType().equals(form.getJourneyType()))
            .filter(r -> Objects.equals(r.getRequiredTiers(), wf.getRequiredTiers()))
            .findFirst()
            .map(WorkflowRule::getTierRoles)
            .orElse(null);
    }

    public void bulkApprove(List<Long> formInstanceIds, ApprovalRequest request, User actor) {
        for (Long formInstanceId : formInstanceIds) {
            try {
                processApproval(formInstanceId, request, actor);
            } catch (Exception e) {
                log.warn("Failed to approve form {}: {}", formInstanceId, e.getMessage());
            }
        }
    }

    // ── Resubmission ──

    @Transactional
    public WorkflowInstance resubmitForm(Long formInstanceId, Map<String, Object> updatedFormData, User actor) {
        FormInstance form = formRepo.findById(formInstanceId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found: " + formInstanceId));

        if (!"REJECTED".equals(form.getStatus()) && !"RETURNED".equals(form.getStatus())) {
            throw new IllegalStateException("Form can only be resubmitted when REJECTED or RETURNED. Current: " + form.getStatus());
        }

        if (!form.getCreatedBy().equals(actor.getUsername())) {
            throw new IllegalStateException("Only the original creator can resubmit this form.");
        }

        WorkflowRule matchedRule = findMatchingRuleForForm(form);

        if ("REJECTED".equals(form.getStatus())) {
            if (matchedRule != null && "PERMANENT".equals(matchedRule.getRejectionPolicy())) {
                throw new IllegalStateException("This form has been permanently rejected and cannot be resubmitted.");
            }
        }

        int currentCount = form.getResubmissionCount() != null ? form.getResubmissionCount() : 0;
        int maxResubmissions = matchedRule != null && matchedRule.getMaxResubmissions() != null
            ? matchedRule.getMaxResubmissions() : 3;

        if (maxResubmissions > 0 && currentCount >= maxResubmissions) {
            throw new IllegalStateException("Maximum resubmission limit (" + maxResubmissions + ") reached.");
        }

        if (updatedFormData != null && !updatedFormData.isEmpty()) {
            form.setFormData(updatedFormData);
        }

        form.setStatus("PENDING_APPROVAL");
        form.setResubmissionCount(currentCount + 1);
        if (form.getOriginalFormId() == null) {
            form.setOriginalFormId(form.getId());
        }
        form.setLastRejectionReason(null);
        form.setLastReturnInstructions(null);
        form.setSubmittedAt(LocalDateTime.now());
        formRepo.save(form);

        WorkflowInstance newWf = startWorkflow(form);

        log.info("Form {} resubmitted (attempt {}). New workflow state: {}",
            form.getReferenceNumber(), form.getResubmissionCount(), newWf.getCurrentState());

        auditService.log("WORKFLOW", newWf.getId().toString(), "RESUBMIT", actor,
                Map.of("formRef", form.getReferenceNumber(), "resubmissionCount", form.getResubmissionCount()));

        return newWf;
    }

    public Map<String, Object> getResubmissionInfo(Long formInstanceId) {
        FormInstance form = formRepo.findById(formInstanceId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found: " + formInstanceId));

        WorkflowRule matchedRule = findMatchingRuleForForm(form);

        Map<String, Object> info = new HashMap<>();
        info.put("formId", form.getId());
        info.put("status", form.getStatus());
        info.put("resubmissionCount", form.getResubmissionCount() != null ? form.getResubmissionCount() : 0);
        info.put("lastRejectionReason", form.getLastRejectionReason());
        info.put("lastReturnInstructions", form.getLastReturnInstructions());

        boolean canResubmit = false;
        String reason = "";

        if ("REJECTED".equals(form.getStatus())) {
            if (matchedRule != null && "PERMANENT".equals(matchedRule.getRejectionPolicy())) {
                reason = "Permanently rejected — cannot be resubmitted";
            } else if (matchedRule != null && "ALLOW_RESUBMIT".equals(matchedRule.getRejectionPolicy())) {
                int maxResub = matchedRule.getMaxResubmissions() != null ? matchedRule.getMaxResubmissions() : 3;
                int current = form.getResubmissionCount() != null ? form.getResubmissionCount() : 0;
                if (maxResub > 0 && current >= maxResub) {
                    reason = "Maximum resubmission limit (" + maxResub + ") reached";
                } else {
                    canResubmit = true;
                    reason = "Can be corrected and resubmitted (" + (maxResub - current) + " attempts remaining)";
                }
            } else {
                reason = "Permanently rejected";
            }
        } else if ("RETURNED".equals(form.getStatus())) {
            int maxResub = matchedRule != null && matchedRule.getMaxResubmissions() != null ? matchedRule.getMaxResubmissions() : 3;
            int current = form.getResubmissionCount() != null ? form.getResubmissionCount() : 0;
            if (maxResub > 0 && current >= maxResub) {
                reason = "Maximum resubmission limit (" + maxResub + ") reached";
            } else {
                canResubmit = true;
                reason = "Returned for corrections (" + (maxResub > 0 ? (maxResub - current) + " attempts remaining" : "unlimited") + ")";
            }
        } else {
            reason = "Form is not in a resubmittable state";
        }

        info.put("canResubmit", canResubmit);
        info.put("reason", reason);

        if (matchedRule != null) {
            info.put("rejectionPolicy", matchedRule.getRejectionPolicy());
            info.put("returnPolicy", matchedRule.getReturnPolicy());
            info.put("maxResubmissions", matchedRule.getMaxResubmissions());
        }

        return info;
    }

    public Map<String, Object> getRejectionConfig(String journeyType, BigDecimal amount) {
        List<WorkflowRule> rules = ruleRepo.findByJourneyTypeAndIsActiveTrueOrderByPriorityDesc(journeyType);
        BigDecimal amt = amount != null ? amount : BigDecimal.ZERO;

        Map<String, Object> config = new HashMap<>();
        config.put("rejectionReasons", List.of());
        config.put("requireRejectionReason", true);
        config.put("requireReturnInstructions", true);
        config.put("rejectionPolicy", "PERMANENT");
        config.put("returnPolicy", "ALLOW_RESUBMIT");

        for (WorkflowRule rule : rules) {
            if (evaluateCondition(amt, rule.getConditionOp(), rule.getConditionValue())) {
                config.put("rejectionReasons", rule.getRejectionReasons() != null ? rule.getRejectionReasons() : List.of());
                config.put("requireRejectionReason", Boolean.TRUE.equals(rule.getRequireRejectionReason()));
                config.put("requireReturnInstructions", Boolean.TRUE.equals(rule.getRequireReturnInstructions()));
                config.put("rejectionPolicy", rule.getRejectionPolicy() != null ? rule.getRejectionPolicy() : "PERMANENT");
                config.put("returnPolicy", rule.getReturnPolicy() != null ? rule.getReturnPolicy() : "ALLOW_RESUBMIT");
                config.put("maxResubmissions", rule.getMaxResubmissions() != null ? rule.getMaxResubmissions() : 3);
                break;
            }
        }
        return config;
    }

    // ── Claim / Pickup ──

    @Transactional
    public WorkflowInstance claimForm(Long formInstanceId, User actor) {
        WorkflowInstance wf = workflowRepo.findByFormInstanceId(formInstanceId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found for form: " + formInstanceId));

        if (wf.getClaimedBy() != null && !isClaimExpired(wf) && !wf.getClaimedBy().equals(actor.getUsername())) {
            throw new IllegalStateException("Form is already claimed by " + wf.getClaimedByName());
        }

        FormInstance form = formRepo.findById(formInstanceId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found: " + formInstanceId));
        validateTierRole(form, wf, actor);

        wf.setClaimedBy(actor.getUsername());
        wf.setClaimedByName(actor.getFullName());
        wf.setClaimedAt(LocalDateTime.now());
        workflowRepo.save(wf);

        log.info("Form {} claimed by {} ({})", formInstanceId, actor.getFullName(), actor.getRole());
        return wf;
    }

    @Transactional
    public WorkflowInstance releaseForm(Long formInstanceId, User actor) {
        WorkflowInstance wf = workflowRepo.findByFormInstanceId(formInstanceId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found for form: " + formInstanceId));

        if (wf.getClaimedBy() != null && !wf.getClaimedBy().equals(actor.getUsername()) && !"SYSTEM_ADMIN".equals(actor.getRole())) {
            throw new IllegalStateException("Only the claimer or an admin can release this form");
        }

        wf.setClaimedBy(null);
        wf.setClaimedByName(null);
        wf.setClaimedAt(null);
        workflowRepo.save(wf);

        log.info("Form {} released by {}", formInstanceId, actor.getFullName());
        return wf;
    }

    private boolean isClaimExpired(WorkflowInstance wf) {
        if (wf.getClaimedAt() == null) return true;
        return wf.getClaimedAt().plusMinutes(CLAIM_EXPIRY_MINUTES).isBefore(LocalDateTime.now());
    }

    // ── Role-Filtered Queue ──

    public List<WorkflowInstance> getPendingApprovalsForRole(String role) {
        List<WorkflowInstance> all = getPendingApprovals();
        if ("SYSTEM_ADMIN".equals(role)) return all;

        List<WorkflowRule> allRules = ruleRepo.findByIsActiveTrueOrderByJourneyTypeAscPriorityDesc();

        return all.stream().filter(wf -> {
            FormInstance form = formRepo.findById(wf.getFormInstanceId()).orElse(null);
            if (form == null) return false;

            Optional<WorkflowRule> matchedRule = allRules.stream()
                .filter(r -> r.getJourneyType().equals(form.getJourneyType()))
                .filter(r -> Objects.equals(r.getRequiredTiers(), wf.getRequiredTiers()))
                .findFirst();

            if (matchedRule.isPresent() && matchedRule.get().getTierRoles() != null) {
                List<String> tierRoles = matchedRule.get().getTierRoles();
                int tierIndex = wf.getCurrentTier() - 1;
                if (tierIndex >= 0 && tierIndex < tierRoles.size()) {
                    return tierRoles.get(tierIndex).equals(role);
                }
            }
            return true;
        }).collect(Collectors.toList());
    }

    // ── My Items ──

    public List<Map<String, Object>> getMyItems(String username) {
        List<FormInstance> createdForms = formRepo.findByCreatedByOrderByCreatedAtDesc(username);
        List<ApprovalAction> actions = approvalRepo.findByActorIdOrderByCreatedAtDesc(username);
        Set<Long> actionedFormIds = actions.stream().map(ApprovalAction::getFormInstanceId).collect(Collectors.toSet());

        Set<Long> createdFormIds = createdForms.stream().map(FormInstance::getId).collect(Collectors.toSet());
        List<Long> additionalIds = actionedFormIds.stream().filter(id -> !createdFormIds.contains(id)).collect(Collectors.toList());
        List<FormInstance> actionedForms = additionalIds.isEmpty() ? List.of() : formRepo.findByIdIn(additionalIds);

        Map<Long, FormInstance> allFormsMap = new LinkedHashMap<>();
        createdForms.forEach(f -> allFormsMap.put(f.getId(), f));
        actionedForms.forEach(f -> allFormsMap.put(f.getId(), f));

        Map<Long, ApprovalAction> latestActionByForm = new LinkedHashMap<>();
        for (ApprovalAction a : actions) { latestActionByForm.putIfAbsent(a.getFormInstanceId(), a); }

        List<Map<String, Object>> result = new ArrayList<>();
        for (FormInstance form : allFormsMap.values()) {
            Map<String, Object> item = new HashMap<>();
            item.put("form", form);

            boolean isCreator = username.equals(form.getCreatedBy());
            ApprovalAction userAction = latestActionByForm.get(form.getId());
            String relationship;
            if (isCreator && userAction != null) {
                relationship = "Created & " + userAction.getAction().toLowerCase() + "d";
            } else if (isCreator) {
                relationship = "Created";
            } else if (userAction != null) {
                relationship = userAction.getAction().substring(0, 1) + userAction.getAction().substring(1).toLowerCase() + "d";
            } else {
                relationship = "Involved";
            }
            item.put("relationship", relationship);
            item.put("userAction", userAction);

            workflowRepo.findByFormInstanceId(form.getId())
                    .ifPresent(wf -> {
                        Map<String, Object> wfMap = new HashMap<>();
                        wfMap.put("currentState", wf.getCurrentState());
                        wfMap.put("currentTier", wf.getCurrentTier());
                        wfMap.put("requiredTiers", wf.getRequiredTiers());
                        wfMap.put("resubmissionCount", wf.getResubmissionCount());
                        wfMap.put("rejectionReason", wf.getRejectionReason());
                        wfMap.put("returnInstructions", wf.getReturnInstructions());
                        item.put("workflow", wfMap);
                    });

            // Include resubmission info for rejected/returned forms created by this user
            if (isCreator && ("REJECTED".equals(form.getStatus()) || "RETURNED".equals(form.getStatus()))) {
                try { item.put("resubmissionInfo", getResubmissionInfo(form.getId())); } catch (Exception e) { /* ignore */ }
            }

            result.add(item);
        }

        result.sort((a, b) -> {
            LocalDateTime dateA = getLatestDate(a);
            LocalDateTime dateB = getLatestDate(b);
            return dateB.compareTo(dateA);
        });

        return result;
    }

    private LocalDateTime getLatestDate(Map<String, Object> item) {
        FormInstance form = (FormInstance) item.get("form");
        ApprovalAction action = (ApprovalAction) item.get("userAction");
        LocalDateTime formDate = form.getSubmittedAt() != null ? form.getSubmittedAt() : form.getCreatedAt();
        if (action != null && action.getCreatedAt() != null && action.getCreatedAt().isAfter(formDate)) {
            return action.getCreatedAt();
        }
        return formDate;
    }

    @Transactional
    public int escalateOverdue() {
        LocalDateTime now = LocalDateTime.now();
        List<WorkflowInstance> overdue = workflowRepo.findByCurrentStateStartingWithAndSlaDeadlineBeforeAndEscalatedFalse(now);

        int escalatedCount = 0;
        for (WorkflowInstance wf : overdue) {
            FormInstance form = formRepo.findById(wf.getFormInstanceId()).orElse(null);
            if (form == null) continue;

            List<WorkflowRule> rules = ruleRepo.findByJourneyTypeAndIsActiveTrueOrderByPriorityDesc(form.getJourneyType());
            WorkflowRule matchedRule = null;
            BigDecimal amount = form.getAmount() != null ? form.getAmount() : BigDecimal.ZERO;

            for (WorkflowRule rule : rules) {
                if (evaluateCondition(amount, rule.getConditionOp(), rule.getConditionValue())) {
                    matchedRule = rule;
                    break;
                }
            }

            if (matchedRule != null && matchedRule.getEscalationTier() != null) {
                Integer escalationTier = matchedRule.getEscalationTier();
                if (wf.getCurrentTier() < escalationTier) {
                    wf.setCurrentTier(escalationTier);
                    wf.setCurrentState("PENDING_TIER_" + escalationTier);
                    wf.setEscalated(true);
                    wf.setClaimedBy(null);
                    wf.setClaimedByName(null);
                    wf.setClaimedAt(null);
                    workflowRepo.save(wf);
                    log.info("Escalated workflow {} to tier {} due to SLA breach", wf.getId(), escalationTier);
                    escalatedCount++;
                }
            }
        }
        return escalatedCount;
    }

    private void handleApprove(FormInstance form, WorkflowInstance wf, User actor) {
        if (wf.getCurrentTier() >= wf.getRequiredTiers()) {
            wf.setCurrentState("APPROVED");
            form.setStatus("APPROVED");
            workflowRepo.save(wf);
            formRepo.save(form);
            processApproved(form, wf);
        } else {
            wf.setCurrentTier(wf.getCurrentTier() + 1);
            wf.setCurrentState("PENDING_TIER_" + wf.getCurrentTier());
            wf.setSlaDeadline(LocalDateTime.now().plusMinutes(30));
            workflowRepo.save(wf);
        }
    }

    private void handleReject(FormInstance form, WorkflowInstance wf, User actor, String reason,
                              String rejectionReason, WorkflowRule matchedRule) {
        wf.setCurrentState("REJECTED");
        wf.setRejectionReason(rejectionReason != null ? rejectionReason : reason);
        workflowRepo.save(wf);

        form.setStatus("REJECTED");
        form.setLastRejectionReason(rejectionReason != null ? rejectionReason : reason);
        formRepo.save(form);

        log.info("Form {} rejected. Reason: {}. Policy: {}",
            form.getReferenceNumber(),
            rejectionReason != null ? rejectionReason : reason,
            matchedRule != null ? matchedRule.getRejectionPolicy() : "DEFAULT");
    }

    private void handleReturn(FormInstance form, WorkflowInstance wf, User actor, String reason,
                              String returnInstructions, WorkflowRule matchedRule) {
        wf.setCurrentState("RETURNED");
        wf.setReturnInstructions(returnInstructions != null ? returnInstructions : reason);
        workflowRepo.save(wf);

        form.setStatus("RETURNED");
        form.setLastReturnInstructions(returnInstructions != null ? returnInstructions : reason);
        formRepo.save(form);

        log.info("Form {} returned to maker. Instructions: {}",
            form.getReferenceNumber(),
            returnInstructions != null ? returnInstructions : reason);
    }

    private void processApproved(FormInstance form, WorkflowInstance wf) {
        try {
            wf.setCurrentState("SUBMITTING_CBS");
            workflowRepo.save(wf);
            form.setStatus("SUBMITTING_CBS");
            formRepo.save(form);

            Map<String, Object> cbsResult = cbsConnector.submitTransaction(form.getJourneyType(), form.getFormData(), null);
            form.setCbsReference((String) cbsResult.get("cbsReference"));
            form.setCbsResponse(cbsResult);

            wf.setCurrentState("ARCHIVING_DMS");
            workflowRepo.save(wf);
            form.setStatus("ARCHIVING_DMS");
            formRepo.save(form);

            Map<String, Object> dmsResult = dmsConnector.archiveDocument(form.getId(), form.getJourneyType(), form.getFormData(),
                    Map.of("referenceNumber", form.getReferenceNumber(), "cbsReference", form.getCbsReference()));
            form.setDmsReference((String) dmsResult.get("dmsReference"));

            wf.setCurrentState("COMPLETED");
            form.setStatus("COMPLETED");
            form.setCompletedAt(LocalDateTime.now());
            workflowRepo.save(wf);
            formRepo.save(form);

            log.info("Form {} completed. CBS={}, DMS={}", form.getReferenceNumber(), form.getCbsReference(), form.getDmsReference());
        } catch (Exception e) {
            log.error("Error processing approved form {}", form.getReferenceNumber(), e);
            wf.setCurrentState("FAILED");
            form.setStatus("FAILED");
            workflowRepo.save(wf);
            formRepo.save(form);
        }
    }

    public DigitalSignature saveSignature(Long formInstanceId, String signerType, String signerIdentity,
                                          com.formsync.dto.FormSubmitRequest.SignatureData sigData, Map<String, Object> formData) {
        String dataHash = Integer.toHexString(Objects.hashCode(formData));
        return signatureRepo.save(DigitalSignature.builder()
                .formInstanceId(formInstanceId).signerType(signerType).signerIdentity(signerIdentity)
                .signatureSvg(sigData.getSvgData()).signaturePng(sigData.getPngData())
                .dataHash(dataHash).deviceInfo(sigData.getDeviceInfo()).build());
    }

    public List<ApprovalAction> getApprovalHistory(Long formInstanceId) {
        return approvalRepo.findByFormInstanceIdOrderByCreatedAtAsc(formInstanceId);
    }

    public List<WorkflowInstance> getPendingApprovals() {
        return workflowRepo.findByCurrentStateIn(List.of("PENDING_TIER_1", "PENDING_TIER_2", "PENDING_TIER_3"));
    }

    private boolean evaluateCondition(BigDecimal amount, String op, String value) {
        try {
            BigDecimal threshold = new BigDecimal(value);
            return switch (op.toUpperCase()) {
                case "GT" -> amount.compareTo(threshold) > 0;
                case "GTE" -> amount.compareTo(threshold) >= 0;
                case "LT" -> amount.compareTo(threshold) < 0;
                case "LTE" -> amount.compareTo(threshold) <= 0;
                case "EQ" -> amount.compareTo(threshold) == 0;
                default -> false;
            };
        } catch (NumberFormatException e) { return false; }
    }
}
