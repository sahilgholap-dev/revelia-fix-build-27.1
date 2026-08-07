# PASS 3b — RADIUS · THE ENUMERATION, THE RULINGS, AND WHAT SHIPPED

**Produced by**: `build27.1-pass3-radius-spacing` | 2026-08-01, immediately after pass 3a landed
**Status**: 🟢 **ALL RULINGS RECEIVED AND APPLIED. → READ PART 2 FIRST; IT SUPERSEDES PART 1's TARGETS.**
**Measured against**: the post-3a tree (`--diff` 0 moved, `--members` 0 unresolved, `tsc` 0/0)

> ## 🔴 HOW TO READ THIS FILE
>
> **PART 1 is the enumeration as it stood before the rulings, and it is retained deliberately** — it
> is the evidence that produced them, and §0's finding (*a class-level map is a starting hypothesis,
> not a ledger*) is only legible next to the map it displaced.
>
> ⚠️ **PART 1's TARGETS ARE SUPERSEDED.** It maps the 73 `rounded-2xl` to the 14px key on §6.6 C's
> arithmetic. The owner then ruled **`ROLE BEATS ARITHMETIC`** (`O-40`), and 60 of those 73 are
> `Card`-role and went to **20**. Where the two parts disagree, **PART 2 WINS** — and the reason PART 1
> is not simply corrected in place is that its wrong answer is the finding.

> ## 🔴 READ THIS FIRST — THREE PROPERTIES OF 3b THAT DO NOT APPLY TO ANY OTHER PASS
>
> 1. **3b IS A VALUE PASS. 21 radius values collapse to 5, so it CANNOT be value-preserving.**
>    Do not look for an identity gate here; there isn't one and there never was (D2).
> 2. 🔴 **3b IS LOSSY.** Many-to-one by construction — `rounded-2xl` 16 and `rounded-xl` 12 both land
>    on the same 14px key, and 21 inline values land on 5. **The code will no longer contain the
>    information needed to reverse it.** Per §3.2's lossy-batch rule: it ships as **its own commit**,
>    it is **marked LOSSY in the commit body**, and 🔴 **`git revert <sha>` is the ONLY undo. Do not
>    plan, write down, or attempt an inverse-mapping recovery** — 2a already proved that failure mode
>    at a cost (+40/−71 on a four-value → two-target mapping).
> 3. **The unit of work is the SITE, not the value** (§11). That is not a style preference: the 49
>    `rounded-xl`/`rounded-lg` sites are **ambiguous BY NAME** — legal in both scales with different
>    values — so no grep, no counter and no `--diff` can tell a migrated one from an unmigrated one.

---

## 0. 🔴 THE HEADLINE FINDING: §6.6 C's DELTA LEDGER DOES NOT SURVIVE PER-SITE REVIEW

`§1.6`'s **GATE 3b** says the reported non-preserving set *"must equal the table above EXACTLY: 73 at
−2, 48 at +2, 4 at +4, 4 at −4, and rounded-full/rounded-lg preserving. **Any OTHER non-preserving
mapping is an unplanned delta and is a bug.**"*

🔴 **That gate, as written, would FAIL on correct code — and it would fail on the very sites the pass
exists to hand-review.** The `48 at +2` row assumes every `rounded-xl` maps to the 14px key. Read
site by site against design §4.4's own role table, **at least 6 of the 48 are BUTTONS, and §4.4 puts
`Button` on `radius-pill` as "one spelling"** — so those six go 12px → 9999, a **shape change**, not
a +2. A further 12 are genuinely open (see groups C and F below).

**So the class-level map is a starting hypothesis, not the ledger.** The measured consequence:

| §6.6 C row | as specified | what per-site review actually produces |
|---|---|---|
| `rounded-full` ×80 → pill | 0 | 🟢 **0. Holds exactly.** |
| `rounded-2xl` ×73 → md | −2 | 🟢 **−2. Holds** (one reviewable decision, not 73 — see §3) |
| **`rounded-xl` ×48 → md** | **+2 ×48** | 🔴 **at most +2 ×30.** 6 → **pill** (a shape change), 12 → **OPEN** |
| bare `rounded` ×4 → sm | +4 | 🟢 holds |
| `rounded-3xl` ×4 → lg | −4 | 🟢 holds |
| `rounded-lg` ×1 → sm | 0 | 🟢 **0. Holds** — and it is the one site that is already exact |

**▶ CONSEQUENCE FOR THE GATE:** GATE 3b's delta ledger must be **re-derived from the ruled per-site
verdicts below and pasted into the commit body**, then asserted against. Asserting §6.6 C's table
verbatim is asserting that no site needed a judgement — which is the opposite of what C-k says.

