package com.formsync.service;

import com.formsync.dto.FormTemplateRequest;
import com.formsync.model.FormTemplate;
import com.formsync.model.User;
import com.formsync.repository.FormTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor
public class FormTemplateService {
    private final FormTemplateRepository repo;
    private final AuditService auditService;

    /**
     * List published templates that are currently active (not expired, effective).
     * This is used by the Dashboard/Teller view.
     */
    public List<FormTemplate> listPublished() {
        return repo.findActivePublished(LocalDateTime.now());
    }

    public List<FormTemplate> listAll() { return repo.findAll(); }

    public FormTemplate getById(Long id) {
        return repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Template not found: " + id));
    }

    public List<FormTemplate> getByJourneyType(String journeyType) {
        return repo.findByJourneyType(journeyType);
    }

    /**
     * List all versions of a specific form code.
     */
    public List<FormTemplate> getVersionHistory(String formCode) {
        return repo.findAllVersionsByFormCode(formCode);
    }

    /**
     * Create a brand new template (or a new version of an existing form code).
     * The version number is auto-incremented based on the form code.
     * If supersedesTemplateId is set, the old template gets an expiry date.
     */
    @Transactional
    public FormTemplate create(FormTemplateRequest req, User actor) {
        Integer maxVersion = repo.findLatestByFormCode(req.getFormCode()).map(ft -> ft.getVersion() + 1).orElse(1);
        FormTemplate template = FormTemplate.builder()
                .formCode(req.getFormCode()).version(maxVersion).journeyType(req.getJourneyType())
                .name(req.getName()).description(req.getDescription()).schema(req.getSchema())
                .approvalConfig(req.getApprovalConfig()).cbsMapping(req.getCbsMapping())
                .dmsConfig(req.getDmsConfig()).status("DRAFT")
                .effectiveFrom(req.getEffectiveFrom() != null ? req.getEffectiveFrom() : LocalDateTime.now())
                .expiresAt(req.getExpiresAt())
                .createdBy(actor.getUsername()).build();
        template = repo.save(template);

        // If this supersedes an existing template, link them and set expiry on old one
        if (req.getSupersedesTemplateId() != null) {
            FormTemplate oldTemplate = getById(req.getSupersedesTemplateId());
            oldTemplate.setSupersededBy(template.getId());
            // Set expiry on old template: use the new template's effective date, or now
            LocalDateTime expiryDate = req.getEffectiveFrom() != null ? req.getEffectiveFrom() : LocalDateTime.now();
            if (oldTemplate.getExpiresAt() == null || oldTemplate.getExpiresAt().isAfter(expiryDate)) {
                oldTemplate.setExpiresAt(expiryDate);
            }
            repo.save(oldTemplate);
            auditService.log("FORM_TEMPLATE", oldTemplate.getId().toString(), "SUPERSEDED", actor,
                    Map.of("message", "Superseded by v" + maxVersion + " (ID: " + template.getId() + ")"));
        }

        auditService.log("FORM_TEMPLATE", template.getId().toString(), "CREATED", actor,
                Map.of("message", "Version " + maxVersion));
        return template;
    }

    /**
     * Update an existing template (in-place update for DRAFT templates only).
     * Published templates should use create() to make a new version instead.
     */
    @Transactional
    public FormTemplate update(Long id, FormTemplateRequest req, User actor) {
        FormTemplate template = getById(id);
        template.setName(req.getName());
        template.setDescription(req.getDescription());
        template.setSchema(req.getSchema());
        template.setApprovalConfig(req.getApprovalConfig());
        template.setCbsMapping(req.getCbsMapping());
        template.setDmsConfig(req.getDmsConfig());
        if (req.getExpiresAt() != null) template.setExpiresAt(req.getExpiresAt());
        if (req.getEffectiveFrom() != null) template.setEffectiveFrom(req.getEffectiveFrom());
        template = repo.save(template);
        auditService.log("FORM_TEMPLATE", id.toString(), "UPDATED", actor, null);
        return template;
    }

    /**
     * Set expiry date on a template.
     */
    @Transactional
    public FormTemplate setExpiry(Long id, LocalDateTime expiresAt, User actor) {
        FormTemplate template = getById(id);
        template.setExpiresAt(expiresAt);
        template = repo.save(template);
        auditService.log("FORM_TEMPLATE", id.toString(), "EXPIRY_SET", actor,
                Map.of("message", expiresAt != null ? "Expires: " + expiresAt : "Expiry removed"));
        return template;
    }

    @Transactional
    public FormTemplate publish(Long id, User actor) {
        FormTemplate template = getById(id);
        template.setStatus("PUBLISHED");
        if (template.getEffectiveFrom() == null) {
            template.setEffectiveFrom(LocalDateTime.now());
        }
        template = repo.save(template);
        auditService.log("FORM_TEMPLATE", id.toString(), "PUBLISHED", actor, null);
        return template;
    }

    @Transactional
    public FormTemplate archive(Long id, User actor) {
        FormTemplate template = getById(id);
        template.setStatus("ARCHIVED");
        template = repo.save(template);
        auditService.log("FORM_TEMPLATE", id.toString(), "ARCHIVED", actor, null);
        return template;
    }
}
