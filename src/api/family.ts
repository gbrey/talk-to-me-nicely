/**
 * Handlers de familias e invitaciones
 */

import type { D1Database } from '~/utils/db';
import { executeQuery, executeQueryFirst, executeMutation } from '~/utils/db';
import { isValidInvitationCode, isValidRole } from '~/utils/validation';
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
 * Handler principal de familias
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
    // Determinar acción basado en método y path
    if (method === 'GET' && !params.id && action !== 'join') {
      return await listFamilies(ctx);
    }
    
    if (method === 'GET' && params.id) {
      return await getFamily(ctx, params.id);
    }
    
    if (method === 'POST' && action === 'join') {
      return await joinFamily(request, ctx);
    }
    
    if (method === 'POST' && action === 'invite') {
      return await createInvitation(request, ctx);
    }
    
    if (method === 'POST' && !action) {
      return await createFamily(request, ctx);
    }

    return { body: { error: 'Method not allowed' }, status: 405 };
  } catch (error) {
    console.error('Family error:', error);
    return { body: { error: 'Internal server error' }, status: 500 };
  }
}

/**
 * Lista las familias del usuario
 */
async function listFamilies(
  ctx: Context
): Promise<{ body: unknown; status: number }> {
  const families = await executeQuery<{
    family_id: string;
    family_name: string | null;
    role: string;
    display_name: string | null;
  }>(
    ctx.env.DB,
    `SELECT f.id as family_id, f.name as family_name, fm.role, fm.display_name
     FROM family_members fm
     JOIN families f ON fm.family_id = f.id
     WHERE fm.user_id = ?`,
    [ctx.userId!]
  );

  return {
    body: { families },
    status: 200,
  };
}

/**
 * Obtiene una familia específica
 */
async function getFamily(
  ctx: Context,
  familyId: string
): Promise<{ body: unknown; status: number }> {
  // Verificar que el usuario pertenece a la familia
  const member = await executeQueryFirst<{
    family_id: string;
    role: string;
  }>(
    ctx.env.DB,
    `SELECT family_id, role FROM family_members WHERE user_id = ? AND family_id = ?`,
    [ctx.userId!, familyId]
  );

  if (!member) {
    return { body: { error: 'Family not found or access denied' }, status: 404 };
  }

  // Obtener información de la familia
  const family = await executeQueryFirst<{
    id: string;
    name: string | null;
    created_at: number;
    created_by: string;
  }>(
    ctx.env.DB,
    'SELECT id, name, created_at, created_by FROM families WHERE id = ?',
    [familyId]
  );

  if (!family) {
    return { body: { error: 'Family not found' }, status: 404 };
  }

  // Obtener miembros
  const members = await executeQuery<{
    id: string;
    user_id: string;
    role: string;
    display_name: string | null;
    email: string;
    joined_at: number;
  }>(
    ctx.env.DB,
    `SELECT fm.id, fm.user_id, fm.role, fm.display_name, u.email, fm.joined_at
     FROM family_members fm
     JOIN users u ON fm.user_id = u.id
     WHERE fm.family_id = ?`,
    [familyId]
  );

  return {
    body: {
      family: {
        id: family.id,
        name: family.name,
        createdAt: family.created_at,
        createdBy: family.created_by,
        members,
      },
    },
    status: 200,
  };
}

/**
 * Crea una nueva familia
 */
async function createFamily(
  request: Request,
  ctx: Context
): Promise<{ body: unknown; status: number }> {
  if (ctx.userRole !== 'parent') {
    return { body: { error: 'Only parents can create families' }, status: 403 };
  }

  const body = await request.json();
  const { name } = body;

  const familyId = crypto.randomUUID();
  const timestamp = getCurrentTimestamp();

  // Crear familia
  await executeMutation(
    ctx.env.DB,
    `INSERT INTO families (id, name, created_at, created_by)
     VALUES (?, ?, ?, ?)`,
    [familyId, name || null, timestamp, ctx.userId!]
  );

  // Agregar creador como miembro
  const memberId = crypto.randomUUID();
  await executeMutation(
    ctx.env.DB,
    `INSERT INTO family_members (id, family_id, user_id, role, joined_at)
     VALUES (?, ?, ?, ?, ?)`,
    [memberId, familyId, ctx.userId!, 'parent', timestamp]
  );

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId: ctx.userId,
    familyId,
    action: 'family_created',
    entityType: 'family',
    entityId: familyId,
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });

  return {
    body: {
      success: true,
      family: {
        id: familyId,
        name: name || null,
        createdAt: timestamp,
      },
    },
    status: 201,
  };
}

