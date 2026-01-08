/**
 * Script de seed para crear datos de prueba
 */

import { generatePasswordSalt, hashPassword } from '../src/utils/encryption';
import { getCurrentTimestamp, generateContentHash } from '../src/utils/timestamps';

interface SeedData {
  users: Array<{
    id: string;
    email: string;
    password: string;
    role: 'parent' | 'child' | 'professional';
    displayName?: string;
  }>;
  families: Array<{
    id: string;
    name: string;
    createdBy: string;
  }>;
  familyMembers: Array<{
    familyId: string;
    userId: string;
    role: 'parent' | 'child' | 'professional';
    displayName?: string;
  }>;
}

const seedData: SeedData = {
  users: [
    // Padres - Familia 1
    {
      id: 'parent1-1111-1111-1111-111111111111',
      email: 'maria.garcia@example.com',
      password: 'Password123',
      role: 'parent',
      displayName: 'María García',
    },
    {
      id: 'parent2-2222-2222-2222-222222222222',
      email: 'juan.garcia@example.com',
      password: 'Password123',
      role: 'parent',
      displayName: 'Juan García',
    },
    // Hijo - Familia 1
    {
      id: 'child1-3333-3333-3333-333333333333',
      email: 'sofia.garcia@example.com',
      password: '1234',
      role: 'child',
      displayName: 'Sofía García',
    },
    // Profesional - Familia 1
    {
      id: 'prof1-4444-4444-4444-444444444444',
      email: 'abogado.martinez@example.com',
      password: 'Password123',
      role: 'professional',
      displayName: 'Dr. Martínez - Abogado',
    },
    // Padres - Familia 2
    {
      id: 'parent3-5555-5555-5555-555555555555',
      email: 'ana.lopez@example.com',
      password: 'Password123',
      role: 'parent',
      displayName: 'Ana López',
    },
    {
      id: 'parent4-6666-6666-6666-666666666666',
      email: 'carlos.lopez@example.com',
      password: 'Password123',
      role: 'parent',
      displayName: 'Carlos López',
    },
    // Hijo - Familia 2
    {
      id: 'child2-7777-7777-7777-777777777777',
      email: 'lucas.lopez@example.com',
      password: '1234',
      role: 'child',
      displayName: 'Lucas López',
    },
  ],
  families: [
    {
      id: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      name: 'Familia García',
      createdBy: 'parent1-1111-1111-1111-111111111111',
    },
    {
      id: 'family2-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      name: 'Familia López',
      createdBy: 'parent3-5555-5555-5555-555555555555',
    },
  ],
  familyMembers: [
    // Familia 1
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      userId: 'parent1-1111-1111-1111-111111111111',
      role: 'parent',
      displayName: 'María García',
    },
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      userId: 'parent2-2222-2222-2222-222222222222',
      role: 'parent',
      displayName: 'Juan García',
    },
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      userId: 'child1-3333-3333-3333-333333333333',
      role: 'child',
      displayName: 'Sofía García',
    },
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      userId: 'prof1-4444-4444-4444-444444444444',
      role: 'professional',
      displayName: 'Dr. Martínez - Abogado',
    },
    // Familia 2
    {
      familyId: 'family2-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      userId: 'parent3-5555-5555-5555-555555555555',
      role: 'parent',
      displayName: 'Ana López',
    },
    {
      familyId: 'family2-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      userId: 'parent4-6666-6666-6666-666666666666',
      role: 'parent',
      displayName: 'Carlos López',
    },
    {
      familyId: 'family2-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      userId: 'child2-7777-7777-7777-777777777777',
      role: 'child',
      displayName: 'Lucas López',
    },
  ],
};

