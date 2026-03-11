package com.formsync.repository;

import com.formsync.model.DigitalSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DigitalSignatureRepository extends JpaRepository<DigitalSignature, Long> {
    List<DigitalSignature> findByFormInstanceId(Long formInstanceId);
}
