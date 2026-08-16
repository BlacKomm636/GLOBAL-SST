package com.certifica.dto.request;

import jakarta.validation.constraints.NotBlank;

public record InstitutionRequest(
        @NotBlank String name,
        @NotBlank String slug,
        String logoUrl
) {
}
