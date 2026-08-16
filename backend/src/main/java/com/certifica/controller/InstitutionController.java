package com.certifica.controller;

import com.certifica.dto.request.InstitutionRequest;
import com.certifica.dto.response.InstitutionResponse;
import com.certifica.mapper.InstitutionMapper;
import com.certifica.service.InstitutionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/institutions")
@Tag(name = "Institutions", description = "Gestion de instituciones emisoras (requiere autenticacion)")
public class InstitutionController {

    private final InstitutionService service;
    private final InstitutionMapper mapper;

    public InstitutionController(InstitutionService service, InstitutionMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @GetMapping
    public List<InstitutionResponse> findAll() {
        return service.findAll().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    public InstitutionResponse findById(@PathVariable UUID id) {
        return mapper.toResponse(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<InstitutionResponse> create(@Valid @RequestBody InstitutionRequest request) {
        var created = service.create(request);
        return ResponseEntity.status(201).body(mapper.toResponse(created));
    }

    @PutMapping("/{id}")
    public InstitutionResponse update(@PathVariable UUID id, @Valid @RequestBody InstitutionRequest request) {
        return mapper.toResponse(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
