package com.certifica.dto.response;

import com.certifica.domain.CertificateStatus;

import java.time.LocalDate;

/**
 * Respuesta publica de verificacion. Deliberadamente NO expone IDs internos
 * ni datos sensibles: solo lo necesario para validar la autenticidad.
 */
public record CertificateVerificationResponse(
        boolean valid,
        String code,
        String recipientName,
        String courseName,
        String institutionName,
        LocalDate issueDate,
        CertificateStatus status,
        String pdfUrl
) {
}
