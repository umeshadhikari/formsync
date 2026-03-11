package com.formsync.service;

import com.formsync.dto.FormTemplateRequest;
import com.formsync.model.FormTemplate;
import com.formsync.model.User;
import com.formsync.repository.FormTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor
public class FormTemplateService {
    private final FormTemplateRepository repo;
    private final AuditService auditService;

    public List<FormTemplate> listPublished() {
        return repo.findByStatusOrderByJourneyTypeAscNameAsc("PUBLISHED");
    }

    public List<FormTemplate> listAll() { return repo.findAll(); }

    public FormTemplate getById(Long id) {
        return repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Template not found: " + id));
    }

    public List<FormTemplate> getByJourneyType(String journeyType) {
        return repo.findByJourneyType(journeyType);
    }

    @Transactional
    public FormTemplate create(FormTemplateRequest req, User actor) {
        Integer maxVersion = repo.findLatestByFormCode(req.getFormCode()).map(ft -> ft.getVersion() + 1).orElse(1);
        FormTemplate template = FormTemplate.builder()
                .formCode(req.getFormCode()).version(maxVersion).journeyType(req.getJourneyType())
                .name(req.getName()).description(req.getDescription()).schema(req.getSchema())
                .approvalConfig(req.getApprovalConfig()).cbsMapping(req.getCbsMapping())
                .dmsConfig(req.getDmsConfig()).status("DRAFT")
                .createdBy(actor.getUsername()).build();
        template = repo.save(template);
        auditService.log("FORM_TEMPLATE", template.getId().toString(), "CREATED", actor, null);
        return template;
    }

    @Transactional
    public FormTemplate update(Long id, FormTemplateRequest req, User actor) {
        FormTemplate template = getById(id);
        template.setName(req.getName());
        template.setDescription(req.getDescription());
        template.setSchema(req.getSchema());
        template.setApprovalConfig(req.getApprovalConfig());
        template.setCbsMapping(req.getCbsMapping());
        template.setDmsConfig(req.getDmsConfig());
        template = repo.save(template);
        auditService.log("FORM_TEMPLATE", id.toString(), "UPDATED", actor, null);
        return template;
    }

    @Transactional
    public FormTemplate publish(Long id, User actor) {
        FormTemplate template = getById(id);
        template.setStatus("PUBLISHED");
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
