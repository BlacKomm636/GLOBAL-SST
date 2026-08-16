package com.certifica.dto.response;

import java.time.Instant;
import java.util.UUID;

public record InstitutionResponse(
        UUID id,
        String name,
        String slug,
        String logoUrl,
        Instant createdAt
) {
}
