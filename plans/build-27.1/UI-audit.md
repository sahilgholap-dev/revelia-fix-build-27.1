# UI Audit — Revelia mobile, pre-revamp baseline

**Branch**: `fix/build-27.1` · **Shipped version at audit time**: 2.0.0 (live on Play Store production)
**Target of the revamp**: 2.1.0 on this same branch (owner decision — NOT a new `feature/build-28`)
**Audit date**: 2026-07-28 · **Audit scope**: `mobile/` only. Docs-only; no product code was touched.

> **Who this is for.** A designer with **no repo access** who must produce a complete visual revamp.
> Everything here is grounded in code with file + line references. Where the code is ambiguous or
> silent, this document says so explicitly rather than inventing an answer — look for
> **⚠️ AMBIGUOUS** and §9 Open Questions.
>
> **Build order this feeds**: this audit → design → **tokens+primitives** → screens → motion.
> The single most important job of this document is to make the **tokens+primitives** phase
> *precisely computable*. §2 gives the exact scatter counts that decide whether that phase is a
> config change or a codemod (**answer: codemod — see §2.6**), and §3 gives the ordered primitive
> list that *is* the phase scope.
>
> Analytics and review-prompt changes are **out of scope**. §8 exists only so the revamp does not
> make instrumentation harder later.

**Codebase size**: 41 files under `mobile/app/` (**32 screens** + 9 layouts), 13,620 lines.
52 files under `mobile/components/`. 93 `.tsx` files total in `app/` + `components/`.

---

## 1. ROUTE INVENTORY

Expo Router 5, file-based, `experiments.typedRoutes: true` (`mobile/app.json:100-102`).
Five groups: `(auth)`, `(capture)`, `(main)`, `(paywall)`, plus root.

### How to read the "gate evaluated" column

There are **three distinct gating mechanisms** in this app, and the difference matters enormously
for the revamp:

| Mechanism | Where the decision is made | Files |
|---|---|---|
| **A — client read of a server field** | Client reads `user.subscription.tier` off the hydrated user object and branches in JSX. The *value* is server-sourced; the *decision* is client-side. | 12 screens |
| **B — client constant table** | `FEATURE_ACCESS` in `mobile/lib/constants.ts:15-86`, consumed only by `subscriptionStore.canAccess()` (`mobile/store/subscriptionStore.ts:114-116`). | See note below |
| **C — fully server-driven** | Client keys off a server response payload (`limit`, `remaining`, a top-level `402`). Client never names a tier. | R7 Q&A, R9 Report |

**⚠️ AMBIGUOUS / worth flagging**: `canAccess()` exists (`subscriptionStore.ts:114`) and
`FEATURE_ACCESS` exists (`constants.ts:15-86`), but **no screen or component calls `canAccess()`**.
Grep across `app/`, `components/`, `hooks/`, `store/`, `lib/` returns only the store's own
definition. `FEATURE_ACCESS` is therefore an **unused mirror table** today — the real gates are
mechanism A (ad-hoc `tier` comparisons) and mechanism C. The revamp should not treat
`FEATURE_ACCESS` as authoritative for anything.

Similarly `hooks/usePaywall.ts` exposes `requirePremium` / `requirePremiumPlus`, but no screen
imports them — screens call `router.push('/(paywall)/')` directly. Another unused abstraction.

### Root

| Route | Purpose | Tier gating | Archetype | Traffic |
|---|---|---|---|---|
| `app/_layout.tsx` (233 L) | Root layout. Splash hold, OneSignal + RevenueCat + review-store init, deep-link capture/replay, auth redirect. Renders the root `Stack`. | n/a | layout | every launch |
| `app/index.tsx` (122 L) | Entry redirect — shows a dark gradient + logo while `checkAuth()` resolves, then routes to `(auth)` or `(main)`. | n/a | splash/result | every launch |

### `(auth)` — 8 files, 1,352 L

Stack, `headerShown: false`, `contentStyle.backgroundColor: '#0F0A1A'` **hardcoded hex**,
`animation: 'slide_from_right'` (`app/(auth)/_layout.tsx:8-10`).

| Route | Purpose | Tier gating | Archetype | Traffic |
|---|---|---|---|---|
| `(auth)/index.tsx` (11 L) | Defensive redirect → `welcome`. Exists because some iOS prod builds need a literal `index` in a group before subroutes resolve (comment at `:1-5`). | none | redirect | rare |
| `(auth)/welcome.tsx` (197 L) | First-run marketing / value prop → Log in / Sign up. **Does NOT use `ScreenContainer`** — hand-rolls the pinned-Dimensions fix inline (`:82`, comment `:11`). | none | hub | high (new installs) |
| `(auth)/login.tsx` (225 L) | Email/password + Google + Apple sign-in. | none | form | high |
| `(auth)/signup.tsx` (317 L) | Account creation → email verify. | none | form | high |
| `(auth)/verify-email.tsx` (263 L) | OTP entry for signup. **HARD invariant**, see §5. | none | form | high |
| `(auth)/verify-code.tsx` (111 L) | OTP entry for login/reset. | none | form | medium |
| `(auth)/forgot-password.tsx` (104 L) | Request reset email. | none | form | low |
| `(auth)/reset-password.tsx` (114 L) | Set new password. | none | form | low |

### `(capture)` — 3 files, 1,992 L

Stack, `presentation: 'modal'`, `animation: 'slide_from_bottom'`,
`contentStyle.backgroundColor: '#0A0A0F'` — **a different hardcoded black than everywhere else**
(`app/(capture)/_layout.tsx:8-10`). Note: `#0A0A0F` appears exactly once in the codebase, here.
Whether that near-black is intentional (camera surface) or a typo for `#0F0A1A` is
**⚠️ AMBIGUOUS** — see §9 Q6.

| Route | Purpose | Tier gating | Archetype | Traffic |
|---|---|---|---|---|
| `(capture)/birth-data.tsx` (434 L) | Birth date/time/place form → drives every chart. Uses haptics. | none | form | once per user |
| `(capture)/face-capture.tsx` (796 L) | Camera + `FaceGuideOverlay`, biometric consent, upload. Own `StyleSheet`. | none | form/capture | once per user |
| `(capture)/palm-capture.tsx` (762 L) | Camera + `PalmGuideOverlay`. **Mechanism A**: `tier` read at `:53`, branches at `:142`, `:188`, `:246`, and the step label at `:460` reads `'Step 1 of ' + (tier === 'free' ? '1' : '2')` — free gets 1 hand, paid gets 2. | **A** (`tier` at `:53`) | form/capture | once–twice per user |

### `(main)` — 24 files, 9,015 L

`Tabs` navigator, 6 tabs, `headerShown: false`. Tab bar is styled inline from `lib/colors`:
`backgroundColor: colors.card`, `borderTopColor: colors.gray[800]`, `height: 85`,
`paddingBottom: 24`, `paddingTop: 8`, active `colors.gold`, inactive `colors.gray[400]`,
label `fontSize: 11 / fontWeight: '600'` (`app/(main)/_layout.tsx:9-27`). Icons are
`Ionicons` (`home`, `book`, `calculator`, `star`, `heart`, `person`).

Nested stacks (`readings/`, `astrology/`, `numerology/`, `compatibility/`) each set only
`headerShown: false` + `contentStyle.backgroundColor: colors.background`. **No `animation`
override** → each nested stack uses the platform default push transition.

| Route | Purpose | Tier gating | Archetype | Traffic |
|---|---|---|---|---|
| `home.tsx` (550 L) | Tab 1. Daily insight, streak, quick actions, recent readings. `tier` at `:29`, gates a `premium_plus` fetch at `:47`; tier pill rendered at `:74`. Inline `RecentReadings` sub-component. | **A** | hub | **highest** |
| `readings/index.tsx` (392 L) | Readings hub — face / palm / combined / career / Q&A / report entries. `isPremium` at `:21`, paywall bounce at `:60-61`, locked card at `:222`. Comment at `:121` notes the Q&A tier gate is deliberately server-side so **no tier pill is shown**. | **A** | hub | very high |
| `readings/face.tsx` (501 L) | Face reading result. Local `SectionCard` + `LockedSection`/`LockedBanner`, `EmptyState`, `ErrorView`, `NotificationPrompt`, `EntertainmentDisclaimer`. Own `StyleSheet`. | **A** (via `LockedSection`) | result | high |
| `readings/palm.tsx` (503 L) | Palm reading result. Same shape as face; also a local reanimated `ScoreBar` (`:80-88`). Own `StyleSheet`. | **A** | result | medium-high |
| `readings/combined.tsx` (449 L) | "Cosmic Blueprint" — merged face+palm+astro+numero. `isPremium` at `:81`, hard bounce at `:84`, **full-screen lock at `:108`** (returns early). `premium_plus` extra at `:341`. | **A** | result | medium |
| `readings/career-destiny.tsx` (374 L) | Career + destiny reading. Inline `CareerResults`. Inline disclaimer string at `:184` (not the shared component). | **A** upstream (entry gated on the hub) | result | medium |
| `readings/qa.tsx` (706 L) | **R7 "Ask the stars"** — single-thread chat, Timing Engine. Counters, Deep-Insight toggle, cap CTA, location-consent banner, crisis suppression. **Does NOT use `ScreenContainer`** (own `SafeAreaView` + `KeyboardAvoidingView`, `:632-637`). Highest invariant density in the app — see §5. | **C** (fully server-driven: `remaining` + top-level 402) | **chat** | medium, growing |
| `readings/cosmic-report.tsx` (902 L) | **R9 Cosmic Report hub** — largest screen in the app. One state machine, 9 phases. Async poll. Sample-PDF viewer. Share-with-PDF. | **C** (`credit.limit === 0`, `:210`) | result/state-machine | low (Premium-Plus, 1/mo) |
| `readings/cosmic-report-history.tsx` (199 L) | Link-less list of past reports; row = month + headline + status pill; tap → hub (`:1-3`). | **C** (inherits) | list | low |
| `astrology/index.tsx` (774 L) | Natal chart hub. `BirthChartWheel` (SVG), planet cards, life themes. Local `SectionCard`, `PlanetCard`, `LifeThemeCard`. **Worst token-scatter file in the repo** (§2.5). | **A** (`locked` prop threaded into local `SectionCard`, `:30-43`) | hub | high |
| `astrology/daily.tsx` (364 L) | Daily insight detail + share. Inline `InsightSection`. `premium_plus` branch at `:140-142`. `EntertainmentDisclaimer` at `:360`. | **A** | detail | high |
| `astrology/weekly.tsx` (181 L) | Weekly forecast. `tier` at `:20`, `premium_plus` branch at `:25`, paywall at `:48`. `EntertainmentDisclaimer` at `:177`. | **A** | detail | medium |
| `astrology/monthly.tsx` (361 L) | Monthly forecast + personal month. `tier` at `:43`, `isPremium`/`isPremiumPlus` at `:98-99`, `LockedSection` at `:150`. `EntertainmentDisclaimer` at `:357`. | **A** | detail | medium |
| `numerology/index.tsx` (702 L) | Numerology hub — life path, expression, soul urge, etc. `isPremiumPlus` at `:324`, name-destiny gate at `:663-666`, locked card at `:676`. Contains pure calc helpers (`calculateDestinyNumber`, `letterToNumber`, `reduceToSingleDigit`). | **A** | hub | high |
| `numerology/name-destiny.tsx` (533 L) | Name-destiny analysis. Inline `AnalysisResults`. `ShareCard` with `onShared` at `:225`. Inline disclaimer at `:332`. | **A** upstream | result | medium |
| `compatibility/index.tsx` (805 L) | Multi-step wizard: `IntroStep` → `PartnerInfoStep` → `PartnerCaptureStep` → `GeneratingCompatibilityStep`. Free-quota math **client-side** at `:39`: `tier === 'free' ? Math.max(0, 1 - readings.length) : Infinity`. | **A** + client quota math | form/wizard | medium |
| `compatibility/[id].tsx` (357 L) | Compatibility result. `CompatibilityScoreRing` (SVG), local `SectionCard`, **local `shareReadingCard`** (see §5). `EntertainmentDisclaimer` at `:314`. | **A** | result | medium |
| `compatibility/history.tsx` (127 L) | Past compatibility readings list. `EmptyState`. | none | list | low |
| `profile.tsx` (687 L) | Tab 6. Notification toggle, timezone picker, tier display, account modals, rate-app, share-app, **inline copy of the entertainment disclaimer** at `:646` (diverges from the shared component — see §6). `tierDisplay` map at `:238`/`:314`; free upsell at `:298-306`. | **A** | hub/list | high |

### `(paywall)` — 2 files, 259 L

Stack, `presentation: 'modal'`, `contentStyle.backgroundColor: '#0F0A1A'` **hardcoded hex**
(`app/(paywall)/_layout.tsx:8`). **No `animation` override** → default modal presentation.

| Route | Purpose | Tier gating | Archetype | Traffic |
|---|---|---|---|---|
| `(paywall)/index.tsx` (244 L) | RevenueCat paywall. Reads `offerings.current?.availablePackages` (`:35`) — **HARD**, see §5. `purchasePackage` at `:47`, `restorePurchases` at `:63`. `FeatureComparisonTable`. **Does NOT use `ScreenContainer`.** | n/a (this *is* the upgrade surface) | detail/commerce | medium — **highest revenue leverage** |

### Traffic-expectation caveat

**⚠️ There is no analytics in the app** (see §8) — the "Traffic" column above is inferred from
navigation topology (tab-bar position, hub-vs-leaf depth) and tier reach (a Premium-Plus-only,
1-per-month surface cannot be high traffic). **It is not measured.** Do not let a designer
prioritise purely on it; confirm with the owner (§9 Q8).

---

## 2. CURRENT DESIGN TOKENS — the real in-use values

### 2.1 The headline problem: there are TWO parallel token systems

| System | File | Consumed by | Files importing |
|---|---|---|---|
| **Tailwind/NativeWind** | `mobile/tailwind.config.js` | `className="bg-card text-gold"` | all 93 (via NativeWind) |
| **JS object** | `mobile/lib/colors.ts` | `style={{ color: colors.gold }}` | **54 of 93** |

They overlap, they are **not** generated from one another, and **they disagree on one name**.
Every screen mixes both, often in the same JSX element.

### 2.2 Colors — Tailwind (`mobile/tailwind.config.js:10-27`)

| Semantic name (as written in code) | Value | className usages |
|---|---|---|
| `background` | `#0F0A1A` | 44 |
| `card` | `#1A1425` | 64 |
| `card-translucent` | `rgba(26, 20, 37, 0.8)` | **1** |
| `primary` | `#C4B5FD` | 66 |
| `primary-dark` | `#6B21A8` | 18 |
| `primary-light` | `#9333EA` | **0** |
| `gold` | `#F59E0B` | 70 |
| `pink` | `#EC4899` | 14 |
| `cosmic.purple` / `purple-light` / `gold` / `pink` / `dark` / `card` | duplicates of the above | **0 — the entire `cosmic.*` nest is dead config** |

**Finding**: the `cosmic.*` palette (`tailwind.config.js:19-26`) has **zero** usages anywhere.
`primary-light` also has zero. Delete-safe; the token phase should not carry them forward.

### 2.3 Colors — `mobile/lib/colors.ts` (the inline-style palette)

```
background          #0F0A1A   card              #1A1425   cardTranslucent  rgba(26,20,37,0.8)
inputBg             #1A1425   inputBorder       #2D2640   inputBorderActive #C4B5FD
primary             #C4B5FD   primaryBg         #6B21A8   primaryLight      #9333EA
primaryDark         #4C1D95   gold              #F59E0B   pink              #EC4899
white               #FFFFFF   error             #EF4444   success           #10B981
gray  100 #F3F4F6 · 200 #E5E7EB · 300 #D1D5DB · 400 #9CA3AF · 500 #6B7280
      600 #4B5563 · 700 #374151 · 800 #1F2937 · 900 #111827
```

