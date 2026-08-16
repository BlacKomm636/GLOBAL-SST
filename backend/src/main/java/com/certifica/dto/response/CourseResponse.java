package com.certifica.dto.response;

import java.time.Instant;
import java.util.UUID;

public record CourseResponse(
        UUID id,
        UUID institutionId,
        String institutionName,
        String name,
        Integer hours,
        Instant createdAt
) {
}
