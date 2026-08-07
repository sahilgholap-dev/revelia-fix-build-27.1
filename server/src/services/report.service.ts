/**
 * Report generation orchestration — R9 Personalized Cosmic Report (Build 27),
 * charter §14 STEP 5b.
 *
 * Mode B (R9-report.md §0/§4, spec §12-D2): the backend computes EVERY number
 * deterministically (steps 1-2, assembled by 5a's `buildReportInjectPayload`),
 * and Fable 5 writes the INTERPRETATION only — never arithmetic. This module
 * turns a claimed `generating` Report into a persisted interpretation:
 *
 *   load SELF inputs → buildReportInjectPayload (validated) →
 *   idempotency short-circuit → createSynthesisMessage(surface:'report') →
 *   persist interpretation + nonce + cost → return { highlights, pdfKey:'STUB' }
 *
 * ── STILL PROD-DARK (step 5b) ─────────────────────────────────────────────────
 * `pdfKey` STAYS the `'STUB'` sentinel — the renderer is step 6. The worker's
 * ready-requires-artifacts guard is satisfied by STUB so the pipeline is
 * testable while `REPORT_WORKER_ENABLED` stays OFF. No PDF, no charts, no QA
 * gate, no R2/email delivery here.
 *
 * ── IDEMPOTENCY (double-bill defense — build-27-caveats) ──────────────────────
 * A per-report `generationNonce` is stamped ONCE when generation first begins.
 * The Fable output is persisted tagged with it. If a persisted interpretation
 * already exists, `generateReport` RETURNS it WITHOUT calling Fable — so a
 * sweep-requeue + re-claim reuses the result and never re-bills. The step-4
 * 20-min stale-generating timeout is defense-in-depth for the genuinely-still-
 * running case; this nonce short-circuit is the primary defense for the
 * completed-then-requeued case.
 *
 * ── ERROR ROUTING (DO 4) ──────────────────────────────────────────────────────
 * A `ReportInjectValidationError` (bad/absent birth data or a payload that fails
 * Node validation — won't fix on retry) PROPAGATES unchanged; the worker routes
 * it to a terminal FAIL-FAST (no MAX_ATTEMPTS burn, credit refunded via the
 * partial index). A transient Fable/API error (5xx/timeout) propagates as an
 * ordinary Error → the worker's retry path.
 */
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Report, IReport } from '../models/Report';
import { User } from '../models/User';
import { UserProfile } from '../models/UserProfile';
import { NameAnalysis } from '../models/NameAnalysis';
import { NatalChartInput } from './astrology.service';
import {
  uploadReportPdf as uploadReportPdfToR2,
  getReportSignedUrl,
} from './report-delivery.service';
import { sendReportEmail } from './email.service';
import {
  buildReportInjectPayload,
  ReportInjectValidationError,
  ReportInjectPayload,
  StoredPalmInput,
} from './report-inject.service';
import {
  createSynthesisMessage,
  CreateSynthesisMessageOptions,
  SynthesisMessageResult,
} from './synthesis-routing';
import {
  renderReportPdf,
  qaReportPdf,
  RenderReportArgs,
  RenderReportMeta,
  QaResult,
  QaContext,
  ReportContractError,
  ReportQaFailedError,
} from './report-render.service';
import { logger } from '../utils/logger';

/**
 * The renderer STUB sentinel. ⚠️ RETIRED AS THE `ready` AUTHORIZER at step 7: a
 * report now reaches `ready` ONLY with a REAL pdfKey (present AND ≠ 'STUB') minted
 * by the upload seam. The constant is retained so the worker can REJECT it (the
 * ready-guard) and as a grep tripwire on real prod docs. Until step 8's real R2
 * uploader replaces the default upload stub, a QA-passed report cannot reach
 * `ready` in prod — correct: prod-dark.
 */
export const PDF_KEY_STUB = 'STUB';

/**
 * ⚠️ MAX_QA_REGEN (DO 4 A1) — the SEPARATE, SMALLER cap for a QA-fail RE-FABLE.
 * A QA-fail CONTENT regenerate bumps `generationNonce`, defeating the idempotency
 * short-circuit BY DESIGN → a FRESH Fable spend each time (~$0.46–$3.35). A report
 * failing QA on the SAME prompt+inputs twice will not pass a third time, so a 3rd
 * Fable call is pure waste. This is ORTHOGONAL to the transient-API-retry
 * MAX_ATTEMPTS in the worker (a 5xx/timeout retry is cheap/free and stays on that
 * path). Two failure classes, two caps: transient-API = cheap, retry a few times;
 * QA-regenerate = expensive, cap TIGHT. Recommend 1 → at most 2 Fable calls total.
 */
