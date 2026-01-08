/**
 * Script para ejecutar el seed desde la línea de comandos
 * Ejecutar con: npx tsx scripts/seed-runner.ts
 */

import { seedDatabase } from './seed';

// Simular el entorno de Cloudflare D1
// En producción, esto se ejecutaría en un Worker o usando wrangler

async function main() {
  console.log('⚠️  Este script requiere acceso a la base de datos D1.');
  console.log('📝 Para ejecutar el seed, usa uno de estos métodos:\n');
  console.log('1. Crear un endpoint temporal en functions/api/seed.ts');
  console.log('2. Usar wrangler d1 execute con queries SQL');
  console.log('3. Ejecutar desde el código de la aplicación\n');
  console.log('💡 Recomendación: Usa el endpoint /api/seed (POST) después de iniciar el servidor.\n');
}

main().catch(console.error);
