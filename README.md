# Certifica — Plataforma de emisión y validación de certificados

Aplicación full-stack para emitir certificados de cursos/capacitaciones en PDF con código QR de validación pública, y verificar su autenticidad sin necesidad de login.

## Arquitectura

```
Frontend (React + TS + Vite)  ──REST/JSON──>  Backend (Spring Boot 3 + Java 21)
        │                                              │
        ▼                                              ▼
     Vercel                                   Render + PostgreSQL (Supabase)
                                                        │
                                                        ▼
                                          Supabase Storage (PDFs + QR)
                                                        │
                                                        ▼
                                                Resend (emails)
```

- **Frontend**: React 18 + TypeScript + Vite, desplegado en Vercel. Panel Admin protegido (login JWT) + página pública `/verify/:code`.
- **Backend**: Java 21 + Spring Boot 3 + Spring Security + JWT, desplegado en Render como contenedor Docker. API REST documentada con Swagger/OpenAPI.
- **Base de datos**: PostgreSQL en Supabase, migraciones con Flyway.
- **Archivos**: los PDFs de certificados y sus QR se generan en el backend y se suben a Supabase Storage; solo se persiste la URL en la base de datos.
- **Correo**: Resend, usado para recuperación de contraseña del panel Admin.

## Estructura del repositorio

```
certifica-app/
├── backend/     Spring Boot 3 (API REST)
└── frontend/    React + TS + Vite (panel Admin + verificación pública)
```

Cada carpeta es un proyecto independiente con su propio repositorio Git recomendado (o puedes usar un monorepo con dos repos en GitHub, uno por carpeta, según prefieras conectar Render/Vercel).

---

## 1. Requisitos previos

