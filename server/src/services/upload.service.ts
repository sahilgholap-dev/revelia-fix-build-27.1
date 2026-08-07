import * as r2Service from './r2.service';
import * as imageProcessing from '../utils/imageProcessing';
import { UserProfile } from '../models/UserProfile';
import { logger } from '../utils/logger';
import { validateFaceImage, validatePalmImage } from './imageValidation.service';
import { extractFaceFeatures } from './faceFeatures.service';
import { mapFeaturesToTraits, RULES_VERSION } from '../data/physiognomy-rules';
import { extractHandFeatures } from './palmFeatures.service';
import {
  mapFeaturesToPalmTraits,
  RULES_VERSION as PALM_RULES_VERSION,
} from '../data/chiromancy-rules';

function getValidationMessage(type: 'face' | 'palm', reason?: string): string {
  if (type === 'face') {
    switch (reason) {
      case 'NO_FACE': return 'We couldn\'t detect a face in your photo. Please take a clear, front-facing selfie with good lighting.';
      case 'MULTIPLE_FACES': return 'We detected multiple faces. Please take a photo with only your face visible.';
      case 'NOT_HUMAN': return 'Please upload a photo of your face. We need a clear human face for your personalized reading.';
      case 'LOW_QUALITY': return 'Your photo is a bit unclear. Please retake with better lighting and make sure your face is centered.';
      default: return 'We couldn\'t process this image. Please try again with a clear photo of your face.';
    }
  } else {
    switch (reason) {
      case 'NO_PALM': return 'We couldn\'t detect a palm in your photo. Please place your open hand palm-up with fingers spread.';
      case 'NOT_PALM': return 'This doesn\'t appear to be a palm photo. Please upload a clear photo of your open palm.';
      case 'WRONG_SIDE': return 'It looks like you\'re showing the back of your hand. Please flip your hand to show your palm.';
      case 'LOW_QUALITY': return 'Your palm lines aren\'t clear enough. Please retake in good lighting with your palm fully open.';
      default: return 'We couldn\'t process this image. Please try again with a clear palm photo.';
    }
  }
}

/**
 * Upload image result
 *
 * `validation` is set when Claude Vision validation ran (face/palm/partner
 * paths). `status: 'valid'` means proceed silently; `status: 'uncertain'`
 * means show the soft-fail modal in mobile. `status: 'invalid'` is thrown
 * upstream — never surfaces in this result type.
 */
export interface UploadImageResult {
  url: string;
  type: string;
  uploadedAt: Date;
  validation?: {
    status: 'valid' | 'uncertain';
    reason?: string;
  };
}

/**
 * Upload face image
 * @param userId - User ID
 * @param imageBuffer - Image buffer
 * @returns Upload result
 */
