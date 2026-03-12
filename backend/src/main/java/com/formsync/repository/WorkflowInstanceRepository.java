package com.formsync.repository;

import com.formsync.model.WorkflowInstance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstance, Long> {
    Optional<WorkflowInstance> findByFormInstanceId(Long formInstanceId);
    List<WorkflowInstance> findByCurrentStateIn(List<String> states);
    List<WorkflowInstance> findByCurrentStateAndEscalatedFalse(String state);

    @Query("SELECT w FROM WorkflowInstance w WHERE w.currentState LIKE 'PENDING_TIER_%' AND w.slaDeadline < :now AND w.escalated = false")
    List<WorkflowInstance> findByCurrentStateStartingWithAndSlaDeadlineBeforeAndEscalatedFalse(@Param("now") LocalDateTime now);

    @Query("SELECT w FROM WorkflowInstance w WHERE w.currentState LIKE 'PENDING_TIER_%' AND w.claimedBy = :username")
    List<WorkflowInstance> findClaimedByUser(@Param("username") String username);

    // Dashboard stats queries
    @Query("SELECT COUNT(w) FROM WorkflowInstance w WHERE w.currentState LIKE 'PENDING_TIER_%'")
    long countPendingApproval();

    @Query("SELECT COUNT(w) FROM WorkflowInstance w WHERE w.currentState LIKE 'PENDING_TIER_%' AND w.claimedBy = :username")
    long countClaimedByUser(@Param("username") String username);

    @Query("SELECT COUNT(w) FROM WorkflowInstance w WHERE w.currentState LIKE 'PENDING_TIER_%' AND w.slaDeadline < :now AND w.escalated = false")
    long countSlaAtRisk(@Param("now") LocalDateTime now);

    @Query("SELECT COUNT(w) FROM WorkflowInstance w WHERE w.escalated = true AND w.currentState LIKE 'PENDING_TIER_%'")
    long countEscalated();

    @Query("SELECT COUNT(w) FROM WorkflowInstance w WHERE w.requiredTiers = 0")
    long countAutoApproved();

    @Query(value = "SELECT COUNT(*) FROM fs_workflow_instances WHERE current_state = 'COMPLETED' AND DATE(updated_at) = CURRENT_DATE", nativeQuery = true)
    long countCompletedToday();

    @Query(value = "SELECT COUNT(*) FROM fs_workflow_instances WHERE current_state = 'REJECTED' AND DATE(updated_at) = CURRENT_DATE", nativeQuery = true)
    long countRejectedToday();

    @Query(value = "SELECT COUNT(*) FROM fs_workflow_instances WHERE current_state = 'RETURNED' AND DATE(updated_at) = CURRENT_DATE", nativeQuery = true)
    long countReturnedToday();

    @Query(value = "SELECT COUNT(*) FROM fs_workflow_instances WHERE current_state LIKE 'PENDING_TIER_%' AND sla_deadline < NOW()", nativeQuery = true)
    long countSlaBreached();

    @Query("SELECT COALESCE(AVG(w.requiredTiers), 0) FROM WorkflowInstance w WHERE w.requiredTiers > 0")
    double avgApprovalTiers();

    // ── Paginated queries ──
    Page<WorkflowInstance> findByCurrentStateIn(List<String> states, Pageable pageable);

    @Query("SELECT w FROM WorkflowInstance w WHERE w.currentState LIKE 'PENDING_TIER_%' AND w.claimedBy = :username")
    Page<WorkflowInstance> findClaimedByUserPaged(@Param("username") String username, Pageable pageable);
}
