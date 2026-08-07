/**
 * Q&A Router — R7 Conversational Q&A (Build 27), §13 charter STEP 1.
 *
 * A STANDALONE Haiku classifier: one `claude-haiku-4-5` structured-output call
 * that reads a user question and returns BOTH the 5-label safety/domain `route`
 * (reflective | timing | off_topic | unsafe | crisis) AND a topic `category`
 * (consumed only for timing). It also exposes the verbatim decline / crisis
 * strings and the routing verdict.
 *
 * ── Non-negotiable posture ──────────────────────────────────────────────────
 *  • The router is its OWN lightweight call — NEVER routed through
 *    `createSynthesisMessage`, and it NEVER deducts a credit (S-R7 §3/§4).
 *  • Haiku 4.5 REJECTS `effort` and needs no thinking — we send neither.
 *  • The classifier system prompt + the off_topic/unsafe/crisis strings are
 *    transcribed VERBATIM from the PM-approved Off-Topic/Unsafe/Crisis Guide
 *    (`plans/build-27/R7-OffTopic_Unsafe_Crisis_Guide.md`, Steps 2/6/7). They are
 *    user-facing safety content — NOT the timing trade secret — so this file is
 *    committed normally (unlike the gitignored timing rule set).
 *  • ROUTE resolves FIRST and independently of topic; `category` never dilutes
 *    the route (a topically-shaped crisis/unsafe still routes crisis/unsafe).
 *  • Fail-SAFE, never fail-OPEN: an unrecognized route → `reflective` (never
 *    `timing`); an unrecognized/absent timing category → `other`.
 *
 * ── Crisis gate (S-R7b/D6 — build-ahead, NOT ship-ahead) ────────────────────
 *  The crisis STRING is transcribed and validated against the guide's fixtures
 *  NOW, on the assumption crisis is approved. But the crisis path must NOT reach
 *  prod until Sid logs "the number-free wording is FINAL" in `sid-signoff.md`.
 *  `CRISIS_WORDING_FINALIZED` (below, default false) is the ship gate the
 *  downstream pipeline (Step 3+/Phase B) MUST consult before serving crisis.
 *
 * Step 1 only CLASSIFIES + returns strings. It does not call the answer model,
 * assemble context, or touch the Timing Engine (Step 3 wires router → engine).
 */
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { addUtcMonths } from '../utils/frameDate';

// ── Model (Haiku 4.5 — rejects effort, no thinking) ──────────────────────────
export const QA_ROUTER_MODEL = 'claude-haiku-4-5';

// ── The 5 safety/domain routes ───────────────────────────────────────────────
export const QA_ROUTES = ['reflective', 'timing', 'off_topic', 'unsafe', 'crisis'] as const;
export type QaRoute = (typeof QA_ROUTES)[number];

/**
 * SINGLE-SOURCE topic-category enum. Reconciled KEY-FOR-KEY against the on-disk
 * `server/config/timing/rule-set.json` (gitignored) on 2026-07-23:
 *   • karyaBhava.map        (24) — the §2.1 question→houses rows
 *   • karyaBhava.compound   (2)  — the FX6 compound leaf keys
 *   • carveOut.categories   (7)  — the §2.0 professional-pointer carve-outs
 *   • electiveTimingOk      (1)  — pure-scheduling sub-flag
 *   • other                 (1)  — unmapped → reflective + LOG for map expansion
 * = 35 values. `q.category` the Timing Engine consumes MUST match a real
 * rule-set key exactly — a near-miss silently drops to `other` → reflective.
 * The on-disk config WINS: if a key is added/renamed there, update this list.
 * Step 3 imports THIS const for its `runTimingEngine` call so router and engine
 * cannot drift.
 *
 * NOTE: `venture_scale` is BOTH a top-level map key AND the compound parent. A
 * simple "will my venture take off" question → `venture_scale`; a compound
 * "take off AND scale in 6 months" → `venture_scale` + `compound:true` (the
 * engine, in Step 3, splits it into the leaf keys `traction_signs` +
 * `scale_metric_within_6mo`; those leaves are NOT standalone router outputs).
 */
