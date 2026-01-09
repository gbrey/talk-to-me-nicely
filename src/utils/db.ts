/**
 * Helpers y tipos para Cloudflare D1
 */

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1ExecResult>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  success: boolean;
  meta: {
    duration: number;
    size_after?: number;
    rows_read?: number;
    rows_written?: number;
    last_row_id?: number;
    changed_db?: boolean;
    changes?: number;
  };
  results?: T[];
  error?: string;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

/**
 * Tipos de datos de la base de datos
 */
export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  oauth_provider: string | null;
  oauth_id: string | null;
  role: 'parent' | 'child' | 'professional';
  email_verified: number;
  created_at: number;
  updated_at: number;
}

export interface UserConsent {
  id: string;
  user_id: string;
  consent_type: string;
  consented_at: number;
  ip_address: string | null;
  user_agent: string | null;
}

export interface Family {
  id: string;
  name: string | null;
  created_at: number;
  created_by: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'parent' | 'child' | 'professional';
  display_name: string | null;
  joined_at: number;
  invited_by: string | null;
}

export interface Invitation {
  id: string;
  family_id: string;
  code: string;
  role: 'parent' | 'child' | 'professional';
  invited_by: string;
  email: string | null;
  expires_at: number;
  used_at: number | null;
  used_by: string | null;
}

export interface Message {
  id: string;
  family_id: string;
  channel: 'daily' | 'health' | 'school' | 'calendar' | 'vacation';
  sender_id: string;
  content: string;
  content_hash: string;
  attachments: string | null;
  share_with_child: number;
  created_at: number;
  sent_at: number;
  delivered_at: number | null;
}

export interface MessageRead {
  id: string;
  message_id: string;
  user_id: string;
  first_viewed_at: number;
}

export interface AICoachLog {
  id: string;
  message_id: string | null;
  user_id: string;
  original_content: string;
  has_issues: number;
  issues: string | null;
  suggestion: string | null;
  user_action: string | null;
  created_at: number;
}

export interface CalendarEvent {
  id: string;
  family_id: string;
  event_type: 'pickup' | 'dropoff' | 'medical' | 'school' | 'vacation' | 'other';
  title: string;
  description: string | null;
  start_time: number;
  end_time: number | null;
  all_day: number;
  responsible_parent: string | null;
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface EventChangeRequest {
  id: string;
  event_id: string;
  requested_by: string;
  original_start: number;
  proposed_start: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'counterproposed';
  responded_by: string | null;
  responded_at: number | null;
  created_at: number;
}

export interface AuditLog {
  id: string;
  family_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: number;
}

export interface ProfessionalAccess {
  id: string;
  family_id: string;
  user_id: string;
  professional_type: 'lawyer' | 'mediator' | 'therapist' | 'social_worker';
  approved_by_parent1: number;
  approved_by_parent2: number;
  granted_at: number | null;
  revoked_at: number | null;
  created_at: number;
}

export interface ProfessionalReport {
  id: string;
  family_id: string;
  generated_by: string;
  report_type: string;
  period_start: number;
  period_end: number;
  content_hash: string;
  created_at: number;
}

/**
 * Helper para ejecutar queries de forma segura
 */
export async function executeQuery<T = unknown>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  let stmt = db.prepare(query);
  if (params.length > 0) {
    // Normalize undefined values to null for D1 compatibility
    const normalizedParams = params.map(param => param === undefined ? null : param);
    stmt = stmt.bind(...normalizedParams);
  }
  const result = await stmt.all<T>();
  if (!result.success) {
    throw new Error(result.error || 'Database query failed');
  }
  return result.results || [];
}

/**
 * Helper para ejecutar una query y obtener el primer resultado
 */
export async function executeQueryFirst<T = unknown>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T | null> {
  let stmt = db.prepare(query);
  if (params.length > 0) {
    // Normalize undefined values to null for D1 compatibility
    const normalizedParams = params.map(param => param === undefined ? null : param);
    stmt = stmt.bind(...normalizedParams);
  }
  return await stmt.first<T>();
}

/**
 * Helper para ejecutar una query de inserción/actualización
 */
export async function executeMutation(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<{ success: boolean; lastInsertRowid?: number; changes?: number }> {
  let stmt = db.prepare(query);
  if (params.length > 0) {
    // Normalize undefined values to null for D1 compatibility
    const normalizedParams = params.map(param => param === undefined ? null : param);
    stmt = stmt.bind(...normalizedParams);
  }
  const result = await stmt.run();
  return {
    success: result.success,
    lastInsertRowid: result.meta.last_row_id,
    changes: result.meta.changes,
  };
}

