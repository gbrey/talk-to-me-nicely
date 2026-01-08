/**
 * Script para ejecutar seed en producción
 * Ejecutar con: npx tsx scripts/seed-production.ts
 * 
 * Requiere: wrangler login y acceso a la base de datos de producción
 */

import { seedDatabase } from './seed';

async function main() {
  console.log('🌱 Ejecutando seed en producción...');
  console.log('⚠️  Asegúrate de estar conectado a la base de datos correcta\n');

  // Simular el entorno de Cloudflare
  // En producción, esto se ejecutaría desde wrangler d1 execute
  console.log('Para ejecutar en producción, usa:');
  console.log('wrangler d1 execute coparenting-db-prod --remote --file=scripts/seed-sql.sql\n');
  
  console.log('O ejecuta el seed desde el código local conectado a producción:');
  console.log('1. Configura wrangler.toml con la base de producción');
  console.log('2. Ejecuta: npm run dev');
  console.log('3. En otra terminal: curl -X POST http://localhost:8788/api/seed');
}

main().catch(console.error);
