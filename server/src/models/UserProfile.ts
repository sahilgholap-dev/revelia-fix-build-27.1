import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { getSunSign } from '../utils/zodiac';
import {
  getLifePathNumber,
  getPersonalYear,
  getPersonalMonth,
  NUMEROLOGY_VERSION,
} from '../utils/numerology';
import {
  NatalChart,
  FaceFeatureVector,
  FaceTrait,
  FaceArchetypeResult,
  HandFeatureVector,
  PalmTrait,
  PalmProfileResult,
  NumerologyNumbers,
  ContinuityBaseline,
} from '../types/shared';

/**
 * Birth location interface
 *
 * lat/lng/timezone are populated server-side by geocoder.service when the
 * user submits city/country text. Build 21+ noon-default flow uses the
 * timezone to anchor a 12:00 default when birth time is unknown.
 */
interface IBirthLocation {
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
}

/**
 * Birth data interface
 *
 * timeIsAssumed=true when the system defaulted a missing birth time to
 * noon at the place-of-birth timezone. Mobile renders moon/rising values
 * with a small (i) indicator in that case so users see provenance.
 */
interface IBirthData {
  date: Date;
  time?: string; // "HH:mm" format
  location?: IBirthLocation;
  timeIsAssumed?: boolean;
}

/**
 * Image data interface
 */
interface IImageData {
  url: string;
  uploadedAt: Date;
}

/**
 * User profile document interface
 */
export interface IUserProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;

  // Birth data
  birthData: IBirthData;

  // Calculated fields
  sunSign: string;
  lifePathNumber: number;
  personalYear: number;
  personalMonth: number;

  // Palm reading
  handedness: 'right' | 'left';

  // Images
  images: {
    face?: IImageData;
    palmDominant?: IImageData;
    palmNonDominant?: IImageData;
  };

  // Cached readings
  faceReading?: any;
  palmReading?: any;
  palmReadingNonDominant?: any;
  combinedProfile?: any;
  // DEPRECATED (Build 27 R1): legacy LLM-approximated chart blob. No longer
  // written or read — superseded by the structured `natalChart` below. Field
  // retained only so existing documents don't error on load; safe to drop in a
  // later migration once all docs have `natalChart`.
  birthChart?: any;
  // Build 27 R1: arc-second-accurate Swiss Ephemeris chart, computed on
  // birth-data save (and lazily at reading time as a fallback).
  natalChart?: NatalChart;

  // Build 27 R2: deterministic facial-feature layer (landmarks → normalized
  // vector → curated rules table → traits/archetype). `faceReading` (above)
  // stays as the narrative cache, now derived from these. The rules-table
  // version that produced faceTraits/faceArchetypeResult is tracked in
  // faceRulesVersion so a rules change can re-map without re-detecting landmarks.
  // See plans/build-27/R2-face-extraction.md §5.
  faceFeatures?: FaceFeatureVector;
  faceTraits?: FaceTrait[];
  faceArchetypeResult?: FaceArchetypeResult;
  faceRulesVersion?: string;

  // Build 27 R3: deterministic hand-geometry layer, PER HAND (21 landmarks →
  // normalized vector → curated chiromancy rules table → traits/palmType). The
  // `palmReading`/`palmReadingNonDominant` blobs (above) stay as the narrative
  // caches, now derived from these. GEOMETRY-ONLY V1 (spike verdict): palm lines
  // are NOT measured — they stay LLM-described flavor, so there's no `lines`
  // block on the vector. Free tier = dominant only; premium = both.
  // palmProfileResult is derived from the DOMINANT hand (the one insight reads).
  // palmRulesVersion tags the rules-table version so a rules change re-maps
  // without re-detecting landmarks. See plans/build-27/R3-palm-extraction.md §5.
  palmDominantFeatures?: HandFeatureVector;
  palmNonDominantFeatures?: HandFeatureVector;
  palmDominantTraits?: PalmTrait[];
  palmNonDominantTraits?: PalmTrait[];
  palmProfileResult?: PalmProfileResult;
  palmRulesVersion?: string;

  // Build 27 R4: canonical stored numerology (lifePath + name-based trio +
  // name provenance + version). The flat lifePathNumber/personalYear/
  // personalMonth above stay maintained as mobile back-compat mirrors.
  // Personal Year/Month are deliberately NOT stored here — time-varying,
  // computed fresh at read time. See plans/build-27/R4-numerology-consolidation.md §5.
  numerology?: NumerologyNumbers;

  // Build 27 R6: continuity baseline — the ONE persisted field for the
  // "what shifted since your last reading" temporal delta. `baselineAt` is the
  // last-engagement date the delta is measured FROM; `continuityVersion` is the
  // algorithm tag stamped at compute time (mirrors numerology.numerologyVersion).
  // STEP 1 lands the field only — nothing reads or writes it yet (the compute
  // hook + baseline advance land in STEP 2/4). See plans/build-27/R6-continuity.md §5.
  continuity?: ContinuityBaseline;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  calculateAstrology(): void;
  calculateNumerology(): void;
}

