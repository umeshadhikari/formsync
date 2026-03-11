package com.formsync.dto;

import lombok.Data;
import java.util.List;

@Data
public class WorkflowRuleRequest {
    private String ruleName;
    private String journeyType;
    private String conditionField;
    private String conditionOp;
    private String conditionValue;
    private Integer requiredTiers;
    private String approvalMode;
    private List<String> tierRoles;
    private Integer priority;
    private Boolean isActive;
}
