package com.formsync.controller;

import com.formsync.dto.DashboardStats;
import com.formsync.model.*;
import com.formsync.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController @RequestMapping("/api/v1/admin") @RequiredArgsConstructor
public class AdminController {
    private final UserRepository userRepo;
    private final RoleMappingRepository roleMappingRepo;
    private final ThemeConfigRepository themeRepo;
    private final FormInstanceRepository formRepo;
    private final WorkflowInstanceRepository workflowRepo;

    // ── Users ──
    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','OPS_ADMIN')")
    public ResponseEntity<List<User>> listUsers() { return ResponseEntity.ok(userRepo.findAll()); }

    // ── Role Mappings ──
    @GetMapping("/roles")
    public ResponseEntity<List<RoleMapping>> listRoles() { return ResponseEntity.ok(roleMappingRepo.findByIsActiveTrue()); }

    @PutMapping("/roles/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<RoleMapping> updateRole(@PathVariable Long id, @RequestBody RoleMapping mapping) {
        RoleMapping existing = roleMappingRepo.findById(id).orElseThrow();
        if (mapping.getPermissions() != null) existing.setPermissions(mapping.getPermissions());
        if (mapping.getBranchScope() != null) existing.setBranchScope(mapping.getBranchScope());
        if (mapping.getJourneyScope() != null) existing.setJourneyScope(mapping.getJourneyScope());
        return ResponseEntity.ok(roleMappingRepo.save(existing));
    }

    // ── Themes ──
    @GetMapping("/themes")
    public ResponseEntity<List<ThemeConfig>> listThemes() { return ResponseEntity.ok(themeRepo.findAll()); }

    @GetMapping("/themes/active")
    public ResponseEntity<ThemeConfig> activeTheme() {
        return ResponseEntity.ok(themeRepo.findByIsActiveTrue().orElse(null));
    }

    @PostMapping("/themes")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<ThemeConfig> createTheme(@RequestBody ThemeConfig theme) {
        return ResponseEntity.ok(themeRepo.save(theme));
    }

    @PutMapping("/themes/{id}/activate")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<ThemeConfig> activateTheme(@PathVariable Long id) {
        themeRepo.findAll().forEach(t -> { t.setIsActive(false); themeRepo.save(t); });
        ThemeConfig theme = themeRepo.findById(id).orElseThrow();
        theme.setIsActive(true);
        return ResponseEntity.ok(themeRepo.save(theme));
    }

    // ── Dashboard Stats ──
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardStats> dashboard(@AuthenticationPrincipal User actor) {
        String branch = actor.getBranchCode();
        List<FormInstance> allForms = formRepo.findAll();
        Map<String, Long> byStatus = allForms.stream().collect(Collectors.groupingBy(FormInstance::getStatus, Collectors.counting()));
        Map<String, Long> byJourney = allForms.stream().collect(Collectors.groupingBy(FormInstance::getJourneyType, Collectors.counting()));

        return ResponseEntity.ok(DashboardStats.builder()
                .totalForms(allForms.size())
                .pendingApproval(byStatus.getOrDefault("PENDING_APPROVAL", 0L))
                .approvedToday(byStatus.getOrDefault("COMPLETED", 0L))
                .rejectedToday(byStatus.getOrDefault("REJECTED", 0L))
                .byJourneyType(byJourney)
                .byStatus(byStatus)
                .build());
    }
}
