-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  sender_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  attachments TEXT,
  share_with_child INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  sent_at INTEGER NOT NULL,
  delivered_at INTEGER
);

-- Tabla de lecturas de mensajes
CREATE TABLE IF NOT EXISTS message_reads (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_viewed_at INTEGER NOT NULL,
  UNIQUE(message_id, user_id)
);

-- Tabla de logs de IA coach
CREATE TABLE IF NOT EXISTS ai_coach_logs (
  id TEXT PRIMARY KEY,
  message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  original_content TEXT NOT NULL,
  has_issues INTEGER NOT NULL,
  issues TEXT,
  suggestion TEXT,
  user_action TEXT,
  created_at INTEGER NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_messages_family_channel ON messages(family_id, channel);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_user ON ai_coach_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_created ON ai_coach_logs(created_at);