export const QA_CATEGORIES = [
  // karyaBhava.map (24)
  'job_external',
  'job_promotion',
  'own_venture',
  'venture_scale',
  'honors_gains',
  'money_income_gains',
  'property_to_income',
  'property_purchase',
  'property_sale',
  'relationship',
  'marriage',
  'children_conception',
  'education_exams',
  'dispute_litigation',
  'relocation',
  'foreign_move',
  'short_travel',
  'reputation',
  'father',
  'mother',
  'elder_sibling',
  'younger_sibling',
  'spiritual',
  'hidden_research',
  // karyaBhava.compound (2)
  'traction_signs',
  'scale_metric_within_6mo',
  // carveOut.categories (7) — §2.0 gate (professional pointer)
  'health_outcome',
  'pregnancy_or_conception_outcome',
  'medical_modality_choice',
  'legal_decision',
  'financial_trade_or_investment_decision',
  'third_party_livelihood',
  'minor_future_beyond_temperament',
  // sub-flag + catch-all
  'elective_timing_ok',
  'other',
] as const;
export type QaCategory = (typeof QA_CATEGORIES)[number];

// ── R17 / 2.4a frame tags (v1.1) ─────────────────────────────────────────────
export type QaFrameUnit = 'days' | 'weeks' | 'months' | 'years';

/**
 * The frame-bound extraction (Rule Set v1.1 §"Router additions" 1–2, R17, 2.4a).
 * A question is frame-bounded when it carries an explicit time bound in one of
 * the four phrasings — "by <date>", "before <date/event>", "within N <units>",
 * "in the next N <units>". Resolved ONLY for `route === 'timing'`; inert
 * (all-null, `bounded:false`) for every other route.
 *
 * `deadline` / `windowMonths` are the two mutually-exclusive shapes Step 3 feeds
 * straight into the engine's `TimingQuestion` (`deadline` / `askedWindowMonths`);
 * `end` is the computed frame_end the engine derives via the SAME arithmetic —
 * the shared `addUtcMonths` (`utils/frameDate.ts`), imported by both router and
 * engine, so the two cannot drift.
 * `end` may be null for a "before <event>" bound with no resolvable date — that
 * is a legitimate frame-bounded question the engine resolves to Mixed/revisit.
 */
export interface QaFrame {
  /** The question carries an explicit time bound (one of the four phrasings). */
  bounded: boolean;
  /** Computed frame_end "YYYY-MM-DD": the absolute deadline, or the question
   *  instant advanced by the relative window. null when unbounded/unresolvable. */
  end: string | null;
  /** 2.4a achievement-question class. Set on a frame-bounded ACHIEVEMENT question
   *  only (threshold = completed state/metric; momentum = signs/progress). */
  subtype: 'threshold' | 'momentum' | null;
  /** Absolute date from "by/before <date>" — feeds the engine's `deadline`. */
  deadline: string | null;
  /** Relative window normalized to whole months from "within/next N <units>" —
   *  feeds the engine's `askedWindowMonths`. null for an absolute bound. */
  windowMonths: number | null;
}

// ── The router classification result ─────────────────────────────────────────
export interface QaClassification {
  route: QaRoute;
  /**
   * Topic category. Consumed ONLY when `route === 'timing'` (and by the engine's
   * §2.0 carve-out gate). null for crisis/unsafe/off_topic (ignored downstream);
   * for reflective it is emit-but-don't-depend (may be null).
   */
  category: QaCategory | null;
  /** True only for a compound timing question (venture_scale parent). */
  compound: boolean;
  /** R17/2.4a frame extraction. `bounded:false` (all-null) for non-timing routes. */
  frame: QaFrame;
  /**
   * Per-leaf 2.4a subtype for a compound question (R15 + 2.4a): each half of the
   * split `venture_scale` compound carries its OWN subtype (FX6: traction_signs =
   * momentum, scale_metric_within_6mo = threshold). Feeds the engine's
   * `subFrameSubtypes`. null for a non-compound question. Consumed only when the
   * compound is also frame-bounded.
   */
  subFrameSubtypes: Record<string, 'threshold' | 'momentum'> | null;
}

