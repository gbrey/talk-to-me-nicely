/**
 * Handlers de autenticación
 */

import type { D1Database } from '~/utils/db';
import {
  signJWT,
  createJWTCookie,
  createDeleteJWTCookie,
} from '~/utils/jwt';
import {
  hashPassword,
  generatePasswordSalt,
  verifyPassword,
} from '~/utils/encryption';
import {
  isValidEmail,
  isValidPassword,
  sanitizeString,
} from '~/utils/validation';
import { getCurrentTimestamp } from '~/utils/timestamps';
import { logAudit, getClientIP, getUserAgent } from '~/utils/audit';
import { executeQueryFirst, executeMutation } from '~/utils/db';

interface Context {
  env: {
    DB: D1Database;
    JWT_SECRET: string;
    ENCRYPTION_KEY: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    APPLE_CLIENT_ID?: string;
    APPLE_TEAM_ID?: string;
    APPLE_KEY_ID?: string;
    APPLE_PRIVATE_KEY?: string;
  };
  userId?: string;
  userRole?: string;
  familyId?: string;
}

/**
 * Handler principal de autenticación
 */
export async function handle(
  request: Request,
  ctx: Context,
  params: Record<string, string>
): Promise<{ body: unknown; status: number }> {
  const method = request.method;
  const endpoint = params.endpoint || '';
  
  // Extraer acción del endpoint (ej: "auth:login" -> "login")
  const action = endpoint.split(':')[1] || '';

  try {
    console.log('Auth handler called:', { action, method, endpoint });
    switch (action) {
      case 'register':
        if (method === 'POST') {
          return await register(request, ctx);
        }
        break;

      case 'login':
        if (method === 'POST') {
          return await login(request, ctx);
        }
        break;

      case 'logout':
        if (method === 'POST') {
          return await logout();
        }
        break;

      case 'verify-email':
        if (method === 'POST') {
          return await verifyEmail(request, ctx);
        }
        break;

      case 'me':
        if (method === 'GET') {
          return await getCurrentUser(request, ctx);
        }
        break;

      case 'oauth':
        if (method === 'GET') {
          return await oauthCallback(request, ctx, params);
        }
        break;
    }

    return { body: { error: 'Method not allowed' }, status: 405 };
  } catch (error) {
    console.error('Auth error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Auth error details:', { message: errorMessage, stack: errorStack });
    return { 
      body: { 
        error: 'Internal server error',
        message: errorMessage,
      }, 
      status: 500 
    };
  }
}

/**
 * Registro de nuevo usuario
 */
async function register(
  request: Request,
  ctx: Context
): Promise<{ body: unknown; status: number }> {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return { body: { error: 'Invalid JSON in request body' }, status: 400 };
    }
    
    const { email, password, role = 'parent' } = body;
    console.log('Register attempt:', { email: email?.substring(0, 5) + '...', role });

  // Validaciones
  if (!email || !isValidEmail(email)) {
    return { body: { error: 'Email inválido' }, status: 400 };
  }

  if (!password || !isValidPassword(password)) {
    return {
      body: {
        error:
          'Password debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número',
      },
      status: 400,
    };
  }

  if (role !== 'parent' && role !== 'child' && role !== 'professional') {
    return { body: { error: 'Rol inválido' }, status: 400 };
  }

  // Verificar si el email ya existe
  const existingUser = await executeQueryFirst<{ id: string }>(
    ctx.env.DB,
    'SELECT id FROM users WHERE email = ?',
    [email.toLowerCase().trim()]
  );

  if (existingUser) {
    return { body: { error: 'Email ya registrado' }, status: 409 };
  }

  // Crear usuario
  const userId = crypto.randomUUID();
  const salt = generatePasswordSalt();
  const passwordHash = await hashPassword(password, salt);
  const timestamp = getCurrentTimestamp();

  await executeMutation(
    ctx.env.DB,
    `INSERT INTO users (id, email, password_hash, password_salt, role, email_verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, email.toLowerCase().trim(), passwordHash, salt, role, 0, timestamp, timestamp]
  );

  // Registrar consentimiento (Ley 25.326)
  const consentId = crypto.randomUUID();
  const ipAddress = getClientIP(request);
  const userAgent = getUserAgent(request);

  await executeMutation(
    ctx.env.DB,
    `INSERT INTO user_consents (id, user_id, consent_type, consented_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      consentId,
      userId,
      'data_processing',
      timestamp,
      ipAddress ?? null,
      userAgent ?? null,
    ]
  );

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId,
    action: 'user_registered',
    entityType: 'user',
    entityId: userId,
    ipAddress,
    userAgent,
  });

  // Generar token JWT (sin verificación de email por ahora)
  const token = await signJWT(
    {
      userId,
      email: email.toLowerCase().trim(),
      role,
    },
    ctx.env.JWT_SECRET
  );

  return {
    body: {
      success: true,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        role,
        emailVerified: false,
      },
      token,
    },
    status: 201,
  };
  } catch (error) {
    console.error('Register function error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      body: { 
        error: 'Error al procesar registro',
        message: errorMessage 
      }, 
      status: 500 
    };
  }
}