---

## 1. THE COMPLETE className LEDGER — 210 usages, 6 classes

Resolved values read from the live rule set (`resolve-utilities.js`, post-3a snapshot), not recalled.

| class | usages | resolves NOW | → target token | new px | Δ | verdict |
|---|---|---|---|---|---|---|
| `rounded-full` | **80** | 9999 | `rounded-pill` | 9999 | **0** | 🟢 mechanical, identical |
| `rounded-2xl` | **73** | 16 | `rounded-md` | 14 | **−2** | 🟠 ONE decision (§3) |
| **`rounded-xl`** | **48** | 12 | 🔴 **per-site** | 8 / 14 / 9999 | **−4 / +2 / shape** | 🔴 **§2 — grep-blind** |
| bare `rounded` | **4** | 4 | `rounded-sm` | 8 | **+4** | 🟢 mechanical |
| `rounded-3xl` | **4** | 24 | `rounded-lg` | 20 | **−4** | 🟢 mechanical |
| **`rounded-lg`** | **1** | 8 | `rounded-sm` | 8 | **0** | 🔴 **§2 — grep-blind, but exact** |

**80 of 210 identical; 129 carry a delta; 1 (`rounded-lg`) is grep-blind AND identical.**

⚠️ **`rounded-full` is 80, not §1.6's 81/82, and the difference is reconciled rather than assumed:**
the two lost sites are `home.tsx`'s PLUS pills, deleted by the R1 commit's gates #29/#30. Already
recorded in the pass-5 histogram.

### The 177 that clear R-3's second PENDING entry

`no-legacy-radii`'s `dead-spellings` counter, which `GP()` currently prints as ⬜ **PENDING — owned by
PASS 3b**, is exactly:

```
rounded-full 80  +  rounded-2xl 73  +  rounded-3xl 4  +  bare rounded 4
+ borderRadius: 99|999|100  16                                        =  177
```

🔴 **When 3b's rewrite lands, all four sub-counts go to 0, the rule converts back to a blocking
`G()`, and `GP()` — which will then have ZERO callers — is DELETED** (owner action **P35**; R-3's
expiry obligation). A `GP()` that survives 3b is a finding, not a residue.

---

## 2. 🔴 THE 49 GREP-BLIND SITES — PER-SITE VERDICTS. **THE OWNER RULES ON THESE.**

`rounded-xl` (48) and `rounded-lg` (1) are **legal names in BOTH scales with different values** —
12→28 and 8→20 under a bare rename. `no-legacy-radii` deliberately does not grep them, because
grepping would fail on correct post-migration code. **These are the sites C-k exists for.** Grouped
by ROLE, because the role is what design §4.4 assigns a token to.

### GROUP A · INPUT / FIELD → `rounded-md` **14** · Δ **+2** · 11 sites · 🟢 mechanical map AGREES

§4.4 names `Input` on the 14px step explicitly, so these need no judgement beyond confirming they
*are* fields.

| # | site | what it is |
|---|---|---|
| 1 | `components/ui/Input.tsx:37` | 🔴 **THE `Input` primitive.** One edit covers every consumer |
| 2 | `app/(capture)/birth-data.tsx:236` | date field (a `TouchableOpacity` dressed as a field) |
| 3 | `app/(capture)/birth-data.tsx:266` | time field |
| 4–6 | `app/(main)/numerology/name-destiny.tsx:277, 287, 297` | three `TextInput`s |
| 7 | `components/account/DeleteAccountModal.tsx:170` | the "DELETE" confirmation `TextInput` |
| 8–10 | `components/account/ChangePasswordModal.tsx:111, 132, 154` | three field rows |
| 11 | `components/account/UpdateNameModal.tsx:126` | field row |

### GROUP B · BUTTON → `rounded-pill` **9999** · Δ **SHAPE CHANGE** · 6 sites · 🔴 map DISAGREES

🔴 **This is the group that breaks GATE 3b's ledger.** §4.4 assigns `Button` to `radius-pill` and
calls it *"one spelling"*; §5's X3 row independently confirms *"the radius change (12→pill) … is
outside X3's scope and is allowed."* A 12px corner becoming a full pill is not a 2px delta.

