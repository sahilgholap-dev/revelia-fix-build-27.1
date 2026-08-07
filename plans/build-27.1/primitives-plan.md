# Primitives Plan — Revelia 2.1.0 · the §9 primitives phase

**Branch**: `fix/build-27.1` · **Ships as**: 2.1.0 on this branch · **Authored**: 2026-08-03
**Status**: the procedure document the implementing sessions work from, exactly as `codemod-plan.md`
was for passes 0–5. Docs-only; no product code, no components, no assets, no dependency and no
config was touched by the session that wrote it.

> **What this document is.** `codemod-plan.md` is finished — all nine passes and four config stages
> have landed and are pushed. This file is its successor: the *only* document that says what to
> build in what order for the primitives phase, with a gate per item. The other documents say what
> is true.
>
> | file | role | when to read it |
> |---|---|---|
> | **this file** | **the procedure** — build order, gates, invariant carry, rollback | continuously |
> | `codemod-plan.md` | the **method**. §0's universal rules · §3.0.2's seven blindness classes · §3.2's batch/lossy/P-2 rules · §4's honest verification limits · §5's X1–X20 · §7's do-not-touch · §12's `O-` registrar | before each item |
> | `UI-revamp-design.md` | the design contract. §9 the 15 components · §9.1 LockShell · §14 plates · §15 shape primitives · §16 `accent-2` · §17 the hero rule · §18 motion | before each item |
> | `UI-audit.md` | the code baseline — §3.5 leverage, §5 invariants, §5.7a R1 ownership, §6 copy locks, §7 ceiling | before touching any file it names |
> | `pass3b-radius-enumeration.md` · `held-collision-ledger.md` | evidence, when a number is challenged | on demand |
>
> **Precedence, when they disagree:** this file's procedure > `UI-audit.md` §5/§6/§7 >
> `UI-revamp-design.md` §9/§14–§18 > everything else. 🔴 **Within §4.4, `use` is normative and
> `absorbs` is not** (`O-40`) — see §12's `C-P3b-1`.

---

## 0. 🔴 READ THIS BEFORE THE PHASE INVENTORY: **THE GATE MODEL INVERTS**

### 0.0 🔴 AUTO-MODE STANDING RULES — owner-set 2026-08-03, binding for the WHOLE phase

**Recorded here rather than in a session handoff because a handoff is overwritten and these are
not.** Every session in this phase inherits them without being told.

| # | rule |
|---|---|
| **1** | 🔴 **NEVER STALL FOR A RULING.** If a decision is needed and no ruling exists, take the **CONSERVATIVE** option, ship it, and register it as needing review. *Conservative* means, in order: **verbatim source over the design's proposal · preserve existing behaviour over improving it · the smaller change over the larger one · leave an invariant untouched.** |
| **2** | 🔴 **NEVER INVENT** a token, a design value or a server field. If the design does not specify it, use the **nearest specified value** and register the gap. |
| **3** | 🔴 **AN INVARIANT VIOLATION IS A HARD STOP, NOT A CONSERVATIVE CHOICE.** If an item cannot be built without touching X1–X20, **skip the item and report.** Do not proceed. |
| **4** | 🔴 **COMMIT PER ITEM**, regardless of how many items a session covers. **Gate numbers and adoption counts in every body.** |
| **5** | ⚠️ **DESCOPE, owner-authorised 2026-08-03 — 🔴 AND HALF OF IT WAS REVERSED ON 2026-08-04. READ THE BOX BELOW.** As originally set: **MOTION** and the **a11y LABEL/ROLE SWEEP** were **CUT**. The token-level a11y half already shipped (AA contrast, the ~40 A5 fixes, partial dynamic type, 48dp targets) and **stays**. **Plates mount on the FUNNEL screens and Home only**, not all five everywhere. |

> ### 🔴 SCOPE REVERSAL, owner-set 2026-08-04 — **MOTION IS BACK IN. THE a11y SWEEP STAYS CUT.**
>
> | lever | descope 1 (2026-08-03) | **now** |
> |---|---|---|
> | **§5 + §18 MOTION** | 🔴 CUT | 🟢 **IN — it is its own phase, beginning with an arrival gate** |
> | **a11y LABEL / ROLE SWEEP** | 🔴 CUT | 🔴 **STILL CUT** (~93 files of per-site labels; `P78` waits on it) |
> | plate mount map | funnel + Home only | unchanged |
>
> ⚠️ **THE PRACTICAL CONSEQUENCE, AND IT IS NOT SYMMETRIC WITH THE CUT: a descoped item is not a
> preserved item.** Where the cut merely *subtracted* a transition §9 named, the reversal has to
> **BUILD** it — and it must be verified as built rather than assumed to be still there. Measured at
> the reversal: §5.5 specifies a `dur-ambient` loop on the wait screen, descope 1 cut it, **and it was
> never built at all**, so the motion phase creates it. 🔴 **Verify before assuming a preserve, on
> every §5 / §18 row.** What IS live and must survive: the wait screen's **0.97 progress asymptote**
> (it must never claim completion), its **message cross-fade**, and `minHeight` **58** (X17).
>
> ⚠️ **`ScreenContainer`'s card-entrance is the row this cuts both ways on.** Item 1 shipped WITHOUT
> it, deliberately, under the cut. The motion phase adds it — and per X1 it animates the **CONTENT
> BLOCK**, never the pinned wrapper.

### 0.1 The codemod's core assertion was IDENTITY. This phase has none.

Every gate in `codemod-plan.md` was built around one claim: **prove nothing moved.**
`resolve-utilities.js --diff` returning `0 rule(s) moved` was the strongest sentence the whole
programme could say, and three passes (1a, 2a, 3a) existed *because* that sentence was available
for them.

🔴 **Not one item in this phase can make that claim, and none should try.** Every component here
changes by design: `Card` loses `shadow-lg` and moves to `rounded-lg` 20; `Button` becomes a pill;
`ScreenContainer` gains grain, a hero slot and a card-entrance; `LockShell` replaces three
treatments with one. **An identity assertion over this work would either be vacuously true (because
it was scoped to something that did not change) or false.**

> **THE OPERATIONAL CONSEQUENCE, stated once:** where the codemod asked *"did anything move that
> should not have?"*, this phase asks **"did the right thing ARRIVE at every site that needs it?"**
> — plus a human looking at the screen. Those are the only two questions with answers here.

⚠️ **`--diff` does not become useless — it becomes narrow.** It still has exactly one job in this
phase, and it is the one job it has always had best (§3.0.2 class 4): **any batch that edits
`tailwind.config.js` or `theme.js` runs it.** The primitives phase edits `theme.js` at least twice
by construction — plates and shape primitives read `theme.color[tint]`, and §17.4's `hero` slot may
want a typed step list. Every such batch gets a `--diff` and a `--members` run, and the assertion is
*"only the keys this batch adds are new, and nothing pre-existing moved."* That is a scope proof, not
an identity proof, and the distinction must be written in the commit body so a later reader does not
inherit "the primitives phase was `--diff` clean" as if it meant anything about the components.

### 0.2 🔴 The **eight** blindness classes, re-read for a VALUE-ONLY phase

`codemod-plan.md` §3.0.2 names **eight** — **class 8 was added 2026-08-03 by this phase's own item 1
/ R-C work** (`M-5`) and is the row at the bottom of this table. **Four survive unchanged, two change
shape, one is retired for the duration, and one is new.** This table is the whole reason §1 exists.

