package com.formsync.repository;

import com.formsync.model.FormTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface FormTemplateRepository extends JpaRepository<FormTemplate, Long> {
    List<FormTemplate> findByStatusOrderByJourneyTypeAscNameAsc(String status);
    List<FormTemplate> findByJourneyTypeAndStatus(String journeyType, String status);
    Optional<FormTemplate> findByFormCodeAndVersion(String formCode, Integer version);
    @Query("SELECT ft FROM FormTemplate ft WHERE ft.formCode = :code AND ft.version = (SELECT MAX(ft2.version) FROM FormTemplate ft2 WHERE ft2.formCode = :code)")
    Optional<FormTemplate> findLatestByFormCode(String code);
    List<FormTemplate> findByJourneyType(String journeyType);
}
