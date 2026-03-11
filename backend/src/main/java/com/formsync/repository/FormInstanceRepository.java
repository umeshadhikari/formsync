package com.formsync.repository;

import com.formsync.model.FormInstance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