/** Inert frame — a non-timing route, or a timing question with no time bound. */
const UNBOUNDED_FRAME: QaFrame = {
  bounded: false,
  end: null,
  subtype: null,
  deadline: null,
  windowMonths: null,
};

/**
 * Per-leaf 2.4a subtype for the sole compound parent (`venture_scale`). These are
 * DEFINITIONAL, not model-judged: `traction_signs` asks for signs/progress
 * (momentum) and `scale_metric_within_6mo` asks for a completed metric
 * (threshold), exactly the 2.4a split that lets FX6a/FX6b return different frame
 * verdicts. Single-source for Step 3's `subFrameSubtypes`.
 */
export const COMPOUND_LEAF_SUBTYPES: Record<string, 'threshold' | 'momentum'> = {
  traction_signs: 'momentum',
  scale_metric_within_6mo: 'threshold',
};

// ===========================================================================
// VERBATIM guide strings — user-facing. Transcribed exactly from
// `plans/build-27/R7-OffTopic_Unsafe_Crisis_Guide.md` (curly apostrophes kept).
// ===========================================================================

/** Guide Step 6 — the single general-wording, number-free crisis resource text. */
export const CRISIS_RESOURCE_TEXT =
  'I know things feel really heavy right now. I’m not able to help with this one, but please don’t go through it alone. Please reach out to a mental health crisis line in your area, they’re trained for exactly this, or talk to someone you trust right now.';

/** Guide Step 7 — unsafe generic decline (no explanation of why). */
export const UNSAFE_DECLINE_TEXT = 'I can’t help with that one, try a different question.';

/** Guide Step 7 — off-topic redirect (warmer; scope mismatch, not a safety issue). */
export const OFF_TOPIC_DECLINE_TEXT =
  'I’m built to help with questions about your own chart and life, not general topics. Try asking something like ‘what does my chart say about...’';

/**
 * ✅ CRISIS SHIP GATE (S-R7b/D6) — RESOLVED. Sid confirmed the general, number-free
 * crisis wording is FINAL (not a stopgap) in Rule Set v1.1 §5 (2026-07-23; logged
 * in `sid-signoff.md` S-R7b/D6 RESOLVED). Flag flipped to `true`. Downstream
 * serving code (Step 3) MUST still consult this flag before returning
 * `CRISIS_RESOURCE_TEXT` to a user (this const stays the single ship gate).
 * (Unsafe/off-topic were never gated — the guide cleared them for direct build.)
 * Optional 27.1 fast-follow (owner's call, zero launch dependency): a 4-market
 * country-append (US/CA 988, IN Tele-MANAS 14416, BR CVV 188) — see
 * build-27-caveats.md; NOT built unless the owner says so.
 */
export const CRISIS_WORDING_FINALIZED = true;

/**
 * Resolve the hardcoded decline/crisis string for a non-answering route.
 * Returns null for reflective/timing (those proceed to the answer pipeline).
 * NOTE: this returns the crisis text for validation/harness use; the SHIP gate
 * (`CRISIS_WORDING_FINALIZED`) is enforced by the downstream serving path, not
 * here — so the fixture harness can prove the wording is correct pre-approval.
 */
export function resolveDeclineText(route: QaRoute): string | null {
  switch (route) {
    case 'crisis':
      return CRISIS_RESOURCE_TEXT;
    case 'unsafe':
      return UNSAFE_DECLINE_TEXT;
    case 'off_topic':
      return OFF_TOPIC_DECLINE_TEXT;
    case 'reflective':
    case 'timing':
    default:
      return null;
  }
}

// ===========================================================================
// Classifier system prompt — the VERBATIM guide classifier prompt (Step 2) as
// the route-deciding core, wrapped with tool-use mechanics + the dual-field
// (category) framing and the route-resolves-first guardrail.
// ===========================================================================