/**
 * User profile model interface
 */
export interface IUserProfileModel extends Model<IUserProfile> {}

/**
 * Natal chart sub-schemas (Build 27 R1)
 *
 * Structured replacement for the opaque `birthChart: Mixed` blob. `_id: false`
 * on every sub-schema keeps the stored document lean (no per-array-element
 * ObjectIds). The whole `natalChart` is written atomically by
 * astrology.service, so Mongoose change-tracking on a real sub-schema is
 * sufficient — no `markModified` needed (unlike the old Mixed field).
 */
const planetPositionSchema = new Schema(
  {
    body: { type: String, required: true },
    sign: { type: String, required: true },
    degree: { type: Number, required: true },
    longitude: { type: Number, required: true },
    retrograde: { type: Boolean, required: true },
    house: { type: Number, default: null },
  },
  { _id: false }
);

const houseCuspSchema = new Schema(
  {
    house: { type: Number, required: true },
    sign: { type: String, required: true },
    degree: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false }
);

const chartAngleSchema = new Schema(
  {
    sign: { type: String, required: true },
    degree: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false }
);

const aspectSchema = new Schema(
  {
    body1: { type: String, required: true },
    body2: { type: String, required: true },
    type: { type: String, required: true },
    orb: { type: Number, required: true },
  },
  { _id: false }
);

const natalChartSchema = new Schema(
  {
    sun: { type: String, required: true },
    moon: { type: String, required: true },
    rising: { type: String, default: null },
    planets: { type: [planetPositionSchema], default: [] },
    houses: { type: [houseCuspSchema], default: [] },
    aspects: { type: [aspectSchema], default: [] },
    angles: {
      type: new Schema(
        {
          asc: { type: chartAngleSchema, required: true },
          mc: { type: chartAngleSchema, required: true },
          desc: { type: chartAngleSchema, required: true },
          ic: { type: chartAngleSchema, required: true },
        },
        { _id: false }
      ),
      default: null,
    },
    houseSystem: { type: String, required: true },
    ephemeris: { type: String, required: true },
    timeKnown: { type: Boolean, required: true },
    computedAt: { type: String, required: true },
  },
  { _id: false }
);

/**
 * Face feature sub-schemas (Build 27 R2)
 *
 * Structured, deterministic facial-feature layer that replaces the freeform
 * Claude-Vision interpretation: landmarks → normalized FaceFeatureVector →
 * curated rules table → FaceTrait[]/FaceArchetypeResult. Mirrors R1's
 * natalChart: `_id: false` on every sub-schema (lean documents), written
 * atomically so Mongoose change-tracking suffices (no `markModified`). The
 * legacy `faceReading: Mixed` blob is KEPT below as the narrative cache (now
 * derived from these). See plans/build-27/R2-face-extraction.md §5 — that field
 * list is authoritative.
 */
