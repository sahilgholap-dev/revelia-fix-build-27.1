/**
 * faceFeatures.service.ts — Build 27 R2 §9 step 2.
 *
 * Deterministic facial-feature extraction: an image buffer → 68 dlib landmarks
 * (@vladmandic/face-api) → a normalized, scale/rotation-tolerant
 * `FaceFeatureVector` (the §5 field list). This is the layer that replaces
 * freeform Claude-Vision face interpretation; downstream, the curated rules
 * table (step 3) maps the vector → stable traits/archetype.
 *
 * Stack (LOCKED by the R2 spike — see plans/build-27/R2-face-extraction.md §4/§11
 * and tracking_files/claude_progress.md → "build-27-R2-face-extraction-feasibility-spike"):
 *   @vladmandic/face-api@1.7.15 (dist/face-api.node-wasm build, NOT tfjs-node)
 *   + pure-JS @tensorflow/tfjs@4.22.0 + @tensorflow/tfjs-backend-wasm@4.22.0 (WASM backend)
 *   + sharp (already a dep) for decode. Zero native compile in the CV stack.
 *
 * Determinism contract (the whole point of R2): the SAME stored bytes → a
 * BIT-IDENTICAL vector. Achieved by (a) one fixed engine tuple, (b) distances
 * (rotation/translation invariant) reduced to scale-invariant ratios, (c) ratios
 * QUANTIZED to a fixed precision, and (d) categorical thresholds placed OFF the
 * cluster centers so a tiny landmark shift cannot flip a bin. The §6 invariant —
 * extract ONCE on the canonical processed buffer, persist the vector, and re-map
 * (never re-detect) on rules changes — is enforced by the callers (step 4), not
 * here; this function just guarantees determinism for a given buffer.
 *
 * Pure compute: NO Anthropic / network calls.
 */
import path from 'path';
import sharp from 'sharp';
// node-wasm build pulls the external pure-JS @tensorflow/tfjs (+ WASM backend) —
// no native binary, no DOM, no WebGL. `faceapi.tf` is that same tfjs handle.
import * as faceapi from '@vladmandic/face-api/dist/face-api.node-wasm';
// Side-effect import registers the 'wasm' backend into the shared tfjs registry,
// and exposes setWasmPaths so the .wasm loads from the installed package on disk.
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import { logger } from '../utils/logger';
import {
  FaceFeatureVector,
  FeatureSize,
  FeatureLength,
  EyeSpacing,
  EyeOpenness,
  BrowArch,
  LipFullness,
  CheekboneProminence,
  ChinShape,
  FaceShapeClass,
} from '../types/shared';

// face-api re-exports its tfjs handle, but its bundled type surface only covers
// a partial `tf` namespace (no setBackend/ready/getBackend/tensor3d). The runtime
// object is the full external @tensorflow/tfjs, so alias to `any` for those calls.
const tf: any = (faceapi as any).tf;

/**
 * Version of the feature-computation logic itself (ratio formulas + binning
 * thresholds). Stamped onto every vector as `rulesInputVersion`. Bump when the
 * geometry/thresholds change — that means a deliberate re-detect of everyone,
 * not just a rules re-map (which is governed by the separate RULES_VERSION on
 * the rules table in step 3).
 */
export const FEATURE_VECTOR_VERSION = '1.0.0';

const MODEL_VERSION = 'face_landmark_68';
const DETECTION_MIN_CONFIDENCE = 0.3;
// Ratio quantization precision. Inputs are rounded to RATIO_DECIMALS before any
// threshold comparison so a value can never sit exactly on a cutoff.
const RATIO_DECIMALS = 4;

// Resolve model + WASM asset dirs from the INSTALLED package locations, NOT a
// path relative to this file — must work in dev (ts-node-dev from src/) AND prod
// (node from dist/). The package has no `exports` field, so the package.json
// subpath resolves directly.
const FACE_API_PKG_DIR = path.dirname(
  require.resolve('@vladmandic/face-api/package.json')
);
const MODEL_DIR = path.join(FACE_API_PKG_DIR, 'model');
const WASM_DIR =
  path.dirname(require.resolve('@tensorflow/tfjs-backend-wasm/package.json')) +
  path.sep +
  'dist' +
  path.sep;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FACE_API_LIBRARY = `@vladmandic/face-api@${
  require('@vladmandic/face-api/package.json').version
}`;