/** VERBATIM from the guide, Step 2 (the string Sid/PM approved for the route). */
const GUIDE_CLASSIFIER_PROMPT = `You are a content classifier for an astrology Q&A app. Read the user's question and return exactly one label from this list: reflective, timing, off_topic, unsafe, crisis. Do not answer the question. Do not explain your reasoning. Output only the label.

reflective: an open personal question about self, relationships, career, family, growth, or similar. This includes emotionally difficult topics like infidelity, breakups, grief, or conflict, these are still reflective questions.

timing: a binary, dated, or decision question, asking whether or when something will happen, or whether the user should take an action.

off_topic: unrelated to astrology or the user's own life circumstances.

unsafe: sexually explicit content, anything sexual or romantic involving minors, requests for help with illegal activity, or hate speech and harassment directed at a person or group. A question about a difficult relationship or infidelity is reflective, not unsafe, unless it also contains one of the above.

crisis: expresses suicidal ideation or self-harm, regardless of phrasing, direct or indirect.

If uncertain between two labels, prefer the more cautious one: crisis over unsafe, unsafe over off_topic, off_topic over reflective.`;

/**
 * The full system prompt. The guide block above decides `route`; the addendum
 * (a) redirects output to the `classify` tool, (b) enforces route-resolves-first
 * (category must never pull a crisis/unsafe toward timing), (c) explains the
 * timing-only `category` field.
 */
const CLASSIFIER_SYSTEM_PROMPT = `${GUIDE_CLASSIFIER_PROMPT}

--- Output mechanics (internal) ---
Return your answer ONLY by calling the "classify" tool. Do not write any prose.

Decide "route" FIRST, on its own — safety and domain decide it, in this priority: crisis over unsafe, unsafe over off_topic, then timing or reflective. What a question is ABOUT must NEVER change the route. A message shaped like a career, money, or relationship question that expresses suicidal ideation or self-harm is crisis, not timing. A request that sounds like a decision ("when should I…", "is it a good time to…") but asks for help with something sexual involving a minor, illegal activity, or harassment is unsafe, not timing. Never let the topic make a crisis or unsafe message look answerable.

Reflective vs timing: an OPEN request to read or interpret the chart about a life area — phrased as "what does my chart say about…", "what do you see about my career", "tell me about my relationships", "how is my year looking" — is reflective, EVEN when it mentions a period like "this year" or "these days". Route timing ONLY when the question asks specifically WHETHER something will happen, WHEN to act, or WHETHER to take a particular action (a yes/no, a date, or a decision — for example "should I take this job?", "will we get back together?", "when is a good time to launch?"). A mention of a time period does not by itself make a question timing.

Then set "category": the topic of the question. It is used ONLY when route is "timing". When route is crisis, unsafe, or off_topic, category is ignored downstream — leave it null and let category reasoning have no effect on the route. For a timing question, choose the single best-fitting category key; if none fits, use "other". Set "compound" true only for a timing question that bundles two distinct matters (for example, "will my business take off AND hit a revenue target in six months"); use the parent category "venture_scale" in that case.

Frame (only for a timing question; leave all frame fields unset otherwise). Set "frame_bounded" true when the question carries an explicit time bound, in one of exactly these four shapes: "by <date>", "before <date or event>", "within N <days/weeks/months/years>", or "in the next N <units>". A bare mention of a period ("this year", "these days") is NOT a frame bound. When frame_bounded is true, also fill the bound's shape: for an absolute date use "frame_deadline" as ISO "YYYY-MM-DD"; for a relative window use "frame_window_count" (the integer N — for a range like "5 to 6 months" use the larger) and "frame_window_unit". A "before <event>" bound with no concrete date leaves both unset (still frame_bounded true).

Subtype (only for a frame-bounded ACHIEVEMENT question). Set "frame_subtype" to "threshold" when the question asks for a COMPLETED state or metric — reach/achieve/hit a number, be profitable, be married, be moved, be done — and "momentum" when it asks for SIGNS, progress, traction, movement, or improvement toward something. For a compound question the two halves may differ, and are handled downstream — you need only tag the frame and set compound true.`;

