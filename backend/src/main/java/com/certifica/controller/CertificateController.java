package com.certifica.controller;

import com.certifica.dto.request.CertificateRequest;
import com.certifica.dto.response.CertificateResponse;
import com.certifica.mapper.CertificateMapper;
import com.certifica.service.CertificateService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/certificates")
@Tag(name = "Certificates", description = "Emision y administracion de certificados (requiere autenticacion)")
public class CertificateController {

    private final CertificateService service;
    private final CertificateMapper mapper;

    public CertificateController(CertificateService service, CertificateMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @GetMapping
    public List<CertificateResponse> findAll() {
        return service.findAll().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    public CertificateResponse findById(@PathVariable UUID id) {
        return mapper.toResponse(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<CertificateResponse> issue(@Valid @RequestBody CertificateRequest request) {
        var created = service.issue(request);
        return ResponseEntity.status(201).body(mapper.toResponse(created));
    }

    @PostMapping("/{id}/revoke")
    public CertificateResponse revoke(@PathVariable UUID id) {
        return mapper.toResponse(service.revoke(id));
    }
}
