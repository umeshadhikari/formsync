package com.formsync.service;

import com.formsync.model.AuditLog;
import com.formsync.model.User;
import com.formsync.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service @RequiredArgsConstructor
public class AuditService {
    private final AuditLogRepository repo;

    @Async
    public void log(String entityType, String entityId, String action, User actor, Map<String, Object> details) {
        repo.save(AuditLog.builder()
                .entityType(entityType).entityId(entityId).action(action)
                .actorId(actor != null ? actor.getUsername() : "SYSTEM")
                .actorName(actor != null ? actor.getFullName() : "System")
                .actorRole(actor != null ? actor.getRole() : null)
                .branchCode(actor != null ? actor.getBranchCode() : null)
                .details(details).build());
    }

    public Page<AuditLog> search(String entityType, String entityId, String actorId, String branchCode, Pageable pageable) {
        if (entityType != null && entityId != null) return repo.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId, pageable);
        if (actorId != null) return repo.findByActorIdOrderByCreatedAtDesc(actorId, pageable);
        if (branchCode != null) return repo.findByBranchCodeOrderByCreatedAtDesc(branchCode, pageable);
        if (entityType != null) return repo.findByEntityTypeOrderByCreatedAtDesc(entityType, pageable);
        return repo.findAllByOrderByCreatedAtDesc(pageable);
    }
}
