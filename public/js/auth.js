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

    // La cookie se configura automáticamente por el servidor
    if (response.success && response.user) {
      return { success: true, user: response.user };
    }

    return { success: false, error: 'Error al registrarse' };
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

    // La cookie se configura automáticamente por el servidor
    // Solo verificamos que la respuesta sea exitosa
    if (response.success && response.user) {
      return { success: true, user: response.user };
    }

    return { success: false, error: 'Error al iniciar sesión' };
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

