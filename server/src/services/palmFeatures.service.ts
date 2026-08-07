/**
 * palmFeatures.service.ts — Build 27 R3 §9 step 2.
 *
 * Deterministic hand-geometry extraction: an image buffer → 21 MediaPipe-Hands
 * landmarks (@tensorflow-models/hand-pose-detection, tfjs runtime) → a
 * normalized, scale/rotation-tolerant `HandFeatureVector` (the §5 GEOMETRY-ONLY
 * field list). This is the palm analog of `faceFeatures.service.ts` — the layer
 * that replaces freeform Claude-Vision palm interpretation; downstream, the
 * curated chiromancy rules table (step 3) maps the vector → stable palmType /
 * traits / talents.
 *
 * Stack (LOCKED by the R3 spike — see plans/build-27/R3-palm-extraction.md §4/§11
 * and tracking_files/claude_progress.md → "build27-R3-Palm-Extraction-Phase0-
 * feasibility-spike"):
 *   @tensorflow-models/hand-pose-detection@2.0.1 (runtime 'tfjs', MediaPipeHands
 *   modelType 'full', maxHands 1)
 *   + pure-JS @tensorflow/tfjs@4.22.0 + @tensorflow/tfjs-backend-wasm@4.22.0 (WASM)
 *   + sharp (already a dep) for decode. Zero native compile in the CV stack.
 *
 * NEW vs R2 (the one genuinely novel piece): the lib does NOT bundle model
 * weights (unlike @vladmandic/face-api) and its default model URLs point at
 * tfhub.dev, which is DEPRECATED. So the ~7.6 MB weights are VENDORED + committed
 * under server/assets/hand-pose/ and loaded OFFLINE via a small custom `tf.io`
 * fs load-router (registered below). Pure-JS tfjs has no `file://` handler and
 * tfjs-node stays rejected (native build trap), hence the router. Offline load
 * was proven bit-identical to the network run in the spike.
 *
 * Determinism contract (the whole point of R3): the SAME stored bytes → a
 * BIT-IDENTICAL vector. Achieved by (a) one fixed engine tuple, (b) WASM being
 * deterministic, (c) staticImageMode so no cross-call tracking state leaks, and
 * (d — step 2's geometry) ratios QUANTIZED + categorical thresholds placed OFF
 * cluster centers. The §6 invariant — extract ONCE on the canonical processed
 * buffer, persist the vector, and re-map (never re-detect) on rules changes — is
 * enforced by the callers (step 4), not here.
 *
 * Pure compute: NO Anthropic / network calls (weights load from disk).
 */
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import * as tf from '@tensorflow/tfjs';
// Side-effect import registers the 'wasm' backend into the shared tfjs-core
// registry (single installed copy → same ENGINE hand-pose-detection reads), and
// exposes setWasmPaths so the .wasm binaries load from the installed package.
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import * as handpose from '@tensorflow-models/hand-pose-detection';
import { logger } from '../utils/logger';
import {
  HandFeatureVector,
  PalmShape,
  FingerLength,
  PalmTypeClass,
} from '../types/shared';

// ---------------------------------------------------------------------------
// Engine tuple (part of the reproducibility contract — stamped onto the vector).
// A change here means re-detect-everyone, not just a rules re-map (R3 plan §6).
// ---------------------------------------------------------------------------
export const PALM_LIBRARY = '@tensorflow-models/hand-pose-detection@2.0.1';
export const PALM_MODEL_VERSION = 'mediapipe-hands/handpose_3d-full';
const PALM_BACKEND = 'wasm' as const;

/**
 * Version of the geometry-computation logic itself (ratio formulas + binning
 * thresholds). Stamped onto every vector as `rulesInputVersion`. Bump when the
 * geometry/thresholds change — that means a deliberate re-detect of everyone,
 * not just a rules re-map (which is governed by the separate RULES_VERSION on
 * the chiromancy rules table in step 3). Mirrors R2's FEATURE_VECTOR_VERSION.
 */
export const FEATURE_VECTOR_VERSION = '1.0.0';

// Ratio quantization precision. Inputs are rounded to RATIO_DECIMALS before any
// threshold comparison so a value can never sit exactly on a cutoff (R2 lesson).
const RATIO_DECIMALS = 4;