// ── Forced structured-output tool ────────────────────────────────────────────
const CLASSIFY_TOOL: Anthropic.Tool = {
  name: 'classify',
  description:
    'Return the single routing label for the user question, plus an optional topic category used only for timing questions.',
  input_schema: {
    type: 'object',
    properties: {
      route: {
        type: 'string',
        enum: [...QA_ROUTES],
        description: 'The one safety/domain label. Decided first, independent of topic.',
      },
      category: {
        type: 'string',
        enum: [...QA_CATEGORIES],
        description:
          'Topic category. Only meaningful when route is "timing"; omit/null otherwise.',
      },
      compound: {
        type: 'boolean',
        description:
          'True only for a timing question bundling two matters (use parent category venture_scale).',
      },
      frame_bounded: {
        type: 'boolean',
        description:
          'True when the question carries an explicit time bound: "by <date>", "before <date or event>", "within N <days/weeks/months/years>", or "in the next N <units>". Only meaningful for a timing question.',
      },
      frame_deadline: {
        type: 'string',
        description:
          'For an ABSOLUTE bound ("by <date>" / "before <date>"), the date as ISO "YYYY-MM-DD" (use the first of the month/year when only a month or year is named). Omit for a relative window or an event-only bound ("before my father visits").',
      },
      frame_window_count: {
        type: 'number',
        description:
          'For a RELATIVE bound ("within N <units>" / "in the next N <units>"), the integer N. If the user gives a range like "5 to 6 months", use the LARGER number. Omit for an absolute or event-only bound.',
      },
      frame_window_unit: {
        type: 'string',
        enum: ['days', 'weeks', 'months', 'years'],
        description: 'The unit for frame_window_count. Omit when there is no relative window.',
      },
      frame_subtype: {
        type: 'string',
        enum: ['threshold', 'momentum'],
        description:
          'For a frame-bounded ACHIEVEMENT question: "threshold" when it asks for a COMPLETED state or metric (reach/achieve/hit a number, be profitable, be married, be moved); "momentum" when it asks for SIGNS/progress/traction/movement/improvement. Omit when the question is not frame-bounded.',
      },
    },
    required: ['route'],
  },
};

// ── Client (own lightweight call; never through createSynthesisMessage) ───────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 4,
});

/** Relative window → whole months. Months/years are exact; weeks/days are coarse-
 *  mapped to the engine's month resolution (its windows are month-grained). */
