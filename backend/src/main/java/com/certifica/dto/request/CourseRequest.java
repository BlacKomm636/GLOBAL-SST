package com.certifica.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record CourseRequest(
        @NotNull UUID institutionId,
        @NotBlank String name,
        @Positive Integer hours
) {
}