// ---------------------------------------------------------------------------
// One-time backend init + model load (module-level cached promise).
// ---------------------------------------------------------------------------
let _initPromise: Promise<void> | null = null;

function init(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    tfjsWasm.setWasmPaths(WASM_DIR);
    await tf.setBackend('wasm');
    await tf.ready();
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_DIR);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_DIR);
    logger.info(
      `[faceFeatures] ready — backend=${tf.getBackend()} models=${MODEL_DIR}`
    );
  })().catch((err) => {
    // Don't poison the singleton on a transient failure — allow a later retry.
    _initPromise = null;
    throw err;
  });
  return _initPromise;
}

// ---------------------------------------------------------------------------
// Geometry helpers (pure).
// ---------------------------------------------------------------------------
interface Pt {
  x: number;
  y: number;
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function centroid(pts: Pt[]): Pt {
  const s = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: s.x / pts.length, y: s.y / pts.length };
}

// Perpendicular distance from point p to the line through a and b.
function perpDist(p: Pt, a: Pt, b: Pt): number {
  const len = dist(a, b);
  if (len === 0) return 0;
  const cross = Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y));
  return cross / len;
}

// Quantize a continuous ratio to a fixed precision (stabilizes binning).
function q(v: number, decimals: number = RATIO_DECIMALS): number {
  return Number(v.toFixed(decimals));
}

// Fixed-threshold bin → stable categorical. `thresholds` ascending; `labels`
// has one more entry than `thresholds`. Inputs are pre-quantized, so a value
// can never equal a threshold and flip between evaluations.
function bin<T extends string>(
  value: number,
  thresholds: number[],
  labels: readonly T[]
): T {
  for (let i = 0; i < thresholds.length; i++) {
    if (value < thresholds[i]) return labels[i];
  }
  return labels[labels.length - 1];
}

// ---------------------------------------------------------------------------
// THRESHOLD CALIBRATION NOTE
// The categorical thresholds below + the face-shape tree are a FIRST PASS,
// calibrated against the R2 spike sample set (n≈4 selfies) so each bin actually
// discriminates instead of collapsing to one label. They are deliberately fixed
// and version-tagged (FEATURE_VECTOR_VERSION) — refine against production data
// in a later calibration pass, which (per §6) is a re-detect, not a re-map.
// Every cutoff carries a trailing 5 in the 5th decimal (e.g. 0.16005) so it
// sits exactly BETWEEN two 4-decimal-quantized inputs — a quantized ratio can
// never equal a threshold, so a tiny landmark shift cannot flip a bin.
// ---------------------------------------------------------------------------

// Face-shape classification (deterministic decision tree over the available
// 68-pt geometry — face-outline widths + lower-face aspect; NO forehead, so the
// "widest" reference is the temple-level outline and `cheekVsFace` is ~constant
// and therefore not used as a discriminator).
function classifyFaceShape(
  aspect: number, // faceHeight / faceWidth (brow→chin over temple width)
  taper: number, // cheekbone / jaw width (>1 cheek wider, <1 jaw wider)
  jawVsFace: number, // jaw width / face width (wide → angular bottom)
  chinProp: number // chin height / chin width (high → pointed)
): FaceShapeClass {
  if (taper < 0.97005) return 'triangle'; // jaw wider than cheek → bottom-heavy
  if (aspect >= 1.35005) return 'oblong'; // notably long lower face
  if (taper >= 1.22005) {
    // Cheek clearly wider than jaw → tapered lower face.
    if (chinProp >= 0.52005) return 'heart'; // taper + pointed chin
    return aspect >= 1.00005 ? 'oval' : 'diamond';
  }
  // Balanced widths (taper ~0.97–1.22).
  if (jawVsFace >= 0.80005) {
    return aspect <= 1.00005 ? 'square' : 'oval'; // wide jaw: compact vs longer
  }
  return aspect <= 0.95005 ? 'round' : 'oval'; // softer jaw: compact vs longer
}

