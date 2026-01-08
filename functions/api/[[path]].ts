/**
 * Router catch-all para Cloudflare Pages Functions
 */

import type { D1Database, R2Bucket } from '~/utils/db';
import { getJWTFromCookie, verifyJWT, createJWTCookie } from '~/utils/jwt';
import { logAudit, getClientIP, getUserAgent } from '~/utils/audit';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '~/utils/rate-limit';

// Importar handlers
import * as authHandler from '~/api/auth';
import * as familyHandler from '~/api/family';
import * as messagesHandler from '~/api/messages';
import * as calendarHandler from '~/api/calendar';
import * as aiCoachHandler from '~/api/ai-coach';
import * as professionalHandler from '~/api/professional';
import * as exportHandler from '~/api/export';

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ENCRYPTION_KEY: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
}

interface Context {
  env: Env;
  userId?: string;
  userRole?: string;
  familyId?: string;
}

/**
 * Maneja requests a la API
 */
export async function onRequest(context: {
  request: Request;
  env: Env;
  params: { path?: string[] };
}): Promise<Response> {
  const { request, env, params } = context;
  const path = params.path || [];
  const method = request.method;

  // CORS headers - permitir credenciales (cookies)
  // Cuando usamos credentials, no podemos usar '*' en Allow-Origin
  const origin = request.headers.get('Origin');
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
  
  // Si hay origen, usarlo; si no, permitir cualquier origen (sin credentials)
  if (origin) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  } else {
    corsHeaders['Access-Control-Allow-Origin'] = '*';
    // Si no hay origen, no podemos usar credentials
    delete corsHeaders['Access-Control-Allow-Credentials'];
  }

  // Manejar OPTIONS para CORS
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parsear ruta
    const route = parseRoute(path);
    if (!route) {
      console.error('Route not found:', path);
      return jsonResponse({ error: 'Not found', path: path.join('/') }, 404, corsHeaders);
    }
    
    console.log('Parsed route:', route.endpoint, 'from path:', path);

    // Rate limiting
    const clientIP = getClientIP(request) || 'unknown';
    const rateLimitKey = getRateLimitKey(
      clientIP,
      route.endpoint || 'api:general'
    );
    const limit = RATE_LIMITS[route.endpoint || 'api:general'] || RATE_LIMITS['api:general'];
    const rateLimitResult = checkRateLimit(rateLimitKey, limit);

    if (!rateLimitResult.allowed) {
      return jsonResponse(
        {
          error: 'Rate limit exceeded',
          resetAt: rateLimitResult.resetAt,
        },
        429,
        {
          ...corsHeaders,
          'X-RateLimit-Limit': limit.requests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
        }
      );
    }

    // Verificar que las variables de entorno críticas estén presentes
    if (!env.JWT_SECRET) {
      console.error('JWT_SECRET is missing!');
      return jsonResponse(
        { error: 'Server configuration error: JWT_SECRET missing' },
        500,
        corsHeaders
      );
    }
    
    if (!env.ENCRYPTION_KEY) {
      console.error('ENCRYPTION_KEY is missing!');
      return jsonResponse(
        { error: 'Server configuration error: ENCRYPTION_KEY missing' },
        500,
        corsHeaders
      );
    }
    
    if (!env.DB) {
      console.error('DB is missing!');
      return jsonResponse(
        { error: 'Server configuration error: DB binding missing' },
        500,
        corsHeaders
      );
    }

    // Autenticación (excepto para endpoints públicos)
    const publicEndpoints = [
      'auth:register',
      'auth:login',
      'auth:oauth',
      'auth:verify-email',
    ];
    let ctx: Context = { env };

    if (!publicEndpoints.includes(route.endpoint || '')) {
      const authResult = await authenticate(request, env);
      if (!authResult.success) {
        return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
      }
      ctx = {
        ...ctx,
        userId: authResult.userId,
        userRole: authResult.role,
        familyId: authResult.familyId,
      };
    }

    // Ejecutar handler
    const handler = getHandler(route.endpoint || '');
    if (!handler) {
      console.error('Handler not found for endpoint:', route.endpoint);
      return jsonResponse({ error: 'Handler not found', endpoint: route.endpoint }, 404, corsHeaders);
    }

    console.log('Calling handler for:', route.endpoint);
    const response = await handler(request, ctx, { ...route.params, endpoint: route.endpoint });
    console.log('Handler response:', response.status);

    // Agregar headers de rate limit
    const responseHeaders = {
      ...corsHeaders,
      'X-RateLimit-Limit': limit.requests.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
    };

    // Log de auditoría (async, no bloquea respuesta)
    if (ctx.userId) {
      logAudit(env.DB, {
        userId: ctx.userId,
        familyId: ctx.familyId,
        action: `${method} ${route.endpoint || 'unknown'}`,
        entityType: route.endpoint || 'api',
        entityId: route.params?.id,
        ipAddress: clientIP,
        userAgent: getUserAgent(request),
      }).catch(console.error);
    }

    // Configurar cookie JWT si hay token en la respuesta
    const responseBody = response.body as any;
    const headers: Record<string, string> = {
      ...responseHeaders,
      'Content-Type': 'application/json',
    };

    // Si hay token en la respuesta (login/register), configurar cookie
    if (responseBody?.token) {
      headers['Set-Cookie'] = createJWTCookie(responseBody.token);
      // Remover token del body (no debe enviarse en JSON)
      delete responseBody.token;
    }

    return new Response(JSON.stringify(responseBody), {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return jsonResponse(
      { 
        error: 'Internal server error',
        message: errorMessage,
      },
      500,
      corsHeaders
    );
  }
}

