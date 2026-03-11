package com.formsync.repository;

import com.formsync.model.WorkflowInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstance, Long> {
    Optional<WorkflowInstance> findByFormInstanceId(Long formInstanceId);
    List<WorkflowInstance> findByCurrentStateIn(List<String> states);
    List<WorkflowInstance> findByCurrentStateAndEscalatedFalse(String state);
}
