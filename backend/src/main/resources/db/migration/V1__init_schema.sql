-- ============================================================
-- Esquema inicial: instituciones, cursos, certificados y admins
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE admin_user (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    reset_token     VARCHAR(255),
    reset_token_expires_at TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE institution (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    logo_url    VARCHAR(500),
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE course (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  UUID NOT NULL REFERENCES institution(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    hours           INTEGER,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE certificate (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(64) NOT NULL UNIQUE,
    institution_id      UUID NOT NULL REFERENCES institution(id),
    course_id           UUID NOT NULL REFERENCES course(id),
    recipient_name      VARCHAR(255) NOT NULL,
    recipient_email     VARCHAR(255),
    issue_date          DATE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    pdf_url             VARCHAR(500),
    qr_url              VARCHAR(500),
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificate_code ON certificate(code);
CREATE INDEX idx_certificate_institution ON certificate(institution_id);
CREATE INDEX idx_course_institution ON course(institution_id);
