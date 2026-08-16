package com.certifica.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record CertificateRequest(
        @NotNull UUID institutionId,
        @NotNull UUID courseId,
        @NotBlank String recipientName,
        @Email String recipientEmail,
        @NotNull LocalDate issueDate
) {
}