| # | site | what it is | note |
|---|---|---|---|
| 12–14 | `app/(auth)/login.tsx:215` · `signup.tsx:310` · `welcome.tsx:181` | the full-width **Google sign-in button** ×3 | identical markup in three files — one decision |
| 15 | `app/(capture)/birth-data.tsx:278` | the **"Clear"** button | ⚠️ also **O-26 group (b)**: its fill is `border-subtle`, for which §2 has no legal low-emphasis-fill role. **The radius may move; the FILL must not** — that is screens-phase work |
| 16 | `components/account/DeleteAccountModal.tsx:147` | **"Continue"** | 🔴 **X20** — `style={{height:56}}` is the invariant. A radius change does not touch it. §2.1 / §9 #15 owns the colour pairing (R-4) |
| 17 | `components/account/DeleteAccountModal.tsx:199` | **"Delete My Account"** | 🔴 **X20**, same. This button has been a contrast defect twice — read R-4's box before editing the line |

### GROUP C · NESTED SEGMENTED CONTROL → 🔴 **OPEN. The target depends on the PARENT.** 4 sites

🔴 **The single clearest proof that no grep can adjudicate these, and it is geometric.** The paywall
billing toggle is a **track containing two segments**:

```
outer track   (paywall)/index.tsx:119   rounded-2xl   16  ->  md 14      (p-1 = 4px inset)
inner segment (paywall)/index.tsx:122   rounded-xl    12  ->  ???
inner segment (paywall)/index.tsx:130   rounded-xl    12  ->  ???
```

- The **mechanical map sends BOTH to 14**, which makes parent and child *identical* — a visibly wrong
  nested corner, produced by construction, and scored by §6.6 C as **two correct +2s**.
- The **geometric answer** is `outer − inset` = 14 − 4 = 10 → the nearest legal step is **`sm` 8**,
  i.e. Δ **−4**, not +2.
- §4.5's own depth rule (*"a container may sit only on a container exactly one step below it"*) is
  the lightness analogue of the same argument.

| # | site | what it is | candidate targets |
|---|---|---|---|
| 18–19 | `app/(paywall)/index.tsx:122, 130` | monthly / annual segments inside a `rounded-2xl` `p-1` track | **`sm` 8** (geometric, −4) · `md` 14 (mechanical, +2 — collides with the parent) · `pill` (a lozenge in a soft track) |
| 20–21 | `app/(capture)/birth-data.tsx:331, 350` | the two-option **handedness** selector (`flex-1 py-4 border-2`, not nested) | **`md` 14** (+2) · `pill` — these are full-width halves, so a pill reads as two lozenges rather than a segmented control |

▶ **RECOMMENDATION: 18–19 → `sm` 8; 20–21 → `md` 14.** Both need one look on a device.

### GROUP D · NOTICE / ALERT STRIP → `rounded-md` **14** · Δ **+2** · 7 sites · 🟢 map AGREES