const faceFeatureRatiosSchema = new Schema(
  {
    interocular: { type: Number, required: true },
    eyeSize: { type: Number, required: true },
    eyeAspect: { type: Number, required: true },
    browHeight: { type: Number, required: true },
    browArch: { type: Number, required: true },
    noseLengthWidth: { type: Number, required: true },
    noseWidth: { type: Number, required: true },
    lipFullness: { type: Number, required: true },
    mouthWidth: { type: Number, required: true },
    cheekboneWidth: { type: Number, required: true },
    jawWidth: { type: Number, required: true },
    cheekToJawTaper: { type: Number, required: true },
    chinProportion: { type: Number, required: true },
    lowerFacialThirds: { type: [Number], default: [] },
    facialFifths: { type: [Number], default: [] },
  },
  { _id: false }
);

const faceFeatureCategoricalsSchema = new Schema(
  {
    eyeSize: { type: String, required: true },
    eyeSpacing: { type: String, required: true },
    eyeOpenness: { type: String, required: true },
    browArch: { type: String, required: true },
    noseWidth: { type: String, required: true },
    noseLength: { type: String, required: true },
    lipFullness: { type: String, required: true },
    mouthWidth: { type: String, required: true },
    cheekboneProminence: { type: String, required: true },
    jawWidth: { type: String, required: true },
    chinShape: { type: String, required: true },
  },
  { _id: false }
);

const faceFeatureQualitySchema = new Schema(
  {
    landmarksFound: { type: Number, required: true },
    detectorScore: { type: Number, required: true },
    roll: { type: Number, required: true },
  },
  { _id: false }
);

const faceFeatureEngineSchema = new Schema(
  {
    library: { type: String, required: true },
    modelVersion: { type: String, required: true },
    // 'wasm' | 'cpu' — reproducibility-critical (CPU and WASM differ).
    backend: { type: String, required: true },
  },
  { _id: false }
);

const faceFeaturesSchema = new Schema(
  {
    faceShape: { type: String, required: true },
    ratios: { type: faceFeatureRatiosSchema, required: true },
    categoricals: { type: faceFeatureCategoricalsSchema, required: true },
    quality: { type: faceFeatureQualitySchema, required: true },
    engine: { type: faceFeatureEngineSchema, required: true },
    // Optional raw 68-point array; persisted so a rules/binning change re-maps
    // without re-detecting. `default: undefined` keeps it absent unless written.
    landmarks: { type: [[Number]], default: undefined },
    rulesInputVersion: { type: String, required: true },
    computedAt: { type: String, required: true },
  },
  { _id: false }
);

const faceTraitSchema = new Schema(
  {
    trait: { type: String, required: true },
    score: { type: Number, required: true },
    band: { type: String, required: true },
    description: { type: String },
    sourceFeatures: { type: [String], default: [] },
  },
  { _id: false }
);

const faceArchetypeResultSchema = new Schema(
  {
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    sourceTraits: { type: [String], default: [] },
  },
  { _id: false }
);

/**
 * Palm / hand feature sub-schemas (Build 27 R3)
 *
 * Structured, deterministic hand-geometry layer that replaces the freeform
 * Claude-Vision palm interpretation: 21 hand landmarks → normalized
 * HandFeatureVector → curated chiromancy rules table → PalmTrait[]/
 * PalmProfileResult. Stored PER HAND (dominant + non-dominant). Mirrors R2's
 * faceFeatures: `_id: false` on every sub-schema (lean documents), written
 * atomically so Mongoose change-tracking suffices (no `markModified`). The
 * legacy `palmReading`/`palmReadingNonDominant: Mixed` blobs are KEPT below as
 * the narrative caches (now derived from these).
 *
 * GEOMETRY-ONLY V1 (spike verdict): NO `lines` block — palm lines stay
 * LLM-described flavor, not measured. thumbAngle/fingerSpread are advisory raw
 * ratios only (optional), never binned to a categorical. See
 * plans/build-27/R3-palm-extraction.md §5 — that field list is authoritative.
 */
