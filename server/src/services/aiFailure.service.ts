import { AiFailure, AiFailureErrorType } from '../models/AiFailure';
import { logger } from '../utils/logger';

export interface AiFailureRecord {
  userId?: string | null;
  readingType: string;
  errorType: AiFailureErrorType;
  errorMessage: string;
  responseText?: string;
  responseLength?: number;
  modelUsed?: string;
  maxTokensRequested?: number;
}

/**
 * Fire-and-forget logger for AI generation failures.
 *
 * Stores ONLY error metadata. Never persists the full response, user images,
 * or birth data — only short snippets useful for diagnosing truncation /
 * malformed JSON.
 */
export async function logAiFailure(record: AiFailureRecord): Promise<void> {
  try {
    const text = record.responseText || '';
    const responseLength = record.responseLength ?? text.length;
    const snippetStart = text ? text.slice(0, 500) : undefined;
    const snippetEnd = text && text.length > 500 ? text.slice(-500) : undefined;

    await AiFailure.create({
      userId: record.userId || null,
      readingType: record.readingType,
      errorType: record.errorType,
      errorMessage: record.errorMessage,
      responseLength,
      responseSnippetStart: snippetStart,
      responseSnippetEnd: snippetEnd,
      modelUsed: record.modelUsed,
      maxTokensRequested: record.maxTokensRequested,
    });
  } catch (err: any) {
    // Never let diagnostic logging break the request flow
    logger.warn('Failed to write ai_failure record', {
      error: err?.message,
      readingType: record.readingType,
    });
  }
}

export async function getRecentAiFailures(sinceMs: number) {
  const since = new Date(Date.now() - sinceMs);
  const failures = await AiFailure.find({ createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const byType: Record<string, number> = {};
  const byReading: Record<string, number> = {};
  for (const f of failures) {
    byType[f.errorType] = (byType[f.errorType] || 0) + 1;
    byReading[f.readingType] = (byReading[f.readingType] || 0) + 1;
  }

  return {
    since: since.toISOString(),
    total: failures.length,
    byErrorType: byType,
    byReadingType: byReading,
    recent: failures.slice(0, 50),
  };
}
