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
 * Prompt especializado para detectar conflicto parental, validación cultural argentina y detección de borrachera
 */
const TONE_ANALYSIS_PROMPT = `Eres un asistente especializado en comunicación entre padres separados en Argentina. Analiza el siguiente mensaje y detecta:

1. VALIDACIÓN CULTURAL ARGENTINA:
   - Lenguaje apropiado y respetuoso según las normas sociales argentinas
   - Uso adecuado de modismos y expresiones locales (sin excesos)
   - Respeto por el "vos" o "tú" según el contexto
   - Tono apropiado para comunicación entre padres separados

2. DETECCIÓN DE TONO INAPROPIADO:
   - Agresividad directa (insultos, amenazas, lenguaje hostil)
   - Sarcasmo o tono pasivo-agresivo
   - Lenguaje culpabilizador (echar culpas, victimización)
   - Tono confrontativo o desafiante
   - Falta de respeto o desconsideración
   - Uso excesivo de mayúsculas (percepción de gritos)
   - Múltiples signos de exclamación o interrogación

3. DETECCIÓN ESTRICTA DE BORRACHERA (estado de embriaguez):
   - Errores de escritura frecuentes o palabras mal escritas
   - Incoherencias en el mensaje (ideas que no conectan)
   - Repeticiones innecesarias de palabras o frases
   - Falta de puntuación o puntuación incorrecta
   - Cambios abruptos de tema sin transición
   - Palabras escritas con letras mezcladas o faltantes
   - Frases incompletas o sin sentido
   - Uso excesivo de jerga o palabras fuera de contexto
   - Mensajes que parecen escritos con dificultad motora

IMPORTANTE: Sé estricto en la detección de borrachera. Si detectas CUALQUIER indicio de que el usuario podría estar bajo la influencia del alcohol, marca isDrunk como true.

Responde ÚNICAMENTE en formato JSON válido con:
{
  "hasIssues": boolean,
  "issues": string[],
  "suggestion": string,
  "isDrunk": boolean,
  "toneScore": number
}

- hasIssues: true si hay problemas de tono o borrachera
- issues: array de strings describiendo los problemas encontrados
- suggestion: mensaje reformulado más apropiado y constructivo (vacío si no hay problemas)
- isDrunk: true si detectas indicios de borrachera (errores, incoherencias, etc.)
- toneScore: número del 0 al 100 donde 0 es muy inapropiado y 100 es perfectamente apropiado

Si el mensaje es apropiado y no hay indicios de borrachera, hasIssues debe ser false e isDrunk debe ser false.`;

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
 * Analiza el tono de un mensaje (función interna reutilizable)
 */
