/**
 * Lógica de autenticación
 */

import { api, handleApiError } from './api.js';

/**
 * Registra un nuevo usuario
 */
export async function register(email, password, role = 'parent') {
  try {
    const response = await api.post('auth/register', {
      email,
      password,
      role,
    });

    if (response.token) {
      // Guardar token en cookie (manejado por el servidor)
      document.cookie = `jwt=${response.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
    }

    return { success: true, user: response.user };
  } catch (error) {
    return { success: false, error: handleApiError(error) };
  }
}

/**
 * Inicia sesión
 */
export async function login(email, password) {
  try {
    const response = await api.post('auth/login', {
      email,
      password,
    });

    if (response.token) {
      document.cookie = `jwt=${response.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
    }

    return { success: true, user: response.user };
  } catch (error) {
    return { success: false, error: handleApiError(error) };
  }
}

/**
 * Cierra sesión
 */
export async function logout() {
  try {
    await api.post('auth/logout');
    document.cookie = 'jwt=; path=/; max-age=0';
    window.location.href = '/login.html';
  } catch (error) {
    console.error('Logout error:', error);
    // Forzar logout local
    document.cookie = 'jwt=; path=/; max-age=0';
    window.location.href = '/login.html';
  }
}

/**
 * Obtiene el usuario actual
 */
export async function getCurrentUser() {
  try {
    const response = await api.get('auth/me');
    return { success: true, user: response.user };
  } catch (error) {
    return { success: false, error: handleApiError(error) };
  }
}

/**
 * Verifica si el usuario está autenticado
 */
export function isAuthenticated() {
  return document.cookie.includes('jwt=');
}

/**
 * Redirige a login si no está autenticado
 */
export async function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return false;
  }

  const userResult = await getCurrentUser();
  if (!userResult.success) {
    window.location.href = '/login.html';
    return false;
  }

  return userResult.user;
}

