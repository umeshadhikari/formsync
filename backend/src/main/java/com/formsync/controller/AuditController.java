package com.formsync.controller;

import com.formsync.model.AuditLog;
import com.formsync.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/audit") @RequiredArgsConstructor
public class AuditController {
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('AUDITOR','SYSTEM_ADMIN','OPS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<Page<AuditLog>> search(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) String actorId,
            @RequestParam(required = false) String branchCode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(auditService.search(entityType, entityId, actorId, branchCode, PageRequest.of(page, size)));
    }
}