/**
 * Crea una invitación
 */
async function createInvitation(
  request: Request,
  ctx: Context
): Promise<{ body: unknown; status: number }> {
  const body = await request.json();
  const { familyId, role = 'parent', email } = body;

  if (!familyId) {
    return { body: { error: 'Family ID required' }, status: 400 };
  }

  if (!isValidRole(role)) {
    return { body: { error: 'Invalid role' }, status: 400 };
  }

  // Verificar que el usuario pertenece a la familia y es parent
  const member = await executeQueryFirst<{ role: string }>(
    ctx.env.DB,
    `SELECT role FROM family_members WHERE user_id = ? AND family_id = ?`,
    [ctx.userId!, familyId]
  );

  if (!member) {
    return { body: { error: 'Family not found or access denied' }, status: 404 };
  }

  if (member.role !== 'parent') {
    return { body: { error: 'Only parents can create invitations' }, status: 403 };
  }

  // Generar código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Expira en 48 horas
  const expiresAt = getCurrentTimestamp() + 48 * 60 * 60;

  const invitationId = crypto.randomUUID();
  await executeMutation(
    ctx.env.DB,
    `INSERT INTO invitations (id, family_id, code, role, invited_by, email, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      invitationId,
      familyId,
      code,
      role,
      ctx.userId!,
      email || null,
      expiresAt,
    ]
  );

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId: ctx.userId,
    familyId,
    action: 'invitation_created',
    entityType: 'invitation',
    entityId: invitationId,
    details: { code, role },
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });

  return {
    body: {
      success: true,
      invitation: {
        id: invitationId,
        code,
        expiresAt,
        role,
      },
    },
    status: 201,
  };
}

/**
 * Une a un usuario a una familia usando código de invitación
 */
async function joinFamily(
  request: Request,
  ctx: Context
): Promise<{ body: unknown; status: number }> {
  const body = await request.json();
  const { code } = body;

  if (!code || !isValidInvitationCode(code)) {
    return { body: { error: 'Código de invitación inválido' }, status: 400 };
  }

  // Buscar invitación
  const invitation = await executeQueryFirst<{
    id: string;
    family_id: string;
    role: string;
    expires_at: number;
    used_at: number | null;
  }>(
    ctx.env.DB,
    `SELECT id, family_id, role, expires_at, used_at
     FROM invitations
     WHERE code = ?`,
    [code]
  );

  if (!invitation) {
    return { body: { error: 'Código de invitación inválido' }, status: 404 };
  }

  // Verificar expiración
  const now = getCurrentTimestamp();
  if (invitation.expires_at < now) {
    return { body: { error: 'Código de invitación expirado' }, status: 400 };
  }

  // Verificar si ya fue usado
  if (invitation.used_at) {
    return { body: { error: 'Código de invitación ya utilizado' }, status: 400 };
  }

  // Verificar si el usuario ya es miembro
  const existingMember = await executeQueryFirst<{ id: string }>(
    ctx.env.DB,
    `SELECT id FROM family_members WHERE user_id = ? AND family_id = ?`,
    [ctx.userId!, invitation.family_id]
  );

  if (existingMember) {
    return { body: { error: 'Ya eres miembro de esta familia' }, status: 409 };
  }

  // Agregar como miembro
  const memberId = crypto.randomUUID();
  const timestamp = getCurrentTimestamp();
  await executeMutation(
    ctx.env.DB,
    `INSERT INTO family_members (id, family_id, user_id, role, joined_at, invited_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      memberId,
      invitation.family_id,
      ctx.userId!,
      invitation.role,
      timestamp,
      null, // invited_by se puede obtener de la invitación
    ]
  );

  // Marcar invitación como usada
  await executeMutation(
    ctx.env.DB,
    `UPDATE invitations SET used_at = ?, used_by = ? WHERE id = ?`,
    [timestamp, ctx.userId!, invitation.id]
  );

  // Log de auditoría
  await logAudit(ctx.env.DB, {
    userId: ctx.userId,
    familyId: invitation.family_id,
    action: 'family_joined',
    entityType: 'family',
    entityId: invitation.family_id,
    details: { invitationId: invitation.id },
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });

  return {
    body: {
      success: true,
      message: 'Te has unido a la familia exitosamente',
      familyId: invitation.family_id,
    },
    status: 200,
  };
}

