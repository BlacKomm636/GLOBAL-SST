# Migración Certifica a Vercel + Supabase (Fase 1) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar Render y Spring Boot; dejar Certifica corriendo solo en Vercel (frontend + una función serverless) y Supabase (Postgres/RLS, Auth, Storage), con Resend como SMTP de Supabase Auth — con paridad funcional exacta a lo que existe hoy.

**Architecture:** El frontend habla directo con Supabase (`supabase-js`, clave `anon`) para sesión, lecturas y escrituras protegidas por RLS. Solo la emisión de certificados pasa por una Vercel Function (`frontend/api/certificates.ts`) porque necesita Node (QR/PDF) y la `service_role` key.

**Tech Stack:** React 18 + TypeScript + Vite (sin cambios), `@supabase/supabase-js`, `qrcode`, `pdf-lib`, Vitest (nuevo), Vercel Functions (`@vercel/node`).

**Spec:** `docs/superpowers/specs/2026-08-17-vercel-supabase-migration-design.md`

## Global Constraints

- La `SUPABASE_SERVICE_ROLE_KEY` nunca se usa en código que corre en el navegador (solo en `frontend/api/*` y en `frontend/scripts/create-admin.ts`).
- No se reintroduce ningún endpoint público de registro de administradores.
- La única vía pública de lectura de certificados es la función `verify_certificate_by_code` (nunca una tabla/vista sin filtro).
- Todas las variables de entorno del cliente llevan el prefijo `VITE_`; las de servidor, nunca.
- Mantener los nombres de función exportados de `src/api/*.ts` (`listInstitutions`, `createInstitution`, `deleteInstitution`, `listCourses`, `createCourse`, `deleteCourse`, `listCertificates`, `issueCertificate`, `revokeCertificate`, `verifyCertificate`) para no tener que tocar las páginas ya migradas al nuevo sistema visual.

---

## Task 1: Eliminar backend Spring Boot y referencias a Render

**Files:**
- Delete: `backend/` (directorio completo)
- Delete: `.github/modernize/java-upgrade/` (tooling específico del backend Java)
- Modify: `README.md` (reemplazo completo)

**Interfaces:**
- Consumes: nada (primer task, sin dependencias)
- Produces: repo limpio de Java/Render; nada de código nuevo consumido por tasks siguientes

- [ ] **Step 1: Eliminar el backend y el tooling asociado**

```bash
git rm -r backend
git rm -r .github/modernize/java-upgrade
```

- [ ] **Step 2: Reemplazar README.md**

Reemplaza todo el contenido de `README.md` por:

```markdown
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
```

- [ ] **Step 3: Buscar referencias residuales a Render/onrender.com**

```bash
grep -ril "onrender\|render.com\|spring-boot\|springframework" --exclude-dir=node_modules --exclude-dir=.git . || echo "sin coincidencias"
```

Expected: `sin coincidencias` (o solo coincidencias dentro de `docs/superpowers/specs/` y `docs/superpowers/plans/`, que documentan la migración y está bien que mencionen Render históricamente).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: eliminar backend Spring Boot y referencias a Render"
```

---

## Task 2: Migración SQL de Supabase (schema + RLS + función pública)

**Files:**
- Create: `supabase/migrations/0001_init_schema.sql`

**Interfaces:**
- Consumes: nada
- Produces: el archivo SQL que Task 3 (manual) aplica contra el proyecto real de Supabase. Define las tablas `admin_profile`, `institution`, `course`, `certificate`, la función `is_admin()`, las políticas RLS, y la función pública `verify_certificate_by_code(p_code text)` que Task 10 invoca vía `supabase.rpc(...)`.

- [ ] **Step 1: Crear el archivo de migración**

```bash
mkdir -p supabase/migrations
```

Crea `supabase/migrations/0001_init_schema.sql`:

```sql
-- ============================================================
-- Fase 1: esquema Certifica sobre Supabase (reemplaza V1__init_schema.sql
-- de Flyway/Spring Boot). Ver docs/superpowers/specs/2026-08-17-vercel-supabase-migration-design.md
-- ============================================================

create extension if not exists pgcrypto;

-- Vincula un usuario de Supabase Auth con el rol admin.
-- Sin password_hash/reset_token: eso lo maneja Supabase Auth.
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

-- ---------- RLS ----------

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

-- Unica via publica: exige codigo exacto, nunca permite listar todo.
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

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0001_init_schema.sql
git commit -m "feat: migracion SQL de esquema y RLS para Supabase"
```

---

## Task 3: [AVISO IMPORTANTE — MANUAL] Aplicar el SQL en Supabase y verificar

Esta tarea no se puede automatizar sin la conexión MCP a Supabase (falló en este entorno). Requiere que tú entres al dashboard.

- [ ] **Step 1:** Entra a tu proyecto en `https://supabase.com/dashboard` → **SQL Editor** → **New query**.
- [ ] **Step 2:** Pega el contenido completo de `supabase/migrations/0001_init_schema.sql` y ejecútalo (`Run`).
- [ ] **Step 3:** Verifica que no haya errores. Si `institution`/`course`/`certificate` ya existían de la app anterior (con datos reales), avísame antes de correr el script — hay que decidir si se conservan los datos o se empieza limpio; el script de arriba asume tablas nuevas (`create table`, no `create table if not exists`) y fallará si ya existen.
- [ ] **Step 4:** Corre esta consulta para confirmar que las políticas quedaron creadas:

