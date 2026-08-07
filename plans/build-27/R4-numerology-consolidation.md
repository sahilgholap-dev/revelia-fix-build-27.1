# R4 — Numerology: audit + consolidate to `user.profile.numerology` (one source of truth)

> Part of **Build 27** (see `../build-27.md`). Status: **✅ IMPLEMENTED (2026-07-08 — §9 steps 1–6 done; validation record = the step-6 session in `../../tracking_files/claude_progress.md`).** Owner runs `backfill:numerology:dry` → real after backend deploys; live-path smoke rides the normal release verification. Area: Server only (zero mobile changes — API contract preserved). Priority: Medium. Fourth in the empirical sequence (R1 ✅ → R2 🔨 → R3 🔨 → **R4 ✅** → R5 …).
>
> ⚠️ **R4 IS A DIFFERENT SHAPE FROM R1/R2/R3 — stated up front.** R1 replaced an *invented* chart with a measured one; R2/R3 replaced *unstable freeform vision output* with a deterministic CV → rules-table layer. **R4 is neither.** The numerology math is already deterministic, empirical (fixed Pythagorean rules), and correct — the same inputs always produce the same numbers. The problem is that the data is **SCATTERED and RECOMPUTED**: date-based numbers live flat on `UserProfile` (and two of them go stale — see §2); name-based numbers are recomputed ad hoc per request from *inconsistent name sources* and never persisted. So R4 is an **audit + consolidation refactor**: no CV, **no feasibility spike** (§4), no new deps, no rules-table authoring, no archetype taxonomy, and **no Sid copy-lock gate** — it is mechanical data-plumbing that gives R5 ONE uniform numerology source, exactly like R1/R2/R3 landed DATA and deferred synthesis COPY to R5.

---

## 1. Goal

Consolidate all numerology numbers — **date-based** (Life Path, Personal Year, Personal Month) and **name-based** (Expression, Soul Urge, Personality) — into a single structured **`user.profile.numerology`** sub-doc computed at the right save-time hooks, then point every server consumer (insight/daily/weekly/monthly, career, name-destiny context, compatibility, face/palm reading context) at that ONE source.

```
TODAY                                          AFTER R4
date-based:  flat fields on UserProfile        ONE `profile.numerology` sub-doc:
             (2 of 3 silently stale)             lifePath + expression/soulUrge/personality
name-based:  recomputed per request,             + name provenance + version tag
             from INCONSISTENT names,          time-varying personalYear/personalMonth
             never on the profile                computed FRESH at read time (staleness fixed)
                                               all consumers read the one source
```

Acceptance (from build-27 §2 R4 row): numerology data is uniform, on-profile, and consumed from one source — the precondition for R5 reading one numerology feature set alongside R1's chart, R2's face traits, and R3's palm traits.

**Two deliberate correctness fixes ride along** (bugs the audit surfaced, both fixed *by* the consolidation rather than as separate patches): the Personal Year/Month staleness bug and the career-vs-name-destiny Expression-number contradiction (§2).

---

## 2. Current state (verified in codebase) + the SCATTERED verdict

### Date-based numbers (lifePath / personalYear / personalMonth)

- **Util**: `server/src/utils/numerology.ts` — `reduceToSingleDigit` (master numbers 11/22/33 preserved), `getLifePathNumber(birthDate)`, `getPersonalYear(birthDate, currentYear)`, `getPersonalMonth(personalYear, currentMonth)`, plus meaning lookups (`getLifePathMeaning`/`getPersonalYearMeaning`/`getPersonalMonthMeaning` — fixed string tables).
- **Storage**: FLAT on `UserProfile` (`server/src/models/UserProfile.ts`): interface `lifePathNumber/personalYear/personalMonth: number` (L68–70), schema (L464–470).
- **Compute hook**: instance method `calculateNumerology()` (L570–578), called by the **pre-save hook** (L583–589) — but **only when `this.isNew || this.isModified('birthData.date')`**.
- **Consumed by**:
  - `insight.service.ts buildUserInsightProfile()` (L217–220): reads the stored flats + `getPersonalYearMeaning(profile.personalYear)` → `UserInsightProfile.lifePathNumber/personalYear/personalMonth/personalYearMeaning` → interpolated into `daily-insight.prompt.ts` (L37–39, L52), `weekly-forecast.prompt.ts` (L53–55, L68, L80, L103), `monthly-reading.prompt.ts` (L57–59, L72, L127, L143–145).
  - `compatibility.service.ts` (L44): user side reads `profile.lifePathNumber`; (L74) computes the **partner's** lifePath ad hoc via `getLifePathNumber` — legitimate (partner is a transient non-user), keep.
  - `reading.service.ts` (L112, L278): passes `profile.lifePathNumber` as user context into face/palm reading generation (+ `hasLifePath` logging at L34/L157/L182/L330).
  - `reading.controller.ts`: name-destiny context (L366), career (L543, L559).
  - `profile.service.ts getNumerology()` (L419–452): the `GET /api/profile/numerology` endpoint — **recomputes everything FRESH from `birthData.date` each call** (does not read the flats).
  - Mobile: `numerology/index.tsx` reads `profile?.lifePathNumber || numerology?.lifePathNumber` etc. (L330–336) — profile flats + the fresh endpoint; `profileService.ts getNumerology` → `GET /profile/numerology`.