export const MAX_QA_REGEN = 1;

/**
 * MAX_RENDER_RETRY (DO 4 A2) — the cap for a RENDER-class QA fail (or a transient
 * render deficiency). A render-only retry re-renders the SAME persisted
 * interpretation → NO re-Fable, NO spend → it can be a touch more generous than
 * the Fable cap since it costs nothing (mainly rescues a transient toolchain
 * hiccup; a deterministic render fail simply re-fails and goes terminal).
 */
export const MAX_RENDER_RETRY = 2;

/**
 * ── UPLOAD SEAM (step 8 — WIRED) ──────────────────────────────────────────────
 * A QA-PASSED PDF buffer → { pdfKey }. The DEFAULT is now the REAL private-R2
 * uploader (`report-delivery.service.uploadReportPdf`) — PutObject to the private
 * `revelia-reports` bucket, returning a stable owner-scoped key. This real key
 * (≠ the retired 'STUB' sentinel) is what authorizes `ready`. If `R2_REPORTS_*`
 * is unset the real uploader throws `ReportDeliveryNotConfiguredError` — a clear
 * CONFIG error (not a silent stub), so an unconfigured deploy fails loudly rather
 * than marking reports `ready` with no stored PDF. The offline harness still
 * injects a FAKE uploader to prove the QA-pass→ready path without R2.
 *
 * NOTE: NO `secureLink` is returned here. Per the DELIVERY MODEL a presigned link
 * is NEVER persisted — it is minted FRESH per GET (controller) and once for the
 * ready email. Only the durable `pdfKey` flows out of generation.
 */
export type UploadReportPdfFn = (
  pdf: Buffer,
  report: IReport
) => Promise<{ pdfKey: string }>;

const defaultUploadReportPdf: UploadReportPdfFn = uploadReportPdfToR2;

/**
 * ── EMAIL LINK TTL (step 8, DELIVERY MODEL) ───────────────────────────────────
 * The report-ready email carries a presigned URL at this TTL — the first-week
 * convenience. `R2_REPORT_EMAIL_LINK_TTL` (seconds) overrides the ~7-day default;
 * capped at 7 days (also the SigV4 presign ceiling). The app is the durable path
 * (re-signs every view), so the 7-day cap is deliberate + fine.
 */
export const REPORT_EMAIL_LINK_TTL_SECONDS = (() => {
  const cap = 7 * 24 * 60 * 60;
  const raw = Number(process.env.R2_REPORT_EMAIL_LINK_TTL);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, cap) : cap;
})();

/** Injectable render / QA fns (real defaults) — the harness swaps them to force paths. */
type RenderPdfFn = (args: RenderReportArgs) => Promise<Buffer>;
type QaFn = (pdf: Buffer, ctx: QaContext) => Promise<QaResult>;

/** Injectable dependencies for `generateReport` (all default to the real impls). */
export interface GenerateReportDeps {
  synthesize?: SynthesizeFn;
  uploadReportPdf?: UploadReportPdfFn;
  renderPdf?: RenderPdfFn;
  qa?: QaFn;
}

/**
 * ⚠️ maxTokens — a COST LEVER, not just a ceiling. It caps VISIBLE output +
 * Fable's always-on thinking COMBINED; only ACTUAL output is billed, so a higher
 * ceiling never costs more — it only prevents truncation of a long turn.
 *
 * Sizing: the sample body is ~11K tokens of model-authored prose (the numeric
 * tables are Node-rendered in Mode B, not model output), and Fable's always-on
 * thinking at `high` effort can add tens of thousands more (§0.1 B4 pessimistic
 * ceiling ~60K total output). Fable 5 / Opus 4.8 HARD MAX output = 128,000 tok
 * (verified, claude-api skill). 96,000 = 75% of that hard cap: comfortable
 * headroom over the ~60K pessimistic ceiling so an 18-26pp document + heavy
 * thinking never truncates, while staying clear of the ceiling. Re-tune against
 * the measured OUTPUT tokens from the owner cost smoke.
 */
