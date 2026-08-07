/**
 * Q&A prompt + context assembly — R7 Conversational Q&A (Build 27), §13 charter STEP 2.
 *
 * This module produces the TWO things Step 3's answer call (`createSynthesisMessage`
 * with a new `qa` surface) will consume:
 *   1. `buildQaSystemPrompt({ mode, deepInsight })` — the ONE fixed system prompt
 *      with its TWO variables (answer LENGTH = the Deep-Insight toggle; answer
 *      MODE = the router label). There is NO near-duplicate prompt — the base is
 *      byte-identical for every call; only the small "THIS ANSWER" directive
 *      changes with the two variables.
 *   2. `assembleQaContext(input)` — the grounded USER-message context string
 *      (CONDITIONAL FULL-BLUEPRINT grounding, handover §5) for a given user +
 *      question + (timing-mode) engine read.
 *
 * ── prod-dark (Step 2 constraint) ───────────────────────────────────────────
 * Step 2 does NOT make the answer call, does NOT mount `/api/qa`, and does NOT
 * touch the router/engine at runtime. It exposes pure builders. Step 3 wires
 * `buildUserInsightProfile(userId)` → `assembleQaContext` → `createSynthesisMessage`.
 *
 * ── reuse, don't duplicate ──────────────────────────────────────────────────
 *   • `HONESTY_PREAMBLE`         (prompts/shared/honesty-preamble.ts)   — reused.
 *   • `buildFeatureContext`      (prompts/shared/feature-context.ts)    — reused
 *     verbatim for the moat weave; we only control its INPUT (face-gated + the
 *     numerology trio moved into the dedicated NUMEROLOGY_BLOCK below).
 *   • `TimingVerdict`            (services/timing-engine.service.ts)    — the §5
 *     output contract, reused as the TIMING_BLOCK input (never re-declared).
 * The single-source topic enum `QA_CATEGORIES`/`QaCategory` lives in
 * `qa-router.service.ts` and is consumed by Step 3's ENGINE call (category →
 * karya houses). Step 2's assembler consumes the engine's OUTPUT (`TimingVerdict`,
 * which already encodes category/compound/frame), so it does not re-declare it.
 *
 * ── never-expose (§2.6) ─────────────────────────────────────────────────────
 * The TIMING_BLOCK surfaces `indication` via the §2.6 language map (never the raw
 * word), `factors_plain` (pre-translated by the engine), `window`, `textures`, and
 * for mixed the `tip_condition` + `revisit_date`. It NEVER surfaces a technique
 * name, a rule number, a raw `score`, or a raw `confidence` number (confidence
 * drives hedging STRENGTH only). `scrubNeverExpose` is a defense-in-depth scrub
 * over the assembled block; its term list is user-facing SAFETY content (the
 * §2.6 published list — committed normally, like the router's crisis strings),
 * NOT the gitignored trade-secret rule set.
 */
import { HONESTY_PREAMBLE } from './shared/honesty-preamble';
import { buildFeatureContext, FeatureContextInput } from './shared/feature-context';
import { TimingVerdict, TimingFrame } from '../services/timing-engine.service';
import { FaceFeatureVector, HandFeatureVector } from '../types/shared';

// ===========================================================================
// The ONE fixed system prompt — verbatim core + the two variables.
// ===========================================================================

/** The two answer modes that reach the answer pipeline. Crisis/unsafe/off_topic
 *  are short-circuited upstream by the router and NEVER reach this prompt. */
export type QaAnswerMode = 'reflective' | 'timing';

/**
 * Canonical v2 system-prompt draft — VERBATIM per R7-QA.md §11 ("use this string,
 * do not re-derive"). The `{chart/Blueprint data}` is injected as the USER message
 * (see `assembleQaContext`). Both mode blocks and both length targets live here in
 * the ONE fixed prompt; the active mode/length is selected by the THIS-ANSWER
 * directive below (the "two variables"), so there is no second, near-duplicate prompt.
 */