**🔴 NAME COLLISION — a designer must be told this.**
`primary-dark` in Tailwind = **`#6B21A8`** (`tailwind.config.js:15`).
`colors.primaryDark` in JS = **`#4C1D95`** (`lib/colors.ts:11`).
**Same semantic name, different colour.** `#6B21A8` is exposed in JS under a *different* name,
`colors.primaryBg` (`lib/colors.ts:9`). Any unification pass must consciously pick one meaning
for "primary dark" and is guaranteed to change pixels somewhere. Flag this to the designer as a
decision, not a cleanup.

**The `gray` scale is Tailwind's default gray, hand-copied.** `colors.gray[400] = #9CA3AF`,
`[800] = #1F2937`, etc. all match Tailwind 3.4 defaults exactly. So `text-gray-400` (className)
and `colors.gray[400]` (inline) resolve identically today — **by coincidence of transcription,
not by construction**. Same for `error` (`#EF4444` = Tailwind `red-500`) and
`success` (`#10B981` = Tailwind `emerald-500`).

**Default-palette classes are also in live use** (not extended, straight from Tailwind):
`text-gray-400` ×160, `border-gray-800` ×60, `text-gray-300` ×44, `text-gray-500` ×16,
`bg-gray-700` ×10, `border-gray-700` ×8, `border-gray-600` ×3, `bg-gray-800` ×3, `text-gray-600` ×2.
Plus `text-red-400` ×16, `border-red-500` ×6, `bg-red-900` ×4, `text-red-500` ×3, `bg-red-600` ×2,
`text-purple-400` ×1, `bg-purple-500` ×1.

→ **The effective palette is far wider than `tailwind.config.js` suggests.** Roughly 9 brand
colours + the whole default gray ramp + scattered reds/purples.

### 2.4 Typography

**Font family**: `sans: ['System']` (`tailwind.config.js:32-34`) — that is the **only** family
declared, and **no custom font is bundled**. Verified: `mobile/assets/` contains only
`adaptive-icon.png`, `favicon.png`, `icon.png`, `logo.png`, `splash.png` (no font files);
no `useFonts`, no `Font.loadAsync`, no `expo-font` in `mobile/package.json` dependencies
(it is present in `node_modules` only as a transitive Expo dependency). **No `fontFamily` is set
anywhere in `app/` or `components/`.**
→ **All type is the platform system font**: Roboto on Android, SF Pro on iOS.
See §7 for what adding a custom font would require.

**Size scale — two overlapping ramps.**

*Tailwind classes* (config overrides `xs`→13px and `sm`→15px at `tailwind.config.js:28-31`;
everything else is Tailwind 3.4 default):

| Class | px | Usages |
|---|---|---|
| `text-xs` | **13** (overridden; default is 12) | 92 |
| `text-sm` | **15** (overridden; default is 14) | **220** |
| `text-base` | 16 | 92 |
| `text-lg` | 18 | 83 |
| `text-xl` | 20 | 69 |
| `text-2xl` | 24 | 53 |
| `text-3xl` | 30 | 25 |
| `text-4xl` | 36 | 18 |
| `text-5xl` | 48 | 2 |
| `text-6xl` | 60 | 10 |

Total: **664 Tailwind text-size class usages.**

*Inline `fontSize:` declarations* — **361 sites across 29 distinct values**:

```
9(×3) 10(×6) 10.5(×2) 11(×14) 11.5(×7) 12(×11) 12.5(×6) 13(×35) 13.5(×8)
14(×42) 14.5(×2) 15(×56) 15.5(×1) 16(×49) 17(×5) 18(×32) 20(×14) 22(×6)
24(×18) 28(×2) 30(×1) 32(×3) 36(×2) 40(×13) 44(×1) 48(×4) 52(×1) 56(×1) 96(×1)
```

**Note the six fractional sizes** — `10.5, 11.5, 12.5, 13.5, 14.5, 15.5`. These exist because
`qa.tsx` and `cosmic-report.tsx` were tuned by eye at half-pixel granularity
(e.g. `qa.tsx:405` `fontSize: 13.5`, `:532` `11.5`, `:595` `14.5`). **A designer cannot express
these in a Tailwind utility ramp without either adding named half-steps to the config or accepting
rounding.** Call this out explicitly in the design hand-off.

**Weight**: className side — `font-semibold` ×172, `font-bold` ×148, `font-medium` ×8
(328 total). Inline side — **173 `fontWeight:` declarations**, predominantly `'600'` and `'700'`.
Only three weights are meaningfully in use: 500 (rare), 600, 700.

**Line height**: 63 inline `lineHeight:` declarations, no consistent ratio. `letterSpacing` used
6 times. No line-height scale exists in `tailwind.config.js`.

### 2.5 Spacing, radii, shadow

**Spacing**: no custom spacing scale — `tailwind.config.js` extends only `colors`, `fontSize`,
`fontFamily`. All spacing is Tailwind's default 4px-based scale via `p-*`/`m-*`/`gap-*`, **plus**
raw numbers in inline styles and `StyleSheet` blocks. The recurring hand-rolled screen padding is
`paddingHorizontal: 24, paddingVertical: 32` in `ScreenContainer` (`components/ui/ScreenContainer.tsx:92-93`)
and `paddingHorizontal: 16, marginBottom: 16, padding: 20` in the duplicated `sectionCard` style
(see §3.5).

**Radii**: className side — `rounded-full` ×82, `rounded-2xl` ×73, `rounded-xl` ×48,
`rounded-3xl` ×4, `rounded` ×4, `rounded-lg` ×1 (212 total).
Inline side — **162 `borderRadius:` declarations across 21 distinct values**:

```
3(×3) 8(×5) 9(×1) 10(×5) 11(×1) 12(×29) 14(×6) 16(×37) 18(×1) 20(×22) 22(×3)
24(×15) 25(×1) 28(×5) 32(×2) 40(×3) 48(×2) 55(×1) 60(×1) 99(×2) 999(×14)
```

Note `9`, `11`, `18`, `25`, `55` — one-off values. And **both** `99` and `999` are used as the
"pill" idiom, alongside `rounded-full` — three spellings of one concept.

**Shadow / elevation**: essentially unused. `Card` applies Tailwind's `shadow-lg`
(`components/ui/Card.tsx:23`) — which on React Native maps to a partial iOS shadow and is
largely inert on Android. Across all of `app/` + `components/` there is exactly **1 `elevation:`**,
**1 `textShadowColor:`**, **1 `textShadowRadius:`**. There is **no elevation system**. Depth is
currently communicated by **background lightness** (`rgba(255,255,255,0.05)` cards on `#0F0A1A`)
and by `borderColor: colors.gray[800]` hairlines — not by shadow. A designer proposing a
shadow-based elevation system is proposing something genuinely new; say so.

**Border width**: 36 inline `borderWidth:` + 41 `borderColor:`. Hairline borders are the primary
separator idiom.

### 2.6 🔴 QUANTIFIED SCATTER — and the verdict for the tokens phase

Counts are over `mobile/app/` + `mobile/components/` (93 `.tsx` files).

| Bypass category | Count | Notes |
|---|---|---|
| **Raw hex literals in JSX/StyleSheet** | **401** | 404 regex hits − 3 HTML-entity false positives (`&#10003;`, `&#10024;`, `&#8226;`) |
| — distinct hex values | **64** | vs. ~9 brand tokens |
| **Inline `style={{…}}` objects** | **664** | |
| — `color:` | 387 | |
| — `backgroundColor:` | 214 | |
| — `fontSize:` | 361 | 29 distinct values |
| — `fontWeight:` | 173 | |
| — `borderRadius:` | 162 | 21 distinct values |
| — `lineHeight:` | 63 | |
| — `borderColor:` | 41 | |
| — `borderWidth:` | 36 | |
| **Arbitrary-value Tailwind classes** (`bg-[#…]`) | **27** | `text-[#9CA3AF]` ×8, `text-[#F59E0B]` ×6, `bg-[#1A1425]` ×6, + 7 others — all of which have a named token available |
| **`StyleSheet.create` blocks** | **16 files** | a third styling idiom alongside className and inline |
| Files importing `lib/colors` | 54 / 93 | |
| Files with ≥1 raw hex | **58 / 93** | |

**Top 12 offender files** (raw hex count):

| File | Raw hex | Imports `lib/colors`? |
|---|---|---|
| `app/(main)/astrology/index.tsx` | **52** | yes — scatter is *avoidable* |
| `app/(main)/readings/palm.tsx` | 28 | **no** |
| `app/(main)/readings/cosmic-report.tsx` | 26 | yes |
| `app/(main)/readings/face.tsx` | 23 | **no** |
| `app/(capture)/face-capture.tsx` | 23 | yes |
| `app/(capture)/palm-capture.tsx` | 22 | yes |
| `app/(main)/readings/combined.tsx` | 20 | **no** |
| `app/(main)/numerology/name-destiny.tsx` | 12 | yes |
| `components/astrology/BirthChartWheel.tsx` | 11 | **no** |
| `components/readings/GeneratingReading.tsx` | 10 | **no** |
| `app/(main)/readings/index.tsx` | 10 | **no** |
| `app/(auth)/verify-email.tsx` | 10 | yes |

**Top inline-style files** (`style={{` count): `astrology/index.tsx` **97**,
`cosmic-report.tsx` 81, `combined.tsx` 62, `qa.tsx` 47, `palm.tsx` 40, `face.tsx` 32,
`numerology/index.tsx` 24, `readings/index.tsx` 23, `home.tsx` 21.

Most-repeated hex values, all of which **already have a token**:
`#9CA3AF` ×80 (= `gray-400`), `#FFFFFF` ×55 (= `colors.white`), `#F59E0B` ×51 (= `gold`),
`#D1D5DB` ×28 (= `gray-300`), `#EC4899` ×18 (= `pink`), `#0F0A1A` ×14 (= `background`),
`#6B21A8` ×13 (= `primaryBg`), `#1A1425` ×9 (= `card`).
And `#C084FC` ×17 — a **purple-400-ish value with no token at all**, used 17 times.

---

> ### 🔴 VERDICT: the tokens phase is a **CODEMOD**, not a config change.
>
> A config-only change would repaint at most the **~1,204 className token usages**
> (44+64+1+66+18+70+14 brand + ~306 default-gray/red + 664 text-size + 212 radius…).
> It would leave untouched:
>
> - **401 raw hex literals** across **58 of 93 files**
> - **664 inline style objects** carrying 387 colours, 361 font sizes, 162 radii
> - **16 `StyleSheet.create` blocks**
> - **27 arbitrary-value classes**
>
> Editing `tailwind.config.js` alone would produce a **partially-restyled app** — new brand
> colour on buttons and cards, old hardcoded colour on ~60% of text and most of
> `astrology/index.tsx`, `face.tsx`, `palm.tsx`, `combined.tsx`, `cosmic-report.tsx`. That is a
> worse outcome than not restyling at all.
>
> **Therefore the tokens+primitives phase must, in this order:**
> 1. **Unify to one token source.** Generate `lib/colors.ts` from the Tailwind theme (or vice
>    versa) so the two systems cannot drift again. Resolve the `primary-dark` collision (§2.3) as
>    a deliberate design decision.
> 2. **Add the missing token families** the code already needs but the config lacks: a type ramp
>    that covers the fractional sizes (or a decision to round them), a radius scale that collapses
>    21 values to ~5, a spacing scale, and an explicit "no elevation system / borders+lightness
>    for depth" decision.
> 3. **Codemod the 401 hex literals → tokens.** Mechanical and safe: 8 values account for 268 of
>    them (67%), and every one has an existing token. `#C084FC` (×17) needs a new token first.
> 4. **Codemod the 27 arbitrary-value classes → named classes.** Trivial; do it in the same pass.
> 5. **Consolidate the fractional font sizes** — 28 sites across 6 half-pixel values, concentrated
>    in `qa.tsx` and `cosmic-report.tsx`. Needs a designer decision, then a mechanical edit.
> 6. **Only then** restyle the primitives in §3. Restyling `Button`/`Card` before step 3 means
>    the new look competes with 401 hardcoded holdouts.
>
> **Sizing signal**: 58 files touched by the colour codemod; the 8 files at the top of the offender
> table account for 206 of 401 hex literals (51%) and 404 of 664 inline styles (61%). Doing those
> 8 files carefully plus a mechanical sweep of the remaining 50 is the bulk of the phase.
> `astrology/index.tsx` alone (52 hex + 97 inline styles + local `SectionCard`/`PlanetCard`/
> `LifeThemeCard` + its own `StyleSheet`) is the single largest unit of work.

---

## 3. COMPONENT PRIMITIVES

### 3.1 `mobile/components/ui/` — the actual primitives (6 files)

| Component | Props / variants | Screens | Notes |
|---|---|---|---|
| **`ScreenContainer`** (`ui/ScreenContainer.tsx`, 162 L) | `withGradient?`, `gradientColors?`, `withScrollView?` (default **true**), `withKeyboardAvoiding?`, `contentContainerStyle?`, `safeAreaStyle?`, `scrollViewProps?`, `backgroundColor?` (default `colors.background`) | **25 / 32** | See §5 — the pinned-`Dimensions` layout fix is **HARD**. Default gradient is `[background, primary + '20']` (`:18-21`). Default content padding `24 / 32` (`:92-93`). |
| **`Button`** (`ui/Button.tsx`, 195 L) | `title`, `onPress`, `variant`: `primary`\|`secondary`\|`outline`\|`ghost`, `loading`, `disabled`, `fullWidth`, `size`: `sm`\|`md`\|`lg` | **19** | Fixed pixel heights `sm 48 / md 56 / lg 64` (`:26-30`) and text `14/16/18` (`:32-36`). `primary` = `LinearGradient([primaryBg, primaryLight, pink])` diagonal (`:78-80`). All variants `borderRadius: 12`. Fires `Haptics.impactAsync(Medium)` on press (`:51`). **The explicit heights are a HARD invariant — see §5.** |
| **`Card`** (`ui/Card.tsx`, 33 L) | `variant`: `default`\|`translucent`, `className` passthrough | **13** | Fully className-based: `rounded-2xl p-4 border border-gray-800 shadow-lg` (`:23`). The single cleanest re-skin target in the app. |
| **`Input`** (`ui/Input.tsx`, 70 L) | `label?`, `error?`, `leftIcon?`, `rightIcon?`, `containerClassName?`, + all `TextInputProps` | **9** | className-based; `bg-card border rounded-xl px-4 py-3`, error → `border-red-500`. Own Show/Hide password toggle (`:48-57`). `placeholderTextColor={colors.gray[500]}` (`:44`) is the one inline colour. |
| **`LoadingSpinner`** (`ui/LoadingSpinner.tsx`) | — | 4 | Uses `LinearGradient`. |
| **`NewBadge`** (`ui/NewBadge.tsx`) | — | 2 | 1 raw hex. |

### 3.2 `components/common/` (7 files)

| Component | Screens | Notes |
|---|---|---|
| **`EntertainmentDisclaimer`** | **7** | 17 lines, fully className. **Compliance surface — see §5/§6.** |
| **`EmptyState`** | 4 | `readings/index`, `face`, `palm`, `compatibility/history`. ⚠️ `qa.tsx:358` defines a **local `EmptyState`** that shadows this import name — different component, same identifier. |
| **`LoadingView`** | 4 | |
| **`ErrorView`** | 2 | `face`, `palm` only. |
| **`ErrorBoundary`** | 1 | Root `_layout`. Uses `LinearGradient`, 4 raw hex. |
| **`NotificationPrompt`** | 1 | `face.tsx:454` only. |
| **`BiometricConsent`** | 2 | Own `StyleSheet`, 6 raw hex. |
| **`SkeletonCard`** | **0** | 🪦 **DEAD — zero references anywhere.** |

