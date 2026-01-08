/**
 * Helpers para JWT
 */

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Genera un JWT token
 */
export async function signJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInDays: number = 7
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInDays * 24 * 60 * 60;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const jwtPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));

  const signature = await createSignature(
    `${encodedHeader}.${encodedPayload}`,
    secret
  );

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifica y decodifica un JWT token
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verificar firma
    const expectedSignature = await createSignature(
      `${encodedHeader}.${encodedPayload}`,
      secret
    );

    if (signature !== expectedSignature) {
      return null;
    }

    // Decodificar payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload;

    // Verificar expiración
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Crea la firma HMAC-SHA256
 */
async function createSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );
}

/**
 * Codifica en Base64URL
 */
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decodifica desde Base64URL
 */
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

/**
 * Extrae el token JWT de las cookies
 */
export function getJWTFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const jwtCookie = cookies.find((c) => c.startsWith('jwt='));

  if (!jwtCookie) return null;

  return jwtCookie.substring(4);
}

/**
 * Crea una cookie HTTP para el JWT
 */
export function createJWTCookie(token: string, maxAgeDays: number = 7): string {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  // SameSite=Lax permite que la cookie se envíe en requests cross-site de nivel superior (navegación)
  // pero no en sub-requests (como imágenes o iframes)
  return `jwt=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

/**
 * Crea una cookie para eliminar el JWT
 */
export function createDeleteJWTCookie(): string {
  return 'jwt=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}

