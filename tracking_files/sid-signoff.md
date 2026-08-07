# Sid Sign-off Register — Build 27

> **Standing register of items awaiting Sid (owner) sign-off.** Persists across sessions (unlike `session_handoff.md`, which is overwritten each session). When Sid replies, flip the item's **Status** + date it, move it to "Resolved," and unblock the gated step.
>
> **The rule:** data / scaffolding / plumbing / validation is **ungated** (build it now; first-pass names are re-mappable **data** via a `RULES_VERSION` bump — no re-detect). What's gated is **locking user-facing COPY** — the moment archetype names / trait voice / prose get written into an LLM prompt (the "step 5 / 7" copy-lock steps).
>
> Legend: 🔴 PENDING · 🟢 APPROVED · 🟡 PROCEEDING ON DEFAULT (Sid informed he's busy → building on the recommendation; re-mappable if he later revises) · ⚪ withdrawn/N-A
>
> ## 🚢 POST-SHIP NOTE (2026-07-27)
> **Build 27 SHIPPED — v2.0.0 is live on Play Store production** (merged to `main`; active branch `fix/build-27.1`). Every gate in this register that was framed as "blocks the cut / blocks the promote" has been **overtaken by the ship** — the build went out. Read the rows for the decision trail; do **not** read them as live blockers.
>
> **Still genuinely open with Sid:** **S-P1** (paywall price rendering — hardcoded USD literals shown to an INR-charged market; commerce is Sid's domain, findings parked not fixed — see the Build 27.1 section immediately below). **S-R7f** (`natalFunctional.runningPeriodScores` — does a natal-functional match on the *running* AD lord earn the R11 ±1, giving FX3 conf 0.65, or only the "already in motion" texture, giving his pinned 0.60?) and **S-R7g** (natal-functional granularity — AD-gates-only reproduces his pinned FX3 = 2027-07, but FX5's documented 2026-10 window needs the opposite setting; the two cannot both hold). Both are one config key, neither moves any other fixture, neither blocks anything. Also outstanding: **S-R9L** (report tier decision), now answerable against real production cost data with Fable 5 ON.

> **DECISION 2026-07-08 — proceed on the recommended defaults.** Sid is busy and can't review these on time; we told him we're going forward with the recommendations and will adjust if he objects. So S1/S2/S3 are now **🟡 PROCEEDING ON DEFAULT**: the copy-lock steps they gate (R2 5+7, R3 5) are **UNBLOCKED to build** on the recommended answers. Everything they touch is re-mappable **data/copy** (a `RULES_VERSION` / prompt edit — no re-detect), so a later revision from Sid is cheap. Keep the deliverables ready to send if he wants to review after the fact.

---

## 🔴 BUILD 27.1 — S-P1 · Paywall price rendering · OPEN · gated on Sid

**Raised**: 2026-07-29, session `build27.1-preflight-audit`
**Evidence**: `plans/build-27.1/preflight-findings.md` §A1, §A2, §A3, §A4, §A6
**Owner ruling (Amey, 2026-07-29)**: RevenueCat and all pricing are Sid's domain.
No change to `(paywall)/index.tsx`'s commerce logic without his explicit approval.
Findings are recorded and parked, NOT fixed.

### What is confirmed, with evidence

1. **Displayed prices are hardcoded USD string literals** — `(paywall)/index.tsx`
   `:155` (`'$7.99'` / `'$59.99'`), `:182` (`'$12.99'` / `'$89.99'`), `:160`
   (`'$5.00/month • Save 37%'`), `:187` (`'$7.50/month • Save 42%'`), `:132`
   (`'Annual (Save 37-42%)'`). The `offerings` object is in scope at `:13` for the
   whole render and is never read for display.

2. **Play Console prices are CORRECT and match the code.** Verified by Amey
   2026-07-29:
   | Product | USD | INR (incl. 18% GST) |
   |---|---|---|
   | Premium monthly | $7.99 | ₹900 |
   | Premium annual | $59.99 | ₹6,800 |
   | Premium Plus monthly | $12.99 | ₹1,450 |
   | Premium Plus annual | $89.99 | ₹10,200 |
   So there is NO overcharge. The three docs claiming $14.99 / $99.99 are STALE:
   `docs/REVENUECAT_SETUP.md:66-69` and `:1558-1561`,
   `mobile/SUBSCRIPTION_IMPLEMENTATION.md:200-203`,
   `mobile/SUBSCRIPTION_QUICKSTART.md:44-47`.

3. **The live user-facing defect is CURRENCY, not amount.** An Indian user is shown
   `$7.99` and charged `₹900`. India is the primary market. USD prices carry no
   VAT; INR prices are 18% GST-inclusive — `product.priceString` returns the
   correct tax-inclusive figure per market automatically, which hardcoding can
   never do. The auto-renew legal paragraph at `:220` currently sits beneath prices
   that do not describe what the user is charged.

4. **The hardcoded prices are also the failure fallback** (§A4). `error` is not
   destructured at `:13` and is read by no component. On a rejected or empty
   offerings fetch the full paywall renders with hardcoded prices, visually
   identical to the healthy state. First feedback is
   `Alert('Error', 'Subscription plans not loaded')` at `:29` after the user taps
   Purchase.

5. **Every non-success purchase outcome is completely silent** (§A3). The
   `Alert('Purchase Failed')` at `:56` is UNREACHABLE: `lib/revenuecat.ts:51-61`
   swallows all throws and returns `null`; `subscriptionStore.ts:61-64` collapses
   that to `false`; the screen has no `else` at `:49`. `userCancelled` IS read at
   `revenuecat.ts:56` but only to suppress a `console.warn` — the distinction is
   discarded before any caller sees it. A declined card produces no message, no
   retry, and no telemetry.

6. **`${plan}_${period}` is a constructed identifier** (§A2) matched against the
   payload at `:35`. If RevenueCat identifiers ever diverge from that template the
   user gets "Selected plan not available" with no diagnosis.

7. **"Start 7-Day Free Trial" is unconditional** (§A6). Android exposes no
   pre-purchase eligibility check — `checkTrialOrIntroductoryPriceEligibility`
   exists but is hard-wired to return `UNKNOWN` on Android
   (`purchases.d.ts:447`). A returning subscriber is promised a trial the store
   will refuse.

### Savings percentages are currency-stable — no design decision needed
Computed from the Play Console figures above: Premium 37.4% USD / 37.0% INR;
Plus 42.3% USD / 41.4% INR. Both within ~1pp, so deriving the percentage from
`pkg.product.price` reproduces today's copy in any currency.

### The change, if Sid approves — scoped precisely
NO RevenueCat configuration change. NO product, price, offering or entitlement
change. Mobile client only, `(paywall)/index.tsx` + `lib/revenuecat.ts`:
- read `pkg.product.priceString` for the headline and
  `pkg.product.pricePerMonthString` (nullable — needs a guard) for the sub-line
- iterate `availablePackages` in payload order instead of the constructed lookup
- add loading / failed states so hardcoded prices are no longer the fallback
- return a `{ success | cancelled | failed(code) }` tri-state so genuine failures
  surface and cancellations stay silent
- gate the trial label on `product.introPrice != null`
Estimated ~65 lines across 2 files. No dependency, no server, no native change.

### Precondition BEFORE any code, regardless of approval
Amey could not see prices in RevenueCat (possible Member-vs-Admin permissions
issue, or an incomplete Play integration). If RevenueCat has identifiers but no
synced price data, `priceString` returns empty — replacing wrong prices with blank
prices is worse than the current bug. Required first: confirm the Play integration
shows green and the four products display a price; then, on a Play-signed Internal
Testing build, log `offerings.current.availablePackages` with each `identifier`,
`priceString` and `pricePerMonthString`. That one log settles the precondition,
the identifier question, and whether `pricePerMonthString` is null on Google
products.

### Related, non-commerce, NOT gated on Sid
- **A5** — the CTA is `text-white` on `bg-gold` = **2.15:1**, below AA. The
  accessible pairing (`text-black`) is already used eight lines away at `:177` and
  in `PremiumBadge.tsx:10`. Handed to the UI revamp as a token-table constraint,
  not hotfixed.
- **The three stale price docs** — safe to correct any time. Leaving them is how
  someone later "fixes" correct code to match wrong documentation.

### 🔴 DEVICE EVIDENCE, versionCode 36, 2026-08-04 — A1 IS PHOTOGRAPHED

**This is the strongest evidence S-P1 has, and it upgrades item 1 from a code reading
to an observed fact.** On the reviewed internal-testing build, the paywall **displayed
`$89.99`** while the **Google Play purchase sheet charged `₹10,200`** for the same
product, in the same session, on the same screen.

Both figures are CORRECT in isolation — the Play Console table above shows exactly that
pairing, so there is still no overcharge. **What is photographed is the divergence
itself:** the app states a price in a currency the store does not charge in, three taps
before the store states the real one, with the auto-renew legal paragraph sitting under
the wrong one. That is A1 exactly, in the primary market, and it is no longer an
inference from `:182`'s string literal.

⚠️ **It also settles the "does it matter?" question that a code finding cannot.** The
argument for reading `priceString` was previously about correctness in principle; it is
now about a user seeing two different prices for one purchase.

**Three further device observations from the same review, all consistent with the items
above and none of them new defects:**

| observed | which item it is |
|---|---|
| after a successful purchase the paywall shows no active / current-plan state | item 5's shape — the screen has no `else` at `:49` and no post-purchase state at all |
| "Restore purchases" during an ACTIVE TRIAL appears to RESTORE rather than recognise the trial | item 5 again — the tri-state return is what would let the screen tell those apart |
| "Start 7-Day Free Trial" still unconditional | **item 7 / A6, unchanged.** Android exposes no pre-purchase eligibility check |

🔴 **NO COMMERCE LOGIC WAS CHANGED. Nothing in `(paywall)/index.tsx` or `lib/revenuecat.ts`
was touched.** Recorded only, exactly as the 2026-07-29 ruling requires.

---

## 🟡 PROCEEDING ON DEFAULT — building on the recommendation (Sid informed)

### S1 — R2 face archetype names + trait→archetype mapping LOGIC (#2b)
- **Status:** 🟡 PROCEEDING ON DEFAULT (2026-07-08) — build R2 5+7 on the current 8-archetype set (The Visionary/Seeker/Strategist/Sovereign/Empath/Creator/Achiever/Sage). Sid may still review; deliverable kept ready.
- **Gates (now UNBLOCKED):** R2 §9 **steps 5 + 7** (face prompt rewrite + drop forehead card = one pass)
- **Deliverable (send if Sid reviews later):** `scratchpad/R2-archetype-deliverable-for-sid.md` (⚠️ scratchpad = ephemeral; regenerate from `server/src/data/physiognomy-rules.ts` if gone) — 8 archetype names + how traits resolve to each + coverage proof.
- **Default taken:** ship the closed 8-archetype set as built; re-mappable via `RULES_VERSION` if Sid revises names/logic.

### S2 — R3 palm lines: geometry-only v1 (lines = LLM flavor; measured lines → R3.x)
- **Status:** 🟡 PROCEEDING ON DEFAULT (2026-07-08) — ship lines-as-flavor for v1; defer measured line segmentation to R3.x. **Gated step 5 BUILT on this default 2026-07-08** (lines passed for description-only flavor, forbidden from contradicting measured substrate).
- **Gates (BUILT on default):** R3 §9 **step 5** (palm prompt copy framing) — DONE 2026-07-08
- **Context:** R3 plan §11 open-decision + §13 roadmap. **No user-facing regression** — the heart/head/life/fate `PalmLineCard` UI stays and lines stay LLM-described exactly as today; v1 only declines to *label* lines "measured" (classical CV can't honestly measure them — a fake-measured line is unstable + non-discriminating + dishonest).
- **Default taken:** (a) lines-as-flavor for v1, (b) measured line segmentation deferred to a future R3.x (trained U-Net microservice + its own spike).

### S3 — R3 palm trait vocabulary + archetype names/voice (step-3 deliverable)
- **Status:** 🟡 PROCEEDING ON DEFAULT (2026-07-08) — build R3 step 5 on the current 5-trait vocab + 6-archetype `energyType` set. **Step 5 BUILT on this default 2026-07-08** (energyType/talents/lifeTheme from `chiromancy-rules.ts` pinned into the reading). Sid may still review; deliverable kept ready — a later revision is a `RULES_VERSION`/prompt re-map, no re-detect.
- **Gates (BUILT on default):** R3 §9 **step 5** (copy lock) — DONE 2026-07-08
- **Deliverable (send if Sid reviews later):** `scratchpad/SID-palm-rules-deliverable.md` (⚠️ scratchpad = ephemeral; regenerate from `server/src/data/chiromancy-rules.ts` if gone) — 5 first-pass traits (practicality/intellect/intuition/creativity/drive), talent/lifeTheme logic, closed 6-archetype `energyType` set, worked examples, coverage proof.
- **Default taken (incl. the 6-vs-4 sub-question):** ship the **6-archetype set** (reuses the existing `palmEnergyType` names — Leader/Healer/Creator/Visionary/Survivor/Scholar Palm; the richer set, already built). Re-mappable to 4 via `RULES_VERSION` if Sid prefers.

---

## 🟢 S-R6 — R6 continuity tier-reach (product/copy gate) · RESOLVED ON DEFAULT (owner, 2026-07-13) · R6 IMPLEMENTATION COMPLETE

### S-R6 — Who sees the "what's shifted since your last reading" note (tier-reach)
- **R6 ✅ IMPLEMENTATION COMPLETE 2026-07-13** (§9 steps 1–6 committed `49344eb`→`98e0485`; validation 41/41). This gate is settled: v1 shipped Option A; Option C deferred (below).
- **Status:** 🟢 **RESOLVED ON DEFAULT (owner call, 2026-07-13)** — **v1 = Option A** (zero-mobile): full continuity prose in **daily-full (Premium Plus)** [STEP 4, `6582c75`] **+** a short user-facing continuity **hook** prepended to the **free/premium daily teaser** string [STEP 5, `1ede90d`]. **Option C** (a dedicated, styled "what's shifted" card + its own unlock CTA — the stronger conversion UX) is **DEFERRED to the build-27 mobile cycle** (folds into R7's mobile work; requires an output-shape + mobile change → breaks R6's zero-mobile-changes criterion) — recorded in `build-27-caveats.md` R6 §. Copy is re-mappable; deliverable kept for Sid if he wants to review the hook tone after the fact.
- **Decision rationale:** continuity is a **retention** mechanic; A ships it backend-only NOW, reaching all tiers (PP full + free/premium teaser hook) while holding the zero-mobile line so the backend deploys independently and the retention A/B stays clean. C (the polished dedicated card/CTA — a *conversion* lever) waits for the mobile cycle R7 requires anyway, so nothing is lost and R6 completion isn't blocked on mobile.
- **Gated:** R6 §9 **STEP 5** (the free/premium teaser-hook copy + tier-reach) — UNBLOCKED, building on Option A.
- **NOT a taxonomy/copy-lock gate** (unlike S1/S2/S3): R6 authors continuity *prose* through R5's engine and reads placements from the R1 engine — no archetype names to lock. This is a reach/tone call only.
- **Deferred (C):** dedicated `DailyInsightOutput.continuity` field + a styled daily "What's shifted" card (PP) + a `continuityHook` field with a dedicated unlock CTA (free/premium). Stronger UX + conversion pull. **UPDATE (owner, 2026-07-24): scheduled as a STANDALONE `build27-R6-OptionC` step AFTER R7 mobile — explicitly NOT part of R7 §13e and NOT a gate on R7.** Sized small (~2 backend additive + ~2 mobile; the continuity delta/block/hook are already computed by Option A → the fields just expose them, no daily-insight generation-logic change). See `build-27-caveats.md` R6 §. **✅ BUILT 2026-07-25** (`build27-testing-fixes`) — owner chose Option 1 / distinct-additive summary (card is a NEW surface; the woven-prose continuity STAYS). Purely additive: `continuity`/`continuityHook` fields + `ContinuityCard` on the daily screen; no generation-logic change; CONTINUITY_VERSION unchanged; no Sid gate needed (copy re-mappable). tsc both clean.

---

## 🟢 S-R7 — Q&A + Timing Engine gates (📋 R7 DEEP-PLANNED 2026-07-15; D3/D6/D7 PM-APPROVED 2026-07-16 — `build-27/R7-QA.md §11`)

> Sid's 2026-07-14 confidential handover RESOLVED the biggest gates; the three remaining copy/product gates (D3/D6/D7) are now **PM-APPROVED (2026-07-16)** — no longer Sid decision gates. Their residual artifacts are ordinary build tasks (below), NOT gates. Details self-contained in the plan's §11 + spec §16.

### 🟢 R7 IMPLEMENTATION UNDERWAY (2026-07-22) — home chat active; §13 STEP 0 issued
- **Status, NOT a Sid gate.** R7 orchestration home is live; charter = `R7-QA.md §13`; per-step prompts = `prompts.txt §13`. **Step 0 (engine on FX1–FX6) ISSUED + RUNNABLE NOW** — it reproduces the fixtures LOCALLY against the on-disk handover (gitignored), touches no prod runtime, and is posture-agnostic (its loader reads the rule set from config/env, fail-closed if absent). **Rule-set runtime posture is already DECIDED — S-R9f/D8 (PM, 2026-07-17): out-of-git + a private-R2 `loadConfidentialConfig` loader R7 inherits (NOT commit-to-repo).** The residual is a **Phase-B code-fact, not a decision:** `loadConfidentialConfig` does not exist yet (R9 built only `loadConfidentialPrompt`, a bundled-file reader) → have Claude Code verify-or-build the R2 loader before deploy (`owner-actions.md`).
- **⛔ S-R7d — Step-0: 2 fixture rule-gaps → SID (SOURCE-GROUNDED re-verification DONE 2026-07-23; genuine handover gaps, NOT impl bugs).** Home re-opened the handover §2 directly, read the transcribed `rule-set.json`/`fixtures.json`, and RAN the harness on the current tree with per-fixture chart traces (all six charts captured). **The prior "interpretation A" escalation is SUPERSEDED — A, B, and the "guessed house mappings" concern are all RESOLVED from source, NOT Sid questions:**
  - **A (karya-lord definition) — DEAD.** R1 verbatim = *"Karya lord dignity: exalted or own sign +2…"* — the term is "**karya lord**", defined by exact parallel with R3/R4's "**lagna lord**" = the **sign-ruler** of the bhava. There is **no "exalted-occupant-supersedes" anywhere**; occupants are scored **separately by R5**. The tree **already** uses the literal ruler (`timing-engine.service.ts:333`, interpretation A removed) and **FX4 PASSES under it** (favorable 0.60, within ±0.05 of 0.65) — so the note "karya lord exalted in the 11th" is over-determined prose, not a gate. Home's earlier "the notes require A" call is now retracted with evidence.
  - **B (R6) — DEAD.** R6 verbatim = *"Jupiter's aspect on the karya bhava or the lagna"*; Jupiter **occupying** the karya bhava scores via R5. Tree implements aspect-only. **C (R4 external self-direction)** is implemented for `job_external`/`job_promotion` and **FX1 passes**.
  - **§2.1 mappings — already verbatim.** `karyaBhava.map` matches §2.1 exactly (relocation `[12,4]`, income/gains `[11]`, own-venture `[7,10]`). The "sub-chat guessed the houses" premise is **moot on this tree**.
  - **GENUINE RESIDUE = exactly 2 fixtures (14/17), 2 rule-gaps §2.2/§2.3 don't cover:**
    1. **FX3 relocation** (expected favorable 0.70 → actual **mixed 0.55**). Chart is correct — the note's own "Moon-Saturn in the 8th" matches exactly (Moon+Saturn both in Pisces/H8, Leo lagna). But the note also claims **"R2 twelfth-house exception fired"**, which is **impossible on this chart**: the 12th-lord (Moon) is in H8, the 4th-lord (Mars) is in H10, and the only planet in H12 is **exalted Jupiter** — not a relocation karya lord. Under literal §2.2 the max reachable is **S≈+3 → conf 0.50**; favorable-0.70 is unreachable. **For Sid:** what scoring yields favorable-0.70 here — a dual-primary-house (`[12,4]`) karya-lord rule, a factor for the exalted benefic sitting in the 12th, or is the note's "R2 12th-exception" a slip?
    2. **FX6b `scale_metric_within_6mo`** (expected unfavorable 0.70 → actual **favorable 0.65**; confidence already within tol). Karya house 11 (Capricorn) → ruler **Saturn in the lagna (H1)** → R4 (+2) **and** R3 (+1) fire → S=+7 favorable. The expected unfavorable is a **deadline miss** — the substantive window (2028-09) falls **outside** the asked 6 months — but **R10 as written can't produce it**: it only bites when "neither R3 nor R4 fired" (both fire here), and it keys on an explicit `deadline` field (FX6b uses `askedWindowMonths:6`). **For Sid:** confirm a **"substantive window falls outside the asked deadline → Unfavorable for the deadline as asked"** classification rule (§2.4 item 4 only says to *state* inside/outside, not to classify on it), and whether "within N months" counts as a deadline — OR a different karya mapping for a within-N-months achievement.
  - **Engine stays UNCOMMITTED** until Sid's 2 answers land in ONE final fix → all-green → commit (engine + harness only; config gitignored) → §13a DONE → Step 1. **Do NOT retune weights** (Sid's rule). Full charts + traces in `per-chat-report.md` (gitignored). (`prompts.txt §13a`.)
  - **✅ STEP-0 CHAT RECONFIRMED (2026-07-23, `§13a-RC`):** the Step-0 chat re-ran `npm run test:timing` independently on the current tree (temp env-gated trace, reverted, grep=0; tsc clean) → **reproduces 14/17 + the exact two-item residue** (FX3 favorable-0.70 unreachable under the sign-ruler def; FX6b needs a deadline-frame rule + a ruler-unconnected karya house). Home verified the trace table against the engine+config. **Escalation is now LIVE — send Sid exactly the 2 questions above; no third item.**
  - **✅ STEP 0 COMMITTED + DECOUPLED (2026-07-23, owner deadline call — `6987ff6`):** FX3 + FX6b converted to **tracked XFAIL** in `timing-fixtures.check.ts` — each **pinned to its current output** (FX3 mixed/0.55; FX6b favorable/0.65) with a comment citing this gate, so behavior can't drift silently (a change trips the harness). Harness GREEN = **5 PASS + 2 XFAIL, 0 unexpected** (a real-pass regression is still a hard fail). Committed **engine + harness + package.json ONLY** (config/timing + handover stay gitignored/uncommitted; verified 3-file commit). Engine byte-identical to the reconciled literal-ruler state — harness-status change only, no weight retune. **Step 0 is now UNBLOCKED for downstream: §13b (Step 1 router) ISSUED on this clean baseline.**
  - **✅ S-R7d RESOLVED (2026-07-23) — Sid delivered Rule Set v1.1** (`server/config/timing/Revelia_Timing_Engine_RuleSet_v1_1_Amendments.md`, gitignored, never committed). Both threads answered: **FX3** — Sid CORRECTED the fixture (0.70 was practitioner judgment; the engine's **0.60** is the intended calibrated output; the fixture is corrected, not the engine) + R16 dual-primary chains + R5a dignified occupants make FX3 favorable/0.60. **FX6b** — new **R17** frame-bounded two-part verdict (subsumes R10): directional favorable BUT `unfavorable_for_frame`/0.70 (window 2028-09 is beyond the asked 6-mo frame), via 2.4a threshold subtype. **Impl = Step-0b re-open** (`prompts.txt §13a-v1.1`) — NOT an xfail flip: it's R16/R17/2.4a/R2a/R5a/R12a + a new `frame` object on the §5 contract, all 7 fixtures re-run to 17/17. **✅ STEP-0b DONE + HOME-VERIFIED (2026-07-23, committed `0174382`):** 7/7 units, 17/17 assertions, 0 xfails, tsc clean; FX3 favorable/0.60 EXACT + FX6b unfavorable_for_frame/0.70 EXACT (traces match Sid's §2/§3); FX1/2/4/5 ripple-checked (all pass, conf within ±0.05). Config gitignored, 2-file commit, R9 module untouched. **§13a FULLY DONE. S-R7d CLOSED.**
- **✅ S-R7e RESOLVED (2026-07-25) — Sid delivered Rule Set v1.1.1** (`Revelia_Timing_Engine_RuleSet_v1_1_1_Patch.md`, Sid 2026-07-24; transcribed into the gitignored `rule-set.json`, never committed. Engine+harness committed `be02d28`). Was: FX6b's window DATE read 2035-06 vs Sid's §3 2028-09 (verdict/basis/confidence always passed; the date was not asserted). **⛔ Sid REJECTED the proposed "tag Venus as a universal wealth/gains lord" workaround** — "that would fit this one querent and distort every other chart." **Do not re-raise it.** His actual principle: **R11a two-path domain alignment** — a dasha/AD/PD lord aligns with a domain if EITHER (1) its R11-table significations match (natural, unchanged) OR (2) **natal-functional**: in the querent's natal chart it OCCUPIES the natal karya house for the category, or RULES it by sign lordship (nodes by **occupancy only** — no sign lordships for nodes). Applied in both places R11 is used (the ±1 factor and the 2.4 window scan). Plus: **Ketu** gains displacement/relocation/pilgrimage, and a **30-year no-alignment fallback** (fall back to the strongest benefic transit on the natal karya house and say so honestly in the basis — never fabricate a distant boundary). **No scoring weights changed.** Result: **FX6b = 2028-09/ad_boundary** (Venus OCCUPIES the natal 11th — ablation-confirmed it rides specifically on the OCCUPANCY path, exactly as Sid's derivation states) and **FX3 = 2027-07/ad_boundary** (Ketu's new displacement/relocation tags). Gate **22/22 assertions, 8/8 units green**; FX1/FX2/FX4/FX5/FX6a **byte-identical** (full-output diff). **Root cause of the hiding:** the harness asserted only the window BASIS, so it reported 17/17 GREEN while emitting 2035-06 against a fixture pinned at 2028-09 — window DATES are now asserted. **⚠️ Deployed environments still load v1.1 until the new `rule-set.json` is re-uploaded to the `revelia-timing` R2 bucket — `owner-actions.md` LG17.**
- **🟡 S-R7f (NEW, NON-BLOCKING — needs Sid's confirm) — does a NATAL-FUNCTIONAL match on the RUNNING AD lord earn the R11 ±1, or only the texture?** v1.1.1 says BOTH that the two-path test "applies in the ±1 scoring factor (current AD lord versus domain)" AND that FX3's verdict is "favorable **0.60** unchanged". On this querent those cannot both hold: FX3's running AD lord is **Mercury**, which OCCUPIES the natal 12th (a relocation karya house) → the natal-functional path fires → R11 +1 → **S 4→5, confidence 0.60→0.65**. Shipped as `natalFunctional.runningPeriodScores: true` (the patch's literal instruction; FX3 = 5/0.65), with the alternative reading one config key away (`false` → the running-period match yields only the "already in motion" texture Sid describes, and FX3 returns to exactly 4/0.60). **Both are inside the fixture's ±0.05 band so the gate is green either way, and no other fixture moves either way** (ablation-verified). Nothing is blocked; **→ Sid: which reading?** (`build-27-caveats.md` R7 §.)
- **🟡 S-R7g (NEW, NON-BLOCKING — needs Sid's confirm) — natal-functional granularity: AD gates only, or PD boundaries too? (collides with FX5's documented window.)** R11a's prose says the scan takes "the next AD **or PD** boundary", but **reproducing Sid's pinned FX3 = 2027-07 requires restricting the natal-functional path to ANTARDASHA (era) gates** (`natalFunctional.antardashaGatesOnly: true`). With PDs included it qualifies the Saturn PD at 2027-02-22 (Saturn rules Aquarius = the natal 12th) and FX3 surfaces **2027-02** — ablation-verified. Shipped restricted, on the same doctrine as the existing `thresholdUsesAntardashaGatesOnly` (a period lord's natal-functional delivery is an era-level statement; PD sub-divisions are momentum-grade), and it is what makes both of Sid's worked examples literal "AD scans". **Complication worth his eye:** FX5's *documented* (never-asserted) window 2026-10 is exactly reproducible **only** with the opposite settings (`antardashaGatesOnly:false` + `requiresMappedKaryaHouse:false`), which both suggests the natal-functional path was already live in the v1.0 hand-derivations AND means **FX3's pin and FX5's doc cannot both be satisfied**. FX3's pin is explicit and fresh, so it wins for now and FX5 stays byte-identical. **→ Sid: confirm the granularity, and correct the FX5 doc?** (`build-27-caveats.md` R7 §.)

### ✅ RESOLVED by the handover (2026-07-14) — do not re-raise
- **D2 — Timing rule set + 6 fixtures + reflective mapping** — DELIVERED (Monty Adams natal). Sid's priority: implement the rule set against the fixtures FIRST; a fixture misclassification = the impl is wrong (escalate, don't retune). Action for Amey: estimate the engine build + send Sid a rough schedule.
- **D5 — Per-device anti-farming** — APPROVED as proposed (salted hash, never raw); exact privacy-policy line + Google Play Data-safety declarations + salt rotation + retention rules all supplied (folded into `R7-QA.md §4/§6`).
- **Grounding scope** — CONDITIONAL FULL-BLUEPRINT GROUNDING confirmed (chart+timing always; numerology when name-at-birth on file; palm/face wired-now-empty). The moat is restored.

### ✅ PM-APPROVED (2026-07-16) — no longer Sid gates; residual artifacts are ordinary build tasks
- **S-R7a / D3 — Question caps + Deep Insight sub-caps — 🟢 APPROVED (PM).** Free 3 (1 DI) / Premium $7.99 → 10 (3 DI) / PP $12.99 → 15 (8 DI), calendar-month, no rollover are **final**. *Residual build task (config check, not a gate):* confirm the annual plans ($59.99 / $89.99) map to the **same monthly caps** in the RevenueCat config.
- **S-R7b / D6 — Copy sign-off — 🟢 APPROVED (PM).** *Residual build/content tasks (produce before wiring, not gates):* final entertainment-disclosure string; final 402 upgrade-CTA string; final trade-secret marketing line ("timed to the moment of asking" as the max claim). **✅ Off-Topic/Unsafe/Crisis Guide — DELIVERED + PM-approved as-is** (`plans/build-27/R7-OffTopic_Unsafe_Crisis_Guide.pdf`): a single general-wording, number-free, hardcoded string (deliberately NOT a region-by-region list) + the Haiku classifier prompt + 10 classifier fixtures + routing logic + the off-topic/unsafe decline strings. **The guide IS the source — wire it verbatim; never invent, draft, stub, or model-generate crisis content.** ONLY residual = Sid's one-line confirm the wording is FINAL (message drafted) → gates the **Phase-B** crisis-block wiring, NOT Phase A. The anti-farming privacy line is already done (D5). **✅ RESOLVED (2026-07-23) — Sid CONFIRMED the general, number-free crisis wording is FINAL** (not a stopgap; Rule Set v1.1 §5, rationale: user base spans US/India/Brazil/Canada — a hardcoded number is wrong for most users most of the time). `CRISIS_WORDING_FINALIZED` flipped **true** in `qa-router.service.ts` (committed `77df885`). **§13b is now FULLY DONE.** Guardrails architecture ENDORSED by Sid. **Step 3 (serving path) MUST still consult that flag before returning crisis text** (the router's `resolveDeclineText` deliberately does not). **Optional 27.1 fast-follow (owner's call, ZERO launch dependency):** a 4-market country-append (US/CA 988, IN Tele-MANAS 14416, BR CVV 188) — deferred, see `build-27-caveats.md`; NOT built unless the owner says so. **4 v1.1 crisis LAUNCH-GATE additions** logged in `owner-actions.md` (log-privacy, crisis-screen suppression, +Hindi/+Portuguese fixtures, optional format fail-closed).
- **S-R7c / D7 — Location consent UX + privacy-policy update — 🟢 APPROVED (PM).** *Residual build/legal artifacts (produce before the location feature ships, not gates):* consent copy + the privacy-policy change for per-question city-level device location. Interim: a fallback-to-birth-city path ships without device consent.

### 🟡 Non-blocking (decide during the build)
- **✅ D1 DECIDED (owner, 2026-07-24): follow-up context depth = last ~6 turns** (v2-recommended default). Baked into §13d (Step 3). **✅ D4 DECIDED (owner, 2026-07-24): beyond-cap = credit packs** — at-cap → 402 (upgrade/next-reset CTA); counter STUBBED for future credit-pack top-ups (purchase flow later/v2, NOT built now). **✅ Response-envelope/402 DECIDED (owner, 2026-07-24): 200 nested `{success,data}` / 402 metadata TOP-LEVEL** (mirrors the existing gate middleware). All three shape §13d. **D3b** free-day-one vs phased (recommend phased B-before-C) — still open. **D8** Swiss Ephemeris license — **likely MOOT** per the §17.1 spike (Moshier needs none); confirm it's not required. **D-routing** confirm both paid tiers use the same models (Opus regular / Fable DI), the DI sub-cap being the only differentiator (verify model IDs via claude-api skill at Step 3).

---

## 🟢 S-R9 — Personalized Cosmic Report (📋 R9 DEEP-PLANNED 2026-07-16; **D1–D5 RESOLVED 2026-07-16** — `build-27/R9-report.md §12`)

> R9 is the flagship paid deliverable, implemented **before** R7 (owner sequencing). Most items are **eng/PM**, not Sid copy-locks. **D1–D5 + D8 are now RESOLVED; D6/D7 are ordinary build/eng items (D7 resolving — private bucket being provisioned).** No open decision blockers remain; the prompt is **committed at `server/src/prompts/`** — the only residual action is uploading the sample PDF to R2. See also `R9-open-items-sid-pm.md` (temporary hand-off snapshot). Details in `R9-report.md §12` + `build-27-caveats.md` R9 §.

### ✅ RESOLVED (2026-07-16)
- **S-R9a / D2 — Generation architecture [Amey/eng] — 🟢 APPROVED: Mode B** (backend-computes / model-writes / controlled-renderer-builds; §0). Build size acknowledged (net-new PDF renderer + async job + ~10 net-new astronomy derivations + storage/delivery seam). **✅ PHASE-0 SPIKE DONE (2026-07-18, `881645c`, `R9-report.md §0.1`):** astronomy-offload sub-question CLOSED — **no probe run, offload rejected on cost, astronomy stays in Node**; render path CLOSED — the confirmed chain (matplotlib → Node `docx` → LibreOffice `soffice` PDF) reproduced the sample at fidelity, **LibreOffice-on-Railway = viable-with-Dockerfile** (empirical Railway deploy deferred to Phase-A step-1; HTML→Chromium held as fallback). Mode B unchanged. Build-time refinements recorded (`build-27-caveats.md` R9 §): vector charts, embed Georgia, en-dash QA scan, Dockerfile, cost is a heuristic.
- **S-R9c / D3 — Credit reset boundary [PM] — 🟢 RESOLVED:** calendar-month boundary (1st, UTC), **no rollover**, one **shared self-or-other pool**; no subscription-renewal alignment. Mechanism = doc-counting against `Report.generatedAt` (implicit reset at the boundary → no new cron; `0 0 1 * *` UTC if an explicit refill is wanted); deduct only on a QA-passed `ready` report.
- **S-R9d / D4 — Subject scope [PM + safety] — 🟢 RESOLVED (scope split):** **v1 = "generate for YOURSELF" ONLY.** The "someone-else" path (typed third-party data; minors via age-from-DOB → `SUBJECT_TYPE=child`; **no third-party palm**) is **designed + turn-on-ready** but **DEFERRED to a phase at the END OF INTERNAL TESTING** (`R9-report.md §9` Phase D). Cleanly additive (compute/render/deliver are subject-agnostic). Child-safety rules enforced end-to-end at turn-on (never romantic/fear content about a minor; face auto-skipped). Face stays excluded (Play Store); third-party palm stays excluded (BIPA).
- **S-R9b / D5 — Delivery seam [Amey/eng] — 🟢 REFRAMED/RESOLVED: not a broken-integration fix.** The delivery seam (`uploadBuffer` non-image → private R2 key/TTL link via `getSignedUrl` → `sendReportEmail` link-email) is built **INSIDE Phase A** as first-class R9 infra; **Export-My-Data (R8) is a fast-follow that reuses it.** Residual (ordinary): verify `SENDGRID_API_KEY` on Railway + link-TTL.
- **D1 — Numerology Y-as-vowel — 🟢 DECIDED (Sid, 2026-07-16): Y ALWAYS a vowel, project-wide** (same decision governing R7). **Open = execution, not the decision.** Build = add `'y'` to the single `VOWELS` set (`nameNumerology.ts:13`) → **`NUMEROLOGY_VERSION` bump** → re-run `backfill:numerology` (version-aware). Shared R7/R9 migration — do it **once**; R9 consumes the migrated util. ⚠️ soul-urge/personality shift for some Y-name users (correctness fix; mirror R4's FYI).
  - ✅ **FOLLOW-UP RESOLVED (2026-07-20, commit `7805e86` — "finding-C" prompt reconciliation).** The generation prompt was reconciled: (1) a `NUMEROLOGY_JSON` Mode-B injection block added (§3, mirroring `ASTRONOMY_JSON`); (2) §4 changed from "compute" to **"Source every numerology value from the injected `NUMEROLOGY_JSON`… do NOT recompute"** (methodology tables retained only to make the arithmetic reproducible/transparent); (3) the contextual-Y prose replaced with **"Y is always a vowel"** (matches D1). Home-chat VERIFIED against the file (§3 L104, §4 L136, Y-rule L144). This CLEARED the hard prerequisite gating R9 §14 step 5. Cost pass ran clean afterward (see S-R9k).

### 🆕 S-R9j — Astronomy DERIVED-quantities: inject-vs-compute (finding-C analog; NON-blocking, PROCEEDING ON DEFAULT)
- **Surfaced 2026-07-20** (home-chat, reading the reconciled prompt to scope step 5). **The parallel of finding-C, on the astronomy side — lower severity.** Prompt §3 Mode-B (`:75`) says "skip computation and **validate**" the injected `ASTRONOMY_JSON`, but that schema (`:77-88`) enumerates only **raw** longitudes + ingresses, and §3 item "Derived quantities (**compute in both modes**)" (`:92-100`) tells the model to compute nakshatra/pada/D9/house/dignity/**Vimshottari dasha ladder**/panchanga/yogas/transit maps **itself** — i.e. the model does the exact arithmetic Mode B exists to eliminate (and which the sample PDF got wrong). Our isolated sidereal engine (steps 1b-1d) ALREADY computes ALL of these deterministically, and the step-5 cost pass injected the **full derived set** (nakshatra/pada/D9/dignity/panchanga/named-yogas/transit tables, ~10.5K tok). So the WORKING ASSUMPTION is inject-full-derived.
- **Why lower-severity than finding-C:** numerology had NO inject slot → the model was FORCED to compute (hard blocker). Astronomy HAS a slot; injecting the rich derived set means the model will naturally present it. The residual risk is only that §92's "compute" prose could let a strict model recompute a derived value (dasha dates / D9) and diverge from the engine.
- **Default taken (building on it):** step 5 injects the FULL engine-derived set into `ASTRONOMY_JSON`; **QA step 7 validates** the rendered report's discrete astronomy values against the injected engine values (catches any model recompute-divergence).
- **Recommended (optional, cheap, Sid-gated because it edits the prompt):** a parallel tweak mirroring the finding-C numerology fix — extend the §3 `ASTRONOMY_JSON` schema to enumerate the derived slots + reframe §92 to "**consume** the injected derived quantities; the tables document methodology so the report shows reproducible arithmetic; never substitute a model-computed value." Makes consume-not-compute a guarantee, not a QA backstop.
- ✅ **DECIDED (owner, 2026-07-20): DO THE TWEAK — same pattern as finding-C, LAND IT BEFORE step 5b.** So this is now a **GATING prerequisite for 5b** (not optional), tracked in `owner-actions.md` 🚫 GATING. Step 5a proceeded as-is (already injects the full derived set — belt-and-braces). The home chat does NOT issue 5b until the astronomy prompt tweak is committed (exactly as finding-C gated the original step 5). (`build-27-caveats.md` R9 step-5.)
- ✅ **RESOLVED / DONE 2026-07-20 (commit `ed5773d`).** The prompt tweak landed: §3 now enumerates the `ASTRONOMY_JSON.derived` block (field names matching 5a's `ReportAstronomyPayload.derived` key-for-key) and reframes "Derived quantities" to consume-not-compute (methodology retained; Mode-A self-compute preserved). Home-chat VERIFIED against the prompt file + the 5a types (zero mismatches). **5b is now UNBLOCKED.**

### ✅ S-R9k — Report prompt OUTPUT CONTRACT: Mode-A `.docx`-build vs Mode-B pure-prose (GATED step 6) — CLOSED (2026-07-21): decision (A) done, edit `2755538`, confirm-smoke **3/3 PASS**
> **✅ CLOSED (2026-07-21).** Decision (A) landed (`2755538`) AND the confirm-smoke passed → S-R9k is settled and **step 6 is UNBLOCKED**.
> **CONFIRM-SMOKE (owner re-run, Opus-4.8 floor, flag OFF, on `2755538`):** the model now emits **PURE PROSE + the manifest/markers, NOT a code/`.docx` build-script.** Three checks, all PASS: **(1) prose not code** — 0 code fences, 0 `docx`/matplotlib/`print`/hallucinated verification, 0 `computer://` links; **(2) all 14 `===SECTION: <id>===` ids exact + in fixed order** (`highlights`·`cover`·`how-to-read`·`part-i`…`part-vii`·`appendix-a`…`appendix-d`); **(3) `[[CHART]]`/`[[TABLE]]` markers bare on their own lines, ZERO model-authored cells** (0 markdown pipe-rows; 3 charts + 12 table markers; numbers consumed verbatim — ayanamsa 23.6227, Taurus lagna 20°09', LP master 11 — no arithmetic). Cost dropped with the code scaffolding gone: **Opus $0.46/report** (in 41.2K / out 10.3K tok, `end_turn`, 168s, 4.7K words) vs the pre-reconcile Mode-A $0.87. Full numbers in `tracking_files/build27-usage-cost.md`. **This §8 Output Contract is the STEP-6 renderer contract.**
> **One cosmetic residual (NOT a fail → `build-27-caveats.md` OUTPUT-CONTRACT):** `[[TABLE: birth-details]]` was emitted TWICE (in `cover` and again in `part-i`) — both are valid per the contract's "`cover` / `part-i`" mapping, so the renderer should dedupe (or the prompt could pin it to one section). Cosmetic tidy, not a contract breach.
>
> **DECISION (owner + Sid, 2026-07-21): option (A) — rewrite to pure Mode-B prose. DONE in commit `2755538`** (`prompts.txt §12p`): §0/§1/§8/§10 rewritten — dropped all code-exec/`.docx`/matplotlib/LibreOffice/pypdf deliverable machinery; §8 is now the **Output Contract** with a pinned 14-id `===SECTION: <id>===` manifest, `[[CHART:]]`/`[[TABLE:]]` markers, a **TABLE-ID→INJECTED-PATH map verified against 5a's `ReportAstronomyPayload`/`ReportNumerologyPayload` (zero phantom fields)**, and a server-facing `highlights` block; §10 is now a prose self-check. finding-C/S-R9j consume rules + §9 + §3-ModeA + child/face/palm all preserved (home-chat VERIFIED against the file).
>
> *[original decision framing retained below for record]*
- **Surfaced 2026-07-21 by the step-5b cost smoke; home-chat INDEPENDENTLY CONFIRMED** (read the Opus dump — it is a code-execution transcript, not prose). **The shipped confidential prompt is a MODE-A code-execution prompt** (§1 "run in a fresh chat with code execution + file creation … returns the .docx"; §8 target = one `.docx`; §10 docx QA), but the R9 architecture (D2 = Mode B, APPROVED) + `report.service` run it as a plain TEXT call with no code tool. Result: both Opus and Fable emit a **`.docx` BUILD-SCRIPT transcript** (matplotlib/`docx`/hallucinated verification), which `report.service` would persist as `interpretation` — **unusable by the Mode-B Node renderer.** finding-C + S-R9j reconciled the INPUT side (consume injected numbers — CONFIRMED working: values are consumed verbatim, prose-inside-code is sample-grade); this is the **missing OUTPUT-side reconciliation.** Cost is NOT the issue (Opus $0.87 / Fable $3.35, both affordable) — the OUTPUT MEDIUM is.
- **DECISION NEEDED (Sid-gated — edits the confidential methodology; GATES step 6):**
  - **(A) Rewrite the prompt to PURE Mode-B prose** — RECOMMENDED. Drop all code-exec/docx/matplotlib/verification machinery; emit ONLY per-§8-section structured prose with **stable machine-parseable delimiters** (e.g. `===SECTION: part-i===` matching the §8 manifest, or JSON-keyed-by-section) — the same finding-C/S-R9j family, OUTPUT-side. The step-6 Node renderer then builds the PDF + charts. Consistent with D2 (Mode B APPROVED), the controlled renderer, the QA gate, and the injected-astronomy/numerology design; the smoke proves the model already consumes values + writes sample-grade prose — it just needs to be told to emit prose, not code. Also folds in the DO-6 renderer-contract fix (stable boundaries) in one pass.
  - **(B) Wire a code-execution renderer (Mode A)** — spike whether an API code-exec sandbox can run the emitted script AND convert docx→PDF. ⚠️ The Phase-0 spike (§0.1 Part A) already REJECTED Mode A: no LibreOffice in the sandbox (docx→PDF gap), produces `.docx` not PDF, contradicts the controlled-renderer + QA-gate + no-model-arithmetic rationale (the smoke shows the model runs validation arithmetic in code — the exact Mode-A residue Mode B exists to remove).
- **Recommendation: (A).** It finishes the reconciliation Mode B always required, keeps every downstream decision (renderer, QA, charts) intact, and the empirical evidence says the content is right — only the packaging is wrong. Home chat can draft the (A) prompt-rewrite scope on the owner's word (finding-C/S-R9j-family, Sid-gated). (`build-27-caveats.md` OUTPUT-CONTRACT; `tracking_files/build27-usage-cost.md`; `owner-actions.md` STEP-6 GO/NO-GO.)

### ⏳ REMAINING (actions + build/eng items — no decision blockers)
- **S-R9f / D8 — Confidential-config home [PM] — 🟢 RESOLVED (PM 2026-07-17), split by sensitivity.** (1) The confidential `Revelia_Complete_Reading_Generation_Prompt_v1.md` is **committed to this private, org-only (dev + founder) repo** as a server-side file → read **bundled** (no Railway runtime-loading problem; the "gitignored ≠ deployed" worry is moot). (2) The Monty-Adams sample PDF → **R2** (shown to all incl. free; not git; local gitignored copy = render-spike target). **✅ VIEWER BUILT 2026-07-25 (un-deferred):** the step-9 "deferred" note was stale vs this spec; owner confirmed PM/Sid approval. Wired as `GET /api/reports/sample` + a "View a sample report" button on the free-locked + paid-entry screens. **Bucket = PRIVATE `revelia-reports` (presigned), NOT a public object** (deviation from the "public object" wording — reuses the provisioned `R2_REPORTS_*` client; all users authenticated so presign satisfies "shown to all"). Owner action = upload the one asset (`owner-actions.md`). (3) The **R7 Timing-Engine rule set stays OUT of git** (tighter access) → a private-R2 `loadConfidentialConfig` loader R7 inherits; R9's prompt doesn't need it. **Remaining = action, not decision:** the prompt is **committed at `server/src/prompts/`**; upload the sample PDF to R2.
- **S-R9g / D7 — PDF hosting + secure-link policy [eng] — ⏳ resolving.** **A private R2 bucket is being provisioned by Sid.** PDFs live under a private key/path there; the D5 seam wires `getSignedUrl` for TTL'd links. Confirm bucket name/creds + link-TTL at build.
- **S-R9e / D6 — Mockups finalization [PM/design] — 🔴 post-build.** Screenshots are prototypes; finalize UI + PM approval (incl. the **indigo icon + gold NEW badge**, net-new tokens).
- **S-R9h — Stationary-planet speed threshold [Sid confirm; non-blocking] — 🟡 PROCEEDING ON DEFAULT.** Prompt §3 item 4 says only "|speed| near zero"; the engine (Phase-A step 1c, `6814eea`) chose **0.03°/day** to match the sample (Jupiter flagged stationary-in, Saturn out). It is a **project-wide definition set from ONE data point** → Sid confirms 0.03 or sets the number. Building on 0.03; a later revision is a one-constant change. (`build-27-caveats.md` R9 step-1c.)
- **S-R9i — Nodes (Rahu/Ketu) get NO exalt/debil/own/moolatrikona [Sid confirm; non-blocking] — 🟡 PROCEEDING ON DEFAULT.** Step 1c assigns the nodes no classical dignity (tradition is non-unanimous — some schools give Rahu/Ketu exaltation signs). Documented assumption → one-line Sid confirm. Building on no-node-dignity; re-mappable.

### 🟡 Non-blocking (decide during the build)
- R9 job-runner: cron-claim DB-job for v1; revisit a real queue if concurrency grows. Sample-asset hosting (R2 vs bundled). `max_tokens` ceiling for the `report` synthesis surface. All eng, decide at build time.

### 🟡 S-R9L — R9 report TIER REACH (both paid tiers vs Premium-Plus-only) — DECIDE ON INTERNAL-TESTING COST DATA (Sid, 2026-07-22)
- **The question (Sid):** the Personalized Cosmic Report currently generates for **both paid tiers** (`reportLimitForTier` = free→0, premium/PP→1). Sid wants the per-report **cost across models** analyzed and — if it costs more than he expects — is considering restricting the PDF feature to **Premium-Plus only**.
- **What's already MEASURED** (`build27-usage-cost.md`, N=1 staging smoke each): **Opus-4.8 = $0.87/report** (the PROD DEFAULT — `SYNTHESIS_FABLE_ENABLED` OFF), **Fable-5 = $3.35/report** (flag ON). At **1 report/month/paid-user**. (Sonnet-5 is NOT a report-surface model — the report is a marquee paid surface; the two real options are Opus floor / Fable.)
- **DECIDE ON INTERNAL-TESTING DATA, not now** — the per-report cost is auto-logged from day one (`report.service` persists `modelUsed`/`usage`/`costEstimate` per report), so internal testing yields the real cost DISTRIBUTION (mean + spread across varied users), which the N=1 smokes can't. Diff vs Sid's bar → decide.
- **BOTH levers are SERVER-SIDE + REVERSIBLE → no rebuild, ship-then-adjust:** (a) TIER = the one-line `reportLimitForTier` (both-paid `!=='free'?1:0` → **PP-only** `==='premium_plus'?1:0`); (b) MODEL = the `SYNTHESIS_FABLE_ENABLED` env flag (Opus $0.87 floor ↔ Fable $3.35). Neither is baked into the mobile AAB. So the SAME internal-testing build promotes to prod; tier/model adjust server-side on the data.
- ⚠️ **If Sid picks PP-only:** a small STEP-9 PAYWALL-COPY follow-up — a `premium` (non-PP) user would then hit the free-lock 402 (`tier:'premium'`, limit 0), but the current free-lock copy says "A Premium feature / Unlock with Premium" (aimed at FREE users). For a premium-user-locked-out-of-a-PP-feature it must read "A Premium Plus feature / Upgrade to Premium Plus." One-line switch + this tiny copy case. (`owner-actions.md`; `prompts.txt §12u` DO 6.)

---

## 🟢 R5 — OWNER/ORG GATES (settled by the step-1 probe — both PASS; NO Sid escalation) · R5 IMPLEMENTATION COMPLETE

### R5 — Fable 5 API-org access + 30-day retention (settled by the step-1 probe)
- **R5 ✅ IMPLEMENTATION COMPLETE 2026-07-11** (§9 steps 1–4 committed `2c7a463`→`1227d6a`; 6/6 surfaces weave the 4 feature sets + route Fable 5→Opus 4.8; A/B log + fallback verification + migration doc). No Sid gate was ever required for R5.
- **Status:** ✅ **BOTH GATES PASS (2026-07-09, R5 §9 step-1 probe).** No Sid escalation needed. R5 has **NO copy-taxonomy Sid gate** (unlike S1/S2/S3) — it authors synthesis *prose*, and reads S1/S3 archetype names from re-mappable `UserInsightProfile` fields (never hardcodes them). The two **owner/org gates** were settled empirically by the **R5 step-1 Fable 5 probe** (one `claude-fable-5` call with the SERVER's real `ANTHROPIC_API_KEY` from `server/.env` — the Railway/Console API org, NOT a claude.ai subscription):
  - **(a) Fable 5 API-org access** — ✅ **PASS.** Probe returned **200 / normal response**, `served model: claude-fable-5`, `stop_reason: end_turn`. Confirmed for the API org.
  - **(b) 30-day data retention (not ZDR)** — ✅ **PASS.** The 200 (no retention-400) confirms the org meets the 30-day retention requirement. **No Sid escalation** (escalation was contingent on a retention-400, which did not occur).
- **Probe evidence:** cheap-model connection test OK after the SDK 0.32→0.110 bump; Fable 5 call with `betas:['server-side-fallback-2026-06-01']` + `fallbacks:[{model:'claude-opus-4-8'}]` + `output_config:{effort:'low'}`, streamed via `beta.messages.stream().finalMessage()`, no `thinking`/sampling params → clean 200. This also validated the exact request shape used by `createSynthesisMessage`.
- **Resilience posture (post-implementation):** Fable 5 stays flag-gated (`SYNTHESIS_FABLE_ENABLED`, **default OFF**) with **`claude-opus-4-8` as the guaranteed path**. All 4 R5 steps are done; the flag flip is now a pure **owner/post-deploy** action — flip ON at rollout AFTER the live D7/D30-retention / regeneration-rate / free→paid A/B (measured off the new `ai_generations` log) shows clear lift. ⚠️ The server-side `fallbacks` param covers POLICY declines only — it does NOT rescue availability/retention 400s; the flag is the availability layer.

---

## 🟢 RESOLVED — kept for record

### R2 decision #1 — forehead → cheekbones card
- 🟢 **RESOLVED 2026-06-30 → DROP the card.** Cheekbone-reliability probe: reliable detection but the signal doesn't discriminate (prominence is 3-D, unmeasurable from 2-D frontal 68 pts). Per-feature cards are display-only → zero personalization cost. Implemented inside R2 steps 5+7.

### R2 decision #2 — closed archetype list · #3 — stability over variety
- 🟢 **APPROVED 2026-06-30 (with conditions).** #2's condition = the **S1** deliverable (still pending). #3 → the prose-never-contradict rule (enforced in R2 step 5 + a passing check).

---

## 🟢 Meanwhile — NOT blocked (build these without Sid)

- **R3:** step 3 ✅ done (2026-07-01) · step 4 ✅ done (2026-07-02 — upload hook per hand + lazy fallback) · **step 5 ✅ done (2026-07-08 — palm reading rewired to consume the per-hand trait layer; traits-driven `buildTraitDrivenPalmPrompt` + `reconcilePalmSubstance` pin palmType/energyType/talents/lifeTheme; lines-as-flavor S2 framing [image passed for major-line DESCRIPTION only, forbidden from contradicting measured substrate]; prose-never-contradict rule in prompt; per-hand substance built in `getPalmReading` — dominant from stored `palmProfileResult`, non-dominant RE-MAPPED from stored vector; tsc clean both)** · step 6 ✅ done (2026-07-02 — insight sourcing from `palmProfileResult`, DATA only) · step 7 ✅ FOLDED INTO step 5 (2026-07-08 — verified `palm.tsx` renders the unchanged `PalmReadingOutput` shape: `palmEnergyType.type`/`palmType.name`/`naturalTalents`/`destiny.lifeTheme`/`majorLines`/`financialGrowthScore` all still present + populated → zero UI regression) · step 8 ✅ done (2026-07-02 — per-hand backfill script `1e02eb1`; owner runs :dry then real after deploy) · **step 9 ✅ done (2026-07-02 — stability validation PROBE: PASS gates A/B/C on the committed pipeline, D confirms §6; no repo code changed. ⚠️ dataset skewed fire/Leader → step-10 threshold recentring, a re-detect, do BEFORE wide backfill)** · step 10 (on-device EAS real-phone test — owner action; real-device gate + threshold recalibration before a wide backfill).
- **Note:** all R3 *implementation* (steps 1–8) is DONE — the palm data pipeline persists, feeds insight AND the palm reading itself end-to-end, and is proven reproducible + discriminating on stored bytes. What remains: step 10 only (on-device real-phone gate, owner).
- **R2:** steps 5+7 ✅ done (2026-07-08, `08b7d38` — traits-driven reading + forehead card dropped, built on S1 default) · **step 9 ✅ done (2026-07-08 — stability validation PROBE: PASS on all four gates A/B/C/D on the committed pipeline; A same-bytes bit-identical 16/16, B same-vector identical traits/archetype 16/16, C `reconcileFaceSubstance` pins substance over contradictory model output, D 4-shape/7-archetype discrimination — no collapse; no repo code changed. ⚠️ faceShape bins skew round/square on best-case GAN faces → owner recentres thresholds (a re-detect, §6) BEFORE a wide `backfill:face-features`).** **ALL R2 §9 STEPS DONE — R2 COMPLETE.**
- **R4 (numerology consolidation): planned 2026-07-06 (`plans/build-27/R4-numerology-consolidation.md`) — has NO Sid gate at all.** Impl progress: step 1 ✅ done (2026-07-06, `9b385c6` — types + sub-doc schema) · step 2 ✅ done (2026-07-06, `9eb4d28` — util reconciliation, reducer sweep PASSED + recorded) · step 3 ✅ done (2026-07-07, `7358de6` — the three compute hooks, writers only) · step 4 ✅ done (2026-07-07, `ca12181` — readers repointed; BOTH audit bug fixes landed: fresh personalYear/Month in insights + career Expression from the sub-doc) · step 5 ✅ done (2026-07-07, `3a4828e` — pure-compute backfill `backfill-numerology.ts` + read-time lazy fallback via the shared `numerology.service.ts` decision fn; closes step-4's interim gap) · **step 6 ✅ done (2026-07-08 — validation pass, all §10 criteria evidenced, PROBE convention, zero product-code changes; docs-only). ALL 6 R4 STEPS DONE — R4 COMPLETE, still NO Sid gate.** Owner runs `backfill:numerology:dry` → real after deploy; live smoke rides release verification. **The two Sid FYIs are now live in code** (value changes on next generation post-deploy; no approval needed, no copy touched). It's a data-plumbing refactor: no user-facing copy, no archetype names, no prompt text (COPY stays R5's). The ENTIRE R4 implementation is ungated and can be built now. Two FYIs for Sid (awareness, not approval): post-R4, career readings cite the SAME Expression number as Name Destiny (today they can contradict — career derives it from the display name), and daily/weekly/monthly insights get the CURRENT Personal Year/Month (today they can be stale) — both are correctness fixes.
- **As of 2026-07-08, NOTHING is blocked on Sid** — S1/S2/S3 are PROCEEDING ON DEFAULT, so the copy-lock steps (R2 5+7, R3 5) are cleared to build on the recommendations. Any later Sid revision is a cheap `RULES_VERSION` / prompt re-map, not a re-detect.
