package com.formsync.repository;

import com.formsync.model.FormInstance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FormInstanceRepository extends JpaRepository<FormInstance, Long> {
    Optional<FormInstance> findByReferenceNumber(String refNumber);
    Page<FormInstance> findByCreatedByOrderByCreatedAtDesc(String createdBy, Pageable pageable);
    Page<FormInstance> findByBranchCodeOrderByCreatedAtDesc(String branchCode, Pageable pageable);
    Page<FormInstance> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<FormInstance> findByBranchCodeAndStatusOrderByCreatedAtDesc(String branchCode, String status, Pageable pageable);
    List<FormInstance> findByStatusIn(List<String> statuses);
    long countByBranchCodeAndStatus(String branchCode, String status);
    List<FormInstance> findByIdIn(List<Long> ids);
    List<FormInstance> findByCreatedByOrderByCreatedAtDesc(String createdBy);

    // Teller: my forms filtered by status
    Page<FormInstance> findByCreatedByAndStatusOrderByCreatedAtDesc(String createdBy, String status, Pageable pageable);
    Page<FormInstance> findByCreatedByAndStatusInOrderByCreatedAtDesc(String createdBy, java.util.List<String> statuses, Pageable pageable);

    // Dashboard stats queries
    long countByCreatedByAndStatus(String createdBy, String status);
    long countByCreatedBy(String createdBy);
    long countByStatus(String status);

    @Query("SELECT COUNT(f) FROM FormInstance f WHERE f.createdBy = :user AND f.resubmissionCount > 0")
    long countResubmissionsByUser(@Param("user") String user);

    @Query("SELECT COUNT(f) FROM FormInstance f WHERE f.resubmissionCount >= 2")
    long countMultiResubmissions();

    @Query("SELECT COUNT(f) FROM FormInstance f WHERE f.status = 'PENDING_APPROVAL' AND f.amount >= :threshold")
    long countHighValuePending(@Param("threshold") java.math.BigDecimal threshold);

    @Query(value = "SELECT COUNT(*) FROM fs_form_instances WHERE DATE(created_at) = CURRENT_DATE", nativeQuery = true)
    long countFormsCreatedToday();

    @Query(value = "SELECT * FROM fs_form_instances f WHERE " +
           "(CAST(:q AS TEXT) IS NULL OR LOWER(f.reference_number) LIKE LOWER(CONCAT('%', CAST(:q AS TEXT), '%')) OR LOWER(f.customer_name) LIKE LOWER(CONCAT('%', CAST(:q AS TEXT), '%'))) " +
           "AND (CAST(:journeyType AS TEXT) IS NULL OR f.journey_type = CAST(:journeyType AS TEXT)) " +
           "AND (CAST(:status AS TEXT) IS NULL OR f.status = CAST(:status AS TEXT)) " +
           "AND (CAST(:dateFrom AS TIMESTAMP) IS NULL OR f.created_at >= CAST(:dateFrom AS TIMESTAMP)) " +
           "AND (CAST(:dateTo AS TIMESTAMP) IS NULL OR f.created_at <= CAST(:dateTo AS TIMESTAMP)) " +
           "ORDER BY f.created_at DESC",
           countQuery = "SELECT COUNT(*) FROM fs_form_instances f WHERE " +
           "(CAST(:q AS TEXT) IS NULL OR LOWER(f.reference_number) LIKE LOWER(CONCAT('%', CAST(:q AS TEXT), '%')) OR LOWER(f.customer_name) LIKE LOWER(CONCAT('%', CAST(:q AS TEXT), '%'))) " +
           "AND (CAST(:journeyType AS TEXT) IS NULL OR f.journey_type = CAST(:journeyType AS TEXT)) " +
           "AND (CAST(:status AS TEXT) IS NULL OR f.status = CAST(:status AS TEXT)) " +
           "AND (CAST(:dateFrom AS TIMESTAMP) IS NULL OR f.created_at >= CAST(:dateFrom AS TIMESTAMP)) " +
           "AND (CAST(:dateTo AS TIMESTAMP) IS NULL OR f.created_at <= CAST(:dateTo AS TIMESTAMP))",
           nativeQuery = true)
    Page<FormInstance> searchForms(@Param("q") String q, @Param("journeyType") String journeyType,
                                   @Param("status") String status, @Param("dateFrom") LocalDateTime dateFrom,
                                   @Param("dateTo") LocalDateTime dateTo, Pageable pageable);
}
