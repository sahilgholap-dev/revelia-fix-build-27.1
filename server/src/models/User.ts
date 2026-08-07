import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { AuthProvider, SubscriptionTier } from '../types/shared';

/**
 * User document interface
 */
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash?: string;
  name?: string;
  authProvider: AuthProvider;
  
  // OAuth IDs
  appleId?: string;
  googleId?: string;
  
  // Subscription
  subscription: {
    tier: SubscriptionTier;
    revenueCatId?: string;
    expiresAt?: Date;
    productId?: string;
    willRenew?: boolean;
    lastSyncedAt?: Date;
    lastEventType?: string;
    lastEventAt?: Date;
    // Complimentary (marketing/influencer) grant that bypasses RevenueCat.
    // `tier` above stays billing truth; this layers on top via
    // getEffectiveTier() with lazy auto-expiry (no cron). See
    // utils/subscriptionTier.ts.
    comp?: {
      tier?: SubscriptionTier;
      grantedAt?: Date;
      expiresAt?: Date;
      reason?: string;
      active?: boolean;
    };
  };
  
  // Preferences
  preferences: {
    notifications: boolean;
    dailyInsightTime: string;
    timezone: string;
    oneSignalPlayerId?: string;
    platform?: 'ios' | 'android';
  };
  
  // Email verification
  emailVerified: boolean;

  // Password reset
  resetCode?: string;
  resetCodeExpiry?: Date;

  // Engagement tracking
  engagement: {
    currentStreak: number;
    longestStreak: number;
    lastCheckIn?: Date;
    totalCheckIns: number;
  };

  // Audit trail of name changes via the user-update-name endpoint.
  // Used both for rate-limit calculation (filter to last 30 days) and for
  // support / debugging (full recent history). Capped at 20 entries —
  // oldest dropped FIFO when a new entry pushes the array over the cap.
  // NOTE: User.name is kept in sync with UserProfile.name via
  // user.service.updateName(). Do NOT mutate either field independently.
  nameUpdateHistory: Array<{
    updatedAt: Date;
    previousName: string;
    newName: string;
  }>;

  // Push scheduler tracking
  lastDailyPushSentAt?: Date | null;
  lastReengagementPushSentAt?: Date | null;
  lastSeenAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(password: string): Promise<boolean>;
}

/**
 * User model interface with static methods
 */
export interface IUserModel extends Model<IUser> {
  hashPassword(password: string): Promise<string>;
}

/**
 * User schema
 */
const userSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false, // Don't include in queries by default
    },
    // Source of truth for the user's display name. Kept in sync with
    // UserProfile.name via user.service.updateName().
    name: {
      type: String,
      trim: true,
    },
    nameUpdateHistory: {
      type: [
        {
          updatedAt: { type: Date, required: true },
          previousName: { type: String, default: '' },
          newName: { type: String, required: true },
          _id: false,
        },
      ],
      default: [],
    },
    authProvider: {
      type: String,
      enum: ['email', 'apple', 'google'],
      required: true,
      default: 'email',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    resetCode: {
      type: String,
      select: false,
    },
    resetCodeExpiry: {
      type: Date,
      select: false,
    },
    appleId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    subscription: {
      tier: {
        type: String,
        enum: ['free', 'premium', 'premium_plus'],
        default: 'free',
      },
      revenueCatId: {
        type: String,
        sparse: true,
        index: true,
      },
      expiresAt: Date,
      productId: String,
      willRenew: { type: Boolean, default: true },
      lastSyncedAt: Date,
      lastEventType: String,
      lastEventAt: Date,
      // Complimentary grant (influencer/marketing trials). Honored lazily by
      // getEffectiveTier() only while active && expiresAt > now; never written
      // by the RevenueCat webhook (which clears active on a real purchase).
      comp: {
        tier: {
          type: String,
          enum: ['free', 'premium', 'premium_plus'],
        },
        grantedAt: Date,
        expiresAt: Date,
        reason: String,
        active: { type: Boolean, default: false },
      },
    },
    preferences: {
      notifications: {
        type: Boolean,
        default: true,
      },
      dailyInsightTime: {
        type: String,
        default: '09:00',
      },
      timezone: {
        type: String,
        default: 'America/New_York',
      },
      oneSignalPlayerId: String,
      platform: {
        type: String,
        enum: ['ios', 'android'],
      },
    },
    engagement: {
      currentStreak: {
        type: Number,
        default: 0,
      },
      longestStreak: {
        type: Number,
        default: 0,
      },
      lastCheckIn: Date,
      totalCheckIns: {
        type: Number,
        default: 0,
      },
    },
    lastDailyPushSentAt: { type: Date, default: null },
    lastReengagementPushSentAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        // Remove sensitive fields from JSON output
        const { passwordHash, __v, ...rest } = ret;
        return rest;
      },
    },
  }
);

/**
 * Instance method: Compare password with hash
 */
userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(password, this.passwordHash);
};

/**
 * Static method: Hash password
 */
userSchema.statics.hashPassword = async function (
  password: string
): Promise<string> {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  return bcrypt.hash(password, rounds);
};

/**
 * User model
 */
export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