// ---------------------------------------------------------------------------
// Asset + WASM path resolution.
// Must work in BOTH dev (ts-node-dev from src/) AND prod (node dist/). The
// vendored weights live at server/assets/hand-pose/ (OUTSIDE src/ and dist/, so
// no build copy step is needed and the path is identical either way). Resolve
// them relative to the SERVER PACKAGE ROOT (found by walking up to the nearest
// package.json), NOT a path relative to this file — the R2 step-2 lesson.
// The WASM dir resolves from the installed backend package (as R2 did).
// ---------------------------------------------------------------------------
function findServerRoot(): string {
  let dir = __dirname;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `[palmFeatures] could not locate server package root from ${__dirname}`
  );
}

const SERVER_ROOT = findServerRoot();
const HAND_POSE_DIR = path.join(SERVER_ROOT, 'assets', 'hand-pose');
const DETECTOR_MODEL_JSON = path.join(HAND_POSE_DIR, 'detector', 'model.json');
const LANDMARK_MODEL_JSON = path.join(HAND_POSE_DIR, 'landmark', 'model.json');

const WASM_DIR =
  path.dirname(require.resolve('@tensorflow/tfjs-backend-wasm/package.json')) +
  path.sep +
  'dist' +
  path.sep;

// ---------------------------------------------------------------------------
// Custom tf.io fs load-router.
// The lib checks `config.detectorModelUrl.indexOf('https://tfhub.dev')` on the
// URL STRING (so an IOHandler object can't be passed directly) and then calls
// tfconv.loadGraphModel(url). We therefore hand it a string URL under a private
// scheme; this router matches that scheme and returns an IOHandler that reads
// model.json + weight shards from disk. tfjs-core filters routers that return
// null, so returning null == "not mine" (the type says non-null → cast).
// ---------------------------------------------------------------------------
const FS_SCHEME = 'handposefs://';

function makeFsLoadHandler(modelJsonPath: string): tf.io.IOHandler {
  return {
    load: async (): Promise<tf.io.ModelArtifacts> => {
      const dir = path.dirname(modelJsonPath);
      const modelJSON = JSON.parse(
        await fsp.readFile(modelJsonPath, 'utf8')
      ) as tf.io.ModelJSON;
      return tf.io.getModelArtifactsForJSON(
        modelJSON,
        async (weightsManifest) => {
          const weightSpecs: tf.io.WeightsManifestEntry[] = [];
          const buffers: ArrayBuffer[] = [];
          for (const group of weightsManifest) {
            weightSpecs.push(...group.weights);
            for (const p of group.paths) {
              const buf = await fsp.readFile(path.join(dir, p));
              // Slice to a standalone ArrayBuffer (Buffer may be a view into a
              // larger pooled allocation — must not hand tfjs the whole pool).
              buffers.push(
                buf.buffer.slice(
                  buf.byteOffset,
                  buf.byteOffset + buf.byteLength
                )
              );
            }
          }
          return [weightSpecs, tf.io.concatenateArrayBuffers(buffers)];
        }
      );
    },
  };
}

let _routerRegistered = false;
function registerFsLoadRouter(): void {
  if (_routerRegistered) return;
  // `IORouter` isn't re-exported through the `tf.io` type namespace; derive the
  // param type from registerLoadRouter itself. Returning null == "not mine"
  // (tfjs-core filters null routers) — the signature is non-null, hence the cast.
  type LoadRouter = Parameters<typeof tf.io.registerLoadRouter>[0];
  tf.io.registerLoadRouter(((url: string | string[]) => {
    if (typeof url === 'string' && url.startsWith(FS_SCHEME)) {
      return makeFsLoadHandler(url.slice(FS_SCHEME.length));
    }
    return null;
  }) as LoadRouter);
  _routerRegistered = true;
}

// ---------------------------------------------------------------------------
// One-time backend init + detector creation (module-level cached promise).
// Mirrors faceFeatures.service.ts: init/load ONCE, and null the cached promise
// on failure so a later call can retry (no permanent poison).
// ---------------------------------------------------------------------------
let _detectorPromise: Promise<handpose.HandDetector> | null = null;

function getDetector(): Promise<handpose.HandDetector> {
  if (_detectorPromise) return _detectorPromise;
  _detectorPromise = (async () => {
    registerFsLoadRouter();
    setWasmPaths(WASM_DIR);
    await tf.setBackend(PALM_BACKEND);
    await tf.ready();
    const detector = await handpose.createDetector(
      handpose.SupportedModels.MediaPipeHands,
      {
        runtime: 'tfjs',
        modelType: 'full',
        maxHands: 1,
        // Offline, via the fs load-router above — NOT the deprecated tfhub default.
        detectorModelUrl: FS_SCHEME + DETECTOR_MODEL_JSON,
        landmarkModelUrl: FS_SCHEME + LANDMARK_MODEL_JSON,
      }
    );
    logger.info(
      `[palmFeatures] ready — backend=${tf.getBackend()} models=${HAND_POSE_DIR}`
    );
    return detector;
  })().catch((err) => {
    _detectorPromise = null;
    throw err;
  });
  return _detectorPromise;
}

