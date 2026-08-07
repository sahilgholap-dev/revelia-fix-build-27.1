# HELD-VALUE COLLISION LEDGER — Revelia 2.1.0 UI revamp

**Branch**: `fix/build-27.1` · **Created**: 2026-07-30 (owner ruling, pass 1a) · **Status**: LIVE, append-only

> ## 🟢 THE FLIP HAS HAPPENED — 2026-07-31, pass 5. **READ `ENTRY 7` FIRST.**
>
> This file existed to make pass 5 auditable against *decisions* rather than *accidents*, and pass 5
> is now behind us. **ENTRY 7 is the measured re-verification of every assignment above.** Headline:
> **four of the five collisions measured ZERO live instances** (`warning`, `locked`, and both
> `chart.*` roles), V-4's split held per site with zero drift, and 🔴 **exactly one genuine drift was
> found — `DeleteAccountModal`'s "Delete My Account" label, which the flip made worse (3.76 → 3.26:1)
> and which is now corrected two-state.**
>
> 🔴 **AND THE FINDING THAT IS ABOUT *THIS FILE*: the `on-accent` set measured 73 sites; the ledger
> names ~45.** Every one of the 73 is correct. **A ledger is a record of DECISIONS, not an index of
> SITES**, and the two drift apart the moment a later batch does the right thing without appending —
> so this file can never be used as a completeness check on its own. The measured set is the
> authority; this file is the reasoning.
>
> ⚠️ **The remaining live exposure is `LockShell`'s single grounding decision (C1), in the primitives
> phase — and pass 5 has just made it answerable BY LOOKING.**

> ## 🔴 WHY THIS FILE IS CHECKED IN
>
> **Per-site assignments recorded only in a commit message are not auditable at pass 5.** You cannot
> `grep` a commit body, and by the time the flip happens the decisions are dozens of commits back.
>
> **The problem this file exists for.** Passes 1–4 hold OLD values behind NEW names
> (`codemod-plan.md` §0.3). Where **two different tokens hold the SAME value**, the identity gate
> **cannot tell them apart** — it compares *values*, so either assignment passes byte-perfect. Then
> **pass 5 gives them different values** and a wrong assignment renders the wrong colour, with **no
> gate having ever seen the decision.** Structurally identical to `C-k` (`rounded-xl` legal in both
> radius scales): both answers are locally correct, so no grep can resolve it.
>
> **Full mechanism: `codemod-plan.md` §3.0.2.2.** This file is the *data*; that section is the *rule*.

## The five collisions, ranked by RISK — not by volume

🔴 **The ranking inverts the intuitive one.** `accent`/`warning` has the most sites; it is **not** the
dangerous one.

| # | collision | pass-5 divergence | semantic consequence | risk |
|---|---|---|---|---|
| **C1** | **`surface-raised`** / **`locked`** | `#1E1A17` ↔ `#2A2521` — **a full step on §4.5's lightness ladder** | 🔴 **`locked` CARRIES MEANING.** A normal raised surface assigned `locked` **renders as gated content.** That is **product correctness, not cosmetics** | 🔴 **HIGHEST** |
| **C2** | **`accent`** / **`warning`** | `#D98E57` clay ↔ `#D9A657` amber | Brand vs caution — visible, but both are "a warm highlight" | 🟢 **NEUTRALISED — see C2's entry: zero live `warning` instances** |
| **C3** | **`scrim`** / **`on-accent`** | `#100E0D` ↔ `#1A1512` | **Nearly identical.** A wrong assignment is **cosmetic** | 🟢 **LOW — recorded, not enumerated** |
| **C4** | **`success`** / **`chart.harmonious`** | `#86A97B` ↔ `#7FA88F` | contained | ⚠️ **contained by the §7.3 allow-list** |
| **C5** | **`danger`** / **`chart.tense`** | `#C8695E` ↔ `#C08A7E` | contained | ⚠️ same |

🔴 **C1 has no vocabulary check to lean on.** B3 could be resolved by grepping for caution words. **A
lock panel and a raised card are both just surfaces in the markup** — there is no lexical signal, so
C1's enumeration must be read per site by a human.

🔴 **§7.3's allow-list is LOAD-BEARING FOR PASS-5 CORRECTNESS, not hygiene.** *"Only
`BirthChartWheel.tsx` may import `theme.chart`"* is the single thing confining **C4 and C5** to one
file where "chart aspect or status?" has an obvious answer. **Widening it creates two more
undetectable pass-5 divergences.** Never widen it.

---

## THE PASS-5 GATE — assert every ledger assignment survived

```sh
# from mobile/, immediately BEFORE the pass-5 flip. Each line must return the ledger's count.
grep -rEoh --include=*.tsx --include=*.ts "t\.color\['locked'\]|\blocked\b" app components | grep -c .   # C1 locked side
grep -rEoh --include=*.tsx --include=*.ts "t\.color\['surface-raised'\]|bg-surface-raised" app components | grep -c .
grep -rEoh --include=*.tsx --include=*.ts "t\.color\.accent\b|bg-accent\b|text-accent\b" app components | grep -c .   # C2
grep -rEoh --include=*.tsx --include=*.ts "t\.color\.warning\b|bg-warning\b" app components | grep -c .               # C2 -> must be 0 until SCREENS
```

> 🔴 **AND THE CHECK THAT ACTUALLY CATCHES ERRORS — THE PASS-5 DIVERGENCE DRY-RUN.**
> **A ledger records what was decided, not whether the decision was RIGHT.** See
> `codemod-plan.md` §3.7's required pre-step: before flipping values, flip **ONE SIDE ONLY** of each
> collision pair to **magenta**, build, and screenshot. Every highlighted element must be exactly the
> ones this ledger names. **One throwaway build converts an invisible, ungateable decision into a
> visible one.**

---

