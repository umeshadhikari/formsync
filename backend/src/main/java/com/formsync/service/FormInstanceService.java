package com.formsync.service;

import com.formsync.dto.FormSubmitRequest;
import com.formsync.model.*;
import com.formsync.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class FormInstanceService {
    private final FormInstanceRepository repo;
    private final FormTemplateRepository templateRepo;
    private final WorkflowService workflowService;
    private final AuditService auditService;

    public FormInstance getById(Long id) {
        return repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Form not found: " + id));
    }

    public FormInstance getByReference(String ref) {
        return repo.findByReferenceNumber(ref).orElseThrow(() -> new IllegalArgumentException("Form not found: " + ref));
    }

    public Page<FormInstance> listByUser(String username, Pageable pageable) {
        return repo.findByCreatedByOrderByCreatedAtDesc(username, pageable);
    }

    public Page<FormInstance> listByBranch(String branchCode, String status, Pageable pageable) {
        if (status != null) return repo.findByBranchCodeAndStatusOrderByCreatedAtDesc(branchCode, status, pageable);
        return repo.findByBranchCodeOrderByCreatedAtDesc(branchCode, pageable);
    }

    public Page<FormInstance> listByStatus(String status, Pageable pageable) {
        return repo.findByStatusOrderByCreatedAtDesc(status, pageable);
    }

    @Transactional
    public FormInstance submit(FormSubmitRequest req, User actor) {
        FormTemplate template = templateRepo.findById(req.getTemplateId())
                .orElseThrow(() -> new IllegalArgumentException("Template not found: " + req.getTemplateId()));

        String refNumber = generateReferenceNumber(req.getJourneyType());
        BigDecimal amount = extractAmount(req.getFormData());

        FormInstance form = FormInstance.builder()
                .referenceNumber(refNumber)
                .templateId(template.getId())
                .templateVersion(template.getVersion())
                .journeyType(req.getJourneyType())
                .formData(req.getFormData())
                .status("DRAFT")
                .branchCode(req.getBranchCode() != null ? req.getBranchCode() : actor.getBranchCode())
                .customerId(req.getCustomerId())
                .customerName(req.getCustomerName())
                .amount(amount)
                .currency(req.getFormData().containsKey("currency") ? req.getFormData().get("currency").toString() : "KES")
                .createdBy(actor.getUsername())
                .build();
        form = repo.save(form);

        // Save signatures
        if (req.getCustomerSignature() != null) {
            workflowService.saveSignature(form.getId(), "CUSTOMER", req.getCustomerName() != null ? req.getCustomerName() : "Customer", req.getCustomerSignature(), form.getFormData());
        }
        if (req.getTellerSignature() != null) {
            workflowService.saveSignature(form.getId(), "TELLER", actor.getUsername(), req.getTellerSignature(), form.getFormData());
        }

        // Start workflow
        workflowService.startWorkflow(form);

        auditService.log("FORM_INSTANCE", form.getId().toString(), "SUBMITTED", actor,
                Map.of("referenceNumber", refNumber, "journeyType", req.getJourneyType(), "amount", amount.toString()));

        return repo.findById(form.getId()).orElse(form);
    }

    @Transactional
    public FormInstance saveDraft(FormSubmitRequest req, User actor) {
        FormTemplate template = templateRepo.findById(req.getTemplateId())
                .orElseThrow(() -> new IllegalArgumentException("Template not found"));
        String refNumber = generateReferenceNumber(req.getJourneyType());
        FormInstance form = FormInstance.builder()
                .referenceNumber(refNumber).templateId(template.getId()).templateVersion(template.getVersion())
                .journeyType(req.getJourneyType()).formData(req.getFormData()).status("DRAFT")
                .branchCode(req.getBranchCode() != null ? req.getBranchCode() : actor.getBranchCode())
                .customerId(req.getCustomerId()).customerName(req.getCustomerName())
                .amount(extractAmount(req.getFormData()))
                .currency(req.getFormData().containsKey("currency") ? req.getFormData().get("currency").toString() : "KES")
                .createdBy(actor.getUsername()).build();
        return repo.save(form);
    }

    @Transactional
    public FormInstance updateDraft(Long id, FormSubmitRequest req, User actor) {
        FormInstance form = getById(id);
        if (!"DRAFT".equals(form.getStatus())) {
            throw new IllegalStateException("Only DRAFT forms can be updated. Current status: " + form.getStatus());
        }
        if (!form.getCreatedBy().equals(actor.getUsername())) {
            throw new SecurityException("You can only update your own drafts");
        }
        form.setFormData(req.getFormData());
        form.setCustomerId(req.getCustomerId());
        form.setCustomerName(req.getCustomerName());
        form.setAmount(extractAmount(req.getFormData()));
        form.setCurrency(req.getFormData().containsKey("currency") ? req.getFormData().get("currency").toString() : "KES");
        form.setUpdatedAt(LocalDateTime.now());

        auditService.log("FORM_INSTANCE", form.getId().toString(), "DRAFT_UPDATED", actor,
                Map.of("referenceNumber", form.getReferenceNumber()));

        return repo.save(form);
    }

    private String generateReferenceNumber(String journeyType) {
        String prefix = switch (journeyType) {
            case "CASH_DEPOSIT" -> "CD";
            case "CASH_WITHDRAWAL" -> "CW";
            case "FUNDS_TRANSFER" -> "FT";
            case "DEMAND_DRAFT" -> "DD";
            case "ACCOUNT_SERVICING" -> "AS";
            case "FIXED_DEPOSIT" -> "FD";
            case "LOAN_DISBURSEMENT" -> "LD";
            case "CHEQUE_BOOK_REQUEST" -> "CB";
            case "ACCOUNT_OPENING" -> "AO";
            case "INSTRUMENT_CLEARING" -> "IC";
            default -> "FS";
        };
        return prefix + "-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    private BigDecimal extractAmount(Map<String, Object> formData) {
        Object amt = formData.get("amount");
        if (amt == null) amt = formData.get("depositAmount");
        if (amt == null) amt = formData.get("withdrawalAmount");
        if (amt == null) amt = formData.get("transferAmount");
        if (amt == null) amt = formData.get("principalAmount");
        if (amt == null) amt = formData.get("disbursementAmount");
        if (amt == null) return BigDecimal.ZERO;
        try { return new BigDecimal(amt.toString()); } catch (Exception e) { return BigDecimal.ZERO; }
    }
}
