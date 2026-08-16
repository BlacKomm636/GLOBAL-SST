package com.certifica.service;

import com.certifica.domain.Certificate;
import com.certifica.domain.CertificateStatus;
import com.certifica.domain.Course;
import com.certifica.domain.Institution;
import com.certifica.dto.request.CertificateRequest;
import com.certifica.exception.ResourceNotFoundException;
import com.certifica.repository.CertificateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Year;
import java.util.List;
import java.util.UUID;

/**
 * Orquesta la emision de un certificado: genera un codigo publico unico,
 * el QR apuntando a la URL de verificacion, el PDF con el QR embebido,
 * sube el PDF a Supabase Storage organizado por institucion/anio, y
 * persiste solo las URLs resultantes (nunca el binario) en la base de datos.
 */
@Service
public class CertificateService {

    private static final Logger log = LoggerFactory.getLogger(CertificateService.class);
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final CertificateRepository repository;
    private final InstitutionService institutionService;
    private final CourseService courseService;
    private final QrCodeService qrCodeService;
    private final PdfGenerationService pdfGenerationService;
    private final StorageService storageService;

    @Value("${app.public-verify-base-url}")
    private String publicVerifyBaseUrl;

    public CertificateService(CertificateRepository repository, InstitutionService institutionService,
                               CourseService courseService, QrCodeService qrCodeService,
                               PdfGenerationService pdfGenerationService, StorageService storageService) {
        this.repository = repository;
        this.institutionService = institutionService;
        this.courseService = courseService;
        this.qrCodeService = qrCodeService;
        this.pdfGenerationService = pdfGenerationService;
        this.storageService = storageService;
    }

    @Transactional(readOnly = true)
    public List<Certificate> findAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public Certificate findById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificado no encontrado: " + id));
    }

    @Transactional(readOnly = true)
    public Certificate findByCodeActive(String code) {
        return repository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Certificado no encontrado"));
    }

    @Transactional
    public Certificate issue(CertificateRequest request) {
        Institution institution = institutionService.findById(request.institutionId());
        Course course = courseService.findById(request.courseId());

        Certificate certificate = Certificate.builder()
                .code(generateUniqueCode())
                .institution(institution)
                .course(course)
                .recipientName(request.recipientName())
                .recipientEmail(request.recipientEmail())
                .issueDate(request.issueDate())
                .status(CertificateStatus.ACTIVE)
                .build();

        // Persistimos primero para tener code/id estables antes de generar archivos.
        certificate = repository.save(certificate);

        String verificationUrl = publicVerifyBaseUrl + "/" + certificate.getCode();
        byte[] qrPng = qrCodeService.generateQrPng(verificationUrl);
        byte[] pdf = pdfGenerationService.generateCertificatePdf(certificate, qrPng);

        String folder = institution.getSlug() + "/" + Year.now().getValue();
        String qrUrl = storageService.upload(folder, certificate.getCode() + "-qr.png", qrPng, MediaType.IMAGE_PNG);
        String pdfUrl = storageService.upload(folder, certificate.getCode() + ".pdf", pdf, MediaType.APPLICATION_PDF);

        certificate.setQrUrl(qrUrl);
        certificate.setPdfUrl(pdfUrl);
        certificate = repository.save(certificate);

        log.info("Certificado emitido: {} para {}", certificate.getCode(), certificate.getRecipientName());
        return certificate;
    }

    @Transactional
    public Certificate revoke(UUID id) {
        Certificate certificate = findById(id);
        certificate.setStatus(CertificateStatus.REVOKED);
        log.info("Certificado revocado: {}", certificate.getCode());
        return repository.save(certificate);
    }

    private String generateUniqueCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) {
                sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            code = sb.toString();
        } while (repository.existsByCode(code));
        return code;
    }
}