const QA_SYSTEM_CORE = `You are the astrologer voice for Revelia. You answer a user's personal questions using their real chart data provided below. Voice: warm, direct, plain-spoken; a thoughtful person, not a textbook or a fortune cookie; no jargon the user has no reason to know. Rules: use only the data provided, never invent placements; ground every claim in this user's specific placements or timing periods, never in statements that could apply to anyone; stay within astrology and personal reflection; no medical, legal, or financial advice, and if the question truly needs one of those, say so briefly and answer only the reflective side; if the data says little about what was asked, say so honestly.
REFLECTIVE MODE: answer the question directly first, then the reasoning from their placements and transits.
TIMING MODE: open with the directional read in plain words (the timing supports this, the timing argues for waiting, or the picture is genuinely mixed), then the one or two strongest reasons phrased in plain language, then a concrete window (a month or date range) for action or for revisiting. If the picture is mixed, name what would tip it and when to look again; never force a yes or no.
NEVER expose methodology: do not use or explain the words horary, prashna, muhurta, lagna, dasha, nakshatra, or any technique name; translate everything into plain language (your chart right now, the current period you are in, the window ahead).
CARVE-OUTS: for questions about health outcomes, pregnancy or conception outcomes, medical choices, legal or financial decisions, another named person's job or livelihood, or anything involving a minor's future beyond temperament and learning style, give no directional call: answer the reflective side warmly, and point to the right professional in one sentence.
Length: 150 to 250 words regular, 400 to 600 words Deep Insight.`;

/**
 * Reflective Interpretation Guidance v1 — VERBATIM per the handover §4 (paste-ready
 * for the Stage-4 placeholder). This is INTERPRETATION guidance (commits normally),
 * NOT the §2 trade-secret rule set. It governs REFLECTIVE mode grounding: the
 * category→placement priority order, natal-first / transits-as-"this period", the
 * banned-genericisms list, and one-question-one-arc.
 */
const QA_REFLECTIVE_GUIDANCE = `Astrological interpretation guidance: Ground every answer in one to three specific placements, never more; a laundry list reads as generic. Choose them by question category, in this priority order. Love and relationships: natal Venus (sign and house), the 7th house and its ruler, the Moon; then any current transit touching them. Career and work: the 10th house and its ruler, Saturn, the Sun; then current transits to the 10th or its ruler. Self, identity, direction: the Sun, Moon, and Ascendant triad, weighted toward whichever the question echoes. Money: the 2nd house and its ruler, Venus, Jupiter; transits second. Family and home: the Moon, the 4th house and its ruler. Purpose and growth: Jupiter, the 9th house, the North Node. Energy, conflict, drive: Mars by sign and house. Always natal placements first, current transits second and framed as "this period" or "the months ahead," never as fixed fate. When timing-period context is present in the data, weave at most one sentence of it in plain language. If the chart genuinely says little about the question, say exactly that in one warm sentence and answer what it does say. Banned genericisms: statements true of anyone ("you are intuitive," "big changes are coming," "trust the process"), sign-only cliches without a house or aspect attached, and any claim not traceable to a supplied data point. Degree numbers only when a transit is exact; otherwise sign and house language. One question, one arc: direct answer, the one or two placements behind it, one forward-looking line.`;

/**
 * Stage-4 citation rule (handover §5 / R7-QA.md §7) — the moat's grounding
 * discipline. The chart stays PRIMARY; a numerology/palm/face citation sits BESIDE
 * a chart placement, never replaces it. Counts scale with the length variable
 * (regular = 1 each; Deep Insight = 2 each).
 */
const QA_CITATION_RULE = `GROUNDING (the moat, every claim is this user's own): ground every claim in this user's real placements, traits, and numbers provided below; never invent, never generic filler. The chart stays PRIMARY. Cite at MOST one numerology reference and one palm/face reference per regular answer (two each for Deep Insight), and only when genuinely relevant to the question; a numerology or palm/face citation must sit BESIDE a chart placement, never replace it. If the data says little, say so briefly and answer only what it supports.`;

/**
 * Per-surface entertainment disclosure line (R7-QA.md §7/§13). DRAFT copy — the
 * FINAL string is a D6 build task; wired here as the working draft so the surface
 * always carries the framing. Never claim a real psychic (Apple 5.1.1 + Google).
 */