All seven are a padded strip on a `danger` **wash** (never a fill — so `fg` copy on them is legal per
design §16.7, and `no-white-on-accent`'s hits here are washes, not violations).

`app/(auth)/login.tsx:126` · `app/(auth)/signup.tsx:166` · `app/(capture)/birth-data.tsx:414` ·
`components/account/ChangePasswordModal.tsx:174` · `components/account/DeleteAccountModal.tsx:129, 181` ·
`components/account/UpdateNameModal.tsx:149`

### GROUP E · PANEL NESTED INSIDE A CARD → `rounded-md` **14** · Δ **+2** · 12 sites · 🟢 map AGREES

These sit inside a `Card` (which §4.4 puts at `lg` 20), so 14 keeps them **exactly one step tighter
than their parent** — the nesting rule satisfied by the mechanical answer, for once.

`app/(main)/numerology/index.tsx:426, 508, 548, 613` · `app/(main)/numerology/name-destiny.tsx:203` ·
`app/(main)/profile.tsx:406` · `components/common/NotificationPrompt.tsx:31` ·
`components/readings/DestinyCard.tsx:44, 50` · `app/(main)/compatibility/[id].tsx:253` ·
`app/(main)/compatibility/index.tsx:406, 444`

⚠️ **`DestinyCard.tsx:44` carries `borderLeftWidth: 3` in `accent`.** At a 14px corner that 3px
stripe curves into the radius. Cosmetic, but it is the one site in this group where the radius
interacts with something else — worth a look at cut 3.
⚠️ **`compatibility/index.tsx:406, 444` are `bg-surface` at the TOP level of their block**, not
nested in a Card. If the owner reads them as cards rather than panels they go to **`lg` 20** (Δ +8).
Listed here because their padding (`p-4`) matches the panel group, not the card group.

### GROUP F · SMALL CELL / TILE IN A ROW → 🔴 **OPEN: `md` 14 (+2) or `sm` 8 (−4).** 8 sites

Each is a small item in a horizontal row of 2–3. §4.4 puts *"badge, thumbnail, inline tag"* on `sm` 8
and *"small card"* on `md` 14, and these sit on the boundary.

| # | site | what it is |
|---|---|---|
| 41–43 | `app/(main)/astrology/daily.tsx:229, 233, 237` | three `flex-1 p-3` stat cells | ⚠️ also **O-26 (b)** — fill is `border-subtle`, no legal target; radius only |
| 44–45 | `components/insights/DailyInsightCard.tsx:91, 95` | two `flex-1 p-3` wash cells (`success` / `danger` at 10%) |
| 46–48 | `app/(main)/numerology/name-destiny.tsx:494, 498, 502` | three `p-2` rank tiles | 🟠 named on the **cut-2 capture list** already |

▶ **RECOMMENDATION: all 8 → `md` 14** (+2), matching group E, so a row of cells and the panel that
holds them do not disagree. `sm` 8 is defensible for 46–48 (`p-2` is genuinely badge-scale).

### GROUP G · the ONE `rounded-lg` → `rounded-sm` **8** · Δ **0** · 1 site · 🟢 exact

| # | site | what it is |
|---|---|---|
| 49 | `components/common/NotificationPrompt.tsx:33` | a **32×32 app-icon square** (`w-8 h-8` + `bg-accent`). §4.4's *"badge, thumbnail"* → `sm` 8, and it already renders 8. **The only grep-blind site that needs no value change at all** — which is precisely why a grep could never have found it |

### Roll-up of the 49

| group | sites | target | Δ | ruled? |
|---|---|---|---|---|
| A · input | 11 | `md` 14 | +2 | 🟢 §4.4 names it |
| B · button | 6 | **`pill`** | **shape** | 🟢 §4.4 names it — 🔴 **but it breaks GATE 3b's ledger** |
| C · nested segment | 4 | **8 or 14** | −4 or +2 | 🔴 **OPEN** |
| D · notice strip | 7 | `md` 14 | +2 | 🟢 |
| E · nested panel | 12 | `md` 14 | +2 | 🟠 2 of 12 could be `lg` 20 |
| F · small cell | 8 | **14 or 8** | +2 or −4 | 🔴 **OPEN** |
| G · icon square | 1 | `sm` 8 | **0** | 🟢 |
| **total** | **49** | | | **12 genuinely open, 6 that change the gate** |

---

## 3. `rounded-2xl` ×73 → `rounded-md` — ONE decision, and 🔴 **DO NOT RETUNE `radius.md` TO 16**

**73 usages across 28 files, all going 16 → 14, i.e. −2px.** Per §1.6: **treat this as ONE reviewable
visual decision, not 73.** The question asked once is *"is 14 right for small cards?"*

🔴 **THE TRAP, RESTATED BECAUSE IT IS TEMPTING AND IT IS WRONG.** `rounded-2xl → rounded-md` was
**byte-identical at `inlineRem: 14`** and became −2 when the owner flipped to 16. That was a
**coincidence, not a property**. Retuning `radius.md` from 14 to 16 to "buy back" those 73 sites:

- **corrupts the 8 / 14 / 20 / 28 scale** — the four steps are a deliberate progression, and 8/16/20/28
  is not one;
- **buys nothing that was ever owed.** Radius pixel-identity was **NEVER achievable**: 21 values → 5
  keys is many-to-one by construction, so there is no identity gate for this half and never was;
- **satisfies a gate that does not apply to this half.** D2 classifies radius as a VALUE pass
  precisely so that this argument cannot be made.

**Verdict: `radius.md` stays 14. The 73 sites move −2px, on purpose, as one accepted decision.**

---

## 4. THE INLINE HALF — 158 numeric declarations across 21 distinct values

Nearest-step mapping shown; every one is a per-site read, because an inline radius has no class name
to inherit a role from.

| value | count | → token | new px | Δ | note |
|---|---|---|---|---|---|
| **16** | **37** | `md` | 14 | **−2** | the inline twin of `rounded-2xl`. Same one decision |
| **12** | **29** | `md` | 14 | **+2** | 🔴 includes **`Button.tsx:128, 156, 188, 218` ×4** — the `Button` primitive, which §4.4 sends to **`pill`**, not 14. Same finding as group B |
| **20** | **22** | `lg` | 20 | **0** ✅ | the largest already-exact set |
| **24** | **15** | `lg` | 20 | **−4** | |
| **999** | **14** | `pill` | 9999 | (pill) | a pill spelling; the number is not a radius |
| **14** | **6** | `md` | 14 | **0** ✅ | |
| **8** | **5** | `sm` | 8 | **0** ✅ | |
| **28** | **5** | `xl` | 28 | **0** ✅ | |
| **10** | **4** | `sm` | 8 | **−2** | |
| **3** | **3** | `sm` | 8 | **+5** | 🔴 **NOT a radius decision — 2 of the 3 are a 6px-tall PROGRESS TRACK** (`palm.tsx:97, 98`, `height: 6` + `borderRadius: 3` = a fully rounded bar). §4.4 puts *progress track* on **`pill`**. `FaceGuideOverlay.tsx:184` is likewise a thin marker. **`sm` 8 on a 6px bar is larger than the bar** |
| **22** | **3** | `lg` | 20 | **−2** | ⚠️ `home.tsx:518` is `width:44 height:44 borderRadius:22` — a **derived circle**, → `pill`. `(paywall)/index.tsx:92` is **X19**'s close button — `zIndex:50` + `elevation:10` + `position:absolute` **must all survive**; only the radius moves. `qa.tsx:617` |
| **40** | **3** | `xl` | 28 | **−12** | |
| **32** | **2** | `xl` | 28 | **−4** | |
| **48** | **2** | `xl` | 28 | **−20** | `compatibility/index.tsx:798, 807` — the largest single delta in the pass. Read on device |
| **99** | **2** | `pill` | 9999 | (pill) | `width:7 height:7` dots — a pill spelling on a 7px dot |
| **9** | 1 | `sm` | 8 | −1 | |
| **11** | 1 | `sm` | 8 | −3 | |
| **18** | 1 | `lg` | 20 | +2 | |
| **25** | 1 | `xl` | 28 | +3 | |
| **55** | 1 | `pill` | 9999 | (pill) | `SunSignReveal.tsx:74` — `width:110 height:110 borderRadius:55`, a **derived circle** (X17 protects the 110) |
| **60** | 1 | `pill` | 9999 | (pill) | `profile.tsx:201` — `width:120 height:120 borderRadius:60`, a **derived circle** (pass 3a deleted the dead classes beside it; the inline dimension stays) |

### 🔴 Four things in the inline half that are NOT radius migrations

1. **The 5 DERIVED CIRCLES** (`22`/`55`/`60` at `home.tsx:518`, `SunSignReveal:74`, `profile.tsx:201`,
   plus the `99` dots) are `dimension ÷ 2`. Mapping them to `pill` 9999 renders identically **and
   destroys the derivation** — the next person who changes the dimension gets a circle either way,
   which is arguably better. But note the ORDER: change the radius *before* anyone changes the size,
   or the intermediate state is a squashed lozenge.
2. 🔴 **THE 3 DERIVED RADII THAT ARE OUT OF SCOPE ENTIRELY** — an O-29-class blind spot, one property
   over: `borderRadius` set from an **expression**, which the numeric grep cannot see.
   · `components/engagement/StreakBadge.tsx:33` — `cfg.height / 2` · **X11, and X11 says both halves
   are COUPLED and the "just use padding + a pill" restyle is BANNED on this component specifically.**
   · `components/profile/AstroNumeroBadge.tsx:46, 98` — `cfg.numberSize / 2` · **X12.**
   🔴 **All three are PRESERVE-BLINDLY (§5.4). Do not touch them in 3b.** They are why the plan's
   "162 inline" and this measurement's "158 numeric" differ: 158 + 3 derived + 2 corner-scoped = 163.
3. **2 CORNER-SCOPED declarations** — `app/(main)/readings/qa.tsx:134, 135`:
   `borderTopRightRadius: isUser ? 4 : 16` / `borderTopLeftRadius: isUser ? 16 : 4`. This is the chat
   bubble's **TAIL**: the 4 is the tail corner, and it is a *shape*, not a step. §4.4 puts *chat
   bubble* on `md` 14 — but a tail at `sm` 8 is **twice** today's notch. ⚠️ `qa.tsx` is **D8
   restyle-only, structure frozen**; a radius is style, so this is in scope, but the tail needs a
   ruling of its own.
4. **The 2 progress-track 3s** (item in the table above) belong on `pill`, not `sm`.

---

## 5. THE TOTAL 3b SURFACE, RECONCILED

| half | measured | plan says | reconciliation |
|---|---|---|---|
| className | **210** | 211 | 🟢 `rounded-full` 81 → **80**; the two lost are `home.tsx`'s PLUS pills, deleted by R1 gates #29/#30 |
| inline, numeric | **158** | 162 | 🟢 the plan's figure folds in the **3 derived** (X11/X12, now out of scope) and the **2 corner-scoped**: 158 + 3 + 2 = **163** |
| **in scope for 3b** | **368** | 373 | |
| **out of scope, PRESERVE** | **3** | — | X11 ×1, X12 ×2 — derived from a protected dimension |
| **needs its own ruling** | **2** | — | the chat-bubble tail corners |

---

## 6. ▶ WHAT THE OWNER NEEDS TO RULE ON, IN ORDER

1. 🔴 **GROUP B — do the 6 buttons go to `pill`?** §4.4 says yes. Saying yes means **GATE 3b's delta
   ledger is re-derived from this document, not from §6.6 C** — that is the decision with the widest
   blast radius, because it also takes `Button.tsx`'s 4 inline 12s to `pill` (10 sites total).
2. 🔴 **GROUP C — the paywall segments: `sm` 8 (geometric) or `md` 14 (mechanical)?** Recommendation
   **8**, because 14 makes the segment the same corner as its own track.
3. 🔴 **GROUP F — the 8 small cells: `md` 14 or `sm` 8?** Recommendation **14**, for consistency with
   group E.
4. 🟠 **`compatibility/index.tsx:406, 444` — panel (14) or card (20)?**
5. 🟠 **The chat-bubble tail** (`qa.tsx:134, 135`) — keep 4, or take `sm` 8?
6. 🟢 **Confirm `radius.md` stays 14** and the 73 `rounded-2xl` sites accept −2 as one decision (§3).
7. 🟢 **Confirm the 3 derived radii (X11/X12) stay untouched.**

**Once ruled, 3b is one lossy commit**: the `borderRadius` `replace` in `tailwind.config.js` **plus**
all 368 rewrites, atomically (a bridge is impossible — `sm/md/lg/xl` are legal keys in both scales),
with the per-site diff read by a human and the re-derived delta ledger in the body.

---
---

# 🟢 PART 2 — ALL SEVEN RULINGS RECEIVED, PLUS THREE MORE. **APPLIED 2026-08-01.**

> **`ROLE BEATS ARITHMETIC` (owner ruling).** The decisive argument is **not** consistency with
> group B — it is that **the group-E ruling COLLAPSES without it.** E's 12 panels went to the 14px
> step on the stated grounds that it kept them *"one step tighter than their parent, since §4.4 puts
> Card at lg 20."* `Card.tsx` was `rounded-2xl`, so the class map landed it at **14** — and E's panels
> sat at the **identical** corner to their parent. That is group C's defect one level up, from the
> same mechanism. 🔴 **The class map does not merely mis-assign the 73; it FALSIFIES THE PREMISE OF A
> RULING ALREADY MADE.** One of the two had to move, and `use` is what §4.4 specifies.
>
> Registered as **`O-40`**. §4.4's `absorbs` column is now marked **NON-NORMATIVE**; §4.5 carries the
> **concentric rule and its boundary**. Both were spec fixes, not site fixes.

## THE BOUNDARY THIS PASS APPLIED — stated so it can be overruled in one line

> 🔴 **ROLE OVERRIDES VALUE WHERE THE ROLE IS *NAMED*** — by design §4.4, or by the site's own
> style-object name (`unlockButton`, `ctaButton`, `cta`, `consentButton`, `captureButton`,
> `bannerButton`, `shareButton`, `galleryButton`, `uncertainBtn`).
> **Where the role is NOT named — an anonymous `<View>` that merely sits inside a `Touchable`, e.g.
> `readings/index`'s seven tappable reading CARDS — the value mapping stands. A tappable card is a
> card.**

Without that boundary "role beats arithmetic" has no edge: *every* radius is on something with a
role, and the rule would swallow the value map entirely. With it, the override set is **finite,
enumerable and evidenced in the code** — 77 classNames + 45 inline sites, all listed below.

## 1 · THE 73 `rounded-2xl`, PER-SITE BY ROLE

| verdict | n | delta | the discriminator |
|---|---|---|---|
| **CARD → `lg` 20** | **60** | **+4** | a `surface`- or gradient-grounded block at card padding (`p-4`/`p-5`/`p-6`), at the top level of its section |
| **PANEL → `md` 14** | **8** | **−2** | a **canvas**-grounded (`bg` / `bg/50`) inset block, i.e. RECESSED inside a card — plus the paywall's segmented track |
| **BUTTON → `pill`** | **2** | **SHAPE** | an accent-filled **tappable** |
| **HERO → `xl` 28** | **2** | **+12** | the top-of-screen identity block on a reading screen |
| **SHARE → `xl` 28** | **1** | **+12** | an export surface — §4.4 names `ShareCard` on this step |

**CARD → `lg` 20 · 60 sites.** `astrology/daily` ×8 · `astrology/monthly` ×9 · `astrology/weekly` ×5
· `compatibility/history` ×1 · `compatibility/[id]` ×3 · `home` ×2 (⚠️ one carries **X13**'s
`height: 200` — untouched) · `numerology/index` ×4 · `name-destiny` ×3 · `career-destiny` ×4 ·
`readings/index` ×1 · `(paywall)` ×2 (the two plan cards) · `SkeletonCard` ×1 · `ContinuityCard` ×1 ·
`DailyInsightCard` ×1 · `GrowthCard` ×3 · `PalmLineCard` ×2 · `ScoreCard` ×2 ·
`FeatureComparisonTable` ×1 · `AffirmationCard` ×2 · `DestinyCard` ×3 · `compatibility/index` ×1 ·
🔴 **`components/ui/Card.tsx` ×1 — THE PRIMITIVE, 43 call sites in 15 files. This single edit is what
makes group E's justification TRUE rather than accidental.**

Three sub-rulings inside that set, each of which the class map would have got wrong:

- 🔴 **`SkeletonCard` must carry the CARD radius**, or the placeholder and the thing it stands in for
  have different corners — a defect visible only during loading, i.e. in the one state nobody
  screenshots.
- 🔴 **An `absolute inset-0` overlay must match its parent EXACTLY** (4 sites: `GrowthCard`,
  `PalmLineCard`, `ScoreCard`, `AffirmationCard`). It *covers* the parent, so a different radius
  shows as a bright sliver at each corner under a `BlurView`.
- **`GrowthCard`'s 2px gradient RING and its card body take the same step.** 2px of inset is below the
  concentric rule's resolution, and the alternative (20 outer / 18 inner) is not on the scale.

**PANEL → `md` 14 · 8 sites.** `ProfileHeader` ×2 · `SunSignReveal` ×1 · `CompatibilityShareCard` ×1
(a `bg`-grounded panel *inside* the share card) · **the paywall's segmented track, which stays at 14
precisely so group C1's segments at 8 satisfy `R − N`** · `name-destiny` ×3 — the "Your Numbers"
tiles (see §3).

**BUTTON → `pill` · 2 sites.** the paywall's primary purchase CTA · `astrology/monthly`'s unlock CTA.
Both accent-filled and inside a `TouchableOpacity`.

**HERO → `xl` 28 · 2 sites.** `ArchetypeHeader` · `PalmTypeHeader` — the top-of-screen identity blocks
on the face and palm reading screens (image + archetype name at display scale + tagline). §4.4's
`use` column: *"hero card, bottom-sheet top corners, ShareCard"*.

**SHARE → `xl` 28 · 1 site.** `ShareableQuote`.

## 2 · THE 4 `rounded-3xl` — also per-site, and 3 of them are named roles

| site | was | to | delta | role |
|---|---|---|---|---|
| `NotificationPrompt` | 24 | `lg` 20 | **−4** | a centred prompt CARD |
| `CompatibilityShareCard` | 24 | `xl` 28 | **+4** | 🔴 SHARE surface |
| `ProfileHeader` | 24 | `xl` 28 | **+4** | HERO — the profile identity block |
| `SunSignReveal` | 24 | `xl` 28 | **+4** | HERO — the full-screen reveal |

## 3 · ITEM 3 — `name-destiny`'s two tile rows, on the CORRECTED reasoning

The premise *"they are on different screens"* was **wrong** — both rows are in `name-destiny.tsx`.
🔴 **The ruling holds on a better reason, which is the owner's own correction:** the upper row is
`rounded-2xl` (**16**) and the lower is `rounded-xl` (**12**) at `p-2`. **They are ALREADY at
different radii today and were never a matched set**, so sending them to different steps
**preserves an existing distinction rather than inventing one** — the opposite of the concern.

- the upper row (`bg-bg p-3 flex-1`, holding a 24px numeral) → **`md` 14**, the PANEL role. Geometry
  would say `20 − 16 = 4` → the 8px step; §4.5's boundary gives the named role priority, and a
  recessed `bg`-grounded block is a panel.
- the lower row (`bg-bg p-2 flex-1`, badge-scale) → **`sm` 8**, group F2 as ruled.

🟢 **And the collision in the upper row was PRE-EXISTING, not introduced**: 16 inside a 16 parent on
`main`. The class map merely preserved it at 14/14. With `Card` at 20 it is resolved for the first
time.

## 4 · ITEM 2 — GROUP E RE-CHECKED AGAINST A 20px PARENT · 🟢 CONFIRMED

```
Card primitive   rounded-lg  = 20px,  p-4 = 16px inset
E1 panels        rounded-md  = 14px           -> ONE STEP TIGHTER   (was 14 inside 14)
SkeletonCard     rounded-lg                   -> matches Card
```

**Group E's stated justification is now true rather than accidental.** That was the ruling's own
decisive argument, and it is the one thing in this pass that had to be re-measured rather than argued.

## 5 · THE INLINE HALF — 45 ROLE OVERRIDES ON TOP OF THE VALUE MAP

**DERIVED CIRCLES → `pill` · 15 sites.** §4 said 5; the first correction said 8; **measured against
`width`/`height`, it is 15.** `face-capture` ×2 (40×40) · `palm-capture` ×3 (40×40 ×2, 80×80) ·
`compatibility/index` ×2 (96×96) · `home` (44×44) · `profile` (120×120) · `cosmic-report` (18×18) ·
`qa` (44×44) · **the paywall's X19 close button (44×44 — `zIndex: 50`, `elevation: 10` and
`position: absolute` all survive)** · `FaceGuideOverlay`'s centre dot (6×6) · `BiometricConsent`
(80×80) · `SunSignReveal` (110×110). Plus `cosmic-report`'s two 7×7 dots, already pill spellings.

