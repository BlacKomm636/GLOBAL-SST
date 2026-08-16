package com.certifica;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class CertificaApplicationTests {

    @Test
    void contextLoads() {
        // Verifica que todo el contexto de Spring (seguridad, JPA, beans) arranca sin errores.
    }
}
