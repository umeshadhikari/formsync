package com.formsync.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service @Slf4j
@ConditionalOnProperty(name = "formsync.dms.mode", havingValue = "stub", matchIfMissing = true)
public class DmsStubService implements DmsConnector {
    @Override
    public Map<String, Object> archiveDocument(Long formInstanceId, String journeyType, Map<String, Object> formData, Map<String, Object> metadata) {
        String dmsRef = "DMS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("[DMS STUB] Archiving document for form {}: {}", formInstanceId, dmsRef);
        return Map.of(
            "success", true,
            "dmsReference", dmsRef,
            "documentId", "DOC" + System.currentTimeMillis(),
            "archivedAt", LocalDateTime.now().toString(),
            "format", "PDF",
            "message", "Document archived successfully (STUB)"
        );
    }
}
