package com.formsync.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class AuthRequest {
    @NotBlank private String username;
    @NotBlank private String password;
}
