package com.formsync.scheduler;

import com.formsync.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor @Slf4j
public class WorkflowScheduler {
    private final WorkflowService workflowService;

    @Scheduled(fixedRate = 60000) // every minute
    public void checkEscalations() {
        int escalated = workflowService.escalateOverdue();
        if (escalated > 0) {
            log.info("Escalated {} overdue workflows", escalated);
        }
    }
}