### 3.3 Feature components (grouped, 39 files)

| Group | Components | Max screens | Notes |
|---|---|---|---|
| `readings/` (11) | `GeneratingReading` (5), `ShareableQuote` (4), `AffirmationCard` (4), `LockedSection`+`LockedBanner` (3), `StrengthsList` (2), `ScoreCard` (2), `GrowthCard` (2), `DestinyCard` (1), `PalmLineCard` (1), `PalmTypeHeader` (1), `ArchetypeHeader` (1) | 5 | `GeneratingReading` (5 screens, 10 raw hex) is the shared long-wait experience. `AffirmationCard`/`GrowthCard`/`PalmLineCard`/`ScoreCard` all use `BlurView intensity={20}` for the locked state. |
| `insights/` (8) | `ContinuityCard`, `DailyInsightCard`, `FocusAreaBadge`, `LifeAreaCard`, `MonthlyKeyDateCard`, `NumerologyBadge`, `WeeklyDayCard` — each 1 screen; **`LuckyElementCard` = 0** 🪦 | 1 | All import `lib/colors`. |
| `account/` (4) | `ChangePasswordModal`, `DeleteAccountModal`, `LogoutConfirmModal`, `UpdateNameModal` | 1 (`profile`) | All four are full-screen `Modal` + `SafeAreaView className="flex-1 bg-background"`. A consistent set — restyle together. |
| `capture/` (3) | `CaptureInfoModal` (2), `FaceGuideOverlay` (1), `PalmGuideOverlay` (1) | 2 | Overlays are reanimated (§4). |
| `profile/` (4) | `ProfileHeader`, `SunSignReveal`, `TimezonePicker`, `AstroNumeroBadge` | 1 | `SunSignReveal` is the only **JS-thread** `Animated` user (§4). |
| `subscription/` (3) | `FeatureComparisonTable` (1, paywall); **`LockedOverlay` = 0** 🪦; **`PremiumBadge`** used *only* by dead `LockedOverlay` → transitively dead 🪦 | 1 | |
| `compatibility/` (2) | `CompatibilityScoreRing` (SVG, 1), `CompatibilityShareCard` (1) | 1 | |
| `astrology/` (1) | `BirthChartWheel` (SVG, 1, 11 raw hex) | 1 | |
| `engagement/` (1) | `StreakBadge` (1) | 1 | |
| root | **`ShareCard`** (`components/ShareCard.tsx`, 4 screens) | 4 | Own `StyleSheet`, 8 raw hex, hardcoded `LinearGradient(['#6B21A8','#0F0A1A'])`. §5 invariant. |

**🪦 Dead components — safe to delete, confirmed by grep across `app/` + `components/`:**
`components/common/SkeletonCard.tsx`, `components/insights/LuckyElementCard.tsx`,
`components/subscription/LockedOverlay.tsx`, and `components/subscription/PremiumBadge.tsx`
(only importer is `LockedOverlay`). Removing them shrinks the re-skin surface by 4 files for free.

### 3.4 Inline components reused across 3+ screens (not in `components/`)

**🔴 `SectionCard` — 5 copies, 4 of them byte-identical.**

| File | Line | Signature |
|---|---|---|
| `app/(main)/astrology/index.tsx` | `:30` | `{ title, locked?, children }` — plus a local `useRouter()` |
| `app/(main)/readings/face.tsx` | `:25` | `{ title, locked?, children }` |
| `app/(main)/readings/palm.tsx` | `:28` | `{ title, locked?, children }` |
| `app/(main)/compatibility/[id].tsx` | `:33` | `{ locked, title, children }` (same body, via `SectionCardProps`) |
| `app/(main)/readings/combined.tsx` | — | **different**: `{ title, icon, children }`, no `locked` |

The four `locked` variants render an identical body: `styles.sectionCard` wrapper,
`styles.sectionHeader` with a `🔒` emoji at hardcoded `{ color: '#9CA3AF', fontSize: 14 }`,
then either `styles.lockedContent` → `"Unlock with Premium"` + an `"Upgrade"` button pushing
`/(paywall)/`, or `children`.

**And the `StyleSheet` is duplicated too** — `styles.sectionCard` is identical in
`astrology/index.tsx:692`, `face.tsx:465`, `palm.tsx:467`, `compatibility/[id].tsx:321`:
`{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 16 }`.
`combined.tsx:423` is the same minus `marginHorizontal`.

→ **This is the highest-leverage extraction in the whole revamp.** One `SectionCard` primitive +
one shared locked-state treatment restyles the *body* of the four highest-traffic result/hub
screens at once. It also collapses 5 copies of the "Unlock with Premium / Upgrade" paywall CTA
into one — which matters for §8 (`paywall_shown` seam).

**Other cross-screen inline duplicates:**

| Name | Copies | Files |
|---|---|---|
| `FeatureInsight` | 2 | `face.tsx`, `palm.tsx` — `{ label, value }` |
| `CollapsibleFeature` / `CollapsibleLine` | 2 | `face.tsx` / `palm.tsx` — same shape `{ title, icon, children }`, different names |
| `formatMonthDay` | 2 | `cosmic-report.tsx:50`, `cosmic-report-history.tsx` |
| `MONTHS` array + `formatResetDate`/`formatMonthDay` | 2 | `qa.tsx:77-88`, `cosmic-report.tsx:44-54` |
| Locked-card + `router.push('/(paywall)/')` CTA | **≥8** | `astrology/index`, `astrology/weekly:48`, `astrology/daily:142`, `astrology/monthly` (via `LockedSection`), `readings/index:61`, `readings/palm`, `readings/face`, `numerology/index:666`, `compatibility/[id]`, `qa.tsx:211`, `profile.tsx:306`/`:340` |

### 3.5 🔴 RE-SKIN LEVERAGE RANKING — this list IS the tokens+primitives phase scope

Ordered by share of the **32 screens** whose appearance changes if the item is restyled.
"Screens" = distinct screen files affected.

| # | Item | Screens | % of 32 | Why it ranks here |
|---|---|---|---|---|
| **1** | **`ScreenContainer`** | **25** | **78%** | Owns background, gradient, scroll behaviour, and the `24/32` content padding on every screen but 7. Changing its padding/background alone re-proportions three-quarters of the app. **Highest leverage by a wide margin.** Behavioural constraint in §5 — restyle freely, do not touch the pinned-`Dimensions` structure. |
| **2** | **`Button`** | **19** | 59% | Every primary CTA. The gradient (`:78`), the fixed heights, the `borderRadius: 12`, the haptic. Second-highest visual identity carrier after the background. |
| **3** | **`Card`** | **13** | 41% | 33 lines, pure className, zero inline styles — **the cheapest meaningful win in the codebase.** Restyle first to validate the new token set. |
| **4** | **`SectionCard` (extract from 5 inline copies)** | **5** | 16% | Not a component yet. But those 5 screens are `astrology/index`, `face`, `palm`, `combined`, `compatibility/[id]` — i.e. the *content body* of the app's main result surfaces, ~2,584 lines. Extracting it converts 5 duplicated bodies + 5 duplicated `StyleSheet`s + 5 duplicated paywall CTAs into one. **Highest leverage-per-hour in the list.** |
| **5** | **`Input`** | **9** | 28% | All of `(auth)` + `birth-data` + the account modals. Owns the form aesthetic end to end. |
| **6** | **`EntertainmentDisclaimer`** | **7** | 22% | Trivial to restyle; **copy is locked** (§6). Restyle the container, never the string. |
| **7** | **`GeneratingReading`** | **5** | 16% | The 60-second-plus wait users actually stare at. Reanimated progress bar + rotating messages (§4). Disproportionate *perceived* quality impact relative to its screen count. |
| **8** | **`EmptyState`** | 4 | 13% | Also resolve the `qa.tsx:358` name shadow while here. |
| **9** | **`ShareCard`** | 4 | 13% | This is what leaves the app and lands in someone's feed. **Marketing leverage far exceeds 13%.** Hardcoded `['#6B21A8','#0F0A1A']` gradient. §5 invariant on the share *call*, not the visuals. |
| **10** | **`ShareableQuote`** | 4 | 13% | Same rationale; same §5 invariant. |
| **11** | **`AffirmationCard`** | 4 | 13% | Plus the `BlurView intensity={20}` locked-state idiom shared with `GrowthCard`/`PalmLineCard`/`ScoreCard` — treat those four as one blur-lock system. |
| **12** | **`LoadingView` + `LoadingSpinner`** | 4 each | 13% | Restyle as one loading system. |
| **13** | **`LockedSection` / `LockedBanner`** | 3 | 9% | The *other* locked idiom, parallel to `SectionCard`'s and to `BlurView`. **Three competing lock treatments exist** — unifying them is a design decision, flag it. |
| **14** | **Tab bar** (`app/(main)/_layout.tsx:9-27`) | **24** | 75% | Not a component, but persistently visible on all 24 `(main)` screens. Styled inline. **Belongs in the primitives phase despite being a config block.** |
| **15** | `(auth)` / `(capture)` / `(paywall)` layout `contentStyle` | 13 | 41% | Three hardcoded background hexes (`#0F0A1A` ×2, `#0A0A0F` ×1) that must move to tokens or they'll flash the old colour behind new screens. |
| — | Everything below: `StrengthsList`, `ScoreCard`, `GrowthCard`, account modals (×4, all on `profile`), `capture/` overlays, `insights/` (×7), `profile/` (×4), `compatibility/` (×2), `BirthChartWheel`, `StreakBadge`, `FeatureComparisonTable`, `NewBadge`, `ErrorView`, `ErrorBoundary`, `NotificationPrompt`, `BiometricConsent`, `CaptureInfoModal` | 1–2 each | ≤6% | Per-screen work. Schedule in the **screens** phase, not the primitives phase. |

**Suggested cut line for the primitives phase: items 1–14.** That covers ~78% of screens through
6 real components + 1 extraction + 1 layout config, and it is the smallest set that makes the
screens phase mostly-mechanical. Items 15 and below are screen-phase work.

**Reminder from §2.6**: items 1–3 have low value until the 401-hex codemod lands, because
`astrology/index.tsx`, `face.tsx`, `palm.tsx`, `combined.tsx` and `cosmic-report.tsx` will keep
rendering old hardcoded colours inside newly-styled containers.

---

## 4. MOTION AND ANIMATION — CURRENT STATE

Installed: `react-native-reanimated ~3.17.4` (`mobile/package.json:48`). **`LayoutAnimation` is
used nowhere.** No `react-native-gesture-handler` gesture animations (the package is present only
as the required `GestureHandlerRootView` at `app/_layout.tsx:209`).

### 4.1 Reanimated — UI thread (7 files)

All use the worklet-based `useSharedValue` + `useAnimatedStyle`/`useAnimatedProps` API, so these
**run on the UI thread**.

| File | Line(s) | What it animates | Primitives |
|---|---|---|---|
| `components/readings/GeneratingReading.tsx` | `:290-356` | Fake progress bar + cross-fading status messages during a long generation | `useSharedValue`, `withSequence` of 4 `withTiming` legs — **12s → 25s → 45s → 60s**, easing `Easing.out(cubic)` / `inOut(quad)` / `in(quad)`, targets `0.35 → 0.65 → 0.88 → 0.97`. Message swap = `withSequence(withTiming(0,200), withDelay(80, withTiming(1,280)))`. |
| `components/readings/ScoreCard.tsx` | `:20-30` | Score bar fill | `withDelay(200, withTiming(score/100, {duration: 1000}))` |
| `app/(main)/readings/palm.tsx` | `:80-88` | Local `ScoreBar` — **a duplicate of `ScoreCard`'s animation** | identical `withDelay(200, withTiming(…, 1000))` |
| `components/compatibility/CompatibilityScoreRing.tsx` | `:24-40` | SVG ring stroke | `useAnimatedProps` (animates an SVG prop, not a style), `withDelay(300, withTiming(score/100, {duration: 1500}))` |
| `components/capture/FaceGuideOverlay.tsx` | `:29-66` | Breathing oval + tip cross-fade | `withRepeat(withTiming(1.05, …, Easing.inOut(ease)))` infinite; tip `withTiming(0,250)` → callback → `withTiming(1,250)` |
| `components/capture/PalmGuideOverlay.tsx` | `:20-35` | Breathing outline | `withRepeat(withTiming(1.05, …, Easing.inOut(ease)))` infinite |
| `app/(capture)/face-capture.tsx` | `:9` imports `useSharedValue, useAnimatedStyle, withTiming, withSequence` | capture feedback | — |

**⚠️ No `cancelAnimation` anywhere.** The two `withRepeat` infinite loops in the guide overlays
have no explicit teardown. Reanimated 3 cleans up shared values on unmount so this is not a
confirmed leak, but it is worth verifying on device if the revamp adds more looping animation.

### 4.2 RN `Animated` — JS thread (1 file)

| File | Line(s) | Notes |
|---|---|---|
| `components/profile/SunSignReveal.tsx` | `:26-48` | `Animated.parallel([Animated.spring(scaleAnim), Animated.timing(fadeAnim)])`, **both with `useNativeDriver: true`** (`:38`, `:43`). Driver is native, so the frames are off-JS-thread; only the *orchestration* is JS-side. Resets via `setValue(0)` at `:47-48`. |

This is the **only** file using the legacy `Animated` API. It is the obvious candidate to port to
reanimated during the motion phase, for consistency rather than for performance.

### 4.3 Screen transitions — Expo Router

| Layout | Transition | Customised? |
|---|---|---|
| `app/_layout.tsx:214-226` | `animation: 'fade'` on the root `Stack`; `(capture)` and `(paywall)` get `presentation: 'modal'` | **yes** |
| `app/(auth)/_layout.tsx:8-10` | `animation: 'slide_from_right'` | **yes** |
| `app/(capture)/_layout.tsx:8-10` | `presentation: 'modal'` + `animation: 'slide_from_bottom'` | **yes** |
| `app/(paywall)/_layout.tsx:8` | `presentation: 'modal'`, **no `animation`** | partially — default modal |
| `app/(main)/_layout.tsx` | `Tabs` — **no transition config at all** | **no — platform default** |
| `readings/`, `astrology/`, `numerology/`, `compatibility/` stacks | **no `animation` key** — only `headerShown` + `contentStyle` | **no — platform default push** |

→ **Net**: the *group-entry* transitions are customised; every *within-group* navigation (which is
the overwhelming majority of navigations, e.g. readings hub → face reading) uses the untouched
`react-native-screens` default. Tab switches are also default (instant, no animation). That is a
clear, cheap opportunity for the motion phase and requires no new dependency.

### 4.4 Known jank / performance notes found in code

1. **`qa.tsx` — TextInput focus loss, already fixed and load-bearing.** `Bubble` is deliberately
   at **module scope** (`qa.tsx:96-104`) and `Counters`, `EmptyState`, `LocationConsentBanner`,
   `Composer`, `QuestionCapCta` are rendered as **function calls, not JSX elements**
   (`qa.tsx:648-651`, `:652-653`, `:677`). Reason documented in-file: a component defined inside
   `AstrologerChat` gets a fresh identity every render, which remounts the message list and the
   composer's `TextInput` on every keystroke, dropping keyboard focus. **A redesign that
   "cleans this up" into normal `<Counters />` JSX reintroduces the bug.** See §5 — HARD.
2. **iOS production layout collapse — the reason `ScreenContainer` exists.** `flex: 1` did not
   propagate from the navigation host through `SafeAreaView`/`LinearGradient`/`ScrollView`;
   screens collapsed to the ~82px top safe-area inset with the inner `ScrollView` reporting
   `height: 0` (measured via `onLayout` in Build 13). Fix = pin the outermost element to
   `Dimensions.get('window')` with `position: 'absolute'` (`ScreenContainer.tsx:46-67`, `:128-158`).
   `welcome.tsx:82` hand-rolls the same fix. **HARD.**
