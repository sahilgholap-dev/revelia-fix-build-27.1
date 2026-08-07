// Shared TypeScript types for Revelia
// Copied from packages/shared/types.ts for Railway deployment compatibility
// This makes the server self-contained within /server directory

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================================================
// User Types
// ============================================================================

export type AuthProvider = 'email' | 'apple' | 'google';
export type SubscriptionTier = 'free' | 'premium' | 'premium_plus';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  revenueCatId?: string;
  expiresAt?: string;
  productId?: string;
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt: string | null;
  productId: string | null;
  willRenew: boolean;
  managementUrl: string | null;
}

export interface SubscriptionUpdate {
  tier: SubscriptionTier;
  revenueCatId: string;
  expiresAt: string | null;
  productId: string | null;
}

export interface NotificationPreferences {
  notifications: boolean;
  dailyInsightTime: string;  // "09:00" in HH:mm format
  timezone: string;          // "America/New_York"
  oneSignalPlayerId?: string;
  platform?: 'ios' | 'android';
}

export interface User {
  _id: string;
  email: string;
  name?: string;
  authProvider: AuthProvider;
  
  // OAuth IDs (for Apple/Google users)
  appleId?: string;
  googleId?: string;
  
  // Subscription
  subscription: SubscriptionInfo;
  
  // Preferences
  preferences: NotificationPreferences;
  
  // Engagement
  engagement?: {
    currentStreak: number;
    longestStreak: number;
    lastCheckIn: string;
    totalCheckIns: number;
  };
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Birth Data Types
// ============================================================================

export interface BirthLocation {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface BirthData {
  date: string;                  // ISO date string "1990-05-15"
  time?: string;                 // Optional "HH:mm" format "14:30"
  location?: BirthLocation;
}

export interface BirthDataInput extends BirthData {
  handedness: 'right' | 'left';
}

// ============================================================================
// User Profile Types
// ============================================================================

export type Handedness = 'right' | 'left';

export interface UserProfileImage {
  url: string;
  uploadedAt: string;
}

export interface UserProfileImages {
  face?: UserProfileImage;
  palmDominant?: UserProfileImage;
  palmNonDominant?: UserProfileImage;
}

export interface UserProfile {
  _id: string;
  userId: string;
  name: string;
  
  // Birth data
  birthData: BirthData;
  
  // Calculated astrology
  sunSign: string;               // "Aries", "Taurus", etc.
  
  // Calculated numerology
  lifePathNumber: number;        // 1-9, 11, 22, 33
  personalYear: number;          // Based on birth date + current year
  personalMonth: number;         // Based on personal year + current month
  
  // Palm reading
  handedness: Handedness;
  
  // Images
  images: UserProfileImages;
  
