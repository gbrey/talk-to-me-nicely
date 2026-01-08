-- Tabla de eventos de calendario
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  all_day INTEGER DEFAULT 0,
  responsible_parent TEXT REFERENCES users(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Tabla de solicitudes de cambio de eventos
CREATE TABLE IF NOT EXISTS event_change_requests (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES users(id),
  original_start INTEGER NOT NULL,
  proposed_start INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  responded_by TEXT REFERENCES users(id),
  responded_at INTEGER,
  created_at INTEGER NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_calendar_family_time ON calendar_events(family_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_change_requests_event ON event_change_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON event_change_requests(status);