3. **iOS production button collapse — the reason `Button` has fixed heights.** Padding-only sizing
   on the inner `LinearGradient` collapsed buttons to thin ribbons in iOS prod; fixed
   `SIZE_HEIGHT` + a `100%`-filling gradient is the fix (`Button.tsx:22-30`). **HARD.**
4. **`GeneratingReading`'s progress timeline is honest about a 60s+ wait.** The four-leg sequence
   asymptotes at 0.97 and never reaches 1.0 — deliberate, so the bar never lies about completion.
   A motion redesign must preserve "never completes until the server says ready."
5. **No measured jank baseline exists.** No profiling artefacts, no perf tests in the repo. §9 Q7.

---

## 5. INVARIANT REGISTER — **THE MOST IMPORTANT SECTION**

> ## 🟢 THIS SECTION IS NOW MECHANICALLY ASSERTED — `scripts/invariant-register-check.js` (2026-08-04)
>
> 🔴 **AND IT WAS NOT, UNTIL X17 BROKE ON HEAD WHILE THIS SECTION DOCUMENTED IT, PREDICTED THE EXACT
> DELETION, AND RATED IT "VERY LIKELY" (`O-97`).** Audited afterwards, **13 of these 20 rows had no
> check of any kind** and 2 more had only half (`O-100`). The register was a prediction, not a
> control — a paragraph saying "preserve this" and a number that fails read identically in a review.
>
> **What exists now, wired into `npm run gate` as the 22nd named rule:**
>
> | assertion | count |
> |---|---|
> | ROLL CALL — the register is DENSE (X1..X21, once each) and every row is CLAIMED or carries a stated reason it cannot be | 21 rows |
> | per-file EXACT literal counts, read from CODE ONLY | 58 |
> | boundaries asserted to 0 outside their named home(s), across 8 roots | 6 |
> | tree-wide EXACT totals, where the total IS the invariant | 5 |
> | retired modules asserted still deleted | 2 |
> | probes that the rows asserted in OTHER scripts still carry their assertion there (`O-102`) | 15 |
> | the comment walker against a known-answer fixture (`O-101`) | 1 |
>
> 🔴 **ADDING A ROW HERE IS NOW AN EDIT TO TWO FILES.** The roll call's `REGISTER_SIZE` is the contract
> with this section: a new X-row with no entry there **fails the gate**. That is deliberate — it is
> what makes "documented" and "asserted" stop being the same state.
>
> ⚠️ **AND WHAT A GREEN GATE STILL DOES NOT MEAN**, printed by the check itself every run
> (`primitives-plan` §2.4): it proves each guard **SURVIVED THE DIFF**, never that it **WORKS**. What
> most of these guards prevent is an iOS-**production** layout collapse, and `codemod-plan` §5.4
> closed iOS verification permanently. No Android build, emulator, screenshot or green gate is
> evidence about any row below. **It is a diff alarm, and that is its ceiling.**
>
> ⚠️ **SIX ROWS OR SUB-CLAUSES REMAIN UNASSERTABLE AND ARE PRINTED AS A RESIDUAL-RISK BLOCK ON EVERY
> RUN** rather than filed: X1's *outermost*-element clause and X7's branch POSITION (a census cannot
> see nesting) · X4's open-ended prohibition SHAPE (the four named artefacts are asserted; a new
> spelling is not) · X6's caller *gating* as opposed to *capturing* (data flow) · X10 (SOFT by design)
> · X11's two counters that live in `token-gate.sh` and would cry wolf if promoted to exact.
> **It is printed because a residual nobody reads is an assumed-empty one, and assumed-empty is what
> this whole section was.**

**HARD** = a UI rewrite must not change this, in any form. Changing it reintroduces a fixed bug,
breaks a compliance property, or breaks revenue/safety behaviour.
**SOFT** = restyle freely; preserve the behaviour.

### 5.1 Cross-cutting — apply on every screen

| # | Invariant | File / line | Reason | |
|---|---|---|---|---|
| **X1** | `ScreenContainer`'s outermost element stays pinned to `Dimensions.get('window')` with `position:'absolute', top:0, left:0`; `SafeAreaView` keeps `flex:1 + width:'100%' + minHeight:SCREEN_HEIGHT`; `ScrollView` keeps `flex:1` + `flexGrow:1, minHeight: SCREEN_HEIGHT - 100`. | `components/ui/ScreenContainer.tsx:46-67`, `:88-97`, `:116-125`, `:128-158` | iOS prod `flex:1` does not propagate through the nav host → whole screen collapses to ~82px, inner ScrollView `height: 0`. Measured Build 13. | **HARD** |
| ⚠️ **X1 · `O-110`** | 🔴 **AND INSERTING A NODE INTO THAT CHAIN IS NEVER NEUTRAL, which is X1's content arriving in a new place.** Measured 2026-08-04 while building the motion phase's screen entrance: the obvious implementation wraps the content block in an `Animated.View`, and **six live screens pass `contentContainerStyle={{ justifyContent: 'center' }}`** (`forgot-password`, `login`, `reset-password`, `signup`, `verify-code`, `verify-email`), so a node between the scroll content container and the real children centres the WRAPPER — which already fills the box — and top-aligns every child. **That is the entire login funnel.** 🟢 The discharge is to ride an element that ALREADY EXISTS: append the animated style to its style ARRAY, so there are zero new nodes and the four anchors stay byte-identical. | Same collapse chain as X1, reached from the other direction — a new LINK rather than a deleted declaration. | **HARD** |
| **X2** | Same fix hand-rolled in `welcome.tsx` — do not "simplify" it to a plain `View`. | `app/(auth)/welcome.tsx:82` + comment `:11` | Same collapse. This screen deliberately does not use `ScreenContainer`. | **HARD** |
| **X3** | `Button` keeps explicit pixel heights (`sm 48 / md 56 / lg 64`) and the inner `LinearGradient` keeps `width:'100%', height:'100%'` — never padding-only sizing. | `components/ui/Button.tsx:22-30`, `:81-88` | iOS prod collapsed padding-sized gradient buttons into thin ribbons. | **HARD** |
| **X4** | `recordMeaningfulAction(key)` is the **only** review entry point. No per-screen counters, no `useRef` fire-once guards, no SecureStore "counted" flags, no direct `StoreReview` calls. `attemptReview()` is called **only** from `reviewStore`. | `mobile/store/reviewStore.ts:118-157`; `mobile/lib/inAppReview.ts:18-24`; 15 call sites listed in §8 | CLAUDE.md forbids reintroducing per-screen review logic. The old system had a lost-update race (SecureStore re-read to compute an increment) and duplicate counting. The prompt ladder `6→16→31→51→71→91…` advances only on a **real** attempt (`:150-156`). | **HARD** |
| **X5** | `initReviewStore()` is called exactly once in the root layout. | `app/_layout.tsx:78`; `reviewStore.ts:76-105` | Without it the count resets every cold start. | **HARD** |
| **X6** | `shareReadingCard()` returns a **boolean**; callers gate `recordMeaningfulAction('share:…')` / `onShare` / `onShared` on it. `failOnCancel: false` stays on `RNShare.open`. Dismissal detection uses the **exported** `isShareDismissal(error)` — never redefine it per file. | `mobile/utils/shareReading.ts:14-19`, `:44-53`; callers `components/ShareCard.tsx:38-39`, `components/readings/ShareableQuote.tsx:20-21` | The Android **cancel-cascade** fix (build26-internal-test2). Without `failOnCancel:false` a dismissal *rejects* → the catch-driven fallback chain (`RNShare → Sharing.shareAsync → Share.share`) opens a second and third sheet. Without the boolean gate a dismissal records a **phantom share**. CLAUDE.md explicitly forbids "simplifying" either. | **HARD** |
| **X7** | The share fallback chain stays **exactly one deep** on a genuine RNShare failure (`RNShare` → `Sharing.shareAsync`, never reaching `Share.share`). | `shareReading.ts:54-64`, comment `:56` | Same cascade bug. | **HARD** |
| **X8** | Entertainment disclaimer stays present on every reading-output screen: `daily:360`, `weekly:177`, `monthly:357`, `compatibility/[id]:314`, `combined:416`, `face:449`, `palm:460`. | `components/common/EntertainmentDisclaimer.tsx` | Compliance / app-store positioning. **Container is SOFT; presence and string are HARD.** | **HARD** (presence) |
| **X9** | Inline disclaimer variants stay present where they are: `name-destiny:332`, `career-destiny:184`, `profile:646`, `cosmic-report:87-88` (`FINE_PRINT_LONG` / `FINE_PRINT_SHORT`). | as listed | Same. Note these are **four divergent strings** — see §6 for the consolidation question. | **HARD** (presence) |
| **X10** | Visual styling of all the above: colours, spacing, type, card treatment, gradients, radii, icon choice, layout. | — | This is the revamp. | **SOFT** |

---

#### 🔴 X11–X18 — the iOS-prod flex-collapse guards this register originally missed

> **The line that makes this the highest-risk category in the revamp**, quoted from commit
> `6525a75`'s own message:
>
> > *"Android unchanged — flex propagation works there, explicit dimensions are no-ops."*
>
> **Stated plainly: anyone restyling on an Android device or emulator can delete all eight of the
> entries below, see no change whatsoever, and ship an iOS build in which eight surfaces collapse
> to thin ribbons.** X1/X2/X3 already record three instances of this fix. `6525a75` applied the
> *same* fix to **six more components** and `c542b20` applied a related clipping fix to three
> more — and until this block was written, that was documented **only in two commit messages**.
> No in-file comment exists on X13, X14, X15 or X16.
>
> Added 2026-07-29 from `plans/build-27.1/preflight-findings.md` §C (transcribed verbatim).
> Full commit body and per-item archaeology: `preflight-findings.md` §C.1–§C.2.

| # | File / line | Value | Why it exists | Would a restyle delete it by accident? | |
|---|---|---|---|---|---|
| **X11** | `components/engagement/StreakBadge.tsx:11-17`, applied `:29-36` | `height: 28 / 36 / 48` + `borderRadius: cfg.height / 2` | In-file comment `:11-12`: *"Explicit dimensions per size — fixes iOS production where padding-only sizing on LinearGradient collapsed the badge to a thin ribbon."* Commit `6525a75`. | 🔴 **Very likely.** A pill badge is the archetypal "just use padding + rounded-full" restyle. The `borderRadius: cfg.height / 2` coupling means removing the height also breaks the pill shape. Rendered on `home.tsx:79`, the app's highest-traffic screen. | **HARD** |
| **X12** | `components/profile/AstroNumeroBadge.tsx:13-19` | `height: 44 / 56 / 88` | In-file comment `:13-14`: *"Explicit dimensions per size — same iOS-prod flex-collapse fix applied to other tile/badge components in build 16."* | 🔴 **Very likely** — same reasoning. Note also the internal `width: 1, height: 32` divider at `:88`, which is a hairline rule that will read as an arbitrary magic number. | **HARD** |
| **X13** | `app/(main)/home.tsx:105`, `:139` (`height: 140`), `:203` (`minHeight: 200`), `:528` (`minHeight: 72`) | as listed | Commit `6525a75`, itemised in `preflight-findings.md` §C.1. **No in-file comment on any of the four** — the only record is the commit message. | 🔴 **Very likely.** These are bare numbers in `style={{}}` on cards that a redesign will certainly resize. Nothing in the file explains them. | **HARD** |
| **X14** | `app/(main)/readings/index.tsx:132,160,190,220,259,299,341` | `minHeight: 140` ×7 | Commit `6525a75` (six cards) + `eb79db2` (the R7 Q&A card added later, matching). No in-file comment. | 🔴 **Very likely** — seven near-identical inline style objects that look exactly like copy-paste cruft. They are the fix. | **HARD** |
| **X15** | `app/(main)/numerology/index.tsx:674` | `minHeight: 140` | Commit `6525a75`. No in-file comment. | 🔴 **Very likely** — a lone magic number on a `LinearGradient`. | **HARD** |
| **X16** | `components/insights/DailyInsightCard.tsx:126` | `minHeight: 160` on the inner `LinearGradient` | Commit `6525a75`. No in-file comment. | 🟠 **Likely.** | **HARD** |
| **X17** | `app/(main)/readings/index.tsx:135,163,193,229,262,307,349` (`overflow: 'visible'` on 56×56 icon wells) · `components/profile/SunSignReveal.tsx:70`, `:73` · `components/readings/GeneratingReading.tsx:402` (`minWidth: 220`), `:460` (`minHeight: 44`), `:471-472` (`maxWidth: 320, height: 8`) | as listed | Commit `c542b20`: *"Fix emoji/icon cropping: explicit dimensions + overflow visible on GeneratingReading, SunSignReveal, readings index."* Large emoji glyphs (`fontSize: 40`, `lineHeight: 50` at `numerology/index.tsx:683`) overflow their box; the default `overflow: 'hidden'` clipped them. | 🔴 **Very likely.** `overflow: 'visible'` reads as a no-op (it *is* the CSS default — but **not** the React Native default on Android). Also `GeneratingReading:460`'s `minHeight: 44` reserves space for a one-vs-two-line animated message; without it the layout jumps every rotation. | **HARD** |
| **X18** | `app/(main)/_layout.tsx:14-16` | `height: 85, paddingBottom: 24, paddingTop: 8` | Already noted in §7.5 as hand-tuned and coupled to `hooks/useBottomInsetPadding.ts` (commit `8312881`, *"fix(android): edge-to-edge bottom inset handling across all clipped screens"*), but **not previously in this register**. Visible on all 24 `(main)` screens. | 🟠 **Likely** — a tab-bar restyle is near-certain, and changing this height means re-verifying the five Build-22 Android clipping screens. | **HARD** |

**Two consequences worth stating explicitly, because they are not obvious from the table:**

- **Verification of any change to X11–X18 requires an iOS build.** An Android pass proves nothing —
  that is the whole content of the commit's closing line. There is no simulator shortcut either:
  the original collapse was an **iOS *production*** behaviour (Build 13), not a debug-build one.
- **X13's `:203` `minHeight: 200` is the one entry with an open owner decision.** The 2.1 design
  proposed removing it (it forces 200dp of empty card when `keyDates` filters to zero). **Owner
  ruling 2026-07-29: it STAYS**, pending an iOS device check, with the empty case rendered as a
  short centred line of muted copy inside it rather than 200dp of whitespace. See
  `plans/build-27.1/UI-revamp-design.md` §12 for the design's reasoning (a collapse guard would sit
  on the gradient or flex child, a layout floor on the card; `:203` is on the card) so the decision
  can be revisited cheaply.

#### 🔴 X19 — the paywall close button's `zIndex` + `elevation` pair

| # | Invariant | File / line | Reason | |
|---|---|---|---|---|
| **X19** | The paywall close button keeps **both** `zIndex: 50` **and** `elevation: 10`, and stays `position: 'absolute'` **outside** the `ScrollView`. | `app/(paywall)/index.tsx:87-88`, element `:80-98`, comment `:79` *"Close button - fixed above ScrollView"* | This is the **only `elevation:` in the entire codebase** (verified exhaustively — `preflight-findings.md` §C.4). It is not depth, it is a **stacking fix**: `zIndex` alone does not reliably raise a view above siblings on Android, so the pair is the correct cross-platform idiom. **If a revamp moves the button inside the `ScrollView`, or drops the `elevation` while "removing the app's only shadow", the only exit from the paywall modal can become untappable on Android** — on the app's highest-revenue surface, in a `presentation: 'modal'` screen with no header back button. Its shadow is invisible in practice (a flat circle on a near-identical background), which is exactly why a "zero elevation" cleanup will read it as dead code. | **HARD** |

