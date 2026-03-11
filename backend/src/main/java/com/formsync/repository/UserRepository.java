package com.formsync.repository;

import com.formsync.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    List<User> findByBranchCodeAndIsActiveTrue(String branchCode);
    List<User> findByRoleAndBranchCodeAndIsActiveTrue(String role, String branchCode);
    List<User> findByRoleInAndBranchCodeAndIsActiveTrue(List<String> roles, String branchCode);
}
