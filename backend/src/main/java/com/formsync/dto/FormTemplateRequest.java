package com.formsync.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

@Data
public class FormTemplateRequest {
    @NotBlank private String formCode;
    @NotBlank private String journeyType;
    @NotBlank private String name;
    private String description;
    @NotNull private Map<String, Object> schema;
    private Map<String, Object> approvalConfig;
    private Map<String, Object> cbsMapping;
    private Map<String, Object> dmsConfig;
}
