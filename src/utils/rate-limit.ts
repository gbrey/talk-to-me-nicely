/**
 * Rate limiting simple usando memoria (en producción usar KV o D1)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Configuración de rate limits por endpoint
 */
export const RATE_LIMITS: Record<string, { requests: number; window: number }> =
  {
    'auth:login': { requests: 5, window: 15 * 60 }, // 5 por 15 min
    'auth:register': { requests: 3, window: 60 * 60 }, // 3 por hora
    'api:general': { requests: 100, window: 60 }, // 100 por minuto
    'ai-coach:analyze': { requests: 20, window: 24 * 60 * 60 }, // 20 por día
    'invitations:create': { requests: 5, window: 24 * 60 * 60 }, // 5 por día
  };

/**
 * Verifica si un request excede el rate limit
 */
export function checkRateLimit(
  key: string,
  limit: { requests: number; window: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Math.floor(Date.now() / 1000);
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Crear nueva entrada
    const resetAt = now + limit.window;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit.requests - 1,
      resetAt,
    };
  }

  if (entry.count >= limit.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Incrementar contador
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: limit.requests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Genera una key de rate limit
 */
export function getRateLimitKey(
  identifier: string,
  endpoint: string
): string {
  return `${endpoint}:${identifier}`;
}

/**
 * Limpia entradas expiradas (ejecutar periódicamente)
 */
export function cleanupRateLimits(): void {
  const now = Math.floor(Date.now() / 1000);
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

