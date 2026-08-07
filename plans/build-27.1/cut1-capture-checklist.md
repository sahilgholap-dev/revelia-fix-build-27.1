# Cut 1 — Capture Checklist

> **Written by** `build27.1-cut1-prebuild`, 2026-07-31, at commit `0e751f8` + one `fix(build-27.1)` commit.
> **Scope**: the §4.4 / **P28** screenshot pass for **pass 1b**, on the first Play-signed build of the
> revamp branch. Owner action end-to-end — §4.1 has no device harness and §5.1 has `requireCommit: true`.

---

## 0. READ THIS FIRST — three framing facts, or the review measures the wrong thing

### 0.1 🔴 **AFTER-ONLY, AGAINST SPEC. There is no baseline and one is not wanted.**

Owner ruling, 2026-07-31 (§4.4, `owner-actions.md` P28). Pass 0's `inlineRem` flip moved **107 of 225
rules across 1,763 usages** and de-inverted the radius ramp, so the branch is production **plus a
14.29% rescale**. Any before/after diff would be dominated by the flip, not by the pass under review.

> **The question is NOT "did this change?" It is "does this match the design's intent?"**

"Did something change that shouldn't have?" is already answered better by four instruments than by a
human comparing images: the gate's decreasing counters · the residual histogram (§3.0.2.2.2) · the
gradient-fill register (`held-collision-ledger.md` ENTRY 6) · `resolve-utilities.js --diff`. **Point
the device time at the thing only a human can do — judging intent.**

### 0.2 🔴 **CUT 1 DOES NOT LOOK LIKE VELLUM. Do not judge against §2's hex column.**

Passes 1–4 **hold OLD values behind NEW names** (§0.3). Pass 5 is the only colour flip. So §2's token
table is normative for **role and pairing**; the **values on screen are the HELD column**. Measured
against `theme.js` at this commit:

| token | HELD value (what you will see) | Vellum (pass 5 — NOT in this build) |
|---|---|---|
| `bg` | `#0F0A1A` deep purple-black | `#100E0D` warm near-black |
| `surface` | `#1A1425` | `#171412` |
| `surface-raised` / `locked` | `rgba(255,255,255,0.05)` — 🔴 **identical to each other** | `#1E1A17` / `#2A2521` |
| `surface-overlay` | `rgba(255,255,255,0.10)` | `#26211D` |
| `fg` / `fg-secondary` / `fg-muted` | `#FFFFFF` / `#D1D5DB` / `#9CA3AF` | `#F4EFE9` / `#C6BDB2` / `#8E867C` |
| `border-subtle` / `border-strong` | `#1F2937` slate / `#2D2640` dark violet | both `#F4EFE9` @ 7% / 16% |
| **`accent`** | **`#F59E0B` amber** | `#D98E57` terracotta |
| **`accent-2`** | **`#C084FC` violet** | `#B3A6D9` iris |
| **`on-accent`** | **`#000000`** | `#1A1512` |
| `success` / `warning` / `danger` | `#10B981` / 🔴 **`#F59E0B`** / `#EF4444` | `#86A97B` / `#D9A657` / `#C8695E` |

🔴 **Three HELD collisions are EXPECTED and are not bugs.** Do not report them:
`warning` **==** `accent` (both `#F59E0B`; `warning` has **0 call sites**, deliberately) ·
`locked` **==** `surface-raised` (`locked` has **0 call sites**, deliberately — its call sites are
authored in the primitives phase) · `chart.harmonious`/`chart.tense` **==** `success`/`danger`.

🔴 **What is NOT in this build**, so do not look for it: the five faces (pass 4 — everything is the
system font), the 2b leading gain, the 3b radius decision, `RidgeField`/`ArcDivider`/`BlobField`/the
plates (§15/§14, primitives phase), the Explore emoji→Ionicon collapse, `LockShell`, the new
disclaimers, and every §10 structural change. **§10's three comped screens are a spec for the
END STATE. Judge 1b against §10's COLOUR column only** — its type, box and structure columns land later.

### 0.3 What 1b actually changed, in one paragraph

The purple family (`#6B21A8`, `#4C1D95`, `#C4B5FD`, `#9333EA`) collapsed onto `accent` (amber) and
`accent-2` (violet); pink `#EC4899` went to `accent-2`; ~30 one-off hexes and 118 rgba values went to
tokens or `t.alpha()`; **`lib/colors.ts` was deleted**; five hue ladders collapsed to one colour
(**O-24**); ~40 A5 contrast pairings were fixed to `on-accent`. **So the app should read AMBER +
VIOLET on the old purple-black ground, with no purple fills and no pink anywhere.**

---

## 1. THE RIG — hold all of these constant

One physical device · one OS version · **OS font size DEFAULT** · **OS display size DEFAULT** · dark
mode (the app is dark-only) · **airplane mode OFF** (every surface below is server-fed) · the same
account at the stated tier · the same scroll position reached by the same gesture count.

**Two accounts are needed:** one **FREE** and one **PREMIUM PLUS**. Grant Premium Plus with
`server/src/scripts/grant-comp-tier.ts` — 🔴 **but read §5 (P15) FIRST**: the comp-tier path has an
unverified clobber risk that this build is the instrument for testing.

---

## 2. 🔴 THE FOUR HIGHEST-RISK SURFACES — SHOOT THESE FIRST

1b's regressions concentrated here. If device time runs out, these four are the ones that mattered.

---

### ⚠️ H1 · `(capture)/birth-data` — the handedness toggle

| | |
|---|---|
| **Route** | `/(capture)/birth-data` |
| **Account** | **FREE**, and one with **no birth data saved** |
| **How to reach** | Fresh signup → the capture flow routes here automatically. On an existing account, clear birth data or use a new email. |

**WHAT TO JUDGE — the selected/unselected contrasting pair:**

- **Selected** handedness: `bg-accent/20` fill + **`border-accent`** border + **`text-accent`** label
  (`birth-data.tsx:332-339`). **Unselected**: `bg-bg` + `border-border-subtle` + `text-fg-muted`.
- 🔴 **The named question: is the selected state unambiguous ACROSS THE ROOM, not just up close?**
  1b originally shipped selected = `border-strong` (`#2D2640`) against unselected `border-subtle`
  (`#1F2937`) — **two structural neutrals, near-indistinguishable**, so selection rested on the label
  alone. Fixed in `0e751f8` under the new **state-border rule** (`STRUCTURAL BORDERS SEPARATE; STATE
  BORDERS SIGNAL — they cannot share a token`). **This capture is that rule's proof.**
