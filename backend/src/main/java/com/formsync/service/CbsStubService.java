package com.formsync.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service @Slf4j
@ConditionalOnProperty(name = "formsync.cbs.mode", havingValue = "stub", matchIfMissing = true)
public class CbsStubService implements CbsConnector {
    @Override
    public Map<String, Object> submitTransaction(String journeyType, Map<String, Object> formData, Map<String, Object> cbsMapping) {
        log.info("[CBS STUB] Submitting {} transaction: {}", journeyType, formData.get("referenceNumber"));
        String cbsRef = "T24-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return Map.of(
            "success", true,
            "cbsReference", cbsRef,
            "transactionId", "TXN" + System.currentTimeMillis(),
            "processedAt", LocalDateTime.now().toString(),
            "message", "Transaction processed successfully (STUB)"
        );
    }

    @Override
    public Map<String, Object> validateAccount(String accountNumber) {
        log.info("[CBS STUB] Validating account: {}", accountNumber);
        return Map.of(
            "valid", true,
            "accountNumber", accountNumber,
            "accountName", "Demo Account Holder",
            "currency", "KES",
            "status", "ACTIVE",
            "branch", "NRB001"
        );
    }
}
