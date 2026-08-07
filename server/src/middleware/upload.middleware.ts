import multer from 'multer';

/**
 * File filter - only allow images
 */
const imageFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

/**
 * Configure multer for memory storage (we'll process and upload to R2)
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: imageFilter,
});
