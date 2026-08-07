import { Response } from 'express';
import { TruncatedAIResponseError } from './jsonParser';
import { AppError } from '../middleware/error.middleware';

export type ReadingErrorCode =
  | 'READING_GENERATION_FAILED'
  | 'READING_TRUNCATED'
  | 'IMAGE_FETCH_FAILED'
  | 'TIMEOUT'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED';

interface SendReadingErrorOptions {
  res: Response;
  error: any;
  defaultMessage: string;
  debugRef?: string;
}

/**
 * Translate any error thrown during reading generation into a structured
 * { success: false, error: { code, message, debugRef? } } JSON response.
 *
 * The mobile app uses `error.code` to pick the right retry behavior and
 * `error.message` to render to the user.
 */
export function sendReadingError(opts: SendReadingErrorOptions): void {
  const { res, error, defaultMessage, debugRef } = opts;

  // AppError carries its own statusCode + user-facing message
  if (error instanceof AppError) {
    const code: ReadingErrorCode = pickCode(error.statusCode);
    res.status(error.statusCode).json({
      success: false,
      error: {
        code,
        message: error.message,
        ...(debugRef ? { debugRef } : {}),
      },
    });
    return;
  }

  // Truncation / parse failures from Claude
  if (error instanceof TruncatedAIResponseError) {
    res.status(502).json({
      success: false,
      error: {
        code: 'READING_TRUNCATED',
        message:
          'We had trouble generating your reading because the response was cut short. Please try again.',
        ...(debugRef ? { debugRef } : {}),
      },
    });
    return;
  }

  // Anthropic-SDK rate limit / API error shape
  const status =
    typeof error?.status === 'number' && error.status >= 400 && error.status < 600
      ? error.status
      : 500;

  if (status === 429) {
    res.status(429).json({
      success: false,
      error: {
        code: 'READING_GENERATION_FAILED',
        message: 'Our service is busy right now. Please try again in a moment.',
        ...(debugRef ? { debugRef } : {}),
      },
    });
    return;
  }

  res.status(status).json({
    success: false,
    error: {
      code: 'READING_GENERATION_FAILED',
      message: defaultMessage,
      ...(debugRef ? { debugRef } : {}),
    },
  });
}

function pickCode(statusCode: number): ReadingErrorCode {
  if (statusCode === 400) return 'BAD_REQUEST';
  if (statusCode === 401) return 'UNAUTHORIZED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 408 || statusCode === 504) return 'TIMEOUT';
  return 'READING_GENERATION_FAILED';
}