> Related, for completeness (`preflight-findings.md` §C.4): there are **three** `zIndex:` in the
> codebase — `face-capture.tsx:675`, `palm-capture.tsx:583` and this one — all three the same
> "fixed control floating above a `ScrollView`/`CameraView`" pattern. §2.5's "essentially no
> elevation system" claim is accurate; it simply never counted `zIndex`.

#### X20 — `DeleteAccountModal`'s two hand-rolled destructive controls

| # | Invariant | File / line | Reason | |
|---|---|---|---|---|
| **X20** | Both hand-rolled destructive controls keep their explicit `height: 56`. | `components/account/DeleteAccountModal.tsx` | Same iOS-prod collapse class as X3 — these two buttons are not `<Button>`, so X3 does not cover them. **They are spelled IDENTICALLY, so a presence check stays green with one deleted**; the assertion is a COUNT of 2, and that defect injection is what created the `literalCounts` shape. Retires if `Button`/`Sheet` ever absorb them, at which point X3 takes over. | **HARD** |

> ⚠️ **This row existed in `scripts/invariant-register-check.js` and in `primitives-plan.md` §2.2 but
> NOT in this section** until 2026-08-05 — so the register's own "adding a row is an edit to two
> files" contract had a one-row hole in it, on the side that is not mechanically checked (the roll
> call reads the script, not this document). Recorded here rather than silently corrected.

#### 🔴 X21 — the client never writes a tier it DERIVED (R1), added 2026-08-05

| # | Invariant | File / line | Reason | |
|---|---|---|---|---|
| **X21** | 🔴 **A RevenueCat-derived tier may only ever UPGRADE the tier held in `authStore`. Only the SERVER's effective tier may lower one.** `applyTierToAuthUser` keeps its rank guard; `applyServerTierToAuthUser` (fed by `checkSubscriptionStatus`, which reads `GET /subscription/status`) is the only path that writes unconditionally; `setUser` has exactly ONE call site outside `authStore`; `mapCustomerInfoToTier` is confined to its wrapper plus that one store. | `mobile/store/subscriptionStore.ts` — the guard, `applyServerTierToAuthUser` ×2, the status read, the single `setUser`; boundary assertions across the 8 wide roots | **R1: the server owns entitlement, the client is a renderer.** A complimentary grant (`scripts/grant-comp-tier.ts` → `subscription.comp`, honoured lazily by `getEffectiveTier`) has **no RevenueCat entitlement by construction**, so the derived tier for a comped account is a *correct* `'free'` — and writing it over the server's value locked every internal, PM, influencer and test account out of exactly what it was comped for, while every API call kept honouring the grant. **15 files read the field it overwrote.** Reported by the founder and the PM as *"the app is broken"* / *"this used to work"*, 2026-08-05. | **HARD** |

**Three things about this row that are the point of it, not commentary:**

- 🔴 **§5.7 below is a register of this exact class — five documented client-side tier decisions —
  and `owner-actions.md`'s **P16** named this function, with its line numbers, TWO WEEKS BEFORE the
  report.** It was deferred three times because confirming it was thought to need a device. That is
  `O-97` verbatim, one domain over: a documented invariant plus an accurate prediction of its
  violation still produced the violation. **The fix is four counts and two boundaries.**
- **The unanswerable half is recorded rather than relied upon.** Whether RevenueCat's native SDK
  emits a CustomerInfo update on its *initial* fetch is not determinable from this repo (the JS layer
  is a bare `NativeEventEmitter` bridge), which is why P16 stayed "plausible, unconfirmed". 🟢 **The
  guard is on the WRITE, not the listener**, so it closes all three reaching paths at once —
  including the two that need no listener: the paywall's Restore button and a purchase.
- ⚠️ **The server side was never broken and must not be "fixed".** `getEffectiveTier`'s lazy expiry,
  its max-rank behaviour, `userToResponse`'s hydration and the RevenueCat sync's billing-only writes
  are all intact and were verified against the code, not assumed.

### 5.2 `readings/qa.tsx` — R7 "Ask the stars"

**This screen carries the highest invariant density in the app. Read this whole block before
touching it.**

| # | Invariant | File / line | Reason | |
|---|---|---|---|---|
| **Q1** | 🔴 **Every crisis-suppression surface stays INDEPENDENTLY `!safetyMode`-gated.** The current gates are separate expressions at **seven distinct sites**: | | | **HARD** |
| | (a) counters row | `qa.tsx:652` — `{!safetyMode && Counters()}` | | |
| | (b) location-consent banner | `qa.tsx:653` — `{!safetyMode && locationConsent === 'undecided' && …}` | | |
| | (c) question-cap CTA vs composer | `qa.tsx:677` — `{!safetyMode && atQuestionCap ? QuestionCapCta() : Composer()}` | | |
| | (d) Deep-Insight cap note + Upgrade link | `qa.tsx:529` — `{!safetyMode && diCapHit && …}` | | |
| | (e) Deep-Insight toggle | `qa.tsx:542` — `{!safetyMode && (…)}` | | |
| | (f) paywall bounce on a capped send | `qa.tsx:244` — `if (atQuestionCap && !safetyMode)` | | |
| | (g) rating prompt | `qa.tsx:299-301` — `recordMeaningfulAction` fires **only** for `mode === 'reflective' \|\| 'timing'`, so never for `crisis`/`unsafe`/`off_topic` | | |
| | plus (h) the bubble's own mystical chrome, via a **separately derived** `isSafety` at module scope | `qa.tsx:107-110`, gate at `:119` — no `🔮 Revelia` label, never a Deep-Insight tag | | |
| | **🔴 A redesign that centralises these into one conditional (e.g. one `if (safetyMode) return <CrisisView/>`, or one `showCommerce` flag) LOSES THE PROPERTY.** The guarantee today is *structural redundancy*: eight independent gates, so no single refactor, prop-drill mistake, or future feature can re-expose commerce on a crisis screen by touching one line. A single centralised conditional makes exactly that a one-line regression, on the app's most safety-critical surface. **State this to the designer plainly: the crisis screen is not a screen variant, it is the absence of eight things, each suppressed on its own.** If the redesign wants a distinct crisis presentation, it must be *additive* to the eight gates, not a replacement for them. | | Safety-critical (LG3). PM/Sid-approved decline behaviour. | **HARD** |
| **Q2** | `safetyMode` is derived from the **most recent** message being an assistant message with `mode ∈ {crisis, unsafe, off_topic}` — not from a request flag, not from a classification the client computes. | `qa.tsx:201-205` | The client is a thin renderer; the server owns classification. | **HARD** |
| **Q3** | Suggestion chips are suppressed **structurally, not by a gate**: they live inside `EmptyState()` (`:390-407`), which renders only when `messages.length === 0` (`:663`), while `safetyMode` requires ≥1 assistant message. **⚠️ This is the one suppression surface with no explicit `!safetyMode`.** Any redesign that moves the chips outside the empty state (a persistent chip row, chips under the composer, chips in a cap state) **must add an explicit `!safetyMode` gate** — the structural guarantee does not survive that move. | `qa.tsx:358-410`, `:663-667` | Same LG3 property; currently held by layout accident. | **HARD** (must become explicit if chips move) |
| **Q4** | All Q&A gating stays **fully server-driven**. `questionsRemaining` / `diRemaining` come from `GET /qa/credit` and each answered turn's `remaining`; the hard stop comes from a **top-level 402** whose `cap` payload is adopted wholesale (`:308-312`) and whose `code` selects DI-lock vs question-cap (`:313-320`). **No client re-implementation of caps, no tier-based guessing.** The one client-side fallback is `nextTier` for CTA *copy* when no 402 payload exists (`:417-419`) — copy only, never access. | `qa.tsx:42-43`, `:189-193`, `:302-320` | Server is the single source of truth; caps and tiers change server-side without a client release. | **HARD** |
| **Q5** | The crisis/decline **answer text is rendered verbatim from `r.answer`** — the client never composes safety copy. Source of truth is the server (§6). | `qa.tsx:284`; server `server/src/services/qa-router.service.ts:192-200` | PM-approved verbatim strings. | **HARD** |
| **Q6** | `Bubble` stays at **module scope**; `Counters` / `EmptyState` / `LocationConsentBanner` / `Composer` / `QuestionCapCta` stay rendered as **function calls**, not JSX elements. | `qa.tsx:96-104`, `:648-651` | Inner components get a new identity each render → remounts the message list and the composer `TextInput` on every keystroke → keyboard focus loss. Documented in-file. **Note this fights normal React style — a reviewer's instinct will be to "fix" it.** | **HARD** |
| **Q7** | Device ID rides `X-Device-Id` **only on a Deep-Insight ask** (`deviceId` is `undefined` otherwise); location is captured **only** when consent is `'granted'`. | `qa.tsx:264-265`, `:249` | D5 anti-farming + D7 privacy minimisation. Sending either more widely is a privacy regression. | **HARD** |
| **Q8** | Location consent is asked **once**, persisted, and "Not now" keeps the birth-city fallback. Banner shows only while `'undecided'`. | `qa.tsx:459-513`, `:653` | D7 consent model. | **HARD** |
| **Q9** | Idempotency key per logical send; a network auto-retry of the same send reuses it. | `qa.tsx:65-70`, `:250`, `:271` | Prevents double-charging a question against the cap. | **HARD** |
| **Q10** | Everything visual: bubble shape, chip styling, composer chrome, colours, the `🔮` emoji, icon set, the `#3a2f13`/`#4a3c1c` DI-toggle tints (`:554-556`). | — | Restyle freely. | **SOFT** |

### 5.3 `readings/cosmic-report.tsx` — R9 Cosmic Report

| # | Invariant | File / line | Reason | |
|---|---|---|---|---|
| **R1** | 🔴 **The lock decision keys on `credit.limit === 0`, never on a tier name.** | `cosmic-report.tsx:207-211` + comment `:207-209` | Premium-Plus-only today (free *and* premium get `limit 0`). The tier→limit mapping is a **server-side, reversible** decision pending Sid's call (owner action P12). A client tier check would hard-code today's policy into a shipped binary. CLAUDE.md gotcha #20. | **HARD** |
| **R2** | The secondary lock path also comes from the server: `POST` returns `res.locked` → `setPhase('free-locked')`. | `cosmic-report.tsx:289-290` | Same. | **HARD** |
| **R3** | 🔴 **The async poll keeps all four of its properties**: (i) **recursive `setTimeout`** — never `setInterval`; (ii) **backoff** — success path `delay = min(delay + 1000, 8000)` from 3000, error path `min(delay + 2000, 10000)`; (iii) a `cancelled` flag checked after every `await`; (iv) cleanup returning `cancelled = true; clearTimeout(timer)`. | `cosmic-report.tsx:218-266` | `setInterval` would stack overlapping in-flight requests against a minutes-long LibreOffice render. Without the `cancelled` check + `clearTimeout`, navigating away mid-generation leaks a polling loop and calls `setState` after unmount. | **HARD** |
| **R4** | 🔴 **All six server-status-driven states remain distinct and driven purely by the server response** — never by a client guess. The `Phase` union is 9 wide (`:75-84`): `loading` and `error` are client-transport states, the other **seven** are server-driven: | `cosmic-report.tsx:75-84`, `:147-215`, `:224-266` | Each is a genuinely different user situation with different copy and CTAs. Collapsing any pair (e.g. `expired` into `failed`, or `paid-cap` into `free-locked`) shows users the wrong action. | **HARD** |
| | `generate` — eligible, no report this month | derived from `credit.limit > 0` + no current-month report | | |
| | `free-locked` — `credit.limit === 0` **or** `POST` → `res.locked` | `:210`, `:290` | | |
| | `paid-cap` — eligible but monthly slot already used | `:190-200` | | |
| | `generating` — `status ∈ {queued, generating}`, **or** rebuild with `regenerating` true | `:155-157`, `:230-232` | | |
| | `ready` — `status === 'ready'` **and** `!expired` **and** `secureLink` present | `:160`, `:233-234`, `:242-243` | | |
| | `expired` — `ready` but the presigned link has expired | `:243`, `:237` | | |
| | `failed` — `status === 'failed'` | `:158`, `:246-247` | | |
| **R5** | The **rebuild** path is distinguished from first-generation by `isRebuild`: on rebuild the report stays `ready` and completion is signalled by `regenerating` clearing, **not** by a status change. | `cosmic-report.tsx:230-240`, dep array `:266` | A rebuild never transitions through `queued`; treating it like a fresh generate would poll forever. | **HARD** |
| **R6** | `mountedRef` is checked after **every** `await` in all handlers (`:179`, `:185`, `:200`, `:281`, `:310`, `:331`, `:361`, `:379`, `:391`, `:412`). | `cosmic-report.tsx:130-137` + those sites | Presigned-URL fetches, a PDF download and a share can all outlive the screen. | **HARD** |
| **R7** | `sampleBusy` and `sharing` stay **separate** from `busy`. | `cosmic-report.tsx:119`, `:125`, `:128` + comments `:121-128` | Deliberate: the sample-open spinner and the share spinner must not couple to Generate/Rebuild's spinner. Merging them is the obvious "simplification" and it is wrong. | **HARD** |
| **R8** | `recordMeaningfulAction('reading:report')` fires from the `phase === 'ready'` effect, not from a render path. | `cosmic-report.tsx:269-271` | X4. | **HARD** |
| **R9** | Share gates on `dismissedAction !== true` / `isShareDismissal` before recording. | `cosmic-report.tsx:404-413` | X6. | **HARD** |
| **R10** | The sample affordance is **hidden** when `sampleLink === null` (not provisioned). | `cosmic-report.tsx:121-124`, `:140-142` | The sample object does not yet exist in prod R2 (owner action **P1**) — the affordance is currently dark by design. **Do not design a state that assumes the sample always exists.** | **HARD** |
| **R11** | All 902 lines of visual treatment: the phase layouts, `INSIDE_BULLETS` presentation (`:90-95`), `READING_SECTIONS` list (`:97-104`), `MetaPill`, `ValueTags`, `ReportTitleRow`, `NoticeLine`. | — | Restyle freely; keep the phase distinctions and the copy in §6. | **SOFT** |

### 5.4 `(auth)/verify-email.tsx`

| # | Invariant | File / line | Reason | |
|---|---|---|---|---|
| **V1** | `verificationToken` is read from the **top level** of the response body via `(verifyResponse as any).verificationToken`. **Do NOT "simplify" to `verifyResponse.data?.verificationToken`.** | `app/(auth)/verify-email.tsx:112` + comment `:109-110`; server `server/src/controllers/auth.controller.ts` | The backend returns it at the top level, not nested under `.data`. `.data?.verificationToken` is **always `undefined`** → breaks email signup entirely. CLAUDE.md gotcha #5. | **HARD** |
| **V2** | The falsy guard at `:114` and the `signup(...)` hand-off at `:119`. | `:114-119` | Same path. | **HARD** |

### 5.5 `(paywall)/index.tsx`

| # | Invariant | File / line | Reason | |
|---|---|---|---|---|
| **P1** | Read packages from **`offerings.current?.availablePackages`**, never `offerings.availablePackages`. | `app/(paywall)/index.tsx:35`, guard `:28` | CLAUDE.md / PROJECT_CONTEXT §11.6 — the latter is always empty; the paywall renders no products. | **HARD** |
| **P2** | Purchase and restore go through `subscriptionStore.purchasePackage` / `restorePurchases`. | `:47`, `:63`; `store/subscriptionStore.ts:57-99` | RevenueCat identity + tier propagation live there. Also the §8 seam. | **HARD** |
| **P3** | Layout / copy / product presentation. | — | **SOFT** — and this is the app's highest revenue-leverage surface. | **SOFT** |

### 5.6 Per-screen gating notes