- Confirm the amber border + amber label + amber-at-20% wash read as **one coherent selected state**,
  and that the unselected tile does not read as disabled.
- Also in frame: the birth-date field and birth-time field are `bg-bg` + `border-border-subtle`
  (`:236`, `:266`) — the **same** treatment as an *unselected* toggle. Confirm an input does not read
  as a selectable option.
- **`text-fg-placeholder`** `#6B7280` on the time field when empty (`:268`) — §2 row 9 is
  **sub-AA by design**; the label above it is the real label. Confirm it reads as a hint, not as a value.
- ⚠️ The "Clear" button at `:278` is **`bg-border-subtle`** — a border-role token as a block fill.
  Registered as **O-26** (§4), NOT fixed. Note how it reads; it is a screens-phase decision.

🆕 **The error banner was BROKEN and is fixed in this build** (`:403-415`). It used `bg-error/20`,
`border-error`, `text-error` — **`error` is not a token**, so all three resolved to nothing and the
banner rendered with no fill, no border and RN's default near-black text on the dark canvas. Now
`danger`. **To see it**: turn airplane mode on and press Continue, or submit with the backend
unreachable. Judge: a `danger` 1px border + `danger/20` wash + `danger` message on the screen canvas
(§2.1 does not bite — the ground is the canvas, not `surface-overlay`).

---

### ⚠️ H2 · `(auth)/signup` — the terms checkbox, a legal-consent control

| | |
|---|---|
| **Route** | `/(auth)/signup` |
| **Account** | **none** — pre-auth |
| **How to reach** | Log out → welcome → "Sign Up". **Do not submit**; only toggle the checkbox. |

**WHAT TO JUDGE — checked vs unchecked, side by side:**

- **Checked**: `borderColor: accent` + `backgroundColor: accent` + a **`text-on-accent`** ✓ glyph
  (`signup.tsx:238-243`). **Unchecked**: `borderColor: border-subtle`, `backgroundColor: 'transparent'`.
- 🔴 **The specific failure this is checking for: a checked box that reads as UNCHECKED.** Same
  root cause as H1 — pre-fix this was `border-strong` vs `border-subtle`, two structural neutrals on a
  **20×20dp** target with `border-2`. On a legal-consent control that is a materially worse outcome
  than on a preference toggle, which is why it is #2 on this list.
- Confirm the ✓ glyph is legible: `on-accent` `#000000` on `accent` `#F59E0B` = **9.78:1**. It is
  `text-xs` (13px) inside a 20dp box — **check it is not clipped** by the box.
- The two consent links — "Terms of Service" and "Privacy Policy" — are now
  **`accent` + `textDecorationLine: 'underline'`** on `text-fg-muted` body copy (`:247-260`).
  **P28's third added surface.** Judge: do they read as links, and does amber-on-`#9CA3AF`-adjacent
  copy stay legible? (`accent` on `bg` = 7.30:1 at Vellum; amber on this ground today is comparable.)
- ⚠️ Also here: the two `h-px bg-border-subtle` "or continue with" hairlines (`:274`, `:276`).
  **These are CORRECT** — a 1px View filled with the divider token *is* a divider (§2 row 11). Do not
  report them. They are also why `px` is the 13th spacing key (§6.2 C-b).

---

### ⚠️ H3 · `home.tsx` — `DailyInsightCard`, the 1.00:1 site

| | |
|---|---|
| **Route** | `/(main)/home` |
| **Account** | either tier; needs **birth data saved** so the server generates a daily insight |
| **How to reach** | Launch → Home. The card is at the top, below the header. If it shows a spinner, wait — it is one of six independent fetches. |

**WHAT TO JUDGE — the codemod-created invisibility, now fixed:**

- 🔴 **This is the single worst thing 1b created.** ENTRY 6 **row 12**: the card is a
  `[alpha(accent,60), accent]` gradient, and the codemod set its heading colour to **`accent`** —
  **`accent` on `accent` = 1.00:1. Literally invisible text.** Fixed to `on-accent` in `8421e1d`.
- **Judge**: the heading (`text-on-accent text-2xl font-bold`, `DailyInsightCard.tsx:129`) and the
  body (`text-on-accent text-base`, `:134`) must be **black on amber, crisp, at 9.78:1**. If any text
  on this card is amber-on-amber or white-on-amber, the fix did not take.
- The progress bar at `:46` is `border-subtle` as its **track**, with an `accent` fill. §2 row 14
  names `accent-muted` as the progress-track fill — **registered as O-26 (§4), not fixed.** Judge
  whether a slate track under an amber fill reads correctly, and record an opinion; that is the O-26
  decision.
- **Same frame, capture #1's other items**: `StreakBadge` (see H3b), `AstroNumeroBadge`'s two
  `on-accent`-on-`accent` numerals (fixed in this build — §4), the greeting, and the tier string.
  ⚠️ The tier string renders `` `${tier.toUpperCase()} Member` `` at `home.tsx:74`, **not**
  `Free Plan` — that is **P25(c)**, a screens-phase copy change. Not a 1b bug.

**H3b — `StreakBadge`, in the same shot.** 🔴 **Fixed in this build.** Its gradient is
`[accent, danger]` and its numeral is `on-accent`, but the **"day streak" label was missed** by 1b's
16 gradient fixes and stayed `fg` (white). On `main` the gradient ended at red-700 where white was
**4.83:1 and passing**; the red-600 → `danger` mapping moved it to **3.76:1, failing**. Now
`on-accent` (9.78:1 amber end, 5.58:1 danger end). **Judge**: numeral and label must be the SAME
colour and both legible across the amber→red sweep. ⚠️ **X11**: its explicit `height` per size and
`borderRadius: height / 2` must be untouched — the pill must not have become a rounded rectangle.
⚠️ Needs `currentStreak > 0` to render at all.

---

### ⚠️ H4 · `numerology/name-destiny` — the analyse CTA

| | |
|---|---|
| **Route** | `/(main)/numerology/name-destiny` |
| **Account** | **FREE** (for the used-credit/disabled state) **and PREMIUM PLUS** (for the enabled state) — two visits |
| **How to reach** | Home → Explore → "Name Destiny", or Readings → Name Destiny. **For the disabled state you must have already spent the free credit** — run one analysis first, then return. |

**WHAT TO JUDGE:**

