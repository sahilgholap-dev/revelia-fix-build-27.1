# CLAUDE.md — Revelia

> **Start every session by reading `tracking_files/session_handoff.md` for current state and next steps.**
> **Before any deploy / internal-testing cut / prod ship / promote, walk `tracking_files/owner-actions.md`** — the durable owner-action checklist (things the handoff would lose because it's overwritten each session).

## What is Revelia

AI mystical reading app — face reading, palm reading, astrology, numerology, compatibility, **Q&A chat with a deterministic Timing Engine, and a Premium-Plus Cosmic Report PDF** — powered by Claude Vision + Anthropic API. Subscriptions via RevenueCat (Free / Premium / Premium Plus / Lifetime). Push notifications via OneSignal.

**Current state**: Build 27 / **v2.0.0 is live on Play Store production** (merged to `main`, 2026-07-27). Active branch `fix/build-27.1` for 2.0.x point releases; feature-scale work opens `feature/build-28`.

## Monorepo structure

```
revelia/
├── mobile/           # React Native + Expo SDK 53, Expo Router, NativeWind, Zustand
│   ├── app/          # File-based routes (Expo Router)
│   ├── components/   # Shared UI components (ShareCard, etc.)
│   ├── store/        # Zustand stores — authStore, subscriptionStore, readingsStore
│   ├── lib/          # SDK wrappers — onesignal.ts, revenuecat.ts, googleSignIn.ts, api.ts
│   ├── hooks/        # Custom React hooks
│   └── utils/        # Pure utilities — shareReading.ts, etc.
├── server/
│   └── src/
│       ├── controllers/  # Express route handlers
│       ├── services/     # Business logic — claude.service.ts, auth.service.ts
│       ├── models/       # Mongoose models — User.ts, etc.
│       ├── middleware/   # Rate limiting, error handling
│       ├── routes/       # Route definitions
│       └── jobs/         # Cron/scheduler — pushScheduler.ts
├── packages/         # Shared TypeScript types (monorepo workspace)
├── docs/             # Reference docs — some entries stale, verify against code
└── tracking_files/   # Session handoff + progress log — authoritative current state
```

## Key commands

```sh
# TypeScript check — run after every code change
cd mobile && npx tsc --noEmit
cd server && npx tsc --noEmit

# EAS builds
cd mobile && eas build --platform android --profile preview     # APK — internal testing
cd mobile && eas build --platform android --profile production  # AAB — Play Store

# Local server dev
cd server && npm run dev
```

EAS profiles: `preview` = APK for testing, `production` = AAB for Play Store. `autoIncrement: true` is set in the production profile — versionCode auto-increments per build.

## Auth patterns

All three login paths (email/OTP, Apple, Google) live in `mobile/store/authStore.ts`.

Every login path must call:
- `loginOneSignalUser(user._id)` — registers external_id for push targeting
- `identifyUser(user._id)` — RevenueCat user identification

Logout must call `logoutOneSignalUser()` + `logoutRevenueCat()`.

`checkAuth()` (app launch restore) also calls `loginOneSignalUser` — required so returning users are reachable by the scheduler.

## Permanent gotchas

### OneSignal
- `app.json` plugin must be `onesignal-expo-plugin` — NOT `react-native-onesignal` directly. v5.4.5 has no CJS-compatible plugin entry; the wrapper is required.
- `newArchEnabled: true` in `app.json` is required for OneSignal v5 TurboModule. Do not revert.
- REST API: `https://api.onesignal.com/notifications`, auth header is `Authorization: Key <token>` — NOT `Basic`.
- Correct export names from `mobile/lib/onesignal.ts`: `loginOneSignalUser`, `logoutOneSignalUser` (not the shorter `loginOneSignal`/`logoutOneSignal`).
- **FCM is what actually delivers Android push** (OneSignal is just the orchestration layer). Two pieces are BOTH required: (1) Firebase **service-account JSON** uploaded to OneSignal → Settings → Platforms → Google Android (FCM v1); (2) committed `google-services.json` baked into the build. Firebase lives in GCP project `revelia-497203`. The OAuth Web Client ID (Google Sign-In) is UNRELATED to push — Google Sign-In working does NOT mean FCM is configured. Symptom of missing FCM: subscriptions show "Unsubscribed / no push token" or "Invalid Google Project Number" while sends still report success. (Root-caused & fixed 2026-06-24.)

### Environment variable names
| Variable | Location | Correct name |
|---|---|---|
| Google OAuth Web Client ID | Mobile EAS / `.env` | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| Google OAuth Web Client ID | Server Railway | `GOOGLE_OAUTH_WEB_CLIENT_ID` |
| OneSignal REST API key | Server | `ONESIGNAL_REST_API_KEY` (NOT `ONESIGNAL_API_KEY`) |
| RevenueCat Android key | Mobile EAS | `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` |
| Fable 5 synthesis flag (R5) | Server Railway | `SYNTHESIS_FABLE_ENABLED` — **code default OFF** (unset/anything ≠ `true`), but **⚠️ the PROD VALUE is `true` as of 2026-07-27** — production runs Fable 5. OFF → R5 marquee surfaces (monthly-premium/compat-premium/career/weekly) run the guaranteed `claude-opus-4-8` path (NO Fable 5). `true` → they run `claude-fable-5` with server-side `fallbacks` to Opus 4.8 for policy declines. This flag is the AVAILABILITY/retention resilience layer; the server-side `fallbacks` beta is the POLICY-decline layer only — do NOT conflate. Owner/org gates settled by the R5 step-1 probe (2026-07-09: both PASS). Single-source: `server/src/services/synthesis-routing.ts`. |
| Timing rule set (R7) | Server Railway + private R2 | `R2_TIMING_*` (endpoint/account, key, secret, bucket `revelia-timing`). **The rule set itself is GITIGNORED and loaded from R2 at runtime** — it does NOT ride a git deploy. Any amendment = commit the engine **AND** re-upload `rule-set.json` to the bucket, or the new engine runs the old rules while local `npm run test:timing` is green. Confirm via the boot-log byte count. |
| Per-device free-DI gate (R7 D5) | Server Railway | `QA_DEVICE_SALT` — a high-entropy server-only secret. **Unset ⇒ the gate FAILS OPEN silently-ish** (it warns at boot and logs `salt_unset` per ask, since `de17e22`) and free Fable-5 Deep Insight is farmable across accounts on one device. Set on prod 2026-07-27. |
| Report worker (R9) | Server Railway | `REPORT_WORKER_ENABLED` — **code default OFF**; **prod value `true` as of 2026-07-27.** OFF ⇒ queued reports are never claimed (and the free rebuild route accepts but never re-renders). |
| Model-prose clean-up | Server Railway | `PROSE_SANITIZER_ENABLED` — 🔴 **code default ON, which is the OPPOSITE of the two rows above.** They are `=== 'true'` (default OFF); this is `!== 'false'` (default OFF only when the value is the exact string `false`). Set it to `false` to disable without a code change; unset leaves it ON. It replaces em-dashes in MODEL OUTPUT with commas at two shared funnels (`extractAndSanitise` in `synthesis-routing.ts` for the 9 routed surfaces, and `parseClaudeJSON` in `claude.service.ts`, **which is the only coverage face and palm get** because those two are direct Vision calls that never touch the routing helper). Idempotent; never touches the en-dash; assert with `npm run check:prose`. |

### Build / native
- `google-services.json` is intentionally committed to git (removed from both `.gitignore` files). Required for FCM/EAS cloud builds — EAS only uploads git-tracked files, so re-ignoring it silently breaks push delivery in the next build. Do NOT re-add to gitignore.
- `react-native-purchases` (RevenueCat) has no `codegenConfig` — uses RN 0.79 old-arch interop layer. Expected and working; do not treat as a bug.
- Rate limiting middleware uses `ipKeyGenerator(req.ip ?? '')` — not `req.ip` directly. Required for express-rate-limit v7+.
- `app.set('trust proxy', 1)` in `server/src/app.ts` is required for Railway. Without it, `req.ip` resolves to Railway's internal proxy IP and rate limiting breaks.

### Subscription tiers
- `SubscriptionTier` type lives in `mobile/lib/constants.ts` — not a shared package type.
- `getEffectiveTier(user)` in `server/src/utils/subscriptionTier.ts` returns `user.subscription.tier` for all regular users (comp field is optional; if undefined the if-block is skipped entirely).

### Email — SendGrid tracking vs signed/presigned URLs (do not "fix" naively)
- **SendGrid click/open tracking REWRITES `<a href>` links** into a `url*.revelia.me/ls/click?...` redirect (that tracking subdomain is NXDOMAIN — never configured) AND the rewrite can **corrupt a presigned/one-time URL's query-string signature**. So any transactional email carrying a signed/one-time URL (R9 report-ready email; any future R8 export link) MUST be sent with tracking OFF. **Do this PER-SEND, never by changing the global SendGrid account setting.**
- Mechanism (`server/src/services/email.service.ts`): `EmailOptions` has an optional `trackingSettings?` field spread into `sgMail.send({...})` **only when present**; `sendReportEmail` sets `{ clickTracking:{ enable:false, enableText:false }, openTracking:{ enable:false } }`. OTP/welcome/reset sends omit the field → no `trackingSettings` key → SendGrid account default → byte-identical, unchanged. Keep the blast radius to the send(s) that actually carry a signed URL — do NOT add `trackingSettings` to the plain-text OTP/welcome sends.

### 🔴 A COMMENT IS SOURCE. Every text-based tool in this pipeline reads comments as code. (added 2026-07-31, Build 27.1 pass 2b)

**Never write a class-like or token-like string inside a comment.** Not in `.ts`, not in `.tsx`,
not in `tailwind.config.js`, not in a doc-comment. Use a form the tools cannot harvest.

**This is structural, not a curiosity. It bit FOUR TIMES in a single session**, across three
independent tools, and it will bite again in the primitives and screens phases:

| tool | what it does | what it did |
|---|---|---|
| `scripts/token-gate.sh` (14 named greps) | searches source text | an explanatory comment tripped **`no-numeric-fontsize`**, then **`no-variable-fontsize`**, then **`no-bare-overline`** — three separate rules, three rewordings |
| `scripts/resolve-utilities.js --members` | reads every `className` the source writes | a class named only in prose still counts as written |
| 🔴 **Tailwind's content scanner** | **a regex over raw files** | harvested `text-` + the eyebrow step out of a comment in `app/(main)/_layout.tsx` and **emitted a live rule with ZERO call sites**, moving the pass's `--diff` from **13 to 14** |

🔴 **THE TAILWIND ONE IS THE SERIOUS ONE, and it is `O-28`'s mechanism reached from the opposite
direction.** O-28 was found because Tailwind harvested a step name out of a **string literal**
(`t.type['text-2xs']`) and emitted rules nobody had written. A comment does the same thing. The
scanner has no parser — it does not know what a comment is — so *anything that looks like a class
name, anywhere in a file matched by the `content` globs, becomes a real rule.*

**The rule, and the workaround is one character of thought:**

- ❌ `// the eyebrow step is text-overline 11` — harvested; emits a live rule
- ✅ `// the eyebrow step is t.type['overline'] 11` — a token lookup, harvested harmlessly (it
  already exists) and **also** discarded by `no-bare-overline`'s legal branch. One spelling
  satisfies every tool.
- ❌ `// fontSize: 14 here was off-step` — counted by `no-numeric-fontsize`
- ✅ `// the raw numeric size here was off-step`
- 🔴 **❌ `// the splash is #0F0A1A` — counted by `no-raw-hex`. ✅ `// the splash is the brand-background
  colour`, or name the constant (`BRAND_BG`).** ⚠️ **This is the FIFTH instance, and it bit ONE SESSION
  after this rule was written into this file — in the comment explaining the font install.** The
  workaround as first written covered only *class-like* strings; **it covers every literal any gate
  greps for, and hex is the biggest such ledger in the project.** The test is not "is this a class
  name?" but **"would any of the seventeen named rules match this line if it were code?"**

🟢 **AND NOTE WHICH LAYER CAUGHT IT: layer 3, `resolve-utilities.js --diff`.** Nothing else could.
`tsc` is clean, every grep is clean, the app renders identically, and the emitted rule has no call
sites — the *only* visible symptom was the moved-rule count going 13 → 14 between two snapshots.
**That is the standing argument for running `--diff` on every batch that touches
`tailwind.config.js` or `theme.js`** (codemod-plan §3.0.2.0 class 4): it compares the RESOLVED RULE
SET rather than searching source, so it is the one layer that sees a rule appear from nowhere.
🔴 **WIDEN THAT: RUN `--diff` ON EVERY BATCH THAT ADDS PROSE TO A FILE UNDER A CONTENT GLOB.** By
Build 27.1's item-13 batch it had been the only witness **thirteen times**, several of them on
comments written *about* this hazard.

### 🔴 A PRINTED COUNT IS NOT A CHECKED COUNT (`O-67`; named 2026-08-04)

> **ANY NUMBER A GATE PRINTS MUST ALSO BE A NUMBER IT ASSERTS.** A printed count and a checked count
> read *identically* in terminal output and in a commit body, so an unasserted number is worse than
> no number: it looks like evidence.

**It has fired four times, each in a different field, and every instance was found by a defect
injection rather than by reading the code:**

| what printed | what it missed |
|---|---|
| a per-primitive **site count** | breaking 1 of `palm.tsx`'s 10 lock sites left the contract reading `11/11/0` — the file still adopted nine more |
| a **presence** assertion on a literal | X20 is **two** identical `height: 56` declarations; deleting one kept the assertion green. Same for the plate stroke floor, which is **ten** identical literals — changing one plate's stroke passed |
| the **A5 pair** resolver's pair count | a four-stage style-graph walk that breaks returns **zero pairs**, which printed as `0 pairs, 0 violating` and read as a pass — a guard that silently opens |
| a **census** over raw source | see the comment table below: an inexact census is satisfiable by its own documentation |

**The fixes are `siteCounts`, `literalCounts`, a nonzero FLOOR on the resolver, and `exact` on every
census** — all in `mobile/scripts/primitive-adoption-check.js`. ⚠️ **Choose the SHAPE deliberately: a
floor for a DISCOVERY number that legitimately moves both ways (the pair count fell 17 → 16 when a
fill correctly moved into a primitive), an exact count for an INVARIANT. An exact assertion on a
discovery number cries wolf on correct work, and that is how `no-white-on-accent` was demoted.**

🔴 **AND THE SAME DISCIPLINE APPLIES TO A DEFECT-INJECTION HARNESS: reading the gate's EXIT CODE is
not reading its REASON.** One run this session was invalid from case 11 onward because an `exact`
census had already turned the baseline red, so every later "CAUGHT" was the stale count rather than
the injected defect. **Assert a green baseline before each case and grep the output for the specific
finding that case was written for.** Re-validated that way, four batches ran 21 / 13 / 21 / 22 cases
with zero incorrect results — and three of those cases were themselves findings.

#### 🔴 IT CUTS **THREE** WAYS, AND ONLY THE FIRST ONE IS SAFE (`O-54`, `O-68`; added 2026-08-03)

**The direction above — prose ADDS something and a rule FAILS — is the loud one, and it is
self-correcting: someone rewords a sentence and moves on. The other two are not.**

| direction | what prose does | how it fails | safety |
|---|---|---|---|
| **1 · ADDS** | emits a rule, or matches a grep | the gate **BLOCKS** | 🟢 loud, self-announcing, harmless |
| **2 · SATISFIES** | a header comment spells the very literal a *presence* assertion looks for | the assertion is met **BY THE PARAGRAPH DESCRIBING IT, FOREVER** | 🔴 **SILENT. A guard that quietly opens** |
| **3 · MOVES A COUNT** | a comment naming a token is counted by that token's **census** | depends entirely on the census's **shape** | 🔴 **either direction, and `nonzero` hides it** |

🔴 **DIRECTION 2 IS THE FIRST TIME A RULE WAS DISARMED BY SOMETHING THAT IS NOT CODE.** Measured at
item 6: deleting `accessibilityRole` from the disclaimer's JSX left the gate **exiting 0**, because
the comment above it named the prop. All 16 literal assertions were exposed. 🟢 **Fixed
structurally — `primitive-adoption-check.js`'s `literals` half now reads the module with COMMENTS
BLANKED.** ⚠️ **`absent` and `treeAbsent` stay TEXT-LEVEL and the asymmetry is deliberate**: there
the prose direction fails loudly, and a comment naming a retired thing genuinely *is* a reason to
reword the comment. **Do not "make them consistent."** ⚠️ **Corollary: a presence assertion can
never assert an in-file MARKER, because a marker IS a comment.**

🔴 **DIRECTION 3 IS DIRECTION 2 WEARING A NUMBER.** Measured at item 13: naming the lock token in
`LockShell`'s own header **inflated that token's census by one**. Under `exact` it failed loudly;
under `nonzero` — which is what the entry was nearly written as — **the comment alone would have
satisfied it, and the plate could have grounded on the wrong token with the gate green.**
**So: an inexact census over raw source is satisfiable by its own documentation.** Read code only,
or assert an exact number.

#### 🔴 THERE IS NO SAFE-WORD LIST. THE RULE IS `--diff`. (`O-69`; owner-ruled 2026-08-04)

**A safe-word list used to live here** — words said "not to resolve today", offered as evidence that
writing them in prose was harmless. 🔴 **IT IS DELETED, AND EXTENDING IT WAS THE WRONG FIX.** The
inversion is the whole point:

> 🔴 **A WORD'S ABSENCE FROM THE RESOLVED SET IS NOT EVIDENCE THAT WRITING IT IS SAFE — IT IS THE
> PRECONDITION FOR WRITING IT BEING UNSAFE.** Tailwind emits a rule *because you wrote it.* A word
> already in the set is harmless; the rule exists either way. **The absent one is the one that
> creates a rule.**

**So a denylist cannot work, and an incomplete one is worse than none — it implies the words not on
it are safe.** The list that was here named six words as inert; measured against the live config,
all six resolve the moment they are written.

> ### 🔴 THE WHOLE RULE, AND IT IS ONE LINE
> **RUN `node scripts/resolve-utilities.js` AND `--diff` AFTER ANY BATCH THAT ADDS PROSE TO A FILE
> UNDER A CONTENT GLOB. Nothing else can see a rule appear from nowhere.** Do not reason about which
> words are safe; do not keep a list; do not probe a candidate set and trust the result tomorrow.
> **Twenty-two instances of this hazard are on record and `--diff` is the only instrument that has
> ever caught the emitting direction.** Instance 16 was the bare word `table` inside the phrase *"this
> plan's item table"*, which emitted a live rule with zero call sites and moved the count 200 → 201.

⚠️ **Three sub-cases where `--diff` is not enough, because the hazard is a GREP rather than the
scanner. All three cost extra rewordings and all three are loud:**

- a rule whose pattern is a **bare token flags its own name**, so the sentence explaining the block
  re-triggers it. **There is no spelling that satisfies every tool — do not use the word.** Instances
  19 and 20 were a `StyleSheet` key named after the overlay token (a permanent invariant 0 → 5, three
  of the five hits inside the paragraph explaining why the bare form is illegal) and the bare radius
  word in a sentence about corners (0 → 1, and a tree-wide grep confirmed it was the only hit).
- an assertion that scans raw source for a **superseded JSX element** harvests that element out of
  the comment documenting the migration, so the file completing the migration reports it incomplete.
- a **text-level `absent` assertion** matches the prose that explains why the thing must not exist.
  That asymmetry is deliberate (see the table above) — reword the comment, never the rule.

### 🔴 A CHECK THAT **RE-DERIVES** TESTS THE RE-DERIVATION (`O-115`; owner-ruled 2026-08-06)

> **ANY CHECK THAT RE-DERIVES ITS SUBJECT'S LOGIC INSTEAD OF INVOKING IT IS MEASURING THE COPY, AND
> IT REPORTS THAT AS A PASS.** It is the third member of the family: *a printed count is not a
> checked count* (`O-67`) · *does it fail?* — a rule you have not seen fail is a rule you have not
> tested · and now *does it CALL the thing?*

**The instance, and it is the most expensive shape on this page because it looks like coverage.**
`nameUpdateRateLimit.smoke.ts` carried a local `decide()` that hand-copied the middleware's logic.
The middleware read `subscription.tier` directly instead of `getEffectiveTier(user)`; the test
reproduced **the same wrong line**; the two agreed with each other. 🔴 **Nine cases, all green,
through THREE separate occurrences of the comp-tier bug.** The test was never looking at the code
that runs.

**It generalises past tests.** Any instrument that re-states a rule rather than executing it has
this shape — a fixture that recomputes an expected value with the same formula, a gate that
re-implements a resolver to predict what it would return, a doc that restates an invariant the code
also states. **Two copies of one rule do not check each other; they agree.**

🟢 **THE REPAIR, in order of preference:**

1. **IMPORT AND INVOKE.** Stub only the outside world (the DB, the clock, the network), never the
   logic. `qa-device-gate.check.ts` is the reference: it calls the real `enforceQaCaps` and stubs
   two Mongoose statics.
2. **INVOKE THE HALF YOU CAN AND LABEL THE REST**, in the file, in those words. The tier half of
   `decide()` now calls the real resolver; the windowing half is still a copy and the header says
   so. **A test that admits which half it copies is worth keeping; one that does not is worse than
   none**, because it is read as coverage.
3. **PREFER A GATE OVER A TEST WHERE THE CLASS IS STRUCTURAL.** `effective-tier.check.ts` makes
   every direct read a declared one, which reaches sites no test covers at all.

⚠️ **A SOURCE-LEVEL CHECK IS NOT AUTOMATICALLY THIS DEFECT** — most of the gates in `mobile/scripts/`
correctly scan text because *text is the subject*. The defect is re-implementing BEHAVIOUR. The test
is: *if the subject changed, would this check still pass?*
⚠️ **AND WATCH FOR THE HYBRID'S HONEST SEAM.** Where a claim genuinely cannot be invoked — "the cap
is enforced BEFORE the model is called" needs a live request — a source scan is the right instrument
and must say which claim it is standing in for.

🟢 **SWEPT 2026-08-06, and `decide()` was the only instance.** `check-prose-sanitiser` ·
`qa-prompt-invariants` · `qa-router-fixtures` · `timing-fixtures` · `nameValidation.smoke` ·
`ai-generation-log` all import and invoke their subject; `qa-device-gate` invokes and scans source
only for the ordering claim; `alpha-callsite-check` and `family-arrival-check` load the real
`theme.js`; `resolve-utilities` resolves the real config.

### 🔴 A PROMPT'S DIRECTIVES ARE BEHAVIOUR, NOT PROSE (`O-116`; owner-ruled 2026-08-06)

> **PUNCTUATION EDITS TO INSTRUCTIONS THAT DECIDE COMPLIANCE, SAFETY OR STRUCTURE ARE BEHAVIOURAL
> CHANGES AND MUST NOT RIDE A STYLE SWEEP. Only a prompt's own PROSE EXAMPLES may be style-edited.**

**A prompt file is two different documents wearing one extension.** Its EXAMPLES are prose the model
imitates — editing those is the whole point of a style sweep. Its DIRECTIVES are the program. A
comma where a sentence break was is a rewrite of the program, and there is no test runner here that
can tell you what it did.

🔴 **IT NOW HAS TWO INSTANCES, AND THE FIRST ONE GOT IT RIGHT FOR A REASON THE SECOND DID NOT
INHERIT:**

| | prompt | ruling | outcome |
|---|---|---|---|
| **1** | the **crisis-routing classifier** (`P93`) | 9 em-dashes **LEFT ALONE** — "rewriting the punctuation of instructions that decide *is this suicidal ideation?* is a behavioural change on the safety path" | 🟢 correct |
| **2** | the **R9 report prompt** (`P92`, commit `61fd46c`) | 7 sentence-break em-dashes **EDITED** | 🔴 **the same category, opposite call** |

**R9's directives include the NO-FACE RULE, which exists because face content is a Play Store
reclassification risk. That is a compliance path.** The reasoning that protected one was not applied
to the other, and the difference between them was never argued — it was simply that one prompt had
been *named* a safety path and the other had not.

⚠️ **THE TEST IS NOT "IS THIS A SAFETY PROMPT?" — it is "does this sentence DECIDE something?"** A
directive that gates output, selects a mode, bounds a length, or forbids a category is behaviour
whatever surface it serves. `61fd46c`'s own selection rule proves the boundary is knowable: it
correctly left 12 STRUCTURAL uses (table cells, headings, definition lists) because none of them
joined a sentence. **The same discrimination applied one level up — directive versus example — would
have left all 19.**

🟢 **REVERTED 2026-08-06** (`70594da`, server-only). ⚠️ **AND THE HONEST POSTSCRIPT, which is the
reusable half: the revert was NOT the fix.** The incident that triggered it — R9 reports failing QA
at 27 pages against a 26-page cap — was **measured to a deploy boundary that predates both prompt
changes** (`ai_generations.emDashesRemoved` is absent on the failing Aug-5 row and present on the
Aug-6 rows, so the first failure ran on pre-sweep code). Word count did not move: 7223 / 7351 / 7252
/ 7098 before, 7290 after. 🔴 **So this rule is right on its own merits and was reached through a
wrong diagnosis.** Both halves are worth keeping: *a prompt's directives are behaviour*, AND *a
plausible cause that arrives at the same time as a failure is still only a coincidence until a
boundary is measured* (`O-99`).

### 🔴 `Text.defaultProps` DOES NOTHING. React 19 removed it for function components. (added 2026-07-31, Build 27.1 pass 4)

**Every "set a global default for all `<Text>`" recipe on the internet uses
`Text.defaultProps = {...}`. On this stack that line is a SILENT NO-OP.** React 19.0.0 resolves
`defaultProps` for **class components only**; RN 0.79.6's `Text` (and `TextInput`) are
`React.forwardRef(...)`. Verified in the installed renderer, not recalled: the merge is
`resolveClassComponentProps()` in
`react-native/Libraries/Renderer/implementations/ReactFabric-dev.js`, every one of its call sites is
reached only through `shouldConstruct(type)`, and `updateForwardRef()` hands props straight to
`renderWithHooks` with no merge at all.

**No error. No warning. No build signal.** The property is assigned and nothing ever reads it.

🔴 **This mattered because two shipped design documents specified exactly that line** for the
app-wide font-scaling freeze — so a release could have carried the "fix", passed every gate, and
frozen nothing. The failure would have surfaced as a low-vision user noticing scaling still worked,
which nobody would ever file as a bug.

**The working mechanism, and the only writable seam: wrap the forwardRef's `render`.** It lives in
**`mobile/lib/textDefaults.ts`**, called at **module scope** from `app/_layout.tsx`, and it carries
BOTH app-wide text defaults — the **font family** and the **scaling freeze**.

- **Module scope, not an effect.** Effects run after the first render, and a `<Text>` that has already
  mounted does not re-resolve its typeface.
- **It must never throw** (a module-scope throw runs at import, before React mounts, where the root
  ErrorBoundary cannot see it and the app dies white). It logs loudly and returns a boolean instead.
- 🔴 **Two orderings inside the wrapper are load-bearing, in OPPOSITE directions**, and both are
  commented at the site. `allowFontScaling` is spread **before** `...props` so an explicit prop wins
  — that is what keeps the per-site scaling opt-ins alive. The default style goes **first in the style
  array** so a per-site `fontFamily` wins — that is what keeps `@expo/vector-icons` rendering icons,
  since `createIconSet` pushes its own family into `props.style`.
- **Why a global default is mandatory rather than convenient:** of 1,118 `<Text>` nodes in
  `app`+`components`, only 328 name a family utility and 198 more get one from `txt()`. A Tailwind
  size utility **cannot** carry a family, so the other 592 are unreachable from the config. Without
  the default, half the app renders in the system font while every gate reads green.
- **`token-gate.sh`'s `text-defaults-installed` is the only instrument that can see this** — it is an
  existence check, not a grep over source, because the property cannot be expressed as one.
  ⚠️ **Re-verify after any React Native upgrade.**

### 🔴 A SIZE UTILITY CARRIES NO FAMILY — so on a serif step the family utility IS the face (added 2026-07-31, Build 27.1 pass 5)

**Tailwind's `fontSize` plugin honours only `lineHeight`, `letterSpacing` and `fontWeight`. A family
cannot ride a size utility.** So on the className path, **the family utility written at the site is the
only thing that decides the typeface**:

- ❌ `className="text-display-lg font-body-bold"` → **Figtree Bold.** The step's Literata never arrives.
- ✅ `className="text-display-lg font-display"` → Literata Bold.
- ✅ `className="text-display-lg"` (no family) → the global body default. **Legal only for emoji**, where
  the step is a dimension and the face is the emoji font anyway.

🔴 **This was live across the whole app until pass 5: `font-display` had ZERO CALL SITES and 23 of the
25 `text-display-lg` classNames carried `font-body-bold`.** Every screen H1, the paywall hero, the
user's own name on Home and every archetype name rendered in the body face. `no-fontweight` was 0,
`--diff` clean, `--members` clean, `tsc` clean — a *removal* gate cannot see a wrong *arrival*.

**The rule differs between the two authoring paths and both directions are correct:**

| a display / quote step … | action |
|---|---|
| in an **inline** style with a `t.txt(step)` spread | **DELETE** any explicit `fontFamily` — the spread already carries the step's face |
| in a **className** | **REPLACE** the family utility with `font-display` / `font-quote` — deleting drops the site onto the global body default |

`mobile/scripts/family-arrival-check.js` now gates **both** halves. ⚠️ Its className rank check
(*"a body step naming a lighter family than the ramp's default"*) is **report-only, permanently** — 19
sites do it deliberately and failing on them makes the rule cry wolf.

### 🔴 THE VELLUM FLIP HAS LANDED — branch on a token's ROLE, never its VALUE (added 2026-07-31, Build 27.1 pass 5)

`mobile/theme.js`'s `color` and `chart` objects carry **Vellum** from Build 27.1 pass 5 onward. The old
palette is recorded only in the trailing comment beside each value. 🔴 **Do not re-add a "held" column
or a staging flag** — the hold existed to make passes 1–4 reviewable, and a second live palette in that
file is the `lib/colors.ts` failure mode rebuilt from scratch.

🔴 **The flip SWAPPED WHICH TOKENS ARE `rgba()`, so any code that inspects a token's value shape is now
wrong in a new direction:**

| token | passes 1–4 | now |
|---|---|---|
| `border-subtle` · `border-strong` | solid hex | **`rgba()`** |
| `surface-raised` · `surface-overlay` · `locked` | `rgba()` | **solid hex** |

`theme.alpha()` must reject the six tokens that carry their own alpha in *either* palette, and it does
so **by ROLE** (`ALPHA_DENIED` + a reverse lookup), not by matching `#RRGGBB`. **Measured: a
value-shaped guard would have STOPPED throwing on `surface-raised`/`surface-overlay`/`locked` at the
flip** — a guard that silently opens, which is worse than one that loudly closes. `alpha()` never
multiplies; it replaces, and `pct` must sit on Tailwind's 5-step opacity scale.
⚠️ **`bg` and `scrim` now hold the SAME value (`#100E0D`).** Harmless — but **adding `bg` to
`ALPHA_DENIED` would make every inline scrim throw at import**, and 17 of them live inside
`StyleSheet.create`, i.e. module scope, where a throw dies white before the ErrorBoundary exists.
`mobile/scripts/alpha-callsite-check.js` invokes all 120 call sites and is the only instrument that can
see this.

**`npm run gate` now BLOCKS** (`.githooks/pre-push`, pass 5). Escape hatch is `GATE_LENIENT=1 git push`
— use it rather than `--no-verify`, because it leaves a trace. Two counters print as ⬜ **PENDING**
(177 legacy radii → pass 3b, 6 dead spacing classes → pass 3a); those are a debt with a named debtor,
not a floor, and they convert back to blocking when their pass lands.

### Fonts — five static faces, runtime `useFonts` only (added 2026-07-31, Build 27.1 pass 4)

- `mobile/assets/fonts/` holds **five static TTFs** (455 KB) + both OFL licences.
  **`mobile/assets/fonts/README.md` is the provenance record** and the reproducible subset command.
- 🔴 **The `useFonts` keys in `app/_layout.tsx` and the values in `theme.js`'s `family` object are ONE
  CONTRACT and must stay byte-identical.** Change one without the other and every affected site falls
  back to the system font *silently*. Grep both together; they are one edit.
- 🔴 **NEVER add `expo-font` to `app.json`'s `plugins` array**, and reject it if an `expo install` puts
  it there (it did once, at pass 0). The runtime path makes the JS key the contract on both platforms
  by construction. The **config-plugin path is platform-asymmetric** — iOS resolves the internal
  PostScript name, Android the filename base — and when they differ neither platform throws: one
  renders SF Pro, the other Roboto. Mixing the two is worse than either.
- **Google Fonts ships Literata and Figtree as VARIABLE fonts only.** RN 0.79 exposes no variation
  axes, and a variable Literata renders at its default instance — **Regular, not Bold**. The static
  instances come from the upstream repos. Never "update the fonts" from `google/fonts`.
- 🔴 **`fontWeight` and `fontStyle` are both BANNED properties**, and for the same reason: with named
  static faces the platform either ignores them or *fakes* them, differently on each platform.
  Emphasis is a **family** (`font-body-semi` / `t.family['body-bold']`); italic is a **family**
  (`font-quote` / `t.family.quote`) — there is exactly one italic face. `token-gate.sh`'s
  `no-fontweight` and `no-synthetic-italic` are both permanent invariants at **0**.

### Colour on an accent fill — the `on-accent` rule (added 2026-07-30, Build 27.1 pass 1a)

🔴 **`on-accent` is the only legal foreground on an `accent` / `warning` / `success` / `danger` fill.
Never `fg`, never white.** `#FFFFFF` on `#F59E0B` is **2.15:1** — it fails WCAG AA at every size.

#### 🔴 SUPERSEDED 2026-08-03: **THE GATE ENFORCES THIS RULE NOW. THE PROSE EXPLAINS IT.**

> **This section used to say the rule "CANNOT be enforced by a grep" and that "this paragraph is the
> actual control." 🔴 THAT RULING WAS WRONG, and it was wrong in the most expensive way an
> enforcement decision can be: it moved a control into prose and prose does not control anything.**
>
> **The evidence that settled it:** `app/(capture)/face-capture.tsx` held a **broken pair and a
> correct one twenty lines apart — and the correct one carried a comment explaining the very rule the
> broken one broke.** Prose adjacency is not a control. Since then this class has produced **nine
> live AA failures across four items**, every one reachable, several on the first-run funnel.

🟢 **`A5 pair · fill × label`, inside `mobile/scripts/primitive-adoption-check.js`, IS BLOCKING** —
the 21st named rule, added at item 7. **It does not search text. It resolves the STYLE GRAPH:**

1. every `StyleSheet` rule whose body sets a **fill** to an accent-family token;
2. every JSX element that consumes one;
3. that element's **subtree by TAG DEPTH** — never a line window;
4. each text node's own style rule's `color`.

**Distance becomes irrelevant, which is exactly the property that forced the old rule to be
report-only.** ⚠️ **Self-closing elements have no subtree, and that is load-bearing rather than an
optimisation:** it kills the one false positive the first draft produced (a 6×6 accent dot whose
*sibling* was the instruction text) **structurally**, not by exception — and over-finding is the
direction that decommissions a rule.

**Two instruments, two shapes, and NEITHER is widened onto the other's ground:**

| instrument | sees | status |
|---|---|---|
| `A5 pair · fill × label` | **style rule → style rule**, joined at a JSX call site, any distance | 🟢 **BLOCKING** |
| `no-white-on-accent` (`token-gate.sh`) | inline fills + a ±4-line proximity window | 🔴 **permanently REPORT-ONLY** — read it after every item |

🔴 **AND THE PROSE STILL MATTERS, FOR THE HALF NEITHER INSTRUMENT REACHES: an INLINE fill with a
className label.** The pair rule walks `StyleSheet` rules and cannot resolve an inline
`style={{ backgroundColor: … }}`; the proximity rule's window is four lines. Item 13 found **three
live failures of exactly that shape** in `name-destiny.tsx` and `career-destiny.tsx`, at 2.31:1,
labels 7 to 15 lines below their fill. **So read this section as: the gate covers the resolvable
half and blocks; you cover the inline half by knowing the rule.**

⚠️ **Hierarchy on a fill is a PROMINENCE ladder — step and weight — NEVER a colour ladder.** There is
exactly one legal foreground, so two lines of copy on one fill share it and rank by size. Item 13
found a two-label control on `monthly.tsx` whose **second line was the secondary foreground at
1.43:1, three lines below a correct sibling, inside the same element** — the worst reachable pairing
in the phase, and the proximity rule missed it by three lines because the *correct* half sat inside
its window.

**Applies to `className` (`text-on-accent`) and inline styles (`t.color['on-accent']`) alike.**
⚠️ **Contrast-correct is not token-correct**: a `text-black` on `bg-gold` renders fine today but
`black` is a retired name that stops resolving once the defaults are deleted — rename it to
`on-accent` rather than leaving it.
⚠️ **AND A CONTRAST FIGURE WITHOUT ITS GROUND NAMED IS A CLAIM, NOT A MEASUREMENT** (`O-66`). The
muted foreground is 5.31:1 on the canvas, 4.76:1 on the raised surface and **4.35:1 — sub-AA — on the
overlay surface**, which is `Input`'s fill and `Sheet`'s ground. The surface steps are only ~1.05
apart, so one published figure reads as if it covers all four. **Measure against the ground the text
actually sits on.**

### App rating / in-app review
- The rating counter lives in **`mobile/store/reviewStore.ts`** — the single source of truth. It is rehydrated at launch via **`initReviewStore()`** (called once in root `mobile/app/_layout.tsx`, alongside `initSubscriptionSync()`); without that call the count would reset every cold start.
- **All meaningful-action recording goes through `recordMeaningfulAction(key)`** (one entry point). Keys: `reading:<type>`, `share:<type>`, `compat:<id>`, `daily:<YYYY-MM-DD>`, `monthly:<YYYY-MM>`, `astrologer:<YYYY-MM-DD>` (Build 27 seam). It is idempotent per dedup key (daily/monthly compare against `lastDailyDate`/`lastMonthlyMonth`; everything else is a one-time key) — safe to call on remount/refetch/revisit.
- **Do NOT reintroduce per-screen review logic** (no per-screen counters, `useRef` fire-once guards, SecureStore "counted" flags, or direct `StoreReview` calls). The native prompt is the attempt primitive `attemptReview()` in `mobile/lib/inAppReview.ts` (returns a boolean; Android-only + `hasPromptedThisSession` guard) and is called **only** by the store — the prompt ladder (`6→16→31→51→71→91…`, advances only on a real attempt) lives there too.
- Persists one JSON blob under SecureStore key `revelia_review_state`. In-memory count is authoritative after init — never re-read SecureStore to compute an increment (that was the old lost-update race). Retired in this refactor: `reviewKeys.ts`, `useAppReview.ts`, and `readingsStore`'s `completedReadingsCount`/`incrementCompletedReadings`.

### Reading share (do not "fix" naively)
- **`shareReadingCard` (`mobile/utils/shareReading.ts`) returns a `boolean` (true = real share, false = dismissed) — callers MUST gate `recordMeaningfulAction('share:...')` / `onShare`/`onShared` on it. Do NOT "simplify" to unconditional recording, and do NOT remove `failOnCancel: false` from `RNShare.open`.** Both look like dead complexity but are the fix for the Android cancel-cascade (build26-internal-test2): without `failOnCancel:false` a dismissal *rejects*, and the catch-driven fallback chain (`RNShare → Sharing.shareAsync → Share.share`) opens a second/third sheet; without the boolean gate a dismissal records a phantom share. Dismissal detection lives in the exported `isShareDismissal(error)` — import it, never redefine per file. This supersedes the old BUG-002 fix's cancel handling (the combined image+text intent from BUG-002 stays).

### Engine invariants (R1–R5) — full list lives in the progress log
The per-engine "do not fix naively" rules for the Build-27 engines (face/palm rules tables vs the model, `reconcile*Substance`, palm-keeps-the-image, the numerology sub-doc rules, the sidereal `set_sid_mode` critical section) are recorded under **"DURABLE ENGINE WATCH-OUTS"** in `tracking_files/claude_progress.md`. Read that section before touching R1–R5 code. The three that bite hardest:
- **`astrology-sidereal.service.ts` owns `set_sid_mode`** in a fully synchronous set→compute→reset critical section. Never add an `await` between set and reset; never re-issue it from a caller (R7 and R9 both just consume the service).
- **Face/palm archetypes, traits, talents and types come from the rules tables** (`physiognomy-rules.ts` / `chiromancy-rules.ts`), never from the model. `reconcileFaceSubstance` / `reconcilePalmSubstance` pin them — those are the guarantee, not dead code.
- **Never store `personalYear`/`personalMonth`** in the numerology sub-doc — that *was* the staleness bug. Compute fresh at read.

### TypeScript status
Both `mobile` and `server` are clean — `npx tsc --noEmit` returns zero errors. The previously-ignored pre-existing errors in `daily.tsx`, `monthly.tsx`, and `verify-email.tsx` were fixed (2026-06-24) as type-level-only changes with no runtime behavior change. If a new "ignore this pre-existing error" situation arises, document it here with the file and the reason it's safe to ignore.

**Watch-out (do not "fix" naively):** in `verify-email.tsx` the backend returns `verificationToken` at the **top level** of the response body (see `server/src/controllers/auth.controller.ts`), NOT nested in `.data`. The mobile code reads it via `(verifyResponse as any).verificationToken`. Do not "simplify" this to `verifyResponse.data?.verificationToken` — that is always `undefined` and would break email signup.

## Session tracking files

Two **live** files always sit at the top of `tracking_files/` (stable paths — never move them; the pointers above depend on it). Per-build subfolders hold frozen history.

| File | Purpose |
|---|---|
| `tracking_files/session_handoff.md` | Current branch state, what just happened, next step — read at every session start. Overwritten each session; stays ~1 screen. |
| `tracking_files/claude_progress.md` | Session log for the **current build only** + Project Snapshot — check when you need history. |
| `tracking_files/sid-signoff.md` | **Standing register of owner (Sid) sign-off gates** — what's PENDING vs APPROVED and which impl step each gates. NOT overwritten (unlike handoff) — update the status when Sid replies. Check before a "copy-lock" step to see if it's unblocked. |
| `tracking_files/build-27-caveats.md` | **Standing register of deferred technical caveats / known limitations** accepted during Build 27 — v1-scope decisions, cheap additive fixes, threshold-tuning, cosmetics. Revisit at end of build-27 or during feature testing. Add to it whenever a step accepts a caveat; do NOT silently drop one. |
| `tracking_files/build-27-testing.md` | **Build 27 test strategy + results log.** The two-pass plan (Pass 1 = pre-R5 local foundation verification, no deploy; Pass 2 = post-R5 overall device pass, one cycle) and a home for each pass's summary. Test-chat prompt = `prompts.txt` §10a. |
| `tracking_files/owner-actions.md` | **Standing register of OWNER ACTIONS to perform** (gating-before-step / post-deploy / housekeeping+security), e.g. run a gated prod backfill, upload an asset, remove a temp DB-allowlist IP. NOT overwritten (unlike the handoff, where such TODOs get lost). **Walk it before every deploy / internal-testing cut / prod ship / promote.** Agents append here (not only the handoff) when a step surfaces an owner action; never silently drop one. |
| `tracking_files/build-NN/` | Frozen archive of a shipped build: its `claude_progress.md`, `bugs/`, `refactors/`. Read on demand only. |

**Build rollover ritual** (once, when a build ships and the next branch is cut): move the live `claude_progress.md` into the finished build's folder (e.g. `tracking_files/build-26/claude_progress.md`), then start a fresh top-level `claude_progress.md` for the new build (Project Snapshot + a new heading). This keeps the live file bounded to one build so sessions never load the whole project's history for a minor task. `session_handoff.md` is just overwritten — it's naturally bounded.

## Workflow & release cycle

`dev-notes/workflow.md` is the reference for how we work: the AI-collaboration split (Claude Code authors code-grounded `plans/build-NN/RN-*.md` plans + implements; claude.ai reviews/strategizes; the owner decides) and the standard end-of-task build/release cycle (tsc → commit → EAS build → Internal Testing → promote the same AAB to Production + merge to `main`). Follow it for feature/fix/improvement work. Deep per-requirement plans live in `plans/build-NN/`.
