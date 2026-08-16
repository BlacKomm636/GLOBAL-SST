package com.certifica.repository;

import com.certifica.domain.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CertificateRepository extends JpaRepository<Certificate, UUID> {
    Optional<Certificate> findByCode(String code);
    boolean existsByCode(String code);
}
