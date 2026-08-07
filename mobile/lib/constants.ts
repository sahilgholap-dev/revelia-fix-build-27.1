export const APP_NAME = 'Revelia';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'AI-powered face and palm readings, astrology, and numerology';

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  PREMIUM_PLUS: 'premium_plus',
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

/**
 * 🔴 THE ONE SOURCE FOR A TIER'S USER-FACING NAME. EXTRACTED at the funnel phase's screen 6, and
 * the extraction is the point rather than the tidiness.
 *
 * These three strings were a LOCAL const inside `profile.tsx`'s component, so Home could not reach
 * them — and Home was therefore CONSTRUCTING its tier line by uppercasing the raw tier field, i.e.
 * rendering an internal enum value at the user. C-1's resolution is to render from this map.
 *
 * 🔴 THE ALTERNATIVE WAS A SECOND COPY, AND THIS PROGRAMME HAS PAID FIVE TIMES FOR THAT CHOICE:
 * duplication hides defects, the divergent copy is usually the broken one, and you cannot know
 * which without diffing them. A tier NAME is exactly the kind of string that gets changed on one
 * screen. The standing rule — grep for a shared symbol as a LOCAL DEFINITION before importing it —
 * is what surfaced this: the name existed, locally, in the file the copy was being read from.
 *
 * ⚠️ COPY-LOCKED (audit §6.3, PM-owned). Do not edit a value here, and do NOT case-fold one at a
 * call site: casing is a `textTransform` in the style, so `git diff` keeps showing the shipped
 * string. A `toUpperCase()` is an edit no copy review can see.
 * ⚠️ `profile.tsx` holds one further bare literal of the free tier's name in its upgrade panel; it
 * is a heading rather than a tier readout, so it is left alone and registered rather than
 * mechanically funnelled through this map.
 */
export const TIER_DISPLAY_NAME: Record<SubscriptionTier, string> = {
  free: 'Free Plan',
  premium: 'Premium',
  premium_plus: 'Premium Plus',
};

// Feature access by tier
export const FEATURE_ACCESS = {
  faceReading: {
    [SUBSCRIPTION_TIERS.FREE]: true,
    [SUBSCRIPTION_TIERS.PREMIUM]: true,
    [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: true,
  },
  palmReading: {
    [SUBSCRIPTION_TIERS.FREE]: false,
    [SUBSCRIPTION_TIERS.PREMIUM]: true,
    [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: true,
  },
  combinedReading: {
    [SUBSCRIPTION_TIERS.FREE]: false,
    [SUBSCRIPTION_TIERS.PREMIUM]: true,
    [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: true,
  },
  monthlyReading: {
    [SUBSCRIPTION_TIERS.FREE]: false,
    [SUBSCRIPTION_TIERS.PREMIUM]: true,
    [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: true,
  },
  compatibility: {
    [SUBSCRIPTION_TIERS.FREE]: false,
    [SUBSCRIPTION_TIERS.PREMIUM]: true,
    [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: true,
  },
  unlimitedReadings: {
    [SUBSCRIPTION_TIERS.FREE]: false,
    [SUBSCRIPTION_TIERS.PREMIUM]: true,
    [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: true,
  },
  dailyInsights: {
    [SUBSCRIPTION_TIERS.FREE]: false,
    [SUBSCRIPTION_TIERS.PREMIUM]: false,
    [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: true,
  },
  weeklyForecasts: {
    [SUBSCRIPTION_TIERS.FREE]: false,
    [SUBSCRIPTION_TIERS.PREMIUM]: false,
    [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: true,
  },
  advancedNumerology: {
    [SUBSCRIPTION_TIERS.FREE]: false,
    [SUBSCRIPTION_TIERS.PREMIUM]: false,
    [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: true,
  },
  nameDestiny: {
    [SUBSCRIPTION_TIERS.FREE]: false,
    [SUBSCRIPTION_TIERS.PREMIUM]: false,
    [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: true,
  },
  careerDestiny: {
    [SUBSCRIPTION_TIERS.FREE]: false,
    [SUBSCRIPTION_TIERS.PREMIUM]: false,
    [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: true,
  },
  /* 🔴 THE `adFree` ENTRY WAS DELETED HERE 2026-08-06, with the paywall row it backed. It had
     ZERO readers, and it was the only thing in this map that did not correspond to a real
     enforcement point — there is no ad SDK in this app, so it described a feature that does not
     exist rather than one that is merely unenforced. A tier map is read as a statement of what
     the product gates; a row in it with no gate and no subject is how a false marketing claim
     acquires a code citation. */
  // R9 §14 step 9 — Personalized Cosmic Report. A PREMIUM PLUS-only feature
  // (premium_plus gets 1/month; free AND premium are locked — Sid's directive
  // 2026-07-25). Gating is enforced SERVER-SIDE (the hub routes off GET /credit
  // `limit` + the POST 402); this entry mirrors the backend for any client-side
  // canAccess('cosmicReport') use.
  cosmicReport: {
    [SUBSCRIPTION_TIERS.FREE]: false,
    [SUBSCRIPTION_TIERS.PREMIUM]: false,
    [SUBSCRIPTION_TIERS.PREMIUM_PLUS]: true,
  },
} as const;

// Reading limits for free tier
export const FREE_TIER_LIMITS = {
  faceReadingsPerMonth: 3,
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  USER: {
    PROFILE: '/user/profile',
    UPDATE: '/user/update',
  },
  READINGS: {
    FACE: '/readings/face',
    PALM: '/readings/palm',
    COMBINED: '/readings/combined',
    LIST: '/readings',
    DETAIL: '/readings/:id',
  },
  ASTROLOGY: '/astrology',
  NUMEROLOGY: '/numerology',
  COMPATIBILITY: '/compatibility',
};

export default {
  APP_NAME,
  APP_VERSION,
  APP_DESCRIPTION,
  SUBSCRIPTION_TIERS,
  FEATURE_ACCESS,
  FREE_TIER_LIMITS,
  API_ENDPOINTS,
};