| Screen | Invariant | |
|---|---|---|
| `(capture)/palm-capture.tsx` | Free tier captures **1** hand, paid captures **2** (`:53`, `:142`, `:188`, `:246`; step label `:460`). Mechanism A. A redesign of the stepper must preserve the 1-vs-2 branch. | **HARD** (behaviour) / **SOFT** (visuals) |
| `readings/combined.tsx` | `!isPremium` returns a **full-screen lock early** at `:108` — not an inline locked section. | **HARD** (behaviour) |
| `compatibility/index.tsx` | Free quota computed **client-side**: `tier === 'free' ? Math.max(0, 1 - readings.length) : Infinity` (`:39`). ⚠️ **This is mechanism A doing quota arithmetic on the client** — unlike R7/R9 it is not server-driven. Preserve it as-is during the revamp; **flag it to the owner as a candidate for server-side migration in a later build** (out of scope here). | **HARD** (preserve) + flagged |
| `readings/index.tsx` | Comment at `:121`: no tier pill on the Q&A entry **on purpose**, because the gate is server-side. `home.tsx:283` says the same. **Do not add a tier badge to Q&A entry points.** | **HARD** |

### 5.7 🔴 R1 VIOLATION REGISTER — five confirmed sites, with the ships-now / blocked split

> ## 🟢 STATUS: THE SHIPS-NOW HALF LANDED 2026-07-31 (`fix(build-27.1): R1 …`, 2 files, 38+/69−)
> **The table below is preserved as the original finding.** What actually shipped, and what is
> still blocked, is recorded immediately after it in **§5.7a**. 🔴 **Read §5.7a before re-opening
> any row here** — every "BLOCKED" cell is a *closed decision*, not an unfinished task.

Client-side tier checks that decide UI. Named "R1 violations" after the Build-27 R1 principle: **the
server owns entitlement; the client is a renderer.** These five surfaced during the 2.1 design pass
on Home and the Astrology hub and are the only ones inside the three screens that were actually
designed — **they are a subset, not the whole set.**

> **The full enumeration is `plans/build-27.1/preflight-findings.md` §B: 31 distinct gates across
> 12 files (77 raw JSX branches).** §B5 identifies the single field — an `entitlements` /
> `features` map on the hydrated user object (`server/src/controllers/auth.controller.ts:46-60`) or
> on `GET /api/subscription/status` — that would convert **nine** of the 31 from mechanism A to
> mechanism C. Everything below is scoped to what a **mobile-only 2.1.0** can do.

| Site | The violation | **SHIPS NOW** (mobile-only) | **BLOCKED** (needs server) |
|---|---|---|---|
| `home.tsx:336` — **Name Destiny** card | `if (tier === 'premium_plus')` in `onPress` decides navigate-vs-paywall, **plus** a hardcoded `PLUS` pill at `:350`. §B gate **#29**. | **Delete both the check and the pill. Always route; the destination decides.** | **Any lock plate on the row.** No hub payload carries a lock signal for Name Destiny — eligibility is a **monthly `NameAnalysis` document count**, server-side only. So Home shows **no lock affordance at all** and the row is visually identical to Astrology and Numerology. That is the honest state: the client genuinely does not know, so it must not imply that it does. |
| `home.tsx:363` — **Career Destiny** card | Same shape; hardcoded `PLUS` pill at `:377`. §B gate **#30**. | Same. | Same, except the signal is **staleness eligibility** rather than a doc count. |
| `astrology/index.tsx:136` — `const isPremium = tier !== 'free'` | Threaded into **five** `LifeThemeCard locked={!isPremium}` props (`:505, :511, :517, :523, :529`). §B gates **#5–#9**. 🔴 **Worse than the two Home cases**: those only chose where a tap went; this decides **what content renders** — and `astrology.routes.ts`'s `GET /birth-chart` does **no** tier filtering, so **the full life-themes prose is already in the payload for free users** and is hidden client-side. | **Delete the check. Render presence-driven**: a theme with a body expands; a theme whose body the server did not send renders as the title-only lock row (LockShell density 3). "Body absent" is already the signal and needs no new field. | **Distinguishing "withheld because unpaid" from "not generated yet."** No field carries it. Inventing one is server work (a `locked: string[]` on the response, or server-side omission of `lifeThemes` for free tier). |
| `astrology/index.tsx:561` — **Weekly Forecast** card | `if (tier !== 'premium_plus')` → `Alert.alert('Premium Feature', 'Upgrade to Premium Plus to unlock Weekly Forecasts and 7-day guidance.')` — **a tier name in body copy** — plus a hardcoded `PLUS` badge at `:582-584`. §B gate **#10**. | **Delete the check, the Alert and the badge. Route, and let the destination decide** — `insight.service.ts:667-669` already returns a 403. **No lock affordance**, for the same reason as Name/Career Destiny. | A pre-render entitlement map (§B5). Until then the client cannot know before navigating. |
| `astrology/index.tsx:30-48` — local `SectionCard`'s `locked` branch | Hardcodes `"Unlock with Premium"` + an `"Upgrade"` button pushing `/(paywall)/`. One of the **three** competing lock treatments (§9 Q13); four byte-identical copies exist (§3.4). | **Replace with the extracted `SectionCard` + one `LockShell`.** Renders the `locked` prop, names no tier. | — (nothing blocked; this one is pure consolidation) |

**Two coupling notes that will bite a partial fix:**

- **A PLUS pill and its gate are one unit.** `home.tsx:350`/`:377` are classified *status display* in
  §B because they render a badge rather than withhold content — but they are the **same `tier`
  expression, inverted**, as gates #29/#30. Change one and not the other and you get a card that
  says PLUS and navigates anyway, or vice versa.
- **`astrology/index.tsx:609`'s tier-conditional subtitle is NOT in this register** and survives the
  five deletions: `tier === 'free' ? 'Basic forecast with key dates' : 'Complete monthly guidance'`.
  It is copy selection, not access — but it means a tier read remains in the file after the R1
  cleanup, and the 2.1 design's comp shows only the `free` variant. Decide deliberately which
  string ships rather than discovering it in review.

### 5.7a 🟢 OWNERSHIP RECORD — what shipped 2026-07-31, and what is still blocked

**Commit**: `fix(build-27.1): R1 — the client stops deciding entitlement`. **Two files only**:
`mobile/app/(main)/home.tsx`, `mobile/app/(main)/astrology/index.tsx`. Behavioural by
construction, so it is **its own commit** and rides no identity or value pass (codemod-plan §6.1).

| # | site | 🟢 SHIPPED | 🔴 STILL BLOCKED — and this is a CLOSED decision, not a TODO |
|---|---|---|---|
| **1** | `home.tsx` **Name Destiny** | `tier === 'premium_plus'` deleted from `onPress` → **always** `router.push('/(main)/numerology/name-destiny')`. The `tier !== 'premium_plus'` **PLUS pill deleted** (pill + gate were one unit, and the pair moved together). Row is now visually identical to Astrology / Numerology. | **Any lock affordance on the row.** Eligibility is a **monthly `NameAnalysis` document count**, server-side only; no hub payload carries it. 🔴 **Do NOT add a pill, plate, 🔒 or dimmed state** — the client does not know, so it must not imply it does. Unblocks only with **§B5's entitlements map**. |
| **2** | `home.tsx` **Career Destiny** | Same two deletions; always routes to `/(main)/readings/career-destiny`. | Same, except the signal is **staleness eligibility** rather than a doc count. Same §B5 unblock. |
| **3** | `astrology/index.tsx` **five `LifeThemeCard`s** | `const isPremium = tier !== 'free'` **deleted** (declaration and all five `locked={!isPremium}` props). `LifeThemeCard` no longer takes a `locked` prop at all — it derives `hasBody = !!content` and renders **presence-driven**: body present → expandable with a chevron; body absent → **title-only**, `disabled`, **no chevron and no 🔒**. Its `useRouter`/paywall push is gone. | **Distinguishing "withheld because unpaid" from "not generated yet."** No field carries it, and `GET /birth-chart` does **no tier filtering** — the prose was already on the wire for free users and was being hidden client-side. Needs a `locked: string[]` on the response or server-side omission of `lifeThemes`. **`O-2`.** 🔴 A 🔒 here would be the client claiming knowledge it does not have — that is why the title-only variant has no lock glyph. |
| **4** | `astrology/index.tsx` **Weekly Forecast** | All three deleted: the `tier !== 'premium_plus'` check, the **`Alert` whose body copy named a tier** (*"Upgrade to Premium Plus to unlock…"*), and the `PLUS` / 🔒 badge ternary. Always routes to `/astrology/weekly`. The now-single-child flex-row wrapper collapsed into the title `Text` (`marginBottom: 4` moved onto it) so the card matches its Today's-Insights / Monthly siblings exactly — **layout-identical**. | A **pre-render entitlement map** (§B5). Until then the client cannot know before navigating. **`O-3`.** 🟢 The destination `astrology/weekly.tsx:24` already self-gates to a full-screen paywall (§B gate **#20**), so this tap has a real designed landing state. |
| **5** | the `PLUS` badge's **`color: 'black'`** | Deleted with site 4's badge. 🟢 **This was the LAST `no-raw-hex/keywords` residual: the gate now reads `keywords 0`** (was 1). Deliberately left for this commit rather than re-resolved in 1b's C8 — re-resolving code that is about to be deleted is waste. | — nothing blocked. |

**🔴 Four things a later session must NOT "finish":**

