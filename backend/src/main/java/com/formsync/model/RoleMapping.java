package com.formsync.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.List;

@Entity @Table(name = "fs_role_mappings")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RoleMapping {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "bank_role", nullable = false) private String bankRole;
    @Column(name = "formsync_role", nullable = false) private String formsyncRole;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") private List<String> permissions;
    @Column(name = "branch_scope") private String branchScope;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "journey_scope", columnDefinition = "jsonb") private List<String> journeyScope;
    @Column(name = "is_active") private Boolean isActive;
    @Column(name = "created_at") private LocalDateTime createdAt;

    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
}
