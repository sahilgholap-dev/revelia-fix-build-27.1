# UI Revamp Design — Revelia 2.1.0 · direction "1a Vellum"

**Branch**: `fix/build-27.1` · **Ships as**: 2.1.0 on this branch (owner decision — not `feature/build-28`)
**Transcribed**: 2026-07-29 · **Source**: the Claude Design canvas document
`Revelia 2.1 Revamp.dc.html` in design project `dbe1fc7e-1ff6-453b-9991-bee6247f95c4`
("Stage 1 design directions"), read over the `claude_design` MCP.

> **What this document is.** A faithful transcription of a completed design deliverable into the
> repo, written so the **codemod deep-plan can be authored from it alone**. It is not itself a plan
> and it contains no implementation steps beyond §8's pass order.
>
> **Its two companions, and the division of labour:**
> - `UI-audit.md` — the code baseline: what exists, what it costs to change, what must not change.
>   §5 (invariant register, incl. **X11–X19**), §6 (copy locks), §7 (technical ceiling) **override
>   this document** wherever they conflict. Conflicts found are listed in **Appendix A(b)**.
> - `preflight-findings.md` — the evidence file: the 31-site tier-gate table (§B), the invariant
>   archaeology (§C), the spacing-key arithmetic (§D), the font-registration paths (§E).

---

## 🔴 PRECEDENCE RULE — read this before using any number below

The design document is a **nine-turn conversation**, rendered newest-first. **Later turns retract
earlier ones**: turn **9 > 8 >** 7 > 6 > 5 > 4 > 3 > 2 > 1. Where two statements conflict, the later is
correct.

Everything transcribed below is the **surviving** version. **§13 lists every retracted decision**,
one line each, so no future session re-derives something already withdrawn. If you find a
value in the design canvas that contradicts this file, check §13 first — it is probably a turn-2 or
turn-3 statement that a later turn replaced.

**Turn map** (for anyone going back to the source):

| Turn | Content |
|---|---|
| 1 | Stage 1 — three directions: **1a Vellum**, 1b Bloom, 1c Ledger |
| 2 | Stage 2 — the token system (colour, type, spacing, radii, depth, motion, `theme.js`) |
| 3 | Stage 2 revision (blockers B1–B4, corrections C5–C7, watch items W1–W4) + Stage 3 component library |
| 4 | Stage 3 completion — 4 missing specimens, `Sheet` added as #15, stale names + CI rules corrected |
| 5 | Stage 4 screen 1 of 3 — **Home** |
| 6 | Home revisions + Stage 4 screen 2 of 3 — **Paywall** |
| 7 | Carry-overs closed + Stage 4 screen 3 of 3 — **Astrology hub** + the BirthChartWheel decision |
| **8** 🆕 | **Home at the ceiling** — option `8a`, the expressive maximum. Same tokens, same invariants, same copy; grain/aura rendered at 3× **for review only**. **Adopted as the Home spec — §10.1.0** |
| **9** 🆕 | **The distinctiveness layer** — the five levers as system rules: **plates, shape primitives, `accent-2` semantics, the display-scale rule, motion extensions**. All additive; tokens, X1–X20 and copy unchanged. **§14–§18** |

> ✅ **Turns 8 and 9 transcribed 2026-07-30.** Both sat at the **top** of the canvas (turns are
> prepended), so the 256 KiB read cap cut the file's **tail** — turn 1 and part of turn 2 — not these.
> **All five plate SVGs and both turn-8a reference paths were captured character-exact and verified
> closed**; nothing was reconstructed. §14–§18 hold turn 9; §10.1.0 holds turn 8a.

---

## ✅ TRANSCRIPTION GAP — closed for §6 and §7 (2026-07-29)

**The MCP connected and every turn from 7 down to 2 was read in full.** But `DesignSync.get_file`
truncates at **256 KiB** and `Revelia 2.1 Revamp.dc.html` exceeds it. What was cut is the file's
tail, and the tail contained two things:

1. **Turn 1** (the three Stage-1 directions). **Still not read — and it does not matter.** §13
   records that 1b and 1c were rejected, and 1a Vellum's palette, type and depth model are fully
   restated in turn 2's normative tables, which were read. Nothing downstream depends on it.
2. **The `<script data-dc-script data-props="…">` block**, holding the five fenced code blocks the
   canvas renders through template placeholders: `codeTheme` / `codeTailwind` (turn 2, superseded)
   and **`codeTheme2`, `codeTailwind2`, `codeCI`** (turn 3, authoritative).
   ✅ **CLOSED — the designer supplied all three verbatim on 2026-07-29.** They are reproduced
   **exactly as authored** in **§6.1** (`theme.js`, `tailwind.config.js`) and **§7.1** (the gate),
   together with the designer's own two trailing notes.

**What that changes, and what it does not:**

- **§6 is now the authored files**, in two parts: **§6.1 as authored** (verbatim, reference only)
  and **§6.2 as corrected** — 🟢 **§6.2 is the version to build.**
- **§7 is complete.** The gate's rules 2 and 4, previously unrecoverable, are in `codeCI`. The rules
  are now referred to by **name**, never number — the numbering churned across design turns (turn 7
  attributes the `fontWeight` ban to "rule 3", which was the radius rule in turn 2).
- ⚠️ **The corrections are not editorial.** Each was tested against `mobile/`'s installed
  **Tailwind 3.4.19 / NativeWind 4.2.4** before being applied, in a throwaway directory; the outputs
  are in **§6.4 EVIDENCE**. Two of them (**C-a**, **C-b**) fix defects that would otherwise have
  shipped a visibly broken app with no build-time signal.
- 🔴 **One finding is NOT yet reflected elsewhere in this file.** §6.4's **V2** refutes the premise
  that §4.1's "key `6` = 24dp" and §8's pixel-identical gates for passes 2 and 3 rest on. Read V2
  before planning either. §4.1 and §8 are unchanged in this pass and still state the old premise.

---

## 1. DIRECTION — 1a Vellum

Vellum is a **warm near-black** system. The canvas is `#100E0D` — not the current cool violet-black
`#0F0A1A` — and the whole neutral ramp is warmed with it, so surfaces read as ink on aged paper
rather than as a dark UI. There is **one accent**: a clay orange, `#D98E57`, which means *action* and
nothing else; where the current app scatters gold, purple, pink and magenta across the same screen,
Vellum spends its single saturated colour only on the thing you are meant to touch. A muted **iris**
secondary, `#B3A6D9`, carries the app's one editorial voice — quotes, affirmations, Deep Insight —
and never competes for the same job. Type is split: a **serif for display** (Literata) and a
**humanist sans for text** (Figtree), which is what makes the reading surfaces read as written
rather than as rendered. Depth comes from **lightness plus hairlines** — four stepped surface
values and a 7%-white 1px rule — and **there is zero elevation**: no shadows, no `textShadow`, one
documented `elevation` exception (§4.5). The rhythm is editorial: fewer boxes, longer measure,
divider lists in place of card grids, and generous vertical breaks instead of borders everywhere.
A single **grain** texture at 5% opacity sits over the canvas — decorative, but also functional: it
dithers the 8-bit banding a large radial gradient shows on cheap OLED panels.

Directions **1b Bloom** and **1c Ledger** were considered in turn 1 and **rejected**; nothing from
them is transcribed.

---

## 2. COLOUR

Single-valued. **There is no light theme, ever** (owner decision — §12). Contrast ratios are as
stated in the design document; the four surface columns are `bg` / `surface` / `surface-raised` /
`surface-overlay`.

| # | token | value | on `bg` | on `surface` | on `raised` | on `overlay` | role · and what it replaces |
|---|---|---|---|---|---|---|---|
| 1 | `bg` | `#100E0D` | — | — | — | — | app canvas · all 4 layout `contentStyle`s · replaces `#0F0A1A` |
| 2 | `surface` | `#171412` | — | — | — | — | `Card` · tab bar · replaces `#1A1425` |
| 3 | `surface-raised` | `#1E1A17` | — | — | — | — | `SectionCard` · chat bubble · replaces `rgba(255,255,255,0.05–0.08)` overlays |
| 4 | `surface-overlay` | `#26211D` | — | — | — | — | bottom sheet · modal · `Input` fill · replaces `rgba(255,255,255,0.10)` |
| 5 | `locked` | `#2A2521` | — | — | — | — | lock-plate fill — **a neutral, never a colour event** |
| 6 | **`fg`** | `#F4EFE9` | **16.84** | **16.04** | **15.12** | **13.94** | headings · values · bubble copy · replaces `#FFFFFF` ×39 |
| 7 | **`fg-secondary`** | `#C6BDB2` | **10.38** | **9.89** | **9.32** | **8.59** | body + reading copy · replaces `#D1D5DB` ×28 |
| 8 | **`fg-muted`** | `#8E867C` | **5.36** | **5.11** | **4.81** | **4.43** | labels · meta · disclaimer · locked-row subtitle · replaces `#9CA3AF` ×80 |
| 9 | `fg-placeholder` | `#6B645C` | 3.30 | 3.14 | 2.96 | 2.73 | 🔴 **sub-AA by design.** `Input` placeholder **only**; the label is a required prop, so a placeholder can never be the sole label |
| 10 | `fg-disabled` | `#F4EFE9` @ **38%** | — | — | — | — | disabled `Button` label — paired with `opacity: 1`, **not** the old container-`opacity: 0.5` hack |
| 11 | `border-subtle` | `#F4EFE9` @ **7%** | — | — | — | — | default hairline · dividers · replaces `border-gray-800` ×60 |
| 12 | `border-strong` | `#F4EFE9` @ **16%** | — | — | — | — | outline `Button` · unfilled interactive block · chip · 🔴 ~~focused `Input`~~ **STALE — DELETED 2026-08-04, see §2.3.1** |
| **12a** | 🆕 **`border-control`** | `#7A7268` | **4.07** | **3.87** | **3.65** | **3.37** | 🔴 **the CONTROL BOUNDARY — resting.** `Input` · checkboxes · radios · selectable cards · toggle chips · every field-shaped control. **Added 2026-08-04, §2.3** |
| 13 | **`accent`** | `#D98E57` | **7.30** | **6.95** | **6.55** | **6.04** | primary action · score fill · active tab · replaces `#6B21A8` + `#F59E0B` + `primary-dark` |
| 14 | `accent-muted` | `#D98E57` @ **14%** | — | — | — | — | accent wash · chip fill · **aura stop 1** · progress-track fill |
| 15 | **`accent-2`** | `#B3A6D9` | **8.59** | **8.18** | **7.71** | **7.11** | Deep Insight · quotes · secondary aura · replaces `#C084FC` ×17 · `#A78BFA` |
| 16 | `accent-2-muted` | `#B3A6D9` @ **12%** | — | — | — | — | Deep Insight wash · quote-card ground |
| 17 | **`on-accent`** | `#1A1512` | see the A5 row below — **one legal foreground for all filled fills** | | | | label on any filled accent or status fill |
| 18 | `success` | `#86A97B` | **7.31** | **6.96** | **6.56** | **6.05** | ready · verified · replaces `#10B981` |
| 19 | `warning` | `#D9A657` | **8.75** | **8.33** | **7.85** | **7.24** | expiring · cap reached · replaces `#F59E0B` (non-action uses) |
| 20 | `danger` | `#C8695E` | **5.17** | **4.92** | **4.64** | 🔴 **4.28** | failed · destructive · replaces `#EF4444` · `#DC2626` |
| — | `aura` | `accent-muted` → transparent | radial via `react-native-svg` `RadialGradient`, `closest-side` | | | | **the only gradient idiom left.** Replaces all 21 `LinearGradient` slabs **except** X3's `Button` fill |
| — | `chart.harmonious` | `#7FA88F` | **6.44** | — | — | — | namespaced; `BirthChartWheel` only — §11 |
| — | `chart.tense` | `#C08A7E` | **7.02** | — | — | — | namespaced; `BirthChartWheel` only — §11 |

> **Count note (flagged, not resolved).** Turn 2's own heading reads *"18 roles, 13 literal
> values."* The table it heads lists **20 colour roles + the `aura` idiom**, of which **15 are
> literal hex** (`#100E0D #171412 #1E1A17 #26211D #2A2521 #F4EFE9 #C6BDB2 #8E867C #6B645C #D98E57
> #B3A6D9 #1A1512 #86A97B #D9A657 #C8695E`) and **5 are alpha derivations** of literals already in
> the set. Turn 7 then adds two more literals (`chart.*`), giving **17**. The heading's "18/13" is
> not reproducible from the table; **the table is normative.** Do not let a codemod plan inherit
> "13 hex values" as a completeness target.

### 2.1 🔴 The `danger`-on-`surface-overlay` prohibition — unconditional

`danger` on `surface-overlay` is **4.28:1**, below AA. Therefore:

> **`danger` is prohibited as text on `surface-overlay` at any size and any weight.**

The earlier "except at 15px+/600, which qualifies as WCAG large text" carve-out was **deleted** in
turn 3 (C5): WCAG large is 24px regular / 18.66px bold, and 600 is not reliably bold. **This is the
only surface-role prohibition in the system.**

**Resolution — how destructive UI is built instead.** `Sheet` (§9 #15) is the only component whose
ground is `surface-overlay`, so this rule lands there and only there:
- title and body in `fg` / `fg-secondary` — **no red copy anywhere**;
- the destructive action is a **`danger`-filled `Button` with an `on-accent` label at 5.60:1**;
- the cancel action is `ghost`, placed **below** the destructive one so the thumb-nearest position
  is the reversible choice.

The same pattern appears twice more: `Input`'s error state uses `danger` as a **1px border**, with
the message text on `bg` at 5.17:1 (which is why the prohibition doesn't bite); and the paywall's
purchase-failed strip is a `danger` 1px border on `surface` with the message in `fg`.

> 🔴 **R-4 (owner ruling, 2026-08-01) — `DeleteAccountModal`'s two destructive buttons ARE THIS SPEC,
> and they are pinned to it PERMANENTLY rather than re-derived per session.** That button has been a
> contrast defect **twice**: **4.83:1** on `main` (`red-600` + white, passing AA by accident),
> **3.76:1** after 1b's C7 remapped it mechanically to `danger` + `fg`, and **3.26:1** after the
> pass-5 flip — a *quieter* failure each time, never a smaller one. Both occurrences came from
> deriving the colours at the site instead of reading the line above it. **The pairing is not a
> judgement call: `danger` fill + `on-accent` label, 5.60:1.** The disabled state is a separate
> question with a separate answer (`fg-disabled` on `surface-raised`, §2 row 10) and does not license
> reopening the armed one. 🔴 **`no-white-on-accent` cannot see this site and never will** — the fill
> is an interpolated ternary in a template `className` and the label is a different element — so
> **this paragraph and the in-file comment are the entire control**, exactly as §3.0.2.1 says of the
> rule generally. When §9 #15's `Sheet` and the `Button` primitive absorb the two hand-rolled
> buttons, the spec **moves to the primitive**; it is not satisfied by the move.

### 2.2 🔴 A5 — the on-accent floor (a token-table constraint, not a hotfix)

> **`on-accent` is the ONLY legal foreground on an `accent`, `warning`, `success` or `danger`
> fill.** One legal foreground for all four fills, so there is no per-fill judgement and it cannot
> drift back.

| fill | legal fg | ratio |
|---|---|---|
| `accent` `#D98E57` | `on-accent` `#1A1512` | **6.86** |
| `accent-2` `#B3A6D9` | `on-accent` | **8.08** |
| `warning` `#D9A657` | `on-accent` | **8.20** |
| `success` `#86A97B` | `on-accent` | **6.90** |
| `danger` `#C8695E` | `on-accent` | 🔴 **4.86**, ~~5.60~~ — see the correction below |
| 🔴 `#F59E0B` (**today**) | `#FFFFFF` | **2.15 — PROHIBITED** |

**A5 is not a hotfix.** It was proposed as one and re-scoped in turn 7: it is a **row in the token
table plus CI rule 6**, which means it is satisfied structurally by the codemod rather than by a
one-off patch. The accessible pairing already exists in the repo eight lines away from a violation
(`(paywall)/index.tsx:177` uses `text-black` on `bg-gold`), so this is a consistency fix, not a new
idea. It fires at two known live sites: the paywall CTA (`text-white` on `bg-gold`) and the
astrology-hub generate CTA (`text-white` on `#F59E0B`/`#92722D`, twice).

> ### 🔴 CORRECTED 2026-08-04 — THE DANGER ROW WAS WRONG BY 0.74, AND THE NOTE BELOW DISCOURAGED THE CHECK THAT FOUND IT
>
> **Measured: `on-accent` on `danger` is 4.86:1, not 5.60:1.** The calculator was calibrated against
> **eleven** figures published in §2 and §2.1 first and reproduces every one of them exactly — the whole
> `16.84 / 10.38 / 5.36 / 3.30 / 7.30 / 8.59 / 7.31 / 8.75 / 5.17` column, plus muted-on-overlay 4.43
> and danger-on-overlay 4.28. On that calculator the other four A5 rows are exact or rounding
> (`accent` 6.86 exact · `accent-2` 8.08 exact · `warning` 8.23 vs 8.20 · `success` 6.88 vs 6.90).
> **Only danger is outside rounding.**
>
> 🟢 **THE CONCLUSION HOLDS: 4.86 clears AA, so §2.1's resolution is correct and nothing needs
> re-deciding.** ⚠️ **What was wrong is the MARGIN — 0.36, not 1.10.** It is by far the tightest of the
> five pairings (the next is 6.86) while this table made it read as the most comfortable, on a control
> whose history is three ever-quieter near-misses (4.83 → 3.76 → 3.26). 🟢 It is now pinned
> **mechanically** rather than by prose: both halves of both ternaries at that site are gate
> assertions, and X20's two identical heights are asserted as a COUNT.
>
> 🔴 **THE SENTENCE THAT USED TO CLOSE THIS NOTE IS DELETED, NOT REWORDED**: *"all five clear AA
> comfortably either way; the discrepancy matters only if someone re-derives the ratios and thinks they
> have found a bug."* **Re-deriving the ratios is exactly what found the bug**, and a document that
> tells a reader not to check is worse than one that is merely wrong. **Re-derive them.**
>
> ⚠️ **The original discrepancy note, kept because the precedence ruling in it still stands.** Turn 2's
> `on-accent` row reads *"6.86 accent · 8.08 accent-2 · 6.87 success · 8.32 warning · 5.60 danger"*;
> turn 7's A5 table — introduced as *"now a token-table floor, **with your corrected number**"* — reads
> **8.20 warning** and **6.90 success**. Per the precedence rule, **turn 7 wins**, and those are the
> figures in the table above. `accent-2`'s 8.08 exists only in turn 2 and is carried forward unchanged.

### 2.3 🆕 `border-control` — 🔴 THE ROW THAT CLOSES A WCAG **1.4.11** GAP THIS TABLE NEVER COVERED

> **Added 2026-08-04 (`O-83` / `O-87`, owner-registered as `P61` / `P62`). It is a new NAMED ROW,
> not a per-site patch and not a value someone preferred.**
>
> 🔴 **NOBODY MAY LATER DELETE IT AS "REDUNDANT WITH `border-strong`". That is the exact reasoning
> that produced the gap**, and the numbers are the whole argument.

**WCAG 1.4.11 requires 3:1 for the visual information that identifies a UI component's BOUNDARY or
its STATES.** Measured against every ground in §2:

| | `bg` | `surface` | `raised` | `overlay` | `locked` |
|---|---|---|---|---|---|
| `border-subtle` (row 11) | 1.16 | 1.17 | 1.20 | 1.20 | 1.21 |
| `border-strong` (row 12) | 1.51 | 1.55 | 1.58 | 1.61 | 1.60 |
| 🟢 **`border-control`** | **4.07** | **3.87** | **3.65** | **3.37** | **3.20** |

**So neither existing neutral edge could legally delimit a control, and a FILL could not carry it
instead** — the four surface steps are ~1.08 apart, so a field a step lighter than its card is not a
field, it is a slightly different rectangle. **There was no legal spelling of "this is a control" in
the palette at all.** The visible consequence was signup's **unchecked consent box rendering as
blank space** — a legal-consent control gating account creation, on the screen every paid install
reaches, and the third time that one checkbox had surfaced as a defect.

**Derived against the WORST ground a control can reach, not against `surface`.** A value tuned to
exactly 3:1 on `surface` measures 2.73 on `surface-overlay`, which is `Input`'s own fill (row 4) —
i.e. it would have failed on the single most common control in the app. That is `O-66` applied as a
*derivation rule* rather than a reporting one.

**🔴 THE SCOPE IS A DISTINCTION, AND IT IS THE POINT OF A THIRD NEUTRAL:**

| | | keeps |
|---|---|---|
| ✅ **CONTROL boundary** | delimits something interactive, **or carries its state** | **`border-control`** |
| 🔴 **STRUCTURAL border** | separates content — card edges, list-row rules, section dividers, progress tracks, decorative frames | rows 11 / 12, where being quiet **is** the job |

⚠️ **An outline `Button` is deliberately NOT in scope**, and that is what keeps row 12's documented
role from being emptied out: its **label** at ≥4.5:1 identifies it, so its edge is not the
identifying information 1.4.11 is about. The same reading exempts labelled ghost/secondary buttons
and static chips. **A checkbox, a radio and an empty text field have no label of their own — the
boundary *is* the control.**

> **This is the selection-border ruling one level over.** That ruling fixed **SELECTED** states (a
> signalling edge is an accent role); this fixes **RESTING** boundaries. A correct application of
> that ruling still left four controls the user could not see, because it only ever governed one
> half of the pair.

🔴 **AND THE PAIR IS WHY THE FIELD PRIMITIVE ALSO GAINED A WIDTH STEP. Raising ONE end of a state
pair is a change to the PAIR** (`O-88`). Measured across all sixteen boundaries this role landed on,
the resting→signalling separation **rose at four and fell at five**:

```
  Input   focus    5.01 -> 1.79     <- the only unmitigated fall: nothing else moves with the edge
  Input   error    3.55 -> 1.27         (the error message text appears, so the state survives)
  qa composer      4.48 -> 1.79         the state IS "has content" — the content is the cue
  verify OTP       5.46 -> 1.79         the fill also goes to an accent wash, and a digit appears
  compat chip      4.14 -> 1.79         width already steps 1 -> 2 AND the fill changes
  paywall / birth-data / signup   1.36 -> 1.79   ROSE
  qa Deep-Insight toggle          1.04 -> 2.92   ROSE
```

**`Input`'s focus edge therefore steps 1px → 2px.** A doubled stroke is a non-colour state cue that
1.4.11 credits, and it is the mechanism two other selectable controls in this app already use — so
it is the repo's own precedent, not a new idea. **Both halves are asserted as one literal in
`primitive-adoption-check.js`; dropping either re-opens the state defect while every ratio in the
file still reads legal on its own.**

**Enforcement — it is a gate, not this paragraph.** Two censuses in
`mobile/scripts/primitive-adoption-check.js`, and they are the same assertion from both ends:
`border-control` **exact 16**, and `fg-*` **as a border exact 0** — the role-DIMENSION error
(`O-39`) that five sites had committed by reaching for the meta foreground as the nearest
contrast-legal value. Nine defect-injection cases, both directions, 9 correct.

⚠️ **Two things `border-control` is NOT:** an `rgba()` derivation of `fg` like its two neighbours
(an alpha edge's contrast is a property of whatever it composites over, so the 3:1 claim would be
unmeasurable over a plate, a wash or a camera feed), and a value that may pass through `alpha()`
(nothing throws — it carries no alpha of its own — but any reduction drops it under the floor that
is the entire content of the role).

### 2.3.1 🔴 A STATE INDICATOR MUST NEVER BE LESS PROMINENT THAN THE RESTING STATE IT REPLACES

> **`O-93`, 2026-08-04. §2.3's own fix created this at one site, so it is recorded as a CLASS and
> asserted, not patched.** Raising sixteen resting edges to the 1.4.11 floor without touching the
> signalling colours they pair with is a change to thirteen STATE PAIRS.

**Measured PROMINENCE — each state against its OWN ground, not the distance between them:**

```
  site                        ground    resting  signalling
  Input · focus               overlay     3.37       6.04    🟢 +2.67
  Input · error               overlay     3.37       4.28    🟢 +0.91
  signup consent box          bg          4.07       7.30    🟢 +3.23
  birth-data radios (2)       bg          4.07       7.30    🟢 +3.23
  paywall cards (2)           surface     3.87       6.95    🟢 +3.08
  verify OTP · filled         raised      3.65       6.55    🟢 +2.90
  verify OTP · error          raised      3.65       4.64    🟢 +0.99
  qa composer · filled        surface     3.87       6.95    🟢 +3.08
  compat chips (2)            raised      3.65       6.55    🟢 +2.90
  🔴 qa Deep-Insight · ON     raised      3.65       1.25    INVERTED — 2.92x LESS prominent
```

**Twelve gained; ONE inverted.** The Deep-Insight toggle's ON edge was an accent **wash** used as a
stroke, so switching the control on made its outline *fainter*. **Fixed to the plain accent** —
which the selection ruling already required: *an edge that signals selection, focus or active state
is an accent role.* The wash stays as the **fill**; it was only ever wrong as the **stroke**.

> 🔴 **SEPARATION AND ORDERING ARE INDEPENDENT DIAGNOSTICS, AND THIS SITE IS THE PROOF.** Its
> separation **ROSE** at §2.3's item (1.04 → 2.92) while its ordering **inverted**. A check on the
> distance between two states measures the same number either way round, so it cannot see an
> inversion at all — the four sites whose separation *fell* were all fine, and the one a separation
> check would have called healthiest was the broken one. **Compare prominence, never distance.**

**🔴 AND THIS IS WHY ROW 12's "focused `Input`" IS DELETED RATHER THAN LEFT AS A DISCREPANCY.**
Row 12 predates the project's own ruling that a border indicating selection, focus or active state
is an **accent** role. `Input.tsx` diverged from it deliberately and registered the divergence; the
row stayed. **Measured on that component's own fill, applying row 12 as written would now be an
INVERSION rather than merely a weak signal:**

```
  border-strong  on overlay   1.61     <- what row 12 assigns to a focused field
  border-control on overlay   3.37     <- the RESTING edge since §2.3
  accent         on overlay   6.04     <- what Input actually renders
  🔴 row 12's value is 2.09x LESS PROMINENT THAN RESTING.
```

So a correct reading of the shipped design document now produces a defect. **`border-strong` keeps
its three structural jobs — outline `Button`, unfilled interactive block, chip — and loses the one
STATE job it was ever given.** The `Input` contract already asserts `border-border-strong` absent
from that module as a permanent invariant; this row is what generated the pressure that assertion
exists to resist, and the pressure is now removed at the source.

**Enforcement.** A census in `primitive-adoption-check.js` at **exact 0**: the signalling half of a
border **state ternary** must be a full accent-family token, never a wash and never an `alpha()`
reduction. ⚠️ **What it is not:** full prominence needs each edge's ground, i.e. the style graph
(the A5 pair rule's machinery), which is a separate job. The syntactic form catches the class's
actual mechanism and needs no ground, because **a wash cannot clear 3:1 as a stroke on any ground
in this palette.** 🟢 The **ternary** is what keeps it from over-finding: eight static decorative
wash borders exist and are legitimate; none is a state pair.

### 2.3.2 ✅ THE TOGGLE — RESOLVED 2026-08-04, and the gap was not the one expected

The app has **one** toggle (`profile.tsx`, the notifications master switch). §2.3 refused to put
`border-control` on it — correctly, because it has **no boundary**: its states are **track fills**,
and a border role on a fill is the exact mirror of the `O-39` error §2.3 closed. **That refusal is
confirmed and it needs nothing further.** What it left open was whether the states are
distinguishable at all, and the answer is measured, not argued:

```
  OFF track (the subtle wash composited over this Card)   1.17  vs the card
  ON  track (the accent role)                            6.95  vs the card
  🟢 OFF track vs ON track                               5.92   <- 1.4.11 wants 3.00
```

🟢 **THE STATE CLEARS 1.4.11 BY COLOUR ALONE**, and the feared *"if the off-state track is a surface
step those are 1.08 apart"* **does not apply to this control**: the off track is a 7% foreground
**wash** and the on track is the **accent role** — not two neighbouring surface steps. There was no
gap of that shape to register.

🟢 **AND THERE IS A NON-COLOUR CUE ON TOP OF IT: the thumb's POSITION**, which clears 3:1 against
the card ground (**16.04**) and against the off track (**13.66**), so the position is readable
independently of hue. **That is also the answer to the off track's own 1.17:1 — it is not a
violation.** 1.4.11 governs the visual information *required* to identify a component and its state;
this control is identified by its **thumb** and its state by **position plus a 5.92 track change**.
The groove carries neither, so it is decoration, and there is nothing there to fix.

> 🔴 **BUT MEASURING IT FOUND A DIFFERENT GAP, AND IT IS THE A5 RATIO EXACTLY.** The thumb was the
> plain foreground on the ON track — a near-white shape on an **accent fill at 2.31:1**, the same
> 2.31 that made A5 a token-table rule rather than a hotfix. So with the switch **ON** the thumb was
> barely separable from its own track, and the position cue the paragraph above relies on was
> degrading **in the one state that matters most**.
>
> 🟢 **Fixed the way A5 already rules for anything on an accent fill: the on-fill role, 6.86:1.** The
> thumb is state-dependent now, which is the only way to keep both ends legal — **13.66 off, 6.86
> on.** ⚠️ Neither `no-white-on-accent` nor the A5 pair rule can see this: the "foreground" is a
> `thumbColor` **prop**, not a text node, so there is no label to pair with a fill. **Reading the
> file is what found it.**

**One 1.4.11 gap stays OPEN and is registered rather than half-fixed:** the three **account modals'
fields have no border at all** (`bg-bg` on a `surface` card = 1.08:1), which is a boundary to
*create*, not one to recolour, at three sites that are already `ADOPTION-EXEMPT(Input)` with named
debtors.

---

## 3. TYPOGRAPHY

### 3.1 The five faces

**Static instances only.** RN resolves a family name to a static face; `fontVariationSettings` has
no RN style equivalent and Android's variable-font support below API 26 is absent. Literata's
variable optical-size axis was withdrawn in turn 2 (§13).

| file | licence |
|---|---|
| `Literata-Bold.ttf` | SIL OFL 1.1 |
| `Literata-Italic.ttf` | SIL OFL 1.1 |
| `Figtree-Regular.ttf` | SIL OFL 1.1 |
| `Figtree-SemiBold.ttf` | SIL OFL 1.1 |
| `Figtree-Bold.ttf` | SIL OFL 1.1 |

**Literata 600 is not shipped** — the ramp never asks for it. **~420 KB** subset to Latin +
Latin-Ext. Both faces being SIL OFL clears `UI-audit.md` §7.4's redistribution constraint (the one
that blocked Georgia server-side) and means the R9 PDF pipeline *could* adopt the identical pair —
though it will still render in DejaVu Serif until `server/Dockerfile`'s fontconfig is updated
(§9 Q5 of the audit; server work, outside this branch).

Loaded via **runtime `useFonts`**, keyed exactly as `theme.family` names them — **not** the
`expo-font` config plugin (owner decision; see `preflight-findings.md` §E2–§E3 for why the plugin is
asymmetric and the runtime path is not). `expo-font` is currently a transitive dependency only and
must be promoted with `npx expo install expo-font`.

> ## 🟢 INSTALLED 2026-07-31 (codemod pass 4 · E1). Three corrections to the table above.
>
> 1. ⚠️ **"~420 KB" is now 455 KB** (465,692 bytes), measured after subsetting to Latin + Latin-Ext
>    plus every non-ASCII codepoint the source actually renders. Quote 455 KB from here on.
> 2. 🔴 **GOOGLE FONTS DOES NOT SHIP THESE AS STATIC INSTANCES.** `google/fonts` `ofl/literata` and
>    `ofl/figtree` hold **variable fonts only**. The statics come from the upstream repos
>    (`googlefonts/literata`, `erikdkennedy/figtree`). This matters because §3.1's first line —
>    "static instances only" — is unsatisfiable from the obvious source, and a variable Literata
>    renders at its default instance, which is **Regular, not Bold**: the exact silent-wrong-face
>    failure the registration decision exists to prevent. Provenance and the reproducible subset
>    command are in `mobile/assets/fonts/README.md`.
> 3. ⚠️ **The five faces are Latin. What that means for the primary market, measured:** a Devanagari,
>    Tamil, Telugu or Bengali name or birthplace resolves through the platform's per-script fallback
>    (Noto on Android, the system script font on iOS) — the script renders correctly, but **at
>    regular weight**, because after this pass emphasis is expressed as a *family* the fallback face
>    cannot honour. Under Roboto it inherited the requested weight. Exposure is narrow and
>    enumerable: `birth-data.tsx`'s own validator already restricts the profile name to Latin +
>    Latin-Ext, so the reachable surfaces are the ~10 display sites fed from signup / UpdateName /
>    the compatibility partner fields. Registered in `build-27-caveats.md`; **not** worth exempting
>    user-content Text nodes from the family, which would trade one visible inconsistency for a
>    larger one.

### 3.2 The five family keys

`fontWeight` is a **banned property** (CI rule 3). On a static face it is either a no-op or a
platform fake-bold, so **every ramp step names a family instead**:

| key | face |
|---|---|
| `font-display` | Literata-Bold |
| `font-quote` | Literata-Italic |
| `font-body` | Figtree-Regular |
| `font-body-semi` | Figtree-SemiBold |
| `font-body-bold` | Figtree-Bold |

Colour roles are `fg-*`, size steps are `text-*`, families are `font-*` — three namespaces that no
longer collide. A utility reads `className="text-sm font-body text-fg-secondary"`.

> ## 🔴 AND ON A SERIF STEP THE FAMILY UTILITY IS MANDATORY, NOT OPTIONAL — `O-35`, found at pass 5
>
> **A Tailwind size utility cannot carry a family** (`O-31`: the `fontSize` plugin honours only
> `lineHeight`, `letterSpacing` and `fontWeight`). So on the className path **the family utility
> written at the site IS the rendered face** — there is nothing else to supply it. `text-display-lg`
> alone gives Figtree-Regular via the global default; `text-display-lg font-body-bold` gives
> **Figtree Bold**, and the Literata the step contracts never arrives.
>
> 🔴 **Measured on the eve of the flip: `font-display` had ZERO CALL SITES IN THE WHOLE APP, and 23
> of the 25 `text-display-lg` classNames carried `font-body-bold`.** Every `display-lg` heading in
> the app — §17's "one hero per screen" moment — was rendering in Figtree. Fixed in pass 5 and now
> gated by `family-arrival-check.js`'s className half.
>
> ⚠️ **RULE R's serif branch is therefore ASYMMETRIC between the two authoring paths, and both
> directions are right:** an inline site DELETES the family (its `txt()` spread already carries the
> step's face, so an explicit one is redundant), and a className site REPLACES it with
> `font-display` / `font-quote` (deleting it drops the site onto the global body default, which is
> the same defect one step quieter). `codemod-plan.md` §3.6's *"the className half is simpler — a
> pure 1:1 weight→family map with no judgement at all"* is the inversion that caused this.
>
> 🟢 **A display step with NO family utility at all is legal and deliberate** — the two such sites
> hold **emoji**, where the step is a dimension not a type (pass 2a's GLYPH argument) and the face is
> the emoji font either way. The gate flags a *wrong* family, never a *missing* one.

### 3.3 The 12-step ramp

> ## 🔴 DESIGN-DOC REVISION — THE THREE DISPLAY LINE-HEIGHTS ARE 38 / 31 / 26 (pass 5, 2026-07-31)
>
> **Superseded: ~~34 / 29 / 25~~. Closes `O-34`.** This is a revision to the published table, not a
> codemod deviation from it — `theme.type` and this row are one contract, and both now read 38/31/26.
> 🔴 **Do not "restore" the tighter numbers from an earlier copy of this document.**
>
> **The measurement, from Literata's shipped `glyf` ink extents** — not from the per-em declaration,
> which is the number that made this look worse than it is. Capitals reach **+0.715 em**, lowercase
> **+0.782**, deepest descenders **−0.230**, and 🔴 **accented capitals reach +0.970**. On a two-line
> heading the clearance between line 1's lowest ink and line 2's tallest ink is
> `lineHeight − size × (ink + 0.230)`:
>
> | step | size | OLD lH | typical caps | accented caps | **NEW lH** | accented caps |
> |---|---|---|---|---|---|---|
> | `display-lg` | 30 | 34 | **+5.65** 🟢 | 🔴 **−2.00 COLLIDES** | **38** | **+2.00** 🟢 |
> | `display-md` | 24 | 29 | **+6.32** 🟢 | 🟠 **+0.20 TIGHT** | **31** | **+2.20** 🟢 |
> | `display-sm` | 20 | 25 | **+6.10** 🟢 | 🟠 **+1.00 TIGHT** | **26** | **+2.00** 🟢 |
>
> 🔴 **THE COLLISION WAS MEASURED, AND IT WAS IN THE PRIMARY MARKET.** Ordinary English display copy
> was always clear; the failure needs line 2 to begin with an accented capital while line 1 ends in a
> descender. **12 of the 35 display sites carry UNBOUNDED content** — LLM-generated themes, user
> names, rules-table archetype and palm names — so they *will* wrap, and accents arrive exactly
> there. That is the same surface as `C-P4-2`: two caveats, one exposure, seen from two directions.
>
> **It is the RAMP, not the 20 wrap-capable sites.** Scoping the loosening per-site is precisely the
> drift the token system exists to remove: one step, one line-height. Ratios go **1.13 → 1.27** on
> `display-lg` — still tight editorial leading, and still **below Literata's natural 1.485 line
> box**, so the leading stays *negative*. That was never the problem and still is not: both
> platforms let glyphs draw outside the box. **34 was tighter than the face's own accent extent**,
> and that is a different thing.
>
> 🟢 **Layout: 0 OVERFLOW, 0 TIGHT.** Re-checked at pass 5 against every fixed-height container in
> `app`+`components`: **not one holds a display step.** Every display site sits in a free-growing
> block, a `minHeight` floor already exceeded by its content, or a flex header. And the box height
> was never face-dependent — 2b baked an explicit `lineHeight` into all twelve steps.

| step | family (→ key) | size | line-height | tracking | scales? | screen roles |
|---|---|---|---|---|---|---|
| `display-lg` | Literata 700 → `font-display` | 30 | **38** | −0.6 | **no** | archetype title · paywall hero · report title |
| `display-md` | Literata 700 → `font-display` | 24 | **31** | −0.4 | **no** | screen H1 (Your Readings, Home greeting) · sheet title |
| `display-sm` | Literata 700 → `font-display` | 20 | **26** | −0.3 | **no** | hero card title · ShareCard headline · EmptyState title |
| `quote` | Literata 400 *italic* → `font-quote` | 17 | 26 | 0 | **yes** | ShareableQuote · AffirmationCard · `whyThisFitsYou` · Deep Insight lede |
| `text-2xl` | Figtree 700 → `font-body-bold` | 24 | 28 | −0.4 | **no** | **numerals only** — life-path number, compatibility %, credit count |
| `text-xl` | Figtree 700 → `font-body-bold` | 20 | 26 | −0.2 | **no** | score value · section H2 where display would over-weight |
| `text-lg` | Figtree 600 → `font-body-semi` | 18 | 24 | 0 | **yes** | SectionCard title · list-row title (large) |
| `text-base` | Figtree 600 → `font-body-semi` | 16 | 22 | 0 | **yes** | Card title · Button label (md/lg) · row title · Input value |
| **`text-sm`** ⚠ | Figtree 400 / 600 → `font-body` / `font-body-semi` | **15** | 22 | 0 | **yes** | **default body.** reading copy · chat bubble · row subtitle · Button label (sm) |
| **`text-xs`** ⚠ | Figtree 400 → `font-body` | **13** | 19 | 0 | **yes** | disclaimer body · meta · helper · chat timestamp |
| `text-2xs` | Figtree 600 → `font-body-semi` | 12 | 16 | +0.2 | **no** | label · tab label · counter · lock-plate label |
| `overline` | Figtree 700 → `font-body-bold` | 11 | 14 | +1.3 (0.12em) | **no** | eyebrow, **UPPERCASE only** · "FACE READING" · section kicker |

**The ramp is integers only, forever.** The config exposes no fractional value, so a new one cannot
be typed without failing review.

> **Two count corrections.** Turn 2's heading says *"closed 10-step ramp"* — the table it heads has
> **12 steps**, and turn 3's codemod pass 2 independently says *"29 sizes → **12** ramp steps."*
> Twelve is correct. Likewise turn 2's prose says *"the five yes-steps … the six no-steps"*; the
> `scales?` column is **5 yes** (`quote`, `text-lg`, `text-base`, `text-sm`, `text-xs`) and
> **7 no**. (Turn 2's section headings undercount their own tables in three places — colour,
> type and spacing. **Trust the tables.**)

### 3.3a 🔴 ROLE-MISFIT — the ramp's one structural gap, and it is a DESIGN limitation

> **Recorded here, in the design, on owner ruling (2026-07-31). It was found by codemod pass 2a and
> first written down in `codemod-plan.md`, but it is not a codemod finding — it is a property of
> the table above, so it belongs where the table is.**

**Two of the twelve steps carry a STYLE COMMITMENT as well as a size:**

- **`overline` 11 is UPPERCASE-only** — the `screen roles` column says so, and its +1.3 (0.12em)
  tracking is only legible on caps.
- **`quote` 17 is Literata-*Italic*** — the family is the step.

**Consequence: a site can sit at exactly the right SIZE and still have no legal target.** Measured
on the live tree at pass 2a: **13 sites**, in two clusters —

| at | size-exact step | why it is forbidden | sites | resolved to (pass 2b) |
|---|---|---|---|---|
| **11px** | `overline` | the copy is **Title Case**, not caps | **9** | `text-2xs` **12** (+1) |
| **17px** | `quote` | the copy is **bold**, not italic | **4** | `text-lg` **18** (+1), except one **button label** → `text-base` 16 (−1) |

🔴 **This is a gap in a 12-step ramp, not a mapping failure.** Between `text-2xs` 12 and
`text-base` 16 the only steps are `text-xs` 13 and `quote` 17 — and `quote` is spoken for. So an
11px Title-case label and a 17px bold title are both **unrepresentable at their current size**, and
every such site is forced into a ±1px value move.

**The design already ruled one instance of this before the class was named**, which is why the
resolution is a precedent rather than an invention: §6.6.2's tab-bar row says *"label 11 →
**`text-2xs` 12/16**, **not** `overline` — `overline` is UPPERCASE-only (§3.3) and the labels are
Title Case."* Pass 2b applied that same reasoning to the other twelve.

**The general rule it settles:** ⚠️ **when a step is size-exact but role-wrong, take the nearest
role-CORRECT step and accept the ±1px.** Never take the size-exact step and violate its
commitment — a Title-case string in `overline` inherits +1.3 tracking designed for caps and reads
as broken; a bold heading in `quote` renders italic serif. **And never invent a ramp step to close
the gap**: the twelve are closed, and *"the ramp is integers only, forever"* is worth as much as
*"the ramp is twelve steps, forever."*

⚠️ **If a 13th step is ever seriously proposed, this is the evidence for it** — a caps-free 11px
label step, or a non-italic 17px title step, would close all 13 sites. Both were considered and
rejected in favour of ±1px, on the grounds that a 12-step ramp that people can hold in their head
is worth more than exactness at two sizes.

### 3.4 Why `text-sm = 15` and `text-xs = 13` are retained

Both overrides already exist in `tailwind.config.js:28-31`. They are **kept knowingly**, for
reasons, not inertia:

- **`text-sm = 15`** has **220 usages** — the single highest-blast-radius step in the repo. Keeping
  15 makes the *size* half of the codemod's "prove it's pixel-identical, then flip the values" gate
  a **literal no-op across all 220 sites**, isolating the diff to family and colour. That is exactly
  the risk profile you want on the step that touches the most code. It is also right on merit: 15px
  sits above the 14px comfortable-reading floor for Figtree's x-height on Roboto-class mid-range
  Android, and Figtree at 15/22 sets a **34-character line** at 360dp minus 48dp of padding —
  inside the 30–40 optimum.
- **`text-xs = 13`** is where the entertainment disclaimer lives. "Not 8pt grey" was a stated
  requirement, and 13/19 in `fg-muted` at **5.11:1** on `surface` is a legible legal notice rather
  than fine print.

Both are pinned in `fontSize` in the config, so a future Tailwind upgrade cannot silently return
them to 12/14.

### 3.5 The six fractional sizes — closed per-value mapping (VERBATIM)

A rounding *rule* would still leave 28 judgement calls. This is the closed table. **Max displacement
is 0.5px and nothing moves more than one ramp step.**

| today | → step | Δ | where, and why that direction |
|---|---|---|---|
| **10.5** | `overline` · 11 | **+0.5** | chat counter, report meta — all uppercase already; **up**, because 10.5 is below the legibility floor |
| **11.5** | `text-2xs` · 12 | **+0.5** | chat labels, cap note — **up**; these are labels, and 12/16 is the label step |
| **12.5** | `text-xs` · 13 | **+0.5** | report state descriptions, DI note — **up** into the reading-meta step |
| **13.5** | `text-xs` · 13 | **−0.5** | chat meta, consent body — **down**; these sit beside body copy and must not compete with it |
| **14.5** | `text-sm` · 15 | **+0.5** | chat bubble body — **up**; the bubble *is* body copy and should use the body step |
| **15.5** | `text-sm` · 15 | **−0.5** | report hub titles — **down**; the hierarchy above them moves to `display-sm` instead |

All 28 sites are concentrated in `qa.tsx` and `cosmic-report.tsx`, both of which are
**restyle-only / structure-frozen** — these are pure value edits.

### 3.6 Dynamic type

> ## 🔴 THE MECHANISM NAMED IN THE NEXT LINE DOES NOT WORK ON THIS STACK. Measured, pass 4, 2026-07-31.
>
> **`Text.defaultProps` is a silent no-op under React 19.** React 19 resolves `defaultProps` for
> **class components only**; in the installed renderer the merge is `resolveClassComponentProps()`
> and every call site is gated on `shouldConstruct(type)`, while `updateForwardRef()` passes props
> straight through. RN 0.79.6's `Text` is a `forwardRef`. So the line below assigns a property
> nothing ever reads — no error, no warning, no build signal.
>
> 🔴 **This is P23's own failure mode arriving through the FIX instead of the omission**, which is
> why it is called out here rather than only in the codemod plan: a release could carry the freeze
> line, pass every gate, and have frozen nothing.
>
> **The intent below is unchanged and shipped.** The working mechanism is a wrapper around the
> forwardRef's `render`, in `mobile/lib/textDefaults.ts`, called at module scope from the root
> layout. `codemod-plan.md` §12 **O-30** has the evidence and the two orderings inside the wrapper
> that are load-bearing.
>
> 🔴 **AND THE SAME MODULE CARRIES A SECOND DEFAULT THIS SECTION NEVER ANTICIPATED: the FAMILY.**
> §3.2's example (`className="text-sm font-body text-fg-secondary"`) assumes every site names its
> face. Measured: **328 of the app's 1,118 `<Text>` nodes do, and 198 more get one from `txt()` —
> leaving 592 with none**, and a Tailwind size utility cannot carry a family. A global default is
> therefore the only thing that makes "the app is in Literata and Figtree" true rather than
> 47%-true. `codemod-plan.md` §12 **O-31**.

~~`Text.defaultProps.allowFontScaling = false`~~ — 🔴 **inert on React 19; the working mechanism is
`mobile/lib/textDefaults.ts`, see the box above** — set **once at app root, before the first render**.
Scaling then becomes **opt-in** through `txt()` — 🔴 **and through `txt()` ALONE: the wrapper
component this line once offered as an alternative is DROPPED (owner ruling R-A, 2026-08-03)** —
which returns the prop alongside the
style, plus `maxFontSizeMultiplier: 1.3` so even an opted-in step cannot exceed the cap. The
`scales?` column is normative: opt in on the five yes-steps, never on the seven no-steps — chrome,
numerals and tab labels freeze so X3's fixed 48/56/64 heights and the chat composer never reflow.

**The honest cost, recorded as such by the design:** a `className`-only `<Text>` gets no scaling, so
the five scaling steps must be authored through `txt()`. That is **~180 reading-copy sites**,
~~additive *after* codemod pass 4~~ — 🟢 **MOVED INTO PASS 2b AND SHIPPED (owner, 2026-07-31).**
This is the one place in the system that is opt-in rather than
automatic, and it is deliberate: the alternative (banning `<Text className>` across ~1,204 usages)
would be a whole extra codemod pass on the highest-count idiom in the repo, and a global freeze is
the only version of the "`qa.tsx`'s composer must never reflow" guarantee that cannot be forgotten
at a call site.

> ### 🟢 THE ~180 ARE IN. **P23 / O-13 is closed for the INLINE surface** — and "~180" was right.
>
> They moved to pass 2b because they deliver **2b's** payload too: an inline style cannot inherit a
> ramp, so leading on inline-styled text *only* arrives through `txt()`. Doing them there touches
> each site once instead of twice, and it makes the P23 failure mode structurally impossible —
> pass 4's global freeze can no longer ship without its opt-ins, because they precede it by two
> passes.
>
> **Measured: 217 sites carry a ramp step inline after pass 2a; 179 are on the five `scales: true`
> steps.** That is this paragraph's "~180", confirmed rather than estimated. But the single number
> concealed three things worth having in the design:
>
> 1. 🔴 **51 of the 217 live in `StyleSheet.create`, i.e. MODULE SCOPE.** `txt()` there runs at
>    import, before React mounts, so a bad step name throws where no ErrorBoundary can catch it.
>    They take **plain property reads** (`t.type[step].lineHeight`) instead — a read on a bad key
>    is `undefined`, which RN ignores.
> 2. 🔴 **A STYLE OBJECT CANNOT CARRY THE OPT-IN.** `allowFontScaling` and
>    `maxFontSizeMultiplier` are `<Text>` **props**. So for the **41** scaling StyleSheet styles the
>    opt-in had to be placed on every JSX element that consumes them — a different edit in a
>    different place. A style-object rewrite alone closes 138 of 179 and looks complete.
> 3. 🔴 **THE `scales?` COLUMN CLASSIFIES BY STEP; THIS SECTION CLASSIFIES BY ROLE — AND THEY
>    DISAGREE ON REAL SITES.** The paragraph above names *"X3's fixed 48/56/64 heights and the chat
>    composer"* as freeze surfaces, but the composer is `text-sm` and Button's labels are
>    `text-sm`/`text-base`/`text-lg` — all `scales: true`. **Where they conflict, ROLE wins**: a
>    fixed-height control is chrome that happens to be sized like body copy. Both were given the
>    step's *style* and explicitly denied its *scaling*.
>
> **The one site that took the opposite exit** is `GeneratingReading`'s rotating message (§6.6.2's
> named pass-2 hazard): freezing the only moving text on a 60-second waiting screen was worse than
> raising its reservation, so it **scales** and its `minHeight` went **44 → ceil(44 × 1.3) = 58**.
> The reservation and the opt-in are one decision and landed together.
>
> ⚠️ **STILL OPEN: the `className` half.** A `<Text className="text-sm">` carries no props and
> therefore still freezes at pass 4. That is inherent to option (a) and is what the paragraph above
> means by "the honest cost" — but it is easy to read 2b's 59 opt-ins as the whole job. It is not.

---

## 4. SPACING, RADII, DEPTH, TEXTURE

### 4.1 Spacing — the full resolution set

`theme.spacing` ships **every key the codebase resolves today** — **18 numeric keys plus `px`**:

```
0 · 0.5 · 1 · 1.5 · 2 · 3 · 4 · 5 · 6 · 8 · 12 · 14 · 16 · 20 · 30 · 32 · 48 · 64   (+ px)
```

These are **Tailwind keys, not dp** (key `6` = 24dp, key `12` = 48dp, key `64` = 256dp). The set is
the union computed in `preflight-findings.md` §D — padding/margin families **plus** the
`w-*`/`h-*`/`gap-*`/`inset-*`/`top-right-bottom-left-*` families §2 of the audit never counted
(**151 usages**, of which 128 resolve through the numeric scale).

> ✅ **CORRECTED 2026-07-29 — those dp readings are now true of the running app.** As authored this
> paragraph described the *new config* while claiming to describe the baseline: at NativeWind's
> default `inlineRem: 14` key `6` rendered **21dp**, key `12` **42dp** and key `64` **224dp**
> (§6.4 V2). **The owner flipped `inlineRem: 16` in `mobile/metro.config.js` on 2026-07-29**, so
> key `6` = 24dp is now literally what ships. Every dp figure in §4.1–§4.3 can be read at face
> value. **The consequence for the codemod is the one that matters: 91 of the 102 spacing
> utilities the codebase uses — 1,246 of 1,276 usages — are now byte-identical between what the
> app renders and what `px(t.space)` will emit.** Full recomputed table: **§6.6**.

Two keys are load-bearing in a way that is invisible until it breaks:

- 🔴 **`px` is load-bearing.** `h-px` is the hairline divider on **both** auth screens —
  `login.tsx:180,182` and `signup.tsx:271,273`. `px` is a *named* key, not a numeric one; express
  the scale as "13 numeric steps" and both "or continue with" dividers **silently vanish**.
- 🔴 **`w-30` / `h-30` is a live latent bug, today, on `main`.** Tailwind 3's default scale has no
  `30` key. `profile.tsx:186,190` use `w-30 h-30` and are saved only by an adjacent
  `style={{ width: 120, height: 120 }}`. Nothing errors, because **NativeWind drops an unresolvable
  utility silently**. This is the exact argument for the CI grep gate over "Tailwind will error"
  (§13) — and it should be fixed, not preserved.

### 4.2 Spacing — the 13-step authoring vocabulary

Shipping 18 keys is a **resolution** requirement. **Authoring** uses a 13-name vocabulary:

| token | dp | use |
|---|---|---|
| `space-0` | 0 | reset |
| `space-1` | 4 | icon↔label, badge inset |
| `space-2` | 8 | chip gap, label↔field |
| `space-3` | 12 | list-item gap, bullet gap |
| `space-4` | 16 | card inner padding (sm), stack gap |
| `space-5` | 20 | card inner padding (default) |
| `space-6` | 24 | section gap, screen gutter |
| `space-8` | 32 | screen vertical rhythm, block break |
| `space-10` | 40 | major break, header↔content |
| `space-12` | 48 | EmptyState breathing, hero top |
| **`screen-x`** | 24 | the hand-rolled 24 horizontal, now named — one token, 25 screens |
| **`screen-y`** | 32 | the hand-rolled 32 vertical, now named |
| `px` | 1 | the auth hairline divider (§4.1) |

Utilities are `p-6`, `gap-3`, `px-screen-x`, `py-screen-y` — **not** `p-space-6` (corrected in turn
3, C7). `screen-x`/`screen-y` exist as separate names on purpose: they are what `ScreenContainer`
owns, and naming them stops the next screen from re-typing `24`.

**Tap-target floor 48×48dp**, enforced with `hitSlop` where the visual is smaller (chips, icon
buttons, the chat send button).

> **Reconciliation note.** Turn 2's heading says *"9 steps + 2 named"* (nine non-zero steps +
> `screen-x`/`screen-y`); turn 7 says *"the authoring vocabulary stays the **13** steps."* The 13
> above = `space-0` + nine steps + two named + `px`. The 13th name was **inferred** — no surviving
> turn enumerates the 13 explicitly. ✅ **Settled by the verbatim `theme.js` (§6.1):** the authored
> `space` ships **12** keys and the missing one is **`px`**, restored by correction **C-b**. Without
> it `h-px` stops resolving and both auth-screen dividers vanish (§6.4 V3).

### 4.3 The five outliers — a separate migration pass

Keys **`14, 30, 32, 48, 64`** (= 56, 120, 128, 192, 256 dp) are outside the authoring vocabulary but
**must ship in `theme.spacing`** so today's classes keep resolving. Migrating their call sites onto
authoring steps is a **separate pass requiring visual sign-off** — it changes pixels by design and
is not part of the pixel-identical codemod. `w-12`/`h-12` alone is **32 usages**, i.e. every avatar
and icon well in the app.

### 4.4 Radii — 21 values → 5, with one pill spelling

> ## 🔴 THIS TABLE HELD TWO COMPETING SOURCES OF TRUTH, AND IT PRODUCED THREE COLLISIONS
> ### OWNER RULING (2026-08-01, pass 3b): **`use` IS NORMATIVE. `absorbs` IS DESCRIPTIVE, AND NON-NORMATIVE.**
>
> The two right-hand columns **disagree**, and nothing said which one wins:
>
> - **`absorbs` is VALUE-driven** — "a 16px corner becomes the 14px key". It describes the **legacy
>   migration** and nothing else.
> - **`use` is ROLE-driven** — "a `Card` is 20; a `Button` is a pill". It describes **the system**.
>
> A `Card` at 16 today is *both* "absorbs 16 → 14" and "`Card` → 20". Read `absorbs` as normative and
> you get 14; read `use` as normative and you get 20. **Three separate collisions came from reading
> the first one as normative**, each found by a different instrument:
>
> | # | what | how it surfaced |
> |---|---|---|
> | 1 | **6 hand-rolled buttons** would have taken 14 while `Button` took the pill step — a mixed radius vocabulary inside ONE role | per-site review of the 49 grep-blind sites |
> | 2 | the paywall **segmented track and its own segments** both took 14 — parent and child at the identical corner, scored by `§6.6 C` as *two correct +2s* | the geometry, once the sites were read as a pair |
> | 3 | 🔴 **`Card` itself** took 14, so the 12 panels nested inside it — sent to 14 on the stated grounds that it kept them *"one step tighter than their parent, since §4.4 puts Card at lg 20"* — sat at the **identical** corner to their parent | **reading the diff**, and only that |
>
> 🔴 **COLLISION 3 IS THE DECISIVE ONE, AND NOT BECAUSE IT IS THE LARGEST.** It shows the defect does
> not merely mis-assign sites: **it FALSIFIES THE PREMISE OF A RULING ALREADY MADE.** The panels'
> verdict was correct *conditional on* `Card` being 20, and the `absorbs` column made `Card` 14. One
> of the two had to move, and `use` is what this table specifies.
>
> 🔴 **THIS IS `O-35`'s CLASS (§3.0.2 class 7 — *a document's inference is not verified by being
> written*) AND THE FIRST INSTANCE WHERE THE DOCUMENT HOLDS TWO COMPETING SOURCES OF TRUTH RATHER
> THAN ONE WRONG ONE.** Registered as **`O-40`**.
>
> ### ✅ **`absorbs` IS DELETED — `C-P3b-1` DISCHARGED 2026-08-03, in the commit that landed `Card`.**
>
> It was retained past the ruling for exactly one reason: **§4.4 is the reference for BUILDING
> `Card`, `SectionCard` and `LockShell`, and a reader who hit the disagreement there got no diff to
> read.** 🔴 **The primitives phase is both the reader it was kept for and the reader it would
> mislead**, and `Card` and `SectionCard` are precisely the two components whose corner the two
> columns disagreed about (14 vs 20). Leaving it past that point guaranteed a fourth `O-40`
> collision with nothing to catch it, so it goes in the commit that first builds one of them.
>
> **What was in it, preserved as prose so the deletion loses no information and re-adds no column:**
> it answered *"which legacy pixel value lands near this key?"* — 4/6/8/10 → `sm`; 12/14/16 → `md`;
> 18/20/22/24 → `lg`; 26/28/30/32/40 → `xl`; the three pill spellings and any `dimension ÷ 2` →
> `pill`. **That question stopped being askable when pass 3b rewrote all 373 sites**; the mapping is
> recorded per-site and per-delta in `pass3b-radius-enumeration.md`, which is where a value question
> belongs. 🔴 **Do not restore the column.** A second source of truth beside `use` is the defect,
> not the record.

| token | dp | 🟢 use — **NORMATIVE, and now the only column** |
|---|---|---|
| `radius-sm` | **8** | badge, thumbnail, inline tag |
| `radius-md` | **14** | `Input`, chat bubble, small card, **a panel nested in a `Card`** |
| `radius-lg` | **20** | `Card`, `SectionCard`, lock plate |
| `radius-xl` | **28** | hero card, bottom-sheet top corners, `ShareCard` |
| **`radius-pill`** | **9999** | `Button`, chip, avatar, progress track, **any `dimension ÷ 2` circle** — **one spelling** |

🔴 **WHERE THE TWO COLUMNS DISAGREE, `use` WINS. ALWAYS.** Pass 3b assigned all 373 sites on that
basis, per-site, and the boundary it applied is stated so it can be overruled in one line:
**role overrides value where the role is NAMED** — by this table, or by the site's own style-object
name (`unlockButton`, `ctaButton`, `consentButton`, `captureButton` …). Where the role is *not*
named — an anonymous `<View>` that merely sits inside a `Touchable`, e.g. `readings/index`'s seven
tappable reading **cards** — the value mapping stands. **A tappable card is a card.**

`rounded-sm` and `rounded-md` are **valid** in this 5-step scale and are not banned (corrected in
turn 3/4 — §13). The three competing pill spellings collapse to one.

### 4.5 Depth — two tiers, zero elevation, one documented exception

**Tier 1 — lightness.** `bg → surface → surface-raised → surface-overlay`. Rule: **a container may
sit only on a container exactly one step below it. Two same-tier surfaces may not nest.** This is
the primary depth signal and it is the model already in the codebase, so the codemod maps
rgba-white overlays onto named steps without inventing anything.

> ### 🔴 THE CONCENTRIC RULE, AND ITS BOUNDARY WITH THE DEPTH RULE (owner ruling, 2026-08-01, pass 3b)
>
> The lightness rule above governs **which surface** a container sits on. This governs **what corner
> a nested container takes** — and it needs a boundary, because the two rules **collide
> arithmetically** if the first is applied at every depth:
>
> | condition | why | the rule | worked example |
> |---|---|---|---|
> | the child has **NO role in §4.4's table** | nothing normative determines its step, so geometry is the best available answer. The corners are concentric and their curves read as parallel | 🔴 **child = `R − N`, nearest step** | the paywall billing **segments** — not an `Input`, not a chip, not a card: `R` 14, `N` 4 → 10 → **`sm` 8** |
> | the child **HAS a role in §4.4's table** | 🔴 the role table is **NORMATIVE** (`O-40`), and the concentric rule is arithmetic. **Role beats arithmetic here too** | 🔴 **child = its role's step**, which in practice is one step tighter than its parent | a **panel** in a `Card`: `R` 20, `N` 16, geometry says 4 → but a panel is **`md` 14** |
>
> ⚠️ **THE BOUNDARY IS "IS THERE A ROLE?", NOT AN INSET-VS-RADIUS COMPARISON — and that correction is
> itself worth recording.** The boundary was first stated as *"inset ≥ radius → hierarchy"*, with
> `Card` (`R` 20, `N` 16) given as the hierarchy example. **16 ≥ 20 is false**, so `Card` falls in the
> *concentric* branch under that phrasing and yields `20 − 16 = 4` → the 8px step, not 14. No
> inset-vs-radius threshold makes both worked examples come out right without being reverse-fitted to
> them. The rule that does is the one already ruled one level up: **a named role wins; geometry only
> arbitrates where no role exists.**
>
> 🔴 **WITHOUT THAT BOUNDARY, `R − N` APPLIED AT EVERY DEPTH DRIVES EVERYTHING TOWARD `sm` 8 AND THE
> SCALE COLLAPSES.** A 20px `Card` with `p-4` would demand a 4px child, whose own `p-3` child would
> demand 0, and a five-step scale would have two live members.
>
> **Both halves were measured on real sites, not reasoned.** The concentric half was found because the
> class-level map sent a `rounded-2xl` **track** and its `rounded-xl` **segments** both to 14 — parent
> and child at the identical corner, which `§6.6 C` scored as *two correct +2s*. The role half was
> found because the same map sent `Card` and the panels nested inside it both to 14.

**Tier 2 — hairline.** `1px border-subtle`, used in exactly **two** situations:
(i) two same-tier surfaces are **adjacent** rather than nested (list dividers, disclaimer rule,
tab-bar top edge); (ii) a block is **interactive but unfilled** (outline `Button`, chip, focused
`Input` via `border-strong`).
**Never both a lightness jump and a border to express the *same* boundary.**

**Zero `elevation:`, zero `shadow*`, zero `textShadow`** — nothing needs per-platform tuning, and
the two existing single uses are removed (`Card`'s `shadow-lg`; `face-capture.tsx:681-683`'s
`textShadow*` block).

> 🔴 **The ONE documented exception.** `(paywall)/index.tsx:88`'s `elevation: 10`, paired with
> `zIndex: 50` at `:87`, **stays**. The close button is `position: 'absolute'` over a `ScrollView`
> and on Android needs `elevation` to stack above it — `zIndex` alone is unreliable there. Its
> shadow is invisible in practice (a flat `surface-overlay` circle on `bg`, ~6% lightness
> difference), but the design's position is that it is better to **name the exception than to
> pretend the count is zero**. Registered as **X19** in `UI-audit.md` §5.1.

**Blur is untouched and still means *locked***, at `intensity={20}`, and only at LockShell density 1
(§9 #13). **No frosted chrome exists in this system** — a designer using blur for anything else
would be overloading a meaning users have already learned.

### 4.6 Texture — `texture.grain`

One **120×120 tileable WebP with a PNG-8 fallback, ~6 KB**, tiled via `resizeMode="repeat"`, at
**`opacity 0.05`**, **absolutely positioned**, **`pointerEvents="none"`**. Functional as well as
decorative: it dithers the 8-bit banding that `aura` otherwise shows on cheap OLED panels.

**Total added asset weight: ~426 KB** — 5 TTFs (~420 KB) + 1 texture (~6 KB). No other raster.

**Four mount points** (revised up from three in turn 3, W2 — §13):

| # | mount | covers |
|---|---|---|
| i | **`ScreenContainer`** — an absolute `pointerEvents="none"` sibling **inside** the Dimensions-pinned View (X1 structure untouched) | 25 of 32 screens |
| ii | **`welcome.tsx`**, explicitly, inside its hand-rolled X2 wrapper (X2 structure untouched) | 1 |
| iii | **the `(auth)` layout** | login, signup, verify-email, verify-code, forgot-password, reset-password |
| iv | **`(paywall)/index.tsx`**, explicitly — it does not use `ScreenContainer`, and it is the revenue surface with the app's only large accent field, so it needs the banding dither most | 1 |

**Not mounted, deliberately:** `qa.tsx` at **any** safety state — the chat is a reading surface, not
a poster, which also makes the crisis-state decision free rather than a special case (it never uses
`ScreenContainer`, so this costs nothing); and the **two capture screens** (`face-capture`,
`palm-capture`), where grain over a live camera preview is just noise. Note that
`(capture)/birth-data.tsx` **does** use `ScreenContainer` and therefore **is** grained — "the capture
screens are excluded" means the two camera screens, not the whole `(capture)` group.

> 🔴 **Mount point (iii) is refuted by the repo.** See **Appendix A(b), finding I-1** — all six
> screens it targets already use `ScreenContainer`, so (iii) double-tiles them. Transcribed here as
> the surviving design; **do not implement it without reading that finding.**

---

## 5. MOTION

**No spring, no bounce, no overshoot anywhere in the system.**

### 5.1 Six durations

| duration | ms | for |
|---|---|---|
| `dur-instant` | **90** | press-in opacity, haptic-paired feedback |
| `dur-quick` | **140** | press-out, chip select, toggle |
| `dur-base` | **220** | tab switch, fade, colour change |
| `dur-moderate` | **300** | screen transition, card entrance, sheet dismiss |
| `dur-slow` | **420** | sheet present, lock reveal, success |
| `dur-ambient` | **2600** | **the only looping duration** — breathing aura, shimmer sweep |

### 5.2 Four curves

| curve | bezier | for |
|---|---|---|
| `ease-standard` | `0.32, 0, 0.24, 1` | default — anything that starts and ends on screen |
| `ease-enter` | `0, 0, 0.22, 1` | arriving: decelerate only, **never overshoots** |
| `ease-exit` | `0.4, 0, 1, 1` | leaving: accelerate out |
| `ease-linear` | `linear` | progress and loops **only** — never on opacity or transform of content |

### 5.3 Three system-wide rules

1. **The only animated properties are `opacity` and `transform: translateY | scale`** — never
   height, width, margin, padding or flex, **so nothing animates layout**.
2. **Entrances are guarded and never replay on re-render**; a list re-fetch does not re-stagger.

> ### 🔴 RULE 2's KEY CHANGED — **PER MOUNT → PER FOCUS.** Owner-ruled 2026-08-06, after a device pass.
>
> **Annotated in the spec rather than only in a session file, because the original wording is what a
> later reader would restore.** As written, rule 2 named *two* properties and only one of them was
> load-bearing:
>
> | property | status |
> |---|---|
> | does **not** replay on a **RE-RENDER** | 🟢 **UNCHANGED. This is the whole of what rule 2 protects** |
> | plays once per **MOUNT** | 🔴 **SUPERSEDED.** It was the mechanism, mistaken for the requirement |
>
> 🔴 **WHY, MEASURED: `@react-navigation/bottom-tabs` KEEPS A SCENE MOUNTED after its first visit.**
> So a once-per-mount entrance gets **exactly one opportunity per screen for the life of the app** —
> and that opportunity lands underneath the container's own arrival (see the box under §5.4's
> entrance row). The two compose into a total loss: the one showing is invisible, and the guard then
> correctly suppresses every repeat that would have been visible. The device report was *"no motion
> anywhere except button press"*, and button press is the one animation in the system that is
> **gesture**-driven — i.e. the only one that never fires during a transition.
>
> 🟢 **THE REPLACEMENT IS `useFocusEffect` WITH A MEMOISED CALLBACK, and the two halves are the two
> events rule 2 was conflating:** the navigator's focus event drives the replay, and a stable
> callback identity means a re-render is not an input to the hook at all. `useRef` is no longer the
> spelling; **"never on re-render" is still the rule.**
> ⚠️ **One declared exception survives, `usePlateEntrance`** — §18.1 makes it alpha-only, and a wait
> on an alpha-only entrance is a wait on nothing being painted. It animates on first arrival and is
> simply present thereafter, which is §18.1 row 3's own treatment of a hero.
> `mobile/scripts/motion-arrival-check.js` **LEG D** asserts all of it: which key each entrance uses,
> that a focus-keyed one is memoised, and that the mount-keyed set is exactly one.
3. **Every distance is ≤ 8dp.** Content rises 8dp and fades; it never slides across the screen and
   never scales up from small.

### 5.4 Interaction → token table

| interaction | duration | curve | what moves |
|---|---|---|---|
| screen transition | — (none) | — | 🔴 **Nothing of ours.** Expo Router keeps `animation: 'fade'`, native timing, **no custom bezier, no `animationDuration`, nothing platform-conditional** |
| screen **content** entrance | `dur-moderate` 300 | `ease-enter` | ⚠️ **AS SHIPPED: translateY 12→0 ONLY, once per FOCUS, after a 300ms clearance.** See the box below — the alpha channel and the mount keying are both superseded. Owned by `ScreenContainer`, **not** the navigator |

> ### 🔴 THE ENTRANCE ROW HAS BEEN AMENDED TWICE, ONE SESSION APART, AND BOTH HALVES WERE REQUIRED
>
> **Recorded against the row rather than in a session file, because each amendment looks like a
> regression against the row as originally written.** They are two *independent* mechanisms, and the
> first fix was necessary and **not sufficient** — which is exactly how the second one survived a
> shipped build.
>
> | # | what the row said | what was measured | amendment |
> |---|---|---|---|
> | **1** | `opacity 0→1` | 🔴 **A NAVIGATOR FADES THE CONTAINER WHILE THIS FADES THE CONTENT, AND TWO ALPHA CURVES MULTIPLY.** `ease-enter` spends 83% of its 300ms inside the first 150ms — the root fade's whole span | 🟢 **the alpha channel is DELETED.** Alpha × alpha is destructive; **alpha × position is not**, so the rise survives the composition |
> | **1a** | `translateY 8→0` | 8 was specified as a **companion** to that fade; with the fade gone it is the sole cue | 🟢 **12**, as its own token (`P97`) |
> | **2** | `once per mount` | 🔴 **THE SCHEDULE WAS NEVER TOUCHED BY (1).** Removing the alpha changed the CHANNEL, not the TIMING — so the RISE then completed invisibly instead of the fade. And bottom tabs keep scenes mounted, so there was **one** chance per screen, spent under the transition | 🟢 **focus-keyed, behind a 300ms clearance.** §5.3 rule 2's box has the mechanism |
>
> 🔴 **THE CLEARANCE AND THE ALPHA DELETION ARE ONE EDIT, IN THIS DIRECTION: the delay is only safe
> BECAUSE the alpha is gone.** With an alpha ramp, waiting 300ms means **300ms of blank screen**.
> Rise-only means the content is painted for the entire wait and merely sits 12dp low, so the wait
> costs nothing. **Anyone re-adding an alpha ramp to the entrance re-arms a blank-screen risk that the
> clearance then makes 300ms long.**
>
> **The measured containers the clearance clears** (all three, from the installed navigators): root
> stack fade **150ms** · nested stack **133ms** API 33+ / **200ms** pre-33 · tab scene **220ms**. The
> clearance is `dur-moderate` **300** because §0.0 rule 2 forbids authoring a seventh duration —
> "clear 220" plus "use a specified value" has exactly one answer.
| tab switch | — (none) | — | 🔴 **THE WHOLE ROW CANNOT BE MET, AND BOTH HALVES ARE CLOSED. SEE THE TWO BOXES BELOW.** The tab switch is a **CUT**: the icon + label cross-fade does not exist and cannot be built (box 1), and the SCENE cross-fade shipped, was measured on a device, and was **REVERTED** (box 2). The tab bar itself never moves |

> ### 🔴 A SPEC ROW THAT CANNOT BE MET — the tab-bar icon/label cross-fade. **CLOSED PERMANENTLY, 2026-08-06.**
>
> **Recorded here, in the spec itself, rather than only in a caveats file — because a design row with
> no annotation reads as unfinished work and gets re-opened.** It is not unfinished. It is impossible
> within a constraint this project has already ruled on.
>
> **MEASURED IN THE INSTALLED `@react-navigation/bottom-tabs@7.16.1`, at `views/BottomTabItem.tsx`:**
>
> ```
> const activeOpacity   = focused ? 1 : 0;
> const inactiveOpacity = focused ? 0 : 1;
> ```
>
> There is **no `Animated`, no interpolation and no timing anywhere in that file.** The two stacked
> icons swap **instantly**. The structure is a cross-fade; the behaviour is a **cut**. No prop, spec
> or interpolator changes it — this is not a configuration gap, it is the absence of an animation.
>
> 🔴 **THE ONLY FIX IS THE `tabBar` RENDER PROP, i.e. RE-IMPLEMENTING THE BAR — AND THAT IS A HARD
> STOP, NOT A TRADE.** It would put **X18**'s three coupled numbers (`height: 85 + inset`,
> `paddingBottom: 24 + inset`, `paddingTop: 8`) under our control, and five screens derive their
> bottom padding from them. §0.0 rule 3: an item that cannot be built without touching X1–X20 is
> skipped, not attempted.
> ⚠️ **AND THE SECOND REASON IS THE ONE THAT MAKES THIS PERMANENT RATHER THAN DEFERRED: iOS
> VERIFICATION IS CLOSED.** A hand-rolled tab bar's layout could never be confirmed on the platform
> where X18's numbers matter most, so even a successful Android rebuild would ship an unverifiable
> regression risk on every screen at once — to animate a colour swap.
>
> 🟢 **WHAT DID SHIP AND WAS THE WHOLE OF WHAT WAS AVAILABLE:** `transitionSpec: navTiming` +
> `sceneStyleInterpolator: SceneStyleInterpolators.forFade`, which retimed the SCENE cross-fade from
> the navigator's own off-ramp default (**150ms `Easing.in(Easing.linear)`**) onto `dur-base` 220 /
> `ease-standard`. `shift` was rejected: it translates the scene by screen width, and §5.3 rule 3
> caps every distance at 8dp (12 since `P97`).
> 🔴 **AND IT IS GONE. READ THE NEXT BOX** — that scene cross-fade is the defect the device found,
> and it was reverted the same day this box was written. Both halves of the row are now cuts.
>
> **Do not re-open this row.** If the bar is ever rebuilt for an unrelated reason, the cross-fade
> comes back with it — as a consequence, never as the justification.

> ### 🔴 THE SECOND HALF, AND IT IS THE ONE THAT SHIPPED: **THE SCENE CROSS-FADE IS REVERTED TO A CUT.** Owner-ruled 2026-08-06, on a device.
>
> **Recorded in the spec, beside the icon half, rather than only in a session file — for the same
> reason: a design row with no annotation reads as unfinished work and gets re-attempted.** This one
> is worse than unfinished. It was BUILT, exactly to spec, and the spec was wrong.
>
> **WHAT THE DEVICE SHOWED.** Entering Home from Readings, the PREVIOUS screen's content was legible
> **through** the new one — *"Your Readings"*, *"Discover your cosmic profile"*, *"AI Astrologer"*,
> *"Face Reading"*, *"The Visionary Pioneer"* all visible behind Home's greeting, with the tab bar
> still showing Readings active. It was reported as a **white flash**. It is not a flash.
>
> 🔴 **IT IS A DOUBLE EXPOSURE, AND THAT MAKES IT A PROPERTY OF THE TECHNIQUE RATHER THAN OF THE
> TIMING.** A cross-fade works for **images**, where one picture replaces another. Between two
> **opaque full-screen text layouts** there is no such reading: for the length of the overlap the
> user is looking at both, and two sets of type at partial alpha composite into a bright hazy smear.
> **No duration or easing fixes it.** 220 ms was already short; shortening it only makes the smear
> briefer, and lengthening it is worse. **The window has to not exist.**
>
> | | |
> |---|---|
> | **the fix** | delete **both** `transitionSpec` and `sceneStyleInterpolator` from `(main)/_layout.tsx`'s `screenOptions` |
> | **what the navigator then does** | measured in the installed `bottom-tabs@7.16.1`, `views/BottomTabView.tsx`: `animation` defaults to `'none'`, whose preset supplies `{ animation: 'timing', config: { duration: 0 } }` and **no scene interpolator**; `hasAnimation()` returns false, so the outgoing scene goes **straight** to its detached activity state instead of interpolating there. **Nothing is below alpha 1 at any point.** This is exactly the pre-item-5 behaviour `UI-audit` §4.3 recorded as *"Tab switches are also default (instant, no animation)"* |
> | 🔴 **why a HALF revert is worse than none** | `hasAnimation()` reads the **spec** when no animation name is set. Leaving `transitionSpec` behind therefore keeps the **220 ms window open with no fade in it** — the scenes still overlap, and now nothing visibly explains why. **Both keys go, or neither.** |
>
> 🟢 **THE CONSISTENCY ARGUMENT, AND IT IS THE REASON THIS IS TIDY RATHER THAN A LOSS.** The box
> above closes the tab-bar **icon** cross-fade permanently — the navigator swaps the two stacked
> glyphs **instantly**, and the only fix is re-implementing the bar, which X18 forbids. So the bar
> was already a cut. Until this revert the **scene** animated and the **bar** did not, which is two
> models for one gesture; they now agree.
>
> 🔴 **AND A SECOND, INDEPENDENT DEFECT WAS FOUND UNDERNEATH IT — the one that made the smear
> BRIGHT.** A `bottom-tabs` scene is painted by `@react-navigation/elements`' `Background`, which
> fills `useTheme().colors.background`; Expo Router's container defaults that theme to
> react-navigation's **light** one (`fork/NavigationContainer.js`: `theme = DefaultTheme`), and
> expo-router exports no way to replace it. Every other navigator in the app masks it —
> **all six stacks set `contentStyle`** — and the tab navigator set **nothing**, so the element
> opacity the cross-fade drove included a near-white fill. 🟢 **Closed by
> `sceneStyle: { backgroundColor: bg }`, which is kept even though nothing animates the scene now:
> it is the only place that ground can be named, and the next scene-level effect would re-open the
> hazard with no diff to point at.**
>
> **ENFORCEMENT MOVED WITH THE RULING, IN BOTH DIRECTIONS.** The two presence assertions that pinned
> the spec and the interpolator became **`absent`** assertions in `primitive-adoption-check.js`'s
> `Tabs` contract, `sceneStyle` became a **literal**, and `motion-arrival-check.js`'s container table
> lost its longest row — which moves the alpha-only entrance **floor from 220 to 200**. ⚠️ The 300 ms
> arrival clearance did **not** move with it: 300 still clears 200, and re-fitting a shared front-load
> to whatever the current worst case happens to be turns a derived number into a magic one.
| sheet present | `dur-slow` 420 | `ease-enter` | translateY 100%→0 + scrim opacity 0→0.6. Degrades to a plain `Modal` fade at the same duration if gestures are unproven |
| sheet dismiss | `dur-moderate` 300 | `ease-exit` | reverse; scrim leads by 0 ms |
| card entrance | `dur-moderate` 300 | `ease-enter` | opacity + translateY 8→0, **40 ms stagger, capped at 5 items**; item 6+ appears with the 5th. Once per mount |
| button press-in | `dur-instant` 90 | `ease-standard` | opacity 1→0.88 + scale 1→0.985. No `activeOpacity` guesswork; **scale is inside X3's fixed height so nothing reflows** |
| button press-out | `dur-quick` 140 | `ease-exit` | reverse. Haptic `Light` on press-in, matching today's 25 `expo-haptics` sites |
| loading (inline) | `dur-ambient` 2600 | `ease-linear` | skeleton shimmer sweep, `accent-muted` across `surface-raised`. Loop, **no fade-in** |
| success | `dur-slow` 420 | `ease-enter` | icon opacity + scale 0.92→1 (**never above 1**) + haptic `Success`. **No confetti, no pulse** |
| error | `dur-base` 220 | `ease-standard` | opacity + **4 dp** translateY, **no shake** + haptic `Warning`. *An error that jitters reads as a crash* |
| **long wait** (`GeneratingReading`) | see §5.5 | `ease-linear` + `ease-standard` | two independent layers |

> The screen-transition row was **rewritten** in turn 3 (C6): the 8dp rise is not a navigator
> concern at all, it is the **card-entrance token applied to the screen's own root content block**.
> Two independent layers, correctly separated. See §13.

### 5.5 `GeneratingReading` — the 60-second wait, as motion tokens

**Two independent layers.** The distinction that makes the wait read as *considered* rather than
*broken*: **the bar is the only element that tracks progress, and the only element allowed to be
honest about being slow.** Everything else breathes at a constant rate, which is what a working
system looks like. **Nothing on the screen restarts or resets, because a restarting animation is
what users read as "it hung."**

- **Layer one — honesty.** 🔴 **The existing asymptote to 0.97 is preserved exactly.** The bar is
  driven by the **existing** timer (`withSequence` of four `withTiming` legs, 12s → 25s → 45s →
  60s, targets 0.35 → 0.65 → 0.88 → 0.97), runs on `ease-linear`, and **never reaches 1.0**. It
  completes only when the server does, at which point it runs **0.97 → 1.0 in `dur-slow` 420 /
  `ease-enter`** and hands off to the `success` token.
- **Layer two — life.** An `aura` behind the progress bar breathes on `dur-ambient` 2600,
  `ease-standard`, **opacity 0.5 ↔ 1.0 only** — no scale, no rotation, no reflow. The stage label
  cross-fades on `dur-base` 220 as the existing stage messages advance.

Supporting copy behaviour from the specimen: **"about a minute" is a range, never a countdown**,
because a countdown that overruns reads as a failure.

---

## 6. `theme.js` and `tailwind.config.js`

> ✅ **VERBATIM.** The designer supplied `codeTheme2` and `codeTailwind2` on **2026-07-29**. The
> read-cap gap is closed; the banner's §6 clause is retired.
>
> **This section holds two versions of the same two files.**
>
> | § | version | status |
> |---|---|---|
> | **6.1** | **as authored** — verbatim, byte-for-byte, plus the designer's own trailing note | 🔴 **reference only — do not build this** |
> | **6.2** | **as corrected** — the same files with corrections **C-a … C-l** applied | 🟢 **BUILD THIS** |
> | 6.3 | the corrections, one row each, with the evidence that justifies them | — |
> | 6.4 | **EVIDENCE** — the V1–V8 validation outputs | — |
> | 6.5 | **C-h** — a `theme.d.ts` draft (recommended, not created) | — |
> | 6.6 | what the verbatim blocks settle that §§2–5 could only infer | — |
>
> **Every correction was empirically tested**, never reasoned: the configs were built in a throwaway
> directory, compiled by the repo's own **Tailwind 3.4.19** through **NativeWind 4.2.4**'s preset,
> and the emitted utilities diffed. Nothing in `mobile/` was written or installed.

---

### 6.1 AS AUTHORED — verbatim · 🔴 do not build this version

#### `codeTheme2` — `theme.js` (revised)

```js
// theme.js — REVISED (fg-* roles, family-per-weight)
const color = {
  bg:'#100E0D', surface:'#171412',
  'surface-raised':'#1E1A17', 'surface-overlay':'#26211D',
  locked:'#2A2521',
  fg:'#F4EFE9',              // was text-primary
  'fg-secondary':'#C6BDB2',  // was text-secondary
  'fg-muted':'#8E867C',      // was text-muted
  'fg-placeholder':'#6B645C',
  'fg-disabled':'rgba(244,239,233,0.38)',
  'border-subtle':'rgba(244,239,233,0.07)',
  'border-strong':'rgba(244,239,233,0.16)',
  accent:'#D98E57', 'accent-muted':'rgba(217,142,87,0.14)',
  'accent-2':'#B3A6D9', 'accent-2-muted':'rgba(179,166,217,0.12)',
  'on-accent':'#1A1512',
  success:'#86A97B', warning:'#D9A657', danger:'#C8695E',
};

// families are keyed per weight — RN cannot synthesise
const family = {
  display:     'Literata-Bold',
  quote:       'Literata-Italic',
  body:        'Figtree-Regular',
  'body-semi': 'Figtree-SemiBold',
  'body-bold': 'Figtree-Bold',
};

// every ramp step names its family + whether it scales
const type = {
  'display-lg':{size:30,lineHeight:34,letterSpacing:-0.6,family:'display',scales:false},
  'display-md':{size:24,lineHeight:29,letterSpacing:-0.4,family:'display',scales:false},
  'display-sm':{size:20,lineHeight:25,letterSpacing:-0.3,family:'display',scales:false},
  quote:       {size:17,lineHeight:26,letterSpacing:0,   family:'quote',  scales:true },
  'text-2xl':  {size:24,lineHeight:28,letterSpacing:-0.4,family:'body-bold',scales:false},
  'text-xl':   {size:20,lineHeight:26,letterSpacing:-0.2,family:'body-bold',scales:false},
  'text-lg':   {size:18,lineHeight:24,letterSpacing:0,   family:'body-semi',scales:true },
  'text-base': {size:16,lineHeight:22,letterSpacing:0,   family:'body-semi',scales:true },
  'text-sm':   {size:15,lineHeight:22,letterSpacing:0,   family:'body',   scales:true },
  'text-xs':   {size:13,lineHeight:19,letterSpacing:0,   family:'body',   scales:true },
  'text-2xs':  {size:12,lineHeight:16,letterSpacing:0.2, family:'body-semi',scales:false},
  overline:    {size:11,lineHeight:14,letterSpacing:1.3, family:'body-bold',scales:false},
};

// the ONE text helper. Returns a style object AND the prop.
// Decision (b): the global default is frozen, so a step
// only scales if it opts in here.
function txt(step){
  const t = type[step];
  return {
    style:{ fontSize:t.size, lineHeight:t.lineHeight,
            letterSpacing:t.letterSpacing,
            fontFamily:family[t.family] },
    allowFontScaling: t.scales,
    maxFontSizeMultiplier: t.scales ? 1.3 : 1,
  };
}
// usage:  <Text {...txt('text-sm')} style={[txt('text-sm').style,
//                {color:color['fg-secondary']}]} />
// 🔴 THE WRAPPER IS DROPPED — OWNER RULING R-A, 2026-08-03. The spread above is the ONE idiom.
//    Reason: the wrapper's whole benefit is uniformity, and the two structure-frozen files cannot
//    take it, so it would ship two idioms for one concept. See mobile/theme.js's C-i block.

const space  = {0:0,1:4,2:8,3:12,4:16,5:20,6:24,8:32,10:40,12:48,
                'screen-x':24,'screen-y':32};
const radius = {sm:8, md:14, lg:20, xl:28, pill:9999};
const motion = {
  duration:{instant:90,quick:140,base:220,moderate:300,slow:420,ambient:2600},
  easing:{standard:[0.32,0,0.24,1], enter:[0,0,0.22,1],
          exit:[0.4,0,1,1], linear:'linear'},
  distance:8, stagger:40, staggerCap:5,
};
const a11y = {tapMin:48, fontScaleMax:1.3, hairline:1};
module.exports = {color, family, type, txt, space, radius, motion, a11y};
```

> **The designer's trailing note, verbatim:**
> ⚠️ Per your §2.4 correction, `space` above is the authoring vocabulary. The shipped
> `theme.spacing` must additionally carry every key the codebase resolves today — 0.5, 1.5, 14, 16,
> 20, 30, 32, 48, 64 and px — with the five outliers migrating in a separate signed-off pass.

#### `codeTailwind2` — `tailwind.config.js` (revised)

```js
// tailwind.config.js — REVISED
const t = require('./theme');
const px = o => Object.fromEntries(
  Object.entries(o).map(([k,v]) => [k, `${v}px`]));
const fontSize = Object.fromEntries(
  Object.entries(t.type).map(([k,s]) => [k, [`${s.size}px`, {
    lineHeight: `${s.lineHeight}px`,
    letterSpacing: `${s.letterSpacing}px`,
  }]]));

module.exports = {
  content:['./app/**/*.{js,jsx,ts,tsx}',
           './components/**/*.{js,jsx,ts,tsx}'],
  presets:[require('nativewind/preset')],
  theme:{
    // defaults deleted so nothing legacy resolves. This is
    // hygiene, NOT the completeness proof — see the CI gate.
    colors: t.color,
    spacing: px(t.space),      // also drives w-/h-/inset-/gap-
    borderRadius: px(t.radius),
    fontSize,
    fontFamily:{
      display:     [t.family.display],
      quote:       [t.family.quote],
      body:        [t.family.body],
      'body-semi': [t.family['body-semi']],
      'body-bold': [t.family['body-bold']],
    },
    // W3: one line to swap to StyleSheet.hairlineWidth
    extend:{ borderWidth:{hairline:`${t.a11y.hairline}px`} },
  },
};

// ---- what the utilities now look like ----
// colour:  bg-surface-raised  text-fg-secondary  border-border-subtle
// size:    text-sm  (size+lh+tracking, NOT colour)
// weight:  font-body-semi     <- never font-semibold
// space:   p-6  gap-3  px-screen-x  py-screen-y   (keys are 0..12)
// radius:  rounded-lg  rounded-pill
//
// the three idioms, same literals:
// 1. <Text className="text-sm font-body text-fg-secondary" />
// 2. <Text {...t.txt('text-sm')} />
// 3. StyleSheet.create({body:{...t.txt('text-sm').style,
//                            color:t.color['fg-secondary']}})
```

🔴 **Do not build §6.1.** Compiled as written it emits **`text-text-sm`, not `text-sm`** (609
className usages resolve to nothing — **V1**), and it drops **63 spacing utilities** including
`h-px`, the auth hairline divider (**V3**). Both failures are silent: NativeWind discards an
unresolvable utility without a warning.

---

### 6.2 AS CORRECTED — 🟢 BUILD THIS

Corrections are marked `◀ C-x` inline and justified in §6.3. Everything not marked is byte-identical
to §6.1.

#### `theme.js` — corrected

```js
// theme.js — the single authored token file, plain CJS so both Metro and
// tailwind.config.js can require() it. Tailwind consumes it by spread, so className,
// inline style and StyleSheet.create resolve to the same literals and drift is
// structurally impossible (UI-audit §2.1, §7.1).
const color = {
  bg:'#100E0D', surface:'#171412',
  'surface-raised':'#1E1A17', 'surface-overlay':'#26211D',
  locked:'#2A2521',
  fg:'#F4EFE9',              // was text-primary
  'fg-secondary':'#C6BDB2',  // was text-secondary
  'fg-muted':'#8E867C',      // was text-muted
  'fg-placeholder':'#6B645C',
  'fg-disabled':'rgba(244,239,233,0.38)',
  'border-subtle':'rgba(244,239,233,0.07)',
  'border-strong':'rgba(244,239,233,0.16)',
  accent:'#D98E57', 'accent-muted':'rgba(217,142,87,0.14)',
  'accent-2':'#B3A6D9', 'accent-2-muted':'rgba(179,166,217,0.12)',
  'on-accent':'#1A1512',
  success:'#86A97B', warning:'#D9A657', danger:'#C8695E',
};

// ◀ C-g  its own namespace, exactly two values, BirthChartWheel.tsx ONLY (§11.4).
//        Absent from the authored block; present in §2's token table and §11.4.
const chart = { harmonious:'#7FA88F', tense:'#C08A7E' };

// families are keyed per weight — RN cannot synthesise
const family = {
  display:     'Literata-Bold',
  quote:       'Literata-Italic',
  body:        'Figtree-Regular',
  'body-semi': 'Figtree-SemiBold',
  'body-bold': 'Figtree-Bold',
};

// every ramp step names its family + whether it scales.
// The `text-` prefix on these keys is DELIBERATE and stays: txt('text-sm') and §3.3's
// ramp table read the same. It is stripped at the Tailwind boundary only — see C-a.
const type = {
  'display-lg':{size:30,lineHeight:34,letterSpacing:-0.6,family:'display',scales:false},
  'display-md':{size:24,lineHeight:29,letterSpacing:-0.4,family:'display',scales:false},
  'display-sm':{size:20,lineHeight:25,letterSpacing:-0.3,family:'display',scales:false},
  quote:       {size:17,lineHeight:26,letterSpacing:0,   family:'quote',  scales:true },
  'text-2xl':  {size:24,lineHeight:28,letterSpacing:-0.4,family:'body-bold',scales:false},
  'text-xl':   {size:20,lineHeight:26,letterSpacing:-0.2,family:'body-bold',scales:false},
  'text-lg':   {size:18,lineHeight:24,letterSpacing:0,   family:'body-semi',scales:true },
  'text-base': {size:16,lineHeight:22,letterSpacing:0,   family:'body-semi',scales:true },
  'text-sm':   {size:15,lineHeight:22,letterSpacing:0,   family:'body',   scales:true },
  'text-xs':   {size:13,lineHeight:19,letterSpacing:0,   family:'body',   scales:true },
  'text-2xs':  {size:12,lineHeight:16,letterSpacing:0.2, family:'body-semi',scales:false},
  overline:    {size:11,lineHeight:14,letterSpacing:1.3, family:'body-bold',scales:false},
};

// the ONE text helper. Returns a style object AND the prop.
// Decision (b): the global default is frozen, so a step
// only scales if it opts in here.
function txt(step){
  const t = type[step];
  return {
    style:{ fontSize:t.size, lineHeight:t.lineHeight,
            letterSpacing:t.letterSpacing,
            fontFamily:family[t.family] },
    allowFontScaling: t.scales,
    maxFontSizeMultiplier: t.scales ? 1.3 : 1,
  };
}
// ◀ C-i  🔴 SUPERSEDED IN PART BY OWNER RULING R-A (2026-08-03): THE WRAPPER IS DROPPED.
//        C-i's objection was that the authored usage line calls txt() twice per render:
//            <Text {...txt('text-sm')} style={[txt('text-sm').style, {…}]} />
//        That objection is GONE — pass 2b memoised txt(), so one frozen instance per step makes
//        the double call free and referentially stable. What remains legal is exactly two forms,
//        and there is no third:
//   the shipped idiom:  <Text {...txt('text-sm')} style={[txt('text-sm').style, {…}]} />
//   equivalent:         const s = txt('text-sm');
//                       <Text {...s} style={[s.style, {color:color['fg-secondary']}]} />

// ◀ C-b  `px` is the THIRTEENTH AUTHORING NAME (§4.2), not a legacy key: h-px is the
//        "or continue with" hairline on both auth screens (login.tsx:180,182 ·
//        signup.tsx:271,273). The authored block ships 12 keys and loses all four sites.
//        This also settles §4.2's open question — the inferred 13th name IS `px`.
const space  = {0:0,1:4,2:8,3:12,4:16,5:20,6:24,8:32,10:40,12:48,
                'screen-x':24,'screen-y':32, px:1};

// ◀ C-b  MIGRATION-ONLY RESOLUTION KEYS — DO NOT AUTHOR AGAINST THESE.
//        They exist so today's classes keep resolving until the outlier pass (§4.3)
//        retires their call sites with visual sign-off.
//        The values are TAILWIND'S (key × 4dp), NOT each key's own number. Writing
//        {14:14, 20:20, 48:48} would collapse every p-20/w-20/h-20 from 80px to 20px —
//        a silent 4× shrink with no build-time signal (§6.4 V3).
//        `30` is deliberately ABSENT: Tailwind 3 has no `30` key, so w-30/h-30 have
//        never resolved. profile.tsx:186,190 are sized by an adjacent inline
//        {width:120,height:120}; delete the two dead classes rather than adopt them.
//        This is the one place this file departs from the designer's trailing note,
//        which lists 30 among "every key the codebase resolves today". It does not.
const spaceLegacy = {0.5:2, 1.5:6, 14:56, 16:64, 20:80, 32:128, 48:192, 64:256};

const radius = {sm:8, md:14, lg:20, xl:28, pill:9999};
const motion = {
  duration:{instant:90,quick:140,base:220,moderate:300,slow:420,ambient:2600},
  easing:{standard:[0.32,0,0.24,1], enter:[0,0,0.22,1],
          exit:[0.4,0,1,1], linear:'linear'},
  distance:8, stagger:40, staggerCap:5,
};
const a11y = {tapMin:48, fontScaleMax:1.3, hairline:1};
module.exports = {color, chart, family, type, txt, space, spaceLegacy,
                 radius, motion, a11y};
```

#### `tailwind.config.js` — corrected

```js
// tailwind.config.js
const t = require('./theme');
const px = o => Object.fromEntries(
  Object.entries(o).map(([k,v]) => [k, `${v}px`]));

// ◀ C-a  Strip the ramp's `text-` prefix AT THIS BOUNDARY ONLY. Tailwind builds the
//        utility as `text-` + key, so a key of 'text-sm' emits `text-text-sm` and the
//        609 existing `text-sm`/`text-xs`/`text-base`/`text-lg`/`text-xl`/`text-2xl`
//        usages resolve to NOTHING (§6.4 V1). theme.type stays keyed as written.
const fontSize = Object.fromEntries(
  Object.entries(t.type).map(([k,s]) => [k.replace(/^text-/,''), [`${s.size}px`, {
    lineHeight: `${s.lineHeight}px`,
    letterSpacing: `${s.letterSpacing}px`,
  }]]));

module.exports = {
  content:['./app/**/*.{js,jsx,ts,tsx}',
           './components/**/*.{js,jsx,ts,tsx}'],
  presets:[require('nativewind/preset')],
  theme:{
    // defaults deleted so nothing legacy resolves. This is
    // hygiene, NOT the completeness proof — see the CI gate (§7).
    colors: {...t.color, chart: t.chart},          // ◀ C-g
    spacing: px({...t.space, ...t.spaceLegacy}),   // ◀ C-b  authoring + migration keys
    borderRadius: px(t.radius),
    fontSize,
    fontFamily:{
      display:     [t.family.display],
      quote:       [t.family.quote],
      body:        [t.family.body],
      'body-semi': [t.family['body-semi']],
      'body-bold': [t.family['body-bold']],
    },
    // W3: one line to swap to StyleSheet.hairlineWidth
    extend:{ borderWidth:{hairline:`${t.a11y.hairline}px`} },
  },
};

// ---- what the utilities now look like ----
// colour:  bg-surface-raised  text-fg-secondary  border-border-subtle
// size:    text-sm  (size+lh+tracking, NOT colour)
// weight:  font-body-semi     <- never font-semibold
// space:   p-6  gap-3  px-screen-x  py-screen-y   (keys are 0..12 + px)
// radius:  rounded-lg  rounded-pill
// chart:   text-chart-harmonious   <- BirthChartWheel.tsx only (§7 allow-list)
//
// the three idioms, same literals:
// 1. <Text className="text-sm font-body text-fg-secondary" />
// 2. <Text {...t.txt('text-sm')} />
// 3. StyleSheet.create({body:{...t.txt('text-sm').style,
//                            color:t.color['fg-secondary']}})
//
// NOT closed by this file, and NOT pixel-neutral — read §6.4 V2 (inlineRem) and
// C-k (radius name collision) and C-l (leading-*) before running passes 2 and 3.
```

---

### 6.3 The corrections — what changed and why

**Applied from the review list.** ✅ = validation confirmed the correction; ⚠️ = confirmed but
narrowed, with the reason.

| id | correction | verdict | evidence |
|---|---|---|---|
| **C-a** | `fontSize` keys have `^text-` stripped at the Tailwind boundary; `theme.type` keys unchanged | ✅ **applied** — the defect is real and total | **V1** |
| **C-b** | `spaceLegacy` as a separate commented object carrying **Tailwind's** values, `30` excluded, merged `spacing: px({...space, ...spaceLegacy})`, marked migration-only. Plus `px:1` restored to `space` as the 13th authoring name | ✅ **applied** | **V2, V3** |
| **C-c** | gate scans every source directory, plus an explicit assertion that `lib/colors.ts` is deleted | ⚠️ **applied, premise corrected** — only `lib/` holds any hex outside the scanned scope, and `lib/colors.ts` is the only file in it. It is **not** the largest reservoir (23 literals vs `astrology/index.tsx`'s 52); its leverage is **fan-out** — 54 of 93 files import it | **V6** |
| **C-d** | `no-legacy-tokens` extended to the retired custom names + `white`/`black` | ✅ **applied** — 565 className usages would otherwise pass the gate and resolve to nothing | **V6** |
| **C-e** | `no-raw-hex` gains a `BirthChartWheel.tsx` allow-list for `chart.harmonious`/`chart.tense` | ⚠️ **applied as a token allow-list, NOT a file exemption.** The two chart values are *token references*, which a hex grep never sees — so no exemption is needed for them. The designer's suggested `--glob '!BirthChartWheel.tsx'` would exempt the file's **11 existing raw hex literals** (lines 34–38, 78, 79, 91, 108, 123, 178) from the gate permanently | **V6** |
| **C-f** | `no-white-on-accent` added — the A5 floor | ⚠️ **applied in a corrected form.** As specified (`text-white` within ±4 lines of `bg-*`) it **misses both live sites it exists for** and returns 4 false positives out of 5 hits. Proximity is not nesting | **V8** |
| **C-g** | `theme.chart` added to the colour object | ✅ **applied** — without it `text-chart-harmonious` emits nothing | **V4** |
| **C-h** | `theme.d.ts` recommended beside `theme.js`; `theme.js` stays `.js` | ✅ **drafted in §6.5**, not created | — |
| **C-i** | note that `<Txt>` is preferred over the spread idiom | ✅ **applied** as a comment in the corrected `theme.js` | — |

**Additional corrections surfaced by the validation.** These were not on the review list; they are
recorded because dropping them would leave the same class of silent failure the list exists to catch.

| id | correction | evidence |
|---|---|---|
| **C-j** | `no-raw-hex` must also catch **`rgba()`/`rgb()`** (117 sites) and **CSS colour keywords** (81 sites — 80 `white`, 1 `black`). A hex-only grep leaves **198 colour literals** in place, so the real pass-1 colour surface is **~599, not 401**. `'transparent'` (8 sites) stays legal | **V6** |
| **C-k** | `no-legacy-radii` must also ban **`rounded-2xl`** (73 sites — it dies silently and the authored pattern omits it). And **`rounded-xl` (48 sites) / `rounded-lg` (1)** are legal names in **both** scales with **different values** — 10.5px→28px and 7px→20px — so **no grep can catch them**; pass 3 must rewrite all 49 call sites explicitly | **V7** |
| **C-l** | **45 `leading-*` usages** survive the config untouched (`theme.lineHeight` is not replaced) and would override the ramp's baked-in `lineHeight`. Either delete `theme.lineHeight` in the config or keep the gate clause | **V7** |

---

### 6.4 EVIDENCE

**Method.** A throwaway directory held `theme.authored.js` + `tailwind.authored.js` (verbatim §6.1,
with only the `content` glob and the two `require` paths absolutised) and the corrected pair. Both
were compiled by the repo's own `mobile/node_modules/tailwindcss@3.4.19` CLI through
`nativewind@4.2.4`'s preset over a content file listing every candidate utility, and the emitted CSS
rules were diffed. Repo counts come from re-running the audit's own methodology
(`className` attributes tokenised, template interpolations stripped) — where a count is comparable it
reproduces `UI-audit.md` exactly (404 hex hits − 3 HTML-entity false positives = **401**;
54/93 files importing `lib/colors`). Nothing in `mobile/` was modified; the directory was deleted.

#### V1 🔴 CONFIRMED — the `text-` prefix makes the six busiest ramp steps resolve to nothing

`fontSize` keys come straight from `t.type`, and Tailwind composes the utility as `text-` + key:

```
CANDIDATE         AS AUTHORED                      | AS CORRECTED
text-sm           — NOT EMITTED                    | font-size: 15px; line-height: 22px; …
text-xs           — NOT EMITTED                    | font-size: 13px; line-height: 19px; …
text-base         — NOT EMITTED                    | font-size: 16px; line-height: 22px; …
text-lg           — NOT EMITTED                    | font-size: 18px; line-height: 24px; …
text-xl           — NOT EMITTED                    | font-size: 20px; line-height: 26px; …
text-2xl          — NOT EMITTED                    | font-size: 24px; line-height: 28px; …
text-2xs          — NOT EMITTED                    | font-size: 12px; line-height: 16px; …
text-text-sm      font-size: 15px; line-height: …  | — NOT EMITTED
text-text-xs      font-size: 13px; …               | — NOT EMITTED
text-text-base    font-size: 16px; …               | — NOT EMITTED
text-text-lg      font-size: 18px; …               | — NOT EMITTED
text-text-xl      font-size: 20px; …               | — NOT EMITTED
text-text-2xl     font-size: 24px; …               | — NOT EMITTED
text-text-2xs     font-size: 12px; …               | — NOT EMITTED
```

**Why it is easy to miss: exactly half the ramp works either way.** The six steps whose keys carry no
prefix — `display-lg`, `display-md`, `display-sm`, `quote`, `overline` — emit correctly in **both**
versions. After the fix, all twelve resolve: `text-2xs`, `text-quote`, `text-overline`,
`text-display-md` and `text-display-lg` were each checked individually and each emits its size,
`lineHeight` and `letterSpacing`.

**Blast radius — current `className` usages of the six bare steps:**

| step | usages | files |
|---|---|---|
| `text-sm` | **220** | 41 |
| `text-xs` | 92 | 24 |
| `text-base` | 92 | 27 |
| `text-lg` | 83 | 38 |
| `text-xl` | 69 | 22 |
| `text-2xl` | 53 | 30 |
| **total** | **609** | — |

(~~`text-3xl`…`text-6xl`, a further 55 usages, are retired by the ramp regardless.~~ 🔴 **CORRECTED
2026-08-04 — THEY ARE NOT, AND `4xl` / `6xl` NEVER CAN BE.** Measured per key against the live tree:
`4xl` serves **4 pictographs + 5 type sites**, `6xl` serves **4 decorative marks + 1 type site**, and
`5xl` serves **exactly one numeral and no pictograph at all**. A pictograph's step is a DIMENSION —
there is nothing in a 30-point-ceiling ramp to move a 36- or 60-point emoji to — so deleting either
key would silently drop 8 pictographs to the platform default, which is `O-64` exactly. **The two
keys are PERMANENT; only the type sites riding them retire, per site.** 19 → 11 as of 2026-08-04,
8 of the 11 being the permanent pictograph class. The live per-key enumeration with owners is in
`token-gate.sh`'s `no-offramp-fontsize-class` block, not here.) All 609 would have
rendered at the platform default with no error, on 2.1.0's first build.

#### V2 🔴 **REFUTED — and this is the loud one.** The pixel-identity premise does not hold
#### ✅ **RESOLVED-BY-FLIP, 2026-07-29 — `inlineRem: 16` is now set. → read §6.6, not this section, for current values.**

> **What changed.** V2's finding stood and the owner acted on its recommendation: `mobile/metro.config.js`
> now passes `inlineRem: 16` alongside `{ input }`. **Everything V2 measured below is now HISTORY —
> it is the "before" column of §6.6.** The three consequences V2 drew are resolved as follows:
> **(1)** §4.1's dp readings are now literally true (corrected in place). **(2)** Pass 3's spacing
> half **is** pixel-identical now — 91/102 utilities, 1,246/1,276 usages, measured. **(3)** Pass 2's
> `fontSize` half **is** pixel-identical on size at every ramp step, and the ramp inversion is gone
> (`text-sm` 15 < `text-base` 16 < `text-lg` 18 < `text-xl` 20 < `text-2xl` 24). What V2 could not
> know, and §6.6 measures: the flip **inverts four radius mappings** and leaves every `text-*`
> **lineHeight** off by 2–4px. Do not read the numbers below as current.

The hypothesis has two halves. The first is true; the second is false, and the second is the one the
gate rests on.

**(a) Nominally, `px(t.space)` IS an exact subset of Tailwind 3's defaults.** Key by key:

| key | `px(t.space)` | Tailwind 3 default | nominal @16px root |
|---|---|---|---|
| 0 | `0px` | `0px` | 0 |
| 1 | `4px` | `0.25rem` | 4 |
| 2 | `8px` | `0.5rem` | 8 |
| 3 | `12px` | `0.75rem` | 12 |
| 4 | `16px` | `1rem` | 16 |
| 5 | `20px` | `1.25rem` | 20 |
| 6 | `24px` | `1.5rem` | 24 |
| 8 | `32px` | `2rem` | 32 |
| 10 | `40px` | `2.5rem` | 40 |
| 12 | `48px` | `3rem` | 48 |

Zero divergence. **But that comparison assumes a 16px rem root, and this app does not use one.**

**(b) NativeWind inlines `rem` at 14, not 16 — and `mobile/metro.config.js` does not override it.**

`withNativeWind(config, {...})` defaults `inlineRem = 14`
(`node_modules/nativewind/dist/metro/index.js:14`); `metro.config.js:6` passes only `{ input }`. Every
`rem`-valued utility in the app is therefore inlined at **14px per rem**. Verified end-to-end — the
repo's real config compiled by its own Tailwind, then that CSS fed through
`react-native-css-interop`'s `cssToReactNativeRuntime` at `inlineRem: 14`, i.e. the exact production
path:

```
utility     what RN actually receives today
  p-6        [{"padding":21}]          ← not 24
  p-4        [{"padding":14}]          ← not 16
  w-12       [{"width":42}]            ← not 48
  h-12       [{"height":42}]           ← not 48
  h-20       [{"height":70}]           ← not 80
  gap-3      [{"rowGap":10.5,"columnGap":10.5}]
  text-base  [{"fontSize":14,"lineHeight":21}]     ← not 16/24
  text-lg    [{"fontSize":15.75,"lineHeight":24.5}]
  text-xl    [{"fontSize":17.5,"lineHeight":24.5}]
  text-2xl   [{"fontSize":21,"lineHeight":28}]
  text-sm    [{"fontSize":15}]         ← explicit px in the config, so exact
  text-xs    [{"fontSize":13}]         ← explicit px in the config, so exact
```

**Three consequences, none of them recorded in §4.1 or §8:**

1. **§4.1's "key `6` = 24dp, key `12` = 48dp, key `64` = 256dp" is not what the app renders today.**
   It renders 21, 42 and 224. The design's dp readings are correct *for the new config* and wrong as
   a description of the baseline.
2. **Pass 3 is not pixel-identical.** Moving to an explicit-px scale is a uniform **×8/7 (+14.29%)**
   growth on every `className` spacing utility — **1,270 padding/margin usages plus the 151
   `w-/h-/gap-/inset-/top-…` usages**. Inline `style={{padding:20}}` objects (664 of them) do not
   move, so pairs that agree today will disagree after.
3. **Pass 2 is not pixel-identical either**, beyond the 28 fractional sites §3.5 accounts for.
   `text-base` 14→16, `text-lg` 15.75→18, `text-xl` 17.5→20, `text-2xl` 21→24 — **297 className
   sites** — while `text-sm` (220) and `text-xs` (92) are already explicit px and do not move at all.
   Note what that means about the baseline: **today `text-sm` (15) is LARGER than `text-base` (14)**
   and `text-lg` is 15.75. The ramp is inverted at the two busiest steps; the new config is what
   *fixes* it.

**Recommended sequencing — ✅ ACCEPTED AND DONE, 2026-07-29.** The owner took this recommendation;
the flip is committed on its own, ahead of any codemod. Reasons recorded in `metro.config.js`'s own
comment so nobody reverts it blind. Retained verbatim below because it is the argument for why the
flip is a separate commit, and that argument still governs passes 2–3.

**Recommended sequencing (owner decision, not made here).** Flip `inlineRem: 16` in
`metro.config.js` as its **own one-line, whole-app, trivially revertible commit** *before* passes 2
and 3. That isolates the ×8/7 rescale into a diff that can be eyeballed on device, after which the
px-valued config genuinely is pixel-identical and §8's gate means what it says. The alternative —
absorbing the rescale inside pass 3 — mixes a global visual change into a 300-site mechanical pass
and forfeits the gate. Either way the pixels move once; the choice is whether they move in a
reviewable commit or an unreviewable one.

#### V3 🔴 CONFIRMED — legacy keys must carry Tailwind's values, and `30` must not exist

Tailwind 3.4.19's own defaults, printed from `tailwindcss/defaultTheme`:

```
key    value      = px @16 root
0      0px          0px
0.5    0.125rem     2px
1.5    0.375rem     6px
14     3.5rem       56px
16     4rem         64px
20     5rem         80px
30     *** ABSENT (no such default key) ***
32     8rem         128px
48     12rem        192px
64     16rem        256px
px     1px          1px
```

Exactly the expectation: **2, 6, 56, 64, 80, 128, 192, 256, 1**. The full default scale is 35 keys
(`… 20 24 28 32 36 …`) and **`30` is not among them** — which is why `w-30 h-30` at
`profile.tsx:186,190` has never resolved, and why deleting both classes is safe: line 187 carries
`{width:120, height:120, borderRadius:60}` and line 190 carries `{width:120, height:120}`.

Writing each key's own number instead — `{14:14, 20:20, 48:48}` — would emit `p-20 → 20px` where
Tailwind means 80px: a **4× shrink** on every `p-20`/`w-20`/`h-20`, and a 3.5× shrink against what
the app renders today.

**Coverage check.** With `spacing: px({...space, ...spaceLegacy})` the corrected config emits **115
utility rules against the authored config's 89**. The 26 recovered: `h-px`, `w-px`, `p-0.5`, `p-1.5`,
`p-14`, `p-16`, `p-20`, `p-32`, `p-48`, `p-64`, `w-14/16/20/32/48/64`, `h-14/16/20/32/48/64`,
`top-16`, plus the three `chart` utilities and the seven fixed size steps. Every numeric spacing key
the codebase uses now resolves **except `30`**, which is intentional. The 59 `className` usages that
sit outside the 13-step authoring vocabulary — and would otherwise have silently dropped — are:

```
w-20 ×9  h-20 ×5  w-16 ×5  h-16 ×3  w-14 ×4  h-14 ×4  top-16 ×5  h-30 ×2  w-30 ×2
w-32 ×1  h-32 ×1  w-48 ×1  h-48 ×1  w-64 ×1  py-1.5 ×6  mb-1.5 ×5  py-0.5 ×2
mb-0.5 ×1  mt-0.5 ×1
```

Also confirmed present regardless: `w-full`, `h-full`, `w-3/4`, `w-5/6` come from Tailwind's
`width`/`height` scales, not `spacing`, and survive the replacement.

#### V4 ✅ CONFIRMED — colour and fontSize share the `text-*` namespace without colliding

```
colour keys  (21): bg surface surface-raised surface-overlay locked fg fg-secondary
                   fg-muted fg-placeholder fg-disabled border-subtle border-strong
                   accent accent-muted accent-2 accent-2-muted on-accent success
                   warning danger chart
fontSize keys(12): display-lg display-md display-sm quote 2xl xl lg base sm xs 2xs overline
INTERSECTION:      (empty)
```

Both resolve correctly in the same build: `text-fg-secondary` → `color: rgb(198 189 178 / …)`,
`text-sm` → `font-size: 15px; line-height: 22px; letter-spacing: 0px`. Tailwind reads the two
namespaces independently, so **the standing invariant is simply: never name a colour after a ramp
step.** `text-chart-harmonious` and `bg-chart-harmonious` both emit under C-g and neither emits
without it.

#### V5 ✅ CONFIRMED — the weight regex does not touch the new family utilities

`font-(thin|light|normal|medium|semibold|bold|extrabold|black)` against each candidate:

```
no     "font-body-semi"          no     "font-display"
no     "font-body-bold"          no     "font-quote"
no     "font-body"               no     "fontWeight"
MATCH  "font-semibold"   -> font-semibold
MATCH  "font-bold"       -> font-bold
MATCH  "font-medium"     -> font-medium
MATCH  "className=\"text-sm font-bold\""  -> font-bold
no     "className=\"text-sm font-body-bold text-fg\""
```

Zero false positives on the five family names. **And the regex does not match `fontWeight:`** — which
is why the authored gate's *separate* `fontWeight\s*:` line is load-bearing, not redundant: it is the
only thing covering the **173 inline weight declarations**, and pass 4's ~501-site count is
unenforceable without it.

#### V6 ⚠️ PARTLY REFUTED — the scope gap is real; the reason for it is not volume

Raw hex per source directory (`.ts`/`.tsx`, `node_modules` excluded):

| directory | files | files with ≥1 hex | hex literals | in gate scope? |
|---|---|---|---|---|
| `app` | 41 | 27 | **276** | ✅ scanned |
| `components` | 52 | 31 | **128** | ✅ scanned |
| `lib` | 17 | **1** | **23** | 🔴 **not scanned** |
| `store` | 10 | 0 | 0 | — |
| `services` | 9 | 0 | 0 | — |
| `hooks` | 5 | 0 | 0 | — |
| `utils` | 2 | 0 | 0 | — |
| `types` | 1 | 0 | 0 | — |
| root `.ts` | 3 | 0 | 0 | — |

`app` + `components` = 404 raw hits − the 3 HTML-entity false positives
(`numerology/index.tsx:683` `&#10024;`, `name-destiny.tsx:449` `&#10003;`, `:461` `&#8226;`) =
**401**, reproducing the audit exactly.

**The single file outside scope is `lib/colors.ts`** — 23 literals, 21 distinct values, and the only
file in `lib/` with any hex at all. So the gap is real and the deletion assertion (C-c) is right, but
**the stated reason is wrong**: at 23 literals it is nowhere near the largest reservoir
(`astrology/index.tsx` alone has 52). Its danger is **reach** — **54 of 93 files import it**, so it
would keep the old palette alive in over half the app while passing a gate that never looks at it.
The `--glob '!theme.js'` exclusion in the authored rule is a no-op for the same reason in reverse:
`theme.js` sits at `mobile/` root, outside `app components`.

**Two further reservoirs no `.ts`/`.tsx` scan can see**, both of which must flip with Vellum:
`mobile/tailwind.config.js` (13 hex — replaced wholesale) and **`mobile/app.json` (2 — `#0F0A1A` at
:16, `#2D1B4E` at :39)**, the splash and adaptive-icon colours.

**And hex is not the whole surface (C-j).** In `app` + `components`:

```
rgba( / rgb( literals                        117
CSS keyword colours (color:/…Color=)          81      (80 white, 1 black)
'transparent'  (legitimate)                    8
```

**198 colour literals that a hex-only grep cannot see**, on top of the 401. The
`rgba(255,255,255,0.05–0.08)` overlays are exactly the ones §4.5 maps onto `surface-raised`, and the
80 `color: 'white'` sites are exactly what A5 is about. **Pass 1's real colour surface is ~599.**

#### V7 🔴 NEW — the radius namespace has the same collision as V1, and no grep can see it

Surfaced while checking C-k. `borderRadius` is replaced, but four of the five new names already exist
in Tailwind's defaults with different values:

| class | today (nominal) | today (rendered @14) | new scale | usages | verdict |
|---|---|---|---|---|---|
| `rounded-sm` | 2px | 1.75px | **8px** | 0 | value change, no sites |
| `rounded-md` | 6px | 5.25px | **14px** | 0 | value change, no sites |
| `rounded-lg` | 8px | 7px | **20px** | **1** | 🔴 **silent value change** |
| `rounded-xl` | 12px | 10.5px | **28px** | **48** | 🔴 **silent value change** |
| `rounded-2xl` | 16px | 14px | *does not resolve* | **73** | 🔴 **dies silently** |
| `rounded-3xl` | 24px | 21px | *does not resolve* | 4 | caught by the gate |
| `rounded-full` | 9999px | 9999px | *does not resolve* | 81 | caught by the gate |
| bare `rounded` | 4px | 3.5px | *does not resolve* | 4 | caught by the gate |

Two distinct problems. **`rounded-2xl` (73 sites in 28 files) dies silently and the authored pattern
does not list it** — add it (C-k). **`rounded-xl` (48) and `rounded-lg` (1) are unfixable by grep**:
the name is legal in both scales, so nothing distinguishes an unmigrated `rounded-xl` at 10.5px from
an intentional new one at 28px. Those 49 sites must be rewritten explicitly in pass 3 and the diff
read. One consolation: **`rounded-2xl` → `rounded-md` is exactly pixel-identical today**
(14px = 14px at `inlineRem: 14`), so the busiest radius migration is free.

> 🔴 **THE CONSOLATION IS GONE — corrected 2026-07-29, and it is the single most important reversal
> caused by the flip.** `rounded-2xl` is `1rem`, so it followed the flip: **14px → 16px**, while
> `radius.md` is a literal `14`. `rounded-2xl → rounded-md` was exactly identical at `inlineRem: 14`
> and is now **−2px across all 73 sites in 28 files.** The **radius column is the one place the flip
> made mappings worse rather than better** — `rounded-3xl → rounded-lg` also degrades (−1px → −4px).
> Two improve: `rounded-lg → rounded-sm` becomes *exactly* identical (7→8 became 8→8), and
> `rounded-xl → rounded-md` narrows from +3.5px to +2px. Nothing about the 49-site "no grep can see
> it" problem changes. Per-utility numbers: **§6.6**.
>
> C-l's `leading-*` half is now measured rather than asserted, **including which of the 45 sites are
> no-ops today** (8 of them are). See §6.6 and the new **`no-leading-utilities`** rule in §7.2.

**Same class of problem, third namespace (C-l).** `theme.lineHeight` is *not* replaced, so all 14
default `leading-*` keys survive: `leading-5` ×25, `leading-6` ×13, `leading-4` ×4, `leading-7` ×2,
`leading-8` ×1 — **45 usages** that would override the `lineHeight` the ramp bakes into every
`text-*` step, at rem-scaled values (`leading-5` = 17.5px today, 20px after any `inlineRem` flip).

#### V8 ⚠️ C-f CONFIRMED IN NEED, REFUTED AS SPECIFIED — the proximity form misses both live sites

Run as designed — `text-white` within ±4 lines of `bg-gold`/`bg-accent`/`bg-warning`/`bg-success`/
`bg-danger` — the rule returns **5 hits, of which 4 are correct code**:

```
app/(main)/home.tsx:305      bg-gold circle, contains only 🔢; the text-white at +4 is a SIBLING
(paywall)/index.tsx:176      bg-gold pill; the pill's own label at :177 is text-black ✅
(paywall)/index.tsx:202      bg-gold CTA; <ActivityIndicator color="#FFFFFF" /> at +3   ← TRUE
components/insights/WeeklyDayCard.tsx:30   bg-gold pill; its label at :31 is text-black ✅
components/subscription/PremiumBadge.tsx:9 'bg-gold' pairs with 'text-black'; 'bg-pink' with white ✅
```

**Proximity is not nesting** — four of five hits are a white foreground *beside* a filled element,
not on it. Worse, both sites §2.2 names are effectively missed:

- **The paywall CTA label** (`text-white` at `:208` and `:211`) is **6 and 9 lines** from its fill at
  `:202`. The site is only flagged at all because the loading spinner happens to sit at +3.
- **The astrology-hub generate CTA is never flagged, at any window size.** Two independent reasons:
  its fill is an inline ternary — `backgroundColor: isLoadingBirthChart ? '#92722D' : '#F59E0B'` at
  `astrology/index.tsx:378` — which no `bg-*` pattern matches; and its foreground is the bare
  keyword `color: 'white'` (`:388`, `:390`, `:392`), which `text-white` does not match either.
  Widening the window to ±20 does not help; widening the foreground pattern to include `'white'`
  raises the hit count from 5 to 13 and still misses it.

**Therefore `no-white-on-accent` is specified in §7 as a REVIEW TRIGGER with an allow-list, not a
must-be-zero rule** — and the A5 floor's real structural enforcement is `no-legacy-tokens`: once the
defaults are deleted, `text-white` and `text-black` resolve to nothing at all **299 + 8** sites, so
the className half of the violation cannot survive the codemod. The proximity trigger's job is the
inline-style half — the 80 `color: 'white'` and 55 `'#FFFFFF'` literals — which no token gate can
reason about.

---

### 6.5 C-h — the `theme.d.ts` recommendation (draft only; do not create it yet)

`theme.js` **stays `.js`** so `tailwind.config.js` can `require()` it with no loader and Metro needs
no transform. A sibling declaration file gives every token name to the **existing `tsc --noEmit`
gate** at zero runtime cost — worth it at ~501 pass-4 edits plus ~599 colour edits, where a typo'd
`fg-secondry` is otherwise invisible until someone looks at the screen.

```ts
// theme.d.ts — declaration only. theme.js remains the single runtime source.
export type ColorToken =
  | 'bg' | 'surface' | 'surface-raised' | 'surface-overlay' | 'locked'
  | 'fg' | 'fg-secondary' | 'fg-muted' | 'fg-placeholder' | 'fg-disabled'
  | 'border-subtle' | 'border-strong'
  | 'accent' | 'accent-muted' | 'accent-2' | 'accent-2-muted' | 'on-accent'
  | 'success' | 'warning' | 'danger';

export type ChartToken = 'harmonious' | 'tense';

export type FamilyToken = 'display' | 'quote' | 'body' | 'body-semi' | 'body-bold';

export type TypeStep =
  | 'display-lg' | 'display-md' | 'display-sm' | 'quote'
  | 'text-2xl' | 'text-xl' | 'text-lg' | 'text-base' | 'text-sm' | 'text-xs'
  | 'text-2xs' | 'overline';

export type SpaceToken =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 'screen-x' | 'screen-y' | 'px';

export type RadiusToken = 'sm' | 'md' | 'lg' | 'xl' | 'pill';
export type DurationToken = 'instant' | 'quick' | 'base' | 'moderate' | 'slow' | 'ambient';
export type EasingToken = 'standard' | 'enter' | 'exit' | 'linear';

export interface TypeSpec {
  size: number;
  lineHeight: number;
  letterSpacing: number;
  family: FamilyToken;
  scales: boolean;
}

export interface TxtResult {
  style: {
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    fontFamily: string;
  };
  allowFontScaling: boolean;
  maxFontSizeMultiplier: number;
}

export const color: Record<ColorToken, string>;
export const chart: Record<ChartToken, string>;
export const family: Record<FamilyToken, string>;
export const type: Record<TypeStep, TypeSpec>;
export function txt(step: TypeStep): TxtResult;
export const space: Record<SpaceToken, number>;
/** migration-only — do not author against these (§6.2, C-b) */
export const spaceLegacy: Record<string, number>;
export const radius: Record<RadiusToken, number>;
export const motion: {
  duration: Record<DurationToken, number>;
  easing: { standard: number[]; enter: number[]; exit: number[]; linear: 'linear' };
  distance: number;
  stagger: number;
  staggerCap: number;
};
export const a11y: { tapMin: number; fontScaleMax: number; hairline: number };
```

**Note the deliberate asymmetry**: `space` is typed and `spaceLegacy` is `Record<string, number>`.
Authoring against a legacy key should not autocomplete. It also cannot be *banned* by types, because
the keys exist at runtime by design — the ban lives in the comment and in review.

`SpaceToken` does not describe `theme.spacing` as Tailwind receives it (that object also carries the
eight `spaceLegacy` keys). It describes what a human may type.

---

### 6.6 🟢 POST-FLIP BASELINE — every mapping recomputed at `inlineRem: 16`

> **This section supersedes §6.4 V2 and V7's radius consolation, and it is the authority for what
> passes 2 and 3 can claim.** Where any earlier section states a rendered pixel value, this one wins.

**The change.** `mobile/metro.config.js:6` now reads
`withNativeWind(config, { input: './global.css', inlineRem: 16 })`. `inlineRem` is a **top-level
sibling of `input`**, not a nested key — verified against the installed package, not assumed
(`nativewind/dist/metro/index.js:14` destructures `{ input, inlineRem = 14, … }`; the type is
`number | false` at `react-native-css-interop/dist/types.d.ts:28`). It is the **only** product file
touched. `npx tsc --noEmit` clean on `mobile/` and `server/`.

**Method.** The repo's own `tailwind.config.js` compiled by the repo's own `tailwindcss@3.4.19` CLI
through `nativewind@4.2.4`'s preset **over its real `content` globs** — no candidate list, no
substituted config — then the emitted CSS fed through `react-native-css-interop`'s
`cssToReactNativeRuntime` at `inlineRem: 14` and `16`, and every emitted rule diffed. That is
byte-for-byte the production path: `withCssInterop` holds the options object in a closure and hands
it straight to `cssToReactNativeRuntime` (`react-native-css-interop/dist/metro/index.js:69,76,168`),
which is why `inlineRem` never appears on the resolved Metro config object. Usage counts come from
re-parsing all 93 `.tsx` files' `className` attributes as **balanced expressions**, so the three
ternary-valued attributes (`birth-data.tsx:238,:268`, `FocusAreaBadge.tsx:27`) are counted — the
small deltas against §6.4's figures (`text-sm` 218 vs 220) are that.

#### A · The complete flip surface — what actually moved

**107 of the 225 rules the real config emits changed value. 118 did not.** Every changed rule, by
family, with its `className` usage count:

| family | rules moved | className usages |
|---|---|---|
| padding / margin | 57 | **1,118** |
| width / height | 21 | 84 |
| **fontSize** | 8 | **351** |
| inset / top / right / bottom / left | 7 | 24 |
| **borderRadius** | 5 | **130** |
| **lineHeight (`leading-*`)** | 5 | **45** |
| gap | 2 | 9 |
| `max-w-sm` / `max-w-md` | 2 | 2 |
| **total** | **107** | **1,763** |

**Unchanged, and therefore proof the flip is confined to `rem`:** every colour utility, `border-2`,
`z-10`, `flex-1`, `opacity-80`, `rounded-full`, `w-full`, `h-full`, `w-3/4`, `w-5/6`, `h-px`,
`inset-0`, `left-0`, `right-0`, `mb-0`, `ml-auto`, `p-[2px]`, `text-sm`, `text-xs`.

🔴 **`max-w-sm` / `max-w-md` are the one family nobody predicted.** `theme.maxWidth` is *not*
replaced by §6.2's config, so those two sites (`SunSignReveal.tsx`, one other) stay `rem`-valued
**permanently** — 336→**384** and 392→**448** at the flip, and still `inlineRem`-dependent after the
codemod. The design's "the config is explicit px throughout so `inlineRem` goes inert" is true of
spacing, radius and fontSize; it is **not** true of `maxWidth` or `lineHeight`.

#### B · SPACING — the flip's payoff. 91 of 102 utilities become pixel-identical

One row per spacing **key** (every `p-/m-/gap-/w-/h-/inset-/top-/right-/bottom-/left-` utility on a
key renders the same number). "new px" is `px({...t.space, ...t.spaceLegacy})` from §6.2.

| key | rendered @14 | rendered @16 | new token px | usages | identical post-flip? | utilities |
|---|---|---|---|---|---|---|
| `4` | 14 | **16** | 16 | 309 | ✅ | `mb-4`×140 `px-4`×52 `p-4`×31 `mr-4`×21 `mt-4`×17 `py-4`×14 `pt-4`×13 `pb-4`×7 `right-4`×4 `top-4`×4 `mx-4`×3 `h-4`×2 `ml-4`×1 |
| `6` | 21 | **24** | 24 | 266 | ✅ | `mb-6`×103 `px-6`×91 `p-6`×44 `pb-6`×8 `left-6`×7 `pt-6`×5 `py-6`×3 `my-6`×2 `h-6`×1 `mt-6`×1 `right-6`×1 |
| `3` | 10.5 | **12** | 12 | 250 | ✅ | `mb-3`×138 `py-3`×45 `px-3`×16 `p-3`×13 `mr-3`×12 `gap-3`×7 `mt-3`×7 `ml-3`×4 `pt-3`×3 `h-3`×2 `mx-3`×1 `pb-3`×1 `pr-3`×1 |
| `2` | 7 | **8** | 8 | 188 | ✅ | `mb-2`×103 `mr-2`×37 `mt-2`×15 `py-2`×11 `h-2`×6 `ml-2`×4 `px-2`×4 `p-2`×3 `gap-2`×2 `mx-2`×2 `pt-2`×1 |
| `1` | 3.5 | **4** | 4 | 72 | ✅ | `mb-1`×41 `mt-1`×16 `py-1`×10 `mr-1`×2 `px-1`×2 `p-1`×1 |
| `8` | 28 | **32** | 32 | 38 | ✅ | `mb-8`×21 `mt-8`×5 `pb-8`×3 `bottom-8`×2 `h-8`×2 `p-8`×2 `w-8`×2 `py-8`×1 |
| `12` | 42 | **48** | 48 | 35 | ✅ | `h-12`×16 `w-12`×16 `mb-12`×2 `top-12`×1 |
| `5` | 17.5 | **20** | 20 | 22 | ✅ | `p-5`×18 `mb-5`×2 `h-5`×1 `w-5`×1 |
| `full` | 100% | 100% | — | 17 | ⚪ inert — from `theme.width/height`, not `spacing` | `w-full`×12 `h-full`×5 |
| `20` | 70 | **80** | 80 | 14 | ✅ | `w-20`×9 `h-20`×5 |
| `16` | 56 | **64** | 64 | 13 | ✅ | `top-16`×5 `w-16`×5 `h-16`×3 |
| `1.5` | 5.25 | **6** | 6 | 11 | ✅ | `py-1.5`×6 `mb-1.5`×5 |
| `14` | 49 | **56** | 56 | 8 | ✅ | `h-14`×4 `w-14`×4 |
| `0` | 0 | 0 | 0 | 7 | ✅ (trivially) | `inset-0`×5 `left-0`×1 `right-0`×1 |
| `px` | 1 | 1 | 1 | 4 | ✅ — **`h-px` is `1px` literal, so the auth dividers never moved** | `h-px`×4 |
| `0.5` | 1.75 | **2** | 2 | 4 | ✅ | `py-0.5`×2 `mb-0.5`×1 `mt-0.5`×1 |
| `30` | — | — | *absent by design* | 4 | 🔴 **dead at BOTH baselines** | `h-30`×2 `w-30`×2 |
| `32` | 112 | **128** | 128 | 2 | ✅ | `h-32`×1 `w-32`×1 |
| `48` | 168 | **192** | 192 | 2 | ✅ | `h-48`×1 `w-48`×1 |
| `auto` | auto | auto | — | 2 | ⚪ inert | `ml-auto`×2 |
| `space-y-3` | — | — | n/a | 2 | 🔴 **dead at BOTH baselines — and it stays dead** | `space-y-3`×2 |
| `64` | 224 | **256** | 256 | 1 | ✅ | `w-64`×1 |
| `max-w-md` | 392 | **448** | 448 (Tailwind default, kept) | 1 | ⚠️ moved, stays rem-valued | `max-w-md`×1 |
| `max-w-sm` | 336 | **384** | 384 (Tailwind default, kept) | 1 | ⚠️ moved, stays rem-valued | `max-w-sm`×1 |
| `[2px]` | 2 | 2 | 2 | 1 | ⚪ inert — arbitrary value | `p-[2px]`×1 |
| `3/4` · `5/6` | 75% · 83.33% | unchanged | — | 2 | ⚪ inert | `w-3/4`×1 `w-5/6`×1 |

**Verdict — spacing is now genuinely pixel-identical.**

| | utilities | usages |
|---|---|---|
| **IDENTICAL post-flip** | **91** | **1,246** |
| inert / not from `theme.spacing` | 8 | 24 |
| **non-identical (any delta)** | **0** | **0** |
| dead at both baselines | 3 | 6 |

**Zero spacing utilities carry a visual delta into pass 3.** Before the flip every one of those
1,246 usages did (+14.29%). This is the whole return on the one-line change.

🔴 **`space-y-3` is a second live dead class, and it is NOT a scale problem.** Tailwind emits
`.space-y-3 > :not([hidden]) ~ :not([hidden])`; `react-native-css-interop` cannot express a
sibling combinator, so the rule is **absent from the runtime rule set at both baselines** — verified
directly, not inferred. Unlike `w-30`/`h-30`, **sizing the new scale correctly does not fix it**:
`space-y-*` can never work under NativeWind 4. The two sites (2 files) must be rewritten as `gap-3`
on the parent — a **behavioural** fix, not a token migration, and one no gate in §7.2 catches.
`space-x-*`, `translate-*`, `size-*` have zero usages, so this is the whole exposure.

#### C · RADII — 🔴 the one column the flip made *worse*

`borderRadius` is the exception to everything above: four of the six mappings changed verdict, and
the busiest one changed from free to costly.

| class | rendered @14 | rendered @16 | → new token | new px | usages / files | identical @14? | **identical post-flip?** | Δ post-flip |
|---|---|---|---|---|---|---|---|---|
| `rounded-full` | 9999 | 9999 | `rounded-pill` | 9999 | 81 / 28 | ✅ | ✅ **yes** | 0 |
| **`rounded-2xl`** | **14** | **16** | `rounded-md` | 14 | **73 / 28** | ✅ **was free** | 🔴 **NO** | **−2px** |
| `rounded-xl` | 10.5 | 12 | `rounded-md` | 14 | 48 / 18 | ❌ (+3.5) | ❌ no | **+2px** *(improved from +3.5)* |
| `rounded` (bare) | 3.5 | 4 | `rounded-sm` | 8 | 4 / 2 | ❌ (+4.5) | ❌ no | **+4px** |
| `rounded-3xl` | 21 | 24 | `rounded-lg` | 20 | 4 / 4 | ❌ (−1) | ❌ no | **−4px** *(degraded from −1)* |
| `rounded-lg` | 7 | 8 | `rounded-sm` | 8 | 1 / 1 | ❌ (+1) | ✅ **yes** | 0 *(improved to exact)* |

**Reading it:** the flip helps `rounded-lg` (now exact) and `rounded-xl` (+3.5→+2), and hurts
`rounded-2xl` (0→−2) and `rounded-3xl` (−1→−4). **Net: 77 of the 211 radius usages are pixel-identical
post-flip (`rounded-full` 81 → wait, 82 of 211: `rounded-full` 81 + `rounded-lg` 1), and 125 carry a
2–4px delta.** Corner radius at 2px on a 16px corner is at the edge of perceptible; the deep plan
should treat the 73 `rounded-2xl` sites as **one reviewable visual decision**, not 73.

⚠️ **The 49-site grep-blindness (C-k) is unchanged by the flip.** `rounded-xl` (48) and `rounded-lg`
(1) remain legal names in both scales, so pass 3 still rewrites all 49 explicitly.

#### D · fontSize — the inversion is gone; every SIZE is now identical; every LINE-HEIGHT is not

| class | rendered @14 | rendered @16 | → ramp step | new size/lh | usages / files | size identical post-flip? | lineHeight Δ post-flip |
|---|---|---|---|---|---|---|---|
| `text-sm` | 15 / *(none)* | 15 / *(none)* | `text-sm` | **15 / 22** | 218 / 41 | ✅ (never moved) | 🔴 **gains 22 where it has none today** |
| `text-base` | 14 / 21 | **16 / 24** | `text-base` | **16 / 22** | 91 / 28 | ✅ | **−2** |
| `text-xs` | 13 / *(none)* | 13 / *(none)* | `text-xs` | **13 / 19** | 91 / 24 | ✅ (never moved) | 🔴 **gains 19 where it has none today** |
| `text-lg` | 15.75 / 24.5 | **18 / 28** | `text-lg` | **18 / 24** | 83 / 38 | ✅ | **−4** |
| `text-xl` | 17.5 / 24.5 | **20 / 28** | `text-xl` | **20 / 26** | 69 / 23 | ✅ | **−2** |
| `text-2xl` | 21 / 28 | **24 / 32** | `text-2xl` | **24 / 28** | 53 / 30 | ✅ | **−4** |
| `text-3xl` | 26.25 / 31.5 | **30 / 36** | `display-lg` | **30 / 34** | 25 / 20 | ✅ | **−2** |
| `text-4xl` | 31.5 / 35 | **36 / 40** | 🔴 none | — | 18 / 17 | — | **above the ramp ceiling (30)** |
| `text-6xl` | 52.5 | **60** | 🔴 none | — | 10 / 8 | — | same |
| `text-5xl` | 42 | **48** | 🔴 none | — | 2 / 2 | — | same |

**✅ The ramp inversion is fixed, measured:** `text-xs` 13 < `text-sm` 15 < `text-base` **16** <
`text-lg` **18** < `text-xl` **20** < `text-2xl` **24**. Before the flip it read 13 < 15 > **14** <
15.75 < 17.5 < 21 — `text-sm` larger than `text-base`, and `text-lg` (15.75) barely above `text-sm`.

**🟢 Every ramp step's SIZE is now pixel-identical**, across 630 of the 660 `text-*` usages. Pass 2's
size half is a literal no-op at all seven mapped steps. That claim was false before the flip at four
of them (`text-base` 14→16, `text-lg` 15.75→18, `text-xl` 17.5→20, `text-2xl` 21→24).

**🔴 But lineHeight is where pass 2's real pixel movement now lives, and it is bigger than the size
movement ever was.** Two distinct effects:

1. **`text-sm` (218) and `text-xs` (91) emit NO `lineHeight` at all today** — the config overrides
   them as bare `'15px'`/`'13px'` strings, so RN falls back to the font's own metrics (≈17.6 and
   ≈15.2 on Roboto). The ramp bakes **22** and **19**. That is roughly **+4.4px and +3.8px of leading
   per line on 309 sites** — **the single largest vertical change in the entire revamp**, and it
   belongs to **pass 2**, not to this flip.
2. The five steps that do emit one all **shrink** by 2–4px (`text-lg` −4, `text-2xl` −4). So paragraph
   blocks in `text-sm`/`text-xs` get taller while headings get tighter — which is the intended
   editorial rhythm, but it means **"pass 2 is pixel-identical" is only true of `fontSize`. Say so
   in the gate wording, and expect every `minHeight` floor in the app to be crossed.**

`text-4xl`/`5xl`/`6xl` (30 usages, 27 files) have **no ramp target** — the ramp ceiling is
`display-lg` 30. These are per-site decisions in pass 2, not mechanical rewrites, and the design
never enumerated them.

#### E · `leading-*` — all 45 moved, and 8 of them are no-ops

| class | @14 | @16 | usages | pairs with | status **today** |
|---|---|---|---|---|---|
| `leading-5` | 17.5 | **20** | 25 | `text-sm` ×25 | 🔴 **load-bearing** — `text-sm` emits no lineHeight, so this is the only one |
| `leading-6` | 21 | **24** | 13 | `text-base` ×6 · `text-sm` ×5 · unpaired ×2 | ⚪ **no-op on the 6 `text-base` sites** (Tailwind's `text-base` lineHeight *is* `1.5rem` = `leading-6`, at both baselines) · load-bearing on the 5 `text-sm` sites |
| `leading-4` | 14 | **16** | 4 | `text-xs` ×4 | 🔴 load-bearing — `text-xs` emits no lineHeight |
| `leading-7` | 24.5 | **28** | 2 | `text-lg` ×2 | ⚪ **no-op** (Tailwind's `text-lg` lineHeight *is* `1.75rem` = `leading-7`) |
| `leading-8` | 28 | **32** | 1 | `text-xl` ×1 | 🔴 load-bearing (+3.5 @14, +4 @16 over `text-xl`'s own 1.75rem) |

**43 of 45 pair with a `text-*` step; 8 of those (6 × `text-base leading-6`, 2 × `text-lg leading-7`)
do nothing at all** — they restate the value Tailwind already emits. The other 37 genuinely override.
All 45 moved +14.29% at the flip because `leading-*` is `rem`-valued.

🟢 **Decision recorded (§7.2): delete `theme.lineHeight` in `tailwind.config.js` so `leading-*` stops
resolving entirely.** Rationale: the ramp bakes a `lineHeight` into all twelve steps, and a surviving
`leading-*` overrides exactly the thing the ramp exists to guarantee — on the app's densest reading
copy. Deleting the scale converts an invisible override into a **removed utility**, which the new
`no-leading-utilities` rule can then prove is gone. Post-deletion the 25 `text-sm leading-5` sites go
20 → **22** (the ramp's) and the 4 `text-xs leading-4` sites 16 → **19**.

---

### 6.6.1 🟢 FIXED-HEIGHT COLLISION SURVEY — X3, X11–X19 · **0 TIGHT, 0 OVERFLOW from the flip**

**The brief's premise was that X11–X19 are pixel heights whose contents are `className`-sized, so the
flip grows the contents 14.29% inside containers that do not grow. Measured, that premise is false for
every fixed-height container in the register — and the reason is worth stating, because it also tells
pass 2 exactly where to look.**

> **🟢 Finding: every truly fixed-`height` container in X3/X11–X19 sizes its contents with INLINE
> `fontSize:` numbers, which `inlineRem` does not touch. Their content height changes by exactly 0
> at the flip, so their headroom is unchanged — not "probably fine", unchanged.** The `className`-sized
> surfaces in the register are, without exception, `minHeight` **floors**, which cannot overflow: content
> growth pushes past the floor and the container expands. **Result: 0 TIGHT, 0 OVERFLOW from the flip.**

Line references re-located by symbol/string per I-9; where they differ from the register the measured
line is given. Content heights marked ≈ depend on RN's font-metric default `lineHeight` when unset
(≈1.17 × fontSize on Roboto, ≈1.19 on iOS SF) — every **Δ** and every **headroom on an inline-sized
container is exact regardless**, because the term cancels.

| # | surface | container | contents sized by | content @14 | content @16 | Δ | headroom post-flip | verdict |
|---|---|---|---|---|---|---|---|---|
| **X3** | `Button.tsx` `SIZE_HEIGHT` sm/md/lg | **fixed** `height: 48 / 56 / 64` | **inline** — `TEXT_SIZE` 14/16/18, no internal padding, `justifyContent:'center'` | ≈16 / ≈19 / ≈21 | identical | **0** | ≈32 / ≈37 / ≈43 | 🟢 **SAFE** |
| **X11** | `StreakBadge.tsx:13-17` | **fixed** `height: 28 / 36 / 48`, `borderRadius: cfg.height/2` | **inline** — `emoji` 14/18/22, `number` 13/15/19, `label` 11/12/14 | ≈16 / ≈21 / ≈26 | identical | **0** | ≈12 / ≈15 / ≈22 | 🟢 **SAFE** |
| **X12** | `AstroNumeroBadge.tsx:15-19` | **fixed** `height: 44 / 56 / 88` | **inline** — and the dominant child is the `numberSize` **circle 32 / 40 / 56**, a dimension not a type | **32 / 40 / 56** | identical | **0** | **12 / 16 / 32** | 🟢 **SAFE** |
| | ↳ its `width:1 height:32` divider (`:88`) | fixed 32 in the 44-tall badge | inline | 32 | 32 | 0 | 12 | 🟢 SAFE |
| **X18** | `(main)/_layout.tsx:10-24` tab bar | **fixed** `height:85`, `paddingBottom:24`, `paddingTop:8` | **inline** `tabBarLabelStyle.fontSize: 11`, `marginTop: 2`; icon size from the navigator's `size` prop | ≈71 | identical | **0** | ≈14 | 🟢 **SAFE** |
| **X17** | `GeneratingReading.tsx:452-466` rotating message | `minHeight: 44` (**floor**) | **inline** `fontSize:16, lineHeight:22` | **44 = exactly 2 lines** | identical | **0** | exact | 🟢 **SAFE** |
| **X13a/b** | `home.tsx:105`, `:139` Face/Palm tiles | **fixed** `height: 140` ×2 | **inline** — gradient `padding:16`, emoji `fontSize:40 marginBottom:8`, label `fontSize:16` | ≈106 | identical | **0** | ≈34 | 🟢 **SAFE** |
| **X13c** | `home.tsx:203` "This Month" | `minHeight: 200` (**floor**) | 🔴 **className** — `p-6` + `text-lg`/`text-sm`/`text-xs` + `mb-2/3/1` + `mt-3` | ≈207 *(2 key dates)* | ≈223 | **+16** | floor already exceeded | 🟢 **SAFE (floor)** |
| **X13d** | `home.tsx:528` recent-reading `Card` | `minHeight: 72` (**floor**), `justifyContent:'center'` | mixed — `Card`'s `p-4` is className; the **44×44 icon well is inline and dominates** | 28 + 44 = **72 exactly** | 32 + 44 = **76** | **+4** | crosses the floor | 🟢 **SAFE (floor)** — but note the `72` stops being load-bearing |
| **X14** | `readings/index.tsx` ×7 (`:132,160,190,220,259,299,341`) | `minHeight: 140` (**floor**), `padding:24` inline | mixed — 56×56 well + emoji inline; `text-xl` title, `text-sm` subtitle, `mb-3`, pill `py-3 px-4` className | ≈152 | ≈156 | **+4.5** | already exceeded | 🟢 **SAFE (floor)** |
| **X15** | `numerology/index.tsx:674` | `minHeight: 140` (**floor**), `padding:24` inline | same shape as X14 | ≈152 | ≈156 | **+4.5** | already exceeded | 🟢 **SAFE (floor)** |
| **X16** | `DailyInsightCard.tsx:126` | `minHeight: 160` (**floor**), `padding:24` inline | 🔴 **className** — `text-2xl mb-3`, `text-base leading-6 mb-4` (`numberOfLines:3` when teaser), `Button` 56 or `text-sm mt-2` | ≈220 *(teaser)* | ≈236 | **+16.5** | already exceeded | 🟢 **SAFE (floor)** |
| **X17** | `SunSignReveal.tsx:70,:73` | no fixed height; `overflow:'visible'` | 110×110 well + emoji `fontSize:52 lineHeight:60` **inline** | — | — | **0** | n/a | 🟢 **SAFE** |
| **X19** | `(paywall)/index.tsx:87-88` | `zIndex`+`elevation`, no height | n/a — stacking, not layout | — | — | 0 | n/a | 🟢 not a layout surface |

🆕 **One unregistered surface found by sweeping the whole app, and it is the only one of its kind.**
Of **71** fixed-`height:` sites in `app/` + `components/`, exactly two put a **`className`-typed label
inside a fixed height**: `components/account/DeleteAccountModal.tsx:148` and `:202`, both
`style={{ height: 56 }}` with `<Text className="text-white text-base font-semibold">`. `text-base`
moved 14/21 → 16/24, so content ≈21 → 24 inside 56 — **headroom 32, SAFE** — but they belong in the
register, because they are the pattern the register was written to catch and the only instance of it.
**Recommend adding them to `UI-audit.md` §5.1 as X20** (or as a note under X3, since they are
hand-rolled buttons that bypass the `Button` primitive).

**Two useful side effects of the flip on X13's open owner decision** (`:203`'s `minHeight: 200`, kept
pending an iOS check): the empty-`keyDates` case grows ≈147 → ≈161, so the dead whitespace inside the
200 floor **shrinks from ≈53px to ≈39px**; and X13d's card, which sat at *exactly* 72 today, now sits
at 76, so its floor is no longer doing anything. Both make the "keep it" ruling cheaper.

#### 6.6.2 The same survey at PASS 2 — this is where the risk actually is

The flip is safe on these surfaces **because their type is inline**. Pass 2 moves exactly that type
onto the ramp, so pass 2 is when the register's containers are genuinely at risk. Projected with the
ramp's baked `lineHeight` values (exact, no font-metric term):

| surface | inline size today | → ramp step | baked lineHeight | content | headroom | verdict |
|---|---|---|---|---|---|---|
| Button **sm** 48 | 14 | `text-sm` | 22 | 22 | **26** | 🟢 SAFE |
| Button **md** 56 | 16 | `text-base` | 22 | 22 | **34** | 🟢 SAFE |
| Button **lg** 64 | 18 | `text-lg` | 24 | 24 | **40** | 🟢 SAFE |
| StreakBadge **small** 28 | 14 / 13 / 11 | `text-sm` / `text-xs` / `overline` | 22 / 19 / 14 | **22** | **6.0** | 🟠 **TIGHT-adjacent — the tightest in the register.** Headroom halves (≈12 → 6). Verify on iOS. |
| StreakBadge **medium** 36 | 18 / 15 / 12 | `text-lg` / `text-sm` / `text-2xs` | 24 / 22 / 16 | 24 | 12 | 🟢 SAFE |
| StreakBadge **large** 48 | 22 / 19 / 14 | `text-2xl` / `text-xl` / `text-xs` | 28 / 26 / 19 | 28 | 20 | 🟢 SAFE |
| AstroNumeroBadge 44 / 56 / 88 | emoji 22/28/44 | circle **dominates at 32/40/56** | — | 32 / 40 / 56 | 12 / 16 / 32 | 🟢 SAFE — **but the `large` emoji at 44 is above the ramp ceiling (30) and has no target** |
| Tab bar 85 | label 11 | **`text-2xs` 12/16**, *not* `overline` — `overline` is UPPERCASE-only (§3.3) and the labels are Title Case | 16 | ≈74 | ≈11 | 🟢 SAFE |
| `GeneratingReading:460` `minHeight:44` | `fontSize:16, lineHeight:22` | `text-base` **16 / 22** | 22 | **44 = exactly 2 lines** | exact | 🟢 **SAFE — the luckiest mapping in the register; the reservation survives byte-for-byte** |

🔴 **One real pass-2 hazard, and it is not a height — it is font scaling.** `text-base` is a
`scales: true` step (§3.3). If `GeneratingReading`'s rotating message is authored through
`txt()`/`<Txt>`, a user at the 1.3 cap gets a 28.6px line and **two lines = 57.2px against a 44px
reservation** — and the one-vs-two-line layout jump that `minHeight: 44` exists to prevent comes back.
**Fix: either keep this single site non-scaling, or raise the reservation to `ceil(44 × 1.3) = 58`.**
Same argument applies anywhere a `scales: true` step sits inside a reserved height.

🔴 **And the register-wide pass-2 statement:** the 309 `text-sm`/`text-xs` sites gain 3.8–4.4px of
leading per line. Every `minHeight` floor in §6.6.1 is already exceeded by its content, so all of
them simply grow again — but any *new* fixed height a redesign introduces around body copy must be
sized against **22 / 19**, never against today's font-metric default.

---

### 6.7 What the verbatim blocks settle

Facts the earlier derived manifest could only mark as inferred or unverified, now closed:

- **`theme.a11y` holds exactly `{tapMin:48, fontScaleMax:1.3, hairline:1}`** — §3.6's and §4.2's
  prose figures were right, and they do live here.
- **§4.2's "13th authoring name is inferred"** is answered: the authored `space` ships **12** keys,
  and the missing 13th is **`px`** — restored by C-b, which is also what keeps `h-px` alive.
- **`theme.type` carries `family` and `scales` per step**, so §3.3's `scales?` column is code, not
  documentation, and `txt()` is the single place the opt-in decision lives (5 yes / 7 no, matching
  §3.3 exactly).
- **`theme.motion` carries `distance:8, stagger:40, staggerCap:5`** — confirming §5.3's "every
  distance ≤ 8dp" and §5.4's "40 ms stagger, capped at 5 items" as tokens rather than prose.
- **`theme.borderWidth.hairline` is `extend`ed, not replaced** — so Tailwind's `border`, `border-2`
  etc. still resolve, and W3's swap to `StyleSheet.hairlineWidth` really is one line.
- **`fontFamily` is keyed `display`/`quote`/`body`/`body-semi`/`body-bold`** — utilities are
  `font-body-semi`, never `font-semibold`, and V5 confirms the weight ban cannot false-positive on
  them.
- **`theme.colors` replaces rather than extends**, verified: `text-white`, `text-black`,
  `text-gray-400`, `border-gray-800`, `text-gold`, `bg-primary-dark` and the whole `cosmic-*` nest
  all emit **nothing** under both versions. That is the hygiene half; §7 is the proof half.

---

## 7. CI GATE

**Seven named rules, each must return zero** (one — `no-white-on-accent` — runs in report mode), wired
to prepush and CI. This replaces the withdrawn
"deleting Tailwind's defaults makes a stray `gray-400` a build error" claim — **NativeWind resolves an
unknown utility to nothing and moves on**, so an absent token is invisible rather than loud. The grep
gate is the completeness proof; default-deletion is hygiene (§13).

> **Rules are named, never numbered.** The numbering churned across design turns — turn 7 attributes
> the `fontWeight` ban to "rule 3", which was the radius rule in turn 2 — and the authored block's
> "rule 3" is actually three greps. The names are stable:
> **`no-raw-hex` · `no-legacy-tokens` · `no-legacy-radii` · `no-numeric-fontsize` · `no-fontweight` ·
> `no-white-on-accent` · `no-leading-utilities`**.
>
> | authored | named |
> |---|---|
> | rule 1 | `no-raw-hex` |
> | rule 2 | `no-legacy-tokens` |
> | rule 3, grep 1 | `no-fontweight` (className half) |
> | rule 3, grep 2 | `no-legacy-radii` |
> | rule 3, grep 3 | `no-fontweight` (inline `fontWeight:` half — B1) |
> | rule 4 | `no-numeric-fontsize` |
> | ~~rule 5~~ | 🪦 deleted in turn 4 — see the comment retained in the gate |
> | rule 6 (turn 7, prose only) | `no-white-on-accent` |
> | 🆕 *(not authored — promoted from C-l's clause, 2026-07-29)* | **`no-leading-utilities`** |
>
> **Why `no-leading-utilities` is its own named rule rather than a clause inside
> `no-numeric-fontsize`.** C-l originally rode along as a trailing grep under the fontSize rule, which
> made it read as a nice-to-have. It is not: it guards a **different token family** (`theme.lineHeight`,
> not `theme.fontSize`), it has its own **config-side action** (delete the scale), and it is the only
> rule whose violation is *invisible by construction* — a surviving `leading-*` silently overrides the
> `lineHeight` that all twelve ramp steps bake in, which is the ramp's entire premise. §6.6 E measures
> it: **45 usages, 37 of them genuinely overriding, 8 pure no-ops.** A rule that can be described in
> one sentence and measured to the site deserves a name.

### 7.1 AS AUTHORED — verbatim `codeCI` · 🔴 reference only

```sh
# CI gate — the actual completeness proof (package.json prepush)
# Tailwind/NativeWind DROP unknown utilities silently, so an
# absent token is invisible at build time. These four greps are
# what make the codemod provable. Each must return zero.

# 1. no raw hex outside theme.js
rg -n --glob '!theme.js' "#[0-9a-fA-F]{3,8}\b" app components && exit 1

# 2. no legacy colour utilities (the whole default gray ramp + friends)
rg -n "(text|bg|border)-(gray|slate|zinc|neutral|stone|red|purple|violet|amber|emerald)-[0-9]{2,3}" app components && exit 1

# 3. no synthetic weights, no legacy radius spellings.
#    NOTE rounded-sm / rounded-md are VALID in the new scale
#    (sm md lg xl pill) — only the dead spellings are banned:
#    rounded-3xl, rounded-full, bare `rounded`, and the three
#    numeric pill literals.
rg -n "font-(thin|light|normal|medium|semibold|bold|extrabold|black)" app components && exit 1
rg -n "rounded-3xl|rounded-full|(^|[\"' ])rounded([\"' ]|$)|borderRadius:\s*(99|999|100)\b" app components && exit 1
rg -n "fontWeight\s*:" app components && exit 1   # banned property (B1)

# 4. no fractional or literal font sizes anywhere but theme.js.
#    This is the rule that actually protects the ramp.
rg -n --glob '!theme.js' "fontSize:\s*[0-9]+(\.[0-9]+)?" app components && exit 1

# (rule 5 removed — banning bare <Text style={{…}}> would force
#  qa.tsx and cosmic-report.tsx through txt(), which is the
#  structural rewrite we deliberately excluded. It was also
#  redundant with rule 4 and blind to <Text style={styles.x}>.)

echo 'token gate: clean'
```

> **The designer's trailing note, verbatim:**
> Two rules from later turns aren't yet in that block and should be added: rule 1 needs
> `--glob '!BirthChartWheel.tsx'` or an allow-list entry for `chart.harmonious`/`chart.tense`, and
> rule 6 is the A5 floor — grep `text-white` near `bg-accent`/`bg-warning`/`bg-success`/`bg-danger`.

### 7.2 AS CORRECTED — 🟢 THIS IS THE GATE

```sh
#!/usr/bin/env bash
# CI gate — the completeness proof (package.json prepush + CI).
# NativeWind DROPS an unknown utility silently, so an absent token is invisible at build
# time and a wrong-valued one is invisible until someone looks at the screen. These six
# named rules are what make the codemod provable. Each must return zero.
#
# Rules are referred to BY NAME, never by number: the numbering churned across design
# turns and one authored "rule" held three greps. See §7's mapping table.
#
# Failures ACCUMULATE — the authored version exits on the first hit, which turns a
# 500-site sweep into 500 sequential runs.

set -uo pipefail
fail=0
# C-c: every directory in mobile/ that holds .ts/.tsx. The authored scope was
# `app components`, which left lib/colors.ts — the SECOND token system, imported by
# 54 of 93 files — permanently unscanned (§6.4 V6).
SRC="app components lib store services hooks utils types"

# ── no-raw-hex ───────────────────────────────────────────────────────────────────────
# "The one that actually matters — because it is the only check that cannot be satisfied
#  by accident."  Baseline it must drive to zero: 401 hex literals in 58 of 93 files
#  under app+components, plus 23 in lib/colors.ts.
# theme.js is the one legal home. It sits at mobile/ root, outside $SRC, so the glob is
# belt-and-braces rather than load-bearing.
rg -n --glob '!theme.js' "#[0-9a-fA-F]{3,8}\b" $SRC && fail=1

# C-c: the second token system must not merely be unused — it must be GONE. Left in
# place it keeps the old palette resolving for the 54 files that import it while this
# gate reports clean.
if [ -e lib/colors.ts ]; then
  echo "no-raw-hex: lib/colors.ts still exists — the second token system must be deleted"
  fail=1
fi

# C-j: a hex-only grep is blind to 198 further colour literals — 117 rgba()/rgb() and
# 81 CSS keywords (80 `white`, 1 `black`). The rgba(255,255,255,0.05–0.08) overlays are
# exactly what §4.5 maps onto surface-raised. `transparent` (8 sites) stays legal.
rg -n --glob '!theme.js' "rgba?\([0-9]" $SRC && fail=1
rg -n --glob '!theme.js' "[Cc]olor[:=]\s*[\"']?(white|black|red|green|blue|gray|grey|orange|yellow|purple|pink)\b" $SRC && fail=1

# ── no-legacy-tokens ─────────────────────────────────────────────────────────────────
# (a) the default ramp — as authored. Baseline 339 hits / 324 className usages.
rg -n "(text|bg|border)-(gray|slate|zinc|neutral|stone|red|purple|violet|amber|emerald)-[0-9]{2,3}" $SRC && fail=1

# (b) C-d: the retired CUSTOM names. NONE of these resolve once theme.colors replaces
#     the defaults, and clause (a) never sees them. Baselines:
#       white 299 · card/background 108 · gold 70 · primary* 66 · pink 14 · black 8
#       cosmic-* 0 (already dead config — UI-audit §2.2)
#     `white`/`black` are the biggest single reservoir in the entire gate, and they are
#     also the A5 violation's className half (§2.2, no-white-on-accent below).
rg -n "\b(text|bg|border)-(gold|primary|primary-dark|primary-light|pink|background|card|card-translucent|white|black|cosmic-[a-z-]+)\b" $SRC && fail=1

# (c) C-d: the pre-revision semantic names from turn 2's palette, retired by the fg-*
#     rename recorded in theme.js's own comments. ZERO usages today — this clause exists
#     so a codemod cannot reintroduce a name that silently resolves to nothing.
rg -n "\b(text|bg|border)-(text-)?(secondary|muted|placeholder|disabled)\b" $SRC && fail=1

# ── no-legacy-radii ─────────────────────────────────────────────────────────────────
# rounded-sm / rounded-md / rounded-lg / rounded-xl / rounded-pill are VALID steps in
# the new 5-value scale and are NOT grepped — the earlier version of this rule "would
# have failed on correct code" (§13).
# Dead spellings only: rounded-3xl (4), rounded-full (81), bare `rounded` (4), the three
# numeric pill literals — plus C-k's rounded-2xl (73), which dies silently under the new
# scale and which the authored pattern omitted.
rg -n "rounded-3xl|rounded-2xl|rounded-full|(^|[\"' ])rounded([\"' ]|$)|borderRadius:\s*(99|999|100)\b" $SRC && fail=1
#
# 🔴 C-k HAS NO GATE FORM, AND THAT IS THE POINT. `rounded-xl` (48 sites) and
#    `rounded-lg` (1) are legal names in BOTH scales with DIFFERENT values —
#    10.5px→28px and 7px→20px. No grep can tell an unmigrated old one from an
#    intentional new one. Pass 3 must rewrite all 49 call sites explicitly and the diff
#    must be read by a human. (§6.4 V7.)

# ── no-fontweight ───────────────────────────────────────────────────────────────────
# className half — 328 usages (font-semibold 172 · font-bold 148 · font-medium 8).
# V5 confirms this cannot false-positive on font-body-semi / font-body-bold.
rg -n "font-(thin|light|normal|medium|semibold|bold|extrabold|black)" $SRC && fail=1
# inline half — 173 declarations. fontWeight is a BANNED PROPERTY (B1): on a static face
# it is either a no-op or a platform fake-bold. This grep is what makes pass 4's ~501
# sites enforceable; the className regex above does NOT match `fontWeight:`.
rg -n "fontWeight\s*:" $SRC && fail=1

# ── no-numeric-fontsize ─────────────────────────────────────────────────────────────
# "The rule that actually protects the ramp." 346 inline declarations, 26 of them
# fractional. The ramp is integers only, forever — the config exposes no fractional
# value, so a new one cannot be typed without failing review (§3.3, §3.5).
rg -n --glob '!theme.js' "fontSize:\s*[0-9]+(\.[0-9]+)?" $SRC && fail=1

# ── no-leading-utilities ────────────────────────────────────────────────────────────
# 🆕 PROMOTED to its own named rule 2026-07-29 (was a trailing clause under
# no-numeric-fontsize, which read as optional). It guards a DIFFERENT token family and
# it is the only rule whose violation is invisible by construction.
#
# 🟢 DECISION (owner, 2026-07-29): DELETE theme.lineHeight in tailwind.config.js so
#    leading-* stops resolving at all. The authored config leaves theme.lineHeight in
#    place, so all 14 default keys survive and OVERRIDE the lineHeight that every one
#    of the twelve ramp steps bakes in — on the app's densest reading copy. That defeats
#    the ramp's premise. Deleting the scale turns an invisible override into a REMOVED
#    utility, which this grep can then prove is gone.
#
# Measured baseline (§6.6 E) — 45 usages, and note the flip moved every one of them
# because leading-* is rem-valued:
#   leading-5 ×25  17.5 -> 20   pairs with text-sm ×25   LOAD-BEARING (text-sm emits no lineHeight)
#   leading-6 ×13  21   -> 24   text-base ×6 NO-OP · text-sm ×5 load-bearing · 2 unpaired
#   leading-4 ×4   14   -> 16   pairs with text-xs ×4    LOAD-BEARING (text-xs emits no lineHeight)
#   leading-7 ×2   24.5 -> 28   pairs with text-lg ×2    NO-OP (Tailwind's text-lg lineHeight IS 1.75rem)
#   leading-8 ×1   28   -> 32   pairs with text-xl ×1    load-bearing (+4 over text-xl's own 1.75rem)
# 8 of the 43 paired sites do nothing at all; 37 genuinely override. After deletion the
# 25 text-sm sites go 20 -> 22 (the ramp's) and the 4 text-xs sites 16 -> 19.
#
# The `em`-valued keys (leading-none/tight/snug/normal/relaxed/loose) resolve as runtime
# em multipliers against the element's own fontSize, NOT via inlineRem — so they were
# untouched by the flip. Zero usages today; the ban is pre-emptive for them.
rg -n "\bleading-[a-z0-9]+" $SRC && fail=1

# (rule 5 removed — banning bare <Text style={{…}}> would force
#  qa.tsx and cosmic-report.tsx through txt(), which is the
#  structural rewrite we deliberately excluded. It was also
#  redundant with rule 4 and blind to <Text style={styles.x}>.)
#  ^ retained verbatim from codeCI so nobody re-adds it.

# ── no-white-on-accent ──────────────────────────────────────────────────────────────
# A5's enforcement (§2.2): on-accent #1A1512 is the ONLY legal foreground on an accent,
# warning, success or danger fill. #FFFFFF on #F59E0B is 2.15:1.
#
# 🔴 THIS RULE IS A REVIEW TRIGGER, NOT A MUST-BE-ZERO GREP. Proximity is not nesting.
#    Measured on today's code (§6.4 V8): the ±4-line text-white form returns 5 hits of
#    which 4 are correct code (a white foreground BESIDE a filled pill, not on it), it
#    catches the paywall CTA only by accident via the loading spinner, and it NEVER
#    catches the astrology-hub CTA — whose fill is an inline ternary
#    (`backgroundColor: isLoadingBirthChart ? '#92722D' : '#F59E0B'`) and whose
#    foreground is the bare keyword `color: 'white'`. Widening the window to ±20 does
#    not help; widening the foreground pattern raises hits 5→13 and still misses it.
#
# So it runs in REPORT mode — printed for review, never gating — and the structural
# guarantee lives in no-legacy-tokens clause (b), which kills all 299 text-white and
# 8 text-black sites outright.
echo "no-white-on-accent (report only — proximity is not nesting; review each hit):"
rg -n -C4 "\bbg-(gold|accent|warning|success|danger)\b|backgroundColor:[^,;]*#(F59E0B|92722D)" $SRC \
  | rg -n "\btext-white\b|[Cc]olor[:=]\s*[\"']?(white|#FFF|#FFFFFF)\b" || true
#
# ALLOW-LIST — verified correct today, do not re-flag:
#   components/subscription/PremiumBadge.tsx:9-10   bg-gold pairs with text-black
#   app/(paywall)/index.tsx:176-177                 bg-gold pill's own label is text-black
#   components/insights/WeeklyDayCard.tsx:30-31     bg-gold pill's own label is text-black
#   app/(main)/home.tsx:305                         bg-gold circle holds only an emoji
# KNOWN VIOLATIONS this must drive out (§2.2):
#   app/(paywall)/index.tsx:202,208,211             text-white label + #FFFFFF spinner on bg-gold
#   app/(main)/astrology/index.tsx:378,387-392      color:'white' ×4 on #F59E0B / #92722D

[ $fail -eq 0 ] && echo 'token gate: clean'
exit $fail
```

### 7.3 Allow-lists — exactly two

| allow-list | scope | why |
|---|---|---|
| **`theme.chart`** | `components/astrology/BirthChartWheel.tsx` **only** | The wheel keeps two namespaced values (§11). ⚠️ **C-e:** implement this as *"`theme.chart` may only be imported here"*, **not** as `--glob '!BirthChartWheel.tsx'` on `no-raw-hex`. `chart.harmonious`/`chart.tense` are token *references* — a hex grep never sees them, so they need no exemption, whereas a file-level glob would permanently exempt that file's **11 existing raw hex literals** (`:34-38, :78, :79, :91, :108, :123, :178`). The file must still drive to zero like every other. |
| **`no-white-on-accent`** | the four sites listed in the gate | Verified-correct pairings that proximity cannot distinguish from violations (§6.4 V8). |

### 7.4 Baselines — what each rule must drive to zero

| rule | baseline today | notes |
|---|---|---|
| `no-raw-hex` | **401** hex (58/93 files) **+ 23** in `lib/colors.ts` **+ 198** non-hex colour literals (C-j) | true surface **~599** in `app`+`components`; also `tailwind.config.js` 13 and `app.json` 2, outside any `.ts` scan |
| `no-legacy-tokens` | **339** default-ramp hits **+ 565** retired custom names (white 299 · card/background 108 · gold 70 · primary\* 66 · pink 14 · black 8) | `cosmic-*` and the four old semantic names are already 0 — pre-emptive clauses |
| `no-legacy-radii` | **106** as authored **+ 73** `rounded-2xl` (C-k) | plus **49** `rounded-xl`/`rounded-lg` sites no grep can see |
| `no-fontweight` | **328** className **+ 173** inline `fontWeight:` | = pass 4's ~501 |
| `no-numeric-fontsize` | **346** inline `fontSize:` (26 fractional) | `leading-*` moved out to its own rule below |
| **`no-leading-utilities`** 🆕 | **45** `leading-*` — `leading-5` ×25 · `leading-6` ×13 · `leading-4` ×4 · `leading-7` ×2 · `leading-8` ×1 | 37 genuinely override the ramp, **8 are no-ops** (§6.6 E). Paired config action: **delete `theme.lineHeight`** |
| `no-white-on-accent` | **5** proximity hits (1 real) + **2** known violation sites the grep cannot reach | report-only |

> 🆕 **Two live dead classes no rule above catches, both measured in §6.6 B.** `w-30`/`h-30`
> (`profile.tsx:186,190`, 4 usages) — already known, deleted rather than adopted. And
> **`space-y-3` (2 usages, 2 files)**: Tailwind emits it as
> `.space-y-3 > :not([hidden]) ~ :not([hidden])`, and `react-native-css-interop` **cannot express a
> sibling combinator**, so the rule is absent from the runtime rule set at *both* `inlineRem`
> baselines. Sizing the new scale correctly does **not** fix it — `space-y-*` can never work under
> NativeWind 4. Rewrite both sites as `gap-3` on the parent. That is a **behavioural** fix, and it
> needs either an eighth grep (`rg -n "\bspace-[xy]-"`) or an explicit line item in pass 3.

---

## 8. CODEMOD ORDER — pass 0 (done) + 5 passes

🔴 **The governing constraint (owner decision):** passes 1–4 map the codebase onto **semantic tokens
that still hold the OLD values**, and each must be **proven pixel-identical** before the next
starts. **The value flip to Vellum is pass 5 — one file, one diff, reversible.**

> ### 🟢 PASS 0 — `inlineRem: 16`. DONE 2026-07-29, and it is what makes the gate below mean anything.
>
> One line in `mobile/metro.config.js`, its own commit, revertible, no token files and no codemod.
> **It is a prerequisite of passes 2 and 3, not part of them.** Before it, the gate's word
> "pixel-identical" was false at 1,246 spacing usages and 4 of the 7 mapped ramp steps; the codemod
> would have silently shipped a uniform +14.29% rescale inside a diff described as mechanical.
> **Measured surface: 107 of 225 emitted rules moved, 1,763 `className` usages. Full tables: §6.6.**
> ⚠️ **Requires an iOS device pass before any codemod runs** — the register's collapse guards are iOS
> *production* behaviour (X11–X19 standing rule), and while §6.6.1 measures the flip as SAFE on all of
> them, "measured safe" and "seen safe on the device that had the bug" are different claims.

**🔴 Gate wording, corrected 2026-07-29 — "pixel-identical" is now a per-property claim, not a
per-pass one.** The table below said "pixel-identical" of whole passes. §6.6 shows that is too coarse:
post-flip, pass 3's **spacing** half is exactly identical (91/102 utilities, 1,246/1,276 usages, zero
deltas) while its **radius** half never was and cannot be (125 of 211 usages carry a 2–4px delta); and
pass 2's **`fontSize`** half is now exactly identical at all seven mapped steps while its
**`lineHeight`** half moves at every one of them, including **+3.8–4.4px per line on the 309
`text-sm`/`text-xs` sites** that emit no `lineHeight` today. State the property, not the pass.

| pass | from → to | sites | verification gate |
|---|---|---|---|
| **1 · colour** | 🔴 **~599** colour literals (401 raw hex **+ 117** `rgba()/rgb()` **+ 81** CSS keywords, of which **80 are `color:'white'`** needing a **role-based** resolution to `fg` vs `on-accent` — they are not one token) + the default gray/red ramp → `fg-*` / `surface-*` / `border-*` / `accent*` | 🔴 **~599 in 58+ files**, plus **23** in `lib/colors.ts` (deleted) | **pixel-identical** (old values retained in `theme.js`) — colour is genuinely `rem`-free, so the flip does not touch this pass at all |
| **2 · size** | 29 inline sizes → the 12 ramp steps; the 6 fractional values per §3.5's table | **~470** | **`fontSize` pixel-identical at all seven mapped ramp steps** (post-flip) **except the 28 fractional sites** (±0.5px, §3.5) **and the 30 `text-4xl/5xl/6xl` sites, which have NO ramp target** (ceiling is `display-lg` 30) · 🔴 **`lineHeight` is NOT identical anywhere** — §6.6 D |
| **3 · radius + spacing** | 21 radii → 5; loose spacing → the scale | **~300** | 🟢 **spacing: pixel-identical, measured — 91/102 utilities, 1,246/1,276 usages, zero deltas** (§6.6 B) · 🔴 **radius: diff-reviewed, not identical by design** — `rounded-2xl`→`rounded-md` **−2px ×73**, `rounded-3xl`→`rounded-lg` −4px ×4, `rounded-xl`→`rounded-md` +2px ×48, bare `rounded`→`rounded-sm` +4px ×4 (§6.6 C) · plus the **49** grep-blind sites (C-k) and **`space-y-3` ×2**, which is a behavioural rewrite |
| **4 · weight → family** 🆕 | `font-semibold`→`font-body-semi` (172) · `font-bold`→`font-body-bold` (148) · `font-medium`→`font-body-semi` (8) · **plus ~173 inline `fontWeight:` declarations** | 🔴 **~501** | 🔴 **Must run WITH the font install, never before.** Until the TTFs load these are no-ops in both directions — and a className-only pass would leave 173 inline sites silently rendering Regular |
| **5 · flip** | token values → Vellum | **`theme.js` only** | one file, one diff, **reversible** |

**Pass 4 is ~501 sites, not 328.** The 328 figure counted only `className` weights; five named faces
mean every inline `fontWeight:` must move too. CI rule 3's outright ban on the `fontWeight:`
property is what makes the count enforceable (§13).

**Replacing `theme.spacing` does not add a sixth pass.** It retargets `w-*`, `h-*`, `inset-*`,
`top/right/bottom/left-*`, `translate-*`, `space-x/y-*` and `gap-*` as well as padding and margin —
**151 usages**, roughly one-eighth the padding/margin volume and the same string-substitution problem
over the same `className` attributes. **It folds into pass 3.** A separate pass would be process
overhead, not risk reduction. (`preflight-findings.md` §D.2.)

**Three things that are explicitly *not* passes:**
- The **five spacing outliers** (§4.3) migrate later, with visual sign-off.
- The **~180 `txt()`/`<Txt>` conversions** for opt-in font scaling (§3.6) are additive *after*
  pass 4.
- 🆕 **`mobile/app.json`'s two colour literals — `#0F0A1A` at `:16` and `#2D1B4E` at `:39` — belong to
  NO code pass.** They are the **splash-screen background** and the **adaptive-icon background**: OS
  surfaces rendered before any JS runs, so no token can reach them and no `.ts`/`.tsx` scan can see
  them. They ship with the **rebrand asset item** (new splash + adaptive icon + the grain texture +
  the 5 TTFs), and they must change in the same cut as those assets or the app launches on the old
  purple and cross-fades into Vellum. **Recorded in `owner-actions.md` under the rebrand entry.**
  `tailwind.config.js`'s 13 hex literals are replaced wholesale by §6.2 and are not a pass either.

🆕 **And §14–§18 — the whole distinctiveness layer — belong to NO codemod pass at all.** Plates and
shape primitives are **new components in the primitives phase**; §17 lands in **screens** and §18 in
**motion**. **Nothing there changes the token contract.** Read the sequencing banner at the top of §14
before scheduling any of it.

---

## 9. COMPONENTS — 15

Audit names are used verbatim so the mapping to code is one-to-one. **Three are new**:
`SectionCard`, `LockShell`, `Sheet`. 🔴 **A FOURTH, `Txt`, WAS LISTED HERE AS INFRASTRUCTURE AND IS
DROPPED — owner ruling R-A, 2026-08-03** (`primitives-plan.md` §5; the binding reason is that it
cannot deliver the uniformity that is its only benefit, because the two structure-frozen files
cannot take it). `txt()`'s scaling props ride the spread idiom, at 213 sites, and there is no
second spelling. Everything else already exists.

| # | component | reach | tokens | states — all designed | a11y |
|---|---|---|---|---|---|
| 1 | **ScreenContainer** | 25/32 | `bg` · `px-screen-x` 24 · `py-screen-y` 32 · grain · card-entrance · 🆕 **`hero` slot (§17.4)** · 🆕 `RidgeField` + `ArcDivider` (§15.2) | scroll · fixed · keyboard-open · with-footer · refreshing. 🔴 **X1 structure untouched** — grain is an absolute `pointerEvents="none"` sibling *inside* the Dimensions-pinned View; the entrance animates the **content block**, not the pinned wrapper | `accessibilityViewIsModal` when a sheet is open; scroll region unlabelled by design |
| 2 | **Button** | 19 | 🔴 **heights 48/56/64 frozen (X3)** · `rounded-pill` · `text-sm`/`text-base` `font-body-semi` · `on-accent` | default · pressed · disabled · loading · **×5 variants** primary / secondary / outline / ghost / **danger** | `role="button"`, `state={{disabled, busy}}`, label = visible text; **loading keeps the label** for screen readers |
| 3 | **Card** | 13 | `bg-surface` · `rounded-lg` 20 · `p-5` · `border-subtle` optional | static · pressable (default/pressed) · locked · loading (skeleton) | pressable → `role="button"`; static → no role, decorative |
| 4 | **SectionCard** 🆕 | replaces **5 inline copies** | `bg-surface-raised` · `rounded-lg` 20 · `p-5` · `border-subtle` · `overline` kicker · `display-sm` title | **6**: default · collapsed · expanded · locked (→ LockShell density 2) · empty · error | `role="header"` on the title; expand → `state={{expanded}}` + hint |
| 5 | **Input** | 9 | h 56 · `rounded-md` 14 · `bg-surface-overlay` · `border-subtle` → `border-strong` on focus | empty · focused · filled · error · disabled · with-helper. 🔴 **`label` is a required prop** — typed `label: string` with no default, so a placeholder-only field cannot compile | `accessibilityLabel` = label, `accessibilityHint` = helper, error announced via `accessibilityLiveRegion="polite"` |
| 6 | **EntertainmentDisclaimer** | 7 (+2 new) | `text-xs` 13/19 · `fg-muted` 5.36:1 · `border-subtle` top rule · `pt-4` · **left-aligned, not centred** | one layout, **six string lengths** (28→196 chars) — **no truncation, no "read more", no fixed height** | 🔴 `role="text"`, **never** `importantForAccessibility="no"`. It is a legal notice; screen readers must reach it |
| 7 | **GeneratingReading** | 5 | `dur-ambient` aura · `ease-linear` bar · `dur-slow` completion | waiting · advancing-stage · server-complete · slow (>60s) · failed · cancelled. 🔴 **0.97 asymptote preserved** | `role="progressbar"` + `accessibilityValue={{min:0,max:100,now}}`; stage label in a polite live region |
| 8 | **EmptyState** | 4 | `locked` plate 56 · `display-sm` · `text-sm` `fg-muted` · `pt-12` | empty · error · offline · no-results. **One action maximum, never two** | plate is `importantForAccessibility="no"` (decorative); title + body read as one node |
| 9 | **ShareCard** | brand surface | 1080×1080 · `rounded-xl` · `display-lg` · aura **or flat** (W1) | composed · capturing · captured · failed | off-screen render target; **excluded from the a11y tree** — the share *button* carries the label |
| 10 | **ShareableQuote** | brand surface | 1080×1920 · `quote` 17/26 scaled to **44/60 at export** | same four | as above |
| 11 | **AffirmationCard** | Home | `accent-2-muted` ground · `quote` step · `rounded-xl` | default · pressed (copy) · copied · loading | `role="button"`, hint *"Copies the affirmation"* |
| 12 | **Loading system** | app-wide | `dur-ambient` 2600 `ease-linear` shimmer · `accent-muted` on `surface-raised` | **3 densities**: skeleton (known layout) · inline spinner (button/row) · screen (first paint). **Never two at once on one screen** | `accessibilityLabel="Loading"` + `role="progressbar"` indeterminate; skeletons hidden from the tree |
| 13 | **LockShell** 🆕 | replaces **3 treatments on 11 sites** | `locked` · `fg-muted` · `border-subtle` · 🔴 **BlurView 20 retained at density 1 only** | **3 densities × locked/unlocked** — full-screen · section · inline/title-only. §9.1 | `state={{disabled:true}}`, label = title + server lock label; **the CTA is the only focusable child** |
| 14 | **Tab bar** | all 24 `(main)` | 🔴 **h 85 / `paddingBottom` 24 unchanged (X18)** · `bg-surface` · `border-subtle` top · `text-2xs` label · Ionicons 24 | active · inactive · pressed. `dur-base` colour cross-fade, **the bar never moves** | `role="tab"`, `state={{selected}}`, label = visible label |
| 15 | **Sheet** 🆕 | 4 account modals + pickers + info | `bg-surface-overlay` · `rounded-xl` 28 **top corners only** · `p-6` · scrim `bg` @ 60% · `dur-slow`/`ease-enter` in, `dur-moderate`/`ease-exit` out | presented · dragging · dismissing · loading (action in flight) · error · **destructive** · **degraded (plain Modal)** | `accessibilityViewIsModal` on the sheet, `accessibilityElementsHidden` on the screen behind; **focus moves to the title**; the scrim is a **labelled dismiss button**, not a bare touchable |

**Not re-listed:** the **4 dead components stay deleted** (`SkeletonCard`, `LuckyElementCard`,
`LockedOverlay`, `PremiumBadge`). **`LockedSection` / `LockedBanner` are absorbed by `LockShell`** —
that is a rename **plus a merge**, so their 3 call sites become density-2 usages and **the old files
go**.

> 🆕 **Three structural additions from turn 9 land on this table — all additive, none changes a token.**
> **(a) §17.4 — the `hero` slot.** `ScreenContainer` gains **one** slot, typed **`display-lg` +
> `overline`**, and screens **opt in**. 🔴 That is what makes §17's *"one `display-lg` moment per
> screen"* **structural rather than per-screen taste**: a screen wanting a second hero has nowhere to
> put it. Per-screen assignments are in **§17.3**.
> **(b) §14.5 — which components may carry a plate**, and **(c) §15.2 — the shape-primitive carry
> matrix**, which is explicit that **`Button`, `Input`, `Sheet`, the tab bar, `EntertainmentDisclaimer`
> and the loading system carry NOTHING** from §14–§15.
> **Phase: PRIMITIVES, after the codemod** — see the sequencing banner at the top of §14.

### 9.1 LockShell — the three densities

**One system, three densities, no blur below density 1.** Locked and unlocked **share the same box,
padding and radius**, so the list does not reflow when the server payload changes. Locked drops the
body to `fg-muted` and adds the plate; **it never dims the title**, because a dimmed title reads as
broken rather than gated.

> ### 🔴 THE PRESERVATION ARGUMENT BELOW HAS A FALSE PREMISE ON ANDROID (`O-65`; measured 2026-08-03, noted here 2026-08-04)
>
> *"The meaning users already learned"* — **users never learned it on Android, because the blur never
> rendered.** Measured in the installed `expo-blur@14.1.5`: `experimentalBlurMethod` defaults to
> `'none'`, on that path `setBlurEnabled(false)` is called, and what paints is a **flat white tint at
> 8.6%** at intensity 20. iOS renders the real material.
>
> 🟢 **THE CONCLUSION SURVIVES AND HOLDS HARDER, so do not "fix" this section by widening blur.** The
> ruling here — and the Stage-1 blur-as-lock-signal ruling — confine blur to density 1 and forbid it
> everywhere else. The real reason is stronger than the one given: **blur is unusable on Android, so it
> cannot be a lock signal there, and it cannot be decorative chrome there either.** A treatment that
> renders as a flat 8.6% wash is not a treatment.
>
> 🔴 **AND IT WAS A SHIPPED CONTENT LEAK, NOT A COSMETIC GAP.** A white 8.6% sheet leaves the text
> under it READABLE, so the four card lock overlays were showing withheld premium content to free
> users on Android — worse than the decorative-lock class, because those never rendered the content at
> all while this one renders it and relies on obscuring that never happened. **Closed at primitives
> item 13**: all four merged onto `LockShell` density 3, which grounds opaquely. Full mechanism and the
> standing rule are in `build-27-caveats.md` `C-P5-2` / `C-P5-3`.
> ⚠️ Turning the real method on is **`P52`** and the default answer is **no** (per-frame root-view
> capture; `O-46`'s Android memory question is already open).

- **Density 1 — full screen.** 🔴 The **only** place in the system that blurs anything, so the
  meaning users already learned ("blurred = paywalled") is preserved rather than diluted. The
  blurred layer is **real content, not lorem**: the archetype and lede render normally and only the
  body is redacted — which is what makes the lock feel like a door rather than a wall. The CTA panel
  is a **`Sheet` at rest** (`surface-overlay`, `rounded-xl` top, drag handle) so the gesture and
  no-gesture builds look identical. The secondary "not now" action is a **`ghost` Button below the
  primary** — reversible choice nearest the thumb. The CTA **never names a tier or a price**,
  because the price comes from RevenueCat and the entitlement comes from the server.
- **Density 2 — section.** Plate + title + one line of `fg-muted` body + a full-width unlock
  Button. This is what `SectionCard`'s `locked` state delegates to.
- **Density 3 — inline.** 🔴 **Ship the title-only variant.** Section **titles** plus the existing
  locked flag — both already in the payload — with **no body copy at all**, reusing the same 28dp
  plate slot so a locked row's height matches an unlocked one. It tells the user what exists and
  what they do not have yet, and needs **zero** server work. The richer "tease" variant (a real
  truncated-at-a-sentence-boundary excerpt the server chose to send) is **BLOCKED** — no endpoint
  returns a teaser field (§12). If one ships later, density 3 upgrades to it **without a layout
  change**.

### 9.2 Iconography — a system-wide rule

🔴 **No text glyph and no emoji renders as an icon anywhere in the system**, including the 🔒 sites.
Ionicons outline/filled pairs throughout. All carets, chevrons, ticks, crosses, `✕` and `›` drawn in
the design canvas are **HTML placeholders**; the shipped elements are named Ionicons:

- `chevron-down` / `chevron-up` — SectionCard disclosure, 20dp, `fg-muted`, rotating on `dur-base`
- `chevron-forward` — row and Card chevron, 20dp, **`accent`**
- `close` 22 — paywall close
- `lock-closed` 20 — lock plate
- `information-circle-outline` 14 — provenance, on a **44dp hit target** (not `hitSlop` 8)
- tab bar: `home-outline·home`, `sparkles-outline·sparkles`, `calculator-outline·calculator`,
  `planet-outline·planet`, `heart-outline·heart`, `person-outline·person` — 24dp, `text-muted`
  inactive / `accent` active

**Two emoji survive as expressive content, not as icons:** 🔥 on `StreakBadge` (kept) — while 🎉 on
Home's personal-record line is **dropped** as merely decorative.

> ⚠️ **Unaddressed dependency.** `@expo/vector-icons` is **not a direct dependency** — it is
> transitive via `expo` (`UI-audit.md` §7.3, which says "promote it to a direct dependency first,
> since relying on a transitive dep is fragile across Expo upgrades"). This design puts Ionicons on
> essentially every screen. See Appendix A(b), **I-4**.

---

## 10. SCREENS

**Three screens were designed. Twenty-nine were not.**

> For every screen not listed below, the instruction is exactly this:
> **"not designed — compose from §9 primitives and the audit's invariant register."**
> Never a guess. That applies to: all 8 `(auth)` screens, all 3 `(capture)` screens, `readings/`
> index · face · palm · combined · career-destiny · **qa** · **cosmic-report** ·
> cosmic-report-history, `astrology/` daily · weekly · monthly, `numerology/` index ·
> name-destiny, `compatibility/` index · `[id]` · history, `profile`, and both root files.
>
> 🔴 **`qa.tsx` and `cosmic-report.tsx` are RESTYLE-ONLY, structure frozen** (owner decision). They
> receive §2–§5's token values and nothing else. Read `UI-audit.md` §5.2 and §5.3 in full first.

### 10.1 Home (`app/(main)/home.tsx`, 551 lines)

#### 10.1.0 🟢 ADOPTED TREATMENT — turn 8a supersedes the turn-5d/6a comp

> **Owner decision, 2026-07-30: turn 8a ("Home at the ceiling") IS the Home spec.** Where 8a and the
> earlier comp differ, **8a wins**; where 8a is silent, **everything below §10.1.0 still governs.** The
> element table, §10.1.1's eight states, §10.1.2's R1 fixes, §10.1.3's Explore decisions and §10.1.4's
> energy-colour revert are **all unchanged and still normative.**

**What actually changed: RANGE, not the system.** Turn 8a, verbatim: *"Same system, no new steps, no
new colours, no copy changes — the difference is range. The safe comp used the ramp's middle; this one
uses its ends and lets whitespace and asymmetry do the composition."*

**The five mechanisms that made the difference:**

| # | mechanism | what it is |
|---|---|---|
| **1** | **SVG header curve** | An **asymmetric double ridge behind the header** — `border-strong` + `border-subtle` 1px strokes with **one `accent` node at its crest** — plus a **curved section divider replacing the hairline before This Month**. 🔴 **Both are §15 primitives, not per-screen paths**: they are `RidgeField` (`accentNode` true) and `ArcDivider` (`tone: strong`). **The verbatim reference paths are in §15.3.** *"Simple 2-node cubic paths, not illustration"* |
| **2** | **Plate slot** | **One plate inside the insight hero at 92×112**, right-aligned beside the score. 🔴 **It replaces nothing** — the card's variable-length behaviour is untouched, and **the plate column is FIXED so prose length cannot move it** (the same reservation discipline as §14.4). The plate is `lunar` (§14.3.1) |
| **3** | **Display-scale on the energy value** | The energy numeral **moves up from `text-2xl` to `display-lg` 30/34**, with **"/10 energy" at `text-2xs` beside it**, and an `overline` 11/14 immediately above — *"no mid-ramp step appears above the fold; the first `text-base` is 'Face'."* This is §17's rule made concrete |
| **4** | **Deliberate asymmetry** | 🔴 **Four breaks from the uniform margin**, all invariant-safe: **(a)** the **streak pill bleeds off the right edge** (radius still **derived from X11's height 36**); **(b)** the **hero card abandons the right margin entirely** — rounded left, flush right; **(c)** the **Palm tile drops 16dp against Face** with mismatched corner radii **taken from the radius scale**; **(d)** **This Month hangs off a `border-strong` left rule instead of sitting in a card** |
| **5** | **Radial glow on the reading tiles** | Each quick-action tile carries an **in-card radial glow** — **Face: `accent` from the top-right · Palm: `accent-2` from the bottom-left** — which is what replaces §10.1's *"one aura each"*. 🔴 **Turn 9 supersedes the drawing: inside a card this is `BlobField`** (§15.1), `tint: accent｜accent-2`, fill-only, **a sibling not a mask, so X17's `overflow:'visible'` wells are unaffected** |

**Invariants it preserves — turn 8a's own audit, transcribed:**

> X11 streak **height 36** · X13 tiles **140** (🔴 **offset via margin — the container grows, the tiles
> never resize**) · **X18 untouched** · **`useBottomInsetPadding` tail intact** · **disclaimer
> verbatim** · **no lock affordance on rows without a server lock field** (§10.1.2) · **energy bar
> always `accent`** (§10.1.4).

**Costs turn 8a names itself:**

1. **The name on two lines pushes the fold down ~34dp.**
2. 🔴 **The right-bled hero's entrance must be OPACITY-ONLY** — *"a `translateY` on a flush-edge card
   visibly clips against the screen edge."* **This is a real constraint on §5.4's `card-entrance` row
   for this one card**, and it is the same class of exception as §10.3's wheel.
3. *"The plate is the one new asset this screen adds to the binary"* — 🔴 **WITHDRAWN by turn 9.** 8a
   costed the plate as a **~24 KB WebP with a PNG-8 fallback**; §14.1 makes all five plates **SVG at
   zero binary weight**. **Home adds no asset.**

**Three findings from transcribing it — flagged, not silently reconciled:**

- **(i) ⚠️ The tier pill draws "FREE Member", and that string is STALE.** 8a's audit line claims *"FREE
  Member verbatim from `tierDisplay`"* — **that claim is wrong**: `home.tsx:74` renders
  `` `${tier.toUpperCase()} Member` ``, while `profile.tsx:158-162`'s `tierDisplay` map yields
  **`'Free Plan'`**. **C-1 is resolved to option (b): render from `tierDisplay` → `Free Plan`.**
  🔴 **Transcribe 8a's LAYOUT, not its string** — the pill is `text-2xs` `fg-muted`, **status only, not
  a pill-shaped `accent` chip** (§10.1's table row), followed by two 3dp dot separators and the sign /
  life-path facts. ⚠️ Option (b) **is** a copy change, so §6.3's PM sign-off on tier display names
  still applies; the map's literal is **`Free Plan`** (capital P), **not** §13's *"Free plan"*.
- **(ii) 🔴 8a draws `display-lg` TWICE — the name *and* the energy numeral — which §17.1 forbids.**
  §17.3 assigns Home's single hero to the **energy numeral**. **§17 governs**; the name stays at
  `display-md` 24/29 per §10.1's table, which also has the load-bearing reason (*"24 leaves room for a
  long name at 320dp"*) and removes cost (1) above. **The two-line name break is 8a's, and it is
  optional.**
- **(iii) 🔴 The insight hero's Do / Avoid pair needs TWO TOKENS THAT DO NOT EXIST.** 8a renders them as
  a `success` @12% wash and a `danger` @12% wash with `fg` copy and `success`/`danger` `overline`
  labels. §2's table has **`accent-muted` and `accent-2-muted` only — there is no `success-muted` and
  no `danger-muted`.** §2.1 is **not** breached (the ground is a wash on `surface-raised`; the body copy
  is `fg`, and the `danger` `overline` sits on `bg`-family ground at 5.17:1, not on `surface-overlay`) —
  **but adopting 8a's hero as drawn either adds two muted tokens, which contradicts "no token change",
  or renders Do/Avoid another way.** ⚠️ **Owner/designer call. Do not let a pass invent the tokens.**

**Also settled by 8a, worth recording:** its Explore section draws the **grouped variant** — an
`overline` reading **"Charts & numbers"** over Astrology + Numerology, with *"Reports + Destiny groups
and Recent readings continue unchanged"* — so **§10.1.3's sub-decision 2 is drawn as grouped.** That
does **not** retire **O-9**'s device squint test; it makes it **less load-bearing**, because position
now carries identity exactly as §10.1.3 argued.

**The structural change.** Today Home is **nine sections of near-equal visual weight**: two gradient
tiles, a card, a card, then **seven** Explore cards each with an emoji-in-a-circle, then five Recent
cards. Everything competes, so nothing reads. The revamp makes it **one hero and three lists**: the
daily insight is the only card-weight object above the fold, quick actions become a two-up pair
beneath it, Explore collapses from seven cards to a divider list, and Recent Readings stays a list.
**Same content, same routes, same order of ideas — a third of the boxes.**

| element (source) | type | colour | box | note |
|---|---|---|---|---|
| greeting `:72` | `overline` | `fg-muted` | `px-6 pt-4` | was `text-sm` gray-400 |
| name `:73` | `display-md` 24/29 | `fg` | `mt-1` | was `text-3xl font-bold` (30px). **24 leaves room for a long name at 320dp** |
| tier status `:74` | `text-2xs` | `fg-muted` | `mt-2` | **status only. Not a pill, not `accent`** — accent means *action* here, and a plan name is not an action |
| StreakBadge `:79` | `text-2xs` + `text-base` numeral | `accent` on `accent-muted` | 🔴 **h 36 (X11)**, `rounded-pill`, `px-3` | 🔥 kept (expressive). **The orange→red LinearGradient goes**; the explicit height is an iOS production fix and the pill radius is *derived from* it — so the "padding + rounded-pill" restyle is banned on this component specifically |
| personal record `:81` | `text-2xs` | `accent` | `mt-2` | 🎉 dropped — decorative, not expressive. **Copy unchanged** |
| AstroNumeroBadge `:90` | `text-2xs` | `fg-secondary`, `border-strong` | 🔴 **h 32** `rounded-pill` (component keeps X12's 44/56/88) | two **outline** chips, no fill — they are facts, not actions |
| **DailyInsightCard** `:185` | see below | `surface-raised` + `border-subtle` | `rounded-lg`, `p-5`, **no min-height on the outer card** | **the hero.** Both server formats designed; variable length is the whole problem. 🔴 X16's `minHeight: 160` on the **inner** LinearGradient is **kept** — the outer card grows freely, the inner gradient keeps its iOS floor. These do not conflict |
| quick actions `:100` | `text-base` label | `surface-raised`, aura, `accent` label | 🔴 **h 140 kept (X13)**, `rounded-xl`, `gap-3` | the two purple/pink gradient slabs become **one aura each**. 👤/🖐️ → `person-outline` / `hand-left-outline` |
| This Month `:200` | `display-sm` title, `text-sm` body | `surface`, `accent` link | `rounded-lg p-5` · 🔴 **`minHeight: 200` STAYS** (owner) | the design proposed dropping the 200dp floor because it forced whitespace when `keyDates` filtered to zero. **Owner ruling: keep it**, with the empty case as a short centred line of `fg-muted` copy. §12 |
| Explore ×7 `:236` | `text-base` title, `text-sm` sub | `fg` / `fg-muted`, divider `border-subtle` | row **h 64**, no card | **7 Cards → 1 divider list.** Emoji circles → Ionicons 20dp `fg-muted`. 🔴 **PLUS pills removed** (§10.1.2) |
| Recent ×5 `:418` | `text-base` title, `text-sm` sub | `fg` / `fg-muted` | row h 64, `paddingBottom: bottomPad` · 🔴 **`minHeight: 72` pinned (X13)** | 🔴 **`useBottomInsetPadding` stays wired exactly as-is** on `contentContainerStyle`. The 5 relationship-type emoji + rgba backgrounds collapse to one `chevron-forward` + a type label |
| disclaimer | `text-xs` 13/19 | `fg-muted` 5.36:1 | `border-subtle` top, `pt-4`, **above** `bottomPad` | 🔴 **New on Home.** Home renders LLM output (the daily insight) and today carries **no disclaimer at all** — this is the "legible disclaimer on every reading-output screen" requirement. `EntertainmentDisclaimer`'s string **verbatim** |

**Entry motion.** One `card-entrance` per section block — `dur-moderate` 300 / `ease-enter`, opacity
0→1 + translateY 8→0, stagger 40 ms, **capped at 5** — so header, insight, quick actions, This Month
and Explore stagger; Recent Readings and the disclaimer appear with the fifth. Guarded by a `useRef`
mount flag, so the six `fetch*` calls in the `:33` effect resolving at different times do **not**
re-stagger anything. **Sections that arrive late (This Month, continuity) fade in on `dur-base` 220
with no translate**, because a rise animation on a late arrival pushes content the user is already
reading.

#### 10.1.1 Every state — Home has six independent data sources, so "loading" is not one state

| state | trigger | what the user sees |
|---|---|---|
| **first-run** | no profile readings, `streakData.currentStreak === 0`, no `monthlyReading` | Header **without** streak or chips. **The daily insight still renders** — it is server-generated from birth data and needs no reading. Quick actions move **above** the insight and gain a one-line lede. Explore renders in full. Recent Readings shows the EmptyState **body, not a card**. No Recent header action |
| **populated** | the drawn case | Streak, chips, insight hero, quick actions, This Month, Explore, up to 5 Recent rows |
| **loading · insight** | `isLoadingDaily` `:181` | **Skeleton in the insight's own box** — 3 shimmer lines + a bar stub. Replaces today's 200dp fixed box with a centred `ActivityIndicator`, which was the only loading affordance on the screen and read as a stall |
| **loading · other** | profile / streak / monthly / compat in flight | 🔴 **Nothing.** Sections absent until present, then fade in. **No skeleton for content that may legitimately never exist** — a skeleton is a promise, and This Month has no promise |
| **error · insight** | `fetchDailyInsight` rejects | Same box, `fg-secondary` copy + an **outline** Button "Try again". **Never a red banner** — one failed section is not a broken screen |
| **error · silent** | the four `.catch(() => {})` fetches `:41, :48, :52` | Section absent. **Matches today's behaviour exactly and is correct** — a swallowed compatibility fetch must not produce an error UI |
| **offline** | no connectivity, all six reject | Header renders from cached `user`/`profile`. A single `surface-raised` notice replaces the insight. **Quick actions disabled** (capture needs upload) — a real disabled state, not a silent failure. Explore **stays enabled**; those are navigations. Recent Readings renders from the store |
| **continuity present** | server sends highlights `:47` | `ContinuityCard` directly under the insight, on **`surface` not `surface-raised`** so it reads as a footnote to the insight rather than a rival to it. Fades in on `dur-base` |
| **continuity absent** | no shift, or fetch not made | **Nothing renders and nothing is reserved.** No "upgrade to see what's shifted" — that would be a tier name in disguise |

#### 10.1.2 The two R1 fixes on Home — ships-now vs blocked

**Ships now:** both `tier === 'premium_plus'` checks (Name Destiny `:336`, Career Destiny `:363`) and
both hardcoded `PLUS` pills (`:350`, `:377`) are **deleted**. Taps **always** navigate; the
destination decides.

**Blocked:** the neutral lock plate on those two rows. **No hub payload carries a lock signal** for
Name Destiny (a monthly `NameAnalysis` doc count) or Career Destiny (staleness eligibility), so Home
shows **no lock affordance at all** on them, and the two rows are visually identical to Astrology and
Numerology. **That is the correct honest state: the client genuinely does not know, so it must not
imply that it does.**

**The `premium_plus` continuity fetch at `:47` is different and is fine as-is** — it is a *fetch
guard*, not a UI gate: it decides whether to **ask**, and the card self-hides when the server sends
nothing. The design treats continuity as "present or absent", never as "locked", so no tier name
appears. Full context: `UI-audit.md` §5.7 and `preflight-findings.md` §B gates #29/#30.

#### 10.1.3 Explore — two open sub-decisions

1. **The emoji circles go.** Seven 48dp coloured circles were the screen's loudest element and each
   held one emoji; they become **20dp Ionicons in `fg-muted`**. This is **the single biggest visual
   change on Home** and the one most likely to feel like a loss — flagged explicitly rather than
   buried.
2. **Grouping, offered as an alternative, not a default.** The design's own concern, stated
   honestly: `planet-outline`, `sparkles-outline` and `star-outline` are all radial-symmetric line
   glyphs at 20dp and would be expected to **blur into one another in peripheral vision** — which is
   the vision you use when targeting without reading. The design's position is that **size and
   colour are the wrong levers**: 24dp is more legible when *looked at*, not more distinguishable
   when *scanned*, and re-colouring rebuilds the decorative idiom just removed. What made the old
   circles work was not hue but **stable, position-independent identity** — and **position does that
   more cheaply**. So the alternative is to **group the seven rows into three labelled groups**:
   *Charts & numbers* (Astrology, Numerology) · *Reports* (Cosmic Report, Ask the stars) ·
   *Destiny* (Compatibility, Name Destiny, Career Destiny), each with an `overline` heading and a
   divider break. Targeting becomes "second group, first row" — stronger and more durable than "the
   purple one", and it survives a monochrome palette for the cost of one extra text style.
   **Verification the design could not do:** render the seven Ionicons at 20dp on a real device and
   squint-test them. If they differentiate, keep the flat list and drop the grouping — **it is
   additive either way.** Group order and membership are the owner's to change; the mechanism is
   what is proposed.

#### 10.1.4 The energy score loses its colour logic

Today the bar is `gold` at ≥7, `#F59E0B80` at ≥4, `gray[600]` below — **a three-way colour
judgement about the user's day**. In the new system it is always `accent` and **the number carries
the value**. The design's reasoning: a dimmed bar on a low-energy day is the app editorialising
about someone's life, which the calm direction argues against. **One-line revert if the owner
disagrees.**

### 10.2 Paywall (`app/(paywall)/index.tsx`, 245 lines)

#### 10.2.1 🔴 The finding that reframes this screen: it does not currently render from RevenueCat

**Every price on this screen is a hardcoded string literal** — `'$7.99'`, `'$59.99'`, `'$12.99'`,
`'$89.99'`, plus `'$5.00/month • Save 37%'`, `'$7.50/month • Save 42%'` and
`'Annual (Save 37-42%)'`. `offerings` is fetched and then used for **exactly one** thing:
`availablePackages.find(pkg => pkg.identifier === \`${selectedPlan}_${billingPeriod}\`)` at `:35` — a
**constructed** identifier matched against the payload. **So the screen displays fiction and
purchases reality**, and if RevenueCat's identifiers ever differ from that template the user gets
"Selected plan not available" with no diagnosis.

**The design renders every price, period, title and duration from the package objects**, iterates
`availablePackages` in **payload order**, and has **no notion of "premium" or "premium_plus" or "two
cards"**. 🔴 **That is a behavioural change, not a restyle, and it is the single most important thing
on this screen.** It must keep reading `offerings.current?.availablePackages` (**P1**) and keep going
through `subscriptionStore` (**P2**).

**Four further findings, descending severity:**

- **(i) Cancellation is treated as failure.** *(The design's mechanism here is wrong — see
  Appendix A(b), **I-2**. The designed outcome is still right; the code path is not what the design
  thinks it is.)*
- **(ii) `FeatureComparisonTable` hardcodes the tier→feature map** — 12 features × 3 named tiers in
  the binary. **Restyled, not restructured**, because it is marketing copy and PM-owned; but **it
  must never be read as a gate**, and if the entitlement map changes server-side **this table
  silently lies**. Recorded, not solved; it is the same open decision as owner action P12.
- **(iii) "Start 7-Day Free Trial" is unconditional.** Trial eligibility is per-product and *is*
  available on the client as the package's intro-offer field. **A returning subscriber currently
  gets a promise the store will refuse.** → resolved by **A6**, §10.2.2.
- **(iv) "MOST POPULAR" and "BEST VALUE" are hardcoded per plan** and cannot survive a dynamic
  package list. Either derive **the one** badge from computed savings across the returned packages,
  or drop both. **PM copy call**; the comp shows the derived version and **works with zero badges**.

**Server-data flag.** Everything this design needs **already reaches the client**: package
identifier, localised price string, period, product title and intro-offer presence all come from the
RevenueCat payload, and `restorePurchases()` already returns a tier. 🔴 **Nothing on this screen is
blocked on server work — the gap is that the current code ignores data it already has.** The one
thing deliberately not designed: a **per-package feature list**, which is not available, which is
finding (ii).

#### 10.2.2 🔴 A6 — the trial claim moves out of the button

`introPrice` describes **the product**, not the user, and on Android eligibility is **unknowable**.
Therefore:

- **The CTA verb is always neutral**: **"Continue"** when a package is selected, **"Subscribe"** when
  there is only one.
- **The second CTA line is deleted entirely** rather than made conditional — *a button with a
  sometimes-present sub-line is two components.*
- **The trial moves into the card**, phrased so it is true regardless of eligibility:
  **"7-day trial for new subscribers"**, rendered only when that package has an intro offer.

**Consequence worth naming:** the word **"free" leaves the primary button**, which PM may read as a
conversion cost. **It is the only honest option available on Android.** → PM decision, §12.

#### 10.2.3 Layout and tokens

| element (source) | type | colour | box | note |
|---|---|---|---|---|
| close `:78` | Ionicon `close` 22 | `fg` on `surface-overlay` | 44×44 `rounded-pill`, top 48 right 16 | was `rgba(255,255,255,0.2)` + a `✕` **text glyph**. 🔴 **Keeps `zIndex 50` and `elevation 10` (X19)** — this is the one surviving `elevation` in the app and it is a **stacking fix, not depth** |
| title `:102` | `display-lg` 30/34 | `fg` | `px-6`, `pt 32`, **`pr 64`** | 🔴 **`pr-64` is new and load-bearing**: the title currently runs *under* the close button at 320dp |
| subtitle `:105` | `text-sm` 15/22 | `fg-secondary` | `mt-2` | was `text-base` gray-400 |
| period toggle `:113` | `text-sm` `font-body-semi` | active: `on-accent` on `accent` · rest: `fg-muted` on `surface` | h 48, `rounded-pill`, `p-1` | 🔴 **Rendered from the distinct periods present in the payload**, not from a fixed monthly/annual pair. **One period → the toggle does not render at all** |
| PackageCard ×N `:139` | `text-lg` title · `text-2xl` price · `text-xs` meta | `surface-raised`; selected: `border-strong` + `accent-muted` wash | `rounded-lg`, `p-5`, `gap-3` | 🔴 **One component, N instances, payload order.** Selection is a **1px→1px** border change plus a wash — **never a 2px border**, which is what currently makes the cards shift by 1dp on select |
| comparison table `:110` | `text-xs` rows · `overline` headers | `success` / `fg-muted` marks | `surface`, `rounded-lg`, `p-4` | **Restyled, not restructured.** The red `close-circle` becomes a **`fg-muted` dash** — *absence is not an error, and a page full of red crosses is an odd sales argument* |
| CTA `:190` | `text-base` `font-body-semi` | `on-accent` on `accent` **6.86:1** | 🔴 **h 64 (Button lg, X3)**, `rounded-pill` | was `rounded-2xl py-4` with `text-white` on `bg-gold` — **2.15:1 today**. Label per A6 |
| restore `:214` | `text-sm` `font-body-semi` | `accent` | h 48 centred, directly under the CTA | stays a real 48dp target immediately below the CTA — 🔴 **above the legal block, not inside it.** Store requirement, so it is never below the fold on a 360×640 device |
| legal `:220` | `text-xs` 13/19 | `fg-muted` 5.36:1 | `border-subtle` top, `pt-4`, `pb` = insets | Terms / Privacy as two `accent` links **at 48dp targets**, then the auto-renew paragraph. Was 12px centred gray-400 |

#### 10.2.4 Grain and aura z-order — the only large accent field in the app

**Four layers, bottom to top:**

1. flat `bg` `#100E0D` on the root View;
2. **one `aura`** — SVG `RadialGradient`, `accent-muted` → transparent, `closest-side`, **~320dp
   wide, anchored top-left behind the title and nowhere else on the screen**;
3. **`texture.grain`** at `opacity 0.05`, tiled, `pointerEvents="none"`, spanning the full root View —
   so it sits **above** the aura and **dithers** it;
4. the `ScrollView` and its content.

**That ordering is the whole point**: the aura is a 320dp-wide 8-bit gradient on near-black, which is
precisely the case that bands into visible rings on cheap OLED panels, and the grain is what breaks
the rings up. **The CTA is a flat `accent` fill, not a gradient** — X3's inner `LinearGradient` node
survives **with both stops equal**, so the largest saturated area on the screen has no gradient to
band in the first place, and the grain does not tile over it (the button is above layer 3). Grain is
mounted here **explicitly** — this is mount point 4 of 4 (§4.6).

#### 10.2.5 All eight states — and how each survives a slow old-architecture bridge

| state | source | design | motion |
|---|---|---|---|
| **offerings loading** | `isLoading`, `offerings === null` | Title + subtitle render immediately (static copy). Comparison table renders (static). **Two skeleton PackageCards** — a count guess is acceptable *because it is a placeholder, not a claim*. Toggle absent. CTA present but `disabled`, label "Loading plans…" | shimmer, `dur-ambient` 2600, `ease-linear`, **self-driven loop** |
| **offerings failed** | fetch rejects, or `current` null | Where the cards were: `fg-secondary` "Plans couldn't load." + outline "Try again" + 🔴 **restore still visible and enabled** — a user with an existing subscription must be able to restore even when offerings fail. **No native Alert.** Today this state has *no* UI at all and the screen just shows the hardcoded prices, which is the worst case | `dur-base` 220 fade, no translate |
| **ready** | `availablePackages.length > 0` | N cards in payload order, **first selected by default**. **N = 1:** no toggle, one card, no badge, card is **non-interactive and reads as a summary**. **N ≥ 4:** the list scrolls with the page — no horizontal carousel, no "see more" | card-entrance, stagger 40, cap 5 |
| **purchasing** | awaiting the bridge | CTA label → "Contacting the store…", spinner beside the label, **CTA + all cards + the toggle disabled, close button stays enabled**. The screen must tolerate **10+ seconds** without looking hung, so *nothing counts, nothing progresses, nothing promises*. Haptic `Medium` fires once on tap (as today, `:44`) and **never on the callback** | 🔴 **No frame-synchronised animation.** The spinner runs on its own `dur-ambient` loop, started before the call and stopped after it — **never driven by, awaited on, or interpolated against the purchase promise** (respects `UI-audit.md` §7.2's legacy-bridge warning) |
| **purchase failed** | throw, not user-cancelled | Inline strip **directly above the CTA**: `danger` **1px border** on `surface`, message in **`fg`** (never in `danger` — §2.1), **the store's own message verbatim when present**. CTA re-enables and keeps its original label. **Selection preserved** | `error` token: `dur-base` 220, 4dp rise, **no shake**, haptic `Warning` |
| **purchase cancelled** | `userCancelled` on the throw | 🔴 **Nothing.** Silent return to `ready` with the same package selected. No alert, no strip, no haptic, no toast. **Backing out of a store sheet is a decision, not an error** | CTA label cross-fades back, `dur-quick` 140 |
| **restoring** | `restorePurchases()` in flight | Restore link → "Restoring…", `fg-muted`, disabled. **CTA stays enabled** — the two paths are independent and a stuck restore must not block a purchase | colour cross-fade, `dur-base` |
| **restore found nothing** | returns `'free'` | Same strip position, 🔴 **neutral not danger**: `border-subtle`, `fg-secondary`, the **existing copy verbatim**. *Finding nothing is a valid result, so it gets no red and no haptic* | `dur-base` 220 fade |
| **purchase succeeded** | returns `true` | Listed for completeness because today it is a grey system `Alert` over a dimmed screen. Replaced by the `success` token **in place**: the CTA becomes a `success`-filled row reading "Subscription active", then dismisses after **900 ms**. The existing "Your subscription is now active" copy is preserved **verbatim** as the strip text | `success`: `dur-slow` 420, scale 0.92→1, haptic `Success`, then `router.back()` |

**The native `Alert.alert` calls become inline states.** This is a code change on a restyle-scoped
screen, so: **it is not structural** — the JSX tree is unchanged, one state variable and one strip
component are added — and it removes the platform-styled grey dialog that currently lands on top of
the brand's highest-leverage surface. **Presentation stays `'modal'` with no animation override**,
and **no `Sheet` is used anywhere here** (RevenueCat is on the legacy bridge).
⚠️ The design says "five" alerts; there are **seven**, and two of them have no designed state —
see Appendix A(b), **I-3**.

### 10.3 Astrology hub (`app/(main)/astrology/index.tsx`, 774 lines)

**Structural note.** 🔴 **The file's own `styles` StyleSheet dies entirely.**
`sectionCard` / `sectionHeader` / `sectionTitle` / `lockedContent` / `lockedText` / `unlockButton` /
`unlockButtonText` are all absorbed by the extracted `SectionCard` + `LockShell`, and the seven
`assumedNote*` rules become the `Sheet` component (#15). **That is 7 of 12 style rules deleted rather
than restyled, and it is the single biggest scatter reduction available in the repo.** The horizontal
padding is also inconsistent today — `p-6` on the header, `px-4` on five sections,
`marginHorizontal: 16` in the StyleSheet. **All become `screen-x` 24.**

This is the worst token-scatter file in the app: **52 hex literals, 97 inline style objects, one
StyleSheet, three local components** (`SectionCard`, `PlanetCard`, `LifeThemeCard`).

| element (source) | type | colour | box | note |
|---|---|---|---|---|
| "Cosmic Guidance" | `display-md` 24/29 | `fg` | `screen-x` 24, `pt-4` | was `text-3xl` 30px in `p-6` |
| Big Three | `overline` label · `display-sm` value | `fg-muted` label · **`fg` value** | `surface-raised`, `rounded-lg`, `p-5` | 🔴 **Sun/Moon/Rising lose their three different hues** (`#F59E0B` / `#C084FC` / `#EC4899`). *Three sibling facts of equal status shouldn't be three colours*; the glyph and label differentiate them. Row is `space-between` with **equal-width cells so the lock and value states cannot shift it** — behaviour preserved from the existing in-file comment |
| (i) provenance | Ionicon `information-circle-outline` 14 | `fg-muted` | 🔴 **44dp hit target**, not `hitSlop` 8 | opens the noon-chart **`Sheet`** (#15) instead of the bespoke Modal + 7 StyleSheet rules. 🔴 **Copy verbatim, casing included** — earlier comps sentence-cased four button labels and they are **restored to source**: `Generate Birth Chart`, `Retry Birth Chart`, `Add Birth Data`, `Add Birth Time`. **Casing is not a layout problem, so it is not the designer's to change. App-wide sentence-case buttons would be a PM copy decision affecting every Button in the app** |
| missing-data cell | `text-2xs` | `fg-muted` + `accent` link | same cell box as the value state | 🔴 **Not a lock.** This is **missing user input**, not a paywall — `fg-muted` and a plain link, **never the lock plate**. **All three source length variants render verbatim** — "Add birth time", "Add birth location", "Add birth time + location"; the longest wraps to three lines inside the equal-width cell box, which is reserved precisely so no cell state can shift the row. Today it shows a **gold `lock-closed` icon**, which conflates the two and is **the clearest case in the app of the lock vocabulary leaking** |
| generate CTA | Button md | `on-accent` on `accent` | 🔴 **h 56 (X3)**, `rounded-pill` | was `#F59E0B` / `#92722D` with `text-white` at **2.15:1** — **the A5 violation, twice**. Disabled uses the Button's own disabled state |
| chart error | `text-xs` | 🔴 **`fg-secondary`, not `danger`** | `mt-2` | was `#EF4444` 12px centred. *The retry is in the button label; the message doesn't need to be red as well* |
| Cosmic Report entry | `text-base` title · `text-xs` sub | `surface` + `border-subtle` · `accent-2` tags | `rounded-lg`, `p-5` | the 🌙-in-a-`primaryDark`-well becomes a **20dp Ionicon**; the three `#1c1708` / `#4a3c1c` / `colors.gold` tag chips become **`accent-2` outline chips**. **15.5px and 12.5px are the fractional sizes here** → `text-sm` 15 and `text-xs` 13 per §3.5 |
| **BirthChartWheel** `:472` | see **§11** | neutral + `chart.*` | 🔴 **responsive**, in `surface-raised` `p-4` | **Corrected in turn 7**: `screen-x` 24 → a 312dp column; the card's `p-4` → a **280dp interior**, so a 300dp wheel **overflows by 20**. At 320dp the interior is 240dp. §11 |
| PlanetCard ×10 | `text-sm` name · `text-xs` meta | `fg` / `fg-muted` · glyph **`fg-muted`** | row, **min-height 64**, divider **not card** | ten `rgba(255,255,255,0.03)` cards *inside a card* become ten **divider rows**. Glyph loses its `#F59E0B` — *ten identical gold glyphs weren't differentiating anything*. `▲/▼` text glyphs → `chevron` Ionicons |
| LifeThemeCard ×5 | `text-base` title · `text-sm` body | `fg` / `fg-secondary` | row, min-height 64, divider | the five ❤️💼💬💧✨ emoji → **20dp Ionicons in `fg-muted`, matching the icon names already in the data** (`heart`, `briefcase`, `chatbubbles`, `water`, `sparkles`) — so the mapping table becomes the Ionicons name directly and **`LIFE_THEME_EMOJIS` is deleted** |
| Insights ×3 | `text-base` title · `text-sm` sub | `fg` / `fg-muted` | row, min-height 64, divider | three 16-radius cards → three rows. 🔴 **Weekly Forecast carries no lock affordance and no PLUS badge** (§10.3.1) |
| Numerology | `NumerologyBadge` | unchanged component | 🔴 **X12 heights 44/56/88 preserved** | row keeps `justify-between`; the `width: 1, height: 32` divider **recolours to `border-subtle` and keeps both dimensions** |
| disclaimer | `text-xs` 13/19 | `fg-muted` | `border-subtle` top, above `bottomPad` | 🔴 **New here too** — this screen renders LLM prose (`bigThreeInsight`, `planetInsights`, `lifeThemes`) and has **no disclaimer**. `EntertainmentDisclaimer` **verbatim**, same two-slot layout as Home |

**Entry motion.** Same `card-entrance` as Home — `dur-moderate` 300, `ease-enter`, 8dp rise, stagger
40, cap 5, `useRef`-guarded. 🔴 **The wheel is the exception:** it mounts at **full opacity with no
transform**, because it arrives asynchronously after `fetchBirthChart` and *a 300ms rise on a 300dp
object mid-scroll is exactly the reflow the motion spec forbids.* Aspect strokes fade in over
`dur-slow` 420 **once**, after the rings and glyphs are painted. **Interaction:** planet tap is
`dur-quick` 140 **opacity only** — no scale on an SVG node, no layout change — and the caption swaps
text in place with a **reserved two-line minimum** so selecting a planet never moves the wheel.

#### 10.3.1 The three R1 fixes on the Astrology hub

**`isPremium = tier !== 'free'` threaded into five `LifeThemeCard locked` props is worse than the two
Home cases**, because there the check only chose a route — **here it decides what content renders**,
and the five life-theme bodies are **already present in the payload**. Whatever the server thinks,
the client decides.

- **Ships now:** delete the three tier checks; **route always**; replace the local `SectionCard` with
  the extracted one; render the `locked` prop through **LockShell density 2**.
- **Server-data flag → presence-driven, not lock-driven:** the life themes have **no per-theme lock
  field**. The client only knows content is present or absent. **So a theme with a body expands, and
  a theme whose body the server withheld renders as LockShell density 3's title-only variant.** That
  needs no new field, because *"body absent" is already the signal.*
- **Blocked:** anything distinguishing **"withheld because unpaid"** from **"not generated yet"** —
  no field carries it, and inventing one is server work.
- **Weekly Forecast:** no lock signal reaches the client, so it gets **no lock affordance**, exactly
  as Name/Career Destiny on Home. **It routes, and the destination decides.** The
  `Alert('Premium Feature', 'Upgrade to Premium Plus to unlock…')` — **a tier name in body copy** —
  and the hardcoded `PLUS` badge both go.
- The local `SectionCard`'s hardcoded **"Unlock with Premium" + "Upgrade"** is one of the three
  competing lock treatments LockShell replaces.

Full site table: `UI-audit.md` §5.7 · `preflight-findings.md` §B gates #5–#10.

#### 10.3.2 The hub's other states

| state | design |
|---|---|
| **no chart yet, birth date present** | Big Three cells render what is known; unknown cells show `fg-muted` "Add birth time" / "Add birth location" links; `Generate Birth Chart` Button (h 56). **Missing input is `fg-muted` text + a link — never the lock plate** |
| **generating** | 🔴 **Cells keep their box** — a spinner and a shimmer stub occupy the same cell geometry, so **the row never shifts when values land**. Button → disabled `surface-overlay` with a spinner and "Generating…" |
| **chart failed** | `Retry Birth Chart` Button + the existing "Chart generation failed. Tap to retry." in **`fg-secondary`, not `danger`** — the retry is already in the button |
| **no birth date at all** | 🔴 Replaces the "Birth Date Required" **native Alert** with an **empty state, not a dialog**: `display-sm` title, `text-sm` body, `Add Birth Data` Button |
| **noon-chart provenance** | A `Sheet` (#15) with the source copy **verbatim**, left-aligned body, `Add Birth Time` primary + `Got it` ghost. Replaces the 7 `assumedNote*` StyleSheet rules and the centred `#1A1A2E` modal |
| **section locked** | Extracted `SectionCard` + LockShell density 2 — same box as unlocked, no tier name |

---

## 11. BIRTHCHARTWHEEL

### 11.1 The premise had to be corrected first

**The component does not colour-code 10 planets, 12 signs, 4 elements or 12 houses** — that framing
is what makes the question look unanswerable. What its 11 literals actually do:

- **structure** — outer ring `#F59E0B`, inner ring `#6B7280`, twelve house division lines `#374151`
- **labels** — all twelve zodiac glyphs the *same* `#F59E0B`
- **planets** — all ten the *same* `rgba(107,33,168,0.3)` disc with a white glyph
- **aspects** — five hues **by aspect type**: `Conjunction #F59E0B`, `Sextile #10B981`,
  `Square #EF4444`, `Trine #3B82F6`, `Opposition #EC4899`, plus a `#6B7280` fallback

**So signs, houses and planets are already monochrome. The entire colour question is five aspect
hues.**

### 11.2 And those five hues currently deliver no information

Three reasons, all in the file: there is **no legend** (the only text under the wheel is the
missing-birth-time notice); the lines render at **`strokeWidth 0.8` and `opacity 0.4`** on a 300px
wheel, so the hue is carried by roughly **one dim pixel of width**; and
**`chartData.aspects.slice(0, 8)`** means the set shown is **arbitrary**. *A user cannot name an
aspect from an unlabelled 0.8px line, so five hues buy nothing and cost the palette.*

**Better still: the valence distinction is already encoded geometrically.**
`isDashed = aspect === 'Square' || aspect === 'Opposition'` — **exactly the tense pair.** Dash
already says what the red and the pink were saying. **Hue is redundant with a property the component
already has.**

### 11.3 The decision — option (c), in four parts

> **Monochrome structure, geometry for valence, two namespaced values, and aspect identity delivered
> as text on tap.**

1. **Structure is the neutral ramp.** Outer ring `border-strong`; inner ring and the twelve house
   divisions `border-subtle`; degree ticks `border-subtle`. Zodiac glyphs **`fg-muted`** — *raised*
   from today's 0.7-alpha gold, so they are legible rather than decorative.
2. **Planets are `fg` glyphs on a `surface-overlay` disc**, all ten identical, because they are
   already identical today and **the glyph is the identifier**.
3. **Aspects: dash carries valence, one namespaced pair carries reinforcement.**
   `chart.harmonious` and `chart.tense` — **two values, scoped to this component**, on the CI gate's
   allow-list for `BirthChartWheel.tsx` **only**. **Solid** stroke for conjunction/sextile/trine,
   **`4,4` dash** for square/opposition — *exactly as today*. **Stroke rises to 1.2 and opacity to
   0.55** so the encoding is actually visible.
4. **Identity moves to text.** Tapping a planet raises it to **`accent`**, dims the other nine to
   **35%**, draws **only its aspects**, and renders a caption below the wheel:
   *"Mars square Saturn · 2° orb"*. **That is where "which aspect is this" gets answered** —
   legibly, in the type ramp, with a screen-reader label — instead of in one pixel of hue.

**Why not (a) or (b).** Pure monochrome **(a)** would drop the valence signal that dash already
carries **for free** — throwing away real information to save two values that are affordable. A
four-element `chart.fire/earth/air/water` palette **(b)** answers a question the component never
asked: **nothing in the file colours by element**, so (b) would mean *adding* a colour dimension to a
chart that is currently monochrome, on the pretext of collapsing a palette — and it would put four
saturated hues on the calmest screen in the app. **(b) is rejected.**

**Net token change: 11 raw literals → 2 namespaced values plus existing tokens.** Both live in
`theme.chart`, so CI rule 1 passes.

### 11.4 Token table

| chart token | value | on `bg` | use · replaces |
|---|---|---|---|
| `chart.harmonious` | **`#7FA88F`** | **6.44** | solid aspect strokes — replaces `#10B981`, `#3B82F6` and the Conjunction `#F59E0B` |
| `chart.tense` | **`#C08A7E`** | **7.02** | dashed aspect strokes — replaces `#EF4444` and `#EC4899` |
| — structure | `border-strong` / `border-subtle` | — | replaces the `#F59E0B` ring, the `#6B7280` ring, the `#374151` divisions, the `#6B7280` fallback |
| — glyphs / discs | `fg-muted` / `fg` on `surface-overlay` | 5.36 / 16.84 | replaces the gold sign glyphs, the `rgba(107,33,168,0.3)` discs, the white symbols |
| — selected | `accent` | 7.30 | tapped planet + its aspect strokes. **New affordance; nothing today is tappable** |

### 11.5 The caption

Sits directly under the wheel, above the card's bottom padding, with a **reserved two-line minimum**
so selecting a planet never moves the wheel (§10.3's motion note). Two lines: the aspect line
(`text-xs` `font-body-semi`, `fg`) and a one-sentence interpretation (`text-xs`, `fg-muted`).
Example from the comp: **"Mars square Venus · 2° orb"** / *"Tension between what you want and how
you pursue it."*

### 11.6 Accessibility

The `<Svg>` gets **`accessibilityRole="image"`** and a **generated `accessibilityLabel`** — *"Birth
chart. Sun in Leo, 14 degrees. Moon in Pisces…"* — so the wheel is not a blank to a screen reader as
it is today. **Each planet disc is a `Pressable` with a 44dp `hitSlop`**, its own label, and
`accessibilityState selected`. **The caption is the accessible answer to the aspect question, which
is the strongest argument for moving identity into text.**

### 11.7 🔴 Sizing — `onLayout`, with the `viewBox` HELD at `0 0 300 300`

`BirthChartWheel.tsx`'s `const size = 300` becomes **derived from the measured container width**:

```
onLayout → size = Math.min(width, 320)
```

giving **280 at 360dp** and **240 at 320dp**. 🔴 **`viewBox` stays `0 0 300 300`**, so every radius,
angle and glyph coordinate in the file is **untouched — only the rendered `width`/`height` scale.
That is the reason all the geometry constants survive.**

> ⚠️ **This is NOT the one-line change the design calls it.** In the repo the `viewBox` is
> *templated from* `size`, and `cx`/`cy` are *derived from* `size` while `outerR`/`innerR`/`planetR`
> are absolute. Changing `size` alone breaks the wheel. See Appendix A(b), **I-5** — three lines,
> not one.

---

## 12. OPEN / BLOCKED — carried forward

| # | item | status |
|---|---|---|
| **O-1** | 🔴 **LockShell density 3's *tease* field.** "Real copy the server chose to send" describes a **server change, not 27.1** — no endpoint returns a teaser field today. | **BLOCKED on server work.** Stage 4 does not build on it. The **mobile-only alternative ships instead**: the title-only variant (§9.1), which uses fields that already exist. If a teaser field lands later, density 3 upgrades **without a layout change**. |
| **O-2** | **Life themes have no per-theme lock signal.** The client only knows a body is present or absent. | **Presence-driven rendering is the honest design.** Distinguishing "withheld because unpaid" from "not generated yet" is blocked (§10.3.1). |
| **O-3** | **Weekly Forecast has no lock signal**, so it gets **no lock affordance**. | Ships as-designed: route, and let the destination decide. Closes only with §B5's entitlements field. |
| **O-4** | 🔴 **W1 — SVG `RadialGradient` inside `react-native-view-shot@4.0.0-alpha.2` on Android.** Affects `ShareCard` / `ShareableQuote` / `CompatibilityShareCard`. | **Requires device verification.** All three share surfaces are designed so the aura is **removable without redesign**: the flat fallback is a `surface-raised` ground with the accent carried by a **2px rule** and the type. **The fallback is a variant, not a degradation** — either can ship. |
| **O-5** | 🔴 **W3 — `borderWidth: 1` at 7% white is 3 physical px on a 3× panel.** | Recorded. **`a11y.hairline` is a single token**, so the swap to `StyleSheet.hairlineWidth` is one line in `theme.js` pending a device check. **Note the interaction: at hairline width the 7% opacity may need to rise to ~10% to stay visible** — a value change, not a structural one. |
| **O-6** | 🔴 **A6's consequence: the word "free" leaves the primary CTA.** | **A PM decision.** The design's position: it is the only honest option on Android, because intro-offer eligibility is per-user and unknowable client-side. PM may read it as a conversion cost. |
| **O-7** | **X13's `:203` `minHeight: 200` on Home's This Month.** | 🔴 **OWNER RULING: it STAYS**, pending an iOS device check, with the empty case rendered as **a short centred line of `fg-muted` copy** rather than 200dp of whitespace. **The design's reasoning is recorded so this can be revisited cheaply:** a *collapse guard* would sit on the **gradient or flex child**; a *layout floor* sits on the **card**; `:203` is on the card, so the design believed it a floor and safe to remove. **But it is in the same commit as the eight guards** (`6525a75`), so it is unresolved until someone checks on an iOS device. |
| **O-8** | **`FeatureComparisonTable` cannot be payload-driven** — no per-package feature list reaches the client. | Restyled, not restructured. **If the entitlement map changes server-side, this table silently lies.** Same open decision as owner action **P12**. |
| **O-9** | **Explore icon differentiation at 20dp** (§10.1.3). | Needs a **squint test on a real device**. The grouped alternative is additive either way. |
| **O-10** | **`(paywall)`'s badge copy** — "MOST POPULAR" / "BEST VALUE" cannot survive a dynamic package list. | **PM copy call**: derive one badge from computed savings, or drop both. The comp works with zero badges. |
| **O-17** ✅ **CLOSED** | 🔴 **`accent-2` on a tappable label: §16.1 forbids it, `codemod-plan.md` §1.6b's V-2 ruling REQUIRED it.** A direct contradiction on the same ~66 `primary` sites. | 🟢 **RESOLVED 2026-07-30 (owner ruling R1). §16.1 WINS; V-2 IS CORRECTED.** Mapping: **tappable or a link → `accent`** · non-interactive emphasis → `accent-2` · plain secondary copy → `fg-secondary` · borders → `border-strong`. Grounds: `accent-2` on a tappable element would create a **second interactive colour** and defeat the one-accent premise (§16.2), and §10.2's paywall **already draws Terms/Privacy as `accent` links**. `codemod-plan.md` §1.6b Change 3 + the V-2 row amended to match. **Still 1b work** — 1a enumerates, 1b rewrites. Full record: **§16.3**. Closes `P25(a)`. |
| **O-18** ✅ **CLOSED** | 🔴 **Home's Do / Avoid pair needs a `success` @12% and a `danger` @12% wash — neither token exists.** §2 has `accent-muted` and `accent-2-muted` only. | 🟢 **RESOLVED 2026-07-30 (owner ruling R2) — WITHOUT NEW TOKENS.** `success` and `danger` are **solid hex**, so the opacity modifier composes: use 🟢 **`bg-success/10`** and **`bg-danger/10`** — RULED 2026-07-30. 🔴 **Do NOT add `success-muted` / `danger-muted`** — 12% is a **one-component value**, and naming it implies a system role that invites drift. `accent-muted` earns its token by recurring across many surfaces; this does not. Same mechanism as the corrected scrim (R3). ⚠️ **THE SPELLING IS NOT `/12`** — Tailwind 3.4's opacity scale is in steps of five (`0 5 10 … 100`), `nativewind/preset` does not override it, and a bare `/12` **emits nothing at all, silently**. Measured both ways; full evidence in `codemod-plan.md` §1.6b's *opacity-modifier measurement* block. 🔴 **`/[0.12]` is REJECTED** (1a is *removing* 27 arbitrary-value classes; adding one runs against the pass) and **a `12` step on `theme.opacity` is REJECTED** (a one-component value earning a config entry — the same objection that ruled out `success-muted`). **A 2% opacity difference on a decorative wash behind text is not load-bearing.** If the designer establishes 12% IS load-bearing, the fallback is **extending the scale, never arbitrary syntax.** Verified: `#10b9811a` / `#ef44441a`. |
| **O-19** 🆕 | ⚠️ **`currentColor` in `react-native-svg` 15.11.2 is unverified** (version confirmed in `mobile/package.json`). | **Device check, beside W1.** 🟢 **Low risk and mechanical**: `Plate` already takes `tint`, so the fallback resolves `theme.color[tint]` to a literal `stroke`/`fill` inside the component — **five lines, same API, same call sites** (§14.1). |
| **O-20** ✅ **RECLASSIFIED — not a defect** | ⚠️ **`tide`'s two discrepancies**: its stated **3:1** does not match its `160×72` `viewBox` (2.22 = 20:9), and its `opacity=".7"` / `".45"` strokes compute to **≈3.2:1 / ≈2.0:1**, below §14.2's ≥4.5:1 floor. | 🟢 **OWNER RULING R4 (2026-07-30): the ≥4.5:1 plate floor is a VISIBILITY standard, not an accessibility one, so `tide` is a documented DELIBERATE-SUBTLETY EXCEPTION, not a breach.** The reasoning, recorded so it is not re-litigated: **WCAG 1.4.3's 4.5:1 governs TEXT**; non-text contrast is **1.4.11**, which requires **3:1** and applies only to **MEANINGFUL** graphics; **purely decorative graphics are explicitly EXEMPT**. **Plates carry no information** (§14.5) — so no WCAG minimum applies to them at all, and `tide` at ≈2.0:1 is a design choice the floor may waive. 🔴 **The floor still STANDS as a visibility rule for the other four** (§14.2's real grounds: low-density Android panels + surviving all four surface steps), and **`border-subtle` stays BANNED inside plates.** 🔴 **Do not "fix" the specimen.** **Ratio audit: COMPLETE — see §14.3's finding (i); the `viewBox` is NORMATIVE, the label DESCRIPTIVE, and the slot reserves whatever the `viewBox` implies, so no mismatch can reserve a wrong-sized box.** ⚠️ **What R4 found genuinely MISSING is a separate rule — see §14.1.1.** |
| **O-21** 🆕 | 🔴 **SVG under `BlurView` on Android** — LockShell d1's `comet` plate sits **inside the blurred subtree**. | **Failure mode is pre-decided (§14.7): if it composites badly, the plate is DROPPED from d1 entirely — never moved above the blur**, because a crisp plate over blurred content would read as unlock UI and dilute the one meaning blur has. |

> ⚠️ **The `O-` numbering is ONE shared sequence across both plan files, not two.** This table holds
> **O-1…O-10** and now **O-17…O-21**; **`codemod-plan.md` §12 holds O-11…O-16** and is referenced by
> that global ID from `owner-actions.md` and the progress log (e.g. **O-13**, **O-16**). 🔴 **The next
> new item is O-22, wherever it is written.** The five above were briefly numbered O-14…O-18 during
> transcription and **collided with codemod-plan's O-14 (iOS certs), O-15 (`max-w-*` rem) and O-16
> (`#0A0A0F`)** — corrected the same session.

**Owner decisions recorded, not to be re-opened:**

- **No light mode. Ever.** Single-valued token set.
- **Phone only.** 360dp floor, 320dp sanity check. `ios.supportsTablet → false` is a **later config
  step, not now**.
- **`qa.tsx` and `cosmic-report.tsx` are RESTYLE-ONLY, structure frozen.**
- **Runtime `useFonts`, not the `expo-font` config plugin.** `expo-font` is not a direct dependency
  and will need installing.
- **The codemod maps to semantic tokens with OLD values first** and must be **proven
  pixel-identical**; the value flip to Vellum is a **separate one-file change** (§8).
- **X13's `:203` `minHeight: 200` stays** (O-7).

---

## 13. SUPERSEDED — do not re-derive any of these

Each line is a decision that appears in the design document and was **withdrawn by a later turn**.

| withdrawn | replaced by |
|---|---|
| **Literata's variable optical-size axis** | RN has no equivalent (`fontVariationSettings` has no style property; Android <API 26 has no variable support). **Static faces only.** |
| **"4 TTFs" / Literata-only type** | **5 static faces**: Literata-Bold, Literata-Italic, Figtree-Regular, Figtree-SemiBold, Figtree-Bold. |
| **Colour roles `text-primary` / `text-secondary` / `text-muted` / `text-placeholder` / `text-disabled`** | Renamed to **`fg` / `fg-secondary` / `fg-muted` / `fg-placeholder` / `fg-disabled`** (B3). Values and ratios unchanged — only the names moved, so `text-*` is size and `text-fg-*` is colour. |
| **"Deleting Tailwind's defaults makes a surviving `gray-400` a build error"** | **Withdrawn (B4).** NativeWind resolves unknown utilities to nothing and moves on. **The completeness proof is the CI grep gate; default-deletion is hygiene only.** |
| **"`danger` at 15px+/600 qualifies as WCAG large text"** | **Deleted (C5).** The prohibition on `danger` as text on `surface-overlay` is **unconditional at any size or weight.** |
| **CI rule 5** (banning bare `<Text style={{…}}>`) | **Dropped.** It conflicts with `qa.tsx` and `cosmic-report.tsx` being structure-frozen, was redundant with rule 4, and was blind to `<Text style={styles.x}>`. The reasoning is recorded inside the gate as a comment so nobody re-adds it. |
| **CI rule 3's ban on `rounded-sm` / `rounded-md`** | **Corrected.** Both are **valid** in the new 5-step scale. Only **`rounded-3xl`, `rounded-full`, bare `rounded`** and the numeric pill literals are banned. |
| **Grain at 3 mount points with `(auth)` excluded** | **Reversed to 4 mounts (W2)**: `ScreenContainer`, `welcome.tsx` (inside its X2 wrapper), **the `(auth)` layout**, and `(paywall)/index.tsx`. Capture screens and `qa.tsx` stay bare. *(But see Appendix A(b) I-1 — the repo refutes the reversal.)* |
| **A 13-key `theme.spacing`** | **Superseded (turn 7):** ship **all 18 numeric keys plus `px`**. The 13 steps are the **authoring vocabulary only**. |
| **Pass 4 at 328 sites** | **Corrected to ~501** (328 `className` + ~173 inline `fontWeight:`). |
| **`BirthChartWheel`'s `const size = 300`** | Now **derived from `onLayout`**; `viewBox` **HELD** at `0 0 300 300`. |
| **The trial claim in the CTA label** ("Start 7-Day Free Trial") | **Moved to card copy (A6).** The CTA verb is **always neutral** ("Continue" / "Subscribe") and the second CTA line is **deleted entirely**. |
| **Hardcoded `PREMIUM` / `PLUS` badges on hub rows** | **Removed.** No tier-name literal exists anywhere in Stages 2–4. The Q&A row keeps no marker at all, matching `readings/index.tsx:121`. |
| **The authored hybrid Home disclaimer** ("Insights are generated by AI and are for entertainment…") | **`EntertainmentDisclaimer`'s string verbatim**, with an **empty reserved second slot**. **No AI-disclosure string exists anywhere in the repo** — supplying one is a compliance decision, and the layout does not depend on its length. |
| **Tier copy "FREE Member" → "Free plan"** | **Reverted.** Home renders from `profile.tsx`'s `tierDisplay` map. *(But see Appendix A(b) C-1 — the revert as written is not implementable.)* |
| **Button label casing changes on the Astrology hub** | **Reverted to source verbatim**: `Generate Birth Chart`, `Retry Birth Chart`, `Add Birth Data`, `Add Birth Time`. Casing is not a layout problem. |
| **A5 as a hotfix** | It is a **token-table constraint** (a §2.2 row) plus **CI rule 6** instead. |
| **Chart option (b)** — a four-element `chart.fire/earth/air/water` palette | **Rejected.** Nothing in the component colours by element, so (b) would *add* a colour dimension to an already-monochrome chart. |
| **Directions 1b Bloom and 1c Ledger** | **REJECTED.** 1a Vellum only. Nothing is transcribed from them. |
| 🆕 **Turn 5d / 6a's Home comp** | **Superseded by turn 8a** — adopted as the Home spec in **§10.1.0**. Same tokens and copy; the difference is *range*. §10.1's element table, states, R1 fixes and Explore decisions all survive unchanged. |
| 🆕 **The plate as a "~24 KB WebP with a PNG-8 fallback"** (turn 8a's costing, and its *"the plate is the one new asset this screen adds to the binary"*) | **Withdrawn by turn 9.** 🔴 **All five plates are SVG line art at ZERO binary weight** (§14.1). The **120×120 grain tile remains the only raster in the system**, so §4.6's ~426 KB total is unchanged and **Home adds no asset**. |
| 🆕 **"Grain sits above plates" as the reason for the plate legibility floor** | **The floor is right; the reason was inverted** (turn 9). 🔴 **Plates are CONTENT — layer 4 — so grain and aura sit BELOW them** (§14.2). The floor (**strokes ≥1.25px at a token ≥4.5:1**, `border-subtle` banned **inside plates**) stands on low-density-Android visibility and surviving all four surface steps. §1/§4.6/§10.2.4's *grain dithers a large aura's banding* claim is **untouched** — turn 9 reaffirms it. |
| 🆕 **The in-card radial aura on Home's quick-action tiles** (turn 8a) | **Superseded by `BlobField`** (§15.1) — fill-only `accent-muted`/`accent-2-muted`, **a sibling not a mask**, so X17's `overflow:'visible'` wells are unaffected. **Screen-level full-bleed auras (§2, §10.2.4) are NOT affected** — `BlobField` is *inside cards* only. |
| 🆕 **W1 as "the SVG `RadialGradient` aura may not capture"** | **Widened by turn 9 to ALL of `react-native-svg`**: 🔴 **zero SVG nodes in `ShareCard` / `ShareableQuote` / `CompatibilityShareCard`** until view-shot capture is verified on Android — **no plate, no aura, no primitives**. The flat fallback drops **both** the aura and the plate, as **one rule for the whole surface family** (§14.6). |

---

## 14. PLATE SYSTEM — five SVG plates

> ### 🔴 SEQUENCING — read this before anything in §14–§18
>
> **None of §14–§18 belongs to codemod passes 0–5.** Not one line here is a codemod instruction, and
> no pass gate references it.
>
> | this section | phase it lands in |
> |---|---|
> | **§14 plates** · **§15 shape primitives** | **PRIMITIVES phase** — `codemod-plan.md` §9. They are **new components**, mounted into components that phase is already rewriting. Nothing in passes 0–5 creates, imports or mounts them |
> | **§16 `accent-2` semantics** | **Pass 1b already applies the token** (`codemod-plan.md` §1.6b). §16 adds the **meaning rule** that governs every later addition — it is a review criterion, not a site list |
> | **§17 display-scale rule** | **SCREENS phase** (+ one `hero` slot on `ScreenContainer` in the primitives phase) |
> | **§18 motion extensions** | **MOTION phase** |
>
> 🔴 **Nothing in §14–§18 changes the token contract.** No new token, no changed value, no new gate
> rule, no change to §6.2's `theme.js`/`tailwind.config.js` or §6.6's post-flip baseline. **X1–X20 and
> every copy lock are untouched.** Turn 9's own closing check: *"Server-data check: none of the five
> levers needs a field the client doesn't already receive."*
>
> ⚠️ **Two exceptions to "no token change" were found while transcribing, both in §10.1.0's adopted
> Home comp, not in §14–§18 themselves** — a `success` @12% and a `danger` @12% wash that the §2 table
> has no token for. See **§10.1.0's finding (iii)**.
>
> ⚠️ **Appendix A predates §14–§18 and does not cover them.** Its two sweeps were run against §1–§13
> as they stood on 2026-07-29. Findings raised inside §14–§18 are marked inline.

**Source**: turn 9, cards `9a`–`9g`. **Precedence**: turn 9 is the newest turn and outranks 8 → 7 → … → 2.

### 14.1 The component, and the medium

**SVG accepted, and no plate needs raster.** All five are line art — strokes and dots, no
gradients-as-image, no texture — *"so the etching medium and the vector medium are the same thing
here."* 🔴 **The only raster in the system remains the 120×120 grain tile** (§4.6). Total added asset
weight is therefore still the §4.6 figure: ~426 KB, **plus zero for the plates**.

Each plate is **one React component**:

```jsx
<Plate name="lunar" tint="fg-muted" width={92}/>
```

- `name` — one of `lunar` · `constellation` · `orbits` · `tide` · `comet`.
- `tint` — a colour-token name. Drives `currentColor`, **so a plate recolours with the token set and
  needs no per-theme asset**.
- `width` — the slot width. Height follows the fixed `viewBox` (§14.4).

**No faces, no hands, no real people, no recognisable IP — the vocabulary is celestial geometry only.**

> ⚠️ **`currentColor` in `react-native-svg` 15.11.2 is UNVERIFIED.** Confirmed present at that exact
> version in `mobile/package.json`. Turn 9: *"spec unchanged pending your check; the fallback is
> mechanical: `Plate` already takes `tint` as a prop, so if `currentColor` fails, the component
> resolves `theme.color[tint]` to a literal `stroke`/`fill` itself. Same API, same call sites, five
> lines inside one component."* **So this is a five-line internal fallback, not a design risk** —
> but it must be on the device-verification list beside W1 and the `resizeMode="repeat"` assumption.

#### 14.1.1 🔴 THE PLATE MUST BE HIDDEN FROM ASSISTIVE TECH — on the COMPONENT, never per-site

> **OWNER RULING R4 (2026-07-30).** This is the rule the plate spec was actually missing. O-20 turned
> out **not** to be a defect (see §12) — but the audit that cleared it surfaced this, which is.

**`react-native-svg` nodes surface to assistive technology as unlabelled elements.** Five plates
across every hub, insight header and lock shell therefore inject a spray of anonymous nodes into the
accessibility tree — a screen reader announces *something* at each one and the user cannot tell what.
Plates carry **no information** (§14.5, and that is the same premise that exempts them from WCAG
1.4.11 in O-20), so the correct treatment is to remove them from the tree entirely:

```jsx
// inside <Plate/>, on its OUTERMOST element — both props, always
accessibilityElementsHidden={true}            // iOS
importantForAccessibility="no-hide-descendants"  // Android
```

🔴 **Both props are required — they are platform-specific and neither covers the other.**
`accessibilityElementsHidden` is iOS-only; `importantForAccessibility` is Android-only. Shipping one
leaves the other platform announcing the plates.

🔴 **PUT IT ON THE COMPONENT, NOT ON THE CALL SITES.** Every plate mount inherits it once, and no
future mount can forget it. Per-site application is the failure mode: there are five plates across
the §14.5 surface set plus LockShell d1 (§14.7), and the omission is **invisible** unless someone runs
a screen reader — which nothing in this repo's verification stack does (§4.1: no CI, no test runner,
no automated a11y check).

⚠️ **Scope it to plates.** §15's four shape primitives (`ArcDivider`, `RidgeField`, `BlobField`,
`TickRule`) have the same property and want the same treatment, but they are a **separate component
family with their own mounts** — apply it there too, in the primitives phase, rather than assuming
this rule reaches them. **Do not generalise it to `BirthChartWheel`**, whose SVG *is* meaningful and
has its own accessibility treatment at **§11.6**.

### 14.2 🔴 Z-ORDER — CORRECTED. Plates are CONTENT; grain and aura sit BELOW them

**A plate is CONTENT.** `<Plate/>` mounts **inside its card slot**, at **layer 4** of the spec'd
z-order:

```
bg  →  auras  →  grain  →  content (incl. every <Plate/>)
```

🔴 **Therefore grain and aura sit BELOW plates, not above.** The design's original §1 claim was
**inverted**, and turn 9 issued the correction in its own words:

> *"(§1 previously justified this floor with "grain sits above plates", which contradicted the
> Home/Paywall z-order — the floor was right, the reason was wrong.)"*

**This is a correction to a justification, not to a stack.** §10.2.4's paywall four-layer stack
(`bg` → aura → grain → `ScrollView` content) was **already correct** and is unchanged; turn 8a's comp
draws the same order and labels it *"the spec'd one."* Nothing in §1, §4.6 or §10.2.4 needs editing —
what dies is the **use of grain-above-plates as the reason for the stroke floor**.

**The legibility floor STANDS, on its real grounds:**

| rule | the real reason |
|---|---|
| **strokes ≥ 1.25px** | 1px hairlines at 7% alpha are **already at the edge of visibility on low-density Android panels** |
| **at a token ≥ 4.5:1** | a plate must survive **sitting on any of the four surface steps**, and **over an aura's wash where a card is translucent-adjacent** |
| 🔴 **`border-subtle` BANNED inside plates** | same — 7% alpha is the value that fails both tests |
| **fills only as `accent-muted` / `accent-2-muted` washes behind strokes** | never as the drawing itself |

🔴 **Do not carry the grain-dithering argument into the floor.** It survives only where it was always
true: §1, §4.6 and §10.2.4's claim that grain dithers a **large radial aura's** 8-bit banding. Turn 9
reaffirms exactly that scope — see §14.2.1.

⚠️ **Scope the `border-subtle` ban precisely: it applies to PLATES ONLY.** §15's `ArcDivider`,
`RidgeField` and `TickRule` legitimately stroke `border-subtle` at 1px — they are structural rules on
an opaque ground, not drawings that must survive a wash. Generalising the ban would delete three of
the four shape primitives. (Their 1px/7% strokes do inherit **O-5 / W3**'s open question.)

#### 14.2.1 Grain renders in the negative space only — deliberate, and it is a reading

Turn 9, verbatim in substance: **every card ground is opaque**, so at the spec'd z-order the grain
shows **in gutters, margins and section gaps, not across card faces**.

> **"The PAGE is textured, the objects on it are clean."**

Three consequences worth keeping:

1. It **keeps 13px body copy off texture entirely** — *"a real legibility cost at 5%."*
2. It makes **the paywall's full-bleed aura the one place grain visibly works across a large field,
   exactly where the banding risk lives** — which is precisely §10.2.4's argument, now with a reason
   that does not depend on plates.
3. 🔴 **If a future direction wants grain across cards, that is a SURFACE-ALPHA change** (cards at 97%
   over the textured `bg`), **not a z-order change.** *Recorded so nobody reaches for `elevation` to
   fake it* — which would collide with §4.5's zero-elevation rule and X19.

### 14.3 The five plates — SVG **verbatim**

Each block below is the plate's markup **character-exact from turn 9's card `9a`**, reflowed onto
multiple lines for readability but with **no attribute, coordinate or value altered**. The literal
hexes are the canvas's demo colours; §14.3.6 gives the token substitution the shipped component makes.

#### 14.3.1 `lunar` — 4:5 · insight hero, daily astrology header

```html
<svg width="86" height="104" viewBox="0 0 86 104" fill="none" style="color:#8E867C">
<circle cx="43" cy="40" r="24" stroke="currentColor" stroke-width="1.25"/>
<path d="M35 19 a24 24 0 0 0 0 42 a30 30 0 0 1 0 -42" stroke="currentColor" stroke-width="1.25"/>
<circle cx="20" cy="82" r="1.5" fill="currentColor"/>
<circle cx="43" cy="90" r="2" fill="#D98E57"/>
<circle cx="66" cy="84" r="1.5" fill="currentColor"/>
</svg>
```

#### 14.3.2 `constellation` — 3:2 · ~~Ask the stars card~~, EmptyState

> 🔴 **THE "ASK THE STARS CARD" MOUNT IS DROPPED — ruled 2026-08-04, `O-86` / `P65` CLOSED.** The
> heading is left naming it, struck through, because a silently-deleted assignment is how the same
> mount gets rediscovered and re-attempted.
>
> **Measured on that card's ACCENT FILL ground, all three legal `tint` values:** the label role
> **1.42:1**, the meta role **1.36:1**, the strong border role **1.15:1** — and the component draws
> its accent and secondary-accent **nodes** internally, so a node on an accent fill is **1.00:1**.
> There is no legal configuration of the component for that surface.
>
> 🟢 **THE RESOLUTION IS A RECLASSIFICATION, AND IT IS EXACTLY OWNER RULING R4's READING OF `tide`
> (`O-20`).** WCAG's non-text contrast SC (1.4.11) applies only to **meaningful** graphics and
> exempts purely decorative ones outright; §14.5 says a plate carries no information and §14.1.1
> removes it from the accessibility tree on both platforms. **So §14.2's floor on this ground is a
> VISIBILITY standard, never a compliance one — which inverts the question from "which tint is legal
> here" to "can anyone see it".** At 1.15–1.42 nobody can, and a plate nobody can see still costs
> binary weight and a render on every visit to the readings hub.
>
> ⚠️ **Refusing to widen the allow-list was right and was NOT the resolution.** An on-fill tint would
> make a plate mountable on every accent fill in the app, which §14.2's stroke-floor argument never
> sanctioned. But the refusal alone left the surface named, unmounted and unexplained. The two
> readings it was registered against — this surface loses its accent ground, or the plate system
> gains an on-fill tint — are both **design changes**, and neither is needed to answer the only
> question that mattered.
>
> **Registered mechanically**, in `mobile/scripts/primitive-adoption-check.js`'s `Plate` contract
> `forbidden` list, so the drop cannot be closed by accident in either direction. It is the one
> entry in that list whose reason is visibility rather than product policy. **`constellation` keeps
> its `EmptyState` mount and therefore keeps a live surface** — this is one assignment dropped, not
> a plate retired. 🟢 The card's slot instead carries the same Ionicon Home's Explore row uses for
> the same destination, so the two Q&A entry points now agree, at 6.86:1 on the fill.

```html
<svg width="150" height="96" viewBox="0 0 150 96" fill="none" style="color:#8E867C">
<path d="M18 70 L52 34 L84 52 L118 20" stroke="currentColor" stroke-width="1.25"/>
<circle cx="18" cy="70" r="2" fill="currentColor"/>
<circle cx="52" cy="34" r="2.5" fill="#B3A6D9"/>
<circle cx="84" cy="52" r="2" fill="currentColor"/>
<circle cx="118" cy="20" r="3" fill="#B3A6D9"/>
<circle cx="132" cy="66" r="1.5" fill="currentColor"/>
<circle cx="38" cy="14" r="1.5" fill="currentColor"/>
</svg>
```

#### 14.3.3 `orbits` — 1:1 · astrology hub, GeneratingReading

```html
<svg width="104" height="104" viewBox="0 0 104 104" fill="none" style="color:#8E867C">
<ellipse cx="52" cy="52" rx="44" ry="18" stroke="currentColor" stroke-width="1.25" transform="rotate(-18 52 52)"/>
<ellipse cx="52" cy="52" rx="30" ry="12" stroke="currentColor" stroke-width="1.25" transform="rotate(-18 52 52)"/>
<circle cx="52" cy="52" r="7" stroke="currentColor" stroke-width="1.25"/>
<circle cx="90" cy="36" r="2.5" fill="#D98E57"/>
</svg>
```

#### 14.3.4 `tide` — 3:1 · monthly reading · 🔴 **share cards only after W1 clears**

```html
<svg width="160" height="72" viewBox="0 0 160 72" fill="none" style="color:#8E867C">
<path d="M0 18 C 30 12, 50 24, 80 18 C 110 12, 130 24, 160 18" stroke="currentColor" stroke-width="1.25"/>
<path d="M0 38 C 30 32, 50 44, 80 38 C 110 32, 130 44, 160 38" stroke="currentColor" stroke-width="1.25" opacity=".7"/>
<path d="M0 58 C 30 52, 50 64, 80 58 C 110 52, 130 64, 160 58" stroke="currentColor" stroke-width="1.25" opacity=".45"/>
</svg>
```

#### 14.3.5 `comet` — 5:4 · success states, streak record, LockShell d1 panel

```html
<svg width="110" height="90" viewBox="0 0 110 90" fill="none" style="color:#8E867C">
<path d="M16 74 C 40 62, 70 40, 94 16" stroke="currentColor" stroke-width="1.25"/>
<circle cx="94" cy="16" r="4" fill="#D98E57"/>
<circle cx="72" cy="38" r="1.5" fill="currentColor"/>
<circle cx="54" cy="52" r="1.2" fill="currentColor"/>
<circle cx="38" cy="63" r="1" fill="currentColor"/>
</svg>
```

#### 14.3.6 Token substitution — what the shipped component does with those literals

The three literals in the blocks above are the canvas's rendering of tokens. 🔴 **A `Plate` component
containing raw hex would fail `no-raw-hex`** (§7.2), so the mapping is not optional:

| literal in the verbatim SVG | what it is | shipped form |
|---|---|---|
| `style="color:#8E867C"` on the `<svg>` | `fg-muted` — the host colour that `currentColor` inherits | the **`tint` prop**, default `fg-muted`. Never a literal |
| `fill="#D98E57"` (lunar, orbits, comet accent node) | `accent` | `theme.color.accent` |
| `fill="#B3A6D9"` (constellation's two brighter nodes) | `accent-2` | `theme.color['accent-2']` |
| `stroke="currentColor"` / `fill="currentColor"` | the tint itself | unchanged — or the five-line literal fallback of §14.1 |

**Every stroke in all five plates is `stroke-width="1.25"`** — the floor exactly, nowhere above it.

#### 14.3.7 ⚠️ Two discrepancies inside the specimens — flagged, not reconciled

**(i) `tide`'s stated ratio does not match its `viewBox`.** Measured across all five:

| plate | label | `viewBox` | actual | verdict |
|---|---|---|---|---|
| `lunar` | 4:5 = 0.800 | 86×104 | 0.827 | nominal, −3% |
| `constellation` | 3:2 = 1.500 | 150×96 | 1.563 | nominal, +4% |
| `orbits` | 1:1 = 1.000 | 104×104 | 1.000 | ✅ exact |
| **`tide`** | **3:1 = 3.000** | **160×72** | **2.222** | 🔴 **off by 26%** |
| `comet` | 5:4 = 1.250 | 110×90 | 1.222 | nominal, −2% |

**Resolution rule, since §14.4 makes the `viewBox` fixed and `preserveAspectRatio` govern: the
`viewBox` is NORMATIVE and the ratio label is DESCRIPTIVE.** Four labels are honest roundings; `tide`'s
is not. **Do not "fix" the specimen to 216×72** — ask the designer whether the label or the box is
wrong. Nothing downstream breaks either way, because the slot reserves whatever the `viewBox` implies.

**(ii) 🔴 `tide`'s own 2nd and 3rd strokes breach §14.2's ≥4.5:1 floor.** `opacity=".7"` and
`opacity=".45"` multiply the tint. Computed against `bg` `#100E0D` with `fg-muted` `#8E867C` (5.36:1
at full opacity):

| stroke | opacity | effective contrast on `bg` |
|---|---|---|
| path 1 | 1.0 | **5.36:1** ✅ |
| path 2 | 0.7 | **≈ 3.2:1** 🔴 below floor |
| path 3 | 0.45 | **≈ 2.0:1** 🔴 below floor |

**Two readings, and the designer picks:** either the floor means *"the plate's primary stroke"* and
receding tide lines are deliberately atmospheric, or `tide` needs its opacities raised (≈0.85 / ≈0.7
reaches the floor). **Recorded rather than resolved** — a plate is decorative and
`importantForAccessibility="no"`, so this is a visibility judgement, not a WCAG failure. It is the
only specimen in the set that does this.

### 14.4 Aspect behaviour, and the slot

- **Fixed `viewBox`.** It **scales to its slot width**.
- **`preserveAspectRatio="xMidYMid meet"`** — 🔴 **a plate never stretches.**
- 🔴 **The slot reserves its box**, so **a plate can be removed without reflow.** That is what makes
  every "plate NO" ruling in §14.5 and every W1 fallback in §14.6 a **variant, not a redesign** — and
  it is the same discipline as §10.3's equal-width Big Three cells and §10.1's fixed plate column.

### 14.5 Where plates may and must not appear

| | surfaces |
|---|---|
| ✅ **MAY appear** | reading heroes · section-level empty states · **LockShell density 1's panel** (see §14.7) · `GeneratingReading` · **both share cards** (🔴 post-W1 only — §14.6) · the paywall header |
| 🔴 **MUST NOT appear** | **`qa.tsx` in EVERY state — not just crisis** · **both capture screens** (*"nothing decorative over a live camera"*) · **inside package cards** · **next to any disclaimer** · 🔴 **never two plates in one viewport** |

Three of those bans line up exactly with existing rules and should be read as reinforcement, not new
policy: `qa.tsx` and the two camera screens are already the §4.6 grain exclusions; *"never adjacent to
a disclaimer"* protects X8/X9's compliance strings from reading as decoration; and *"never inside
package cards"* keeps the paywall's `PackageCard` a pure commerce object (§10.2.3).

⚠️ **The `qa.tsx` ban is broader than §4.6's.** §4.6 excludes grain from `qa.tsx` at any safety state;
§14.5 excludes plates *and* (via §15) every shape primitive, at every state. **The crisis surface
carries zero of everything in §14–§15 and animates nothing** (§18.5).

### 14.6 🔴 W1, RESTATED AND WIDENED — **no SVG at all in the share surfaces**

Turn 9 extends **O-4 / W1** in two directions at once. Both matter, and the second is the one a
future session will get wrong:

1. **It is now all of `react-native-svg`, not just `RadialGradient`.** *"ShareCard, ShareableQuote and
   CompatibilityShareCard render **zero react-native-svg nodes** until view-shot capture of SVG is
   verified on Android — that means **no tide plate, no aura-as-RadialGradient, no primitives.**"*
2. 🔴 **The flat fallback drops BOTH the aura AND the plate — one rule, one surface family, no
   per-element judgement.** Turn 9 confirms this explicitly: *"the fallback that replaced the aura also
   drops the plate."*

**The shipping share design is the flat fallback throughout**: `expo-linear-gradient` washes
(🟢 *"already proven inside view-shot in production"*), token fills, and type. Verified in the repo:
`react-native-view-shot@^4.0.0-alpha.2`, `expo-linear-gradient@~14.1.5`, `react-native-svg@15.11.2`.

🔴 **`tide`'s share slot is a POST-W1 UPGRADE, not a launch state.** §9 #9/#10 and O-4 already say the
aura is removable without redesign; **the same sentence now covers the plate.** Note the third surface:
`CompatibilityShareCard` is named here and is **not** in §9's component list.

### 14.7 LockShell density 1 — the `comet` plate sits **below** the BlurView

Turn 9, intent confirmed: **the plate is inside the blurred subtree.**

- It **decorates the locked content being withheld, so it blurs with it.**
- 🔴 **The sheet panel above the blur carries NO plate** — both because §14.5 forbids two plates in a
  viewport and because *"the panel is an action surface."*
- 🔴 **The failure mode is specified: if SVG-under-`BlurView` composites badly on Android, the plate is
  DROPPED from density 1 entirely — never moved above the blur.** The reason is a meaning argument, not
  a rendering one: *"a crisp plate over blurred content would read as part of the unlock UI and dilute
  the one meaning blur has."* That protects §4.5's *blur means locked, and only that* and §9 #13's
  "BlurView 20 at density 1 only."

---

## 15. SHAPE PRIMITIVES — four components, **props not drawings**

> 🔴 **These are props-driven React components, never per-screen drawings.** A hand-rolled `<Path>` in
> a screen file is the thing this section exists to prevent. Same discipline as §14's `<Plate/>`:
> one component, a `name`/`tone`/`seed` prop, zero literals at the call site.

**Source**: turn 9, card `9b`. **Phase: PRIMITIVES** (§14's sequencing banner).

### 15.1 The four primitives

| component | path rule | props | tokens | mounts |
|---|---|---|---|---|
| **`ArcDivider`** | `M0,h·0.8 C w·0.25,h·0.8 w·0.33,h·0.2 w·0.55,h·0.2 C w·0.75,h·0.2 w·0.83,h·0.65 w,h·0.6` — **one cubic pair, crest position fixed at 55%** | `width` · `height` (24–40) · `tone: subtle｜strong` | stroke `border-subtle` or `border-strong`, **1px** | between sections on any `ScreenContainer` screen; 🔴 **replaces at most ONE hairline per screen** |
| **`RidgeField`** | **two `ArcDivider` paths offset 10dp vertically**, the second at the weaker tone; **optional 2.5r accent dot at the crest** | `width` · `accentNode: bool` | `border-strong` + `border-subtle` · accent dot | 🔴 **behind a screen header ONLY** — `ScreenContainer`'s header slot, **absolute, `pointerEvents` none** |
| **`BlobField`** | closed **4-node blob**: C-curves through `(0.5w,0) (w,0.4h) (0.55w,h) (0,0.55h)`, **node jitter ±8% seeded by the `seed` prop** so instances differ but are **stable per screen** | `size` · `tint: accent｜accent-2` · `seed` | **fill** `accent-muted` or `accent-2-muted`, **no stroke** | behind icon wells and quick-action tiles — 🔴 **replaces the radial aura *inside* cards.** X17's `overflow:'visible'` wells unaffected: **the blob is a sibling, not a mask** |
| **`TickRule`** | straight hairline with **one 2r node at `x = tick·w`** (default `0` — flush left under the overline it underlines) | `width` · `tick: 0–1` · `tone` | `border-subtle` line · accent node | under section overlines; 🔴 **the one primitive legal inside `SectionCard`, `Card` and `cosmic-report.tsx`** |

**Notes that keep these implementable:**

- `RidgeField` is **defined in terms of `ArcDivider`** — build `ArcDivider` first; `RidgeField` is two
  instances plus a dot, not a second path generator.
- `BlobField` is the **only fill-not-stroke primitive**, and the only one that takes a `seed`. The
  seed's scope is **per screen**, so the same screen renders the same blob every mount. *(Turn 9's
  "try next" list floats "deterministic per user, not per screen" — that was a **prompt suggestion the
  owner did not take**. Do not implement per-user seeding.)*
- 🔴 **`BlobField` replaces the in-card radial aura**, which is a real change to §10.1's quick-action
  row: turn 8a draws those tile glows as CSS radials, and turn 9 supersedes them with `BlobField`
  (§10.1.0, mechanism 5). The **full-bleed screen-level auras of §2 and §10.2.4 are NOT affected** —
  `BlobField` is *inside cards* only.
- `ArcDivider`'s "at most ONE hairline per screen" is a **budget on replacement**, not on hairlines:
  §4.5's tier-2 rule still governs every other divider on the screen.
- 🔴 **These strokes are 1px at 7%/16% white and inherit O-5 / W3 verbatim** — *"`borderWidth: 1` at 7%
  white is 3 physical px on a 3× panel"*, and at hairline width the alpha may need to rise to ~10%.
  §14.2's ≥1.25px floor is **scoped to plates and does not apply here** (§14.2's scoping note).

### 15.2 Carry matrix — which of §9's 15 components may carry which primitive

| §9 component | may carry |
|---|---|
| **1 `ScreenContainer`** | `RidgeField` (header slot) **+** `ArcDivider` |
| **3 `Card`** · **4 `SectionCard`** | 🔴 **`TickRule` only** |
| **8 `EmptyState`** · **7 `GeneratingReading`** · **13 `LockShell` d1** · **9 `ShareCard`** · **10 `ShareableQuote`** · **11 `AffirmationCard`** | `TickRule` **+ one plate** |
| **2 `Button`** · **5 `Input`** · **15 `Sheet`** · **14 tab bar** · **6 `EntertainmentDisclaimer`** · **12 loading system** | 🔴 **NONE** |

🔴 **Budget, per screen:** *at most* **one `RidgeField`**, **one `ArcDivider`** and **one plate**.
🔴 **The crisis surface and the capture screens carry ZERO of everything in §14 and §15.**

⚠️ **`ShareCard` / `ShareableQuote` are listed as plate-and-`TickRule` carriers, but §14.6 forbids all
SVG in the share surfaces until W1 clears.** The carry matrix is the **post-W1** state. At launch both
carry nothing from §14–§15. Same for `CompatibilityShareCard`, which the matrix does not name.

### 15.3 The two reference instances — turn 8a's Home, verbatim

Turn 8a drew two of these before turn 9 named them. **They are the reference instances** and they
confirm the path rules generalise correctly.

**`RidgeField` — the asymmetric double ridge behind Home's header** (`accentNode` true):

```html
<svg style="position:absolute;top:86px;left:0" width="360" height="150" viewBox="0 0 360 150" fill="none">
<path d="M-20 128 C 60 118, 96 52, 168 44 C 236 37, 268 96, 380 78" stroke="rgba(244,239,233,.16)" stroke-width="1"/>
<path d="M-20 138 C 70 130, 110 70, 178 62 C 244 55, 274 110, 380 92" stroke="rgba(244,239,233,.07)" stroke-width="1"/>
<circle cx="168" cy="44" r="2.5" fill="#D98E57"/>
</svg>
```

**`ArcDivider` — the curved section divider before This Month** (`tone: strong`):

```html
<svg style="display:block;margin-top:26px" width="360" height="34" viewBox="0 0 360 34" fill="none">
<path d="M0 26 C 90 26, 120 8, 200 8 C 268 8, 300 22, 360 20" stroke="rgba(244,239,233,.16)" stroke-width="1"/>
</svg>
```

**Three things these instances settle:**

1. **The token reading is unambiguous.** `rgba(244,239,233,.16)` **is** `border-strong` and
   `rgba(244,239,233,.07)` **is** `border-subtle`, both exactly as §2 rows 11–12 define them.
   `#D98E57` is the `accent` crest dot at `r="2.5"` — §15.1's "2.5r accent dot" exactly.
2. 🔴 **`ArcDivider`'s path rule reproduces the 8a divider.** At `w=360, h=34` the rule yields
   `M0,27.2 C 90,27.2 118.8,6.8 198,6.8 C 270,6.8 298.8,22.1 360,20.4` against the drawn
   `M0 26 C 90 26, 120 8, 200 8 C 268 8, 300 22, 360 20` — **the crest lands at x≈200 = 55.6% of 360**,
   matching the fixed 55% crest. The rule is a faithful generalisation, not a different curve.
3. **`RidgeField` deliberately over-bleeds its box** — both paths run `x = −20 → 380` inside a
   360-wide `viewBox`, **so the curve has no visible endpoints on screen**. Keep that when
   parameterising: a ridge clipped to `0 → w` would show two stubs at the screen edges.

---

## 16. `accent-2` SEMANTICS — the enforceable sentence

**Source**: turn 9, card `9c`.

### 16.1 The rule, verbatim

> **Clay marks what you can *do*; iris marks what goes *deeper*** — `accent-2` labels long-form,
> generated and premium-depth content (Deep Insight, Cosmic Report, quotes, continuity,
> PREMIUM/PLUS/NEW markers) **and is never the colour of an element that triggers an action.**

### 16.2 Why that sentence is the whole rule: it is greppable

🔴 **`accent-2` on a `Pressable`'s fill, border or label is a violation.** The qualifier that makes it
workable: *"the row it sits in may be pressable — the marker itself is not the affordance."* So a
`PREMIUM` chip inside a tappable row is legal; a `PREMIUM`-coloured **label on the button** is not.

**Two non-collisions, both stated as meaning arguments:**

| against | why there is no collision |
|---|---|
| **the lock system** | Locks are the **neutral** vocabulary — plate `locked` `#2A2521`, `fg-muted` glyph, blur at density 1. *"A lock says 'you can't, yet'; `accent-2` says 'this runs deep', and the two never share a surface role."* 🔴 **A `PREMIUM` chip beside a lock plate is labelling the CONTENT, not the GATE.** |
| **`accent`** | *"`accent` is always the actionable thing on screen; if clay and iris appear together, **clay is the button**."* |

### 16.3 ✅ THE CONFLICT WITH `codemod-plan.md` §1.6b's V-2 RULING — **RESOLVED (O-17 CLOSED)**

> ## 🟢 ANSWERED — OWNER RULING R1, 2026-07-30. **§16.1 WINS; V-2 IS CORRECTED.**
>
> | role (the 66 `primary` `#C4B5FD` sites) | target |
> |---|---|
> | **tappable, or a link** | 🔴 **`accent`** |
> | **deliberate emphasis, NON-interactive** | **`accent-2`** |
> | plain secondary copy | `fg-secondary` |
> | borders (`border-primary/20\|30\|40`) | `border-strong` |
>
> This is **exactly §16.3's recommendation below**, adopted verbatim. `codemod-plan.md` §1.6b's
> Change 3 and its V-2 row have both been rewritten to match — **the two documents now agree, and
> §1.6b remains the operative instruction for pass 1b** (it is simply no longer in conflict).
>
> **The owner's two grounds, recorded because they generalise past these 66 sites:**
>
> 1. **`accent-2` on a tappable element would create a SECOND interactive colour and defeat the
>    one-accent premise.** §16.2's whole non-collision argument is *"`accent` is always the actionable
>    thing on screen; if clay and iris appear together, clay is the button."* A tappable iris label
>    breaks that sentence, and the sentence is the rule (§16.2).
> 2. **The design already renders tappable text as `accent`** — §10.2's paywall draws its
>    **Terms / Privacy as `accent` links**. So "tappable text is clay" is not a new position; it is
>    the position already in the comp. V-2's alternative would have contradicted a drawn screen.
>
> 🟢 **V-2's actual concern survives intact.** It was never about *which* colour — it was that moving a
> tappable label to `fg-secondary` **deletes the tap affordance silently, with no visual error and
> nothing any gate can catch.** `accent` preserves the affordance *more* visibly than `accent-2`, and
> it is the colour the system already means "you can do this" with.
>
> ⚠️ **Sequencing is unchanged: this is 1b work.** Pass **1a enumerates** the 66 sites by role; pass
> **1b rewrites** them. `#C4B5FD` matches no held token, so no branch of the table is identity-safe.
>
> **Closes `O-17` and `owner-actions.md` `P25(a)`.**

**The conflict as it stood, retained because the reasoning is the ruling's justification:**

| source | says |
|---|---|
| **`codemod-plan.md` §1.6b, V-2 (owner ruling P20, 2026-07-30)** | `primary` `#C4B5FD` splits by role, and *"**tappable label, or deliberate emphasis → `accent-2`**"*. Its whole rationale: coloured text may be **carrying the tap affordance**, and demoting it to `fg-secondary` **deletes that affordance silently** |
| **§16.1 (turn 9, newer)** | `accent-2` *"is **never** the colour of an element that triggers an action"*, and **`accent-2` on a `Pressable`'s label is a violation** |

🔴 **A tappable label cannot be both.** The two documents send the *same sites* to opposite tokens.

**Recommended reconciliation** (owner's to confirm — do **not** let a pass pick):

- **tappable label → `accent`.** It satisfies V-2's actual concern (the affordance survives, visibly)
  *and* §16.1 (`accent` is the actionable colour). V-2's list already routes borders to
  `border-strong` and plain copy to `fg-secondary`; only the tappable branch moves.
- **deliberate NON-tappable emphasis / premium-depth marker → `accent-2`**, per §16.1.

✅ **CONFIRMED 2026-07-30 (R1) — the recommendation above is the ruling.** `codemod-plan.md` §1.6b has
been amended to match, so it remains the operative instruction for pass 1b **and no longer conflicts**.

### 16.4 ⚠️ The "four legacy colours" — turn 9 and §1.6b do not name the same four

Both say **four**. The membership differs, and §1.6b is the measured one:

| source | the four |
|---|---|
| **`codemod-plan.md` §1.6b** (measured, authoritative) | `#C4B5FD` (`primary`) · `#EC4899` (`pink`) · `#A78BFA` · **its own `#C084FC`** |
| **§16 / turn 9** | `#C084FC` (Deep Insight purple) · `#EC4899` (pink gradient stop) · **`#4C1D95`-as-decoration** · **the report tags' gold chips** |

🔴 **Two of turn 9's members are already assigned elsewhere.** §1.6b routes **`#4C1D95` to `accent`**
(with `#6B21A8` and `#F59E0B`), and §2 row 13 routes gold's action uses to `accent` / non-action uses
to `warning`. Turn 9 also **omits `#C4B5FD`, the app's most-used brand colour at 66 usages**.

**Use §1.6b's four.** Read turn 9's list as *"the kinds of thing iris now carries"*, not as a
migration table. §10.3's *"the three `#1c1708` / `#4a3c1c` / `colors.gold` tag chips become `accent-2`
outline chips"* is the one site where turn 9's "gold chips" claim is already the transcribed spec — it
stands, as a **site-level** ruling.

### 16.5 🔴 The meaning constraint, carried forward from §1.6b

> **`accent-2` MEANS "premium / brand secondary" AND NOTHING ELSE. It must not become "the generic
> second colour."** Anything merely *not-`accent`* belongs in `fg-secondary`, `fg-muted` or
> `border-strong`. Every future addition to `accent-2` has to answer *"is this premium/brand?"* — if
> the answer is *"it just needed to be a different colour,"* **it is the wrong token.**

§16.1 is the **positive** form of that same rule, and the two agree completely: iris labels depth;
everything that just needed contrast is a neutral.

### 16.6 Where it earns its place — the three comped screens

| screen | where `accent-2` appears |
|---|---|
| **Home** (§10.1) | the **"What's shifted" kicker + rule** (continuity) · the **Palm tile's iris aura → `BlobField`** (§15.1) · **Cosmic Report's `NEW`** |
| **Readings / Q&A hub** | **"Ask the stars" kicker and its aura** · **`PREMIUM` / `PLUS` chips** |
| **Astrology hub** (§10.3) | the **report entry's three outline chips** · **the header aura** |

### 16.7 Contrast — every pairing used

| pairing | ratio |
|---|---|
| `accent-2` `#B3A6D9` on `bg` | **8.59** |
| on `surface` | **8.18** |
| on `surface-raised` | **7.71** |
| on `surface-overlay` | **7.11** |
| **`on-accent` on an iris fill** | **8.08** |
| `accent-2-muted` (12%) | **wash only** — text on it inherits **its ground's** ratio |

🟢 **All AA at every size**, and every figure reproduces §2 row 15 and `codemod-plan.md` §5's
`accent-2` 8.08 exactly. **No new value, no new token** — §16 is semantics only.

---

## 17. DISPLAY-SCALE RULE — one hero per screen, structural

**Source**: turn 9, card `9d`. **Phase: SCREENS** (plus one slot on `ScreenContainer` in primitives).

### 17.1 The rule

> 🔴 **One `display-lg` moment per screen — zero or one, never per section.**

- **A screen earns it when it has a single value or identity the user came for.**
- 🔴 **It pairs with an `overline` as its immediate neighbour, and *that adjacency IS the contrast*** —
  **30/34 against 11/14 with no mid step between them.**
- **Everything else on the screen stays at `display-sm` or below.**
- 🔴 **Two `display-lg` in one viewport cancel each other.**

### 17.2 What qualifies, and what never does

| ✅ qualifies | 🔴 never qualifies |
|---|---|
| the **archetype name** | anything **inside a list row** |
| the **energy score** | **chat text at any size** — *"`qa.tsx` has no hero: the conversation is the hero"* |
| a **compatibility percentage** | **tab / chrome** |
| a **life-path number** | **disclaimers** |
| the **paywall title** | 🔴 **any value the screen shows more than one of** |
| a **report's state headline** | |

### 17.3 Per-screen assignment

| screen | the one `display-lg` |
|---|---|
| **Home** | the **energy numeral** |
| **readings hub** | the **screen title** (no data hero exists) |
| **reading result** | the **archetype name** |
| **astrology hub** | the **"Cosmic Guidance" title** — 🔴 *"the Big Three are three values, so none of them may take it"* |
| **numerology** | the **life-path numeral** |
| **compatibility** | the **percentage** |
| **paywall** | the **title** |
| **`qa.tsx`** | 🔴 **none** |
| **`cosmic-report.tsx`** | the **state headline** — restyle-level (§18.5) |

⚠️ **Two reconciliations with already-transcribed screens:**
- **Home**: §10.1's table sets the **name** at `display-md` 24/29 and §10.1.4 leaves the energy value's
  size unstated. §17 assigns Home's single `display-lg` to the **energy numeral**; turn 8a draws
  `display-lg` **twice** (name *and* numeral), which §17.1 forbids. **§17 governs — see §10.1.0's
  finding (ii).**
- **Astrology hub**: §10.3's table already sets "Cosmic Guidance" at `display-md` 24/29, not
  `display-lg`. 🔴 **§17 raises it.** The Big Three values stay `display-sm`, which §10.3 already says.

### 17.4 How it becomes structural rather than per-screen taste

Turn 9's mechanism, verbatim: *"Added to §9's component table as a **`hero` column on
`ScreenContainer`**: the slot exists once, typed `display-lg + overline`, and screens opt in."*

**So the rule is enforced by the type of a slot, not by review.** A screen that wants two heroes has
nowhere to put the second. Recorded on §9's row 1 and in the note under §9's table.

---

## 18. MOTION EXTENSIONS — §5.4 extended

**Source**: turn 9, card `9e`. **Phase: MOTION.** §5.1's six durations, §5.2's four curves and §5.3's
three system-wide rules are **unchanged** — §18 adds rows, not tokens.

### 18.1 The three new rows for §5.4's table

| interaction | duration | curve | what moves |
|---|---|---|---|
| **plate entry** | `dur-slow` **420** | `ease-enter` | 🔴 **opacity ONLY**, and 🔴 **SEQUENCED AFTER its host card's entrance — never parallel.** *"Two things arriving at once reads as jitter."* |
| **SVG curves** (§15 primitives) | — | — | 🔴 **They do NOT respond to scroll.** *"A scroll-linked path on low-end Android is the 'laggy' you're guarding against, and static curves are what 'stable motion' means."* They **enter with their section's card-entrance and never independently** |
| **a `display-lg` hero** (§17) | — (none of its own) | — | 🔴 **Simply present.** It belongs to the **header block's single entrance** and gets **no animation of its own.** A hero that **arrives late (an async score) cross-fades TEXT-ONLY on `dur-base` 220 in a RESERVED box** |

The third row is the same discipline as §10.3's wheel exception and §10.1's late-arrival rule: a
reserved box plus a text-only cross-fade, because a rise animation on a late arrival pushes content
the user is already reading.

> ### 🆕 A FOURTH ROW — **THE ONE-SHOT PATH DRAW-IN.** 🔴 OWNER-REQUESTED ADDITION, 2026-08-06. Not derived from anything above.
>
> | interaction | duration | curve | what moves |
> |---|---|---|---|
> | **a stroked §15 primitive's entry** | `dur-slow` **420** | `ease-enter` | 🔴 **`strokeDashoffset` ONLY**, from the path's own length to 0 — the line **paints itself** from one end to the other, **once**, and then rests. 🔴 **SEQUENCED AFTER its host's entrance, never parallel** — the same derived delay as row 1 |
>
> **RECORDED HERE, IN THE SPEC, PRECISELY BECAUSE IT IS NOT IN THE SPEC.** Nothing above asks for it.
> A later session reading §18.1 row 2 — *"they do NOT respond to scroll… they enter with their
> section's card-entrance and never independently"* — would correctly conclude this was unspecified and
> could remove it. **It is an owner request. Do not remove it for citing that row.**
>
> ### 🔴 AND IT IS THE **SECOND** ANSWER TO THAT REQUEST. THE FIRST WAS DECLINED BY THE OWNER.
>
> | round | asked for | ruling |
> |---|---|---|
> | 1 | **ambient DRIFT** — a slow perpetual `translateY` on the whole `<Svg>`, `withRepeat`, UI thread, the same mechanism as the wait screen's aura breathe | 🔴 **DECLINED by the owner, on BATTERY and low-end-Android grounds.** A permanently-running animation on the app's most-visited screen keeps the UI thread awake for as long as that screen is open |
> | 2 | **a ONE-SHOT DRAW-IN** | 🟢 **THIS.** It plays once, costs nothing after it finishes, and is what shipped |
>
> 🔴 **SO A LOOP IS DOUBLY CLOSED HERE AND MUST NOT BE "RESTORED" AS AN IMPROVEMENT.** The drift was
> not merely unbuilt — it was **considered and declined**, in those terms. And it was already declined
> once on a different ground: **the skeleton shimmer** was rejected on the rule that *a continuous loop
> is legitimate ONLY where it communicates ongoing work*, which is why the wait screen's aura is
> allowed (a 60-second generation) and a drifting hairline is not (it communicates nothing).
> **`dur-ambient` 2600 remains the one looping duration and the wait screen remains its one surface.**
> Enforced as an **absence** in `primitive-adoption-check.js`: neither the repeat primitive nor the
> module's own loop helper may appear in `ShapePrimitives.tsx`.
>
> ### WHY THIS SHAPE WAS AVAILABLE WHEN A LOOP WAS NOT — four properties, and none is a preference
>
> 1. 🟢 **IT SATISFIES §5.3 RULE 2 RATHER THAN OVERRULING IT.** It plays **once per arrival**. A loop
>    has to be argued as an exception to that rule; this needs no exception at all.
> 2. 🟢 **THE MECHANISM IS ALREADY PROVEN IN THIS TREE.** `CompatibilityScoreRing` has swept a
>    `strokeDashoffset` through `animatedProps` since Build 27, and `Circle` is **already** a declared
>    carrier in the arrival gate's WRAPPERS table. `Path` joins it. **No new technique, no new
>    dependency, and the one hazard that class has** — `react-native-svg` clones a `style` prop onto a
>    second host node reanimated does not own, which shipped every plate invisible at cut 3 — **does
>    not reach a paint prop at all**, because a paint prop is set on the node reanimated resolved.
> 3. 🟢 **REDUCED MOTION NEEDS NO CARVE-OUT.** `withTiming` defaults to `ReduceMotion.System` and a
>    suppressed one resolves **at its final value** — offset 0, i.e. **fully drawn**, which is exactly
>    the intended resting state. ⚠️ Contrast `useAmbient`, where a suppressed `withRepeat` parks at
>    `from` and needs an explicit override or the layer freezes at half brightness. **That asymmetry is
>    the strongest single argument for a one-shot over a loop** and it is why the hazard the owner
>    flagged for the drift does not exist here.
> 4. 🔴 **THE GEOMETRY IS NEVER TOUCHED.** The path string is computed once, at its width; only the
>    dash phase moves, on the UI thread, with no re-render. **Morphing `d` is a JS-thread
>    recalculation per frame and is precisely what §18 bans** — closed mechanically by a new gate rule
>    (`non-paint prop animated`), because §18's existing key check reads `useAnimatedStyle` and had
>    never looked at the `animatedProps` channel at all.
>
> ### SEQUENCING — it **FOLLOWS** the section entrance. It does not replace it, and it cannot compound with it.
>
> **The request asked which, because two entrances on one element compound — that is the 16dp-against-an-8dp-spec
> defect already found on cards. The answer is FOLLOWS, and the compounding is impossible by
> construction:** the defect §5.3 rule 3 guards against is two `translateY` curves **adding**, and this
> channel is not a transform. The section still rises with the screen exactly as before; **nothing was
> moved off the existing entrance.** The delay is the same derived expression row 1 uses — the shared
> arrival clearance **plus the host entrance's own duration** — so the draw begins the instant the
> content block lands. §18.1's reason applies verbatim: *"two things arriving at once reads as jitter."*
>
> ### ⚠️ FOCUS-KEYED, OWNER-RULED — and the cost is stated rather than hidden
>
> A mount-keyed draw-in would play **once in the life of the app** on a screen the tab navigator keeps
> mounted, which is `motion-arrival-check.js` **LEG D**'s defect exactly. So it re-arms per focus.
> 🔴 **The price: the stroke is UNDRAWN for the 600 ms wait on every return**, because a paint-channel
> entrance shares the alpha-only entrance's property — its wait is a wait on nothing being painted.
> **This is the exact trade §18.1 declined for the plate** (which is why `usePlateEntrance` is the one
> declared mount-keyed exception) and the owner took it here deliberately. Registered as caveat
> `C-XF-3` beside `P101`. **The lever, if it reads badly on a device, is the CLEARANCE term — not the
> duration and not the distance.**
>
> ### SCOPE — which primitives, and the three that do not get it
>
> | primitive | |
> |---|---|
> | **`ArcDivider`** | 🟢 **HAS IT. This is "the wave" the request names** — the request's own words are *"the wave currently enters with its SECTION'S card entrance"*, and this is the **only** §15 primitive that sits inside the content block and therefore rides that entrance at all. Single stroked path, visible endpoints, one left-to-right sweep |
> | **`RidgeField`** | ⚠️ **QUALIFIES, NOT APPLIED — one owner sub-decision, two halves.** (a) `accentNode` is a **fill** with no entrance of its own, so while the two strokes were undrawn a lone accent dot would sit on screen for the whole wait, on every return; (b) this layer is an **absolute sibling of the animated safe area**, so it has **no host entrance to sequence against** — §15.3's reference instance is simply *present*. Both are additions the request did not make; §0.0 rule 1 takes the smaller change |
> | **`BlobField`** | 🔴 **DOES NOT QUALIFY, STRUCTURALLY.** §15.1: the only **fill-not-stroke** primitive. There is no stroke to trace and a dash phase is meaningless on a filled form |
> | **`TickRule`** | 🔴 **NOT TODAY — it has ZERO MOUNTS** (its eyebrow kicker has no call sites). Animating an unmounted primitive is the zero-call-site defect: a mechanism nobody has seen, reading as finished work. It gets the treatment in the commit that mounts it |
>
> ⚠️ **AND THE PLATES ARE OUT BY SPEC, NOT BY OVERSIGHT.** §18.1 row 1 rules the plate entry *"opacity
> ONLY"*. Several plates are stroked paths — `tide` is three wave curves, `comet` is one — and they
> would draw in beautifully. **Changing that is a design decision, not an extension of this one.**
>
> **THE PATH LENGTH IS COMPUTED, NOT MEASURED AND NOT A CONSTANT.** `arcLength()` flattens the same
> cubic control points `arcPath()` emits and sums the chords. `react-native-svg` exposes no reliable
> `getTotalLength()` on this stack, and a constant would be wrong at every width but one — these paths
> are **parameterised** by width. ⚠️ **The rounding goes UP, and that is load-bearing:** the dash
> period must be **at least** the path length or the start state is not fully hidden and a stub of the
> curve stays visible for the whole wait. An overestimate merely finishes the sweep a few milliseconds
> early. **One direction is a visible defect; the other is nothing.**

### 18.2 The implementation contract — verbatim

> **Implementation contract:** every demo above is **opacity/transform only** → **reanimated
> `withTiming` with the named beziers**, **UI-thread**, **zero layout properties animated**, **zero
> springs**.

🟢 Verified available: `react-native-reanimated@~3.17.4` in `mobile/package.json`. The named beziers
are §5.2's four: `ease-standard` `0.32, 0, 0.24, 1` · `ease-enter` `0, 0, 0.22, 1` · `ease-exit`
`0.4, 0, 1, 1` · `ease-linear`.

> **Every entrance plays once, `useRef`-guarded.**

That restates §5.3 rule 2 and is the reason §18.3 matters.

### 18.3 🔴 TWO REVIEW ARTEFACTS THAT ARE NOT SPEC VALUES

**Both were labelled as such in the canvas. Neither may reach the app.**

1. 🔴 **The 3.6-second loop in turn 9's six motion tiles is a REVIEW HARNESS, not a spec value.**
   Verbatim: *"The demo loop (3.6s) is a review harness, not a spec value — in the app every entrance
   plays once, `useRef`-guarded."* Each tile's active segment is a **percentage of 3600 ms** purely so
   a reviewer can watch the token repeat. **`dur-ambient` 2600 is the only looping duration in the
   system** (§5.1), and the shimmer tiles correctly run at 2.6 s, not 3.6 s.
2. 🔴 **Turn 8a's grain and aura were rendered at 3× SPEC OPACITY, "diagnostic only."** The ship
   values are unchanged:

| layer | 8a's review value | 🟢 **SHIP** |
|---|---|---|
| `texture.grain` | .15 | **.05** (§4.6) |
| clay aura (`accent-muted`) | .48 | **.16** |
| iris aura (`accent-2-muted`) | .36 | **.12** |

⚠️ **One internal inconsistency in the source, resolved.** Turn 8a's own option label reads
*"ship: .05 / accent-muted **.14**"*, while its rationale table and turn 9's header both say
**.16 / .12**. 🟢 **Turn 9 is the later turn and states ".05 / .16 / .12" — use those.** Note that §2
row 14 defines the `accent-muted` **token** at **14%**; the .16 / .12 figures are the **rendered aura
opacities**, a different quantity, which is where the .14 slip came from.

### 18.4 What the six motion tiles demonstrate — for cross-checking §5.4

Every tile reproduces a §5.4 row already transcribed; listed so nothing reads as new:

| tile | tokens shown |
|---|---|
| screen entry + stagger | `card-entrance` `dur-moderate` 300 / `ease-enter` · 8dp rise · **stagger 40, cap 5** |
| button press | `dur-instant` 90 / `ease-standard` · **scale .985 + opacity .88** · release `dur-quick` 140 |
| sheet present | in `dur-slow` 420 / `ease-enter` · out `dur-moderate` 300 / `ease-exit` · **scrim fades with it** |
| loading | `dur-ambient` 2600 / linear · 🔴 **self-driven loop, never tied to a promise** |
| success / error | success `dur-slow` 420, **scale .92→1** · error `dur-base` 220, **4dp rise, no shake** |
| **plate entry** 🆕 | `dur-slow` 420 / `ease-enter` · **opacity only, after its card lands** |

⚠️ The plate-entry tile draws a **3-node reduction of `lunar`** (outer circle, terminator path, one
accent node — the two `fg-muted` foot dots dropped). **That is a demo simplification, not a `lunar`
variant.** §14.3.1 is the plate.

### 18.5 The two frozen screens, lever by lever — **all five levers, not just motion**

> Placed here because it is turn 9's own closing ruling and it spans §14–§18. **Read it with
> `UI-audit.md` §5.2 / §5.3 and `codemod-plan.md` §7.1 / §7.2, which remain the operative constraints.**
> **`qa.tsx` and `cosmic-report.tsx` are RESTYLE-ONLY, structure frozen** (owner decision, §10).

| lever | **`qa.tsx`** | **`cosmic-report.tsx`** |
|---|---|---|
| **§14 plates** | 🔴 **NO — every state** | 🔴 **NO** |
| **§15 primitives** | 🔴 **NO** | ✅ **`TickRule` YES** — *"a styling swap under existing section headings, structure untouched"* |
| **§16 `accent-2`** | ✅ **YES, restyle-level only** — the Deep Insight marker **recolours from `#C084FC` to `accent-2` in place** | ✅ **YES** — on the **report tags** and **`NEW` markers** |
| **§17 display rule** | 🔴 **N/A by definition — no hero.** *"The conversation is the hero"* | ✅ **YES, restyle-level** — the **existing state headline** takes `display-lg` **where it already sits**, *"since restyling a text node's type step is exactly what restyle-only permits"* |
| **§18 motion** | ✅ **YES for the tokens it already has transitions for** (send, bubble arrival at `dur-base`). 🔴 **NO new entrance choreography, and the crisis state animates NOTHING** | state transitions **keep their current triggers, re-timed to `dur-base` / `ease-standard`**. 🔴 **The seven server states remain visually distinct and NONE of this touches the poll** |

🟢 **`cosmic-report.tsx`'s poll (R3) is explicitly out of scope** — which is exactly
`codemod-plan.md` §7.2's requirement, independently reaffirmed by the design.

---

# APPENDIX A — CROSS-VERIFICATION AGAINST THE REPO

This session was the first able to read **both** the design document and the code. Two sweeps were
run. **Nothing below has been reconciled into the body of this document** — the body transcribes the
design as written; these are the conflicts, listed so a human decides.

## A(a) COPY — every user-facing string in the design, checked character-for-character

**Method.** Every string the design quotes, renders in a comp, or proposes was located in
`mobile/app/` + `mobile/components/` and compared byte-for-byte. **Treated as verbatim-by-default: a
design tool may not change copy.** New strings for genuinely new states/elements (e.g. "Plans
couldn't load.", "Contacting the store…") are **not** drift and are not listed.

### Verified EXACT — no drift ✅

| string | source |
|---|---|
| "Revelia readings are for entertainment and self-reflection purposes only. They should not be used as a substitute for professional medical, financial, legal, or psychological advice." | `components/common/EntertainmentDisclaimer.tsx:8-10` — matches the design's rendering exactly (the JSX line-wraps with trailing spaces, so the *rendered* string is what the comp shows). **§6.2 copy-locked ✅** |
| "Calculated from a noon chart" · "Since you didn't provide your birth time, your Moon sign is calculated from a noon-default chart. This is a traditional astrological convention when birth time is unknown." · "For your most accurate Moon sign, add your birth time in Profile." · "Got it" | `astrology/index.tsx:662-682` — all four exact, including the `{'\n\n'}` paragraph break |
| "Generate Birth Chart" · "Retry Birth Chart" · "Add Birth Data" · "Add Birth Time" | `astrology/index.tsx:394, 392, 202, 676` — turn 7's revert is correct and complete |
| "Add birth time" · "Add birth location" · "Add birth time + location" | `astrology/index.tsx:353-356` — all three variants exact |
| "Chart generation failed. Tap to retry." | `astrology/index.tsx:399` |
| 'Premium Feature' / 'Upgrade to Premium Plus to unlock Weekly Forecasts and 7-day guidance.' | `astrology/index.tsx:563-564` — the design's elided quotation is accurate |
| "Love & Relationships" · "Career & Success" · "Communication Style" · "Emotional World" · "Spiritual Path" | `astrology/index.tsx:502-526` |
| "Unlock Your Full Destiny" · "Get unlimited access to all of Revelia's features" · "Premium" · "Premium Plus" · "Full readings and monthly insights" · "Everything + Name Destiny, Career Path & more" · the full auto-renew paragraph · "Terms of Service" · "Privacy Policy" | `(paywall)/index.tsx:104-238` |
| "No previous purchases were found to restore." · "Your subscription is now active" | `(paywall)/index.tsx:70, 51` — both preserved verbatim as designed |
| '$5.00/month • Save 37%' · '$7.50/month • Save 42%' · 'Annual (Save 37-42%)' · 'Selected plan not available' · 'MOST POPULAR' · 'BEST VALUE' | `(paywall)/index.tsx:160, 187, 132, 40, 149, 177` |
| Home Explore subtitles: "Birth chart & predictions" · "Astrology, numerology and palm reading" · "Ask about love, career, or what's next" · "Life path & destiny numbers" · "Find your perfect match" · "Your name's cosmic power" · "Your ideal career paths" | `home.tsx:259-375` — all seven exact |
| "Personalized guidance for today" · "7-day cosmic forecast" · "Basic forecast with key dates" · "Personalized Cosmic Report" (astrology hub) | `astrology/index.tsx:551, 591, 609, 437` |
| "Combined Profile" · "Unlock your full profile" · "Reveal your destiny" · "Face Reading" · "Palm Reading" | `readings/index.tsx:233, 235, 199, 167, 197` |
| "day streak" | `components/engagement/StreakBadge.tsx:41` |
| Comparison-table feature names: "Basic face & palm readings" · "Full face reading (all categories)" · "Compatibility" · "Weekly forecasts" · "Priority support" | `components/subscription/FeatureComparisonTable.tsx:13-24` |

### 🔴 C-1 — The tier-copy revert is not implementable as written · **HIGH**

| | |
|---|---|
| **Design says** | Turn 6, item 5: *"Tier copy reverted. **Home keeps today's strings**, rendered from the same `tierDisplay` map as `profile.tsx` rather than re-deriving them. That means **the underscore problem stays visible until PM changes the map**."* |
| **Source** | `home.tsx:74` renders `` `${user?.subscription?.tier?.toUpperCase() ?? 'FREE'} Member` `` → **"FREE Member" / "PREMIUM Member" / "PREMIUM_PLUS Member"**. `profile.tsx:158-162`'s map is `{ free: 'Free Plan', premium: 'Premium', premium_plus: 'Premium Plus' }`. |
| **Assessment** | 🔴 **Three separate errors in one sentence.** (1) *"Home keeps today's strings"* and *"rendered from the `tierDisplay` map"* are **mutually exclusive** — today's string is "FREE Member"; the map's is "Free Plan". Rendering from the map **is** the copy change turn 5 proposed and turn 6 claims to revert. (2) *"The underscore problem stays visible until PM changes the map"* is **factually wrong**: the map has **no underscore** — it yields "Premium Plus". The underscore comes from `home.tsx`'s own `tier.toUpperCase()`, which is precisely the thing being replaced. (3) Turn 5's comps still render **"Free plan" / "Premium Plus plan"** (lowercase *plan*), which is **neither** today's Home string **nor** the map's value. |
| **Copy-lock status** | **§6.3 lists "Tier display names (`profile.tsx:238`, `:314` — `tierDisplay` map)" as monetisation copy, PM-owned, "verify before changing."** |
| **What to do** | The three options are distinct and must be chosen deliberately: **(a)** keep `home.tsx:74` byte-identical ("FREE Member"), which is a genuine no-change; **(b)** render from `tierDisplay` (→ "Free Plan"), which **is** a copy change and needs the PM sign-off §6.3 asks for; **(c)** a new string. **Do not let the deep plan inherit "no change" and silently ship (b).** |
| ✅ **RESOLVED (2026-07-30)** | **Option (b): render from `profile.tsx`'s `tierDisplay` map → `Free Plan`.** 🔴 **The literal is `'Free Plan'` — capital P.** Not §13's *"Free plan"*, not turn 5's *"Free plan" / "Premium Plus plan"*, not today's *"FREE Member"*. ⚠️ **Two standing consequences:** (b) **is** a copy change, so **§6.3's PM sign-off on tier display names still applies**; and 🔴 **turn 8a's comp draws "FREE Member" and its own audit line wrongly calls that *"verbatim from `tierDisplay`"*** — **transcribe 8a's layout, not its string** (§10.1.0 finding (i)). |

### 🔴 C-2 — `FeatureComparisonTable` header and value abbreviations · **MEDIUM**

| | |
|---|---|
| **Design says** | Column headers **"FREE / PREM / PLUS"**; Compatibility row values **"1 Love / Unlim. / All"**. Design's own framing: *"Restyled, **not** restructured, because it is marketing copy and PM-owned."* |
| **Source** | `FeatureComparisonTable.tsx:41-43` headers are **"Free" / "Premium" / "Plus"**. `:19` values are **"1 Love" / "Unlimited Love" / "All Types"**. |
| **Assessment** | Header casing is benign (`overline` is uppercase-only, so "Free"→"FREE" is a render, not a rewrite). **But "Premium"→"PREM", "Unlimited Love"→"Unlim." and "All Types"→"All" are abbreviations — real copy edits to strings the design itself calls PM-owned.** They exist to make three columns fit 360dp, which is the design's own "layout-problem allowance", but abbreviating a plan name in a comparison table is a marketing decision. |
| **What to do** | Either widen the column treatment to keep "Premium"/"Unlimited Love"/"All Types", or get PM sign-off on the three abbreviations. Add all three to §6.3. |

### 🔴 C-3 — Four casing changes on non-uppercase elements · **MEDIUM**

> ## 🔴 ROW 4 IS **SUPERSEDED**, NOT ANSWERED — PM, 2026-08-03; APPLIED 2026-08-05
>
> **The string this row argues about no longer exists.** PM approved renaming the feature
> **"Ask the Stars" → "AI Astrologer"**, and all three user-facing sites now render the new name
> (`home.tsx`'s Explore row, the readings-hub card title, and `qa.tsx`'s screen title — which is
> the very string §6.3 copy-locked). **The two-casings-for-one-product-name divergence is therefore
> resolved by RETIREMENT rather than by convergence**, and the capital-S question is moot.
>
> 🔴 **MARKED SO NO FUTURE SESSION APPLIES A CASING SWEEP TO A DEAD STRING.** Rows 1–3 of the
> table below (`Restore Purchases`, `View All`, `View Full Reading →`) are **UNTOUCHED and still
> open** — this note retires row 4 only.
> ⚠️ `UI-audit.md` §6.3's `"Ask the stars"` row is superseded by the same ruling; the lock now
> attaches to **"AI Astrologer"**, and `"Deep Insight"` (§6.3, the premium mode INSIDE this feature)
> is unchanged and still reads correctly against the new feature name.


Each of these renders at `text-sm`/`text-2xs` — **not** at `overline` — so the casing change is
**visible in the shipped UI** and is the same class of drift turn 7 reverted for the Astrology
buttons.

| design | source | file |
|---|---|---|
| "Restore purchases" | **"Restore Purchases"** | `(paywall)/index.tsx:223` |
| "View all" | **"View All"** | `home.tsx` (RecentReadings header action) |
| "View full reading ›" | **"View Full Reading →"** | `home.tsx:240` |
| "Ask the stars" (Home Explore row) | **"Ask the Stars"** | `home.tsx:293` |

**Note on the last one — it is more interesting than the others.** The repo has **two casings for
one product name**: `qa.tsx:644` (the screen title) says **"Ask the stars"**, while both entry points
— `home.tsx:293` and `readings/index.tsx:139` — say **"Ask the Stars"**. **§6.3 copy-locks
"Ask the stars" (`qa.tsx:644`) as product naming.** So the design is *converging on the copy-locked
form*, which is defensible and arguably a bug fix — but it is still an edit to two shipped strings,
and the divergence is a pre-existing repo inconsistency the design normalises **silently**. Surface
it to PM rather than letting it ride in a codemod diff.

**"Start 7-Day Free Trial" → "Start 7-day free trial"** appears in turn 6's comp and would belong in
this list, but **turn 7's A6 deletes that label entirely**, so it is moot.

### 🔴 C-4 — "Personalized Cosmic Report" → "Cosmic Report" is a LIVE, un-retracted proposal · **MEDIUM**

| | |
|---|---|
| **Design says** | Turn 5, item 3: *"'Personalized Cosmic Report' → 'Cosmic Report' **in the Explore row only**, because the full string wraps to two lines at 360dp while the row's subtitle already says what it is."* |
| **Status** | **Turn 6 reverted item 5 (tier copy) but said nothing about item 3.** So the rename **survives**. It is **not** in §13's superseded list and it is **not** covered by the five drifts that were caught. |
| **Source** | `home.tsx:275` (region) renders **"Personalized Cosmic Report"**; `astrology/index.tsx:437` also renders **"Personalized Cosmic Report"**, and turn 7's astrology comp keeps it **verbatim**. |
| **Assessment** | If the Explore-row rename ships, **the app will call one product two different names on two screens** — "Cosmic Report" on Home, "Personalized Cosmic Report" on the Astrology hub. That is worse than either name consistently. It is also **product naming**, i.e. §6.3 territory. |
| **What to do** | Decide once, apply everywhere or nowhere. Get PM sign-off. |

### 🟠 C-5 — Two monetisation strings the audit's §6.3 missed, both retired by LockShell · **LOW/MEDIUM**

`UI-audit.md` §6.3 lists **"Unlock with Premium" / "Upgrade"** (the duplicated `SectionCard`). It
does **not** list `LockedSection`/`LockedBanner`'s strings, which LockShell also retires:

| string | file |
|---|---|
| **"Upgrade to Unlock"** | `components/readings/LockedSection.tsx:51` |
| **"Upgrade Now"** | `components/readings/LockedSection.tsx:79` (banner variant) |
| **"Premium" / "Premium Plus"** as a **hardcoded badge label** | `LockedSection.tsx:18` |

The design replaces all of them with **"Unlock this section"** and no tier name. That is consistent
with fix 1 ("no tier-name literal anywhere") and it also removes **three more tier-name literals the
design never counted**. **Add all three to §6.3 and get the same PM sign-off as "Unlock with
Premium".**

### 🟡 C-6 — Section-heading casing inside `overline` — benign, but do not rewrite the literals · **INFO**

The design's comps render section headings sentence-cased ("Your cosmic blueprint", "Planet
placements", "Life themes", "Your insights", "Your numbers", "This month", "Key dates", "Today's
insight", "Recent readings", "Start a reading"). The repo has them **Title Case** ("Your Cosmic
Blueprint", "Planet Placements", …, "Start a Reading"). **Because `overline` is UPPERCASE-only, the
rendered output is identical either way** — this is a comp artefact, not drift. **But an engineer
transcribing from the comp will rewrite the source literals.** Keep the source strings; apply
`textTransform: 'uppercase'`. (One real deletion hides in here: **"Key Dates:" loses its colon.**
Trivial, but it is a character.)

### 🟡 C-7 — Two labels deleted rather than reworded · **INFO**

- **"Overall Energy"** (`components/insights/DailyInsightCard.tsx:44`) does not appear in the
  design's insight card; the score bar is unlabelled.
- **"Unlock Full Insight"** (`DailyInsightCard.tsx:141`) is replaced by LockShell's CTA.

Both are legitimate consequences of restructuring the card, not rewordings — recorded so nobody
"restores" them later thinking they were lost accidentally.

---

## A(b) INVARIANTS — the design read against `UI-audit.md` §5, §6 and §7

**There are conflicts. Five, plus two omissions.** They are listed with the design's claim, the
audit reference, and an assessment. **None has been silently reconciled.**

### 🔴 I-1 — Grain mount point (iii), "the `(auth)` layout", is both redundant and unimplementable as stated · **HIGH**

| | |
|---|---|
| **Design claims** | Turn 3, **W2**: *"Grain on `welcome` but not login/signup/verify **alternates textured and untextured** through the first-run funnel… **Reconsidered — you're right, I'm changing it.** Grain now covers **the whole `(auth)` stack**… Mount points become 3 → **4**."* |
| **Audit reference** | §3.1 — `ScreenContainer` is used by **25 of 32** screens. §5.1 **X2** — `welcome.tsx` deliberately does **not** use it. |
| **What the repo says** | `grep -l ScreenContainer app/(auth)/*.tsx` returns **six files**: `login`, `signup`, `verify-email`, `verify-code`, `forgot-password`, `reset-password`. **All six are already covered by mount point (i).** `(auth)/index.tsx` is an 11-line defensive redirect that renders nothing visible. |
| **Assessment** | 🔴 **W2's premise is false, and the fix it triggered creates a real defect.** The funnel does **not** alternate: `welcome` gets grain from mount (ii) and **all six others get it from mount (i)**. Adding mount (iii) therefore lays a **second** 5% grain layer over all seven visible `(auth)` screens — **~10% effective opacity on the entire first-run funnel**, i.e. exactly twice the specified density, on the screens a new user sees first. **Separately, (iii) is not implementable as described**: `app/(auth)/_layout.tsx` is a **bare `<Stack>`** with no wrapping View, and `contentStyle.backgroundColor` cannot carry a tiled image — so "mounting grain in the (auth) layout" requires **wrapping the `Stack` in a `View`**, a structural change to a layout file, after which the grain sits *above* the `Stack` and stays static while screens slide beneath it under `animation: 'slide_from_right'`. |
| **Recommendation** | **Revert to three mount points**: `ScreenContainer`, `welcome.tsx` (X2 wrapper), `(paywall)/index.tsx`. That achieves W2's stated goal — a continuous textured funnel — with **no double-tiling and no layout-file surgery**. The turn-2 → turn-3 reversal was made to solve a problem the repo does not have. **§4.6 transcribes the 4-mount version because it is the surviving design; this is the finding that should change it.** |

### 🔴 I-2 — Paywall finding (i) describes a code path that does not exist · **HIGH**

| | |
|---|---|
| **Design claims** | Turn 6, finding (i): *"**Cancellation is treated as failure** — `purchasePackage`'s throw path shows `Alert('Purchase Failed')` at `:55`, and **RevenueCat throws on user cancellation, so backing out of the store sheet accuses the user of an error.**"* And the state table: cancelled → *"this is finding (i) and it is a **one-branch fix**."* |
| **Audit reference** | `preflight-findings.md` **§A3 — ❌ REFUTED**, with line evidence. |
| **What the repo says** | `lib/revenuecat.ts:51-61` **swallows every throw and returns `null`**; `store/subscriptionStore.ts:61-64` collapses that to `false`; and `(paywall)/index.tsx` has **no `else` branch**. The `Alert('Purchase Failed')` at `:56` is therefore **unreachable**. `userCancelled` is read at `revenuecat.ts:56` **only to suppress a `console.warn`**. |
| **Assessment** | 🔴 **The designed *outcomes* are right and should ship** — silent on cancel, inline strip on genuine failure. **But the mechanism is inverted.** Today, **cancel and genuine billing failure both produce absolutely nothing**: the user taps Subscribe, the sheet closes, and the app says not one word. So the **cancelled** state is already the current behaviour (for the wrong reason), and the **purchase failed** state is **not a one-branch fix** — it requires **propagating a tri-state out of the `lib/` boundary** (success / cancelled / failed), which is a change in `lib/revenuecat.ts` **and** `subscriptionStore.ts`, not in the screen. The repo already has the right shape to copy: `utils/shareReading.ts`'s boolean + exported `isShareDismissal` (**X6**). |
| **Recommendation** | Scope the paywall work with the tri-state propagation **included**, and **do not "fix" this by re-enabling the alert at `:56`** — that would surface an alert on cancellation, which is the thing the design correctly wants to avoid. |

### 🔴 I-3 — "Five native `Alert.alert` calls": there are seven, and two have no designed state · **MEDIUM**

| | |
|---|---|
| **Design claims** | *"**Five** native `Alert.alert` calls become inline states (`:29`, `:40`, `:52`, `:55`, `:65`, `:68`, `:71`)."* — a count of five against **seven** line numbers. |
| **What the repo says** | `(paywall)/index.tsx` has **seven** `Alert.alert` calls: `:29` (plans not loaded), `:40` (Selected plan not available), `:51` (Success!), `:56` (Purchase Failed), `:66` (**Success / subscription restored**), `:70` (No Purchases Found), `:73` (**Restore Failed**). |
| **Assessment** | The eight designed states cover `:29`, `:51`, `:56`, `:70`, and retire `:40` implicitly (payload-order iteration removes the constructed identifier, so "Selected plan not available" ceases to exist — good). **But two are uncovered:** 🔴 **`:66` "restore succeeded"** — there is no *restore succeeded* state in the table, only *restore found nothing*; and 🔴 **`:73` "restore failed"** — there is no *restore errored* state either. Ship the design as written and a **successful restore silently does nothing**, which on this screen means a paying user who reinstalled gets no confirmation that their subscription came back. |
| **Recommendation** | Add two states to §10.2.5: **restore succeeded** (reuse the `success` token and the existing "Your subscription has been restored!" copy) and **restore failed** (the neutral strip, existing copy "Unable to restore purchases. Please try again."). |

### 🔴 I-4 — The design's icon-everywhere decision depends on a transitive dependency · **MEDIUM**

| | |
|---|---|
| **Design claims** | §9.2 — no text glyph or emoji renders as an icon anywhere; Ionicons throughout; the tab bar, every chevron, every lock plate, every Explore row, `LIFE_THEME_EMOJIS` deleted, the comparison table's ✓/– as Ionicons. |
| **Audit reference** | 🔴 **§7.3**: `@expo/vector-icons@14.1.0` is *"in `node_modules` but **NOT** in `mobile/package.json` dependencies — transitive via `expo`"*, and §7.3's "what a designer would need to request" table says: *"**promote it to a direct dependency first**, since relying on a transitive dep is fragile across Expo upgrades."* |
| **Assessment** | Not a conflict with a HARD invariant, but a **technical-ceiling item the design never addresses** while multiplying the dependency's blast radius from 13 files to essentially every screen. If an Expo upgrade ever drops or re-versions the transitive dep, the revamped UI loses **every** icon at once — and there is no longer an emoji fallback, because the design deleted them. |
| **Recommendation** | Add `npx expo install @expo/vector-icons` to the same step as the `expo-font` install. One line, and it removes a whole class of upgrade risk. |

### 🔴 I-5 — The `BirthChartWheel` sizing change is three lines, not one · **MEDIUM**

| | |
|---|---|
| **Design claims** | *"`BirthChartWheel.tsx:56` `const size = 300` becomes derived from measured container width (`onLayout` → `size = Math.min(width, 320)`)… **`viewBox` stays `0 0 300 300`** so every radius, angle and glyph coordinate in the file is untouched. **That is the one-line change** and it is the reason the geometry constants survive."* |
| **What the repo says** | `BirthChartWheel.tsx:55` `const size = 300`; `:56-57` `const cx = size / 2; const cy = size / 2;`; `:58-60` `outerR = 140, innerR = 120, planetR = 80` (**absolute**); `:76` `<Svg width={size} height={size} viewBox={\`0 0 ${size} ${size}\`}>` — **the `viewBox` is templated *from* `size`.** |
| **Assessment** | 🔴 **Changing `size` alone does the opposite of what the design intends.** The `viewBox` would follow `size` down to `0 0 280 280` / `0 0 240 240` while `outerR` stays `140`: at 280, `cx = cy = 140` and the outer ring spans exactly 0→280, clipping its own stroke and the zodiac glyphs outside it; at 240, `cx = cy = 120 < outerR = 140`, so **the ring renders outside the viewBox and is cut off.** The design's *intent* is correct and its stated invariant (hold the `viewBox`) is exactly right — the **"one-line" framing is what is wrong**, and it is the kind of framing that gets implemented literally. |
| **Recommendation** | Three edits, and they must land together: (1) a `VIEWBOX = 300` constant, with `cx`/`cy` = `VIEWBOX / 2` — **decoupled from the rendered size**; (2) `viewBox="0 0 300 300"` as a literal (or from `VIEWBOX`), **never from `size`**; (3) `size` from `onLayout`, feeding **only** `width`/`height`. Also note the line reference is `:55`, not `:56`. |

### 🔴 I-6 — Tab-bar `paddingTop`: turn 4's comp says 12, X18 says 8 · **LOW, but it is an invariant**

| | |
|---|---|
| **Design claims** | Turn 4's tab-bar specimen: *"**Tab bar drawn to the constraint:** 85dp total, `paddingBottom 24`, **`paddingTop 12`** — so the touchable band is **49dp**… **Nothing about the height changes**, so `useBottomInsetPadding` and the five Build-22 screens need no Android re-verification."* Turn 7 then says: *"**X18** tab bar **85/24/8** untouched."* |
| **Audit reference** | §5.1 **X18** and §7.5: `app/(main)/_layout.tsx:14-16` — `height: 85, paddingBottom: 24, **paddingTop: 8**`. Verified in the repo. |
| **Assessment** | Turn 7 wins on precedence, so **`paddingTop` stays 8** — but turn 4's comp and its arithmetic are then wrong: the touchable band is **85 − 24 − 8 = 53dp**, not 49dp. A minor number, but it is inside an invariant that the audit explicitly couples to five Android clipping screens, so it should not be left ambiguous in a spec someone builds from. |
| **Recommendation** | Build to **85 / 24 / 8**. Treat turn 4's "49dp band" as a stale figure. |

### 🟠 I-7 — OMISSION: the share surfaces are redesigned with no mention of X6/X7 · **MEDIUM**

`ShareCard` (#9) and `ShareableQuote` (#10) are both redesigned with a four-state model
(composed · capturing · captured · failed) and a W1 aura fallback. **Neither the component rows nor
W1 mentions the share-dismissal contract**, which is the most explicitly-protected invariant in the
repo:

- **X6** — `shareReadingCard()` returns a **boolean**; callers gate
  `recordMeaningfulAction('share:…')` / `onShare` / `onShared` on it; **`failOnCancel: false` stays**
  on `RNShare.open`; dismissal detection uses the **exported** `isShareDismissal(error)`, never
  redefined per file. Without `failOnCancel:false` a dismissal *rejects* and the catch-driven
  fallback chain opens a **second and third share sheet**; without the boolean gate a dismissal
  records a **phantom share**. CLAUDE.md forbids "simplifying" either.
- **X7** — the fallback chain stays **exactly one deep** on a genuine `RNShare` failure.

The design's **"failed"** state is precisely where this bites: a "failed" share and a *dismissed*
share are different things, and the repo's whole cancel-cascade fix exists to keep them apart.
**Recommendation:** the deep plan must state that the redesigned share surfaces keep the boolean
gate, `failOnCancel:false` and the imported `isShareDismissal` untouched — and that
`ShareCard`'s "failed" state is only reachable when `isShareDismissal(error)` is **false**. Related
and worth folding in: `compatibility/[id].tsx:89` defines its **own local `shareReadingCard`** and
`cosmic-report.tsx:395-413` hand-rolls a PDF-attaching share (audit §8) — two bypasses the revamp
will touch.

### 🟠 I-8 — OMISSION: `astrology/index.tsx` is not one of the five `useBottomInsetPadding` screens · **LOW**

The Astrology-hub comp places the new disclaimer *"above `bottomPad`"*, implying the hook is in use
there. **It is not** — §7.5's five Build-22 screens are Home, Face Reading, Monthly Reading, Profile
and Compatibility. Adding `useBottomInsetPadding` to the Astrology hub is **additive and harmless**
(and probably correct, since the design adds bottom-anchored content), but it is **new wiring, not
preserved wiring**, and the Android clipping behaviour it guards against has never been verified on
that screen. Call it out in the plan rather than assuming it is already there.

### 🟡 I-9 — Line references in the design drift by up to ~80 lines · **INFO, but it will cost a session**

A pattern worth knowing before anyone codemods from this document: **line references the design took
from the audit / preflight docs are exact; line references it derived itself drift.**

| exact ✅ | drifting ❌ |
|---|---|
| `BirthChartWheel` usage `:472` · X13's `home.tsx:105, :139, :203, :528` · X11/X12/X16/X17/X18's refs · `astrology/index.tsx:505-529` locked props · `(paywall)/index.tsx:35, 44, 87-88` | `isPremium` — design **`:143`**, actual **`:136`** · Weekly tier check — design **`:604`**, actual **`:561`** · PLUS badge — design **`:625`**, actual **`:582-584`** · "Your Numbers" — design **`:702`**, actual **`:621`** · "Cosmic Guidance" — design **`:257`**, actual **`:248`** · missing-data variants — design **`:335-339`**, actual **`:353-356`** · `PlanetCard` — design **`:57`**, actual **`:55`** · `LifeThemeCard` — design **`:103`**, actual **`:98`** · `const size` — design **`:56`**, actual **`:55`** · most paywall element refs, off by 1–9 · file lengths quoted +1 (775 vs 774, 551 vs 550) |

**Re-locate every element by symbol or string, not by line number.**

### ✅ Checked and found CONSISTENT — no conflict

So the list above is not mistaken for the whole picture:

- **X1 / X2** — grain is explicitly an absolute `pointerEvents="none"` **sibling inside** the pinned
  View; the entrance animates the **content block**, not the pinned wrapper. Structure untouched. ✅
- **X3** — heights 48/56/64 frozen; the inner `LinearGradient` survives at 100%/100% **with both
  stops equal**; press is opacity+scale **inside** the fixed box. The radius change (12 → pill) and
  the `lg` label size change (18 → 16) are outside X3's scope. ✅
- **X11 / X12 / X16 / X17 / X18** — each named and preserved, with X16's "inner gradient floor vs
  outer card grows freely" reconciliation spelled out. ✅
- **§5.2 Q1–Q10 (`qa.tsx`)** — the design never proposes centralising the eight `!safetyMode` gates;
  grain is deliberately **not** mounted there at any safety state; the file is restyle-only; the
  global `allowFontScaling = false` is justified **specifically** to guarantee the composer cannot
  reflow. ✅
- **§5.3 R1–R11 (`cosmic-report.tsx`)** — structure frozen; only the fractional font sizes change. ✅
- **§5.5 P1 / P2** — the payload-driven redesign keeps reading
  `offerings.current?.availablePackages` and keeps purchase/restore in `subscriptionStore`. ✅
- **§5.6 `readings/index.tsx:121`** — fix 1 explicitly says *"the Q&A row keeps no marker at all,
  matching `readings/index.tsx:121`"*. Directly honours the invariant. ✅
- **§6.1 R7 safety copy** — never quoted, never restyled beyond the plain bubble. ✅
- **§6.5 `READING_SECTIONS` / `INSIDE_BULLETS`** — untouched. ✅
- **§7.1 "there is no CSS"** — the aura is `react-native-svg` `RadialGradient`, the grain is a
  pre-rendered tiled raster (which is exactly what §7.3 said was the cheap route), depth is
  lightness + `borderWidth`, and no pseudo-selector, `calc()`, filter or CSS transition appears
  anywhere. ✅
- **§7.2 legacy RevenueCat bridge** — the purchasing state's spinner is explicitly *"never driven
  by, awaited on, or interpolated against the purchase promise."* Directly answers §7.2's warning. ✅
- **§7.4 font licensing** — Literata and Figtree are both SIL OFL 1.1, clearing the constraint that
  blocked Georgia; the R9-PDF divergence is acknowledged and left as §9 Q5. ✅
- **§7.6 dark-only / portrait-only** — single-valued token set, 360dp/320dp targets. ✅

### One unverified technical assumption, flagged rather than asserted

**`resizeMode="repeat"` tiling on Android.** §4.6 specifies the grain as a 120×120 raster tiled via
`resizeMode="repeat"`. This session did **not** verify that RN 0.79's `Image` tiles reliably on
Android for all four mount points. `UI-audit.md` §7.3 endorsed the *pre-rendered raster* approach
over Skia, but said nothing about the tiling primitive. **Add it to the device-verification list
alongside W1** — if it does not tile, the fallback is a single pre-scaled 2×-density asset per mount,
which changes an asset, not the design.