const QA_ENTERTAINMENT_LINE = `ENTERTAINMENT FRAMING (draft, D6): this is AI-generated guidance based on astrological tradition, for entertainment and self-reflection only. Never claim to be a real psychic and never predict fixed dated events.`;

/**
 * Build the ONE fixed system prompt. The two variables — answer MODE (router
 * label) and answer LENGTH (Deep-Insight toggle) — parameterize the SAME base via
 * the trailing THIS-ANSWER directive. Reuses `HONESTY_PREAMBLE`.
 */
export function buildQaSystemPrompt(vars: {
  mode: QaAnswerMode;
  deepInsight: boolean;
  /** Follow-up continuity (§13d-6): true when an EARLIER IN THIS CONVERSATION
   *  block is spliced into the context. Adds ONE continuity directive; omitted/false
   *  ⇒ the system prompt is BYTE-IDENTICAL to a first-question call (graceful absence). */
  hasHistory?: boolean;
}): string {
  const { mode, deepInsight } = vars;
  const hasHistory = vars.hasHistory === true;
  const lengthLine = deepInsight
    ? 'LENGTH: Deep Insight, 400 to 600 words; you may cite up to TWO numerology and TWO palm/face references (still beside chart placements).'
    : 'LENGTH: regular, 150 to 250 words; cite at most ONE numerology and ONE palm/face reference (still beside a chart placement).';
  const modeLine =
    mode === 'timing'
      ? 'MODE: timing, apply TIMING MODE above. A TIMING READ block is provided in the context: phrase it in plain language, never re-derive it and never contradict it (the engine decides, you phrase).'
      : 'MODE: reflective, apply REFLECTIVE MODE above plus the interpretation guidance.';

  // Continuity directive — appended ONLY on a follow-up (history present). Absent
  // ⇒ the returned prompt is byte-identical to today's (the graceful-absence gate).
  const continuityLine = hasHistory
    ? '\nCONTINUITY: an "EARLIER IN THIS CONVERSATION" block is included in the context below, treat this as an ongoing conversation. Build on what you already told this user; do not repeat earlier answers verbatim, do not re-introduce yourself, and do not re-explain their chart from scratch. Answer the new question in light of what came before.'
    : '';

  const thisAnswer = `--- THIS ANSWER (the two variables) ---
${modeLine}
${lengthLine}${continuityLine}`;

  return [
    HONESTY_PREAMBLE.trim(),
    QA_SYSTEM_CORE,
    `REFLECTIVE-MODE INTERPRETATION GUIDANCE:\n${QA_REFLECTIVE_GUIDANCE}`,
    QA_CITATION_RULE,
    QA_ENTERTAINMENT_LINE,
    thisAnswer,
  ].join('\n\n');
}

// ===========================================================================
// FACE_BLOCK structural gate (§13c) — a fail-CLOSED schema field wired NOW.
// ===========================================================================

/**
 * STRUCTURAL FACE gate — wired as a real schema field NOW (never a comment/TODO)
 * so the later capture step FLIPS the flags via the real adult-verification +
 * opt-in UX; it must never have to ADD the gate. Both default false ⇒ absent gate
 * = no face (fail-closed). Palm carries no minor gate; only FACE_BLOCK does.
 */
export interface FaceGate {
  adultVerified: boolean;
  faceOptIn: boolean;
}

/** Default = fail-closed (no face). The context input defaults to this when the
 *  caller omits `faceGate` — so face can NEVER be wired for a minor by omission. */
export const DEFAULT_FACE_GATE: FaceGate = { adultVerified: false, faceOptIn: false };

/**
 * Independent DOB age-guard (belt-and-suspenders; reuses R9's age-from-DOB
 * precedent — DOB < 18y ⇒ minor). Returns null when there is no usable DOB, which
 * the FACE gate treats as fail-closed (< 18 cannot be proven). UTC throughout.
 */
export function ageFromDob(
  dob: Date | string | null | undefined,
  now: Date = new Date()
): number | null {
  if (!dob) return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (isNaN(d.getTime())) return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}