const handFeatureRatiosSchema = new Schema(
  {
    palmShape: { type: Number, required: true },
    fingerLength: { type: Number, required: true },
    indexRatio: { type: Number, required: true },
    middleRatio: { type: Number, required: true },
    ringRatio: { type: Number, required: true },
    pinkyRatio: { type: Number, required: true },
    digitRatio2D4D: { type: Number, required: true },
    // Advisory/raw only — pose-dependent, optional (no stable categorical
    // derived from these).
    thumbAngle: { type: Number },
    fingerSpread: { type: Number },
  },
  { _id: false }
);

const handFeatureCategoricalsSchema = new Schema(
  {
    palmShape: { type: String, required: true },
    fingerLength: { type: String, required: true },
  },
  { _id: false }
);

const handFeatureQualitySchema = new Schema(
  {
    landmarksFound: { type: Number, required: true },
    detectorScore: { type: Number, required: true },
    // In-plane rotation — optional quality signal.
    roll: { type: Number },
  },
  { _id: false }
);

const handFeatureEngineSchema = new Schema(
  {
    library: { type: String, required: true },
    modelVersion: { type: String, required: true },
    // 'wasm' | 'cpu' — reproducibility-critical (CPU and WASM differ).
    backend: { type: String, required: true },
  },
  { _id: false }
);

const handFeatureVectorSchema = new Schema(
  {
    hand: { type: String, required: true },
    palmType: { type: String, required: true },
    ratios: { type: handFeatureRatiosSchema, required: true },
    categoricals: { type: handFeatureCategoricalsSchema, required: true },
    quality: { type: handFeatureQualitySchema, required: true },
    engine: { type: handFeatureEngineSchema, required: true },
    // Optional raw 21-point array; persisted so a rules/binning change re-maps
    // without re-detecting. `default: undefined` keeps it absent unless written.
    landmarks: { type: [[Number]], default: undefined },
    rulesInputVersion: { type: String },
    // ISO timestamp — matches natalChart/faceFeatures (String, not Date).
    computedAt: { type: String, required: true },
  },
  { _id: false }
);

const palmTraitSchema = new Schema(
  {
    trait: { type: String, required: true },
    score: { type: Number, required: true },
    band: { type: String, required: true },
    description: { type: String },
    sourceFeatures: { type: [String], default: [] },
  },
  { _id: false }
);

const palmProfileResultSchema = new Schema(
  {
    palmType: { type: String, required: true },
    lifeTheme: { type: String, required: true },
    naturalTalents: { type: [String], default: [] },
    sourceTraits: { type: [String], default: [] },
    energyType: { type: String },
  },
  { _id: false }
);

/**
 * Numerology sub-schema (Build 27 R4)
 *
 * Canonical stored numerology numbers — one source of truth for server
 * consumers. Mirrors natalChart/faceFeatures: `_id: false` (lean document),
 * written atomically so Mongoose change-tracking suffices (no `markModified`).
 * The legacy flat lifePathNumber/personalYear/personalMonth fields (below)
 * are KEPT + maintained as mobile back-compat mirrors. Personal Year/Month
 * are deliberately NOT stored here — they are time-varying and computed fresh
 * at read time (storing them is what caused the staleness bug). See
 * plans/build-27/R4-numerology-consolidation.md §5 — that field list is
 * authoritative.
 */
const numerologySchema = new Schema(
  {
    lifePathNumber: { type: Number, required: true },
    // Name-based trio + provenance — optional as a set (absent until a name
    // source exists; present-together-or-absent-together by convention).
    // 'name_destiny'-sourced numbers are never downgraded to 'profile_name'.
    expressionNumber: { type: Number },
    soulUrgeNumber: { type: Number },
    personalityNumber: { type: Number },
    nameUsed: { type: String },
    nameSource: { type: String, enum: ['name_destiny', 'profile_name'] },
    numerologyVersion: { type: String, required: true },
    // ISO timestamp — matches natalChart/faceFeatures (String, not Date).
    computedAt: { type: String, required: true },
  },
  { _id: false }
);