## ENTRY 1 — C2 `accent` / `warning`. **RESOLVED 2026-07-30 (batch B3).**

> 🟢 **THE COLLISION HAS NO LIVE INSTANCES, so nothing can be misassigned.** All 99 in-scope sites
> take `accent`; **`warning` takes zero.** De-risked by its own finding.
>
> **Four independent negative checks** (the right form of proof for an absence):
> 1. Zero matches for `expir|warn|caution|alert|error|fail|overdue|attention|invalid` near **any** of
>    the 70 classNames or 29 literals.
> 2. **Genuine alerts already use RED** — 11 sites pair `#EF4444`/`text-red-*` with failure copy. The
>    app already has a warning colour and it is `danger`.
> 3. **`cosmic-report.tsx`'s `expired` and `failed` phases carry no gold at all** — the surface where a
>    warning role is most expected.
> 4. Usage shape is uniformly brand/highlight: 60 `text-gold` (headings, labels, values) · 8 `bg-gold`
>    (badges, CTAs) · 2 `border-gold` (rules).
>
> **Three sub-roles appear; all three are `accent`:** brand/heading highlight (the bulk) ·
> achievement/score-band (`score >= 90` ×2, `ScoreCard`) · ⚠️ **category hue**
> (`Creativity`/`Expression`, `FocusAreaBadge`) where *neither* token is really right — **registered,
> not resolved.**
>
> ⚠️ **`warning` is RESERVED, not deleted** (see `theme.js`). **While it has zero call sites the
> collision stays DORMANT** — it re-arms the moment the screens phase assigns it.
### B3 · `accent` side — the 29 `#F59E0B` quoted/JSX literals

- `app/(main)/compatibility/[id].tsx`:349
- `app/(main)/numerology/name-destiny.tsx`:23
- `app/(main)/numerology/name-destiny.tsx`:222
- `app/(main)/readings/combined.tsx`:60
- `app/(main)/readings/combined.tsx`:67
- `app/(main)/readings/face.tsx`:53
- `app/(main)/readings/face.tsx`:253
- `app/(main)/readings/face.tsx`:339
- `app/(main)/readings/face.tsx`:493
- `app/(main)/readings/index.tsx`:219
- `app/(main)/readings/index.tsx`:258
- `app/(main)/readings/palm.tsx`:57
- `app/(main)/readings/palm.tsx`:95
- `app/(main)/readings/palm.tsx`:98
- `app/(main)/readings/palm.tsx`:208
- `app/(main)/readings/palm.tsx`:262
- `app/(main)/readings/palm.tsx`:317
- `app/(main)/readings/palm.tsx`:369
- `app/(main)/readings/palm.tsx`:495
- `components/ShareCard.tsx`:62
- `components/ShareCard.tsx`:101
- `components/compatibility/CompatibilityScoreRing.tsx`:47
- `components/compatibility/CompatibilityShareCard.tsx`:30
- `components/insights/FocusAreaBadge.tsx`:15
- `components/readings/DestinyCard.tsx`:42
- `components/readings/GeneratingReading.tsx`:484
- `components/readings/ScoreCard.tsx`:36
- `components/readings/StrengthsList.tsx`:25
- `components/readings/StrengthsList.tsx`:33

### B3 · `accent` side — the 70 `-gold` classNames, by file

- `app/(main)/astrology/daily.tsx` — 9
- `app/(main)/numerology/name-destiny.tsx` — 9
- `app/(main)/astrology/monthly.tsx` — 8
- `app/(main)/numerology/index.tsx` — 8
- `app/(main)/readings/career-destiny.tsx` — 6
- `app/(paywall)/index.tsx` — 5
- `app/(main)/home.tsx` — 4
- `app/(main)/profile.tsx` — 3
- `components/insights/DailyInsightCard.tsx` — 3
- `app/(main)/astrology/weekly.tsx` — 2
- `components/profile/SunSignReveal.tsx` — 2
- `app/(main)/compatibility/[id].tsx` — 1
- `app/(main)/compatibility/history.tsx` — 1
- `app/(main)/compatibility/index.tsx` — 1
- `app/(main)/readings/index.tsx` — 1
- `components/insights/ContinuityCard.tsx` — 1
- `components/insights/LuckyElementCard.tsx` — 1
- `components/insights/MonthlyKeyDateCard.tsx` — 1
- `components/insights/WeeklyDayCard.tsx` — 1
- `components/profile/ProfileHeader.tsx` — 1
- `components/subscription/FeatureComparisonTable.tsx` — 1
- `components/subscription/PremiumBadge.tsx` — 1

### B3 · `warning` side — **EMPTY**

**Zero sites.** Four independent negative checks, in `codemod-plan.md` §3.2's B3 box.

### DEFERRED from B3 — neither `accent` nor `warning`

- `components/astrology/BirthChartWheel.tsx` ×3 — §11.4 owns it (`Conjunction` → `chart.harmonious`)
- the 8 `[#F59E0B]` bracket classNames — batch **B7**

## ENTRY 2 — C1 `surface-raised` / `locked`. **ENUMERATED 2026-07-30 — and the premise changed.**

> **The enumeration was ordered as "all 135 of B5's sites, with the 11 lock sites named explicitly."
> Doing it produced a different answer: B5 DOES NOT TOUCH THIS COLLISION AT ALL, and `locked` has
> ZERO existing source sites.** Both facts are load-bearing, so they are recorded rather than
> smoothed over.

### (i) 🔴 B5 IS COLLISION-FREE. C1 is not in it.

B5's three targets and their held values — **neither side of C1 is among them:**

| B5 maps → | held value | a C1 side? |
|---|---|---|
| `bg` | `#0F0A1A` | no |
| `surface` | `#1A1425` | no |
| `scrim` | `#000000` | no — that is **C3** (low harm, ruled not-enumerated) |

