package com.certifica.dto.response;

public record AuthResponse(
        String token,
        long expiresInMs,
        String email,
        String fullName
) {
}
