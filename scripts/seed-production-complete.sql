-- Script SQL completo para crear datos de prueba en producción
-- Ejecutar con: wrangler d1 execute coparenting-db-prod --remote --file=scripts/seed-production-complete.sql

-- 1. Crear usuarios con passwords hasheados correctamente
INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, email_verified, created_at, updated_at)
VALUES 
  -- Familia García
  ('parent1-1111-1111-1111-111111111111', 'maria.garcia@example.com', '5d457dc69a60e9749c399270fc3e2be5b8722ac5f5c5d5cf5b0e71f28a029b96', '0f2759ffde2821f7e8a7f8cc2b56e9841fe34fb36a356b1dac0d23ca4e6d2e5a', 'parent', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('parent2-2222-2222-2222-222222222222', 'juan.garcia@example.com', '350aa430a04f42822bfea49ada9116a03be181eb7dc0bc3970f829ad3c58f82d', 'f19e670067e190b71fda876ce5acc7ebbb7eeef4e4fe8f65f869ebd08d68b4a6', 'parent', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('child1-3333-3333-3333-333333333333', 'sofia.garcia@example.com', '40e7102ef924f0f5d43865e3cf1cdfcad15889fb632067fc820560bca56ed284', 'b9f2056540829cc8798cf8712ce7dbcfce4c93d0ef91a26459943263c8bac4a6', 'child', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('prof1-4444-4444-4444-444444444444', 'abogado.martinez@example.com', 'b7c444d8666c7fead6bf53412a8f90fde4af0e53ad8619fe5609072ff9080d8b', '630fe6b5df231408760041b16d08e6a3f85a56d5f33d597120dc34668c2ad91a', 'professional', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  -- Familia López
  ('parent3-5555-5555-5555-555555555555', 'ana.lopez@example.com', 'c8ccd9fe62d9602c7000cd54662316203a9e945bb2911b24141800c30e7e4cec', '7a3adddb4207867ee4a17e575732305f604286cce2c91fbbf9e753192b4f8b8a', 'parent', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('parent4-6666-6666-6666-666666666666', 'carlos.lopez@example.com', '33f81297e7ea6710f61d14d70536b0287eed738d8a5c5a07e88eb16da30687d9', 'dd9c6cb2b2fc0c49ea83d4782b888c057effe3fec4a4b8b1bf74427610da22bc', 'parent', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('child2-7777-7777-7777-777777777777', 'lucas.lopez@example.com', 'e45dbfd60630d00c33618dbf612339428bf09b3f0a4c6900e2b5caa629f8e03a', '421dbe5d26cd3e5636b8a0b8dfcfc7fba06f3ee207ec7a8bbb7b38837f5b962d', 'child', 1, strftime('%s', 'now'), strftime('%s', 'now'));

-- 2. Crear consentimientos
INSERT OR IGNORE INTO user_consents (id, user_id, consent_type, consented_at, ip_address, user_agent)
SELECT 
  lower(hex(randomblob(16))),
  id,
  'data_processing',
  strftime('%s', 'now'),
  '127.0.0.1',
  'Seed Script'
FROM users WHERE email LIKE '%@example.com';

-- 3. Crear familias
INSERT OR IGNORE INTO families (id, name, created_at, created_by)
VALUES 
  ('family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Familia García', strftime('%s', 'now'), 'parent1-1111-1111-1111-111111111111'),
  ('family2-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Familia López', strftime('%s', 'now'), 'parent3-5555-5555-5555-555555555555');

-- 4. Agregar miembros a familias
INSERT OR IGNORE INTO family_members (id, family_id, user_id, role, display_name, joined_at)
VALUES 
  -- Familia 1
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'parent1-1111-1111-1111-111111111111', 'parent', 'María García', strftime('%s', 'now')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'parent2-2222-2222-2222-222222222222', 'parent', 'Juan García', strftime('%s', 'now')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child1-3333-3333-3333-333333333333', 'child', 'Sofía García', strftime('%s', 'now')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'prof1-4444-4444-4444-444444444444', 'professional', 'Dr. Martínez - Abogado', strftime('%s', 'now')),
  -- Familia 2
  (lower(hex(randomblob(16))), 'family2-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'parent3-5555-5555-5555-555555555555', 'parent', 'Ana López', strftime('%s', 'now')),
  (lower(hex(randomblob(16))), 'family2-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'parent4-6666-6666-6666-666666666666', 'parent', 'Carlos López', strftime('%s', 'now')),
  (lower(hex(randomblob(16))), 'family2-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'child2-7777-7777-7777-777777777777', 'child', 'Lucas López', strftime('%s', 'now'));

-- 5. Crear mensajes de ejemplo (con content_hash simplificado)
INSERT OR IGNORE INTO messages (id, family_id, channel, sender_id, content, content_hash, share_with_child, created_at, sent_at, delivered_at)
VALUES 
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'daily', 'parent1-1111-1111-1111-111111111111', 'Hola, ¿Sofía ya hizo la tarea de matemáticas?', lower(hex(randomblob(32))), 1, strftime('%s', 'now', '-6 days'), strftime('%s', 'now', '-6 days'), strftime('%s', 'now', '-6 days')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'daily', 'parent2-2222-2222-2222-222222222222', 'Sí, la terminó esta tarde. Está en su mochila.', lower(hex(randomblob(32))), 0, strftime('%s', 'now', '-5 days'), strftime('%s', 'now', '-5 days'), strftime('%s', 'now', '-5 days')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'health', 'parent1-1111-1111-1111-111111111111', 'Recordatorio: Sofía tiene cita con el pediatra el viernes a las 10am.', lower(hex(randomblob(32))), 1, strftime('%s', 'now', '-4 days'), strftime('%s', 'now', '-4 days'), strftime('%s', 'now', '-4 days')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'school', 'parent2-2222-2222-2222-222222222222', 'La escuela envió una nota sobre la excursión del próximo mes. ¿La viste?', lower(hex(randomblob(32))), 0, strftime('%s', 'now', '-3 days'), strftime('%s', 'now', '-3 days'), strftime('%s', 'now', '-3 days')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'calendar', 'parent1-1111-1111-1111-111111111111', '¿Podrías recoger a Sofía el viernes? Tengo una reunión de trabajo.', lower(hex(randomblob(32))), 0, strftime('%s', 'now', '-2 days'), strftime('%s', 'now', '-2 days'), strftime('%s', 'now', '-2 days')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'vacation', 'parent2-2222-2222-2222-222222222222', 'Propongo que pasemos las vacaciones de invierno en la costa. ¿Qué te parece?', lower(hex(randomblob(32))), 1, strftime('%s', 'now', '-1 days'), strftime('%s', 'now', '-1 days'), strftime('%s', 'now', '-1 days'));

-- 6. Crear eventos de calendario
INSERT OR IGNORE INTO calendar_events (id, family_id, event_type, title, description, start_time, end_time, all_day, responsible_parent, created_by, created_at, updated_at)
VALUES 
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pickup', 'Retiro de Sofía - Escuela', 'Retirar a Sofía de la escuela', strftime('%s', 'now', '+2 days'), NULL, 0, 'parent2-2222-2222-2222-222222222222', 'parent1-1111-1111-1111-111111111111', strftime('%s', 'now'), strftime('%s', 'now')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'medical', 'Cita con Pediatra', 'Control de rutina', strftime('%s', 'now', '+4 days'), strftime('%s', 'now', '+4 days', '+1 hours'), 0, 'parent1-1111-1111-1111-111111111111', 'parent1-1111-1111-1111-111111111111', strftime('%s', 'now'), strftime('%s', 'now')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'school', 'Reunión de Padres', 'Reunión trimestral en la escuela', strftime('%s', 'now', '+7 days'), strftime('%s', 'now', '+7 days', '+1 hours'), 0, NULL, 'parent2-2222-2222-2222-222222222222', strftime('%s', 'now'), strftime('%s', 'now')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'vacation', 'Vacaciones de Invierno', 'Semana de vacaciones escolares', strftime('%s', 'now', '+30 days'), strftime('%s', 'now', '+37 days'), 1, NULL, 'parent1-1111-1111-1111-111111111111', strftime('%s', 'now'), strftime('%s', 'now')),
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dropoff', 'Entrega de Sofía', 'Entrega en casa de papá', strftime('%s', 'now', '+1 days'), NULL, 0, 'parent2-2222-2222-2222-222222222222', 'parent1-1111-1111-1111-111111111111', strftime('%s', 'now'), strftime('%s', 'now'));

-- 7. Crear acceso profesional
INSERT OR IGNORE INTO professional_access (id, family_id, user_id, professional_type, approved_by_parent1, approved_by_parent2, granted_at, created_at)
VALUES 
  (lower(hex(randomblob(16))), 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'prof1-4444-4444-4444-444444444444', 'lawyer', 1, 1, strftime('%s', 'now'), strftime('%s', 'now'));
