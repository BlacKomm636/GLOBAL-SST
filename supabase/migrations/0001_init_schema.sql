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
