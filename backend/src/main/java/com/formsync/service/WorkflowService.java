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

    @Transactional
    public WorkflowInstance startWorkflow(FormInstance form) {
        // Evaluate rules to determine required tiers
        List<WorkflowRule> rules = ruleRepo.findByJourneyTypeAndIsActiveTrueOrderByPriorityDesc(form.getJourneyType());
        int requiredTiers = 0;
        String approvalMode = "SEQUENTIAL";
        List<String> tierRoles = new ArrayList<>();

        BigDecimal amount = form.getAmount() != null ? form.getAmount() : BigDecimal.ZERO;

        for (WorkflowRule rule : rules) {
            if (evaluateCondition(amount, rule.getConditionOp(), rule.getConditionValue())) {
                requiredTiers = rule.getRequiredTiers();
                approvalMode = rule.getApprovalMode();
                tierRoles = rule.getTierRoles() != null ? rule.getTierRoles() : List.of();
                break; // highest priority match wins
            }
        }

        String initialState = requiredTiers > 0 ? "PENDING_TIER_1" : "APPROVED";
        WorkflowInstance wf = WorkflowInstance.builder()
                .formInstanceId(form.getId())
                .currentState(initialState)
                .currentTier(requiredTiers > 0 ? 1 : 0)
                .requiredTiers(requiredTiers)
                .approvalMode(approvalMode)
                .slaDeadline(LocalDateTime.now().plusMinutes(30))
                .escalated(false)
                .build();
        wf = workflowRepo.save(wf);

        // Update form status
        form.setStatus(initialState.equals("APPROVED") ? "APPROVED" : "PENDING_APPROVAL");
        form.setSubmittedAt(LocalDateTime.now());
        formRepo.save(form);

        log.info("Workflow started for form {}: {} tiers required, state={}", form.getReferenceNumber(), requiredTiers, initialState);

        // If auto-approved (no tiers), proceed to CBS/DMS
        if (requiredTiers == 0) {
            processApproved(form, wf);
        }

        return wf;
    }

    @Transactional
    public WorkflowInstance processApproval(Long formInstanceId, ApprovalRequest request, User actor) {
        FormInstance form = formRepo.findById(formInstanceId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found: " + formInstanceId));
        WorkflowInstance wf = workflowRepo.findByFormInstanceId(formInstanceId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow not found for form: " + formInstanceId));

        // Record approval action
        ApprovalAction action = ApprovalAction.builder()
                .workflowId(wf.getId()).formInstanceId(formInstanceId)
                .tier(wf.getCurrentTier()).action(request.getAction())
                .actorId(actor.getUsername()).actorName(actor.getFullName())
                .actorRole(actor.getRole()).comments(request.getComments())
                .build();

        // Save signature if provided
        if (request.getSignature() != null) {
            DigitalSignature sig = saveSignature(formInstanceId, "APPROVER", actor.getUsername(), request.getSignature(), form.getFormData());
            action.setSignatureId(sig.getId());
        }
        approvalRepo.save(action);

        switch (request.getAction().toUpperCase()) {
            case "APPROVE" -> handleApprove(form, wf, actor);
            case "REJECT" -> handleReject(form, wf, actor, request.getComments());
            case "RETURN" -> handleReturn(form, wf, actor, request.getComments());
            default -> throw new IllegalArgumentException("Invalid action: " + request.getAction());
        }

        auditService.log("WORKFLOW", wf.getId().toString(), request.getAction(), actor,
                Map.of("formRef", form.getReferenceNumber(), "tier", wf.getCurrentTier()));
        return wf;
    }

    private void handleApprove(FormInstance form, WorkflowInstance wf, User actor) {
        if (wf.getCurrentTier() >= wf.getRequiredTiers()) {
            // All tiers approved
            wf.setCurrentState("APPROVED");
            form.setStatus("APPROVED");
            workflowRepo.save(wf);
            formRepo.save(form);
            processApproved(form, wf);
        } else {
            // Move to next tier
            wf.setCurrentTier(wf.getCurrentTier() + 1);
            wf.setCurrentState("PENDING_TIER_" + wf.getCurrentTier());
            wf.setSlaDeadline(LocalDateTime.now().plusMinutes(30));
            workflowRepo.save(wf);
        }
    }

    private void handleReject(FormInstance form, WorkflowInstance wf, User actor, String reason) {
        wf.setCurrentState("REJECTED");
        form.setStatus("REJECTED");
        workflowRepo.save(wf);
        formRepo.save(form);
    }

    private void handleReturn(FormInstance form, WorkflowInstance wf, User actor, String reason) {
        wf.setCurrentState("RETURNED");
        form.setStatus("RETURNED");
        workflowRepo.save(wf);
        formRepo.save(form);
    }

    private void processApproved(FormInstance form, WorkflowInstance wf) {
        try {
            // Submit to CBS
            wf.setCurrentState("SUBMITTING_CBS");
            workflowRepo.save(wf);
            form.setStatus("SUBMITTING_CBS");
            formRepo.save(form);

            Map<String, Object> cbsResult = cbsConnector.submitTransaction(form.getJourneyType(), form.getFormData(), null);
            form.setCbsReference((String) cbsResult.get("cbsReference"));
            form.setCbsResponse(cbsResult);

            // Archive to DMS
            wf.setCurrentState("ARCHIVING_DMS");
            workflowRepo.save(wf);
            form.setStatus("ARCHIVING_DMS");
            formRepo.save(form);

            Map<String, Object> dmsResult = dmsConnector.archiveDocument(form.getId(), form.getJourneyType(), form.getFormData(),
                    Map.of("referenceNumber", form.getReferenceNumber(), "cbsReference", form.getCbsReference()));
            form.setDmsReference((String) dmsResult.get("dmsReference"));

            // Complete
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
