# Fase 1 — Migración de Certifica a Vercel + Supabase (paridad funcional)

Fecha: 2026-08-17

## 1. Contexto y objetivo

Certifica corre hoy como: frontend React/Vite en Vercel + backend Spring Boot en Render + PostgreSQL/Storage en Supabase. El objetivo es eliminar Render y cualquier servidor backend tradicional, dejando **solo Vercel (frontend + funciones serverless) y Supabase (Postgres, Storage, Auth)**, manteniendo Resend para correo.

Esta fase cubre **únicamente paridad funcional** con lo que existe hoy: Instituciones, Cursos, Certificados (emitir/listar/revocar), login admin, recuperación de contraseña, verificación pública por código. **No incluye** Personas, búsqueda pública por documento, auditoría, carga masiva ni estadísticas — esas son fases futuras independientes (ver §12).

Restricción dura que gobierna todo el diseño: Vercel Functions no ejecuta JVM. Toda la lógica de `backend/src/main/java/com/certifica/{service,controller,security}` se reimplementa en TypeScript; el código Java queda como referencia de comportamiento, no se traduce línea a línea.

## 2. Arquitectura

**Enfoque elegido: Supabase como backend primario + una sola Vercel Function.**

El frontend habla directo con Supabase (`supabase-js`, clave `anon`) para sesión/login, todas las lecturas y las escrituras que una política RLS simple puede proteger (crear institución/curso, revocar certificado). Solo la emisión de certificados pasa por una función serverless, porque es la única operación que necesita Node (generar QR/PDF) y la `service_role` key (que nunca debe llegar al navegador).

```
Browser (React) ──supabase-js (anon key)──> Supabase (Postgres + RLS, Auth, Storage)
       │
       └──fetch, Authorization: Bearer <jwt>──> POST /api/certificates (Vercel Function, service_role key)
                                                        │
                                                        └──> Supabase (insert + Storage upload)
```

Se descartó reescribir cada endpoint actual como función Vercel (equivalente en volumen de código a Spring Boot, sin aprovechar RLS).

## 3. Modelo de datos

Migración SQL para Supabase (reemplaza `V1__init_schema.sql`, sin Flyway — se aplica vía SQL Editor de Supabase o `supabase db push`):

```sql
create extension if not exists pgcrypto;

-- Vincula un usuario de Supabase Auth con el rol admin.
-- No hay password_hash/reset_token aqui: eso lo maneja Supabase Auth.
create table admin_profile (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   varchar(255) not null,
  created_at  timestamptz not null default now()
);

create table institution (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(255) not null,
  slug        varchar(255) not null unique,
  logo_url    varchar(500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table course (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references institution(id) on delete cascade,
  name            varchar(255) not null,
  hours           integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table certificate (
  id                uuid primary key default gen_random_uuid(),
  code              varchar(64) not null unique,
  institution_id    uuid not null references institution(id),
  course_id         uuid not null references course(id),
  recipient_name    varchar(255) not null,
  recipient_email   varchar(255),
  issue_date        date not null,
  status            varchar(20) not null default 'ACTIVE',
  pdf_url           varchar(500),
  qr_url            varchar(500),
  created_by        uuid references admin_profile(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_certificate_code on certificate(code);
create index idx_certificate_institution on certificate(institution_id);
create index idx_course_institution on course(institution_id);
```

`certificate.created_by` es campo nuevo (no existe hoy): es gratis agregarlo ahora y evita una migración futura cuando se quiera saber "quién emitió qué" — no se explota en Fase 1 más allá de guardarlo.

## 4. Seguridad: RLS + función de verificación pública

Nada de acceso directo de `anon` a las tablas base. La única puerta pública es una función `SECURITY DEFINER` que exige un código exacto — **no** una vista pública sin filtro (una vista sin parámetro permitiría a cualquiera listar todos los certificados vía la API REST de Supabase, algo que el backend actual nunca permite).

