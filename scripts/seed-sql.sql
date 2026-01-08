-- Script SQL para seed de datos de prueba
-- Ejecutar con: wrangler d1 execute DB --file=./scripts/seed-sql.sql

-- Nota: Este script SQL es una alternativa al script TypeScript
-- Los passwords están hasheados con SHA-256 + salt
-- Para simplificar, usamos valores fijos conocidos

-- Limpiar datos existentes (opcional, comentar si no se desea)
-- DELETE FROM professional_access;
-- DELETE FROM calendar_events;
-- DELETE FROM messages;
-- DELETE FROM family_members;
-- DELETE FROM families;
-- DELETE FROM user_consents;
-- DELETE FROM users;

-- Insertar usuarios
-- Password: Password123 (hash: se generará en el script TS)
-- Password: 1234 para niños (hash: se generará en el script TS)

-- Padres Familia 1
INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, email_verified, created_at, updated_at)
VALUES 
  ('parent1-1111-1111-1111-111111111111', 'maria.garcia@example.com', 'temp_hash', 'temp_salt', 'parent', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('parent2-2222-2222-2222-222222222222', 'juan.garcia@example.com', 'temp_hash', 'temp_salt', 'parent', 1, strftime('%s', 'now'), strftime('%s', 'now'));

-- Hijo Familia 1
INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, email_verified, created_at, updated_at)
VALUES 
  ('child1-3333-3333-3333-333333333333', 'sofia.garcia@example.com', 'temp_hash', 'temp_salt', 'child', 1, strftime('%s', 'now'), strftime('%s', 'now'));

-- Profesional
INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, email_verified, created_at, updated_at)
VALUES 
  ('prof1-4444-4444-4444-444444444444', 'abogado.martinez@example.com', 'temp_hash', 'temp_salt', 'professional', 1, strftime('%s', 'now'), strftime('%s', 'now'));

-- Padres Familia 2
INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, email_verified, created_at, updated_at)
VALUES 
  ('parent3-5555-5555-5555-555555555555', 'ana.lopez@example.com', 'temp_hash', 'temp_salt', 'parent', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('parent4-6666-6666-6666-666666666666', 'carlos.lopez@example.com', 'temp_hash', 'temp_salt', 'parent', 1, strftime('%s', 'now'), strftime('%s', 'now'));

-- Hijo Familia 2
INSERT OR IGNORE INTO users (id, email, password_hash, password_salt, role, email_verified, created_at, updated_at)
VALUES 
  ('child2-7777-7777-7777-777777777777', 'lucas.lopez@example.com', 'temp_hash', 'temp_salt', 'child', 1, strftime('%s', 'now'), strftime('%s', 'now'));

-- Crear familias
INSERT OR IGNORE INTO families (id, name, created_at, created_by)
VALUES 
  ('family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Familia García', strftime('%s', 'now'), 'parent1-1111-1111-1111-111111111111'),
  ('family2-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Familia López', strftime('%s', 'now'), 'parent3-5555-5555-5555-555555555555');

-- Agregar miembros a familias
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
