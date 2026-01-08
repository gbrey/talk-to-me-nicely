/**
 * Handlers de calendario
 */

import type { D1Database } from '~/utils/db';
import { executeQuery, executeQueryFirst, executeMutation } from '~/utils/db';
import { isValidEventType, isValidTimestamp } from '~/utils/validation';
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
 * Handler principal de calendario
 */
export async function handle(
  request: Request,
  ctx: Context,
  params: Record<string, string>
): Promise<{ body: unknown; status: number }> {
  const method = request.method;
  const endpoint = params.endpoint || '';

  if (!ctx.userId) {
    return { body: { error: 'Unauthorized' }, status: 401 };
  }

  try {
    if (method === 'GET' && params.familyId) {
      return await listEvents(ctx, params.familyId);
    }
    
    if (method === 'POST' && params.familyId && !params.id && !params.eventId) {
      return await createEvent(request, ctx, params.familyId);
    }
    
    if (method === 'PATCH' && params.familyId && params.id) {
      return await updateEvent(request, ctx, params.familyId, params.id);
    }
    
    if (method === 'DELETE' && params.familyId && params.id) {
      return await deleteEvent(ctx, params.familyId, params.id);
    }
    
    if (method === 'POST' && params.familyId && params.eventId && endpoint.includes('change-request')) {
      return await createChangeRequest(request, ctx, params.familyId, params.eventId);
    }

    return { body: { error: 'Method not allowed' }, status: 405 };
  } catch (error) {
    console.error('Calendar error:', error);
    return { body: { error: 'Internal server error' }, status: 500 };
  }
}

/**
 * Lista eventos de una familia
 */
async function listEvents(
  ctx: Context,
  familyId: string
): Promise<{ body: unknown; status: number }> {
  if (!familyId) {
    return { body: { error: 'Family ID required' }, status: 400 };
  }

  // Verificar que el usuario pertenece a la familia
  const member = await executeQueryFirst<{ role: string }>(
    ctx.env.DB,
    `SELECT role FROM family_members WHERE user_id = ? AND family_id = ?`,
    [ctx.userId!, familyId]
  );

  if (!member) {
    return { body: { error: 'Family not found or access denied' }, status: 404 };
  }

  const events = await executeQuery<{
    id: string;
    event_type: string;
    title: string;
    description: string | null;
    start_time: number;
    end_time: number | null;
    all_day: number;
    responsible_parent: string | null;
    created_by: string;
    created_at: number;
    updated_at: number;
  }>(
    ctx.env.DB,
    `SELECT id, event_type, title, description, start_time, end_time, all_day,
            responsible_parent, created_by, created_at, updated_at
     FROM calendar_events
     WHERE family_id = ?
     ORDER BY start_time ASC`,
    [familyId]
  );

  return {
    body: {
      events: events.map((event) => ({
        id: event.id,
        eventType: event.event_type,
        title: event.title,
        description: event.description,
        startTime: event.start_time,
        endTime: event.end_time,
        allDay: event.all_day === 1,
        responsibleParent: event.responsible_parent,
        createdBy: event.created_by,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
      })),
    },
    status: 200,
  };
}

/**
 * Crea un nuevo evento
 */
