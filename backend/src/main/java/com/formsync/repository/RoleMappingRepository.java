package com.formsync.repository;

import com.formsync.model.RoleMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoleMappingRepository extends JpaRepository<RoleMapping, Long> {
    List<RoleMapping> findByIsActiveTrue();
}