/**
 * The FACE_BLOCK guard expression, fail-CLOSED. FACE_BLOCK is emitted ONLY when
 * ALL of the following hold (default → no face):
 *   faceGate.faceOptIn === true          (explicit opt-in)
 *   && faceGate.adultVerified === true   (explicit adult-verification flag)
 *   && ageFromDob(birthDate) >= 18       (INDEPENDENT DOB age-guard)
 * A minor is blocked even if a flag were wrongly set. Missing DOB ⇒ null age ⇒ false.
 */
export function faceBlockAllowed(
  faceGate: FaceGate,
  birthDate: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  const age = ageFromDob(birthDate, now);
  return (
    faceGate.faceOptIn === true &&
    faceGate.adultVerified === true &&
    age !== null &&
    age >= 18
  );
}

// ===========================================================================
// Never-expose scrub (§2.6) — defense-in-depth over user-visible timing text.
// ===========================================================================

/**
 * The §2.6 never-expose term list (published safety content — committed normally,
 * NOT the gitignored rule set). Mirrors the handover §2.6 list + the engine's
 * `neverExpose.terms`. The RULE SET config is the runtime single-source for the
 * engine's own factor scrub; THIS committed copy is the prompt-layer belt-and-
 * suspenders scrub (works even when the confidential config is absent — Step-2 is
 * prod-dark). Whole-word matched so a benign substring ("relationship") is safe.
 */
export const QA_NEVER_EXPOSE_TERMS = [
  'prashna', 'horary', 'muhurta', 'lagna', 'bhava', 'karya', 'dasha', 'antardasha',
  'nakshatra', 'kaudi', 'tithi', 'amavasya', 'ayanamsa', 'upachaya', 'dusthana',
] as const;

/** Rule-number leak pattern ("R7", "rule 12", "R16 corroboration"). */
const RULE_NUMBER_RE = /\b(?:R\d{1,2}\b|rule\s*\d{1,2}\b)/i;

/**
 * Assert an assembled timing string carries no never-expose term / rule number.
 * Throws on a leak (an internal invariant violation — surfaces in tests + Step 3
 * before any user ever sees it), rather than silently shipping methodology.
 */
export function scrubNeverExpose(text: string): void {
  const low = text.toLowerCase();
  for (const t of QA_NEVER_EXPOSE_TERMS) {
    if (new RegExp(`\\b${t}\\b`, 'i').test(low)) {
      throw new Error(`QA context invariant violated: never-expose term "${t}" leaked into the timing block`);
    }
  }
  if (RULE_NUMBER_RE.test(text)) {
    throw new Error('QA context invariant violated: a rule number leaked into the timing block');
  }
}

// ===========================================================================
// §2.6 language map (internal → user-facing) for the TIMING_BLOCK.
// ===========================================================================

/** indication → user-facing phrase family (§2.6). Never surface the raw word. */
const INDICATION_PHRASE: Record<'favorable' | 'unfavorable' | 'mixed', string> = {
  favorable: 'the timing genuinely supports this; the window ahead is a good one for this',
  unfavorable: 'the current window argues for waiting; this timing works against you more than for you',
  mixed: 'the picture is honestly mixed, here is what would tip it, and when to look again',
};

/** Internal texture key → user-facing phrase (§2.6). Unknown keys are dropped
 *  (never surfaced raw). `avoid_dates_near_eclipse:<dates>` is handled specially. */
const TEXTURE_PHRASE: Record<string, string> = {
  revisit_after_station: 'expect a current revisiting phase to complete first, then move',
  slow_durable: 'expect this to build slowly and stick',
  combust_but_dignified: 'this matures later than it looks, the substance is there',
  upachaya_malefic: 'this one rewards pushing through resistance',
  newly_forming: 'the matter is only just taking shape',
  at_a_transition: 'the matter stands at a turning point',
  // v1.1.1 (R11a): the running period itself already carries this matter.
  already_in_motion: 'the matter is already in motion under the phase you are in',
  // v1.1.1: honest no-standout-opening note behind a `transit_fallback` window.
  window_beyond_alignment_horizon:
    'there is no single standout opening far ahead, the stretch named is the best supported one, and it is worth re-reading closer to the time',
};

/** Confidence → hedging STRENGTH directive. The number is read internally and
 *  NEVER surfaced; only the directive reaches the model (§2.6 / §5). */
