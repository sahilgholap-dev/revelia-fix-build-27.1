import { Request, Response } from 'express';
import * as compatibilityService from '../services/compatibility.service';
import { getEffectiveTier } from '../utils/subscriptionTier';
import { logger } from '../utils/logger';
import { sanitiseReadPayload } from '../services/prose-sanitiser';

/**
 * Generate compatibility reading
 * POST /api/compatibility
 */
export async function generateCompatibility(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const { partnerName, partnerImageUrl, partnerBirthDate, partnerBirthTime, partnerBirthPlace, relationshipType, relationshipSubType } = req.body;

    if (!partnerName || !partnerImageUrl) {
      res.status(400).json({
        success: false,
        error: 'Partner name and image URL are required',
      });
      return;
    }

    // Tier gating: non-love relationship types require Premium Plus
    if (relationshipType && relationshipType !== 'love' && getEffectiveTier(req.user!) !== 'premium_plus') {
      res.status(403).json({
        success: false,
        error: 'Non-love relationship types require Premium Plus',
      });
      return;
    }

    const compatibility = await compatibilityService.generateCompatibility(
      userId,
      {
        name: partnerName,
        imageUrl: partnerImageUrl,
        birthDate: partnerBirthDate,
        birthTime: partnerBirthTime,
        birthPlace: partnerBirthPlace,
        relationshipType: relationshipType || 'love',
        relationshipSubType,
      }
    );

    res.status(200).json({
      success: true,
      data: compatibility,
    });
  } catch (error: any) {
    logger.error('Compatibility generation error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to generate compatibility reading',
    });
  }
}

/**
 * Get all compatibility readings
 * GET /api/compatibility
 */
export async function getCompatibilityReadings(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const readings = await compatibilityService.getCompatibilityReadings(
      userId
    );

    /* `P91` (a) — compatibility never expires: 81 of 86 stored readings dirty, and
       this is the LIST, so it is the first place a user sees them again. */
    res.status(200).json({
      success: true,
      data: { readings: sanitiseReadPayload(readings).value },
    });
  } catch (error: any) {
    logger.error('Get compatibility readings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve compatibility readings',
    });
  }
}

/**
 * Get specific compatibility reading
 * GET /api/compatibility/:id
 */
export async function getCompatibilityById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const { id } = req.params;

    const compatibility = await compatibilityService.getCompatibilityById(
      userId,
      id
    );

    /* `P91` (a) — the single-reading read of the same never-expiring documents.
       ⚠️ NOT installed on `generateCompatibility` twenty lines above, which returns
       the identical shape: that path is a FRESH generation and has already been
       cleaned at the write funnel. Sanitising it again would be harmless (the
       function is idempotent) but it would blur which layer owns what, which is
       exactly what `P91` warns against. */
    res.status(200).json({
      success: true,
      data: sanitiseReadPayload(compatibility).value,
    });
  } catch (error: any) {
    logger.error('Get compatibility by ID error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Compatibility reading not found',
    });
  }
}

/**
 * Delete compatibility reading
 * DELETE /api/compatibility/:id
 */
export async function deleteCompatibility(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const { id } = req.params;

    await compatibilityService.deleteCompatibility(userId, id);

    res.status(200).json({
      success: true,
      message: 'Compatibility reading deleted',
    });
  } catch (error: any) {
    logger.error('Delete compatibility error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete compatibility reading',
    });
  }
}
