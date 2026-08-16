package com.certifica.config;

import com.certifica.domain.AdminUser;
import com.certifica.repository.AdminUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea el primer usuario admin al iniciar la aplicacion si todavia no existe
 * ninguno, usando las credenciales de ADMIN_BOOTSTRAP_EMAIL / _PASSWORD.
 * Util para el primer despliegue sin necesitar acceso directo a la base de datos.
 */
@Component
public class AdminBootstrapRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final AdminUserRepository repository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin-bootstrap.email}")
    private String bootstrapEmail;

    @Value("${app.admin-bootstrap.password}")
    private String bootstrapPassword;

    public AdminBootstrapRunner(AdminUserRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (repository.count() == 0) {
            AdminUser admin = AdminUser.builder()
                    .email(bootstrapEmail)
                    .passwordHash(passwordEncoder.encode(bootstrapPassword))
                    .fullName("Administrador")
                    .build();
            repository.save(admin);
            log.warn("Admin inicial creado con email {}. Cambia la contrasena despues del primer login.", bootstrapEmail);
        }
    }
}