// ---------------------------------------------------------------------------
// Low-level detection: buffer → the single most-confident hand (or null).
// staticImageMode:true so each call runs the palm detector fresh (no tracking
// state carried between independent server calls → reproducible). Decoded via
// sharp to a raw int32 RGB tensor (alpha dropped), matching the R2 decode path.
// ---------------------------------------------------------------------------
export interface HandDetection {
  keypoints: handpose.Keypoint[]; // 21 image-space points {x,y,name}
  keypoints3D?: handpose.Keypoint[]; // 21 metric points {x,y,z,name}
  score: number;
  handedness: string;
}

export async function detectHand(
  buffer: Buffer
): Promise<HandDetection | null> {
  const detector = await getDetector();

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
    const hands = await detector.estimateHands(tensor, {
      flipHorizontal: false,
      staticImageMode: true,
    });
    if (!hands || hands.length === 0) {
      logger.warn('[palmFeatures] no hand detected on a validated image');
      return null;
    }
    const hand = hands[0];
    return {
      keypoints: hand.keypoints,
      keypoints3D: hand.keypoints3D,
      score: hand.score,
      handedness: hand.handedness,
    };
  } finally {
    tensor.dispose();
  }
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

// Interior angle (deg) at vertex `v` between rays v→a and v→b.
function angleDeg(v: Pt, a: Pt, b: Pt): number {
  const v1x = a.x - v.x;
  const v1y = a.y - v.y;
  const v2x = b.x - v.x;
  const v2y = b.y - v.y;
  const n1 = Math.hypot(v1x, v1y);
  const n2 = Math.hypot(v2x, v2y);
  if (n1 === 0 || n2 === 0) return 0;
  let c = (v1x * v2x + v1y * v2y) / (n1 * n2);
  c = Math.max(-1, Math.min(1, c));
  return (Math.acos(c) * 180) / Math.PI;
}

// Quantize a continuous ratio to a fixed precision (stabilizes binning).
function q(v: number, decimals: number = RATIO_DECIMALS): number {
  return Number(v.toFixed(decimals));
}

// Fixed-threshold bin → stable categorical. `thresholds` ascending; `labels`
// has one more entry than `thresholds`. Inputs are pre-quantized so a value can
// never equal a threshold and flip between evaluations (R2 pattern).
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
// The two categorical thresholds below + the 2×2 palmType map are a FIRST PASS,
// anthropometrically centred and confirmed to discriminate on the spike sample
// (palmType spread across all 4 classes, not collapsed). They are deliberately
// fixed and version-tagged (FEATURE_VECTOR_VERSION) — refine against real
// on-device captures in a later calibration pass, which (per §6) is a re-detect,
// not a re-map. Every cutoff carries a trailing 5 in the 5th decimal (e.g.
// 0.75005) so it sits BETWEEN two 4-decimal-quantized inputs — a quantized ratio
// can never equal a threshold, so a tiny landmark shift cannot flip a bin.
// ---------------------------------------------------------------------------
const PALM_SHAPE_THRESHOLD = 0.75005; // palmWidth/palmLength: < → rectangular, ≥ → square
const FINGER_LENGTH_THRESHOLD = 0.95005; // meanFinger/palmLength: < → short, ≥ → long

// The fixed 2×2 chiromancy mapping: palmShape × fingerLength → element.
function classifyPalmType(
  palmShape: PalmShape,
  fingerLength: FingerLength
): PalmTypeClass {
  if (palmShape === 'square') {
    return fingerLength === 'short' ? 'earth' : 'air';
  }
  // rectangular
  return fingerLength === 'long' ? 'water' : 'fire';
}