**C1's two sides both hold `rgba(255,255,255,0.05)`, and their source sites are elsewhere:**
`surface-raised` ← **V-4's 28 `rgba(255,255,255,0.03–0.1)` sites** · `locked` ← **V-6**. **Both are
1b.** So the enumeration is still necessary and still the right instruction — it simply belongs to
**1b's V-4/V-6 work, not to B5.** ✅ **B5 is therefore UNBLOCKED**; its 135 sites carry no collision
decision: `#0F0A1A` 14 · `#1A1425` 9 · `bg-card` 64 · `bg-background` 44 · `bg-black/NN` 4.

### (ii) 🔴 `locked` HAS ZERO EXISTING SOURCE SITES — the same category as `warning`

**Measured: "locked" is expressed today as an OVERLAY + GLYPH + COPY, never as a surface colour.**

| site | how it renders "locked" | a `locked` surface? |
|---|---|---|
| `components/subscription/LockedOverlay.tsx:14` | `bg-black/60` + `backdrop-blur` + 🔒 + `PremiumBadge` + copy | 🔴 **NO** — that ground is a **scrim** (C3), not `locked` |
| `components/readings/LockedSection.tsx:88` | `container: rgba(255,255,255,0.03)` | 🔴 **NO** — `0.03` is the value **every ordinary raised card** uses. It is a raised card that happens to hold lock copy |
| `astrology/index.tsx`, `compatibility/[id].tsx`, `face.tsx`, `palm.tsx` (`{locked && …}`) | a 🔒 **glyph** in `fg-muted` | 🔴 **NO** — a glyph, not a surface |

**V-6 already said `locked` has "no old equivalent". This confirms it and draws the consequence.**

### (iii) 🟢 WHAT THAT DOES TO C1's RISK — it shrinks from 135 sites to ONE DECISION

The feared failure was *"a normal raised surface assigned `locked` renders as gated content."* **That
requires something to be MIGRATED ONTO `locked` — and nothing is.** There is no mapping onto `locked`
anywhere in 1a or 1b. Its sites are **CREATED** in the **primitives phase**, when `LockShell` (§9.1,
three densities) is authored.

🔴 **So C1's entire real exposure is one question, asked once: does `LockShell` ground itself in
`locked` or in `surface-raised`?** Until pass 5 the two render **identically**, so a wrong answer is
**invisible from the moment it is written until the flip** — at which point either every lock surface
in the app is one lightness step wrong, or every raised card is.

🟢 **And that is exactly what the pass-5 magenta dry-run catches** (`codemod-plan.md` §3.7). For C1 the
assertion is unusually clean: **flip `locked` to magenta and the ONLY highlighted elements must be lock
surfaces.** One throwaway build, one unambiguous screenshot.

⚠️ **Do not confuse C1 with V-4's real decision.** V-4 sorts 28 rgba sites across `surface-raised`
(0.03/0.04/0.05) vs `surface-overlay` (0.08/0.10) — a genuine 1b judgement, but **NOT a held-value
collision**: those two tokens hold *different* values, so the identity gate **can** see a mistake there.
It needs review, not a ledger entry.


## ENTRY 3 — C3 `scrim` / `on-accent`. **RECORDED, deliberately NOT enumerated.**

`#100E0D` vs `#1A1512` are near-identical, so a wrong assignment is **cosmetic**. Owner ruling: record
it, do not spend enumeration effort. Sides, for completeness: **`scrim`** = the 4 `bg-black/NN`
className scrims (B5) + the 16 `rgba(0,0,0,0.5–0.7)` literals (1b). **`on-accent`** = V-7's 4
`text-black` renames + `astrology`'s one `color:'black'` (deleted by R1) + the six A5 foregrounds 1b
re-resolves.
⚠️ **Compounded by the bare-`bg-scrim` footgun**: an unmodified `bg-scrim` is *also* `#000000`, so
scrim / on-accent / opaque-black are one value at 1a. `no-bare-scrim` is the guard.

## ENTRY 4 — C1 `surface-raised` / `locked`, AS ACTUALLY EXECUTED (pass 1b, 2026-07-31)

> 🟢 **ENTRY 2's prediction held exactly: NOTHING was migrated onto `locked`.** Batch C1 (V-4)
> assigned 29 white-overlay sites and **`locked` took zero of them.** A grep for
> `t.color['locked']|t.color.locked|bg-locked` over `app components` returns **0** after 1b.
> C1's whole exposure remains the single `LockShell` grounding decision in the primitives phase.

### The V-4 assignment, per site — 29 sites, not the ~25 §1.6b predicted

🔴 **§1.6b's V-4 row was wrong in two directions.** It named an `0.08` tier that **has zero sites**,
and it omitted an `0.2` site that exists. Measured:

| source alpha | sites | → | 1b delta |
|---|---|---|---|
| `rgba(255,255,255,0.05)` ×14 | astrology ×7 · compat/[id] · combined · face · palm ×2 · compat/index ×2 | **`surface-raised`** | 🟢 **IDENTITY** — token held = `rgba(255,255,255,0.05)` |
| `rgba(255,255,255,0.04)` ×6 | cosmic-report-history · cosmic-report · qa ×4 | **`surface-raised`** | ⚠️ **VALUE** — 0.04 → 0.05, lighter (intended, §4.5 ladder) |
| `rgba(255,255,255,0.03)` ×5 | astrology ×2 · face · palm · **LockedSection:88** | **`surface-raised`** | ⚠️ **VALUE** — 0.03 → 0.05, lighter (intended) |
| `rgba(255,255,255,0.1)` ×1 **fill** | GeneratingReading:474 | **`surface-overlay`** | 🟢 **IDENTITY** — token held = `rgba(255,255,255,0.10)` |
| `rgba(255,255,255,0.1)` ×2 **border** | compat/index:200, :382 | 🔴 **`border-strong`**, NOT `surface-overlay` | ⚠️ **VALUE**, but composites to ≈`#312C3B` vs `#2D2640` — near-identical |
| `rgba(255,255,255,0.2)` ×1 | **`(paywall)/index.tsx:93`** | 🔴 **`t.alpha(t.color.fg, 20)`** | 🟢 **IDENTITY** |
| `rgba(255,255,255,0.08)` | **ZERO SITES** | — | §1.6b named a tier that does not exist |

