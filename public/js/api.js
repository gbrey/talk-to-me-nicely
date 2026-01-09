/**
 * Cliente API base
 */

const API_BASE = '/api';

/**
 * Realiza una petición a la API
 */
async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, headers = {} } = options;

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include', // Incluir cookies
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}/${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const error = new Error(errorData.error || `HTTP ${response.status}`);
    // Preservar datos adicionales del error (como validation) en el objeto error
    if (errorData.validation) {
      error.validation = errorData.validation;
    }
    if (errorData.error) {
      error.error = errorData.error;
    }
    error.response = response; // Preservar response para acceso adicional
    throw error;
  }

  return await response.json();
}

/**
 * Helpers para métodos HTTP
 */
export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) =>
    apiRequest(endpoint, { ...options, method: 'POST', body }),
  patch: (endpoint, body, options) =>
    apiRequest(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) =>
    apiRequest(endpoint, { ...options, method: 'DELETE' }),
};

/**
 * Maneja errores de API
 */
export function handleApiError(error) {
  console.error('API Error:', error);
  return error.message || 'Error desconocido';
}

