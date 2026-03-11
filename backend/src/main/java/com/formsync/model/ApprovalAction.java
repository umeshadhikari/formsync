package com.formsync.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Entity @Table(name = "fs_approval_actions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ApprovalAction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "workflow_id", nullable = false) private Long workflowId;
    @Column(name = "form_instance_id", nullable = false) private Long formInstanceId;
    @Column(nullable = false) private Integer tier;
    @Column(nullable = false) private String action;
    @Column(name = "actor_id", nullable = false) private String actorId;
    @Column(name = "actor_name") private String actorName;
    @Column(name = "actor_role") private String actorRole;
    private String comments;
    @Column(name = "signature_id") private Long signatureId;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") private Map<String, Object> metadata;
    @Column(name = "created_at") private LocalDateTime createdAt;

    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
}