/**
 * Continuity sub-schema (Build 27 R6)
 *
 * The ONE persisted field for the "what shifted since your last reading"
 * temporal delta: `baselineAt` (the last-engagement date the delta is measured
 * FROM) + `continuityVersion` (the algorithm tag). Mirrors natalChart/numerology
 * wiring: `_id: false` (lean document) + `default: null`. Neither field is
 * `required` — the sub-doc is STAMPED atomically by a later step's compute hook
 * (STEP 2/4), so no schema-level default constant is needed here (unlike
 * numerology.numerologyVersion, which is written on every birth-data save). STEP
 * 1 lands the schema only — nothing writes it yet. See
 * plans/build-27/R6-continuity.md §5.
 */
const continuitySchema = new Schema(
  {
    baselineAt: { type: String },
    continuityVersion: { type: String },
  },
  { _id: false }
);

/**
 * User profile schema
 */
const userProfileSchema = new Schema<IUserProfile, IUserProfileModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Display name used in reading prompt interpolation. Kept in sync with
    // User.name via user.service.updateName(). Do NOT mutate this field
    // directly — go through the service so audit history is recorded and
    // tier-based rate limits are enforced.
    name: {
      type: String,
      trim: true,
    },
    birthData: {
      date: {
        type: Date,
      },
      time: {
        type: String,
        match: /^\d{2}:\d{2}$/,
      },
      location: {
        city: String,
        country: String,
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        timezone: { type: String, default: null },
      },
      // True when the system defaulted a missing birth time to noon at
      // place-of-birth timezone (Build 21 noon-default flow). Mobile uses
      // this to render moon/rising values with a (i) provenance indicator.
      timeIsAssumed: { type: Boolean, default: false },
    },
    sunSign: {
      type: String,
    },
    lifePathNumber: {
      type: Number,
    },
    personalYear: {
      type: Number,
    },
    personalMonth: {
      type: Number,
    },
    handedness: {
      type: String,
      enum: ['right', 'left'],
      default: 'right',
    },
    images: {
      face: {
        url: String,
        uploadedAt: Date,
      },
      palmDominant: {
        url: String,
        uploadedAt: Date,
      },
      palmNonDominant: {
        url: String,
        uploadedAt: Date,
      },
    },
    faceReading: Schema.Types.Mixed,
    palmReading: Schema.Types.Mixed,
    palmReadingNonDominant: Schema.Types.Mixed,
    combinedProfile: Schema.Types.Mixed,
    // DEPRECATED (Build 27 R1) — see interface note. Kept for old-doc load
    // compatibility only; no longer written.
    birthChart: Schema.Types.Mixed,
    natalChart: { type: natalChartSchema, default: null },
    // Build 27 R2 — deterministic facial-feature layer. `faceReading` (Mixed,
    // above) is kept as the narrative cache, now derived from these. See the
    // sub-schema note above and plans/build-27/R2-face-extraction.md §5.
    faceFeatures: { type: faceFeaturesSchema, default: null },
    faceTraits: { type: [faceTraitSchema], default: undefined },
    faceArchetypeResult: { type: faceArchetypeResultSchema, default: null },
    faceRulesVersion: { type: String, default: null },
    // Build 27 R3 — deterministic per-hand hand-geometry layer. The
    // `palmReading`/`palmReadingNonDominant` Mixed blobs (above) are kept as the
    // narrative caches, now derived from these. See the sub-schema note above
    // and plans/build-27/R3-palm-extraction.md §5.
    palmDominantFeatures: { type: handFeatureVectorSchema, default: null },
    palmNonDominantFeatures: { type: handFeatureVectorSchema, default: null },
    palmDominantTraits: { type: [palmTraitSchema], default: undefined },
    palmNonDominantTraits: { type: [palmTraitSchema], default: undefined },
    palmProfileResult: { type: palmProfileResultSchema, default: null },
    palmRulesVersion: { type: String, default: null },
    // Build 27 R4 — canonical stored numerology. The flat lifePathNumber/
    // personalYear/personalMonth (above) stay maintained as mobile back-compat
    // mirrors. See the sub-schema note above and
    // plans/build-27/R4-numerology-consolidation.md §5.
    numerology: { type: numerologySchema, default: null },
    // Build 27 R6 — continuity baseline for the "what shifted since your last
    // reading" delta. Mirrors natalChart/numerology wiring (`default: null`).
    // STEP 1 lands the field only; nothing writes it yet. See the sub-schema
    // note above and plans/build-27/R6-continuity.md §5.
    continuity: { type: continuitySchema, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: any, ret: any) => {
        // Convert ObjectId to string
        const transformed: any = {
          ...ret,
          _id: ret._id.toString(),
          userId: ret.userId.toString(),
        };

        // Format dates as ISO strings
        if (transformed.birthData?.date) {
          transformed.birthData.date = transformed.birthData.date.toISOString().split('T')[0];
        }
        if (transformed.images?.face?.uploadedAt) {
          transformed.images.face.uploadedAt = transformed.images.face.uploadedAt.toISOString();
        }
        if (transformed.images?.palmDominant?.uploadedAt) {
          transformed.images.palmDominant.uploadedAt =
            transformed.images.palmDominant.uploadedAt.toISOString();
        }
        if (transformed.images?.palmNonDominant?.uploadedAt) {
          transformed.images.palmNonDominant.uploadedAt =
            transformed.images.palmNonDominant.uploadedAt.toISOString();
        }
        if (transformed.createdAt) {
          transformed.createdAt = transformed.createdAt.toISOString();
        }
        if (transformed.updatedAt) {
          transformed.updatedAt = transformed.updatedAt.toISOString();
        }

        // Remove __v
        delete transformed.__v;

        return transformed;
      },
    },
  }
);