```sql
alter table admin_profile enable row level security;
alter table institution   enable row level security;
alter table course        enable row level security;
alter table certificate   enable row level security;

create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from admin_profile where id = auth.uid());
$$;
grant execute on function is_admin() to authenticated;

create policy admin_profile_select_own on admin_profile
  for select using (id = auth.uid());

create policy institution_admin_all on institution
  for all using (is_admin()) with check (is_admin());

create policy course_admin_all on course
  for all using (is_admin()) with check (is_admin());

create policy certificate_admin_all on certificate
  for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on institution, course, certificate to authenticated;
grant select on admin_profile to authenticated;

-- Unica via publica: exige codigo exacto, no permite listar.
create or replace function verify_certificate_by_code(p_code text)
returns table (
  code varchar, recipient_name varchar, issue_date date, status varchar,
  pdf_url varchar, course_name varchar, institution_name varchar
)
language sql security definer stable set search_path = public as $$
  select c.code, c.recipient_name, c.issue_date, c.status, c.pdf_url,
         co.name, i.name
  from certificate c
  join course co on co.id = c.course_id
  join institution i on i.id = c.institution_id
  where c.code = p_code;
$$;
grant execute on function verify_certificate_by_code(text) to anon, authenticated;
```

Frontend público llama `supabase.rpc('verify_certificate_by_code', { p_code: code })`.

## 5. Autenticación

- **Alta de admin**: script local `frontend/scripts/create-admin.ts`, corre una vez con la `service_role` key desde un `.env` local (nunca se despliega, ya está en `.gitignore`). Usa `supabase.auth.admin.createUser({ email, password, email_confirm: true })` y luego inserta la fila en `admin_profile`. Reemplaza `AdminBootstrapRunner`. No existe endpoint público de registro.
- **Login**: `supabase.auth.signInWithPassword(email, password)` desde el frontend. Reemplaza `AuthService.login` + `JwtService` + `JwtAuthFilter` + `SecurityConfig` por completo — Supabase emite y valida el JWT.
- **Sesión**: `AuthContext` guarda el `Session` de Supabase (`getSession()` al montar + listener `onAuthStateChange`), no más `localStorage` manual de token.
- **Recuperar contraseña**: `supabase.auth.resetPasswordForEmail(email, { redirectTo })`, con **Resend configurado como SMTP de Supabase** (Project Settings → Auth → SMTP Settings: host/puerto de Resend, API key como password). Resend sigue siendo el transporte de correo, pero sin código propio — elimina `EmailService`, `reset_token`/`reset_token_expires_at`, y los endpoints `forgot-password`/`reset-password`.
- **Gap a cerrar**: hoy el frontend no tiene ningún link ni formulario de "olvidé mi contraseña" (el backend lo soporta pero la UI nunca lo expone). Fase 1 agrega: link en `LoginPage`, un pequeño formulario de solicitud, y una página nueva `ResetPasswordPage` que atiende el redirect de Supabase y llama `supabase.auth.updateUser({ password })`.

## 6. Emisión de certificados — la única Vercel Function

`frontend/api/certificates.ts` (Vercel detecta automáticamente `api/*.ts` como función serverless; convive sin conflicto con el rewrite SPA de `vercel.json` porque Vercel prioriza rutas de filesystem/funciones sobre rewrites).

Contrato: `POST /api/certificates`, header `Authorization: Bearer <access_token de la sesion admin>`.

1. Valida el JWT contra Supabase (`supabase.auth.getUser(token)`), verifica que el `user.id` exista en `admin_profile` (403 si no).
2. Valida el body (`institutionId`, `courseId`, `recipientName`, `issueDate` requeridos) — reemplaza la validación `@Valid` de `CertificateRequest`.
3. Genera código único (mismo alfabeto/longitud que hoy, `SecureRandom` → `crypto.randomInt`), reintenta si choca con `existsByCode`.
4. Genera QR PNG (paquete `qrcode`) apuntando a `${PUBLIC_BASE_URL}/verify/{code}`.
5. Genera PDF (paquete `pdf-lib`, mismo layout que `PdfGenerationService`: título, institución, nombre, curso, fecha, código, QR embebido).
6. Sube QR y PDF a Supabase Storage (bucket `certificates`, misma ruta `{institutionSlug}/{año}/...`) usando `service_role` key.
7. Inserta el certificado (`service_role`, bypassa RLS deliberadamente — la función ya validó que quien llama es admin).
8. Devuelve el certificado creado (201) o un error claro (400/401/403/500), en el mismo espíritu que `GlobalExceptionHandler`.

