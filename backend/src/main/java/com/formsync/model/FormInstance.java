package com.formsync.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Entity @Table(name = "fs_form_instances")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FormInstance {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "reference_number", unique = true, nullable = false) private String referenceNumber;
    @Column(name = "template_id", nullable = false) private Long templateId;
    @Column(name = "template_version", nullable = false) private Integer templateVersion;
    @Column(name = "journey_type", nullable = false) private String journeyType;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "form_data", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> formData;

    @Column(nullable = false) private String status;
    @Column(name = "branch_code", nullable = false) private String branchCode;
    @Column(name = "customer_id") private String customerId;
    @Column(name = "customer_name") private String customerName;
    private BigDecimal amount;
    @Column(length = 3) private String currency;
    @Column(name = "created_by", nullable = false) private String createdBy;
    @Column(name = "submitted_at") private LocalDateTime submittedAt;
    @Column(name = "completed_at") private LocalDateTime completedAt;
    @Column(name = "cbs_reference") private String cbsReference;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "cbs_response", columnDefinition = "jsonb")
    private Map<String, Object> cbsResponse;

    @Column(name = "dms_reference") private String dmsReference;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;

    @PrePersist protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); if (status == null) status = "DRAFT"; }
    @PreUpdate protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
