package com.certifica.mapper;

import com.certifica.domain.Institution;
import com.certifica.dto.response.InstitutionResponse;
import org.springframework.stereotype.Component;

/** Traduce entre la entidad JPA de Institution y sus DTOs publicos, evitando exponer el modelo de persistencia. */
@Component
public class InstitutionMapper {

    public InstitutionResponse toResponse(Institution institution) {
        return new InstitutionResponse(
                institution.getId(),
                institution.getName(),
                institution.getSlug(),
                institution.getLogoUrl(),
                institution.getCreatedAt()
        );
    }
}
