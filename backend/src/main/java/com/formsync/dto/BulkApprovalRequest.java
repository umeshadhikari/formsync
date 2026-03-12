package com.formsync.dto;

import lombok.Data;
import java.util.List;

@Data
public class BulkApprovalRequest {
    private List<Long> formInstanceIds;
    private String comments;
}
