/**
 * Handler de Analytics
 */

import type { D1Database } from '~/utils/db';
import { executeQuery, executeQueryFirst } from '~/utils/db';

interface Context {
  env: {
    DB: D1Database;
  };
  userId?: string;
  userRole?: string;
  familyId?: string;
}

/**
 * Handler principal de Analytics
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

  // Solo profesionales y admins pueden ver analytics
  if (ctx.userRole !== 'professional' && ctx.userRole !== 'parent') {
    return { body: { error: 'Forbidden' }, status: 403 };
  }

  try {
    if (method === 'GET' && endpoint.includes('stats')) {
      return await getStats(ctx, params.familyId);
    }

    if (method === 'GET' && endpoint.includes('usage')) {
      return await getUsageStats(ctx, params.familyId);
    }

    return { body: { error: 'Method not allowed' }, status: 405 };
  } catch (error) {
    console.error('Analytics error:', error);
    return { body: { error: 'Internal server error' }, status: 500 };
  }
}

/**
 * Obtiene estadísticas generales
 */
async function getStats(
  ctx: Context,
  familyId?: string
): Promise<{ body: unknown; status: number }> {
  const now = Math.floor(Date.now() / 1000);
  const last24h = now - 24 * 60 * 60;
  const last7d = now - 7 * 24 * 60 * 60;
  const last30d = now - 30 * 24 * 60 * 60;

  let familyFilter = '';
  const params: unknown[] = [];

  if (familyId && ctx.userRole === 'parent') {
    // Padres solo ven stats de su familia
    familyFilter = 'AND family_id = ?';
    params.push(familyId);
  } else if (ctx.userRole === 'professional' && familyId) {
    // Profesionales pueden ver stats de familias específicas
    familyFilter = 'AND family_id = ?';
    params.push(familyId);
  }

  // Total de mensajes enviados
  const totalMessages = await executeQueryFirst<{ count: number }>(
    ctx.env.DB,
    `SELECT COUNT(*) as count FROM messages WHERE 1=1 ${familyFilter}`,
    params
  );

  // Mensajes en últimas 24h
  const messages24h = await executeQueryFirst<{ count: number }>(
    ctx.env.DB,
    `SELECT COUNT(*) as count FROM messages WHERE created_at >= ? ${familyFilter}`,
    [last24h, ...params]
  );

  // Mensajes en últimos 7 días
  const messages7d = await executeQueryFirst<{ count: number }>(
    ctx.env.DB,
    `SELECT COUNT(*) as count FROM messages WHERE created_at >= ? ${familyFilter}`,
    [last7d, ...params]
  );

  // Mensajes en últimos 30 días
  const messages30d = await executeQueryFirst<{ count: number }>(
    ctx.env.DB,
    `SELECT COUNT(*) as count FROM messages WHERE created_at >= ? ${familyFilter}`,
    [last30d, ...params]
  );

  // Validaciones de IA realizadas
  const aiValidations = await executeQueryFirst<{ count: number }>(
    ctx.env.DB,
    `SELECT COUNT(*) as count FROM ai_coach_logs WHERE created_at >= ? ${familyId ? 'AND user_id IN (SELECT user_id FROM family_members WHERE family_id = ?)' : ''}`,
    familyId ? [last30d, familyId] : [last30d]
  );

  // Validaciones rechazadas
  const aiRejected = await executeQueryFirst<{ count: number }>(
    ctx.env.DB,
    `SELECT COUNT(*) as count FROM ai_coach_logs WHERE has_issues = 1 AND created_at >= ? ${familyId ? 'AND user_id IN (SELECT user_id FROM family_members WHERE family_id = ?)' : ''}`,
    familyId ? [last30d, familyId] : [last30d]
  );

  // Detecciones de borrachera
  const aiDrunkDetections = await executeQueryFirst<{ count: number }>(
    ctx.env.DB,
    `SELECT COUNT(*) as count FROM ai_coach_logs WHERE issues LIKE '%borrachera%' OR issues LIKE '%drunk%' AND created_at >= ? ${familyId ? 'AND user_id IN (SELECT user_id FROM family_members WHERE family_id = ?)' : ''}`,
    familyId ? [last30d, familyId] : [last30d]
  );

  // Mensajes por canal
  const messagesByChannel = await executeQuery<{ channel: string; count: number }>(
    ctx.env.DB,
    `SELECT channel, COUNT(*) as count FROM messages WHERE created_at >= ? ${familyFilter} GROUP BY channel ORDER BY count DESC`,
    [last30d, ...params]
  );

  // Usuarios activos (últimos 30 días)
  const activeUsers = await executeQueryFirst<{ count: number }>(
    ctx.env.DB,
    `SELECT COUNT(DISTINCT user_id) as count FROM audit_log WHERE created_at >= ? ${familyFilter}`,
    [last30d, ...params]
  );

  return {
    body: {
      success: true,
      stats: {
        messages: {
          total: totalMessages?.count || 0,
          last24h: messages24h?.count || 0,
          last7d: messages7d?.count || 0,
          last30d: messages30d?.count || 0,
        },
        ai: {
          validations: aiValidations?.count || 0,
          rejected: aiRejected?.count || 0,
          drunkDetections: aiDrunkDetections?.count || 0,
          acceptanceRate: aiValidations?.count
            ? ((aiValidations.count - (aiRejected?.count || 0)) / aiValidations.count * 100).toFixed(1)
            : '100.0',
        },
        channels: messagesByChannel || [],
        activeUsers: activeUsers?.count || 0,
      },
    },
    status: 200,
  };
}