- 🔴 **The disabled ground.** `:173` is `backgroundColor: t.color['border-subtle']` with a
  `text-fg-muted` label. **This is the site 1b found that named the whole role-dimension class** — a
  token whose name declares a *border* role, used in the *background* dimension. §2 has **no disabled
  container fill**: row 10 gives `fg-disabled` for the disabled *label* paired with `opacity: 1`, and
  names nothing for the ground. **So there is no legal token to move it to and it was deliberately
  NOT fixed** (see §4). **Judge**: does a slate-filled pill with grey copy read as *disabled* rather
  than as *a secondary action*? Your answer sets the Button primitive's disabled spec (§9).
  The identical shape is at `qa.tsx:615` (the send button) — same question, same answer.
- **The four A5 labels**, all now `on-accent`:
  `:320` "Calculating cosmic blueprint…" beside an `on-accent` `ActivityIndicator` (`:319`) ·
  `:325` "Analyze My Name" on the enabled `accent` CTA · `:485` the three rank-icon badges.
  **Judge**: black-on-amber, crisp, at every one. A white or amber label on any of these four is a
  missed fix.
- **O-24 applied here, and its extension is UNCONFIRMED (`P27`).** `name-destiny`'s 6-category
  `IMPACT_COLORS` and its 3-number share card were collapsed to **one colour** (`accent`) on the
  ruling's ground (b). 🔴 **Judge the consequence directly: with six impact categories all amber, can
  you still tell them apart?** The icon and the label are meant to carry identity. **This shot is the
  evidence for or against P27** — the strongest existing argument for the collapse is that
  `FocusAreaBadge` already held a duplicate before 1b (Career and Creativity both `accent`).

---

## 3. THE REMAINING 17 SURFACES

§4.4's 18 (minus #8, which 1b did not touch) plus P28's third addition. **#1, #12's badge half and
#11's CTA half are already covered by H1–H4 above** — the rows below are what those shots do not reach.