export const REPORT_MAX_TOKENS = 96_000;

/** A/B attribution tag for the report surface (mirrors R5's per-surface tags). */
const REPORT_PROMPT_VERSION = 'report.v1';

/** Bundled confidential generation prompt (D8 — committed, read at runtime). */
const PROMPT_FILE = 'Revelia_Complete_Reading_Generation_Prompt_v1.md';

/**
 * Per-model $/MTok rates (claude-api skill, verified 2026-07-21). Used to estimate
 * the per-report cost from the served model's usage — logged + persisted from day
 * one (spec §4). Cache-read discounts are NOT applied (conservative estimate).
 */
const MODEL_RATES: Record<string, { inPer1M: number; outPer1M: number }> = {
  'claude-fable-5': { inPer1M: 10, outPer1M: 50 },
  'claude-opus-4-8': { inPer1M: 5, outPer1M: 25 },
};

// The synthesis call is injectable so the offline harness can MOCK Fable (no real
// spend) and the owner cost smoke uses the real one (default).
type SynthesizeFn = (opts: CreateSynthesisMessageOptions) => Promise<SynthesisMessageResult>;

let cachedPrompt: string | null = null;

/**
 * Load the confidential prompt as the SYSTEM prompt. Read bundled (D8): the file
 * is a committed server-side asset. Resolved robustly for both dev (ts-node,
 * __dirname = src/services) and a deployed source tree; cached after first read.
 *
 * ⚠️ PROD BUILD NOTE (owner-actions): `npm run build` is `tsc`, which does NOT copy
 * `.md` assets into `dist/`. Before `REPORT_WORKER_ENABLED` is flipped in prod,
 * either add a build asset-copy step for `src/prompts/*.md` or confirm `src/` ships
 * alongside `dist/` (the cwd/src fallback below relies on it). The worker is
 * prod-dark today, so this is a step-6+ gate, not a 5b blocker.
 */
function loadConfidentialPrompt(): string {
  if (cachedPrompt) return cachedPrompt;
  const candidates = [
    path.join(__dirname, '..', 'prompts', PROMPT_FILE), // dev: src/services → src/prompts
    path.join(process.cwd(), 'src', 'prompts', PROMPT_FILE), // deployed source tree
    path.join(process.cwd(), 'dist', 'prompts', PROMPT_FILE), // if build copies assets
  ];
  for (const candidate of candidates) {
    try {
      const text = fs.readFileSync(candidate, 'utf8');
      cachedPrompt = text;
      return text;
    } catch {
      // try the next candidate
    }
  }
  throw new Error(
    `[report.service] confidential prompt not found; tried: ${candidates.join(', ')}`
  );
}

/**
 * Resolve SUBJECT_NAME_AT_BIRTH (drives numerology). Mirrors the numerology
 * service's name hierarchy: the latest `NameAnalysis.fullName` (the name-destiny
 * source) beats the profile display name. The profile display name, when it
 * differs, is surfaced as the optional current-name overlay.
 */
async function resolveNames(
  userId: IReport['userId'],
  profileName: string | undefined
): Promise<{ nameAtBirth: string; currentName?: string }> {
  const latest = await NameAnalysis.findOne({ userId })
    .sort({ createdAt: -1 })
    .select('fullName')
    .lean();
  const analysisName = latest?.fullName?.trim();
  const displayName = (profileName || '').trim();

  const nameAtBirth = analysisName || displayName;
  const currentName =
    displayName && displayName !== nameAtBirth ? displayName : undefined;
  return { nameAtBirth, currentName };
}

/** Compute the per-report cost estimate ($) from the served model's usage. */
function estimateCost(result: SynthesisMessageResult): number {
  const rates = MODEL_RATES[result.model] ?? MODEL_RATES['claude-fable-5'];
  const inCost = (result.usage.inputTokens / 1_000_000) * rates.inPer1M;
  const outCost = (result.usage.outputTokens / 1_000_000) * rates.outPer1M;
  return Number((inCost + outCost).toFixed(4));
}

/**
 * Build the USER message: the §2 Inputs block (filled from the report + profile)
 * followed by the three injected JSON payloads the SYSTEM prompt consumes in Mode
 * B — ASTRONOMY_JSON (incl. `.derived`), NUMEROLOGY_JSON, PALM_OBSERVATIONS. No
 * FACE_PHOTO, no BIOGRAPHY (BLIND MODE), no third-party inputs (self-only, v1).
 */
