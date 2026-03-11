package com.formsync.controller;

import com.formsync.dto.FormTemplateRequest;
import com.formsync.model.FormTemplate;
import com.formsync.model.User;
import com.formsync.service.FormTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/forms/templates") @RequiredArgsConstructor
public class FormTemplateController {
    private final FormTemplateService service;

    @GetMapping
    public ResponseEntity<List<FormTemplate>> listPublished() {
        return ResponseEntity.ok(service.listPublished());
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN')")
    public ResponseEntity<List<FormTemplate>> listAll() {
        return ResponseEntity.ok(service.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FormTemplate> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/journey/{journeyType}")
    public ResponseEntity<List<FormTemplate>> getByJourney(@PathVariable String journeyType) {
        return ResponseEntity.ok(service.getByJourneyType(journeyType));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN')")
    public ResponseEntity<FormTemplate> create(@Valid @RequestBody FormTemplateRequest req, @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(service.create(req, actor));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN')")
    public ResponseEntity<FormTemplate> update(@PathVariable Long id, @Valid @RequestBody FormTemplateRequest req, @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(service.update(id, req, actor));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN')")
    public ResponseEntity<FormTemplate> publish(@PathVariable Long id, @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(service.publish(id, actor));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN')")
    public ResponseEntity<FormTemplate> archive(@PathVariable Long id, @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(service.archive(id, actor));
    }
}