export async function seedDatabase(db: any) {
  const timestamp = getCurrentTimestamp();

  console.log('🌱 Iniciando seed de base de datos...');

  // 1. Crear usuarios
  console.log('📝 Creando usuarios...');
  for (const user of seedData.users) {
    const salt = generatePasswordSalt();
    const passwordHash = await hashPassword(user.password, salt);

    try {
      await db
        .prepare(
          `INSERT INTO users (id, email, password_hash, password_salt, role, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          user.id,
          user.email,
          passwordHash,
          salt,
          user.role,
          1, // email_verified
          timestamp,
          timestamp
        )
        .run();

      // Crear consentimiento
      await db
        .prepare(
          `INSERT INTO user_consents (id, user_id, consent_type, consented_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          user.id,
          'data_processing',
          timestamp,
          '127.0.0.1',
          'Seed Script'
        )
        .run();

      console.log(`  ✓ Usuario creado: ${user.email} (${user.role})`);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint')) {
        console.log(`  ⊙ Usuario ya existe: ${user.email}`);
      } else {
        console.error(`  ✗ Error creando usuario ${user.email}:`, error);
      }
    }
  }

  // 2. Crear familias
  console.log('👨‍👩‍👧 Creando familias...');
  for (const family of seedData.families) {
    try {
      await db
        .prepare(
          `INSERT INTO families (id, name, created_at, created_by)
         VALUES (?, ?, ?, ?)`
        )
        .bind(family.id, family.name, timestamp, family.createdBy)
        .run();
      console.log(`  ✓ Familia creada: ${family.name}`);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint')) {
        console.log(`  ⊙ Familia ya existe: ${family.name}`);
      } else {
        console.error(`  ✗ Error creando familia ${family.name}:`, error);
      }
    }
  }

  // 3. Agregar miembros a familias
  console.log('👥 Agregando miembros a familias...');
  for (const member of seedData.familyMembers) {
    try {
      await db
        .prepare(
          `INSERT INTO family_members (id, family_id, user_id, role, display_name, joined_at)
         VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          crypto.randomUUID(),
          member.familyId,
          member.userId,
          member.role,
          member.displayName || null,
          timestamp
        )
        .run();
      console.log(`  ✓ Miembro agregado: ${member.displayName || member.userId}`);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint')) {
        console.log(`  ⊙ Miembro ya existe: ${member.displayName || member.userId}`);
      } else {
        console.error(`  ✗ Error agregando miembro:`, error);
      }
    }
  }

  // 4. Crear mensajes de ejemplo
  console.log('💬 Creando mensajes de ejemplo...');
  const messages = [
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      channel: 'daily',
      senderId: 'parent1-1111-1111-1111-111111111111',
      content: 'Hola, ¿Sofía ya hizo la tarea de matemáticas?',
      shareWithChild: true,
    },
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      channel: 'daily',
      senderId: 'parent2-2222-2222-2222-222222222222',
      content: 'Sí, la terminó esta tarde. Está en su mochila.',
      shareWithChild: false,
    },
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      channel: 'health',
      senderId: 'parent1-1111-1111-1111-111111111111',
      content: 'Recordatorio: Sofía tiene cita con el pediatra el viernes a las 10am.',
      shareWithChild: true,
    },
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      channel: 'school',
      senderId: 'parent2-2222-2222-2222-222222222222',
      content: 'La escuela envió una nota sobre la excursión del próximo mes. ¿La viste?',
      shareWithChild: false,
    },
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      channel: 'calendar',
      senderId: 'parent1-1111-1111-1111-111111111111',
      content: '¿Podrías recoger a Sofía el viernes? Tengo una reunión de trabajo.',
      shareWithChild: false,
    },
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      channel: 'vacation',
      senderId: 'parent2-2222-2222-2222-222222222222',
      content: 'Propongo que pasemos las vacaciones de invierno en la costa. ¿Qué te parece?',
      shareWithChild: true,
    },
  ];

  for (const msg of messages) {
    try {
      const messageId = crypto.randomUUID();
      const contentHash = await generateContentHash(msg.content);
      const sentAt = timestamp - Math.floor(Math.random() * 7 * 24 * 60 * 60); // Últimos 7 días

      await db
        .prepare(
          `INSERT INTO messages (id, family_id, channel, sender_id, content, content_hash,
                                share_with_child, created_at, sent_at, delivered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          messageId,
          msg.familyId,
          msg.channel,
          msg.senderId,
          msg.content,
          contentHash,
          msg.shareWithChild ? 1 : 0,
          sentAt,
          sentAt,
          sentAt
        )
        .run();
      console.log(`  ✓ Mensaje creado en canal ${msg.channel}`);
    } catch (error) {
      console.error(`  ✗ Error creando mensaje:`, error);
    }
  }

  // 5. Crear eventos de calendario
  console.log('📅 Creando eventos de calendario...');
  const now = Math.floor(Date.now() / 1000);
  const events = [
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      eventType: 'pickup',
      title: 'Retiro de Sofía - Escuela',
      description: 'Retirar a Sofía de la escuela',
      startTime: now + 2 * 24 * 60 * 60, // En 2 días
      endTime: null,
      allDay: false,
      responsibleParent: 'parent2-2222-2222-2222-222222222222',
      createdBy: 'parent1-1111-1111-1111-111111111111',
    },
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      eventType: 'medical',
      title: 'Cita con Pediatra',
      description: 'Control de rutina',
      startTime: now + 4 * 24 * 60 * 60, // En 4 días
      endTime: now + 4 * 24 * 60 * 60 + 3600, // 1 hora después
      allDay: false,
      responsibleParent: 'parent1-1111-1111-1111-111111111111',
      createdBy: 'parent1-1111-1111-1111-111111111111',
    },
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      eventType: 'school',
      title: 'Reunión de Padres',
      description: 'Reunión trimestral en la escuela',
      startTime: now + 7 * 24 * 60 * 60, // En 7 días
      endTime: now + 7 * 24 * 60 * 60 + 3600,
      allDay: false,
      responsibleParent: null,
      createdBy: 'parent2-2222-2222-2222-222222222222',
    },
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      eventType: 'vacation',
      title: 'Vacaciones de Invierno',
      description: 'Semana de vacaciones escolares',
      startTime: now + 30 * 24 * 60 * 60, // En 30 días
      endTime: now + 37 * 24 * 60 * 60, // 7 días después
      allDay: true,
      responsibleParent: null,
      createdBy: 'parent1-1111-1111-1111-111111111111',
    },
    {
      familyId: 'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      eventType: 'dropoff',
      title: 'Entrega de Sofía',
      description: 'Entrega en casa de papá',
      startTime: now + 1 * 24 * 60 * 60, // Mañana
      endTime: null,
      allDay: false,
      responsibleParent: 'parent2-2222-2222-2222-222222222222',
      createdBy: 'parent1-1111-1111-1111-111111111111',
    },
  ];

  for (const event of events) {
    try {
      const eventId = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO calendar_events (id, family_id, event_type, title, description,
                                      start_time, end_time, all_day, responsible_parent,
                                      created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          eventId,
          event.familyId,
          event.eventType,
          event.title,
          event.description,
          event.startTime,
          event.endTime,
          event.allDay ? 1 : 0,
          event.responsibleParent,
          event.createdBy,
          timestamp,
          timestamp
        )
        .run();
      console.log(`  ✓ Evento creado: ${event.title}`);
    } catch (error) {
      console.error(`  ✗ Error creando evento:`, error);
    }
  }

  // 6. Crear acceso profesional
  console.log('👔 Configurando acceso profesional...');
  try {
    const accessId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO professional_access (id, family_id, user_id, professional_type,
                                          approved_by_parent1, approved_by_parent2, granted_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        accessId,
        'family1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'prof1-4444-4444-4444-444444444444',
        'lawyer',
        1, // Aprobado por padre 1
        1, // Aprobado por padre 2
        timestamp,
        timestamp
      )
      .run();
    console.log(`  ✓ Acceso profesional configurado`);
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      console.log(`  ⊙ Acceso profesional ya existe`);
    } else {
      console.error(`  ✗ Error configurando acceso profesional:`, error);
    }
  }

  console.log('\n✅ Seed completado exitosamente!');
  console.log('\n📋 Credenciales de prueba:');
  console.log('\n👨‍👩‍👧 Familia García:');
  console.log('  Padre 1: maria.garcia@example.com / Password123');
  console.log('  Padre 2: juan.garcia@example.com / Password123');
  console.log('  Hijo: sofia.garcia@example.com / 1234');
  console.log('  Profesional: abogado.martinez@example.com / Password123');
  console.log('\n👨‍👩‍👦 Familia López:');
  console.log('  Padre 1: ana.lopez@example.com / Password123');
  console.log('  Padre 2: carlos.lopez@example.com / Password123');
  console.log('  Hijo: lucas.lopez@example.com / 1234');
}
