package com.certifica.controller;

import com.certifica.dto.response.CertificateVerificationResponse;
import com.certifica.mapper.CertificateMapper;
import com.certifica.service.CertificateService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/verify")
@Tag(name = "Verification", description = "Validacion publica de certificados via QR o URL (sin autenticacion)")
public class VerificationController {

    private final CertificateService service;
    private final CertificateMapper mapper;

    public VerificationController(CertificateService service, CertificateMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @GetMapping("/{code}")
    public CertificateVerificationResponse verify(@PathVariable String code) {
        var certificate = service.findByCodeActive(code);
        return mapper.toVerificationResponse(certificate);
    }
}