**PROGRESS TRACK → `pill` · 2 sites.** `palm.tsx` — a 3px radius on a **6px-tall** bar *is*
height ÷ 2, and the 8px step would be **larger than the bar**.

**BUTTON → `pill` · 26 sites**, every one named by its own style object: `Button.tsx` ×4 (ruling 1) ·
`face-capture`'s galleryButton / captureButton / captureInner / button / primaryButton / uncertainBtn ·
`palm-capture`'s same family · `unlockButton` ×4 (`astrology/index`, `compatibility/[id]`, `face`,
`palm`) · `astrology/index`'s assumedNoteCta · `CaptureInfoModal`'s cta · `BiometricConsent`'s
consentButton · `LockedSection`'s ctaButton and bannerButton · `ShareCard`'s shareButton.

**§4.4-NAMED ROLES in the inline half · 4 sites.** `ShareCard`'s card 16 → **`xl` 28** (+12) ·
`LockedSection`'s container and bannerContainer 16 → **`lg` 20** (the **lock plate**, +4) ·
`LockedSection`'s badge 12 → **`sm` 8** (−4).

🔴 **A CONSEQUENCE WORTH NAMING: after the role pass, EVERY former `xl`-by-arithmetic inline site is a
button or a circle, so the inline `xl` step has exactly ONE member — `ShareCard`.** The 25 / 28 / 32 /
40 / 48 values the value map would have sent to `xl` are, without exception, capture-screen buttons
and derived circles. That is the strongest single piece of evidence that the arithmetic column was
never describing roles.