/**
 * Login de usuario
 */
async function login(
  request: Request,
  ctx: Context
): Promise<{ body: unknown; status: number }> {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return { body: { error: 'Invalid JSON in request body' }, status: 400 };
    }
    
    const { email, password } = body;
    console.log('Login attempt:', { email: email?.substring(0, 5) + '...' });

  if (!email || !password) {
    return { body: { error: 'Email y password requeridos' }, status: 400 };
  }

  // Buscar usuario
  const emailLower = email.toLowerCase().trim();
  console.log('Searching for user with email:', emailLower);
  
  const user = await executeQueryFirst<{
    id: string;
    email: string;
    password_hash: string;
    password_salt: string | null;
    role: string;
    email_verified: number;
  }>(
    ctx.env.DB,
    'SELECT id, email, password_hash, password_salt, role, email_verified FROM users WHERE email = ?',
    [emailLower]
  );

  if (!user) {
    console.error('User not found:', emailLower);
    return { body: { error: 'Credenciales inválidas' }, status: 401 };
  }
  
  console.log('User found:', { id: user.id, email: user.email, role: user.role });

  if (!user.password_salt) {
    return { body: { error: 'Usuario sin password configurado' }, status: 401 };
  }

  // Verificar password
  console.log('Verifying password for user:', user.email);
  console.log('Password salt exists:', !!user.password_salt);
  console.log('Password hash exists:', !!user.password_hash);
  
  const passwordValid = await verifyPassword(
    password,
    user.password_hash,
    user.password_salt
  );

  console.log('Password validation result:', passwordValid);

  if (!passwordValid) {
    console.error('Password validation failed for user:', user.email);
    return { body: { error: 'Credenciales inválidas' }, status: 401 };
  }

  // Generar token JWT
  console.log('Generating JWT token...');
  console.log('JWT_SECRET exists:', !!ctx.env.JWT_SECRET);
  
  const token = await signJWT(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    ctx.env.JWT_SECRET
  );
  
  console.log('JWT token generated successfully');

  // Log de auditoría
  const ipAddress = getClientIP(request);
  const userAgent = getUserAgent(request);
  await logAudit(ctx.env.DB, {
    userId: user.id,
    action: 'user_login',
    entityType: 'user',
    entityId: user.id,
    ipAddress,
    userAgent,
  });

  return {
    body: {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified === 1,
      },
      token,
    },
    status: 200,
  };
  } catch (error) {
    console.error('Login function error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      body: { 
        error: 'Error al procesar login',
        message: errorMessage 
      }, 
      status: 500 
    };
  }
}

/**
 * Logout de usuario
 */
async function logout(): Promise<{ body: unknown; status: number }> {
  return {
    body: { success: true },
    status: 200,
  };
}

/**
 * Verificación de email
 */
async function verifyEmail(
  request: Request,
  ctx: Context
): Promise<{ body: unknown; status: number }> {
  const body = await request.json();
  const { token } = body;

  // TODO: Implementar verificación de email con token
  // Por ahora, marcamos como verificado directamente
  if (!ctx.userId) {
    return { body: { error: 'Unauthorized' }, status: 401 };
  }

  await executeMutation(
    ctx.env.DB,
    'UPDATE users SET email_verified = 1 WHERE id = ?',
    [ctx.userId]
  );

  return {
    body: { success: true, message: 'Email verificado' },
    status: 200,
  };
}

/**
 * Obtiene el usuario actual
 */
async function getCurrentUser(
  request: Request,
  ctx: Context
): Promise<{ body: unknown; status: number }> {
  if (!ctx.userId) {
    return { body: { error: 'Unauthorized' }, status: 401 };
  }

  const user = await executeQueryFirst<{
    id: string;
    email: string;
    role: string;
    email_verified: number;
  }>(
    ctx.env.DB,
    'SELECT id, email, role, email_verified FROM users WHERE id = ?',
    [ctx.userId]
  );

  if (!user) {
    return { body: { error: 'User not found' }, status: 404 };
  }

  return {
    body: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified === 1,
      },
    },
    status: 200,
  };
}

/**
 * OAuth callback (Google/Apple)
 */
async function oauthCallback(
  request: Request,
  ctx: Context,
  params: Record<string, string>
): Promise<{ body: unknown; status: number }> {
  // TODO: Implementar OAuth completo
  // Por ahora retornamos error
  return {
    body: { error: 'OAuth not implemented yet' },
    status: 501,
  };
}