```sql
select tablename, policyname from pg_policies where schemaname = 'public';
```

Expected: 4 filas (`admin_profile_select_own`, `institution_admin_all`, `course_admin_all`, `certificate_admin_all`).

- [ ] **Step 5:** Corre esta consulta para confirmar que la función pública responde vacío ante un código inexistente (sin error):

```sql
select * from verify_certificate_by_code('CODIGO-QUE-NO-EXISTE');
```

Expected: 0 filas, sin error.

- [ ] **Step 6:** Confirma que el bucket de Storage `certificates` existe (Storage → Buckets) y está marcado público. Si no existe, créalo como público.

Avísame cuando termines para seguir con la siguiente tarea.

---

## Task 4: [AVISO IMPORTANTE — MANUAL] Configurar Resend como SMTP de Supabase Auth

- [ ] **Step 1:** En el dashboard de Resend, confirma que tienes un dominio verificado y copia tu `RESEND_API_KEY`.
- [ ] **Step 2:** En Supabase: **Project Settings → Authentication → SMTP Settings** → actívalo con:
  - Host: `smtp.resend.com`
  - Puerto: `465` (SSL) o `587` (STARTTLS)
  - Usuario: `resend`
  - Contraseña: tu `RESEND_API_KEY`
  - Sender email: una dirección de tu dominio verificado en Resend
- [ ] **Step 3:** Guarda. Esto lo vamos a probar de punta a punta en la Task 12 (checklist end-to-end), no hace falta probarlo aislado ahora.

Avísame cuando termines.

---