function buildUserMessage(
  payload: ReportInjectPayload,
  meta: {
    preparedFor: string;
    dob: string; // YYYY-MM-DD
    tob: string;
    pob: string;
    subjectType: IReport['subjectType'];
    generatedDate: string;
  }
): string {
  const num = payload.numerology;
  const inputsBlock = [
    `SUBJECT_NAME_AT_BIRTH:      ${num.name_at_birth}`,
    `SUBJECT_CURRENT_NAME:       ${num.current_name ?? ''}`,
    `PREPARED_FOR_LINE:          ${meta.preparedFor}`,
    `DOB:                        ${meta.dob}`,
    `TOB:                        ${meta.tob}`,
    `POB:                        ${meta.pob}`,
    `SUBJECT_TYPE:               ${meta.subjectType}`,
    `BIOGRAPHY:                  (none, run BLIND MODE)`,
    `PATRIKA:                    (none)`,
    `FAMILY_CHARTS:              (none)`,
    `PALM_PHOTOS:                ${payload.palm.available ? 'provided' : 'none'}`,
    `PALM_OBSERVATIONS:          (see PALM_OBSERVATIONS JSON below)`,
    `FACE_PHOTO:                 none`,
    `EDITION_LINE:               Version 1 · ${meta.generatedDate}`,
    `GENERATED_DATE:             ${meta.generatedDate}`,
  ].join('\n');

  return [
    'Generate the Complete Reading for the following subject, consuming the injected',
    'payloads (Mode B). Do not recompute any astronomy or numerology value; present',
    'and interpret the provided numbers exactly as supplied.',
    '',
    'INPUTS',
    '------',
    inputsBlock,
    '',
    'ASTRONOMY_JSON',
    '--------------',
    JSON.stringify(payload.astronomy, null, 2),
    '',
    'NUMEROLOGY_JSON',
    '---------------',
    JSON.stringify(payload.numerology, null, 2),
    '',
    'PALM_OBSERVATIONS',
    '-----------------',
    JSON.stringify(payload.palm, null, 2),
  ].join('\n');
}

/** A best-effort, non-fragile highlights payload (no section parser — DO 2f). */
function buildHighlights(interpretation: string): IReport['highlights'] {
  const trimmed = interpretation.trim();
  // First sentence-ish (up to ~300 chars, cut at a sentence boundary if one falls early).
  const window = trimmed.slice(0, 300);
  const dot = window.indexOf('. ');
  const summary = (dot > 40 ? window.slice(0, dot + 1) : window).trim();
  return {
    headline: 'Your Personalized Cosmic Report',
    summary: summary || 'Your reading is ready.',
  };
}

