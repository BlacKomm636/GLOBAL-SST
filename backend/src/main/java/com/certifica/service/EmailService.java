package com.certifica.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

/**
 * Envio de correos transaccionales via Resend (recuperacion de contrasena,
 * bienvenida opcional, notificaciones futuras). API key exclusivamente
 * por variable de entorno.
 */
@Service
public class EmailService {

    private final WebClient webClient;

    @Value("${resend.api-key}")
    private String apiKey;

    @Value("${resend.from-email}")
    private String fromEmail;

    public EmailService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl("https://api.resend.com").build();
    }

    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        String html = "<p>Recibimos una solicitud para restablecer tu contrasena.</p>"
                + "<p><a href=\"" + resetLink + "\">Haz clic aqui para crear una nueva contrasena</a></p>"
                + "<p>Si no solicitaste esto, ignora este correo.</p>";

        send(toEmail, "Recuperacion de contrasena - Certifica", html);
    }

    public void sendWelcomeEmail(String toEmail, String fullName) {
        String html = "<p>Hola " + fullName + ",</p><p>Tu cuenta de administrador fue creada correctamente.</p>";
        send(toEmail, "Bienvenido a Certifica", html);
    }

    private void send(String to, String subject, String html) {
        webClient.post()
                .uri("/emails")
                .header("Authorization", "Bearer " + apiKey)
                .bodyValue(Map.of(
                        "from", fromEmail,
                        "to", new String[]{to},
                        "subject", subject,
                        "html", html
                ))
                .retrieve()
                .toBodilessEntity()
                .block();
    }
}