  // Cached readings (populated later)
  faceReading?: object;
  palmReading?: object;
  combinedProfile?: object;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Image Upload Types
// ============================================================================

export type ImageType = 'face' | 'palm-dominant' | 'palm-non-dominant';

export interface ImageUpload {
  url: string;
  type: ImageType;
  uploadedAt: string;
}

export interface UploadResponse {
  url: string;
  type: ImageType;
  uploadedAt: string;
}

// ============================================================================
// Reading Types
// ============================================================================

export type ReadingType = 
  | 'face' 
  | 'palm-dominant' 
  | 'palm-non-dominant' 
  | 'combined'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'compatibility';

export type ReadingTier = 'free' | 'premium' | 'premium_plus';

// Face Reading Types
export interface FaceReadingCategory {
  score: number;
  title: string;
  description: string;
}

export interface FaceReadingOutput {
  archetype: {
    name: string;        // "The Visionary", "The Nurturer", etc.
    tagline: string;     // One-line description
  };
  categories: {
    intellect: FaceReadingCategory;
    emotional?: FaceReadingCategory;      // Premium only
    communication?: FaceReadingCategory;  // Premium only
    determination: FaceReadingCategory;
    perception?: FaceReadingCategory;     // Premium only
    creativity?: FaceReadingCategory;     // Premium only
  };
  strengths: string[];           // 3-5 key strengths
  growthOpportunity?: string;    // Premium only
  affirmation?: string;          // Premium only
  shareableQuote: string;        // Always included
}

// Palm Reading Types
export interface PalmLine {
  strength: 'strong' | 'moderate' | 'faint';
  interpretation: string;
}

export interface PalmMount {
  prominence: 'high' | 'moderate' | 'low';
  meaning: string;
}

export interface PalmReadingOutput {
  palmType: {
    name: string;        // "Earth Hand", "Air Hand", "Fire Hand", "Water Hand"
    description: string;
  };
  lines: {
    heart: PalmLine;
    head: PalmLine;
    life?: PalmLine;     // Premium only
    fate?: PalmLine;     // Premium only
  };
  mounts?: {             // Premium only
    jupiter?: PalmMount;
    saturn?: PalmMount;
    apollo?: PalmMount;
    mercury?: PalmMount;
  };
  destiny: {
    lifeTheme: string;
    naturalTalents: string[];
    challenges?: string;  // Premium only
    advice?: string;      // Premium only
  };
  shareableQuote: string;
}

// Reading Response
export interface ReadingResponse<T> {
  reading: T;
  generatedAt: string;
  tier: ReadingTier;
  cached: boolean;
}

// Reading Record (for database)
export interface Reading {
  _id: string;
  userId: string;
  type: ReadingType;
  tier: ReadingTier;
  content: FaceReadingOutput | PalmReadingOutput | object;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Astrology Types
// ============================================================================

export type ZodiacSign = 
  | 'Aries' 
  | 'Taurus' 
  | 'Gemini' 
  | 'Cancer' 
  | 'Leo' 
  | 'Virgo' 
  | 'Libra' 
  | 'Scorpio' 
  | 'Sagittarius' 
  | 'Capricorn' 
  | 'Aquarius' 
  | 'Pisces';

export interface AstrologyProfile {
  sunSign: ZodiacSign;
  sunSignTraits: string[];
}

// ============================================================================
// Natal Chart Types (Swiss Ephemeris — Build 27 R1)
// ============================================================================
// Structured, arc-second-accurate chart computed server-side via `sweph`
// (Moshier mode). Replaces the old approximate client Keplerian engine and the
// LLM-approximated `birthChart` blob. See plans/build-27/R1-swiss-ephemeris.md.

export type CelestialBody =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'northNode';

export type AspectType =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition';

export type HouseSystem = 'placidus' | 'whole-sign' | 'equal';
export type EphemerisMode = 'moshier' | 'swiss';

export interface PlanetPosition {
  body: CelestialBody;
  sign: ZodiacSign;
  degree: number; // 0–29.9999, degree within the sign
  longitude: number; // 0–359.9999, absolute ecliptic longitude
  retrograde: boolean;
  house?: number | null; // 1–12 when houses computed; null/omitted otherwise
}

export interface HouseCusp {
  house: number; // 1–12
  sign: ZodiacSign;
  degree: number; // within-sign degree of the cusp
  longitude: number; // absolute ecliptic longitude of the cusp
}

export interface ChartAngle {
  sign: ZodiacSign;
  degree: number;
  longitude: number;
}

export interface Aspect {
  body1: CelestialBody;
  body2: CelestialBody;
  type: AspectType;
  orb: number; // degrees from exact
}

export interface NatalChart {
  sun: ZodiacSign;
  moon: ZodiacSign;
  rising: ZodiacSign | null; // null when birth time unknown/assumed
  planets: PlanetPosition[];
  houses: HouseCusp[]; // empty when houses not computed (no time/coords)
  aspects: Aspect[];
  angles: {
    asc: ChartAngle;
    mc: ChartAngle;
    desc: ChartAngle;
    ic: ChartAngle;
  } | null; // null when houses not computed
  houseSystem: HouseSystem;
  ephemeris: EphemerisMode;
  timeKnown: boolean; // false when birth time assumed/missing
  computedAt: string; // ISO timestamp
}

// Transit (current sky vs natal). Powers real daily/weekly/monthly context and
// R6 continuity. Computed on demand, cached by date.
export interface TransitAspect {
  transiting: CelestialBody;
  natal: CelestialBody;
  type: AspectType;
  orb: number;
}

export interface TransitSet {
  date: string; // "YYYY-MM-DD" (UTC) the transits are computed for
  positions: PlanetPosition[]; // transiting bodies' positions
  aspectsToNatal: TransitAspect[];
}

// ============================================================================
// Continuity Types (Build 27 R6 — "what shifted since your last reading")
// ============================================================================
// R6 narrates a temporal delta: how the user's transit/numerology state moved
// between their last engagement and now. Two types:
//   - ContinuityBaseline: the ONE small persisted field on the profile — the
//     last-engagement timestamp the current delta is measured FROM, plus the
//     algorithm version tag. Dual-homed (mirrors NatalChart/NumerologyNumbers).
//   - ContinuityDelta: the COMPUTED, in-code delta. Server-only — never a DTO,
//     never persisted; produced by continuity.service and consumed by the
//     synthesis seam. STEP 1 lands the types only; nothing reads or writes them
//     yet (compute lands in STEP 2). See plans/build-27/R6-continuity.md §5.

export interface ContinuityBaseline {
  baselineAt: string; // ISO — last-engagement date the current delta is measured FROM.
  // Advanced to "now" whenever a MEANINGFUL continuity note is surfaced (STEP 4).
  continuityVersion: string; // CONTINUITY_VERSION tag (mirrors NUMEROLOGY_VERSION / RULES_VERSION)
}

export interface ContinuityDelta {
  meaningful: boolean; // the code-level honesty gate (§4 #6) — false ⇒ no continuity block
  gapDays: number; // whole days from baselineAt → now
  newAspects: string[]; // transit aspects FORMED since baseline (describeTransits lines)
  endedAspects: string[]; // transit aspects DISSOLVED since baseline
  moonSignChange?: { from: string; to: string }; // guarded, coarse (§11) — omit if low-confidence
  personalMonthChange?: { from: number; to: number };
  personalYearChange?: { from: number; to: number };
}

// ============================================================================
// Face Feature Types (Build 27 R2)
// ============================================================================
// Deterministic facial-feature layer that replaces freeform Claude-Vision face
// interpretation. Landmarks (68-pt dlib via @vladmandic/face-api) → normalized
// FaceFeatureVector → curated server-side rules table → stable FaceTrait[] +
// FaceArchetypeResult. The vector/traits/archetype are reproducible for a fixed
// (library + modelVersion + backend); the LLM only writes prose around them.
// See plans/build-27/R2-face-extraction.md (§5 is the authoritative field list).
// NOTE: scoped to the 68-point-measurable subset — no forehead/hairline, no
// facial-thirds upper third, no out-of-plane yaw/pitch. `roll` is retained as a
// quality signal; cheekboneWidth + cheekToJawTaper are locked measured ratios.

export type FaceShapeClass =
  | 'oval'
  | 'round'
  | 'square'
  | 'heart'
  | 'oblong'
  | 'diamond'
  | 'triangle';

// Small closed categorical enums — fixed-threshold bins of the ratios below.
export type FeatureSize = 'small' | 'medium' | 'large';
export type FeatureLength = 'short' | 'medium' | 'long';
export type EyeSpacing = 'close' | 'average' | 'wide';
export type EyeOpenness = 'narrow' | 'average' | 'wide';
export type BrowArch = 'flat' | 'soft' | 'arched';
export type LipFullness = 'thin' | 'medium' | 'full';
export type CheekboneProminence = 'low' | 'medium' | 'high';
export type ChinShape = 'pointed' | 'rounded' | 'square';

// Detector backend — part of the reproducibility tuple. CPU and WASM produce
// different coords, so a change here means re-detect, not just re-map.
export type FaceDetectorBackend = 'wasm' | 'cpu';

export interface FaceFeatureVector {
  // From the jaw/cheek outline (0–16) + lower-face proportions (chin→brow; NOT
  // chin→hairline, which 68 pts can't see).
  faceShape: FaceShapeClass;
  // Normalized ratios (not raw pixel coords) so the same face at different
  // resolutions yields the same vector.
  ratios: {
    interocular: number; // inner-eye-corner spacing / face width (eye spacing)
    eyeSize: number; // eye width / face width
    eyeAspect: number; // eye height / eye width (openness)
    browHeight: number; // brow→eye-top gap / lower-face height
    browArch: number; // brow curvature
    noseLengthWidth: number; // nose length (27→33) / alar width (31–35)
    noseWidth: number; // alar width / face width
    lipFullness: number; // lip height / lip width
    mouthWidth: number; // mouth width / face width
    cheekboneWidth: number; // zygomatic (widest) width / face width — LOCKED
    jawWidth: number; // gonial width / face width
    cheekToJawTaper: number; // cheekbone width / jaw width (face taper) — LOCKED
    chinProportion: number; // chin height / chin width
    // brow→subnasale, subnasale→chin (UPPER third omitted — unmeasurable from 68 pts)
    lowerFacialThirds: [number, number];
    facialFifths: number[]; // horizontal eye-width-based fifths
  };
  // Fixed-threshold bins of the ratios above (no forehead bin).
  categoricals: {
    eyeSize: FeatureSize;
    eyeSpacing: EyeSpacing;
    eyeOpenness: EyeOpenness;
    browArch: BrowArch;
    noseWidth: FeatureSize;
    noseLength: FeatureLength;
    lipFullness: LipFullness;
    mouthWidth: FeatureSize;
    cheekboneProminence: CheekboneProminence;
    jawWidth: FeatureSize;
    chinShape: ChinShape;
  };
  quality: {
    landmarksFound: number;
    detectorScore: number;
    // In-plane rotation from the eye-corner line. yaw/pitch omitted (not 68-pt
    // measurable — the Claude validation pass covers angle rejection).
    roll: number;
  };
  // The vector is reproducible only for a *fixed* (library + modelVersion +
  // backend) tuple. `backend` is REQUIRED — see FaceDetectorBackend note.
  engine: {
    library: string; // e.g. '@vladmandic/face-api@1.7.15'
    modelVersion: string; // landmark model identifier
    backend: FaceDetectorBackend;
  };
  // Optional raw 68-point array; persist it so a rules/binning change re-maps
  // without re-detecting (the §6 extract-once invariant).
  landmarks?: number[][];
  rulesInputVersion: string;
  computedAt: string; // ISO timestamp
}

export interface FaceTrait {
  trait: string;
  score: number; // 0–100, rules-derived (replaces the model's invented 60–95)
  band: 'low' | 'moderate' | 'high';
  // Rules-table phrasing (short, deterministic). The LLM expands prose; it does
  // not author the trait.
  description?: string;
  sourceFeatures: string[];
}

export interface FaceArchetypeResult {
  // Derived from the trait profile by the rules table, NOT chosen by the model.
  name: string;
  tagline: string;
  sourceTraits: string[];
}

// ============================================================================
// Palm / Hand Feature Types (Build 27 R3)
// ============================================================================
// Deterministic hand-geometry layer that replaces freeform Claude-Vision palm
// interpretation. 21 hand landmarks (@tensorflow-models/hand-pose-detection,
// tfjs runtime + WASM backend, server-side at upload) → normalized
// HandFeatureVector → curated server-side chiromancy rules table → stable
// PalmTrait[] + PalmProfileResult. The vector/traits/profile are reproducible
// for a fixed (library + modelVersion + backend); the LLM only writes prose
// around them. Extracted PER HAND (free = dominant only, premium = both).
// See plans/build-27/R3-palm-extraction.md (§5 is the authoritative field list).
//
// GEOMETRY-ONLY V1 (Phase-0 spike verdict, 2026-07-01): palm LINES (heart/head/
// life/fate) and MOUNTS are NOT measured — classical line CV failed both
// reproducibility and discrimination (the cheekbone trap, doubled). Lines stay
// LLM-described flavor, so there is deliberately NO `lines` block on the
// measured vector. thumbAngle/fingerSpread are DEMOTED to advisory raw ratios
// (pose-dependent, not intrinsic) — no stable categorical is derived from them.
// The intrinsic, discriminating core is palmShape × fingerLength → palmType.

// The closed set the UI/prompt already use as "Earth/Air/Fire/Water Hand".
// Earth = square palm + short fingers, Air = square + long, Water =
// rectangular + long, Fire = rectangular + short (the fixed 2×2 chiromancy map).
export type PalmTypeClass = 'earth' | 'air' | 'water' | 'fire';

// Small closed categorical enums — fixed-threshold bins of the ratios below.
export type PalmShape = 'square' | 'rectangular';
export type FingerLength = 'short' | 'long';

// Detector backend — part of the reproducibility tuple. CPU and WASM produce
// different coords, so a change here means re-detect, not just re-map.
export type PalmDetectorBackend = 'wasm' | 'cpu';

export interface HandFeatureVector {
  hand: 'dominant' | 'non-dominant';
  // Derived from palmShape × fingerLength via the fixed 2×2 chiromancy mapping.
  palmType: PalmTypeClass;
  // Normalized, scale/in-plane-rotation-robust geometry (not raw pixel coords)
  // so the same hand at different resolutions yields the same vector.
  ratios: {
    palmShape: number; // palm width / palm length (square vs rectangular)
    fingerLength: number; // mean finger length / palm length (short vs long)
    indexRatio: number; // index finger length / palm length
    middleRatio: number; // middle finger length / palm length
    ringRatio: number; // ring finger length / palm length
    pinkyRatio: number; // pinky finger length / palm length
    digitRatio2D4D: number; // index length / ring length (the classic 2D:4D)
    // ADVISORY/raw only — pose-dependent (spike: 164% / 35% spread reflect
    // capture pose, not intrinsic geometry). NOT binned to a stable categorical;
    // present only when useful.
    thumbAngle?: number; // thumb-to-index opening angle (flexibility proxy)
    fingerSpread?: number; // mean inter-fingertip spacing / palm width
  };
  // Fixed-threshold bins of the INTRINSIC ratios only. thumbAngle/fingerSpread
  // are demoted (pose-dependent) → no categorical is derived from them.
  categoricals: {
    palmShape: PalmShape;
    fingerLength: FingerLength;
  };
  quality: {
    landmarksFound: number;
    detectorScore: number;
    // In-plane rotation as a quality signal (R2 parallel); out-of-plane pose
    // omitted — the Claude validation pass covers bad angles.
    roll?: number;
  };
  // The vector is reproducible only for a *fixed* (library + modelVersion +
  // backend) tuple. `backend` is REQUIRED — a change means re-detect, not re-map.
  engine: {
    library: string; // e.g. '@tensorflow-models/hand-pose-detection@2.0.1'
    modelVersion: string; // e.g. 'mediapipe-hands/handpose_3d-full'
    backend: PalmDetectorBackend;
  };
  // Optional raw 21-point array; persist it so a rules/binning change re-maps
  // without re-detecting (the §6 extract-once invariant).
  landmarks?: number[][];
  rulesInputVersion?: string;
  computedAt: string; // ISO timestamp (matches NatalChart/FaceFeatureVector)
}

export interface PalmTrait {
  trait: string;
  score: number; // 0–100, rules-derived (replaces the model's invented 40–95)
  band: 'low' | 'moderate' | 'high';
  // Rules-table phrasing (short, deterministic). The LLM expands prose; it does
  // not author the trait.
  description?: string;
  sourceFeatures: string[];
}

export interface PalmProfileResult {
  // Derived from the dominant-hand trait profile by the rules table, NOT the
  // model. If `energyType` is kept as a closed set, its mapping must be TOTAL.
  palmType: PalmTypeClass;
  lifeTheme: string;
  naturalTalents: string[];
  sourceTraits: string[];
  energyType?: string;
}

// ============================================================================
// Numerology Types
// ============================================================================

export interface NumerologyProfile {
  lifePathNumber: number;
  lifePathMeaning: string;
  personalYear: number;
  personalYearMeaning: string;
  personalMonth: number;
  personalMonthMeaning: string;
}

// Build 27 R4 — canonical STORED numerology sub-doc on UserProfile (one source
// of truth for server consumers; the legacy flat lifePathNumber/personalYear/
// personalMonth stay maintained as mobile back-compat mirrors). Distinct from
// NumerologyProfile above, which is the unchanged GET /profile/numerology
// RESPONSE shape (numbers + meaning strings). Personal Year/Month are
// deliberately NOT stored here — they are time-varying and computed fresh at
// read time. See plans/build-27/R4-numerology-consolidation.md §5 — that field
// list is authoritative.

// Provenance of the name the name-based trio was computed from:
// 'name_destiny' (full birth name declared on the name-destiny screen) beats
// 'profile_name' (freeform display name) and is never downgraded.
export type NumerologyNameSource = 'name_destiny' | 'profile_name';

export interface NumerologyNumbers {
  // Date-based — stable for life, from birthData.date.
  lifePathNumber: number; // 1-9, 11, 22, 33

