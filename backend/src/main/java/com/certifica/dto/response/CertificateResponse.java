package com.certifica.dto.response;

import com.certifica.domain.CertificateStatus;

import java.time.LocalDate;
import java.util.UUID;

public record CertificateResponse(
        UUID id,
        String code,
        UUID institutionId,
        String institutionName,
        UUID courseId,
        String courseName,
        String recipientName,
        String recipientEmail,
        LocalDate issueDate,
        CertificateStatus status,
        String pdfUrl,
        String qrUrl,
        String verificationUrl
) {
}