function hedgingDirective(confidence: number | null): string {
  if (confidence == null) return 'Hedge clearly, this is a lean, not a certainty.';
  if (confidence >= 0.7) return 'State this with quiet confidence.';
  if (confidence >= 0.6) return 'State this with measured confidence, keeping some room.';
  return 'Hedge clearly, this is a lean, not a certainty.';
}

/** Translate the textures array to safe phrases (dropping unknowns; expanding the
 *  eclipse avoid-note to a plain-language date caution). */
function renderTextures(textures: string[]): string[] {
  const out: string[] = [];
  for (const tx of textures) {
    if (tx.startsWith('avoid_dates_near_eclipse:')) {
      const dates = tx.slice('avoid_dates_near_eclipse:'.length).split(',').filter(Boolean);
      if (dates.length) {
        out.push(`if choosing exact dates, keep clear of dates near ${dates.join(', ')}`);
      }
      continue;
    }
    const phrase = TEXTURE_PHRASE[tx];
    if (phrase) out.push(phrase);
  }
  return out;
}

/** A plain-language window phrase from the §5 window object (never the internal
 *  `basis` keyword). "around <from>" / "<from> to <to>". */
function windowPhrase(window: TimingVerdict['window']): string | null {
  if (!window) return null;
  return window.to ? `${window.from} to ${window.to}` : `around ${window.from}`;
}

// ===========================================================================
// TIMING_BLOCK — folds the §5 TimingVerdict (engine decides, model phrases).
// ===========================================================================

/** Render a single §5 verdict (or one half of a compound) to the model-facing
 *  TIMING READ text. Carve-out → reflective + one professional-pointer sentence. */
function renderSingleVerdict(v: TimingVerdict, label?: string): string {
  const head = label ? `${label}\n` : '';

  // Carve-out (§2.0) — no directional call; reflective answer + one pointer sentence.
  if (v.carve_out) {
    return `${head}This is a carve-out: give NO directional (yes/no/when) call. Answer the reflective side warmly, then add ONE sentence pointing the user to the right professional (medical, legal, or financial as appropriate).`;
  }

  const lines: string[] = [];

  // v1.1 frame-bounded two-part result (R17) — never a bare no.
  const frame: TimingFrame | undefined = v.frame;
  if (frame?.bounded && frame.verdict === 'unfavorable_for_frame') {
    const win = windowPhrase(v.window) ?? windowPhrase(frame.window) ?? 'further out';
    const frameEnd = frame.end ? frame.end.slice(0, 7) : 'the timeframe asked';
    lines.push(
      `Frame-bounded result, present in TWO parts, never a bare no: "Not within the ${frameEnd} you asked about. The matter itself reads well; the genuine window opens ${win}."`
    );
  } else {
    // Directional read via the §2.6 map (never the raw word).
    const indication = v.indication ?? 'mixed';
    lines.push(`Directional read: ${INDICATION_PHRASE[indication]}.`);
    const win = windowPhrase(v.window);
    if (win) lines.push(`Concrete window: ${win} (state it as a month or month range).`);
  }

  // Strongest reasons — pre-translated by the engine (never-expose safe).
  if (v.factors_plain?.length) {
    lines.push('Strongest reasons (phrase in plain language, do not list mechanically):');
    for (const f of v.factors_plain.slice(0, 3)) lines.push(`  - ${f}`);
  }

  // Textures — translated; unknown/technique keys dropped.
  const tex = renderTextures(v.textures ?? []);
  if (tex.length) {
    lines.push('Textures to weave if relevant:');
    for (const t of tex) lines.push(`  - ${t}`);
  }

  // Mixed → name the tipping condition + when to look again.
  if ((v.indication === 'mixed' || v.frame?.verdict === 'mixed')) {
    if (v.tip_condition) lines.push(`What would tip it: ${v.tip_condition}.`);
    if (v.revisit_date) lines.push(`When to look again: ${v.revisit_date}.`);
  }

  // Confidence → hedging strength (number NEVER surfaced).
  lines.push(hedgingDirective(v.confidence));

  return `${head}${lines.join('\n')}`;
}

