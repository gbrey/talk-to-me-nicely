/**
 * Handlers de acceso profesional
 */

import type { D1Database } from '~/utils/db';
import { executeQuery, executeQueryFirst, executeMutation } from '~/utils/db';
import { isValidProfessionalType } from '~/utils/validation';
import { getCurrentTimestamp } from '~/utils/timestamps';
import { logAudit, getClientIP, getUserAgent } from '~/utils/audit';

interface Context {
  env: {
    DB: D1Database;
  };
  userId?: string;
  userRole?: string;
  familyId?: string;
}

/**
 * Handler principal de profesionales
 */
export async function handle(
  request: Request,
  ctx: Context,
  params: Record<string, string>
): Promise<{ body: unknown; status: number }> {
  const method = request.method;
  const endpoint = params.endpoint || '';
  const action = endpoint.split(':')[1] || '';

  if (!ctx.userId) {
    return { body: { error: 'Unauthorized' }, status: 401 };
  }

  try {
    if (method === 'POST' && action === 'request-access') {
      return await requestAccess(request, ctx, params.familyId);
    }
    
    if (method === 'POST' && action === 'approve') {
      return await approveAccess(request, ctx, params.familyId);
    }
    
    if (method === 'POST' && action === 'revoke') {
      return await revokeAccess(request, ctx, params.familyId);
    }
    
    if (method === 'GET' && action === 'report') {
      return await generateReport(ctx, params.familyId);
    }

    return { body: { error: 'Method not allowed' }, status: 405 };
  } catch (error) {
    console.error('Professional error:', error);
    return { body: { error: 'Internal server error' }, status: 500 };
  }
}

/**
 * Solicita acceso profesional a una familia
 */