/**
 * Obtiene estadísticas de uso por día
 */
async function getUsageStats(
  ctx: Context,
  familyId?: string
): Promise<{ body: unknown; status: number }> {
  const now = Math.floor(Date.now() / 1000);
  const last30d = now - 30 * 24 * 60 * 60;

  let familyFilter = '';
  const params: unknown[] = [];

  if (familyId && ctx.userRole === 'parent') {
    familyFilter = 'AND family_id = ?';
    params.push(familyId);
  } else if (ctx.userRole === 'professional' && familyId) {
    familyFilter = 'AND family_id = ?';
    params.push(familyId);
  }

  // Mensajes por día (últimos 30 días)
  // D1 usa timestamps Unix, agrupamos por día dividiendo por 86400
  const dailyMessages = await executeQuery<{
    day: number;
    count: number;
  }>(
    ctx.env.DB,
    `SELECT 
      (created_at / 86400) * 86400 as day,
      COUNT(*) as count
     FROM messages 
     WHERE created_at >= ? ${familyFilter}
     GROUP BY day
     ORDER BY day DESC
     LIMIT 30`,
    [last30d, ...params]
  );

  // Validaciones IA por día
  const dailyAIValidations = await executeQuery<{
    day: number;
    count: number;
    rejected: number;
  }>(
    ctx.env.DB,
    `SELECT 
      (created_at / 86400) * 86400 as day,
      COUNT(*) as count,
      SUM(CASE WHEN has_issues = 1 THEN 1 ELSE 0 END) as rejected
     FROM ai_coach_logs 
     WHERE created_at >= ? ${familyId ? 'AND user_id IN (SELECT user_id FROM family_members WHERE family_id = ?)' : ''}
     GROUP BY day
     ORDER BY day DESC
     LIMIT 30`,
    familyId ? [last30d, familyId] : [last30d]
  );

  // Formatear fechas para el frontend
  const formatDailyData = (data: { day: number; count: number }[]) => {
    return data.map(item => ({
      date: new Date(item.day * 1000).toISOString().split('T')[0],
      count: item.count,
    }));
  };

  const formatDailyAIData = (data: { day: number; count: number; rejected: number }[]) => {
    return data.map(item => ({
      date: new Date(item.day * 1000).toISOString().split('T')[0],
      count: item.count,
      rejected: item.rejected || 0,
    }));
  };

  return {
    body: {
      success: true,
      usage: {
        dailyMessages: formatDailyData(dailyMessages || []),
        dailyAIValidations: formatDailyAIData(dailyAIValidations || []),
      },
    },
    status: 200,
  };
}
