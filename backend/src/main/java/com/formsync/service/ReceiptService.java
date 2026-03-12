package com.formsync.service;

import com.formsync.model.FormInstance;
import com.formsync.repository.FormInstanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReceiptService {
    private final FormInstanceRepository formRepo;
    private final AuditService auditService;

    public Map<String, Object> generateReceipt(Long formInstanceId) {
        FormInstance form = formRepo.findById(formInstanceId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found"));

        Map<String, Object> receipt = new LinkedHashMap<>();
        receipt.put("receiptType", "TRANSACTION_ACKNOWLEDGEMENT");
        receipt.put("referenceNumber", form.getReferenceNumber());
        receipt.put("journeyType", form.getJourneyType());
        receipt.put("status", form.getStatus());
        receipt.put("branchCode", form.getBranchCode());
        receipt.put("cbsReference", form.getCbsReference());
        receipt.put("dmsReference", form.getDmsReference());

        // Extract key fields from form data
        Map<String, Object> formData = form.getFormData();
        if (formData != null) {
            receipt.put("accountNumber", maskAccountNumber(getStr(formData, "accountNumber")));
            receipt.put("accountName", getStr(formData, "accountName"));
            receipt.put("amount", formData.get("amount"));
            receipt.put("currency", getStr(formData, "currency"));
            receipt.put("narration", getStr(formData, "narration"));
        }

        receipt.put("createdBy", form.getCreatedBy());
        receipt.put("submittedAt", form.getSubmittedAt() != null ?
            form.getSubmittedAt().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm:ss")) : null);
        receipt.put("completedAt", form.getCompletedAt() != null ?
            form.getCompletedAt().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm:ss")) : null);
        receipt.put("generatedAt", java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm:ss")));

        receipt.put("disclaimer", "This is a system-generated acknowledgement. For any queries, please contact your branch.");

        log.info("Receipt generated for form {}", form.getReferenceNumber());
        return receipt;
    }

    private String maskAccountNumber(String acctNum) {
        if (acctNum == null || acctNum.length() < 4) return acctNum;
        return "****" + acctNum.substring(acctNum.length() - 4);
    }

    private String getStr(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v != null ? v.toString() : null;
    }
}