/**
 * Parsea la ruta de la URL
 */
function parseRoute(path: string[]): {
  endpoint: string;
  params: Record<string, string>;
} | null {
  if (path.length === 0) return null;

  const [resource, ...rest] = path;

  // Auth endpoints
  if (resource === 'auth') {
    if (rest.length === 0) return null;
    const action = rest[0];
    return {
      endpoint: `auth:${action}`,
      params: {},
    };
  }

  // Family endpoints
  if (resource === 'family') {
    if (rest.length === 0) {
      return { endpoint: 'family:list', params: {} };
    }
    if (rest[0] === 'join') {
      return { endpoint: 'family:join', params: {} };
    }
    if (rest[0] === 'invite') {
      return { endpoint: 'family:invite', params: {} };
    }
    const id = rest[0];
    return { endpoint: 'family:get', params: { id } };
  }

  // Messages endpoints
  if (resource === 'messages') {
    if (rest.length < 2) return null;
    const [familyId, channel] = rest;
    if (rest.length === 2) {
      return { endpoint: 'messages:list', params: { familyId, channel } };
    }
    if (rest[2] === 'read') {
      return { endpoint: 'messages:read', params: { id: rest[3] } };
    }
    return { endpoint: 'messages:create', params: { familyId, channel } };
  }

  // Calendar endpoints
  if (resource === 'calendar') {
    if (rest.length < 1) return null;
    const familyId = rest[0];
    if (rest.length === 1) {
      return { endpoint: 'calendar:list', params: { familyId } };
    }
    if (rest[1] === 'change-request') {
      return {
        endpoint: 'calendar:change-request',
        params: { familyId, eventId: rest[2] },
      };
    }
    return { endpoint: 'calendar:event', params: { familyId, id: rest[1] } };
  }

  // AI Coach endpoint
  if (resource === 'ai-coach' && rest[0] === 'analyze') {
    return { endpoint: 'ai-coach:analyze', params: {} };
  }

  // Professional endpoints
  if (resource === 'professional') {
    if (rest.length < 1) return null;
    const familyId = rest[0];
    if (rest[1] === 'request-access') {
      return { endpoint: 'professional:request-access', params: { familyId } };
    }
    if (rest[1] === 'approve') {
      return { endpoint: 'professional:approve', params: { familyId } };
    }
    if (rest[1] === 'revoke') {
      return { endpoint: 'professional:revoke', params: { familyId } };
    }
    if (rest[1] === 'report') {
      return { endpoint: 'professional:report', params: { familyId } };
    }
  }

  // Export endpoints
  if (resource === 'export') {
    if (rest.length < 1) return null;
    const familyId = rest[0];
    const type = rest[1] || 'messages';
    return { endpoint: 'export:generate', params: { familyId, type } };
  }

  // Seed endpoint (solo para desarrollo)
  if (resource === 'seed') {
    return { endpoint: 'seed:run', params: {} };
  }

  return null;
}

/**
 * Autentica el request y retorna información del usuario
 */
async function authenticate(
  request: Request,
  env: Env
): Promise<{
  success: boolean;
  userId?: string;
  role?: string;
  familyId?: string;
}> {
  const token = getJWTFromCookie(request.headers.get('Cookie'));
  if (!token) {
    return { success: false };
  }

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) {
    return { success: false };
  }

  // Obtener familia del usuario
  const familyMember = await env.DB.prepare(
    `SELECT family_id FROM family_members WHERE user_id = ? LIMIT 1`
  )
    .bind(payload.userId)
    .first<{ family_id: string }>();

  return {
    success: true,
    userId: payload.userId,
    role: payload.role,
    familyId: familyMember?.family_id,
  };
}

/**
 * Obtiene el handler para un endpoint
 */
function getHandler(
  endpoint: string
): ((
  request: Request,
  ctx: Context,
  params: Record<string, string>
) => Promise<{ body: unknown; status: number }>) | null {
  const [resource, action] = endpoint.split(':');

  switch (resource) {
    case 'auth':
      return authHandler.handle as any;
    case 'family':
      return familyHandler.handle as any;
    case 'messages':
      return messagesHandler.handle as any;
    case 'calendar':
      return calendarHandler.handle as any;
    case 'ai-coach':
      return aiCoachHandler.handle as any;
    case 'professional':
      return professionalHandler.handle as any;
    case 'export':
      return exportHandler.handle as any;
    default:
      return null;
  }
}

/**
 * Helper para crear respuestas JSON
 */
function jsonResponse(
  data: unknown,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