1. **The three sibling entry points are STILL GATED, on purpose — scope was §5.7's five sites only.**
   `numerology/index.tsx:324` (§B gate **#31**) and `readings/index.tsx:288`/`:330` (§B gates
   **#62**/**#63**) each still bounce a non-Plus user to the paywall for the *same two destinations*
   Home now always routes to. **So after this commit three hubs offer Name Destiny and only one of
   them always-routes.** That inconsistency is **known and accepted**, not an oversight: those sites
   were never in the designed screens, and `readings/index.tsx` additionally swaps *copy* on tier
   (`'Unlock your name analysis'` / `'Upgrade to Unlock'`), which is a PM call, not a codemod.
2. **`astrology/index.tsx`'s local `SectionCard` `locked` branch was NOT touched.** Audit §5.7's
   own fifth row calls for replacing it with the extracted `SectionCard` + one `LockShell` — that is
   **§9 primitives work**, not this commit. It is currently **unreached** (no call site passes
   `locked`) and its `"Unlock with Premium"` + `Upgrade` copy is intact.
3. **`astrology/index.tsx:594`'s tier-conditional Monthly subtitle survives**, as predicted above —
   `tier` is still read in the file for exactly that one string. **Copy selection, not access.**
4. **`home.tsx:47`'s fetch guard survives** and must. It decides whether to *ask*, not what to show
   (§6.4); the card self-hides when the server sends nothing.

**🟠 One consequence this commit creates, registered as `O-27`:** the lock surface **moved from the
hub to the destination**, and for Name/Career Destiny the destination's lock surface today is a raw
server error string. `name-destiny.tsx` / `career-destiny.tsx` swallow the 403 on mount
(`fetchExisting`'s bare `catch`) and show the normal generate CTA; tapping **Generate** then renders
`subscription.middleware.ts:41`'s `"This feature requires premium_plus subscription"` inline in
`text-danger`, **with no upgrade CTA and a raw tier slug in user-facing copy**. Honest and
non-crashing, but it is now a real surface. See codemod-plan §12.

---

## 6. COPY-LOCKED SURFACES

Strings that are PM/Sid-approved or compliance-required. **These are not design variables.**
A designer may change the container, typography, colour and placement-within-screen; **not the words.**

### 6.1 R7 safety copy — server-authored, transcribed verbatim from an approved guide

Source: `server/src/services/qa-router.service.ts:186-200`. Header comment at `:186-188`:
*"VERBATIM guide strings — user-facing. Transcribed exactly from
`plans/build-27/R7-OffTopic_Unsafe_Crisis_Guide.md` (curly apostrophes kept)."*

| Surface | String | Owner |
|---|---|---|
| **Crisis** (`CRISIS_RESOURCE_TEXT`, `:192-193`) | "I know things feel really heavy right now. I'm not able to help with this one, but please don't go through it alone. Please reach out to a mental health crisis line in your area, they're trained for exactly this, or talk to someone you trust right now." | **Sid** — confirmed FINAL (not a stopgap) in Rule Set v1.1 §5, 2026-07-23; logged in `tracking_files/sid-signoff.md` as **S-R7b/D6 RESOLVED**. Ship gate `CRISIS_WORDING_FINALIZED = true` (`:213`). |
| **Unsafe** (`UNSAFE_DECLINE_TEXT`, `:196`) | "I can't help with that one, try a different question." | **Sid** — guide Step 7, cleared for direct build (never gated). |
| **Off-topic** (`OFF_TOPIC_DECLINE_TEXT`, `:199-200`) | "I'm built to help with questions about your own chart and life, not general topics. Try asking something like 'what does my chart say about...'" | **Sid** — guide Step 7. |

**Notes for the designer:**
- **Curly apostrophes (`'`) and curly quotes (`'…'`) are intentional** and part of the approved
  transcription. Do not normalise them to ASCII.
- These strings are **never in the mobile bundle**. The client renders `r.answer` verbatim
  (`qa.tsx:284`). There is nothing to restyle here except the plain bubble treatment (§5 Q1h).
- `CRISIS_WORDING_FINALIZED` (`:213`) remains the single ship gate and must still be consulted by
  the serving path — a documented server-side property, out of scope for the revamp but do not
  design around its removal.
- An **optional, unbuilt** 4-market country-append (US/CA 988, IN Tele-MANAS 14416, BR CVV 188) is
  noted at `:210-211` as an owner's-call 27.1 fast-follow. **Not built.** If the owner greenlights
  it during the revamp window, the crisis surface gains numbers — worth asking (§9 Q4).

### 6.2 Entertainment / advice disclaimers — compliance-required

| Surface | String | File | Owner |
|---|---|---|---|
| Shared component (7 screens) | "Revelia readings are for entertainment and self-reflection purposes only. They should not be used as a substitute for professional medical, financial, legal, or psychological advice." | `components/common/EntertainmentDisclaimer.tsx:8-10` | Compliance / owner |
| Cosmic Report long | "Takes a few minutes. We'll email you and it will appear here when it's ready.\nFor insight and entertainment. Not medical, legal, or financial advice." | `cosmic-report.tsx:86-87` (`FINE_PRINT_LONG`) | Compliance / owner |
| Cosmic Report short | "For insight and entertainment. Not medical, legal, or financial advice." | `cosmic-report.tsx:88` (`FINE_PRINT_SHORT`) | Compliance / owner |
| Name destiny | "For entertainment purposes only. Name numerology is based on Pythagorean traditions and should not be used as a basis for legal name changes." | `numerology/name-destiny.tsx:332` | Compliance / owner |
| Career destiny | "For entertainment purposes only. Career guidance is based on astrological and numerological traditions and should not replace professional career counseling." | `readings/career-destiny.tsx:184` | Compliance / owner |
| Profile footer | "Revelia readings are for entertainment and self-reflection purposes only." (**truncated variant** of the shared string) | `profile.tsx:646` | Compliance / owner |

**⚠️ AMBIGUOUS — flag to the owner (§9 Q3).** These are **six different strings** expressing
overlapping obligations, and `profile.tsx:646` is a hand-truncated copy of the shared component's
text rather than a use of the component. Whether that divergence is deliberate (per-surface
tailoring) or drift is not determinable from code. **Until the owner rules, treat all six as
copy-locked and do not consolidate them** — consolidating a compliance string is not a design
decision.

### 6.3 Monetisation copy — likely PM-owned, verify before changing

| String | File | Note |
|---|---|---|
| "You've used this month's questions" | `qa.tsx:431` | Cap CTA headline |
| "Your questions reset on {date}." / " Don't want to wait? Upgrade now" | `qa.tsx:442-444` | Composed; the reset date is server-supplied |
| "Upgrade and unlock more questions" | `qa.tsx:448` | Cap CTA button |
| "You've used your Deep Insight this month." + "Upgrade" | `qa.tsx:533`, `:536` | DI sub-cap note |
| "Deep Insight" | `qa.tsx:573` | Feature name — **product naming, treat as locked** |
| ~~"Ask the stars"~~ → **"AI Astrologer"** | `qa.tsx` (screen title) | Screen title — **product naming.** 🔴 **RENAMED BY PM, 2026-08-03; applied 2026-08-05.** The lock now attaches to the new string, at all THREE user-facing sites (this screen title plus both entry points: `home.tsx`'s Explore row and the readings-hub card). Retires design `C-3` row 4 — the two-casings divergence is resolved by RETIREMENT, not convergence. ⚠️ "Deep Insight" below is the premium mode INSIDE this feature and is **unchanged**. |
| "Unlock with Premium" / "Upgrade" | 4× duplicated `SectionCard`, §3.4 | Repeated in `astrology/index`, `face`, `palm`, `compatibility/[id]` |
| Tier display names | `profile.tsx:238`, `:314` (`tierDisplay` map) | |

### 6.4 Q&A onboarding + suggestion copy — probably design-changeable, confirm

| String | File |
|---|---|
| "Ask about your path" | `qa.tsx:374` |
| "Grounded in your birth chart. Ask about timing, direction, or what a season is really about." | `qa.tsx:386-387` |
| `SUGGESTIONS`: "Is this a good time to change jobs?" / "What should I focus on this month?" / "How are my relationships looking right now?" | `qa.tsx:90-94` |
| Location consent: "Time readings to where you are" + "Revelia can use your approximate (city-level) location for this question only, to time your reading. Otherwise we use your birth city. You can change this anytime." + "Not now" | `qa.tsx:474`, `:478-481`, `:509` |

**⚠️** The location-consent body text is a **privacy disclosure**, not marketing copy. The
permission strings it mirrors are locked in `app.json` (`plugins → expo-location →
locationWhenInUsePermission`, and iOS `NSLocationWhenInUseUsageDescription`). **Treat the consent
banner text as copy-locked**; the surrounding banner is SOFT.

### 6.5 Report content structure — server-determined

`READING_SECTIONS` (`cosmic-report.tsx:97-104`) — "Two Charts, One Sky", "The Person", "The Clock",
"Life Domains", "The Decades", "Number and Hand" — mirrors the **server's actual PDF section
order**. And `INSIDE_BULLETS` (`:90-95`) describes what the PDF contains. **Changing either
misdescribes the delivered artefact.** Locked until the server's report template changes.

### 6.6 App-store / OS-surface strings — locked in `app.json`

All camera / photo / Face ID / location permission rationales (`app.json:29-34`, `:70-86`) are
store-reviewed. Out of scope for the revamp, listed so nobody edits them incidentally.

---

## 7. TECHNICAL CEILING — constraints the design must respect

### 7.1 The styling contract

- **NativeWind 4.1.23 + Tailwind 3.4.17** (`mobile/package.json:40`, `:63`).
  `global.css` is the bare three `@tailwind` directives; `tailwind.config.js` uses
  `presets: [require('nativewind/preset')]`.
- 🔴 **The design must resolve to a finite Tailwind utility token set — not arbitrary CSS.**
  This is React Native, not the web. **There is no CSS.** No cascade, no pseudo-selectors
  (`:hover`, `:before`, `:after`), no `calc()`, no CSS filters, no `background-image`, no
  `box-shadow` spread/inset semantics, no CSS transitions, no media queries beyond what
  NativeWind polyfills, no `position: fixed`, no `z-index` stacking contexts in the web sense.
  Every visual decision must be expressible as either a Tailwind utility or a React Native style
  property.
- Practical consequence: hand the engineer a **token table** (named colours, a closed type ramp,
  a closed radius scale, a spacing scale), not a set of comps with eyedropped values. §2.6
  explains why — the app already has 64 hex values and 29 font sizes precisely because comps were
  implemented by eye.
- **Three styling idioms coexist** and the revamp will meet all three: `className` (NativeWind),
  inline `style={{}}` (664 sites), and `StyleSheet.create` (16 files). Any token must be reachable
  from all three — which is exactly why `lib/colors.ts` exists alongside `tailwind.config.js`.

### 7.2 Runtime

- **React Native 0.79.6**, **Expo SDK 53**, **React 19.0.0**, **TypeScript 5.8.3**.
- **Hermes** (`app.json:12`, plus per-platform `jsEngine: "hermes"` at `:26` and `:42`).
- **`newArchEnabled: true`** (`app.json:10`). 🔴 **Must stay** — OneSignal v5 TurboModule crashes
  at import without it (CLAUDE.md).
- **`react-native-purchases ^9.7.5`** runs on the **RN 0.79 old-architecture interop layer** — it
  has no `codegenConfig`. Expected and working; **not a bug, do not "fix" it.** Practical impact
  for the revamp: the paywall's RevenueCat surface is the one place where a native-module
  interaction is on the legacy bridge. Avoid designing the paywall around aggressive
  frame-synchronised animation tied to purchase callbacks.
- **`expo-updates`** is configured with `checkAutomatically: "ON_ERROR_RECOVERY"` and
  `runtimeVersion.policy: "appVersion"` (`app.json:110-118`). A revamp that only changes JS/styles
  *could* in principle ship as an OTA update within the same `appVersion` — but since 2.1.0 bumps
  the version, it will be a full build. Noted so nobody plans an OTA-only revamp.

### 7.3 🔴 Visual libraries — ACTUALLY INSTALLED (verified, not assumed)

| Library | Version | Installed | In use | Where |
|---|---|---|---|---|
| **`expo-linear-gradient`** | `~14.1.5` | ✅ direct dep (`package.json:30`) | ✅ **21 files** | `Button` (primary variant), `ScreenContainer`, `LoadingSpinner`, `welcome`, `home`, `numerology/index`, `readings/index`, `ShareCard`, `ShareableQuote`, `AffirmationCard`, `ArchetypeHeader`, `DestinyCard`, `GeneratingReading`, `GrowthCard`, `ProfileHeader`, `SunSignReveal`, `DailyInsightCard`, `StreakBadge`, `CompatibilityShareCard`, `BiometricConsent`, `ErrorBoundary` |
| **`expo-blur`** | `~14.1.5` | ✅ direct dep (`package.json:21`) | ✅ **4 files** | `AffirmationCard:30`, `GrowthCard:24`, `PalmLineCard:24`, `ScoreCard:43` — all `BlurView intensity={20}` as the **locked-content treatment** |
| **`react-native-svg`** | `15.11.2` | ✅ direct dep (`package.json:52`) | ✅ **2 files** | `BirthChartWheel`, `CompatibilityScoreRing` |
| **`expo-haptics`** | `~14.1.4` | ✅ direct dep (`package.json:27`) | ✅ **25 files** | `Button:51` (every press, `ImpactFeedbackStyle.Medium`), plus 24 screens/components |
| **`react-native-reanimated`** | `~3.17.4` | ✅ direct dep (`package.json:48`) | ✅ 7 files | §4 |
| **`@expo/vector-icons`** | `14.1.0` | ⚠️ **in `node_modules` but NOT in `mobile/package.json` dependencies** — transitive via `expo` | ✅ **13 files** | `Ionicons` only. Tab bar (`(main)/_layout.tsx`), `qa.tsx`, `cosmic-report.tsx`, `career-destiny`, `combined`, `astrology/index`, `name-destiny`, `face-capture`, `palm-capture`, `CaptureInfoModal`, `TimezonePicker`, `FeatureComparisonTable`, `cosmic-report-history` |
| **`react-native-view-shot`** | `^4.0.0-alpha.2` | ✅ direct dep (`package.json:53`) | ✅ | share-card capture. **Note: an alpha version.** |
| **`react-native-share`** | `^12.3.1` | ✅ direct dep (`package.json:51`) | ✅ | §5 X6 |
| **`react-native-safe-area-context`** | `5.4.0` | ✅ direct dep (`package.json:49`) | ✅ | §7.5 |
| `expo-font` | — | ⚠️ `node_modules` only (transitive), **not a direct dep** | ❌ **unused** | §7.4 |

**So the answer to "do not assume expo-blur / expo-linear-gradient are present"**: both **are**
present, both **are** in active use, and blur already carries a specific semantic (locked content).
A designer proposing blur for a *different* purpose (frosted nav bars, modal scrims) should know
it will read as "locked" to existing users unless the lock treatment changes too.

**What a designer would need to REQUEST (not currently available):**

| Want | Status | What it costs |
|---|---|---|
| A **custom/brand typeface** | ❌ nothing bundled | Add `expo-font` as a direct dep + font files in `assets/` + a `useFonts` gate in `app/_layout.tsx`. **See §7.4 for the licensing constraint.** |
| **Icon set other than Ionicons** | ⚠️ `@expo/vector-icons` bundles many families (MaterialIcons, Feather, FontAwesome…) but only `Ionicons` is used | Free if staying inside `@expo/vector-icons` — but **promote it to a direct dependency first**, since relying on a transitive dep is fragile across Expo upgrades. A *custom* icon set means SVG assets + `react-native-svg` (already present). |
| **Lottie / vector animation** | ❌ not installed | Add `lottie-react-native`. New native module → new build, and it must be verified against `newArchEnabled: true`. |
| **Skia / advanced 2D** | ❌ not installed | Add `@shopify/react-native-skia`. Heavy; new-arch compatibility must be verified. |
| **Bottom-sheet gestures** | ⚠️ `react-native-gesture-handler ~2.24.0` is installed but only as the root provider | Adding `@gorhom/bottom-sheet` is JS-only on top of existing native deps — the cheapest new interaction primitive available. |
| **Mesh gradients / noise / grain** | ❌ | Not achievable with `expo-linear-gradient`. Needs Skia, or ship pre-rendered PNG/WebP assets (cheapest — and consistent with how `splash.png` already works). |
| **Shadows / elevation system** | ⚠️ technically available (`shadowColor`/`elevation`) but §2.5 shows it is effectively unused | Free to add, but it is a **new system**, not a restyle. Android `elevation` and iOS `shadow*` behave differently and need per-platform tuning. |

### 7.4 🔴 Font licensing constraint

**Mobile currently bundles no custom font.** `tailwind.config.js:32-34` declares
`sans: ['System']` and nothing sets `fontFamily` anywhere in `app/` or `components/`.
All type renders in the platform system font — **Roboto on Android, SF Pro on iOS**. Two
consequences a designer must accept or explicitly overturn:

1. **Type currently looks different on the two platforms.** Any comp built on SF will not match
   Android, and vice versa.
2. **Adding a custom font is a licensing decision, and this project already has scar tissue here.**
   The server had to alias **Georgia → DejaVu Serif** via fontconfig for the R9 PDF pipeline
   *specifically because Georgia is non-redistributable* (`PROJECT_CONTEXT.md:55`; the alias lives
   in `server/Dockerfile`'s fontconfig setup). Bundling a font in the mobile app is
   **redistribution**, exactly the thing that blocked Georgia server-side.

→ **Constraint for the designer: any proposed typeface must be redistributable in a shipped mobile
binary — SIL OFL, Apache 2.0, or an explicitly purchased app-embedding licence. System fonts and
"looks like Georgia" are not options.**

→ **Bonus consideration**: if the revamp introduces a brand typeface, the **R9 PDF** will still
render in DejaVu Serif unless the server's fontconfig is updated too. The app and its flagship
paid artefact would visibly diverge. Flag this to the owner (§9 Q5) — it is a cross-surface
consequence of a mobile-only decision, and resolving it is server work outside this branch's
usual scope.

### 7.5 Safe-area handling

- `SafeAreaProvider` wraps the tree at `app/_layout.tsx:210`, inside
  `GestureHandlerRootView` (`:209`). Both carry `backgroundColor: BRAND_BG` (`= '#0F0A1A'`, `:32`),
  as does an additional `View` at `:213` — **three nested brand-background layers**, deliberate
  belt-and-braces against a white flash on cold start (see the splash comment at `:20-28`).
- **Top/side insets**: handled by `SafeAreaView` from `react-native-safe-area-context` inside
  `ScreenContainer:117-125`. Only `qa.tsx:632` passes explicit `edges={['top','bottom']}`;
  everything else takes all edges.
- 🔴 **Bottom inset is a special case**: `hooks/useBottomInsetPadding.ts` returns
  `insets.bottom + tabBarHeight + extraBottom` (default `extraBottom = 16`). It exists as a
  **Build 22 fix for Android-only clipping** on Home (Recent Readings), Face Reading, Monthly
  Reading, Profile (disclaimer trail), and Compatibility ("View Past Readings" — a *functional*
  blocker, not cosmetic). `useBottomTabBarHeight()` throws outside a tab navigator, so it is
  wrapped in `try/catch` returning 0 (`:24-29`).
  → **Any redesign of bottom-anchored content on those screens must keep using this hook.**
  On iOS the home-indicator inset propagated through `SafeAreaView` already; on Android the
  system nav bar is not part of the safe area, hence the explicit padding. **HARD.**
- Tab bar is `height: 85, paddingBottom: 24` (`(main)/_layout.tsx:15-16`) — a hand-tuned figure
  that interacts with `useBottomInsetPadding`. Changing tab-bar height means re-verifying all five
  Build-22 screens on Android.

### 7.6 Device / orientation constraints

- **`orientation: "portrait"`** (`app.json:7`) — portrait only. No landscape layouts needed.
- **`userInterfaceStyle: "dark"`** (`app.json:8`) — 🔴 **the app is dark-mode only.** There is no
  light theme, no `useColorScheme()` call anywhere, no `dark:` Tailwind variants in use.
  See §9 Q1 — if the owner wants light mode, that is a **materially larger project** than a
  re-skin (it makes every one of the 401 hardcoded hex literals a two-value decision).
- **`ios.supportsTablet: true`** (`app.json:23`) — ⚠️ tablets are *enabled* but `ScreenContainer`
  pins to `Dimensions.get('window')` and content padding is a flat `24`. **There is no tablet
  layout.** On iPad this renders as a stretched phone layout. Whether that is acceptable is
  **⚠️ AMBIGUOUS** — §9 Q2.
- **Android SDK**: `compileSdkVersion 36`, `targetSdkVersion 36`, `buildToolsVersion "36.0.0"`
  (`app.json:88-92`) — Android 16, per the recent `e588f87` commit. **`minSdkVersion` is NOT set**,
  so it falls back to the Expo SDK 53 default. §9 Q9 — the designer needs the real floor to know
  which Android versions must render the design.
- **iOS**: `deploymentTarget: "15.1"` (`app.json:94`).
- **⚠️ No tested screen-size range is recorded anywhere in the repo** — no device matrix in
  `tracking_files/build-27-testing.md`'s structure that this audit can point to as authoritative.
  §9 Q2.

---

## 8. FUTURE-INSTRUMENTATION SEAM MAP

**No analytics exists in this app today.** Verified: no Amplitude / Mixpanel / Segment / Firebase
Analytics / PostHog dependency in `mobile/package.json`. The only telemetry-ish surfaces are
OneSignal user tags (`profile.tsx:138` sets `{ tier, timezone }`) and `services/diagnostic.service.ts`.

**Nothing below is to be built now.** The point is narrower and worth stating precisely: for each
event, if the capture point lives in a **store or lib function**, then rewriting the screen leaves
instrumentation untouched. If it lives **only in a screen**, the revamp will delete or move it and
the seam has to be rebuilt later. So: **as the revamp rewrites each screen, move the event-worthy
logic down into the store/lib. That costs nothing extra during a rewrite and buys the seam for free.**

| Event | Recommended capture point | Status today | Action during the revamp |
|---|---|---|---|
| **`reading_completed`** | `store/reviewStore.ts:118` — **`recordMeaningfulAction(key)`**. Already the single funnel for every reading type: `reading:face`, `reading:palm`, `reading:astrology`, `reading:career`, `reading:nameDestiny`, `reading:report`, `daily:<date>`, `monthly:<month>`, `compat:<id>`, `astrologer:<date>`. Its built-in dedup is exactly the semantics an analytics event wants. | ✅ **seam already exists and is ideal** | Nothing. Just keep X4 (§5) — do not scatter review/analytics calls back into screens. |
| **`share_completed`** | `utils/shareReading.ts:26` — **`shareReadingCard()`**, at the `return true` points. The boolean already distinguishes a real share from a dismissal (X6), which is precisely the real-vs-phantom distinction analytics needs. | ⚠️ **partial.** `ShareCard.tsx:38` and `ShareableQuote.tsx:20` route through it. **But two screens bypass it**: `compatibility/[id].tsx:89` defines its **own local `shareReadingCard`** (importing only `isShareDismissal`), and `cosmic-report.tsx:395-413` hand-rolls a PDF-attaching share. **🔴 FLAG** | **Converge the two bypasses onto the shared helper** (or onto a shared helper that accepts an optional file attachment) while rewriting those two screens. That single change makes `share_completed` a one-line instrumentation later instead of a three-site hunt. |
| **`paywall_shown`** | ⚠️ **Currently screen-only.** There is **no** `openPaywall()` helper. Navigation to the paywall is an ad-hoc `router.push('/(paywall)/')` at **≥8 sites**: `qa.tsx:211` (`openPaywall`, local), `astrology/index.tsx:43` (inside the duplicated `SectionCard`), `astrology/weekly.tsx:48`, `astrology/daily.tsx:142`, `readings/index.tsx:61`, `numerology/index.tsx:666`, `profile.tsx:306`, `profile.tsx:340`, plus the 3 other `SectionCard` copies and `LockedSection`. **`hooks/usePaywall.ts` exists but no screen imports it.** **🔴 FLAG — worst seam in the app.** | ❌ **screen-only, 8+ origins** | **Highest-value seam fix, and it comes free with work already scheduled.** Extracting the duplicated `SectionCard` (§3.4, ranked #4 in §3.5) collapses 4 of these sites by itself. Route the rest through **one** `openPaywall(source: string)` helper — either revive `hooks/usePaywall.ts` or add a function to `subscriptionStore`. The `source` argument is what makes the eventual event useful (which lock converts?), and it is far cheaper to thread now than to retrofit. |
| **`paywall_purchased`** | `store/subscriptionStore.ts:57` — **`purchasePackage(pkg)`**. Also `restorePurchases` at `:82` for the restore path. | ✅ **seam exists** | Nothing. Keep P2 (§5) — do not call RevenueCat directly from the redesigned paywall. |
| **`qa_asked`** | `lib/qa.ts:111` — **`askQuestion(input)`**, on the `res.ok` branch. Has `deepInsight`, `conversationId`, and the server's `mode` in scope — every dimension the event would want. | ✅ **seam exists** | Nothing. |
| **`qa_cap_hit`** | `lib/qa.ts:111` — same function, on the **top-level 402** branch where the `cap` payload is parsed. `cap.code` already distinguishes `question_limit_reached` from `deep_insight_limit_reached`. | ✅ **seam exists** | Nothing. **Do not** move 402 interpretation into the screen while redesigning `qa.tsx` — §5 Q4 forbids it anyway, and it would destroy this seam. |
| **`report_enqueued`** | `lib/reports.ts:106` — **`createReport()`**, on the success branch. Note `res.locked` is also observable here, which would give a free `report_blocked` event. | ✅ **seam exists** | Nothing. |
| **`report_ready`** | ⚠️ **Currently screen-only.** The `ready` transition is decided inside `cosmic-report.tsx`'s poll effect (`:242-243`, `:233-234`) — the transition is *derived* in the screen from `getReport()`'s raw payload, and `lib/reports.ts:95` `getReport()` sees only a single poll response, not the transition. **🔴 FLAG** | ❌ **screen-only** | **Recommendation**: while rewriting the R9 hub, lift the poll into a store (e.g. `reportsStore` with a `pollReport(id)` action) or into a `lib/reports.ts` helper that owns the loop. Then `queued/generating → ready` is a store-level transition and instruments once. **⚠️ This must preserve every property in §5 R3–R5** — recursive `setTimeout`, both backoff curves, the `cancelled` flag, the cleanup, the `isRebuild` distinction, and all seven server-driven phases. Moving the loop is a refactor with real regression risk; if the revamp cannot do it safely, **leave it in the screen** and accept that `report_ready` needs a bespoke hook later. Say so rather than half-moving it. |
| **`report_failed`** | ⚠️ Same as `report_ready` — decided at `cosmic-report.tsx:246-247` (poll) and `:158` (initial load). Note there are also **two distinct failure shapes**: `status === 'failed'` and the rebuild-failure path that lands on `expired` with a notice (`:236-237`). | ❌ **screen-only** | Same recommendation and the same caveat. If the poll moves, capture both failure shapes distinctly. |

**Summary of the three flagged events**: `paywall_shown` (8+ screen origins, no helper),
`report_ready` and `report_failed` (both derived inside the R9 screen's poll effect).
`share_completed` is partially flagged (2 of 4 sites bypass the shared helper).
Everything else already has a store/lib seam that a screen rewrite cannot break.

**The cheap win**: `paywall_shown`. It requires no new abstraction beyond one function, it removes
duplication the revamp is already committed to removing (§3.4/§3.5 #4), and it is the event most
directly tied to revenue. Do that one even if `report_ready` is deemed too risky to move.

---

## 9. OPEN QUESTIONS FOR THE OWNER

Undeterminable from code. Each is a real fork in the design work, and the ones marked 🔴 change the
size of the project — answer those before design starts.

| # | Question | Why it matters | What the code says |
|---|---|---|---|
| **Q1** 🔴 | **Is there a light mode, ever?** | This is the single biggest scoping question. `userInterfaceStyle: "dark"` (`app.json:8`) is dark-only, `StatusBar style="light"` is hardcoded (`app/_layout.tsx:211`), no `useColorScheme()` call exists, no `dark:` Tailwind variants are used, and three nested layers hardcode `BRAND_BG`. **If light mode is in scope, every one of the 401 hardcoded hex literals becomes a two-value decision and the codemod in §2.6 roughly doubles.** If it is explicitly out of scope, say so in writing so the token set can stay single-valued. | Dark-only today, with no scaffolding for anything else. |
| **Q2** 🔴 | **What screen sizes and devices are actually tested?** And **is iPad a real target?** | `ios.supportsTablet: true` (`app.json:23`) *enables* iPad, but `ScreenContainer` pins to `Dimensions.get('window')` with a flat `24` content padding and there is no tablet branch anywhere — iPad gets a stretched phone layout. Nothing in the repo records a tested device matrix. A designer needs the real range (smallest width especially) to know whether a 2-column layout or a larger type ramp is safe. | Portrait-only, no tablet layout, no recorded matrix. |
| **Q3** | **Should the six divergent disclaimer strings be consolidated?** | §6.2 lists six overlapping strings, including `profile.tsx:646` which is a hand-truncated copy of the shared component's text. Consolidating a compliance string is a legal/compliance call, not a design one. **Until answered, the audit's instruction is: treat all six as locked, change none.** | 6 strings, 1 shared component used on 7 screens, 5 one-off variants. |
| **Q4** | **Is the 4-market crisis-number append happening in the 27.1 window?** | `qa-router.service.ts:210-211` documents an optional, unbuilt append (US/CA 988, IN Tele-MANAS 14416, BR CVV 188), explicitly "owner's call, zero launch dependency", tracked in `build-27-caveats.md`. If it lands during the revamp, the crisis surface gains structured content and the designer should account for it. | Not built. `CRISIS_WORDING_FINALIZED = true` with the general, number-free wording. |
| **Q5** | **If the revamp introduces a brand typeface, does the R9 PDF follow?** | §7.4: mobile bundles no font; the server's PDF pipeline aliases Georgia → DejaVu Serif because Georgia is non-redistributable. A new mobile typeface would make the app and its flagship paid deliverable visibly diverge unless the server's fontconfig (`server/Dockerfile`) is updated too — **server work, outside this branch's usual point-release scope.** | Mobile: `sans: ['System']`, no font assets. Server: DejaVu Serif alias. |
| **Q6** | **Is `(capture)`'s `#0A0A0F` background deliberate?** | `app/(capture)/_layout.tsx:8` uses `#0A0A0F` where every other layout uses `#0F0A1A`. It appears exactly once in the entire codebase. Plausibly a deliberate darker camera surface; equally plausibly a digit transposition. The token phase must either name it or delete it. | One occurrence, no explanatory comment. |
| **Q7** | **Is there a known jank complaint, or a perf baseline?** | §4 found no `LayoutAnimation`, no `cancelAnimation`, one legacy `Animated` file, and default within-group screen transitions — but **no profiling artefacts and no perf tests in the repo**. The motion phase should target real complaints, not guesses. Also: any user reports about the `GeneratingReading` wait (a 60s+ experience)? | No baseline recorded. |
| **Q8** | **Is any usage data available at all** (Play Console, RevenueCat dashboards, server logs)? | §1's traffic column is inferred from navigation topology only, and §3.5's leverage ranking uses screen *count*, not screen *visits*. If Play Console or RevenueCat data exists, it could materially reorder the revamp priority — e.g. if the paywall or the Q&A chat sees far more traffic than their screen count implies. | No client analytics. `profile.tsx:138` sets OneSignal tags; `diagnostic.service.ts` exists. |
| **Q9** | **What is the real `minSdkVersion` floor** (and is there an accessibility baseline)? | `app.json:88-92` sets `compileSdk`/`targetSdk` 36 but **not** `minSdkVersion` — it inherits the Expo SDK 53 default rather than stating a project intent. Separately: **no accessibility work is present anywhere** — no `accessibilityLabel`, no `accessibilityRole`, no dynamic-type handling, and the fixed pixel font sizes in §2.4 will not scale with OS font-size settings. Is WCAG-ish contrast or a minimum tap-target size a requirement, or explicitly not? | `minSdkVersion` unset; zero accessibility props found. |
| **Q10** | **Is `react-native-view-shot@^4.0.0-alpha.2` (an alpha) acceptable to keep?** | It underpins every share card (§3.5 #9/#10) — the app's main organic-growth surface. If the revamp reworks share cards, it may be the moment to move off an alpha. Out of scope to change here; worth an explicit decision. | `mobile/package.json:53`. |
| **Q11** | **Should `compatibility/index.tsx`'s client-side free quota move server-side?** | `:39` computes `tier === 'free' ? Math.max(0, 1 - readings.length) : Infinity` **on the client** — inconsistent with the server-driven model R7 and R9 use. §5.6 says preserve it during the revamp, but it is a latent policy-change-requires-a-release problem. Likely a `feature/build-28` item, not 27.1. | Client-side arithmetic. |
| **Q12** | **Confirm the 4 dead components can be deleted**, and the dead Tailwind tokens with them. | §3.3: `SkeletonCard`, `LuckyElementCard`, `LockedOverlay`, `PremiumBadge` have zero live references. §2.2: the whole `cosmic.*` nest and `primary-light` have zero className usages. Deleting all of it shrinks the re-skin surface for free — but confirm nothing planned depends on them. | Verified zero references by grep across `app/` + `components/`. |
| **Q13** | **Three competing "locked" treatments exist — which survives?** | (a) the duplicated `SectionCard` inline lock ("Unlock with Premium" + Upgrade, 4 screens); (b) `LockedSection`/`LockedBanner` (3 screens); (c) `BlurView intensity={20}` (4 components). Unifying them is a design decision with a behavioural consequence — each currently appears in a different context. | All three live simultaneously. |

---

## Appendix A — verification performed

- `npx tsc --noEmit` in `mobile/` — **clean, 0 errors**.
- `npx tsc --noEmit` in `server/` — **clean, 0 errors**.
- Both confirm this audit changed nothing that compiles. **Only one file was created:** this one.
  No product code, no dependencies, no styling, no config touched.

## Appendix B — counting methodology

So the numbers in §2.6 can be re-derived or challenged.

- Scope for every count: `mobile/app/` + `mobile/components/`, 93 `.tsx` files.
- **Hex literals**: `grep -rEoh "#[0-9A-Fa-f]{3,8}\b"` → 404 raw hits. Manually excluded 3 HTML
  numeric entities (`&#10003;`, `&#10024;`, `&#8226;`) → **401**. Distinct values counted
  case-insensitively (uppercased before `sort | uniq`) → **64**.
- **Inline style objects**: `grep -rEoh "style=\{\{"` → **664**. This counts *object literals*, so a
  single object carrying colour + size + radius counts once here but three times in the
  per-property rows below it. The per-property counts (`color:` 387, `fontSize:` 361, etc.) are
  independent `grep -rEoh "\bcolor\s*:"`-style counts and include properties inside
  `StyleSheet.create` blocks as well as inline objects. **The two families are not additive.**
- **className counts**: `grep -rEoh "\b(bg|text|border)-<token>\b"` per token. These count
  *occurrences in source*, not render-time instances — a class inside a `.map` renders many times
  but counts once.
- **Component "screens" counts** (§3): `grep -rl "\b<Name>\b" app --include=*.tsx`. This is a
  name match, so it can over-count where a screen defines a **local** component with the same
  identifier. Two such shadows were found and are corrected in the text: `EmptyState`
  (`qa.tsx:358` — reported as **4** screens, not 5) and `shareReadingCard`
  (`compatibility/[id].tsx:89` — a local function, flagged in §8).
- **Dead-component claims**: verified individually by grepping the name across `app/` +
  `components/` and excluding the defining file. `PremiumBadge` is *transitively* dead — its only
  importer is `LockedOverlay`, which is itself dead.
- **`(main)` screen total** for the tab-bar leverage figure = 24 files under `app/(main)/`
  including nested `_layout.tsx` files, since the tab bar is visible for all of them.
  The 32-screen denominator used elsewhere excludes all 9 `_layout.tsx` files.

## Appendix C — suggested commit message

```
docs(build-27.1): pre-revamp UI audit — routes, tokens, primitives, invariants

Adds plans/build-27.1/UI-audit.md: a designer-facing baseline audit of the
mobile app ahead of the 2.1.0 UI revamp on fix/build-27.1.

Nine sections: route inventory with tier-gating mechanism per screen; the
real in-use design tokens across the two parallel systems (tailwind.config.js
+ lib/colors.ts) with quantified scatter; component primitives ranked by
re-skin leverage; current motion/animation state; the invariant register;
copy-locked surfaces with owners; the technical ceiling; a
future-instrumentation seam map; and open questions for the owner.

Key findings:
- Two parallel token systems that disagree on `primary-dark`
  (#6B21A8 in Tailwind vs #4C1D95 in lib/colors.ts).
- 401 raw hex literals across 58 of 93 files, 64 distinct values; 664 inline
  style objects; 29 distinct inline font sizes (six fractional); 21 distinct
  borderRadius values; 16 StyleSheet.create blocks.
  => the tokens phase is a CODEMOD, not a config change.
- tailwind.config.js `cosmic.*` palette and `primary-light` have zero usages.
- 4 dead components (SkeletonCard, LuckyElementCard, LockedOverlay,
  PremiumBadge) and 5 copies of an inline SectionCard, 4 byte-identical.
- Leverage ranking: ScreenContainer (25/32 screens) > Button (19) > Card (13)
  > extract SectionCard (5, highest leverage-per-hour) > Input (9).
- The R7 crisis screen's suppression is EIGHT independent !safetyMode gates;
  centralising them into one conditional loses the property. Recorded as HARD.
- paywall_shown has 8+ screen-level origins and no helper — the worst
  instrumentation seam, and it is fixed for free by the SectionCard extraction.

Docs-only. tsc --noEmit clean on both mobile and server.
```