/**
 * Instance method: Calculate astrology (sun sign)
 */
userProfileSchema.methods.calculateAstrology = function (): void {
  this.sunSign = getSunSign(this.birthData.date);
};

/**
 * Instance method: Calculate numerology (life path, personal year/month)
 */
userProfileSchema.methods.calculateNumerology = function (): void {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

  this.lifePathNumber = getLifePathNumber(this.birthData.date);
  this.personalYear = getPersonalYear(this.birthData.date, currentYear);
  this.personalMonth = getPersonalMonth(this.personalYear, currentMonth);

  // Build 27 R4 hook 1: mirror lifePath into the canonical `numerology` sub-doc
  // alongside the legacy flats. MERGE — preserve any existing name-based trio /
  // provenance (written by name-destiny generation or a profile-name save); a
  // birth-date save must never wipe those. Personal Year/Month are deliberately
  // NOT stored here (time-varying → computed fresh at read time). See
  // plans/build-27/R4-numerology-consolidation.md §6 hook 1.
  const existing = this.numerology;
  this.numerology = {
    lifePathNumber: this.lifePathNumber,
    expressionNumber: existing?.expressionNumber,
    soulUrgeNumber: existing?.soulUrgeNumber,
    personalityNumber: existing?.personalityNumber,
    nameUsed: existing?.nameUsed,
    nameSource: existing?.nameSource,
    numerologyVersion: NUMEROLOGY_VERSION,
    computedAt: now.toISOString(),
  };
};

/**
 * Pre-save hook: Calculate astrology and numerology before saving
 */
userProfileSchema.pre('save', function (this: IUserProfile, next) {
  if (this.birthData?.date && (this.isNew || this.isModified('birthData.date'))) {
    this.calculateAstrology();
    this.calculateNumerology();
  }
  next();
});

/**
 * User profile model
 */
export const UserProfile = mongoose.model<IUserProfile, IUserProfileModel>(
  'UserProfile',
  userProfileSchema
);
