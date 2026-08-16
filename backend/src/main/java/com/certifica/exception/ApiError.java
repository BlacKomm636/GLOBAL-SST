package com.certifica.exception;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;
import java.util.List;

/** Formato de error uniforme devuelto por toda la API. */
public record ApiError(
        @JsonFormat(shape = JsonFormat.Shape.STRING) Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        List<String> details
) {
}
