/**
 * Endpoint temporal para ejecutar el seed
 * POST /api/seed
 */

import { seedDatabase } from '../../../scripts/seed';

export async function onRequestPost(context: {
  request: Request;
  env: { DB: any };
}): Promise<Response> {
  const { env } = context;

  try {
    await seedDatabase(env.DB);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Seed completado exitosamente. Revisa la consola para ver los detalles.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error en seed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error desconocido',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
