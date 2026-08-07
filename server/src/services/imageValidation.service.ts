import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const VALIDATION_MODEL = 'claude-sonnet-4-6';
const VALIDATION_TIMEOUT = 15000;

/**
 * Three-state result.
 *  - 'valid': Claude affirmatively passed the image
 *  - 'invalid': Claude affirmatively rejected (NO_FACE, NOT_HUMAN, etc.)
 *  - 'uncertain': everything else — JSON parse error, empty response,
 *    network/timeout error, or ambiguous Claude output. Caller decides
 *    whether to surface a soft-fail UX or proceed silently.
 *
 * Replaces the previous boolean which collapsed 'valid' and 'uncertain'
 * into a single fail-OPEN bucket — invisible to the user.
 */
export type ImageValidationStatus = 'valid' | 'invalid' | 'uncertain';

export interface ImageValidationResult {
  status: ImageValidationStatus;
  reason?: string;
  rawConfidence?: 'high' | 'medium' | 'low';
}

// Heuristic: phrases in Claude's optional reason string that suggest the
// image passed but with reservations. Bumps a 'valid: true' result down
// to 'uncertain' so mobile can show the soft-fail modal.
const UNCERTAIN_PHRASES = [
  'partial',
  'somewhat',
  'difficult to',
  'hard to',
  'not entirely',
  'low light',
  'shadow',
  'blur',
];

function parseValidationResponse(text: string): ImageValidationResult {
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
  }
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.valid) {
      return { status: 'invalid', reason: parsed.reason, rawConfidence: 'high' };
    }
    // Claude said valid — check whether the optional reason hints at uncertainty.
    if (typeof parsed.reason === 'string') {
      const lower = parsed.reason.toLowerCase();
      if (UNCERTAIN_PHRASES.some((p) => lower.includes(p))) {
        return { status: 'uncertain', reason: parsed.reason, rawConfidence: 'medium' };
      }
    }
    return { status: 'valid', rawConfidence: 'high' };
  } catch {
    logger.warn('Failed to parse validation response:', { text: jsonStr });
    return { status: 'uncertain', reason: 'validation_parse_error', rawConfidence: 'low' };
  }
}

export async function validateFaceImage(imageBase64: string, mediaType: string = 'image/jpeg'): Promise<ImageValidationResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);

    const response = await anthropic.messages.create({
      model: VALIDATION_MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `You are an image validation system. Your ONLY job is to determine if this image is suitable for a face reading.

Analyze the image and respond with ONLY a JSON object (no other text):

Rules:
1. The image MUST contain exactly ONE clearly visible human face
2. The face must be a real photograph (not a cartoon, illustration, AI-generated, or drawing)
3. The face must be reasonably centered and visible (not too far away, not too dark, not too blurry)
4. Reject: animals, objects, landscapes, blank/solid color images, text, screenshots
5. Reject: group photos with multiple people/faces visible
6. Reject: photos where the face is partially obscured, wearing masks covering most of the face, or turned completely away

Respond with EXACTLY this JSON format:
{"valid": true} if the image passes ALL checks
{"valid": false, "reason": "NO_FACE"} if no human face is detected
{"valid": false, "reason": "MULTIPLE_FACES"} if more than one face is detected
{"valid": false, "reason": "NOT_HUMAN"} if the image is of an animal, object, cartoon, etc.
{"valid": false, "reason": "LOW_QUALITY"} if the face is too blurry, too dark, or too far away
{"valid": false, "reason": "INVALID_IMAGE"} for any other rejection reason`,
          },
        ],
      }],
    });

    clearTimeout(timeout);

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      logger.warn('image_validation_face', { status: 'uncertain', reason: 'validation_empty_response', rawConfidence: 'low' });
      return { status: 'uncertain', reason: 'validation_empty_response', rawConfidence: 'low' };
    }

    const result = parseValidationResponse(textContent.text);
    logger.info('image_validation_face', {
      status: result.status,
      reason: result.reason,
      rawConfidence: result.rawConfidence,
    });
    return result;
  } catch (error: any) {
    logger.warn('image_validation_face', { status: 'uncertain', reason: 'validation_error', rawConfidence: 'low', error: error?.message });
    return { status: 'uncertain', reason: 'validation_error', rawConfidence: 'low' };
  }
}

export async function validatePalmImage(imageBase64: string, mediaType: string = 'image/jpeg'): Promise<ImageValidationResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);

    const response = await anthropic.messages.create({
      model: VALIDATION_MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `You are an image validation system. Your ONLY job is to determine if this image is suitable for a palm reading.

Analyze the image and respond with ONLY a JSON object (no other text):

Rules:
1. The image MUST contain a clearly visible human palm (open hand, palm side facing camera)
2. The palm lines must be at least partially visible
3. The image must be a real photograph (not a cartoon, illustration, or drawing)
4. Reject: human faces, animals, animal paws, objects, landscapes, blank/solid color images
5. Reject: closed fists, back of hand (knuckle side), gloved hands
6. Reject: images that are too blurry, too dark, or where the palm is not clearly visible

Respond with EXACTLY this JSON format:
{"valid": true} if the image passes ALL checks
{"valid": false, "reason": "NO_PALM"} if no human palm is detected
{"valid": false, "reason": "NOT_PALM"} if the image is a face, animal, object, etc.
{"valid": false, "reason": "WRONG_SIDE"} if showing back of hand instead of palm
{"valid": false, "reason": "LOW_QUALITY"} if palm is too blurry, too dark, or lines not visible
{"valid": false, "reason": "INVALID_IMAGE"} for any other rejection reason`,
          },
        ],
      }],
    });

    clearTimeout(timeout);

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      logger.warn('image_validation_palm', { status: 'uncertain', reason: 'validation_empty_response', rawConfidence: 'low' });
      return { status: 'uncertain', reason: 'validation_empty_response', rawConfidence: 'low' };
    }

    const result = parseValidationResponse(textContent.text);
    logger.info('image_validation_palm', {
      status: result.status,
      reason: result.reason,
      rawConfidence: result.rawConfidence,
    });
    return result;
  } catch (error: any) {
    logger.warn('image_validation_palm', { status: 'uncertain', reason: 'validation_error', rawConfidence: 'low', error: error?.message });
    return { status: 'uncertain', reason: 'validation_error', rawConfidence: 'low' };
  }
}
