package com.formsync.repository;

import com.formsync.model.ThemeConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ThemeConfigRepository extends JpaRepository<ThemeConfig, Long> {
    Optional<ThemeConfig> findByIsActiveTrue();
}