// ---------------------------------------------------------------------------
// 68 landmarks → FaceFeatureVector.
// dlib layout: jaw 0–16, right brow 17–21, left brow 22–26, nose 27–35
// (30 tip, 33 subnasale, 31/35 nostrils), right eye 36–41, left eye 42–47,
// mouth 48–67 (51 upper-lip top, 57 lower-lip bottom). "right"/"left" are the
// subject's, i.e. image-left/image-right respectively.
// ---------------------------------------------------------------------------
function buildVector(
  positions: Pt[],
  detectorScore: number
): FaceFeatureVector | null {
  const p = positions;

  // Scale + reference geometry.
  const faceWidth = dist(p[0], p[16]); // outline width at temple level (normalizer)
  const chin = p[8];
  const browMid = mid(centroid(p.slice(17, 22)), centroid(p.slice(22, 27)));
  const faceHeight = dist(browMid, chin); // brow→chin lower-face height proxy

  // Eyes.
  const reyeInner = p[39];
  const leyeInner = p[42];
  const reyeC = centroid(p.slice(36, 42));
  const leyeC = centroid(p.slice(42, 48));
  const interocularDist = dist(reyeInner, leyeInner); // inner-corner spacing
  const eyeWidth =
    (dist(p[36], p[39]) + dist(p[42], p[45])) / 2; // outer→inner, avg
  const eyeHeight =
    ((dist(p[37], p[41]) + dist(p[38], p[40])) / 2 +
      (dist(p[43], p[47]) + dist(p[44], p[46])) / 2) /
    2;

  // Nose.
  const noseLen = dist(p[27], p[33]); // bridge top → subnasale
  const alarWidth = dist(p[31], p[35]); // nostril span

  // Mouth.
  const mouthWidthDist = dist(p[48], p[54]); // outer corners
  const lipHeight = dist(p[51], p[57]); // upper-lip top → lower-lip bottom

  // Cheek / jaw.
  const cheekW = dist(p[2], p[14]); // upper cheek (≈ zygomatic)
  const jawW = dist(p[4], p[12]); // lower jaw (≈ gonial)

  // Chin.
  const chinHeight = dist(p[8], p[57]); // chin tip → lower-lip bottom
  const chinWidth = dist(p[6], p[10]);

  // Guard against degenerate detections (would yield NaN/Infinity ratios).
  if (
    !faceWidth ||
    !faceHeight ||
    !eyeWidth ||
    !alarWidth ||
    !mouthWidthDist ||
    !jawW ||
    !chinWidth
  ) {
    logger.warn('[faceFeatures] degenerate geometry — skipping vector');
    return null;
  }

  // Brow arch: apex deviation from the brow chord, normalized by chord length.
  const archR = perpDist(p[19], p[17], p[21]) / dist(p[17], p[21]);
  const archL = perpDist(p[24], p[22], p[26]) / dist(p[22], p[26]);
  const browArchRaw = (archR + archL) / 2;

  // Brow height: brow → upper-eyelid gap, over lower-face height.
  const eyeTopMid = mid(mid(p[37], p[38]), mid(p[43], p[44]));
  const browToEyeGap = dist(browMid, eyeTopMid);

  // Lower facial thirds (UPPER third omitted — unmeasurable from 68 pts).
  const subnasale = p[33];
  const midThird = dist(browMid, subnasale) / faceHeight;
  const lowThird = dist(subnasale, chin) / faceHeight;

  // Facial fifths: 5 horizontal segments across eye level, over face width.
  const fifths = [
    dist(p[0], p[36]),
    dist(p[36], p[39]),
    dist(p[39], p[42]),
    dist(p[42], p[45]),
    dist(p[45], p[16]),
  ].map((seg) => q(seg / faceWidth));

  // Raw ratios → quantized.
  const interocular = q(interocularDist / faceWidth);
  const eyeSizeR = q(eyeWidth / faceWidth);
  const eyeAspect = q(eyeHeight / eyeWidth);
  const browHeight = q(browToEyeGap / faceHeight);
  const browArchR = q(browArchRaw);
  const noseLengthWidth = q(noseLen / alarWidth);
  const noseWidthR = q(alarWidth / faceWidth);
  const lipFullnessR = q(lipHeight / mouthWidthDist);
  const mouthWidthR = q(mouthWidthDist / faceWidth);
  const cheekboneWidth = q(cheekW / faceWidth);
  const jawWidth = q(jawW / faceWidth);
  const cheekToJawTaper = q(cheekW / jawW);
  const chinProportion = q(chinHeight / chinWidth);
  const aspect = q(faceHeight / faceWidth);

  // In-plane roll from the eye-center line (deg). Level face → ~0.
  const roll = q(
    (Math.atan2(leyeC.y - reyeC.y, leyeC.x - reyeC.x) * 180) / Math.PI,
    2
  );

  const faceShape = classifyFaceShape(
    aspect,
    cheekToJawTaper,
    jawWidth,
    chinProportion
  );

  return {
    faceShape,
    ratios: {
      interocular,
      eyeSize: eyeSizeR,
      eyeAspect,
      browHeight,
      browArch: browArchR,
      noseLengthWidth,
      noseWidth: noseWidthR,
      lipFullness: lipFullnessR,
      mouthWidth: mouthWidthR,
      cheekboneWidth,
      jawWidth,
      cheekToJawTaper,
      chinProportion,
      lowerFacialThirds: [q(midThird), q(lowThird)],
      facialFifths: fifths,
    },
    categoricals: {
      eyeSize: bin(eyeSizeR, [0.15805, 0.17005], ['small', 'medium', 'large'] as const) as FeatureSize,
      eyeSpacing: bin(interocular, [0.23005, 0.26005], ['close', 'average', 'wide'] as const) as EyeSpacing,
      eyeOpenness: bin(eyeAspect, [0.29005, 0.33005], ['narrow', 'average', 'wide'] as const) as EyeOpenness,
      browArch: bin(browArchR, [0.10005, 0.16005], ['flat', 'soft', 'arched'] as const) as BrowArch,
      noseWidth: bin(noseWidthR, [0.16005, 0.17505], ['small', 'medium', 'large'] as const) as FeatureSize,
      noseLength: bin(noseLengthWidth, [1.75005, 2.05005], ['short', 'medium', 'long'] as const) as FeatureLength,
      lipFullness: bin(lipFullnessR, [0.32005, 0.45005], ['thin', 'medium', 'full'] as const) as LipFullness,
      mouthWidth: bin(mouthWidthR, [0.36005, 0.43005], ['small', 'medium', 'large'] as const) as FeatureSize,
      cheekboneProminence: bin(cheekToJawTaper, [1.18005, 1.23005], ['low', 'medium', 'high'] as const) as CheekboneProminence,
      jawWidth: bin(jawWidth, [0.76005, 0.80005], ['small', 'medium', 'large'] as const) as FeatureSize,
      chinShape: bin(chinProportion, [0.44005, 0.52005], ['square', 'rounded', 'pointed'] as const) as ChinShape,
    },
    quality: {
      landmarksFound: positions.length,
      detectorScore: q(detectorScore),
      roll,
    },
    engine: {
      library: FACE_API_LIBRARY,
      modelVersion: MODEL_VERSION,
      backend: 'wasm',
    },
    landmarks: positions.map((pt) => [pt.x, pt.y]),
    rulesInputVersion: FEATURE_VECTOR_VERSION,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Extract a deterministic `FaceFeatureVector` from an image buffer.
 *
 * Returns `null` when no face is found / the detection is degenerate — the
 * caller treats that as `uncertain` and falls back to the blob/defaults
 * (never hard-fails a reading). Run this on the SAME canonical processed buffer
 * the upload stores so the vector is reproducible (§6 extract-once invariant).
 *
 * NOTE on determinism: every field except `computedAt` is a pure function of
 * the input bytes and the fixed engine tuple — i.e. bit-identical across runs
 * of the same buffer. `computedAt` is a per-run metadata timestamp and is not
 * part of the measurement contract.
 */
export async function extractFaceFeatures(
  buffer: Buffer
): Promise<FaceFeatureVector | null> {
  await init();

  // Decode to a raw RGB tensor via sharp (alpha dropped → 3 channels).
  const { data, info } = await sharp(buffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tensor = tf.tensor3d(
    new Uint8Array(data),
    [info.height, info.width, info.channels],
    'int32'
  );

  try {
    const result = await faceapi
      .detectSingleFace(
        tensor,
        new faceapi.SsdMobilenetv1Options({
          minConfidence: DETECTION_MIN_CONFIDENCE,
        })
      )
      .withFaceLandmarks();

    if (!result) {
      logger.warn('[faceFeatures] no face detected on a validated image');
      return null;
    }

    return buildVector(result.landmarks.positions, result.detection.score);
  } finally {
    tensor.dispose();
  }
}