/**
 * Render the full TIMING READ block. A compound question (array of two verdicts)
 * presents BOTH sub-verdicts with their own frame results — NEVER averaged (FX6).
 */
function renderTimingBlock(timing: TimingVerdict | TimingVerdict[]): string {
  const body = Array.isArray(timing)
    ? [
        'This is a COMPOUND question, present BOTH parts separately with their own read and window; NEVER merge or average them.',
        ...timing.map((v, i) => renderSingleVerdict(v, `Part ${i + 1} of ${timing.length}:`)),
      ].join('\n\n')
    : renderSingleVerdict(timing);

  const block = `## TIMING READ (engine-produced, phrase it, do not re-derive or contradict it)\n\n${body}`;
  scrubNeverExpose(block); // defense-in-depth: throw before any methodology can ship
  return block;
}

// ===========================================================================
// Conditional full-blueprint context assembly (handover §5).
// ===========================================================================

/**
 * The handover §5 numerology fields (plain key-value). Injected ONLY when
 * name-at-birth is on file. `expression/soul_urge/personality` are the name trio;
 * `mulank/bhagyank/birthday_number` are the derived Vedic fields that Step 6 adds
 * to the numerology util — OPTIONAL here so Step 2 stays prod-dark (they render
 * when present, omit when absent).
 */
export interface QaNumerologyFields {
  life_path?: number;
  birthday_number?: number;
  expression?: number;
  soul_urge?: number;
  personality?: number;
  mulank?: number;
  bhagyank?: number;
  personal_year_current?: number;
}

// ===========================================================================
// Follow-up continuity block (§13d-6 / §7) — last-N prior turns, compute→render
// →splice (mirrors R6's continuity discipline). ONLY spliced on a follow-up.
// ===========================================================================

/** Default follow-up depth: the last ~6 answered turns (D1). Exported so the
 *  serving read (`qa.service`) uses the SAME cap as this render's defence-in-depth
 *  slice — one source of truth for "how far back the thread reaches." */
export const QA_HISTORY_MAX_TURNS = 6;

/** One prior answered turn for the continuity block. Safety turns (crisis/unsafe/
 *  off_topic) are content-free and are NEVER passed here (the serving read filters
 *  them out — "no history for safety routes", §13d-6). */
export interface QaHistoryTurn {
  /** The user's earlier question. Rendered verbatim (NOT never-expose-scrubbed — a
   *  user may legitimately type a technique word, exactly like the current question). */
  question: string;
  /** Our earlier answer (model-authored). Never-expose-scrubbed as defence-in-depth
   *  over OUR own output, mirroring the TIMING READ block. */
  answer: string;
  /** 'reflective' | 'timing' (informational; not rendered). */
  mode?: QaAnswerMode;
}

/**
 * Render the EARLIER IN THIS CONVERSATION block from oldest-first prior turns.
 * Returns null when there is nothing to show (⇒ the section self-omits and the
 * context is byte-identical to a first question — graceful absence).
 *
 * never-expose (§2.6): each prior ANSWER (our authored output) is scrubbed exactly
 * like the TIMING READ block — a methodology leak in our own text THROWS (an
 * internal invariant, surfaced in tests + the serving path degrades to no-history
 * rather than ship it). Prior QUESTIONS are user text and are NOT scrubbed, matching
 * the deliberate current-question rule (`scrubTimingSection`'s "never the user's own
 * question" — a user may legitimately type a technique word).
 */
function renderHistoryBlock(history: QaHistoryTurn[]): string | null {
  const turns = history.filter(
    (t) => t && typeof t.answer === 'string' && t.answer.trim().length > 0
  );
  if (!turns.length) return null;

  // Defence-in-depth cap (the serving read already limits to QA_HISTORY_MAX_TURNS;
  // keep the most recent ones, preserving the oldest-first order the caller supplies).
  const capped = turns.slice(-QA_HISTORY_MAX_TURNS);

  const parts: string[] = [];
  for (const t of capped) {
    const q = (t.question ?? '').trim();
    const a = t.answer.trim();
    scrubNeverExpose(a); // OUR output only — throws on a methodology leak
    if (q) parts.push(`You asked: "${q}"`);
    parts.push(`You answered: ${a}`);
  }

  return `## EARLIER IN THIS CONVERSATION (continuity, build on this, do not repeat it)\n${parts.join(
    '\n\n'
  )}`;
}