Revocar (`update certificate set status='REVOKED'`) y todo el CRUD de instituciones/cursos van directo desde el cliente vía `supabase-js`, sin pasar por esta función — RLS ya los protege.

## 7. Cambios en el frontend

- Nuevo `src/api/supabaseClient.ts`: instancia única de `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`.
- `src/api/institutions.ts`, `src/api/courses.ts`: reescritos sobre `.from(tabla).select()/.insert()/.delete()`.
- `src/api/certificates.ts`: `listCertificates`/`revokeCertificate` via `supabase-js`; `issueCertificate` via `fetch('/api/certificates', ...)`; `verifyCertificate` via `supabase.rpc('verify_certificate_by_code', ...)`.
- `src/api/auth.ts`: envuelve `signInWithPassword`, `signOut`, `resetPasswordForEmail`, `updateUser`.
- `AuthContext`: expone `session`/`email`/`isAuthenticated` derivados de la sesión de Supabase.
- `ProtectedRoute`: sin cambios de comportamiento, solo la fuente de `isAuthenticated`.
- `types/index.ts`: se elimina `AuthResponse` (se usa el tipo `Session` de `@supabase/supabase-js`); el resto de tipos no cambia de forma.
- Nueva página `ResetPasswordPage.tsx` + entrada de ruta pública `/reset-password`.
- `package.json`: agrega `@supabase/supabase-js`, `qrcode`, `pdf-lib`; quita `axios`.
- Variables de entorno del frontend: quita `VITE_API_BASE_URL`, agrega `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## 8. Qué se elimina del repo

- Todo `backend/` (Spring Boot, `Dockerfile`, `docker-compose.yml`, migraciones Flyway).
- `application-prod.properties` y toda env var `DB_*`, `JWT_*`, `SPRING_PROFILES_ACTIVE`, `ADMIN_BOOTSTRAP_*`.
- Referencias a `onrender.com` en frontend y `README.md`.
- `axios` como dependencia.

## 9. Variables de entorno finales

**Vercel (proyecto frontend):**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (cliente, seguro exponer)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (solo la función `api/certificates.ts`, nunca con prefijo `VITE_`)
- `PUBLIC_BASE_URL` (ej. `https://global-sst.vercel.app`, usado por la función para construir la URL del QR)

**Supabase (dashboard, no en código):**
- Auth → SMTP: host/puerto/usuario/`RESEND_API_KEY` de Resend
- Storage: bucket `certificates` (público, ya existe)

**Local (`frontend/.env`, solo para correr `scripts/create-admin.ts`):**
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`

## 10. Orden de corte (cutover)

1. Aplicar el SQL de §3-4 en el proyecto Supabase existente (ya tiene los datos/Storage actuales — solo se agrega `admin_profile`, se quita `admin_user`, se agregan políticas y la función).
2. Configurar SMTP de Resend en Supabase Auth.
3. Correr `scripts/create-admin.ts` localmente para crear el primer admin.
4. Implementar y desplegar los cambios de frontend + `api/certificates.ts` a Vercel (preview).
5. Probar contra el preview (checklist §11).
6. Actualizar env vars de producción en Vercel, promover a producción.
7. Apagar el servicio de Render.
8. Verificar producción con el mismo checklist.

## 11. Verificación

- Login admin funciona y `ProtectedRoute` deja pasar.
- Crear institución/curso, listar, eliminar.
- Emitir certificado: código único, QR y PDF suben a Storage, certificado aparece en la tabla.
- Revocar certificado, estado cambia.
- `/verify/{code}` público resuelve sin sesión, muestra los datos correctos.
- `/verify/{code-inexistente}` muestra "no encontrado", no expone otros certificados.
- Confirmar que `GET` directo a `verify_certificate_by_code` sin código, o a las tablas base vía REST de Supabase con la `anon` key, no devuelve datos (RLS/permiso denegado).
- Flujo de recuperación de contraseña de punta a punta (solicitar → correo via Resend → set nueva contraseña → login con la nueva).

## 12. Fases futuras (fuera de alcance de este spec)

Quedan registradas para specs independientes, en este orden: (2) Personas + certificados múltiples por persona + búsqueda pública por documento, (3) Auditoría, (4) Carga masiva CSV/Excel, (5) Estadísticas. Cada una obtiene su propio diseño y plan cuando se aborde.
