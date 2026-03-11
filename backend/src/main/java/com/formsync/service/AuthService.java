package com.formsync.service;

import com.formsync.dto.AuthRequest;
import com.formsync.dto.AuthResponse;
import com.formsync.model.RoleMapping;
import com.formsync.model.User;
import com.formsync.repository.RoleMappingRepository;
import com.formsync.repository.UserRepository;
import com.formsync.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepo;
    private final RoleMappingRepository roleMappingRepo;
    private final JwtTokenProvider jwtProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthResponse login(AuthRequest request) {
        User user = userRepo.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
            throw new IllegalArgumentException("Invalid credentials");
        if (!Boolean.TRUE.equals(user.getIsActive()))
            throw new IllegalArgumentException("Account is disabled");

        user.setLastLogin(LocalDateTime.now());
        userRepo.save(user);

        List<String> permissions = getPermissionsForRole(user.getRole());
        String token = jwtProvider.generateToken(user.getUsername(), user.getRole(), user.getBranchCode(),
                Map.of("fullName", user.getFullName(), "permissions", permissions));
        String refreshToken = jwtProvider.generateRefreshToken(user.getUsername());

        return AuthResponse.builder()
                .accessToken(token).refreshToken(refreshToken).tokenType("Bearer")
                .expiresIn(jwtProvider.getExpirationMs() / 1000)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId()).username(user.getUsername()).fullName(user.getFullName())
                        .email(user.getEmail()).role(user.getRole()).branchCode(user.getBranchCode())
                        .permissions(permissions).build())
                .build();
    }

    public AuthResponse refreshToken(String refreshToken) {
        if (!jwtProvider.validateToken(refreshToken)) throw new IllegalArgumentException("Invalid refresh token");
        String username = jwtProvider.getUsernameFromToken(refreshToken);
        User user = userRepo.findByUsername(username).orElseThrow(() -> new IllegalArgumentException("User not found"));
        List<String> permissions = getPermissionsForRole(user.getRole());
        String token = jwtProvider.generateToken(user.getUsername(), user.getRole(), user.getBranchCode(),
                Map.of("fullName", user.getFullName(), "permissions", permissions));
        String newRefreshToken = jwtProvider.generateRefreshToken(user.getUsername());
        return AuthResponse.builder()
                .accessToken(token).refreshToken(newRefreshToken).tokenType("Bearer")
                .expiresIn(jwtProvider.getExpirationMs() / 1000)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId()).username(user.getUsername()).fullName(user.getFullName())
                        .email(user.getEmail()).role(user.getRole()).branchCode(user.getBranchCode())
                        .permissions(permissions).build())
                .build();
    }

    private List<String> getPermissionsForRole(String role) {
        return roleMappingRepo.findByIsActiveTrue().stream()
                .filter(rm -> rm.getFormsyncRole().equals(role))
                .flatMap(rm -> rm.getPermissions().stream())
                .distinct().toList();
    }
}
