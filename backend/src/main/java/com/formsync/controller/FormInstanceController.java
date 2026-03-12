package com.formsync.controller;

import com.formsync.dto.FormSubmitRequest;
import com.formsync.model.FormInstance;
import com.formsync.model.User;
import com.formsync.repository.FormInstanceRepository;
import com.formsync.service.FormInstanceService;
import com.formsync.service.WorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@RestController @RequestMapping("/api/v1/forms") @RequiredArgsConstructor
public class FormInstanceController {
    private final FormInstanceService service;
    private final WorkflowService workflowService;
    private final FormInstanceRepository formRepo;

    @PostMapping("/submit")
    public ResponseEntity<FormInstance> submit(@Valid @RequestBody FormSubmitRequest req, @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(service.submit(req, actor));
    }

    @PostMapping("/draft")
    public ResponseEntity<FormInstance> saveDraft(@Valid @RequestBody FormSubmitRequest req, @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(service.saveDraft(req, actor));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FormInstance> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/ref/{ref}")
    public ResponseEntity<FormInstance> getByRef(@PathVariable String ref) {
        return ResponseEntity.ok(service.getByReference(ref));
    }

    @GetMapping("/my")
    public ResponseEntity<Page<FormInstance>> myForms(@AuthenticationPrincipal User actor,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        if (status != null && !status.isBlank()) {
            if ("ACTION_REQUIRED".equals(status)) {
                // Return forms that need teller action: RETURNED or REJECTED (with resubmit allowed)
                return ResponseEntity.ok(formRepo.findByCreatedByAndStatusInOrderByCreatedAtDesc(
                    actor.getUsername(), java.util.List.of("RETURNED", "REJECTED"), PageRequest.of(page, size)));
            }
            return ResponseEntity.ok(formRepo.findByCreatedByAndStatusOrderByCreatedAtDesc(
                actor.getUsername(), status, PageRequest.of(page, size)));
        }
        return ResponseEntity.ok(service.listByUser(actor.getUsername(), PageRequest.of(page, size)));
    }

    @GetMapping("/branch")
    public ResponseEntity<Page<FormInstance>> branchForms(@AuthenticationPrincipal User actor,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.listByBranch(actor.getBranchCode(), status, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}/approvals")
    public ResponseEntity<?> approvalHistory(@PathVariable Long id) {
        return ResponseEntity.ok(workflowService.getApprovalHistory(id));
    }

    // ── Search ──
    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<FormInstance>> searchForms(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String journeyType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        LocalDateTime from = dateFrom != null ? LocalDate.parse(dateFrom).atStartOfDay() : null;
        LocalDateTime to = dateTo != null ? LocalDate.parse(dateTo).atTime(LocalTime.MAX) : null;

        Page<FormInstance> results = formRepo.searchForms(
            q != null && q.isBlank() ? null : q,
            journeyType != null && journeyType.isBlank() ? null : journeyType,
            status != null && status.isBlank() ? null : status,
            from, to,
            PageRequest.of(page, size)
        );

        return ResponseEntity.ok(results);
    }
}
