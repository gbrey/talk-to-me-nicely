-- Agregar mensajes y eventos de ejemplo para la demo
-- Ejecutar con: sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/e7352547963de7050bd7d94658afc4fe78b61811b7815da12d90be8e863abf4d.sqlite < scripts/add-messages-events.sql

-- IDs de referencia
-- family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa = Familia García
-- parent1-1111-1111-1111-111111111111 = María García
-- parent2-2222-2222-2222-222222222222 = Juan García

-- Timestamp actual (ajustar si es necesario)
-- strftime('%s', 'now') genera timestamp actual

-- Insertar mensajes de ejemplo
INSERT OR IGNORE INTO messages (id, family_id, channel, sender_id, content, content_hash, share_with_child, created_at, sent_at, delivered_at)
VALUES 
  -- Mensajes diarios
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'daily', 'parent1-1111-1111-1111-111111111111', 'Hola, ¿Sofía ya hizo la tarea de matemáticas?', lower(hex(randomblob(32))), 1, strftime('%s', 'now', '-1 day'), strftime('%s', 'now', '-1 day'), strftime('%s', 'now', '-1 day')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'daily', 'parent2-2222-2222-2222-222222222222', 'Sí, la terminó esta tarde. Está en su mochila.', lower(hex(randomblob(32))), 0, strftime('%s', 'now', '-1 day'), strftime('%s', 'now', '-1 day'), strftime('%s', 'now', '-1 day')),
  
  -- Mensajes de salud
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'health', 'parent1-1111-1111-1111-111111111111', 'Recordatorio: Sofía tiene cita con el pediatra el viernes a las 10am.', lower(hex(randomblob(32))), 1, strftime('%s', 'now', '-2 days'), strftime('%s', 'now', '-2 days'), strftime('%s', 'now', '-2 days')),
  
  -- Mensajes de escuela
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'school', 'parent2-2222-2222-2222-222222222222', 'La escuela envió una nota sobre la excursión del próximo mes. ¿La viste?', lower(hex(randomblob(32))), 0, strftime('%s', 'now', '-3 days'), strftime('%s', 'now', '-3 days'), strftime('%s', 'now', '-3 days')),
  
  -- Mensajes de calendario
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'calendar', 'parent1-1111-1111-1111-111111111111', '¿Podrías recoger a Sofía el viernes? Tengo una reunión de trabajo.', lower(hex(randomblob(32))), 0, strftime('%s', 'now', '-4 days'), strftime('%s', 'now', '-4 days'), strftime('%s', 'now', '-4 days')),
  
  -- Mensajes de vacaciones
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'vacation', 'parent2-2222-2222-2222-222222222222', 'Propongo que pasemos las vacaciones de invierno en la costa. ¿Qué te parece?', lower(hex(randomblob(32))), 1, strftime('%s', 'now', '-5 days'), strftime('%s', 'now', '-5 days'), strftime('%s', 'now', '-5 days'));

-- Insertar eventos de calendario
INSERT OR IGNORE INTO calendar_events (id, family_id, event_type, title, description, start_time, end_time, all_day, responsible_parent, created_by, created_at, updated_at)
VALUES 
  -- Retiro de Sofía (mañana)
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pickup', 'Retiro de Sofía', 'Recoger a Sofía del colegio', strftime('%s', 'now', '+1 day', '+15 hours'), NULL, 0, 'parent1-1111-1111-1111-111111111111', 'parent1-1111-1111-1111-111111111111', strftime('%s', 'now', '-2 days'), strftime('%s', 'now', '-2 days')),
  
  -- Cita con Pediatra (en 4 días)
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medical', 'Cita con Pediatra', 'Control de rutina', strftime('%s', 'now', '+4 days', '+10 hours'), strftime('%s', 'now', '+4 days', '+11 hours'), 0, 'parent1-1111-1111-1111-111111111111', 'parent1-1111-1111-1111-111111111111', strftime('%s', 'now', '-1 week'), strftime('%s', 'now', '-1 week')),
  
  -- Reunión de Padres (en 7 días)
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'school', 'Reunión de Padres', 'Reunión trimestral en la escuela', strftime('%s', 'now', '+7 days', '+18 hours'), strftime('%s', 'now', '+7 days', '+19 hours'), 0, NULL, 'parent2-2222-2222-2222-222222222222', strftime('%s', 'now', '-5 days'), strftime('%s', 'now', '-5 days')),
  
  -- Vacaciones de Invierno (en 30 días)
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'vacation', 'Vacaciones de Invierno', 'Vacaciones familiares', strftime('%s', 'now', '+30 days'), strftime('%s', 'now', '+37 days'), 1, NULL, 'parent2-2222-2222-2222-222222222222', strftime('%s', 'now', '-1 week'), strftime('%s', 'now', '-1 week')),
  
  -- Entrega de Sofía (mañana)
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dropoff', 'Entrega de Sofía', 'Llevar a Sofía a la casa de Juan', strftime('%s', 'now', '+1 day', '+9 hours'), NULL, 0, 'parent2-2222-2222-2222-222222222222', 'parent1-1111-1111-1111-111111111111', strftime('%s', 'now', '-3 days'), strftime('%s', 'now', '-3 days'));