🔴 **`LockedSection.tsx:88` took `surface-raised`, and that is this entry's central assertion.**
ENTRY 2 established it is "a raised card that happens to hold lock copy," not a lock surface. It is
the ONE site where a careless reader would have written `locked`. It did not.

🔴 **The two `border` sites are why "THE UNIT IS THE SITE, NOT THE LITERAL" is a rule and not advice.**
One literal — `rgba(255,255,255,0.1)` — appears at three sites in **two different roles**, and the
mechanical V-4 mapping would have put a *border* on a *surface* token. Nothing in the gate could see it.

🔴 **The paywall 0.2 site is X19 — the close button, the ONLY exit from the paywall modal.** Forcing it
onto `surface-overlay` (the ladder's top rung, 0.10) would have **halved the visibility of the only way
out of the app's highest-revenue surface.** `t.alpha(t.color.fg, 20)` preserves it byte-identically AND
flips correctly at pass 5 (`fg` → `#F4EFE9`), which a raw literal would not have.

## ENTRY 5 — C3 `scrim` / `on-accent`, AS EXECUTED. **Both sides are now enumerated.**

ENTRY 3 recorded C3 as "cosmetic, deliberately NOT enumerated." 1b enumerated both sides anyway,
because **the `on-accent` side turned out to be far larger than V-7's list of four** and the A5 fix is
the one assertion the four-layer stack cannot verify (§3.7).

### `scrim` side — 21 sites, in TWO different spellings

| form | sites | spelling |
|---|---|---|
| className (migrated in **1a** B5, identity, modifiers kept per R3) | 4 | `bg-scrim/70` · `bg-scrim/60` · `bg-scrim/90` · `bg-scrim/60` |
| **inline / StyleSheet** (1b C2) | **17** | 🔴 **`t.alpha(t.color.scrim, 60)`** ×16 · `t.alpha(t.color.scrim, 85)` ×1 |

🔴 **ALL 17 INLINE SITES WERE UNSPELLABLE BEFORE 1b.** `bg-scrim/60` is a className *utility*; not one
of the 17 is a className. `scrim` is a SOLID hex (R3), so `backgroundColor: t.color.scrim` renders an
**opaque black overlay**. The `alpha()` helper (owner ruling 2026-07-31, `theme.js`) is what closed it.

⚠️ **Three groups among the 17 are not scrims by role**, recorded rather than smoothed over: **7 are
rounded legibility chips** over a camera preview (`borderRadius: 20/25`), and **one is
`textShadowColor`** (`face-capture.tsx:682`) — the single `textShadow` in the whole app (preflight §C.1).
All took `scrim` per R3's collapse ruling, but a primitives-phase "legibility plate" may want them back.

⚠️ **V-5 said 16; it is 17.** The extra is `BiometricConsent.tsx:119` at `0.85`, which §1.6b never named.
It keeps its own alpha (`85`) rather than collapsing to 60 — the same treatment R3 gave `SunSignReveal`'s
0.90.

### `on-accent` side — **27 sites. V-7's list named FOUR.**

| # | site | kind |
|---|---|---|
| 1–3 | `compatibility/index.tsx:241` · `(paywall)/index.tsx:178` · `WeeklyDayCard.tsx:31` | V-7 rename (`text-black`) |
| 4 | `PremiumBadge.tsx` — **both** branches | **O-22** applied |
| 5–8 | `astrology/index.tsx` generate CTA ×4 (spinner + 3 labels) | 🔴 **A5 fix**, 2.15:1 |
| 9–10 | `astrology/index.tsx` `unlockButtonText` · `assumedNoteCtaText` | 🔴 **A5 fix**, StyleSheet pairs **no grep can reach** |
| 11–13 | `(paywall)/index.tsx` CTA label · "Cancel anytime" · spinner | 🔴 **A5 fix**, 2.15:1 — the original A5 |
| 14 | `(paywall)/index.tsx:150` **MOST POPULAR** | 🆕 found by **C5** — `bg-accent-2`+`fg` = 2.64:1 |
| 15–16 | `(paywall)/index.tsx` billing toggle ×2 (selected branch) | 🆕 found by **C4's className half** |
| 17 | `ShareCard.tsx` `subtitleText` (`t.color.bg` → `on-accent`) | V-7 rename, **W1** surface |
| 18 | `ShareCard.tsx` **`shareButtonText`** | 🔴 🆕 **A5, 2.64:1, LIVE** — StyleSheet pair on a **W1** surface |
| 19 | `AffirmationCard.tsx` "Copy to Clipboard" | 🆕 found by **C10** |
| 20 | `ShareableQuote.tsx` "Share" | 🆕 found by **C10**, **W1** surface |
| 21 | `NewBadge.tsx` | 🆕 found by **C6** |
| 22–23 | `readings/index.tsx` PREMIUM PLUS ×2 | 🆕 renames; `accent-2` would have been **2.23:1** |
| 24–25 | `DeleteAccountModal.tsx` Continue · Delete My Account | 🔴 🆕 **created BY C7** — see below |
| 26–27 | `home.tsx` PLUS pills ×2 | 🆕 fixes the documented **1.62:1** worst-in-app defect |
| — | `astrology/index.tsx` PLUS badge (`color:'black'`) | **REGISTERED, NOT RENAMED** — R1 gate #10 deletes it |
| — | `monthly.tsx:336` · `readings/index.tsx:382` · `CompatibilityShareCard.tsx:100` | 🆕 also found by C4's className half |

🔴 **THE FINDING THAT MATTERS MOST: C7 CREATED TWO A5 VIOLATIONS, AND THE GATE CAUGHT THEM.**
`DeleteAccountModal`'s destructive buttons were `bg-red-600` + white = **4.83:1, passing AA**. C7's
mechanical `red-600 → danger` mapping made them `#EF4444` + `fg` = **3.76:1, failing**. A colour pass
whose own rule is "drive legacy tokens to zero" can **introduce** an accessibility regression while every
count falls correctly. `no-white-on-accent` — the rule that "can never be a failure condition" — is what
surfaced it. That is the argument for keeping it report-only rather than deleting it as noise.

⚠️ **`text-black` is now 0 sites, so C3's `#000000` ambiguity is carried entirely by `on-accent` and
`scrim`, with no third claimant.** ENTRY 3's bare-`bg-scrim` footgun is guarded: `no-bare-scrim` holds at
**0**, and was widened in 1b to recognise the helper form (§3.0.2.0).

---

# ENTRY 6 — 🔴 THE GRADIENT-FILL REGISTER

**Created 2026-07-31 (owner ruling, pass 1b). CHECKED IN, and RE-VERIFIED AT PASS 5 when the
values flip.**

> ## 🔴 WHY A REGISTER AND NOT A GREP
>
> **`no-white-on-accent` is blind to every row below, for a reason no pattern can fix: the fill is a
> `LinearGradient colors={[...]}` ARRAY.** There is no `bg-accent` class and no `backgroundColor:`
> property anywhere near the label, so neither half of the rule can see it. Widening the pattern
> does not help — the fill is *an argument to a component*, not a style declaration.
>
> **This is the same category as the A5 StyleSheet pairs (ENTRY 5): a class that can only be
> ENUMERATED, never matched.** The difference is that ENTRY 5's set was small and named; this one
> was **28 gradients across 21 files** and nobody had listed it.
>
> 🔴 **AND THREE STRUCTURAL TRAPS THE REGISTER HAS TO ENCODE, because two of them fooled me first:**
> 1. **The foreground's ground is not always the gradient.** Several labels sit inside an
>    absolutely-positioned `bg-fg` (white) pill *on top of* the gradient. Their ground is the PILL.
>    Reading the gradient gives the wrong ratio — and the wrong fix.
> 2. **A gradient has POSITION.** `[accent, bg, bg]` puts accent in the top third only, so centred
>    content sits over `bg` and `fg` is legal. `[accent, bg]` puts it across the top half, so a
>    label at the top IS on accent. The register records which stop the label actually sits over.
> 3. **A wash is not a fill.** `[alpha(accent,30), alpha(accent,10)]` over a dark card composites
>    dark; `fg` is legal and `on-accent` would be wrong. Only SOLID or near-solid accent-family
>    stops are violations.

## HELD contrast reference (computed against `theme.js`, 2026-07-31)

| ground | value | `fg` (white) | `on-accent` | `accent` |
|---|---|---|---|---|
| `accent` | `#F59E0B` | 🔴 **2.15** | 🟢 **9.78** | 🔴 **1.00 — invisible** |
| `accent-2` | `#C084FC` | 🔴 **2.64** | 🟢 **7.95** | 🔴 1.23 |
| `success` | `#10B981` | 🔴 **2.54** | 🟢 **8.28** | 🔴 1.18 |
| `danger` | `#EF4444` | 🔴 **3.76** | 🟢 **5.58** | 🔴 1.75 |
| `warning` | `#F59E0B` | 🔴 2.15 | 🟢 9.78 | 🔴 1.00 |

AA floor: **4.5:1** normal · **3:1** large (>=18.66px bold or >=24px). `warning` == `accent` while held.

## THE REGISTER — 28 gradients

🔴 = the label's ground is a solid/near-solid accent-family stop and the label is not `on-accent`.
🟢 = legal: the ground composites dark (a wash, or a `bg`/`surface` stop under the label's position).

| # | site | `colors={[...]}` | label token | label's actual ground | ratio | verdict |
|---|---|---|---|---|---|---|
| 1 | `ui/Button.tsx:91` **PRIMARY CTA** | `accent / alpha(accent,85) / alpha(accent,70)` | `on-accent` | accent | **9.78** | 🟢 **FIXED in C9** |
| 2 | `home.tsx:123` Face card | `alpha(accent,60) / accent` | `fg` | accent | 2.15 | 🔴 |
| 3 | `home.tsx:157` Palm card | `accent-2 / accent` | `fg` | accent-2 to accent | 2.64 | 🔴 |
| 4 | `readings/index.tsx:132` | `accent / alpha(accent,60)` | `fg` | accent | 2.15 | 🔴 |
| 5 | `readings/index.tsx:160` | `accent / accent` (flat) | `fg` | accent | 2.15 | 🔴 |
| 6 | `readings/index.tsx:190` | `accent-2 / alpha(accent-2,60)` | `fg` | accent-2 | 2.64 | 🔴 |
| 7 | `readings/index.tsx:220` | `accent / alpha(accent,60)` | `fg` | accent | 2.15 | 🔴 |
| 8 | `readings/index.tsx:259` | `accent-2 / accent` | `fg` | accent-2 to accent | 2.64 | 🔴 |
| 9 | `readings/index.tsx:299` | `alpha(success,60) / success` | `fg` | success | 2.54 | 🔴 |
| 10 | `readings/index.tsx:341` | `accent / accent` (flat) | `fg` | accent | 2.15 | 🔴 |
| 11 | `numerology/index.tsx:673` | `accent / accent` (flat) | `fg` + `fg/80` | accent | 2.15 | 🔴 |
| 12 | `insights/DailyInsightCard.tsx:120` | `alpha(accent,60) / accent` | **`accent`** + `fg` | accent | 🔴 **1.00** | 🔴🔴 **INVISIBLE — CODEMOD-CREATED** |
| 13 | `engagement/StreakBadge.tsx:27` | `accent / danger` | `fg` | accent to danger | 2.15–3.76 | 🔴 ⚠️ **X11** |
| 14 | `readings/GrowthCard.tsx:17` | `accent / accent-2` | `fg` | accent | 2.15 | 🔴 |
| 15 | `readings/ShareableQuote.tsx:33` | `accent / bg` | `fg` | accent (top) | 2.15 | 🔴 ⚠️ **W1** |
| 16 | `common/BiometricConsent.tsx:86` | `alpha(accent,60) / accent` | `fg` (StyleSheet pair) | accent | 2.15 | 🔴 |
| 17 | `ShareCard.tsx:50` | `accent / bg` | `fg-muted` title | accent (top) | ~1.9 | 🔴 ⚠️ **W1** |
| 18 | `readings/GeneratingReading.tsx:363` | `accent / bg / bg` | `fg` | **`bg`** — content is centred; accent is the top third | 16.8 | 🟢 |
| 19 | `readings/GeneratingReading.tsx:430` | `accent / bg / bg` | `fg` | `bg` | 16.8 | 🟢 |
| 20 | `readings/AffirmationCard.tsx:26` | `alpha(accent,30) / alpha(accent,10)` | `fg` | wash over dark card | high | 🟢 |
| 21 | `readings/ArchetypeHeader.tsx:15` | `alpha(accent,30) / transparent` | `accent` + `fg-muted` | wash over dark | high | 🟢 |
| 22 | `readings/DestinyCard.tsx:25` | `alpha(accent,30) / alpha(accent,10)` | `fg` | wash over dark | high | 🟢 |
| 23 | `(auth)/welcome.tsx:73` | `bg / alpha(accent,10)` | — | dark | — | 🟢 |
| 24 | `common/BiometricConsent.tsx:29` | `bg / alpha(accent,10)` | `fg` | dark | high | 🟢 |
| 25 | `common/ErrorBoundary.tsx:42` | `bg / alpha(accent,10)` | `fg` | dark | high | 🟢 |
| 26 | `profile/ProfileHeader.tsx:27` | `surface / alpha(accent,10)` | `fg` / `fg-muted` | dark | high | 🟢 |
| 27 | `profile/SunSignReveal.tsx:68` | `surface / alpha(accent,25)` | `fg` | dark | high | 🟢 |
| 28 | `compatibility/CompatibilityShareCard.tsx:37` | `bg / surface / bg` | `fg-muted` | dark | high | 🟢 ⚠️ **W1** |

**16 violations · 12 legal.** Rows 2–17 all take `on-accent`.

### 🔴 TWO `bg-fg` WHITE-PILL SITES — NOT gradient rows, and I misread them first

`readings/index.tsx:225` and `numerology/index.tsx:678` render their label inside an
`absolute ... bg-fg` **white pill** on top of the gradient. Their ground is the PILL:

| site | label | on white | note |
|---|---|---|---|
| `readings/index.tsx:225` `text-accent` PREMIUM | `accent` on `fg` | **2.15** | ⚠️ **PRE-EXISTING** — it was `text-accent` on `bg-fg` before 1b too. NOT codemod-created. |
| `numerology/index.tsx:678` `color: accent` PREMIUM PLUS | `accent` on `fg` | **2.15** | 🔴 **CODEMOD-DEGRADED**: was `colors.primaryLight` `#9333EA` on white = **5.6:1, passing**. |

Both are the **`O-25` shape** (a dark-text-on-light-pill tier marker), so they take `on-accent` like
the other `O-25` sites — not a gradient fix.

## 🔴 THE A5 ARITHMETIC — and why the rule is read PER BATCH

| origin | count | created or surfaced during the codemod? |
|---|---|---|
| known at pass 1a (V-7's four + astrology's six, minus overlap) | **6** | no — pre-existing, enumerated in advance |
| surfaced by completing **C4**'s missed className ledger | **5** | 🔴 **surfaced** |
| **created by C7**'s `red-600 -> danger` mapping | **2** | 🔴 **CREATED** |
| surfaced/created by **C11**'s `primary-dark -> accent` fills | **9** | 🔴 **both** |
| 🆕 **found by THIS register** (16 gradients + 2 white pills) | **18** | 🔴 1 created, 1 degraded, 16 surfaced |
| **TOTAL** | **~40** | **34 of 40 — 85% — were invisible until the codemod ran** |

🔴 **EVERYTHING AFTER THE FIRST SIX WAS CREATED OR SURFACED DURING THE CODEMOD.** That is the whole
argument for reading `no-white-on-accent` after every batch rather than once per pass — and for this
register, since it is the only instrument that reaches the gradient class at all.

## PASS-5 RE-VERIFICATION — what to re-run when the values flip

```sh
# from mobile/ — the register's own assertion. Count must equal 28.
grep -rEoh --include=*.tsx "colors=\{\[" app components | grep -c .
# and re-read every gradient with its foreground:
grep -rEn --include=*.tsx -A14 "colors=\{\[" app components \
  | grep -E "colors=\{\[|text-(fg|on-accent|accent|fg-muted|fg-secondary|danger|success)|color: t\.color"
```

🔴 **A NEW gradient not listed in ENTRY 6 is an unregistered A5 risk.** Re-compute every ratio at
Vellum: `accent` `#D98E57` + `on-accent` `#1A1512` = **6.86**, so the 🟢 rows stay 🟢 and the fixed
rows stay fixed — but `danger` `#C8695E` + `on-accent` = **5.60**, and **row 13's `accent -> danger`
sweep is the one gradient whose two ends have materially different ratios.** Check `StreakBadge` on
a device — it is also **X11**, so its explicit `height` per size and `borderRadius: cfg.height / 2`
must survive that visit untouched.

### ⚠️ ONE ROW-17 SUB-ITEM LEFT FOR THE SCREENSHOT PASS, not guessed at

`ShareCard.tsx`'s `numberValue` defaults to `t.color.accent` and its callers now all pass
`t.color.accent` (post-O-24). It sits in `numbersRow`, roughly 40% down a `[accent, bg]` card, so
its ground is a **blend** whose exact value depends on gradient geometry this register cannot
compute from source. `numberLabel` (`fg-muted`) is in the same band. **Both are on the §4.4 list via
capture #11's sibling surfaces — read them on the device rather than re-tokening blind.** The
adjacent `title` and `subtitleText` are already `on-accent`, so if the blend reads too light these
two follow them.

---

# ENTRY 7 — 🔴 THE PASS-5 RE-VERIFICATION, AS ACTUALLY MEASURED (2026-07-31, `build27.1-pass5-vellum`)

**This is the entry the whole file was written for: the flip has landed, so every assignment recorded
above is now either correct or visibly wrong.** Measured immediately BEFORE the flip, on the tree the
flip was applied to.

## The five collisions — every one resolved, and FOUR of them resolved to ZERO

| # | collision | assertion | **measured** | verdict |
|---|---|---|---|---|
| **C1** | `surface-raised` / `locked` | `locked` has zero call sites in every spelling | 🟢 **0** — `t.color.locked`, `t.color['locked']`, `bg/text/border-locked` all zero | 🟢 **ENTRY 2's prediction held to the letter.** Nothing was ever migrated onto `locked`; its call sites are still ahead, in the primitives phase, where `#2A2521` and `#1E1A17` are now VISIBLY distinct |
| **C2** | `accent` / `warning` | `warning` has zero call sites | 🟢 **0**, every spelling | 🟢 **B3's "all 99 golds → `accent`" is now a MEASUREMENT, not a claim.** The collision is spent: clay `#D98E57` vs amber `#D9A657` |
| **C3** | `scrim` / `on-accent` | both sides enumerated | 🟢 **21 scrim** (4 className `70/60/90/60` + 17 inline: 16×`60`, 1×`85`) · **73 `on-accent` code sites** | 🟢 scrim exact, incl. `SunSignReveal` at **/90 not /60** per R3. ⚠️ `on-accent` — see below |
| **C4** | `success` / `chart.harmonious` | `chart.*` referenced only in `BirthChartWheel.tsx` | 🟢 **ZERO code references anywhere in the app** | 🟢 **§7.3's allow-list held VACUOUSLY — the strongest form it can hold.** The wheel still carries its own raw literals until §11.4, so `theme.chart` had nothing to misassign. C4/C5 were never live |
| **C5** | `danger` / `chart.tense` | same | 🟢 **0** | 🟢 same |

🔴 **FOUR OF THE FIVE WERE "EXPECT ZERO", AND A GREP PROVES AN ABSENCE BETTER THAN A SCREENSHOT DOES.**
§3.7 called the expect-zero assertions "the strongest checks available" because they cannot be
satisfied by accident. A magenta screenshot proves *nothing highlighted on the screens you captured*;
a grep over the tree proves *nothing exists*. That is why the static half of the dry-run was not a
downgrade — see `codemod-plan.md` §3.7's split ruling.

## V-4's alpha split — re-asserted per site

| token | ENTRY 4 assigned | **measured now** | reconciliation |
|---|---|---|---|
| `surface-raised` | 25 rgba sites (0.05 ×14 · 0.04 ×6 · 0.03 ×5) | **32 code sites** | ✅ all 25 present and unchanged, **+7 from other ledgers**: `verify-email:191`, `DeleteAccountModal:200`, `SkeletonCard` ×3, `DestinyCard:50` (className renames, B6 / the C-batches) and `name-destiny:310` (the V-6 disabled-ground fix from the STATE-BORDER ruling). V-4 only ever enumerated the rgba literals |
| `surface-overlay` | 1 (`GeneratingReading` 0.1 **fill**) | **1** | ✅ exact |
| `border-strong` | 2 (`compat/index` 0.1 **borders**) | **2** at `:199`, `:381` | ✅ **the "THE UNIT IS THE SITE, NOT THE LITERAL" assertion held** — one literal, three sites, two roles, and the border pair did not drift onto a surface token |
| `t.alpha(t.color.fg, 20)` | 1 (`(paywall):93` — **X19**) | **1** | ✅ and it flipped correctly (`#ffffff33` → `#f4efe933`), which a raw literal would not have |

🟢 **These two tokens hold DIFFERENT values, so — unlike C1–C5 — a mistake here was always
gate-visible.** It is confirmation, not discovery. Zero drift.

## 🔴 THE ONE PLACE THE LEDGER AND THE TREE DISAGREED — AND IT IS IN ONE DIRECTION ONLY

### (a) `on-accent` — 73 code sites; the ledger names ~45. **Nothing over-applied; the ledger is short.**

Every one of the 73 was read individually and **every one sits on a genuine `accent` / `accent-2` /
`success` / `danger` FILL** — a `bg-accent*` class, a `backgroundColor: t.color.accent`, an
accent-family `LinearGradient` stop under the label's position, or a `bg-fg` white pill (the `O-25`
shape). 🟢 **So the ARRIVAL direction is sound, and the error direction that would render near-black
text invisible on a dark surface does not occur anywhere.**

But ~28 sites are named in neither ENTRY 5 nor ENTRY 6. They arrived through the C-batch className
renames, the STATE-BORDER ruling's four `name-destiny` labels, and per-site A5 fixes made *correctly*
in batches that ran after ENTRY 5 was written — `numerology/index` ×3 number discs, `monthly:164`,
`AstroNumeroBadge` ×2, `ProfileHeader:50`, `SunSignReveal:87`, `signup:242`'s checkbox tick, both
capture screens' `uncertainBtnPrimary`, `name-destiny:485`'s rank pills.

🔴 **THE LESSON, AND IT IS THIS FILE'S OWN FAILURE MODE: A LEDGER IS A RECORD OF *DECISIONS*, NOT AN
INDEX OF *SITES*, AND THE TWO DRIFT APART THE MOMENT A LATER BATCH DOES THE RIGHT THING WITHOUT
APPENDING.** Every one of the 28 is a correct fix; not one was wrong; and the ledger still could not
be used as a completeness check on its own. **That is precisely the argument for
`codemod-plan.md` §3.0.2.2.2's residual histogram over BOTH ledgers** — the measured set is the
authority, and this file is the *reasoning*.

⚠️ **One three-way ternary is registered rather than resolved:** `name-destiny:485`'s rank pills fill
with `accent` / `fg-muted` / `alpha(accent,60)` and label all three `on-accent`. On the middle branch
that is `#1A1512` on `#8E867C` ≈ 5.4:1 (legal); on the third it is near-black on a 60% wash over a
dark card, which composites dark and is the one branch worth reading on a device. **Cut 2.**

### (b) 🔴 `DeleteAccountModal.tsx` "Delete My Account" — GENUINE DRIFT, and the flip made it worse

**ENTRY 5 items 24–25 record BOTH destructive buttons as `on-accent`. Only `Continue` (`:151`) took
it.** `:205` was still `text-fg` — the surviving half of the pair **C7 CREATED** with its mechanical
`red-600 → danger` mapping:

| | ground | label | ratio |
|---|---|---|---|
| on `main`, pre-codemod | `bg-red-600` `#DC2626` | white | **4.83:1** 🟢 passing AA |
| after C7, HELD | `danger` `#EF4444` | `fg` `#FFFFFF` | **3.76:1** 🔴 failing |
| 🔴 **after the flip** | `danger` `#C8695E` | `fg` `#F4EFE9` | **3.26:1** 🔴 **worse again** |
| ✅ corrected | `danger` `#C8695E` | `on-accent` `#1A1512` | **5.60:1** 🟢 |

**Fixed two-state, because the ground is two-state:** the button is `disabled` unless the user has
typed `DELETE`, so armed → `bg-danger` + `text-on-accent`, and disabled → `bg-surface-raised` +
**`text-fg-disabled`** (design §2 row 10 / V-6) — not `fg`, which read as enabled. **X20's
`height: 56` is untouched** and the label stays className-typed: X20's whole point is that it is the
only instance of that pattern, and the correction is a colour token, not a restructure.

⚠️ **`no-white-on-accent` could not see it and never could.** The fill is an interpolated ternary
inside a template className; the label is a separate element four lines down. Its 22 reported hits
*do* include this file — at `:125`, a `bg-danger/10` **wash**, i.e. a false positive — and miss the
real violation 80 lines further on. **Proximity is not nesting**, in both directions at once, in one
file.

## Post-flip: the contrast reference recomputed

| ground | Vellum | `fg` `#F4EFE9` | `on-accent` `#1A1512` |
|---|---|---|---|
| `accent` `#D98E57` | clay | 🔴 **3.06** | 🟢 **6.86** |
| `accent-2` `#B3A6D9` | iris | 🔴 **3.80** | 🟢 **8.08** |
| `success` `#86A97B` | sage | 🔴 **3.05** | 🟢 **6.90** |
| `warning` `#D9A657` | amber | 🔴 **2.92** | 🟢 **8.20** |
| `danger` `#C8695E` | rust | 🔴 **3.26** | 🟢 **5.60** |

🔴 **NOTE WHAT THAT TABLE SAYS ABOUT THE HELD FIGURES: `fg` on an accent fill was 2.15–3.76 while
held and is 2.92–3.80 at Vellum. It got *slightly better* and is still WRONG EVERYWHERE.** Vellum's
grounds are lighter and its `fg` is warmer, so the failure is less lurid and no less real — which
makes it **less likely to be caught by eye at cut 2 than the held palette would have been.** That is
an argument for `CLAUDE.md`'s prose rule over a device read, not against it.

🟢 **ENTRY 6's 12 legal rows stay legal** (a wash over a dark card composites dark; `[accent, bg, bg]`
puts `bg` under centred content) and its 16 fixed rows stay fixed. ⚠️ **Row 13 `StreakBadge`
`[accent → danger]` remains the one gradient whose two ends differ materially** — `on-accent` is
6.86 at the clay end and 5.60 at the rust end, both passing, but it is also **X11**, so its explicit
`height` per size and `borderRadius: cfg.height / 2` must survive any visit untouched.

## What to re-run at cut 2 — and the part that is NOT a grep

```sh
# from mobile/ — the ENTRY 6 register's own assertion. Count must still equal 28.
grep -rEoh --include=*.tsx "colors=\{\[" app components | grep -c .

# the collisions: still expect-zero except scrim / on-accent
grep -rEoh --include=*.tsx --include=*.ts "t\.color\.warning|warning'\]|-warning\b" app components | grep -c .   # 0
grep -rEoh --include=*.tsx --include=*.ts "t\.color\.locked|locked'\]|-locked\b" app components | grep -c .      # 0
grep -rEn  --include=*.tsx --include=*.ts "t\.chart|chart\.harmonious|chart\.tense" app components  # comments only, until §11.4

npm run gate    # exit 0 — and it BLOCKS now (GATE_STRICT default-on, pass 5)
```

🔴 **AND THE PART THAT IS NOT A GREP: `LockShell`'s grounding decision is still ahead of us.** C1's
entire real exposure was always that one question — `locked` or `surface-raised`? — and pass 5 has
just made it *answerable by looking*, for the first time. **Whoever writes `LockShell` must pick
deliberately and then look at the screen.** That is `O-38`'s territory, and it is why the primitives
phase needs an arrival gate it does not yet have.
