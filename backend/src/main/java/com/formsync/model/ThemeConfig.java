package com.formsync.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Entity @Table(name = "fs_theme_configs")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ThemeConfig {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "bank_id") private String bankId;
    private String name;
    @Column(name = "css_url") private String cssUrl;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "design_tokens", columnDefinition = "jsonb") private Map<String, Object> designTokens;
    @Column(name = "logo_url") private String logoUrl;
    @Column(name = "is_active") private Boolean isActive;
    @Column(name = "created_at") private LocalDateTime createdAt;

    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
}