- Cuenta en [Supabase](https://supabase.com), [Render](https://render.com), [Vercel](https://vercel.com) y [Resend](https://resend.com).
- Java 21 y Maven 3.9+ (solo para desarrollo local del backend).
- Node.js 20+ (solo para desarrollo local del frontend).
- Docker (opcional, para levantar Postgres local).

---

## 2. Configurar Supabase (base de datos + storage)

1. Crea un proyecto nuevo en Supabase.
2. En **Project Settings → Database**, copia la cadena de conexión (host, puerto 5432, usuario `postgres`, contraseña). Esto alimenta `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.
3. En **Storage**, crea un bucket llamado `certificates` (o el nombre que definas en `SUPABASE_STORAGE_BUCKET`). Márcalo como **público** para que las URLs de los PDFs y QR sean accesibles sin autenticación (son certificados públicos por diseño).
4. En **Project Settings → API**, copia:
   - `Project URL` → `SUPABASE_URL`
   - `service_role key` (secreta, nunca la anon key) → `SUPABASE_SERVICE_ROLE_KEY`
5. Las migraciones de Flyway (`backend/src/main/resources/db/migration`) crean el esquema automáticamente la primera vez que arranca el backend contra esta base de datos. No es necesario ejecutar SQL manualmente.

Los archivos quedan organizados dentro del bucket como `{institutionSlug}/{año}/{codigo}.pdf` y `{institutionSlug}/{año}/{codigo}-qr.png`.

---

## 3. Configurar Resend (correo)

1. Crea una cuenta en Resend y verifica un dominio (o usa el dominio de pruebas que ofrece Resend para desarrollo).
2. Genera una API Key → `RESEND_API_KEY`.
3. Define el remitente verificado → `RESEND_FROM_EMAIL`.

---

## 4. Backend — desarrollo local

```bash
cd backend
cp .env.example .env   # completar valores, o exportarlos en tu shell

# Levantar Postgres local con Docker (alternativa a usar Supabase en dev)
docker compose up -d

# Ejecutar la aplicación (perfil por defecto = desarrollo)
mvn spring-boot:run
```

- API disponible en `http://localhost:8080`.
- Swagger UI: `http://localhost:8080/swagger-ui.html`.
- Al iniciar por primera vez sin usuarios, se crea automáticamente un admin con `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` (cámbiala después de tu primer login).

### Variables de entorno del backend

Ver `backend/.env.example` para la lista completa. En desarrollo, Spring lee `application.properties`; en producción, `application-prod.properties` (activado con `SPRING_PROFILES_ACTIVE=prod`), y todos los valores sensibles vienen de variables de entorno del proveedor (Render), nunca del código fuente.

---

## 5. Backend — despliegue en Render

1. Sube la carpeta `backend/` a un repositorio de GitHub.
2. En Render, crea un **Web Service** nuevo → **Deploy from a Git repository**, apuntando a ese repo.
3. Render detectará el `Dockerfile` automáticamente (Environment: Docker).
4. En **Environment**, agrega las variables de entorno (mismas claves que `.env.example`):
   - `SPRING_PROFILES_ACTIVE=prod`
   - `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` (de Supabase)
   - `JWT_SECRET` (genera uno largo y aleatorio, ej. `openssl rand -base64 48`)
   - `JWT_EXPIRATION_MS`
   - `CORS_ALLOWED_ORIGINS` (la URL de tu frontend en Vercel, ej. `https://certifica.vercel.app`)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`
   - `PUBLIC_VERIFY_BASE_URL` (ej. `https://certifica.vercel.app/verify`)
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
   - `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`
5. Despliega. Render construye la imagen con el `Dockerfile` multi-stage y expone el puerto 8080.
6. Verifica `https://<tu-servicio>.onrender.com/swagger-ui.html`.

---

## 6. Frontend — desarrollo local

```bash
cd frontend
cp .env.example .env   # define VITE_API_BASE_URL=http://localhost:8080/api/v1
npm install
npm run dev
```

App disponible en `http://localhost:5173`.

---

## 7. Frontend — despliegue en Vercel

1. Sube la carpeta `frontend/` a un repositorio de GitHub.
2. En Vercel, **Add New Project** → importa el repositorio (Root Directory: `frontend` si usas un monorepo).
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Variables de entorno en Vercel:
   - `VITE_API_BASE_URL` → URL pública del backend en Render + `/api/v1` (ej. `https://certifica-backend.onrender.com/api/v1`)
5. Despliega. El archivo `vercel.json` incluido configura el rewrite de rutas para que React Router funcione correctamente en producción (SPA).
6. Una vez desplegado, vuelve a Render y actualiza `CORS_ALLOWED_ORIGINS` y `PUBLIC_VERIFY_BASE_URL` con el dominio final de Vercel.

---

## 8. Flujo de emisión y validación

1. El Admin inicia sesión en `/login` (JWT).
2. Crea una Institución y al menos un Curso.
3. Emite un certificado indicando receptor, curso y fecha. El backend:
   - genera un código único,
   - genera el QR apuntando a `{PUBLIC_VERIFY_BASE_URL}/{codigo}`,
   - genera el PDF con el QR embebido,
   - sube ambos archivos a Supabase Storage,
   - guarda únicamente sus URLs en PostgreSQL.
4. Cualquier persona que escanee el QR o visite `/verify/{codigo}` ve la validación pública, sin necesidad de autenticarse.

---

## 9. Calidad de código

- **Capas**: `controller` → `service` → `repository` → `domain`, con `dto` y `mapper` separados (Repository Pattern, DTO Pattern, Mapper Pattern).
- **SOLID / Clean Code**: servicios con responsabilidad única, inyección de dependencias por constructor, sin lógica de negocio en los controllers.
- **Validación centralizada**: Bean Validation en los DTO de entrada.
- **Manejo global de excepciones**: `GlobalExceptionHandler` (`@RestControllerAdvice`) traduce excepciones de negocio a respuestas HTTP consistentes.
- **Logging estructurado**: patrón uniforme vía Logback (`logback-spring.xml`), niveles configurables por entorno.
- **Seguridad**: JWT stateless, contraseñas con BCrypt, CORS restringido por variable de entorno, ningún secreto en el código fuente.
- **Escalabilidad**: agregar un nuevo módulo (ej. un nuevo tipo de certificado o un nuevo rol) implica añadir entidad + repo + service + dto + mapper + controller siguiendo el mismo patrón, sin tocar la configuración central de seguridad, CORS o Swagger.

## 10. Próximos pasos sugeridos (fuera del alcance de esta v1)

- Rol adicional "Emisor" con permisos delegados por institución.
- Registro de receptores como usuarios (para que vean su propio historial de certificados).
- Notificación automática por correo al emitir un certificado (el servicio de email ya está listo, solo falta invocarlo en `CertificateService.issue`).
- Tests de integración automatizados (`@SpringBootTest` + Testcontainers) además del test de contexto incluido.
