package com.formsync.controller;

import com.formsync.dto.FormTemplateRequest;
import com.formsync.model.FormTemplate;
import com.formsync.model.User;
import com.formsync.repository.FormTemplateRepository;
import com.formsync.service.FormTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/v1/forms/templates") @RequiredArgsConstructor
public class FormTemplateController {
    private final FormTemplateService service;
    private final FormTemplateRepository templateRepo;

    @GetMapping
    public ResponseEntity<List<FormTemplate>> listPublished() {
        return ResponseEntity.ok(service.listPublished());
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<Page<FormTemplate>> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(templateRepo.findAllByOrderByJourneyTypeAscNameAsc(PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FormTemplate> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/journey/{journeyType}")
    public ResponseEntity<List<FormTemplate>> getByJourney(@PathVariable String journeyType) {
        return ResponseEntity.ok(service.getByJourneyType(journeyType));
    }

    /** Get version history for a form code */
    @GetMapping("/versions/{formCode}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<List<FormTemplate>> getVersionHistory(@PathVariable String formCode) {
        return ResponseEntity.ok(service.getVersionHistory(formCode));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<FormTemplate> create(@Valid @RequestBody FormTemplateRequest req, @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(service.create(req, actor));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<FormTemplate> update(@PathVariable Long id, @Valid @RequestBody FormTemplateRequest req, @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(service.update(id, req, actor));
    }

    /** Set expiry date on a template */
    @PostMapping("/{id}/expire")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<FormTemplate> setExpiry(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User actor) {
        LocalDateTime expiresAt = null;
        if (body.get("expiresAt") != null) {
            String raw = body.get("expiresAt");
            expiresAt = raw.endsWith("Z") || raw.contains("+")
                    ? LocalDateTime.ofInstant(Instant.parse(raw), ZoneId.systemDefault())
                    : LocalDateTime.parse(raw);
        }
        return ResponseEntity.ok(service.setExpiry(id, expiresAt, actor));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<FormTemplate> publish(@PathVariable Long id, @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(service.publish(id, actor));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN','BRANCH_MANAGER')")
    public ResponseEntity<FormTemplate> archive(@PathVariable Long id, @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(service.archive(id, actor));
    }
}
