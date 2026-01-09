/**
 * Script para actualizar passwords en la base de datos local
 * Ejecutar con: npx tsx scripts/update-passwords-local.ts
 */

import { generatePasswordSalt, hashPassword } from '../src/utils/encryption';

interface UserPassword {
  id: string;
  email: string;
  password: string;
}

const users: UserPassword[] = [
  { id: 'parent1-1111-1111-1111-111111111111', email: 'maria.garcia@example.com', password: 'Password123' },
  { id: 'parent2-2222-2222-2222-222222222222', email: 'juan.garcia@example.com', password: 'Password123' },
  { id: 'child1-3333-3333-3333-333333333333', email: 'sofia.garcia@example.com', password: '1234' },
  { id: 'prof1-4444-4444-4444-444444444444', email: 'abogado.martinez@example.com', password: 'Password123' },
  { id: 'parent3-5555-5555-5555-555555555555', email: 'ana.lopez@example.com', password: 'Password123' },
  { id: 'parent4-6666-6666-6666-666666666666', email: 'carlos.lopez@example.com', password: 'Password123' },
  { id: 'child2-7777-7777-7777-777777777777', email: 'lucas.lopez@example.com', password: '1234' },
];

async function generatePasswordUpdates() {
  console.log('🔐 Generando queries SQL para actualizar passwords...\n');
  
  const queries: string[] = [];
  
  for (const user of users) {
    const salt = generatePasswordSalt();
    const hash = await hashPassword(user.password, salt);
    
    queries.push(
      `UPDATE users SET password_hash = '${hash}', password_salt = '${salt}' WHERE id = '${user.id}';`
    );
    
    console.log(`✓ Password generado para: ${user.email}`);
  }
  
  console.log('\n📝 Queries SQL generadas:\n');
  console.log(queries.join('\n'));
  console.log('\n💡 Ejecuta estas queries en la base de datos local');
}

generatePasswordUpdates().catch(console.error);
