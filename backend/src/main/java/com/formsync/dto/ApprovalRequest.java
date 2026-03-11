package com.formsync.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class ApprovalRequest {
    @NotBlank private String action; // APPROVE, REJECT, RETURN
    private String comments;
    private FormSubmitRequest.SignatureData signature;
}