| # | route · state | account | how to reach | WHAT SPECIFICALLY TO JUDGE |
|---|---|---|---|---|
| **3** | `readings/index` — **full scroll** | FREE **and** PPLUS | Tab bar → Readings | 🔴 **Highest 1b change density: 7 of the 16 gradient fixes.** Six gradient cards; **every title and subtitle must be `on-accent` (black) on its amber/violet/green fill** (`:140,168,198,234,267,312,354` + the `/80` subtitles). ⚠️ **Three sub-CTA pills stayed `text-fg`** — `:148` "Ask a question →", `:176`/`:206` "View/Get Reading →" — inside a `bg-fg/20` white pill over amber, which composites to ≈**1.86:1**. **PRE-EXISTING at identical value on `main`** (`bg-white/20` + `text-white`), so NOT a 1b regression and deliberately not fixed. **Judge how bad they actually look** — that decides whether they are a screens-phase fix or a hotfix. Also `:225` PREMIUM and `:304`/`:346` PREMIUM PLUS markers: `:225` is `on-accent` on a `bg-fg` white pill (**O-25**, a fifth tier-badge treatment) — confirm all three tier markers are legible and note whether they read as one system |
| **4** | `readings/face` — a **locked** section | **FREE** + a completed face reading | Readings → Face → scroll to a premium section | One of three lock treatments. `LockedSection` uses 4 `t.alpha()` sites. **Judge**: the lock plate is `surface-raised` at held rgba(255,255,255,0.05) — 🔴 **`locked` has 0 call sites by design**, so the plate is *the same value* as a raised card. Confirm the locked row is still legibly "withheld", and that no tier name appears in the plate copy |
| **5** | `readings/palm` — the score bar | either | Readings → Palm → scroll to scores | `ScoreBar`'s track is `border-subtle` (`:97`), fill `accent` — **O-26** again. `PalmTypeHeader` has 5 `t.alpha()` sites. 🔴 **O-24 applied**: the three-band score ladder collapsed to one colour. **Judge: does a 3/10 and an 8/10 read as different without a hue difference?** The number carries the value by ruling |
| **6** | `readings/combined` — the **full-screen lock** | **FREE** | Readings → Combined Profile | 12 `t.alpha()` sites, the most in any file, and an early-return lock (audit §5.6). `:441`/`:447` are a module-scope `StyleSheet` pair — `alpha(accent,15)` fill + `alpha(accent,30)` border. **Judge**: an amber wash card with an amber border on the canvas; the CTA label must be `on-accent` |
| **7** | `astrology/index` top — Big Three + generate CTA | either; ⚠️ **the CTA only renders with NO chart** | Home → Explore → Astrology. Two sub-states: with a chart, and without | 🔴 **The worst scatter file: 52 hex, 97 inline styles.** The A5 violation fired **twice** here. **Judge**: the generate CTA is `on-accent` on `accent` (was white on `#F59E0B` = 2.15:1). 🔴 **Sun/Moon/Rising must now be ONE colour** (§10.3 — they were three hues); confirm the glyph and label differentiate them. The PLUS badge's `color:'black'` is the **last surviving `keywords` residual** — **R1 deletes it**, so it is expected to still be here |
| ~~8~~ | ~~`astrology` — BirthChartWheel~~ | — | — | 🟢 **SKIP. Not needed for 1b.** Design §11.4 owns the wheel and 1b deliberately did not touch it — it holds `no-raw-hex`'s entire residual floor (11 hex + 1 rgba). **Required at pass 5** |
| **9** | `astrology/index` — PlanetCard ×10 + LifeThemeCard ×5 | **PPLUS** + a generated chart | Astrology → scroll past the wheel | **Judge**: ten planet glyphs must have lost their `#F59E0B` gold (§10.3 — "ten identical gold glyphs weren't differentiating anything") and read `fg-muted`. `LifeAreaCard`'s `areaConfig` is **O-24-collapsed** to accent/accent-2/success — confirm the four life areas are still distinguishable by icon + label |
| **10** | `astrology/monthly` — a `LockedSection` | **FREE** | Astrology → Monthly | **B1**: a decorative lock over data already on the wire. Same lock-plate question as #4. **Judge**: is the lock treatment here *identical* to #4's and #6's? The app currently ships three; recording the difference is what justifies `LockShell` |
| **11** | `numerology/index` **bottom** | either | Home → Explore → Numerology → scroll to bottom | `:673` is a flat `[accent, accent]` gradient with **`:678`'s PREMIUM PLUS marker now `on-accent`** — 🔴 **that one was CODEMOD-DEGRADED**, from `#9333EA` on white (5.6:1, passing) to `accent` on white (2.15:1) before being fixed. Confirm it is black-on-amber. **X15/X17**: a `fontSize:40, lineHeight:50` emoji reservation must not have moved |
| **12** | `profile` — avatar + tier + disclaimer | either | Tab bar → Profile | **Judge**: the avatar initial and the Life Path numeral are **`on-accent` on `accent`** (fixed in this build — §4). The streak pill moved orange → `accent/10`; **three chips now sit adjacent** — confirm they do not merge into one band. ⚠️ **The two dead `w-30 h-30` classes are still here** (`:186`,`:190`) and have **never resolved at any baseline** — the avatar is sized by an adjacent inline `{width:120,height:120}`. Expected; pass 3a deletes them. **X9**: the truncated inline disclaimer |
| **13** | `qa` — a **normal** thread | either | Home → Explore → Ask the Stars → send a question | 39± lines changed. **Q1's eight `!safetyMode` gates must be structurally intact** (colour-only edits). 14 of the 28 fractional font sizes live here. **Judge**: user bubble vs assistant bubble must stay distinguishable — the assistant bubble is `surface-raised` at held rgba(255,255,255,0.05). Send button: `accent` when enabled, **`border-subtle` when disabled** (`:615`) — the H4 question again |
| **13b** | `qa` — a **safety-decline** thread | either | 🔴 **AFTER-ONLY, AGAINST SPEC — no baseline, and not reproducible on demand.** Requires the **server** to classify a message as crisis/unsafe. Send a message that would trip the crisis classifier; if it does not trip, **do not keep trying** — fall back to a code-level review of `qa.tsx`'s `isSafety` branch | **Judge against §2.1**: the decline card must carry **no `danger` copy on `surface-overlay`** — that pairing is 4.28:1 and is the system's **only unconditional prohibition**. Title/body in `fg`/`fg-secondary`; resource links legible |
| **14** | `cosmic-report` — the **`generate`** phase | **PPLUS** | Home → Explore → Personalized Cosmic Report → generate | 🔴 **51 lines — the largest single-file 1b diff.** Structure is FROZEN (restyle-only, owner decision). The other 14 fractional sizes. **Judge**: `on-accent` on the primary CTA; the 4 `t.alpha()` washes; that no section header lost its hierarchy |
| **14b** | `cosmic-report` — the **`ready`** phase | **PPLUS** | 🔴 **AFTER-ONLY. No baseline.** Needs a **completed PDF render**: `REPORT_WORKER_ENABLED` must be `true` on prod (it is, as of 2026-07-27), then wait minutes. Verify via the report-history chip turning `ready` | **Judge**: `success` (`#10B981` green) must read as *ready* and be clearly distinct from the `accent` *generating* state. ⚠️ The report-ready **email** carries a signed URL and must be sent with tracking OFF (CLAUDE.md) — if you open the email, confirm the link is not a `url*.revelia.me/ls/click` rewrite |
| **15** | `(paywall)/index` — **full** | **FREE** (so the paywall is reachable) | Any locked surface → upgrade prompt, or Profile → Upgrade | 🔴 **Highest revenue leverage.** **Judge**: the CTA is `on-accent` on `accent` — it was **`text-white` on `bg-gold` = 2.15:1**, the flagship A5 violation. The billing toggle's active pill is `text-on-accent`, inactive `text-fg-muted` (`:124`,`:132`) — confirm the active period is unmistakable. **X19**: `zIndex:50` + `elevation:10` on the close button — it must not have fallen behind the aura/content. ⚠️ **One §16.2 tension registered, not resolved**: `:144`'s selected **Premium** card carries `border-accent-2` while the Premium-Plus card's selected border is `accent` — **judge whether the two selected states are distinguishable**, because sending both to `accent` would collapse the only distinction |
| **16** | `(auth)/welcome` **and** `(auth)/login` | **none** — pre-auth | Log out | Listing screens; 6± lines each. **X2**. The `h-px` hairlines ×4 (**correct — do not report**). ⚠️ **`space-y-3` is still here and has NEVER resolved** at either `inlineRem` baseline — expected; pass 3a converts it to `gap-3`. `welcome.tsx:73`'s `[bg, alpha(accent,10)]` gradient must read as a subtle warm wash, not a band |
| **17** | `DeleteAccountModal` — **both buttons** | either | Profile → Delete Account. 🔴 **SCREENSHOT ONLY — NEVER CONFIRM.** Step 2 requires typing DELETE; do not. **AFTER-ONLY, no baseline** — a destructive flow is never a listing shot | **X20** — the only fixed-height + `className`-typed button pair in the app; **two `height:56` must survive**. **Judge against §2.1**: the modal's ground is `surface-overlay`, so **`danger` as TEXT is PROHIBITED here at any size**. The destructive action must be a **`danger`-filled button with an `on-accent` label**, and the cancel must be the thumb-nearest choice. Body copy `fg-secondary` |
| **18** | `GeneratingReading` — 1-line **and** 2-line rotating message | either | Start any reading. 🔴 **TRANSIENT, AFTER-ONLY** — a state inside a ~60s wait; which variant appears depends on the rotating message. Burst-shoot, or screen-record the wait and pull frames | **X17**: `minHeight:44` must absorb the 2-line message **without the layout jumping** — that is the whole point of the reservation. Its gradient (`:363`,`:430`) is `[accent, bg, bg]` and is 🟢 **legal** — content is centred over the `bg` band at 16.8:1, amber is only the top third. **Judge**: does the top amber band read as intentional, and does the `0.97` progress asymptote never look stalled? |
| **21** | `cosmic-report-history` — the **four status chips** | **PPLUS** with ≥1 report in ≥2 states | Cosmic Report → History | 🔴 **P28's third added surface.** All four chips were re-tokened (`:55-58`): `ready` = `success`/`alpha(success,10)` · `gen` = `accent`/`alpha(accent,10)` · `exp` = `fg-muted`/`alpha(fg-muted,10)` · `fail` = `danger`/`alpha(danger,10)`. **Judge: are all four mutually distinguishable?** Held they are green/amber/grey/red. 🔴 **At Vellum they compress to `#86A97B`/`#D98E57`/`#8E867C`/`#C8695E` — `success` and `fg-muted` get closer.** Record an opinion now; it is a pass-5 input. ⚠️ These are **module-scope `t.alpha()` calls** — see §6 |

---

## 4. 🔴 THE ROLE-DIMENSION SWEEP — what was fixed in this build, and what was not

A token whose **name declares a role**, used in the wrong **dimension**, passes every gate: the gates
count legacy *removal*, not placement *correctness*. `tsc` passes, `no-legacy-tokens` passes (the name
is legal), and `no-white-on-accent` cannot see it (the name is not `white`).

