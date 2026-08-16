package com.certifica.repository;

import com.certifica.domain.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AdminUserRepository extends JpaRepository<AdminUser, UUID> {
    Optional<AdminUser> findByEmail(String email);
    Optional<AdminUser> findByResetToken(String resetToken);
    boolean existsByEmail(String email);
}
