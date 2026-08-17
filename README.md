# Certifica — Plataforma de emisión y validación de certificados

Aplicación full-stack para emitir certificados de cursos/capacitaciones en PDF con código QR de validación pública, y verificar su autenticidad sin necesidad de login.

## Arquitectura

```
Frontend (React + TS + Vite)  ──supabase-js──>  Supabase (Postgres + RLS, Auth, Storage)
        │
        └──fetch, 1 endpoint──> Vercel Function /api/certificates ──service_role──> Supabase
```

- **Frontend**: React 18 + TypeScript + Vite, desplegado en Vercel. Panel Admin protegido (Supabase Auth) + página pública `/verify/:code`.
- **Backend**: una sola Vercel Function (`frontend/api/certificates.ts`) para emitir certificados (genera código, QR, PDF y los sube a Supabase Storage). Todo lo demás (login, CRUD de instituciones/cursos, listar/revocar certificados, verificación pública) es `supabase-js` directo desde el navegador, protegido por Row Level Security.
- **Base de datos**: PostgreSQL en Supabase. Esquema y políticas RLS en `supabase/migrations/0001_init_schema.sql`.
- **Archivos**: los PDFs de certificados y sus QR se generan en la Vercel Function y se suben a Supabase Storage (bucket `certificates`); solo se persiste la URL en la base de datos.
- **Autenticación**: Supabase Auth. Solo existen administradores (creados con `frontend/scripts/create-admin.ts`, nunca por registro público).
- **Correo**: Resend, configurado como SMTP de Supabase Auth para la recuperación de contraseña del panel Admin.

No hay servidor backend tradicional ni Render en esta arquitectura — ver el diseño completo en `docs/superpowers/specs/2026-08-17-vercel-supabase-migration-design.md`.

## Estructura del repositorio

```
GLOBAL-SST/
├── frontend/                    React + TS + Vite (panel Admin + verificacion publica)
│   ├── api/certificates.ts      Unica Vercel Function (emision de certificados)
│   └── scripts/create-admin.ts  Script local para crear el primer admin
├── supabase/migrations/         Esquema SQL + RLS + funcion publica de verificacion
└── docs/superpowers/            Specs y planes de las migraciones/features
```

## 1. Requisitos previos

- Cuenta en [Supabase](https://supabase.com), [Vercel](https://vercel.com) y [Resend](https://resend.com).
- Node.js 20+.

## 2. Configurar Supabase

1. Crea un proyecto en Supabase (o usa el existente).
2. En **SQL Editor**, pega y corre el contenido de `supabase/migrations/0001_init_schema.sql`.
3. En **Storage**, confirma que existe el bucket público `certificates`.
4. En **Project Settings → Auth → SMTP Settings**, configura Resend como proveedor SMTP (host/puerto de Resend, usuario `resend`, contraseña = tu `RESEND_API_KEY`).
5. En **Project Settings → API**, copia `Project URL` y `anon public key` (para `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) y el `service_role key` (secreto, para `SUPABASE_SERVICE_ROLE_KEY`).

## 3. Crear el primer administrador

```powershell
cd frontend
$env:SUPABASE_URL="https://xxxx.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="..."; $env:ADMIN_EMAIL="admin@tuempresa.com"; $env:ADMIN_PASSWORD="una-contrasena-segura"; $env:ADMIN_FULL_NAME="Nombre Apellido"; npx tsx scripts/create-admin.ts
```

No existe (ni debe existir) un endpoint público de registro.

## 4. Frontend — desarrollo local

```bash
cd frontend
cp .env.example .env   # completa VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

App disponible en `http://localhost:5173`. La Vercel Function corre solo en Vercel/`vercel dev` — en `npm run dev` puro, emitir certificados fallará salvo que uses `vercel dev` en su lugar.

## 5. Despliegue en Vercel

1. Importa el repositorio en Vercel, **Root Directory: `frontend`**.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Variables de entorno:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (cliente)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (solo la función, sin prefijo `VITE_`)
   - `PUBLIC_BASE_URL` (el dominio final de Vercel, ej. `https://global-sst.vercel.app`)
4. Despliega. `vercel.json` ya configura el rewrite SPA para React Router; Vercel prioriza `frontend/api/*` sobre el rewrite automáticamente.

## 6. Flujo de emisión y validación

1. El Admin inicia sesión en `/login` (Supabase Auth).
2. Crea una Institución y al menos un Curso.
3. Emite un certificado: la Vercel Function genera código, QR, PDF, sube ambos a Storage y guarda el certificado.
4. Cualquier persona que escanee el QR o visite `/verify/{codigo}` ve la validación pública, sin autenticarse — resuelto por la función SQL `verify_certificate_by_code`, que solo devuelve un certificado si el código coincide exactamente.

## 7. Calidad de código

- **RLS como capa de seguridad principal**: instituciones, cursos y certificados solo son escribibles/legibles por administradores (`is_admin()` en `supabase/migrations/0001_init_schema.sql`); el único acceso público es la función de verificación.
- **Una sola función serverless**: `frontend/api/certificates.ts`, la única operación que necesita Node y la `service_role` key.
- **Tests**: lógica pura de la función (`frontend/api/_lib/`) cubierta con Vitest.

## 8. Próximos pasos (fuera de alcance de esta migración)

Ver `docs/superpowers/specs/2026-08-17-vercel-supabase-migration-design.md`, §12: Personas + certificados múltiples por persona + búsqueda pública por documento, Auditoría, Carga masiva CSV/Excel, Estadísticas.
