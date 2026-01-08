/**
 * Helpers para timestamps verificables
 */

/**
 * Obtiene el timestamp Unix actual en segundos
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Convierte un timestamp Unix a Date
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Convierte una Date a timestamp Unix
 */
export function dateToTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Formatea un timestamp para mostrar al usuario
 */
export function formatTimestamp(timestamp: number, locale: string = 'es-AR'): string {
  const date = timestampToDate(timestamp);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formatea un timestamp relativo (hace X minutos/horas/días)
 */
export function formatRelativeTimestamp(timestamp: number): string {
  const now = getCurrentTimestamp();
  const diff = now - timestamp;

  if (diff < 60) {
    return 'hace unos segundos';
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  } else if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
  } else {
    return formatTimestamp(timestamp);
  }
}

/**
 * Calcula si un timestamp está dentro de un rango de tiempo
 */
export function isTimestampInRange(
  timestamp: number,
  startTimestamp: number,
  endTimestamp: number
): boolean {
  return timestamp >= startTimestamp && timestamp <= endTimestamp;
}

/**
 * Calcula si un timestamp ha expirado
 */
export function isTimestampExpired(timestamp: number): boolean {
  return timestamp < getCurrentTimestamp();
}

/**
 * Calcula cuántos segundos faltan para que expire un timestamp
 */
export function getSecondsUntilExpiry(timestamp: number): number {
  const now = getCurrentTimestamp();
  return Math.max(0, timestamp - now);
}

/**
 * Genera un hash SHA-256 de un contenido para verificación
 */
export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica que un hash corresponde a un contenido
 */
export async function verifyContentHash(
  content: string,
  expectedHash: string
): Promise<boolean> {
  const computedHash = await generateContentHash(content);
  return computedHash === expectedHash;
}

