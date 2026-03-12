package com.formsync.repository;

import com.formsync.model.FormTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FormTemplateRepository extends JpaRepository<FormTemplate, Long> {
    List<FormTemplate> findByStatusOrderByJourneyTypeAscNameAsc(String status);
    List<FormTemplate> findByJourneyTypeAndStatus(String journeyType, String status);
    Optional<FormTemplate> findByFormCodeAndVersion(String formCode, Integer version);

    @Query("SELECT ft FROM FormTemplate ft WHERE ft.formCode = :code AND ft.version = (SELECT MAX(ft2.version) FROM FormTemplate ft2 WHERE ft2.formCode = :code)")
    Optional<FormTemplate> findLatestByFormCode(String code);

    List<FormTemplate> findByJourneyType(String journeyType);

    // Active published templates: published, not expired, and currently effective
    @Query("SELECT ft FROM FormTemplate ft WHERE ft.status = 'PUBLISHED' " +
           "AND (ft.expiresAt IS NULL OR ft.expiresAt > :now) " +
           "AND (ft.effectiveFrom IS NULL OR ft.effectiveFrom <= :now) " +
           "ORDER BY ft.journeyType ASC, ft.name ASC")
    List<FormTemplate> findActivePublished(LocalDateTime now);

    // Find all versions of a template by form code, ordered by version desc
    @Query("SELECT ft FROM FormTemplate ft WHERE ft.formCode = :code ORDER BY ft.version DESC")
    List<FormTemplate> findAllVersionsByFormCode(String code);

    // ── Paginated queries ──
    Page<FormTemplate> findAllByOrderByJourneyTypeAscNameAsc(Pageable pageable);
}
