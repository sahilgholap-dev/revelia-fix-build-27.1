import sharp from 'sharp';

/**
 * Image processing options
 */
export interface ProcessImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Process and optimize image
 * @param buffer - Image buffer
 * @param options - Processing options
 * @returns Processed image buffer
 */
export async function processImage(
  buffer: Buffer,
  options: ProcessImageOptions = {}
): Promise<Buffer> {
  const { maxWidth = 2048, maxHeight = 2048, quality = 85 } = options;

  return await sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

/**
 * Get image metadata
 * @param buffer - Image buffer
 * @returns Image metadata
 */
export async function getImageMetadata(buffer: Buffer) {
  return await sharp(buffer).metadata();
}

/**
 * Validate image buffer
 * @param buffer - Image buffer
 * @returns True if valid image
 */
export async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await getImageMetadata(buffer);
    return !!metadata.format && ['jpeg', 'png', 'webp'].includes(metadata.format);
  } catch (error) {
    return false;
  }
}