## Task 5: Dependencias del frontend y cliente de Supabase

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/api/supabaseClient.ts`
- Modify: `frontend/.env.example`

**Interfaces:**
- Consumes: nada
- Produces: `supabase` — cliente exportado desde `frontend/src/api/supabaseClient.ts`, tipo `SupabaseClient`, usado por todas las tasks siguientes de `src/api/*.ts` y `src/context/AuthContext.tsx`.

- [ ] **Step 1: Instalar dependencias nuevas y quitar axios**

```bash
cd frontend
npm install @supabase/supabase-js qrcode pdf-lib
npm install -D @vercel/node @types/qrcode vitest tsx
npm uninstall axios
```

- [ ] **Step 2: Crear el cliente de Supabase**

Crea `frontend/src/api/supabaseClient.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el entorno');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Actualizar `.env.example`**

Reemplaza el contenido de `frontend/.env.example` por:

```
# Cliente (se exponen al navegador, es seguro)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Solo servidor (Vercel Function frontend/api/certificates.ts) - NUNCA con prefijo VITE_
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PUBLIC_BASE_URL=http://localhost:5173
```

- [ ] **Step 4: Crear tu `.env` local para desarrollo**

```bash
cp .env.example .env
```

Rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores reales de tu proyecto (Project Settings → API en Supabase).

- [ ] **Step 5: Verificar que el proyecto sigue compilando**

```bash
npx tsc --noEmit -p tsconfig.app.json
```

Expected: sin errores (todavía no se usa `supabase` en ningún lado, así que no hay nada roto).

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/api/supabaseClient.ts frontend/.env.example
git commit -m "feat: agregar dependencias de Supabase y cliente base"
```

---

## Task 6: Script de creación del primer admin

**Files:**
- Create: `frontend/scripts/create-admin.ts`

**Interfaces:**
- Consumes: `@supabase/supabase-js` (`createClient`), variables de entorno `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`
- Produces: un usuario en Supabase Auth + una fila en `admin_profile`. No lo consume ningún otro archivo de código — es un script standalone que se corre manualmente (Task 7).

- [ ] **Step 1: Crear el script**

Crea `frontend/scripts/create-admin.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminFullName = process.env.ADMIN_FULL_NAME;

if (!supabaseUrl || !serviceRoleKey || !adminEmail || !adminPassword || !adminFullName) {
  console.error(
    'Faltan variables de entorno. Se requieren: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME'
  );
  process.exit(1);
}

async function main() {
  const supabase = createClient(supabaseUrl as string, serviceRoleKey as string);

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail as string,
    password: adminPassword as string,
    email_confirm: true,
  });

  if (createError || !created.user) {
    console.error('No se pudo crear el usuario en Supabase Auth:', createError?.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase
    .from('admin_profile')
    .insert({ id: created.user.id, full_name: adminFullName as string });

  if (profileError) {
    console.error('Usuario creado en Auth pero fallo al insertar en admin_profile:', profileError.message);
    process.exit(1);
  }

  console.log(`Admin creado: ${adminEmail} (${created.user.id})`);
}

main();
```

- [ ] **Step 2: Verificar que compila**

```bash
cd frontend
npx tsc --noEmit -p tsconfig.node.json 2>&1 | head -30
```

Nota: si `tsconfig.node.json` no incluye `scripts/`, usa simplemente `npx tsc --noEmit scripts/create-admin.ts --esModuleInterop --skipLibCheck` para chequear sintaxis. No es bloqueante — se ejecuta con `tsx`, que no requiere que pase `tsc -b` del build de producción.

- [ ] **Step 3: Commit**

```bash
git add frontend/scripts/create-admin.ts
git commit -m "feat: script para crear el primer admin en Supabase Auth"
```

---

## Task 7: [AVISO IMPORTANTE — MANUAL] Ejecutar el script y crear el admin

Requiere que Task 3 (schema aplicado) ya esté hecha.

- [ ] **Step 1:** Desde `frontend/`, corre (PowerShell, ajusta los valores):

```powershell
$env:SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
$env:ADMIN_EMAIL="tu-correo@dominio.com"
$env:ADMIN_PASSWORD="una-contrasena-segura-que-tu-elijas"
$env:ADMIN_FULL_NAME="Tu Nombre"
npx tsx scripts/create-admin.ts
```

- [ ] **Step 2:** Confirma que la consola imprime `Admin creado: ...`. Si falla, pégame el error exacto.
- [ ] **Step 3:** Verifica en el dashboard de Supabase (**Authentication → Users**) que aparece el usuario, y en **Table Editor → admin_profile** que hay una fila con ese `id`.

Guarda ese email/contraseña — es con lo que probarás el login en Task 12.

---

## Task 8: Autenticación (Supabase Auth) + recuperación de contraseña

**Files:**
- Modify: `frontend/src/api/auth.ts`
- Modify: `frontend/src/context/AuthContext.tsx`
- Modify: `frontend/src/routes/ProtectedRoute.tsx`
- Modify: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/ResetPasswordPage.tsx`
- Modify: `frontend/src/routes/AppRoutes.tsx`
- Modify: `frontend/src/types/index.ts`

> **Nota (ruling post-ejecución, ver ledger):** `frontend/src/api/client.ts` NO se borra en esta tarea — `institutions.ts`, `courses.ts` (Task 9) y `certificates.ts` (Task 10) todavía lo importan y no se migran hasta esas tareas. El borrado se movió al final de la Task 10 (la última que migra un consumidor de `client.ts`). Task 8 solo elimina la interfaz `AuthResponse` de `types/index.ts`.

**Interfaces:**
- Consumes: `supabase` de `frontend/src/api/supabaseClient.ts` (Task 5)
- Produces: `useAuth()` sigue exponiendo `{ email, isAuthenticated, login, logout }` (mismo contrato que hoy usan `AdminLayout.tsx` y `LoginPage.tsx`), más un campo nuevo `loading: boolean` que `ProtectedRoute` debe usar.

- [ ] **Step 1: Reescribir `src/api/auth.ts`**

```ts
import { supabase } from './supabaseClient';

export async function login(email: string, password: string): Promise<{ email: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { email: data.user.email ?? email };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function forgotPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function resetPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
```

- [ ] **Step 2: Reescribir `src/context/AuthContext.tsx`**

```tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../api/supabaseClient';
import * as authApi from '../api/auth';

interface AuthState {
  email: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (loginEmail: string, password: string) => {
    const result = await authApi.login(loginEmail, password);
    setEmail(result.email);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setEmail(null);
  }, []);

  const value: AuthState = { email, isAuthenticated: !!email, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Actualizar `ProtectedRoute.tsx` para esperar la carga inicial de sesión**

```tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
```

Sin este cambio, al refrescar la página el admin sería expulsado al login por una fracción de segundo antes de que `getSession()` resuelva (falso negativo de auth).

- [ ] **Step 4: Agregar flujo de "olvidé mi contraseña" a `LoginPage.tsx`**

Reemplaza el contenido de `frontend/src/pages/LoginPage.tsx` por:

```tsx
import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import * as authApi from '../api/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch {
      setError('Credenciales invalidas');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setForgotSent(true);
    } catch {
      setError('No se pudo enviar el correo de recuperacion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 80 }}>
      <Helmet>
        <title>Iniciar sesion · Certifica</title>
      </Helmet>
      <div className="card" style={{ borderTop: '3px solid var(--seal-gold)' }}>
        <p className="eyebrow" style={{ marginBottom: 4 }}>Certifica</p>
        <h2 style={{ marginBottom: 20 }}>Panel administrador</h2>

        {mode === 'login' ? (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">Contrasena</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            <p style={{ marginTop: 14, fontSize: 13, textAlign: 'right' }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setMode('forgot');
                  setError(null);
                }}
                style={{ color: 'var(--ink-500)' }}
              >
                ¿Olvidaste tu contrasena?
              </a>
            </p>
          </form>
        ) : forgotSent ? (
          <p>Si el correo existe, te enviamos un enlace para restablecer tu contrasena.</p>
        ) : (
          <form onSubmit={handleForgotSubmit}>
            <div className="field">
              <label htmlFor="forgot-email">Correo</label>
              <input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Enviando...' : 'Enviar enlace de recuperacion'}
            </button>
            <p style={{ marginTop: 14, fontSize: 13 }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setMode('login');
                  setError(null);
                }}
                style={{ color: 'var(--ink-500)' }}
              >
                ← Volver al login
              </a>
            </p>
          </form>
        )}

        <p style={{ marginTop: 20, fontSize: 13 }}>
          <Link to="/" style={{ color: 'var(--ink-500)' }}>← Volver a validacion publica</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Crear `ResetPasswordPage.tsx`**

Crea `frontend/src/pages/ResetPasswordPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import * as authApi from '../api/auth';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('No se pudo actualizar la contrasena. El enlace pudo haber expirado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 80 }}>
      <Helmet>
        <title>Nueva contrasena · Certifica</title>
      </Helmet>
      <div className="card" style={{ borderTop: '3px solid var(--seal-gold)' }}>
        <p className="eyebrow" style={{ marginBottom: 4 }}>Certifica</p>
        <h2 style={{ marginBottom: 20 }}>Elegir nueva contrasena</h2>
        {success ? (
          <p>Contrasena actualizada. Redirigiendo al login...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">Nueva contrasena</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirmar contrasena</label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Guardando...' : 'Guardar nueva contrasena'}
            </button>
          </form>
        )}
        <p style={{ marginTop: 20, fontSize: 13 }}>
          <Link to="/login" style={{ color: 'var(--ink-500)' }}>← Volver al login</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Agregar la ruta pública en `AppRoutes.tsx`**

En `frontend/src/routes/AppRoutes.tsx`, agrega el import y la ruta:

```tsx
import ResetPasswordPage from '../pages/ResetPasswordPage';
```

Y dentro de `<Routes>`, junto a las rutas públicas existentes:

```tsx
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

- [ ] **Step 7: Limpiar tipos (client.ts se elimina despues, en la Task 10)**

En `frontend/src/types/index.ts`, elimina la interfaz `AuthResponse` (ya no se usa — `login()` ahora devuelve `{ email: string }`).

No borres `frontend/src/api/client.ts` todavia: `institutions.ts`, `courses.ts` (Task 9) y `certificates.ts` (Task 10) siguen importandolo hasta que esas tareas los migren. El borrado se hace al final de la Task 10.

- [ ] **Step 8: Verificar tipos**

```bash
cd frontend
npx tsc --noEmit -p tsconfig.app.json
```

Expected: sin errores. Si `AdminLayout.tsx` o alguna página todavía importa algo de `client.ts` o `AuthResponse`, el compilador lo va a señalar aquí.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: migrar autenticacion a Supabase Auth con recuperacion de contrasena"
```

---

## Task 9: Instituciones y Cursos sobre supabase-js

**Files:**
- Modify: `frontend/src/api/institutions.ts`
- Modify: `frontend/src/api/courses.ts`

**Interfaces:**
- Consumes: `supabase` de `frontend/src/api/supabaseClient.ts` (Task 5)
- Produces: mismas firmas que hoy — `listInstitutions(): Promise<Institution[]>`, `createInstitution(input: InstitutionInput): Promise<Institution>`, `deleteInstitution(id: string): Promise<void>`, `listCourses(): Promise<Course[]>`, `createCourse(input: CourseInput): Promise<Course>`, `deleteCourse(id: string): Promise<void>` — consumidas sin cambios por `InstitutionsPage.tsx` y `CoursesPage.tsx`.

- [ ] **Step 1: Reescribir `src/api/institutions.ts`**

```ts
import { supabase } from './supabaseClient';
import type { Institution } from '../types';

export interface InstitutionInput {
  name: string;
  slug: string;
  logoUrl?: string;
}

interface InstitutionRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

function mapRow(row: InstitutionRow): Institution {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listInstitutions(): Promise<Institution[]> {
  const { data, error } = await supabase.from('institution').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function createInstitution(input: InstitutionInput): Promise<Institution> {
  const { data, error } = await supabase
    .from('institution')
    .insert({ name: input.name, slug: input.slug, logo_url: input.logoUrl ?? null })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteInstitution(id: string): Promise<void> {
  const { error } = await supabase.from('institution').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Reescribir `src/api/courses.ts`**

```ts
import { supabase } from './supabaseClient';
import type { Course } from '../types';

export interface CourseInput {
  institutionId: string;
  name: string;
  hours?: number;
}

interface CourseRow {
  id: string;
  institution_id: string;
  institution: { name: string } | null;
  name: string;
  hours: number | null;
  created_at: string;
}

function mapRow(row: CourseRow): Course {
  return {
    id: row.id,
    institutionId: row.institution_id,
    institutionName: row.institution?.name ?? '',
    name: row.name,
    hours: row.hours ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from('course').select('*, institution(name)').order('name');
  if (error) throw error;
  return (data as unknown as CourseRow[] ?? []).map(mapRow);
}

export async function createCourse(input: CourseInput): Promise<Course> {
  const { data, error } = await supabase
    .from('course')
    .insert({ institution_id: input.institutionId, name: input.name, hours: input.hours ?? null })
    .select('*, institution(name)')
    .single();
  if (error) throw error;
  return mapRow(data as unknown as CourseRow);
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase.from('course').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 3: Verificar tipos**

```bash
cd frontend
npx tsc --noEmit -p tsconfig.app.json
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/institutions.ts frontend/src/api/courses.ts
git commit -m "feat: migrar Instituciones y Cursos a supabase-js"
```

---

## Task 10: Certificados (listar/revocar) y verificación pública sobre supabase-js

**Files:**
- Modify: `frontend/src/api/certificates.ts`

**Interfaces:**
- Consumes: `supabase` de `frontend/src/api/supabaseClient.ts` (Task 5); la función RPC `verify_certificate_by_code` y la tabla `certificate` de la migración (Task 2/3)
- Produces: mismas firmas que hoy — `listCertificates()`, `issueCertificate(input)`, `revokeCertificate(id)`, `verifyCertificate(code)` — consumidas sin cambios por `CertificatesPage.tsx` y `VerifyPage.tsx`. `issueCertificate` pasa a llamar `POST /api/certificates` (Task 11).

- [ ] **Step 1: Reescribir `src/api/certificates.ts`**

```ts
import { supabase } from './supabaseClient';
import type { Certificate, CertificateVerification } from '../types';

export interface CertificateInput {
  institutionId: string;
  courseId: string;
  recipientName: string;
  recipientEmail?: string;
  issueDate: string;
}

interface CertificateRow {
  id: string;
  code: string;
  institution_id: string;
  institution: { name: string } | null;
  course_id: string;
  course: { name: string } | null;
  recipient_name: string;
  recipient_email: string | null;
  issue_date: string;
  status: 'ACTIVE' | 'REVOKED';
  pdf_url: string | null;
  qr_url: string | null;
}

function mapRow(row: CertificateRow): Certificate {
  return {
    id: row.id,
    code: row.code,
    institutionId: row.institution_id,
    institutionName: row.institution?.name ?? '',
    courseId: row.course_id,
    courseName: row.course?.name ?? '',
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email ?? undefined,
    issueDate: row.issue_date,
    status: row.status,
    pdfUrl: row.pdf_url ?? undefined,
    qrUrl: row.qr_url ?? undefined,
    verificationUrl: `${window.location.origin}/verify/${row.code}`,
  };
}

export async function listCertificates(): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from('certificate')
    .select('*, institution(name), course(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as CertificateRow[] ?? []).map(mapRow);
}

export async function issueCertificate(input: CertificateInput): Promise<Certificate> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('No hay sesion activa');

  const response = await fetch('/api/certificates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? 'No se pudo emitir el certificado');
  }
  return mapRow(body as CertificateRow);
}

export async function revokeCertificate(id: string): Promise<Certificate> {
  const { data, error } = await supabase
    .from('certificate')
    .update({ status: 'REVOKED' })
    .eq('id', id)
    .select('*, institution(name), course(name)')
    .single();
  if (error) throw error;
  return mapRow(data as unknown as CertificateRow);
}

export async function verifyCertificate(code: string): Promise<CertificateVerification> {
  const { data, error } = await supabase.rpc('verify_certificate_by_code', { p_code: code });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error('Certificado no encontrado');
  return {
    valid: row.status === 'ACTIVE',
    code: row.code,
    recipientName: row.recipient_name,
    courseName: row.course_name,
    institutionName: row.institution_name,
    issueDate: row.issue_date,
    status: row.status,
    pdfUrl: row.pdf_url ?? undefined,
  };
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd frontend
npx tsc --noEmit -p tsconfig.app.json
```

Expected: sin errores (aunque `POST /api/certificates` todavía no existe como función real hasta Task 11 — eso no es un error de tipos, solo fallará en runtime hasta entonces).

- [ ] **Step 3: Eliminar `frontend/src/api/client.ts` (ya no lo usa nadie)**

Con esta tarea, `institutions.ts`, `courses.ts` (Task 9) y `certificates.ts` (este mismo archivo, arriba) ya no dependen del stub axios que dejó la Task 5. Bórralo:

```bash
git rm frontend/src/api/client.ts
```

Vuelve a correr `npx tsc --noEmit -p tsconfig.app.json` desde `frontend/` y confirma que sigue sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/certificates.ts
git rm frontend/src/api/client.ts
git commit -m "feat: migrar listado/revocacion/verificacion de certificados a supabase-js; eliminar cliente axios sin uso"
```

---

## Task 11: Vercel Function `/api/certificates` (emisión de certificados)

**Files:**
- Create: `frontend/api/_lib/certificateLogic.ts`
- Test: `frontend/api/_lib/certificateLogic.test.ts`
- Create: `frontend/api/_lib/certificatePdf.ts`
- Test: `frontend/api/_lib/certificatePdf.test.ts`
- Create: `frontend/api/certificates.ts`
- Modify: `frontend/package.json` (script `test`)

**Interfaces:**
- Consumes: `institution`, `course`, `certificate`, `admin_profile` (tablas de Task 2/3), variables de entorno `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_BASE_URL` (solo servidor)
- Produces: endpoint `POST /api/certificates` que consume `frontend/src/api/certificates.ts::issueCertificate` (Task 10). Responde 201 con un objeto certificado (mismo shape que las filas de `listCertificates`/`revokeCertificate`: `institution(name)`/`course(name)` embebidos) o un error `{ error: string }` con status 400/401/403/500.

- [ ] **Step 1: Escribir la lógica pura y su test (código y validación) — RED**

Crea `frontend/api/_lib/certificateLogic.ts`:

```ts
export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 10;

export function generateCode(randomInt: (max: number) => number): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[randomInt(CODE_CHARS.length)];
  }
  return code;
}

export interface IssueRequestBody {
  institutionId?: string;
  courseId?: string;
  recipientName?: string;
  recipientEmail?: string;
  issueDate?: string;
}

export function validateIssueBody(body: IssueRequestBody): string | null {
  if (!body.institutionId) return 'institutionId es requerido';
  if (!body.courseId) return 'courseId es requerido';
  if (!body.recipientName || !body.recipientName.trim()) return 'recipientName es requerido';
  if (!body.issueDate) return 'issueDate es requerido';
  return null;
}
```

Crea `frontend/api/_lib/certificateLogic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateCode, validateIssueBody, CODE_CHARS, CODE_LENGTH } from './certificateLogic';

describe('generateCode', () => {
  it('produces a code of the expected length using only allowed characters', () => {
    const code = generateCode(() => 0);
    expect(code).toHaveLength(CODE_LENGTH);
    for (const char of code) {
      expect(CODE_CHARS).toContain(char);
    }
  });

  it('uses the provided random source for every character, bounded by the alphabet size', () => {
    let calls = 0;
    generateCode((max) => {
      calls += 1;
      expect(max).toBe(CODE_CHARS.length);
      return max - 1;
    });
    expect(calls).toBe(CODE_LENGTH);
  });
});

describe('validateIssueBody', () => {
  it('rejects a body missing institutionId', () => {
    expect(
      validateIssueBody({ courseId: 'c1', recipientName: 'Ana', issueDate: '2026-01-01' })
    ).toBe('institutionId es requerido');
  });

  it('rejects a body missing courseId', () => {
    expect(
      validateIssueBody({ institutionId: 'i1', recipientName: 'Ana', issueDate: '2026-01-01' })
    ).toBe('courseId es requerido');
  });

  it('rejects a recipientName that is only whitespace', () => {
    expect(
      validateIssueBody({ institutionId: 'i1', courseId: 'c1', recipientName: '   ', issueDate: '2026-01-01' })
    ).toBe('recipientName es requerido');
  });

  it('rejects a body missing issueDate', () => {
    expect(
      validateIssueBody({ institutionId: 'i1', courseId: 'c1', recipientName: 'Ana' })
    ).toBe('issueDate es requerido');
  });

  it('accepts a fully populated body', () => {
    expect(
      validateIssueBody({
        institutionId: 'i1',
        courseId: 'c1',
        recipientName: 'Ana',
        issueDate: '2026-01-01',
      })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Agregar el script de test y correrlo — debe fallar (no existe vitest configurado todavía)**

En `frontend/package.json`, dentro de `"scripts"`, agrega:

```json
"test": "vitest run"
```

```bash
cd frontend
npm run test
```

Expected: los tests corren y PASAN (no hay paso RED real aquí porque la implementación se escribió junto con el test arriba — es la naturaleza de definir contratos puros; si prefieres RED estricto, comenta el cuerpo de `generateCode`/`validateIssueBody` antes de correr, confirma el fallo, y luego restaura el código de arriba).

- [ ] **Step 3: PDF — implementación y smoke test**

Crea `frontend/api/_lib/certificatePdf.ts`:

```ts
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export interface CertificatePdfParams {
  recipientName: string;
  courseName: string;
  institutionName: string;
  issueDate: string;
  code: string;
  qrPng: Uint8Array;
}

export async function generateCertificatePdf(params: CertificatePdfParams): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([841.89, 595.28]); // A4 apaisado, en puntos
  const { width, height } = page.getSize();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helveticaBoldOblique = await doc.embedFont(StandardFonts.HelveticaBoldOblique);

  function centerText(text: string, y: number, font: PDFFont, size: number, color = rgb(0.06, 0.09, 0.16)) {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
  }

  centerText('CERTIFICADO DE FINALIZACION', height - 100, helveticaBold, 28);
  centerText(params.institutionName, height - 140, helvetica, 14, rgb(0.28, 0.33, 0.41));
  centerText('Se otorga el presente certificado a', height - 220, helvetica, 12);
  centerText(params.recipientName, height - 260, helveticaBoldOblique, 22);
  centerText(`por haber completado satisfactoriamente el curso "${params.courseName}"`, height - 300, helvetica, 12);
  centerText(`Fecha de emision: ${params.issueDate}`, height - 360, helvetica, 12);
  centerText(`Codigo de verificacion: ${params.code}`, height - 385, helvetica, 12);

  const qrImage = await doc.embedPng(params.qrPng);
  const qrSize = 110;
  page.drawImage(qrImage, { x: (width - qrSize) / 2, y: height - 520, width: qrSize, height: qrSize });

  return doc.save();
}
```

Crea `frontend/api/_lib/certificatePdf.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';
import { generateCertificatePdf } from './certificatePdf';

describe('generateCertificatePdf', () => {
  it('returns bytes with a valid PDF file signature', async () => {
    const qrPng = await QRCode.toBuffer('https://example.com/verify/ABCDEFGHJK', { type: 'png', width: 50 });
    const bytes = await generateCertificatePdf({
      recipientName: 'Ana Torres',
      courseName: 'Trabajo en alturas',
      institutionName: 'Global SST',
      issueDate: '2026-08-17',
      code: 'ABCDEFGHJK',
      qrPng,
    });
    const header = Buffer.from(bytes.slice(0, 5)).toString('utf-8');
    expect(header).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(500);
  });
});
```

```bash
npm run test
```

Expected: ambos archivos de test pasan.

- [ ] **Step 4: Escribir el handler de la función**

Crea `frontend/api/certificates.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { randomInt } from 'node:crypto';
import { generateCode, validateIssueBody, type IssueRequestBody } from './_lib/certificateLogic';
import { generateCertificatePdf } from './_lib/certificatePdf';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo no permitido' });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  if (!supabaseUrl || !serviceRoleKey || !publicBaseUrl) {
    res.status(500).json({ error: 'Configuracion del servidor incompleta' });
    return;
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Sesion invalida' });
    return;
  }

  const { data: adminProfile } = await admin
    .from('admin_profile')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (!adminProfile) {
    res.status(403).json({ error: 'No autorizado' });
    return;
  }

  const body = (req.body ?? {}) as IssueRequestBody;
  const validationError = validateIssueBody(body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const { data: institution, error: institutionError } = await admin
    .from('institution')
    .select('id, slug, name')
    .eq('id', body.institutionId)
    .maybeSingle();
  if (institutionError || !institution) {
    res.status(400).json({ error: 'Institucion no encontrada' });
    return;
  }

  const { data: course, error: courseError } = await admin
    .from('course')
    .select('id, name')
    .eq('id', body.courseId)
    .maybeSingle();
  if (courseError || !course) {
    res.status(400).json({ error: 'Curso no encontrado' });
    return;
  }

  let code = generateCode((max) => randomInt(max));
  for (let attempts = 0; attempts < 5; attempts++) {
    const { data: existing } = await admin.from('certificate').select('id').eq('code', code).maybeSingle();
    if (!existing) break;
    code = generateCode((max) => randomInt(max));
  }

  const verificationUrl = `${publicBaseUrl}/verify/${code}`;
  const qrPng = await QRCode.toBuffer(verificationUrl, { type: 'png', width: 300 });
  const pdfBytes = await generateCertificatePdf({
    recipientName: body.recipientName!.trim(),
    courseName: course.name,
    institutionName: institution.name,
    issueDate: body.issueDate!,
    code,
    qrPng,
  });

  const year = new Date(body.issueDate!).getFullYear();
  const folder = `${institution.slug}/${year}`;

  const { error: qrUploadError } = await admin.storage
    .from('certificates')
    .upload(`${folder}/${code}-qr.png`, qrPng, { contentType: 'image/png', upsert: true });
  if (qrUploadError) {
    res.status(500).json({ error: 'No se pudo subir el QR' });
    return;
  }

  const { error: pdfUploadError } = await admin.storage
    .from('certificates')
    .upload(`${folder}/${code}.pdf`, Buffer.from(pdfBytes), { contentType: 'application/pdf', upsert: true });
  if (pdfUploadError) {
    res.status(500).json({ error: 'No se pudo subir el PDF' });
    return;
  }

  const qrUrl = admin.storage.from('certificates').getPublicUrl(`${folder}/${code}-qr.png`).data.publicUrl;
  const pdfUrl = admin.storage.from('certificates').getPublicUrl(`${folder}/${code}.pdf`).data.publicUrl;

  const { data: certificate, error: insertError } = await admin
    .from('certificate')
    .insert({
      code,
      institution_id: body.institutionId,
      course_id: body.courseId,
      recipient_name: body.recipientName!.trim(),
      recipient_email: body.recipientEmail ?? null,
      issue_date: body.issueDate,
      status: 'ACTIVE',
      pdf_url: pdfUrl,
      qr_url: qrUrl,
      created_by: userData.user.id,
    })
    .select('*, institution(name), course(name)')
    .single();

  if (insertError) {
    res.status(500).json({ error: 'No se pudo guardar el certificado' });
    return;
  }

  res.status(201).json(certificate);
}
```

- [ ] **Step 5: Verificar tipos y tests completos**

```bash
cd frontend
npx tsc --noEmit -p tsconfig.app.json
npm run test
```

Expected: sin errores de tipos (nota: `frontend/api/**` no está incluido en `tsconfig.app.json` — si `tsc` no lo cubre, está bien, se valida en el build de Vercel; confírmalo revisando si aparecen errores relacionados a `api/`). Todos los tests de Vitest pasan.

- [ ] **Step 6: Commit**

```bash
git add frontend/api frontend/package.json
git commit -m "feat: Vercel Function para emision de certificados (QR + PDF + Storage)"
```

---

## Task 12: [AVISO IMPORTANTE — MANUAL] Deploy a preview de Vercel y checklist end-to-end

Requiere Tasks 1–11 completas y Task 3/4/7 (Supabase) ya hechas.

- [ ] **Step 1:** En Vercel, importa (o usa) el proyecto con **Root Directory: `frontend`**.
- [ ] **Step 2:** Configura las variables de entorno del proyecto (Preview y Production):
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `PUBLIC_BASE_URL` (usa la URL del preview para probar; la actualizas a la de producción antes de promover)
- [ ] **Step 3:** Despliega un preview (push a una rama, o `vercel` desde `frontend/` si tienes la CLI).
- [ ] **Step 4:** Checklist contra el preview:
  - [ ] Login con el admin creado en Task 7 funciona y entra a `/admin`.
  - [ ] Refrescar la página en `/admin` no expulsa al login (confirma el fix de `ProtectedRoute` de Task 8).
  - [ ] Crear una institución y un curso, verificar que aparecen listados.
  - [ ] Emitir un certificado: confirma que aparece en la tabla, que el PDF y el QR abren correctamente desde sus URLs.
  - [ ] Revocar el certificado, confirma que el estado cambia a `REVOKED`.
  - [ ] Visitar `/verify/{codigo}` sin sesión iniciada (ventana de incógnito): debe mostrar los datos correctos.
  - [ ] Visitar `/verify/CODIGO-INVENTADO`: debe mostrar "no encontrado", sin exponer otros certificados.
  - [ ] Flujo "olvidé mi contraseña" desde `/login`: pide el correo, confirma que llega el email vía Resend, el link lleva a `/reset-password`, se puede fijar una contraseña nueva y hacer login con ella.
  - [ ] Cerrar sesión (`Salir`) y confirmar que `/admin` vuelve a pedir login.
- [ ] **Step 5:** Si algo falla, avísame con el error exacto (consola del navegador + logs de la función en Vercel) antes de seguir a producción.

---

## Task 13: [AVISO IMPORTANTE — MANUAL] Promover a producción y apagar Render

Solo después de que el checklist de Task 12 pase completo.

- [ ] **Step 1:** Actualiza `PUBLIC_BASE_URL` en Vercel (entorno Production) al dominio final de producción.
- [ ] **Step 2:** Promueve el deployment a producción en Vercel (o mergea a la rama de producción si tu flujo es Git-based).
- [ ] **Step 3:** Repite el checklist completo de Task 12 contra la URL de producción.
- [ ] **Step 4:** Solo cuando confirmes que todo funciona en producción: entra a Render y apaga/elimina el servicio backend. Esto es irreversible — dime explícitamente que confirmas antes de que yo (o tú) lo hagan.
- [ ] **Step 5:** Actualiza cualquier DNS/enlace externo (README ya actualizado en Task 1) que todavía apunte a `onrender.com`.

---

## Self-Review

**Cobertura del spec:** arquitectura (§2 → Tasks 5/10/11), modelo de datos (§3 → Task 2), RLS + función pública (§4 → Task 2), autenticación (§5 → Task 8), la única Vercel Function (§6 → Task 11), cambios de frontend (§7 → Tasks 5/8/9/10), qué se elimina (§8 → Task 1), variables de entorno (§9 → Tasks 5/11/12), orden de corte (§10 → Tasks 3/4/7/12/13), verificación (§11 → Task 12). Todo cubierto.

**Placeholders:** ninguno — cada paso de código incluye la implementación completa, no descripciones.

**Consistencia de tipos:** `Institution`, `Course`, `Certificate`, `CertificateVerification` de `frontend/src/types/index.ts` no cambian de forma (solo se elimina `AuthResponse`); todos los `mapRow` de las Tasks 9/10 devuelven exactamente esos shapes. `useAuth()` mantiene `email`/`isAuthenticated`/`login`/`logout` y agrega `loading`, consumido correctamente por el `ProtectedRoute` actualizado en la misma Task 8.
