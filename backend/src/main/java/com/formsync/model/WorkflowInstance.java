package com.formsync.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "fs_workflow_instances")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkflowInstance {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "form_instance_id", nullable = false) private Long formInstanceId;
    @Column(name = "process_instance_id") private String processInstanceId;
    @Column(name = "current_state", nullable = false) private String currentState;
    @Column(name = "current_tier") private Integer currentTier;
    @Column(name = "required_tiers") private Integer requiredTiers;
    @Column(name = "approval_mode") private String approvalMode;
    @Column(name = "sla_deadline") private LocalDateTime slaDeadline;
    private Boolean escalated;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;

    @PrePersist protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); if (currentState == null) currentState = "PENDING"; if (currentTier == null) currentTier = 0; }
    @PreUpdate protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
