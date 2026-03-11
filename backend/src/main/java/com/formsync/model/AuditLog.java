package com.formsync.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Entity @Table(name = "fs_audit_logs")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "entity_type", nullable = false) private String entityType;
    @Column(name = "entity_id") private String entityId;
    @Column(nullable = false) private String action;
    @Column(name = "actor_id") private String actorId;
    @Column(name = "actor_name") private String actorName;
    @Column(name = "actor_role") private String actorRole;
    @Column(name = "ip_address") private String ipAddress;
    @Column(name = "branch_code") private String branchCode;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") private Map<String, Object> details;
    @Column(name = "created_at") private LocalDateTime createdAt;

    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
}
