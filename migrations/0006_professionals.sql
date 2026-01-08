-- Tabla de acceso profesional
CREATE TABLE IF NOT EXISTS professional_access (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_type TEXT NOT NULL,
  approved_by_parent1 INTEGER DEFAULT 0,
  approved_by_parent2 INTEGER DEFAULT 0,
  granted_at INTEGER,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(family_id, user_id)
);

-- Tabla de reportes profesionales
CREATE TABLE IF NOT EXISTS professional_reports (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  generated_by TEXT NOT NULL REFERENCES users(id),
  report_type TEXT NOT NULL,
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_professional_family ON professional_access(family_id);
CREATE INDEX IF NOT EXISTS idx_professional_user ON professional_access(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_family ON professional_reports(family_id);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON professional_reports(generated_by);

