/**
 * Encriptación AES-GCM para datos sensibles
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits para GCM
const TAG_LENGTH = 128; // 128 bits

/**
 * Deriva una clave de encriptación desde una string
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  // Importar la clave base
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derivar la clave usando PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Genera un salt aleatorio
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Encripta un texto usando AES-GCM
 */
export async function encrypt(
  plaintext: string,
  encryptionKey: string
): Promise<string> {
  const salt = generateSalt();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(encryptionKey, salt);

  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    key,
    data
  );

  // Combinar salt + iv + encrypted data
  const combined = new Uint8Array(
    salt.length + iv.length + encrypted.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  // Convertir a base64 para almacenamiento
  return btoa(String.fromCharCode(...combined));
}

/**
 * Desencripta un texto usando AES-GCM
 */
export async function decrypt(
  ciphertext: string,
  encryptionKey: string
): Promise<string> {
  try {
    // Decodificar desde base64
    const combined = Uint8Array.from(
      atob(ciphertext),
      (c) => c.charCodeAt(0)
    );

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 16 + IV_LENGTH);
    const encrypted = combined.slice(16 + IV_LENGTH);

    const key = await deriveKey(encryptionKey, salt);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash de password usando SHA-256 + salt
 * Nota: En producción, considerar usar bcrypt si está disponible
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Genera un salt aleatorio para passwords
 */
export function generatePasswordSalt(): string {
  const array = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica un password contra un hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  return computedHash === hash;
}

