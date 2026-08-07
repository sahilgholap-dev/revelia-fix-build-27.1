import { logger } from './logger';

/**
 * Defensive JSON parser for Claude API responses.
 *
 * Claude occasionally:
 *   1. Wraps JSON in ```json ... ``` markdown fences.
 *   2. Adds a sentence of preamble/postamble around the JSON object.
 *   3. Truncates output mid-string when max_tokens is hit.
 *
 * This helper handles (1) and (2), and surfaces a clear, user-actionable error
 * for (3) — with enough context in the logs to debug.
 */
export class TruncatedAIResponseError extends Error {
  readonly responseLength: number;
  readonly truncated: boolean;
  readonly context: string;

  constructor(
    context: string,
    responseLength: number,
    truncated: boolean,
    cause?: string
  ) {
    super(
      `AI response could not be parsed (${context}). This usually means the response was truncated. Please try again.${
        cause ? ` (${cause})` : ''
      }`
    );
    this.name = 'TruncatedAIResponseError';
    this.context = context;
    this.responseLength = responseLength;
    this.truncated = truncated;
  }
}

export function safeJsonParse<T = any>(rawResponse: string, context: string): T {
  // 1. Strip markdown code fences if Claude wrapped JSON in ```json ... ```
  let cleaned = (rawResponse || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  // 2. Try direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch (firstError: any) {
    // 3. Try extracting first balanced JSON object from response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch (secondError: any) {
        const truncated = !cleaned.endsWith('}');
        logger.error(`[safeJsonParse] Failed to parse ${context} response`, {
          responseLength: rawResponse?.length ?? 0,
          firstError: firstError?.message,
          secondError: secondError?.message,
          truncated,
          lastChars: cleaned.slice(-200),
          firstChars: cleaned.slice(0, 200),
        });
        throw new TruncatedAIResponseError(
          context,
          rawResponse?.length ?? 0,
          truncated,
          secondError?.message
        );
      }
    }

    const truncated = !cleaned.endsWith('}');
    logger.error(`[safeJsonParse] No JSON object found in ${context} response`, {
      responseLength: rawResponse?.length ?? 0,
      firstError: firstError?.message,
      truncated,
      lastChars: cleaned.slice(-200),
      firstChars: cleaned.slice(0, 200),
    });
    throw new TruncatedAIResponseError(
      context,
      rawResponse?.length ?? 0,
      truncated,
      firstError?.message
    );
  }
}
