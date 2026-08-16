package com.certifica.domain;

/** Estado del certificado. Un certificado REVOKED sigue siendo consultable pero se marca invalido. */
public enum CertificateStatus {
    ACTIVE,
    REVOKED
}