| # | class | in the codemod | **in this phase** |
|---|---|---|---|
| **1** | **decreasing counter** — the count cross-checks the pattern, so it cannot be blinded | the backbone of every pass | 🟡 **NEARLY GONE.** Only three decreasing counters remain and all three are small: the 6 Ionicons conversions (`no-numeric-fontsize`'s excepted count falls from 60), `no-raw-hex`'s `BirthChartWheel` floor of ~12 (retired when §11.4 ships), and `no-legacy-radii`'s `dead-spellings`, which is already 0. **The class that could not be blinded is the class this phase barely gets to use.** |
| **2** | **permanent invariant** — target 0, count already 0, so a syntax change disarms it silently | `no-fontweight`, `no-synthetic-italic`, `no-bare-scrim`, `no-bare-overline`, `no-white-on-accent` | 🔴 **THE DOMINANT CLASS NOW, AND THE EXPOSURE IS AT ITS MAXIMUM.** Ten rules currently read 0 and this phase introduces **new syntax at every one of them**: a `<Plate>` component, a `<Sheet>`, a `LockShell`, a `<GrainLayer>`. §3.0.2.0's three-step widen-and-revalidate is **mandatory before each item**, not once at the start. |
| **3** | **SET completeness** — a whole missing batch is invisible; every executed batch is correct | the residual histogram, over both ledgers | 🟢 **SURVIVES AND STRENGTHENS.** It is the natural shape of an adoption check: *"enumerate every site that should now use the primitive, and give each remaining non-adopter a NAMED REASON."* §1.3 builds it into the gate. |
| **4** | **ENUMERATION completeness** — a rule is only as good as its list | `--diff` and nothing else | 🟡 **NARROWED, per §0.1.** Still the sole defence, still mandatory on every `theme.js` / `tailwind.config.js` batch, and still blind to inline styles and to components. |
| **5** | **the property the rule keys on is not where the value lives** (`O-29`, `O-32`, `O-39`) | `fontSize: <var>`, `fontWeight=` as a prop, a dimension in the spacing namespace | 🔴 **AT ITS WORST HERE, AND FOR A NEW REASON: A PROP IS NOT A CLASS AND NOT A STYLE.** `<LockShell density={2}>` carries its entire visual contract in a prop value that no grep over `className` or `style` can read. Every rule this phase writes must be able to see a **JSX attribute**. |
| **6** | **REMOVAL vs ARRIVAL** | the class pass 4 and pass 5 both hit, twice each | 🔴 **THIS PHASE IS ALL CLASS 6.** There is no removal half to hide behind. §1 is the response. |
| **7** | **a document's inference is not verified by being written** (`O-35`, `O-40`) | §3.6's inverted sentence; §4.4's two competing columns | 🔴 **SURVIVES, AND §14–§15 ARE FULL OF ITS RAW MATERIAL** — a design section written from a canvas rather than from the repo. §3.3 lists four of its instances found by measuring this session. **Where §9 or §14–§18 argues that an item is small — "a rename", "3 sites", "one line" — that sentence is a measurement requirement.** |
| 🆕 **8** | 🔴 **SEARCH-ROOT completeness** — *a file outside the roots is invisible to EVERY content-based tool at once* (`M-5`) | **found BY this phase**, at item 1 / R-C: `SUBSCRIPTION_EXAMPLES.tsx`, 39 retired tokens, three of four layers blind, `tsc` the only witness | 🟡 **THE INSTANCE IS CLOSED; THE CLASS IS PERMANENT.** 🔴 **The first seven are about WHAT a checker looks for. This one is about WHERE it looks** — so no pattern widening reaches it and `--diff`, class 4's sole defence, is **equally blind** (it resolves the same globs). **Its defence is a SET-DIFFERENCE, not a search** (`P41`). ⚠️ **Live exposure for this phase: `$SRC` is 8 directories, the content globs are 2, and the middle band (`lib/ store/ services/ hooks/ utils/`) can be seen by the gate but NOT by Tailwind.** 🟢 **Measured at item 2's pre-flight and EMPTY** — 44 files outside the globs, all `.ts`, zero live class attributes. 🔴 **Re-run both lines the moment this phase adds a `.tsx` anywhere but `app/` or `components/`** |

**What replaces the retired half.** Classes 1 and 4 carried most of the codemod's assurance. Their
replacement is not one thing, it is three, and each is named per item in §3:

1. **an ADOPTION count** (class 3's shape) — *N sites should use this primitive; N do; the residue is
   named*;
2. **an INVARIANT assertion** (§2) — the explicit dimensions and structural properties X1–X20 pin,
   asserted mechanically where a grep can reach them;
3. **a human on a device** (§8) — and this phase is the first where that is the *primary* gate rather
   than the last line of defence.

### 0.3 The three universal rules that carry over VERBATIM

Nothing about this phase weakens them; two get harder.

- 🔴 **A COMMENT IS SOURCE, and the test is "is any WORD here also a bare utility name?"** Seven
  instances so far, the last two on ordinary English prose in comments *documenting the hazard*.
  ⚠️ **This phase is the highest-risk yet** because it writes more prose-in-code than any pass did —
  every new component gets a header comment explaining its invariant. `Plate`, `Sheet`, `LockShell`
  and the four shape primitives will all want to say the words `border`, `rounded`, `blur`,
  `absolute`, `relative`, `hidden`, `visible`, `transform` and `transition` in explanation. **Every
  one of those is a bare Tailwind utility.**
- 🔴 **Locate by SYMBOL OR STRING, NEVER by line number.** Design line references drift by ~80 lines
  and this document's own `≈` hints will rot the moment a component lands.
- 🔴 **R-2 — every replacement list asserts a PER-PATTERN count, before and after.** P-2 has fired
  four times. This phase's equivalent is: *when a batch converts N call sites onto a primitive,
  assert the arrival count per call-site FORM* — a `<LockedSection>` element, a `<SectionCard locked>`
  prop and a `BlurView` block are three forms of one migration, and a total that reconciles by
  accident is exactly what §3.0.2.2.2 warns about.

---

## 1. DELIVERABLE ZERO — the arrival gate (`O-38` / **P36**), built BEFORE any component

> **This is item 0, not item 16.** `owner-actions.md` **P36**'s class is *"GATING — before §9 item 1
> is written."* Honour it literally.

### 1.1 Why it is first, and the evidence is now three passes deep

**Every arrival gate written in this project caught a live defect on its first run.** Not one was
written speculatively and found nothing:

| gate | written for | found on first run |
|---|---|---|
| `p23-optin-check.js` (pass 2b) | the scaling opt-ins | **41 of 179 sites** needed the prop at the JSX call site, not in the style object — a style-object rewrite alone would have closed 138 and reported success |
| `family-arrival-check.js` (pass 4, E7) | step-vs-family | **9 sites** with a Figtree face on a Literata step. `no-fontweight` 0, `--diff` clean, `--members` clean, `tsc` clean |
| the same gate's className half (pass 5) | `O-35` | **`font-display` had ZERO CALL SITES**, and 23 of 25 `text-display-lg` classNames were Figtree Bold. **Nobody had ever seen Literata** |
| `alpha-callsite-check.js` (pass 5) | the flip's value-shape change | a value-shaped guard would have **STOPPED throwing** on three tokens — a guard that silently opens |

🔴 **The base rate is 100%, and the phase now beginning is the one §3.0.2.0.1 names as most exposed.**
Writing the gate after the components means writing it against code you have already convinced
yourself is correct, which is the one condition under which it finds nothing.

### 1.2 The three absences that will hide in §9's components

Each is already evidenced elsewhere. **Each gets its own check; do not build one rule for all three.**

#### Absence A — a **missing FAMILY** (`O-35`'s mechanism, one level up)

**The mechanism, restated for components:** a Tailwind size utility cannot carry a family, so on the
className path the family utility written at the site IS the rendered face. A new primitive that
renders text — `LockShell`'s title and body, `Sheet`'s title, `EmptyState`'s title, `SectionCard`'s
kicker and title — introduces **new text nodes that no existing site
authored**, and if any of them names a size without a family it renders in the global body default
with no counter moving.

**The check:** `family-arrival-check.js` **already asserts both halves and already has an exception
mechanism** (the printed `GLYPH` marker). It needs **one extension, not a rewrite**:

> 🔴 **It must follow a family through a PROP.** `<LockShell title=… density={1}>` renders its title
> inside the component; the *call site* names no family and the *component* names one for all 28
> sites at once. The gate as written pairs a step and a family **inside one brace-balanced style
> object or one className string**. A component-internal pairing is a different shape.

**The extension:** for each of the seven new/extracted text-bearing primitives, assert that **every
`<Text>` node inside the component file names a family** — by `className` family utility, by a
`t.txt(step)` spread, or by an explicit `t.family[…]`. Zero exceptions, because unlike the app-wide
census there is no legacy 592 to carry: these files are being written now. **A component that fails
this is fixed, never excepted.**

⚠️ **The two legal `GLYPH` exceptions in the app today are emoji sites.** If a primitive renders an
emoji (`StreakBadge`'s 🔥 survives per §9.2), it takes the same in-file marker, printed and counted
separately — never a widened rule (§4.6's "a floor must never be closed by widening an exception").

#### Absence B — a **missing PROP** (`P23`'s className half)

**`allowFontScaling` and `maxFontSizeMultiplier` are `<Text>` PROPS. They cannot live in a style
object.** Pass 2b proved this the expensive way: 41 of 179 scaling sites had their style in
`StyleSheet.create` and needed the opt-in placed on **every JSX element that consumed that style**.

🔴 **Every new primitive that wraps reading copy inherits this, and inherits it worse**, because a
primitive is a *shared* consumer: `LockShell`'s body, `SectionCard`'s content slot and `Sheet`'s body
are reading-copy surfaces on the five `scales: true` steps, and each is written once for many sites.
**Getting it wrong is a single edit that silently freezes text at up to 28 call sites.**

**The check:** `p23-optin-check.js` exists, currently reads **MISSING 0**, and is the model here
because it is a **semantic** rule rather than a grep — it reasons about which step a site is on and
whether the prop is reachable from the JSX boundary. **Extend its site list to the new primitives as
each one lands, and keep it at MISSING 0.** A rise is the finding.

> 🔴 **AND THE HALF NOTHING HAS TOUCHED IS STILL OPEN: the className half of P23** (`C-P4-5`). A
> `<Text className="text-sm">` carries no props and is frozen app-wide today. **This phase is the
> first honest opportunity to close it** — a primitive can place the prop for every site that uses
> it. `LockShell`, `SectionCard`, `EmptyState` and `EntertainmentDisclaimer` between them cover a
> large share of the frozen reading copy. **Closing it is not required by this plan and is not
> budgeted; noting that it is now cheap is.**

#### Absence C — a **missing TOKEN ASSIGNMENT** (`C1`, the last held-value collision)

**`locked` `#2A2521` vs `surface-raised` `#1E1A17` is the single collision the codemod deliberately
left open**, and it left it open on a stated ordering argument: the two were held at one value
through passes 1–4, `locked` had **zero call sites** at every measurement, and its first call site is
created *here*, after the flip, when the two values are **visibly a step apart**.

🟢 **So this is the one absence that is answerable by LOOKING, for the first time.** Pass 5's static
arrival verification measured `locked` at **0 code references** — that number is the baseline.

**The check, in two parts:**
1. **Before:** `locked`'s call-site count is **0**. Assert it.
2. **After `LockShell` lands:** it is **nonzero, and every site is a lock plate.** Then look at the
   screen at cut 3 and confirm the plate reads as a step above its ground rather than as the same
   card. 🔴 **Pick the token deliberately and record the choice in the commit body** (§3.0.2.2.1's
   rule for collision tokens), because a wrong assignment here is invisible to every gate and
   permanent.

### 1.3 `primitive-adoption-check.js` — the gate, specified

**One new node script, the 20th named rule.** Its shape is `p23-optin-check.js`'s, deliberately:
🔴 **that is the only non-grep, semantically-reasoning rule in the tree, and it is therefore the model
for a semantic invariant.** `family-arrival-check.js` contributes the brace-balance discipline;
`alpha-callsite-check.js` contributes the *invoke-the-mechanism* discipline. Copy all three shapes,
not one.

**What it asserts, per primitive, driven by a table in the script itself:**

```
for each primitive P with an adoption contract:
  expected = the enumerated set of call sites that MUST use P   (a list, in the script)
  actual   = the JSX elements <P …> found in the tree           (by element name, brace-balanced)
  1. actual ⊇ expected                    — every site that should adopt, did
  2. actual \ expected is EMPTY or NAMED  — an unexpected adopter is a finding, not noise
  3. the LEGACY form is absent            — <LockedSection>, the 5 inline SectionCards, …
  4. P's own file passes the family check and the opt-in check   (§1.2 A and B)
```

🔴 **Assertion 3 is what makes assertions 1–2 honest, and it is the only decreasing counter this
phase gets.** A migration that adds `<LockShell>` at 28 sites while leaving `<LockedSection>` at 3
of them reads as complete on an adoption count alone.

**Three properties it must have, each learned the hard way:**

- 🔴 **It reads JSX ELEMENT NAMES and PROP VALUES, not classNames and not styles.** Class 5 in its new
  shape (§0.2): `<LockShell density={2}>` carries its whole contract in a prop. A rule anchored on
  `className` or on `style` is structurally blind to this phase.
- 🔴 **Brace balance, never a line window.** A line window is precisely what could not see pass 4's
  defect, and a JSX element with six props spans six lines routinely.
- 🔴 **Re-validate in BOTH directions before it is trusted** (§3.0.2.0 step 3): run it against the
  **pre-migration** tree and assert it returns exactly the known site set — equality, not "at least".
  ⚠️ **OVER-finding is the more insidious direction**: a rule that cries wolf is decommissioned by its
  own output, which is how `no-white-on-accent` became report-only.

**Wire it into `token-gate.sh` beside the other three node rules**, printing `expected / actual /
residue` per primitive so a growing residue says so in the output rather than in a document nobody
re-reads.

### 1.4 ⚠️ An arrival gate needs an EXCEPTION MECHANISM before it can assert a MISSING thing

Pass 3a's `R-1` is the precedent and it is binding here. `family-arrival-check.js` could not demand a
family until the `GLYPH` marker existed, because without it the rule over-found on two correct sites.

**So `primitive-adoption-check.js` ships its exception mechanism in the same commit as its first
assertion**, and the mechanism is an **in-file marker at the site**, not a list in the script:

```tsx
{/* ADOPTION-EXEMPT: combined.tsx's SectionCard is {title, icon, children} with no
    locked branch — a different component wearing the same name (§3.3 M-2). */}
```

Counted separately, printed every run, never summed with the live count.

---

## 2. 🔴 THE INVARIANT CONTRACT — AND THE INVERSION THAT MAKES IT DANGEROUS

### 2.1 Leverage is INVERSELY correlated with safety

`UI-audit.md` §3.5 ranks the phase by how much of the app each item changes. **That ranking is the
scope, and it is very nearly the risk register read upside down.**

| §3.5 rank | item | reach | carries |
|---|---|---|---|
| **1** | `ScreenContainer` | 25/32 | 🔴 **X1** — the pinned-`Dimensions` structure, three separate `minHeight`/`flex` guards |
| **2** | `Button` | 19 | 🔴 **X3** — heights 48/56/64, the 100%/100% gradient |
| **14** | tab bar | 24 | 🔴 **X18** — 85 / 24 / 8, coupled to `useBottomInsetPadding` on five screens |
| — | `StreakBadge` | 1 | 🔴 **X11** — height **and** `borderRadius: cfg.height / 2`, **coupled** |
| — | `AstroNumeroBadge` | 1 | 🔴 **X12** — heights 44/56/88 **and** the `width:1 height:32` divider |

> 🔴 **THE FOUR HIGHEST-LEVERAGE ITEMS IN THE PHASE ARE FOUR OF THE FIVE MOST TIGHTLY PINNED
> COMPONENTS IN THE REPO.** The two lists were built for opposite reasons and they overlap almost
> completely, because the same property drives both: a component that appears everywhere is a
> component that had to be made to work everywhere, and on iOS that meant an explicit dimension.

**And the second half of the inversion, which is what actually bites:**

> **`6525a75`, verbatim: *"Android unchanged — flex propagation works there, explicit dimensions are
> no-ops."***

**On Android every one of these guards looks like dead code.** Delete them, run the app, see nothing
change, ship — and eight surfaces collapse to thin ribbons on iOS. 🔴 **`codemod-plan.md` §5.4 closed
the iOS verification programme permanently** (founder decision; iOS is paused). Until pass 5 there
were two protections: the documented invariant, and the possibility of catching a mistake on a
device. **The second is gone. The first is all there is**, and this is the phase that rewrites the
files it lives in.

🔴 **X1–X20 ARE PRESERVE-BLINDLY, ABSOLUTELY. Nothing in this plan licenses removing, simplifying or
"cleaning up" a guard, and no Android screenshot is evidence about any of them.**

### 2.2 Per-component invariant carry — what must not change, and how it is checked

*Check* = the assertion, runnable where possible. Where no check exists, the row says so; **that is
the point of writing it down.**

| item | invariant | what specifically must not change | check, with no iOS build |
|---|---|---|---|
| **1 `ScreenContainer`** | **X1** | the outermost element stays pinned to `Dimensions.get('window')` with `position:'absolute', top:0, left:0`; `SafeAreaView` keeps `flex:1 + width:'100%' + minHeight:SCREEN_HEIGHT`; `ScrollView` keeps `flex:1` + `flexGrow:1, minHeight: SCREEN_HEIGHT - 100` | `grep -n "Dimensions.get\|position: 'absolute'\|minHeight: SCREEN_HEIGHT" components/ui/ScreenContainer.tsx` — **the four anchors survive every commit.** 🔴 **Grain mounts as an absolute `pointerEvents="none"` SIBLING INSIDE the pinned View; the entrance animates the CONTENT BLOCK, never the pinned wrapper.** The hero slot (§17.4) is content, not structure |
| **X2 `welcome.tsx`** | **X2** | the same fix hand-rolled; **do not "unify" it onto `ScreenContainer`** — it deliberately does not use it | `grep -n "Dimensions.get" "app/(auth)/welcome.tsx"` ≥ 1. Grain mount ii goes **inside** its X2 wrapper |
| **2 `Button`** | **X3** | `SIZE_HEIGHT` 48/56/64 and the inner `LinearGradient`'s `width:'100%', height:'100%'` — **never padding-only sizing** | assert the three heights are still literals in the file. 🔴 **The radius change (→ `pill`) and the designed `lg` label change (18→16) are OUTSIDE X3's scope and are allowed.** Press is opacity + scale **inside** the fixed box, so nothing reflows. **×5 variants**: primary / secondary / outline / ghost / danger |
| **3 `Card`** | — | nothing pinned | `shadow-lg` is **removed** (§4.5 zero-elevation). 🔴 **`rounded-lg` 20, not 14** — `O-40` ruled `use` normative, and a `Card` at 14 puts its nested panels at the identical corner |
| **4 `SectionCard`** | — | nothing pinned; **but see §3.3 M-2** | the 4 `locked` variants delegate to LockShell d2; the `🔒` emoji at `{color:'#9CA3AF', fontSize:14}` → **Ionicon `lock-closed` 20** (§9.2). 🔴 **`combined.tsx`'s copy is a DIFFERENT component** — `{title, icon, children}`, no `locked` — do not force it into the same shape |
| **5 `Input`** | — | nothing pinned | 🔴 **`label` stays a REQUIRED prop**, typed `label: string` with no default — that is what makes `fg-placeholder`'s sub-AA 3.30:1 safe by construction. h 56, `rounded-md` 14, `bg-surface-overlay`, `border-subtle` → **`border-strong` on focus** (new state; 1b registered that `Input` has none today) |
| **6 `EntertainmentDisclaimer`** | **X8 / X9** | **presence and string are HARD; the container is SOFT** | `grep -rln "EntertainmentDisclaimer" app` = **7 files before, ≥7 after** (the design ADDS Home and the Astrology hub — additive, allowed, string **verbatim**). 🔴 `role="text"`, **never** `importantForAccessibility="no"` — it is a legal notice. 🔴 **Do not consolidate the six divergent strings** (§6.2, audit Q3 unanswered) |
| **7 `GeneratingReading`** | **X17** | `minWidth: 220` · `maxWidth: 320, height: 8` · `minHeight` **58** (raised from 44 in 2b, and the raise rides with its scaling opt-in) | assert all four literals survive. 🔴 **The 0.97 asymptote is preserved exactly** — the existing four-leg `withSequence` (12s→25s→45s→60s, 0.35→0.65→0.88→0.97) stays and the bar never reaches 1.0 until the server says ready. *"About a minute" is a range, never a countdown* |
| **8 `EmptyState`** | — | nothing pinned | **one action maximum, never two.** Also resolve `qa.tsx`'s local `EmptyState` name shadow **here and only here** |
| **9–11 share surfaces** | **X6 / X7** | 🔴 all four properties: the **boolean** return · callers **gate** on it · **`failOnCancel: false`** · dismissal via the **exported** `isShareDismissal` | `grep -n "Sharing.shareAsync\|Share.share" utils/shareReading.ts` — the chain stays **exactly one deep**. 🔴 **BINDING: `ShareCard`'s "failed" state is reachable ONLY when `isShareDismissal(error)` is FALSE.** A dismissal lands in `composed`, silently, exactly as today. The design's four-state model (§9 #9) **never mentions X6/X7** — that is I-7, and this row is the fix |
| **12 loading system** | — | nothing pinned | **3 densities**, **never two at once on one screen**. Shimmer is a self-driven `dur-ambient` 2600 / `ease-linear` loop, 🔴 **never tied to a promise** |
| **13 `LockShell`** | — | nothing pinned; §4 in full | see §4 |
| **14 tab bar** | **X18** | **85 / 24 / 8** | assert the three literals. 🔴 **Build to 85/24/8** — design I-6: turn 4's comp says `paddingTop 12`, turn 7 says 8 and **wins on precedence**; the real band is 85−24−8 = **53dp**, and "49dp" is stale. **Changing the height means re-verifying the five Build-22 Android clipping screens** (Home, Face, Monthly, Profile, Compatibility) because of `useBottomInsetPadding`. Labels are **`text-2xs` 12/16, NOT `overline`** (uppercase-only; the labels are Title Case) |
| **15 `Sheet`** | **X19-adjacent** | — | 🔴 **The only component whose ground is `surface-overlay`, so §2.1's prohibition lands here and only here: `danger` is BANNED as text at any size and any weight** (4.28:1). The destructive action is a **`danger`-filled Button with an `on-accent` label** at 5.60:1; cancel is `ghost`, **below** it. `accessibilityViewIsModal`; focus moves to the title; **the scrim is a labelled dismiss button** |
| **the paywall** | **X19** | **both** `zIndex: 50` **and** `elevation: 10`, and `position:'absolute'` **outside** the `ScrollView` | `grep -n "elevation" "app/(paywall)/index.tsx"` = **1**. 🔴 **The only `elevation:` in the codebase**, while §4.5 mandates zero elevation — a cleanup pass will read it as dead code. It is a **stacking fix, not depth**. Drop it and **the only exit from a `presentation:'modal'` screen with no header back button can become untappable on Android** |
| **`DeleteAccountModal`** | **X20** | the two `height: 56` | if §9's `Button`/`Sheet` absorb these two hand-rolled buttons, **X3 takes over and X20 retires**. 🔴 **R-4 is PERMANENT: `danger` fill + `on-accent` label, 5.60:1** — that button has been a contrast defect three times, each quieter than the last, every time from deriving the colour at the site |
| **`StreakBadge`** · **`AstroNumeroBadge`** | **X11 / X12** | §2.3 | §2.3 |
| **every screen** | **X4 / X5** | `recordMeaningfulAction(key)` is the only review entry point; `initReviewStore()` is called exactly once in the root layout | `grep -rn "StoreReview\|attemptReview" app components` → **only** `lib/inAppReview.ts` + `store/reviewStore.ts`. 🔴 **No per-screen counters, no `useRef` fire-once guards, no SecureStore "counted" flags** |

### 2.3 🔴 X11 IN FULL — the single most likely accidental violation in the phase

```tsx
// components/engagement/StreakBadge.tsx — measured 2026-08-03, verbatim
const SIZE_CONFIG = {
  small:  { height: 28, paddingHorizontal: 10, emoji: 14, number: 13, label: 11 },
  medium: { height: 36, paddingHorizontal: 14, emoji: 18, number: 15, label: 12 },
  large:  { height: 48, paddingHorizontal: 18, emoji: 22, number: 19, label: 14 },
} as const;
…
borderRadius: cfg.height / 2 /* DERIVED */,   // 🔴 X11 — COUPLED to the height.
```

> 🔴 **THE "JUST USE PADDING + `rounded-full`" RESTYLE IS BANNED ON THIS COMPONENT SPECIFICALLY.**

**Why it is the most likely violation and not merely one of twenty:**

1. **It is the archetypal restyle.** A pill badge with an explicit height and a computed radius is
   *exactly* what a competent engineer normalises on sight, and the phase's whole job is
   normalisation. §5's own words: *"a codemod's whole job is to normalise magic numbers."*
2. **The two properties are COUPLED, so a partial fix is worse than none.** Deleting the height also
   breaks the pill — `cfg.height / 2` has nothing to divide. An engineer who removes the height and
   adds `rounded-pill` gets a *correct-looking* Android result and has silently deleted an iOS
   collapse guard.
3. **Pass 3b had to except it by name.** `no-numeric-radius` carries a printed `/* DERIVED */`
   exception for exactly this line, plus two more in `AstroNumeroBadge`. **Three derived radii,
   permanently excepted, and the exception is what a later reader will try to "clean up".**
4. **It sits on the app's highest-traffic screen** (`home.tsx`), so a restyle pass will open it.
5. 🔴 **It also holds three of `O-29`'s eleven variable-`fontSize` sites** (`emoji`, `number`,
   `label`), which are **CLOSED as permanently unverifiable** — the table interleaves glyph sizes
   with numerals and labels, §6.6.2 measures `small` at **6.0px of headroom** (the tightest surface
   in the register), and blind-editing it is precisely what §5 exists to prevent.

**The check, and it is the only one available:** the in-file comment at ≈`:11-12` and the
`/* DERIVED */` marker **stay**, `no-numeric-radius`'s excepted count **stays at 3**, and
`no-variable-fontsize` **stays at 11**. 🔴 **A FALL in either number on this component is a finding,
not an improvement.** That inverts the usual reading of a counter and must be said in the commit body.

⚠️ **The same argument applies verbatim to `AstroNumeroBadge` (X12)** — heights 44/56/88, the
`width:1 height:32` divider (which §10.3 rules **recolours to `border-subtle` and keeps both
dimensions**), and 8 of `O-29`'s 11 sites. It ranks lower here only because a divider is less
tempting to restyle than a pill.

### 2.4 How each is checked given no iOS build exists

**Honestly: three ways, none of which is verification.**

1. **Mechanical assertion of the literal** — a grep for the number in the file it lives in. This
   proves the guard *survives the diff*. It does not prove it *works*, and it never could.
2. **The in-file comment** — §5.3 item 2's cheapest permanent risk reduction. 🔴 **X13 (4 sites),
   X14 (7), X15 and X16 still have NO in-file comment; the only record is commit `6525a75`.** This
   phase touches `home.tsx`, `readings/index.tsx`, `numerology/index.tsx` and `DailyInsightCard.tsx`.
   **Add the comment in the commit that touches the file.** One line each.
3. **This document, and `codemod-plan.md` §5.** §5.4's ruling makes the documentation *the only
   protection left*, which means a plan that fails to restate the invariant has removed it.

**What is NOT a check:** an Android build, an Android emulator, a screenshot, or the app not
crashing. Say so in the cut-3 notes rather than letting a green device pass imply coverage.

---

## 3. BUILD ORDER

### 3.1 The order, with reach, states and gate

From `UI-audit.md` §3.5's leverage ranking, with the design's §9 cut line (items 1–15). **One gated
commit per item; commit at the end of each item, never at the end of the session** (§3.2's third
occurrence rule).

| # | item | reach | states | 🔴 gate |
|---|---|---|---|---|
| ✅ **0** | 🔴 **`primitive-adoption-check.js`** + the three extensions (§1) | — | — | 🟢 **SHIPPED `86d958b`.** Baseline `ScreenContainer` 25/25/0 · `EntertainmentDisclaimer` 7/7/0 · `locked` 0. Re-validated in BOTH directions: 10 injected defects, each caught singly |
| ✅ **1** | **`ScreenContainer`** | **25/32 · 78%** | scroll · fixed · keyboard-open · with-footer · refreshing | 🟢 **SHIPPED `a15884c`.** X1's four anchors asserted present · texture is an inert pinned sibling INSIDE the pinned View, at all 3 mounts · §17.4's hero slot, compiler-enforced · `--diff` 0 of 201, `--members` 0 unresolved. ⚠️ **the card-entrance is NOT here — motion is cut (§0.0 rule 5)** |
| ✅ **2** | **`Button`** | 🔴 **25 files · 54 call sites** (’19 · 59%’ was the SCREEN share and counts no component adopter) | default · pressed · disabled · loading · **×5 variants** | 🟢 **SHIPPED `2e3eec9`.** 25/25/0, 54 sites · X3's 5 literals asserted, 0 missing · prop contracts 4 checked 0 violating (🔴 a call-site `height` in `style` beats X3 — the one way it can be defeated from outside the module) · `p23-optin-check` MISSING 0 · 6 injected defects caught singly. 🆕 5th variant `danger` (R-4) · the `lg` label 18→16 · the a11y contract, once, for all 54. ⚠️ **MOTION CUT** — press stays opacity-only. 🔴 **X20 NOT absorbed — a ruling, see `O-50`'s neighbour note and the commit body: the DISARMED state has no model in the primitive.** 🔴 `--diff` caught **2 rules arriving from a COMMENT** (`O-48`) |
| ✅ **3** | **`Card`** | 🟢 **13 files · 43 call sites — ’13’ MEASURED OUT UNCHANGED**, the first §9 scope claim in this phase that did | static · ~~pressable~~ · ~~locked~~ · ~~loading~~ | 🟢 **SHIPPED `d2285ee`.** 13/13/0, 43 sites · elevation ABSENT and the retired variant ABSENT (both asserted as `absent`, the inverted literal check) · the `lg` 20 corner asserted · 31 class-bearing call sites checked for a corner override, 0 violating · 4 injected defects caught singly. ✅ **`C-P3b-1` DISCHARGED HERE — design §4.4's `absorbs` column is DELETED**, its content preserved as prose. ⬜ **3 of 4 designed states deferred with named owners**: pressable → screens phase (needs the call-site migration or it is a zero-call-site idiom), locked → item 13, loading → item 12. 🔴 `--diff` 2 moved, **both the INTENDED VANISHINGS** — a shrinking rule set is as unreadable to a grep as a growing one |
| ✅ **4** | 🔴 **extract `SectionCard`** | **5 files · 38 call sites** → 29 + 9 renamed | default · locked · ~~collapsed/expanded~~ · ~~empty/error~~ | 🟢 **SHIPPED `6e9dd60`.** 4/4/0, 29 sites · **R-2 RECONCILES PER PATTERN**: 29 `<SectionCard>` + 9 `<IconSectionCard>` = 38 · `treeAbsent` 4 asserted 0 surviving (**the only real decreasing counter of the session**) · 2 literals · 6 injected defects caught singly, one of them twice. 🔴 **FOUND A LIVE AA FAILURE (`O-44`b): 3 of 4 copies put the plain foreground on the accent-filled unlock CTA, ~2.1:1, and `compatibility/[id]`'s is REACHABLE at 6 sites.** Only the merge could see it — `no-white-on-accent` is structurally blind to that pair and read 22 before and after. 🔴 **`combined.tsx` RENAMED to `IconSectionCard`, not merged** (M-2 / `O-42`) — the name collision was itself a gate hazard. 🔴 **The paywall pushes are LEFT ALONE (item 17), but 4 origins collapsed into 1, so item 17's expected count is 19.** ⬜ **The designed display-step title is NOT taken — `O-50` / `P42`, an owner call: it would subtract from the dynamic-type coverage §0.0 rule 5 keeps** |
| ✅ **5** | **`Input`** | 🔴 **7 files · 15 call sites** — '9 · 28%' is the SCREEN share, class 7 for the third time | empty · focused · filled · error · ~~disabled~~ · with-helper | 🟢 **SHIPPED `e1026ac`.** 11/7/0 (15 sites) · 4 ADOPTION-EXEMPT named AT THE SITE (the deferred adopters report themselves) · 5 literals · 2 removals held · 12 injections caught, 2 twice. 🔴 **A placeholder-only field DOES NOT COMPILE — verified (TS2741).** 🔴 **THE FOCUS STATE IS THE ACCENT ROLE, diverging from design §2 row 12 on a measurement: the state CHANGE is 1.33:1 (`O-52` / `P43`).** 🆕 `helper` + `required` (2 and 1 call sites) · **`disabled` NOT built — no site passes `editable={false}`** · the scaling split closes part of `C-P4-5` at 3 nodes × 15 sites. 🔴 **6 more files hand-roll a field and DIVERGE; 2 are permanent non-adopters, 4 are marked deferred** |
| ✅ **6** | **`EntertainmentDisclaimer`** | **7** — the +2 NOT added (`P49`, and it is a compliance gap on Home) | one layout, six string lengths 28→196 | 🟢 **SHIPPED `1f3ac8e`.** 7/7/0 · 3 literals · 2 removals held · 7 injections, **6 caught and the 7th ESCAPED — which became `O-54`**. 🔴 **A LEGAL NOTICE WAS RENDERING BELOW AA at 3.30:1, and FOUR OF THE SIX disclaimer strings in the app were on the wrong role while TWO were already right** (`O-53`). Role fixed at all four; the string bytes are UNTOUCHED in `git diff`. `pt-4` and no bottom padding are MEASURED — all seven mounts pass `paddingBottom: bottomPad` |
| ✅ **7** | **`GeneratingReading`** | 🟢 **5 · 16% MEASURED UNCHANGED** | waiting · advancing-stage · server-complete · slow · **failed (UNREACHABLE)** · cancelled | 🟢 **SHIPPED `7b281ea`.** 5/5/0 · **10 literals** (X17 ×4 + the four asymptote legs + 2 a11y), 0 missing · 13 injections caught. 🔴 **FOUND FIVE LIVE AA FAILURES, 15 REACHABLE SITES, ON THE FIRST-RUN FUNNEL — and added the 21st named rule to see them (`O-55`).** The progress role reacts to the REAL shared value, never a second copy of the curve. 🔴 **The error branch has ZERO call sites and is NOT deleted — X17 is inside it (`O-56` / `P45`).** ⚠️ **MOTION CUT** — no aura, no bar easing, no completion |
| ✅ **8** | **`EmptyState`** | 🟢 **4 MEASURED UNCHANGED** | empty · error · offline · no-results | 🟢 **SHIPPED `24ef91e`.** 4/4/0 · 4 literals · 1 removal held · 1 GLYPH excepted · 7 injections caught. 🔴 **`P42` ANSWERED AND MEASURED: the display step's cost is that at the 1.3 cap the BODY's line height OVERTAKES the TITLE's — a RAMP finding at four specified pairings (`O-58` / `P47`).** 🔴 **The description had NO SIZE AT ALL and rendered at the platform's 14 — a rule can see a wrong size, never an absent one (`O-64`).** The `qa.tsx` shadow is a RENAME ONLY: a crisis-mode safety guarantee rides on that function's layout (audit Q3, HARD). **The plate and `pt-12` are item 18's; the plate's token has two claimants (`O-59` / `P50`)** |
| ✅ **9–11** | **`ShareCard` · `ShareableQuote` · `AffirmationCard` · 🆕 `CompatibilityShareCard`** — 🟢 **ALL SHIPPED `973562e` + `9da117b`.** 4/4/0 (4) · 4/4/0 (5, siteCounts EXACT) · 4/4/0 (5) · 1/1/0. 🔴 **A GRADIENT GROUND IS A FUNCTION OF POSITION, NOT A PROPERTY OF A STYLE RULE (`O-73`) — the class the A5 pair rule structurally cannot resolve.** Two cards ran an accent-to-canvas slab down which the on-fill role (6.86 → 1.06) and the plain role (2.31 → 16.84) CROSS, leaving a band with NO legal token. **ShareableQuote's quote was 3.87 → 1.42 at all 5 sites** — the worst reachable text in the programme, on the export surface. Fixed by the subtraction §2 already ruled (all 21 slabs but X3's retire). 🟢 **The pre-flight INVERTED for the first time: the UNSCHEDULED third surface was the one that was RIGHT** on both properties its scheduled siblings got wrong. 🔴 **A FOURTH hand-rolled copy of the share pipeline, under the util's own name** — collapsed. 🆕 `treeAbsent` takes a FILE SCOPE. ⚠️ **§9's off-screen-render-target premise is FALSE and acting on it would have been an a11y REGRESSION.** *(the old row's content follows)* | AffirmationCard: 🔴 **4 files · 5 sites** — design says "Home", which does not render it | composed · capturing · captured · failed | 🟡 **AffirmationCard SHIPPED `9da117b`** — 4/4/0 (5 sites) · 6 literals · 1 removal held · 8 injections, 6 caught and **both escapes became `O-61` and a division-of-labour finding**. 🔴 **ONE WORD IN A COMMENT DROVE `no-synthetic-italic` FROM A PERMANENT 0 TO 2 AND BLOCKED THE GATE** — the name of the effect is the banned mechanism's utility. Its lock branch is unreachable while all 3 siblings are live (`O-60` / `P46`). 🟢 **9 AND 10 ARE UNBLOCKED — `P38` check 1 was RULED, not answered (owner, 2026-08-03): TAKE THE FLAT FALLBACK. No SVG at all in the share surfaces — no aura, no plate.** The fallback was pre-decided and pre-drawn, so ruling now **REMOVES a device dependency from the critical path instead of adding a build**, and these cards are the organic-growth surface where a broken export is worse than a plain one. The upgrade is re-registered as a POST-RELEASE check, **`P51`**, and if it passes the plate is purely additive. ⚠️ The superseded note follows: 9 and 10 were BLOCKED on `P38` check 1 — §3.1's own note calls building a plate into a share card before that answer *"the one ordering mistake that wastes a whole item"* |
| ✅ **12** | **loading system** | **7 call sites, 7 files** after the merge | 🔴 **TWO of the three densities exist** | 🟢 **SHIPPED `56c227e`.** 7/7/0 · **`legacy <LoadingView>` 0 — THE ONE REAL DECREASING COUNTER THIS PHASE GETS** · 2 literals · 2 removals held · 8 injections caught, one of them twice. 🔴 **ONE DENSITY HAD TWO COMPONENTS, diverging on the message's step AND colour, which made the item's own invariant unverifiable.** `LoadingView` DELETED, 4 sites migrated. **The SKELETON density is NOT built** — its component was deleted as dead earlier in this phase and its treatment is a shimmer, so rebuilding it means a zero-call-site component plus cut motion. 🔴 **"Never two at once" CANNOT BE MECHANISED (`O-62` / `P48`)** — 9 files mount two, 8 are branch-exclusive |
| ✅ **13** | 🔴 **`LockShell`** | 🔴 **11 files · 36 call sites** — the number has moved TWICE (`O-42`'s 28 corrected §9's 3; item 4 merged four lock branches, item 13 added 3 d1 screens + 4 overlays) | 3 densities × locked/unlocked | 🟢 **SHIPPED `275147f`.** 11/11/0, 36 sites · 🆕 **`siteCounts` PER DENSITY 3 / 29 / 4 + the sum** (`O-67` — an injection ESCAPED because a file list cannot see one of ten sites vanish) · **both legacy elements 0 tree-wide** · 3 literals · 2 removals held · 31 prop contracts, 0 violating · 22 injections, 18 caught + 1 escape that became the gate fix, then 4 more all caught. 🔴 **`expo-blur` HAS NEVER BLURRED ON ANDROID (`O-65`) — `experimentalBlurMethod` defaults to `'none'`, so the four card overlays were a flat WHITE 8.6% sheet and the withheld text was LEGIBLE. A content leak, not a styling question, and §4.2's preservation argument has a false premise there.** 🔴 **A lock label at 1.25:1, reachable** — the one copy of four that reached for the on-fill token was the broken one. 🔴 **4 more live A5 failures in the touched files (1.43:1 · 2.31:1 ×3); running total ~73.** 🟢 **ABSENCE C RESOLVED — the plate grounds in `locked`, its FIRST call site ever, by ROLE, measured at 1.15:1 above its ground (the ladder's largest step) against 1.00:1 for the alternative; census now `exact: 1`** (`P50` answered). 🟢 **`O-27` CLOSED properly** — d1 covers the screen, and its exit action is a REQUIRED prop pair so the next dead end does not compile. 🔴 **`combined.tsx` is NOT a d1 site — §4.1's central property is FALSE there (`O-70`)**; it stays a `replace`. Also: `fg-muted` is **sub-AA on `surface-overlay`, 4.35:1** (`O-66`) — **this binds item 15**. ⚠️ **MOTION CUT** |
| ✅ **14** | **tab bar** | **24 · 75%** | active · inactive · pressed | 🟢 **SHIPPED `976d499`.** X18's 3 literals + the focus mechanism + the 2 changed glyph names asserted; 2 removals held. 🔴 **`renderIcon` IS CALLED TWICE AND `focused` WAS THROWN AWAY** — the navigator renders both states and cross-fades them, and the app passed the same filled glyph to both, so the state distinction was carried by COLOUR ALONE. Not motion: the blend already ran. 🔴 **X18's DOCUMENTED BAND ARITHMETIC WAS OFF BY ONE** — the installed navigator passes **25** (regular) / **18** (compact), not §9.2's 24, so headroom is **10, not 11**. The size stays the platform's: pinning 24 would delete the compact adaptation. **THE HEIGHT DID NOT MOVE, so the five `useBottomInsetPadding` screens need no re-verification.** 🔴 Found a GATE DEFECT — the text-node census read RAW source, so prose naming the text element was counted (`O-78`) |
| ✅ **15** | 🆕 **`Sheet`** + 🔴 **X20 pinned** | 🔴 **2 adopters, not 4** | presented · dismissing · ~~dragging~~ · ~~loading~~ · ~~error~~ · ~~**destructive**~~ · ✅ **degraded** | 🟢 **SHIPPED `349accf`.** 2/2/0 · 7 literals · 2 removals (**the danger role AND the muted role — 4.44:1 here**) · the 7 `assumedNote*` rules **absent tree-wide**, which was the hub's ENTIRE StyleSheet. 🔴 **§9 ROW 15's "4 ACCOUNT MODALS" ARE FOUR FULL-SCREEN FORMS**, and migrating one would CREATE §2.1 violations (their danger copy is legal at 5.17:1 on the canvas, 4.28:1 on the overlay). 🔴 **DESIGN §2.2's DESTRUCTIVE RATIO IS WRONG: 4.86:1, not 5.60:1** — margin 0.36, not 1.10, on a control that has failed three times (`P57`). 🟢 **X20 STOPS BEING PROSE**: 🆕 `literalCounts` asserts both identical `height: 56` as a COUNT, and both ternaries' halves are pinned. 🔴 **NOT absorbed by `Sheet` — measured, not deferred.** ⚠️ **`destructive` has NO ADOPTER and is deliberately unbuilt** (`C-P5-7`). 🆕 A **FLOOR** on the A5 resolver (rule C) |
| ✅ **16** | **`(auth)` / `(capture)` / `(paywall)` layout `contentStyle`** | 13 · 41% | — | 🟢 **ALREADY DONE BY PASS 1b — measured 2026-08-03, NO CODE CHANGE NEEDED.** All three layouts read the canvas token; the two literals this row was written about are **absent from the mobile tree entirely**. 🔴 **`O-16` CLOSES with the answer owner ruling R-D wanted** (unify to the canvas) — 1b had already unified it, so the question was moot before it was asked. ⚠️ **The one surviving instance of the old brand colour is `app.json`'s splash value, and that is `P18a`, not this item** |
| ✅ **17** | 🆕 **`openPaywall(source)`** | 🔴 **10 files · 15 call sites** — the claim has been wrong THREE times in the same direction (§9.1's "≥8" → `O-41`'s 22/16 → 19 after item 4 → **15 after item 13**) | — | 🟢 **SHIPPED `2572791`.** 10/10/0, 15 sites, **exact** · **legacy ad-hoc nav 0, across 8 roots / 134 files** (22 → 19 → 15 → 0, the phase's third real decreasing counter) · `hooks/usePaywall.ts` **DELETED** (zero importers) · 8 injections, all 8 correct including an ad-hoc push reappearing in `lib/` and an ad-hoc **REPLACE** reappearing. 🔴 **A HELPER IS NOT AN ELEMENT (`O-72`)** — every other assertion in the arrival gate keys on a JSX element name, so nothing could see this item; it gets a **helper census** plus a second **WIDE_ROOTS** set, which is blindness class 8 answered rather than inherited (the deleted hook held 2 ad-hoc pushes in `hooks/` and no rule could see them). 🔴 **`qa.tsx` ALREADY DEFINED A LOCAL `openPaywall` (`O-71`)** — the import would have been SHADOWED, third name collision of the phase and second in that one file. **No haptic in the helper, deliberately**: 5 sites fire one, 4 inherit one from `Button`, 6 fire none. **`combined.tsx`'s `replace` is an option, used once, named.** LockShell's 36 sites did not change — **the density IS the source** |
| ✅ **18** | 🆕 **the 5 SVG plates** (§14) | 🔴 **ONE MOUNT** | — | 🟢 **SHIPPED `8327a2c`.** 1/1/0, **siteCounts 2 EXACT** (both branches of one file) · 4 literals + 🆕 **`literalCounts` strokeWidth 10 EXACT** (a re-validation case ESCAPED on presence — the X20 lesson repeating) · raw hex absent · **9 FORBIDDEN surfaces**. 🔴 **DESCOPE 3 LEAVES EXACTLY ONE NEW MOUNT** (`C-P5-8` / `P54`): `orbits` on the capture wait. `lunar`, `constellation`, `tide` are BUILT AND NOT MOUNTED; the paywall header is a **designer gap** (`P55`); `comet` never landed at item 13 and stays dropped (`P56`). 🔴 **THE TINT RESOLVES IN JS** — §14.1's pre-specified fallback, because the native `currentColor` render is `P38` check 2 and has not run. 🔴 **THE FIFTH NAME COLLISION** (`O-79`): `LockShell`'s local `Plate` gave this contract two FALSE adopters |
| ✅ **19** | 🆕 **the 4 shape primitives** (§15) | Home only | — | 🟢 **SHIPPED `8327a2c`.** `RidgeField` 1/1/0 · 5 literals · 2 removals. **ONE MODULE, FOUR EXPORTS** — §15.1 DEFINES the ridge as two arc paths, so the generator is shared rather than duplicated; §15.3 point 2's check reproduces (crest at 55.6% of 360). 🔴 **THE RIDGE MOUNT IS OPT-IN AND THAT IS THE PROP'S WHOLE DESIGN** — it renders from inside `ScreenContainer`, which is on 25 screens, so unconditional would be **descope 3 deleted**. Now asserted in BOTH return branches. Mounted: ridge + arc + blob on **Home** (§15.3's verbatim instances). ⬜ `TickRule` BUILT, NOT MOUNTED — the eyebrow kicker it underlines has **zero call sites** |
| ~~**20**~~ | ~~**`Txt`**~~ | — | — | ✅ **DROPPED — owner ruling R-A, 2026-08-03.** All three references corrected in the same commit. §5. 🔴 **The row is closed; do not re-open it** |

**Sequencing constraints that actually bind** (everything else is preference):

- **0 before 1.** P36's whole content.
- **4 before 13.** `SectionCard`'s `locked` state *delegates to* LockShell d2, and building the
  delegate first means writing `SectionCard`'s lock branch twice.
- **17 before or with 4.** 🟢 **Extracting `SectionCard` collapses 4 of the paywall origins by
  itself**; doing them in the other order means threading `source` through code about to be deleted.
- **15 before the astrology hub's screens work.** `Sheet` is what deletes the 7 `assumedNote*` rules.
- **18/19 after 1.** Plates and shape primitives mount **into** components — `RidgeField` into
  `ScreenContainer`'s header slot, `ArcDivider` between its sections.
- 🔴 **§6's device checks BEFORE 9–11 and 18.** Building a `tide` plate into `ShareCard` and then
  discovering SVG does not survive view-shot is the one ordering mistake that wastes a whole item.

### 3.2 The deletions this phase carries explicitly

| what | count | note |
|---|---|---|
| ✅ **4 dead components — DELETED `6ccf955`** | `SkeletonCard`, `LuckyElementCard`, `LockedOverlay`, `PremiumBadge` | 🔴 **AND THE RE-VERIFICATION R-C DEMANDED EARNED ITS KEEP — SEE §11.3.** Searching the gate's own roots reproduced the audit exactly and was WRONG: a fifth file, `mobile/SUBSCRIPTION_EXAMPLES.tsx`, imported two of them, and **only `tsc` could see it.** Deleted with them. 🟢 **Confirmed dead by measurement 2026-08-03**: each has exactly one file matching its own name, except `PremiumBadge`, whose **only** importer is `LockedOverlay` — i.e. **transitively dead**. ⚠️ **Audit §9 Q12 asks the owner to confirm before deleting. Do that.** Deleting `PremiumBadge` also retires `O-22`'s ruling by removing its subject; record that rather than leaving `O-22` reading as open work |
| **`LockedSection` + `LockedBanner`** | 1 file, 28 call sites | absorbed by LockShell — §4 |
| **the 5 inline `SectionCard` definitions** | 5 | + their 5 `StyleSheet`s and 5 paywall CTAs |
| **`LIFE_THEME_EMOJIS`** | 1 | the 5 Ionicons names are already in the data |
| **the dead config tokens** | — | the whole `cosmic.*` nest and `primary-light`, both at **zero className usages** |
| **`hooks/usePaywall.ts`** | 1 | ⚠️ **CORRECTED 2026-08-03: "no screen imports it" was true and INCOMPLETE — `SUBSCRIPTION_EXAMPLES.tsx` did** (§11.3). That file is now deleted, so it has **genuinely zero importers** and item 17's precondition is real for the first time. 🔴 **it exists and nothing imports it** (measured). Either `openPaywall` lives there or the file goes; **a second unused paywall helper beside a new one is the `lib/colors.ts` failure mode rebuilt** |

### 3.3 🔴 FOUR MEASURED CORRECTIONS TO §9's OWN NUMBERS — every one found by counting

> **This is `codemod-plan.md` §3.0.2 class 7 in its normal habitat: a design section written from a
> canvas, whose scope claims nobody had measured.** All four were found in one session, by grep.

**M-1 · `openPaywall` is 22 call sites in 16 files, not "≥8".** §9.1 says *"an ad-hoc
`router.push('/(paywall)/')` at ≥8 origins"* and lists nine. Measured:

```
astrology/daily 1 · astrology/index 1 · astrology/monthly 1 · astrology/weekly 1
compatibility/index 3 · compatibility/[id] 1 · numerology/index 1 · profile 2
readings/combined 1 (a router.replace, not a push) · readings/cosmic-report 1
readings/face 1 · readings/index 3 · readings/palm 1 · readings/qa 1
components/readings/LockedSection 2 · components/subscription/LockedOverlay 1     = 22
```

⚠️ **One is a `router.replace`, not a `push`** (`combined.tsx` — the full-screen early-return lock,
audit §5.6). A helper that only wraps `push` silently misses it, and a helper that converts it to
`push` **changes the back-stack behaviour of a lock screen.** `openPaywall` needs a `replace` option
or that one site stays out, deliberately and with a comment.

**M-2 · `LockShell` is a 28-call-site merge across 3 files, not "3 → 11 sites".** §9 #13 says
*"replaces 3 treatments on 11 sites"* and *"their 3 call sites become density-2 usages."* Measured:

| form | sites | files |
|---|---|---|
| `<LockedSection>` | **25** | `astrology/monthly` 7 · `readings/face` 9 · `readings/palm` 9 |
| `<LockedBanner>` | **3** | one in each of the same three files |
| `BlurView intensity={20}` lock | **4 components** | `AffirmationCard` · `GrowthCard` · `PalmLineCard` · `ScoreCard` |
| the inline `SectionCard` `locked` branch | 4 of the 5 copies | `combined.tsx`'s has no `locked` |

🔴 **"3" was the FILE count read as a SITE count.** The consequence is not bookkeeping: §11's
estimate, the adoption gate's expected set, and the per-pattern arrival assertion (R-2) are all sized
off this number, and it was off by **9×**.

**M-3 · 🔴 THE `teaser` PROP ALREADY EXISTS, IT IS CLIENT-AUTHORED MARKETING COPY, AND THE
TITLE-ONLY VARIANT DELETES 25 USER-FACING STRINGS.** This is the important one.

> ### ✅ RULED — OWNER RULING **R-B**, 2026-08-03: **KEEP THE 25 TEASERS. DO NOT SHIP TITLE-ONLY.**
>
> 🔴 **`C-5` STAYS AT 3 LITERALS. IT DOES *NOT* WIDEN TO 29, AND THIS REMOVES A PM ROUND TRIP.**
>
> **The reasoning, and it turns on a precondition rather than on a preference.** The design
> specified the title-only variant as a **FALLBACK for when no tease field exists**. A tease
> field *does* exist — `teaser?: string`, passed at all 25 call sites, carrying hand-written
> marketing copy. **So the fallback's precondition is FALSE and the variant must not fire.**
>
> It also resolves under a rule already on the books, with no new judgement needed: **§8's
> standing default is VERBATIM SOURCE, never the design's proposal.** Deleting 25 marketing
> strings is a **monetisation change wearing a design change's clothes**, and it is the sell on
> every locked section in the app.
>
> **What this means for item 13, concretely:**
> - **d2 renders the existing `teaser` prop**, unchanged, at all 25 sites.
> - **d3 renders the existing `teaser` prop too** where one is passed; the title-only shape
>   remains correct for the **life themes**, which genuinely have none.
> - 🔴 **The ONLY copy that changes is `LockedSection:18`'s three tier literals**, retired by the
>   tier-neutral CTA — an R1 violation closed for free (M-4).
> - **`O-1` is untouched and still BLOCKED.** The existing teasers are generic per-feature
>   marketing, not a server-chosen truncation of *this user's* withheld content. 🔴 **Do not
>   "close O-1" by pointing at the teaser prop.**
>
> 🟢 **This SHRINKS §4 and §7.** C-5's default is no longer "render what ships today pending PM";
> it is simply **what ships today, ruled.**

`O-1` says density 3's *tease* — *"real copy the server chose to send"* — is **BLOCKED on server
work**, and the mobile-only alternative is the **title-only variant**. Both halves are true. What
neither document says is that **`LockedSection` already takes a `teaser?: string` and all 25 call
sites pass one**, hand-written in the screen file:

```tsx
<LockedSection title="Hidden Gift"
  teaser="Uncover the unique talent written in your features" tier="premium" />
```

**So the migration is not "add nothing where nothing exists". It is "delete 25 lines of shipped
marketing copy."** Consequences, and they diverge:

- **`O-1`'s ruling is CONFIRMED, and for a stronger reason than it gives.** The existing teasers are
  *not* the thing O-1 wants — they describe the feature generically and are identical for every user.
  A server-chosen truncation of *this user's actual withheld content* is a different artefact.
  🔴 **Do not "close O-1" by pointing at the teaser prop.**
- 🔴 **But §8's standing default is binding: if a copy call has not landed, ship the SOURCE STRING
  VERBATIM.** Deleting 25 shipped strings is a copy change, and this one is on the paywall-adjacent
  surface, so it is **PM territory, not the designer's and not a pass's.** It belongs with **C-5**,
  whose scope this widens from "three tier-name literals" to "three literals **plus 25 teaser
  strings**".
- **The honest default until PM rules:** ship LockShell d2 **carrying the existing teaser through**,
  which is what the current lock rows do and what the source strings say. The title-only d3 variant
  then applies to the **life-themes** surface, which genuinely has no teaser today, and the 25
  existing ones are retired by a copy decision rather than by a component merge.

**M-4 · `LockedSection`'s tier badge is line 18, and the file also holds a dead ternary.** The user's
pointer checks out exactly:

```tsx
const accentColor = isPremiumPlus ? t.color.accent : t.color.accent;   // ← both branches IDENTICAL
const borderColor = isPremiumPlus ? t.alpha(t.color['accent-2'], 40) : t.alpha(t.color.accent, 40);
const badgeLabel  = isPremiumPlus ? 'Premium Plus' : 'Premium';        // ← :18, the R1 violation
```

`accentColor`'s ternary collapsed to a no-op during 1b's `O-24` ladder work and nobody removed it.
🟢 **Retiring the badge closes an R1 violation for free** — a hardcoded tier name in user-facing copy,
selected client-side — and it is one of the last three that `UI-audit.md` §6.3 missed (C-5).

### 3.4 🔴 THE **SCREENS** PHASE RUNS IN FUNNEL ORDER, NOT LEVERAGE ORDER — owner ruling, 2026-08-03

> 🔴 **THIS IS A RESEQUENCING OF A LATER PHASE, RECORDED HERE SO IT IS NOT "CORRECTED" BACK.**
> The primitives order above is **UNCHANGED** — primitives span everything, and `Input` (9 screens,
> mostly funnel) and `GeneratingReading` (the capture wait) already sit high.

`UI-audit.md` §3.5 ranks by **how much of the app changes**. That was the right axis when nobody
was acquiring users. **It is the wrong axis now**, because there is a founder deadline for
launching marketing and paid ads (§10.0), and paid traffic makes the order that matters the one a
new install actually walks:

```
splash  →  welcome  →  signup  →  birth-data  →  capture  →  home  →  paywall
```

**The design brief put onboarding FIFTH.** 🔴 **A user who bounces at birth-data never reaches
Home, so Home's curve and its plate earn nothing. Activation precedes engagement**, and a screen
the user never sees has zero leverage whatever its screen-count says.

⚠️ **Do not re-derive this from §3.5 and "fix" it.** §3.5's ranking is still correct *as a
measurement of reach*; it is simply not the ordering criterion any more.

---

## 4. `LockShell` IN FULL

**One system, three densities.** Locked and unlocked **share the same box, padding and radius**, so
the list does not reflow when the server payload changes. Locked drops the body to `fg-muted` and
adds the plate; 🔴 **it never dims the title** — a dimmed title reads as broken rather than gated.

### 4.1 The three densities

| density | where | what it is |
|---|---|---|
| **1 — full screen** | `combined.tsx`'s early-return lock · `weekly.tsx`'s self-gate · 🆕 **the two destiny dead-ends** (§4.4) | 🔴 **The ONLY place in the system that blurs anything.** `BlurView intensity={20}` retained here and nowhere else, so the meaning users already learned — *blurred = paywalled* — is preserved rather than diluted. The blurred layer is **real content, not lorem**: archetype and lede render normally, only the body is redacted, which is what makes the lock feel like a door rather than a wall. The CTA panel is a **`Sheet` at rest** (`surface-overlay`, `rounded-xl` top, drag handle) so the gesture and no-gesture builds look identical. The secondary action is a **`ghost` Button BELOW the primary** |
| **2 — section** | `SectionCard`'s `locked` state · the 25 `LockedSection` sites | plate + title + one line of `fg-muted` body + a full-width unlock Button |
| **3 — inline / title-only** | the five life themes (presence-driven, per §5.7a site 3) | section **title** plus the existing locked flag, **no body copy**, reusing the same **28dp plate slot** so a locked row's height matches an unlocked one |

### 4.2 The two things already ruled — do not re-open them

1. 🔴 **Density 1 retains BlurView, and the `comet` plate sits BELOW it — inside the blurred subtree,
   never above.** §14.7. The plate decorates *the content being withheld*, so it blurs with it. The
   sheet panel above the blur carries **no plate**, both because §14.5 forbids two plates in one
   viewport and because *"the panel is an action surface."*
   🔴 **The failure mode is pre-specified: if SVG-under-`BlurView` composites badly on Android, the
   plate is DROPPED from density 1 entirely — never moved above the blur.** The reason is a meaning
   argument, not a rendering one: a crisp plate over blurred content reads as part of the unlock UI
   and dilutes the one meaning blur has. **This is a §6 device check (P38), and it must run before
   density 1 is built.**
2. 🔴 **Density 3's tease needs a server field that DOES NOT EXIST — verified this session, and the
   verification found something the ruling did not anticipate.** No endpoint returns a teaser. **Ship
   the title-only variant** — ✅ **AND R-B (2026-08-03) SETTLED EXACTLY WHERE. It is no longer
   pending anything: TEASER-THROUGH for the 25, TITLE-ONLY for the life themes.** The variant was
   specified as a FALLBACK for the absence of a tease field. The field exists at all 25 sites and
   carries hand-written marketing copy, so **the fallback's precondition is FALSE there and it must
   not fire**; the life themes genuinely have none, so it is correct there and only there.
   🔴 **`O-1` is unaffected and still blocked** — those teasers are generic per-feature marketing,
   not a server-chosen truncation of *this user's* withheld content. If a real teaser field ships later, density 3
   upgrades to it **with no layout change** — that is what the fixed 28dp plate slot buys.

### 4.3 Copy, and the CTA question

- 🔴 **R-B: the 25 `teaser` strings PASS THROUGH UNCHANGED.** The only copy this item retires is
  the tier badge below, and **`C-5` therefore stays at three literals.**
- **The CTA copy is "Upgrade to Unlock"** — PM-ruled, **C-5**, and 🟢 **it is already the shipped
  string** at `LockedSection`'s CTA. So d1/d2 keep a string that is live today; nothing is invented.
- **It is tier-neutral, which retires `LockedSection:18`'s hardcoded `Premium` / `Premium Plus`
  badge** — an R1 violation closed for free (§3.3 M-4). 🔴 **Retiring the badge also retires the
  `tier` prop, so all 25 call sites change signature.** That is 25 edits in 3 files, mechanical.
- **`LockedBanner`'s "Upgrade Now" retires with the component** (3 sites). Its
  *"See all {n} sections with Premium"* names a tier too — **a fourth C-5 literal the audit missed.**
- 🔴 **The CTA never names a tier or a price**, because the price comes from RevenueCat and the
  entitlement comes from the server.

**✅ CONFIRMED: the CTA is d1 and d2 only, and d3's row IS itself the affordance.** Three grounds:

1. **§9.1 assigns a CTA to d1 (the `Sheet` panel) and d2 (a full-width unlock Button) and describes
   d3 as *"section titles plus the existing locked flag, with no body copy at all"*** — a CTA is body.
2. **d3's whole purpose is to make a locked row the same height as an unlocked one.** A button inside
   it breaks the one property it exists for.
3. 🔴 **d3's sites are the five life themes, which are PRESENCE-DRIVEN** (§5.7a site 3): the client
   does not know whether a body is absent because it was withheld or because it was never generated.
   **A CTA there would be the client claiming knowledge it does not have** — the same reason
   `LifeThemeCard` ships with **no chevron and no 🔒**. The row is tappable (or not) exactly as its
   siblings are; the destination decides.

### 4.4 ✅ **O-27 IS CLOSED — the two destiny dead-ends got the proper treatment at item 13 (`275147f`)**

> 🟢 **SHIPPED, and the mechanism was the bare catch.** Both screens swallowed the structured
> 403 and rendered their normal generate control; tapping it printed the middleware's raw tier slug
> in the danger role with no upgrade path. Reading `err.response.status === 403` is the whole fix.
> All three screens migrated in one commit, as this section required.
> 🔴 **AND THE EXIT IS STRUCTURAL RATHER THAN REVIEWED: density 1's secondary action is a
> REQUIRED prop pair, so the next dead end does not compile.**
> ⚠️ **`combined.tsx` is NOT a d1 site** — §4.1 named it one and the pre-flight refuted it by
> measurement (`O-70`): that screen skips its whole data load for an unentitled user, so there is
> nothing behind the veil and d1 there would be a WALL. It stays a `router.replace`, expressed
> through `openPaywall`'s `replace` option at item 17, and it is recorded in the adoption
> contract's FORBIDDEN list so nobody "finishes" the migration later.
> 🟢 **The registrar reconciliation this section demanded is DONE** — `codemod-plan.md` §12's
> `O-27` row now reads CLOSED. The original section follows.

**Owner decision, 2026-08-03: there is no release split, so `O-27`'s two-line stopgap is CANCELLED.**
The fix is **one fix, in this phase, done properly.**

**What is broken today.** R1 correctly moved the lock surface from the hub to the destination. For
`numerology/name-destiny.tsx` and `readings/career-destiny.tsx` the destination's lock surface is a
**raw server error string**: both swallow the 403 on mount (`fetchExisting`'s bare `catch`) and render
the normal generate CTA; tapping **Generate** renders
`subscription.middleware.ts`'s `"This feature requires premium_plus subscription"` inline in
`text-danger` — **no upgrade CTA, and a raw internal tier slug in user copy.**

**The treatment: LockShell density 1**, using the structured 403 body the server **already sends**
(`requiredTier` / `currentTier` / `upgradeUrl: 'revelia://paywall'`). 🔴 **Not `weekly.tsx:24`'s
copy-paste** — that was the stopgap, it hardcodes a tier name in body copy
(*"Upgrade to Premium Plus to unlock…"*), and duplicating it would add a **fourth** competing lock
treatment in the same phase that exists to collapse three into one.

⚠️ **`weekly.tsx`'s own self-gate is ALSO a d1 site and should migrate with them** — three screens,
one treatment, one commit. That is the whole argument for doing it here instead of twice.

🔴 **Reconcile the two registers.** `codemod-plan.md` §12 still classifies `O-27` as
🟠 ACCEPTED-FOR-2.1.0 with fix option (a) assigned to the *screens* phase, while `owner-actions.md`
overrides it to 🔴 RELEASE BLOCKER on the strength of the two-line stopgap. **The stopgap is
cancelled and the work is scheduled here**, so both rows are now wrong in different directions.
**Whoever next edits `codemod-plan.md` §12 must update it to match this section** — a stale registrar
is how someone later "fixes" correct code to match wrong documentation (`P17`'s failure mode).

### 4.5 ✅ **The grounding decision is MADE — the plate grounds in `locked`** (item 13, `275147f`)

> 🟢 **`locked` now has its FIRST call site in the history of the codebase, and by the census its
> only one.** Decided BY ROLE with a measurement behind it, which is what this section asked for:
> design §2 row 5 names the token the lock-plate fill, and the plate must read as a **step above its
> own ground**. Measured against the raised step it grounds on: **1.15:1 — the largest step in the
> entire surface ladder**, whose other steps are 1.05 and 1.06. Grounding it in the raised step
> instead would have been **1.00:1**: invisible, permanently, and invisible to every gate too.
> 🟢 **The same measurement decided where the plate does NOT go.** On density 1's panel the
> ground is the overlay step, where the plate is **1.05:1** and does not read as an object — and
> §4.2 independently rules that panel carries no plate. Two arguments, one answer.
> 🔴 **The census is now `exact: 1`, not `nonzero`.** This token has one legal home, so a second
> site is the role-vs-role class arriving, which `nonzero` could never see. It caught a defect on
> the first run: naming the token in the new module's own header **inflated the census by one**
> (`O-68`) — and under `nonzero` that comment alone would have satisfied the assertion.
> **`P50` is answered. The original section follows.**

**One decision, made once, and it is the last held-value collision in the system**: does the lock
plate ground in **`locked` `#2A2521`** or **`surface-raised` `#1E1A17`**?

- **Before this phase, `locked` has ZERO call sites** — measured at pass 5's static arrival
  verification and re-asserted in §1.2 C.
- 🟢 **The flip made this answerable by LOOKING for the first time.** The two values are now visibly
  a step apart on §4.5's lightness ladder; while held they were byte-identical and **no gate could
  ever have distinguished a right answer from a wrong one.**
- 🔴 **Pick deliberately, record the choice in the commit body** (§3.0.2.2.1's collision-token rule),
  then **look at the screen at cut 3.** §2 row 5 says `locked` is *"lock-plate fill — a neutral, never
  a colour event"*, which is the design's answer; the check is that it reads as a step above its
  ground rather than as the same card.

---

## 5. `Txt` — ✅ **DECIDED: DROPPED.** Owner ruling **R-A**, 2026-08-03

> 🔴 **THE ROW IS CLOSED. DO NOT RE-OPEN IT, AND DO NOT BUILD THE COMPONENT.** The owner adopted
> §5.2's reasoning as the *binding* one — not the recommendation's weight-of-four-grounds, but
> ground 1 alone: **option (a) cannot deliver uniformity, because the two frozen files cannot
> migrate.** You would ship the wrapper in some places and the memoised spread in others — two
> idioms for one concept, which is the drift the token system exists to remove. **One idiom
> everywhere beats a partial migration.**
>
> **All three references were corrected in the same commit**, which is the half that makes it
> stick: `theme.js`'s C-i block, design §6.2 (both the usage line and its own C-i note) and design
> §3.6. Design §9's intro line — *"`Txt` is new but is infrastructure, not UI"* — was a fourth and
> is corrected too. `codemod-plan.md`'s ruling block records option (b) as taken.
>
> ⚠️ **The one real argument for a wrapper survives and is NOT lost**: it reads better than a
> spread at 200 sites and could place P23's className-half opt-in automatically. That win is
> **`C-P4-5`**'s, it is available to any wrapper later, and it never required this one now.

### 5.0 The state of the question when it was ruled on

**Everything below §5.0 is the case as it stood before R-A, kept as the record of what was decided
and what was decided against.** It is no longer a live question; read it only if someone proposes
re-opening the row.

### 5.1 The state of play, measured

Pass 2b converted ~200 sites to the `<Text {...t.txt(step)}>` + spread idiom and **memoised `txt()`**,
one frozen instance per step, rather than introducing `<Txt>`. That was deliberate and the reasons are
still true:

- `<Txt>` is a **new component**, and §9 runs after the codemod so nothing is restyled twice;
- 🔴 **`<Text>` → `<Txt>` changes the JSX ELEMENT**, and `qa.tsx` and `cosmic-report.tsx` are
  **D8 restyle-only, structure-frozen** — the change is forbidden there;
- the double-invocation cost that motivated C-i's *"prefer the wrapper"* is **gone**, because
  memoisation made `style={[t.txt('x').style, …]}` free and referentially stable.

**Measured 2026-08-03:** **213 `txt(` call sites**; **1,120 `<Text>` opening tags** in
`app`+`components`; `<Txt>` is referenced in **`theme.js`** (four comment lines, including one saying
*"DO NOT BUILD IT ON THE STRENGTH OF THIS COMMENT"*), **design §6.2** and **design §3.6**, and is
built by nobody.

### 5.2 🟢 THE RECOMMENDATION: **DROP IT (option b), and correct the three references in the same commit**

**Four grounds, in descending weight:**

1. 🔴 **Option (a) leaves TWO IDIOMS PERMANENTLY, by construction.** The two structure-frozen files
   hold **14 of the 28 fractional sites** and a large share of the inline-styled reading copy; they
   *cannot* migrate. So "migrate the call sites to `<Txt>`" actually means "migrate most of them and
   keep the spread form forever in the two densest files". **The stated benefit of (a) is uniformity,
   and (a) cannot deliver uniformity.** That is decisive on its own.
2. **The spread form is now the shipped idiom everywhere** — 213 sites, memoised, referentially
   stable, and gated by `family-arrival-check.js` and `p23-optin-check.js`, both of which understand
   it. A `<Txt>` migration would require **teaching both gates a third shape**, in the phase where
   §0.2 says class-5 blindness is already at its worst.
3. **This phase has no spare judgement budget.** A ~200-site mechanical migration with no behavioural
   payoff competes directly with `LockShell`'s 28 real sites and `SectionCard`'s 38.
4. ⚠️ **The one genuine argument for (a) survives and is worth recording**: `<Txt step="text-sm"
   color="fg-secondary" />` reads better than the spread at 200 sites, and a component *could* place
   the P23 opt-in for the className half automatically. **That is a real future win** — but it is
   `C-P4-5`'s win, it is available to any wrapper, and it does not require the wrapper to be built
   *now*, mid-phase, against frozen files.

🔴 **Whichever way it goes, the references get updated in the same commit.** A component named in
three documents and built by nobody is exactly the half-fact a future session resolves by *building*
it — mid-screens-phase, against the frozen files, for no benefit. **Dropping it means three edits:**
`theme.js`'s C-i note, design §6.2's usage comment, and design §3.6's *"through `txt()` (or
`<Txt>`)"*. **The commit body says the row is closed and how.**

⚠️ **If the owner picks (a) instead**, it is item 20 and it is **+1–2 sessions**, the two frozen files
are excluded by name in the commit body, and `primitive-adoption-check.js` gains a `<Txt>` contract
whose expected set explicitly excludes them.

---

## 6. THE PLATES (§14) AND THE SHAPE PRIMITIVES (§15)

### 6.1 The plates — one React component each

```jsx
<Plate name="lunar" tint="fg-muted" width={92}/>
```

`name` ∈ `lunar` · `constellation` · `orbits` · `tide` · `comet`. `tint` is a **colour-token name**,
never a literal. `width` is the slot width; height follows the fixed `viewBox`.
**All five are line art** — SVG at **zero binary weight**; the only raster in the system remains the
120×120 grain tile. **No faces, no hands, no real people, no recognisable IP.**

🔴 **The three literals in §14.3's verbatim SVG are tokens and MUST be substituted** — a `Plate`
containing raw hex fails `no-raw-hex`: `style="color:#8E867C"` → the **`tint` prop** (default
`fg-muted`); `#D98E57` → `theme.color.accent`; `#B3A6D9` → `theme.color['accent-2']`.
**Every stroke is `stroke-width="1.25"`** — the §14.2 floor exactly, nowhere above it.

#### 🟢 `currentColor` — VERIFIED PRESENT in the installed `react-native-svg@15.11.2`

**The whole tinting model rests on it, so it was checked before anything else** (design §14.1 marks
it UNVERIFIED). Measured in `node_modules`, not recalled:

- `src/lib/extract/extractBrush.ts:16-18` — `if (color === 'currentColor') return currentColorBrush;`
  with `const currentColorBrush = { type: 2 }` at `:7`;
- `src/lib/extract/extractProps.ts:89-90` — a `color` prop on the host element is extracted and passed
  through, which is what `currentColor` resolves against.

🟢 **So the API exists and the code path is well-formed at the JS layer.** What is *not* proven is the
**native render** — `type: 2` is a marker the native side must honour, and that is a device question.
**It stays on §6.3's device list, but it is now a confirmation rather than an open API risk**, and the
five-line fallback (resolve `theme.color[tint]` to a literal `stroke`/`fill` inside the component)
stays specified and is unlikely to be needed. ⚠️ **Re-verify after any `react-native-svg` upgrade.**

#### The may / must-not table — §14.5, and it is a hard list

| | surfaces |
|---|---|
| ✅ **MAY** | reading heroes · section-level empty states · **LockShell density 1's panel** (below the blur, §4.2) · `GeneratingReading` · the paywall header · **both share cards — 🔴 POST-W1 ONLY** |
| 🔴 **MUST NOT** | **`qa.tsx` in EVERY state, not just crisis** · **both capture screens** — nothing decorative over a live camera · **inside package cards** · **next to any disclaimer** · 🔴 **never two plates in one viewport** |

Three of those bans are reinforcement, not new policy: `qa.tsx` and the two camera screens are
already the §4.6 grain exclusions; *"never adjacent to a disclaimer"* protects X8/X9's compliance
strings from reading as decoration; *"never inside package cards"* keeps `PackageCard` a pure commerce
object. ⚠️ **The `qa.tsx` ban is BROADER than §4.6's** — grain is excluded at any safety state, but
plates *and* every §15 primitive are excluded at **every** state. **The crisis surface carries zero of
everything in §14–§15 and animates nothing.**

#### Z-order — plates are CONTENT

```
bg  →  auras  →  grain  →  content (including every <Plate/>)
```

🔴 **Grain and aura sit BELOW plates, not above.** §14.2 corrected the original claim, which was
inverted. **This is a correction to a justification, not to a stack** — §10.2.4's paywall four-layer
order was always right. **The ≥1.25px / ≥4.5:1 stroke floor STANDS on its real grounds**: 1px hairlines
at 7% alpha are already at the edge of visibility on low-density Android panels, and a plate must
survive sitting on any of the four surface steps. 🔴 **`border-subtle` is BANNED inside plates** — and
that ban is **scoped to plates only**; §15's `ArcDivider`, `RidgeField` and `TickRule` legitimately
stroke `border-subtle` at 1px, and generalising the ban would delete three of the four primitives.

#### Accessibility — on the COMPONENT, never per-site

```jsx
// inside <Plate/>, on its OUTERMOST element — BOTH props, always
accessibilityElementsHidden={true}                 // iOS
importantForAccessibility="no-hide-descendants"    // Android
```

🔴 **Both are required; they are platform-specific and neither covers the other.** Shipping one leaves
the other platform announcing anonymous nodes. 🔴 **On the component, not the call sites** — every
mount inherits it once and no future mount can forget it. The omission is **invisible** unless someone
runs a screen reader, and nothing in this repo's verification stack does.
⚠️ **Apply the same treatment to §15's four primitives** — same property, separate component family,
so do it there explicitly rather than assuming this rule reaches them. 🔴 **Do NOT generalise it to
`BirthChartWheel`**, whose SVG *is* meaningful and has its own treatment at §11.6.

#### Two discrepancies inside the specimens — flagged, not reconciled

- **`tide`'s stated 3:1 does not match its 160×72 `viewBox` (2.222, off by 26%).** Resolution rule:
  **the `viewBox` is NORMATIVE, the ratio label is DESCRIPTIVE.** Do not "fix" the specimen to 216×72
  — ask the designer which is wrong. Nothing downstream breaks: the slot reserves whatever the
  `viewBox` implies.
- **`tide`'s 2nd and 3rd strokes breach the ≥4.5:1 floor** (`opacity .7` ≈ 3.2:1, `.45` ≈ 2.0:1 on
  `bg`). Either the floor means *the primary stroke* and receding tide lines are deliberately
  atmospheric, or the opacities rise to ≈0.85/≈0.7. **A designer judgement, not a WCAG failure** —
  the plate is decorative and hidden from the a11y tree. It is the only specimen that does this.

#### 🔴 W1 — the share surfaces take NO SVG AT ALL, and the fallback drops BOTH

The `tide` plate is spec'd for `ShareCard` / `ShareableQuote`. Those are **SVG inside
`react-native-view-shot@4.0.0-alpha.2` on Android — UNVERIFIED**, and §14.6 widens `O-4` in two
directions at once:

1. **It is now all of `react-native-svg`, not just `RadialGradient`.** ShareCard, ShareableQuote and
   `CompatibilityShareCard` render **zero `react-native-svg` nodes** until view-shot capture of SVG is
   verified on Android — **no tide plate, no aura-as-RadialGradient, no primitives.**
2. 🔴 **The flat fallback drops BOTH the aura AND the plate.** One rule, one surface family, no
   per-element judgement: *"no SVG at all in the share surfaces."*

**The shipping share design is the flat fallback throughout**: `expo-linear-gradient` washes (already
proven inside view-shot in production), token fills, and type. 🔴 **`tide`'s share slot is a POST-W1
UPGRADE, not a launch state.** ⚠️ Note the third surface: **`CompatibilityShareCard` is named by
§14.6 and is NOT in §9's component list** — it needs the same treatment and nothing schedules it.

### 6.2 The four shape primitives — **props, not drawings**

🔴 **A hand-rolled `<Path>` in a screen file is the thing §15 exists to prevent.**

| component | props | tokens | mounts |
|---|---|---|---|
| **`ArcDivider`** | `width` · `height` (24–40) · `tone: subtle｜strong` | stroke `border-subtle` / `border-strong`, **1px** | between sections on any `ScreenContainer` screen; 🔴 **replaces at most ONE hairline per screen** |
| **`RidgeField`** | `width` · `accentNode: bool` | `border-strong` + `border-subtle` + accent dot | 🔴 **behind a screen header ONLY** — `ScreenContainer`'s header slot, absolute, `pointerEvents` none |
| **`BlobField`** | `size` · `tint: accent｜accent-2` · `seed` | **fill** `accent-muted` / `accent-2-muted`, **no stroke** | behind icon wells and quick-action tiles — 🔴 **replaces the radial aura INSIDE cards.** X17's `overflow:'visible'` wells are unaffected: **the blob is a SIBLING, not a mask** |
| **`TickRule`** | `width` · `tick: 0–1` · `tone` | `border-subtle` line + accent node | under section overlines; 🔴 **the one primitive legal inside `SectionCard`, `Card` and `cosmic-report.tsx`** |

- **Build `ArcDivider` first** — `RidgeField` is *defined as* two `ArcDivider` paths plus a dot, not a
  second path generator.
- **`BlobField` is the only fill-not-stroke primitive and the only one that takes a `seed`.** The
  seed's scope is **per screen**. ⚠️ *"Deterministic per user"* was a prompt suggestion the owner did
  **not** take — do not implement per-user seeding.
- 🔴 **`RidgeField` deliberately over-bleeds its box** — §15.3's reference instance runs `x = −20 →
  380` inside a 360-wide `viewBox` so the curve has **no visible endpoints**. A ridge clipped to
  `0 → w` shows two stubs at the screen edges.
- **These strokes are 1px at 7%/16% and inherit `O-5` / `W3` verbatim** — at hairline width the alpha
  may need to rise to ~10%. §14.2's ≥1.25px floor is **scoped to plates and does not apply here**.
- 🔴 **Budget, per screen: at most one `RidgeField`, one `ArcDivider`, one plate.**
  **`Button`, `Input`, `Sheet`, the tab bar, `EntertainmentDisclaimer` and the loading system carry
  NOTHING** from §14–§15.

### 6.3 🔴 THE FOUR DEVICE UNKNOWNS THAT GATE THESE ITEMS — registered as **P38**

**All four are Android checks, all four are cheap, and all four must be answered BEFORE the item that
depends on them is built.** They ride cut 2's device (already in the owner's hands) or one scratch
build.

| # | unknown | gates | if it fails |
|---|---|---|---|
| ~~**1**~~ | ✅ **RULED, NOT TESTED — OWNER DECISION 2026-08-03: TAKE THE FLAT FALLBACK NOW.** No SVG at all in the share surfaces: no aura, no plate, no primitives. It was pre-decided and pre-drawn, so ruling **REMOVES a device dependency from the critical path instead of adding a build** — and these cards are the organic-growth surface, where a broken export is worse than a plain one | 🟢 **NOTHING — items 9–10 are UNBLOCKED** | re-registered as a **POST-RELEASE** check, `P51`. If it passes later the plate is **purely additive** |
| **2** | **Does `currentColor` render natively?** (JS layer 🟢 verified, §6.1) | items 18–19 | the five-line `tint`-to-literal fallback inside `Plate`. Same API, same call sites |
| **3** | **Does `resizeMode="repeat"` tile reliably on RN 0.79 Android?** | grain, all three mounts | one pre-scaled 2×-density asset per mount — an asset change, not a design change |
| **4** | ⚠️ **RE-SCOPED BY MEASUREMENT AT ITEM 13 — THE QUESTION AS WRITTEN HAS NO SUBJECT.** 🔴 **There is no blur on Android to composite under:** `expo-blur@14.1.5` defaults `experimentalBlurMethod` to `'none'`, and on that path `setBlurEnabled(false)` is called and a flat tint is painted instead — white at 8.6% at intensity 20. So the real question is *"does SVG sit acceptably under a flat 8.6% sheet"*. iOS renders the real material | 🟢 **NOT LockShell — only the §14 plate, which is ITEM 18's.** Item 13 shipped without it | 🔴 the plate is DROPPED from d1 entirely — never moved above the veil (§4.2). ⚠️ Whether to turn the real method on at all is now **`P52`**, and the default answer is no |

⚠️ **Two more Android checks are already open and belong on the same visit:** **`O-5`** (W3's hairline
at 7% — 1px at 7% white is 3 physical px on a 3× panel, and at hairline width the alpha may need ~10%)
and **`O-9`** (the Explore icon squint test at 20dp).

---

## 7. COPY DEPENDENCIES — what each blocks, and the default if the call has not landed

> 🔴 **THE STANDING DEFAULT IS BINDING AND IT IS NOT A PREFERENCE: if a call has not landed when the
> work reaches the string, ship the SOURCE STRING VERBATIM. Never the design's proposal.** A design
> tool may not change copy, and "the comp said so" is not sign-off.

| # | the call | blocks | default if no call has landed |
|---|---|---|---|
| **C-2** MEDIUM | **`FeatureComparisonTable` abbreviations** + the infinity glyph | the paywall's screens-phase work; **not** a primitives item, but it is opened by the same visit | 🔴 **Keep all six source strings.** Headers "Free / Premium / Plus" and values "1 Love / Unlimited Love / All Types" stay. Header **casing** is benign (`overline` is uppercase-only, so "Free"→"FREE" is a *render*, not a rewrite) — but **"Premium"→"PREM", "Unlimited Love"→"Unlim." and "All Types"→"All" are real copy edits** to strings the design itself calls PM-owned, and they exist only to fit three columns at 360dp. 🔴 **AND THE GLYPH IS SEPARATE AND IS NOT A COPY CALL: use the Ionicons `infinite` glyph, NEVER the `∞` character**, with **`accessibilityLabel="Unlimited"`**. §9.2 bans text-glyph-as-icon outright, `∞` (U+221E) is absent from Figtree exactly as ▲▼ are (`C-P4-3`), and an unlabelled `∞` is silent to a screen reader on a comparison table where the row's whole meaning is that value |
| **C-3** MEDIUM | **the "Ask the Stars" casing sweep** + three other casing changes | `EmptyState`, the Explore rows, the readings hub — i.e. **items 8 and the screens that link to Q&A** | 🔴 **Keep all four source strings: "Restore Purchases" · "View All" · "View Full Reading →" · "Ask the Stars".** ⚠️ **The last one INVERTS audit §6.3's locked spelling and that is why it is not a free fix**: `qa.tsx`'s screen title says **"Ask the stars"** and §6.3 marks it **copy-locked product naming**, while both entry points say **"Ask the Stars"**. So the design is *converging on the locked form* — defensible, arguably a bug fix — but it is still an edit to two shipped strings, and the divergence is a pre-existing inconsistency the design normalises **silently**. 🔴 **Enumerate every occurrence INSIDE AND OUTSIDE the mobile repo before any edit** — server prompt text, push-notification copy, the Play listing, `docs/`, marketing. A product name half-renamed is worse than either casing used consistently |
| **C-5** ✅ **RULED — R-B** | **the lock literals. 🔴 §3.3 M-3's widening is REVERSED: the set stays at THREE tier literals, it does NOT go to 29** | 🔴 **item 13, `LockShell`** | 🟢 **NO PM ROUND TRIP IS NEEDED. Owner ruling R-B: KEEP THE 25 TEASERS** — the title-only variant was specified as a FALLBACK for when no tease field exists; the field exists and carries hand-written marketing copy, so **the fallback's precondition is FALSE and the variant must not fire.** Deleting 25 marketing strings is a monetisation change wearing a design change's clothes, and it is the sell on every locked section. **What LockShell actually changes is only the tier literals:** `LockedSection`'s "Upgrade to Unlock" (🟢 already the shipped CTA, no change) · its `Premium`/`Premium Plus` badge at `:18` (retired — an R1 violation, §3.3 M-4) · `LockedBanner`'s "Upgrade Now" · `LockedBanner`'s *"See all {n} sections with Premium"* (**a fourth tier-name literal the audit missed**) · and **the 25 client-authored `teaser` strings the title-only variant would delete** |
| **C-1** HIGH | tier copy on Home | screens phase, not this one | 🔴 **`home.tsx` byte-identical ("FREE Member").** ⚠️ **Design §10.1.0 finding (i) resolves C-1 to option (b)** — render from `tierDisplay` → "Free Plan" — while `codemod-plan.md` §8's default is (a). **The two documents disagree and the disagreement is live.** It does not block this phase; **do not let it be resolved incidentally by a `ProfileHeader` extraction** |
| **C-4** MEDIUM | "Personalized Cosmic Report" → "Cosmic Report" on Home only | screens phase | **Keep it on both screens.** A rename on Home only means the app calls one product two names on two screens |
| **C-6 / C-7** INFO | overline casing · two deleted labels | — | keep the source literals and apply `textTransform: 'uppercase'`; do not "restore" the two deleted labels |

🔴 **Neither C-2 nor C-3 blocks the start of the phase.** C-2's surface is the paywall table (screens
phase) and C-3's are entry-point labels. **C-5 does block item 13's final copy**, and its default —
render what ships today — is available immediately, so it does not block the *build*.

---

## 8. VERIFICATION, AND ITS LIMITS

### 8.1 What this environment still cannot do — unchanged, and now more load-bearing

Four hard facts from `codemod-plan.md` §4.1, none of which improved:

1. **No staging.** One live production backend, app hardwired via `app.json extra.apiUrl`.
2. **No CI.** No `.github/`, no workflows, no test runner, no Jest, no Detox, no Maestro, no Storybook.
3. **No screenshot diffing**, and standing it up is a larger project than the work it would verify.
4. 🔴 **The token gate is ADVISORY BY CONSTRUCTION** (§4.6). It blocks on `git push` since pass 5, and
   the escape hatch is `GATE_LENIENT=1` — **but a pre-push hook dies to `--no-verify`, one flag, no
   record.** `core.hooksPath` is local config and is never carried by a clone.

**Baseline measured 2026-08-03: `npm run gate` exits 0, clean.** `no-white-on-accent` reports 23 hits,
all report-only, all reviewed. **That is the state this phase starts from and every item must return
it to.**

### 8.2 What replaces each missing thing, per item

| what is missing | what replaces it in this phase |
|---|---|
| the identity gate (`--diff` = 0) | 🔴 **`primitive-adoption-check.js`** — a scope + adoption proof, not an identity proof (§1.3) |
| a decreasing counter per item | **assertion 3** of the adoption check: *the legacy form is absent* — the one decreasing counter this phase gets, per primitive |
| the residual histogram | 🟢 **survives unchanged and is the natural fit**: at the end of every item, enumerate every non-adopting site and give each a **NAMED REASON**. 🔴 **A total reconciles by accident; a named reason per entry cannot** |
| a replay of a script-generated batch | 🔴 **NOT OWED, and asking for it here makes things worse.** §3.2's test — *could the batch have been written as a script whose output nobody needed to read?* — is **no** for every item in this phase. A replay would re-make the judgements and report its own divergence as a defect. **Say so in the commit body so its absence reads as a ruling rather than an omission** |
| screenshot diffing | **a human, on a device, at a cut boundary** (§8.3). 🔴 **AFTER-ONLY, AGAINST SPEC** — there is no valid pre-revamp baseline and one is not wanted (§4.4's ruling). The question is *"does this match the design's intent?"*, never *"did this change?"* |
| CI running any of it | 🔴 **the gate runs only when someone runs it.** Run `npm run gate` + the adoption check at the start AND end of every item, and **paste the numbers into the commit body — the commit message is the only durable record that the check ran** |

### 8.3 🔴 The cut boundaries — three, and only the last one is promoted

| cut | after | what it is for | promote? |
|---|---|---|---|
| **cut 1** | pass 1b | the first codemod output on a device. `versionCode 34` | 🔴 **NEVER BUILT — superseded, folded into cut 2** |
| **cut 2** | pass 5, then pass 3a/3b | the first build that looks like Vellum. **`versionCode 35`, on internal testing, 🟢 VERIFIED WORKING by the owner 2026-08-03** — boots, renders, theme and letterforms landed, no crash, no collapsed layout | 🔴 **NO** |
| 🆕 **cut 3 — after the PRIMITIVES** | items 0–20 | 🔴 **the first build in which the app is composed of the new primitives.** Everything X1/X3/X11/X12/X18 protects has been rewritten by then, and **this is the only opportunity to see the result before the screens phase stacks on top.** Full §4.4 capture list + §2's invariant re-read + §6.3's four device unknowns | 🔴 **NO** |
| **cut 4 — the release candidate** | the screens + motion + a11y phases | full §4.4 pass · full `owner-actions.md` walk · **P18a's binary assets in place** · C-2/C-3 resolved | 🟢 **YES — this is the AAB that gets promoted.** Registered as **P37** |

🔴 **DO NOT PROMOTE THE INTERMEDIATE CUTS.** After cut 3 the app has new primitives inside **old
screen compositions**: `LockedSection` is gone but the screens that used it have not been re-laid-out,
the paywall's tri-state (§7.8) may not have landed, and the plates are mounted into slots the screens
phase will move. **It is an instrument, not a product.**

⚠️ **All cuts read `versionName 2.1.0` and the app surfaces no version string in its UI, so
`versionCode` is the SOLE discriminator between a cut and a tester report.** Keep the mapping in
`owner-actions.md` current as each build goes up. **`versionCode` is EAS's remote counter — never
hand-edit `app.json`'s inert `26`.**

---

## 9. RELEASE — 2.1.0, one ship, staged

### 9.0 🔴 THE DELIVERY CONTEXT — **TWO DEADLINES, NOT ONE** (recorded 2026-08-03)

**Written down because a future session that reads only §10's estimate will re-derive the schedule
and get it wrong.** There are two clocks and they are independent:

| clock | what it is | who controls it |
|---|---|---|
| 🔴 **the FOUNDER deadline** | **launching marketing and paid ads.** The app has to look like the product the ads promise before spend starts | the owner — but it is a **commitment**, not a preference |
| **`P14` — Play target-API 36** | **2026-08-31.** §9.4, with the ~Aug 24 cherry-pick fallback | Google |

**And the two facts the estimate alone does not carry:**

- **this phase is 12–14 sessions** (§10) — *not* §9's original 5–8, which was built on site counts
  M-1/M-2/M-3 showed were low by up to 9×;
- **the FULL programme is 27–38 sessions**: primitives + screens + motion + a11y.

🔴 **The founder clock is why §3.4 resequences the SCREENS phase into funnel order**, and it is why
the ladder below exists.

### 9.0.1 🔴 THE DESCOPE LADDER — **PRE-AUTHORISED NOW, WHILE IT IS CHEAP**

> **Deciding what to cut under pressure at day 25 is how bad choices get made. Pre-authorising the
> cuts calmly costs nothing.** Cut strictly in this order, first to go at the top.

| # | cut | what it costs · what it saves |
|---|---|---|
| **1** | 🔴 **MOTION** — already taken (§0.0 rule 5) | 3–5 sessions. **Invisible in a screenshot, zero functional impact.** Reduce to the screen-transition token only, or drop entirely |
| **2** | 🔴 **THE a11y LABEL/ROLE SWEEP** — already taken (§0.0 rule 5) | the token-level half **already shipped** — AA contrast, the ~40 A5 fixes, partial dynamic type, 48dp targets. What defers is the label sweep across ~93 files |
| **3** | **PLATES + SHAPE PRIMITIVES — build, but mount narrowly** | mount on the **funnel screens and Home only**, not all five everywhere. **Most of the effect, a fraction of the work** |
| **4** | **SCREENS BEYOND THE FUNNEL** | they **compose from the primitives and need no restructure** — so they improve anyway, just without bespoke layout work |

🔴 **NEVER CUT, AT ANY POINT — these three are not on the ladder and must not be added to it:**

1. **`P18a`'s binary assets.** The splash is the first thing every user sees on every launch, and a
   purple splash into a clay app is the one mismatch nobody can miss. Its approval lead time is not
   owner-controlled, which is why it is also the gate to start earliest.
2. **The destiny dead-end fix — `LockShell` d1** (§4.4). 🔴 **If `LockShell` slips, the two-line
   403 → paywall stopgap RETURNS.** It was cancelled because the proper fix was scheduled, not
   because the defect was accepted: today those two screens render a raw internal tier slug at the
   user with no upgrade path.
3. **Anything in §2's invariant contract.** X1–X20 are preserve-blindly regardless of schedule.
   🔴 **Schedule pressure is exactly the condition under which a guard gets "cleaned up".**

### 9.1 🔴 NO RELEASE SPLIT — owner decision, 2026-08-03

**2.1.0 ships the COMPLETE redesign**: the token system (done — passes 0–5 + 3a/3b, all committed and
pushed) **+ primitives + screens + motion + a11y.** There is no 2.1.0-primitives / 2.2.0-screens split.

**Two consequences, and both are in this plan already:**
- 🔴 **`O-27`'s two-line stopgap is CANCELLED** — the destiny dead-ends get the proper LockShell d1
  treatment in this phase instead. **One fix, not two.** §4.4.
- 🔴 **The whole programme now rides one date.** §9.3.

### 9.2 Staged rollout is the only rollback lever

`expo-updates` is `checkAutomatically: "ON_ERROR_RECOVERY"` with `runtimeVersion.policy: "appVersion"`.
**2.1.0 bumps the version, so it is a full native build and there is no OTA path** — an update can
only be fetched on error recovery, never pushed to fix a bad release. With no staging and no
pre-release device-test path, that leaves exactly one lever: **the Play Console rollout percentage.**

> **Ship 2.1.0 as a STAGED ROLLOUT at 5–10%.** Suggested ramp 5–10% → 20% → 50% → 100%, **at least
> 48h at each step** — long enough for the daily push scheduler and the once-a-month Cosmic Report
> surface to have exercised.

**Watch before each ramp:**

| signal | where | why this one |
|---|---|---|
| **crash-free user rate** | Play Console → Android vitals | the revamp touches the root layout's splash sequence and the font pipeline; a font that fails to decode behind a gate on `fontsLoaded` alone hangs on the splash — **ANRs and 1-star reviews, not crashes** |
| **ANR rate** | Android vitals | same, plus pass 4's blocking async condition |
| 🔴 **review sentiment** | Play Console reviews | **the only instrument that can detect the thing most likely to go wrong.** There is no analytics in the app, and the biggest risks are *visual*: 2b's +4.4px leading on 309 sites, 3b's 2px on 73 corners, the Explore emoji→Ionicon change, Vellum itself, and now every primitive. **A regression here is not a crash — it is users saying it looks worse** |
| **subscription starts / restores** | RevenueCat dashboard | the paywall's colour pairing, its failure states and its `PackageCard` all change. **Highest-revenue surface in the app** |
| **"Rate the app" prompt behaviour** | anecdotal | X4/X5 ride through the root-layout edits |

**Ramp only when all five are flat against the 2.0.0 baseline.**

### 9.3 Every remaining gate on 2.1.0

| gate | status | note |
|---|---|---|
| 🔴 **P14 — Android 16 / API 36 target-SDK compliance** | 🟢 **HANDLED, CONDITIONALLY** | §9.4 — read it, it is the schedule risk |
| 🔴 **P18a — the BINARY rebrand assets** | ⬜ **OPEN, HARD GATE** | icon · adaptive icon · **splash** · favicon · `app.json`'s `#0F0A1A` at `:16` and `#2D1B4E` at `:39`. **The splash is the highest priority of the five** — it is the first thing every user sees on every launch, and a purple splash into a clay app is the one mismatch nobody can miss. ⚠️ **PM-approval lead time is not owner-controlled** |
| **P18b — the LISTING assets** | ⬜ open, **does NOT gate** | feature graphic, screenshots. Play listing assets update independently of the binary |
| **`ShareCard`'s hardcoded gradient** | ⬜ open | `['#6B21A8','#0F0A1A']` — **every card already shared looks like a different product** until it changes. Rides item 9 |
| **C-2 / C-3** | ⬜ open, PM | §7. Neither blocks the phase; both block the final copy |
| **`O-27`** | 🟢 **scheduled here** | §4.4. Reconcile `codemod-plan.md` §12 |
| **the 4 dead components** | ⬜ owner confirm | audit Q12 — confirm before deleting |
| **cut 4 / P37** | ⬜ | the AAB that gets promoted |

### 9.4 🔴 P14 — THE DATE THE WHOLE PROGRAMME NOW RIDES ON

**Play Console requires target API 36. The deadline is 2026-08-31. Today is 2026-08-03.**

🟢 **The code is done and proven twice.** `targetSdkVersion 36` / `compileSdkVersion 36` /
`buildToolsVersion 36.0.0` landed as **`e588f87`** on this branch — a deliberately isolated commit —
and it is **confirmed present on both cuts**, i.e. the Gradle/AGP risk the commit was written against
did **not** materialise. **So P14 is handled — PROVIDED a production release ships from this branch
before the deadline.**

🔴 **And that proviso is the whole risk, because §9.1 removed the fallback that used to exist.** With
no release split, the compliance fix rides the complete redesign: primitives + screens + motion + a11y,
plus P18a's externally-gated asset approval. **~4 weeks of calendar for a phase this plan estimates at
5–8 sessions, followed by two more phases and an asset dependency the owner does not control.**

> ### 🔴 THE FALLBACK, STATED EXPLICITLY SO IT IS A DECISION AND NOT A DISCOVERY
>
> **If 2.1.0 is not on track to ship by ~2026-08-24, cherry-pick `e588f87` alone onto a 2.0.x
> compliance-only release and ship that.**
>
> - **Why that commit specifically:** it was isolated on purpose (*"so it can be reverted independently
>   of the D5 / observability fixes on this branch"*), which makes it equally easy to cherry-pick
>   *forward* onto `main`. It touches three values in `app.json`'s `expo-build-properties.android` and
>   nothing else.
> - **Why ~Aug 24 and not Aug 30:** an EAS production build, a Play review and an internal-testing
>   sanity pass need slack, and a compliance release that misses its own deadline is worth nothing.
> - 🔴 **What missing the date costs: Play blocks ALL updates until the app targets API 36.** Not the
>   listing, not new installs — **updates.** Every fix, every hotfix, every part of this revamp would
>   be undeliverable until a compliance build ships anyway. **The fallback is strictly cheaper than
>   the failure it prevents**, and taking it costs one cherry-pick and one build.
> - ⚠️ **Taking the fallback does not change this plan.** 2.1.0 still ships the complete redesign from
>   this branch; it simply stops being the only thing standing between the app and the store.

---

## 10. ESTIMATE — sessions, and the UNIT for each item

### 10.0 🔴 READ §9.0 FIRST — THE ESTIMATE IS NOT THE SCHEDULE

**This phase is 12–14 sessions; the full programme (primitives + screens + motion + a11y) is
27–38.** Those numbers run against **two** clocks, not one: the **founder deadline for launching
marketing and paid ads**, and **`P14`'s 2026-08-31 Play target-API date**. 🔴 **Both are in §9.0,
together with the pre-authorised DESCOPE LADDER (§9.0.1) and the three things that are never cut.**
Recorded in both places on purpose — a session that opens the estimate table and not the release
section would otherwise re-derive the schedule from the estimate alone and get it wrong.

> **Per `codemod-plan.md` §11's discipline: a "session" is one focused working session with a clean
> context, and 🔴 THE UNIT OF WORK IS NOT ALWAYS THE SITE.** 1a's unit turned out to be the
> **literal** (62 sites in the worst file = 11 operations); 1b's and 3b's was the **site**, because
> role resolution is per-context by definition. **Name the unit before budgeting the item.**
>
> ⚠️ **And the primitives phase has a THIRD unit that neither codemod pass had: the COMPONENT.** An
> item's cost is dominated by *designing the component's API and its state set*, which is paid once
> regardless of call-site count — and then by a *migration* whose unit is the call site. **Budget the
> two halves separately or the numbers are meaningless.** `Card` is 13 screens and is cheap;
> `LockShell` is 3 files and is the most expensive item in the phase.

| # | item | sessions | 🔴 UNIT | mechanical or judgement? |
|---|---|---|---|---|
| **0** | the arrival gate | **1** | **assertion** — three checks + the exception mechanism | judgement to design, mechanical to write. 🔴 **Do not compress it; every gate so far found a live defect on run 1** |
| **1** | `ScreenContainer` | **1** | **component** (+ grain mount, + hero slot) | mixed. The component is small; **X1's four anchors and the grain-sibling placement are the cost** |
| **2** | `Button` | **0.5** | **component** — 5 variants × 4 states | mechanical. X3's literals are already there and must stay |
| **3** | `Card` | **0.25** | **component** | 🟢 **mechanical — 33 lines, pure `className`, zero inline styles. The cheapest meaningful win in the codebase** |
| **4** | extract `SectionCard` | **1–1.5** | **component + 38 call sites** | 🔴 **judgement.** 6 states, and `combined.tsx`'s copy is a different component (M-2). 🟢 **Highest leverage-per-hour in the list**, and it collapses 4 paywall origins for free |
| **5** | `Input` | **0.5** | **component** | mechanical + one new state (focus) |
| **6** | `EntertainmentDisclaimer` | **0.25** | **component** | 🟢 mechanical. Restyle the container, never the string |
| **7** | `GeneratingReading` | **0.5** | **component** | mechanical, **but the 0.97 asymptote's four legs must be left alone** — read before touching |
| **8** | `EmptyState` | **0.25** | **component** | mechanical + the name shadow |
| **9–11** | share surfaces + `AffirmationCard` | **1** | **component ×3** | 🔴 **judgement — X6/X7's four properties and the "failed"-vs-dismissed distinction.** §6.3 check 1 must have run |
| **12** | loading system | **0.5** | **component ×2, one system** | mechanical |
| **13** | 🔴 **`LockShell`** | 🔴 **2** | 🔴 **component (3 densities × 2 states = 6 designed states) + 28 call sites + 4 BlurView components + the O-27 d1 work on 3 screens** | 🔴 **JUDGEMENT, and the most expensive item in the phase.** Was budgeted as "3 sites" by §9; measured at 28 (M-2). Includes the `locked`-vs-`surface-raised` grounding decision and C-5's copy dependency |
| **14** | tab bar | **0.25** | **config block** | mechanical. **If the height changes, +0.5 to re-verify five Android screens** |
| **15** | 🆕 `Sheet` | **1–1.5** | **component — 7 states, one of them `degraded`** | 🔴 **judgement. A NEW component**, not a restyle, and it carries §2.1's only surface-role prohibition |
| **16** | three layout `contentStyle`s | **0.25** | **literal ×3** | mechanical + one owner sentence on `#0A0A0F` (`O-16`) |
| **17** | `openPaywall(source)` | **0.5** | **22 call sites** | mechanical **except** the one `router.replace` (M-1) |
| **18** | 5 plates | **1** | **component ×1, `name` ×5** | 🟢 **mechanical — the SVG is verbatim in §14.3.** The cost is the token substitution, the a11y props and §6.3 check 2 |
| **19** | 4 shape primitives | **1** | **component ×4** | mixed. `ArcDivider` is the only real path work; `RidgeField` is two of it |
| ~~**20**~~ | ~~`Txt`~~ | ✅ **0 — DROPPED (R-A)** | — | §5 |
| | **PHASE TOTAL** | 🟢 **~12–14 sessions** | | ⚠️ **§9's own estimate was 5–8, and that estimate was built on §9's site counts — which M-1, M-2 and M-3 show were low by up to 9×** |

**Three things that will make this longer than the table says, listed rather than absorbed:**

1. **§6.3's four device unknowns depend on the owner's calendar**, and two of them gate items (9–11
   and 13's density 1). A late answer stalls the two most expensive items.
2. **C-5's PM call gates item 13's final copy**, and M-3 widened it from three literals to 29 strings.
   The build is not blocked (the default is "render what ships today"), but a late call means touching
   3 files twice.
3. **Every review-gated item needs an owner or designer in the loop.** The plan cannot compress
   someone else's calendar, and this phase is *all* review-gated (§0.1).

⚠️ **What is NOT in this number:** the screens phase, the motion phase, the a11y phase, `BirthChartWheel`
(§11.4, three lines and they must be exactly right), and cut 4's release work.

---

## 11. OPEN / BLOCKED — carried forward, each with what would unblock it

> 🔴 **THIS DOCUMENT DOES NOT OWN A SEQUENCE.** `codemod-plan.md` §12 is the sole registrar of `O-`
> (next free **O-41**); `owner-actions.md` owns `P-`. **This session did not assign an `O-` number**,
> because assigning one requires bumping the registrar line in the same edit and this session is not
> editing that file. §11.2 lists what needs numbering.

### 11.1 Carried forward, live

| # | item | what would unblock it |
|---|---|---|
| **`O-26`** | 🔴 **13 `border-subtle`-as-fill sites — the ROLE-vs-DIMENSION class.** A token whose *name declares a role*, used in the wrong *dimension*, passes every gate: `tsc` passes, `no-legacy-tokens` passes (the name is legal), `no-white-on-accent` is blind (the name is not `white`). **6 of the 13 are progress/score TRACKS** — `astrology/daily` · `compatibility/index` · `readings/palm` · `DailyInsightCard` · `ScoreCard` · `PalmLineCard` — where **§2 row 14 names `accent-muted` as "progress-track fill"**. **That is a real §2-row-14 misplacement.** Deferred at cut 1 because it was **visually neutral**: they were `gray-800`-family neutrals on `main`, so `border-subtle` was the value-preserving 1a mapping, and moving 6 tracks from a slate to an amber wash is a **visible value change** | 🔴 **A ruling on device at cut 3** (it was scoped to cut 1 and cut 1 was never built — checklist rows H3, 5, 11 now belong to cut 3). **(b) 5 block fills and (c) 2 disabled grounds have NO legal target token** — §2 has no low-emphasis-fill role and row 10 names no disabled container fill — so **(c) belongs to the `Button` primitive (item 2)** and (b) to the screens phase. 🟢 **Explicitly correct, do not re-flag:** the four `h-px bg-border-subtle` hairlines and `AstroNumeroBadge`'s `width:1 height:32` divider — a 1px View filled with the divider token **is** a divider |
| **`O-39`** | **the DIMENSION-vs-SPACING distinction.** Design §4.3's "five spacing outliers" are **all `w-`/`h-` DIMENSIONS** that merely resolve *through* the spacing scale, because Tailwind's `width`/`height` merge `theme.spacing`. The authoring vocabulary tops out at 48dp against **56 / 128 / 192 / 256**, so three of four keys have **no candidate target at all** and the 192×192 well holds a **60px glyph** | 🔴 **Nothing — it is registered, marked in-file at all 7 sites, and deliberately not migrated.** ⚠️ **It becomes live again HERE**, because §9's primitives are exactly where a `dimension` scale would belong if one is ever added. **Before "migrating an outlier onto a step", check which FAMILY its utilities are in.** If the fix belongs anywhere it is a `dimension` scale in `theme.js` — **primitives work, and a deliberate one, not a codemod pass** |
| ~~**`C-P3b-1`**~~ | ✅ **DISCHARGED 2026-08-03 in item 3's commit `d2285ee` — design §4.4's `absorbs` column is DELETED, and the timing was the whole point.** Its content is preserved as **prose** in the same block so the deletion loses no information and re-adds no column; the per-site mapping lives in `pass3b-radius-enumeration.md`, where a value question belongs. 🔴 **Do not restore it.** ⚠️ The original entry follows, superseded: 🔴 **delete design §4.4's `absorbs` column.** It is marked NON-NORMATIVE and was retained for exactly one reason: **§4.4 is the reference for BUILDING `Card`, `SectionCard` and `LockShell`, and a reader who hits the disagreement there gets NO DIFF TO READ** | 🟢 **DO IT IN THIS PHASE, AND THE TIMING IS THE POINT.** The primitives phase is precisely the reader §4.4 was kept intact for — and precisely the reader it would mislead. 🔴 **Delete it in the commit that lands item 3 (`Card`) or item 4 (`SectionCard`), whichever is first**, because those are the two components whose corner the two columns disagree about (14 vs 20). Leaving it past that point guarantees a fourth `O-40` collision with nothing to catch it |
| **`O-29`** | **11 variable-`fontSize` sites** — `StreakBadge` ×3, `AstroNumeroBadge` ×8 — plus the **3 derived radii** (X11 ×1, X12 ×2) | 🔴 **NOTHING. CLOSED AS PERMANENTLY UNVERIFIABLE, NOT DEFERRED.** iOS is paused, X11/X12 are preserve-blindly, and §6.6.2 puts `StreakBadge` small at **6.0px of headroom**. **Leave all 11 and all 3 untouched. Do NOT carry them as pending work.** `no-variable-fontsize` keeps reporting **11** and `no-numeric-radius` keeps reporting **3** as **watchlist floors** — 🔴 **a RISE is the finding, and per §2.3 so is a FALL** |
| **`C-P4-2`** | **~15 non-Latin display sites.** Literata and Figtree are Latin faces; a Devanagari/Tamil/Telugu/Bengali name resolves through the platform's per-script fallback **at regular weight**, because emphasis is now a *family* the fallback cannot honour. Under Roboto it inherited the requested weight | 🟡 **A bounded exit exists and it is cheap: Noto Sans Devanagari is SIL OFL**, so a sixth face is a licensing no-op and an asset-size decision. ⚠️ **Exposure is narrow and enumerable** — `birth-data.tsx`'s own validator restricts the profile name to Latin + Latin-Ext, so the reachable surfaces are the ~10 display sites fed from signup / UpdateName / the compatibility partner fields. 🔴 **Not worth exempting user-content `Text` nodes from the family** — that trades one visible inconsistency for a larger one |
| **`C-P4-3`** | **6 Ionicons conversions** — ▲/▼ (`U+25B2/25BC`) are **absent from Figtree**; ● (`U+25CF`) is absent from **both** faces, so all six resolve through the platform symbol-font fallback. Five are disclosure toggles (`birth-data`, `astrology/index` ×2, `readings/face`, `readings/palm`), one is a pagination dot (`cosmic-report`) | 🟢 **UNBLOCKED AND IT LANDS IN THIS PHASE** — §9 owns iconography, the swaps are straight (`chevron-up`/`chevron-down`, `ellipse`), and Ionicons is already a dependency. ⚠️ **It lands here and not in pass 4 because it changes the ELEMENT, not the style**, and four of the six carry a `/* GLYPH */` marker whose whole point is that a codemod does not touch them. 🟢 **Delete the markers with the glyphs; `no-numeric-fontsize`'s excepted count falling from 60 IS the arrival check** |
| **`O-1`** | LockShell d3's tease field | 🔴 **BLOCKED on server work, CONFIRMED this session — and §3.3 M-3 found that the existing `teaser` prop is NOT it.** Title-only ships. If a real field lands later, d3 upgrades **with no layout change** |
| **`O-2` / `O-3`** | life themes and Weekly Forecast have no lock signal | **§B5's `entitlements` map.** Until then, presence-driven rendering is the honest design and it ships |
| **`O-4` / W1** · **`O-5` / W3** · **`O-9`** | SVG in view-shot · the 7% hairline · the Explore squint test | 🟢 **all three are ANDROID checks and all three ride §6.3's visit (P38)** |
| **`O-8`** | `FeatureComparisonTable` cannot be payload-driven | restyled, not restructured. 🔴 **If the entitlement map changes server-side, this table silently lies.** Same open decision as **P12** |
| ~~**`O-16`**~~ | ✅ **CLOSED 2026-08-03, AND IT NEEDED NO CODE.** Owner ruling **R-D** directed *unify to the canvas*, with *"confirm what it currently resolves to before changing anything — 1b may already have migrated it."* 🟢 **1b already had.** Measured at `8d97b0c`: all three layouts read the canvas token, and **the literal is absent from the mobile tree entirely** | 🔴 **Nothing. The question was moot before it was asked, which is why R-D's "confirm first" clause mattered — a session that had "fixed" it would have edited code that was already correct** (`P17`'s failure mode). ⚠️ **The one surviving instance of the old brand colour is `app.json`'s splash value — that is `P18a`, not this.** 🟢 **§3.1's item 16 is therefore ALREADY COMPLETE** |
| **`O-25`** | the fifth tier-badge treatment (`readings/index`'s dark-on-`bg-fg` pill) | the O-22-consistent alternative is a **fill** change and belongs to the screens phase. ⚠️ **Deleting `PremiumBadge` (§3.2) removes `O-22`'s subject** — record that rather than leaving `O-22` open |
| **`O-37`** | `bg` and `scrim` now hold the same value | 🔴 **nothing to fix, and one thing never to do: adding `bg` to `ALPHA_DENIED` makes every inline scrim THROW AT IMPORT**, and 17 live inside `StyleSheet.create` where a throw dies white before the ErrorBoundary exists. `alpha-callsite-check.js` is the guard |
| **`C-P3a-1`** | the 12 component-own 24s left with a named reason | a component's own 24 is the **step-6 token**, not the gutter. 🔴 **Branch on ROLE, never on VALUE** — `screen-x` = `space-6` = 24 and `screen-y` = `space-8` = 32 are collisions in `space`, and this phase adds more named spacing tokens if it is careless |
| **`C-P5-1`** | `fg`-on-accent is a quieter failure post-flip, so a missed A5 site is harder to spot | 🔴 **`no-white-on-accent` is permanently REPORT-ONLY and structurally blind. `CLAUDE.md`'s prose rule is the actual control.** Read the rule's output **after every item**, not only at phase end |
| **`P15` / `P16` / `P19`** | RevenueCat access · the comp-tier clobber · the monthly paid-tier leak | all three need a Play-signed build and/or server work; **P16 rides cut 3's visit** |
| **audit Q3 / Q6 / Q12 / Q13** | the six disclaimer strings · `#0A0A0F` · the 4 dead components · three lock treatments | Q13 is **answered by LockShell**; Q12 gates §3.2's deletions; Q3 stays locked (consolidating a compliance string is a legal call, not a design one) |

### 11.1a 🔴 **NEW, AND IT IS A BLINDNESS CLASS RATHER THAN A DEFECT** — the file three of four layers cannot see

**Found 2026-08-03 by `tsc`, and by nothing else, while executing R-C.**

`mobile/SUBSCRIPTION_EXAMPLES.tsx` sat at the **mobile root**, and:

| layer | could it see the file? |
|---|---|
| `token-gate.sh`'s 20 rules | 🔴 **NO** — `$SRC` is `app components lib store services hooks utils types`; the root is in none of them |
| Tailwind's content scanner | 🔴 **NO** — the globs are `./app/**` and `./components/**` |
| `resolve-utilities.js` `--diff` / `--members` | 🔴 **NO** — same globs |
| `tsc` | 🟢 **YES** — `tsconfig` includes `**/*.tsx`. **It was the only one.** |

**Measured inside it: 39 retired token usages while `no-legacy-tokens` reads 0** — `text-white` 11 ·
`rounded-2xl` 6 · `bg-background` 5 · `text-gold` 3 · `bg-primary` 3 · `bg-gold` 3 · `bg-card` 3 ·
`text-primary` 2 · `text-black` 2 · `bg-white` 1.

🔴 **Not a live defect — and that is what makes it the interesting kind.** Nothing imported it and
Tailwind never scanned it, so none of it rendered. It was **documentation frozen at the pre-revamp
palette**, sitting beside thirteen `.md` siblings, teaching the exact paywall pattern item 17
replaces, and invisible to every counter that would have flagged it. **The next session to copy
from it would have reintroduced the old palette with every gate reading clean.**

🟢 **The class is CLOSED BY EXHAUSTION, not by luck.** `git ls-files '*.ts' '*.tsx'` outside `$SRC`
now returns exactly **two** files, and both are declaration files (`nativewind-env.d.ts`,
`theme.d.ts`). ⚠️ **Re-run that one-liner if a source file is ever added at the mobile root.**

### 11.2 ✅ **DISCHARGED 2026-08-03 — `M-1`…`M-7` ARE NOW `O-41`…`O-47`**

> 🟢 **The registrar was opened by the item-2/3/4 session (it added blindness class 8 to §3.0.2) and
> the backlog was cleared in the same edit, per R5's rule that a number is assigned and the
> NEXT-FREE line bumped together.** `codemod-plan.md` §12's next free number is **`O-52`**.
>
> | local | number | and what happened to it |
> |---|---|---|
> | **M-1** | **`O-41`** | 🆕 **the count has already MOVED: item 4 collapsed 4 origins into 1, so item 17's expected set is 19, not 22.** Re-measure at that item |
> | **M-2** | **`O-42`** | 🆕 **and its last row was CORRECTED: only ONE of the four SectionCard lock branches was ever reached** — `compatibility/[id]`, at 6 of 8 sites. **d2's SectionCard half is 6 sites in 1 file, not 4 files** |
> | **M-3** | **`O-43`** | ✅ closed by **R-B** — keep the 25 teasers; `C-5` stays at three literals |
> | **M-4** | **`O-44`** | 🔴 **WIDENED BY ITEM 4 INTO A LIVE AA FAILURE and half of it is now FIXED** — see §11.2a |
> | **M-5** | **`O-45`** | 🟢 the instance is closed, the class is permanent and is §3.0.2's **eighth**; its middle band was measured **empty** |
> | **M-6** | **`O-46`** | 🟢 both branches pre-decided in `P39`; the device question is **banding**, not visibility |
> | **M-7** | **`O-47`** | 🟡 a designer call, and **second in line behind `O-46`'s question** |
>
> **Four more were opened by that session and are numbered in the same edit:** `O-48` (a new
> sub-class of *a comment is source* — **ordinary English prose**, three instances in one session,
> and `--diff` was the only witness) · `O-49` (the arrival gate's own over-finding, class 5 at one
> remove) · 🔴 **`O-50` — OPEN, an owner call: the section-title display step vs the dynamic-type
> coverage §0.0 rule 5 keeps. Registered as `P42`, and it recurs at items 8 and 15** · `O-51` (the
> `no-white-on-accent` phantom +1, which was a comment for four sessions).

### 11.2a 🔴 THE FINDING OF THE ITEM-2/3/4 SESSION — a live AA failure three instruments were blind to

**`O-44`b, found by item 4's merge and by nothing else.** The unlock CTA on a locked section is an
`accent` **fill**, so its only legal foreground is `on-accent`. Measured across the four inline
`SectionCard` copies that had a lock branch:

| copy | label colour | reachable? |
|---|---|---|
| `astrology/index` | `on-accent` | ✅ correct — fixed at some earlier pass |
| `compatibility/[id]` | **the plain foreground, ~2.1:1** | 🔴 **YES — 6 of its 8 call sites pass the lock flag** |
| `readings/face` | **the plain foreground** | ⬜ no call site passes the flag |
| `readings/palm` | **the plain foreground** | ⬜ no call site passes the flag |

🔴 **ONE COPY WAS FIXED AND THE FIX DID NOT PROPAGATE.** That is what duplication does, and it is
why *a fix applied to a copy is not a fix.* The live one is shown to **every free user who opens a
compatibility reading, six times on one screen.**

🔴 **AND IT IS THE EXACT PAIR `no-white-on-accent` DOCUMENTS ITSELF AS UNABLE TO SEE** — fill on one
style rule, label on another, four properties apart, joined only at a JSX call site. It reported
**22 before and 22 after**; it never saw this and could not have. `tsc` was clean, `--diff` was
clean, every other grep was clean. **The instrument was reading four near-identical files closely
enough to notice that one differed in one property**, which is the argument for `§8.3`'s human and
for extraction as a *correctness* measure rather than a tidiness one.

### 11.2b Superseded — what §11.2 said before it was discharged

**Four findings from this session are registrar-worthy and are recorded here as `M-n` only:**

| local | finding | why it needs a number |
|---|---|---|
| **M-1** | `openPaywall` is 22 sites in 16 files, not ≥8; one is a `router.replace` | a scope claim in §9.1 that was never measured |
| **M-2** | LockShell is a 28-call-site merge, not 3 | **§9 #13's "3" was a FILE count read as a SITE count**, off by 9×, and it sized the estimate |
| **M-3** | 🔴 the `teaser` prop exists and holds 25 client-authored strings; title-only DELETES them | **it changes what `O-1`'s ruling means in practice and widens `C-5` from 3 literals to 29 strings** |
| **M-4** | `LockedSection`'s `accentColor` ternary has two identical branches; the tier badge at `:18` is an R1 violation | a free R1 closure and a dead ternary, both discovered by reading the file the merge deletes |
| 🆕 **M-5** | 🔴 **§11.1a — a tracked source file outside `$SRC` and outside the content globs, holding 39 retired tokens, visible to `tsc` alone** | **a new enumeration-completeness instance, and the widest found so far.** Three of the four verification layers were structurally blind to a whole file, and the fix (a `git ls-files` sweep outside `$SRC`) is a one-liner nobody had run |
| 🆕 **M-6** | 🔴 **the texture layer's Android cost is a MEMORY question, not a tiling question** — `TilePostprocessor` allocates a view-sized bitmap with no cache key, per mounted screen | it **reshapes `P38` check 3** rather than answering it, and §4.6's stated fallback (a pre-scaled full-bleed asset) does **not** address it |
| 🆕 **M-7** | 🔴 **the texture's own amplitude is unspecified by the design and is NOT a free parameter** — on a near-black canvas a symmetric tile is additive, and page-to-card separation is only 7 levels | it is a **designer call with a measured cost table** (§9.0's clock makes deferring it fine, but not forgetting it) |

**Also needing reconciliation in §12, not a new number:** `O-27`'s classification (§4.4) and `O-22`'s
subject (deleted with `PremiumBadge`).

---

## Appendix A — verification performed by the session that wrote this plan

- `npx tsc --noEmit` in `mobile/` — **clean, 0 errors.** In `server/` — **clean, 0 errors.**
- `npm run gate` — **exit 0, clean.** All named rules at 0 or at a printed floor;
  `no-white-on-accent` reports 23 hits, report-only, reviewed.
- **No product code, no component, no asset, no dependency and no config was touched.** The only file
  created is this one; the only files edited are the two trackers named in the commit body.
- **Every count in §3.3 was measured against the live tree**, not inherited:
  22 paywall-navigation call sites in 16 files · 25 `<LockedSection>` + 3 `<LockedBanner>` in 3 files ·
  25 `teaser=` props · 4 `BlurView intensity={20}` lock components · 5 inline `SectionCard` definitions
  with 38 call sites · 213 `txt(` call sites · 1,120 `<Text>` opening tags · `hooks/usePaywall.ts`
  present with zero importers · `PremiumBadge`'s only importer is `LockedOverlay`.
- 🟢 **`currentColor` support confirmed in the installed `react-native-svg@15.11.2`** by reading
  `src/lib/extract/extractBrush.ts:7,16-18` and `src/lib/extract/extractProps.ts:89-90` — the JS path
  exists and is well-formed. **The native render remains a device check** (§6.3 item 2).
- **X11's coupling re-read at the site**: `SIZE_CONFIG`'s three heights, `borderRadius: cfg.height / 2
  /* DERIVED */`, the in-file comment, and the three interleaved glyph/numeral/label sizes.
- **Push state confirmed**: `HEAD` == `origin/fix/build-27.1` at `8d97b0c`; working tree clean.
  **Everything through pass 3b is committed AND pushed.**

## Appendix B — suggested commit message

```
docs(build-27.1): primitives deep-plan — the gate model inverts, and six tracker corrections

Adds plans/build-27.1/primitives-plan.md: the procedure document the
implementing sessions run from for the §9 primitives phase, modelled on
codemod-plan.md. Authored against codemod-plan §0/§3.0.2/§3.2/§4/§5/§11,
UI-revamp-design §2-§6.2/§9-§11/§14-§18 and UI-audit §3.5/§5/§5.7/§6/§7.

Twelve sections: the inverted gate model and the seven blindness classes
re-read for a value-only phase; the arrival gate as deliverable zero; the
X1-X20 carry table and the leverage-vs-safety inversion; build order for 20
items; LockShell in full; the Txt decision; plates and shape primitives;
copy dependencies; verification limits and four cut boundaries; the staged
rollout; per-item estimates with a named unit; open/blocked.

Four measured corrections to §9's own scope claims, all found by counting:

- openPaywall is 22 call sites in 16 files, not ">=8" — and one is a
  router.replace, which a push-only helper silently misses.
- LockShell is a 28-call-site merge across 3 files (25 LockedSection +
  3 LockedBanner) plus 4 BlurView components, not "3 -> 11 sites". §9 #13
  read a FILE count as a SITE count; it was off by 9x and it sized the estimate.
- The `teaser` prop ALREADY EXISTS and all 25 call sites pass a hand-written
  marketing string. O-1's ruling stands (those are not server-chosen copy) but
  the title-only variant DELETES 25 shipped strings, so C-5 widens from three
  tier literals to 29 strings and the default is "render what ships today".
- LockedSection's tier badge at :18 is an R1 violation retired for free, and
  its accentColor ternary has two identical branches.

Plus: currentColor VERIFIED present in the installed react-native-svg 15.11.2
(extractBrush returns a currentColor brush; extractProps passes the color prop),
so §14.1's UNVERIFIED downgrades to a native-render device check.

Tracker corrections in the same commit (owner-actions.md, session_handoff.md):
everything through 3b is pushed; P30 superseded by P34 with the versionCode
mapping 34=never built / 35=cut 2 verified; P32 folded into cut 2; NO RELEASE
SPLIT and O-27's stopgap CANCELLED; P18 split into P18a (binary, gates) and
P18b (listing, does not gate); P14's deadline with the ~Aug 24 cherry-pick
fallback. New: P37 (cut 4, the release candidate) and P38 (the four device
unknowns). NEXT FREE P-NUMBER bumped to P39.

Docs-only. tsc --noEmit clean on both mobile and server. npm run gate exit 0.
No product code, no components, no assets, no dependencies, no config.
```
