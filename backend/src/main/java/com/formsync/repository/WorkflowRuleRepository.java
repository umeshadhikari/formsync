package com.formsync.repository;

import com.formsync.model.WorkflowRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WorkflowRuleRepository extends JpaRepository<WorkflowRule, Long> {
    List<WorkflowRule> findByJourneyTypeAndIsActiveTrueOrderByPriorityDesc(String journeyType);
    List<WorkflowRule> findByIsActiveTrueOrderByJourneyTypeAscPriorityDesc();
}
