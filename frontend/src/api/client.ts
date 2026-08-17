// Cliente HTTP centralizado - DEPRECATED
// Este archivo ha sido reemplazado por Supabase en la fase de migración.
// Las funciones de API serán actualizadas en tareas posteriores para usar supabaseClient.
// Por ahora, este stub mantiene compatibilidad con el código existente durante la transición.

interface ApiClientStub {
  get<T>(url: string): Promise<{ data: T }>;
  post<T>(url: string, data?: unknown): Promise<{ data: T }>;
  delete(url: string): Promise<unknown>;
}

const apiClient: ApiClientStub = {
  get<T>(): Promise<{ data: T }> {
    throw new Error('API client migration pending - use Supabase client instead');
  },
  post<T>(): Promise<{ data: T }> {
    throw new Error('API client migration pending - use Supabase client instead');
  },
  delete(): Promise<unknown> {
    throw new Error('API client migration pending - use Supabase client instead');
  },
};

export default apiClient;
