import jwt from 'jsonwebtoken';
import axios from 'axios';
import jwksClient from 'jwks-rsa';
import { User, IUser } from '../models/User';
import { UserProfile } from '../models/UserProfile';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { getTestAccountTier } from '../config/testAccounts';

/**
 * JWT payload interface
 */
interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

/**
 * Apple token payload interface
 */
interface AppleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string; // Apple user ID
  email?: string;
  email_verified?: boolean;
}

/**
 * Google tokeninfo response interface
 */
interface GoogleTokenInfo {
  aud: string;
  sub: string; // Google user ID
  email: string;
  email_verified: string;
  exp: string;
}

/**
 * Auth service class
 */
class AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private appleJwksClient: jwksClient.JwksClient;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || '';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

    if (!this.jwtSecret || this.jwtSecret.length < 32) {
      logger.warn(
        'JWT_SECRET is not set or too short. Using default (INSECURE for production)'
      );
      this.jwtSecret = 'default-insecure-secret-change-in-production-min-32-chars';
    }

    // Initialize Apple JWKS client
    this.appleJwksClient = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
    });
  }

  /**
   * Sign up with email and password
   */
  async signup(
    name: string | undefined,
    email: string,
    password: string,
    emailVerified: boolean = false
  ): Promise<{ user: IUser; token: string }> {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(400, 'User with this email already exists');
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // Check if this is a test account
    const testTier = getTestAccountTier(email);

    // Create user
    const user = await User.create({
      email,
      name,
      passwordHash,
      authProvider: 'email',
      emailVerified,
      subscription: {
        tier: testTier || 'free',
        ...(testTier ? { expiresAt: new Date('2099-12-31'), isTestAccount: true } : {}),
      },
      preferences: {
        notifications: true,
        timezone: 'America/New_York',
      },
    });

    // Create associated empty UserProfile
    await UserProfile.create({
      userId: user._id,
      name: name || '',
      images: {},
    });

    // Generate token
    const token = this.generateToken(user._id.toString());

    logger.info(`User signed up: ${email}`);

    return { user, token };
  }

  /**
   * Login with email and password
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: IUser; token: string }> {
    // Find user with password hash
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Check if user signed up with email (not OAuth)
    if (user.authProvider !== 'email') {
      throw new AppError(
        401,
        `Please sign in with ${user.authProvider === 'apple' ? 'Apple' : 'Google'}`
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user._id.toString());

    logger.info(`User logged in: ${email}`);

    // Remove password hash from response
    user.passwordHash = undefined;

    return { user, token };
  }

  /**
   * Login with Apple
   *
   * Name capture: Apple returns fullName ONLY on first sign-in (privacy
   * feature). When mobile receives it, it flattens to a single string and
   * sends as `fullName`. Older clients still send the legacy nested
   * `userData.name.{firstName,lastName}` — we accept both, prefer fullName.
   *
   * NEW user creation: name is set if we have a non-empty value (>= 2
   * chars after trim). Otherwise name stays undefined and the birth-data
   * onboarding form captures it as a fallback. We NEVER default to "User".
   *
   * RETURNING user: name is NEVER overwritten on login, even if a fullName
   * is somehow provided. The user may have edited their name via
   * /api/account/name; clobbering it here would erase user-edited data.
   */
  async loginWithApple(
    identityToken: string,
    userData?: {
      name?: { firstName?: string; lastName?: string };
      email?: string;
    },
    fullName?: string | null
  ): Promise<{ user: IUser; token: string }> {
    try {
      // Verify Apple identity token
      const decodedToken = await this.verifyAppleToken(identityToken);

      const appleId = decodedToken.sub;
      const email = decodedToken.email || userData?.email;

      if (!email) {
        throw new AppError(400, 'Email is required for Apple Sign In');
      }

      // Check if user exists by Apple ID or email
      let user = await User.findOne({
        $or: [{ appleId }, { email }],
      });

      if (user) {
        // Update Apple ID if not set
        if (!user.appleId) {
          user.appleId = appleId;
          await user.save();
        }
        // Returning user: never touch user.name — protect any edits made
        // via /api/account/name. Apple shouldn't provide fullName here
        // anyway, but defensive coding ensures no clobbering.
      } else {
        // NEW user: prefer top-level fullName, then fall back to legacy
        // nested userData.name reconstruction. Reject anything <2 chars
        // post-trim — onboarding will capture name properly.
        const trimmedFullName = fullName?.trim();
        const reconstructed = userData?.name
          ? `${userData.name.firstName || ''} ${userData.name.lastName || ''}`.trim()
          : '';
        const candidate = trimmedFullName || reconstructed;
        const name = candidate && candidate.length >= 2 ? candidate : undefined;

        const appleTestTier = getTestAccountTier(email);
        user = await User.create({
          email,
          name,
          appleId,
          authProvider: 'apple',
          subscription: {
            tier: appleTestTier || 'free',
            ...(appleTestTier ? { expiresAt: new Date('2099-12-31'), isTestAccount: true } : {}),
          },
          preferences: {
            notifications: true,
            timezone: 'America/New_York',
          },
        });

        // Create associated empty UserProfile
        await UserProfile.create({
          userId: user._id,
          name: name || '',
          images: {},
        });

        logger.info(`New Apple user created: ${email}`, {
          hasName: !!name,
          source: trimmedFullName ? 'fullName' : reconstructed ? 'legacy' : 'none',
        });
      }

      // Generate token
      const token = this.generateToken(user._id.toString());

      logger.info(`User logged in with Apple: ${email}`);

      return { user, token };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Apple auth error', {
        name: error?.name,
        message: error?.message,
      });
      throw new AppError(401, 'Invalid Apple identity token');
    }
  }

  /**
   * Login with Google
   */
  async loginWithGoogle(
    idToken: string,
    name?: string
  ): Promise<{ user: IUser; token: string }> {
    try {
      // Verify Google ID token
      const tokenInfo = await this.verifyGoogleToken(idToken);

      const googleId = tokenInfo.sub;
      const email = tokenInfo.email;

      // Check if user exists by Google ID or email
      let user = await User.findOne({
        $or: [{ googleId }, { email }],
      });

      if (user) {
        // Update Google ID if not set
        if (!user.googleId) {
          user.googleId = googleId;
          await user.save();
        }
      } else {
        // Create new user — use caller-supplied name if non-empty (≥2 chars)
        const trimmedName = name?.trim();
        const resolvedName = trimmedName && trimmedName.length >= 2 ? trimmedName : undefined;
        const googleTestTier = getTestAccountTier(email);
        user = await User.create({
          email,
          name: resolvedName,
          googleId,
          authProvider: 'google',
          subscription: {
            tier: googleTestTier || 'free',
            ...(googleTestTier ? { expiresAt: new Date('2099-12-31'), isTestAccount: true } : {}),
          },
          preferences: {
            notifications: true,
            timezone: 'America/New_York',
          },
        });

        // Create associated empty UserProfile
        await UserProfile.create({
          userId: user._id,
          name: resolvedName || '',
          images: {},
        });

        logger.info(`New Google user created: ${email}`, { hasName: !!resolvedName });
      }

      // Generate token
      const token = this.generateToken(user._id.toString());

      logger.info(`User logged in with Google: ${email}`);

      return { user, token };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Google auth error:', error);
      throw new AppError(401, 'Invalid Google ID token');
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(userId: string): string {
    const payload = {
      userId,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      throw new AppError(401, 'Invalid or expired token');
    }
  }

  /**
   * Verify Apple identity token
   *
   * Bundle ID history: this project was originally bootstrapped under the
   * developer's GitHub-handle namespace `com.srcoderz99.revelia`. The iOS
   * production bundle was renamed to `com.revelia.app` for cleaner
   * branding, but the server-side audience fallback wasn't updated until
   * Build 17 — that mismatch was the root cause of all the "Invalid Apple
   * identity token" rejections from at least Build 14 onward, since Apple
   * signs each token with the exact bundle ID that requested it.
   *
   * `APPLE_CLIENT_ID` env var is the source of truth in production. The
   * fallback is only a safety net in case Railway env is unset.
   */
  private async verifyAppleToken(
    identityToken: string
  ): Promise<AppleTokenPayload> {
    const expectedAudience = process.env.APPLE_CLIENT_ID || 'com.revelia.app';

    return new Promise((resolve, reject) => {
      // Decode token header to get key ID
      const decodedHeader = jwt.decode(identityToken, { complete: true });
      if (!decodedHeader || typeof decodedHeader === 'string') {
        return reject(new Error('Invalid token format'));
      }

      const kid = decodedHeader.header.kid;
      if (!kid) {
        return reject(new Error('Missing key ID in token'));
      }

      // Get signing key from Apple
      this.appleJwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          return reject(err);
        }

        const signingKey = key?.getPublicKey();
        if (!signingKey) {
          return reject(new Error('Could not get signing key'));
        }

        try {
          const payload = jwt.verify(identityToken, signingKey, {
            algorithms: ['RS256'],
            issuer: 'https://appleid.apple.com',
            audience: expectedAudience,
          }) as AppleTokenPayload;
          resolve(payload);
        } catch (verifyError) {
          reject(verifyError);
        }
      });
    });
  }

  /**
   * Verify Google ID token
   */
  private async verifyGoogleToken(idToken: string): Promise<GoogleTokenInfo> {
    try {
      const response = await axios.get<GoogleTokenInfo>(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
      );

      const tokenInfo = response.data;

      // Verify audience (client ID)
      const expectedAudience = process.env.GOOGLE_OAUTH_WEB_CLIENT_ID;
      if (expectedAudience && tokenInfo.aud !== expectedAudience) {
        throw new Error('Invalid audience');
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      const exp = parseInt(tokenInfo.exp, 10);
      if (exp < now) {
        throw new Error('Token expired');
      }

      return tokenInfo;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error('Failed to verify Google token');
      }
      throw error;
    }
  }
}

export const authService = new AuthService();
