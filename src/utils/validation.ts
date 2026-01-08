/**
 * Validación y sanitización de inputs
 */

/**
 * Valida un email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Valida un password (mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número)
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/**
 * Valida un PIN de 4 dígitos
 */
export function isValidPIN(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Valida un código de invitación de 6 dígitos
 */
export function isValidInvitationCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Valida un UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitiza un string para prevenir XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitiza HTML pero permite formato básico
 */
export function sanitizeHTML(html: string): string {
  // Remover scripts y eventos
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');

  // Permitir solo tags básicos de formato
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'];
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

  sanitized = sanitized.replace(tagRegex, (match, tagName) => {
    if (allowedTags.includes(tagName.toLowerCase())) {
      return match;
    }
    return '';
  });

  return sanitized;
}

/**
 * Valida un canal de mensajería
 */
export function isValidChannel(
  channel: string
): channel is 'daily' | 'health' | 'school' | 'calendar' | 'vacation' {
  return ['daily', 'health', 'school', 'calendar', 'vacation'].includes(channel);
}

/**
 * Valida un tipo de evento de calendario
 */
export function isValidEventType(
  eventType: string
): eventType is 'pickup' | 'dropoff' | 'medical' | 'school' | 'vacation' | 'other' {
  return ['pickup', 'dropoff', 'medical', 'school', 'vacation', 'other'].includes(
    eventType
  );
}

/**
 * Valida un rol de usuario
 */
export function isValidRole(
  role: string
): role is 'parent' | 'child' | 'professional' {
  return ['parent', 'child', 'professional'].includes(role);
}

/**
 * Valida un tipo de profesional
 */
export function isValidProfessionalType(
  type: string
): type is 'lawyer' | 'mediator' | 'therapist' | 'social_worker' {
  return ['lawyer', 'mediator', 'therapist', 'social_worker'].includes(type);
}

/**
 * Valida un timestamp Unix
 */
export function isValidTimestamp(timestamp: number): boolean {
  return (
    Number.isInteger(timestamp) &&
    timestamp > 0 &&
    timestamp <= Date.now() / 1000 + 86400 * 365 * 10 // Máximo 10 años en el futuro
  );
}

/**
 * Limita la longitud de un string
 */
export function limitLength(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength);
}

/**
 * Valida que un número esté en un rango
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Valida formato de archivo por extensión
 */
export function isValidFileType(
  filename: string,
  allowedExtensions: string[]
): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return false;
  return allowedExtensions.includes(extension);
}

/**
 * Valida tamaño de archivo (en bytes)
 */
export function isValidFileSize(size: number, maxSizeBytes: number): boolean {
  return size > 0 && size <= maxSizeBytes;
}

