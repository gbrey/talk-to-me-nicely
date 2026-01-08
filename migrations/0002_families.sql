-- Tabla de familias
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id)
);

-- Tabla de miembros de familia
CREATE TABLE IF NOT EXISTS family_members (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  display_name TEXT,
  joined_at INTEGER NOT NULL,
  invited_by TEXT REFERENCES users(id),
  UNIQUE(family_id, user_id)
);

-- Tabla de invitaciones
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  invited_by TEXT NOT NULL REFERENCES users(id),
  email TEXT,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  used_by TEXT REFERENCES users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_family ON invitations(family_id);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);