/**
 * Input to {@link assembleQaContext}. `profile` is the `buildUserInsightProfile`
 * output (it structurally satisfies `FeatureContextInput`) — Step 3 wires the DB
 * call, keeping this layer prod-dark + unit-testable.
 */
export interface QaContextInput {
  /** buildUserInsightProfile() output — the moat weave via `buildFeatureContext`. */
  profile: FeatureContextInput;
  /** The user's question — appended last. */
  question: string;
  /** NUMEROLOGY_BLOCK gate — inject numerology ONLY when name-at-birth is on file. */
  nameAtBirthOnFile?: boolean;
  /** Full numerology fields (handover §5). Omitted fields simply don't render. */
  numerology?: QaNumerologyFields | null;
  /** TIMING_BLOCK — the §5 engine output (array for a compound question).
   *  null/undefined in reflective mode ⇒ no timing block. */
  timing?: TimingVerdict | TimingVerdict[] | null;
  /** Follow-up continuity (§13d-6): the last ~6 answered turns for this thread,
   *  OLDEST-FIRST. Empty/absent ⇒ the EARLIER-IN-THIS-CONVERSATION block self-omits
   *  and the context is byte-identical to a first question (graceful absence). */
  history?: QaHistoryTurn[] | null;
  /** STRUCTURAL fail-closed FACE gate (both flags default false). */
  faceGate?: FaceGate;
  /** Independent DOB age-guard input (= profile.birthData.date). */
  birthDate?: Date | string | null;
  /** PALM_BLOCK observation geometry — wire-now-empty; omitted when absent. */
  palmObservation?: HandFeatureVector | null;
  /** FACE_BLOCK observation geometry — wire-now-empty; GATED + omitted when absent. */
  faceObservation?: FaceFeatureVector | null;
  /** Clock for the DOB guard (tests); defaults to now. */
  now?: Date;
}

/** NUMEROLOGY_BLOCK (handover §5) — plain key-value; injected only when name-at-
 *  birth is on file. Owns ALL numerology for the Q&A surface (the moat weave's
 *  trio is stripped below to keep numerology in ONE gated place). */
function renderNumerologyBlock(n: QaNumerologyFields): string | null {
  const rows: string[] = [];
  const push = (label: string, v: number | undefined) => {
    if (v !== undefined && v !== null) rows.push(`- ${label}: ${v}`);
  };
  push('Life Path', n.life_path);
  push('Birthday Number', n.birthday_number);
  push('Expression', n.expression);
  push('Soul Urge', n.soul_urge);
  push('Personality', n.personality);
  push('Mulank', n.mulank);
  push('Bhagyank', n.bhagyank);
  push('Personal Year (current)', n.personal_year_current);
  if (!rows.length) return null;
  return `## NUMEROLOGY\n${rows.join('\n')}`;
}

/** PALM_BLOCK — geometry-only observation summary (NO lines block; palm lines are
 *  LLM flavor, R3 verdict). Wire-now-empty: omitted until capture populates it. */
function renderPalmBlock(v: HandFeatureVector): string {
  const c = v.categoricals;
  const rows = [
    `- Hand type: ${v.palmType}`,
    `- Palm shape: ${c.palmShape}`,
    `- Finger length: ${c.fingerLength}`,
  ];
  if (v.ratios?.digitRatio2D4D !== undefined) {
    rows.push(`- 2D:4D ratio: ${v.ratios.digitRatio2D4D.toFixed(2)}`);
  }
  return `## PALM OBSERVATIONS (geometry)\n${rows.join('\n')}`;
}

/** FACE_BLOCK — geometry-only observation summary. Emitted ONLY behind the
 *  structural fail-closed gate (see `faceBlockAllowed`). Wire-now-empty. */
