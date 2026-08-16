package com.certifica.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Sube archivos a Supabase Storage via su API REST (endpoint /storage/v1/object)
 * usando la service_role key. Los archivos se organizan por institucion/anio
 * para facilitar su administracion. Solo la URL publica resultante se
 * persiste en la base de datos; el binario nunca toca Postgres.
 */
@Service
public class StorageService {

    private final WebClient webClient;

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key}")
    private String serviceRoleKey;

    @Value("${supabase.storage.bucket}")
    private String bucket;

    public StorageService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Sube un archivo y devuelve su URL publica.
     *
     * @param folderPath ruta dentro del bucket, ej. "institutionSlug/2026"
     * @param fileName   nombre del archivo, ej. "ABC123.pdf"
     * @param content    bytes del archivo
     * @param contentType tipo MIME
     */
    public String upload(String folderPath, String fileName, byte[] content, MediaType contentType) {
        String objectPath = folderPath + "/" + fileName;

        webClient.post()
                .uri(supabaseUrl + "/storage/v1/object/" + bucket + "/" + objectPath)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("x-upsert", "true")
                .contentType(contentType)
                .bodyValue(content)
                .retrieve()
                .toBodilessEntity()
                .block();

        return supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + objectPath;
    }
}
