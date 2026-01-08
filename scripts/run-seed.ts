/**
 * Ejecuta el script de seed
 */

import { seedDatabase } from './seed';

// Este script se ejecuta con: wrangler d1 execute DB --file=./scripts/seed.sql
// O usando el API de D1 directamente

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      await seedDatabase(env.DB);
      return new Response(
        JSON.stringify({ success: true, message: 'Seed completado' }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