/** Format the TOB display line (or a clear unknown/noon-default marker). */
function formatTob(input: NatalChartInput): string {
  const known = !input.timeIsAssumed && !!(input.time && input.time.trim());
  if (!known) return 'unknown (noon-defaulted at the place-of-birth timezone)';
  return `${input.time}${input.timezone ? ` ${input.timezone}` : ''}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** ISO date → "March 23, 1983" (UTC — the birth/generation display convention). */
function humanDate(d: Date): string {
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Bundle of everything the render/Fable steps need from the loaded self inputs. */
interface ReportContext {
  payload: ReportInjectPayload;
  renderMeta: RenderReportMeta;
  fableMeta: Parameters<typeof buildUserMessage>[1];
  system: string;
}

/** Call Fable (or the injected mock), persist { interpretation, nonce, cost }. */
async function synthesizeInterpretation(
  report: IReport,
  nonce: string,
  ctx: ReportContext,
  synthesize: SynthesizeFn
): Promise<{ interpretation: string; highlights: IReport['highlights'] }> {
  const reportId = report._id.toString();
  const userMessage = buildUserMessage(ctx.payload, ctx.fableMeta);

  const startedAt = Date.now();
  const result = await synthesize({
    surface: 'report',
    system: ctx.system,
    prompt: userMessage,
    maxTokens: REPORT_MAX_TOKENS,
    promptVersion: REPORT_PROMPT_VERSION,
  });
  const durationMs = Date.now() - startedAt;

  if (result.stopReason === 'max_tokens') {
    // Truncated → transient (bump the ceiling / retry). Surfaced as a plain Error
    // so the worker takes the RETRY path, not the fail-fast path.
    throw new Error(
      `[report.service] ${reportId} interpretation truncated (max_tokens=${REPORT_MAX_TOKENS}); ` +
        `output=${result.usage.outputTokens} tok`
    );
  }

  const interpretation = result.text;
  const costEstimate = estimateCost(result);
  const highlights = buildHighlights(interpretation);

  // Persist interpretation + nonce + cost/usage (spec §4). The nonce is stamped
  // HERE (atomically with the interpretation) so a re-claim reuses THIS receipt.
  await Report.updateOne(
    { _id: report._id },
    {
      $set: {
        interpretation,
        generationNonce: nonce,
        modelUsed: result.model,
        usage: {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        },
        costEstimate,
        highlights,
      },
    }
  );

  logger.info(
    `[report.service] ${reportId} interpretation: model=${result.model} fellBack=${result.fellBack} ` +
      `in=${result.usage.inputTokens} out=${result.usage.outputTokens} ` +
      `cost=$${costEstimate} durationMs=${durationMs} nonce=${nonce}`
  );

  return { interpretation, highlights };
}

/**
 * Generate a QA-passed, uploaded report for a claimed `generating` report.
 *
 * FLOW (step 7): load self inputs → build the validated inject payload → obtain
 * the interpretation (reuse the persisted one via the nonce short-circuit, or call
 * Fable) → RENDER the PDF (renderReportPdf, 6a) reusing the SAME inject payload →
 * QA-GATE the rendered PDF (qaReportPdf) → on PASS hand the buffer to the UPLOAD
 * SEAM → return the REAL { pdfKey, secureLink }. A QA-PASS + a real pdfKey is what
 * authorizes `ready`; the STUB sentinel no longer does.
 *
 * Render is deterministic Node/soffice compute (NO API $), so a re-claim
 * re-renders for FREE; only the Fable call is guarded by the nonce short-circuit.
 *
 * @param report  the claimed Report doc (status already `generating`).
 * @param deps    injectable deps (synthesize / uploadReportPdf / renderPdf / qa) —
 *                all default to the real impls; the offline harness swaps them.
 */
export async function generateReport(
  report: IReport,
  deps: GenerateReportDeps = {}
): Promise<{ highlights?: IReport['highlights']; pdfKey: string }> {
  const synthesize = deps.synthesize ?? createSynthesisMessage;
  const uploadReportPdf = deps.uploadReportPdf ?? defaultUploadReportPdf;
  const renderPdf = deps.renderPdf ?? renderReportPdf;
  const qa = deps.qa ?? qaReportPdf;

  const reportId = report._id.toString();

  // ── Load SELF inputs (needed for BOTH Fable and the renderer) ──────────────
  const profile = await UserProfile.findOne({ userId: report.userId });
  const birthDate = profile?.birthData?.date;
  if (!profile || !birthDate) {
    // Missing birth data won't fix on retry → fail-fast (terminal, no credit),
    // routed by the worker exactly like a payload validation failure.
    throw new ReportInjectValidationError(
      'astronomy',
      `birth data missing for self report ${reportId} (userId=${report.userId})`
    );
  }

  const input: NatalChartInput = {
    date: birthDate instanceof Date ? birthDate : new Date(birthDate),
    time: profile.birthData.time ?? null,
    timezone: profile.birthData.location?.timezone ?? null,
    lat: profile.birthData.location?.lat ?? null,
    lng: profile.birthData.location?.lng ?? null,
    timeIsAssumed: profile.birthData.timeIsAssumed,
  };

  const { nameAtBirth, currentName } = await resolveNames(report.userId, profile.name);

  const palm: StoredPalmInput = {
    palmProfileResult: profile.palmProfileResult ?? null,
    palmDominantTraits: profile.palmDominantTraits ?? null,
    // Non-dominant is premium-only storage (UserProfile.ts); all report subjects
    // are paid (free is gated out at enqueue), so a stored value belongs to a
    // paid subject — surfaced as-is.
    palmNonDominantTraits: profile.palmNonDominantTraits ?? null,
  };

  // ── DO 7 — asOf-FAITHFUL rebuild anchor ────────────────────────────────────
  // A rebuild (DO 8) re-renders a report whose original `generatedAt` may be up
  // to 60 days old. The astronomy payload's DATED tables (dasha.current, transit
  // ingresses, Sade-Sati) are computed relative to `asOf`, so re-deriving them
  // for TODAY would DRIFT from the persisted prose = a correctness bug. Anchor
  // `asOf` to the original `generatedAt` when present (rebuild); use now on the
  // first generation (generatedAt not yet stamped).
  const asOf = report.generatedAt ? new Date(report.generatedAt) : new Date();

  // ── Build (or REUSE) the validated inject payload. Built ONCE per report and
  //    PERSISTED (DO 7 — additive, server-only) so a later rebuild renders from
  //    the ORIGINAL payload, never a today-recomputed one. On the first
  //    generation it may THROW ReportInjectValidationError → the worker's
  //    fail-fast path. Reused for the Fable USER message AND the renderer (DO 1 —
  //    do not rebuild). ────────────────────────────────────────────────────────
  let payload: ReportInjectPayload;
  if (report.injectPayload) {
    payload = report.injectPayload as unknown as ReportInjectPayload;
    logger.info(
      `[report.service] ${reportId} reusing PERSISTED inject payload (asOf-faithful rebuild/re-claim) — not recomputing`
    );
  } else {
    payload = await buildReportInjectPayload({
      input,
      nameAtBirth,
      dob: input.date,
      currentName,
      palm,
      asOf,
      currentYear: asOf.getUTCFullYear(),
    });
    // Persist immediately — durable even if Fable/render later crashes, so any
    // future rebuild is always faithful. ~10-20KB of JSON; server-only, never
    // in the DTO. Immune to a between-generation-and-rebuild engine/
    // NUMEROLOGY_VERSION change (persisting the full payload, not determinants).
    await Report.updateOne({ _id: report._id }, { $set: { injectPayload: payload } });
    logger.info(
      `[report.service] ${reportId} persisted inject payload for faithful rebuild (DO 7)`
    );
  }

  const cityCountry =
    [profile.birthData.location?.city, profile.birthData.location?.country]
      .filter(Boolean)
      .join(', ') || 'unknown';
  const pob =
    [
      cityCountry !== 'unknown' ? cityCountry : '',
      profile.birthData.location?.lat != null && profile.birthData.location?.lng != null
        ? `${profile.birthData.location.lat}, ${profile.birthData.location.lng}`
        : '',
    ]
      .filter(Boolean)
      .join(' + ') || 'unknown';

  const ctx: ReportContext = {
    payload,
    system: loadConfidentialPrompt(),
    fableMeta: {
      preparedFor: profile.name || nameAtBirth,
      dob: input.date.toISOString().split('T')[0],
      tob: formatTob(input),
      pob,
      subjectType: report.subjectType,
      generatedDate: asOf.toISOString().split('T')[0],
    },
    renderMeta: {
      preparedFor: profile.name || nameAtBirth,
      dobDisplay: humanDate(input.date),
      tobDisplay: formatTob(input),
      pobDisplay: cityCountry,
      generatedDate: humanDate(asOf),
      subjectType: report.subjectType,
    },
  };

  // ── Obtain the interpretation: reuse the persisted one (nonce idempotency
  //    short-circuit — Fable NOT called), or synthesize it. ────────────────────
  let interpretation: string;
  let highlights = report.highlights;
  if (report.interpretation && report.interpretation.trim()) {
    interpretation = report.interpretation;
    logger.info(
      `[report.service] ${reportId} short-circuit: reusing persisted interpretation ` +
        `(nonce=${report.generationNonce ?? 'none'}) — Fable NOT called; re-render is free`
    );
  } else {
    const nonce = report.generationNonce ?? randomUUID();
    const syn = await synthesizeInterpretation(report, nonce, ctx, synthesize);
    interpretation = syn.interpretation;
    highlights = syn.highlights;
  }

  // ── RENDER → QA → bounded repair loop (DO 4) ───────────────────────────────
  // CONTENT fail → re-Fable (nonce bump; bounded by MAX_QA_REGEN — a fresh spend).
  // RENDER fail  → re-render only (no re-Fable, no spend; bounded by MAX_RENDER_RETRY).
  let fableRegens = 0;
  let renderRetries = 0;
  let renderMs = 0;
  let pdf: Buffer | null = null;
  // DO 4 (page-count decision = SURFACE ADDITIVELY): the QA gate already computes
  // the page count deterministically; capture it on the passing verdict and
  // persist it so the mobile Ready meta can show "{pageCount} pages" without the
  // client fabricating a count. Server-computed, additive to the DTO.
  let pageCount: number | undefined;

  // Re-Fable helper for the CONTENT path (fresh nonce → defeats the short-circuit).
  const reFable = async (): Promise<void> => {
    fableRegens++;
    const nonce = randomUUID();
    const syn = await synthesizeInterpretation(report, nonce, ctx, synthesize);
    interpretation = syn.interpretation;
    highlights = syn.highlights;
  };

  // Terminal QA failure → persist the verdict + throw (worker → failed + refund).
  const failQa = async (
    failures: import('./report-render.service').QaFailure[],
    failureClass: import('./report-render.service').QaFailureClass
  ): Promise<never> => {
    await Report.updateOne(
      { _id: report._id },
      {
        $set: {
          qa: {
            pass: false,
            failures: failures.map((f) => `${f.check}[${f.class}]: ${f.detail}`),
            failureClass,
          },
          renderDurationMs: renderMs,
        },
      }
    );
    logger.error(
      `[report.service] ${reportId} QA FAILED (${failureClass}) after ` +
        `fableRegens=${fableRegens}/${MAX_QA_REGEN} renderRetries=${renderRetries}/${MAX_RENDER_RETRY}`
    );
    throw new ReportQaFailedError(failures, failureClass);
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // 1) Render (reusing the SAME payload). A malformed manifest (ReportContractError)
    //    is a CONTENT deficiency; a toolchain failure (ReportRenderError) is transient
    //    and propagates to the worker's retry path.
    try {
      const t0 = Date.now();
      pdf = await renderPdf({
        interpretation,
        astronomy: payload.astronomy,
        numerology: payload.numerology,
        palm: payload.palm,
        meta: ctx.renderMeta,
      });
      renderMs = Date.now() - t0;
    } catch (err) {
      if (err instanceof ReportContractError) {
        const failure = { check: 'contract', class: 'CONTENT' as const, detail: err.message };
        if (fableRegens < MAX_QA_REGEN) {
          logger.warn(`[report.service] ${reportId} QA contract-error → re-Fable (${fableRegens + 1}/${MAX_QA_REGEN})`);
          await reFable();
          continue;
        }
        return failQa([failure], 'CONTENT');
      }
      throw err; // ReportRenderError / unexpected → transient → worker retry path
    }

    // 2) QA gate the rendered PDF.
    const verdict = await qa(pdf, { interpretation, subjectType: report.subjectType });
    logger.info(
      `[report.service] ${reportId} QA verdict: pass=${verdict.pass} class=${verdict.failureClass} ` +
        `pages=${verdict.facts.pageCount} images=${verdict.facts.imageCount} words=${verdict.facts.wordCount} ` +
        `failures=[${verdict.failures.map((f) => f.check).join(',')}] lib=${verdict.facts.lib}`
    );
    if (verdict.pass) {
      pageCount = verdict.facts.pageCount;
      break;
    }

    // 3) Route by class (A2). CONTENT → re-Fable (bounded); RENDER → re-render (bounded).
    if (verdict.failureClass === 'CONTENT') {
      if (fableRegens < MAX_QA_REGEN) {
        logger.warn(`[report.service] ${reportId} QA CONTENT fail → re-Fable (${fableRegens + 1}/${MAX_QA_REGEN})`);
        await reFable();
        continue;
      }
    } else if (renderRetries < MAX_RENDER_RETRY) {
      renderRetries++;
      logger.warn(`[report.service] ${reportId} QA RENDER fail → re-render only, no spend (${renderRetries}/${MAX_RENDER_RETRY})`);
      continue;
    }
    return failQa(verdict.failures, verdict.failureClass);
  }

  // ── QA PASSED → UPLOAD SEAM → real pdfKey (authorizes `ready`) ──────────────
  const { pdfKey } = await uploadReportPdf(pdf, report);

  await Report.updateOne(
    { _id: report._id },
    { $set: { qa: { pass: true, failures: [] }, renderDurationMs: renderMs, highlights, pageCount } }
  );
  logger.info(
    `[report.service] ${reportId} QA PASS → uploaded pdfKey=${pdfKey} renderDurationMs=${renderMs}`
  );

  return { highlights, pdfKey };
}

/**
 * ── REPORT-READY EMAIL (step 8, DELIVERY MODEL — pin B) ───────────────────────
 * Fire the one-time "your report is ready" notification, BEST-EFFORT +
 * PERSISTED-FLAG idempotent. Called by the worker AFTER the `ready` write.
 *
 * ⚠️ IDEMPOTENCY = a PERSISTED `reportEmailSentAt` (NOT an in-memory guard — that
 * would re-email on restart/redeploy). The flag is claimed ATOMICALLY and
 * CHECKED-BEFORE-SENDING in a single write:
 *   updateOne({ _id, status:'ready', reportEmailSentAt:{$exists:false} },
 *             { $set:{ reportEmailSentAt: now } })
 * We send ONLY if that write matched (modifiedCount === 1). A concurrent tick /
 * a redeploy loses the race → matches nothing → does NOT re-send. Set-then-send
 * (a send failure does NOT roll the flag back): the report is `ready` +
 * downloadable in-app regardless, so a lost email is acceptable; a double-send is
 * not. An email failure is LOGGED and swallowed — it never un-`ready`s or fails
 * the report.
 *
 * Returns a small status for the harness ('sent' | 'skipped' | 'failed' | 'no-recipient').
 *
 * Injectable deps (real defaults): `sendEmail` (email.service.sendReportEmail),
 * `signUrl` (report-delivery.getReportSignedUrl) — the harness swaps them.
 */
export interface DeliverReportEmailDeps {
  sendEmail?: (
    to: string,
    secureLink: string,
    opts?: { name?: string; headline?: string }
  ) => Promise<boolean>;
  signUrl?: (pdfKey: string, ttlSeconds: number) => Promise<string>;
}

export async function deliverReportReadyEmail(
  report: Pick<IReport, '_id' | 'userId' | 'pdfKey' | 'highlights'>,
  deps: DeliverReportEmailDeps = {}
): Promise<'sent' | 'skipped' | 'failed' | 'no-recipient'> {
  const sendEmail = deps.sendEmail ?? sendReportEmail;
  const signUrl = deps.signUrl ?? getReportSignedUrl;
  const reportId = report._id.toString();

  if (!report.pdfKey || report.pdfKey === PDF_KEY_STUB) {
    // No real stored PDF → nothing to link. (Should not happen post-`ready`.)
    return 'skipped';
  }

  // ⚠️ ATOMIC CLAIM — set the flag ONLY if absent AND the report is `ready`; send
  // ONLY if this write matched. This is the single guard against a double-send.
  const claim = await Report.updateOne(
    { _id: report._id, status: 'ready', reportEmailSentAt: { $exists: false } },
    { $set: { reportEmailSentAt: new Date() } }
  );
  if (claim.modifiedCount !== 1) {
    logger.info(`[report.service] ${reportId} report-ready email already sent/claimed — not re-sending`);
    return 'skipped';
  }

  // Load the recipient from the User (email lives on User, not the profile).
  const user = await User.findById(report.userId).select('email name').lean<{ email?: string; name?: string } | null>();
  const to = user?.email?.trim();
  if (!to) {
    logger.warn(`[report.service] ${reportId} report-ready email: no recipient email for user ${report.userId.toString()}`);
    return 'no-recipient';
  }

  try {
    const link = await signUrl(report.pdfKey, REPORT_EMAIL_LINK_TTL_SECONDS);
    const ok = await sendEmail(to, link, {
      name: user?.name,
      headline: report.highlights?.headline,
    });
    if (!ok) {
      logger.warn(`[report.service] ${reportId} report-ready email not sent (sendEmail returned false)`);
      return 'failed';
    }
    logger.info(`[report.service] ${reportId} report-ready email sent to ${to} (ttl=${REPORT_EMAIL_LINK_TTL_SECONDS}s)`);
    return 'sent';
  } catch (err) {
    // Best-effort: an email failure NEVER un-`ready`s or fails the report.
    logger.error(
      `[report.service] ${reportId} report-ready email failed (report stays ready + downloadable in-app): ` +
        (err instanceof Error ? err.message : String(err))
    );
    return 'failed';
  }
}
