/**
 * Handlers de exportación de reportes
 */

import type { D1Database } from '~/utils/db';
import { executeQuery, executeQueryFirst } from '~/utils/db';
import { getCurrentTimestamp, generateContentHash } from '~/utils/timestamps';
import { logAudit } from '~/utils/audit';

interface Context {
  env: {
    DB: D1Database;
  };
  userId?: string;
  userRole?: string;
  familyId?: string;
}

/**
 * Handler principal de exportación
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
    if (method === 'GET' && endpoint.includes('generate')) {
      return await generateExport(ctx, params.familyId, params.type || 'messages');
    }

    return { body: { error: 'Method not allowed' }, status: 405 };
  } catch (error) {
    console.error('Export error:', error);
    return { body: { error: 'Internal server error' }, status: 500 };
  }
}

/**
 * Genera un export (PDF simulado como JSON por ahora)
 */
async function generateExport(
  ctx: Context,
  familyId: string,
  type: string
): Promise<{ body: unknown; status: number }> {
  if (!familyId) {
    return { body: { error: 'Family ID required' }, status: 400 };
  }

  // Verificar acceso (profesional o parent)
  if (ctx.userRole !== 'professional' && ctx.userRole !== 'parent') {
    return { body: { error: 'Access denied' }, status: 403 };
  }

  // Verificar que el usuario tiene acceso a la familia
  const member = await executeQueryFirst<{ role: string }>(
    ctx.env.DB,
    `SELECT role FROM family_members WHERE user_id = ? AND family_id = ?`,
    [ctx.userId!, familyId]
  );

  if (!member) {
    // Si es profesional, verificar acceso profesional
    if (ctx.userRole === 'professional') {
      const access = await executeQueryFirst<{
        granted_at: number | null;
        revoked_at: number | null;
      }>(
        ctx.env.DB,
        `SELECT granted_at, revoked_at FROM professional_access
         WHERE family_id = ? AND user_id = ?`,
        [familyId, ctx.userId!]
      );

      if (
        !access ||
        !access.granted_at ||
        (access.revoked_at && access.revoked_at < getCurrentTimestamp())
      ) {
        return { body: { error: 'Access denied' }, status: 403 };
      }
    } else {
      return { body: { error: 'Family not found or access denied' }, status: 404 };
    }
  }

  // Parsear parámetros de fecha
  const url = new URL(request.url);
  const periodStart = url.searchParams.get('start')
    ? parseInt(url.searchParams.get('start')!)
    : getCurrentTimestamp() - 30 * 24 * 60 * 60; // Último mes por defecto
  const periodEnd = url.searchParams.get('end')
    ? parseInt(url.searchParams.get('end')!)
    : getCurrentTimestamp();

  let exportData: unknown;
  let contentHash: string;

  if (type === 'messages') {
    // Exportar mensajes
    const messages = await executeQuery<{
      id: string;
      channel: string;
      content: string;
      content_hash: string;
      sent_at: number;
      delivered_at: number | null;
      sender_email: string;
    }>(
      ctx.env.DB,
      `SELECT m.id, m.channel, m.content, m.content_hash, m.sent_at,
              m.delivered_at, u.email as sender_email
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.family_id = ? AND m.sent_at >= ? AND m.sent_at <= ?
       ORDER BY m.sent_at ASC`,
      [familyId, periodStart, periodEnd]
    );

    exportData = {
      type: 'messages',
      familyId,
      period: { start: periodStart, end: periodEnd },
      generatedAt: getCurrentTimestamp(),
      generatedBy: ctx.userId,
      messages: messages.map((m) => ({
        id: m.id,
        channel: m.channel,
        content: m.content,
        contentHash: m.content_hash,
        sentAt: m.sent_at,
        deliveredAt: m.delivered_at,
        senderEmail: m.sender_email,
      })),
    };

    contentHash = await generateContentHash(JSON.stringify(exportData));
  } else if (type === 'calendar') {
    // Exportar calendario
    const events = await executeQuery<{
      id: string;
      event_type: string;
      title: string;
      description: string | null;
      start_time: number;
      end_time: number | null;
      all_day: number;
    }>(
      ctx.env.DB,
      `SELECT id, event_type, title, description, start_time, end_time, all_day
       FROM calendar_events
       WHERE family_id = ? AND start_time >= ? AND start_time <= ?
       ORDER BY start_time ASC`,
      [familyId, periodStart, periodEnd]
    );

    exportData = {
      type: 'calendar',
      familyId,
      period: { start: periodStart, end: periodEnd },
      generatedAt: getCurrentTimestamp(),
      generatedBy: ctx.userId,
      events: events.map((e) => ({
        id: e.id,
        eventType: e.event_type,
        title: e.title,
        description: e.description,
        startTime: e.start_time,
        endTime: e.end_time,
        allDay: e.all_day === 1,
      })),
    };

    contentHash = await generateContentHash(JSON.stringify(exportData));
  } else {
    return { body: { error: 'Invalid export type' }, status: 400 };
  }

  // Guardar reporte
  const reportId = crypto.randomUUID();
  await executeQueryFirst(
    ctx.env.DB,
    `INSERT INTO professional_reports (id, family_id, generated_by, report_type,
                                        period_start, period_end, content_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reportId,
      familyId,
      ctx.userId!,
      type,
      periodStart,
      periodEnd,
      contentHash,
      getCurrentTimestamp(),
    ]
  );

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId: ctx.userId,
    familyId,
    action: 'export_generated',
    entityType: 'professional_report',
    entityId: reportId,
    details: { type, periodStart, periodEnd },
  });

  return {
    body: {
      success: true,
      report: {
        ...exportData,
        id: reportId,
        contentHash,
        // En producción, aquí se generaría el PDF real
        // Por ahora retornamos JSON
      },
    },
    status: 200,
  };
}

