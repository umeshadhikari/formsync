package com.formsync.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Entity @Table(name = "fs_form_templates")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FormTemplate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "form_code", nullable = false) private String formCode;
    @Column(nullable = false) private Integer version;
    @Column(name = "journey_type", nullable = false) private String journeyType;
    @Column(nullable = false) private String name;
    private String description;

    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> schema;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "approval_config", columnDefinition = "jsonb")
    private Map<String, Object> approvalConfig;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "cbs_mapping", columnDefinition = "jsonb")
    private Map<String, Object> cbsMapping;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "dms_config", columnDefinition = "jsonb")
    private Map<String, Object> dmsConfig;

    @Column(nullable = false) private String status;
    @Column(name = "created_by") private String createdBy;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;
    @Column(name = "expires_at") private LocalDateTime expiresAt;
    @Column(name = "effective_from") private LocalDateTime effectiveFrom;
    @Column(name = "superseded_by") private Long supersededBy;

    @PrePersist protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); if (status == null) status = "DRAFT"; if (version == null) version = 1; }
    @PreUpdate protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