- 🐛 **AUDIT FINDING #1 — Personal Year/Month STALENESS.** `personalYear`/`personalMonth` are **time-varying** (they change every calendar year/month for the same birth date) but the pre-save hook recomputes them **only when the birth date changes**. So the flats are frozen at the moment of the last birth-data save. `buildUserInsightProfile` reads the stale flats → **daily/weekly/monthly prompts can carry last year's Personal Year and a months-old Personal Month**, while `GET /profile/numerology` (fresh compute) shows the correct current values — the numerology screen and the insights can *disagree* for the same user. The consolidation fixes this by definition: time-varying numbers are computed at read time (§4 decision 3).

### Name-based numbers (Expression / SoulUrge / Personality)

- **Util**: `server/src/utils/nameNumerology.ts` — Pythagorean letter table, `calculateExpressionNumber` (all letters), `calculateSoulUrgeNumber` (vowels), `calculatePersonalityNumber` (consonants), `assessNameCompleteness` (name-quality heuristic, not math), **and its OWN duplicate `reduceToSingleDigit`** (semantically equivalent to numerology.ts's — different loop shape, same behavior incl. master numbers).
- **NOT persisted on the profile.** Recomputed **ad hoc per request** at every call site:
  - **Name-destiny** (`reading.controller.ts generateNameDestiny`, L296–419): takes `firstName/middleName/lastName` from the **request body** (the mobile screen `numerology/name-destiny.tsx` collects them per analysis — L31–33, L102–104), computes all three numbers (L329–331), runs `assessNameCompleteness`, calls Claude, **recomputes the numbers for each suggested name variation** (L375–377 — "don't trust Claude's math", correct, keep), then persists everything to the **`NameAnalysis` model** (`server/src/models/NameAnalysis.ts` — a per-generation history doc: name + 3 numbers + `currentNameAnalysis` narrative + `nameVariations`, indexed `{userId, createdAt}`; its monthly credit system counts docs by `generatedAt` — L230/L271/L309).
  - **Career** (`reading.controller.ts generateCareerDestiny`, L523–529): derives Expression **from `profile.name || user.name` — the DISPLAY name** — via an **inline `require('../utils/nameNumerology')`** (L527), passes it to `claudeService.generateCareerDestiny` and snapshots it in `CareerDestiny.inputData`.
- **Prompt consumers**: `claude.service.ts` name-destiny prompt (L594–596, L600) and career prompt (L728–729) interpolate the numbers they're handed.
- 🐛 **AUDIT FINDING #2 — TWO CONTRADICTORY EXPRESSION NUMBERS PER USER.** Name-destiny computes Expression from the user's **declared full birth name** ("Amey Ramesh Sawant"); career computes it from the **display name** ("Amey"). Different letters → different numbers. A user who has run both can be told two different Expression numbers by the same app. The consolidation fixes this: one canonical name source with a provenance field (§4 decision 2).

### Non-consumers + dead ends (checked, for completeness)

- `webhook.service.ts` (L166) — comment only. `email.service.ts` (L169) — marketing copy string. Neither computes/consumes numbers.
- `mobile/lib/api.ts getNumerologyReading` (L283–285) posts to `/numerology` — **no such server route exists** (only `GET /profile/numerology` in `profile.routes.ts` L21). Dead mobile code; note only, mobile out of R4 scope.
- `packages/shared/types.d.ts` — a **stale compiled artifact** (has `sourceMappingURL`; carries an old shape with `lifePath?`/`expression?`/`soulUrge?` that matches nothing live). Not authoritative; the live file is `packages/shared/types.ts`. Harmless; flag for opportunistic cleanup, don't block on it.
- `mobile/app/(main)/numerology/index.tsx` carries its own hardcoded Pythagorean *display copy* (number meanings, L15+) — mobile display content, not server math; out of scope (a future copy-unification candidate, not R4's).

### Existing types (dual-home check)

- `NumerologyProfile` (endpoint response: 6 fields with meanings) exists in BOTH `packages/shared/types.ts` (L623–630) and `server/src/types/shared.ts` (L609–616) — the dual-home pattern is already in place for numerology; R4 adds the new sub-doc type to both.
- `UserInsightProfile` (both homes) already carries `lifePathNumber/personalYear/personalMonth/personalYearMeaning` — R4 adds the name-based trio as optional DATA-only fields (§5).

### ⚖️ THE R4 VERDICT — distinct from R1/R2/R3

**Numerology is REAL + CORRECT but SCATTERED + RECOMPUTED.** Explicitly:

- **NOT "invented" (R1's verdict)** — nothing here is an LLM pretending to compute; the utils are fixed deterministic Pythagorean arithmetic, and Claude's math is already distrusted where it matters (variation numbers recomputed server-side).
- **NOT "unstable freeform" (R2/R3's verdict)** — same inputs always yield the same numbers; there is no per-run nondeterminism to stabilize and therefore **no extraction layer to build**.
- The actual defects are **plumbing**: (1) no single source of truth — flat fields + a separate never-persisted name path; (2) name-based numbers recomputed per request from **inconsistent name sources** (finding #2); (3) two of the three stored date-based numbers are **silently stale** in the highest-traffic consumer (finding #1); (4) `reduceToSingleDigit` duplicated across two utils — currently equivalent, one future edit away from divergence; (5) career's inline `require` is a code smell that exists *because* there's no profile field to read.

**The fix is consolidation, not a new measured layer.** Same inputs, same math, same numbers (except the two enumerated bug fixes) — just computed at the right hooks, stored once, read from one place.

---

## 3. Target architecture

```
Save time (server) — compute at the hooks where the inputs change
  birth-data save (UserProfile pre-save hook, existing — extend)
    → numerology.lifePathNumber  (stable for life; also keep legacy flats in sync)
  name-destiny generation (reading.controller.ts — NEW persist step)
    → numerology.{expressionNumber, soulUrgeNumber, personalityNumber}
      + nameUsed + nameSource: 'name_destiny'   (the user's declared full birth name — best source)
    → NameAnalysis doc still created exactly as today (history + monthly credits — unchanged)
  profile-name save (updateProfile / createProfile — NEW, guarded)
    → name-based numbers from profile.name ONLY IF no 'name_destiny'-sourced numbers exist
      (nameSource: 'profile_name' — a display-name-derived fallback never clobbers a birth-name source)

Read time (server)
  insight.service.ts buildUserInsightProfile
    → lifePath + name-based trio from profile.numerology (legacy-flat fallback for un-backfilled)
    → personalYear/personalMonth computed FRESH from birthData.date + today   [fixes finding #1]
    → UserInsightProfile gains expressionNumber/soulUrgeNumber/personalityNumber (DATA only; COPY = R5)
  career (reading.controller.ts)
    → expression from profile.numerology (lazy-compute fallback), NOT from the display name  [fixes #2]
  name-destiny → lifePath context from the same source (as today, now via the sub-doc)
  compatibility (user side) / face+palm reading context → same source
  GET /profile/numerology → response shape UNCHANGED (still fresh-computes the 6 fields)

Mobile
  ZERO changes. Profile flats still present + maintained; endpoint contract identical.
```

---

## 4. Key decisions

> ✅ **NO SPIKE — stated explicitly.** R2/R3 needed Phase-0 feasibility spikes because their #1 risk was a CV question (can landmarks/lines be extracted reproducibly on Railway at all?). R4 has **no feasibility question**: every function involved already exists, is pure, is dependency-free, and runs in production today. There is nothing to prove before building — the entry gate is just this plan. (First requirement in the empirical sequence for which that's true.)
>
> ✅ **NO SID COPY-LOCK GATE — stated explicitly.** R4 writes no user-facing copy: no archetype names, no trait vocabulary, no prompt-text changes (prompt COPY is R5's). The numbers themselves are fixed arithmetic — there is nothing for Sid to approve. The two behavior-visible bug fixes (§2 findings) are correctness fixes, flagged in §11 for awareness, not gated.

| Decision | Recommendation | Why / caveat |
|---|---|---|
| **Target shape** | One typed sub-doc **`UserProfile.numerology`** (`NumerologyNumbers`, §5) holding lifePath + the name-based trio + name provenance + `numerologyVersion`. | The R1/R2/R3 pattern: typed sub-doc beside the legacy shape. One read target for R5. |
| **Personal Year/Month — NOT stored in the sub-doc** | **Compute at read time** from `birthData.date` + the current date (they're pure + microsecond-cheap — the `GET /profile/numerology` endpoint already does exactly this). `buildUserInsightProfile` switches from the stale flats to fresh compute (fallback to flats only if `birthData.date` is missing). | These numbers are **time-varying** — storing them is what *caused* finding #1. A stored copy is stale the moment the month ticks over; there is no save-hook that fires monthly. Storing `computedFor: month` + refresh logic is strictly more machinery than a 2-line pure compute at read. |
| **Legacy flat fields (`lifePathNumber`/`personalYear`/`personalMonth`)** | **Keep + keep maintained** by the existing pre-save hook (unchanged behavior), mirrored into the sub-doc. Deprecated-but-retained for reads. | Mobile reads the flats directly off the profile object (`numerology/index.tsx` L330–336) — removing them breaks the app contract for zero gain. Mirrors R1 keeping `birthChart` and R2/R3 keeping the reading blobs. Server consumers move to the sub-doc; the flats become mobile-back-compat mirrors. |
| **Canonical name source (the central R4 wrinkle)** | **Provenance hierarchy**: `'name_destiny'` (the full birth name the user typed into name-destiny — quality-gated by `assessNameCompleteness`) **beats** `'profile_name'` (display name — often a casual single name). Name-destiny generation persists its numbers + name to the sub-doc; a profile-name save computes name-based numbers **only when no `name_destiny`-sourced set exists**. Store `nameUsed` + `nameSource` so the provenance is always inspectable. | There is **no structured birth name on the profile today** — `profile.name` is one freeform display string, and the only place a user declares a full birth name is the name-destiny screen (per request). This hierarchy makes the best available name canonical without new UI, and self-upgrades when the user runs name-destiny. R5 can calibrate confidence off `nameSource`. |
| **Name-destiny per-request compute** | **Keep.** The endpoint analyzes whatever name is submitted (it's a "what-if" tool — users can analyze variants), so computing from the request body is *correct*, as is recomputing the suggested-variation numbers (L375–377). | The scattered defect was never the per-request compute — it's that the results never landed on the profile. R4 adds the persist step; the request flow is untouched. |
| **Fate of the `NameAnalysis` model** | **KEEP, unchanged** — as the per-generation **history + narrative cache**, and (load-bearing) the **monthly-credit ledger** (`countDocuments` on `generatedAt` at L230/L271/L309 drives the 1/month gate). `profile.numerology` becomes the canonical *current* numbers; `NameAnalysis` stays the record of each analysis. | Direct mirror of R1 (`birthChart` kept) / R2 (`faceReading` kept) / R3 (`palmReading` kept): legacy blob as derived cache beside the new structured layer. Retiring it would break the credit system + the GET history endpoint for zero benefit. |
| **Util reconciliation** | **Keep both files** (`numerology.ts` = date math + meanings; `nameNumerology.ts` = letter math + name heuristics — genuinely different concerns) but **ONE `reduceToSingleDigit`**: delete the duplicate in `nameNumerology.ts`, import from `numerology.ts`. Fix career's inline `require` (L527) → a normal top-level import (which becomes moot anyway once career reads the sub-doc). Add a `NUMEROLOGY_VERSION` constant (`'1.0.0'`) exported from `numerology.ts`. | The two reducer implementations are behaviorally identical today (verify with a quick value sweep 1–100 + master cases when de-duping) but are one future edit from silent divergence — and Expression/lifePath *must* reduce identically for cross-number narratives to be coherent. A full merge into one file is more churn for no benefit. |
| **`numerologyVersion` tag** | Stamp every sub-doc with `NUMEROLOGY_VERSION`. | The R2/R3 `RULES_VERSION` pattern, applied to arithmetic: if the algorithm ever changes (e.g. Y-as-vowel treatment, master-number policy), bump + rerun the (pure, cheap) backfill deliberately — never mixed populations silently. |
| **`UserInsightProfile` additions** | Add optional `expressionNumber?/soulUrgeNumber?/personalityNumber?` (both type homes), populated from the sub-doc when present. **DATA only — no prompt copy reads them until R5.** | Exact mirror of R1's `moonSign`/`keyTransits`, R2's `faceTraits`, R3's `palmTraits`: land the data, defer the copy. This completes R5's fourth feature set. |
| **`GET /profile/numerology` contract** | **Unchanged** response shape (`NumerologyProfile`, 6 fields). It already fresh-computes; leave it. (Optionally source lifePath via the sub-doc internally — cosmetic.) | Zero mobile changes is an R4 passing criterion. Name-based numbers joining this endpoint is a future/R5-era additive change, not R4's. |
| **Determinism boundary** | Same inputs → same numbers, before and after R4 (pure-function refactor). The ONLY value changes users can observe are the two enumerated bug fixes: insights' Personal Year/Month become *current*, and career's Expression aligns with name-destiny's. | This is the "no behavior regression" criterion made precise: regression = any number change *other than* those two fixes. |

---

## 5. Data model + shared types

**New type** in `packages/shared/types.ts` **and** mirrored in `server/src/types/shared.ts` (the established dual-home pattern — `NumerologyProfile` is already dual-homed at packages L623/server L609, so add beside it):

```ts
export type NumerologyNameSource = 'name_destiny' | 'profile_name';

export interface NumerologyNumbers {
  // Date-based — stable for life, from birthData.date (Personal Year/Month are
  // deliberately NOT here: time-varying → computed fresh at read time, §4)
  lifePathNumber: number;              // 1-9, 11, 22, 33

  // Name-based — from the canonical name (provenance below); absent until a
  // name source exists (optional trio is present-together or absent-together)
  expressionNumber?: number;           // all letters
  soulUrgeNumber?: number;             // vowels
  personalityNumber?: number;          // consonants
  nameUsed?: string;                   // the exact string the numbers were computed from
  nameSource?: NumerologyNameSource;   // 'name_destiny' beats 'profile_name' (§4)

  numerologyVersion: string;           // NUMEROLOGY_VERSION at compute time
  computedAt: string;                  // ISO timestamp string (R1/R2/R3 convention)
}
```

**`UserProfile` model** (`server/src/models/UserProfile.ts`): add one typed sub-document (sub-schema, `_id: false` — mirroring `natalChart`/`faceFeatures`/`palm*Features`):
- `numerology?: NumerologyNumbers`
- Keep the flat `lifePathNumber`/`personalYear`/`personalMonth` **maintained** (mobile back-compat mirrors; the extended pre-save hook writes both).
- Naming note: the type is `NumerologyNumbers`, NOT `NumerologyProfile` — that name is taken by the existing `GET /profile/numerology` response type (6 fields with meaning strings), which is unchanged.

**`UserInsightProfile`** (both homes): add `expressionNumber?: number; soulUrgeNumber?: number; personalityNumber?: number;` — populated in `buildUserInsightProfile` from the sub-doc when present. **DATA only; synthesis-prompt COPY rewrite deferred to R5.**

---

## 6. The single-source module (R4's analog of R2/R3's rules-table section)

R4 authors no rules table — the "table" already exists as the two utils' fixed arithmetic + meaning strings. What R4 centralizes is **where numbers are computed and stored**:

- `server/src/utils/numerology.ts` stays the date-math home + gains `NUMEROLOGY_VERSION` + becomes the single `reduceToSingleDigit` owner.
- `server/src/utils/nameNumerology.ts` stays the letter-math home; its duplicate reducer is deleted in favor of the import. `assessNameCompleteness` unchanged.
- A small helper (recommend: `computeNameNumbers(fullName): { expressionNumber, soulUrgeNumber, personalityNumber }` in `nameNumerology.ts`) so the three call sites (name-destiny persist, profile-name hook, backfill) can't drift on which three functions constitute "the set".
- **Compute-hook placement** (the heart of R4):
  1. **Date-based** — the existing pre-save hook (`UserProfile.ts` L583–589) extends: same `isNew || isModified('birthData.date')` gate, now writing `numerology.lifePathNumber` (+ version/computedAt) alongside the legacy flats. No new save paths.
  2. **Name-based, primary** — `generateNameDestiny` (`reading.controller.ts`), after `NameAnalysis.create` succeeds: persist the computed trio + `nameUsed: fullName` + `nameSource: 'name_destiny'` to `profile.numerology`. (Fire-and-forget failure tolerance: a persist failure must not fail the response — the analysis itself already succeeded.)
  3. **Name-based, fallback** — `profile.service.ts updateProfile` (name change, L286–288) + `createProfile`: compute from `profile.name` with `nameSource: 'profile_name'` **only if** the sub-doc has no `name_destiny`-sourced trio (the guard in §4). Skip empty/whitespace names.
- **Honesty note** (doc-level, as in R2 §6/R3 §6): numerology is entertainment, not science — but unlike face/palm there is no measurement uncertainty at all; the bar here is *consistency* (one user, one set of numbers, everywhere) and *freshness* (time-varying numbers actually vary with time). The reference is the Pythagorean tables in the utils, which R4 does not alter.

---

## 7. Wiring into readings

- **`insight.service.ts buildUserInsightProfile`** (R4 owns this change): `lifePathNumber` from `profile.numerology` (fallback: legacy flat); `personalYear`/`personalMonth`/`personalYearMeaning` **computed fresh** from `birthData.date` + now via the existing utils (fallback to the stored flats only when `birthData?.date` is absent — preserving today's exact behavior for that edge); populate the new optional name-based trio from the sub-doc. **DATA only — the daily/weekly/monthly prompt TEXT is not touched** (it already interpolates `lifePathNumber`/`personalYear`/`personalMonth`; those now simply carry correct values — and the name-based trio waits for R5's copy rewrite, same as R1's moon/rising).
- **Career** (`reading.controller.ts generateCareerDestiny` L523–529): replace the display-name + inline-`require` Expression derivation with a read of `profile.numerology.expressionNumber` (lazy fallback in §8; if genuinely no name source exists, pass `undefined` — the prompt already handles `'Unknown'` at claude.service L729).
- **Name-destiny** (`generateNameDestiny`): request flow unchanged (per-request compute is correct, §4); add the persist step (§6 hook 2). `lifePathNumber` context (L366) reads the same value as today (flat/sub-doc are mirrored).
- **Compatibility** (`compatibility.service.ts` L44): user side reads the sub-doc (flat fallback). Partner ad-hoc `getLifePathNumber` (L74) unchanged — transient non-user input.
- **Face/palm reading context** (`reading.service.ts` L112, L278): reads the mirrored value — repoint to the sub-doc with flat fallback for uniformity (mechanical, low-risk).
- **Synthesis prompts (defer to R5)**: `daily-insight` / `weekly-forecast` / `monthly-reading` / `compatibility` / career keep their current COPY. **R4's numerology set is one of R5's four feature sets** — R5 weaves Expression/SoulUrge/Personality into the copy + Fable 5 engine. Do not rewrite that copy in R4.

---

## 8. Migration / backfill (acceptance: no user loses access)

- Existing users have the legacy flats (if birth data was ever set) and possibly `NameAnalysis` docs — but no `numerology` sub-doc.
- **Backfill script** `server/src/scripts/backfill-numerology.ts` (+ `backfill:numerology` / `:dry` npm scripts, mirroring `backfill-natal-chart.ts` / `backfill-face-features.ts` / `backfill-palm-features.ts`): for each profile —
  1. `lifePathNumber` from `birthData.date` (skip profiles without birth data);
  2. name-based trio from the **most recent `NameAnalysis`** (`nameSource: 'name_destiny'`, `nameUsed: analysis.fullName`) if one exists, else from a non-empty `profile.name` (`nameSource: 'profile_name'`), else omit the trio;
  3. stamp version/computedAt.
  Idempotent + resumable (skip profiles whose sub-doc already carries the current `numerologyVersion` — but **upgrade** a `profile_name`-sourced trio if a `NameAnalysis` exists), `--dry-run`, per-user fail-soft. **Pure compute — no image fetch, no CV, no Anthropic calls**; the cheapest backfill of the empirical thrust (R1-class, lighter).
- **Lazy fallback** (mirrors R1's natal / R2's face / R3's palm lazy compute): at read time, if the sub-doc is missing, build it on the fly from the same inputs and persist best-effort (never block the reading on a persist failure). Insight path + career path get this; consumers always fall back to legacy flats / `undefined` if even lazy compute has no inputs.
- **Recompute-on-version-bump** (cheap path): a `NUMEROLOGY_VERSION` bump + rerun of the backfill deliberately refreshes every sub-doc — the arithmetic analog of R2/R3's `RULES_VERSION` re-map.
- **No clear-on-reupload analog needed**: numerology has no image; inputs change only via birth-data save (hook 1) and name save (hooks 2/3), which overwrite in place.

---

## 9. Sequencing (within R4) — no spike; types first

0. ~~Phase-0 spike~~ — **N/A, deliberately** (§4): pure-function consolidation, no feasibility question. This plan is the entry gate.
1. **Shared types + model**: `NumerologyNumbers` + `NumerologyNameSource` dual-homed (`packages/shared/types.ts` + `server/src/types/shared.ts`); `UserProfile.numerology` typed sub-schema (`_id:false`); `UserInsightProfile` optional name-based trio (both homes). tsc clean.
2. **Util reconciliation**: single `reduceToSingleDigit` (delete `nameNumerology.ts`'s copy, import from `numerology.ts`); `NUMEROLOGY_VERSION` constant; `computeNameNumbers()` helper; equivalence spot-check of the two old reducers (1–100 + master-number cases) recorded in the progress log before deleting one.
3. **Compute hooks**: extend the pre-save hook (date-based → sub-doc + flats); name-destiny persist step (fail-soft); guarded profile-name hook in `updateProfile`/`createProfile`.
4. **Repoint consumers + staleness fix**: `buildUserInsightProfile` (sub-doc + fresh Personal Year/Month + populate the trio); career (sub-doc Expression, remove inline require); compatibility user side; face/palm context reads. Legacy-flat fallbacks everywhere for un-backfilled users.
5. **Backfill script** + npm scripts + lazy fallback (insight + career paths). Owner runs `:dry` then real after backend deploys (R1/R2/R3 precedent).
6. **Validation pass**: tsc clean both sides; consistency check on a seeded profile (name-destiny Expression === career Expression === sub-doc); staleness check (simulate a stored `personalMonth` from a past month → insight profile carries the current one); regression sweep (same lifePath/values as before for same inputs; `GET /profile/numerology` byte-identical shape; name-destiny credits flow untouched).

*(Steps 1–2 are independent of 3–5 and could land as one commit each, mirroring the R2/R3 per-step commit convention. No step is Sid-gated.)*

---

## 10. Passing criteria (R4-specific)

- [ ] **ONE source of truth**: `profile.numerology` holds lifePath + the name-based trio (+ provenance + version); every server consumer that needs stored numerology reads it (insight, career, compatibility user-side, face/palm context, name-destiny context) — with legacy-flat fallback only for un-backfilled profiles.
- [ ] **Name-based numbers persisted at the right hooks**: name-destiny generation upgrades the sub-doc (`name_destiny` source); profile-name saves populate it only when nothing better exists (`profile_name` never clobbers `name_destiny`).
- [ ] **Consistency fix verified (finding #2)**: for a user who has run name-destiny, career's Expression number === name-destiny's Expression number === the sub-doc's.
- [ ] **Staleness fix verified (finding #1)**: `UserInsightProfile.personalYear/personalMonth` equal the current-date computation (and thus `GET /profile/numerology`), regardless of when birth data was last saved.
- [ ] **Backfill + lazy fallback**: existing users get sub-docs (NameAnalysis-sourced where available); missing sub-doc at read time lazy-computes; no user loses any number they see today.
- [ ] **No behavior regression beyond the two enumerated fixes**: same numbers for same inputs (algorithm untouched — the reducer de-dupe is proven equivalent before landing); `GET /profile/numerology` response shape unchanged; name-destiny request flow, response, and monthly-credit gate unchanged; `NameAnalysis` docs still created identically; mobile untouched and unaffected.
- [ ] **Util hygiene**: one `reduceToSingleDigit`; no inline `require` of numerology utils anywhere (career's L527 removed); `NUMEROLOGY_VERSION` stamped on every sub-doc written.
- [ ] **R5 readiness**: `UserInsightProfile` carries the full numerology set (lifePath + fresh personalYear/personalMonth + expression/soulUrge/personality + meanings) as DATA — R5 can consume one uniform numerology feature set without further plumbing.
- [ ] **`tsc --noEmit` clean** (mobile + server — mobile should be a no-op check since nothing mobile changes).

---

## 11. Risks / open questions

- **#1 — Career Expression value changes for some users (deliberate).** Users whose display name ≠ their name-destiny name will see career readings cite a different (now-consistent) Expression number on their *next* career generation. Old `CareerDestiny` docs keep their historical `inputData` snapshot — no rewrite. This is finding #2's fix working as intended; flag to Sid as an FYI (not a gate — it's a correctness fix, no copy involved).
- **#2 — Insights' Personal Year/Month values change for stale profiles (deliberate).** Next insight generation after deploy uses current values (finding #1's fix). Cached insights are keyed by date/month and expire naturally — no invalidation needed; no mixed-value document is ever produced.
- **#3 — Display-name-derived numbers are low-confidence.** `profile.name` is often "Amey", not a full birth name — Expression from it is honest arithmetic on a poor input. Mitigation: the provenance field (`nameSource: 'profile_name'`) travels with the numbers; R5 can calibrate prompt confidence off it (the `assessNameCompleteness` machinery already exists if R5 wants a quality grade). R4 does NOT surface these numbers in any user-facing copy (nothing consumes the trio until R5).
- **#4 — Reducer de-dupe must be provably behavior-neutral.** The two `reduceToSingleDigit` implementations look equivalent (both preserve 11/22/33, both digit-sum loop) but the deletion lands only with the §9 step-2 equivalence sweep recorded. Any divergence found = keep both temporarily + investigate, don't guess.
- **#5 — Hook interaction**: `updateProfile` saves also fire the pre-save hook; the date gate (`isModified('birthData.date')`) means date-based numbers aren't needlessly recomputed on name saves. The name hook must likewise not fire on non-name saves (guard on `updates.name !== undefined` at the service layer, not `isModified` at the model layer, to keep the model hook simple).
- **#6 — Un-backfilled window**: between deploy and backfill, consumers hit the legacy-flat fallbacks + lazy compute — same data they read today, so the window is regression-free by construction (R1/R2/R3 precedent).
- **Out-of-scope notes (recorded, not R4's)**: mobile `api.ts` dead `POST /numerology` method; stale compiled `packages/shared/types.d.ts(.map)` artifacts; mobile numerology screen's own hardcoded meaning copy (display-content unification is an R5-era or later question).
- **No spike, restated**: nothing in R4 has a feasibility question — no CV, no native deps, no external service, no new library. The riskiest single change is the insight-path staleness fix, which is two lines of pure arithmetic behind a fallback.

---

## 12. Files in scope (checklist)

**Server**
- `server/src/utils/numerology.ts` (single `reduceToSingleDigit` owner; `NUMEROLOGY_VERSION`; otherwise unchanged math)
- `server/src/utils/nameNumerology.ts` (delete duplicate reducer → import; add `computeNameNumbers()` helper; math unchanged)
- `server/src/models/UserProfile.ts` (typed `numerology` sub-schema; pre-save hook extended to fill it; legacy flats kept + maintained)
- `server/src/types/shared.ts` + `packages/shared/types.ts` (`NumerologyNumbers`, `NumerologyNameSource`; `UserInsightProfile` name-based trio — dual-homed)
- `server/src/services/insight.service.ts` (`buildUserInsightProfile`: sub-doc sourcing; FRESH personalYear/personalMonth; populate trio — DATA only)
- `server/src/services/profile.service.ts` (`updateProfile`/`createProfile`: guarded name-based hook; `getNumerology` contract unchanged)
- `server/src/controllers/reading.controller.ts` (`generateNameDestiny`: persist step; `generateCareerDestiny`: read sub-doc Expression, remove inline `require`)
- `server/src/services/compatibility.service.ts` (user-side lifePath from sub-doc w/ flat fallback; partner ad-hoc compute unchanged)
- `server/src/services/reading.service.ts` (face/palm context lifePath reads — mechanical repoint w/ fallback)
- `server/src/scripts/backfill-numerology.ts` (NEW) + `server/package.json` (`backfill:numerology` / `:dry`)
- `server/src/models/NameAnalysis.ts` (**unchanged** — history + credit ledger, kept)
- `server/src/prompts/*` (**unchanged** — COPY is R5's)

**Mobile**
- **None.** Profile flats + `GET /profile/numerology` contract preserved; `numerology/index.tsx`, `name-destiny.tsx`, `profileService.ts`, stores — all untouched.

**Coordinate with R5**: R4 lands the uniform numerology DATA on the profile + `UserInsightProfile` (the fourth and final feature set alongside R1's chart, R2's face traits, R3's palm traits); **R5 wires Expression/SoulUrge/Personality — and the now-trustworthy Personal Year/Month — into the synthesis-prompt COPY + Fable 5 engine.** Do not rewrite that copy in R4.
