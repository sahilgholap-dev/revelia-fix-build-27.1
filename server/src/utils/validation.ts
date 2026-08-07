import { z } from 'zod';

/**
 * Signup validation schema
 */
export const signupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
});

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Apple auth validation schema
 *
 * Apple identity tokens are RS256 JWTs. The header alone is ~150 chars
 * before the body, and bodies typically run 400-700+ chars. Anything
 * shorter is suspect and we reject it before hitting JWKS verification.
 */
export const appleAuthSchema = z.object({
  identityToken: z
    .string()
    .min(100, 'Identity token appears malformed (too short)'),
  // Top-level fullName: mobile flattens credential.fullName to a single
  // string. Allow letters, spaces, hyphens, apostrophes, periods, and
  // common Latin diacritics (handles "O'Brien", "Anne-Marie", "José").
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters')
    .regex(
      /^[A-Za-zÀ-ɏ\s'\-.]+$/,
      'Full name contains invalid characters'
    )
    .optional()
    .nullable(),
  user: z
    .object({
      name: z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        })
        .optional(),
      email: z.string().email().optional(),
    })
    .optional(),
});

/**
 * Google auth validation schema
 */
export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
  name: z.string().optional(),
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Birth data validation schema
 *
 * lat/lng/timezone are accepted but not required from mobile — the server
 * will geocode the city/country text and overwrite them. They're nullable
 * to accommodate the legacy mobile-form behavior of sending lat:0/lng:0
 * placeholders for non-geocoded inputs.
 *
 * timeIsAssumed is intentionally NOT in the schema — it's a server-derived
 * flag (set by the noon-default flow). Mobile cannot self-assert it.
 */
export const birthDataSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format. Use HH:mm').optional(),
  birthLocation: z
    .object({
      city: z.string().min(1, 'City is required'),
      country: z.string().min(1, 'Country is required'),
      lat: z.number().min(-90).max(90).nullable().optional(),
      lng: z.number().min(-180).max(180).nullable().optional(),
      timezone: z.string().nullable().optional(),
    })
    .optional(),
  handedness: z.enum(['right', 'left'], {
    errorMap: () => ({ message: 'Handedness must be either "right" or "left"' }),
  }),
});

/**
 * Profile update validation schema
 */
export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  handedness: z.enum(['right', 'left']).optional(),
});

/**
 * Create profile validation schema
 *
 * Same lat/lng/timezone relaxation as birthDataSchema — server geocodes.
 */
export const createProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format. Use HH:mm').optional(),
  birthLocation: z
    .object({
      city: z.string().min(1, 'City is required'),
      country: z.string().min(1, 'Country is required'),
      lat: z.number().min(-90).max(90).nullable().optional(),
      lng: z.number().min(-180).max(180).nullable().optional(),
      timezone: z.string().nullable().optional(),
    })
    .optional(),
  handedness: z.enum(['right', 'left'], {
    errorMap: () => ({ message: 'Handedness must be either "right" or "left"' }),
  }),
});

/**
 * Change password validation schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'New password must be less than 100 characters'),
});
