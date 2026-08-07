import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Initialize R2 client (S3-compatible)
 * Supports both R2_ENDPOINT (full URL) and R2_ACCOUNT_ID (constructs URL)
 */
const r2Endpoint = process.env.R2_ENDPOINT ||
  (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      }
    : undefined,
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'revelia-images';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-xxx.r2.dev`;

/**
 * Upload result interface
 */
export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Upload image buffer to R2
 * @param buffer - Image buffer
 * @param userId - User ID
 * @param type - Image type (face, palm-dominant, palm-non-dominant, partner)
 * @returns Upload result with URL and key
 */
export async function uploadImage(
  buffer: Buffer,
  userId: string,
  type: 'face' | 'palm-dominant' | 'palm-non-dominant' | 'partner'
): Promise<UploadResult> {
  const timestamp = Date.now();
  const key = type === 'partner' 
    ? `${userId}/partners/${timestamp}.jpg`
    : `${userId}/${type}/${timestamp}.jpg`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000', // 1 year
    })
  );

  const url = `${PUBLIC_URL}/${key}`;

  return { url, key };
}

/**
 * Delete image from R2
 * @param key - Image key
 */
export async function deleteImage(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Generate signed URL for private access (if needed later)
 * @param key - Image key
 * @param expiresIn - Expiration time in seconds (default: 3600)
 * @returns Signed URL
 */
export async function getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getS3SignedUrl(r2Client, command, { expiresIn });
}

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
  return !!(
    (process.env.R2_ACCOUNT_ID || process.env.R2_ENDPOINT) &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}
