package com.certifica.service;

import com.certifica.domain.AdminUser;
import com.certifica.dto.request.ForgotPasswordRequest;
import com.certifica.dto.request.LoginRequest;
import com.certifica.dto.request.ResetPasswordRequest;
import com.certifica.dto.response.AuthResponse;
import com.certifica.exception.BadRequestException;
import com.certifica.exception.UnauthorizedException;
import com.certifica.repository.AdminUserRepository;
import com.certifica.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/** Autenticacion del panel Admin: login con JWT y flujo de recuperacion de contrasena via Resend. */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final long RESET_TOKEN_TTL_MINUTES = 30;

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;

    @Value("${app.public-verify-base-url}")
    private String publicBaseUrl;

    public AuthService(AdminUserRepository adminUserRepository, PasswordEncoder passwordEncoder,
                        JwtService jwtService, EmailService emailService) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }

    public AuthResponse login(LoginRequest request) {
        AdminUser user = adminUserRepository.findByEmail(request.email())
                .orElseThrow(() -> new UnauthorizedException("Credenciales invalidas"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Credenciales invalidas");
        }

        String token = jwtService.generateToken(user.getEmail());
        log.info("Login exitoso para admin {}", user.getEmail());
        return new AuthResponse(token, jwtService.getExpirationMs(), user.getEmail(), user.getFullName());
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        adminUserRepository.findByEmail(request.email()).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            user.setResetToken(token);
            user.setResetTokenExpiresAt(Instant.now().plusSeconds(RESET_TOKEN_TTL_MINUTES * 60));
            adminUserRepository.save(user);

            String resetLink = publicBaseUrl.replace("/verify", "/reset-password") + "?token=" + token;
            emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
        });
        // No revelamos si el email existe o no, por seguridad.
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        AdminUser user = adminUserRepository.findByResetToken(request.token())
                .orElseThrow(() -> new BadRequestException("Token invalido o expirado"));

        if (user.getResetTokenExpiresAt() == null || user.getResetTokenExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Token invalido o expirado");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiresAt(null);
        adminUserRepository.save(user);
    }
}