async function createEvent(
  request: Request,
  ctx: Context,
  familyId: string
): Promise<{ body: unknown; status: number }> {
  if (!familyId) {
    return { body: { error: 'Family ID required' }, status: 400 };
  }

  // Verificar que el usuario pertenece a la familia
  const member = await executeQueryFirst<{ role: string }>(
    ctx.env.DB,
    `SELECT role FROM family_members WHERE user_id = ? AND family_id = ?`,
    [ctx.userId!, familyId]
  );

  if (!member) {
    return { body: { error: 'Family not found or access denied' }, status: 404 };
  }

  // Professional no puede crear eventos
  if (member.role === 'professional') {
    return { body: { error: 'Professionals cannot create events' }, status: 403 };
  }

  const body = await request.json();
  const {
    eventType,
    title,
    description,
    startTime,
    endTime,
    allDay = false,
    responsibleParent,
  } = body;

  if (!eventType || !isValidEventType(eventType)) {
    return { body: { error: 'Invalid event type' }, status: 400 };
  }

  if (!title || title.trim().length === 0) {
    return { body: { error: 'Title required' }, status: 400 };
  }

  if (!startTime || !isValidTimestamp(startTime)) {
    return { body: { error: 'Valid start time required' }, status: 400 };
  }

  if (endTime && !isValidTimestamp(endTime)) {
    return { body: { error: 'Invalid end time' }, status: 400 };
  }

  if (endTime && endTime < startTime) {
    return { body: { error: 'End time must be after start time' }, status: 400 };
  }

  const eventId = crypto.randomUUID();
  const timestamp = getCurrentTimestamp();

  await executeMutation(
    ctx.env.DB,
    `INSERT INTO calendar_events (id, family_id, event_type, title, description,
                                  start_time, end_time, all_day, responsible_parent,
                                  created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      eventId,
      familyId,
      eventType,
      title.trim(),
      description ? description.trim() : null,
      startTime,
      endTime || null,
      allDay ? 1 : 0,
      responsibleParent || null,
      ctx.userId!,
      timestamp,
      timestamp,
    ]
  );

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId: ctx.userId,
    familyId,
    action: 'event_created',
    entityType: 'calendar_event',
    entityId: eventId,
    details: { eventType, title },
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });

  return {
    body: {
      success: true,
      event: {
        id: eventId,
        eventType,
        title,
        description,
        startTime,
        endTime,
        allDay,
        responsibleParent,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
    status: 201,
  };
}

/**
 * Actualiza un evento
 */
async function updateEvent(
  request: Request,
  ctx: Context,
  familyId: string,
  eventId: string
): Promise<{ body: unknown; status: number }> {
  if (!familyId || !eventId) {
    return { body: { error: 'Family ID and Event ID required' }, status: 400 };
  }

  // Verificar que el usuario pertenece a la familia
  const member = await executeQueryFirst<{ role: string }>(
    ctx.env.DB,
    `SELECT role FROM family_members WHERE user_id = ? AND family_id = ?`,
    [ctx.userId!, familyId]
  );

  if (!member) {
    return { body: { error: 'Family not found or access denied' }, status: 404 };
  }

  // Professional no puede modificar eventos
  if (member.role === 'professional') {
    return { body: { error: 'Professionals cannot modify events' }, status: 403 };
  }

  // Verificar que el evento existe
  const event = await executeQueryFirst<{ created_by: string }>(
    ctx.env.DB,
    `SELECT created_by FROM calendar_events WHERE id = ? AND family_id = ?`,
    [eventId, familyId]
  );

  if (!event) {
    return { body: { error: 'Event not found' }, status: 404 };
  }

  const body = await request.json();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined) {
    updates.push('title = ?');
    values.push(body.title.trim());
  }

  if (body.description !== undefined) {
    updates.push('description = ?');
    values.push(body.description ? body.description.trim() : null);
  }

  if (body.startTime !== undefined) {
    if (!isValidTimestamp(body.startTime)) {
      return { body: { error: 'Invalid start time' }, status: 400 };
    }
    updates.push('start_time = ?');
    values.push(body.startTime);
  }

  if (body.endTime !== undefined) {
    if (body.endTime !== null && !isValidTimestamp(body.endTime)) {
      return { body: { error: 'Invalid end time' }, status: 400 };
    }
    updates.push('end_time = ?');
    values.push(body.endTime);
  }

  if (body.allDay !== undefined) {
    updates.push('all_day = ?');
    values.push(body.allDay ? 1 : 0);
  }

  if (body.responsibleParent !== undefined) {
    updates.push('responsible_parent = ?');
    values.push(body.responsibleParent || null);
  }

  if (updates.length === 0) {
    return { body: { error: 'No fields to update' }, status: 400 };
  }

  updates.push('updated_at = ?');
  values.push(getCurrentTimestamp());
  values.push(eventId);
  values.push(familyId);

  await executeMutation(
    ctx.env.DB,
    `UPDATE calendar_events SET ${updates.join(', ')}
     WHERE id = ? AND family_id = ?`,
    values
  );

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId: ctx.userId,
    familyId,
    action: 'event_updated',
    entityType: 'calendar_event',
    entityId: eventId,
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });

  return {
    body: { success: true, message: 'Event updated' },
    status: 200,
  };
}

/**
 * Elimina un evento
 */
async function deleteEvent(
  ctx: Context,
  familyId: string,
  eventId: string
): Promise<{ body: unknown; status: number }> {
  if (!familyId || !eventId) {
    return { body: { error: 'Family ID and Event ID required' }, status: 400 };
  }

  // Verificar que el usuario pertenece a la familia
  const member = await executeQueryFirst<{ role: string }>(
    ctx.env.DB,
    `SELECT role FROM family_members WHERE user_id = ? AND family_id = ?`,
    [ctx.userId!, familyId]
  );

  if (!member) {
    return { body: { error: 'Family not found or access denied' }, status: 404 };
  }

  // Professional no puede eliminar eventos
  if (member.role === 'professional') {
    return { body: { error: 'Professionals cannot delete events' }, status: 403 };
  }

  // Verificar que el evento existe
  const event = await executeQueryFirst<{ id: string }>(
    ctx.env.DB,
    `SELECT id FROM calendar_events WHERE id = ? AND family_id = ?`,
    [eventId, familyId]
  );

  if (!event) {
    return { body: { error: 'Event not found' }, status: 404 };
  }

  await executeMutation(
    ctx.env.DB,
    `DELETE FROM calendar_events WHERE id = ? AND family_id = ?`,
    [eventId, familyId]
  );

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId: ctx.userId,
    familyId,
    action: 'event_deleted',
    entityType: 'calendar_event',
    entityId: eventId,
  });

  return {
    body: { success: true, message: 'Event deleted' },
    status: 200,
  };
}

/**
 * Crea una solicitud de cambio de evento
 */
async function createChangeRequest(
  request: Request,
  ctx: Context,
  familyId: string,
  eventId: string
): Promise<{ body: unknown; status: number }> {
  if (!familyId || !eventId) {
    return { body: { error: 'Family ID and Event ID required' }, status: 400 };
  }

  // Verificar que el usuario pertenece a la familia
  const member = await executeQueryFirst<{ role: string }>(
    ctx.env.DB,
    `SELECT role FROM family_members WHERE user_id = ? AND family_id = ?`,
    [ctx.userId!, familyId]
  );

  if (!member) {
    return { body: { error: 'Family not found or access denied' }, status: 404 };
  }

  // Professional no puede crear solicitudes
  if (member.role === 'professional') {
    return {
      body: { error: 'Professionals cannot create change requests' },
      status: 403,
    };
  }

  // Verificar que el evento existe
  const event = await executeQueryFirst<{
    start_time: number;
    created_by: string;
  }>(
    ctx.env.DB,
    `SELECT start_time, created_by FROM calendar_events WHERE id = ? AND family_id = ?`,
    [eventId, familyId]
  );

  if (!event) {
    return { body: { error: 'Event not found' }, status: 404 };
  }

  const body = await request.json();
  const { proposedStart, reason } = body;

  if (!proposedStart || !isValidTimestamp(proposedStart)) {
    return { body: { error: 'Valid proposed start time required' }, status: 400 };
  }

  const requestId = crypto.randomUUID();
  const timestamp = getCurrentTimestamp();

  await executeMutation(
    ctx.env.DB,
    `INSERT INTO event_change_requests (id, event_id, requested_by, original_start,
                                        proposed_start, reason, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      requestId,
      eventId,
      ctx.userId!,
      event.start_time,
      proposedStart,
      reason ? reason.trim() : null,
      'pending',
      timestamp,
    ]
  );

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId: ctx.userId,
    familyId,
    action: 'change_request_created',
    entityType: 'event_change_request',
    entityId: requestId,
    details: { eventId, proposedStart },
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });

  return {
    body: {
      success: true,
      request: {
        id: requestId,
        eventId,
        proposedStart,
        reason,
        status: 'pending',
        createdAt: timestamp,
      },
    },
    status: 201,
  };
}