export async function uploadFaceImage(
  userId: string,
  imageBuffer: Buffer,
  mimetype: string = 'image/jpeg'
): Promise<UploadImageResult> {
  // Validate image
  const isValid = await imageProcessing.validateImage(imageBuffer);
  if (!isValid) {
    throw new Error('Invalid image format. Only JPEG, PNG, and WebP are supported.');
  }

  // Validate image content with Claude Vision (three-state).
  // 'invalid' → 422 (image not saved). 'valid' / 'uncertain' → save and pass
  // status through to mobile so it can decide whether to show soft-fail UX.
  const base64 = imageBuffer.toString('base64');
  const mediaType = mimetype || 'image/jpeg';
  const validation = await validateFaceImage(base64, mediaType);
  if (validation.status === 'invalid') {
    throw Object.assign(new Error('INVALID_IMAGE'), {
      statusCode: 422,
      reason: validation.reason,
      userMessage: getValidationMessage('face', validation.reason)
    });
  }

  // Process image (resize, compress)
  const processedBuffer = await imageProcessing.processImage(imageBuffer);

  // Check if R2 is configured
  if (!r2Service.isR2Configured()) {
    logger.error('R2 storage not configured. Missing env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    throw new Error('Image storage is temporarily unavailable. Please try again later.');
  }

  // Get existing face image to delete later
  const profile = await UserProfile.findOne({ userId });
  const oldImageUrl = profile?.images?.face?.url;

  // Upload to R2
  let url: string;
  try {
    const result = await r2Service.uploadImage(processedBuffer, userId, 'face');
    url = result.url;
  } catch (error: any) {
    logger.error('R2 face upload failed:', { userId, error: error.message });
    throw new Error('Failed to upload image to storage. Please try again.');
  }

  // Build 27 R2 — structured face layer. Extract a deterministic feature vector
  // from the CANONICAL stored bytes (`processedBuffer` — the exact bytes uploaded
  // to R2 above, NOT the raw multipart buffer; re-encoding would shift landmarks
  // and break "same image → same vector"), then map it to stable traits/archetype
  // via the curated rules table. Persisted in the SAME update that sets the face
  // URL so the structured layer never lags the image.
  //
  // FAIL-OPEN (mirrors R1's natal-compute hook): extraction/mapping must never
  // block an upload. If it throws or returns null (no face on a validated image),
  // we log and continue with the features CLEARED — a new face photo invalidates
  // the previous face's vector/traits, so we must not leave another face's data
  // attached. The reading-time lazy fallback then retries on the new image.
  let faceVector: Awaited<ReturnType<typeof extractFaceFeatures>> = null;
  let mapped: ReturnType<typeof mapFeaturesToTraits> | null = null;
  try {
    faceVector = await extractFaceFeatures(processedBuffer);
    if (faceVector) {
      mapped = mapFeaturesToTraits(faceVector);
    } else {
      logger.warn('face_features_extract_no_face', { userId });
    }
  } catch (error: any) {
    logger.warn('face_features_extract_failed', {
      userId,
      error: error?.message ?? String(error),
    });
    faceVector = null;
    mapped = null;
  }

  // Update UserProfile (upsert to handle new users without a profile yet)
  const uploadedAt = new Date();
  const faceUpdate: Record<string, any> = {
    $set: {
      'images.face.url': url,
      'images.face.uploadedAt': uploadedAt,
    },
  };
  if (faceVector && mapped) {
    faceUpdate.$set.faceFeatures = faceVector;
    faceUpdate.$set.faceTraits = mapped.traits;
    faceUpdate.$set.faceArchetypeResult = mapped.archetype;
    faceUpdate.$set.faceRulesVersion = RULES_VERSION;
  } else {
    // No usable vector on the new image — clear any stale features so the old
    // face's data doesn't stay attached to the new photo.
    faceUpdate.$set.faceFeatures = null;
    faceUpdate.$set.faceArchetypeResult = null;
    faceUpdate.$set.faceRulesVersion = null;
    faceUpdate.$unset = { faceTraits: 1 };
  }
  await UserProfile.findOneAndUpdate({ userId }, faceUpdate, {
    upsert: true,
    new: true,
  });

  // Delete old image if exists
  if (oldImageUrl) {
    try {
      const oldKey = oldImageUrl.split('/').slice(-3).join('/');
      await r2Service.deleteImage(oldKey);
    } catch (error) {
      logger.warn('Failed to delete old face image:', error);
    }
  }

  return {
    url,
    type: 'face',
    uploadedAt,
    validation: { status: validation.status, reason: validation.reason },
  };
}

/**
 * Upload palm image
 * @param userId - User ID
 * @param imageBuffer - Image buffer
 * @param isDominant - Is dominant hand
 * @returns Upload result
 */
export async function uploadPalmImage(
  userId: string,
  imageBuffer: Buffer,
  isDominant: boolean,
  mimetype: string = 'image/jpeg'
): Promise<UploadImageResult> {
  const type = isDominant ? 'palm-dominant' : 'palm-non-dominant';

  // Validate image
  const isValid = await imageProcessing.validateImage(imageBuffer);
  if (!isValid) {
    throw new Error('Invalid image format. Only JPEG, PNG, and WebP are supported.');
  }

  // Three-state validation (see uploadFaceImage for details).
  const base64 = imageBuffer.toString('base64');
  const mediaType = mimetype || 'image/jpeg';
  const validation = await validatePalmImage(base64, mediaType);
  if (validation.status === 'invalid') {
    throw Object.assign(new Error('INVALID_IMAGE'), {
      statusCode: 422,
      reason: validation.reason,
      userMessage: getValidationMessage('palm', validation.reason)
    });
  }

  // Process image
  const processedBuffer = await imageProcessing.processImage(imageBuffer);

  // Check if R2 is configured
  if (!r2Service.isR2Configured()) {
    logger.error('R2 storage not configured. Missing env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    throw new Error('Image storage is temporarily unavailable. Please try again later.');
  }

  // Get existing palm image to delete later
  const profile = await UserProfile.findOne({ userId });
  const fieldName = isDominant ? 'palmDominant' : 'palmNonDominant';
  const oldImageUrl = profile?.images?.[fieldName]?.url;

  // Upload to R2
  let url: string;
  try {
    const result = await r2Service.uploadImage(processedBuffer, userId, type);
    url = result.url;
  } catch (error: any) {
    logger.error('R2 palm upload failed:', { userId, type, error: error.message });
    throw new Error('Failed to upload image to storage. Please try again.');
  }

  // Build 27 R3 — structured palm layer, PER HAND. Extract a deterministic
  // hand-geometry vector from the CANONICAL stored bytes (`processedBuffer` — the
  // exact bytes uploaded to R2 above, NOT the raw multipart buffer; re-encoding
  // would shift landmarks and break "same image → same vector"), then map it to a
  // stable trait profile / palmType / talents via the curated chiromancy rules
  // table. Persisted in the SAME update that sets the palm URL so the structured
  // layer never lags the image. Runs per hand: the DOMINANT hand additionally
  // derives `palmProfileResult`/`palmRulesVersion` (the profile insight/synthesis
  // reads); the non-dominant hand only writes its own features/traits.
  //
  // FAIL-OPEN (mirrors uploadFaceImage + R1's natal-compute hook): extraction /
  // mapping must never block an upload. If it throws or returns null (no hand on a
  // validated image), we log and continue with THIS HAND's features CLEARED — a
  // new palm photo invalidates that hand's old vector/traits, and we must not
  // leave the previous photo's data attached. Only the re-uploaded hand is touched
  // (a dominant re-upload must NOT clear non-dominant data, and vice-versa; a
  // dominant clear also drops the dominant-derived profile/rulesVersion). The
  // reading-time lazy fallback then retries on the new image.
  const handLabel: 'dominant' | 'non-dominant' = isDominant
    ? 'dominant'
    : 'non-dominant';
  let palmVector: Awaited<ReturnType<typeof extractHandFeatures>> = null;
  let palmMapped: ReturnType<typeof mapFeaturesToPalmTraits> | null = null;
  try {
    palmVector = await extractHandFeatures(processedBuffer, handLabel);
    if (palmVector) {
      palmMapped = mapFeaturesToPalmTraits(palmVector);
    } else {
      logger.warn('palm_features_extract_no_hand', { userId, hand: handLabel });
    }
  } catch (error: any) {
    logger.warn('palm_features_extract_failed', {
      userId,
      hand: handLabel,
      error: error?.message ?? String(error),
    });
    palmVector = null;
    palmMapped = null;
  }

  // Update UserProfile (upsert to handle new users without a profile yet)
  const uploadedAt = new Date();
  const updateFieldName = isDominant ? 'images.palmDominant' : 'images.palmNonDominant';

  const palmUpdate: Record<string, any> = {
    $set: {
      [`${updateFieldName}.url`]: url,
      [`${updateFieldName}.uploadedAt`]: uploadedAt,
    },
  };
  if (isDominant) {
    if (palmVector && palmMapped) {
      palmUpdate.$set.palmDominantFeatures = palmVector;
      palmUpdate.$set.palmDominantTraits = palmMapped.traits;
      // Profile + rules version are derived from the DOMINANT hand only.
      palmUpdate.$set.palmProfileResult = palmMapped.profile;
      palmUpdate.$set.palmRulesVersion = PALM_RULES_VERSION;
    } else {
      // No usable vector on the new dominant image — clear stale dominant
      // features + the dominant-derived profile/rules version.
      palmUpdate.$set.palmDominantFeatures = null;
      palmUpdate.$set.palmProfileResult = null;
      palmUpdate.$set.palmRulesVersion = null;
      palmUpdate.$unset = { palmDominantTraits: 1 };
    }
  } else {
    if (palmVector && palmMapped) {
      palmUpdate.$set.palmNonDominantFeatures = palmVector;
      palmUpdate.$set.palmNonDominantTraits = palmMapped.traits;
      // profile/rulesVersion are dominant-derived — do NOT touch them here.
    } else {
      // No usable vector on the new non-dominant image — clear only this hand's
      // stale features (leave the dominant-derived profile untouched).
      palmUpdate.$set.palmNonDominantFeatures = null;
      palmUpdate.$unset = { palmNonDominantTraits: 1 };
    }
  }

  await UserProfile.findOneAndUpdate({ userId }, palmUpdate, {
    upsert: true,
    new: true,
  });

  // Delete old image if exists
  if (oldImageUrl) {
    try {
      const oldKey = oldImageUrl.split('/').slice(-3).join('/');
      await r2Service.deleteImage(oldKey);
    } catch (error) {
      logger.warn('Failed to delete old palm image:', error);
    }
  }

  return {
    url,
    type,
    uploadedAt,
    validation: { status: validation.status, reason: validation.reason },
  };
}

/**
 * Delete uploaded image
 * @param userId - User ID
 * @param type - Image type
 */
export async function deleteUploadedImage(
  userId: string,
  type: 'face' | 'palm-dominant' | 'palm-non-dominant'
): Promise<void> {
  // Get current image URL from profile
  const profile = await UserProfile.findOne({ userId });
  if (!profile) {
    throw new Error('Profile not found');
  }

  let imageUrl: string | undefined;
  let fieldName: string;

  if (type === 'face') {
    imageUrl = profile.images.face?.url;
    fieldName = 'images.face';
  } else if (type === 'palm-dominant') {
    imageUrl = profile.images.palmDominant?.url;
    fieldName = 'images.palmDominant';
  } else {
    imageUrl = profile.images.palmNonDominant?.url;
    fieldName = 'images.palmNonDominant';
  }

  if (!imageUrl) {
    return; // No image to delete
  }

  // Extract key from URL
  const key = imageUrl.split('/').slice(-3).join('/'); // Extract userId/type/timestamp.jpg

  // Check if R2 is configured
  if (r2Service.isR2Configured()) {
    try {
      // Delete from R2
      await r2Service.deleteImage(key);
    } catch (error) {
      console.error('Failed to delete image from R2:', error);
      // Continue to update profile even if R2 deletion fails
    }
  }

  // Update profile
  await UserProfile.findOneAndUpdate({ userId }, { $unset: { [fieldName]: 1 } });
}

/**
 * Upload partner image for compatibility reading
 * @param userId - User ID
 * @param imageBuffer - Image buffer
 * @returns Upload result
 */
export async function uploadPartnerImage(
  userId: string,
  imageBuffer: Buffer,
  mimetype: string = 'image/jpeg'
): Promise<UploadImageResult> {
  // Validate image
  const isValid = await imageProcessing.validateImage(imageBuffer);
  if (!isValid) {
    throw new Error('Invalid image format. Only JPEG, PNG, and WebP are supported.');
  }

  // Three-state validation; partner photo follows same UX as user face.
  const base64 = imageBuffer.toString('base64');
  const mediaType = mimetype || 'image/jpeg';
  const validation = await validateFaceImage(base64, mediaType);
  if (validation.status === 'invalid') {
    throw Object.assign(new Error('INVALID_IMAGE'), {
      statusCode: 422,
      reason: validation.reason,
      userMessage: getValidationMessage('face', validation.reason)
    });
  }

  // Process image (resize, compress)
  const processedBuffer = await imageProcessing.processImage(imageBuffer);

  // Check if R2 is configured
  if (!r2Service.isR2Configured()) {
    throw new Error('R2 storage is not configured. Please set R2 environment variables.');
  }

  // Upload to R2 with partner key format
  const { url } = await r2Service.uploadImage(processedBuffer, userId, 'partner');

  const uploadedAt = new Date();

  return {
    url,
    type: 'partner',
    uploadedAt,
    validation: { status: validation.status, reason: validation.reason },
  };
}