## 6 · 🔴 THE LEDGER, DERIVED A THIRD TIME

| delta | n | composition |
|---|---|---|
| **0** | **81** | 80 pill-spelling sites (9999 → 9999) · 1 group G (8 → 8) |
| **−2** | **8** | PANEL 8 (16 → 14) |
| **+2** | **35** | A 11 · C2 2 · D 7 · E1 10 · F1 5 |
| **−4** | **6** | C1 2 · F2 3 · `NotificationPrompt` 1 (24 → 20) |
| **+4** | **67** | the bare spelling 4 (4 → 8) · **CARD 60 (16 → 20)** · HERO 2 + SHARE 1 from the 24px class |
| **+8** | **2** | E2 2 (12 → 20) |
| **+12** | **3** | HERO 2 + SHARE 1 from the 16px class |
| **SHAPE** | **8** | group B 6 + BTN 2 (12/16 → 9999) |
| **total** | **210** | reconciles |

**Arrivals by step, className:** `sm` 10 · `md` 43 · `lg` 63 · `xl` 6 · `pill` 88 = **210**.
🟢 **All five steps now have real call sites** — `xl` had **zero** before the HERO/SHARE ruling, which
is exactly the absence R-1's class-7 rule says to grep for.

**Inline:** `sm` 11 · `md` 63 · `lg` 27 · `xl` 1 · `pill` 56 = **158**, plus **2 SHAPE** and
**3 DERIVED** kept numeric as named, printed exceptions.

## 7 · REGISTERED, NOT BLOCKING — the export-scale interaction on the three share surfaces

`xl` 28 is applied per §4.4. But the three share surfaces render **twice, at very different scales**:
in-app at ~360dp, and through `react-native-view-shot` at **1080×1080 / 1080×1920** with type scaled
~5.8×. A 28px corner is roughly **8%** of a 360dp preview and roughly **2.6%** of a 1080px export, so
**the exported corner reads much tighter than the in-app one** — the radius does not scale with the
canvas.

**Not a reason to deviate from §4.4.** Registered for **cut 3**, alongside **W1** (SVG
`RadialGradient` inside `view-shot` on Android), because both are properties of the same export path
and one build answers both. `C-P3b-2`.
