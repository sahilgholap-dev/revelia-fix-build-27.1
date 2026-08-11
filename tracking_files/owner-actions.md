# Build 27 — Owner Action Queue (durable standing register — do NOT overwrite)

> **Why this file exists.** `session_handoff.md` is **overwritten every session**, so any owner TODO recorded only there gets lost. This is the DURABLE list of actions the **owner** must perform, indexed by WHEN. **Walk this whole file before every deploy / internal-testing cut / prod ship / promote-to-production.**
>
> **For agents / home chats:** when a step surfaces an owner action, append it HERE (not only in the handoff). Never silently drop one. When an item is done, mark it ✅ + date (strike through) — do not delete (keep the trail).
>
> **Related registers (don't duplicate — cross-reference):** technical caveats/limitations → `build-27-caveats.md`; owner/PM/Sid **decisions** → `sid-signoff.md`; live "what's next" → `session_handoff.md` (transient). This file is **ACTIONS (things to DO).**
>
> ## 🔴 THIS FILE OWNS THE `P-` SEQUENCE. ▶ **THE NEXT FREE NUMBER IS STATED AT THE END OF THIS FILE — and only there.**
>
> ⚠️ **This line used to carry the number itself, and on 2026-08-03 it was found reading `P60` while
> the live line at the end read `P70` — stale by ten, across a session whose own handoff claimed both
> registrars were bumped.** A sequence with two registrars has no registrar: a bump lands on one of
> them and the other keeps issuing collisions. It is the same failure the superseded mid-file line
> (`~~P54~~`) already recorded, and it had **already produced one** — a duplicate `C-P5-4` in
> `build-27-caveats.md`. **So this line no longer holds a number; it points at the one that does.**
> Read this line before assigning a new `P-` anywhere, then bump it in the same edit. The `O-`
> sequence has its own registrar — `plans/build-27.1/codemod-plan.md` §12 — and states its own next
> free number at its top. Never derive either number by counting a local table (that is what caused
> the O-14/15/16 collision).
>
> ## 🔴 RELEASE BLOCKERS FOR 2.1.0 — check these first on any pre-ship walk
> **This table is an INDEX, not a new register.** Each row lives somewhere else in this file or in
> `codemod-plan.md` §12; it exists so a pre-ship walk cannot miss one by reading only part of a
> 900-line file. **Add a row here whenever anything is promoted to blocker.**
>
> | # | blocker | where it lives |
> |---|---|---|
> | **O-27** | **the two destiny screens dead-end** — a non-Plus tap lands on a screen that looks functional, then renders a raw `premium_plus` tier slug in `text-danger` with no upgrade CTA. 🔴 **THE 2-LINE STOPGAP IS CANCELLED (owner, 2026-08-03).** With **no release split**, the destiny dead-ends get the proper **LockShell density 1** treatment in the primitives phase instead — **one fix, not two**, using the structured 403 body the server already sends (`requiredTier` / `currentTier` / `upgradeUrl`). ⚠️ **Do NOT copy `weekly.tsx:24`** — it hardcodes a tier name in body copy and would add a *fourth* competing lock treatment in the phase that exists to collapse three into one; `weekly.tsx`'s own self-gate migrates to d1 with them, three screens one commit | 🆕 **`plans/build-27.1/primitives-plan.md` §4.4** owns the work. Cross-listed in the POST-SHIP "STILL OPEN" table below. 🔴 **BOTH registers are now stale in opposite directions — `codemod-plan.md` §12 says 🟠 ACCEPTED/screens-phase, this file said 🔴 BLOCKER/two-line-fix. Reconcile §12 to primitives-plan §4.4** |
> | ~~**P31**~~ | ~~codemod pass 3b (radius) has not run~~ | 🟢 **CLOSED 2026-08-01 — 3b landed** (`8d97b0c`). See the P31 section below |
> | **P18a** | ⚠️ **THE BINARY REBRAND ASSETS — REDUCED TO ONE IMAGE (2026-08-04).** ✅ Both `app.json` literals · ✅ both ICONS (generated, gated, geometry-correct) · ✅ favicon closed as out of scope (web-only) · ✅ `P70` closed, resolves to nothing · 🟢 **the splash has NO baked ground — measured, so the feared purple slab does not exist.** ⬜ **What remains is the SPLASH IMAGE as a DESIGN refresh** (a translucent purple corner glow, 26% of canvas, never opaque), and its only mechanical requirement is `no-baked-ground` at 0. ⚠️ **PM-approval lead time is not owner-controlled** | the P18 section below, split 2026-08-03 |
> | **P18b** 🆕 | **THE LISTING ASSETS** — Play feature graphic + screenshots. Updates **independently of the binary** and **does NOT gate the release** | same section |
> | ~~**P32**~~ | ~~the pass-4 device check (five faces render distinctly · corrupt a TTF · icons · largest font setting)~~ | 🟢 **FOLDED INTO CUT 2's VISIT and DISCHARGED there, 2026-08-03.** Cut 2 (`versionCode 35`) is on internal testing and **owner-verified working**: boots, renders, theme and letterforms landed, no crash, no collapsed layout. See **P34** |
> | **P33** 🆕 | ⚠️ **`expo-font` MUST STAY OUT OF `app.json`'s `plugins` ARRAY — permanently.** The runtime `useFonts` path is symmetric by construction; the config-plugin path is platform-asymmetric and fails **silently** (one platform renders SF Pro, the other Roboto). An `expo install` already added it once, at pass 0. Re-check after **any** `expo install` or SDK upgrade | the P33 section at the end of this file (added 2026-07-31) |
> | **P14** 🔴 | **Android 16 / API 36 target-SDK compliance. Play deadline 2026-08-31.** Code is done and proven on both cuts (`e588f87`) — **so it is handled PROVIDED a production release ships from this branch before then.** 🔴 **With no release split, the WHOLE programme now rides that date.** **FALLBACK: if 2.1.0 is not on track by ~2026-08-24, cherry-pick `e588f87` alone onto a 2.0.x compliance-only release.** Missing the date **blocks ALL updates** until the app targets 36 | the §"ANDROID 16 (API 36)" section below + `primitives-plan.md` §9.4 |
> | **P37** 🆕 | **CUT 4 — the release-candidate build and the promote.** The AAB that actually ships | the P37 section at the end of this file |
> | 🔴 **P80** 🆕 | 🔴 **THE API-36 EDGE-TO-EDGE BOTTOM INSET — FIXED IN CODE, AND IT AMENDS P14's FALLBACK.** A founder report from a Samsung device on 3-button navigation: the tab labels render inside the system back/home/recents row, with an empty band above the bar. Cause: Android 16 IGNORES the opt-out attribute Expo writes for an app targeting 36, so the window extends behind the system bars and the app owns the inset — while the tab bar's hardcoded height short-circuited the navigator's own inset term. **Fixed for the tab bar, the bottom-inset hook (it was counting the inset twice), both capture screens' shutter and preview controls, both guide overlays and the paywall's scroll tail.** 🔴 **THE CONSEQUENCE FOR P14: a compliance-only 2.0.x that cherry-picks `e588f87` ALONE now ships this defect to every Android 16 user. The fallback must carry the bottom-inset commit as well.** ⬜ **STILL OWED: an Android device pass — X18's height moved, so the clipping screens need re-verifying, and the enforced-edge-to-edge behaviour cannot be seen anywhere in this repo** | the §"P80" section at the end of this file |
>
> ⚠️ **O-27 and P31 were the same failure shape, arriving from opposite directions, and that is why
> both were blockers rather than caveats:** in each case the *app stops signalling that work remains*.
> O-27 shows a screen that looks functional and is not; P31 shipped a build that looks finished and
> was not. A deferral is safe only while something still says "unfinished" — after pass 5, nothing
> does. **P31 is closed; O-27 is now scheduled work rather than an accepted defect.**
>
> ## 🔴 OWNER DECISION 2026-08-03 — **NO RELEASE SPLIT. 2.1.0 SHIPS THE COMPLETE REDESIGN.**
>
> Token system (🟢 done — passes 0, 1a, 1b, 2a, 2b, 3a, 3b, 4, 5 + four config stages, **all committed
> AND pushed**, `HEAD` == `origin/fix/build-27.1` at `8d97b0c`) **+ primitives + screens + motion +
> a11y.** There is no 2.1.0-primitives / 2.2.0-screens split.
>
> **Two consequences, both already folded in above:** `O-27`'s stopgap is **cancelled** in favour of
> the proper LockShell d1 treatment, and **P14's date is now the whole programme's date** — which is
> why the fallback is written down rather than left to be discovered.

---

## 🚢 POST-SHIP STATUS — READ THIS FIRST (2026-07-27)

> **BUILD 27 SHIPPED. versionName 2.0.0 is LIVE on Play Store production.** `feature/build-27` merged to `main` (`e724cec`). Active branch is now **`fix/build-27.1`** (2.0.x point releases).
>
> **Everything below this block was written BEFORE the ship** and is phrased as "gates the cut / gates the promote". Those gates are spent — the build went out. Read the rows below for the *detail and the trail*, but read THIS block for *what is actually still open*.

**✅ CLOSED BY THE SHIP (owner-confirmed 2026-07-27):**

| Item | Register row |
|---|---|
| `REPORT_WORKER_ENABLED` = **ON** in prod (R9 no longer prod-dark) | "Flip `REPORT_WORKER_ENABLED` on Railway" |
| `QA_DEVICE_SALT` **set on prod** (per-device free-DI gate live, not failing open) | LG16 / runbook 2.3 / D5 sub-task 1-of-3 |
| **LG1 prod carry + LG17** — `R2_TIMING_*` set on prod AND the **v1.1.1** `rule-set.json` uploaded to the prod `revelia-timing` bucket | LG1 / LG17 / runbook 2.2 + 2.10 |
| `SYNTHESIS_FABLE_ENABLED` = **`true`** in prod | "R5 flag flip" |
| **LG4** Testing Pass 2 / internal-track device pass → promoted to production | LG4 / runbook 1.5 + 2.1 |
| **versionName 2.0.0** confirmed on EAS remote | "Version name for Build 27" / CONFIRM (d) |
| **`extra.apiUrl` reverted to PROD** before the prod build (`ef29bf0`) | "REVERT PATH (before prod promote)" |
| **Git housekeeping** — `main` now reflects production (subsumes the old `feature/build-26`→`main` gap) | "Git housekeeping" |

**⚠️ ENVIRONMENT CHANGE — the staging project is GONE.** `revelia-staging` / `revelia-staging-build27` was **torn down** after the ship. Revelia is back to **one live-production backend**, app hardwired to it via `app.json extra.apiUrl` → **no pre-release device-test path.** Every row below that says *"prove it on staging"* / *"set this on staging"* / *"flag ON on staging only"* is **unrunnable as written** — either verify against prod through Internal Testing, or stand a staging project back up first. Do not follow those instructions literally.

**⬜ STILL OPEN — status NOT verified at this sync (owner: tick these off).** These were open on 2026-07-25 and nothing since then confirms them either way:

| # | Item | Why it still matters |
|---|---|---|
| P1 | **Sample PDF → R2** (`samples/cosmic-report-sample.pdf` in the private `revelia-reports` bucket) | The sample viewer is BUILT and shipped. Until the object exists, `GET /api/reports/sample` returns `sample_unavailable` and the button hides — the "see before you buy" conversion surface is **dark in production right now**. Highest-value open item. |
| P2 | **Numerology D1 backfill** (`backfill:numerology:dry` → owner reviews diff → real run) | 221 prod profiles, all `create`. Lazy read-time recompute self-heals, so no stale-value window — but the bulk pass is still unrun. |
| P3 | **Other backfills** — `backfill:natal-chart` (R1), `backfill:face-features` (R2), `backfill:palm-features` (R3, after the step-10 recentre) | Existing users don't get the structured layers until these run. |
| P4 | **R3 step-10** — on-device palm threshold recentre before a wide `backfill:palm-features` | Gates P3's palm half. |
| P5 | **Privacy-policy "Fraud and abuse prevention" line** (D5 salted device-hash disclosure) | Store-compliance. The Play **Data-safety form** was submitted 2026-07-24; this is the separate published-policy line. **The app is now public — this should be live.** |
| P6 | **RevenueCat annual plans ($59.99/$89.99) → same monthly Q&A caps** (LG7) | Billing correctness; annual subscribers may be uncapped. Dashboard config, no code. |
| P7 | **Crisis/unsafe telemetry-exclusion review** (LG6) | Sid-required. Server log is already label+timestamp-only; the analytics/marketing/training pipeline review is the remaining half. |
| P8 | **Final D6 upgrade-CTA / decline / entertainment copy** (LG8) | Placeholders may be live in front of real users. |
| P9 | **Sid-gated "~20–24pp" report length nudge** | Reports render near the 17pp QA floor; a QA fail costs a paid re-Fable. |
| P10 | **Remove the temp dev IP from the MongoDB Atlas allowlist** | Security housekeeping, long overdue. |
| P11 | **Verify the D5 device gate is actually live on prod** (boot log clean + re-run the two-account repro) | The `de17e22` telemetry exists precisely to make this a 2-minute check. See the ⭐ row in the D5 section. |
| P12 | **R9 cost/usage analysis → Sid tier decision (S-R9L)** | Now measurable against **real production** traffic, with Fable ON. Both levers stay server-side + reversible. |
| P13 | **S-R7f / S-R7g** — two non-blocking timing-rule confirmations awaiting Sid | Neither gates anything; one config key each. |
| P14 | 🟢 **Android 16 (API 36) — CODE DONE AND PROVEN.** Path A bump `e588f87` is on this branch and **confirmed present on BOTH cuts**, so the Gradle/AGP risk did not materialise. 🔴 **Now a SCHEDULE item, not a code item** | Play Console **deadline 2026-08-31; today is 2026-08-03.** Handled **provided a production release ships from this branch before then** — and with **no release split** (2026-08-03) the entire redesign now rides that date. 🔴 **FALLBACK, stated so it is a decision and not a discovery: if 2.1.0 is not on track by ~2026-08-24, cherry-pick `e588f87` ALONE onto a 2.0.x compliance-only release.** Missing the date **blocks ALL updates** until the app targets 36. Detail: §"ANDROID 16 (API 36)" below + `primitives-plan.md` §9.4. |
| P15 | **Confirm RevenueCat access + Play integration status** (Amey sees no prices in the dashboard) | Precondition on ALL S-P1 paywall work, even after Sid approves. Detail → §"BUILD 27.1 PRE-FLIGHT AUDIT". |
| ~~P16~~ | 🟢 **CONFIRMED AND FIXED IN CODE 2026-08-05 — it was REAL.** The PM's *"this used to work"* was the confirmation; the mechanism is exactly what this row predicted two weeks ago. `applyTierToAuthUser` wrote a RevenueCat-derived tier over the server's `getEffectiveTier`, and a comp grant has **no** RevenueCat entitlement by construction, so a comped account was written down to `'free'` client-side while the server kept serving it. Fixed as **`X21`** (audit §5.1): a client-derived tier may only ever UPGRADE; only `GET /subscription/status`'s effective tier may lower one. **Four exact counts + two boundary assertions, 6/6 defect-injection cases caught.** 🔴 **STILL OWED — ONE DEVICE CHECK**: a Play-signed build, a comped account, confirm the paid surfaces unlock. That is the half no gate can do. |
| P17 | **Fix three stale price docs** ($14.99/$99.99 → $12.99/$89.99) | No gate, low effort. Stale docs are how someone later "fixes" correct code to match wrong documentation. |
| P18 | 🔴 **SPLIT 2026-08-03 → P18a (BINARY, gates the release) + P18b (LISTING, does not).** P18a: icon, adaptive icon, **splash**, favicon, **`app.json`'s `#0F0A1A:16` + `#2D1B4E:39`**, and `ShareCard`'s hardcoded gradient. P18b: Play feature graphic + screenshots | 🔴 **The splash is the highest priority of the five** — first thing every user sees every launch, rendered before any JS runs, and a purple splash into a clay app is the one mismatch nobody can miss. **PM-approval lead time is not owner-controlled.** Detail: the P18 section below. |
| P19 | **Server-side paid-tier leak on monthly readings** — `LockedSection` hides content the server already sent | Both a gating defect and a token-cost item. Needs server/prompt work. ⚠️ **`LockedSection` is DELETED by the primitives phase** (absorbed into `LockShell`), so the client half moves with it; the server half is unchanged. |
| ~~**P30**~~ | ~~CUT 1 — run the `production` EAS build, then the 21-surface capture pass~~ | 🔴 **SUPERSEDED 2026-08-03 — CUT 1 WAS NEVER BUILT.** The reorder overtook it; the artefact that exists is **cut 2** (`versionCode 35`, verified 2026-08-03). **Everything it was for moved to P34**, and `cut1-capture-checklist.md` is still the procedure. ⚠️ **`O-26` and `P27` were scoped to cut 1 and now belong to CUT 3.** **Do not carry P30 and P34 as two items.** |
| **O-27** 🆕 | 🔴 **the two destiny screens dead-end.** R1 moved the lock surface from hub to destination; `numerology/name-destiny` and `career-destiny` swallow the 403 on mount, show a normal Generate CTA, and on tap render **"This feature requires premium_plus subscription"** inline in `text-danger` — no upgrade CTA, raw internal tier slug in user copy. | 🔴 **THE TWO-LINE STOPGAP IS CANCELLED (owner, 2026-08-03).** With **no release split**, this gets the **proper LockShell density 1 treatment in the primitives phase** — **one fix, not two** — using the structured 403 body the server **already sends** (`requiredTier` / `currentTier` / `upgradeUrl`). ⚠️ **Do NOT copy `weekly.tsx:24`**: it hardcodes a tier name in body copy and would add a *fourth* competing lock treatment in the very phase that collapses three into one. 🟢 **`weekly.tsx`'s own self-gate migrates to d1 with them — three screens, one commit.** Owned by **`primitives-plan.md` §4.4**. |

> 🔴 **`O-27` is CROSS-LISTED here, not moved.** Per **R5**, `codemod-plan.md` **§12** remains the
> sole registrar of the `O-` sequence — this row exists because **`owner-actions.md` is the file that
> gets walked before every deploy / cut / promote**, and a release blocker that lives only in a plan
> document is a blocker nobody walks past. Close it in **both** places.
>
> ⚠️ **THE TWO REGISTERS DISAGREED ON SEVERITY, AND AS OF 2026-08-03 BOTH ARE STALE, IN OPPOSITE
> DIRECTIONS.** §12's row classifies `O-27` as **🟠 ACCEPTED FOR 2.1.0** with fix option (a) assigned
> to the *screens phase*; this file overrode that to **🔴 RELEASE BLOCKER** on the grounds that the
> minimal fix was `weekly.tsx:24`'s existing self-gate, already written and already shipping.
>
> 🔴 **THE OWNER'S NO-RELEASE-SPLIT DECISION RESOLVES IT AND INVALIDATES BOTH.** The stopgap is
> **cancelled** — copying `weekly.tsx:24` would hardcode a tier name in body copy and add a **fourth**
> competing lock treatment in the phase that exists to collapse three into one — and the fix is
> neither deferred nor minimal: it is **LockShell density 1, in the primitives phase, on all three
> screens at once**, off the structured 403 payload the server already sends.
>
> 🔴 **Reconcile `codemod-plan.md` §12 to `primitives-plan.md` §4.4 when §12 is next edited.** A stale
> registrar is how someone later "fixes" correct code to match wrong documentation — the same failure
> mode as **P17**, and the reason this paragraph names the target document rather than just saying
> "reconcile".

**Standing rule reminder (LG17):** the timing rule set is **gitignored and loaded from R2 at runtime**. Any future amendment = commit the engine **AND** re-upload `rule-set.json` to prod's bucket. A green local `npm run test:timing` says nothing about deployed behaviour. Confirm via the boot-log byte count.

---

## 🚫 GATING — do before the named step / before prod ship

> ⚠️ **HISTORICAL as of 2026-07-27** — these gated the Build-27 cut/promote, which has happened. Kept for the trail and for the detail behind each item. See the POST-SHIP STATUS block above for what is actually open.

### ⭐ R7 LAUNCH-GATE CHECKLIST — consolidated single view (2026-07-24, R7 home)
> One view of every R7 ship blocker + launch-hygiene + non-blocking follow-up, compiled from `sid-signoff.md`, `owner-actions.md` (detail below), `build-27-caveats.md`, `session_handoff.md`. **Walk this before any R7 internal-testing cut / prod ship / promote.** Detail + verification history is in the linked rows below/elsewhere; this table is the index. Server pipeline (§13d Step 3) is COMPLETE + prod-dark; mobile (§13e) is in flight.

| ID | Item (one-line) | Owner | Blocks ship? | Status | Tracked in |
|---|---|---|---|---|---|
| **LG1** | Private-R2 `loadConfidentialConfig` loader — engine reads the gitignored rule set; must be provisioned at runtime or the engine can't run in prod | Amey-eng (code) + Owner (bucket/creds) | **YES — HARD (pre-deploy)** | ✅✅ **DONE — code + provisioning + STAGING-PROVEN (2026-07-24).** Loader `7bef912` (home-verified §13g). Bucket `revelia-timing` + read-only token + `R2_TIMING_*` set on `revelia-staging-build27`; `rule-set.json` (v1.1) uploaded. Staging boot log: `[timing-config] rule set loaded from R2 (17215 bytes, key rule-set.json)` + "initialized from R2" — 17215 bytes matches the uploaded v1.1, no fail-closed warning, no degrade → end-to-end verified. **⚠️ PROD carry:** set the same `R2_TIMING_*` + upload the rule set to the prod bucket before prod deploy. | owner-actions §GATING + §"R7 LG1 — timing rule-set R2"; sid-signoff S-R9f/D8; prompts §13g |
| **LG2** | §13e mobile Q&A surface (Items A+B) — no client exists until this lands | Amey-eng | **YES — HARD** | ✅ CODE-COMPLETE (Item A `eb79db2` + Item B `a68524a`, home-verified) — device pass = LG4 | prompts §13e; session_handoff |
| **LG3** | Crisis-screen suppression — no upsell/paywall/rating/chips on a `mode==='crisis'` screen | Amey-eng | **YES — HARD (safety; Sid launch sign-off)** | ✅ DONE (mobile, §13e-2 Item B, 2026-07-24) — code-verified below; device render rides LG4 | owner-actions crisis #2 |
| **LG4** | Testing Pass 2 device pass — real-device send/receive, paywall deep-link, crisis screen, location permission, device-id | Amey | **YES — HARD (can't ship untested mobile)** | PENDING (post-mobile; single live backend → no pre-release path) | session_handoff; build-27-caveats (infra) |
| **LG5** | Crisis #3 multilingual fixtures — +1 Hindi indirect-crisis, +1 Portuguese reflective in `qa-router-fixtures.check.ts` | Amey-eng | **YES (Sid: required before launch sign-off)** | ✅ **DONE 2026-07-24, `202decf`, home-verified + live re-run 20/20** (both ML fixtures pass first try, no prompt calibration). **The sole internal-cut CODE gate — MET.** | owner-actions crisis #3; prompts §13h |
| **LG6** | Crisis/unsafe telemetry exclusion — no crisis/unsafe event feeds analytics/marketing/training; unsafe-retention under access-control (DPDP/GDPR) | Amey-eng + PM | **YES (Sid required addition)** | PARTIAL (server log = label+timestamp WIRED §13d-3; pipeline review remaining) | owner-actions crisis #1 |
| **LG7** | Annual plans ($59.99/$89.99) → same monthly caps in the RevenueCat dashboard | Amey-eng | YES — launch-hygiene (billing correctness) | OPEN (config check) | sid-signoff S-R7a/D3; build-27-caveats R7 |
| **LG8** | D6 upgrade-CTA copy — the 402/paywall CTA + entertainment/decline strings are structural placeholders | PM | YES — launch-hygiene (user-facing copy) | OPEN (final strings) | sid-signoff S-R7b/D6 |
| **LG9** | D8 Swiss Ephemeris license — confirm NOT required (Moshier likely moot) | Amey-eng | NO (likely moot) | OPEN (confirm) | sid-signoff §non-blocking |
| **LG10** | S-R7e — FX6b window showed 2035-06 vs Sid's 2028-09 | Sid (rule) → Amey-eng (impl) | ~~LAUNCH-GATE~~ → **CODE-CLOSED**; replaced by **LG17** (R2 re-upload) as the remaining hard step | ✅ **RESOLVED 2026-07-25 — Rule Set v1.1.1** (engine+harness `be02d28`). Sid REJECTED the Venus-as-gains-lord workaround; issued **R11a two-path domain alignment** (natural significations OR natal-functional occupies/rules, nodes occupancy-only) + Ketu displacement/relocation/pilgrimage + a 30-year no-alignment fallback. FX6b = **2028-09**/ad_boundary, FX3 = **2027-07**/ad_boundary. 22/22 assertions, 8/8 units; FX1/FX2/FX4/FX5/FX6a byte-identical (full-output diff). Harness now asserts window DATES — the basis-only assertion is why 2035-06 passed 17/17 green before. **⚠️ inert in deployed envs until LG17.** | owner-actions §"v1.1 LAUNCH-GATE" + §⭐⭐ v1.1.1 re-upload; sid-signoff S-R7e; build-27-caveats R7 |
| **LG17** | **⭐⭐ Re-upload the v1.1.1 `rule-set.json` to the private `revelia-timing` R2 bucket** (key `rule-set.json`) — the engine loads rules from R2 at runtime (LG1) and the rule set is gitignored, so the deploy ships the new ENGINE but NOT the new RULES | Owner | **YES — HARD (before ANY redeploy, staging + prod)** | **OPEN — do before the next redeploy.** Without it staging/prod keep loading v1.1 and **FX6b stays 2035-06 in deployed environments while local tests are green.** Verify via the staging boot log: the byte-count must change from v1.1's `17215 bytes`. | owner-actions §⭐⭐ v1.1.1 re-upload; LG1 |
| **LG11** | Crisis #4 (optional) — classifier format-fail-closed (non-token → off_topic) | Amey-eng | NO — optional hardening | OPEN | owner-actions crisis #4 |
| **LG12** | Crisis country-append (27.1) — 4-market number line (US/CA 988, IN 14416, BR 188) | Owner | NO — zero launch dependency | DEFERRED (build only if owner opts in) | owner-actions crisis (optional); build-27-caveats R7 |
| **LG13** | R6 Option C — dedicated continuity card + `continuityHook` field | Amey-eng | NO — off the R7 path | DRAFTED — ready-to-issue step-prompt in `prompts.txt` (§ "R6 Option C", `build27-R6-OptionC`, [DRAFT]); grounded in getDailyInsight:532 / getDailyTeaser:622-624 (exposes Option-A-computed continuity, additive). Run as its own chat when owner opts in. | build-27-caveats R6 §; sid-signoff S-R6; prompts §R6-Option-C |
| **LG14** | D3b — free-day-one vs phased rollout | PM | NO — rollout decision (recommend phased B-before-C) | OPEN | sid-signoff §non-blocking |
| **LG15** | Accepted v1 known-limitations: FX5 window-range approx · 2.4a antardasha-gate granularity · weeks/days→whole-month frame coarse-map | Sid (may revisit) | NO — accepted v1-scope | LOGGED | build-27-caveats R7 § |
| **LG16** | **D5 SERVER-side per-device free-DI gate** — mobile sends `X-Device-Id` but `qa-caps.service` ignores it → free Fable-5 DI has NO per-device anti-farming (one device farms unlimited free DI via multiple accounts) | Amey-eng | **YES — HARD (abuse/cost — hits the most expensive call)** | ✅ **CODE DONE 2026-07-24, `fe5a59c`, home-verified (§13f)** — gate live pre-model + FREE+DI+device only, FAIL-OPEN (no header/unset salt/DB err), raw id never stored/logged. **CODE ship-blocker CLOSED.** (3 OWNER launch sub-tasks below still OPEN: set `QA_DEVICE_SALT`, privacy-policy line, Play Data-safety.) | owner-actions §"R7 D5 — SERVER-SIDE"; prompts §13f; sid-signoff D5; handover §6 |

> **Already RESOLVED (context, not action):** crisis wording FINAL + `CRISIS_WORDING_FINALIZED=true` (`77df885`, S-R7b/D6); crisis serving-gate + label+timestamp log wired (§13d-3); FX3/FX6b rule (S-R7d → v1.1); D1 (~6-turn context), D4 (credit packs), response-envelope/402 shape, D-routing (free→sonnet-5 / paid→opus-4-8 adaptive / DI→fable-5 + fallback — verified via claude-api), D3 caps — all decided + implemented in §13d. **No separate prod worker-flag gate** for R7 (the `/api/qa` route mounts prod-dark; go-live = the mobile release).
>
> **New gates flagged this compile (beyond the owner's known list):** LG2 (mobile surface completion), LG4 (Testing Pass 2 device pass), LG9 (D8 confirm), LG14 (D3b rollout), LG15 (v1 known-limitations).

### 🧭 R7 PRE-DEPLOY PROVISIONING RUNBOOK — ordered owner-facing path from here to a release cut (2026-07-24, R7 home; STANDING — do NOT overwrite)
> All R7 CODE is done (§13a–g) + LG1 loader is staging-proven. This is the ONE ordered walk of every remaining NON-CODE gate between now and a Build-27 release cut. Do the **Phase 0** items in parallel immediately (they unblock testing or have external lead time). **⚠️ TIER CORRECTION (owner, 2026-07-24):** cutting an **internal/preview APK to our OWN testers is NOT a Play Store submission** → store/prod-quality gates do NOT gate the internal cut. **Internal-cut gate = LG5 only** (+ tsc both clean + a clean owner-actions walk). **Testing Pass 2 (LG4) runs ON the cut APK** — its results gate the promote, not the cut. **Everything else — LG16 disclosures + prod salt, LG8 copy, LG6 telemetry, LG7 RevenueCat, LG10/S-R7e, LG1 prod carry — is a PROD / PLAY-STORE PROMOTE gate (Phase 2).** Mark each ✅ + date as you go (don't delete). Cross-refs point at the LG checklist above + the detail sections below.

**PHASE 0 — DO NOW, IN PARALLEL (no dependency on each other; start all today)**

| # | Action | LG | Owner | Blocks ship? | Why now / lead time |
|---|---|---|---|---|---|
| 0.1 | ✅ **DONE 2026-07-25 — CLOSED BY SID'S RULE SET v1.1.1** (engine+harness `be02d28`). ⛔ **The Venus-as-wealth/gains-lord tag this row used to ask for was REJECTED by Sid** — it would fit this one querent and distort every other chart. **Do NOT relay that ask.** He issued **R11a two-path domain alignment** instead (natural significations OR natal-functional: the lord occupies/rules the natal karya house; nodes by occupancy only), plus Ketu displacement/relocation/pilgrimage and a 30-year no-fabrication fallback. FX6b = 2028-09, FX3 = 2027-07, 22/22 green, other fixtures byte-identical. **➡️ REPLACED BY the LG17 R2 re-upload (2.x below) — the rules are gitignored, so they do NOT ride the deploy.** Two minor items still want Sid's confirm (neither blocks): the FX3 running-period `runningPeriodScores` reading (conf 0.60 vs 0.65, both inside the ±0.05 band) and the FX5 documented-window discrepancy — see `sid-signoff.md` S-R7f/S-R7g. | LG10 → LG17 | Sid ✅ replied | ~~Launch-gate~~ → closed | Was the longest-lead external blocker; now resolved. |
| 0.2 | ✅ **DONE 2026-07-24 — `QA_DEVICE_SALT` set on STAGING** (`revelia-staging-build27`). | LG16 | Owner | (prod salt = ship; staging salt = enables the test) | Pass 2 (LG4) can now exercise the real device-gate, not just fail-open. Prod salt = Phase 2 (2.2). |
| 0.3 | **RevenueCat: annual plans ($59.99/$89.99) → same monthly Q&A caps** in the dashboard. | LG7 | Amey-eng | YES — billing-hygiene | Pure dashboard config; no code, no dependency. Do + screenshot-verify now. |
| 0.4 | **Finalize D6 upgrade-CTA / decline / entertainment copy** (currently structural placeholders in the 402/paywall + safety strings). | LG8 | PM | YES — user-facing copy | Copy authoring has its own turnaround; lock strings before Pass 2 so testers see final UX. |
| 0.5 | **Crisis #3 multilingual fixtures** — +1 Hindi indirect-crisis, +1 Portuguese reflective in `qa-router-fixtures.check.ts`; the cautious-preference line must hold across languages. ✅ **DONE 2026-07-24, `202decf`** — home-verified + live re-run 20/20 (both pass first try, no prompt calibration). | LG5 | Amey-eng | YES (Sid: required before launch sign-off) | The sole internal-cut CODE gate — now MET. |
| 0.6 | **Crisis/unsafe telemetry-exclusion review** — confirm no crisis/unsafe event feeds analytics/marketing/model-training; if unsafe content is ever retained, only under access-control + a defined retention period. (Server label+timestamp log already wired §13d-3.) | LG6 | Amey-eng + PM | YES (Sid required addition) | Data-governance review of the analytics pipeline — no code dependency; do in parallel. |

**PHASE 1 — CUT THE INTERNAL / PREVIEW APK (to our own testers). The ONLY gate is the row below.**

| # | Action | LG | Owner | Gate? | Depends on |
|---|---|---|---|---|---|
| 1.1 | **Cut the preview APK.** The ONLY things between here and the cut: (a) **LG5 §13h GREEN — 20/20 live** ✅ DONE (`202decf`, 2026-07-24), (b) **`npx tsc --noEmit` clean BOTH sides** ✅ (2026-07-24), (c) **a clean owner-actions walk** (CLAUDE.md) ✅ walked 2026-07-24, no blocker surfaced. No store/prod-quality item gates this — it's an APK to our own testers, not a Play Store submission. **ALL THREE MET → cleared to cut on the owner's explicit go (home will not initiate EAS).** | LG5 | Amey | **INTERNAL-CUT GATE — ✅ MET** | §13h verified; tsc both ✅; walk ✅ |

**PHASE 1.5 — RUN ON THE CUT APK: Testing Pass 2 (results gate the PROD promote, NOT the cut)**

| # | Action | LG | Owner | Gate? | Depends on |
|---|---|---|---|---|---|
| 1.5 | **Testing Pass 2 — real-device pass:** Q&A send/receive, 402→paywall deep-link, crisis-screen suppression render, location permission (coarse), device-id header, AND the live timing path on staging (LG1 staging-proven → timing verdicts serve, not degrade). With 0.2 done, also verify the device-gate blocks a 2nd account on the same device. | LG4 | Amey | **PROD-PROMOTE gate** (can't ship untested mobile) — NOT an internal-cut gate | the cut APK (1.1) + 0.2 (staging salt). Single live backend → rides staging + the preview APK. |

**PHASE 2 — GATES THE PROD / PLAY-STORE PROMOTE (do at/just before the prod cut; several can be prepped during Phase 0)**

| # | Action | LG | Owner | Gate? | Note |
|---|---|---|---|---|---|
| 2.1 | **LG4 Pass 2 signed off** (from Phase 1.5). | LG4 | Amey | **YES — HARD** | Real-device evidence before a public ship. |
| 2.2 | **LG1 PROD carry** — on the prod backend: create/confirm the private timing bucket, upload the **v1.1.1** `rule-set.json` (⚠️ **v1.1.1, not v1.1** — see 2.9/LG17), set `R2_TIMING_*`. Confirm the prod boot log shows `rule set loaded from R2 (…bytes…)` — NOT a fail-closed warning. | LG1 | Owner | **YES — HARD** | Mirror the staging setup exactly. Without it the prod engine fail-closes → all timing questions degrade to reflective. |
| 2.3 | **Set `QA_DEVICE_SALT` on PROD.** | LG16 | Owner | **YES — HARD** (abuse/cost) | Without it the per-device free-DI gate is inert (fails open) → the most expensive call (free Fable-5 DI) is farmable. |
| 2.4 | **D5 disclosure — privacy-policy "Fraud and abuse prevention" line** (handover §6 verbatim): disclose the salted device-hash used to prevent free-DI abuse. | LG16 | Owner | YES — store-compliance | Live before the store listing / data-safety form is submitted. Can be drafted during Phase 0. |
| 2.5 | **D5 disclosure — Google Play Data-safety "Device or other IDs" declaration** (handover §6 verbatim): device identifier collected for fraud prevention (hashed server-side, not linked to advertising). | LG16 | Owner | YES — store-compliance | Same submission as 2.4. |
| 2.6 | **Final D6 upgrade-CTA / decline / entertainment copy** (currently structural placeholders). | LG8 | PM | YES — user-facing copy | Prep during Phase 0 (0.4); it gates the public ship, not the internal cut. |
| 2.7 | **Crisis/unsafe telemetry-exclusion review** (server log already label+timestamp-only; review the analytics/marketing/training pipeline + any unsafe-retention access-control). | LG6 | Amey-eng + PM | YES (Sid required) | Prep during Phase 0 (0.6). |
| 2.8 | **RevenueCat annual→cap config** verified in the dashboard. | LG7 | Amey-eng | YES — billing-hygiene | Prep during Phase 0 (0.3). |
| 2.9 | ✅ **LG10 RESOLVED in code (Rule Set v1.1.1, `be02d28`)** — FX6b = 2028-09, FX3 = 2027-07, 22/22 green. ⛔ Sid REJECTED the Venus-tag route this row used to offer; the fix is R11a two-path alignment. **➡️ REPLACED BY LG17 (row 2.10): the new rules are gitignored and do NOT ride the deploy.** | LG10 | Owner/Sid | ~~Owner's call~~ → closed | No known-limitation acceptance needed; the window now reads as Sid specified. |
| 2.10 | **⭐⭐ LG17 — re-upload the v1.1.1 `rule-set.json` to the `revelia-timing` R2 bucket** (staging AND prod; key `rule-set.json`). Verify the boot-log byte-count **changed from v1.1's `17215 bytes`**. | LG17 | Owner | **YES — HARD (before ANY redeploy)** | The engine loads rules from R2 at runtime (LG1) and the rule set is **gitignored**, so a deploy ships the new ENGINE with the OLD RULES. Skip this and **FX6b stays 2035-06 in deployed envs while local tests are green** — local tests will not catch it. |

**NON-BLOCKING (off the critical path — do NOT gate the cut on these):** LG9 (Swiss-Eph license confirm — likely moot), LG11 (optional classifier format-fail-closed), LG12 (crisis country-append 27.1 — build only if owner opts in), LG13/R6 Option C (standalone `build27-R6-OptionC`, after R7 mobile), LG14 (D3b free-day-one vs phased rollout — PM decision), LG15 (accepted v1 known-limitations — logged).

**CRITICAL-PATH SUMMARY:** **Internal/preview APK cut is gated by LG5 ONLY** (+ tsc both clean + this walk). Cut → run Pass 2 (LG4) on it. ~~The prod/store-promote long pole is 0.1 (Sid) → 2.9~~ — **0.1/LG10 CLOSED 2026-07-25 by Rule Set v1.1.1**; the long pole is now the Phase-2 disclosures/copy set. Everything else in Phase 0 runs in parallel and PREPS Phase 2 (disclosures, copy, RevenueCat, telemetry). Prod-promote hard-blocker set: LG4 Pass 2, LG1 prod carry, **LG17 v1.1.1 R2 re-upload (2.10 — also gates any STAGING redeploy, not just prod)**, LG16 prod salt + 2 disclosures, LG6, LG7, LG8.

> **⚠️ STANDING RULE learned from LG17 (applies to every future rule-set/fixture amendment):** the confidential timing config is **gitignored**, so **rule changes never ride a git deploy**. Any future Sid amendment = commit the engine **AND** re-upload `rule-set.json` to each environment's R2 bucket. A green local `npm run test:timing` says nothing about deployed behaviour until the bucket object is replaced — confirm via the boot-log byte-count.

### 🎯 R7 PLAY INTERNAL-TESTING TRACK UPLOAD — target = Play Store internal track (NOT a preview APK), owner-corrected 2026-07-24
> The owner is uploading to the Play **internal-testing track** (team-member testers on the track), NOT sideloading a preview APK. That changes the gate set: **(a) LG16 Play Data-safety form + privacy-policy line become CUT gates** (Play blocks ANY track upload until the Data-safety form is complete + `X-Device-Id` is declared), and **(b) the build must point at STAGING, not prod.** The runbook above (preview-APK tiering) is superseded for THIS path by the list below.

- [x] ✅ **RESOLVED 2026-07-27 — the shipped 2.0.0 build points at PROD, which is now the intended and only target** (staging torn down; `extra.apiUrl` reverted to prod in `ef29bf0`). ⚠️ **The underlying FACT below is permanent and still bites — keep reading it: `extra.apiUrl` BEATS the EAS profile env.** It is the reason the D5 device-gate repro ran against prod while the salt was only set on staging (see `de17e22`). Any future environment split must change `extra.apiUrl`, not just the profile env. Original blocker text: ~~**⛔⛔ BUILD-TARGET BLOCKER (CRITICAL, code/config) — the build currently points at PROD, and there is NO staging build path.**~~ Findings (verified 2026-07-24):
  - `mobile/lib/api.ts:76` resolves the base URL as `Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || <fallback>`. **`extra.apiUrl` WINS** and is hard-set in `app.json` to `https://revelia-backend-production.up.railway.app/api` = **PROD**.
  - Because `extra.apiUrl` takes precedence, the `production` profile's `EXPO_PUBLIC_API_URL=https://api.revelia.me/api` (also PROD) is **dead config** — it never takes effect at runtime. So a naive "point the profile env at staging" would **silently still hit prod**.
  - **`revelia-staging-build27` is referenced NOWHERE in `mobile/` (eas.json, app.json, lib/).** There is no `staging` build profile. The R7 staging backend (where LG1 is proven + `QA_DEVICE_SALT` set) is not wired into any mobile build.
  - **REQUIRED before any internal-track build meant to test R7 on staging:** set `extra.apiUrl` (the winning source) to the staging URL `https://<revelia-staging-build27>.up.railway.app/api` — OR remove `extra.apiUrl` and add a dedicated `staging` EAS profile whose env points at staging — AND supply staging RevenueCat/OneSignal/Google keys if those must be isolated too. **Owner must also confirm the staging backend has its OWN Mongo DB + env (not pointed at prod data)** — a Railway fact this repo can't verify. (⚠️ If the owner instead chooses to point the internal-track build at PROD, then LG1 prod carry + `QA_DEVICE_SALT` prod must be done FIRST and testers operate on real prod data — not recommended for a test track.)
- [~] **LG16 disclosures = CUT GATE for a Play upload (re-tiered from Phase 2):** ✅ **Play Data-safety form SUBMITTED by owner 2026-07-24** (the item that blocks the track upload) — confirm it declares the `X-Device-Id` device identifier (collected for fraud prevention, hashed server-side, not linked to advertising). ⬜ **Separate: confirm the privacy-policy "Fraud and abuse prevention" line is live** in the published privacy policy (handover §6 verbatim) — not part of the Data-safety FORM; do before public promote if not already covered.
- [x] ✅ **AAB output** — `eas.json` `production.android.buildType = "app-bundle"` (AAB, correct for Play). `distribution: "store"`.
- [x] ✅ **versionCode auto-increment** — `production.autoIncrement: true` + `cli.appVersionSource: "remote"` → EAS manages/increments versionCode remotely (app.json's `versionCode: 26` is ignored under remote source).
- [x] ✅ **DONE 2026-07-27 — versionName 2.0.0 shipped** (`app.json` + both `package.json` bumped in `2515fa4`; EAS remote version confirmed). Original: ~~**Version name for Build 27**~~ — app.json `version: "1.2.0"`, but CLAUDE.md/build-27 target = **versionName 2.0.0**. Under `appVersionSource: remote` the REMOTE version is authoritative → **owner must confirm/set the remote versionName to 2.0.0** on EAS (app.json's 1.2.0 is not authoritative). Verify before the build.
- [x] ✅ **`google-services.json`** — PRESENT + git-TRACKED (FCM requirement; do NOT re-gitignore). FCM v1 configured in GCP `revelia-497203` (CLAUDE.md, root-caused 2026-06-24).
- [ ] **`google-play-service-account.json`** — MISSING locally (correctly NOT git-tracked = secret). `eas.json` `submit.production.android.serviceAccountKeyPath` points at it + `track: "internal"`. **Owner must provide this key locally (or configure the submit credential on EAS)** for `eas submit` to upload — OR upload the AAB manually via the Play Console.
- [ ] **Android signing/keystore on EAS** — first `production` (store) build; owner confirms the EAS-managed Android keystore exists / is generated (managed credentials). The app is already live in prod (`com.revelia.app`, vc26) so a keystore should exist — confirm it's the same one.
- [ ] **Clean committed tree at build time** — `eas.json` `cli.requireCommit: true` → EAS refuses to build with uncommitted changes. Ensure the working tree is committed (esp. after the build-target config change above).
- [x] ✅ **Play Console app exists** — `com.revelia.app` is live in prod (vc26). The internal-testing track exists on the console.
- [ ] **Play Console internal-track testers** — owner confirms the team-member testers are added to the internal-testing track (email list / group) so they can install.
- [ ] **Walk this file before the cut** (CLAUDE.md standing requirement) — done 2026-07-24; re-walk immediately before the actual `eas build`.

#### 🔒 LOCKED DECISIONS + confirmations for the build-27 internal-track cut (owner, 2026-07-24 — durable record)
- **DECISION — staging backend URL = `https://revelia-staging.up.railway.app/api`.** (Owner-provided. This is the R7 staging service; owner is separately confirming it has its OWN Mongo DB, not prod.)
- **DECISION — repoint approach = set `app.json` `extra.apiUrl` → the staging URL** (NOT a new profile). Rationale: `lib/api.ts:76` gives `extra.apiUrl` precedence over the profile env, so this is the ONE change that GUARANTEES the running app hits staging regardless of profile. ⚠️ **This is a BUILD-27-TEST value — REVERT before any prod promote** (one-line revert below). Diff drafted as `build27-mobile-staging-target`, **pending owner approval before apply+build**.
- **DECISION — RevenueCat + OneSignal keys = SHARED with prod** (staging uses the same keys). Accepted: no real users on Q&A, test-track purchases are sandboxed.
- **CONFIRM (OneSignal send) — Q&A/test flow triggers NO OneSignal send.** Verified: `qa.service`/`qa-caps.service`/`qa.controller` have zero push/OneSignal code. The only server SEND path is `jobs/pushScheduler.ts` (daily push), started UNCONDITIONALLY in `index.ts:73`. ⚠️ **Adjacent flag (from the SHARED-OneSignal decision):** the staging backend WILL run the daily push scheduler against the same OneSignal app. With an ISOLATED staging DB its blast radius = test-account devices only (fine); if staging DB were ever pointed at prod it would DOUBLE-send to prod users. Ties to the DB-isolation confirm. **Optional cheap safeguard:** disable the scheduler on staging (env gate) if not needed for R7 testing. NOT a Q&A-flow issue.
- **CONFIRM (d) versionName 2.0.0** — app.json `version: "1.2.0"` is NOT authoritative under `appVersionSource: remote`; owner sets/confirms the REMOTE versionName = 2.0.0 on EAS. ⬜ owner.
- **CONFIRM (e) `google-play-service-account.json`** — MISSING locally; owner provides it (for `eas submit`) OR uploads the AAB manually via Play Console. ⬜ owner.
- **CONFIRM (f) EAS Android keystore matches the live prod `com.revelia.app`** — ✅ **CONFIRMED by owner 2026-07-24: unchanged since the build-26 release (same keystore).** No mismatch risk.
- **CONFIRM (g) internal-track testers added** in Play Console. ⬜ owner (needed before testers can INSTALL; not a build/upload blocker).
- **CONFIRM (h) clean committed tree** (`requireCommit: true`) — will be clean after the repoint commit; ensure no stray uncommitted changes at build time. ⬜ at build.
- **REVERT PATH (before prod promote):** restore `app.json` `extra.apiUrl` to `https://revelia-backend-production.up.railway.app/api` (the exact original) — one-line change. Add to the Phase-2 prod-promote checklist so the prod AAB never ships pointing at staging.

#### ✅ APPLIED — `build27-mobile-staging-target` committed `70d840c` (2026-07-24; build HELD)
- [x] **Repoint APPLIED** — `mobile/app.json` `extra.apiUrl` → `https://revelia-staging.up.railway.app/api`. The running app now resolves to staging (extra.apiUrl wins at `lib/api.ts:76`). ⚠️ build-27-test value; revert path above.
- [x] **Scheduler env-gate APPLIED** — `server/src/index.ts` gates `startPushScheduler()` behind `PUSH_SCHEDULER_ENABLED` (default ON → prod byte-unchanged when unset; `'false'` disables). Documented in `.env.example`. Server tsc clean.
- [x] ✅ **OWNER DONE 2026-07-24 — `PUSH_SCHEDULER_ENABLED=false` set on `revelia-staging` Railway.** Staging backend will NOT fire push on the shared OneSignal app.
- [x] ✅ **OWNER CONFIRMED 2026-07-24 — `revelia-staging` `MONGODB_URI` is a SEPARATE staging DB (changed in Railway yesterday, not prod).** DB isolation established → testers don't touch prod data; scheduler blast-radius question is moot (scheduler also off).
- [x] ✅ **MOOT 2026-07-27** — superseded by the production release, which was built on a prod-pointing tree. ~~**⚠️ DISCARD the pre-repoint AAB**~~ — the owner's earlier `eas build --profile production` ran BEFORE the repoint, so that AAB points at PROD (`extra.apiUrl` was prod at build time). Do NOT submit it. A NEW build on `70d840c` (or later) is required for a staging-pointing AAB. (autoIncrement → the discarded build just burned a versionCode; harmless.)

### R7 (Q&A + Timing Engine) — Step 0 prerequisites (2026-07-22, R7 home chat)
- [x] ✅ **RESOLVED 2026-07-22 — confidential rule set + FX1–FX6 RE-PROVIDED (on disk).** The handover `plans/build-27/Revelia_Build27_Timing_Engine_Handover_v1.md` (§2 rule set, §3 FX1–FX6 on the one shared fixture natal, §4 reflective mapping) is back on disk; the Step-0 sub-chat reads the rule set/fixtures FROM it. ⚠️ It was **untracked AND not gitignored** (a stray `git add -A` would have committed the trade secret into the app repo) → **now gitignored this session** (`.gitignore` trade-secret block covers the handover + `server/config/timing/`, fail-closed) so it stays on-disk-for-reference but out of git. **Step-0 SOURCE unblocked.** (`prompts.txt §13a`.)
- [ ] **(Phase-B / pre-deploy — NOT a Step-0 gate) Wire the R7 rule-set runtime loader per S-R9f/D8.** Posture is **already DECIDED** (PM 2026-07-17, `sid-signoff.md` S-R9f/D8): the R7 rule set stays **OUT of git** + loads at runtime via a **private-R2 `loadConfidentialConfig` loader R7 inherits** (NOT commit-to-repo). ⚠️ **Code-fact to verify:** `loadConfidentialConfig` does **not** exist — R9 built only `loadConfidentialPrompt` (a bundled-file reader, `report.service.ts:199`) because it committed its prompt to the private org repo. So R7 likely **builds** the private-R2 loader. **Step 0 does NOT need this** — it runs LOCALLY + posture-agnostic (fail-closed loader from config/env; `server/config/timing/` gitignored; commits engine code + harness, never the rule-set data). Do this before the R7 engine deploys. (`sid-signoff.md` S-R9f/D8 + S-R7; `R7-QA.md §4/§13`; `.gitignore` trade-secret block.)

### R7 LG1 — timing rule-set private-R2 loader + bucket provisioning (✅✅ DONE — code + provisioning + STAGING-PROVEN 2026-07-24)
- [x] ✅✅ **STAGING-PROVEN END-TO-END (2026-07-24).** Owner provisioned the private `revelia-timing` bucket + a scoped READ-ONLY token + set `R2_TIMING_*` on `revelia-staging-build27`, uploaded the v1.1 `rule-set.json`. Staging boot log: **`[timing-config] rule set loaded from R2 (17215 bytes, key rule-set.json)`** + `Timing Engine rule set initialized from R2.` — 17215 bytes matches the uploaded v1.1, **no fail-closed warning, no per-request degrade** → the loader + bucket + token + envs all work end-to-end. **LG1 fully closed for staging.** ⚠️ **PROD carry (before prod deploy):** repeat on the prod backend — set `R2_TIMING_*` + upload the rule set to the prod timing bucket (mirror the staging setup).
- [x] ✅ **LOADER CODE-DONE + HOME-VERIFIED (2026-07-24, `build27-R7-QA-loader`, COMMITTED `7bef912`, 4 files, no Co-Authored-By).** NEW `confidential-config.service.ts` (async `loadConfidentialConfig` memoized + `initTimingConfig` boot prefetch + `isTimingConfigConfigured`; distinct least-privilege `R2_TIMING_*` S3 client; **fail-closed** on unconfigured/missing/fetch-err/malformed[generic re-throw, no parser message]/partial[names the missing KEY, never a value]; **in-memory memo only** — no fs import/writeFile/tmp anywhere [sole `/tmp` hit is a doc comment]; **content-free logs** = byte-count + key-name on success, reason-only on failure) + engine `setRuleSet` setter (`loadRuleSet` byte-unchanged, scoring untouched) + `index.ts` boot try/catch (per-request degrade, content-free reason, server comes up) + `.env.example` placeholders (creds empty; only the non-secret `revelia-timing` bucket default carries a value). Boot-failure = **per-request degrade** confirmed to route through the EXISTING §13d-3 qa.service degrade path (`TimingConfigUnavailableError` → reflective, no fabricated verdict / no 5xx leak). tsc clean + 3 harnesses green (also proves the local-FS fallback is intact). **Both confirms verified vs repo:** (1) no populated cred in the `.env.example` diff; (2) never-logged survives error paths (JSON.parse re-thrown generic; fetch errors reason-only, no `.cause`; boot warn logs only the content-free error message). Home scoped it against the actual engine seam: `timing-engine.service.ts` reads `rule-set.json` SYNCHRONOUSLY off the local FS (`configDir()` = `TIMING_CONFIG_DIR || <repo>/server/config/timing`, gitignored) → **no prod source exists** → the engine would fail-closed in prod. Design: a NEW `confidential-config.service.ts` async `loadConfidentialConfig()` fetches the rule set from a private R2 bucket (distinct least-privilege `R2_TIMING_*` namespace, mirroring `report-delivery.service.ts`), validated + fail-closed on missing/partial/malformed/unconfigured, **in-memory only (NEVER cached to disk, contents never logged)**; wired via a boot-time `initTimingConfig()` prefetch so the engine's `loadRuleSet()` stays SYNC + BYTE-UNCHANGED; local-FS path kept as the dev/harness fallback. No engine-logic/scoring/router/mobile change; no trade-secret bytes committed.
- [ ] **⚠️ OWNER ACTION — provision the timing R2 bucket + creds (does NOT exist yet; CONFIRMED by home 2026-07-24).** Only two R2 namespaces exist today: `R2_*` (public `revelia-images`) + `R2_REPORTS_*` (private `revelia-reports`, provisioned 2026-07-22). The R9 "Sid provisioning private R2" open-item produced the REPORTS bucket, **NOT** a timing-config bucket. Before the loader can run in prod the owner must: (1) create a PRIVATE `revelia-timing` (or similar) bucket — no public URL; (2) mint a scoped least-privilege READ token for it; (3) upload the current `rule-set.json` (and `fixtures.json` if the loader is extended to it) to the bucket; (4) set `R2_TIMING_ACCOUNT_ID`(or `_ENDPOINT`)/`R2_TIMING_ACCESS_KEY_ID`/`R2_TIMING_SECRET_ACCESS_KEY`/`R2_TIMING_BUCKET_NAME` on Railway (prod + any staging). The loader can be BUILT now against this env contract (fail-closed until configured). (`prompts.txt §13g`; `sid-signoff.md` S-R9f/D8.)

### R7 Timing Engine v1.1 — LAUNCH-GATE (Sid-gated; non-blocking for the build, must close before R7 ships)
- [x] ✅ **S-R7e RESOLVED 2026-07-25 by Timing Engine Rule Set v1.1.1** (`Revelia_Timing_Engine_RuleSet_v1_1_1_Patch.md`, Sid 2026-07-24; engine+harness committed `be02d28`). Sid **REJECTED** the proposed "tag Venus as a universal gains-lord" workaround (it would fit this one querent and distort every other chart) and issued the correct principle instead: **R11a two-path domain alignment** — a period lord aligns with a domain either by its R11-table significations (natural, unchanged) **or** by the NATAL-FUNCTIONAL path (in the querent's natal chart it OCCUPIES the natal karya house for the category, or RULES it by sign lordship; nodes by occupancy only). FX6b now surfaces **2028-09 / ad_boundary** (Venus OCCUPIES the querent's natal 11th) and FX3 **2027-07 / ad_boundary** (Ketu's new displacement/relocation significations). Gate: **22/22 assertions, 8/8 units green**; FX1/FX2/FX4/FX5/FX6a verified **byte-identical** by full-output diff. Also fixed the reason this hid: the harness asserted only the window BASIS, so it reported 17/17 GREEN while emitting 2035-06 against a fixture pinned at 2028-09 — window DATES are now asserted. **⚠️ NOT user-visible until the new rule-set.json is re-uploaded to R2 — see the ⭐ action below.** (`sid-signoff.md` S-R7e; `build-27-caveats.md` R7 §.)

### ⭐⭐ R7 TIMING v1.1.1 — RE-UPLOAD `rule-set.json` TO THE `revelia-timing` R2 BUCKET (**HARD gate before ANY redeploy**)
- [x] ✅ **DONE 2026-07-27 (PROD) — LG17 CLOSED.** `R2_TIMING_*` set on the prod backend and the **v1.1.1** `rule-set.json` uploaded to the prod private `revelia-timing` bucket. The timing engine loads real v1.1.1 rules in production (FX6b behaviour = 2028-09, not the 2035-06 the inert v1.1 produced). Staging is moot — that project has been torn down. **The standing rule survives this closure:** every future amendment = commit the engine AND re-upload to prod's bucket. Original text kept for the trail: ~~**OWNER ACTION — re-upload the v1.1.1 `rule-set.json` to the private `revelia-timing` R2 bucket (key `rule-set.json`), for EVERY environment (staging now, prod at prod-carry).**~~ **Why this cannot be skipped:** per LG1 the engine loads the rule set **from R2 at runtime** (`confidential-config.service.ts` boot prefetch → `setRuleSet`). The rule set is **gitignored and therefore NOT in the commit** — the deploy carries the new ENGINE but not the new RULES. Until the bucket object is replaced, staging/prod keep loading **v1.1** and **FX6b stays 2035-06 in deployed environments even though local `npm run test:timing` is fully green.** The v1.1.1 rules are inert without this step — this is precisely the failure mode where local tests lie about deployed behaviour.
  - Source of truth on disk: `server/config/timing/rule-set.json` (v1.1.1, gitignored; also update `fixtures.json` there if the loader is ever extended to it). **Access: Amey / Anirudh / Sid only.**
  - **Verify after upload** via the staging boot log — the byte-count must CHANGE from the v1.1 `17215 bytes`: expect `[timing-config] rule set loaded from R2 (<new size> bytes, key rule-set.json)` + `Timing Engine rule set initialized from R2.`, with no fail-closed warning and no per-request degrade. A boot log still reading **17215 bytes means the OLD v1.1 is live** and the upload did not take.
  - Ordering: do this **BEFORE** the next staging redeploy, and again as part of the LG1 **prod carry** (prod bucket + `R2_TIMING_*`).

### R7 crisis path — LAUNCH-GATE additions (Sid v1.1 §5, 2026-07-23; NOT Step-0/1 blockers — wire in the relevant later steps)
> Sid CONFIRMED the general number-free crisis wording FINAL and ENDORSED the guardrails architecture; `CRISIS_WORDING_FINALIZED=true` (`77df885`). These four are required before LAUNCH sign-off (crisis-serving lands in Step 3+), not now:
- [~] **(1) Crisis/unsafe logging privacy (DPDP/GDPR) — ✅ SERVER-SIDE LOG WIRED (§13d-3, `1abe64d`).** The Q&A safety short-circuit logs `{userId, route, mode}` ONLY — never question/answer content (the router likewise logs no question content). ⏳ REMAINING to confirm at launch: (a) the broader guarantee that **no crisis/unsafe event feeds analytics, marketing, or model training** (data-governance review of the analytics/telemetry pipeline, not just this log line); (b) if unsafe content is ever retained for abuse-pattern review, do it **only under access control + a defined retention period**. The label+timestamp-only log requirement itself is met.
- [x] ✅ **(2) Crisis-screen behavior — DONE (mobile, §13e-2 Item B, 2026-07-24).** `mobile/app/(main)/readings/qa.tsx` derives `safetyMode` from the LAST assistant message's `mode ∈ {crisis, unsafe, off_topic}`; when true the screen SELLS NOTHING — the counters chip row, the location-consent banner, the question-cap upgrade CTA, and the Deep-Insight toggle+upsell are all suppressed; the send handler never routes to the paywall (`atQuestionCap && !safetyMode`); suggestion chips are empty-state-only (a crisis reply means messages exist → chips never render); and `recordMeaningfulAction` is only ever called for reflective/timing, so **no rating prompt** can fire on a safety reply. The decline bubble renders PLAINLY (no "🔮 Revelia" label, no DI tag). Also holds for `unsafe`/`off_topic` (decline rendered plainly, no CTA). **[DEVICE]** the live crisis render rides Testing Pass 2 (LG4). Server side already carries no upsell fields + logs label+timestamp only (§13d-3).
- [ ] **(3) Multilingual classifier fixtures.** Add **1 Hindi indirect-crisis** phrasing + **1 Portuguese reflective** question to the router fixtures (`qa-router-fixtures.check.ts`); the cautious-preference line must hold across languages (week-one users). Wire in the Step-1 router-update (`13b-v1.1`) or a follow-up.
- [ ] **(4, optional) Classifier format fail-closed.** Require the classifier to output the label as a single lowercase token; any other output = a classification failure routed to `off_topic` (fail-closed on format, fail-safe on content — format failures never reach the main model). Optional hardening; fold into `13b-v1.1`.
- [ ] **(OPTIONAL, owner's call — ZERO launch dependency) Crisis country-append (27.1 fast-follow).** A server-side append of ONE static line for the 4 launch markets only — US/CA **988**, India **Tele-MANAS 14416**, Brazil **CVV 188** — held as a 4-entry map + a quarterly-review task; the general sentence stays, the number line appends beneath. NOT the per-country lookup the guide avoided. **Do NOT build unless the owner says so.** (`build-27-caveats.md` R7 §; `sid-signoff.md` S-R7b/D6.)

### R7 D5 — SERVER-SIDE per-device free-DI anti-farming gate (✅ CODE BUILT + HOME-VERIFIED 2026-07-24 `fe5a59c`, LG16 CODE-CLOSED; owner launch sub-tasks below still OPEN)
- [x] ✅ **SERVER CODE BUILT + HOME-VERIFIED (2026-07-24, `build27-R7-QA-D5-server`, COMMITTED `fe5a59c`, 5 files incl new `models/QaDeviceDiClaim.ts`; no config/mobile touched; no Co-Authored-By).** Per handover §6 spec: `qa.controller.ts` parses `X-Device-Id` (never logged raw) → threads `deviceId` through `qa.service`'s `answerQuestion` → `enforceQaCaps`. New model **`server/src/models/QaDeviceDiClaim.ts`** `{deviceHash, monthKey, createdAt}` — unique `{deviceHash, monthKey}` + a TTL index (`expireAfterSeconds` 60d on `createdAt` = the 60-day purge). `qa-caps.service.ts` adds `hashDevice(raw)=sha256(QA_DEVICE_SALT+raw)` (server-only, read at call time), `isDeviceFreeDiClaimed` (the gate), and `recordDeviceDiClaim` (post-answer, idempotent upsert). Gate wired into `enforceQaCaps` as step (3) after the per-account DI sub-cap: **FREE tier + DI + device-id present + a claim already exists this UTC month (ANY account) → 402 `deep_insight_limit_reached`** (same shape as the sub-cap). Claim RECORDED post-answer only for a DELIVERED free-tier DI (mirrors per-account counting → a failed answer never penalizes a legit user). **FAIL-OPEN** on absent/blank `X-Device-Id`, unset `QA_DEVICE_SALT` (misconfig → per-account-only, warns), and DB error. **Paid-tier DI is NOT device-gated** (tier DI sub-cap governs). Raw id NEVER persisted/logged. tsc both clean; 3 committed harnesses green. **→ report to build27-R7-QA-Home to verify vs repo + flip LG16 done.**
- [x] ✅ **DONE — OWNER D5 launch sub-task (1/3): `QA_DEVICE_SALT` set on STAGING 2026-07-24 and on PROD 2026-07-27.** The per-device free-DI gate is live in production. Confirm end-to-end via the ⭐ verification row below (boot log + two-account repro + the new decision telemetry). Original text: ~~**set `QA_DEVICE_SALT` — ✅ STAGING DONE (2026-07-24), ⬜ PROD PENDING.**~~ A high-entropy random secret (server-side only). Without it the gate FAILS OPEN (per-account-only, logs `qa_device_salt_unset_fail_open`) — no crash, but the per-device anti-farming is silently OFF → LG16's protection is inert. ✅ Set on `revelia-staging-build27` (device-gating now testable in Pass 2). ⬜ **Still MUST set on prod before ship** (Phase 2 / runbook 2.2). Rotate on suspected compromise (invalidates stored hashes — fine, a claim only covers one month).
- [ ] **⭐ VERIFY THE GATE IS ACTUALLY LIVE ON PROD (2026-07-27 point release, `qa-device-gate` fix).** The internal-test repro ("one device, two free accounts, two free Deep Insights") was **root-caused to the prod salt being absent at test time** — runbook 2.3 tiers `QA_DEVICE_SALT` as a Phase-2/prod-promote item, while the internal-track build is hardwired to PROD (`extra.apiUrl`, see BUILD-TARGET BLOCKER above), so the gate was inert exactly where it was tested. The server code was correct and correctly failed open. Now that the salt is set on prod, confirm end-to-end:
  1. **Boot log** — after the next deploy, the line `[qa-device-gate] QA_DEVICE_SALT is NOT set …` must be **ABSENT**. Its presence means the gate is inert on that environment. (New in this release; mirrors the `APPLE_CLIENT_ID` / timing-config boot warnings.)
  2. **Re-run the repro** — account A (free) asks a Deep Insight → account B (fresh free, same device) asks a Deep Insight → B must get **402 `deep_insight_limit_reached`**.
  3. **Read the decision log** if it still fails — every free-DI ask now emits ONE content-free line (no raw id, no hash) that names the branch taken:
     - `qa_device_di_gate {reason:"claim_found", gated:true}` — the gate fired (expected for account B).
     - `qa_device_di_gate {reason:"no_claim"}` — salt set, header received, no prior claim → account A's ask; a claim should follow.
     - `qa_device_di_gate {reason:"no_device_id"}` — **the app sent no `X-Device-Id`** (old build, or the hardware id was unavailable on that device — see the residual caveat in `build-27-caveats.md`).
     - `qa_device_di_gate {reason:"salt_unset"}` — the salt is still missing on the env being hit.
     - `qa_device_di_gate {reason:"lookup_failed"}` — DB error (fails open by design).
     - `qa_device_di_claim {recorded:true|false, reason:…}` — whether account A's claim row was actually written. `recorded:false` here is the direct cause of B not being gated.
  4. **Regression guard** — `npm run test:qa-device-gate` (50/50) is committed and must stay green. An optional real-DB round trip runs with `QA_DEVICE_GATE_LIVE_DB=1 MONGODB_URI=<staging>` — **staging/scratch only, never prod.**
- [ ] **OWNER D5 launch sub-task (2/3): privacy-policy "Fraud and abuse prevention" line** (handover §6, verbatim) — disclose the salted device-hash used to prevent free-DI abuse.
- [ ] **OWNER D5 launch sub-task (3/3): Google Play Data-safety "Device or other IDs" declaration** (handover §6, verbatim) — the app collects a device identifier for fraud prevention (hashed server-side, not linked to advertising).
- [x] ~~**Build the server-side salted-hash + per-device free-DI gate.**~~ (✅ done — see the built line above) §13e-2 (Item B) wired the MOBILE side of D5: `mobile/app/(main)/readings/qa.tsx` reads the hardware device id (`mobile/lib/deviceId.ts` — Android SSAID via `expo-application` `getAndroidId()`; iOS `getIosIdForVendorAsync()`; fail-open → null) and sends the RAW id as the **`X-Device-Id` header ONLY on the Deep-Insight ask** (never on any other request). **The SERVER currently IGNORES that header** — the per-device gate the plan §11 Step-4 acceptance called for ("per-device anti-farming (salted hash, fail-open)") was **NOT implemented in §13d-5** (`qa-caps.service.ts` has no device handling; grep-confirmed). To close D5 end-to-end the server must: parse `X-Device-Id`, **salt+hash it server-side** (a server-only `QA_DEVICE_SALT`; raw id NEVER persisted — plan §6 `{deviceHashSalted, monthKey, claimedDeepInsight}`), and **gate the FREE monthly Deep-Insight per device-hash** (fail-open when the header is absent, so a legit user is never blocked; also gate per-account, which already holds via the DI sub-cap). This is a distinct SERVER step, not a mobile task. **⚠️ RE-CLASSIFIED (owner, 2026-07-24): HARD SHIP-BLOCKER = LG16.** The earlier "abuse-optimization, not blocking" call is overruled — free DI runs the **Fable-5 path (the most expensive call, ~$3.35/report)**, and without the per-device gate a single device farms unlimited free Fable-5 DI by creating accounts (per-account 1/mo does NOT bound per-device). That's a real cost/abuse exposure → R7 is NOT shippable until this lands. **Scoped as `build27-R7-QA-D5-server` (prompts §13f, [USE NEXT])** — build to the handover §6 spec: parse `X-Device-Id`, salt+hash server-side (`QA_DEVICE_SALT`; raw NEVER persisted/logged), gate the FREE monthly DI per device-hash, fail-open when the header is absent, 60-day claim purge. **OWNER D5 launch sub-tasks:** the privacy-policy "Fraud and abuse prevention" line + Google Play Data-safety "Device or other IDs" declaration (handover §6, verbatim); set `QA_DEVICE_SALT` on Railway before deploy. (LG16; `plans/build-27/R7-QA.md` §6/§11 Step 4; `sid-signoff.md` D5; handover §6.)

- [x] ✅ **RESOLVED 2026-07-22 — Finding 1 was a stale pre-step-7 image; clean re-run on the pushed image (SHA ≥ `e17bcd9`) passes ALL THREE gates:** (a) **guard LIVE** — a QA-passed report reaches `status:'failed'` (`NotImplementedError: upload seam Step 8`, `pdfKey:null`), NOT `ready`+STUB; slot refunded via the partial index; (b) **nudge LIVE** — `outputTokens 13,086` (~20-24pp), up from the stale 10,040; (c) **render-RAM CAPTURED** — soffice+matplotlib peaked **~185 MB total container** (98 baseline → 185 peak → settled), well under Pro-tier → **docx→LibreOffice CONFIRMED viable on Railway; @react-pdf fallback NOT needed**; retires the provisional local ~300 MiB. Worker flag OFF. **Step 8 UNBLOCKED.** (Original finding kept below for the trail.)
- [x] ~~**⚠️ REDEPLOY STAGING FROM HEAD (≥ `e17bcd9`, ideally `6f1b489`) — the 2026-07-22 staging `ready`+`pdfKey:'STUB'` was a STALE PRE-STEP-7 IMAGE, not a bug.**~~ (✅ done — see the RESOLVED line above) Home-chat verified against the committed code: the ONLY code that sets `status:'ready'` is `reportWorker.ts:205`, BEHIND the step-7 guard that throws on `pdfKey===PDF_KEY_STUB`; the default upload seam throws. So `ready`+STUB is IMPOSSIBLE in HEAD — it is exactly the PRE-step-7 behavior (old guard `if(!pdfKey)` passes truthy STUB; pre-step-7 `generateReport` returns STUB with NO render/QA). The `pdfKey:'STUB'` tripwire fired CORRECTLY = "flag flipped on a stale image." Corroboration: the run's **10,040 output tokens ≈ 4.7K words = the pre-nudge FLOOR** (a real length-nudge run is ~12–14K tokens) → the image also predates the nudge `6f1b489` → i.e. pre-step-7. And pre-step-7 = render UNWIRED → **the ~111 MB was GENERATION-only RAM, NOT render-RAM** (no soffice/matplotlib ran). **Likely mechanism: `e17bcd9`+`6f1b489` not yet PUSHED to the branch staging deploys from (commits were local).** FIX: push the branch through `6f1b489` → redeploy staging → confirm the deploy's commit SHA ≥ `e17bcd9`. RE-RUN acceptance (all three, before Step 8): (a) a QA-passed report does NOT reach `ready`+STUB — it FAILS at the throwing upload seam → slot refunded (guard live); (b) output jumps to ~12–14K tokens (nudge live); (c) the soffice render actually runs → real on-Railway render-RAM captured. ⚠️ **Do NOT greenlight Step 8 until this clean re-run passes** — Step 8's "upload flips to ready" must sit on a live guard. (`prompts.txt §12t`.)
- [ ] **Sample PDF → R2 (REQUIRED — the in-app sample viewer is now BUILT, un-deferred 2026-07-25).** Upload the gitignored `Personalized_Cosmic _Sample_Report.pdf` (repo root) to the **PRIVATE `revelia-reports` bucket** at key **`samples/cosmic-report-sample.pdf`** (the same bucket/creds as user reports — `R2_REPORTS_*`; no new bucket). `GET /api/reports/sample` re-signs this object per request; the free-locked + paid-entry "View a sample report" button opens it. Until uploaded, the endpoint returns `sample_unavailable` and mobile hides the button (graceful — not a hard gate, but the "see before you buy" conversion surface is dark until done). Verify: after upload, hit `GET /api/reports/sample` on staging → 200 with a `secureLink` that opens the PDF. (`sid-signoff.md` S-R9f; `build-27-caveats.md`.)
- [x] ✅ **D6 mockups — DELIVERED 2026-07-22** (`plans/build-27/R9-step9-mockups.html`) — the step-9 screens (both-tab entry cards, the state-driven hub, generating/ready/expired, history, paywall split) as the build reference + the D6/S-R9e sign-off artifact (directional layout/copy/state; final pixel polish is post-build per S-R9e). Step 9 UNBLOCKED. Net-new visual tokens = indigo report icon + gold NEW badge. (`sid-signoff.md` S-R9e.)
- [~] **Private R2 bucket — PROVISIONED 2026-07-22; CODE WIRED (step 8, 2026-07-22); remaining = set the 4 staging envs + run the E2E proof.** Bucket **`revelia-reports`** created (private, no public URL) + a **scoped staging token** + a **lifecycle rule = delete objects after 60 days**. **✅ CODE:** step 8 landed `server/src/services/report-delivery.service.ts` — a SEPARATE least-privilege client reading `R2_REPORTS_*`, wired as `report.service`'s upload-seam default (unconfigured → a clear `ReportDeliveryNotConfiguredError`, not a silent stub); the in-app `secureLink` is minted fresh per GET via `getReportSignedUrl`. ⏳ **REMAINING (owner, before step 8 staging proof):** set these 4 env vars on the STAGING Railway service (`.env.stag` now carries them as placeholders) — mirroring `r2.service.ts`'s `R2_ENDPOINT||R2_ACCOUNT_ID` + key/secret + bucket pattern:
  - `R2_REPORTS_ACCOUNT_ID` = the Cloudflare account id (builds `https://<id>.r2.cloudflarestorage.com`) — **or** `R2_REPORTS_ENDPOINT` = the full endpoint URL (either works, same as the existing R2 client);
  - `R2_REPORTS_ACCESS_KEY_ID` = the scoped staging token's Access Key ID;
  - `R2_REPORTS_SECRET_ACCESS_KEY` = the scoped staging token's Secret Access Key;
  - `R2_REPORTS_BUCKET_NAME` = `revelia-reports`.
  (NO `R2_REPORTS_PUBLIC_URL` — private bucket; the `secureLink` is minted per-GET via `getSignedUrl`, TTL'd. The 60-day lifecycle = server-side auto-expiry backstop; the app's secureLink TTL is separate + shorter.) Optional: `R2_REPORT_EMAIL_LINK_TTL` (seconds; default+cap 604800 = 7 days) tunes the report-ready EMAIL link's TTL only (the in-app link is fixed 1h, re-minted per view). gates R9 §14 step 8. (`sid-signoff.md` S-R9g; `prompts.txt §12t`.)
- [~] **⚠️ STEP-8 STAGING E2E — PIPELINE GREEN 2026-07-22, one delivery bug being fixed (§12t-i).** The full pipeline ran end-to-end on staging: report reached **`ready` + real pdfKey, PDF rendered correctly, stored in R2, email delivered** — GREEN. **ONE bug:** the emailed "Open your report" link was **rewritten by SendGrid CLICK TRACKING** into a `url*.revelia.me/ls/click?...` redirect whose subdomain doesn't resolve (NXDOMAIN) + risks corrupting the presigned signature. FIX = §12t-i (disable click+open tracking PER-SEND on the report-ready email) — LANDED `71ea7bd`, code-verified, branch PUSHED to origin. ⏳ **RE-CONFIRM DEFERRED into STEP-9 testing (owner, 2026-07-22):** rather than a standalone staging re-run now, the emailed-link check folds into step-9 testing (the mobile results screen consumes the secureLink → naturally re-confirms the delivered link opens the PDF) + is re-tested at/before internal testing (post-R7). NOT a standalone blocker — the pipeline already proved green end-to-end; only the one email-link hop awaits its (folded-in) re-confirm. R9 backend = COMPLETE pending step 9. (Original steps kept below for the eventual run.)
- [ ] ~~**⚠️ STEP-8 STAGING E2E PROOF (owner — the first full-pipeline green run; step-8 code landed 2026-07-22).**~~ (pipeline proven green — see the [~] above; only the emailed-link fix + re-confirm remain) After setting the 4 `R2_REPORTS_*` + a staging `SENDGRID_API_KEY` (below): on the STAGING Railway service only, `REPORT_WORKER_ENABLED=true` → enqueue ONE self report (a staging user with `birthData` + a verified `email`) → assert **`status:'ready'` + a REAL `pdfKey` (≠ 'STUB')**; **`GET /api/reports/:id` returns a `secureLink` that opens the actual 20-24pp PDF**; the **report-ready EMAIL arrives** with a working link; the **credit is consumed (1/month, `GET /api/reports/credit` remaining 0 — NOT refunded; this is success)**; **PROD UNTOUCHED**; flag OFF after. This is the first time the FULL pipeline (enqueue→reserve→claim→inject→Fable→render→QA→upload→ready→email→openable PDF) runs green. (handoff STEP 8 "OWNER staging E2E steps".)
- [x] ✅ **Sid-gated prompt reconciliation (finding C)** — DONE 2026-07-20 (commit `7805e86`): added the `NUMEROLOGY_JSON` inject slot, changed numerology "compute"→"consume the injected values, do NOT recompute", reconciled Y-wording to always-vowel. Home-chat VERIFIED against the prompt file. UNBLOCKED R9 §14 step 5. (`sid-signoff.md` D1 follow-up = RESOLVED.)
- [x] ✅ **Astronomy DERIVED-quantities prompt tweak (finding-C analog)** — DONE 2026-07-20 (commit `ed5773d`): added the `ASTRONOMY_JSON.derived` schema block (field names matching 5a's `ReportAstronomyPayload.derived` key-for-key) + reframed §3 "Derived quantities" from "compute in both modes" to consume-not-compute (methodology formulas retained; Mode-A self-compute preserved for the no-inject path). Home-chat VERIFIED against the prompt file + the 5a types (zero name mismatches). UNBLOCKED R9 §14 step 5b. (`sid-signoff.md` S-R9j = RESOLVED.)
- [x] ✅ **MANDATORY 5b COST SMOKE — DONE 2026-07-21** (`tracking_files/build27-usage-cost.md`): **Opus-4.8 (flag OFF, prod floor) = $0.87/report** (37.2K in / 27.5K out, ~5.6 min); **Fable-5 = $3.35/report** (59.5K out, ~11.7 min). Both AT/UNDER the ~$2/~$3 estimates → affordable at 1/month/paid-user. No truncation (96K holds). MODEL_RATES verified correct. ⚠️ **It ALSO surfaced the DECISIVE step-6 blocker → S-R9k (below): the prompt's OUTPUT CONTRACT is Mode-A code-exec `.docx`, not Mode-B prose.**
- [ ] **🚦 STEP-6 GO/NO-GO GATE (owner + home chat decide BEFORE step 6 is issued)** — step 6 = the renderer + the LibreOffice/RAILPACK→Docker switch (Railpack = Railway's current default; Nixpacks deprecated) (the feature's highest infra risk). Do NOT commit to the full docx→LibreOffice renderer until the 5b cost smoke + interpretation quality + the renderer-contract finding (below) are reviewed with Sid. **Fork:** full-fidelity docx→LibreOffice (matches the sample; highest infra risk) **vs** the lighter HTML+CSS→headless-Chromium / @react-pdf fallback (plan-recorded step-6 fallbacks; lower fidelity, lower risk). Decision inputs (all THREE now in hand): (1) **cost** ✅ measured (Opus $0.87 / Fable $3.35 — affordable); (2) **the #1 item — OUTPUT-CONTRACT Mode decision (S-R9k)**; (3) **chart vector-vs-raster** (downstream of #2). **🛑 #1 GO/NO-GO ITEM — S-R9k (2026-07-21, cost smoke, home-chat CONFIRMED):** the shipped confidential prompt is a **MODE-A code-execution prompt** (§1 code-exec + file-creation → returns `.docx`), so run as a plain text call BOTH models emit a **`.docx` build-script transcript, NOT prose** → `report.service` persists a code blob, unusable by the Mode-B Node renderer. finding-C/S-R9j fixed the INPUT side; this is the missing OUTPUT-side reconciliation. **RESOLVE BEFORE step 6 (Sid-gated — `sid-signoff.md` S-R9k):** (A) rewrite the prompt to PURE Mode-B prose w/ stable section delimiters [RECOMMENDED — the D2-decided architecture; smoke proves values ARE consumed + prose is sample-grade, only the packaging is code], or (B) spike a code-exec renderer (Mode A — spike §0.1 already rejected it: no LibreOffice in sandbox, .docx-not-PDF, reintroduces model arithmetic). This SUPERSEDES the earlier "weak section boundaries" framing — same root cause, fully understood: wrong output medium, not just weak delimiters. Chart vector-vs-raster is downstream (Mode A → model draws matplotlib; Mode B → Node renderer). (R9 §14 step 6; `build-27-caveats.md` OUTPUT-CONTRACT; `tracking_files/build27-usage-cost.md`; `sid-signoff.md` S-R9k.)
- [x] ✅ **Copy `src/prompts/*.md` AND `src/services/*.py` into the build — CLOSED by the 6b Dockerfile (2026-07-21).** The builder stage runs `mkdir -p dist/prompts dist/services && cp src/prompts/*.md dist/prompts/ && cp src/services/*.py dist/services/` after `tsc`, so `loadConfidentialPrompt()` + `resolveChartScript()` resolve from `node dist/index.js`. Verified in-image: `dist/services/report-charts.py` + `dist/prompts/*.md` present. (R9 §14 step 6b.)
- [x] ✅ **SETTLED (§14 step 6a, 2026-07-21) — chart VECTOR-vs-RASTER + docx→LibreOffice preservation.** 6a re-inspected the ACTUAL shipped sample PDF: **0 raster image xobjects on every page; chart pages are 44–48 vector path groups → DEFINITIVELY VECTOR** (overrides prompt §8 "dpi 200 PNG" + the browser "raster" report). Fork-reopen test: matplotlib SVG → docx SVG ImageRun → `soffice` docx→PDF → **vector PRESERVED end-to-end (0 raster xobjects out); the Q1 docx→LibreOffice fork does NOT reopen.** Renderer builds charts as matplotlib SVG. Recorded in `R9-report.md §14 step 6 / §0.1 B1` + `build-27-caveats.md`.
- [~] **SendGrid — CODE WIRED (step 8, 2026-07-22); remaining = set the key + staging proof.** Step 8 added `sendReportEmail` (email.service) + the best-effort/idempotent `deliverReportReadyEmail` fired by the worker after `ready`. ⏳ **REMAINING:** set a staging `SENDGRID_API_KEY` for the step-8 E2E proof (`.env.stag` placeholder present), and verify the PROD `SENDGRID_API_KEY` on Railway before the flag flip / prod ship (D5). ⚠️ **EMAIL COPY is a content task** — the subject/body in `sendReportEmail` is a reasonable default; owner/Sid may refine (like R7 D6). (`build-27-caveats.md` R9 §.)
- [ ] **RENDERER FORK DECIDED (owner+Sid go/no-go, 2026-07-21): docx → LibreOffice** (plan B-verdict primary; the shipped sample IS a docx-derived PDF → highest fidelity; matplotlib charts). **@react-pdf/renderer is the RECORDED FALLBACK — engage ONLY if step-6b proves LibreOffice `soffice` exceeds the Railway PRO-TIER RAM.** Step 6 SPLIT: 6a = renderer service (local); 6b = Dockerfile + staging deploy.
- [x] ✅ **LibreOffice on a STAGING Railway project — VALIDATED GREEN 2026-07-21.** Owner deployed the 6b Dockerfile to a NEW dedicated staging Railway project (EU West): **Docker build green + boot clean + `/api/health` 200 + `/api/profile` 401-with-body (the EXISTING app serves under Docker) + native `sweph` confirmed + PROD UNTOUCHED.** The RAILPACK→Docker switch works. **Render-RAM = provisional-pass on the local ~300 MiB smoke; on-Railway CONCURRENT render-RAM deferred to STEP 7's first wired render** (the seam still stubs → enqueue renders nothing until step 7). ⏳ **Still open (non-blocking, 6b/owner):** the ONE Fable spot-check on the reconciled prompt (confirm-smoke was Opus-only) — Fable only matters post-flag-flip (Opus is the prod-default path), so not a step-7 blocker; do it before/with the flag flip. (`R9-report.md §0.1 B2`; `sid-signoff.md` S-R9k.)
  - *Build note kept for the record:* the `server/Dockerfile` is clean/portable — the local dev-box build needed `--network=host --build-arg HTTP(S)_PROXY=` ONLY because Docker Desktop runs a TLS-MITM apt/registry proxy; **Railway has no such proxy → use the standard build there.** Dockerfile pins Node 20 (`node@20.20.2` verified in-image). If on-Railway render-RAM ever exceeds Pro-tier → fall back to @react-pdf.
- [ ] **⚠️⚠️ ON-RAILWAY RENDER-RAM — CLOSE NOW (step 7 wired the renderer; this is the FIRST end-to-end render).** Step 7 wired `renderReportPdf`+QA into the worker seam, so a STAGING enqueue now renders a REAL report. **Owner step:** on the STAGING Railway project only, set `REPORT_WORKER_ENABLED=true` → enqueue ONE self report → the wired worker runs a REAL render → watch the staging **Metrics peak RAM during the render** → confirm **under the Pro-tier ceiling** → this RETIRES the provisional local ~300 MiB (6b) with a real on-Railway number. STOP → @react-pdf iff peak exceeds Pro-tier. Turn the staging flag back OFF after. (Staging EU West: RAM read valid, latency not.) Do NOT flip the flag on PROD (that's gated on steps 5–8 all wired + step 8 delivery). (`R9-report.md §14 step 7`; handoff STEP 7.)
- [x] ✅ **CHART-RASTER container delta → STEP-7 GATE DECISION = ACCEPT dpi-200 RASTER (option a), 2026-07-22.** Step 7's `qaReportPdf` chart criterion counts DISTINCT **raster image xobjects (≥3)** and does NOT assert vector — the production/container-correct check (LO 7.4 rasterises the docx SVGs → 3 distinct raster xobjects: 825×889 / 1003×870 / 1297×569). Even vector-preservation is LO-version-fragile, so option (b) [pin a newer LibreOffice] was NOT taken. Empirically confirmed this session: local LO preserves vector (0 image xobjects) while the container render (`report-6b.pdf`) has exactly 3 — the gate is verified against a real container raster render. (`build-27-caveats.md` R9 §; `R9-report.md §14 step 7`.)
- [ ] **⚠️ Sid-gated "target ~20–24pp" prompt LENGTH NUDGE (surfaced by step 7, 2026-07-22).** The reconciled Monty prose (~4.7K words) renders to EXACTLY 18pp — right at the step-7 QA floor of 17. The floor was deliberately set to 17 (NOT 18) so a typical report never trips a paid re-Fable, but the real fix for consistent length is a small **Sid-gated prompt nudge** ("aim for ~20–24pp / ~5.5–6.5K words of prose"). This is a prompt edit (Sid-gated — NOT done in step 7). Do it before/with the flag flip so shipped reports sit comfortably mid-range. (`R9-report.md §14 step 7`; `build-27-caveats.md` R9 §.)
- [ ] **Re-run the §12o-SMOKE cost smoke AFTER S-R9k lands** (owner-run, ~1 real call) — confirm the output is now PROSE-not-code (re-validates 5b's persisted `interpretation` shape post-rewrite). Small; gates issuing step 6. (`prompts.txt §12p` → §12o-SMOKE.)
- [ ] **NEW (step 9 DO 8) — the FREE rebuild route (`POST /api/reports/:id/rebuild`) also requires `REPORT_WORKER_ENABLED=true`.** An expired report's rebuild is claimed by the SAME worker (a new per-minute rebuild tick), so with the flag OFF the rebuild route accepts (202, sets `regenerating:true`) but nothing re-renders until the flag is on. This is correct + expected (prod-dark). Staging (flag ON) is where the rebuild E2E is proven; prod after the flip. NO new env var, NO new infra — reuses the private-R2 uploader + the existing worker/cron. Test on staging: expired report → Rebuild → poll → ready → openable PDF, NO credit consumed, NO Fable, dates match the persisted interpretation. (`R9-report.md §14 step 9 DO 8`.)
- [x] ✅ **DONE 2026-07-27 — `REPORT_WORKER_ENABLED=true` IS SET ON PROD.** R9 is live: queued reports are claimed, generated, rendered, QA-gated, uploaded and emailed. The tripwire below still applies as a monitoring rule (any prod Report with `pdfKey:'STUB'` = a stale image). Original gating text kept for the trail: ~~**Flip `REPORT_WORKER_ENABLED=true` on Railway**~~ — the R9 §14 step-4 async worker (`server/src/jobs/reportWorker.ts`) is **PROD-DARK by design** (default OFF → no cron registered, nothing claimed; a queued Report just sits). Flip to `true` **ONLY AFTER steps 5-8 are wired** (real astronomy+numerology inject → Fable interpretation → renderer/PDF+charts → QA gate → R2 delivery) **AND the finding-C prompt reconciliation is done** (the gating item above). Until then the worker's `generateReportArtifacts` is a STUB that stamps `pdfKey:'STUB'`. ⚠️ **TRIPWIRE: any prod Report with `pdfKey:'STUB'` means the flag was flipped too early** (before real artifacts existed) — reports would go `ready` with no real PDF and consume users' 1/month credit for nothing. Mirrors the `SYNTHESIS_FABLE_ENABLED` convention. (R9 §14 step 4; `build-27-caveats.md` R9 step-4.)

## ⏳ POST-DEPLOY
- [ ] **Numerology D1 backfill (GATED runbook)** — R9 step 2a (`1235e37`) shipped Y-as-vowel + `NUMEROLOGY_VERSION 2.0.0`. Sequence: deploy → `npm run backfill:numerology:dry` in prod → **owner REVIEWS the diff** (count of affected Y-name users + a sample of before→after Soul-Urge/Personality values) → then run the REAL `backfill:numerology`. Lazy read-time recompute means users self-heal even before the real run → **no rush, no stale-value window.** Shared with R7 (one migration; do not migrate twice). :dry already showed **221 prod profiles, all `create`** (R4's backfill was unrun → this is one clean always-vowel pass). (`build-27-caveats.md` R9 step-2a; `prompts.txt §12i`.)
- [ ] **Other backfills** (each `:dry`→real after deploy): `backfill:natal-chart` (R1), `backfill:face-features` (R2, after threshold recentre), `backfill:palm-features` (R3, after step-10 recentre). The numerology backfill is the D1 2.0.0 pass above (supersedes R4's unrun pass). (`build-27-caveats.md` Cross-cutting/owner.)
- [ ] **R3 step-10** — on-device EAS real-phone test + palm threshold recentre BEFORE a wide `backfill:palm-features`.
- [x] ✅ **DONE 2026-07-27 — `SYNTHESIS_FABLE_ENABLED=true` IS SET ON PROD.** Marquee surfaces + the report + free Deep Insight now run Fable 5 (Opus 4.8 fallback intact). Note the original condition — *"only after the live D7/D30 A/B shows lift"* — was **not** waited on; the flag was flipped at ship. It stays a one-line reversible lever if cost or quality argues for the Opus floor. Feeds P12 (the S-R9L cost analysis now measures the Fable path, not the Opus floor).
- [ ] **📊 R9 report COST/USAGE analysis in Internal Testing → Sid tier decision (S-R9L).** During internal testing (whole app live-to-testers), let the auto-logged per-report `modelUsed`/`usage`/`costEstimate` accumulate → compute the real **$/report distribution** (mean + spread across varied users). Baseline already measured: **Opus-4.8 $0.87** (the prod default, flag OFF) / **Fable-5 $3.35** at 1/month/paid-user. Diff vs Sid's bar. **Both levers are server-side + reversible (no rebuild):** TIER = one-line `reportLimitForTier` (both-paid → **PP-only** = `tier==='premium_plus'?1:0`); MODEL = `SYNTHESIS_FABLE_ENABLED` (Opus floor ↔ Fable). **Plan: promote the SAME internal-testing AAB to prod; if the cost is within Sid's bar ship as-is (both paid tiers, Opus floor), else apply Sid's call server-side** (restrict to PP-only and/or keep Fable off). ⚠️ **PP-only also needs the small step-9 paywall-copy case** (premium user → "A Premium Plus feature / Upgrade to Premium Plus", not the free-lock "Premium" copy). (`sid-signoff.md` S-R9L; `build27-usage-cost.md`.)

## 🧹 HOUSEKEEPING / SECURITY
- [ ] **Remove the dev IP from MongoDB Atlas allowlist** — temporarily added for R9 step 2a's read-only prod `:dry` backfill. Remove now that the :dry is done. (R9 step 2a; `prompts.txt §12i` OUTCOME.)
- [x] ✅ **DONE 2026-07-27 — Git housekeeping CLOSED.** `feature/build-27` (cut from `feature/build-26`, so it carried all build-26 work) merged to `main` as `e724cec`. `main` now reflects live production (v2.0.0), which subsumes the original ~~merge `feature/build-26` → `main`~~ action.

## 📱 ANDROID 16 (API 36) TARGET-SDK COMPLIANCE — fix/build-27.1 (added 2026-07-28)

> **Play Console requirement:** the app must target **Android 16 / API 36**. We were on 35. **Deadline 2026-08-31.** No rush, but it lands in this 2.0.x point release. **Play's ask is API 36 — Expo SDK 54 is one way to get there, NOT the requirement itself.**

**Code state:** ✅ **Path A (minimal) COMMITTED — `e588f87` on `fix/build-27.1`.** `mobile/app.json` → `expo-build-properties.android`: `compileSdkVersion 35→36`, `targetSdkVersion 35→36`, `buildToolsVersion "35.0.0"→"36.0.0"`. No Expo SDK / RN upgrade, no other config touched. **Deliberately its own isolated commit so it can be reverted independently of the D5 / observability fixes on this branch** (`git revert e588f87`).

> ## 🟢 UPDATE 2026-08-03 — **THE BUILD RISK IS DISCHARGED. WHAT REMAINS IS A DATE.**
>
> The "may fail with an AGP-too-old / `buildToolsVersion 36.0.0 not found` Gradle error" fork below
> **did not happen.** `e588f87` is on this branch and **`targetSdk 36` is confirmed on both cuts**, so
> **Path B (the Expo SDK 54 / RN 0.81 upgrade) is not needed and must not be opened.**
>
> 🔴 **P14 IS THEREFORE HANDLED — PROVIDED A PRODUCTION RELEASE SHIPS FROM THIS BRANCH BEFORE
> 2026-08-31.** And the owner's **no-release-split** decision (2026-08-03) means that release is the
> *complete* redesign: primitives + screens + motion + a11y, plus **P18a's externally-gated asset
> approval**. **~4 weeks of calendar, for a primitives phase alone estimated at 12–14 sessions.**
>
> ### 🔴 THE FALLBACK — take it deliberately, at ~2026-08-24
>
> **If 2.1.0 is not on track to ship by ~Aug 24, cherry-pick `e588f87` ALONE onto a 2.0.x
> compliance-only release and ship that.**
>
> - **Why that commit:** it was isolated on purpose, so it cherry-picks *forward* onto `main` as
>   easily as it reverts. Three values in `app.json`'s `expo-build-properties.android`, nothing else.
> - **Why ~Aug 24 and not Aug 30:** an EAS production build, a Play review and an internal-testing
>   sanity pass need slack. A compliance release that misses its own deadline is worth nothing.
> - 🔴 **What missing the date costs: Play blocks ALL UPDATES until the app targets API 36.** Not the
>   listing, not new installs — **updates.** Every fix and every part of this revamp would be
>   undeliverable until a compliance build shipped anyway, so **the fallback is strictly cheaper than
>   the failure it prevents.** It costs one cherry-pick and one build.
> - ⚠️ **Taking it changes nothing else.** 2.1.0 still ships the complete redesign from this branch.

- [x] ✅ **DONE — the EAS Android production build ran (twice: cut 1's `versionCode 34` was never built, cut 2's `35` is on internal testing and owner-verified).** Original text: ~~**⭐ OWNER — run the EAS Android production build. This is the ONLY real validation.**~~
  ```sh
  cd mobile && npx eas-cli build --platform android --profile production
  ```
  `npx tsc --noEmit` is clean (ran 2026-07-28) but **proves nothing here** — tsc never sees the native/Gradle layer. **Risk:** Expo SDK 53 / RN 0.79 bundles an AGP built around compileSdk 35, so this may fail with an "AGP too old for compileSdk 36" / `buildToolsVersion 36.0.0 not found` style Gradle error.
  - **IF IT FAILS:** `git revert e588f87` — **do NOT try to force it** (no manual AGP pin, no Gradle-property hack). Capture the exact Gradle/AGP error text, then scope **Path B** below as separate planned work.
  - **IF IT SUCCEEDS:** confirm the AAB's `targetSdk` is 36 (Play Console shows it on the release page; or `bundletool dump manifest`), then run the Android-16 on-device checklist below.

- [ ] **Path B (ONLY if Path A fails) — Expo SDK 54 / RN 0.81 upgrade = NOT a point-release item.** It touches every native module — `onesignal-expo-plugin`, `react-native-purchases`, `@react-native-google-signin/google-signin`, `expo-location`, `expo-application`, `expo-camera`, `expo-image-picker` — and needs a **full device retest** (all three login paths, push delivery/FCM, purchases, camera/palm capture, location). Open it as `feature/build-28` work with its own plan, not a fix branch.

- [ ] **Android 16 BEHAVIOR-CHANGES on-device pass** (only meaningful once a targetSdk-36 build exists — targeting 36 *opts the app in* to these; they do not apply at targetSdk 35). Ordered by likelihood of biting THIS app:
  1. **Edge-to-edge is ENFORCED and no longer opt-out** (API 36 removes the `windowOptOutEdgeToEdgeEnforcement` escape hatch). **Highest-risk item for us.** 🔴 **AND IT LANDED, 2026-08-05 — THIS ROW STOPPED BEING A PREDICTION.** The founder reported it from a 3-button Samsung: tab labels inside the system row, empty band above the bar. Fixed in code (tab bar, the bottom-inset hook's double count, both capture screens, both guide overlays, the paywall tail) — **see §"P80"**, which also amends this section's own fallback: `e588f87` alone would ship the defect. The rest of this checklist item still stands for the surfaces P80 did not touch. Check every screen for content sliding under the status bar / gesture nav bar: the camera capture screens (face + palm), the Q&A chat screen (keyboard + input bar vs the nav bar inset), the paywall, the crisis screen, the report/results screens, and any modal or bottom sheet. Verify `SafeAreaView` / `useSafeAreaInsets` are actually applied on the bottom edge, not just the top.
  2. **Location permission flow** — we request `ACCESS_COARSE_LOCATION` only (`ACCESS_FINE_LOCATION` is in `blockedPermissions`), with `expo-location` foreground/background both disabled. Re-verify the coarse-only grant dialog still appears and the decline path falls back to the birth city as designed (the R7 D-path copy).
  3. **Notifications / FCM push delivery** — re-verify a real push arrives on an Android 16 device. Notification permission and posting behavior have tightened across recent releases; push is orchestrated by OneSignal but delivered by FCM, so this is an end-to-end check, not a config read.
  4. **Foreground-service restrictions** — we should be unaffected (`isAndroidForegroundServiceEnabled: false` for location, no other FGS), but confirm nothing in the OneSignal/native layer starts one.
  5. **Photo/media picker** — all `READ_MEDIA_*` / `READ_EXTERNAL_STORAGE` permissions are in `blockedPermissions` and we go through `expo-image-picker`, so the scoped picker path should be unchanged. Still worth one upload-from-gallery pass on the face and palm flows.
  6. **Share sheet** — the reading-share path is already fragile on Android (the cancel-cascade fix in `mobile/utils/shareReading.ts`). Re-run one share + one deliberate dismissal to confirm no regression and no phantom `share:` meaningful-action recorded.

---

## 🆕 BUILD 27.1 PRE-FLIGHT AUDIT — P15–P19 (added 2026-07-29, session `build27.1-preflight-audit`)

> ⚠️ **ID NOTE:** these arrived numbered P14–P18, but **P14 was already taken** by the Android 16 (API 36) target-SDK row (added 2026-07-28, §"ANDROID 16 (API 36)" above). Renumbered to **P15–P19** to keep IDs unique across this register. If any of these were cross-referenced elsewhere as P14–P18, the mapping is +1.
>
> Source: `plans/build-27.1/preflight-findings.md`. Commerce items are gated on Sid — see `sid-signoff.md` §"BUILD 27.1 — S-P1".

### P15 — Confirm RevenueCat access + Play integration status · OPEN · Amey
Amey sees no prices anywhere in the RevenueCat dashboard. Either a Member-vs-Admin
permissions limit or an incomplete Play integration. Ask Sid which. Blocks any
S-P1 work even after approval — see `preflight-findings.md` §A1 precondition.

### P16 — Verify the comp-tier clobber · OPEN · 🟠 plausible, unconfirmed
`subscriptionStore.applyTierToAuthUser()` (`:126-141`) overwrites the server's
`getEffectiveTier` result with the RevenueCat-derived tier, and is invoked from the
global `CustomerInfo` listener registered at launch (`initSubscriptionSync()`
`:148-156`, called from `app/_layout.tsx:73`). A comped account has no RevenueCat
entitlement, so `mapCustomerInfoToTier` returns `'free'`. If that listener fires on
initial fetch, the comp-derived tier is replaced with `'free'` client-side, locking
every mechanism-A gate while the server keeps granting access.
Unverified — whether the listener fires on initial fetch is SDK runtime behaviour,
not determinable from the repo. **Impact if real: every comped account
(influencers, marketing, Sid, PM, test accounts) is silently locked out of what it
was comped for, and would be reported as "the app is broken", not as a bug.**
Check: `scripts/grant-comp-tier.ts` + a Play-signed build + that account. ~10 min.

### P17 — Fix three stale price docs · OPEN · low effort, no gate
`docs/REVENUECAT_SETUP.md:66-69` and `:1558-1561`,
`mobile/SUBSCRIPTION_IMPLEMENTATION.md:200-203`,
`mobile/SUBSCRIPTION_QUICKSTART.md:44-47` all say $14.99/$99.99 for Premium Plus.
Play Console says $12.99/$89.99 and the code agrees. Correct the docs.

### P18 — Rebrand asset set for 2.1.0 · OPEN · Amey / designer
### 🔴 SPLIT 2026-08-03 INTO **P18a (BINARY — GATES THE RELEASE)** and **P18b (LISTING — DOES NOT)**

The Vellum palette retires purple (`#4C1D95`, `#6B21A8`) and gold `#F59E0B`
becomes clay. Off-brand as a result: app icon, adaptive icon, splash, favicon,
Play Store feature graphic and screenshots. Also `ShareCard` hardcodes
`['#6B21A8','#0F0A1A']`, so every card already shared looks like a different
product. Play listing assets have a review turnaround — do not discover this
during the staged rollout.

> **Why the split.** The two halves have **different delivery mechanisms and different gates**, and
> carrying them as one item means the half that does not gate anything holds up the half that does.
> A binary asset ships **inside the AAB** and cannot be changed after the promote without another
> build. A listing asset is **uploaded to the Play Console separately** and can be replaced at any
> time, including mid-rollout.

#### 🔴 P18a — BINARY. Ships with the build. **HARD GATE on 2.1.0.**

| # | asset | note |
|---|---|---|
| **1** | ⚠️ **SPLASH** — the image **and** `app.json`'s `splash.backgroundColor` | 🟢 **THE COLOUR HALF IS DONE (2026-08-03)** and 🟢 **THE FEARED DEFECT DOES NOT EXIST — MEASURED 2026-08-04.** The worry was a **baked purple ground** rendering as a slab on the new warm black. Decoded: 2732×2732 RGBA, **51.43% fully clear**, and **every one of its 1,516,952 fully-opaque pixels is INK** (amber, hue 21–24) — **ZERO opaque ground-hue pixels.** The centre pixel and 3 of 4 corners are clear. **`splash.backgroundColor` already IS the ground, so there is nothing to strip.** Now asserted permanently by `no-baked-ground`. ⬜ **The IMAGE is still open, for a smaller reason than before**: 25.99% of the canvas carries a **translucent purple corner glow** (mean alpha 65/255, peak 175, never opaque, concentrated top-right at a 26:1 ratio over bottom-left) which composites over `#100E0D` to `#12040F`…`#725A6A`. That is retired-palette *decoration*, not a ground — removing it is changing the artwork, not fixing an alpha bug, so **it rides the new asset rather than a script.** 🔴 **Whatever lands must keep `no-baked-ground` at 0** — every design tool exports a filled artboard by default, and that rule exists because this is the first thing every user sees, before any JS runs |
| **2** | **adaptive icon** — the image **and** `app.json`'s `android.adaptiveIcon.backgroundColor` | 🟢 **COLOUR HALF DONE (2026-08-03)**, same value, same argument, same blindness. ~~It is INERT until the image lands~~ 🟢 **NO LONGER INERT — 2026-08-04.** The generated `assets/adaptive-icon.png` is **56.4% transparent**, so the background colour is visible for the first time. **The two halves met without either having to know about the other.** |
| **3** | **app icon** | 🟢 **THE GEOMETRY IS DONE — 2026-08-04.** `app.json` pointed BOTH `icon` and `adaptiveIcon.foregroundImage` at ONE file and the two specs are **mutually exclusive** (opaque vs transparent), so the shipped 2.0.0 foreground was 100% opaque at 100% of its canvas and **every circular launcher mask cropped 65.8% of the artwork** — worst possible for a zodiac RING. Both keys now point at generated, committed, re-runnable 1024×1024 files (`node scripts/check-brand-assets.js --emit`), and **all nine format assertions PASS**, so the checker is now **wired into `npm run gate`**. ⬜ **What remains is the RECOLOUR ONLY (`P70`)** — geometry made no colour decision |
| **4** | ~~favicon~~ | ✅ **CLOSED AS OUT OF SCOPE — 2026-08-04, owner ruling.** `web.favicon` reaches **no shipped app**: this is Android-first and iOS is paused (`codemod-plan` §5.4), and Expo's web target is not a release surface. 🔴 **It was only ever on this list because it is the ONE asset the specified per-literal channel map actually matches** (95.8% of it) — and there, that map would **ERASE the mark**, collapsing two source roles onto one target. So the map's only match was also its worst case. **Do not carry it as an open item.** ⚠️ It stays in the checker's target list, unasserted, because a decoded measurement costs nothing and dropping the row would hide the retired literals if web ever ships |
| **5** | **`ShareCard`'s hardcoded `['#6B21A8','#0F0A1A']` gradient** | rides the primitives phase (item 9), not the asset drop — but it is the same brand mismatch and **every card already shared looks like a different product** until it lands |

🔴 **Items 1 and 2 were TWO ONE-LINE EDITS EACH plus an image. 🟢 BOTH EDITS LANDED 2026-08-03** —
they did not have to wait for the images after all, because the *ground* the OS paints is a colour
decision the palette had already made. **The cross-fade on first paint is gone as of that commit.**
🟢 **AND THE TWO ICON IMAGES ARE NOW DONE TOO — 2026-08-04, GEOMETRY ONLY.** Both are generated from
`logo.png` by `node scripts/check-brand-assets.js --emit`, committed, deterministic and re-runnable, and
verified against their own rule sets by the same decoder that wrote them. **No pixel was recoloured.**
⬜ **ONE IMAGE REMAINS: the SPLASH — and it is now a DESIGN refresh, not a defect fix.** ✅ The favicon
is closed as out of scope (web-only, no shipped surface). ✅ **`P70` is CLOSED and resolves to nothing**
— its table is two rows and both were already decided, the ground in `7787636`. ✅ Both icons are
generated, gated and geometry-correct. **The risk was forgetting them, and it is now retired.**

🔴 **SO THE HONEST STATE OF `P18a`: it no longer blocks on any measurement or any ruling. What is left
is one piece of artwork that a person has to draw**, and the only mechanical requirement on it is
`no-baked-ground` at 0.

⚠️ **The PM/designer approval lead time on these is NOT owner-controlled.** Start it now; it is the
only gate on this list whose duration nobody here can compress, and it sits on the critical path
alongside **P14's date**.

#### P18b — LISTING. Updates independently. **DOES NOT GATE.**

Play Store **feature graphic** and **screenshots**. These are Play Console uploads, replaceable at
any time including mid-rollout, and a stale screenshot is a marketing cost rather than a shipped
defect. 🔴 **Do not let P18b's review turnaround be quoted as a reason to delay the promote** — that
is precisely the conflation the split exists to prevent. Refresh them during the 5–10% stage.

🟢 **CLOSED 2026-08-03 — `mobile/app.json`'s two colour literals now both carry the palette's own
`bg`.** Raised 2026-07-29 as *"two colour literals that belong to THIS item and to no code pass"*:
`splash.backgroundColor` and `android.adaptiveIcon.backgroundColor`. They are **OS surfaces rendered
before any JS runs**, so no theme token can reach them and no `.ts`/`.tsx` scan can see them — the
codemod's colour gate (`no-raw-hex`) is structurally blind to both (`UI-revamp-design.md` §6.4 V6,
§8), and `app.json` is not under the gate's `$SRC` set nor a directory its greps walk.

🔴 **The ruling that unblocked them: they did NOT have to change in the same cut as the images.** This
section said twice that they must, and that coupling was wrong — it is what kept a two-line fix behind
an externally-gated asset for five days. **The ground is a palette decision; only the mark is a design
decision.** ⚠️ **Do not re-couple them.** Line numbers deliberately dropped from this entry — locate
by key name (`O-`-registrar rule: locate by symbol or string, never by line number).

### P19 — Server-side paid-tier leak on monthly readings · OPEN · needs server work
`preflight-findings.md` §B1. `astrology/monthly.tsx` renders `LockedSection` over
`areas.money`, `areas.health`, `challenges` and `opportunities` — content the
server already sent, because `insight.service.ts:744` only tiers `'free'|'premium'`
and the premium schema emits all four fields. The lock is decorative.
**Also a cost item**: Fable/Opus tokens are spent generating content that is then
hidden from Premium users. Fixing it at the prompt level reduces per-reading cost.

### P20 — ✅ **ANSWERED 2026-07-30 (owner)** · Fill the pass-1 COLOUR DECISION TABLE · **PASS 1b IS UNBLOCKED**
**All eight rows approved as recommended, with three changes.** Full record in
`codemod-plan.md` **§1.6b** (the banner directly under the heading). Summary:
- **V-5 — `scrim` added as ONE value**, `rgba(0,0,0,0.6)` held → `rgba(16,14,13,0.6)` at pass 5.
  🔴 **The 0.5/0.6/0.7 spread is drift, not design.** Shipped in `mobile/theme.js` at pass 0.
- **V-7 — CORRECTED.** The old "allow-list (already correct, do not touch)" wording was wrong:
  those sites are **contrast-correct but NOT token-correct** — they are `text-black`, and
  `black` is 8 of the 565 retired names, so it **stops resolving at S1** and
  `no-legacy-tokens` **will** fail on them. Reworded to *"contrast already correct — rename to
  `on-accent` only, do not re-resolve the role."*
- **V-2 — ADDITION.** Before defaulting the 66 `primary` text sites to `fg-secondary`,
  **enumerate them by role and identify any TAPPABLE labels.** 🔴 Coloured text may be
  carrying the tap affordance; moving it to `fg-secondary` **deletes that silently, with no
  visual error.** Tappable/emphasis → `accent-2` · plain secondary copy → `fg-secondary` ·
  borders → `border-strong`.
- **Recorded as a standing constraint:** `accent-2` now absorbs **FOUR** brand colours
  (`#C4B5FD`, `#EC4899`, `#C084FC`, `#A78BFA`) and `accent` absorbs **three**.
  🔴 **`accent-2` means premium/brand secondary and nothing else — it must not become "the
  generic second colour."**

⚠️ **Two factual corrections to V-7's site list, found by measuring during pass 0** (the
owner's reasoning stands; the enumeration was off):
1. 🔴 **`home.tsx:305` is NOT a white-on-accent site** — it is a **false positive of the
   ±4-line proximity grep**. The `bg-gold` circle's only child is an emoji; the `text-white`
   is a sibling label at `:309` outside it. **No `text-black`, nothing to rename.**
2. 🆕 **A fourth real site the list omits: `compatibility/index.tsx:239-240`** (`bg-gold` +
   `text-black`, the free-user badge). And **`PremiumBadge.tsx` is a two-pairing ternary** —
   only the `premium_plus`/`bg-gold` branch takes `on-accent`; the `bg-pink`/`text-white`
   branch is V-3's problem.
→ **The `on-accent` rename set is FOUR sites**: `PremiumBadge.tsx:10` (plus-branch),
`(paywall)/index.tsx:177`, `WeeklyDayCard.tsx:31`, `compatibility/index.tsx:240`.

<details><summary>Original P20 text (kept for the record)</summary>

### P20 — 🔴 Fill the pass-1 COLOUR DECISION TABLE · ~~OPEN~~ · **BLOCKS the codemod's largest pass** · designer + Amey
`plans/build-27.1/codemod-plan.md` **§1.6b**, eight rows. Pass 1b cannot start until they
are decided. **Three are genuine gaps in the Vellum token table, not judgement calls:**
- **`primary` `#C4B5FD` has NO Vellum target at all** — 66 className usages, the app's
  most-used brand colour, and `UI-revamp-design.md` §2 never names a replacement.
  Recommendation: split by role (text → `fg-secondary`, decorative → `accent-2`,
  border → `border-strong`). **A codemod must not pick this.**
- **`pink` `#EC4899` has no target either** — 14 className + 18 hex = 32 sites. Most are
  gradient stops in slabs the design deletes; triage first, survivors → `accent-2`.
- **There is no `scrim` token** — 16 `rgba(0,0,0,0.5–0.7)` sites. §9 #15 specifies the
  Sheet scrim as *"`bg` @ 60%"*, a component property, not a token. `no-raw-hex` cannot
  reach zero without one. Recommendation: **add a `scrim` row to `theme.color`.**

The other five rows are collapses that need sign-off rather than invention: `accent`
absorbing **three** live colours (`#6B21A8` + `#F59E0B` + `primary-dark`, ~152 sites, so
~31 purple sites turn gold **visibly**), the rgba-white alpha range 0.03–0.10 collapsing
to two surfaces, `fg-disabled`/`locked` having no old equivalent, the A5 `on-accent`
resolution (~10 fill sites out of 434 white sites), and the ~30-value hex long tail.

</details>

### P21 — 🔴 Clear the two iOS-build unknowns · OPEN · Amey · gates verifying TWELVE hard invariants
`codemod-plan.md` **§5.1** establishes that **an iOS build IS producible from this repo**:
`eas.json` carries two Release iOS profiles, a real `ascAppId 6762566575`, `appleTeamId
7MF4U8534H`; `app.json` is on `buildNumber 5`; and `docs/reference/architecture/infrastructure.md:24`
records an **App Store 4.3(b) rejection**, which presupposes a signed upload. (The
`id000000000` in `profile.tsx:116` is the **rate-app deep link**, not a build blocker.)
**So X1/X2/X3 + X11–X19 — the twelve guards that are invisible no-ops on Android — CAN be
verified.** Two things only the owner can check:
1. **Is the Apple Developer Program membership current?** A lapse invalidates distribution signing.
2. **Are the EAS-managed iOS distribution cert + provisioning profile still valid?** Apple
   distribution certs expire ~annually and the last iOS build predates 2.0.0.
   → **`eas credentials -p ios`** (interactive, so it is yours to run).

⚠️ **What an iOS build will and will not prove.** There is **no `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
in any `eas.json` env block** — only the Android one — so RevenueCat will not configure on
iOS and the paywall shows its failed state. **It verifies LAYOUT, not commerce**, and no APNs
config is visible so push is dark too. That is fine: X1–X19 are pure layout invariants.
🔴 **Use TestFlight internal** (`eas build -p ios --profile production` → `eas submit -p ios`)
or the `preview` profile. **NOT the `development` simulator build** — it needs no credentials,
which is exactly why it is tempting, but the original collapse was iOS **production**
behaviour (Build 13) and a green simulator run proves nothing.

### P22 — ✅ **WIRED 2026-07-30** · Enable the token gate hook · **two follow-ups remain, both standing**
**Done in pass 0, no new dependencies:** `mobile/scripts/token-gate.sh` (§3.0.2's eight
portable greps — **all ten baselines reproduce exactly**), `npm run gate`, a tracked
`.githooks/pre-push`, and **`git config core.hooksPath .githooks` is SET on this machine.**
`rg` was **not** added; the gate stays pure `grep -rEn`.

**🔴 The gate is ADVISORY BY CONSTRUCTION, and this is now written into the plan as
`codemod-plan.md` §4.6 rather than left implied.** With no CI, no test runner and no hooks at
all before this, **the gate runs only when someone runs it**, a pre-push hook **dies to
`--no-verify`**, and **`core.hooksPath` is never carried by a clone**. So *every identity claim
in the plan rests on a check nobody is forced to run.* Consequence: **paste the gate numbers
into each pass's commit body** — the commit message is the only durable record that it ran.

⚠️ **One deliberate deviation from the plan's snippet, and it matters:** the hook runs the token
gate **REPORT-ONLY**. §1.2's shape runs it under `set -e`, but the gate **exits nonzero by
design from pass 0 until pass 5** (counting the ~4,220 outstanding sites *is its job*), so a
hard failure would make the repo **unpushable for the entire revamp — starting with the pass-0
commit itself.** `tsc --noEmit` ×2 blocks (clean today); the gate reports.
`GATE_STRICT=1 git push` enforces on demand.

**TWO STANDING FOLLOW-UPS — do not lose either:**
1. ⬜ **Re-run `git config core.hooksPath .githooks` on every other machine / fresh clone.**
   It is local config, per clone, forever. Until then the hook is inert there.
2. ⬜ 🔴 **AFTER PASS 5: flip the hook to blocking** — delete the `|| gate_failed=1` fallback in
   `.githooks/pre-push`. At that point every count is 0 and it becomes a genuine regression
   guard, which is the only state in which it earns its keep. **Its absence is invisible.**

<details><summary>Original P22 text (kept for the record)</summary>

### P22 — Enable the token gate hook · ~~OPEN~~ · one line, per machine
The codemod's completeness proof is a grep gate, and **none of the wiring it assumes exists**:
no `prepush` script in either `package.json`, no husky, `.git/hooks/` holds only `*.sample`,
`core.hooksPath` is unset, and there is **no `.github/` and no CI of any kind**. Separately,
🔴 **`rg` is not on PATH**, so `UI-revamp-design.md` §7.2's gate is inoperative as authored —
`codemod-plan.md` §3.0.2 ships it in portable `grep -rEn` form, with all ten baselines
re-measured and reproducing exactly. Pass 0 creates `mobile/scripts/token-gate.sh` and a
tracked `.githooks/pre-push`; **`git config core.hooksPath .githooks` is not carried by a
clone**, so it is one line per machine. Until it is set, the gate is a manual `npm run gate`.

</details>

### P23 — ✅ **DECIDED 2026-07-30 (owner): option (a)** · the font-scaling question · **now a pass-4 scope item**
🔴 **The global `allowFontScaling = false` does NOT land without its opt-ins.** The **five
`scales: true` conversions** — `quote`, `text-lg`, `text-base`, `text-sm`, `text-xs` — **move
INTO pass 4. Same files, same commit, same revert.** No longer "additive AFTER pass 4."

**The rationale, recorded because it inverts the intuition that a freeze is the cautious choice:**
`allowFontScaling` **defaults to TRUE today**, so inline-sized text already scales **UNBOUNDED**
inside fixed heights — and **the §6.6.1 collision survey measured 1.0× ONLY**, so its "0 TIGHT,
0 OVERFLOW" verdict says nothing about 1.3× and nothing about today's unbounded case. **The
freeze plus a 1.3 cap is therefore a NET IMPROVEMENT for chrome.** The only regression is body
copy — which is exactly what the five conversions opt back in.

**🔴 FALLBACK if pass 4 proves too large:** **do not set the global default in 2.1.0 at all.**
Keep today's behaviour, raise the per-site floors (D3's `minHeight` 44 → 58 is the template),
and ship the freeze in **2.1.1** with the conversions.
**🔴 NEVER SHIP THE FREEZE HALF.** The two halves are one unit in either release.
Recorded in `codemod-plan.md` §1.7 + §3.6 and in `mobile/theme.js`'s `txt()` comment.

<details><summary>Original P23 text (kept for the record)</summary>

### P23 — 🔴 Decide the font-scaling question before pass 4 ships · ~~OPEN~~ · Amey · accessibility exposure
`codemod-plan.md` **O-13**. `UI-revamp-design.md` §3.6 sets
the global scaling freeze **app-wide** at pass 4 (⚠️ **not** via `Text.defaultProps`, which is inert on
React 19 — see `O-30`), and §8 puts the
**~180 `txt()`/`<Txt>` conversions "additive AFTER pass 4."** **Today every `<Text>` in the
app scales with the OS font-size setting.** If those conversions slip past 2.1.0, **the
release ships with font scaling disabled app-wide** — worse than today for low-vision users
and a real Play Store accessibility exposure, not a cosmetic gap.
**(a) Recommended:** pull the ~180 conversions into 2.1.0 for the five `scales: true` steps
on reading-copy surfaces (+1–3 sessions). **(b)** hold the global freeze until they land,
accepting that `qa.tsx`'s composer and `Button`'s fixed 48/56/64 heights (X3) can reflow at
large font scales meanwhile. **Do not let this ship undecided.**

</details>

### 🆕 P24 — 🔴 `npx expo install` RE-ADDS the `expo-font` config plugin to `app.json` · STANDING WATCH-OUT
Not a task — a **trap**, recorded so nobody "fixes" it back. Running
`npx expo install expo-font` **auto-appends `"expo-font"` to `app.json`'s `plugins` array**. It
was **reverted in pass 0, deliberately**, and pass 0 leaves `app.json` byte-unchanged.

**Why:** the owner-decided registration path is **runtime `useFonts`**
(`preflight-findings.md` §E3). The **config-plugin path is platform-asymmetric and fails
silently** (§E2): iOS resolves the font's internal PostScript name, Android the filename base,
and when they differ **neither platform throws, warns or logs** — one renders SF Pro, the other
Roboto. **Do not mix the two paths.** If a future `expo install` re-adds the plugin,
`git checkout -- mobile/app.json`.

### 🆕 P25 — 🔴 THREE DESIGN CALLS RAISED BY THE §14–§18 TRANSCRIPTION · **✅ ALL THREE CLOSED 2026-07-30** · owner / designer / PM

> ## ✅ (a) AND (b) ARE ANSWERED — owner rulings **R1** and **R2**, 2026-07-30 (`build27.1-pass1a-colour`)
>
> **(a) `O-17` → CLOSED. §16.1 wins; V-2 is corrected.** `accent-2` is **never** the colour of an
> element that triggers an action. Mapping for the 66 `primary` sites: **tappable or a link →
> `accent`** · non-interactive emphasis → `accent-2` · plain secondary copy → `fg-secondary` ·
> borders → `border-strong`. Grounds: `accent-2` on a tappable element would create a **second
> interactive colour** and defeat the one-accent premise, and **§10.2's paywall already draws
> Terms/Privacy as `accent` links**. `codemod-plan.md` §1.6b (Change 3 + the V-2 row) and
> `UI-revamp-design.md` §16.3 + §12 all amended to match. **Still 1b work** — 1a enumerates the 66
> by role, 1b rewrites them.
>
> **(b) `O-18` → CLOSED, and WITHOUT new tokens.** `success` and `danger` are solid hex, so the
> opacity modifier composes. 🔴 **Do NOT add `success-muted` / `danger-muted`** — 12% is a
> one-component value and naming it implies a system role that invites drift.
> ⚠️ **BUT THE SPELLING IN THE RULING DOES NOT COMPILE.** Measured against the repo's own
> Tailwind 3.4.19 + NativeWind 4.2.4: **`bg-success/12` emits NOTHING, silently** — Tailwind's
> opacity scale is in steps of five (`0 5 10 … 100`), `nativewind/preset` does not override it, and
> a bare off-scale number is not accepted as an arbitrary modifier. **Use `bg-success/[0.12]` /
> `bg-danger/[0.12]`** (verified: `#10b9811f` / `#ef44441f`), or on-scale `/10` if you would rather
> avoid an arbitrary value. **Owner: confirm which spelling you want.**
>
> ✅ **(c) SETTLED — PM ruled `Free Plan`. See the box below for the binding `textTransform` rule.**
>
> **Two NEW items came out of the same session and need you** (both in `codemod-plan.md` §12):
> **`O-22`** — `PremiumBadge`'s `bg-pink`/`text-white` branch is **3.53:1, sub-AA and LIVE**, and the
> mechanical V-3 mapping makes it **worse** (2.24:1 at Vellum). Recommended: `bg-accent-2` +
> `text-on-accent` = **8.08:1**. **`O-23`** — the **121 `#F59E0B` gold sites** are unassigned between
> pass 1a and 1b; the choice swings 1a by 121 sites and **blocks writing 1a's map.** Recommended:
> golds are 1a (identity, free), only the ~31 purples are 1b.

Added 2026-07-30 (`build27.1-distinctiveness-transcribe`). All three come out of the design
canvas's turns 8a and 9, now transcribed as `UI-revamp-design.md` **§14–§18** and **§10.1.0**.
**None of them blocks a codemod pass** — §14–§18 land in the *primitives / screens / motion*
phases — but **(a) contradicts a ruling pass 1b is about to apply**, so it is the urgent one.

**(a) 🔴 `accent-2` on a tappable label — a direct contradiction. (`O-17`)**
Turn 9's rule: *`accent-2`* **"is never the colour of an element that triggers an action"**, and
`accent-2` on a `Pressable`'s fill, border or label **is a violation**. But **P20's own V-2
ruling** sends *"tappable label, or deliberate emphasis"* **→ `accent-2`** — its whole point being
that a coloured label may be **carrying the tap affordance**, which `fg-secondary` would delete
silently. **The two send the same ~66 `primary` sites to opposite tokens.**
**Recommendation:** **tappable label → `accent`** (satisfies V-2's concern *and* turn 9's rule);
**non-tappable premium-depth marker → `accent-2`**. V-2's other two branches are unaffected.
🔴 **Until you rule, `codemod-plan.md` §1.6b stays operative for pass 1b** — a transcription
cannot silently retarget a pass. Full argument: `UI-revamp-design.md` **§16.3**.

**(b) 🔴 Home's Do / Avoid pair needs two tokens that do not exist. (`O-18`)**
Turn 8a's insight hero renders them as a **`success` @12%** and a **`danger` @12%** wash. §2's
table has **`accent-muted` and `accent-2-muted` only.** §2.1 is *not* breached (the copy is `fg`;
the wash is on `surface-raised`) — but adopting the hero as drawn either **adds two muted tokens**,
which contradicts turn 9's *"tokens unchanged"*, **or renders Do/Avoid another way.**
🔴 **Do not let an implementing pass invent the tokens.** `UI-revamp-design.md` §10.1.0 (iii).

> ### ✅ (c) SETTLED 2026-07-30 — PM RULED. No further decision.
>
> **`Free Plan`, capital P — verbatim from `profile.tsx:158-162`'s `tierDisplay`** (`free: 'Free Plan'`,
> verified in source). **Home's local hardcoded `FREE Member` goes.**
>
> 🔴 **ON THE CASING — a binding implementation rule, not a preference.** The **string** comes from the
> map **verbatim**. If visual caps are wanted, use **`textTransform: 'uppercase'` in the style** —
> 🔴 **NEVER `toUpperCase()` on the string.** One is **presentation**; the other **mutates copy-locked
> content in source**, which is exactly what §6.3's PM ownership exists to prevent. A future reader
> greps for `Free Plan` and must find it.
>
> ⚠️ **`overline` carries `size: 11` and `letterSpacing: 1.3` but NO transform**, so caps need the style
> property regardless — the ramp step does not supply them.
>
> **Phase: SCREENS.** This is copy work; it is **not** run in 1a. Recorded, not scheduled yet.

**(c) ⚠️ C-1 is resolved to option (b) — and (b) IS a copy change, so §6.3's PM sign-off applies.**
Home's tier pill renders from `profile.tsx`'s `tierDisplay` map → 🔴 **`Free Plan`, capital P.**
Not today's `FREE Member`, not §13's *"Free plan"*, not turn 5's *"Free plan"*. §6.3 lists tier
display names as **monetisation copy, PM-owned, "verify before changing"** — so this needs the same
sign-off as C-2…C-5. ⚠️ **Turn 8a's comp draws "FREE Member" and its own audit line wrongly calls
that "verbatim from `tierDisplay`" — transcribe 8a's LAYOUT, not its string.**

**Also registered as device checks, not decisions** (`O-19`/`O-20`/`O-21`, all in
`UI-revamp-design.md` §12, all cheap and all with a pre-decided fallback): `currentColor` in
`react-native-svg` 15.11.2 · the `tide` plate's ratio + sub-floor stroke opacities · SVG under
`BlurView` for LockShell d1. **Add them to the same device pass as W1 and the grain-tiling check.**

---

## 🆕 SONNET 5 FREE-TIER MODEL BUMP — P26 (added 2026-07-31, session `build27.1-sonnet5-freetier`)

### P26 — Deploy + first-cycle watch for the Sonnet 5 free-tier bump · OPEN · Amey

**PM APPROVED the change** (2026-07-31). Six free / all-tier reading surfaces moved
`claude-sonnet-4-6` → `claude-sonnet-5`: monthly-free, compat-free, daily, name-destiny, face,
palm. **Paid marquee surfaces (Fable 5 → Opus 4.8) and all three Q&A tiers are untouched.**
Server-only — **no mobile change, no build, no versionCode bump.** Full technical detail +
the nine accepted caveats: `build-27-caveats.md` § "Sonnet 5 free-tier model bump".

🔴 **THERE IS NO STAGING** (torn down post-ship — see the POST-SHIP STATUS block at the top of this
file). This change's **first real signal is production logs.** That is the whole reason this row
exists rather than being a normal deploy.

**(a) Deploy the server to Railway.** No env-var change is needed — this is code-only. Nothing to
flip, nothing to set.

**(b) Watch two things through the first cycle** (both are named log lines, greppable):
- 🔴 `FACE_READING_TRUNCATED` / `PALM_READING_TRUNCATED` — face/palm `max_tokens` went 8192 →
  **16000**, but they now ALSO run adaptive thinking, which shares that budget with the response.
  ⚠️ **They were already truncating occasionally at 8192 BEFORE thinking was added**, so do not
  read a quiet first day as proof the bump was sufficient.
- ⚠️ **Face/palm latency.** Already the slowest screens (vision + large JSON); adaptive thinking
  adds to it. Known fix if the wait is unacceptable — move those two to the streamed beta path the
  marquee surfaces already use — but that is **extra work, deliberately not done pre-emptively.**

**(c) Verify what image resolution mobile actually uploads.** 🔧 **UNVERIFIED — nobody has
checked.** Sonnet 5 is the first Sonnet with high-res image input (2576px long edge, up to ~4784
image tokens vs 1568 on 4.6), so palm + compat-free could cost up to **~3× per image** if the app
sends large files. **Do this before drawing any conclusion from the cost numbers.**

**(d) 🔴 1 SEPT 2026 IS A COST STEP AND NOTHING IN THE CODE WILL REMIND ANYONE.** Sonnet 5 is
`$3/$15` per MTok (same as 4.6) but carries an **introductory `$2/$10` through 2026-08-31`**.
Separately, its tokenizer counts the same text **~30% higher**. Those cancel until 31 Aug and then
don't: **expect free-tier AI spend to step up ~30% on 1 Sept with no code or traffic change. Do
NOT diagnose that as a regression.**

**(e) The open question this deploy is instrumented to answer — do NOT act on it yet.** Token usage
is now persisted per generation (`AiGeneration.inputTokens`/`outputTokens` + cache split;
`tokensBySurface` in `getRecentAiGenerations`). Estimate is daily insight ≈ **$1/month per
daily-active free user**, which would make it the dominant free-tier line item by an order of
magnitude. If that holds, moving **daily only** to Haiku 4.5 (3× cheaper) is plausible — daily's
substance is already deterministic. 🔴 **But it is the most-seen surface in the app, so it needs a
side-by-side quality read on real output and MEASURED cost — not the estimate.** ⚠️ Rows written
before 2026-07-31 have null token fields and contribute 0, so a window spanning the deploy
**under-reports**; wait for a clean full window.

---
*Seeded 2026-07-18 (R9 orchestration). Add to it as steps surface owner actions; check off (✅ + date), never delete.*
*Post-ship sync 2026-07-27 (`build27-tracking_docs-sync`): added the POST-SHIP STATUS block at the top, closed the 8 ship-gate rows, flagged every staging-dependent row as unrunnable (project torn down). **P1–P13 in that block are the live list.***
*Build-27.1 pre-flight sync 2026-07-29 (`build27.1-docs-edit`): P14 = Android 16 (added 2026-07-28); **P15–P19 added from `preflight-findings.md`** (arrived numbered P14–P18, renumbered +1 to avoid colliding with P14). **The live list is now P1–P19.***
*Pass-1a step-1/2 session 2026-07-30 (`build27.1-pass1a-colour`): **P25(a) and P25(b) CLOSED** by owner rulings R1 and R2 — plus four more rulings applied to the plan docs (R3 scrim → solid hex, R4 O-20 reclassified + the missing `<Plate/>` a11y rule, R5 the `O-` registrar, R6 `PremiumBadge` → `O-22`). **P25(c) is the only part still open.** 🔴 **THIS FILE OWNS THE `P-` SEQUENCE; `codemod-plan.md` §12 OWNS THE `O-` SEQUENCE and states the next free `O-` number at its top** (R5 — the fix for the O-14/15/16 collision). **The live list is still P1–P25; the next new item is P26.** Two new owner decisions are registered as **`O-22`** and **`O-23`**, not as `P-` items, because they are implementation-scope calls rather than actions.*
*`inlineRem` baseline session 2026-07-29 (`build27.1-inlinerem-baseline`): **P18 amended** with `app.json`'s two colour literals (`#0F0A1A` :16, `#2D1B4E` :39) — no code pass can reach them. No new numbered item. **Also standing, not an owner action but a gate on the codemod: the `inlineRem: 16` flip needs an iOS device pass before pass 1 runs** — see `session_handoff.md`.*
*Codemod deep-plan session 2026-07-29 (`build27.1-codemod-deepplan`): **P20–P23 added** from `plans/build-27.1/codemod-plan.md`. **P20 blocks the codemod's largest pass and P21 answers the "can we even test the iOS invariants" question — YES, and it supersedes the previous session's framing of the iOS pass as aspirational.** **The live list is now P1–P23.***
*PASS 0 session 2026-07-30 (`build27.1-pass0-foundation`): **P20 ANSWERED** (all 8 rows ruled; 3 owner changes; 2 factual corrections to V-7's site list found by measuring — `home.tsx:305` is a proximity false positive, `compatibility/index.tsx:240` was missing) → **pass 1b unblocked**. **P22 WIRED** (gate + hook + `core.hooksPath`; **two standing follow-ups: per-clone config, and flip the hook to blocking after pass 5**) and the *"advisory by construction"* limit is now stated in `codemod-plan.md` §4.6. **P23 DECIDED — option (a)**: the five `scales: true` conversions move INTO pass 4; **never ship the freeze half**. **🆕 P24 added** — `expo install` re-adds the `expo-font` config plugin, which must stay reverted. **P21 still OPEN and still gates the iOS invariant pass. The live list is now P1–P24.***
*§14–§18 transcription session 2026-07-30 (`build27.1-distinctiveness-transcribe`): **🆕 P25 added** — the three design calls raised by transcribing the canvas's turns 8a and 9 into `UI-revamp-design.md` §14–§18 + §10.1.0. **(a) is the urgent one: turn 9's `accent-2` rule directly contradicts P20's own V-2 ruling on ~66 tappable-label sites, and pass 1b is next.** (b) Home's Do/Avoid pair needs two tokens the table does not have. (c) **C-1 resolved to option (b) → `Free Plan`, which IS a copy change and still needs §6.3's PM sign-off.** Also five new open items O-17…O-21 in `UI-revamp-design.md` §12 — 🔴 note the `O-` numbering is **ONE sequence shared with `codemod-plan.md` §12 (which holds O-11…O-16); the next new item is O-22**. **The live list is now P1–P25.***
*Sonnet 5 free-tier session 2026-07-31 (`build27.1-sonnet5-freetier`): **🆕 P26 added** — deploy + first-cycle watch for the PM-approved `claude-sonnet-4-6` → `claude-sonnet-5` bump on the six free/all-tier reading surfaces. **Server-only; no mobile change, no build, no env-var flip.** 🔴 **Two items in it are time-bound and nothing in the code enforces them: (c) the unverified mobile image resolution (up to ~3× vision-token cost) and (d) the 1 Sept 2026 end of the intro price, which will look like a ~30% cost regression and is not one.** **The live list is now P1–P26.** No `O-` numbers used (this was not a UI-revamp decision).*

---

## 🆕 PASS 1b COLOUR VALUE PASS — P27–P29 (added 2026-07-31, session `build27.1-pass1b-colour-value`)

### P27 — 🔴 DECIDE `O-24`: the qualitative-scale palette. **BLOCKS nothing today; blocks pass 5's review.**

Pass 1b shipped a **provisional** answer and it needs your call before the pass-5 screenshot review, because
the wrong choice is invisible until then.

**The problem.** Three components encode a 3-band score ladder as **gold / pink / purple** —
`ScoreCard.tsx`, `CompatibilityScoreRing.tsx`, `CompatibilityShareCard.tsx`. §1.6b's mechanical mappings
send **purple → `accent`** (V-1) and **pink → `accent-2`** (V-3), which makes the **best band and the worst
band the same colour**: a 95 and a 30 would render identically, and the ring's only signal is its colour.
`name-destiny`'s `IMPACT_COLORS` has the same problem across **six** categories.

**What 1b shipped** (minimum semantic claim, reversible one line per site): high → `accent` · mid →
`accent-2` · low → **`fg-muted`**; and for the 6-way map `fg-secondary` / `success` / `accent-2` / `danger`
/ `fg-muted` / `accent`.

**The alternative:** a score band is a *quality* scale, so `success` / `warning` / `danger`. That is
arguably more honest **and it would give `warning` its first call sites** (B3 found it ends pass 1 with
zero). ⚠️ It also asks a **product-tone** question that is not ours: **is a low compatibility score a
`danger`?**

🔴 **One measured constraint on any answer:** **held `warning` EQUALS held `accent` (`#F59E0B`)**, so any
category assigned `warning` renders **identically to `accent` for all of passes 1–4** and separates only at
pass 5. Do not assign `warning` to something that must look distinct before the flip.

### P28 — 🔴 ADD THREE SCREENS TO THE §4.4 CAPTURE LIST, and accept that four captures have no baseline

**The good news first: the "before" side is free.** Pass 1a is pixel-identical to production, so the **43
production screenshots from the design phase ARE the pre-1b baseline.** No extra build.

**Add three surfaces 1b changed that the 18-capture list does not cover:**
1. **`(capture)/birth-data`** — the handedness toggle's selected border moved `#C4B5FD` → `border-strong`,
   so selection is now signalled mainly by the label. Highest-risk visual change in 1b.
2. **`(auth)/signup`** — the two `Linking.openURL` Terms / Privacy links moved to `accent`.
3. **`cosmic-report-history`** — four status chips fully re-tokened.

**And four of the existing 18 have no matching production capture** — either shoot a fresh "before" or
verify them against code instead: **#13** `qa.tsx` safety-decline thread (needs a crisis-classified answer,
not reproducible on demand) · **#14** `cosmic-report` `generate`+`ready` (needs a queued report, so
**`REPORT_WORKER_ENABLED` must be on**) · **#17** `DeleteAccountModal` both buttons (destructive flow —
**screenshot only, never confirm**) · **#18** `GeneratingReading` at 1-line **and** 2-line rotation.

### P29 — ⚠️ RE-RUN `git config core.hooksPath .githooks` if you clone or switch machine

Standing, per-clone, unchanged from **O-12**. Repeated here because 1b **modified
`mobile/scripts/token-gate.sh`** (widened `no-bare-scrim`, tightened `no-white-on-accent`, `G()` gained a
third argument), so a stale clone runs a gate that will now report **17 false positives** on the scrim
sites — which is exactly the "noisy rule gets ignored" failure the widening was done to avoid.

---

## 🆕 P28 — SUPERSEDED AND MADE CONCRETE (2026-07-31, after pass 1b landed)

### 🔴 SUPERSEDED AGAIN — OWNER RULING 2026-07-31: **CAPTURE AFTER-ONLY. NO SECOND BUILD.**

**Both of us were wrong about the baseline, in different ways.** I could not verify the 43
screenshots exist (they are not in the repo). But the deeper point is the owner's: **even if they
exist they are NOT a valid pre-1b baseline.** Pass 0's `inlineRem` flip moved **107 of 225 rules
across 1,763 usages** and de-inverted the radius ramp, so the branch is production **plus a 14.29%
rescale**. Every before/after diff would be **dominated by the flip, not by the pass under review**.

🔴 **SO: CAPTURE THE AFTER ONLY, AND JUDGE IT AGAINST SPEC.** 1b is *meant* to change appearance, so
the question is **"does this match the design's intent?"** — answerable from the after alone against
**§2's token table**, **§6.2's values** and **§10's three comped screens**. It is NOT "did it
change?": that is already covered better by the token gate's counters, the residual histogram, the
gradient-fill register and `--diff` than by any human comparing two images.

🟢 **This dissolves the four-captures-without-a-baseline problem entirely** (#13's safety-decline
thread, #14's `ready` phase, #17 `DeleteAccountModal`, #18 `GeneratingReading`). Nothing has a
baseline now, so shoot them after-only against spec like everything else. **Only #8
`BirthChartWheel` is still skippable — 1b did not touch it; it is a pass-5 capture.**

### 🔴 SECOND: I CANNOT TAKE THESE CAPTURES. This is an owner action end-to-end.

§4.1: no screenshot diffing, no device harness, no simulator. §5.1: `requireCommit: true`. The
capture, the rig discipline and the comparison are all yours; what follows is the work list.

### THE 18 CAPTURES — every one re-scoped against what 1b ACTUALLY changed

All 18 surfaces are touched by 1b **except #8**. Line counts are 1b's diff for that file.

| # | capture | 1b diff | note (after-only; no baseline needed) |
|---|---|---|---|
| 1 | `home` top — greeting, StreakBadge, AstroNumeroBadge | 32± | 🟢 yes ⚠️ needs `currentStreak > 0` for the badge |
| 2 | `home` This Month + Explore ×7 + Recent ×5 | 32± | 🟢 yes ⚠️ needs a monthly reading + ≥1 recent |
| 3 | `readings/index` full scroll | 27± | 🟢 yes — **highest 1b change density: 7 of the 16 gradient fixes** |
| 4 | `readings/face` — a locked section | 7± | 🟢 yes ⚠️ free tier + a face reading |
| 5 | `readings/palm` — score bar | 10± | 🟢 yes |
| 6 | `readings/combined` — full-screen lock | 27± | 🟢 yes ⚠️ free tier |
| 7 | `astrology` top — Big Three + generate CTA | 29± | 🟢 yes ⚠️ the CTA only renders with NO chart; two sub-states |
| 8 | `astrology` — BirthChartWheel | **unchanged** | 🟢 yes — 🔴 **NOT NEEDED FOR THE 1b REVIEW.** design §11.4 owns the wheel and 1b deliberately did not touch it. Required at **pass 5** |
| 9 | `astrology` — PlanetCard ×10 + LifeThemeCard ×5 | 29± | 🟢 yes ⚠️ chart + premium for unblurred themes |
| 10 | `astrology/monthly` — a LockedSection | 7± | 🟢 yes |
| 11 | `numerology` bottom | 21± | 🟢 yes — **also the ShareCard `numberValue` blend question (ENTRY 6 row 17)** |
| 12 | `profile` — avatar + tier + disclaimer | 14± | 🟢 yes — **the streak pill moved orange → `accent/10`; three chips now sit adjacent** |
| 13 | `qa` — normal thread **and safety-decline thread** | 39± | ⚠️ **normal: yes. 🔴 SAFETY-DECLINE: NO.** Requires the server to classify a message as crisis/unsafe — not reproducible on demand and never a listing shot |
| 14 | `cosmic-report` — `generate` **and `ready`** | 51± | ⚠️ **`generate`: yes. 🔴 `ready`: NO.** Needs a completed PDF render: `REPORT_WORKER_ENABLED` on, a Premium-Plus account, and minutes of waiting |
| 15 | `(paywall)` full | 14± | 🟢 yes — almost certainly in any listing set. **Highest revenue leverage; A5 CTA + X19 + the billing toggle all changed** |
| 16 | `(auth)/welcome` + `(auth)/login` | 6± each | 🟢 yes — listing screens |
| 17 | `DeleteAccountModal` — both buttons | 15± | 🔴 **NO.** A destructive-flow modal is never a listing shot, and step 2 requires typing DELETE. **Screenshot only — never confirm** |
| 18 | `GeneratingReading` at 1-line **and** 2-line | 5± | 🔴 **NO.** A transient state inside a ~60s wait; which variant appears depends on the rotating message |

**🔴 FOUR HAVE NO PLAUSIBLE PRODUCTION BASELINE: #13's safety half · #14's `ready` half · #17 · #18.**
For those, either shoot a fresh "before" from `34becb4` or accept a code-level review.
**🟢 ONE IS NOT NEEDED AT ALL for 1b: #8** (the wheel is untouched).

### 🔴 THREE SURFACES 1b CHANGED THAT THE 18-CAPTURE LIST DOES NOT COVER — ADD THEM

| add | why | risk |
|---|---|---|
| **`(capture)/birth-data`** | the handedness toggle's SELECTED border moved `#C4B5FD` (bright lilac) → `border-strong` `#2D2640`, against an unselected `border-subtle` `#1F2937`. Those two are **much closer** than the originals | 🔴 **HIGHEST-RISK VISUAL CHANGE IN 1b.** Selection is now carried mainly by the LABEL (`accent` ↔ `fg-muted`). Verify the selected state still reads at a glance |
| **`(auth)/signup`** | the two `Linking.openURL` Terms / Privacy links → `accent`; the terms checkbox fill is `accent` with an `on-accent` tick | 🟠 §10.2's precedent, but it is a legal-consent control |
| **`cosmic-report-history`** | four status chips fully re-tokened (`ready`/`gen`/`expired`/`failed` → `success`/`accent`/`fg-muted`/`danger` grounds + foregrounds) | 🟠 four states must stay mutually distinguishable |

### RIG — hold every one constant across a before/after pair (§4.4)

one physical device · one OS version · OS font size **default** · OS display size **default** · dark
mode · the same account at the same tier · airplane mode **off** · the same scroll position reached
by the same gesture count.

### 🔴 AND THE ORDERING RULING: RUN THIS BEFORE THE R1 COMMIT

**R1 changes what RENDERS** — it deletes the astrology PLUS badge, both `home.tsx` PLUS pills, and
reworks the lock treatments on five sites. Running the screenshot pass after it would **conflate
behavioural changes with 1b's colour changes in a single review**, and the lock surfaces (#4, #6,
#10) are exactly where the two overlap. 1b first, R1 second, each reviewed against its own baseline.

---

## ~~P30 — CUT 1~~ · 🔴 **SUPERSEDED 2026-08-03. CUT 1 WAS NEVER BUILT. FOLD INTO P34; DO NOT CARRY BOTH.**

> ## 🔴 P30 IS SUPERSEDED BY P34, AND IT WAS NEVER BUILT STANDALONE.
>
> Cut 1 was specified as an instrument to be built at the end of pass 1b. **The owner's reorder
> (2a → 2b → 4 → 5 → 3a → 3b) overtook it**, and by the time a build was actually cut the tree was
> past pass 5 — so the artefact that exists is **cut 2**, not cut 1. `versionCode 34` was consumed by
> the remote counter without a corresponding uploaded build.
>
> 🔴 **EVERYTHING P30 WAS FOR STILL MATTERS AND ALL OF IT MOVED TO P34** — the 21-surface capture pass
> (`cut1-capture-checklist.md` is still the procedure and is **not** superseded), **P16** (the
> comp-tier clobber), **P15** (RevenueCat prices), **P11** (the D5 salt), and the **`O-26`** / **`P27`**
> rulings. ⚠️ **`O-26` and `P27` were scoped to "rule this at cut 1"; with cut 1 never built they now
> belong to CUT 3** (`primitives-plan.md` §11.1) — checklist rows H3, 5, 11 and H4, 5, 9.
>
> **Do not carry P30 and P34 as two items.** The sections below are retained for the reasoning and
> for the capture-list pointer only.
>
> ### 🔴 THE `versionCode → cut` MAPPING — the ONLY way to attribute a tester report to a cut
>
> All cuts read `versionName 2.1.0` and **the app surfaces no version string in its UI**, so
> `versionCode` is the sole discriminator.
>
> | versionCode | cut | state it captures | built |
> |---|---|---|---|
> | **34** | **cut 1** | after 1b, before R1 | 🔴 **NEVER BUILT — superseded by cut 2** |
> | **35** | **cut 2** | **2.1.0 post-codemod** — all nine passes + four config stages | 🟢 **BUILT. On Play Internal Testing. VERIFIED WORKING BY THE OWNER 2026-08-03: boots, renders, theme and letterforms landed, no crash, no collapsed layout.** 🔴 **NOT PROMOTED, and must not be** |
> | _(tbd)_ | **cut 3** | after the primitives phase | ⬜ not built. 🔴 **NOT to be promoted** |
> | _(tbd)_ | **cut 4** | the release candidate — after screens + motion + a11y | ⬜ **P37. This is the one that gets promoted** |
>
> 🔴 **`versionCode` IS EAS'S REMOTE COUNTER.** `app.json` still reads `versionCode: 26` and **that
> value is INERT** (`eas.json:4` sets `appVersionSource: "remote"`). **DO NOT hand-edit `app.json` to
> "make it match"** — the local value is never read, and editing it creates a second source of truth
> that will disagree with the store on the next build. **Fill the `built` column with the date as each
> one goes up.**

---

## 🆕 P30 — CUT 1: RUN THE BUILD, THEN THE CAPTURES · added 2026-07-31, session `build27.1-cut1-prebuild`

> 🔴 **THE FULL WORK LIST IS `plans/build-27.1/cut1-capture-checklist.md`.** It holds the 21 surfaces
> (route · account · how to reach · **what specifically to judge**, by named token), a 7-step boot
> smoke sequence, and the runtime risk register. **This entry is the durable pointer; that file is
> the procedure.** Pre-build verification was done in-session — `tsc` 0/0, gate at floor,
> `--diff` clean, and every `t.alpha()` call site executed.

### P30(a) — build and upload

🔴 **`cd mobile && eas build --platform android --profile production`** → AAB → **Play Internal
Testing**. **Owner action: EAS credentials are interactive.**

- 🔴 **`production`, NOT `preview`.** `preview` is an internal-distribution **APK** = sideloaded, and
  **RevenueCat, Google Sign-In and push all misbehave on a non-Play-signed build** — which would void
  the paywall capture and both of P30(c)/(d) below.
- 🔴 **DO NOT PROMOTE.** §10.2: cut 1 is an instrument, not a product — the app is fully repainted in
  the OLD palette behind NEW names, with old radii and the system font.
- 🔴 **The build hits `https://revelia-backend-production.up.railway.app/api`** — `app.json`'s
  `extra.apiUrl` **beats** the profile env (`lib/api.ts:76`), so the `production` profile's
  `api.revelia.me` value is **inert**. Either way it is **LIVE PROD** (no staging). **Every capture is
  against production data, and P30(c)'s `grant-comp-tier.ts` run is a PRODUCTION write.**
- ⚠️ **Version**: recommendation is to bump `versionName` to **`2.1.0`** first — `app.json` `version`
  + **both** `package.json` files; **leave `versionCode` / `buildNumber` alone** (`autoIncrement`,
  `appVersionSource: "remote"`). Rationale and the one caveat are in the checklist §7.1. 🔴 **Because
  all three cuts will read `2.1.0`, record the `versionCode → cut number` mapping here as you build**
  — the app surfaces no version string in its UI, so a tester report is otherwise unattributable.

🔴 **THE TABLE THAT WAS HERE IS SUPERSEDED — the live `versionCode → cut` mapping is in the
supersession banner at the top of this section.** Retained shape, marked, so nobody fills this one in:

| versionCode | cut | state it captures | built |
|---|---|---|---|
| ~~**34**~~ | ~~cut 1~~ | ~~AFTER 1b, BEFORE the R1 commit~~ | 🔴 **NEVER BUILT** |
| ~~_(tbd)_~~ | ~~cut 2~~ | ~~after pass 5~~ | 🟢 **35 — built, verified 2026-08-03** |
| ~~_(tbd)_~~ | ~~cut 3~~ | ~~after the primitives phase~~ | ⬜ see the banner |

🔴 **`versionCode 34` IS EAS'S REMOTE COUNTER, NOT `app.json`'s.** `app.json` still reads
`versionCode: 26` and **that value is INERT** — `eas.json:4` sets `appVersionSource: "remote"`,
so EAS owns the number and `autoIncrement: true` on the `production` profile increments it
server-side. 🔴 **DO NOT hand-edit `app.json` to 34 to make it "match"** (§5.1 unknown 4): the
local value is never read, and editing it creates a second source of truth that will disagree
with the store on the next build.

⚠️ **34 is the assertion to CHECK, not a value to set.** Confirm the EAS build page reports 34;
if it reports something else, the remote counter has moved (another build ran) and the mapping
above is what needs correcting, not the build.

🔴 **This mapping is the ONLY way to attribute a tester report to a cut.** All three cuts read
`versionName 2.1.0` and the app surfaces no version string in its UI, so `versionCode` is the
sole discriminator. Fill the `built` column with the date as each one goes up.

### P30(b) — the captures

**21 surfaces**, the four highest-risk first (`birth-data` handedness · `signup` terms checkbox ·
Home's `DailyInsightCard` · `name-destiny`'s analyse CTA). 🔴 **AFTER-ONLY, AGAINST SPEC** — supersedes
nothing in P28's ruling, just executes it. **Two accounts needed: FREE and PREMIUM PLUS.**

**Two decisions come out of this and nothing else can produce them:**
- 🔴 **`O-26`** (registered in `codemod-plan.md` §12) — rule the **6 progress/score tracks**: keep
  `border-subtle`, or adopt §2 row 14's `accent-muted`? Judged at checklist rows H3, 5, 11.
- 🔴 **`P27`** — confirm or pull back **O-24's five extensions**. Evidence is at rows H4, 5, 9.

### P30(c) — 🔴 FOLD IN **P16** (the clobber) **+ P15** (prices). **BEFORE THE PREMIUM-PLUS CAPTURES.**

> ⚠️ **ID correction**: the comp-tier clobber is **P16**. **P15** is "confirm RevenueCat access + Play
> integration status" (Amey sees no prices). They are adjacent and both need a Play-signed build, so
> they run in the same sitting — but they are two rows, not one.

**P16 — the clobber:**

`subscriptionStore.applyTierToAuthUser()` may overwrite the server's comp-derived tier with the
**RevenueCat-derived** one from the global `CustomerInfo` listener registered at app launch. A comped
user has no RevenueCat entitlement → `mapCustomerInfoToTier` returns `'free'` → **every tier gate locks
while the server keeps granting access.** Unverified because it depends on SDK *runtime* behaviour.

Repro: run `server/src/scripts/grant-comp-tier.ts` on prod → confirm the **server** reports the tier →
**cold-start** this build and sign in → open a Premium-Plus gate. **Gate opens = hypothesis wrong.
Gate locked = CONFIRMED**, and it is a standalone argument for §B5's `entitlements` field.

🔴 **Ordering matters: if the clobber is real, comp tier will NOT unlock captures #9, #14, #14b or
#21**, and you need a real purchase for those four.

**P15 — prices**: the same paywall visit (capture #15) answers whether RevenueCat products render at
all on a Play-signed build. If they do, read the actual prices and close **P-B** /
**P17**'s `$14.99/$99.99`-vs-`$12.99/$89.99` conflict from what the store returns.

### P30(d) — 🔴 FOLD IN **P11**: is the D5 per-device gate actually live on prod?

**Step 1, 2 minutes, before touching the device.** In the prod Railway boot log, search for
`[qa-device-gate] QA_DEVICE_SALT is NOT set`.
- **Present** → the salt is unset, the gate **fails open**, and step 2 will "pass" for the wrong
  reason. Set it and redeploy first.
- **Absent** → set (it was set on prod 2026-07-27). Proceed.

**Step 2** — one device, two free accounts, claim a free Fable-5 Deep Insight on each. **The second
must be refused.** Both succeeding on a clean boot log is a new finding.

> **Why it needs THIS build**: the internal track is hardwired to prod via `extra.apiUrl`, and the
> original failure was root-caused to the prod salt being absent *at test time* — the gate was inert
> exactly where it was tested. There is no other pre-release path to exercise it.

### P30(e) — then, and only then, the R1 commit

Unchanged from P28's ordering ruling: **1b's review FIRST, R1 second.** R1 changes what *renders*.

---

## 🔴 P31 — **PASS 3b IS A 2.1.0 RELEASE BLOCKER, NOT POLISH** · added 2026-07-31, session `build27.1-pass2b-lineheight`

> **Registered HERE, and not only in `codemod-plan.md` §12's `O-` registrar, on the owner's explicit
> instruction.** The `O-` list holds open *questions*; this file is the one CLAUDE.md says to walk
> **before every deploy / internal-testing cut / prod ship / promote**. A blocker has to sit where
> the pre-ship walk will hit it.

### What changed

The owner reordered the codemod on 2026-07-31: **2a → 2b → 4 → 5 → 3a → 3b** (was … → 3a → 3b → 4 → 5).
The reasoning is sound and is recorded in `codemod-plan.md` §2 — 3a is provably zero-delta and 3b
was never protected by the held baseline, so moving both after the colour flip costs nothing and
gets fonts and colour reviewable two sessions sooner.

### Why that creates a blocker rather than just a reordering

🔴 **Pass 5 makes the app LOOK FINISHED while 373 radius sites are still on the legacy scale.**

Under the old order, anything unfinished after 3b was *visibly* unfinished — a half-migrated app
looks half-migrated, and that appearance was itself the reminder. The new order removes that
signal at exactly the moment it stops being redundant:

- **125 of the 373 carry a 2–4px delta** (`codemod-plan.md` §6.6 C: −2 ×73, +2 ×48, +4 ×4, −4 ×4).
  Individually imperceptible; collectively it is the difference between "the corners are a system"
  and "the corners are whatever each screen happened to say".
- **49 of them are GREP-BLIND** (C-k): `rounded-xl` and `rounded-lg` are legal names in **both**
  scales with **different values**, so **no tool can tell a migrated site from an unmigrated one.**
  There is no gate that will notice 3b was skipped. `no-legacy-radii` will read its baseline and a
  reader will assume that is just "radius work still to do", not "the release is incomplete".
- After pass 5 the screenshot pass reads as a **final** review. A reviewer, and the owner, will be
  looking at Vellum colour and Literata type and will not be counting corner radii.

### The action

**Do not cut 2.1.0 to production until pass 3b has landed and had its own diff read by a human.**
3b is a VALUE pass (D2) and 🔴 it is also **LOSSY** — many-to-one by construction, so its only undo
is `git revert` (see `codemod-plan.md` §3.2's lossy-batch rule). Budget **2 sessions**; §11 has not
been re-estimated and 3b remains one of the two passes that genuinely scale per-SITE.

**If 2.1.0 must ship before 3b**, that is a legitimate call — but make it explicitly, and record it,
because the alternative is discovering it after the fact from a Play Store build.

### 🟢 CLOSED 2026-08-01 — **PASS 3b HAS LANDED. P31 IS NO LONGER A BLOCKER.**

> All rulings received and applied in one lossy commit: 373 sites + the `borderRadius` replace, atomically.
> `dead-spellings` **177 → 0** · `no-numeric-radius` (the 19th named rule) **158 → 0** · `GP()` **deleted** ·
> `npm run gate` **exit 0** · `tsc` **0/0**. 🔴 **`git revert <sha>` is its only undo — it is LOSSY.**
> 🔴 **The pass changed a SPEC, not just sites: `O-40` — design §4.4 held two competing sources of truth
> (`absorbs` value-driven vs `use` role-driven) and it had produced THREE collisions. Ruled: `use` is
> normative. §4.5 gained the concentric rule and its boundary.** Full record:
> `plans/build-27.1/pass3b-radius-enumeration.md` PART 2. ⚠️ **Two caveats ride out: `C-P3b-1` (delete
> §4.4's `absorbs` column after the primitives phase) and `C-P3b-2` (the share surfaces' exported
> corner reads tighter than the in-app one — check at cut 3 alongside W1).**
>
> **What remains before 2.1.0: the CUT-2 build (P34), P18's rebrand assets, and O-27.**

### Superseded — the enumeration-stage note, retained for the reasoning

**`plans/build-27.1/pass3b-radius-enumeration.md` is the complete ledger** (owner scoped the 3a
session to *"3b's ENUMERATION ONLY — stop before rewriting"*). Every one of the 368 in-scope sites is
listed with its resolved-now px, its target token, its new px and its delta; the **49 grep-blind sites
are grouped by ROLE with a per-site verdict**; the 3 derived radii (X11 · X12 ×2) are marked
**PRESERVE-BLINDLY and OUT OF SCOPE**.

🔴 **AND THE ENUMERATION CHANGED THE GATE, which is why it had to happen before the rewrite.** §1.6's
**GATE 3b** asserts the delta ledger *"must equal §6.6 C EXACTLY: … 48 at +2 … any OTHER
non-preserving mapping is a bug."* **Measured, that gate would FAIL ON CORRECT CODE.** The `48 at +2`
row assumes every `rounded-xl` becomes the 14px key; read against design §4.4's own role table, **at
least 6 of the 48 are BUTTONS and §4.4 puts `Button` on `radius-pill` as "one spelling"** — a 12px
corner becoming a full pill is a **shape change**, not a +2. A further 12 sites are genuinely open.
**So GATE 3b's ledger must be re-derived from the ruled verdicts and pasted into the commit body.**

**▶ SEVEN RULINGS ARE NEEDED BEFORE THE REWRITE — §6 of the enumeration doc lists them in order.**
The three that actually change the shape of the work:

1. **Do the 6 buttons (+ `Button.tsx`'s 4 inline 12s = 10 sites) go to `pill`?** §4.4 says yes; saying
   yes is what re-derives the gate.
2. **The paywall billing segments — `sm` 8 or `md` 14?** 🔴 **The strongest single proof that no grep
   can adjudicate these, and it is geometric:** they are `rounded-xl` segments inside a `rounded-2xl`
   track with a 4px inset, so the mechanical map sends **parent and child to the identical 14px
   corner** — a visibly wrong nested radius that §6.6 C scores as *two correct +2s*.
3. **The 8 small row cells — `md` 14 or `sm` 8?**

⚠️ **Budget is unchanged at 2 sessions and the enumeration does not reduce it** — the 49 still need
hand-writing and the diff still needs a human. What the enumeration removes is the risk of applying a
mechanical map that was wrong for ~18 sites and calling it gated.

> **Class:** gating-before-promote. **Blocks:** shipping 2.1.0. **Rides:** the same build as **P30**
> (cut 1) if that build is cut after pass 4 — which it now would be, since pass 4 has landed.

🔴 **This is the one gate pass 4 cannot provide for itself, and `codemod-plan.md` §1.7 says so in
those words.** Every automated layer is green — `no-fontweight` 0 on both ledgers,
`no-synthetic-italic` 0, `--diff` enumerated, `--members` steady, `tsc` clean ×2 — **and not one of
them can tell you whether a single character rendered in Literata.** A silent fallback to
Roboto/SF is the *documented* failure mode of this exact change and is easy to miss in a dark-themed
screenshot review.

**Four checks, in order of what they would catch:**

1. **All five faces render DISTINCTLY.** Best single screen: **`readings/combined.tsx`** — it now
   carries Literata-Bold (display steps), Literata-Italic (the affirmation + life-theme blocks),
   Figtree-Regular, Figtree-SemiBold and Figtree-Bold on one scroll. Compare the serif blocks against
   the sans blocks; if everything looks like one face, the fonts did not load and the app is in
   Roboto.
2. 🔴 **The splash does not hang.** Deliberately corrupt one TTF (truncate a copy) and cold-start.
   Expected: the splash releases anyway, a `console.error` fires, and the app renders in the system
   font — degraded, never stuck. The gate is `fontsLoaded || fontError || <3s ceiling>`; this proves
   all three legs.
3. **Icons still render.** `@expo/vector-icons` pushes its own `fontFamily` into `props.style`, which
   lands *after* the global default in the style array. If icons show as boxes, that ordering broke.
4. ⚠️ **A reading screen at the OS's largest font setting.** The global freeze is now live. Reading
   copy authored through `txt()` should still grow (capped at 1.3×); chrome, badges, tab labels and
   button labels should not move at all. **A className-typed `<Text className="text-sm">` will NOT
   grow** — that is caveat `C-P4-5`, known and accepted, not a bug to report.

5. 🔴 **EVERY `display-*` HEADING: clipped ascenders, and collision with the element above.** New,
   on owner ruling 2026-07-31 (`O-34` / `C-P4-1`). Literata's natural line box is 26.7% taller than
   Roboto's, so the ramp's display leading is **negative** — −10.6px at `display-lg`. Measured from
   real glyph ink: **ordinary English two-line headings are CLEAR (+5.65px), but ACCENTED capitals
   COLLIDE by −2.00px.**
   **Start with the three headings that wrap to two lines even at 360dp:**
   `(paywall)/index.tsx:104` "Unlock Your Full Destiny" · `compatibility/index.tsx:139`
   "Compatibility Reading" · `SunSignReveal.tsx:79` "You're a ‹sign›!".
   Then, **at 320dp**, five more wrap: `BiometricConsent.tsx:148` · `ErrorBoundary.tsx:55` ·
   `GeneratingReading.tsx:374` · `CaptureInfoModal.tsx:113` · `LockedSection.tsx:168`.
   And **12 sites are unbounded** — LLM themes, user names, rules-table archetype names — so a long
   value can push any of them to two lines at any width.
   **If it reads cramped, the fix is a DESIGN-DOC revision, not a codemod fix**: `theme.type`'s three
   display lineHeights. The arithmetic is closed — **38 / 31 / 26** puts accented capitals at
   +2.00 / +2.20 / +2.00 and clears every case, costing 4 / 2 / 1px more leading on the largest type.
   ⚠️ **This one belongs on CUT 2's list as well as this build's** — it is a judgement about editorial
   density, not a defect, so it wants a second look once the colour flip has landed.

**If (1) fails**, the fault is in `app/_layout.tsx`'s `FONT_MAP` keys vs `theme.js`'s `family` values
— they must be byte-identical. **If (4) is unacceptable**, flip `FREEZE_FONT_SCALING` to `false` in
`mobile/lib/textDefaults.ts`: one token, and it does **not** cost the font family. That is §1.7's
named fallback, made into a one-line operation on purpose.

---

## 🆕 P33 — `expo-font` MUST NEVER ENTER `app.json`'s `plugins` ARRAY (added 2026-07-31)

> **Class:** housekeeping, but permanent and recurring. **Re-check after:** any `expo install`, any
> Expo SDK upgrade, any `expo-doctor` "fix" suggestion.

**Verified absent as of 2026-07-31.** Keep it that way.

🔴 **Why this is not fussiness.** The two registration paths are **not** equivalent, and the wrong one
fails silently on one platform at a time:

| | Android | iOS |
|---|---|---|
| **runtime `useFonts` (what we ship)** | `ReactFontManager.setTypeface(<JS key>, …)` | registers an alias to the PostScript name and **swizzles** `UIFont.fontNames(forFamilyName:)` |
| | ✅ the JS key is the contract | ✅ the JS key is the contract |
| **the config plugin** | resolves against the **filename base** | resolves against the font's **internal PostScript name**, with no alias manager on that path |
| | ✅ renders if you pass the filename | ❌ **silently falls back to SF Pro** if you passed the filename |

**Neither platform throws, warns or logs.** And mixing the two is worse than either: a face embedded
by the plugin *and* loaded at runtime under a different key gives one font two resolvable names,
which is how the mismatch sneaks back in after someone "fixes" it.

**P24 records that an `expo install` silently added this plugin once already, at pass 0, and that the
revert is held.** The one-line check: `grep expo-font mobile/app.json` must return nothing.
`expo-font` stays a **package.json dependency only** (`~13.3.2`, already promoted).

---

## 🆕 P34 — 🔴 **THE CUT-2 BUILD AND ITS CAPTURE PASS. This is pass 5's real gate and nothing else can be.** (added 2026-07-31)

> ## 🟢 BUILT AND VERIFIED 2026-08-03. **`versionCode 35`, on Play Internal Testing.**
>
> **Owner's read: it boots, it renders, the theme and the letterforms landed, no crash, no collapsed
> layout.** 🔴 **Cut 2 is NOT promoted and must not be** — the primitives are still unextracted,
> `LockedSection` still exists, and it is an instrument rather than a product (§10.2).
>
> 🔴 **P34 ABSORBS P30 (cut 1 was never built — see the supersession banner above) AND DISCHARGES
> P32.** P32's four pass-4 device checks — **all five faces render distinctly · the splash releases
> even with a corrupt TTF · icons still render · a reading screen at the OS's largest font setting** —
> were folded into this visit rather than run against a build that never existed. The headline claim
> they existed to test (*"a silent fallback to Roboto/SF is this change's documented failure mode and
> nothing in the four-layer stack can see it"*) is answered by the owner's *"the letterforms landed"*.
>
> ⚠️ **What a "boots and renders" pass does NOT discharge, and these carry forward to CUT 3:**
> the **`O-26`** ruling on the 6 progress tracks (checklist rows H3, 5, 11), **`P27`**'s confirmation
> of O-24's five extensions (rows H4, 5, 9), **`P16`** (the comp-tier clobber), **`P15`** (RevenueCat
> prices) and **`P11`** (the D5 salt) — all of which need a *deliberate* pass against the checklist,
> not a smoke test. And **`O-4`/W1**, **`O-5`/W3** and **`O-9`** are now bundled as **P38**.
>
> **Original entry below, retained for the five things it told the owner to look at.**

> **Class:** GATING — before any further pass. **Owner runs it.**
> `cd mobile && eas build --platform android --profile production`

🔴 **CUT 2 IS THE FIRST BUILD THAT LOOKS LIKE VELLUM**, and pass 5 deliberately shipped without a
device read (see `codemod-plan.md` §3.7's split ruling: the magenta dry-run's static half ran here,
its visual half is *this*). Everything visual has now landed — colour, leading, letterforms, the
display face — so this is where `§4.4`'s screenshot pass is done properly, per
`cut1-capture-checklist.md`. 🔴 **Do NOT promote it** (§10.2: the primitives are still unextracted).

**The five things to look at that pass 5 could not check, in priority order:**

1. 🔴 **`on-accent` LEGIBILITY ON EVERY ACCENT FILL — the 16 ENTRY-6 gradients first.** And read the
   warning in the ledger's ENTRY 7: **`fg` on an accent fill was 2.15–3.76 while held and is 2.92–3.80
   at Vellum. It got slightly *better* and is still wrong everywhere** — so a missed A5 site is now
   *less* lurid and therefore *harder to spot by eye* than it would have been on the old palette.
   Look deliberately; do not wait to be offended by it.
2. 🔴 **EVERY `display-*` HEADING — and the question has CHANGED.** It is no longer *"does 34
   collide?"* (measured: yes, on accented capitals) but **"does 38 look right?"**. Start with the
   three that wrap at 360dp: `(paywall)` "Unlock Your Full Destiny", `compatibility/index`
   "Compatibility Reading", `SunSignReveal` "You're a {sign}!".
3. 🔴 **THE DISPLAY FACE ITSELF — this is NEW at pass 5 and it is 23 screens' worth.** Until commit A,
   `font-display` had **zero call sites** and every `display-lg` heading rendered in **Figtree**
   (`O-35`). Cut 2 is the first build where Home's greeting, every screen H1, the paywall hero and
   every archetype name are actually **Literata**. **If a heading still looks like body text, that is
   the finding.**
4. **`StreakBadge`** — ENTRY 6 row 13, the one gradient whose two ends differ materially
   (`on-accent` 6.86 clay → 5.60 rust). It is also **X11**: its explicit `height` per size and
   `borderRadius: cfg.height / 2` must survive the visit untouched.
5. **`name-destiny`'s rank pills** — a three-way fill ternary whose third branch is a 60% accent wash
   over a dark card with an `on-accent` label. The only `on-accent` branch in the app whose ground
   composites dark. Registered in ENTRY 7, not guessed at.

⚠️ **Also still open from pass 4 and now MORE urgent, because the letterforms and the colour changed
together:** `P32`'s device check (five faces render distinctly · corrupt a TTF and confirm the splash
still releases · icons still render · a reading screen at the OS's largest font setting).

---

## 🆕 P35 — ⬜ **CONVERT THE TWO PENDING GATE COUNTERS BACK TO BLOCKING WHEN 3a AND 3b LAND** (added 2026-07-31)

> **Class:** housekeeping, and it is the LAST STEP OF THE REVAMP's tooling. **Do not lose it.**

`GATE_STRICT` went **default-on at pass 5** (`O-36`), but pass 5 is no longer the last pass — the
reorder runs 2a → 2b → 4 → **5** → 3a → 3b. So two decreasing counters are still owed by passes that
have not run, and they are carried by a **`GP()` pending-pass counter** in `token-gate.sh`: printed on
every run, attributed to the owing pass, deliberately **not** blocking.

| counter | now | owed by |
|---|---|---|
| `no-legacy-radii dead-spellings` | 🟢 **0 — EXPIRED AND CONVERTED, pass 3b** | ~~pass 3b~~ done 2026-08-01 |
| `dead-classes space-[xy]-` | 🟢 **0 — EXPIRED AND CONVERTED, pass 3a** | ~~pass 3a~~ done 2026-08-01 |
| `dead-classes [wh]-30` | 🟢 **0 — EXPIRED AND CONVERTED, pass 3a** | ~~pass 3a~~ done 2026-08-01 |

**When 3a lands:** convert its two rules from `GP()` back to `G()`. 🟢 **DONE 2026-08-01** — both are
hard blocking rules at 0 again, and `GP()` is down to **exactly one caller**, which is now the visible
countdown to this item closing.
**When 3b lands:** convert `dead-spellings` back to `G()` **and delete `GP()` itself.** 🟢 **DONE 2026-08-01 — 177 → 0, the rule blocks again, and `GP()` IS DELETED with `pending` gone alongside it.**

🔴 **P35 IS CLOSED. The PENDING category is EMPTY**, and every residual the gate reports is now either 0, a named floor, or a printed scoped exception — the first time in the revamp that is true. Do NOT re-introduce a pending counter without an EXPIRY (R-3).

> ### 🔴 R-3 STRENGTHENS THIS ITEM: A PENDING ENTRY THAT SURVIVES ITS OWN PASS IS A **FINDING**, NOT A RESIDUE
>
> **Owner ruling R-3, 2026-08-01.** "Attributed, printed, non-blocking" was only half the contract.
> The other half is the **expiry**: each entry names the pass that clears it, and **when that pass
> lands the entry must VANISH — converted, not merely observed to read 0.** If it does not vanish,
> either the pass did not do what it claimed or a transient residue has quietly become permanent, and
> those are exactly the two failures this category was invented to keep apart. 🔴 **Without an expiry,
> non-blocking residue is where things go to be forgotten** — and it is *worse* than a floor, because
> it reads as temporary, so no reviewer ever asks it to justify itself. `O-36` is the proof one level
> up: a precondition phrased *"after pass N"* silently expired when N stopped being last, and nothing
> in the gate could say so, because nothing in the gate was dated.
> **The ruling is now written into `token-gate.sh` at the converted rules and into `§4.6`'s PENDING box.**
🟢 **A `GP()` with no callers is the signal that the revamp's counters are finally closed** — that is
why it is a named function rather than an inline exception.

🔴 **The reason this is an owner action and not a footnote:** a *transient* residue with no owner and
no removal condition becomes a *permanent* leak, which is `§4.6`'s own stated failure mode for floors
("none of them may be closed by widening an exception"). The two alternatives were both refused at
pass 5 — blocking on them locks out every push until 3b, and folding them into the named floors
launders the debt. **This item is what makes option (c) honest.**

⚠️ **Related and separate: `no-raw-hex`'s `BirthChartWheel` exception (11 hex + 1 rgba) comes out when
design `§11.4` ships.** It is a genuine *floor*, not a pending counter — scoped to one named file, with
its own printed sub-count — but it has the same "remove me" condition and the same way of being
forgotten. Both lines are commented in `token-gate.sh` with `REMOVE ... WHEN §11.4 SHIPS`.

---

## 🆕 P36 — 🔴 **DESIGN THE PRIMITIVES-PHASE ARRIVAL GATE *WITH* THE PRIMITIVES, NOT AFTER** (added 2026-07-31)

> **Class:** GATING — before `§9` item 1 is written. `O-38`.

**Every remaining phase must name its arrival gate (`codemod-plan.md` §3.0.2.0.1), and the primitives
phase has read "needs one and does not have one" since pass 4.** Pass 5 promoted it from a sentence in
a table to a tracked item because **it is the phase most exposed to this class of failure** and the
evidence is now three passes deep:

| pass | removal | arrival | how it was caught |
|---|---|---|---|
| 4 | `no-fontweight` **0** | 🔴 592 of 1,118 `<Text>` had no family; 9 sites got the wrong one | only by writing `family-arrival-check.js` |
| 5 | `no-raw-hex` at its floor | 🔴 `font-display` had **zero call sites**; 23 headings were Figtree | only by asserting *arrival* per token before the flip |

**Extracting `SectionCard` / `LockShell` / `Sheet` / `Button` moves sites ONTO components, and nothing
asserts that every site which SHOULD use the new primitive DOES.** The three specific absences that
will hide there, each already evidenced elsewhere:

- **a missing FAMILY** — `O-35`: a new `<Txt>` or `LockShell` label naming no face renders in the
  global body default, and no counter moves.
- **a missing PROP** — P23's className half: `allowFontScaling` cannot live in a style object, so any
  primitive wrapping reading copy must place it at the JSX boundary. `p23-optin-check.js` exists for
  exactly this and currently reads **MISSING 0** — keep it that way.
- **a missing TOKEN ASSIGNMENT** — C1: `LockShell`'s single grounding decision, `locked` vs
  `surface-raised`. 🟢 **Pass 5 made this answerable by LOOKING for the first time** (`#2A2521` vs
  `#1E1A17` are now visibly a step apart). Pick deliberately, then look at the screen.

⚠️ **An arrival gate is usually NOT a grep.** All three that exist are node scripts, which is why they
were the last three written: `p23-optin-check.js`, `family-arrival-check.js` (pairs by **brace
balance**, never a line window — a line window is precisely what could not see pass 4's defect), and
`alpha-callsite-check.js` (**invokes** the mechanism rather than searching for it). **Copy one of those
three shapes.**

> ## 🟢 SPECIFIED 2026-08-03 — **`primitives-plan.md` §1 IS P36's ANSWER, AND IT IS DELIVERABLE ZERO.**
>
> The gate is `primitive-adoption-check.js` (the 20th named rule), plus two extensions to gates that
> already exist. **It is item 0 of the phase — built BEFORE `ScreenContainer`**, honouring this
> item's own class (*"GATING — before §9 item 1 is written"*) literally.
>
> 🔴 **The argument for not compressing it, in one line: every arrival gate written in this project
> caught a live defect on its first run. The base rate is 100%** — `p23-optin-check` found 41 sites
> needing the prop at the JSX boundary, `family-arrival-check` found 9 wrong faces, its className half
> found that **`font-display` had zero call sites**, and `alpha-callsite-check` found a guard that
> would have silently *stopped* throwing. **Writing it after the components means writing it against
> code you have already convinced yourself is correct.**
>
> ⚠️ **One thing this item's own text does not say, and the spec adds: a PROP is not a class and not a
> style.** `<LockShell density={2}>` carries its whole visual contract in a JSX attribute value, which
> no rule anchored on `className` or on `style` can read. That is `O-29`/`O-32`'s blindness class in a
> new shape, and it is why the gate must parse **JSX element names and prop values**, brace-balanced.

---

## 🆕 P37 — 🔴 **CUT 4: THE RELEASE-CANDIDATE BUILD AND THE PROMOTE** (added 2026-08-03)

> **Class:** GATING — the ship. **Owner runs it.** `cd mobile && eas build --platform android --profile production`

🔴 **This is the AAB that gets promoted. Cuts 2 and 3 are instruments; this one is the product.**

**Built after:** the primitives phase (`primitives-plan.md` items 0–20) **+ screens + motion + a11y.**
Per the **no-release-split** decision, 2.1.0 is the complete redesign.

**The pre-build walk — every one of these, in order:**

1. 🔴 **Walk this whole file.** It is what CLAUDE.md says to do before every deploy / cut / ship /
   promote, and it is the only durable list.
2. 🔴 **P18a's binary assets are IN THE BUILD** — icon, adaptive icon, **splash**, favicon, **and
   `app.json`'s two colour literals at `:16` and `:39`.** Miss the two literals and 2.1.0 launches on
   the old purple and cross-fades into Vellum on first paint. **Verify by reading `app.json`, not by
   remembering.**
3. **C-2 and C-3 resolved, or the source strings shipped verbatim** (`primitives-plan.md` §7).
4. **`npx tsc --noEmit` clean ×2 · `npm run gate` exit 0 · `primitive-adoption-check` green.**
5. **The full §4.4 capture pass**, after-only against spec.
6. 🔴 **`O-26`, `P27`, `P16`, `P15` and `P11` closed** — all five were scoped to cut 1, which was never
   built, and all five have been sliding since.
7. **P14's date checked.** If the calendar has slipped past ~2026-08-24 and this build is not imminent,
   **take the `e588f87` cherry-pick fallback first** and ship 2.1.0 after.

**Then: promote the SAME AAB, never rebuild between tracks** → **staged rollout at 5–10%**, watching
crash-free rate, ANR rate, review sentiment, subscription starts/restores and the rating prompt.
🔴 **The rollout percentage is the ONLY rollback lever** — `expo-updates` is `ON_ERROR_RECOVERY` only
and 2.1.0 is a native build, so there is no OTA path. **Ramp only when all five signals are flat
against the 2.0.0 baseline**; 48h minimum per step. **Then merge to `main`.**

**P18b's listing assets** (feature graphic, screenshots) refresh during the 5–10% stage — they do
**not** gate the promote.

---

## 🆕 P38 — 🔴 **THE FOUR DEVICE UNKNOWNS THAT GATE SPECIFIC PRIMITIVES** (added 2026-08-03)

> **Class:** GATING — **before the item that depends on each one is built**, not after.
> All four are **Android** checks, all four are cheap, and all four ride cut 2's device (already in
> the owner's hands) or one scratch build. Full detail: `primitives-plan.md` §6.3.

| # | unknown | gates | if it fails |
|---|---|---|---|
| ~~**1**~~ | ✅ **RULED, NOT ANSWERED — OWNER DECISION 2026-08-03: TAKE THE FLAT FALLBACK NOW AND DO NOT WAIT FOR A DEVICE.** W1 / `O-4` asked whether `react-native-view-shot@4.0.0-alpha.2` captures `react-native-svg` on Android. It is no longer a gate: **the share surfaces render ZERO svg nodes — no tide plate, no aura-as-RadialGradient, no primitives — and that is the shipping design, not a fallback awaiting an upgrade.** 🔴 **The ruling REMOVES a device dependency from the critical path instead of adding a build**, because the fallback was pre-decided and pre-drawn: `expo-linear-gradient` washes (already proven inside view-shot in production), token fills and type. **These cards are the organic-growth surface and a broken export is worse than a plain one.** | 🟢 **NOTHING — items 9–10 are UNBLOCKED** | 🔴 **RE-REGISTERED AS A POST-RELEASE CHECK, see `P51`.** If it passes later the plate is **purely additive** and costs one prop |
| **2** | **Does `currentColor` render natively?** 🟢 **The JS layer is VERIFIED PRESENT in the installed `react-native-svg@15.11.2`** (`extractBrush.ts` returns a currentColor brush; `extractProps.ts` passes the `color` prop), so this is now a confirmation rather than an open API risk | the 5 plates · the 4 shape primitives | a **five-line** internal fallback: `Plate` resolves `theme.color[tint]` to a literal `stroke`/`fill` itself. **Same API, same call sites** |
| **3** | ⚠️ **RESHAPED 2026-08-03, NOT ANSWERED — and the new question is the one that matters.** *Does it tile* is settled at the source level: `ImageResizeMode.kt` maps `"repeat"` to `Shader.TileMode.REPEAT` and `ReactImageView.kt`'s `TilePostprocessor` builds a `BitmapShader`. 🔴 **What that reading FOUND is the real check: the postprocessor allocates a destination bitmap THE SIZE OF THE VIEW and `BasePostprocessor` gives no cache key, so a full-screen texture costs one UNCACHED full-screen bitmap PER MOUNTED SCREEN, re-made on re-measure** — ~10 MB on a 1080×2400 panel, and a router stack keeps more than one screen mounted | the texture, all three mount points | 🔴 **§4.6's stated fallback (a pre-scaled full-bleed asset) does NOT help — a full-screen raster decodes to the same bitmap either way.** The cheap fix is to **mount the layer ONCE, high in the tree**, instead of per screen. **Watch: memory and jank on a low-end device, not seams** |
| **4** | ⚠️ **RE-SCOPED 2026-08-03 AT ITEM 13, AND THE QUESTION AS WRITTEN HAS NO SUBJECT.** It asked whether SVG under `BlurView` composites acceptably on Android. 🔴 **MEASURED IN THE INSTALLED `expo-blur@14.1.5`: THERE IS NO BLUR ON ANDROID TO COMPOSITE UNDER.** `experimentalBlurMethod` defaults to `'none'` (`src/BlurView.tsx`), and on that path `ExpoBlurView` calls `setBlurEnabled(false)` and paints `tint.toBlurEffect()` as a flat background instead; with no `tint` prop the Android branch is `TintStyle.DEFAULT`, whose colour is white at `255 * (radius/100) * 0.44` — **alpha 22, i.e. 8.6%, at intensity 20.** So the check is really *"does SVG sit acceptably under a flat 8.6% white sheet"*, which is a much smaller question. **iOS renders the real material.** | 🔴 **LockShell density 1 — but only its PLATE, which is item 18's** | 🔴 **the `comet` plate is DROPPED from d1 entirely — NEVER moved above the veil.** The reason is a meaning argument: a crisp plate over withheld content reads as part of the unlock UI and dilutes the one meaning that layer has. ⚠️ **A SECOND, LARGER QUESTION FELL OUT OF THE MEASUREMENT — registered as `P52`:** should the real blur method be turned on at all? |

⚠️ **Two more Android checks are already open and belong on the same visit:** **`O-5` / W3** (the 7%
hairline — `borderWidth: 1` at 7% white is 3 physical px on a 3× panel, and at hairline width the
alpha may need to rise to ~10%) and **`O-9`** (the Explore icon squint test at 20dp: `planet-outline`,
`sparkles-outline` and `star-outline` are all radial-symmetric line glyphs).

🔴 **Sequencing mattered and it is the one ordering mistake that wastes a whole item:** building a
`tide` plate into `ShareCard` and *then* discovering SVG does not survive view-shot is a rewrite.
🟢 **BOTH GATING CHECKS ARE NOW DISCHARGED WITHOUT A DEVICE.** Check 1 was **RULED** (take the flat
fallback; **items 9–10 UNBLOCKED**, and `P51` carries the post-release upgrade) and check 4 was
**re-scoped by measurement at item 13** — item 13 **SHIPPED** without it, because the plate it gates
belongs to item 18, not to `LockShell`. **Answer 2 before items 18–19.** Only check 3 — a memory
question, not a rendering one — still needs a device, and it does not gate an item that is next.


---

## 🆕 P39–P41 — PRIMITIVES PHASE, ITEMS 0 AND 1 (added 2026-08-03, session `build27.1-primitives-01-screencontainer`)

### 🆕 P39 — 🔴 **DESIGNER CALL: the texture's AMPLITUDE.** Is it meant to be SEEN, or only to WORK?

> **Class:** REVIEW — **not gating.** The texture ships and looks correct; the question is whether
> it should be stronger. One line in `mobile/scripts/make-grain.js` plus a re-run.

**Design §4.6 fixes the LAYER opacity (0.05) and the tile size (120×120) and says nothing about how
strong the TILE itself is.** That parameter is not free, because compositing over a near-black
canvas is violently asymmetric — measured against the live tokens:

- the canvas is `16, 14, 13`, so at 0.05 a **black** pixel at full alpha darkens it by at most
  **0.8** of 256 levels, while a **white** pixel lifts it by **12.0**;
- 🔴 **so a symmetric tile is not neutral, it is ADDITIVE** — and **the page and a card face are
  only 7 levels apart** (16 vs 23), which is the separation the whole *"textured page, clean
  objects"* reading (§14.2.1) depends on.

**Shipped:** light peak 96 / dark peak 255, asymmetric on purpose, chosen against two stated floors
(mean lift **< 1 level**, deviation **≥ 1.5 levels**).

| tile | mean lift | deviation | page-to-card separation (of 7) |
|---|---|---|---|
| **96 / 255 — SHIPPED** | **+0.92** | **1.70** | **6.08** |
| 119 / 119 | +1.30 | 1.97 | 5.70 |
| 255 / 255 (naive "full-range noise") | +2.79 | 4.23 | 4.21 |

🔴 **THE HONEST REPORT: at the shipped amplitude the texture is a DITHER, not a visible texture.**
Composited against the real tokens and looked at, it is legible under 6× magnification and
essentially imperceptible at 1×. **If the intent is "texture in the negative space" you can see,
it needs raising — and the table is what that costs.** Provenance and the reasoning:
`mobile/assets/textures/README.md`.

#### 🔴 AMENDED 2026-08-03 (session `…-02-button-card`) — **THE QUESTION IS NOT THE ONE ABOVE, AND THE ANSWER IS NOT "RAISE IT"**

> 🔴 **OWNER DIRECTION, BINDING: DO NOT RAISE THE OPACITY.** The paragraph above frames the call as
> *"is it strong enough to see?"* — **that is the wrong test**, and answering it by raising the
> amplitude buys a barely-visible texture at the price below.

**The price, restated so it is not read as a footnote.** `TilePostprocessor` allocates a
**view-sized bitmap with NO CACHE KEY, per mounted screen** — ~10 MB on a 1080×2400 panel, across
**25 screens**, with **mid-range Android as the primary market**. That is an **OOM risk**, and the
same session that measured it also measured the effect as **invisible at 1×**. 🔴 **Paying an OOM
risk for an invisible effect is not a trade; it is the definition of one to refuse.** (`M-6`.)

**THE REAL TEST — and it is a FUNCTIONAL requirement, not a decorative one.** Design §1, §4.6 and
§10.2.4 all state the grain's *reason*: **it dithers the 8-bit banding a large radial wash shows on
cheap OLED panels.** §4.6 mount (iv) names `(paywall)/index.tsx` explicitly *"because it is the
revenue surface with the app's only large accent field, so it needs the banding dither most."*

> 🔴 **SO THE QUESTION ON THE CUT-2 DEVICE IS NOT *"can you see texture?"* IT IS
> *"DOES THE GRADIENT BANDING DISAPPEAR?"*** — asked on the paywall, on a real mid-range panel, at
> arm's length. Answered as **`P38` check 3**, which this supersedes in scope: check 3 was *"does
> `resizeMode="repeat"` tile?"*, and tiling is settled at the source level already.

**Both branches are pre-decided. Neither needs a further ruling; whichever the device says, execute it.**

| the device says | branch | what happens |
|---|---|---|
| **banding is UNCHANGED** | 🔴 **DROP GRAIN.** | The layer earns nothing and costs ~10 MB × 25. Delete `GrainLayer`'s three mounts, the component, `assets/textures/grain.png`, `scripts/make-grain.js` and the adoption contract; `P40` closes with it. 🟢 **The DIRECTION SURVIVES INTACT without it** — it is carried by the **plates** (§14), the **shape primitives** (§15), **type contrast** (Literata against Figtree, pass 4/5) and **asymmetry** (§17's hero rule). Grain was never load-bearing for the look; it was load-bearing for the *gradient*. |
| **banding is MASKED** | 🟢 **KEEP THE EFFECT — AND CHANGE THE MECHANISM.** | Do **not** keep 25 uncached view-sized allocations. Replace the tiled `resizeMode="repeat"` with a **PRE-TILED FULL-BLEED PNG at the largest common screen size**, loaded **by URI** so **RN's image cache serves ONE bitmap to all 25 screens**. Same pixels, same amplitude, same layer opacity, same z-order, same `pointerEvents="none"` sibling placement — **only the decode-and-allocate path changes**, from per-mount to once. The asset grows (one full-bleed PNG-8 vs a 120×120 tile) and the resident memory falls by ~25×. |

⚠️ **The amplitude question does NOT disappear in the second branch — it just stops being first.** If
banding is masked at 96/255, ship 96/255; the table above is only reached if it is *not* masked and
the owner still wants the dither. 🔴 **A raise is only ever justified by the banding test, never by
"you cannot see it"** — invisibility is the design's intent (§14.2.1: *"the PAGE is textured, the
objects on it are clean"*), not a defect.

### 🆕 P40 — ⚠️ **The texture asset is GENERATED, and no designer has seen it**

`assets/textures/grain.png` did not exist. §4.6 specified the texture completely **as a medium** —
120×120 tileable, ~6 KB, PNG-8, 0.05, inert — and the file was never delivered, so it is generated
deterministically by `node scripts/make-grain.js` (fixed seed; a re-run is byte-identical), on the
`assets/fonts/README.md` precedent. **7,476 bytes measured** against §4.6's "~6 KB", so the system's
added weight is **~427 KB**, not 426.

⚠️ **§4.6 asks for "WebP with a PNG-8 fallback". ONLY THE PNG-8 SHIPS** — the repo has no image
tooling and adding an encoder to save ~3 KB on a 7.5 KB asset is not a trade worth making. If a
WebP is ever wanted it is an asset swap behind one `require`, not a design change.
🔴 **This is NOT part of `P18a`** and does not gate the release. It is a *"replace it whenever you
like"* asset, not a *"nothing ships until it lands"* one.

### 🆕 P41 — ⚠️ **STANDING SWEEP: a source file outside the gate's reach**

**Found 2026-08-03 by `tsc` and by nothing else.** `mobile/SUBSCRIPTION_EXAMPLES.tsx` sat at the
mobile ROOT holding **39 retired token usages while `no-legacy-tokens` read 0** —
`token-gate.sh` could not see it (`$SRC` excludes the root), Tailwind's scanner could not
(the globs are `./app/**` and `./components/**`), and `--diff`/`--members` could not, for the same
reason. Deleted with the four dead components it was the last importer of.

🔴 **The standing action is one line, and it belongs on any pre-ship walk:**

```sh
cd mobile && git ls-files '*.ts' '*.tsx' | grep -Ev '^(app|components|lib|store|services|hooks|utils|types)/'
```

**Expected output: exactly `nativewind-env.d.ts` and `theme.d.ts`.** Anything else is a source file
that three of the four verification layers are structurally blind to.

#### 🆕 AMENDED 2026-08-03 — **THE SWEEP HAS A SECOND HALF, AND IT IS THE WIDER ONE**

🔴 **`$SRC` and Tailwind's `content` globs ARE NOT THE SAME SET, and the line above only checks the
narrower one.** `$SRC` is eight directories; the globs are **two** (`./app/**`, `./components/**`)
and were never extended alongside it. **So there is a middle band —
`lib/ store/ services/ hooks/ utils/ types/` — that the GATE can see and TAILWIND cannot.** A class
attribute written anywhere in that band **emits no rule and therefore never renders**, while all 20
named greps read clean. That is *the same blindness class* (`M-5`, now **class 8** in
`codemod-plan.md` §3.0.2), reached from the other direction.

**The second line, and it is the one that covers the band:**

```sh
cd mobile && grep -rn 'className' $(git ls-files '*.ts' '*.tsx' | grep -Ev '^(app|components)/')
```

🟢 **MEASURED 2026-08-03 (primitives item 2 pre-flight): the band is EMPTY.** 44 files outside the
globs, **all of them `.ts` — not one `.tsx`** — and the grep returns **10 lines, zero live usages**:
**7** are the prop type augmentations in `types/nativewind.d.ts` (the declarations that *give* RN's
components the prop; they author no value) and **3** are prose in comments (`lib/textDefaults.ts`,
`theme.d.ts` ×2). **Nothing in that band has ever failed to emit a rule, because nothing in it
writes one.**

⚠️ **One of the three comment lines is a live `A COMMENT IS SOURCE` hazard** — `theme.d.ts` spells a
real utility-with-modifier in a doc comment. Harmless **today** only because `theme.d.ts` is outside
the globs *and* `G()` excludes it by name; that is geography, not a control. **Recorded, not
tolerated.** 🔴 **The moment a `.tsx` is added outside `app/` or `components/`, both lines must be
re-run** — and the correct fix would be to extend the `content` globs, not to move the file.

---

## 🆕 P42 — PRIMITIVES PHASE, ITEM 4 (added 2026-08-03, session `build27.1-primitives-02-button-card`)

### 🆕 P42 — 🔴 **DESIGNER / OWNER CALL: the section-title step. A DESIGNED CHANGE CONFLICTS WITH A DESCOPE RULING, and it is the first time those two have collided.**

> **Class:** REVIEW — **not gating.** One sentence unblocks it. But it recurs at two more items, so
> the answer is worth more than the item that surfaced it.

**Design §9 row 4 specifies the small DISPLAY step for `SectionCard`'s title.** Taking it would put
**Literata on 38 section titles** and is the single most visible change available in item 4 — and
`O-35`'s whole lesson was that display steps had been rendering in Figtree and *"nobody had ever
seen Literata."*

🔴 **But every display step in this system is FROZEN by construction (§3.6), while the title it
replaces carries an EXPLICIT scaling opt-in in all five of the copies item 4 merged.** So adopting
it **SUBTRACTS from the partial dynamic-type coverage that `primitives-plan.md` §0.0 rule 5 names as
already shipped and explicitly KEEPS** while descoping the rest of the a11y work.

**Item 4 shipped the SOURCE step verbatim** (§0.0 rule 1) and registered this rather than making the
trade silently. Registered as **`O-50`**.

| option | what it costs |
|---|---|
| **(a) take the display step** | 38 section titles become Literata and **stop scaling.** The body copy inside each section is unaffected and still scales. Visible, on-brand, and a real subtraction from a shipped a11y property |
| **(b) keep the body step — SHIPPED** | the serif never reaches these 38 headings. Dynamic type is preserved exactly as today |
| **(c) a scaling display step** | 🔴 **NOT AVAILABLE and do not ask for it as a compromise** — `scales` is a property of the step in `theme.js`, and flipping it for one step changes it everywhere that step is used |

⚠️ **IT RECURS: `EmptyState` (item 8) and `Sheet` (item 15) have the same shape** — a designed
display title over a currently-opted-in body title. **Answer it once.**

---

## 🆕 PRIMITIVES ITEMS 5–12 + C-P4-3 — P43…P50 (added 2026-08-03, session `build27.1-primitives-03-small`)

> **All eight came out of items 5, 6, 7, 8, 11, 12 and C-P4-3.** Every one is registered in
> `codemod-plan.md` §12 as an `O-` finding with the measurement; the rows below are only the ACTION.
> 🔴 **None of them blocks the phase from continuing** — items 13–19 can proceed without any of these
> answers. Three of them (P45, P46, P47) are decisions nobody below the owner may take.

### P43 — RATIFY: a focus/selection border is an ACCENT role, not a structural one · OPEN · Amey
🔴 **This DIVERGES from a shipped design row and shipped anyway**, so it needs a sentence either way.
`Input` had no focus state at all (WCAG 2.4.7 unmet at 15 call sites). Design §2 row 12 assigns the
**strong neutral** edge to a focused field. Measured against the field's own fill: strong neutral
**1.61:1**, subtle neutral **1.20:1**, 🔴 **the CHANGE between the two states 1.33:1** against WCAG
1.4.11's 3:1 — i.e. as a state indicator the specified value is absent rather than weak. The accent
role is **6.04:1**. Shipped as accent, pinned from both sides in the gate.
🟢 **Two independent authors already agreed**: `verify-email`'s filled digit box and `qa.tsx`'s
non-empty composer both signal with accent, neither with the strong neutral.
**What is needed:** confirm the general rule (*an edge that SIGNALS is accent; an edge that SEPARATES
is neutral*) and whether design §2 row 12 should be amended. Full record: **`O-52`**.

### P44 — SCHEDULE: the 15 remaining sub-AA placeholder-role foregrounds · OPEN · Amey
Design §2 row 9 contracts `fg-placeholder` to the `Input` placeholder **and nothing else** — it is the
only sub-AA foreground in the palette. Measured: **21 sites used it as a live foreground; item 6 fixed
4** (all four disclaimer renderings). **15 of the remaining 17 are misuse**; 2 are legitimate.
🔴 **Every other gate passes on all of them** — the name is legal, it is not `white`, no hex, no
weight, no numeric size. There is now an **exact-count census** that fails in both directions.
**What is needed:** schedule the sweep (screens phase, or its own commit). **Not** done piecemeal —
fixing a few of a class is the antipattern item 4 exists to answer. Full record: **`O-53`**.

### P45 — DECIDE: `GeneratingReading`'s unreachable error branch, which X17 protects · OPEN · Amey
All five call sites pass `type` and **nothing else**, so `error` / `onRetry` / `onGoHome` / `title` are
unreachable — and the two capture screens render their **own byte-identical error overlay on top of the
component** instead. A zero-call-site option is a defect by the standing rule. 🔴 **But deleting it
deletes X17's lower width bound, and §0.0 rule 3 makes an invariant violation a HARD STOP.** So an iOS
layout guard is protecting a control nobody can reach, and **only the owner can retire an X number.**
**Two options:** (a) retire the three props and the branch, releasing X17's third literal; (b) wire the
two capture screens onto the branch and **delete two duplicate overlays** — more work, strictly better.
Full record: **`O-56`**.

### P46 — DECIDE: should `AffirmationCard` be lockable at all? · OPEN · **PM / PRODUCT, not design** · 🔴 MONETISATION
🔴 **RE-CLASSIFIED 2026-08-03 (owner direction, item 13): keeping the branch was correct, and the
question is a PRODUCT one — either DEAD CODE or a MISSING LOCK, and nobody in the design or primitives
work can tell which.** It belongs to the screens phase or to PM, not to a designer.
⚠️ **AND THE COUNTS IN THE ORIGINAL ENTRY WERE WRONG — re-measured at item 13, per call site rather
than per component:**

| card | element sites | pass a lock flag | reachable? |
|---|---|---|---|
| `AffirmationCard` | 5 | **0** | ⬜ unreachable |
| `GrowthCard` | 2 | 1 (the other passes literal `false`) | 🔴 **YES** — `readings/face` |
| `PalmLineCard` | 1 | 1 | 🔴 YES |
| `ScoreCard` | **7** | **1** | 🔴 YES |

The old figures (3 / 1 / 4) counted something else; the shape of the finding is unchanged and its
sharpness is not — **one of four is unreachable while three are live**, and `ScoreCard` renders six
unlockable instances beside one lockable one.
🟢 **ITEM 13 KEPT THE BRANCH AND MERGED IT ANYWAY**, which is the part worth noting: "unreachable" was
never a reason to leave it as a **fourth divergent copy**, and it was the only one of the four with a
scaling opt-in and a marked pictograph while its sibling carried a **1.25:1** label. So the branch now
renders the shared treatment and the tier literal is retired at all four sites. **Nothing about this
decision is urgent any more — it costs one line either way.** Full record: **`O-60`**.

### ~~P47~~ — ✅ **CLOSED 2026-08-03 BY THE `P42` RULING, AND IT NEEDED NO RAMP CHANGE AT ALL**
> 🔴 **THE OWNER RULED `P42` THE WAY THE FIRST OF THIS ENTRY'S THREE EXITS POINTED: LET THE DISPLAY
> STEPS SCALE, AT THE SAME 1.3 CAP AS BODY COPY.** Shipped in commit `3ce537f` (`theme.js`, the three
> `scales` flags, plus the two gate step-sets that hold the same contract).
>
> **Why it closes rather than trades.** The collapse existed *because* one side was frozen while the
> other scaled. With both scaling by the same multiplier **every ratio in the ramp is
> SCALE-INVARIANT**, so the hierarchy holds at every setting instead of at one — at the cap the
> pairing is **26/33.8 against 19.5/28.6**. **No value moved.** All four specified pairings are fixed
> at once, which is what made this a ramp finding rather than a component one.
>
> **The freeze was an inherited principle that does not apply to this app.** Display type is frozen
> elsewhere because it usually sits in a fixed-height container; pass 5 had already measured that
> **not one fixed-height container in this app holds a display step** — 0 OVERFLOW, 0 TIGHT.
>
> 🟢 **AND THE ONE CHECK IT NEEDED WAS ANSWERED IN THE RENDERER, NOT BY ENUMERATION.** The worry was
> `display-lg` 30 × 1.3 = 39 against a 38 line height. **`lineHeight` scales by the SAME multiplier as
> `fontSize` on both platforms** — Android `TextAttributes.java`'s `getEffectiveLineHeight()` uses the
> very call `getEffectiveFontSize()` uses; iOS `RCTTextAttributes.mm:139` multiplies by
> `effectiveFontSizeMultiplier`. So the pair is **39 / 49.4**, and the ramp's own accented-capital
> clearance formula is linear in the multiplier, giving **+2.60 / +2.86 / +2.60** at the cap against
> the +2.00 / +2.20 / +2.00 the raise was tuned for. **There is no scale at which ink meets ink.**
> Wrapping does increase and every display site scrolls or grows.
>
> ⚠️ **WHAT STAYS FROZEN, by ROLE not by step:** X3's fixed-height Button labels, the tab labels, the
> chat composer, `O-29`'s numeral tables — and 🔴 **the className half (`C-P4-5`) is UNCHANGED**: a
> size utility cannot carry a prop, so the 25 `text-display-*` classNames still do not scale. **Do not
> read this ruling as "display type scales app-wide".**
>
> 🟢 **A FREE CONSEQUENCE: `P42`'s original conflict is gone from `SectionCard` too.** The declined
> display-step title lost its a11y objection entirely; what remains is an ordinary visual decision
> about 29 shipped titles, with no invariant attached, and it is still undone on that much smaller
> ground.
>
> ⚠️ **AND WIDENING THE OPT-IN GATE FOUND FIVE LIVE SITES ON ITS FIRST RUN** — five StyleSheet rules
> hold a display step and their JSX consumers carried no scaling prop, so those titles would have
> stayed frozen with `theme.js` claiming otherwise. Fixed: face-capture, palm-capture,
> `CaptureInfoModal`, `BiometricConsent`, `TimezonePicker`.

**The original entry follows, superseded.**

🔴 **`P42` is answered and the cost is measured.** Small display step **20/26 FROZEN** against small
body step **15/22 → 19.5/28.6** at the cap: sizes **half a pixel apart**, and 🔴 **the body's LINE
HEIGHT OVERTAKES THE TITLE'S by 2.6px** — the description block becomes vertically LARGER than the
heading above it for any user who enlarges text.
**It is a RAMP property, not a component one**: only the SMALL display step qualifies (the medium one is
safe), and **the design specifies that pairing FOUR times** — `EmptyState`, `SectionCard`'s title, the
monthly hub's This Month card, the no-birth-date empty state. **All three exits move the ramp** (let the
step scale at the same cap · move the step · cap the body lower on those surfaces), which §0.0 rule 1
does not license. Shipped with the display step per the P42 ruling; this is the follow-on. **`O-58`**.

### P48 — REMOVE: the splash's second, zero-opacity loading indicator · OPEN · rides P18a
`app/index.tsx` mounts `LoadingSpinner` **and** a second indicator as its immediate sibling at
**opacity 0**. It renders nothing, animates anyway on the app's first paint, and reserves layout.
🔴 **Not removed in item 12 because that column is vertically centred**, so dropping ~30 points of
column height **MOVES THE WHOLE SPLASH** — and the splash is `P18a`, whose asset has not landed. **Do it
in the same visit as the splash asset**, where the shift is reviewable. Full record: **`O-62`**.

### P49 — DECIDE: Home and the Astrology hub render LLM output and carry NO disclaimer · OPEN · 🔴 COMPLIANCE
Design §9 row 6 and §10 add `EntertainmentDisclaimer` to **Home** and the **astrology hub**; §2.2 row 6
makes the addition *allowed*, not required, and the assertion is only that the file count must not FALL.
Item 6 therefore did **not** add them: both are specified inside screen comps that need a two-slot
layout which does not exist, and §0.0 rule 1 puts preserving behaviour above improving it.
🔴 **But the underlying fact is a compliance gap, not a styling preference: Home renders LLM output (the
daily insight) and carries no disclaimer at all today.** Design §10.1's own note says so.
**What is needed:** confirm whether the two mounts ship in the screens phase, or sooner as a one-line
addition. ⚠️ Design also reserves an empty second slot for an **AI-disclosure string that does not exist
anywhere in the repo** — supplying one is a separate compliance decision.

### ~~P50~~ — ✅ **ANSWERED 2026-08-03 BY ITEM 13, WHICH IS WHAT THE CENSUS ALWAYS SAID**
> 🟢 **`LockShell`'s 28dp lock plate is the token's first — and, by the census, ONLY — call site in the
> history of the codebase.** Commit `275147f`. The competing claimant (`EmptyState`'s designed plate)
> did not land and should not: that plate and its top padding are ONE decision belonging to **item
> 18**, where the plates are authored.
>
> **The grounding decision was made by ROLE, with a measurement behind it** (§4.5's requirement, and
> `theme.js`'s standing rule that a token is branched on by role and never by value):
> design §2 row 5 names this token the lock-plate fill; the plate must read as a **step above its own
> ground**, and against the raised step it grounds on it measures **1.15:1** — **the largest step in
> the entire surface ladder**, whose other steps are 1.05 and 1.06. Grounding the plate in the raised
> step instead would have made it **1.00:1**: invisible, permanently, and invisible to every gate too.
>
> 🟢 **AND THE SAME MEASUREMENT DECIDED WHERE THE PLATE DOES NOT GO.** On density 1's panel the ground
> is the overlay step, where the plate is **1.05:1** and does not read as an object at all. §4.2
> independently rules that d1's panel carries no plate because *"the panel is an action surface"* —
> two arguments, one answer, so d1 shows the padlock alone.
>
> 🔴 **THE CENSUS IS NOW `exact: 1`, NOT `nonzero`, AND THAT CHANGE IS THE DURABLE PART.** This token
> has exactly one legal home, so a **second** site is the role-vs-role class arriving (`O-53`'s shape)
> and a `nonzero` assertion could never see it; a fall to 0 fails too. ⚠️ **It also caught a live
> defect immediately: naming the token in the new module's own header comment INFLATED THE CENSUS BY
> ONE** — the third direction of "a comment is source", and under `nonzero` the comment alone would
> have satisfied the assertion with the plate grounded on the wrong token. Full record: **`O-59`**.

---

## 🆕 PRIMITIVES ITEMS 13 + 17 + THE P42 RULING — P51…P53 (added 2026-08-03, session `build27.1-primitives-04-lockshell-paywall`)

> **Three new entries and five closures.** Closed in this session: **`P42`** (ruled — the display
> steps scale), **`P47`** (closed *by* that ruling, with no ramp change), **`P50`** (answered — the
> lock plate owns the token), **`P38` check 1** (ruled — take the flat fallback) and **`P38` check 4**
> (re-scoped by measurement; it no longer gates an item that is next).
> 🔴 **Only `P53` is a decision nobody below the owner may take.**

### P51 — POST-RELEASE CHECK: does view-shot capture SVG on Android? · ⬜ open · **NOT gating anything**
> **Class:** POST-RELEASE. 🔴 **This is `P38` check 1 / `O-4` / W1 DEMOTED FROM A GATE TO AN UPGRADE
> CHECK by owner ruling, 2026-08-03**, and the demotion is the point: taking the flat fallback now
> **removes a device dependency from the critical path instead of adding a build.**

**The ruling.** The share surfaces — `ShareCard`, `ShareableQuote`, `CompatibilityShareCard` — render
**zero `react-native-svg` nodes**: no `tide` plate, no aura-as-`RadialGradient`, no §15 primitives.
That is **the shipping design**, not a fallback awaiting rescue. What ships is `expo-linear-gradient`
washes (already proven inside view-shot in production), token fills and type.

**Why it was ruled rather than tested.** The fallback was pre-decided and pre-drawn, so the test could
only ever have *added* work. And the asymmetry is severe: **these cards are the organic-growth surface
and a broken export is worse than a plain one** — a card that fails to capture is a share that does not
happen, on the one surface whose whole purpose is acquisition.

**What to check later, when it is free:** capture one card on an Android device with a single `<Svg>`
node mounted. If it captures, the `tide` plate is **purely additive** — one prop, no restructuring,
no copy change, and §14.5's may-list already names both share cards as legal plate surfaces
*"POST-W1 ONLY"*. ⚠️ **Do NOT re-open it as a blocker.** 🟢 **Items 9–10 are UNBLOCKED by this.**

### P52 — DECIDE: should the real Android blur method be turned on? · ⬜ open · low priority
> **Class:** REVIEW. Fell out of item 13's measurement rather than being looked for.

🔴 **MEASURED IN THE INSTALLED `expo-blur@14.1.5`: `BlurView` HAS NEVER BLURRED ANYTHING ON ANDROID IN
THIS APP.** `experimentalBlurMethod` defaults to `'none'` (`src/BlurView.tsx`); on that path
`ExpoBlurView.setBlurMethod` calls `setBlurEnabled(false)` and paints `tint.toBlurEffect()` as a flat
background instead. With no `tint` prop the Android branch is `TintStyle.DEFAULT`, whose colour is
white at `255 * (radius/100) * 0.44` — **alpha 22, i.e. 8.6%, at intensity 20.** iOS renders the real
material.

**Three consequences, all already acted on or registered:**
1. 🔴 **A white 8.6% sheet leaves the withheld text legible**, so the four card lock overlays were not
   locking anything on the only platform this app ships to. **Item 13 closed that leak** by grounding
   the merged overlay opaquely.
2. 🔴 **`primitives-plan.md` §4.2's preservation argument has a FALSE PREMISE on Android** — *"the
   meaning users already learned, veiled = paywalled"* was never rendered there. The element stays at
   density 1 because iOS is correct and because the design specifies it.
3. **`P38` check 4 has no subject as written** — there is no blur to composite SVG under.

**The decision.** Turning it on is a **new native rendering path** (`dimezisBlurView`: a per-frame
capture of the root view via `RenderEffect` or `RenderScript`). 🔴 **`O-46` / `P38` check 3 already has
a per-frame Android cost open as a MEMORY question for the texture layer**, and this would add a second
one on a screen a user reaches while deciding whether to pay. **It is a device check with a real
downside, not a free switch.** Default answer: leave it off, and let density 1 read as a wash on
Android.

### P53 — RATIFY: five new lock-copy strings, and two shipped tier names left verbatim · ⬜ open · **PM**
> **Class:** REVIEW — **not gating.** `C-5` is ruled (R-B) and item 13 shipped inside it. This is the
> residue the ruling did not enumerate.

**What item 13 RETIRED, all inside `C-5`'s remit** — a client-selected tier name in user-facing copy is
an R1 violation: the tier badge (`Premium` / `Premium Plus`), `"Upgrade Now"`, and
`"See all {n} sections with Premium"` → **`"See all {n} sections"`** (the count and sentence are
otherwise verbatim; this is `C-5`'s fourth literal). Plus the four card overlays'
`"Unlock with Premium"` → the shipped, PM-ruled, tier-neutral **`"Upgrade to Unlock"`** (a fifth).

**What item 13 AUTHORED, because the two destiny screens had NO shipped lock copy at all** — they
rendered the server's raw `"requires <tier> subscription"` in the danger role. Composed from shipped
strings rather than invented (§0.0 rule 2): titles **`"Unlock Your Name Destiny"`** and **`"Unlock Your
Career Destiny"`** (the retired banner's own `"Unlock Your Complete {X}"` pattern with each screen's
own noun) and bodies **`"Your name's cosmic blueprint"`** / **`"Your cosmic career path"`** (each
screen's own header subtitle, moved). **Both banners' titles likewise:** `"Unlock Your Complete Face
Reading"` / `"…Palm Reading"` / `"…Monthly Reading"`.

🔴 **AND TWO SHIPPED STRINGS WERE LEFT VERBATIM *WITH THEIR TIER NAMES IN THEM*, deliberately:**
`astrology/weekly.tsx`'s `"Premium Feature"` and `"Upgrade to Premium Plus to unlock Weekly Forecasts
and detailed 7-day guidance."` §7's standing default is binding — where a copy call has not landed,
ship the source string — and **`C-5` did not enumerate these two.** §4.4's ban on copy-pasting that
screen's tier-named body applies to the destiny screens, which had nothing of their own; it is not
licence to edit this screen's. **They are R1 violations that survived on a procedural rule, which is
exactly the kind of thing a register exists to stop losing.** One PM sentence retires both.

---

> ## ⚠️ ~~NEXT FREE P-NUMBER: P54~~ — superseded; the live line is at the END of this file.

---

## 🆕 REGISTERED BY THE PRIMITIVES BATCH-5 SESSION, 2026-08-04 (items 9–10 · 14 · 15 · 18–19)

### 🔴 `P54` — **WIDEN THE PLATE MOUNT MAP, OR ACCEPT THAT §14 SHIPS AS ONE MOUNT** · OWNER DECISION

**CLASS: product / scope. Not a blocker. This is the biggest visual lever left in the release.**

Descope 3 (§0.0 rule 5) mounts plates on the funnel screens and Home only. Intersecting that with
§14.5's may-list, surface by surface, leaves **exactly ONE new mount**: `orbits` on
`GeneratingReading`. `lunar`, `constellation` and `tide` are **built and not mounted**;
`TickRule` likewise. **All five plates and all four shape primitives exist and are gated** — the
components are done, only the mounting is narrow.

**Three options, in ascending cost:**

1. **Ship as is.** One plate mount, plus Home's ridge / arc / blob. Cheapest, and the funnel does get
   the three §15 primitives on Home.
2. **Widen to the surfaces §14.3 already names** — the daily astrology header (`lunar`), the
   readings hub's Ask-the-stars card and `EmptyState` (`constellation`), the monthly reading (`tide`).
   Each is a one-line mount into a component that already exists. **~1 session for all of them.**
3. **Also assign a plate to the paywall header** — but that is `P55`, because it is a *designer*
   decision rather than a mounting one.

⚠️ **`comet` is unmounted for a different reason and is NOT part of this decision** — see `P56`.

### 🔴 `P55` — **WHICH PLATE GOES ON THE PAYWALL HEADER?** · DESIGNER CALL

§14.5 says the paywall header **MAY** carry a plate, and the paywall **is** the funnel's last screen
and the highest-revenue surface in the app. But §14.3 assigns each of the five plates to *named*
surfaces and the paywall header is **not among them**. Choosing one is inventing a design assignment,
which §0.0 rule 2 forbids a session from doing.

**It is registered in the adoption gate's FORBIDDEN list with that exact reason**, so it cannot be
closed by accident in either direction. One sentence from the designer opens it.

### ⚠️ `P56` — **RE-SCOPED: `comet` ON LOCKSHELL DENSITY 1 IS BLOCKED ON A CHECK THAT NO LONGER MEANS WHAT IT ASKED**

**Correcting a premise that was carried into this session as settled:** the `comet` plate **did NOT
land with LockShell d1 at item 13.** That module's own header still records it as *"item 18, and it
rides `P38` check 4"*, and item 13 shipped without it deliberately.

**Why it is still unmounted, and it is a ruling rather than a descope:** §4.2 pre-specifies that if the
plate does not composite acceptably under d1's veil it is **DROPPED from that density entirely and
never moved above the veil**. Check 4 has not run — and `O-65` then **removed the question's subject on
Android**, where there is no real blur to composite under at all. So mounting it would take the risk in
the one direction the design already declined.

**What would unblock it:** either (a) an iOS look, which §5.4 closed permanently, or (b) an owner
ruling that a plate under a flat 8.6% Android tint is acceptable — which is really a question about
whether d1's veil should exist on Android at all, i.e. `P52`. **Recommend leaving it dropped.**

### ⚠️ `P57` — **CORRECT DESIGN §2.2's DESTRUCTIVE RATIO, AND DELETE THE SENTENCE THAT DISCOURAGED CHECKING IT** · PM / DESIGNER

**`on-accent` on `danger` is 4.86:1, not the published 5.60:1** — measured with a calculator calibrated
against eleven other published figures, all reproduced exactly. **The conclusion holds (4.86 clears
AA), so §2.1's resolution is correct and nothing needs re-deciding.** What is wrong is the **margin:
0.36, not 1.10** — the tightest of the five A5 pairings while the table makes it read as the most
comfortable, on a control that has been a contrast defect three times.

🔴 **The design doc is already amended** (the row is corrected and the discouraging sentence deleted),
and the pairing is now pinned **mechanically** rather than by prose. **This item is only the designer's
acknowledgement**, so no downstream work waits on it. `C-P5-4`.

### ⚠️ `P58` — **DECIDE ON THE BOTTOM-SHEET LIBRARY AFTER CUT 3** · OWNER

`Sheet` ships as its `degraded` state on the platform `Modal`: the approved library is **not
installed**, and gesture-handler has one reference and **zero gestures** in the whole tree. §3.1's gate
pre-authorises this. **Four of seven designed states are unbuilt with named debtors** (`dragging`,
`loading`, `error`, and 🔴 `destructive` — which has no adopter and whose colour pairing therefore
stays pinned where it renders).

**The upgrade is cheap and additive** (JS-only over reanimated + gesture-handler, both already
native-linked) and the handle is already drawn so it is not a visual change. **Look at the degraded
sheet at cut 3 first** — if it feels right, the library may never be needed. `C-P5-7`.

### ⚠️ `P59` — **THE SHARE EXPORT HAS NO RENDER TARGET: THE PNG IS ~1/3 OF THE SPECIFIED RESOLUTION**

§9 rows 9/10 specify 1080×1080 and 1080×1920 exports with the quote step *"scaled to 44/60 at export"*.
**No render target exists and never has** — `captureRef` snapshots the visible card at its on-screen
width, so none of the export-scale type sizes apply. **This is the organic-growth artefact**, so it
matters more than its screen share suggests.

**Rides `P51`'s visit** (the post-release W1 check) and pairs with `C-P3b-2` — same path, one build
answers all three. Building the target is a session of its own and is **not** a 2.1.0 item.

---

## 🆕 P60–P69 — THE FUNNEL-SCREENS PHASE'S OWNER ACTIONS (2026-08-04)

**Raised by**: `build27.1-screens-funnel`. Nine commits — seven screens in §3.4's funnel order plus
R-1's plate mount map and R-4's placeholder sweep. **None of these blocks the build.** Each is a
person's decision, and every one has a shipped default that is honest today.

| # | class | action |
|---|---|---|
| **P60** | ⬜ **REVIEW — visible, one line to revert** | 🔴 **THE BRAND WORDMARK'S TYPEFACE CHANGED ON THE SPLASH.** It was a raw size two points over the ramp's ceiling carried by an explicit BODY family; it now takes the ramp's top display step, and on a display step the `txt()` spread brings the SERIF with it. **So the wordmark has never rendered in the display face before and now does.** That is the direction "1a Vellum" points, and it retires an above-ceiling literal — but it is the brand mark on the first screen every user sees, so it is the owner's to confirm. One line reverts it. ⚠️ Pairs with `P18a`, which replaces the splash asset behind it anyway. |
| **P61** | ⬜ **DESIGN — a gap in §2** | 🔴 **§2 NAMES NO CONTROL-BOUNDARY ROLE, AND NEITHER BORDER TOKEN CAN BE ONE** (`O-83`): 1.16:1 and 1.51:1 against WCAG 1.4.11's 3:1. Four controls took the meta role (5.36:1) as the nearest specified value — signup's consent checkbox, birth-data's handedness pair, the shutter's ring, both paywall plan cards. **Either §2 gains a control-boundary role or it ratifies the meta role for that use.** ⚠️ And §10.2.3's own cell pairs the paywall's selected card with the STRONG border role, which cannot signal selection at 1.55:1 — that cell needs correcting either way. |
| **P62** | ⬜ **DESIGN — one ruling, at the primitive** | 🔴 **NO AVAILABLE MEANS IDENTIFIES A TEXT FIELD'S BOUNDARY AT 3:1** (`O-87`): the fill step is 1.08:1 and the hairline 1.20:1, so `Input`'s 15 sites, birth-data's two pseudo-fields and both capture screens' uncertain-modal control are all below 1.4.11. **Deliberately NOT patched site by site** — fixing two of seventeen leaves the forms more inconsistent than they are now. One ruling at `Input` fixes all of them. |
| **P63** | ⬜ **COPY — PM, and it is the ONE part of Home's treatment not delivered** | 🔴 **X13's EMPTY-CASE LINE NEEDS A STRING NOBODY HAS WRITTEN.** The owner ruling keeps the 200 floor "with the empty case as a short centred line of muted copy" and names no string; none exists in the app to move there. Authoring it is what §0.0 rule 2 and §8's verbatim default both forbid, so the branch still renders nothing and the card still holds its floor — the shipped behaviour, unchanged. **Rule 2 beat rule 1 on a direct conflict.** 🔴 Do not "finish" this by writing a sentence. |
| **P64** | ⬜ **BLOCKED ON TWO GATES — S-P1 *and* PM** | 🔴 **THE PAYWALL ASSERTS A FREE TRIAL UNCONDITIONALLY AND ANDROID EXPOSES NO PER-USER ELIGIBILITY**, so a returning subscriber is promised something the store will refuse. §10.2.2's fix needs the package's intro-offer field — S-P1's exact subject, still open — **and** a PM decision §10.2.2 itself records as a conversion cost ("the word *free* leaves the primary button"). 🔴 **AND IT BLOCKS AN X3 ADOPTION:** the primitive takes one `title` and this control renders two lines, so it cannot adopt `Button` until the sub-line goes. The screen borrowed X3's `lg` height as a literal in the meantime, so the guard is in place and adoption is a one-line change once the copy call clears. |
| **P65** | ✅ **CLOSED 2026-08-04 — NO DESIGNER NEEDED. The mount is DROPPED.** | 🔴 **§14.3.2's NAMED SURFACE CANNOT TAKE ITS ASSIGNED PLATE** (`O-86`). All three legal tints measure 1.42 / 1.36 / 1.15 on the readings hub's accent-filled hero, and the component's internal accent node is 1.00:1 there. **DO NOT WIDEN THE ALLOW-LIST** — that would make a plate mountable on every accent fill in the app. ~~Either the surface loses its accent ground or the plate system gains an on-fill tint.~~ 🟢 **NEITHER — both of those are design CHANGES, and neither answers the only question that mattered.** WCAG exempts purely decorative graphics from contrast outright and a plate carries no information (§14.5) and is hidden from the accessibility tree (§14.1.1), so §14.2's floor here is a **VISIBILITY** standard, not a compliance one — the same reclassification owner ruling R4 gave `tide` at ~2.0:1 (`O-20`). That inverts the question to *"can anyone SEE it"*, and at 1.15–1.42 nobody can. **A plate nobody can see still costs binary weight and a render on every visit to the readings hub, so the mount is dropped and the surface is REGISTERED as no-plate** in the `Plate` contract's `forbidden` list — because §14.3.2's heading still names it, and an unmounted named surface reads as an oversight. `constellation` keeps its `EmptyState` mount, so this is one assignment dropped, not a plate retired. |
| **P66** | ⬜ **MECHANICAL + one ruling · descope rung 4** | **THE OFF-RAMP SIZE RESIDUE — 15 sites, enumerated at the new rule** (`O-82`). Four identical `(auth)` screen titles are purely mechanical. Nine are pictographs or decorative marks, two of which are deliberately left UNMARKED because `no-numeric-fontsize`'s own ABOVE-CEILING block rules on the identical pair in `combined.tsx` and says they stay visible until someone rules. 🔴 **The two that need a DECISION are coupled:** the compatibility percentage on the score ring and the same value on the share card — §17.3 assigns that screen's one display hero to exactly that numeral, and the ramp's ceiling is eighteen points below what it renders at. Move them together or the app shows one number at two sizes. Plus profile's monogram in a fixed disc, which is arguably the DIMENSION class. |
| **P67** | ⬜ **DESIGNER — uniform, so it is all five or none** | **ALL FIVE DISCLOSURE TOGGLES USE A FILLED CARET WHERE §9.2 NAMES A CHEVRON.** C-P4-3 converted the six characters absent from the body face and chose the caret, which was the CONSERVATIVE call (it preserves the triangle those characters drew) while §9.2's named element is the chevron. Uniform at five sites, so changing one of five is strictly worse than changing none. |
| **P68** | ⬜ **DESIGNER + PM — confirm, do not assume specified** | **THREE OF EXPLORE'S SEVEN GLYPH NAMES ARE NOT IN §9.2's ENUMERATION.** The tab bar fixes this app's glyph for astrology, numerology and compatibility and §9.2 fixes the readings one; the report, the name reading and the career reading have no named glyph, so those three are the DIRECT TRANSLATION of the pictograph they replace — the same method §10.1 uses when it maps the two capture pictographs by name. **Also PM:** the five relationship-type LABELS that replaced Recent Readings' pictograph discs are new user-facing strings, in the sense that they now say in words what a pictograph said in a glyph. |
| **P69** | ⬜ **DESIGNER — the two asymmetry breaks not taken** | **§10.1.0's MECHANISM 4, TWO OF FOUR.** (a) The streak pill **abandons the right margin but is not CROPPED**: a true crop needs one corner squared, and that corner is `cfg.height / 2` INSIDE `StreakBadge` — X11's coupled pair, whose padding-plus-pill restyle is banned on that component by name. The margin half costs no invariant; the crop needs a designer. (d) 🔴 **This Month stays a CARD, and this is a DOCUMENT CONFLICT rather than an omission:** mechanism 4(d) hangs it off a left rule "instead of sitting in a card", §10.1's element inventory keeps it a card, and X13's `minHeight: 200` — which the OWNER ruled STAYS — is ON that card. Removing the card orphans a protected invariant, so §0.0 rule 3 settled it. Both documents are normative and they disagree. |

---

## 🆕 P70 — THE BRAND-ASSET RECOLOUR IS A RULING, NOT A MECHANICAL JOB (2026-08-03)

**Raised by**: `build27.1-p18a-brand-assets`, which closed `P18a`'s colour half and then measured the
artwork. **This does not add work to `P18a`; it corrects `P18a`'s premise.**

### ✅ `P70` — **CLOSED 2026-08-04. IT RESOLVES TO NOTHING: THE TABLE HAS TWO ROWS AND BOTH WERE ALREADY DECIDED.**

> **`P70` existed to hold one missing artefact — the role→token table for the brand rasters. Written
> out, it is two rows, and neither needs anybody:**
>
> | role | how much of the artwork | resolution | where it was decided |
> |---|---|---|---|
> | **INK** — the zodiac ring, open palm, filigree, `R` monogram | 15.4% of `logo.png`'s saturated px, 31.7% of `splash.png`'s | 🟢 **STAYS. It is already amber line art** (hue 21–24, sat 0.78–0.93 measured on the opaque population), i.e. already the accent family. Nothing to remap. | owner ruling, this session: *"the mark is amber line art, not retired purple"* |
> | **GROUND** | 77.2% / 53.5% of saturated px | 🟢 **`bg` `#100E0D`, and it is already set** — `splash.backgroundColor` and `android.adaptiveIcon.backgroundColor` both carry it | **`7787636`**, the colour half of `C-P5-4` |
>
> 🔴 **SO THERE IS NO THIRD ROLE AND NO OPEN CHOICE.** The premise that made `P70` a *ruling* was that
> "where the purple ground goes" was an unmade decision. It was made in `7787636` and nobody noticed
> that it closed this too: the ground is not a colour inside the artwork, it is a **key in
> `app.json`** — which is exactly why the splash needs no recolour at all (measured: **0 fully-opaque
> ground-hue pixels**; its purple is a translucent corner glow at peak alpha 175/255, so
> `backgroundColor` already **is** the ground).
>
> ⚠️ **THE ONE PLACE THE GROUND IS STILL BAKED, RECORDED SO THE CLOSURE IS NOT MISREAD:** `icon.png`
> (809,145 opaque ground-hue px) and `adaptive-icon.png` (347,553, inside the mark's cropped bbox).
> **That is by owner ruling, not by omission** — `icon` *must* be opaque and full-bleed, so its ground
> is baked by necessity; and *"an icon is seen on a launcher wallpaper beside a dozen other icons
> rather than in the app's palette context … remapping across the 235° hue valley risks the
> filigree's legibility for no user-visible gain."* `check-brand-assets.js` asserts `no-baked-ground`
> on the **splash only**, and its comment says why asserting it on the two icons would encode the
> opposite of that ruling.
>
> 🔴 **DO NOT RE-OPEN THIS.** The measurement is re-derivable — `node scripts/check-brand-assets.js`
> prints the ink/ground split and the opaque-vs-translucent breakdown on every run — and the ruling
> is above. A future session finding 77% purple in the app icon is finding a **recorded decision**.

<details>
<summary>The original entry, retained because its MEASUREMENTS are still the evidence.</summary>

> ⚠️ **NARROWED 2026-08-04 — `P70` IS NOW THE COLOUR RULING AND NOTHING ELSE.** The three FORMAT
> defects this entry surfaced alongside the recolour question (`foregroundImage` opaque · content at
> 100% instead of the centre 66% · `icon` at 1600 instead of 1024) are **CLOSED by geometry alone**:
> `node scripts/check-brand-assets.js --emit` generates `assets/icon.png` and
> `assets/adaptive-icon.png`, `app.json` points at them, all nine format assertions pass and the
> checker is wired into `npm run gate`. 🔴 **That they were fixable with NO colour decision is the
> point — a colour-only fix would have left all three shipping.** `O-92`, `C-P5-4`.
> ⚠️ **Two rows in the table below are now STALE and are left for the record:** `icon` and
> `adaptiveIcon.foregroundImage` no longer point at `logo.png`, and `assets/icon.png` /
> `assets/adaptive-icon.png` are no longer byte-identical placeholders carrying a bare "R" — they are
> the live, generated icons. `logo.png` is kept as the emitter's SOURCE and is now the unreferenced
> file. **What is still open is only the role→token table.**

`P18a` was scoped as *"recolour the existing mark"* on the reasonable premise that the brand files
carry the retired palette as **flat literals** — the two purples and the gold. 🔴 **Measured against
the actual files, that premise is inverted.**

| `app.json` key | file | what is in it |
|---|---|---|
| `icon` **and** `adaptiveIcon.foregroundImage` | **`assets/logo.png`** — **one file serves both keys** | 1600×1600 · **85,802 distinct RGBA** · an amber line-art medallion on a **purple GRADIENT** · **zero** retired literals |
| `splash.image` | `assets/splash.png` | 2732×2732 · **271,806 distinct RGBA** · same medallion + a partial-alpha purple diagonal glow · **zero** retired literals |
| `web.favicon` | `assets/favicon.png` | 48×48 · flat, **retired literals present** — but web-only; it reaches no shipped app |
| *(referenced by nothing)* | `assets/icon.png` **≡** `assets/adaptive-icon.png` | byte-identical placeholders, flat retired literals, and a **bare "R" — a DIFFERENT mark from the live medallion** |

**So the specified instrument matches the web favicon and two orphans, and nothing that ships.** The
live mark is continuous-tone artwork; there is no literal to substitute.

🟢 **THE MARK IS NOT INSEPARABLE FROM PURPLE — that is the finding that keeps this a re-skin rather
than a rebrand.** The two colour populations separate cleanly by hue: ink at 0–34 (15.4% of saturated
pixels), purple ground at 270–315 (77.2%), a 7.3% antialias band between them, and an empty valley of
**235° in `logo.png` / 230° in `splash.png`** (⚠️ **corrected — first published as a flat "240°", read
off 15° buckets by eye; stated per-file because the two files genuinely differ**). The drawing —
zodiac ring, open palm, filigree, `R` monogram — survives the separation intact, and the ink's mean
hue is already within a few degrees of `accent`'s.

🟢 **ALL OF THIS IS NOW RE-DERIVABLE RATHER THAN QUOTED: `mobile/scripts/check-brand-assets.js`**
prints every figure in this entry, asserts the three format defects below, and re-derives both the
no-op and the role collapse from `app.json` itself. **Run it before commissioning artwork and again
when the artwork lands.** It is deliberately NOT wired into `npm run gate` — it exits non-zero today
because the defects are real, and reddening the gate baseline is what `O-67` records as teaching
everyone to read past it. Wiring it in is one line in `token-gate.sh` and belongs in the same commit
as the replacement artwork, so the assertions go green by being satisfied rather than weakened.

🔴 **WHAT IS ACTUALLY OPEN IS A ROLE→TOKEN TABLE, AND IT CONTAINS CHOICES NOBODY HAS MADE:**

1. **Where the purple ground goes.** Mapping it to `bg` is the coherent Vellum answer and it **flattens
   the gradient to near-nothing**, because `bg` is a near-black. That is a visible change in the icon's
   character — defensible, and not the agent's call.
2. **What becomes of the splash's glow.** It is a partial-alpha purple wash on transparency. Mapping it
   to `bg` makes it invisible against the new `splash.backgroundColor`; mapping it to `accent-muted`
   turns it into the warm aura §2 names as *"the only gradient idiom left"*. Both are principled.
3. **Whether a hue-population remap is authorised at all.** It preserves the drawing exactly and needs
   no new dependency, but it is a **different algorithm** from the one `P18a` specified.

⚠️ **Do not read "the literal map is a no-op" as "the assets cannot be recoloured."** They can be,
deterministically and with zero new dependencies. What is missing is sign-off on the table above.

### 🔴 THREE PRE-EXISTING FORMAT DEFECTS, LIVE ON THE SHIPPED 2.0.0 ICON

**Surfaced by the same measurement, caused by none of the above, and they must be fixed by whatever
artwork lands:**

| # | rule | measured |
|---|---|---|
| 1 | `adaptiveIcon.foregroundImage` must have **transparency** | 🔴 **it has NONE — 100% opaque across all 1600×1600 px.** This is why `adaptiveIcon.backgroundColor` is inert |
| 2 | its content must sit inside the **centre 66%** (launchers crop to circle / squircle / rounded square) | 🔴 **content fills 100% of the canvas**, so every mask crops the medallion's outer ring |
| 3 | `icon` should be **1024×1024** | ⚠️ it is **1600×1600** |

🔴 **Defect 2 is the one with a user-visible consequence today** — on a circular launcher the zodiac
ring is cut, and it has been shipping that way. ⚠️ **`icon` and `adaptiveIcon.foregroundImage` point at
the SAME file, and their format rules CONTRADICT each other** (`icon` must be opaque; the foreground
must be transparent). **One file cannot satisfy both** — the replacement must be two files, which is a
constraint on the artwork brief, not on the code.

✅ **ALL THREE CLOSED 2026-08-04 by `check-brand-assets.js --emit`** — two files, 1024×1024, the
foreground 56.4% transparent with content at exactly 66.0%. **By geometry alone, with no colour
decision**, which is the whole reason they could close while this entry's colour question was still
open. `O-92`.

</details>

## 🆕 P71–P76 — THE ALIGNMENT / DEVICE-REVIEW PASS (2026-08-04, session `build27.1-alignment-fixes`)

Raised by the versionCode-36 device review. Every one is either a decision this session was
forbidden from taking (§0.0 rule 1) or a measurement that STOPS for a ruling rather than retuning.

| # | what | owner |
|---|---|---|
| **P71** | 🔴 **THE LONG-WAIT SCREEN IS A FULL-BLEED ACCENT SLAB AND §2 RETIRED IT. MEASURED, STOPPED, NOT RETUNED.** `GeneratingReading` mounts `LinearGradient colors={[accent, bg, bg]}` at two branches, reached from FIVE flows. §2's `aura` row is `accent-muted` → transparent, RADIAL, and says in its own words it "replaces all 21 `LinearGradient` slabs **except** X3's `Button` fill". Measured: the shipped first stop is the accent at FULL strength; the specified one composites to `#2C2017`. **Luminance ratio 21.3×.** The plain foreground on the shipped stop is **2.31:1** — the same 2.31 that made A5 a token-table rule — and the layout is centre-justified, so nothing sits on the full-strength band TODAY and any content that moves up there fails. ⚠️ **The brief's figures do not reproduce:** it cites "clay aura at 0.16, iris at 0.12"; §2 row 14 is **14%** and row 16 is 12%. The iris figure is right and the clay one is not. 🔴 **25 gradient mounts remain tree-wide across 16 files against §2's expected ONE.** This is a design ruling about the app's most saturated surface, not a value to nudge | ⬜ **designer** |
| **P72** | 🔴 **THE STREAK PILL'S "MISALIGNMENT" IS A POSITION CHANGE, NOT A METRIC ONE — and `P69`(a) already owns half of it.** Measured: this component's three text nodes are inline-sized with NO line height (three of `no-variable-fontsize`'s eleven held sites), so pass 2b's leading never reached them; the face swap moved their ink by **0.51–0.77px**, and box-centring already puts same-face ink within 0.01·size of optically centred. **Nothing metric regressed.** What DID change is that `main` rendered the pill inside the gutter and it now sits `alignSelf: 'flex-end'` with a −24 margin, flush to the physical screen edge — §10.1.0 mechanism 4(a), deliberate, and half-implemented by its own record because the CROP needs a corner that is X11's coupled pair. 🔴 **Nothing was changed on X11's component.** Either confirm the flush edge or rule the crop | ⬜ **designer** |
| **P73** | ⬜ **COPY — five new user-facing strings, none in audit §6's registers.** Three loader labels shaped on the blueprint's ("Loading your career path…" / "Loading your name reading…" / "Loading your reports…") and two on the name reading ("Analyze a new name (1 available this month)" — its count phrasing lifted from that file's own existing indicator rather than invented — and "Back to your reading") | ⬜ **PM** |
| **P74** | ⬜ **`readings/cosmic-report.tsx`'s `case 'loading'` IS THE ONE UNLABELLED LOADER LEFT, AND IT IS DELIBERATE.** That file is RESTYLE-ONLY / structure-frozen, its loader is one arm of a nine-wide server-driven `Phase` switch (R4), and adding user-facing copy there is a PM call on the surface with the most invariants in the file. **The other three migrated; this one is registered** | ⬜ **PM + owner** |
| **P75** | ⬜ **THE READINGS HUB'S SEVENTH GLYPH IS THE ONLY ONE THIS SESSION CHOSE.** Home's Explore group already assigns an Ionicon to six of the seven destinations, so those six were taken rather than picked. **Combined Profile has no Home entry** and took `layers-outline`. ⚠️ **AND THE SCANABILITY COST IS REAL AND REPORTED:** six of the seven silhouettes are distinct in monochrome; `text-outline` reads as "a document" and so does `layers-outline`, two rows apart. **If they fail on a device the fix is Explore's GROUPING pattern, NOT reintroducing hue.** 🔴 Option (b) — a documented `category.*` sub-palette scoped to this screen, like `chart.*` — is **DEFERRED BY OWNER DECISION, not rejected**, so a future reader of §16 does not re-open it as a bug | ⬜ **designer** |
| **P76** | ⬜ **`accessibilityLabel` ON THE HUB'S ICONS WAS ASKED FOR AND DELIBERATELY NOT TAKEN.** The instruction's ground was "an icon alone has no accessible name." Measured: **no icon there is alone** — all seven sit beside a visible title and subtitle in the same row, so a label makes a screen reader announce the category twice. The wells are marked DECORATIVE instead (both platform props, as the plate primitive does). **Stated rather than silently taken; reverse it in one line if the ruling goes the other way** | ⬜ **owner** |

### 🟢 P71 — **DISCHARGED 2026-08-04** (session `build27.1-invariant-coverage`, `54339b0`)

> **The STOP condition was checked first and did not fire:** §9 row 7 reads *"`dur-ambient` aura ·
> `ease-linear` bar"* and §5.5 layer two reads *"An `aura` behind the progress bar"*. **Neither names
> a full-strength accent anywhere**, so this was an implementation defect and not a design conflict —
> no designer ruling was needed after all. The ground moved to §2 row 14's aura stop at 14%.
>
> 🔴 **AND THE OBVIOUS FIX WOULD HAVE BEEN WRONG TOO.** Fading the aura stop to the opaque ground —
> `[accent-muted, bg, bg]` — is **alpha-model-dependent**: premultiplied interpolation ramps down
> monotonically, straight-alpha **bulges near the midpoint to a value BRIGHTER THAN STOP 1 ITSELF**
> and takes the muted role to 3.30:1 on the way. Fading to the **same hue at 0%** holds RGB constant
> so only alpha moves and both models agree to the byte — which is also §2's aura row verbatim
> (*"`accent-muted` → transparent"*). **The safe form and the specified form are the same form.**
>
> ⚠️ **P71's own entry above was right about one more thing than it claimed and wrong about none:**
> it said "nothing sits on the full-strength band TODAY", and re-measuring at 800dp / 640dp /
> 640dp-at-1.3× confirms it — the headline already read 15.68–16.35:1 before the change. **So the
> defect was the SLAB (a minute of the brightest surface in the app), not a live AA failure.** Both
> readings are true and only one of them was reported.
>
> **Still open from P71's entry, and NOT touched:** *25 gradient mounts remain tree-wide across 16
> files against §2's expected ONE.* This item moved the two on the wait screen only.

---

## 🆕 P77–P78 — REGISTERED BY THE INVARIANT-COVERAGE PASS (2026-08-04, session `build27.1-invariant-coverage`)

| # | what | owner |
|---|---|---|
| **P77** | 🔴 **THE PRIMARY `Button`'s OWN GRADIENT GOES SUB-AA IN ITS LAST QUARTER — 60 CALL SITES, AND NO INSTRUMENT CAN SEE IT.** Found while measuring P71's text nodes; **unchanged by P71's fix and out of its scope**, so it is registered rather than swept. `Button` primary fills with `[accent, alpha(accent,85), alpha(accent,70)]` on a 0,0→1,1 diagonal, and the last two stops are TRANSLUCENT, so they composite over whatever ground the button sits on. Measured against the brand ground, the fill-label role reads **6.86 / 5.99 / 5.20 / 4.91 / 4.49 / 4.10 / 3.85** at u = 0 / 0.25 / 0.5 / 0.6 / 0.75 / 0.9 / 1.0 — it **crosses 4.50:1 at u = 0.747, so the last 25.3% of the diagonal is sub-AA** for the 15/16px label the two `TEXT_STEP` values give it. A centred label's ink band on a full-width 56dp control reaches **u ≈ 0.75 = 4.49:1**, and a long label's trailing glyphs go past it. ⚠️ **WHY NOTHING SEES IT, and it is a genuinely new shape:** the `A5 pair` resolver checks that a fill's token and its label's token are the legal PAIR — and this pair **is** legal, `on-accent` on `accent`. Nothing in the tree measures the **composited contrast of a translucent gradient STOP**. 🔴 **DO NOT "fix" it by changing the label role** — A5 makes the fill-label role the only legal foreground. The candidates are: raise the stops' alpha floor, shorten the ramp, or make the fill flat (which is what the screens phase was told owns "what the clay button finally looks like"). **A value decision on the app's most-used control** | ⬜ **designer** |
| **P78** | ⬜ **A DISCLOSURE'S STATE IS ANNOUNCED BY A LABEL ON ITS CARET, NOT BY `accessibilityState`, AT ALL FIVE SITES.** Surfaced by re-checking `C-P4-3` against **P76**'s rule (below). Measured: `accessibilityState` has **8 call sites tree-wide and not one is `expanded`**, so on the five disclosure rows (`birth-data`, `astrology/index` ×2, `readings/face`, `readings/palm`) the caret's `accessibilityLabel={expanded ? 'Collapse' : 'Expand'}` is the **only** signal of the row's state. 🟢 **THAT MEANS THE SIX ARE CORRECT AS SHIPPED and P76's rule confirms them** — see P76. ⚠️ **But the better idiom is `accessibilityRole="button"` + `accessibilityState={{ expanded }}` on the row, with the caret decorative**, and that is the a11y label/role sweep §0.0 rule 5 **CUT from this release**. Registered so it is not re-discovered as a bug, and so the caret labels are not "tidied away" before the row carries the state | ⬜ **owner** (unblocks with the descoped sweep) |

### 🟢 P76 — **CONFIRMED BY THE OWNER 2026-08-04. The deviation was right and the brief was wrong.**

> **THE GENERAL RULE, recorded because it decides every future icon:**
>
> 🔴 **`accessibilityLabel` IS FOR AN ICON THAT IS THE SOLE CARRIER OF ITS MEANING. An icon beside a
> visible label that says the same thing must be HIDDEN from assistive tech — a label there
> double-announces.** Both platform props, always (`accessibilityElementsHidden` **and**
> `importantForAccessibility="no-hide-descendants"`); neither covers the other.
>
> ⚠️ **AND THE DISCRIMINATOR IS SHARPER THAN "IS THERE A VISIBLE LABEL NEARBY?", which is what the
> re-check of `C-P4-3` established.** The test is **whether the icon's label REPEATS what the visible
> text already says.** Measured over both sets:
>
> | set | the icon's label would say | visible text says | verdict |
> |---|---|---|---|
> | the readings hub, 7 wells | the category — "Face Reading" | the same category, twice, in the same row | 🔴 **DECORATIVE** — as shipped |
> | `C-P4-3`, 5 disclosure carets | **"Collapse" / "Expand"** — a STATE | the section's name only | 🟢 **LABELLED, correctly** |
> | `C-P4-3`, 1 pagination dot | **"Current step"** — WHICH step is current | the step's name only | 🟢 **LABELLED, correctly** |
>
> 🟢 **SO ALL SIX OF `C-P4-3`'s CONVERSIONS PASS, and the rule CONFIRMS them rather than demoting
> them.** No code change. The state-vs-identity distinction is the reusable half, and P78 records the
> structural improvement that is descoped rather than wrong.

---

## ⬜ P72 · P73 · P74 · P75 — ONE LINE EACH, NOT ACTED ON

> Carried verbatim from the entries above; restated here only so a reader of this session's records
> does not have to reconstruct what is waiting on whom. **Nothing in this session touched any of them.**

- **`P72` — the streak pill: confirm the flush edge, or rule the crop.** Nothing metric regressed
  (0.51–0.77px of ink); the pill moved OUT of the gutter to the physical screen edge by design, and
  the crop half needs a corner that is X11's coupled pair, so **no X11 component was touched.**
- **`P73` — five new user-facing strings, none in audit §6's registers**, three loader labels plus
  two on the name reading. **PM.**
- **`P74` — the cosmic report's `case 'loading'` is the one loader left unlabelled, deliberately**,
  because that file is restyle-only/structure-frozen and its loader is one arm of a nine-wide
  server-driven phase switch. **PM + owner.**
- **`P75` — the hub's seventh glyph is the only one this session chose**, and the monochrome
  scanability cost is real: two of the seven silhouettes read alike, two rows apart. **If they fail on
  a device the fix is the grouping pattern, never reintroducing hue.** **Designer.**

---

## 🆕 P79 — REGISTERED BY THE MOTION PHASE'S ITEM 0 (2026-08-04, session `build27.1-motion`)

### 🟢 P77 — **DISCHARGED 2026-08-04, EXACTLY AS THE OWNER RULED: THE RANGE WAS CLAMPED**

**The ruling was "clamp the gradient's range; do NOT change the label and do NOT flatten the fill",
and that is what shipped.** `Button`'s primary ramp goes `100 / 90 / 80` instead of `100 / 85 / 70`.

| stop | luminance BEFORE | ratio | luminance AFTER | ratio |
|---|---|---|---|---|
| 1 · opaque | 0.348 | 6.86:1 | 0.348 | 6.86:1 |
| 2 | 0.252 | 5.20:1 | 0.282 | 5.72:1 |
| 3 | **0.173** | **3.85:1** 🔴 | 0.224 | **4.72:1** |

**Minimum along the WHOLE span, over the darkest ground in the palette: 4.72:1** (4.80 / 4.88 / 4.97 /
5.03 over the other four surface steps). The on-fill role needs luminance **≥ 0.211**; the new floor
clears it. **X3 is untouched** — the three heights and the 100%/100% are dimensions and a stop list is
not one. ⚠️ Both remaining values sit on the 5-step opacity scale, which `alpha()` asserts at runtime:
**78% is the exact floor and is not a legal step**, so 80 is the lowest legal one.

**And the class is gated now, not just fixed** — see `codemod-plan` §3.0.2.1.1 and `O-106`.

### ⚠️ `P79` — **SEVEN DECORATIVE WASH / VEIL VALUES MOVED TO CLEAR AA. A DESIGNER SHOULD LOOK AT THEM.** · ⬜ open · **DESIGNER**

🔴 **The `A6` rule found FOURTEEN live sub-AA pairs on its first run, `P77` being one.** Nine were
fixed by a change that is **rendering-identical at the endpoints** (`O-103`'s prescription: move the
opaque ground OFF the stop list and UNDER the ramp, so both alpha models agree and the mid-span bulge
disappears) — **those need no review.** The remaining changes moved a **VALUE**, and every one is
listed here because a value change on a decorative layer is a designer's call even when it is small
and even when it is the smaller of the two available fixes.

| file | what moved | before → after | worst ratio before → after |
|---|---|---|---|
| `ui/Button.tsx` | the ramp's alpha floor | 70% → **80%** | 3.85 → 4.72 |
| `common/BiometricConsent.tsx` CTA | the ramp's alpha floor | 60% → **80%** | 3.57 → 5.03 |
| `profile/ProfileHeader.tsx` | the card's accent tint | 10% → **5%** | 3.28 → 4.78 |
| `profile/SunSignReveal.tsx` trait chips | the chip's accent veil | 20% → **10%** | 3.85 → 4.54 |
| `readings/ArchetypeHeader.tsx` | the header wash | 30% → **10%** | 4.34 / 3.19 → 6.41 / 4.72 |
| `app/(main)/numerology` CTA label | the plain foreground → the **on-fill role** | — | **1.93** → 8.19 |
| `readings/GeneratingReading.tsx` error branch | the muted role → the **secondary role** | — | 4.41 → 8.54 |

🔴 **THE RULE OF THUMB THIS ITEM APPLIED FOUR TIMES, STATED SO IT CAN BE OVERRULED IN ONE PLACE:**
**when a pair fails on a decorative wash, move the WASH, not the LABEL** — a tint strength carries no
design ruling and a foreground role does (§0.0 rule 1's "smaller change"). **The two exceptions are
the last two rows, and both are principled:** numerology's label was a straight A5 violation with one
legal answer, and `GeneratingReading`'s aura value is **SPECIFIED** by design §2 row 14 at 14%, so
§0.0 rule 2 forbids inventing another and the role had to move instead.

⚠️ **What a designer is actually being asked:** are the three reduced tints (5% / 10% / 10%) still
doing their job, or would you rather keep the tint and move the foreground role? **Either answer is
implementable in one line each and both clear AA** — the ratios for the alternatives are recorded in
`codemod-plan` §12.3.1. **Nothing here is blocking.**

⚠️ **One residue is printed by the gate every run and is NOT fixed:** `ArchetypeHeader`'s tagline is
`ground-sensitive` — 4.72 on the canvas but 3.58 if that header is ever mounted on the lightest opaque
step. It does not block (the rule only fails on *sub-AA no matter what it sits on*), and it is
`O-73`'s irreducible half. **If that component moves to a lighter ground, the tint has to fall again.**

---

## 🔴 P80 — THE API-36 EDGE-TO-EDGE BOTTOM INSET (added 2026-08-05, founder device report)

**Reported**: a Samsung device using **3-button navigation**. The six tab labels are overlapped by the
system back/home/recents row, and there is an **empty band immediately above the bar**. Not reproduced
on the owner's device, which uses **gesture** navigation.

### What it is, measured rather than inferred

`android.edgeToEdgeEnabled` is **not set** in `app.json`, so `@expo/prebuild-config`'s edge-to-edge
plugin writes the opt-out theme attribute (with `tools:targetApi 35`). **Android 16 ignores that
attribute for an app targeting 36** — which this app targets since `e588f87` — so the window extends
behind the system bars and the app owns the inset. Two of our own numbers then overrode the
navigator's correct handling of it:

1. `getTabBarHeight` (bottom-tabs 7.16.1) **short-circuits on a numeric height** in `tabBarStyle` and
   never reaches its own `+ inset` term;
2. the navigator sets its bottom padding **from** the inset one array element before our style object,
   and ours is last, so ours won.

And `useBottomInsetPadding` was adding the inset to a bar height that **already contained it** — the
empty band. On a 3-button device the last row of content sat ~112 above the bar instead of 16.

### 🔴 IT AMENDS P14's FALLBACK, AND THIS IS THE ACTIONABLE PART

> **P14's fallback is "if 2.1.0 is not on track by ~2026-08-24, cherry-pick `e588f87` ALONE onto a
> 2.0.x compliance-only release."** 🔴 **`e588f87` alone now ships this defect to every Android 16
> user**: the tab bar of every one of the 24 main screens, plus the capture shutter partly inside the
> system row on the primary funnel. **The cherry-pick must carry the bottom-inset commit too.** It is
> mobile-only, additive, and an arithmetic no-op wherever the system row does not overlay the window.

### What is still owed, and only a device can give it

- ⬜ 🔴 **An Android device pass on a 3-BUTTON device** — that is the configuration the report came
  from and the only one where the fix is visible. Check: tab labels clear of the system row · no empty
  band above the bar · the shutter and both preview buttons fully tappable on face AND palm capture ·
  the guide tip row not colliding with the shutter · the paywall's legal links tappable.
- ⬜ **X18's height moved**, so audit §7.5's standing requirement fires: **re-verify the Build-22
  clipping screens** (Home, Face, Monthly, Profile, Compatibility — Compatibility's was a *functional*
  blocker). The change is an exact no-op at inset 0, but that is an argument, not a screenshot.
- ⬜ **A gesture-navigation device too**, because the fix changes that path as well (a ~24 inset was
  producing a 64 band).

### ⬜ ONE DELIBERATE NON-DECISION, FOR THE OWNER

**`android.edgeToEdgeEnabled` was NOT set to `true`** and that is a registered choice, not an
oversight. Setting it would make edge-to-edge active on **every** Android version rather than only 16+,
which would make behaviour uniform and one device test sufficient — but it changes layout for every
user on Android 10–15, where today's behaviour is correct, and only an EAS build can verify it. §0.0
rule 1 (preserve existing behaviour, smaller change) says leave it. 🟢 **The fix above is correct in
BOTH environments, so flipping the flag later is safe** — recommended after the device pass, and it
also silences a prebuild warning that is emitted on every build today.

---

---

## 🆕 REGISTERED BY THE CUT-3 FIX SESSION, 2026-08-05 (the "AI Astrologer" rename)

### 🔴 `P81` — **THE OLD FEATURE NAME SURVIVES ON SURFACES THIS REPO CANNOT REACH** · ⬜ open · OWNER
> **Class:** POST-DEPLOY / housekeeping. Not gating a build. **It is gating CONSISTENCY**, and the
> cost of missing one is a user seeing two names for one feature.

PM approved **"Ask the Stars" → "AI Astrologer"** and all **three in-app sites** are renamed in code
(`home.tsx`'s Explore row, the readings-hub card title, `qa.tsx`'s screen title). 🟢 **`server/` is
CLEAN — grepped, zero occurrences**, so nothing ships from the backend carrying the old name.

⚠️ **BUT THREE SURFACES ARE OUTSIDE THE REPO AND NO GREP CAN SEE THEM.** Each is an owner action, not
code, and each must be checked deliberately rather than assumed clean:

| # | surface | why it plausibly carries the old name |
|---|---|---|
| **1** | 🔴 **OneSignal notification templates / message drafts** | the push copy is authored IN OneSignal, not in this repo. A scheduled or saved template naming "Ask the Stars" would keep shipping the retired name to every device after the release |
| **2** | 🔴 **the Play Store listing** — description, What's New, screenshots | screenshots are the worst case: a screenshot showing the old title is not editable by a code release, and store copy is store-reviewed |
| **3** | **SendGrid email templates** | any transactional or lifecycle email that names the feature. ⚠️ If one carries a signed/one-time URL, remember tracking must stay OFF **per-send** (CLAUDE.md) — do not touch the global account setting while editing copy |

⚠️ Also worth one look: any **in-app-review prompt copy**, **App Store Connect** metadata if iOS ever
ships, and the **`astrologer:<date>` review key** — which needs NO change and is worth noting because
it means the internal seam was already named for the new product name before the rename landed.

### ⚠️ `P82` — **"AI Astrologer" SITS ONE WORD FROM THE "Astrology" TAB. FLAGGED, NOT DECIDED.** · ⬜ open · **OWNER + PM**
> **Class:** REVIEW — product naming. 🔴 **NO TAB WAS RENAMED. This session deliberately did not act
> on it** (§0.0 rule 2 — a session does not invent a naming decision).

The app now has a bottom tab labelled **"Astrology"** (birth chart and predictions) and a feature
called **"AI Astrologer"** (the Q&A chat). **A user tapping "Astrology" expecting the astrologer is a
real confusion**, and it is the kind that shows up as "the chat is broken, I can't find it" rather
than as a naming complaint.

⚠️ It is also the shape of design `C-4`: *one product, two names on two screens* is worse than either
name consistently — and this is the mirror, *two products, one root word*. `C-4` was resolved by
"decide once, apply everywhere or nowhere", which is the same instruction here.

**What this session did instead:** reported it. The tab is untouched, both entry points to the chat
now agree with each other and with the screen title, and the decision is the owner's and PM's.

### ⚠️ `P83` — **THE EXPLORE GROUP HEADING CHANGED AND IT IS USER-FACING COPY** · 🔴 **SUPERSEDED 2026-08-06 by `P98`** · **PM courtesy**
> **Class:** REVIEW — informational. Owner already ruled the change (option (b)); this exists so PM
> hears it from the owner rather than discovering it in a build.
> 🔴 **SUPERSEDED, NOT CLOSED. The heading this row is about no longer exists** — GUIDANCE was
> deleted on 2026-08-06 along with every other group heading (`P98`). The row is kept verbatim
> because it is the FIRST of two restructures in two days, and the PAIR is what PM needs to see.

Home's Explore group **"REPORTS" → "GUIDANCE"**, both rows unchanged inside it. ⚠️ **Group headings are
NOT in `UI-audit.md` §6, so they are not copy-locked** — but they are user-facing, and "not locked"
is not the same as "invisible". Recorded so the change is mentioned rather than assumed cosmetic.

> ## ⚠️ ~~NEXT FREE P-NUMBER: P84~~ — superseded; the live line is at the END of this file.

---

## 🆕 REGISTERED BY THE PAYWALL FEATURE-MATRIX SESSION, 2026-08-05 (class A)

> **The whole class in one line:** the paywall's comparison component hardcoded 12 features × 3
> tiers and **nothing had ever compared those cells to an enforcement point.** Measuring all of
> them found **three enforced features missing entirely**, **one row whose enforced mechanism is
> not the one recorded**, **two rows no server code enforces at all**, and **one row that is false
> against the free tier in the free tier's disfavour**.

### 🔴 `P84` — **ADD A CAPS / ENTITLEMENTS PAYLOAD. THIS IS THE STRUCTURAL FIX.** · ⬜ open · build-28
> **Class:** SERVER. Not gating 2.1.0 — the hardcoded figures are now correct. It gates the
> figures being correct *next* time.

**A2 was measured and the answer is that NO field exists.** `GET /api/subscription/status`
returns `tier` · `isActive` · `expiresAt` · `productId` · `willRenew` · `managementUrl` and
nothing about limits. The two 402 payloads (`qa-caps.service.ts`'s `QaCapPayload`,
`report.controller.ts`'s `buildLimitPayload`) each carry a *remaining* count for **one** surface,
and both are only reachable **at** the cap — a paywall a user opens before hitting anything can
read neither. `GET /api/readings/name-destiny/credits` is the same shape for a third surface.

**So the marketing figures cannot be driven from the server today, and they were hardcoded.**

🔴 **WHY IT MATTERS MORE THAN IT LOOKS: two of the levers behind those figures are server-side and
reversible WITHOUT A CLIENT RELEASE.** `reportLimitForTier` is a one-line change and the R7 cap
values are one constant. The moment either moves, the shipped binary states a number the server
does not enforce, and no gate in this repo can see it. That is the same lying-silently shape the
audit flagged, rebuilt one layer up.

**The spec:** one authenticated read returning, per feature key, the caller's tier's limit + reset
boundary, sourced from `QA_CAPS`, `reportLimitForTier`, the Name-Destiny constant and
`checkCompatibilityAccess` — i.e. the values this session had to go and read by hand. The client
renders the matrix from it and can never diverge.

### 🔴 `P85` — **TWO ROWS ASSERT A DIFFERENTIATOR THAT DOES NOT EXIST IN THE PRODUCT** · 🟡 **HALF RESOLVED 2026-08-06** · **PM** (the other half)
> **Class:** COPY / product truth. **Left VERBATIM when first registered** — deleting a
> marketing row is a PM decision, not a numeric correction (§0.0 rule 1).
>
> 🟢 **RESOLVED: "Ad-free experience" IS DELETED** (owner ruling, 2026-08-06), together with
> `FEATURE_ACCESS.adFree`, which had zero readers and was the only entry in that map with no
> enforcement point behind it. 🔴 **The distinction that unblocked it: PM owns the WORDING of a
> row; engineering owns whether the row is TRUE.** This one was FALSE — free users are already
> ad-free, so the ✗ in their column claimed a benefit paid users do not receive. A wording call
> waits for PM; a false claim on a purchase surface does not. The matrix is 15 rows → 14.
>
> ⬜ **STILL OPEN: "Priority support."** Deliberately NOT deleted with its neighbour, and the
> reason is the same distinction read the other way — it is not false, it is **UNVERIFIABLE**
> (zero implementation, zero references outside the component, no support route, queue, tag or
> tier-aware contact path anywhere). Retiring an unverifiable promise is a product decision.
> **One PM sentence retires or substantiates it.**

| row | what was measured |
|---|---|
| **"Ad-free experience"** — free ✗ / prem ✓ / plus ✓ | 🔴 **THERE IS NO AD SDK IN THIS APP.** No AdMob, no ad network, no placement, anywhere in `mobile/` or `server/`. `lib/constants.ts`'s `adFree` flag has **zero readers**. So **a free user's experience is already ad-free** and the ✗ in the free column is **false in the direction that flatters the paid tiers.** Either the row goes, or ads are on a roadmap nobody in this repo knows about |
| **"Priority support"** — free ✗ / prem ✗ / plus ✓ | **Zero implementation and zero references outside this one component.** No support route, queue, tag, or tier-aware contact path exists. Unverifiable by construction — a promise with no mechanism to keep or break |

**One PM sentence each retires or substantiates them.** Both are on the highest-revenue surface in
the app, which is the argument for not leaving them indefinitely.

### ⚠️ `P86` — **"Monthly reading (full)" PROMISES PREMIUM SOMETHING THE CLIENT THEN HIDES FROM THEM** · ⬜ open · **PM + owner**
> **Class:** COPY, and it is `P19` seen from the paywall instead of from the screen.

The row reads free ✗ / **premium ✓** / plus ✓. Enforcement: `insight.service.ts` tiers the monthly
prompt only `'free' | 'premium'`, so the server genuinely generates the full shape for a premium
user — **but `astrology/monthly.tsx` locks `areas.money`, `areas.health`, `challenges` and
`opportunities` behind `isPremiumPlus`, and that same screen tells a premium user
`"See all 3 sections"`.** So a premium buyer is sold "(full)" and shown a subset.

⚠️ **`P19` is the fix for the leak (stop generating what is hidden). This is the fix for the
CLAIM**, and they are opposite in direction: closing `P19` makes this row *more* wrong, not less.
**Whichever way it is resolved, the row's premium cell and `P19` must be decided together.**

### ⚠️ `P87` — **FOUR RESET BOUNDARIES, THREE DIFFERENT SEMANTICS, ONE OF THEM NOT UTC** · ⬜ open · owner
> **Class:** REVIEW — consistency. **No behaviour changed.** Registered because the copy now
> states a monthly figure on four rows and those four months are not the same month.

| surface | boundary |
|---|---|
| AI Astrologer questions + Deep Insight | calendar month, **UTC**, no rollover (`utcMonthBounds`) |
| Personalized Cosmic Report | calendar month, **UTC**, no rollover, reserved atomically by a partial unique index |
| Name Destiny | calendar month, **SERVER-LOCAL** (`getCurrentMonthRange` builds a local-time `Date`) |
| Compatibility free allowance | 🔴 **NEVER REFILLS.** It counts every reading the account has ever made, so "1 free reading" is a lifetime allowance, not a monthly one |

`report.controller.ts` already carries a comment naming the local-time helper as the odd one out
and notes it coincides on Railway (UTC). **It coincides only while the host stays UTC**, which is
an environment fact rather than a code guarantee. One-line fix available whenever it is wanted.

### ⚠️ `P88` — **`nameUpdateRateLimit` READS THE RAW TIER, BYPASSING THE COMP GRANT** · 🟢 **RESOLVED 2026-08-06** · owner
> 🟢 **FIXED, PLUS A WHOLE-SERVER SWEEP AND A GATE.** All 12 direct `subscription.tier` reads were
> classified: 10 legitimate (the webhook's before/after pair, three writes, the comp CLI's
> deliberate three-way print, the resolver itself) and **2 defects**. This one was live and silent;
> the second (`subscription.controller.ts`'s `syncSubscription` returning billing truth under the
> same key its sibling endpoint uses for entitlement) was latent — mobile discards that response —
> and is recorded as latent rather than sold as a catch. 🔴 **The smoke test was part of the
> defect, not a witness to it:** `decide()` is a hand copy of the middleware's logic, so it
> reproduced the same wrong line and stayed green through all three occurrences of this class. Its
> tier half now calls the real resolver, and four new cases cover comp / expired comp / direct
> grant / no-demotion.
> 🟢 **`npm run check:tier`** (`effective-tier.check.ts`) makes every direct read a DECLARED one
> with a stated kind, pins the two fixed sites at exact 0, and carries a floor on
> `getEffectiveTier` call sites so the rule cannot be satisfied by deleting the resolver.
> Injection 3/3 caught with the reason matched.
> **Class:** correctness, small. Found while separating the profile-name limit from Name Destiny.

`middleware/name-update-rate-limit.middleware.ts` resolves `user.subscription?.tier || 'free'`
**directly**, where every other tier gate in `server/` goes through `getEffectiveTier(user)`. A
**comped** influencer account therefore gets the FREE limit (1 profile-name change per rolling 30
days) instead of their granted tier's. One-symbol fix; recorded rather than taken, because it is
outside this session's class and touches an auth-adjacent middleware.

⚠️ **Also worth stating so it is never conflated again: this middleware is the PROFILE-NAME
change limit (1 / 5 / 15 per rolling 30 days). It is NOT the Name Destiny reading limit**, which
is 1 per calendar month, Premium-Plus only, and enforced in the controller.

### ⚠️ `P89` — **THE COMPARISON MATRIX IS OPAQUE TO A SCREEN READER** · ⬜ open · owner (descoped sweep)
> **Class:** a11y. 🔴 **Inside the CUT label/role sweep (§0.0 rule 5), so NOT swept this session.**

44 cells render a bare vector mark with no label. The new uncapped mark **is** labelled
(P76 — it is the sole carrier of its meaning and nothing visible beside it says so), which makes
the asymmetry visible: the affirm / negate marks in the other cells are equally sole carriers
and equally unlabelled. **That asymmetry is the descope, not an oversight.** It sits with `P78`.

### ⚠️ `P90` — **THE `S-R9L` REGISTER ROW IS STALE AGAINST THE CODE** · ⬜ open · owner
> **Class:** register hygiene. Cheap, and it is the kind of staleness that gets a decision re-made.

`sid-signoff.md`'s **S-R9L** describes the report as *"currently generates for **both paid
tiers** (`reportLimitForTier` = free→0, premium/PP→1)"* and frames the Premium-Plus-only outcome
as a pending option. 🔴 **The code has been PP-only since Sid's 2026-07-25 directive** —
`report.controller.ts` reads `tier === 'premium_plus' ? 1 : 0`, with that directive named in the
comment above it, and `PROJECT_CONTEXT.md` §6 already records PP-only. **The register row is the
only artefact still describing the old state.** Flip it, keeping the cost-decision trail.

> ## ⚠️ ~~NEXT FREE P-NUMBER: P91~~ — superseded; the live line is at the END of this file.

---

## 🆕 REGISTERED BY THE EM-DASH SESSION, 2026-08-05 (class B)

> **Measured, not estimated: 22,926 em-dashes across 694 of 747 stored generated
> documents — 185 per 10,000 words, roughly fifteen times ordinary editorial density.**
> The prompt rule and the deterministic clean-up both shipped. Everything below is
> what they do NOT reach.

### 🔴 `P91` — **DECIDE WHAT HAPPENS TO ALREADY-STORED READINGS (B4)** · 🟢 **RESOLVED — (a) SHIPPED 2026-08-06** · OWNER
> 🟢 **OWNER RULED OPTION (a): SANITISE ON READ. Shipped the same day, server-only, in its own
> commit so it can be pushed independently.** `sanitiseReadPayload` joins `prose-sanitiser.ts` — the
> same module, the same `PROSE_SANITIZER_ENABLED` flag, the same per-string transform — at **11 call
> sites**: face · palm · name-destiny · career-destiny · the legacy history collection ·
> compatibility list and by-id · daily · daily/teaser · weekly · monthly.
>
> 🔴 **IT SANITISES THE WIRE FORM, NOT THE OBJECT.** The payload is serialised exactly as Express
> would (`JSON.parse(JSON.stringify(x))`, same `toJSON()` hooks) and the walk runs over that — so
> the thing sanitised IS the bytes the client was going to receive, and a `Date` survives as its ISO
> string instead of being rebuilt as `{}`. An injection case proves that specific failure.
>
> 🔴 **AND THE EXCLUSION PROOF FOUND A LIVE INSTANCE ON ITS FIRST RUN.** There is still no exclusion
> LIST; the rule is a property — the sanitiser is a no-op on a string carrying no em-dash, so the
> exclusion holds iff no AUTHORED string on a sanitised read path carries one. Asserted as a census,
> and `chiromancy-rules.ts` held **four** authored palm-type phrasings that DO ride the palm DTO
> (they become `PalmTrait.description`, which `reconcilePalmSubstance` uses when the model omitted
> one). **Fixed at SOURCE**, byte-for-byte to what the sanitiser itself produces, so no copy was
> authored. `physiognomy-rules.ts` was clean.
>
> **Per-read cost, measured on payloads sized to the real ones:** face/palm 11.8 KB → **0.269 ms** ·
> compatibility list ×20 37.6 KB → **0.826 ms** · daily 3.5 KB → **0.064 ms** · an already-clean
> face/palm → **0.038 ms**, which is the steady state. Sub-millisecond CPU on a request already
> dominated by a Mongo round trip.
>
> ⚠️ **AUTO-DEPLOYS ON PUSH, INCLUDING TO CURRENT 2.0.0 USERS.** That is the point of (a) — it
> reaches the ~470 permanent documents a client release never could.
> ⬜ **The stored bytes stay dirty**, which is (a)'s one weakness and still has no live consumer
> (R9's PDF rebuild reads `reports.interpretation`, measured 0 of 4). Option (b) remains available
> later, against a corpus that has stopped growing.
>
> **The decision as first put is kept verbatim below.**
>
> **Class:** product + data. **NOTHING WAS EXECUTED.** No migration, no read-time
> rewrite, no backfill. This is the decision, with its cost.

**Why it cannot be left to expire.** Daily, weekly and monthly readings live in
`InsightCache` behind a `validUntil` and roll over on their own cadence. **Face, palm,
Name Destiny and Career Destiny do not expire at all**, and neither do compatibility
readings. Measured today:

| stored surface | docs | carrying at least one em-dash | expires? |
|---|---|---|---|
| `userprofiles.faceReading` | 276 | **180** | 🔴 never |
| `userprofiles.palmReading` | 276 | **167** | 🔴 never |
| `userprofiles.palmReadingNonDominant` | 276 | 6 | 🔴 never |
| `nameanalyses` | 14 | **13** | 🔴 never |
| `careerdestinies` | 26 | **20** | 🔴 never |
| `compatibilities` | 86 | **81** | 🔴 never |
| `insightcaches` (daily 357 / monthly 206 / weekly 4) | 567 | **554** | 🟢 on cadence |
| `qa_turns.answer` | 6 | 6 | 🟢 history only |
| `readings` (legacy collection) | 431 | **376** | 🔴 never |
| `reports.interpretation` | 4 | 0 | 60-day PDF lifecycle |

**So ~470 permanent documents across ~276 accounts keep the old punctuation forever
under option (c).** Every existing user's face and palm reading is the first thing
they see on the readings hub.

| option | what it is | cost | risk |
|---|---|---|---|
| 🟢 **(a) sanitise ON READ at the response boundary** | apply the same idempotent function to the reading DTO on the way out of the face / palm / name-destiny / career / compatibility / insight GETs | ~6 call sites, no migration, no downtime, **covers HISTORY too** (an old compatibility a user reopens is clean) | the stored bytes stay dirty, so any future non-HTTP consumer (a PDF rebuild, an export, an admin dump) still sees them |
| **(b) one-off backfill** | a version-aware script over the seven collections above | a script + a dry run + a real run + the usual owner ritual; touches ~470 live documents | writes to production reading content, which is the highest-consequence write in this database, for a punctuation change |
| **(c) natural expiry** | change nothing | free | 🔴 **never reaches the permanent surfaces at all.** It is not a slow fix, it is a non-fix for the four readings that matter most |

🟢 **RECOMMENDATION: (a), and NOT (b).** It costs about the same as (b)'s dry run,
needs no write to production content, is self-healing for anything generated before
the fix, and its one weakness (dirty bytes) has no live consumer today — R9's PDF
rebuild reads `reports.interpretation`, which measured **0 of 4**. If a future export
feature needs clean bytes, (b) can still be run then, against a corpus that has
stopped growing.

⚠️ **If (a) is chosen, put it at the RESPONSE boundary and not in the model layer.**
The same function at the same two funnels already handles new generations; adding a
third install point inside a service would double-sanitise and blur which layer owns
what. Idempotence makes that harmless but not clear.

### 🔴 `P92` — **THE CONFIDENTIAL REPORT PROMPT'S EM-DASHES** · 🟡 **HALF SHIPPED 2026-08-06** · **SID** (the other half)
> 🟢 **THE 7 SENTENCE-BREAK USES IN THE DIRECTIVES ARE FIXED** (owner ruling, 2026-08-06). B2's
> premise is that a prompt modelling the habit teaches it, and those 7 were the ones doing that.
> **19 → 12.** Punctuation and capitalisation only; the single lexical addition in the whole diff is
> the conjunction *"so"*, required by the comma form. Not one word of a methodology claim moved, and
> the word-level diff is the evidence.
> 🟢 **THE 12 STRUCTURAL USES STAY** — definition lists, table cells, headings, parenthetical
> glosses. Same typographic role `P94` protected in `qa.tsx`: a separator, not a break.
> ⬜ **STILL OPEN: appending the shared punctuation block (`PROSE_STYLE_RULES`) to this prompt.**
> That half of the ask was not ruled on and is not taken. It is the difference between *"this
> document no longer models the habit"* (done) and *"this document instructs against it"* (not).
> ⚠️ **NOT GATED, and that is deliberate.** An exact em-dash census over a Sid-gated document would
> cry wolf on every legitimate edit to it — the same reason `no-white-on-accent` was demoted. The
> measurement is recorded here instead: **12, all structural, at 2026-08-06.**
>
> **The finding as first registered follows, kept verbatim.**

### 🔴 `P92` (original) — **THE CONFIDENTIAL REPORT PROMPT STILL CARRIES 19 EM-DASHES AND WAS DELIBERATELY NOT EDITED** · **SID**
> **Class:** gated. §0.0 rule 1 and rule 3 both point the same way here.

`src/prompts/Revelia_Complete_Reading_Generation_Prompt_v1.md` is the confidential
methodology prompt. **Every previous edit to it was explicitly Sid-gated** (see
`sid-signoff.md` S-R9j and S-R9k, both of which say so in those words), so this
session did not touch it, and it is the one prose surface that does NOT receive the
shared style rule.

🟢 **The report's OUTPUT is still cleaned** — it routes through
`createSynthesisMessage`, so the deterministic pass covers it. What is missing is only
the instruction half, i.e. the report will keep producing em-dashes at its natural rate
and the clean-up will keep removing them. **Not a defect, a measurable inefficiency:**
`emDashesRemoved` on the `report` surface is the number that shows the gap.

**The ask is one sentence from Sid:** may the prompt's own prose have its em-dashes
replaced, and may the shared punctuation block be appended to it? Both are additive and
neither touches a single methodology claim.

#### 🆕 THE 19, CLASSIFIED — measured 2026-08-06. **REPORT ONLY; nothing was edited.**

The question put was *"schema / examples (harmless), or prose-shaping instructions (the
flagship prose deliverable modelling the habit it forbids)?"* 🔴 **The honest answer is
NEITHER CATEGORY AS POSED, and the split is 12 / 7.**

**12 · STRUCTURAL SEPARATOR — a label and its gloss, a table cell, or a heading.** The
`highlights` list item · the three chart-ID definitions (`rasi-chart`, `western-wheel`,
`dasha-timeline`) · three markdown TABLE CELLS · two `(RENDERER GUIDANCE — …)`
parentheticals · two `###` HEADINGS · one bold-label parenthetical. **No sentence is
being joined in any of them.** This is the same TYPOGRAPHIC use `P94` protected in
`qa.tsx`: a separator, not a break. The style rule does not target it and a regex sweep
that removed it would be wrong.

**7 · SENTENCE BREAK INSIDE A DIRECTIVE — these are the habit-modelling ones**, and they
are exactly what Sid's one sentence would cover:

- *"Present and interpret them **—** do NOT recompute or substitute a model-derived value."*
- *"there is no injected `derived` set **—** compute every quantity below yourself"*
- *"never compute or adjust a number **—** the injected values are consumed verbatim."*
- *"…`bothZodiacAgreement` **—** state it inline in prose (no table)."*
- *"write the interpretive prose around it **—** you do not draw the chart"*
- *"…or your inline Mode-A computation **—** never recomputed, re-derived, or substituted."*
- *"The report consumes these values directly **—** see 'Derived quantities' below."*

🟢 **AND THE STRONGEST THING THAT CAN BE SAID IN THE PROMPT'S FAVOUR, MEASURED: ZERO of
the 19 sit inside an EXAMPLE of the deliverable's prose.** This prompt shows no sample
paragraphs at all, so the strongest imitation channel is not open — the 7 above are the
second-strongest one, the instruction's own voice. **That is why this stays a measurable
inefficiency rather than a defect,** and `emDashesRemoved` on the `report` surface remains
the number that shows the gap.

⚠️ **The 9 in the crisis classifier (`P93`) were correctly left alone, and this
measurement does not disturb that ruling.** That prompt emits a route decision and never
prose, so no em-dash in it can reach a user OR shape any output — the habit argument does
not apply to it at all, and the safety argument (a behavioural change on the suicidal-
ideation path with no test runner in this repo) stands on its own.

### 🔴 `P93` — **THE SAFETY CLASSIFIER PROMPT WAS NOT TOUCHED, ON PURPOSE** · ⬜ open · informational
> **Class:** RULING, recorded so nobody "finishes the job" later.

`qa-router.service.ts`'s Haiku classifier prompt carries **9 em-dashes** and they were
left exactly where they are. Two reasons, and the first is sufficient:

1. 🔴 **It is the crisis-routing prompt.** Rewriting the punctuation of instructions
   that decide *"is this message suicidal ideation?"* is a behavioural change on the
   safety path, and there is no test runner in this repo to prove it is not. The 10
   classifier fixtures live in the gitignored handover.
2. **It emits a JSON route decision, never prose.** No em-dash in it can reach a user,
   so the habit-modelling argument that justifies editing the prose prompts does not
   apply.

⚠️ **The same reasoning covers `imageValidation.service.ts` and `geocoder.service.ts`,
which also make direct model calls and also produce no prose.** Untouched, and they
are the reason the clean-up is installed at two funnels rather than at the SDK client.

### ⚠️ `P94` — **MOBILE CARRIES ~46 HARDCODED READING STRINGS WRITTEN IN THE MODEL'S VOICE** · ⬜ open · **PM** (B5's audit)
> **Class:** COPY. 🔴 **NOTHING IN MOBILE WAS CHANGED.** This is the batch, so PM sees
> it once.

**65 em-dash occurrences in mobile string / JSX-text literals across 129 files.** None
of them is copy-locked by `UI-audit.md` §6 — checked row by row against §6.1 to §6.6,
including `app.json`, which has **zero**. Grouped by what they are, because the groups
want different answers:

| # | group | where | note |
|---|---|---|---|
| **46** | 🔴 **CLIENT-AUTHORED READING PROSE** | `lib/astrology/interpretations.ts` (25) · `app/(main)/numerology/index.tsx` (18) · one template (1) | **The finding that matters.** These are interpretation paragraphs hardcoded in the app, in exactly the register the server generates, e.g. *"Your emotional world is passionate and action-oriented, you process feelings quickly"*. **No server-side control can ever reach them.** They will keep showing the old punctuation after every other surface is clean |
| **11** | loader messages | `components/readings/GeneratingReading.tsx` | *"Almost ready, crafting the final piece…"* and siblings. Free copy, high impressions |
| **4** | user-facing errors / hints | `verify-email.tsx:115` · `face-capture.tsx:355` · `palm-capture.tsx:352` · `compatibility/index.tsx:498` | |
| **1** | modal body | `CaptureInfoModal.tsx:64` | |
| **1** | share text | `cosmic-report.tsx:398` | leaves the app and lands in someone else's feed, so it is the highest-visibility single string in the list |
| **4** | 🟢 **developer diagnostics, NOT user-facing** | `_layout.tsx:148` · `lib/googleSignIn.ts:22` · `lib/textDefaults.ts:98` · `store/subscriptionStore.ts:226` | console lines and one thrown `Error`. **Recommend leaving these**: they are read by us, not users, and the em-dash is doing useful work in them |

🔴 **AND TWO OCCURRENCES MUST NOT BE SWEPT, WHICH IS WHY THIS IS AN AUDIT AND NOT A
CODEMOD:** `readings/qa.tsx:344` and `:351` render a bare em-dash as the **null-value
mark** in the counter chips (*"— questions left"* while the count is still loading).
That is correct typography for an unknown value and has nothing to do with the sentence
break. A regex sweep over mobile would have silently broken both.

⚠️ **Two SERVER strings belong in the same PM batch even though they are not mobile**,
because they are hardcoded user-facing copy that the clean-up deliberately does not
touch (it only ever runs on model output):
- `src/prompts/shared/continuity-context.ts:60` — the continuity HOOK prepended to the
  free and premium daily teaser (S-R6 Option A): *"…shifted, see what's realigning."*
  It is assigned onto the insight AFTER generation, so no model ever sees it.
- `src/services/qa.service.ts:432` — *"That question is too long, please shorten it."*

### ⚠️ `P95` — **THE TRANSFORM MAKES TWO OF TWENTY REAL SAMPLES READ SLIGHTLY WORSE, AND THAT IS THE HONEST RESULT** · ⬜ open · informational
> **Class:** disclosure. Not a blocker; recorded because a later reader will otherwise
> assume the transform was free.

Tested on 20 real stored readings, before and after printed (`npm run check:prose --
--live`). 25 em-dashes removed, idempotent 20 of 20, zero remaining 20 of 20. Reading
the output rather than the exit code:

- 🟢 **APPOSITIVE uses convert cleanly and are the majority** — *"reveals a Fire hand,
  the mark of a natural born leader"*, *"the Master Builder vibration, one of the most
  powerful inner drives"*. Indistinguishable from copy written that way.
- ⚠️ **Uses that joined two INDEPENDENT CLAUSES become comma splices.** Mostly
  idiomatic in this register (*"you don't just fall in love, you build a world
  together"*), but they are splices.
- 🔴 **Two of the twenty read materially worse, and both for the same reason: a comma
  already sat nearby, so the new one competes.** *"…others rush past, today, my vision
  becomes unstoppable reality"* and *"…loving authentically, Mairaj with passionate
  intensity, Xyz with quiet devotion"*, where the result is a three-comma sequence the
  reader has to re-parse.

**The correct repair for the clause-joining case is a FULL STOP, not a comma** — and
choosing between them requires knowing whether both halves stand alone, which a
deterministic transform cannot decide without parsing. **So the split is deliberate:
the prompt rule (`prose-style.ts`) removes the construction at source and names the
full stop as one of the three options; the clean-up is the backstop, and its worst case
is a comma splice rather than a visible tell.** `emDashesRemoved` trending toward zero
is what says the split is working.

### ⚠️ `P96` — **WHAT ELSE RECURS IN THE CORPUS. MEASURED, NOT RECALLED. NO ACTION TAKEN.** · ⬜ open · **PM / owner**
> **Class:** prompt quality. 🔴 **Explicitly not acted on** — it is a voice decision.

Measured over **747 documents / 1.24M words** of real stored generated prose:

| tell | hits | docs | per 10k words |
|---|---|---|---|
| **em-dash** | 22,926 | 694 | **185.2** |
| **rule of three** (`X, Y, and Z`) | 2,809 | 389 | **22.7** |
| "deeply" | 1,261 | 325 | 10.2 |
| "not just" | 1,144 | 324 | 9.2 |
| "profound" | 470 | 260 | 3.8 |
| **spaced hyphen as a break** | 431 | **37** | 3.5 |
| "journey" | 376 | 204 | 3.0 |
| "speaks to" | 366 | 168 | 3.0 |
| "navigate" | 324 | 250 | 2.6 |
| "rare blend / combination / gift" | 286 | 217 | 2.3 |
| "you are here to" | 260 | 138 | 2.1 |
| "you possess" | 215 | 150 | 1.7 |
| "hold space" | 156 | 117 | 1.3 |
| "illuminate" | 134 | 89 | 1.1 |
| "unwavering" | 114 | 95 | 0.9 |
| "lean into" | 90 | 86 | 0.7 |

🔴 **AND THE RESULT THAT ARGUES AGAINST WORKING FROM A REMEMBERED LIST OF CLICHÉS: the
famous ones are essentially ABSENT.** "delve" **0**. "tapestry" **3**. "beacon" **5**.
"a testament to" **4**. "it's not just X, it's Y" **9**. Anyone tightening these prompts
from a folk list would spend the effort on vocabulary that is not in the corpus.

**What IS in the corpus is punctuation and RHYTHM.** After the em-dash, the strongest
signal by an order of magnitude is the three-item list — 2,809 instances in 389 of 747
documents — which is why `prose-style.ts` rule D names it. That rule is the only part
of this measurement that was acted on, and it is an instruction with no deterministic
backstop, deliberately: a codemod that rewrote list rhythm would be rewriting the voice.

⚠️ **"Spaced hyphen as a break" is worth one look for a different reason: 431 hits but
only 37 documents, so it is concentrated rather than pervasive.** It is also the exact
substitution a naive em-dash fix would have created, which is why neither the
instruction nor the clean-up offers a hyphen as the replacement.

---

## 🆕 REGISTERED BY THE MOTION / EXPLORE / COMP-TIER SESSION, 2026-08-06

### ⚠️ `P97` — **THE SCREEN ENTRANCE'S DISTANCE: 8 IS SHIPPED, 12 IS RECOMMENDED** · ⬜ open · **OWNER** · one line
> **Class:** design value. 🔴 **NOT TAKEN — 8 is the SPECIFIED value (§5.3 rule 3) and 12 is an
> invented one, so §0.0 rule 2 says register the gap rather than author a number.** The owner
> asked for a measurement and a recommendation; this is both, and it is not a silent keep.

`useEntrance` lost its alpha channel this session: a container fade and a content fade are the
same channel and they MULTIPLY, so the entrance was running and unobservable. **8dp was specified
as a COMPANION to that fade. It is now the sole cue.**

**Measured against the installed navigators, not estimated.** `ease-enter` is a hard decelerate
(`0, 0, 0.22, 1`), so of the 300ms entrance:

| container animation | resolves at | entrance travel already spent | left to see |
|---|---|---|---|
| nested Stack, API 33+ | 133ms | 79% | **1.7dp** of 8 |
| root stack fade | 150ms | 83% | **1.3dp** of 8 |
| nested Stack, pre-33 | 200ms | 93% | **0.6dp** of 8 |
| tab scene | 220ms | 96% | **0.3dp** of 8 |

🔴 **SO "JUST DELAY IT PAST THE FADE" IS NOT THE ANSWER HERE, AND DISTANCE ALONE HAS A CEILING.**
Making the *residual* 4dp at the tab boundary would need a ~93dp rise, which §5.3 rule 3 forbids
outright. 🟢 **What actually rescues the entrance is that a translate is NOT multiplied by the
container's alpha** — at composite alpha 0.5 the content is half-visible and still moving.
Counting from the point content becomes readable (alpha ≈ 0.35, ~60ms), the user sees roughly
**4dp of travel at distance 8 · ~6dp at 12 · ~8dp at 16.**

🟢 **RECOMMENDATION: 12.** It roughly doubles the visible travel, still reads as a rise rather
than a slide, and is one line.

🔴 **IF CONFIRMED IT MUST BECOME ITS OWN CONSTANT, NEVER A BUMP OF `t.motion.distance`.**
`useErrorEntrance` reads that token as `/2` to get §5.4's error rise of **4**, so moving the token
silently moves a second specified number to 6. ⚠️ **And `motion-arrival-check.js` would NOT catch
that** — it asserts the error rise as the EXPRESSION `t.motion.distance / 2` precisely so the
coupling stays visible, which means it stays green while the number changes. The expression is the
right assertion and this is its blind spot; both are true.

⚠️ **It cannot be settled without a device.** Nothing in this repo can measure perceptibility, and
the analysis above is geometry, not a viewing.

### 🔴 `P98` — **EXPLORE HAS NO GROUP HEADINGS AT ALL NOW. PM SETTLES THE STRUCTURE, ONCE.** · ⬜ open · **PM**
> **Class:** COPY / IA. Supersedes `P83`. 🔴 **This is the SECOND restructure of one list in two
> days**, and the owner's instruction was that PM decides the final shape once.

**What happened, in order.** 2026-08-05: the group heading was renamed "REPORTS" → "GUIDANCE"
(owner ruling, option (b)) — created specifically to hold the Cosmic Report and the AI Astrologer.
2026-08-06: the owner ruled those two rows into the FIRST group, and GUIDANCE deleted.

🔴 **REPORTED BEFORE ANY HEADING WAS COMMITTED, AS ASKED, BECAUSE THAT RULING LEFT A WRONG LABEL:**
the first group would then hold Astrology, Numerology, Cosmic Report and AI Astrologer, and
**"CHARTS & NUMBERS" describes neither new member** — a conversational astrologer is not a chart
and not a number. Two options, both cheap:

| | option | disposition |
|---|---|---|
| **(a)** | rename the first group | 🔴 **NEEDS A WORD FROM PM.** It is marketing copy, and §0.0 rule 2 forbids authoring one here. **Registered as the standing alternative** |
| **(b)** | 🟢 **drop the headings entirely — a flat 7-row list** | 🟢 **TAKEN**, per §0.0 rule 1: conservative here means the branch that **INVENTS NO COPY**. With GUIDANCE gone only two groups remained and one no longer described its own rows, so the layer was carrying exactly one working label |

**Row order is the owner's placement, flattened**: Astrology · Numerology · Personalized Cosmic
Report · AI Astrologer · Compatibility · Name Destiny · Career Destiny. No row changed neighbours
except across the two deleted breaks. `ExploreGroup` was **deleted**, not left at zero call sites.

⚠️ **WHAT (b) COSTS, STATED RATHER THAN GLOSSED — §10.1.3's argument for grouping was NOT
aesthetic.** Seven radial-symmetric line glyphs at 20dp blur together in PERIPHERAL vision, and
POSITION was the cheap replacement for the hue identity the emoji discs used to carry ("second
group, first row"). A flat list gives back a row number but not that coarse two-level target.
**`O-9`'s device squint test becomes load-bearing again.**

🟢 **ONE LINE REVERSES IT** if PM supplies a name — re-wrap in `ExploreGroup` (deleted, recoverable
from `6048f5e`). **The ask is one word, or a ruling that the flat list is final.**

### 🔴 `P99` — **FACE AND PALM GENERATIONS HAD NEVER BEEN LOGGED** · 🟢 **SHIPPED 2026-08-06** · OWNER (a pricing conversation is coming)
> **Class:** instrumentation. Registered as measured-but-not-fixed; **owner ruled SHIP IT the same
> day**, in its own commit so it can be pushed and reverted independently of the mobile work.
>
> 🟢 **DONE.** `generateFaceReading` / `generatePalmReading` now call `logAiGeneration` directly,
> surfaces `face` / `palm`, with new `FACE_PROMPT_VERSION` / `PALM_PROMPT_VERSION` tags.
> **Logged AFTER the parse, not after the response** — the same boundary the routed helper uses,
> because an unparseable generation is a FAILURE and already has a row via `logAiFailure`; logging
> both would double-count the surface and make the failure rate unreadable.
> `emDashesRemoved` rides along via a new optional out-parameter on `parseClaudeJSON` (the other
> seven call sites are untouched). `fellBack: false` is a **fact, not a placeholder** — this path
> has no fallback chain at all. `userId` IS threaded, unlike the routed rows: the two `logAiFailure`
> calls in those same functions already carry it, and per-user attribution is the point of measuring
> an ENTRY funnel.
>
> 🟢 **THE SWALLOW IS VERIFIED, NOT ARGUED** — `npm run check:ailog`. It does not read the source and
> conclude a `try` exists; **it makes the write fail in both ways a write can fail** and observes
> what escapes, with an `unhandledRejection` listener registered because *"it did not throw"* and
> *"it did not leak"* are two claims and only one is visible to a `try/catch` around the call.
> 🔴 **The case that earns its place: a `.catch()` on the returned promise COMPILES, swallows the
> rejection, and misses a SYNCHRONOUS throw** — which Mongoose can produce on a malformed document
> before the driver is ever reached. A `void`-invoked logger that can reject takes the process down
> during exactly the outage that caused it. **Injection 5/5 caught, reason matched.**
> ⚠️ It also asserts both rows are **never awaited**: an await would put a DB round trip on the
> reading path AND, inside the enclosing try/catch, a logging failure would be re-reported as a
> `json_parse_error` — a logging outage masquerading as a model defect.
>
> ⚠️ **ROWS PREDATING 2026-08-06 DO NOT EXIST FOR THESE TWO SURFACES**, so an analysis window
> spanning that date under-reports face and palm rather than lying about them — the same property
> the `usage` and `emDashesRemoved` fields already have. **For the pricing conversation, use a
> window that starts after the deploy.**
>
> ⬜ **STILL OPEN, and it is the reason this row is not closed: `SynthesisSurface` declares
> `'validation'` and NOTHING routes to it.** A dead row in an exhaustive `Record` — harmless, but a
> surface name a later reader would reasonably assume is live. Deliberately not touched here.
>
> **Below is the finding as first registered, kept verbatim.**

**The claim that failed.** `createSynthesisMessage` is described across the plans as *"the single
call site"* for model calls and A/B logging. **It is not, in TWO directions:**

1. R7 added a **second export**, `createQaAnswerMessage`, which routes `qa` per tier and calls the
   same `logGeneration`. **So logging has TWO funnels** — the same shape the prose clean-up has,
   and it is now recorded the same way.
2. 🔴 **`generateFaceReading` and `generatePalmReading` are direct `anthropic.messages.create`
   Vision calls in `claude.service.ts` and reach NEITHER funnel.**

**Coverage per surface, measured:**

| model call | surface(s) | logged? |
|---|---|---|
| `createSynthesisMessage` (7 call sites) | daily · weekly · monthly-free/premium · compat-free/premium · career · name-destiny · report | 🟢 yes |
| `createQaAnswerMessage` (1 call site) | qa | 🟢 yes |
| **`generateFaceReading`** | — | 🔴 **NEVER** |
| **`generatePalmReading`** | — | 🔴 **NEVER** |
| `testClaudeConnection` | — | diagnostic; correctly not logged |
| `imageValidation` · `geocoder` · `nameValidation` · the Haiku crisis classifier | — | not generations; correctly not logged (`P93`) |

🔴 **WHY IT MATTERS MORE THAN A MISSING ROW.** Face is the **ENTRY FUNNEL** — the first reading
almost every user makes — and face + palm are **two of the four permanent, never-expiring
readings**. They are also the only two calls carrying a **base64 image** in the input, i.e. the
highest input-token cost per call in the app, at `max_tokens` **16000** each with adaptive thinking
on `claude-sonnet-5`. **Any cost or usage analysis built on `ai_generations` is wrong by whatever
face and palm cost** — and wrong in the direction that makes the routed surfaces look like the
whole spend. That is the same lying-silently shape `P84` flagged one layer up.

**The fix, if wanted:** call `logAiGeneration` directly from the two functions after a successful
response. 🟢 **No type change is needed** — `AiGenerationRecord.surface` is a plain `string`, so
`'face'` / `'palm'` need not join the `SynthesisSurface` union, **and should not**: neither routes
through `resolveRoute`, and a row in that exhaustive `Record` implies a route. `fellBack: false`,
`stopReason` from the response, `usage` from `response.usage`, `promptVersion` from the prompt
builders' existing tags.
⚠️ **Rows written before the fix stay absent, so any window spanning it under-reports rather than
lying** — the same property the `usage` and `emDashesRemoved` fields already have.

⚠️ **ALSO FOUND WHILE SWEEPING, NOT ACTED ON: `SynthesisSurface` declares `'validation'` and
NOTHING routes to it.** A dead row in an exhaustive `Record` — harmless today, but it is a surface
name a later reader would reasonably assume is live.

**Claim corrected in five documents** (`R5-synthesis-engine.md` ×2, `architecture/overview.md`,
`architecture/data-model.md`, `server/overview.md`). CLAUDE.md's prose-sanitiser row already named
both funnels correctly and needed no change — it is the one artefact that got this right.

---

## 🆕 REGISTERED BY THE MOTION-SWEEP SESSION, 2026-08-06

### 🔴 `P100` — **§9.2's EMOJI BAN HAS 112 LIVE SITES ACROSS 35 FILES** · ⬜ open · **screens phase**
> **Class:** design-system debt, MEASURED not estimated (over the comment-stripped projection, so
> every one of these is a glyph that actually renders). Surfaced by class 2a's sweep; deliberately
> NOT taken, because converting them is an app-wide icon migration and class 2a was one card.

§9.2 is unambiguous: *"No text glyph and no emoji renders as an icon anywhere in the system,
including the 🔒 sites."* The two sanctioned survivors are `StreakBadge`'s flame and the share-card
branding. Everything else is debt, and it is concentrated in a few shapes:

| shape | examples |
|---|---|
| **section-header pictographs** | `daily.tsx` ×8 · `weekly.tsx` ×5 · `DestinyCard` · `GrowthCard` · `StrengthsList` |
| **category maps** | `LifeAreaCard` · `FocusAreaBadge` · `compatibility` relationship types ×5 · `PalmTypeHeader` elements ×5 |
| **zodiac glyphs** | 🔴 the astrology hub's Big Three and `readings/index` — **these are the yellow and green the owner saw beside the Sun/Moon/Rising labels.** Class 2b collapsed the LABEL hues; the glyph colour is the emoji font's and no token reaches it |
| **empty/error marks** | `ErrorView` · `ErrorBoundary` · `cosmic-report-history` |
| **collapsible row icons** | `face.tsx` ×4 · `palm.tsx` ×4 — passed as an `icon` PROP, so a conversion needs a NAME per row |

⚠️ **`combined.tsx`'s `IconSectionCard` already carries the reason this is not a rename:** the
payload carries no icon name, so a per-section Ionicon is a decision with data behind it.

### ⚠️ `P101` — **THE PLATE'S FIRST PAINT IS NOW 1020ms** · ⬜ open · owner · one line
> **Class:** motion timing. **A consequence of a spec row, not a drift from one** — registered so it
> is judged rather than discovered.

Class 1 moved the screen entrance behind a 300ms arrival clearance. §18.1 requires the plate to be
**sequenced after its host's entrance, never parallel**, so the plate's delay is now
`TRANSITION_CLEARANCE + dur-moderate` = **600**, and at `dur-slow` 420 it finishes at **1020ms**.

- 🟢 **First visit only** — the plate is mount-keyed (deliberately: it is alpha-only by §18.1, and a
  wait on an alpha-only entrance is a wait on nothing being painted, so it must not replay per
  focus). On every later visit it is simply present.
- 🔴 **The lever, if it reads as pop-in, is §18.1's SEQUENCING rule — not the expression.** The
  expression is derived and `motion-arrival-check.js` now asserts the ordering against the host's
  computed landing time, so hand-tuning it would fail the gate.

### ⚠️ `P102` — **`accent-2` AS A SECTION-HEADING COLOUR — UNIFORM, SO NOT A LADDER** · ⬜ open · informational
> **Class:** §16.5. Deliberately outside class 2b, which was *sibling members of one group in
> DIFFERENT hues*.

42 `accent-2` sites survive in 19 files and most are §16.6's legitimate register (Deep Insight,
quotes, continuity, PREMIUM/PLUS markers, auras, report tags). One pattern is worth a ruling rather
than a sweep: **`compatibility/[id].tsx`'s three section headings are ALL iris** — uniform, so the
hue encodes nothing wrong, but §16.5's test still applies (*"is this premium / brand?"*). Same
question for `face.tsx` / `palm.tsx`'s section kickers. **One sentence settles all of them.**

### 🔴 `P103` — **`android:windowBackground` IS A PLATFORM DEFAULT, AND THIS IS THE ONE LAYER THE CODE FIX DID NOT REACH** · ⬜ open · owner · a native config change

> **Class:** cold-start / launch surface. **Registered rather than made, because it is an `app.json`
> change that only a rebuild can verify** — and this session had a device report about a *white*
> flash, so the honest thing is to name every white layer, not just the one it fixed.

**MEASURED, not assumed.** `expo-system-ui` is **not installed** and `app.json` sets **no**
`backgroundColor` — neither top-level nor under `android`. So
`@expo/prebuild-config`'s `withAndroidRootViewBackgroundColor` no-ops:
`getRootViewBackgroundColor()` reads `android.backgroundColor || backgroundColor`, gets `null`, and
`android:windowBackground` is **never assigned on `AppTheme`**.

| layer | ground today |
|---|---|
| the launch window | 🟢 covered — `expo-splash-screen` writes the splash colour into `Theme.App.SplashScreen` |
| the three nested layers in `app/_layout.tsx` | 🟢 the palette's canvas, and 🔴 **NOT redundant** — see below |
| every navigator scene | 🟢 as of this session: `contentStyle` on all six stacks + `sceneStyle` on the tabs |
| 🔴 **`AppTheme`'s own `android:windowBackground`** | 🔴 **the platform default.** Anything that renders *outside* all of the above sees it |

**THE ACTION, if the owner wants it:** add `"backgroundColor": "#100E0D"` to `app.json`'s `expo`
block. It is additive, the prebuild plugin picks it up with no new dependency, and it costs a
rebuild to verify. ⚠️ **Do not pair it with deleting the three layers in `app/_layout.tsx`** — see
below.

### ⚠️ `P104` — **THE THREE BRAND-BACKGROUND LAYERS ARE NOT REDUNDANT. DO NOT "TIDY" THEM.** · ⬜ standing · informational

> **Registered because this session was asked whether the cold-start flash and the tab flash were
> the same root cause, and the answer is NO — so the obvious cleanup is wrong.**

`app/_layout.tsx` wraps the tree in three nested views on the brand canvas plus a deliberate splash
hold. The theme leak this session fixed sits **above** them, inside a mounted navigator scene. The
three layers cover a different hole entirely: the `fontsReady ? … : null` branch and any
`ErrorBoundary` fallback — **frames where the navigator tree does not exist at all**. Same colour,
two unrelated holes, and only one of them has been closed.

### ⚠️ `P105` — **THE ROOT STACK'S `animation: 'fade'` HAS THE SAME OVERLAP WINDOW, ON GROUP CHANGES** · ⬜ open · owner · one line

> **Class:** the same defect class as the tab cross-fade, at a different navigator. **Left alone
> deliberately** — §5.4 row 1 pins it (*"Nothing of ours. Expo Router keeps `animation: 'fade'`"*),
> it shipped in 2.0.0, and §0.0 rule 1 prefers existing behaviour. Named so it is a decision.

**MEASURED in `react-native-screens@4.11.1`:** `rns_fade_in.xml` is alpha 0→1 over 150 ms **and**
`rns_fade_out.xml` is alpha 1→0 over 150 ms — **both** sides fade, so this is a genuine double
exposure, exactly like the tab one. What limits it:

- it fires only on **root-group** moves (`index` → `(auth)` / `(main)` / `(capture)` / `(paywall)`),
  not on ordinary navigation;
- 🟢 **every screen involved is opaque on the palette canvas** (`contentStyle` is set on all six
  stacks), so what composites is two *dark* layouts over dark — a ghost, never a bright smear;
- 🔴 **the one place it is worth a look on a device is the PAYWALL and CAPTURE modals**, which are
  root-level screens: the paywall is the app's one large accent field arriving over e.g. Home.

**The fix, if the owner wants it, is one word per screen** (`animation: 'none'` on those two
`Stack.Screen`s, or on the root). It is not made here because it changes a shipped transition on
the revenue surface.

### 🟢 `P106` — **THE AURA BREATHE IS STILL PERCEPTIBLE AT THE POST-`P71` GROUND. MEASURED, AND IT SURVIVES.** · ⬜ owner call · REPORT ONLY, nothing changed

> **The question asked:** `P71` dropped the wait screen's ground luminance **21.3×** to fix a 2.31:1
> contrast failure, and the breathe animates **opacity** on a wash that is now almost black. Two
> changes from the same phase, possibly working against each other. If the pulse is now invisible it
> is a continuous animation communicating nothing — which is exactly the case the **skeleton shimmer
> was rejected under** — and it should then be **dropped rather than brightened**, because the
> darkness is what fixed the contrast failure.

**MEASURED. The two ends of the cycle, computed over the real stop list** (`accent-muted` = the clay
accent at 14%, element opacity 0.5 ↔ 1.0, composited on the canvas):

| | composited colour | Y | L\* |
|---|---|---|---|
| breathe **LOW** (0.5 × 14% = 7%) | `rgb(30, 23, 18)` | 0.00933 | **8.42** |
| breathe **HIGH** (1.0 × 14% = 14%) | `rgb(44, 32, 23)` | 0.01631 | **13.42** |
| *(for scale: the pre-`P71` slab)* | `rgb(217, 142, 87)` | 0.34786 | *65.58* |

- **ΔY = 0.00698**, i.e. the ground nearly **doubles** in luminance across the cycle (**1.75×**).
- 🟢 **ΔL\* = 5.00.** One L\* unit is roughly one JND for adjacent patches, so this is about **five
  JNDs**. It is subtle; it is **not** below threshold.
- 🟢 **The 8-bit swing is 14 / 9 / 5 code values** in R/G/B — far above the quantisation floor, so
  there is no "it rounds to the same colour" problem either.

🟢 **SO THE ANSWER IS: IT SURVIVES, AND NO ACTION IS RECOMMENDED.** The hypothesis was reasonable and
the measurement refutes it. `P71` made the breathe *much* subtler — the swing used to be against a
ground at L\* 65 — but "subtler" is what a liveness signal on a dark screen should be, and the rule
the shimmer was declined under (*a continuous loop is legitimate only where it communicates ongoing
work*) is satisfied here by the 60-second generation, unchanged.

⚠️ **ONE HONEST QUALIFIER, because a single figure would overstate it:** the wash has **three** stops
(`accent-muted` → transparent → transparent) on a vertical ramp, so **ΔL\* 5.00 is the value at the
TOP EDGE and it falls to 0 by the mid-screen mark.** The pulse is a brightening of the upper band,
not of the whole screen. That is the design (§2's aura pair) and not a defect.

### ⬜ THE WAIT SCREEN'S FOUR LAYERS — a device checklist, since one was measured and the others were not

| # | layer | what to look for |
|---|---|---|
| 1 | the **bar** | grows from the **LEFT** (`transformOrigin: 'left'`, `scaleX`) and **plateaus WITHOUT reaching the end** — 🔴 it must never claim completion. The four legs asymptote at **0.97** and only the server takes it to 1.0 |
| 2 | the **message** | cross-fades (out 220 · a 40 ms beat · in 220) inside a reserved `minHeight: 58` box, so the layout must **not jump** between one- and two-line messages |
| 3 | the **aura** | the breathe above — a slow brightening of the **upper** band on a 2.6 s cycle |
| 4 | the **plate** | fades in **AFTER** the bar. Confirmed by construction: the bar starts at mount with no delay, the plate at **600 ms**, finishing at 1020 (`P101`) |

### ⚠️ `P107` — **`RidgeField` QUALIFIES FOR THE DRAW-IN AND DID NOT GET IT — ONE SUB-DECISION, TWO HALVES** · ⬜ open · owner · one line

> **Class:** design §18's new draw-in row. **Registered rather than guessed**, per §0.0 rule 1.

`ArcDivider` draws itself in; the header ridge does not. It is the same generated path and the same
stroke, so it qualifies technically. Two things block it and **one sentence settles both**:

1. 🔴 **`accentNode` is a FILL with no entrance of its own.** While the two strokes were undrawn, a
   lone accent dot would sit on screen at the crest for the whole 600 ms wait, on every return.
   Giving the dot an entrance is an addition the request did not make.
2. 🔴 **The ridge is an ABSOLUTE SIBLING of the animated safe area**, so unlike the divider it has
   **no host entrance to sequence against** — §15.3's reference instance is simply *present*. A
   draw-in there would be the first *independent* entrance on a §15 primitive, which is precisely
   what §18.1 row 2 rules against in words.

**If the owner wants it:** the cheapest correct shape is to put the crest dot on the same paint
channel (an SVG `opacity` on the node, not a style) so it arrives with the pen. That is a second
channel on the hook and moves one exact gate counter, so it is a small item, not a one-liner.

## 🆕 P108–P111 — THE R9 QA INCIDENT (2026-08-06, session `build27.1-r9-qa-incident`)

> The Premium-Plus Cosmic Report was failing QA for real paying users. Technical detail is in
> `build-27-caveats.md` § "THE R9 QA INCIDENT" (`C-R9-1` … `C-R9-4`). These are the DECISIONS.

### 🔴 `P108` — **RAISE `QA_PAGE_MAX`, OR LOWER THE TARGET, OR TAKE THE TRIM. PICK ONE.** · ⬜ open · owner · **BLOCKING A PAID DELIVERABLE**

Every report ever generated renders to **26 or 27 pages against a 26-page maximum** (`C-R9-1`). This
is not new and nothing in August changed it — the two July reports that shipped were both AT the cap.
🔴 **The next report has roughly a two-in-five chance of failing on this alone.**

Three branches, and they are not equivalent:

| | change | cost | catch |
|---|---|---|---|
| **(a)** | `QA_PAGE_MAX` 26 → 28 | one constant | the product describes an **"18-to-26-page document"** to the model and the prompt says so twice. Raising the gate without raising that copy makes the gate and the spec disagree |
| **(b)** | lower the prompt's word target below 5,500–6,500 | a Sid-gated prompt edit | 🔴 **word count does not order page count** (7351→26pp, 7252→27pp), so this is a weak lever on the actual failure |
| **(c)** | trim 27→26 in the RENDERER (`P109`) | a layout change | the honest fix, and the only one that costs no money per occurrence |

**Recommend (a) + (c):** (a) stops the bleeding this week, (c) removes the class. (b) is the one to
avoid — it is the lever the incident's first hypothesis reached for, and the measurement says it does
not move the number.

### 🔴 `P109` — **A SOFT THRESHOLD SHOULD NOT DISCARD A $1.6 GENERATION** · ⬜ open · owner · small item

A `pageCount` overflow is classed `CONTENT` → re-Fable at full price, for a defect that is one page of
LAYOUT. **$6.19 burned across four generations since 2026-08-05, zero reports delivered.** The
renderer's spacing / margin / page-break levers are deterministic and free. Reclassifying a
`pageCount` overflow as a RENDER-class failure with a reflow pass turns a ~$3.10 discard into a
re-render that costs nothing.

⚠️ **AND A REAL BUG TO FIX WHILE IN THERE:** `costEstimate` is `$set` (overwrite) per generation, so
a re-Fabled report records only its LAST call. **Every spend figure taken from `reports.costEstimate`
is low by the discarded generations.** Not a judgement call — just wrong.

### 🔴 `P110` — **THE FACE QA RULE FIRES ON THE COMPLIANCE STATEMENT ITSELF** · ⬜ open · owner · needs care

`physiognom` in `FACE_TERMS` matches the report's **disclosure that no face photo was provided**
(`C-R9-3`). The scan has no polarity. 🔴 **Do NOT simply delete the term** — it is the right needle
for the failure the rule exists to catch, and the rule guards a Play Store reclassification risk.
Out of scope this session by explicit instruction; registered so it is not "fixed" casually.

### ⚠️ `P111` — **NOTHING BOUNDS "TRY AGAIN" ON THE APP'S MOST EXPENSIVE CALL** · ⬜ open · owner · report-only

A QA-failed report refunds the month's slot (correct) and leaves **no surviving counter**, so retries
are unbounded (`C-R9-4`). 🟢 **The user-facing copy is ACCURATE** — verified in code and in production
data. The question is only whether to cap, and what the user sees at the cap.

## 🆕 P112 — WEB PWA GOOGLE SIGN-IN (2026-08-11)

### 🔴 `P112` — **THE WEB ORIGIN IS NOT AUTHORISED, SO THE GOOGLE BUTTON CANNOT WORK** · ⬜ open · owner · console change + one env var

`e77c1ed` shipped the code and **needs none more**. Two owner steps remain, and the full runbook —
with the failure-mode decode table — is **`docs/GOOGLE_SIGNIN_WEB_SETUP.md`**.

**1 · Cloud Console, project `revelia-497203`.** On the EXISTING web client
(`530984023588-uq36tvq7gbbmrjobh4dc5m995rmpl75o.apps.googleusercontent.com`), add to **Authorized
JavaScript origins**: `https://app.revelia.me` · `https://revelia-web.pages.dev` ·
`http://localhost:8081` · `http://localhost:8093`.
🔴 **Do NOT create a new client.** The server checks `tokenInfo.aud` against
`GOOGLE_OAUTH_WEB_CLIENT_ID` (`auth.service.ts:431`), so a second client ID authenticates with Google
and is then rejected by our own backend. One client, two front ends.
⚠️ No wildcards, so Cloudflare **preview** deploys can never be authorised — test on the custom
domain or localhost.

**2 · `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in the shell that runs `web:deploy`.** The export runs on the
developer's machine, so **the Cloudflare Pages dashboard is the wrong place** and setting it there
does nothing. Locally it goes in `mobile/.env`, and the first export after adding it **must be
`web:export:clear`** — `e77c1ed` recorded the client ID not reaching the bundle until `--clear`.

⚠️ **Also check `GOOGLE_OAUTH_WEB_CLIENT_ID` on the STAGING Railway service** — the web export
currently bakes the staging API (`app.json:109`). Unset does not fail loudly: the guard is
`if (expectedAudience && …)`, so **unset skips the audience check entirely.**

🔴 **This does NOT finish web sign-in on its own.** `https://app.revelia.me` is still absent from the
API's CORS allow-list — measured, `W1-web-pwa.md:41` — so the `POST /api/auth/google` after a
successful Google prompt is blocked by the browser. That is `W1-web-pwa.md:1036`, still open.
**Both must land, or the button fails one step later with a different error.**

## 🆕 P113–P114 — GOOGLE SIGN-IN WEB BUTTON FLOW (2026-08-11, branch `fix/google-signin-web`)

### ⚠️ `P113` — **DEVICE SMOKE OUTSTANDING: `login.tsx`'S GOOGLE BUTTON CHANGED HEIGHT ON ANDROID** · ⬜ open · owner · device smoke

`login.tsx` hand-rolled a `TouchableOpacity` where `signup.tsx`/`welcome.tsx` already rendered the
`Button` primitive. This work (commit `f4d0d6e`) converged all three screens onto a shared
`GoogleSignInButton` that wraps the primitive, so `login.tsx`'s Google button now sits at the
primitive's fixed `lg` height — **the one visible native change in this work.**

No device was available during implementation, so this has `tsc` (clean) and gate coverage
(`Button · adoption` 29 expected / 29 actual / 0 residue, per `primitive-adoption-check.js`'s
contract) but **no runtime proof on Android.** 🔴 **Smoke all three auth screens
(`login`/`signup`/`welcome`) on a device before release** — confirm the button renders at the
correct height/position with no clipping, and that native Google sign-in still completes unchanged
(the native `.ts` fork itself was not touched by this work; only the screens' markup and the shared
wrapper component changed).

⚠️ **Widened 2026-08-11 — height is not the only visible change.** Measured against
`components/ui/Button.tsx`: `login.tsx`'s Google button now renders the `secondary` variant, which
(1) has **no border at all** (`containerStyle` for `secondary` sets no `borderWidth`/`borderColor`,
unlike `outline`) — the old hand-rolled pill's 1px `border-border-strong` outline is gone — and (2)
labels itself in **`t.color.accent`** (gold), not the plain foreground — `secondary`'s `labelColor`
resolves to `onSurfaceLabel` (`= t.color.accent` when enabled), where the old markup used
`text-fg`. **Both still pass AA on the `secondary` fill and neither is a defect** — record them so
whoever runs the smoke expects gold text and a vanished outline instead of reading them as bugs.

### 🔴 `P114` — **`http://localhost:8093` IS NOT ON THE AUTHORISED-ORIGINS LIST — MEASURED, AND IT BLOCKS THE PLAN'S OWN PREMISE FROM BEING VERIFIED** · 🟢 **SUPERSEDED 2026-08-11 — THE OWNER RAN THE PROBE FOR REAL** · owner / console change (cross-ref `P112`)

🟢 **The premise this item was hedging about is now CONFIRMED, by observation, not by the tunnel
workaround this item was tracking.** The owner ran the flow on an authorised origin and reported
three specific things: (1) the "Continue as <name>" confirm dialog appeared **before** sign-in
completed — proving the credential hand-off and `completeGoogleLogin` executed for real, not just
that a popup opened; (2) dismissing the chooser and tapping the button again **reopened it** — the
button-mode-is-exempt-from-cooldown premise, confirmed; (3) sign-in completed end to end. See
`session_handoff.md`'s CURRENT HANDOFF for the full record, including the independent corroboration
from the branch review (FedCM's dismissal embargo applies to passive `prompt()` mode; `renderButton`
drives active mode, which is not embargoed).

🔴 **BUT READ THIS BEFORE TRUSTING IT AS COVERAGE OF WHAT SHIPS NOW: what was verified was the
CREDENTIAL PATH, not a dialog that still exists.** The confirm dialog observed in (1) has since been
**REMOVED by owner decision** (this session, 2026-08-11) — see `.superpowers/sdd/2026-08-11-google-signin-account-reselection/`'s D1 supersede note. The verified fact that survives is that a real
credential reaches `completeGoogleLogin` and completes sign-in on an authorised origin; the dialog
itself is gone. The original hedge text (kept below for the trail) is superseded, not merely
softened — do not carry it forward as an open blocker.

**The original entry follows, superseded:**

Measured directly 2026-08-11, not assumed: loading `http://localhost:8093/login` and watching the
network tab shows `https://accounts.google.com/gsi/button?...` returning **HTTP 403**, with console
`error: [GSI_LOGGER]: The given origin is not allowed for the given client ID.` `P112` already lists
`http://localhost:8093` as one of the four origins to add to the existing web client's Authorized
JavaScript origins — **this measurement confirms it has not been added yet, or has not propagated.**

This blocks two things: **(1)** any real sign-in test on this machine, full stop; **(2)** the design's
own foundational premise (that Google's rendered button is exempt from the One Tap dismissal
cooldown — see `session_handoff.md`'s CURRENT HANDOFF), which needs a real FedCM engagement with a
signed-in Google account to observe, and FedCM cannot engage on a rejected origin at all — a popup
opening on a rejected origin is a different, unrelated code path and proves nothing about the
premise.

⚠️ **New measurement, same session:** the Cloudflare quick-tunnel already running for browser
testing (`https://revolution-shared-ivory-human.trycloudflare.com`, `cloudflared tunnel --url
http://localhost:8093`) does **NOT** show this rejection — the identical `/gsi/button` request
returns 200 with no origin-error console line, on all three auth routes. Cloud Console was not
inspected to confirm why; this is not proof the tunnel host is formally authorised, and the hostname
is **ephemeral** (a new random subdomain is issued every time the tunnel process restarts), so it can
never be added to the list permanently and is not a substitute for fixing `localhost:8093`. But **if
a signed-in Google test account becomes available while this specific tunnel process is still
running, the premise probe is worth trying against it before doing a Cloud Console round-trip.**
**If phone testing over that tunnel is wanted going forward, its (ephemeral) host still needs adding
per visit — same rule as any other unauthorised origin.**

## 🆕 P115 — ORPHANED GOOGLE ACCOUNTS, A KNOWN CONSEQUENCE OF REMOVING THE CONFIRM DIALOG (2026-08-11, branch `fix/google-signin-web`)

### ⚠️ `P115` — **NO CLEANUP PATH FOR A MIS-TAPPED GOOGLE SIGN-IN'S STRAY ACCOUNT** · ⬜ open · owner + eng · needs a server endpoint, out of scope for this branch

**Cause.** This session removed the "Continue as <name>" confirm dialog by owner decision (see the
D1 supersede note in `.superpowers/sdd/2026-08-11-google-signin-account-reselection/`'s design doc,
and `session_handoff.md`). The dialog existed specifically because the server does `User.create` on
a first Google sign-in (`auth.service.ts`'s `loginWithGoogle`) — without it, a mis-tapped account in
Google's chooser does not just sign the user in wrong, it creates a whole stray Revelia account
(profile, subscription state, the lot). Removing the confirm makes that create unconditional on any
credential Google hands back.

**What replaces it.** A working back button on `/birth-data` (this session's Part 2): pressing it
signs out (`useAuthStore().logout()`), clears Google's auto-select (`signOutGoogle()`), and returns
to `welcome`. This makes a mis-tap **recoverable** — the user can sign in again as themselves — but
it does **not** delete the stray account that the mis-tap already created. The owner was told this
explicitly and accepted the trade (recoverable-after beats gated-before), so this is not a defect in
that decision — it is the disclosed cost of it, recorded so it does not get silently rediscovered
later as a data-hygiene surprise.

**What's needed to actually clean these up, none of it built here:**
1. A server endpoint that can delete a user + its `UserProfile` (and anything else `User.create`
   fans out to for a Google signup) — there is currently no such route for a self-service or
   admin-triggered delete of an *abandoned* account specifically.
2. A definition of "empty"/"abandoned" — e.g. `authProvider: 'google'`, no `birthData`, no readings,
   created-but-never-returned-to. Get this wrong in either direction and it either deletes accounts
   someone is mid-onboarding on, or never fires for the accounts it exists for.
3. A decision on trigger: a cron sweep, an on-demand admin action, or something client-triggered from
   the same back-button moment that creates the recovery path in the first place.

None of that is in scope for this branch. Recorded here as a known, accepted consequence with its
cause — not a bug to chase, but do not let it get lost either.

> ## 🔴 ▶ **NEXT FREE P-NUMBER: P116.**