// ---------------------------------------------------------------------------
// 21 MediaPipe-Hands landmarks → HandFeatureVector (GEOMETRY-ONLY).
// MediaPipe layout: 0 wrist; thumb 1–4 (4 tip); index 5–8 (5 mcp, 8 tip);
// middle 9–12; ring 13–16; pinky 17–20. All features are ratios of Euclidean
// distances → translation/rotation invariant + scale invariant.
// ---------------------------------------------------------------------------
function buildVector(
  det: HandDetection,
  hand: 'dominant' | 'non-dominant'
): HandFeatureVector | null {
  const k = det.keypoints as Pt[];
  if (!k || k.length < 21) {
    logger.warn('[palmFeatures] fewer than 21 keypoints — skipping vector');
    return null;
  }

  // Scale references.
  const palmLength = dist(k[0], k[9]); // wrist → middle-finger base (MCP)
  const palmWidth = dist(k[5], k[17]); // index MCP → pinky MCP (knuckle span)

  // Per-finger lengths (tip → its own MCP).
  const indexLen = dist(k[8], k[5]);
  const middleLen = dist(k[12], k[9]);
  const ringLen = dist(k[16], k[13]);
  const pinkyLen = dist(k[20], k[17]);
  const meanFinger = (indexLen + middleLen + ringLen + pinkyLen) / 4;

  // Guard against degenerate detections (would yield NaN/Infinity ratios).
  if (!palmLength || !palmWidth || !ringLen) {
    logger.warn('[palmFeatures] degenerate geometry — skipping vector');
    return null;
  }

  // Intrinsic ratios (quantized).
  const palmShapeR = q(palmWidth / palmLength);
  const fingerLengthR = q(meanFinger / palmLength);
  const indexRatio = q(indexLen / palmLength);
  const middleRatio = q(middleLen / palmLength);
  const ringRatio = q(ringLen / palmLength);
  const pinkyRatio = q(pinkyLen / palmLength);
  const digitRatio2D4D = q(indexLen / ringLen);

  // Advisory / pose-dependent (DEMOTED per spike — raw only, NOT binned).
  const thumbAngle = q(angleDeg(k[2], k[4], k[5]), 2); // thumb-to-index opening
  const spread =
    (dist(k[8], k[12]) + dist(k[12], k[16]) + dist(k[16], k[20])) / 3;
  const fingerSpread = q(spread / palmWidth);

  // Categoricals — INTRINSIC ratios only.
  const palmShape = bin(
    palmShapeR,
    [PALM_SHAPE_THRESHOLD],
    ['rectangular', 'square'] as const
  ) as PalmShape;
  const fingerLength = bin(
    fingerLengthR,
    [FINGER_LENGTH_THRESHOLD],
    ['short', 'long'] as const
  ) as FingerLength;

  const palmType = classifyPalmType(palmShape, fingerLength);

  // In-plane roll (quality signal): palm axis (wrist→middle MCP) vs vertical.
  // Level, upright hand → ~0. Image y grows downward, so negate dy.
  const roll = q(
    (Math.atan2(k[9].x - k[0].x, -(k[9].y - k[0].y)) * 180) / Math.PI,
    2
  );

  return {
    hand,
    palmType,
    ratios: {
      palmShape: palmShapeR,
      fingerLength: fingerLengthR,
      indexRatio,
      middleRatio,
      ringRatio,
      pinkyRatio,
      digitRatio2D4D,
      thumbAngle,
      fingerSpread,
    },
    categoricals: {
      palmShape,
      fingerLength,
    },
    quality: {
      landmarksFound: k.length,
      detectorScore: q(det.score),
      roll,
    },
    engine: {
      library: PALM_LIBRARY,
      modelVersion: PALM_MODEL_VERSION,
      backend: PALM_BACKEND,
    },
    landmarks: k.map((pt) => [pt.x, pt.y]),
    rulesInputVersion: FEATURE_VECTOR_VERSION,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Extract a deterministic GEOMETRY-ONLY `HandFeatureVector` from an image buffer.
 *
 * Returns `null` when no hand is found / the detection is degenerate — the
 * caller (step 4) treats that as `uncertain` and falls back to the blob/defaults
 * (never hard-fails a reading), mirroring `extractFaceFeatures`. Run this on the
 * SAME canonical processed buffer the upload stores so the vector is reproducible
 * (§6 extract-once invariant).
 *
 * Determinism: every field except `computedAt` is a pure function of the input
 * bytes and the fixed engine tuple — bit-identical across runs of the same
 * buffer. `computedAt` is per-run metadata, not part of the measurement contract.
 */
export async function extractHandFeatures(
  buffer: Buffer,
  hand: 'dominant' | 'non-dominant'
): Promise<HandFeatureVector | null> {
  const det = await detectHand(buffer);
  if (!det) return null;
  return buildVector(det, hand);
}