  // Name-based — from the canonical name (provenance below); absent until a
  // name source exists. The trio + nameUsed + nameSource are present-together
  // or absent-together by convention (not schema-enforced).
  expressionNumber?: number; // all letters
  soulUrgeNumber?: number; // vowels
  personalityNumber?: number; // consonants
  nameUsed?: string; // the exact string the numbers were computed from
  nameSource?: NumerologyNameSource;

  numerologyVersion: string; // NUMEROLOGY_VERSION at compute time
  computedAt: string; // ISO timestamp (matches NatalChart/FaceFeatureVector)
}

export interface CalculatedProfile {
  sunSign: ZodiacSign;
  sunSignTraits: string[];
  lifePathNumber: number;
  lifePathMeaning: string;
  personalYear: number;
  personalYearMeaning: string;
  personalMonth: number;
  personalMonthMeaning: string;
}

// ============================================================================
// Reading History Response
// ============================================================================

export interface ReadingHistoryResponse {
  readings: Array<{
    _id: string;
    userId: string;
    type: ReadingType;
    tier: ReadingTier;
    content: FaceReadingOutput | PalmReadingOutput;
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

// ============================================================================
// Legacy Reading Types (for future compatibility features)
// ============================================================================

export interface ReadingCategory {
  title: string;
  description: string;
  score?: number; // 0-100
  traits?: string[];
  insights?: string[];
}

// ============================================================================
// Compatibility Types
// ============================================================================

export interface CompatibilityCategory {
  score: number;
  title: string;
  description: string;
}

export interface CompatibilityOutput {
  overallScore: number;          // 0-100
  headline: string;              // "A Dynamic Power Duo"
  summary: string;               // 2-3 sentence overview
  
  categoryScores: {
    emotional: CompatibilityCategory;
    intellectual?: CompatibilityCategory;      // Premium only
    communication: CompatibilityCategory;
    values?: CompatibilityCategory;            // Premium only
    passion?: CompatibilityCategory;           // Premium only
  };
  
  strengths: string[];           // What works well together
  challenges?: string[];         // Premium only - positively framed
  advice?: string;               // Premium only - relationship guidance
  
  cosmicConnection?: {           // Premium only
    sunSignCompatibility: string;
    numerologyAlignment: string;
    archetypeSynergy: string;
  };
  
  affirmation?: string;          // Premium only
  shareableQuote: string;        // Always included
}

export type RelationshipType = 'love' | 'business' | 'sibling' | 'parent_child' | 'friend';

export interface CompatibilityReading {
  _id: string;
  userId: string;
  partnerName: string;
  partnerImageUrl: string;
  partnerBirthData?: {
    date: string;
    sunSign?: string;
    lifePathNumber?: number;
  };
  partnerBirthTime?: string;
  partnerBirthPlace?: string;
  relationshipType: RelationshipType;
  relationshipSubType?: string;
  reading: CompatibilityOutput;
  tier: ReadingTier;
  createdAt: string;
  updatedAt: string;
}

export interface UserCompatibilityProfile {
  name: string;
  sunSign: string;
  lifePathNumber: number;
  faceArchetype: string;
  faceArchetypeTagline: string;
  strengths: string[];
  communicationStyle: string;
  emotionalNature: string;
  palmType: string;
  // Build 27 R5 §9 step 2 — optional R1 (astrology) + R4 (numerology name trio)
  // + R2/R3 (trait bands) signals for the app user (user1) side, so the
  // compatibility prompt can weave the same four feature sets the other
  // synthesis surfaces do. All OPTIONAL + guarded — a sunSign-only user (and the
  // partner path, which never sets these) still builds. These make
  // UserCompatibilityProfile structurally satisfy FeatureContextInput.
  moonSign?: string;
  risingSign?: string | null;
  activeAspects?: string[];
  keyTransits?: string[];
  faceTraits?: string[];
  palmTraits?: string[];
  expressionNumber?: number;
  soulUrgeNumber?: number;
  personalityNumber?: number;
}

export interface PartnerCompatibilityProfile {
  name: string;
  imageUrl: string;
  sunSign?: string;
  lifePathNumber?: number;
  birthData?: {
    date: string;
  };
  birthTime?: string;
  birthPlace?: string;
}

// ============================================================================
// Notification & Engagement Types
// ============================================================================

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, string>;   // Deep link data
  schedule?: string;               // ISO date string for scheduled delivery
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string;
  totalCheckIns: number;
}

export interface EngagementCheckIn {
  streak: number;
  alreadyCheckedIn: boolean;
  isNewRecord: boolean;
}

// ============================================================================
// Content Types (Daily Insights, etc.)
// ============================================================================

// Daily Insight
/**
 * Build 27 R6 Option C — "what's shifted since your last reading" card payload.
 * An ADDITIVE, display-only projection of the already-computed ContinuityDelta
 * (server continuity.service). Present only when a meaningful shift occurred;
 * absent otherwise (the card is hidden). No generation-logic change and
 * CONTINUITY_VERSION is unchanged — this only surfaces what was already computed.
 */
export interface DailyContinuity {
  gapDays: number;         // whole days since the last-engagement baseline
  highlights: string[];    // short, non-technical shift labels (already honesty-gated)
}

export interface DailyInsightOutput {
  date: string;                // "2026-02-18"
  overallEnergy: {
    score: number;             // 1-10
    headline: string;          // "A day of creative breakthroughs"
  };
  career: {
    summary: string;           // One-line summary
    details: string[];         // 3 bullet points
    avoid: string;             // What to avoid
  };
  love: {
    summary: string;
    details: string[];
    tip: string;               // Actionable tip
  };
  friendship: {
    summary: string;
    details: string[];
  };
  lucky: {
    number: number;
    color: string;             // "Emerald Green"
    timeWindow: string;        // "3:00 PM - 5:00 PM"
  };
  crystals: Array<{ name: string; reason: string }>;  // 3 crystals
  affirmation: string;
  action: {
    doToday: string;
    avoidToday: string;
  };
  shareableQuote: string;
  focusArea: 'Career' | 'Love' | 'Health' | 'Growth' | 'Creativity';
  // Legacy fields for backward compatibility with cached data
  headline?: string;
  insight?: string;
  luckyElement?: {
    type: 'number' | 'color' | 'time';
    value: string;
  };
  // Build 27 R6 Option C — additive "what's shifted" card (mirrors the woven
  // prose; present only on a meaningful shift). `continuityHook` = the short
  // finished sentence; `continuity` = the structured card payload.
  continuity?: DailyContinuity;
  continuityHook?: string;
}

export interface DailyTeaserOutput {
  headline: string;
  teaser: string;            // First 2 sentences
  unlockPrompt: string;      // "Unlock full daily insights with Premium Plus"
  // Build 27 R6 Option C — additive "what's shifted" fields (mirror the hook
  // already prepended to `teaser`; present only on a meaningful shift).
  continuity?: DailyContinuity;
  continuityHook?: string;
}

// Weekly Forecast
export interface WeeklyDayForecast {
  day: string;               // "Monday", "Tuesday", etc.
  energy: 'high' | 'moderate' | 'reflective';
  focus: string;             // Brief guidance
}

export interface WeeklyForecastOutput {
  weekOf: string;            // "January 27 - February 2, 2026"
  theme: string;             // "Week of Breakthrough"
  overview: string;          // 2-3 paragraphs
  days: WeeklyDayForecast[];
  bestDays: {
    forLove: string;
    forCareer: string;
    forCreativity: string;
  };
  challenges: string;
  advice: string;
  affirmation: string;
  shareableQuote: string;
}

// Monthly Reading
export interface MonthlyKeyDate {
  date: string;
  significance: string;
  advice: string;
}

export interface MonthlyLifeArea {
  forecast: string;
  bestDays: string[];
}

export interface MonthlyReadingOutput {
  month: string;             // "February 2026"
  theme: string;             // "Month of Transformation"
  overview: string;          // 1 para (free) or 3-4 paras (premium)
  numerology?: {             // Premium only
    personalMonth: number;
    meaning: string;
    guidance: string;
  };
  astrology?: {              // Premium only
    sunSignForecast: string;
    keyTransits: string[];
    retrogradeWarnings?: string[];
  };
  keyDates: MonthlyKeyDate[]; // Free: 3, Premium: 8-12
  areas?: {                   // Premium only
    love: MonthlyLifeArea;
    career: MonthlyLifeArea;
    money: MonthlyLifeArea;
    health: MonthlyLifeArea;
  };
  profileIntegration?: string; // Premium only
  challenges?: string;          // Premium only
  opportunities?: string;       // Premium only
  affirmation: string;
  shareableQuote: string;
}

// User Insight Profile (for prompt context)
export interface UserInsightProfile {
  name: string;
  sunSign: string;
  lifePathNumber: number;
  personalYear: number;
  personalMonth: number;
  personalYearMeaning: string;
  faceArchetype: string;
  faceArchetypeTagline: string;
  strengths: string[];
  growthOpportunity: string;
  palmType: string;
  palmLifeTheme: string;
  naturalTalents: string[];
  dominantTraits: string[];
  // Build 27 R1 — real Swiss Ephemeris chart data. Optional so existing prompt
  // builders keep compiling; populated whenever the user has a natalChart.
  // NOTE: the reading PROMPT TEXT is intentionally NOT rewritten for these yet
  // — that lands with R5 (Fable 5 synthesis). These fields make the data
  // available; R5 wires it into the prompt copy.
  moonSign?: string;
  risingSign?: string | null;
  keyTransits?: string[]; // human-readable active-transit summary lines
  activeAspects?: string[]; // human-readable major natal-aspect summary lines
  // Build 27 R2 — compact stable face-trait set (e.g. top scored traits) from
  // the deterministic trait layer, exposed for R5's synthesis engine. DATA only:
  // the synthesis-prompt COPY rewrite is deferred to R5.
  faceTraits?: string[];
  // Build 27 R3 — compact stable palm-trait set from the deterministic
  // dominant-hand trait layer, exposed for R5's synthesis engine. DATA only:
  // the synthesis-prompt COPY rewrite is deferred to R5 (populated in a later step).
  palmTraits?: string[];
  // Build 27 R4 — name-based numerology trio from the canonical
  // profile.numerology sub-doc, exposed for R5's synthesis engine. DATA only:
  // the synthesis-prompt COPY rewrite is deferred to R5 (populated in a later step).
  expressionNumber?: number;
  soulUrgeNumber?: number;
  personalityNumber?: number;
}

// Insight Cache (for database)
export interface InsightCache {
  _id: string;
  userId: string;
  type: 'daily' | 'weekly' | 'monthly';
  content: DailyInsightOutput | WeeklyForecastOutput | MonthlyReadingOutput;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name?: string;
  email: string;
  password: string;
}

export interface AppleAuthRequest {
  identityToken: string;
  user?: {
    name?: {
      firstName?: string;
      lastName?: string;
    };
    email?: string;
  };
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RefreshTokenRequest {
  refreshToken?: string;
}

// ── Build 27 R9 §14 step 3a — Report (Personalized Cosmic Report) DTO ──
// Mobile-read subset of the server `Report` model (an async-generated 18–26pp
// PDF reading; the Report doc IS the async job record). Dual-homed identically
// in `packages/shared/types.ts` and `server/src/types/shared.ts` (hand-copied,
// like CompatibilityReading). Server-only internals (pdfKey, usage,
// costEstimate, modelUsed, raw otherSubject inputs) are NEVER in this DTO.

export type ReportSubject = 'self' | 'other';
export type ReportSubjectType = 'adult' | 'child';
export type ReportStatus = 'queued' | 'generating' | 'ready' | 'failed';

export interface ReportHighlights {
  headline?: string;
  summary?: string;
  keyPoints?: string[];
}

export interface Report {
  _id: string;
  subject: ReportSubject;
  subjectType: ReportSubjectType;
  status: ReportStatus;
  failureReason?: string;
  // Presigned download link the results page opens. MINTED FRESH at
  // GET-response time via getSignedUrl(pdfKey, ttl) (3b/step-8b) — NEVER served
  // from a persisted stale value (presigned links expire, so a link stored at
  // generation time is dead by the time an older report is opened).
  secureLink?: string;
  // A `ready` report whose stored PDF is gone (past the 60-day R2 lifecycle):
  // no fresh secureLink can be minted. The step-9 FREE rebuild path can rebuild
  // it from the stored interpretation. Absent/false = live.
  expired?: boolean;
  // Step 9 DO 8 — a FREE rebuild (expired PDF → re-render from the stored
  // interpretation, no re-Fable, no credit) is in progress. The mobile hub polls
  // this for the "rebuilding" state; the report stays `status:'ready'` throughout.
  regenerating?: boolean;
  // Step 9 DO 4 — QA-computed page count of the delivered PDF (Ready-screen meta).
  pageCount?: number;
  highlights?: ReportHighlights;
  createdAt: string;       // enqueue time (also the credit bucket, server-side)
  generatedAt?: string;    // completion stamp — display/analytics only
}