### 4.1 🟢 FIXED in this build — 9 lines, 6 files, one `fix(build-27.1):` commit

| # | site | was | now | why it is real |
|---|---|---|---|---|
| 1–2 | `AstroNumeroBadge.tsx:54,105` | `color: t.color.bg` | `t.color['on-accent']` | `bg` is the **app-canvas** role, used as a foreground on an `accent` fill. 9.08:1 → 9.78:1 — **contrast-correct but token-incorrect**, exactly CLAUDE.md's `on-accent` warning. Came from `main`'s `colors.background` via a value-preserving 1a mapping |
| 3 | `ProfileHeader.tsx:47` | `text-bg` | `text-on-accent` | same; from `main`'s `text-background` |
| 4 | `SunSignReveal.tsx:86` | `text-bg` | `text-on-accent` | same |
| 5 | `ShareableQuote.tsx:38` | `text-bg` | `text-on-accent` | same — and **1b created this one**: `main` had `text-[#0F0A1A]`, one of C10's three arbitrary-value classes. **The quote 4 lines below it was already `on-accent`** — same file, same fill, inconsistent |
| 6 | `StreakBadge.tsx:42` | `color: t.color.fg` | `t.color['on-accent']` | **An A5 REGRESSION missed by 1b's 16 gradient fixes** (ENTRY 6 row 13). `main`: white on red-700 = 4.83:1, passing. After red-600 → `danger`: **3.76:1, failing.** The numeral beside it was fixed; this label was not |
| 7–9 | `(capture)/birth-data.tsx:403-415` | `bg-error/20` `border-error` `text-error` | `bg-danger/20` `border-danger` `text-danger` | 🔴 **`error` IS NOT A TOKEN.** All three resolved to **nothing** — no fill, no border colour, RN's default near-black text on the dark canvas. **Pre-existing on `main`**, unseen by every gate: `no-legacy-tokens` enumerates names it was told to look for and `error` was never in the list — **the same enumeration-incompleteness class as `orange`** |

**Verified after the fix**: `tsc` **0/0** · gate `hex 15 / rgba 1 / keywords 1` (unchanged, at floor) ·
`no-legacy-tokens` **0/0/0** · `--diff` shows **exactly two intended movements** — `bg-danger/20`
appears, `text-bg` disappears (all five sites migrated) · the source-vs-resolved check reports **only
the 3 documented pre-existing dead classes**.

### 4.2 ⬜ FOUND BUT NOT FIXED — **`O-26`**, a real open decision

**🆕 `O-26` — `border-subtle` is used as a FILL at 13 sites, and §2 names a different token for 6 of them.**

- **6 progress/score TRACKS**: `astrology/daily.tsx:163` · `compatibility/index.tsx:776` ·
  `readings/palm.tsx:97` · `DailyInsightCard.tsx:46` · `ScoreCard.tsx:66` · `PalmLineCard.tsx:42`.
  🔴 **§2 row 14 names `accent-muted` as "progress-track fill".** So `border-subtle` here *is* a
  role-dimension misplacement by the design's own table.
  **NOT FIXED, deliberately**: these were neutral (`gray-800`-family) on `main`, so `border-subtle` is
  the **value-preserving** 1a mapping. Moving 6 tracks from a slate to an amber wash is a **visible
  value change** and a design decision — applying it inside a pre-build check would be inventing a
  design change and would invalidate the screenshot the owner is about to take. **Judge it on device
  at rows H3, 5 and 11 and rule.**
- **5 BLOCK FILLS with no legal target token**: `birth-data.tsx:278` (the "Clear" button) ·
  `astrology/daily.tsx:229,233,237` (three cells). §2 has no low-emphasis-fill role. **Screens phase.**
- **2 DISABLED GROUNDS**: `name-destiny.tsx:173` · `qa.tsx:615`. **The site that named this class.**
  §2 row 10 gives `fg-disabled` for the disabled *label* + `opacity: 1` and names **no** disabled
  container fill, so there is nothing legal to move them to. **Belongs to the Button primitive (§9).**

**🟢 EXPLICITLY CORRECT — do not re-flag these:** the four `h-px bg-border-subtle` hairlines
(`login.tsx:180,182` · `signup.tsx:274,276`) and `AstroNumeroBadge.tsx:88`'s `width:1 height:32`
divider. A 1px View filled with the divider token **is** a divider (§2 row 11), and §10.3 rules the
`AstroNumeroBadge` one explicitly. Dimension is nominally *background*; role is *divider*.

**🟢 Sweep C — `borderColor` / `border-*` holding an `fg-*` or `surface-*` token: ZERO hits.** Clean.

---

## 5. FOLDED IN — two owner actions that need exactly this build

Both would otherwise require their own Play-signed cut. **Do them in the same session as the captures.**

### 5.1 **P16** — the comp-tier clobber, via `server/src/scripts/grant-comp-tier.ts`

> ⚠️ **ID correction**: the clobber is **P16** in `owner-actions.md`. **P15** is the adjacent
> "confirm RevenueCat access + Play integration status" row. Both need a Play-signed build and run in
> the same sitting, but they are two rows.

**The hypothesis** (recorded as plausible-but-unverified, because it depends on RevenueCat **SDK
runtime** behaviour, not on code): `subscriptionStore.applyTierToAuthUser()` overwrites the server's
comp-derived tier with the **RevenueCat-derived** one, and it is invoked from the **global
`CustomerInfo` listener registered at app launch**. A comped user has **no RevenueCat entitlement**, so
`mapCustomerInfoToTier` returns `'free'` — **which would lock every tier gate while the server keeps
granting access.**

**Repro, in order:**
1. Run `grant-comp-tier.ts` against the test account on **prod** (there is no staging — §4.1).
2. Confirm the **server** reports the comped tier (`getEffectiveTier` / the profile endpoint).
3. **Cold-start the app** on this build and sign in as that account.
4. 🔴 **Watch what the CLIENT thinks after the `CustomerInfo` listener fires.** Visit a Premium-Plus
   gate (Cosmic Report, or Deep Insight in `qa`).
   - **Gate opens** → the hypothesis is **wrong**; close P15's clobber half.
   - **Gate is locked while the server grants access** → **CONFIRMED.** It is also a standalone
     argument for §B5's `entitlements` field.