function windowToMonths(count: number, unit: QaFrameUnit): number {
  switch (unit) {
    case 'years':
      return count * 12;
    case 'months':
      return count;
    case 'weeks':
      return Math.max(1, Math.round(count / 4));
    case 'days':
    default:
      return Math.max(1, Math.round(count / 30));
  }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Resolve the raw frame fields into a `QaFrame` (R17 / 2.4a). Frame semantics are
 * TIMING-only — every other route returns the inert frame. Deterministic given a
 * fixed `now`, so the arithmetic is unit-testable without a live model call.
 */
export function resolveFrame(
  raw: {
    frame_bounded?: unknown;
    frame_deadline?: unknown;
    frame_window_count?: unknown;
    frame_window_unit?: unknown;
    frame_subtype?: unknown;
  },
  route: QaRoute,
  now: Date
): QaFrame {
  if (route !== 'timing' || raw.frame_bounded !== true) return UNBOUNDED_FRAME;

  const deadline =
    typeof raw.frame_deadline === 'string' && ISO_DATE_RE.test(raw.frame_deadline)
      ? raw.frame_deadline.slice(0, 10)
      : null;
  const count =
    typeof raw.frame_window_count === 'number' && raw.frame_window_count > 0
      ? Math.floor(raw.frame_window_count)
      : null;
  const unit = (['days', 'weeks', 'months', 'years'] as const).includes(
    raw.frame_window_unit as QaFrameUnit
  )
    ? (raw.frame_window_unit as QaFrameUnit)
    : null;

  let end: string | null = null;
  let windowMonths: number | null = null;
  if (deadline) {
    end = deadline; // absolute "by/before <date>"
  } else if (count && unit) {
    windowMonths = windowToMonths(count, unit);
    // Shared single-source month-add (utils/frameDate) — the SAME arithmetic the
    // engine's `frameEndFrom` uses for `askedWindowMonths`, so router and engine
    // cannot drift on the computed bound.
    end = addUtcMonths(now, windowMonths);
  }
  // else: "before <event>" with no resolvable date → bounded but end/deadline null
  //       (engine resolves an unresolvable window to Mixed + revisit).

  const subtype: 'threshold' | 'momentum' | null =
    raw.frame_subtype === 'threshold' || raw.frame_subtype === 'momentum'
      ? raw.frame_subtype
      : null;

  return { bounded: true, end, subtype, deadline, windowMonths };
}

/** Coerce whatever the tool returned into a fail-safe, validated classification.
 *  `now` (defaults to the current instant) anchors relative frame_end arithmetic. */
export function normalizeClassification(
  raw: {
    route?: unknown;
    category?: unknown;
    compound?: unknown;
    frame_bounded?: unknown;
    frame_deadline?: unknown;
    frame_window_count?: unknown;
    frame_window_unit?: unknown;
    frame_subtype?: unknown;
  },
  now: Date = new Date()
): QaClassification {
  // Fail-SAFE: unrecognized route → reflective (NEVER fail-open to timing).
  const route: QaRoute = (QA_ROUTES as readonly string[]).includes(raw.route as string)
    ? (raw.route as QaRoute)
    : 'reflective';

  const rawCat =
    typeof raw.category === 'string' && (QA_CATEGORIES as readonly string[]).includes(raw.category)
      ? (raw.category as QaCategory)
      : null;

  let category: QaCategory | null;
  if (route === 'timing') {
    category = rawCat ?? 'other'; // timing must carry a real key; unmapped → other
  } else if (route === 'reflective') {
    category = rawCat; // emit-but-don't-depend (may be null)
  } else {
    category = null; // crisis/unsafe/off_topic → ignored downstream
  }

  const compound = route === 'timing' && raw.compound === true;
  const resolved = resolveFrame(raw, route, now);
  // For a compound the single frame.subtype is AMBIGUOUS — the two halves differ —
  // so the per-leaf subFrameSubtypes below is the sole source of truth and the
  // scalar subtype is nulled. Mutually exclusive: compound ⇒ subFrameSubtypes set,
  // frame.subtype null; non-compound ⇒ frame.subtype set, subFrameSubtypes null.
  const frame: QaFrame = compound ? { ...resolved, subtype: null } : resolved;
  // Compound leaves carry their OWN (definitional) 2.4a subtype — see 2.4a / FX6.
  const subFrameSubtypes = compound ? { ...COMPOUND_LEAF_SUBTYPES } : null;
  return { route, category, compound, frame, subFrameSubtypes };
}

/**
 * Classify one user question. One Haiku 4.5 forced-tool call, temperature 0, no
 * effort/thinking. NEVER deducts credit. Throws on a hard API failure (the Step-4
 * pipeline owns retry/degradation); a malformed/absent tool call degrades to a
 * fail-safe reflective/other rather than throwing.
 */
export async function classifyQuestion(
  question: string,
  opts: { now?: Date } = {}
): Promise<QaClassification> {
  const now = opts.now ?? new Date();
  const resp = await anthropic.messages.create({
    model: QA_ROUTER_MODEL,
    max_tokens: 256,
    temperature: 0,
    system: CLASSIFIER_SYSTEM_PROMPT,
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: 'tool', name: 'classify' },
    messages: [{ role: 'user', content: question }],
  });

  const block = resp.content.find(
    (c): c is Anthropic.ToolUseBlock => c.type === 'tool_use' && c.name === 'classify'
  );
  if (!block) {
    logger.warn('QA router: no classify tool_use block; defaulting reflective/other', {
      stopReason: resp.stop_reason,
    });
    return {
      route: 'reflective',
      category: null,
      compound: false,
      frame: UNBOUNDED_FRAME,
      subFrameSubtypes: null,
    };
  }
  return normalizeClassification(block.input as Record<string, unknown>, now);
}
