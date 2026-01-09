/**
 * Helpers para audit log
 */

import type { D1Database } from './db';
import { getCurrentTimestamp } from './timestamps';
import { executeMutation } from './db';

export interface AuditLogEntry {
  familyId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string | Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registra una acción en el audit log
 */
export async function logAudit(
  db: D1Database,
  entry: AuditLogEntry
): Promise<void> {
  const id = crypto.randomUUID();
  const timestamp = getCurrentTimestamp();

  // Handle details: if it's an object, stringify it; if it's a string, use it directly; if undefined, use null
  const detailsValue = entry.details === undefined 
    ? null 
    : typeof entry.details === 'string' 
      ? entry.details 
      : JSON.stringify(entry.details);

  await executeMutation(
    db,
    `INSERT INTO audit_log (id, family_id, user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.familyId ?? null,
      entry.userId ?? null,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      detailsValue,
      entry.ipAddress ?? null,
      entry.userAgent ?? null,
      timestamp
    ]
  );
}

/**
 * Obtiene el IP address del request
 */
export function getClientIP(request: Request): string | undefined {
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIP) return cfConnectingIP;

  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  return undefined;
}

/**
 * Obtiene el user agent del request
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('User-Agent') || undefined;
}

