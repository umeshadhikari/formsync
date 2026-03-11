package com.formsync.dto;

import lombok.Data;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;

@Data
public class FormSubmitRequest {
    @NotNull private Long templateId;
    @NotBlank private String journeyType;
    @NotNull private Map<String, Object> formData;
    private String customerId;
    private String customerName;
    private String branchCode;
    private SignatureData customerSignature;
    private SignatureData tellerSignature;

    @Data
    public static class SignatureData {
        private String svgData;
        private String pngData;
        private String deviceInfo;
    }
}
