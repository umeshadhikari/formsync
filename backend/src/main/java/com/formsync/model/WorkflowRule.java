package com.formsync.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.List;

@Entity @Table(name = "fs_workflow_rules")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkflowRule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "rule_name", nullable = false) private String ruleName;
    @Column(name = "journey_type", nullable = false) private String journeyType;
    @Column(name = "condition_field") private String conditionField;
    @Column(name = "condition_op") private String conditionOp;
    @Column(name = "condition_value") private String conditionValue;
    @Column(name = "required_tiers") private Integer requiredTiers;
    @Column(name = "approval_mode") private String approvalMode;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "tier_roles", columnDefinition = "jsonb") private List<String> tierRoles;
    private Integer priority;
    @Column(name = "is_active") private Boolean isActive;
    @Column(name = "created_at") private LocalDateTime createdAt;

    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
}