export async function validateMessageTone(
  content: string,
  ctx: Context,
  skipLogging: boolean = false
): Promise<{
  hasIssues: boolean;
  issues: string[];
  suggestion: string;
  isDrunk: boolean;
  toneScore: number;
}> {
  // Analizar con Cloudflare Workers AI
  let analysisResult: {
    hasIssues: boolean;
    issues: string[];
    suggestion: string;
    isDrunk: boolean;
    toneScore: number;
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
      let parsedResult: any = null;
      
      try {
        parsedResult = JSON.parse(responseText);
      } catch {
        // Si no es JSON válido, intentar extraer JSON del texto
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedResult = JSON.parse(jsonMatch[0]);
          } catch {
            console.error('Failed to parse extracted JSON:', jsonMatch[0]);
          }
        }
      }

      // Validar y normalizar resultado
      if (parsedResult && typeof parsedResult === 'object') {
        analysisResult = {
          hasIssues: Boolean(parsedResult.hasIssues),
          issues: Array.isArray(parsedResult.issues) ? parsedResult.issues : [],
          suggestion: String(parsedResult.suggestion || ''),
          isDrunk: Boolean(parsedResult.isDrunk),
          toneScore: typeof parsedResult.toneScore === 'number' ? parsedResult.toneScore : 50,
        };
      } else {
        // Fallback: usar análisis básico si no podemos parsear
        console.warn('AI response could not be parsed, using basic analysis');
        const basicResult = await basicToneAnalysis(content);
        analysisResult = {
          ...basicResult,
          isDrunk: false,
          toneScore: basicResult.hasIssues ? 30 : 80,
        };
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      // Fallback: usar análisis básico mejorado
      const basicResult = await basicToneAnalysis(content);
      analysisResult = {
        ...basicResult,
        isDrunk: false,
        toneScore: basicResult.hasIssues ? 30 : 80,
      };
    }
  } else {
    // Sin AI binding, retornar análisis básico mejorado
    const basicResult = await basicToneAnalysis(content);
    analysisResult = {
      ...basicResult,
      isDrunk: false,
      toneScore: basicResult.hasIssues ? 30 : 80,
    };
  }

  // Guardar log si no se omite
  if (!skipLogging && ctx.userId) {
    const logId = crypto.randomUUID();
    const timestamp = getCurrentTimestamp();

    await executeMutation(
      ctx.env.DB,
      `INSERT INTO ai_coach_logs (id, message_id, user_id, original_content, has_issues, issues, suggestion, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        null,
        ctx.userId!,
        content,
        analysisResult.hasIssues ? 1 : 0,
        analysisResult.issues.length > 0
          ? JSON.stringify(analysisResult.issues)
          : null,
        analysisResult.suggestion || null,
        timestamp,
      ]
    ).catch(err => console.error('Error logging AI analysis:', err));
  }

  return analysisResult;
}

/**
 * Analiza el tono de un mensaje (endpoint HTTP)
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

  // Usar función de validación reutilizable
  const analysisResult = await validateMessageTone(content, ctx, false);

  // Guardar log con messageId si está disponible
  if (messageId) {
    const logId = crypto.randomUUID();
    const timestamp = getCurrentTimestamp();

    await executeMutation(
      ctx.env.DB,
      `UPDATE ai_coach_logs SET message_id = ? WHERE user_id = ? AND created_at = (
         SELECT MAX(created_at) FROM ai_coach_logs WHERE user_id = ?
       )`,
      [messageId, ctx.userId!, ctx.userId!]
    ).catch(err => console.error('Error updating log with messageId:', err));
  }

  return {
    body: {
      success: true,
      analysis: analysisResult,
    },
    status: 200,
  };
}

/**
 * Análisis básico de tono sin IA (fallback mejorado)
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
    'nunca haces',
    'siempre haces',
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

  // Detectar errores de escritura comunes (posible borrachera)
  const typoPatterns = [
    /\b\w{1,2}\s+\w{1,2}\s+\w{1,2}\b/g, // Palabras muy cortas repetidas
    /([a-záéíóúñ])\1{3,}/gi, // Letras repetidas 4+ veces
  ];

  let typoCount = 0;
  for (const pattern of typoPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      typoCount += matches.length;
    }
  }

  // Detectar palabras mal escritas (palabras comunes con errores)
  const commonWords = ['que', 'que', 'porque', 'también', 'más', 'menos', 'hacer', 'decir'];
  const words = content.toLowerCase().split(/\s+/);
  let misspelledCount = 0;
  for (const word of words) {
    const cleanWord = word.replace(/[.,!?;:]/g, '');
    if (cleanWord.length > 3) {
      // Buscar palabras similares pero mal escritas
      const hasCloseMatch = commonWords.some(cw => {
        const distance = levenshteinDistance(cleanWord, cw);
        return distance > 0 && distance <= 2 && cleanWord.length >= cw.length - 1;
      });
      if (!hasCloseMatch && !commonWords.includes(cleanWord)) {
        // Verificar si parece una palabra común con error
        const looksLikeTypo = commonWords.some(cw => {
          return cleanWord.includes(cw.substring(0, 3)) || cw.includes(cleanWord.substring(0, 3));
        });
        if (looksLikeTypo) misspelledCount++;
      }
    }
  }

  if (typoCount > 2 || misspelledCount > 3) {
    issues.push('Errores de escritura detectados que pueden indicar dificultades');
  }

  if (issues.length > 0) {
    return {
      hasIssues: true,
      issues,
      suggestion:
        'Considera reformular el mensaje de manera más neutral y constructiva. Enfócate en los hechos y evita lenguaje que pueda ser percibido como acusatorio. Revisa la ortografía y gramática antes de enviar.',
    };
  }

  return {
    hasIssues: false,
    issues: [],
    suggestion: '',
  };
}

/**
 * Calcula la distancia de Levenshtein entre dos strings (para detectar errores de escritura)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
}

