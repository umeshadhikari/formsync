package com.formsync.repository;

import com.formsync.model.ApprovalAction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ApprovalActionRepository extends JpaRepository<ApprovalAction, Long> {
    List<ApprovalAction> findByWorkflowIdOrderByCreatedAtAsc(Long workflowId);
    List<ApprovalAction> findByFormInstanceIdOrderByCreatedAtAsc(Long formInstanceId);
}