🔴 **Do this BEFORE the Premium-Plus captures** (#9, #14, #14b, #21) — if the clobber is real, comp
tier will not unlock them and you need a real purchase or a different mechanism to shoot those four.

**And in the same sitting, P15**: the paywall visit for capture #15 answers whether RevenueCat products
render **at all** on a Play-signed build (Amey sees none in the dashboard). If they do, read the actual
prices off the screen and close **P-B** / **P17**'s `$14.99/$99.99`-vs-`$12.99/$89.99` conflict from
what the store returns — that is only answerable on a Play-signed build.

### 5.2 **P11** — is the D5 per-device gate actually live on prod?

**Step 1 — the boot log** (2 minutes, do it before touching the device). In the Railway logs for the
prod backend, search the boot output for:

```
[qa-device-gate] QA_DEVICE_SALT is NOT set
```

- 🔴 **If that line IS present**, `QA_DEVICE_SALT` is unset, the gate **fails open**, and the repro in
  step 2 will "pass" for the wrong reason. **Set the secret and redeploy before continuing.**
- 🟢 **Absent** → the salt is set (it was set on prod 2026-07-27). Proceed.

**Step 2 — the two-account repro**: on **one device**, create **two free accounts** and try to claim a
free Fable-5 Deep Insight on each. **The second must be refused.** If both succeed while the boot log
is clean, the gate is broken for a *new* reason and that is a finding.

> **Why this needs this build**: the internal track is **hardwired to prod** via `extra.apiUrl`, and
> the original failure was root-caused to the prod salt being absent *at test time* — the gate was
> inert exactly where it was tested. There is no other pre-release path to exercise it.

---

## 6. 🔴 RUNTIME RISK REGISTER — what can fail that no gate could catch

Verified at this commit, not assumed. **Everything in §6.1–§6.4 came back CLEAN** — the value is
knowing *why*, and what would break it later.

### 6.1 Unresolvable NativeWind classes → silently dropped → intrinsic size

**The mechanism**: NativeWind discards an unresolvable utility with **no warning, no build error and
no runtime signal**. A dropped `bg-*` renders transparent; a dropped `w-`/`h-`/`p-` renders at
intrinsic size; a dropped `text-*` colour falls back to RN's default (near-black on Android).

**S1 made this live**: `colors` is now a **top-level replace**, so Tailwind's entire default palette
and all 565 retired custom names are **gone**. Any colour class not in `theme.color` now renders nothing.

🟢 **Measured directly** — every `className` literal in `app/` + `components/` cross-checked against
the **resolved** rule set (`resolve-utilities.js`, 206 rules, the real production resolution path).
**Three unresolved classes remain, all documented and all pre-existing dead code:**

| class | sites | status |
|---|---|---|
| `space-y-3` | `login.tsx`, `signup.tsx` | **D4** — never resolved at either `inlineRem` baseline. Pass 3a → `gap-3` |
| `w-30` / `h-30` | `profile.tsx:186,190` | Tailwind 3 has **no `30` key**; sized by an adjacent inline `{width:120,height:120}`. Pass 3a deletes |

🔴 **The `error` triple on `birth-data` was the fourth, and it was NOT dead code** — it was a live
error banner rendering nothing. **Fixed in this build (§4.1).** It is the proof that this check is not
redundant with layer 2: `no-legacy-tokens` greps for names it was **told** to look for, and nothing
told it about `error`. **Layer 3 is the only layer that can see "this class no longer resolves."**

🔴 **Standing recommendation**: promote this source-vs-resolved membership check to a **mode of
`resolve-utilities.js`** before pass 3a. It caught `orange` at S1 and `error` here — two hits, two
different root causes, both invisible to every other layer. **Ad-hoc, it will not be run again.**

### 6.2 `t.alpha()` — a runtime function call inside a style object

**It THROWS; it never returns `undefined`** (`theme.js:192-226`). Three guards: a 6-digit-hex shape
check, a **role-keyed denylist reverse-lookup** (`surface-raised`, `surface-overlay`, `locked`,
`fg-disabled`, `border-subtle`, `border-strong`), and a 5-step integer `pct` assert.

**115 call sites.** Densest: `readings/combined.tsx` 12 · `home.tsx` 10 · `face-capture.tsx` 8 ·
`PalmTypeHeader` / `palm.tsx` / `palm-capture.tsx` 5 each.

🟢 **All 29 distinct direct forms EXECUTED against the real `theme.js`: 0 throws, 0 undefined.**
🟢 **All 3 genuinely indirect first-arguments resolved by hand** — `name-destiny`'s
`IMPACT_TINT` (= `t.color.accent`), and `FocusAreaBadge` / `LifeAreaCard`'s `areaConfig` maps (only
`accent`, `accent-2`, `success`). A fourth apparent hit, `career-destiny.tsx:293`, is a grep artefact —
it is a plain `t.alpha(t.color.accent, 10)`.

🔴 **BUT — the throw's blast radius depends on WHERE it is called, and two classes exist:**

| where | what the owner would see |
|---|---|
| **inside `render`** (most sites) | React unwinds to the nearest boundary. `ErrorBoundary` **is** mounted at the root, twice (`app/_layout.tsx:209,213`) → the owner sees the **ErrorBoundary screen**, not a white screen. ⚠️ `ErrorBoundary` itself calls `t.alpha(t.color.accent, 10)` at `:42`, so a theme-wide failure would take the boundary down with it |
| 🔴 **at MODULE SCOPE** | **Uncatchable by any boundary** — it runs at import, before React exists. **The route fails to load, or the bundle fails to evaluate.** Sites: `StyleSheet.create` blocks in `face-capture` (×8), `palm-capture` (×5), `astrology/index`, `compatibility/index`, `combined`, `CaptureInfoModal`, `FaceGuideOverlay`; and top-level const maps at **`home.tsx:400-404`** (the 5 relationship types) and **`cosmic-report-history.tsx:55-58`** (the 4 status chips) |

**All module-scope calls use `scrim`, `accent`, `accent-2`, `success`, `danger`, `fg`, `fg-secondary`,
`fg-muted` — all solid hex, none on the denylist. 🟢 Safe at HEAD, and 🟢 safe at pass 5 too**, because
the six tokens that become `rgba()` at Vellum are exactly the six already on the denylist and none of
them is passed to `alpha()`. **Register the class anyway: a future pass that alpha-ifies any of those
eight tokens converts these into import-time failures that no boundary can catch.**

### 6.3 The quoted-token-call class — `backgroundColor: 't.alpha(...)'` as a **string**

🟢 **CONFIRMED ZERO at HEAD.** `no-quoted-token-call` = **0**, and `no-value-shape-concat` = **0**.

Worth restating why it earned a rule: it **typechecks** (`backgroundColor` accepts a string), the token
gate **counts it as migrated**, and **it renders nothing**. Found only by the batch-replay
reconstruction's byte-identity diff.

