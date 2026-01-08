/**
 * Handler de IA Coach (ToneMeter)
 */

import type { D1Database } from '~/utils/db';
import { executeQueryFirst, executeMutation } from '~/utils/db';
import { getCurrentTimestamp } from '~/utils/timestamps';
import { logAudit, getClientIP, getUserAgent } from '~/utils/audit';

interface Context {
  env: {
    DB: D1Database;
    AI?: any; // Cloudflare Workers AI binding
  };
  userId?: string;
  userRole?: string;
  familyId?: string;
}

/**
 * Prompt especializado para detectar conflicto parental
 */
const TONE_ANALYSIS_PROMPT = `Eres un asistente especializado en comunicación entre padres separados. Analiza el siguiente mensaje y detecta:

1. Agresividad directa (insultos, amenazas, lenguaje hostil)
2. Sarcasmo o tono pasivo-agresivo
3. Lenguaje culpabilizador (echar culpas, victimización)
4. Tono confrontativo o desafiante
5. Falta de respeto o desconsideración

Responde en formato JSON con:
{
  "hasIssues": boolean,
  "issues": string[],
  "suggestion": string
}

Si hay problemas, sugiere una reformulación más civilizada y constructiva. Si el tono es apropiado, hasIssues debe ser false.`;

/**
 * Handler principal de IA Coach
 */
export async function handle(
  request: Request,
  ctx: Context,
  params: Record<string, string>
): Promise<{ body: unknown; status: number }> {
  const method = request.method;
  const endpoint = params.endpoint || '';

  if (!ctx.userId) {
    return { body: { error: 'Unauthorized' }, status: 401 };
  }

  try {
    if (method === 'POST' && endpoint.includes('analyze')) {
      return await analyzeTone(request, ctx);
    }

    return { body: { error: 'Method not allowed' }, status: 405 };
  } catch (error) {
    console.error('AI Coach error:', error);
    return { body: { error: 'Internal server error' }, status: 500 };
  }
}

/**
 * Analiza el tono de un mensaje
 */
async function analyzeTone(
  request: Request,
  ctx: Context
): Promise<{ body: unknown; status: number }> {
  const body = await request.json();
  const { content, messageId } = body;

  if (!content || content.trim().length === 0) {
    return { body: { error: 'Content required' }, status: 400 };
  }

  // Verificar rate limit (ya manejado en router, pero verificamos uso diario)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = Math.floor(today.getTime() / 1000);

  const todayUsage = await executeQueryFirst<{ count: number }>(
    ctx.env.DB,
    `SELECT COUNT(*) as count FROM ai_coach_logs
     WHERE user_id = ? AND created_at >= ?`,
    [ctx.userId!, todayStart]
  );

  if (todayUsage && todayUsage.count >= 20) {
    return {
      body: { error: 'Límite diario de análisis alcanzado (20 por día)' },
      status: 429,
    };
  }

  // Analizar con Cloudflare Workers AI
  let analysisResult: {
    hasIssues: boolean;
    issues: string[];
    suggestion: string;
  };

  if (ctx.env.AI) {
    try {
      const response = await ctx.env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: TONE_ANALYSIS_PROMPT,
          },
          {
            role: 'user',
            content: `Analiza este mensaje: "${content}"`,
          },
        ],
      });

      // Parsear respuesta JSON
      const responseText = response.response || JSON.stringify(response);
      try {
        analysisResult = JSON.parse(responseText);
      } catch {
        // Si no es JSON válido, intentar extraer JSON del texto
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: asumir que no hay problemas si no podemos parsear
          analysisResult = {
            hasIssues: false,
            issues: [],
            suggestion: '',
          };
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      // Fallback: retornar análisis neutral
      analysisResult = {
        hasIssues: false,
        issues: [],
        suggestion: '',
      };
    }
  } else {
    // Sin AI binding, retornar análisis básico
    analysisResult = await basicToneAnalysis(content);
  }

  // Guardar log
  const logId = crypto.randomUUID();
  const timestamp = getCurrentTimestamp();

  await executeMutation(
    ctx.env.DB,
    `INSERT INTO ai_coach_logs (id, message_id, user_id, original_content, has_issues, issues, suggestion, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      logId,
      messageId || null,
      ctx.userId!,
      content,
      analysisResult.hasIssues ? 1 : 0,
      analysisResult.issues.length > 0
        ? JSON.stringify(analysisResult.issues)
        : null,
      analysisResult.suggestion || null,
      timestamp,
    ]
  );

  return {
    body: {
      success: true,
      analysis: analysisResult,
    },
    status: 200,
  };
}

/**
 * Análisis básico de tono sin IA (fallback)
 */
async function basicToneAnalysis(content: string): Promise<{
  hasIssues: boolean;
  issues: string[];
  suggestion: string;
}> {
  const lowerContent = content.toLowerCase();
  const issues: string[] = [];

  // Detectar palabras agresivas comunes
  const aggressiveWords = [
    'idiota',
    'estúpido',
    'imbécil',
    'tonto',
    'inútil',
    'incapaz',
    'culpa tuya',
    'tu culpa',
    'siempre',
    'nunca',
  ];

  for (const word of aggressiveWords) {
    if (lowerContent.includes(word)) {
      issues.push('Lenguaje potencialmente agresivo o culpabilizador');
      break;
    }
  }

  // Detectar mayúsculas excesivas (gritos)
  const upperCaseRatio =
    (content.match(/[A-ZÁÉÍÓÚÑ]/g)?.length || 0) / content.length;
  if (upperCaseRatio > 0.3 && content.length > 10) {
    issues.push('Uso excesivo de mayúsculas puede percibirse como agresivo');
  }

  // Detectar múltiples signos de exclamación
  if ((content.match(/!/g)?.length || 0) > 3) {
    issues.push('Múltiples signos de exclamación pueden indicar tono agresivo');
  }

  if (issues.length > 0) {
    return {
      hasIssues: true,
      issues,
      suggestion:
        'Considera reformular el mensaje de manera más neutral y constructiva. Enfócate en los hechos y evita lenguaje que pueda ser percibido como acusatorio.',
    };
  }

  return {
    hasIssues: false,
    issues: [],
    suggestion: '',
  };
}

