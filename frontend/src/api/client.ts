import axios from 'axios';

// Cliente HTTP centralizado: base URL desde env, interceptor de token JWT
// y manejo uniforme de errores para toda la app.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('certifica_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('certifica_token');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