### 6.4 The 28 gradients — could any stop resolve to `undefined`?

🟢 **No.** All 28 enumerated; every token referenced (`bg`, `surface`, `accent`, `accent-2`, `success`,
`danger`) exists in `theme.color`, and every `t.alpha()` pct is on the 5-step scale. **A gradient stop
of `undefined` would render a transparent or black slab — none can.** Count still **28**, matching
ENTRY 6, so **no unregistered gradient exists**.

**The 16 A5 fixes are verified landed in source** — rows 2–17 all now carry `on-accent`, including
row 12's 1.00:1 site and row 16's `StyleSheet` pair. ⚠️ **One was incomplete**: row 13's second label
(`StreakBadge`'s "day streak") — **fixed in this build (§4.1)**. ⚠️ **Two are deferred by the ledger
itself**: `ShareCard`'s `numberValue`/`numberLabel` sit ~40% down an `[accent, bg]` card, so their
ground is a **blend this register cannot compute from source** — **read them on the device** (row 11's
sibling surfaces) rather than re-tokening blind.

### 6.5 🔴 What only fails on a RELEASE build, never in dev

This is the part no local check reaches, and it is why cut 1 exists.

| # | mechanism | what the owner would see |
|---|---|---|
| 1 | 🔴 **RevenueCat, Google Sign-In and push only behave correctly on a Play-signed build.** A sideloaded APK has a different signature, so Play Billing refuses, Google Sign-In's OAuth cert hash mismatches, and FCM tokens do not register | Empty paywall / "no products", Google login failing with a bare `DEVELOPER_ERROR`, notifications silently never arriving. **This is why the cut must be `--profile production`, not `preview`** |
| 2 | **Hermes release bytecode + minification.** `jsEngine: "hermes"` on both platforms | A dev-only-passing pattern (a swallowed exception, an `undefined` access behind a `__DEV__` guard) surfacing as a blank screen. `t.alpha`'s throws are *not* `__DEV__`-guarded — they fire in release identically, which is the safe design |
| 3 | 🔴 **NativeWind's class extraction is a BUILD-TIME step over `content` globs.** A class assembled at runtime from a template literal is **never emitted**, so it silently does nothing — and in dev it may appear to work if some other file happens to contain the same literal | An element at intrinsic size. This is the exact failure this whole cut is built to surface, and **§6.1's membership check cannot see it** — it only reads literal segments, deliberately skipping `${…}` interpolations |
| 4 | **`newArchEnabled: true` + `react-native-purchases`' old-arch interop.** Expected and working (CLAUDE.md) — not a bug, but the interop layer is exercised for real only on a release build | Paywall or restore misbehaving under the bridge. §10.2.5's rule applies: the spinner must never be driven by the purchase promise |
| 5 | ⚠️ **`expo-updates` is configured `checkAutomatically: "ON_ERROR_RECOVERY"`** | On a JS crash the app may fetch an update from the `production` channel. Cut 1's `runtimeVersion` is `appVersion`, so a 2.1.0 build cannot receive a 2.0.0 update — 🟢 **this isolates the cut**, provided the version is bumped (§7) |
| 6 | 🔴 **The `(capture)` screens are camera + permission surfaces**, with 13 module-scope `t.alpha()` sites between them | A permission-denied or camera-init path that only exists on a real device. Not colour, but it is where a module-scope failure would land hardest |

### 6.6 🔴 BOOT SMOKE SEQUENCE — under two minutes, BEFORE any capture work

**Stop at the first failure and report it. Do not start the checklist until all seven pass.**

| # | do this | passes if | a failure means |
|---|---|---|---|
| **1** | **Cold-launch** the app (force-stop first) | Splash → a real screen. **No ErrorBoundary, no white screen, no immediate exit** | 🔴 A **module-scope** failure — a `t.alpha()` throw at import or a broken `theme.js`. Nothing below matters; the build is dead |
| **2** | Look at the **login/welcome** screen | Text is readable; the `[bg, alpha(accent,10)]` wash is subtle; the `h-px` hairlines are visible | A dropped colour class, or the S1 replace killed something the membership check could not see (a runtime-assembled class — §6.5 #3) |
| **3** | **Sign in** (email/OTP is enough) | Reaches Home | Auth or network. **Confirm `extra.apiUrl` is the backend you expect (§7)** before blaming the app |
| **4** | On **Home**, read the **DailyInsightCard** | 🔴 **Its heading and body are BLACK on AMBER and legible** | The **1.00:1 invisible-text fix did not take.** This is the single highest-value 2-second check in the whole sequence |
| **5** | Scroll Home to the bottom, then open **Readings** and scroll fully | Every card renders with a **visible label**; nothing is an unstyled box at intrinsic size; **no white-on-amber** | A dropped utility, or a missed A5 fix. Row 3 carries 7 of the 16 gradient fixes |
| **6** | Open the **paywall** | It renders **and shows real prices**; the CTA label is black on amber; the close button is on top | 🔴 Either the A5 fix, **X19**'s `zIndex`/`elevation`, or **RevenueCat is not wired** — which also answers half of **P15** (§5.1) |
| **7** | Open **Profile** | Avatar initial and Life Path numeral are **black on amber**; the three chips are distinct; tier renders | §4.1's fixes did not take, or the three adjacent chips merge |

🟢 **Seven passes ⇒ the codemod output boots, resolves and renders.** Only then spend time on judgement.

---

## 7. BUILD READINESS — verified at this commit, not assumed

| # | check | finding |
|---|---|---|
| 1 | 🔴 **Which backend does this build hit?** | **`https://revelia-backend-production.up.railway.app/api`** — from `app.json` `extra.apiUrl:108`. **`extra.apiUrl` BEATS the profile env**, confirmed in code: `lib/api.ts:76` is `Constants.expoConfig?.extra?.apiUrl \|\| process.env.EXPO_PUBLIC_API_URL \|\| <fallback>`. 🔴 **So the `production` profile's `EXPO_PUBLIC_API_URL` (`https://api.revelia.me/api`) is INERT** — the build bypasses the custom domain and talks to Railway directly. **It is the LIVE PROD backend either way** (no staging, §4.1): every capture is against production data, and P15's `grant-comp-tier.ts` run is a **production** write |
| 2 | **Which `eas.json` profile?** | 🔴 **`production`** — `eas build --platform android --profile production`. It is the only profile with `distribution: "store"` + `buildType: "app-bundle"`, i.e. **Play-signed**. `preview` is `distribution: "internal"` + APK = **sideloaded**, on which **RevenueCat, Google Sign-In and push all misbehave** — which would void rows 15, 16 and both of §5's owner actions. Upload the AAB to **Internal Testing**. 🔴 **DO NOT PROMOTE** (§10.2: cut 1 is an instrument, not a product) |
| 3 | 🔴 **P24 — the `expo-font` config plugin** | 🟢 **NOT in `app.json`'s `plugins` array.** The array holds exactly 7 entries: `expo-router`, `onesignal-expo-plugin`, `@react-native-google-signin/google-signin`, `expo-camera`, `expo-image-picker`, `expo-location`, `expo-build-properties`. **The pass-0 revert HELD.** It is only in `package.json` as a dependency, which is correct and inert — a config plugin runs at prebuild; a dependency does not. **Had it been left in the array with no fonts declared it would NOT have broken the build** (the plugin no-ops on an empty/absent `fonts` array), but the revert is still right: pass 4 is atomic with the font install, and a plugin sitting there ahead of its assets is exactly the state that makes a later "why did fonts stop working" un-diagnosable |
| 4 | **`newArchEnabled`** | 🟢 **`true`** (`app.json:10`) — required for OneSignal v5's TurboModule. Untouched |
| 5 | **Native delta from pass 0's two installs** | 🟢 **MANIFEST-ONLY, confirmed by `npm ls`**: `expo@53.0.27` **already depends on both** `@expo/vector-icons@14.1.0` and `expo-font@13.3.2`, and both are **`deduped`** — the installed tree is byte-identical, the two lines were promoted from transitive to direct. **No autolinking change, no native delta** |
| 6 | **Config stages S0 + S1** | 🟢 **Both landed.** `tailwind.config.js` carries the S0 bridge banner and the S1 banner, with **`colors` as a top-level REPLACE** and `spacing` / `fontSize` / `borderWidth` / `fontFamily` still under `extend`. 🟢 **No `borderRadius` key — deliberate**, not an omission (radius cannot bridge; it lands atomically at 3b) |
| 7 | **`lib/colors.ts`** | 🟢 **ABSENT.** Deleted in `202ca72`. The second token system is gone, not merely unused |
| 8 | **`resolve-utilities.js --diff` at HEAD** | 🟢 **`0 rule(s) moved, of 205 seen`, exit 0** — the harness runs clean at `inlineRem=16`. After §4.1's fix: **exactly 2 intended movements** (`bg-danger/20` appears; `text-bg` disappears), 206 rules. ⚠️ **Rule count fell 225 → 205/206 since pass 0** — expected and correct: the legacy colour classes the count included no longer exist in source *or* config |
| 9 | **`tsc` ×2** | 🟢 **mobile 0 / server 0**, re-run after §4.1's fix |
| 10 | **Token gate** | 🟢 `no-legacy-tokens` **0/0/0** · arbitrary-value **0** · `no-bare-scrim` **0** · `no-quoted-token-call` **0** · `no-value-shape-concat` **0** · `no-raw-hex` **15 hex / 1 rgba / 1 keyword — at its structural floor** (11 hex + 1 rgba are `BirthChartWheel`, owned by design §11.4; 3 are HTML entities; 1 is in a comment; the keyword is the astrology PLUS badge, which **R1** deletes). Radii/weights/fontsize counts are **expected nonzero** — passes 2–4 own them |
| 11 | **`core.hooksPath`** | 🟢 Set to `.githooks` on this machine. ⚠️ **P29**: it is **local config, never carried by a clone** — re-run per machine |

### 7.1 versionName / versionCode — 🟢 **AGREED: set `versionName` to `2.1.0` now**

**Current state**: `app.json` `version: "2.0.0"`, `android.versionCode: 26` (**inert** under
`appVersionSource: "remote"`), `mobile/package.json` `2.0.0`. Production is live on 2.0.0.

**Recommendation — bump to `2.1.0` before this build, and I agree with the owner's reasoning.** The
decisive argument is one they did not state: **leaving it at 2.0.0 puts three internal AABs labelled
`2.0.0` in the Play Console right next to the live `2.0.0` production release.** That is precisely the
configuration in which someone promotes the wrong artifact — and §10.2's "do not promote cuts 1 or 2"
is a *procedural* guard, so it should not also have to survive an ambiguous label.

Two supporting reasons, and one caveat:

- 🟢 **`runtimeVersion.policy: "appVersion"` makes the bump an isolation mechanism.** A 2.1.0 build's
  runtime is `2.1.0`; production users are on `2.0.0`. **Neither can receive the other's update**
  under `checkAutomatically: "ON_ERROR_RECOVERY"`. Staying at 2.0.0 would put the cut on the *same*
  runtime as live production — the opposite of what you want from an instrument.
- 🟢 **`P18` (rebrand assets) is a hard gate on 2.1.0.** Naming the version now keeps that gate
  attached to something visible rather than to a memory.
- ⚠️ **The caveat: `versionName` then cannot distinguish cut 1 from cut 2 from cut 3.** All three read
  `2.1.0`. **Use the EAS-assigned `versionCode` as the cut identifier** (it auto-increments; **never
  hand-edit it**) and record `versionCode → cut number` in `owner-actions.md` as you build. The app
  surfaces no version string anywhere in the UI (verified), so a tester's "I saw it on 2.1.0" is not
  attributable without that mapping.

**The bump is three files** (§10.3): `app.json` `version`, `mobile/package.json`, root
`package.json`. **Leave `versionCode` and `ios.buildNumber` alone.** Left to the owner — it is a
release-mechanics change, not part of this verification.

---

## 8. AFTER THE CAPTURES — the four things to write down

1. **Every "does not match intent" call**, with the surface and the token you think is wrong. That is
   the only output of this pass that no instrument can produce.
2. **`O-26`** (§4.2) — rule the 6 progress tracks: keep `border-subtle`, or adopt §2 row 14's
   `accent-muted`? Judged at H3, row 5, row 11.
3. **`P27`** — confirm or pull back O-24's **five extensions**. H4 and rows 5, 9 are the evidence.
4. **`P15` and `P11` outcomes** (§5) — both are pass/fail, both need this build, and both belong in
   `owner-actions.md`, not here.

🔴 **Then, and only then, the R1 commit** — owner ruling, 2026-07-31: **1b's review FIRST, R1 second.**
R1 changes what *renders* (it deletes the astrology PLUS badge and both Home PLUS pills, and reworks
five lock treatments), and the lock surfaces are exactly rows 4, 6 and 10 above. Running it first would
conflate behavioural with colour changes in one review.