async function requestAccess(
  request: Request,
  ctx: Context,
  familyId: string
): Promise<{ body: unknown; status: number }> {
  if (!familyId) {
    return { body: { error: 'Family ID required' }, status: 400 };
  }

  // Verificar que el usuario es profesional
  if (ctx.userRole !== 'professional') {
    return {
      body: { error: 'Only professionals can request access' },
      status: 403,
    };
  }

  // Verificar que la familia existe
  const family = await executeQueryFirst<{ id: string }>(
    ctx.env.DB,
    'SELECT id FROM families WHERE id = ?',
    [familyId]
  );

  if (!family) {
    return { body: { error: 'Family not found' }, status: 404 };
  }

  const body = await request.json();
  const { professionalType } = body;

  if (!professionalType || !isValidProfessionalType(professionalType)) {
    return { body: { error: 'Invalid professional type' }, status: 400 };
  }

  // Verificar si ya existe una solicitud
  const existing = await executeQueryFirst<{ id: string }>(
    ctx.env.DB,
    `SELECT id FROM professional_access
     WHERE family_id = ? AND user_id = ?`,
    [familyId, ctx.userId!]
  );

  if (existing) {
    return {
      body: { error: 'Access request already exists' },
      status: 409,
    };
  }

  const accessId = crypto.randomUUID();
  const timestamp = getCurrentTimestamp();

  await executeMutation(
    ctx.env.DB,
    `INSERT INTO professional_access (id, family_id, user_id, professional_type,
                                      approved_by_parent1, approved_by_parent2,
                                      created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [accessId, familyId, ctx.userId!, professionalType, 0, 0, timestamp]
  );

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId: ctx.userId,
    familyId,
    action: 'professional_access_requested',
    entityType: 'professional_access',
    entityId: accessId,
    details: { professionalType },
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });

  return {
    body: {
      success: true,
      message: 'Access request created. Waiting for parent approval.',
      accessId,
    },
    status: 201,
  };
}

/**
 * Aprueba acceso profesional (requiere ambos padres)
 */
async function approveAccess(
  request: Request,
  ctx: Context,
  familyId: string
): Promise<{ body: unknown; status: number }> {
  if (!familyId) {
    return { body: { error: 'Family ID required' }, status: 400 };
  }

  // Verificar que el usuario es parent
  if (ctx.userRole !== 'parent') {
    return { body: { error: 'Only parents can approve access' }, status: 403 };
  }

  // Verificar que el usuario pertenece a la familia
  const member = await executeQueryFirst<{ role: string }>(
    ctx.env.DB,
    `SELECT role FROM family_members WHERE user_id = ? AND family_id = ?`,
    [ctx.userId!, familyId]
  );

  if (!member || member.role !== 'parent') {
    return { body: { error: 'Family not found or access denied' }, status: 404 };
  }

  const body = await request.json();
  const { professionalUserId } = body;

  if (!professionalUserId) {
    return { body: { error: 'Professional user ID required' }, status: 400 };
  }

  // Obtener acceso profesional
  const access = await executeQueryFirst<{
    id: string;
    approved_by_parent1: number;
    approved_by_parent2: number;
    user_id: string;
  }>(
    ctx.env.DB,
    `SELECT id, approved_by_parent1, approved_by_parent2, user_id
     FROM professional_access
     WHERE family_id = ? AND user_id = ?`,
    [familyId, professionalUserId]
  );

  if (!access) {
    return { body: { error: 'Access request not found' }, status: 404 };
  }

  // Obtener lista de padres
  const parents = await executeQuery<{ user_id: string }>(
    ctx.env.DB,
    `SELECT user_id FROM family_members
     WHERE family_id = ? AND role = 'parent'
     ORDER BY joined_at ASC`,
    [familyId]
  );

  if (parents.length < 2) {
    return {
      body: { error: 'Family must have at least 2 parents' },
      status: 400,
    };
  }

  const parent1Id = parents[0].user_id;
  const parent2Id = parents[1].user_id;

  // Determinar qué padre está aprobando
  let updateField: string;
  if (ctx.userId === parent1Id) {
    updateField = 'approved_by_parent1';
  } else if (ctx.userId === parent2Id) {
    updateField = 'approved_by_parent2';
  } else {
    return { body: { error: 'Invalid parent' }, status: 403 };
  }

  // Actualizar aprobación
  await executeMutation(
    ctx.env.DB,
    `UPDATE professional_access SET ${updateField} = 1 WHERE id = ?`,
    [access.id]
  );

  // Verificar si ambos padres aprobaron
  const updated = await executeQueryFirst<{
    approved_by_parent1: number;
    approved_by_parent2: number;
  }>(
    ctx.env.DB,
    `SELECT approved_by_parent1, approved_by_parent2
     FROM professional_access WHERE id = ?`,
    [access.id]
  );

  if (updated && updated.approved_by_parent1 === 1 && updated.approved_by_parent2 === 1) {
    // Ambos aprobaron, activar acceso
    const timestamp = getCurrentTimestamp();
    await executeMutation(
      ctx.env.DB,
      `UPDATE professional_access SET granted_at = ? WHERE id = ?`,
      [timestamp, access.id]
    );
  }

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId: ctx.userId,
    familyId,
    action: 'professional_access_approved',
    entityType: 'professional_access',
    entityId: access.id,
    details: { professionalUserId },
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });

  return {
    body: {
      success: true,
      message: 'Access approved',
      fullyApproved:
        updated?.approved_by_parent1 === 1 && updated?.approved_by_parent2 === 1,
    },
    status: 200,
  };
}

/**
 * Revoca acceso profesional
 */
async function revokeAccess(
  request: Request,
  ctx: Context,
  familyId: string
): Promise<{ body: unknown; status: number }> {
  if (!familyId) {
    return { body: { error: 'Family ID required' }, status: 400 };
  }

  // Verificar que el usuario es parent
  if (ctx.userRole !== 'parent') {
    return { body: { error: 'Only parents can revoke access' }, status: 403 };
  }

  // Verificar que el usuario pertenece a la familia
  const member = await executeQueryFirst<{ role: string }>(
    ctx.env.DB,
    `SELECT role FROM family_members WHERE user_id = ? AND family_id = ?`,
    [ctx.userId!, familyId]
  );

  if (!member || member.role !== 'parent') {
    return { body: { error: 'Family not found or access denied' }, status: 404 };
  }

  const body = await request.json();
  const { professionalUserId } = body;

  if (!professionalUserId) {
    return { body: { error: 'Professional user ID required' }, status: 400 };
  }

  // Verificar que el acceso existe
  const access = await executeQueryFirst<{ id: string }>(
    ctx.env.DB,
    `SELECT id FROM professional_access
     WHERE family_id = ? AND user_id = ?`,
    [familyId, professionalUserId]
  );

  if (!access) {
    return { body: { error: 'Access not found' }, status: 404 };
  }

  // Revocar acceso
  const timestamp = getCurrentTimestamp();
  await executeMutation(
    ctx.env.DB,
    `UPDATE professional_access SET revoked_at = ? WHERE id = ?`,
    [timestamp, access.id]
  );

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId: ctx.userId,
    familyId,
    action: 'professional_access_revoked',
    entityType: 'professional_access',
    entityId: access.id,
    details: { professionalUserId },
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });

  return {
    body: {
      success: true,
      message: 'Access revoked',
    },
    status: 200,
  };
}

/**
 * Genera un reporte profesional
 */
async function generateReport(
  ctx: Context,
  familyId: string
): Promise<{ body: unknown; status: number }> {
  if (!familyId) {
    return { body: { error: 'Family ID required' }, status: 400 };
  }

  // Verificar que el usuario es profesional
  if (ctx.userRole !== 'professional') {
    return {
      body: { error: 'Only professionals can generate reports' },
      status: 403,
    };
  }

  // Verificar que tiene acceso activo
  const access = await executeQueryFirst<{
    id: string;
    granted_at: number | null;
    revoked_at: number | null;
  }>(
    ctx.env.DB,
    `SELECT id, granted_at, revoked_at FROM professional_access
     WHERE family_id = ? AND user_id = ?`,
    [familyId, ctx.userId!]
  );

  if (
    !access ||
    !access.granted_at ||
    (access.revoked_at && access.revoked_at < getCurrentTimestamp())
  ) {
    return {
      body: { error: 'Access denied or revoked' },
      status: 403,
    };
  }

  // Obtener mensajes y eventos del último mes
  const oneMonthAgo = getCurrentTimestamp() - 30 * 24 * 60 * 60;

  const messages = await executeQuery<{
    id: string;
    channel: string;
    content: string;
    sent_at: number;
    sender_email: string;
  }>(
    ctx.env.DB,
    `SELECT m.id, m.channel, m.content, m.sent_at, u.email as sender_email
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.family_id = ? AND m.sent_at >= ?
     ORDER BY m.sent_at DESC`,
    [familyId, oneMonthAgo]
  );

  const events = await executeQuery<{
    id: string;
    event_type: string;
    title: string;
    start_time: number;
  }>(
    ctx.env.DB,
    `SELECT id, event_type, title, start_time
     FROM calendar_events
     WHERE family_id = ? AND start_time >= ?
     ORDER BY start_time ASC`,
    [familyId, oneMonthAgo]
  );

  return {
    body: {
      success: true,
      report: {
        familyId,
        period: {
          start: oneMonthAgo,
          end: getCurrentTimestamp(),
        },
        messages: messages.map((m) => ({
          id: m.id,
          channel: m.channel,
          content: m.content,
          sentAt: m.sent_at,
          senderEmail: m.sender_email,
        })),
        events: events.map((e) => ({
          id: e.id,
          eventType: e.event_type,
          title: e.title,
          startTime: e.start_time,
        })),
      },
    },
    status: 200,
  };
}

