package com.certifica.service;

import com.certifica.domain.Institution;
import com.certifica.dto.request.InstitutionRequest;
import com.certifica.exception.BadRequestException;
import com.certifica.exception.ResourceNotFoundException;
import com.certifica.repository.InstitutionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class InstitutionService {

    private static final Logger log = LoggerFactory.getLogger(InstitutionService.class);

    private final InstitutionRepository repository;

    public InstitutionService(InstitutionRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<Institution> findAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public Institution findById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institucion no encontrada: " + id));
    }

    @Transactional
    public Institution create(InstitutionRequest request) {
        if (repository.existsBySlug(request.slug())) {
            throw new BadRequestException("Ya existe una institucion con el slug: " + request.slug());
        }
        Institution institution = Institution.builder()
                .name(request.name())
                .slug(request.slug())
                .logoUrl(request.logoUrl())
                .build();
        Institution saved = repository.save(institution);
        log.info("Institucion creada: {} ({})", saved.getName(), saved.getId());
        return saved;
    }

    @Transactional
    public Institution update(UUID id, InstitutionRequest request) {
        Institution institution = findById(id);
        institution.setName(request.name());
        institution.setSlug(request.slug());
        institution.setLogoUrl(request.logoUrl());
        return repository.save(institution);
    }

    @Transactional
    public void delete(UUID id) {
        Institution institution = findById(id);
        repository.delete(institution);
        log.info("Institucion eliminada: {}", id);
    }
}
