package com.certifica.mapper;

import com.certifica.domain.Certificate;
import com.certifica.dto.response.CertificateResponse;
import com.certifica.dto.response.CertificateVerificationResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CertificateMapper {

    @Value("${app.public-verify-base-url}")
    private String publicVerifyBaseUrl;

    public CertificateResponse toResponse(Certificate c) {
        return new CertificateResponse(
                c.getId(),
                c.getCode(),
                c.getInstitution().getId(),
                c.getInstitution().getName(),
                c.getCourse().getId(),
                c.getCourse().getName(),
                c.getRecipientName(),
                c.getRecipientEmail(),
                c.getIssueDate(),
                c.getStatus(),
                c.getPdfUrl(),
                c.getQrUrl(),
                publicVerifyBaseUrl + "/" + c.getCode()
        );
    }

    public CertificateVerificationResponse toVerificationResponse(Certificate c) {
        return new CertificateVerificationResponse(
                true,
                c.getCode(),
                c.getRecipientName(),
                c.getCourse().getName(),
                c.getInstitution().getName(),
                c.getIssueDate(),
                c.getStatus(),
                c.getPdfUrl()
        );
    }
}