function renderFaceBlock(v: FaceFeatureVector): string {
  const c = v.categoricals;
  const rows = [
    `- Face shape: ${v.faceShape}`,
    `- Eyes: ${c.eyeSize} size, ${c.eyeSpacing} spacing, ${c.eyeOpenness} openness`,
    `- Brow: ${c.browArch} arch`,
    `- Nose: ${c.noseWidth} width, ${c.noseLength} length`,
    `- Lips: ${c.lipFullness} fullness, ${c.mouthWidth} mouth`,
    `- Cheekbones: ${c.cheekboneProminence}`,
    `- Jaw: ${c.jawWidth}; chin: ${c.chinShape}`,
  ];
  return `## FACE OBSERVATIONS (geometry)\n${rows.join('\n')}`;
}

/**
 * Assemble the grounded USER-message context string (handover §5 conditional
 * full-blueprint grounding). Block order:
 *   CHART_BLOCK (+ moat weave via buildFeatureContext)   — ALWAYS (degrades to '')
 *   NUMEROLOGY_BLOCK                                       — only if name-at-birth on file
 *   TIMING_BLOCK                                           — only in timing mode (verdict present)
 *   PALM_BLOCK                                             — wire-now-empty (omit when absent)
 *   FACE_BLOCK                                             — wire-now-empty + STRUCTURAL gate
 *   THE USER'S QUESTION                                    — last
 *
 * Graceful absence: every block omits cleanly when its source is absent, so a
 * pre-backfill user (chart only) still yields a coherent, non-fabricated context.
 */
export function assembleQaContext(input: QaContextInput): string {
  const now = input.now ?? new Date();
  const faceGate = input.faceGate ?? DEFAULT_FACE_GATE;
  const faceAllowed = faceBlockAllowed(faceGate, input.birthDate, now);

  const sections: string[] = [];

  // ── CHART_BLOCK + moat weave (ALWAYS) ──────────────────────────────────────
  // Reuse buildFeatureContext unchanged; we only trim its INPUT:
  //   • face-trait bands stripped when the FACE gate fails (fail-closed: no face
  //     content — bands OR geometry — ever reaches a minor / non-opted-in user);
  //   • the numerology trio moved out so the dedicated (name-at-birth-gated)
  //     NUMEROLOGY_BLOCK owns ALL numerology in ONE place (handover §5).
  const moatInput: FeatureContextInput = {
    ...input.profile,
    faceTraits: faceAllowed ? input.profile.faceTraits : undefined,
    expressionNumber: undefined,
    soulUrgeNumber: undefined,
    personalityNumber: undefined,
  };
  const moat = buildFeatureContext(moatInput);
  if (moat.trim()) sections.push(moat.trim());

  // ── NUMEROLOGY_BLOCK (only when name-at-birth is on file) ──────────────────
  if (input.nameAtBirthOnFile && input.numerology) {
    const num = renderNumerologyBlock(input.numerology);
    if (num) sections.push(num);
  }

  // ── TIMING_BLOCK (timing mode only) ────────────────────────────────────────
  const hasTiming = Array.isArray(input.timing) ? input.timing.length > 0 : !!input.timing;
  if (hasTiming) {
    sections.push(renderTimingBlock(input.timing as TimingVerdict | TimingVerdict[]));
  }

  // ── PALM_BLOCK (wire-now-empty) ────────────────────────────────────────────
  if (input.palmObservation) {
    sections.push(renderPalmBlock(input.palmObservation));
  }

  // ── FACE_BLOCK (wire-now-empty + STRUCTURAL fail-closed gate) ──────────────
  if (faceAllowed && input.faceObservation) {
    sections.push(renderFaceBlock(input.faceObservation));
  }

  // ── EARLIER IN THIS CONVERSATION (follow-ups only) ─────────────────────────
  // Spliced AFTER the stable Blueprint blocks (chart/numerology — the cacheable
  // prefix) and immediately BEFORE the new question, so the conversation reads in
  // natural order and the per-turn history never disturbs the cacheable prefix.
  // Self-omits when absent ⇒ a first question is byte-identical to today's output.
  if (input.history && input.history.length) {
    const hist = renderHistoryBlock(input.history);
    if (hist) sections.push(hist);
  }

  // ── THE USER'S QUESTION (last) ─────────────────────────────────────────────
  sections.push(`## THE USER'S QUESTION\n${input.question.trim()}`);

  return sections.join('\n\n');
}
