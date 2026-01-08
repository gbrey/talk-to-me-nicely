/**
 * Handlers de mensajería
 */

import type { D1Database, R2Bucket } from '~/utils/db';
import { executeQuery, executeQueryFirst, executeMutation } from '~/utils/db';
import { isValidChannel, sanitizeHTML } from '~/utils/validation';
import { getCurrentTimestamp, generateContentHash } from '~/utils/timestamps';
import { logAudit, getClientIP, getUserAgent } from '~/utils/audit';

interface Context {
  env: {
    DB: D1Database;
    BUCKET: R2Bucket;
  };
  userId?: string;
  userRole?: string;
  familyId?: string;
}

/**
 * Handler principal de mensajes
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
    if (method === 'GET' && params.familyId && params.channel) {
      return await listMessages(ctx, params.familyId, params.channel);
    }
    
    if (method === 'POST' && params.familyId && params.channel && !params.id) {
      return await createMessage(request, ctx, params.familyId, params.channel);
    }
    
    if (method === 'POST' && params.id && endpoint.includes('read')) {
      return await markAsRead(request, ctx, params.id);
    }

    return { body: { error: 'Method not allowed' }, status: 405 };
  } catch (error) {
    console.error('Messages error:', error);
    return { body: { error: 'Internal server error' }, status: 500 };
  }
}

/**
 * Lista mensajes de un canal
 */
async function listMessages(
  ctx: Context,
  familyId: string,
  channel: string
): Promise<{ body: unknown; status: number }> {
  if (!familyId || !channel) {
    return { body: { error: 'Family ID and channel required' }, status: 400 };
  }

  if (!isValidChannel(channel)) {
    return { body: { error: 'Invalid channel' }, status: 400 };
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

  // Si es child, solo mostrar mensajes compartidos
  let query = `
    SELECT m.id, m.channel, m.sender_id, m.content, m.attachments,
           m.share_with_child, m.created_at, m.sent_at, m.delivered_at,
           u.email as sender_email,
           mr.first_viewed_at as read_at
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.user_id = ?
    WHERE m.family_id = ? AND m.channel = ?
  `;

  const params: unknown[] = [ctx.userId!, familyId, channel];

  if (member.role === 'child') {
    query += ' AND m.share_with_child = 1';
  }

  query += ' ORDER BY m.sent_at DESC LIMIT 100';

  const messages = await executeQuery<{
    id: string;
    channel: string;
    sender_id: string;
    content: string;
    attachments: string | null;
    share_with_child: number;
    created_at: number;
    sent_at: number;
    delivered_at: number | null;
    sender_email: string;
    read_at: number | null;
  }>(ctx.env.DB, query, params);

  return {
    body: {
      messages: messages.map((msg) => ({
        id: msg.id,
        channel: msg.channel,
        senderId: msg.sender_id,
        senderEmail: msg.sender_email,
        content: msg.content,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
        shareWithChild: msg.share_with_child === 1,
        createdAt: msg.created_at,
        sentAt: msg.sent_at,
        deliveredAt: msg.delivered_at,
        readAt: msg.read_at,
        isRead: msg.read_at !== null,
      })),
    },
    status: 200,
  };
}

/**
 * Crea un nuevo mensaje
 */
async function createMessage(
  request: Request,
  ctx: Context,
  familyId: string,
  channel: string
): Promise<{ body: unknown; status: number }> {
  if (!familyId || !channel) {
    return { body: { error: 'Family ID and channel required' }, status: 400 };
  }

  if (!isValidChannel(channel)) {
    return { body: { error: 'Invalid channel' }, status: 400 };
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

  // Professional no puede enviar mensajes
  if (member.role === 'professional') {
    return { body: { error: 'Professionals cannot send messages' }, status: 403 };
  }

  const body = await request.json();
  const { content, shareWithChild = false, attachments = [] } = body;

  if (!content || content.trim().length === 0) {
    return { body: { error: 'Content required' }, status: 400 };
  }

  // Sanitizar contenido
  const sanitizedContent = sanitizeHTML(content);

  // Generar hash del contenido
  const contentHash = await generateContentHash(sanitizedContent);

  const messageId = crypto.randomUUID();
  const timestamp = getCurrentTimestamp();

  // Crear mensaje
  await executeMutation(
    ctx.env.DB,
    `INSERT INTO messages (id, family_id, channel, sender_id, content, content_hash,
                          attachments, share_with_child, created_at, sent_at, delivered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      messageId,
      familyId,
      channel,
      ctx.userId!,
      sanitizedContent,
      contentHash,
      attachments.length > 0 ? JSON.stringify(attachments) : null,
      shareWithChild ? 1 : 0,
      timestamp,
      timestamp, // sent_at = created_at (ya pasó por IA coach)
      timestamp, // delivered_at = sent_at (mismo servidor)
    ]
  );

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId: ctx.userId,
    familyId,
    action: 'message_sent',
    entityType: 'message',
    entityId: messageId,
    details: { channel, contentHash },
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });

  return {
    body: {
      success: true,
      message: {
        id: messageId,
        channel,
        content: sanitizedContent,
        createdAt: timestamp,
        sentAt: timestamp,
        deliveredAt: timestamp,
      },
    },
    status: 201,
  };
}

/**
 * Marca un mensaje como leído
 */
async function markAsRead(
  request: Request,
  ctx: Context,
  messageId: string
): Promise<{ body: unknown; status: number }> {
  if (!messageId) {
    return { body: { error: 'Message ID required' }, status: 400 };
  }

  // Verificar que el mensaje existe y el usuario tiene acceso
  const message = await executeQueryFirst<{
    family_id: string;
    sender_id: string;
  }>(
    ctx.env.DB,
    `SELECT family_id, sender_id FROM messages WHERE id = ?`,
    [messageId]
  );

  if (!message) {
    return { body: { error: 'Message not found' }, status: 404 };
  }

  // Verificar que el usuario pertenece a la familia
  const member = await executeQueryFirst<{ id: string }>(
    ctx.env.DB,
    `SELECT id FROM family_members WHERE user_id = ? AND family_id = ?`,
    [ctx.userId!, message.family_id]
  );

  if (!member) {
    return { body: { error: 'Access denied' }, status: 403 };
  }

  // No marcar como leído si es el mismo que lo envió
  if (message.sender_id === ctx.userId) {
    return { body: { error: 'Cannot mark own message as read' }, status: 400 };
  }

  // Verificar si ya está marcado como leído
  const existing = await executeQueryFirst<{ id: string }>(
    ctx.env.DB,
    `SELECT id FROM message_reads WHERE message_id = ? AND user_id = ?`,
    [messageId, ctx.userId!]
  );

  if (existing) {
    return {
      body: { success: true, message: 'Already marked as read' },
      status: 200,
    };
  }

  // Marcar como leído
  const readId = crypto.randomUUID();
  const timestamp = getCurrentTimestamp();

  await executeMutation(
    ctx.env.DB,
    `INSERT INTO message_reads (id, message_id, user_id, first_viewed_at)
     VALUES (?, ?, ?, ?)`,
    [readId, messageId, ctx.userId!, timestamp]
  );

  // Actualizar delivered_at del mensaje si es null
  await executeMutation(
    ctx.env.DB,
    `UPDATE messages SET delivered_at = ? WHERE id = ? AND delivered_at IS NULL`,
    [timestamp, messageId]
  );

  return {
    body: {
      success: true,
      readAt: timestamp,
    },
    status: 200,
  };
}

