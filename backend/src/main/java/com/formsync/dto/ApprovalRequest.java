package com.formsync.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class ApprovalRequest {
    @NotBlank private String action; // APPROVE, REJECT, RETURN
    private String comments;
    private String rejectionReason; // Structured reason from predefined list
    private String returnInstructions; // Specific correction instructions for teller
    private FormSubmitRequest.SignatureData signature;
}
