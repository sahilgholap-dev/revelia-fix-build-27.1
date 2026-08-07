# Codemod Plan — Revelia 2.1.0 UI revamp

**Branch**: `fix/build-27.1` · **Ships as**: 2.1.0 on this branch · **Authored**: 2026-07-29
**Status**: the last planning artefact before implementation. Docs-only; no product code, no
dependencies, no config and no codemod ran in the session that wrote it.

> **What this document is.** The step-by-step working document for the implementing sessions. It
> is the *only* document that says what to do in what order; the other three say what is true.
>
> | file | role | when to read it |
> |---|---|---|
> | **this file** | **the procedure** — passes, gates, rollbacks, order | continuously |
> | `UI-revamp-design.md` | the design contract. **§6.2 is the config to build (never §6.1)**; **§6.6 is the authority on every rendered pixel value**; §7.2 is the gate | before each pass |
> | `UI-audit.md` | the code baseline — §5 invariants, §5.7 R1 violations, §6 copy locks, §7 ceiling | before touching any file it names |
> | `preflight-findings.md` | the evidence — §B tier gates, §C invariant archaeology, §D spacing arithmetic, §E font registration | when a number is challenged |
>
> **Precedence, when they disagree:** this file's procedure > `UI-audit.md` §5/§6/§7 >
> `UI-revamp-design.md` §6.6 > the rest of the design > `preflight-findings.md`.

---

## 0. THREE RULES THAT APPLY TO EVERY PASS

### 0.1 🔴 Locate sites BY SYMBOL OR STRING, NEVER BY LINE NUMBER

Line references that `UI-revamp-design.md` derived itself **drift by up to ~80 lines** (design
finding I-9, and it is right). Measured this session against the live tree:

| element | design says | actually |
|---|---|---|
| `const isPremium` (astrology hub) | `:143` | **`:136`** |
| Weekly tier check | `:604` | **`:561`** |
| PLUS badge (astrology) | `:625` | **`:582`** |
| "Your Numbers" | `:702` | **`:621`** |
| `const size` (BirthChartWheel) | `:56` | **`:55`** |
| "Cosmic Guidance" | `:257` | **`:248`** |
| missing-data variants | `:335-339` | **`:353-356`** |

References the design *took from* the audit or preflight are exact (`home.tsx:105,:139,:203,:528`,
`(paywall)/index.tsx:35,:44,:87-88`, `BirthChartWheel` usage `:472`, X11/X12/X16/X17/X18).

**Therefore every enumeration command in §3 greps for a symbol or a string.** Line numbers appear
in this document only as *reading aids* and are marked `≈`. If a command returns a different line
than the `≈` hint, the command is right.

### 0.2 The gate is a script, not an intention — and the authored gate cannot run here

`UI-revamp-design.md` §7.2 is written entirely in `rg`. **`rg` is not on PATH in this
environment** (verified). Every one of the seven rules was re-expressed in portable
`grep -rEn` this session and **reproduces the design's baselines exactly**:

| rule | design baseline | `grep -rE` measured | ✅ |
|---|---|---|---|
| `no-raw-hex` (hex) | 401 (404 − 3 entities) | **404** raw / +23 in `lib/colors.ts` = **427** over `$SRC` | ✅ |
| `no-raw-hex` (rgba) | 117 | **117** | ✅ |
| `no-raw-hex` (keywords) | 81 (80 white) | **81** / **80** white | ✅ |
| `no-legacy-tokens` (a) | 339 | **339** | ✅ |
| `no-legacy-tokens` (b) | 565 | white 299 · card 64 + background 44 = 108 · gold 70 · primary\* 66 · pink 14 · black 8 = **565** | ✅ |
| `no-legacy-radii` | 106 + 73 | **179** = `rounded-full` 82 · `rounded-3xl` 4 · bare `rounded` 4 · `borderRadius: 99\|999\|100` **16** (= 106) · `rounded-2xl` **73** | ✅ |
| `no-fontweight` | 328 + 173 | **328** className / **173** inline | ✅ |
| `no-numeric-fontsize` | 346 | **346** | ✅ |
| `no-leading-utilities` | 45 | **45** | ✅ |
| grep-blind radii | 49 | `rounded-xl` **48** + `rounded-lg` **1** | ✅ |

Ship the gate in `grep` form (§3.0.2). `rg` stays an optional accelerator.

**✅ SHIPPED AND RE-VERIFIED IN PASS 0 (2026-07-30).** `mobile/scripts/token-gate.sh` exists,
`npm run gate` runs it, and **all ten baselines above reproduce exactly.** Two things the
implementing session had to correct, both of which will be re-broken by a rewrite:

1. 🔴 **THE BASELINES ARE `grep -Eoh` MATCH COUNTS, NOT LINE COUNTS.** This is not cosmetic:
   a line holding two literals is two edit sites. Counting lines under-reports **hex by 22**
   (405 vs **427**), **retired custom tokens by 13** (552 vs **565**), **`ramp` by 6** (333 vs
   **339**), **rgba by 1** and **`[wh]-30` by half** (2 lines, **4** classes). Every baseline
   reproduces on matches and **not one of them reproduces on lines.** Do not "simplify"
   `G()` to `grep -c`.
2. **The `no-legacy-radii` row's third column enumerates only four of its five sub-patterns.**
   The regex also matches `borderRadius: 99|999|100` (**16** sites — the pill spellings), so
   the column appears to sum to 163 while the rule measures **179**. The `106 + 73` figure in
   the second column is the correct total and it reconciles exactly: 82 + 4 + 4 + 16 = 106.

**Scope note.** The gate runs over `$SRC` = `app components lib store services hooks utils
types`, which is **wider than the `app+components` scope most enumerations in §1.3 and §3.2
use.** Two rules read higher as a result, and both differences are entirely `lib/colors.ts`:
**hex 427** (= 404 + 23) and **rgba 118** (= 117 + 1). Every other rule is identical at both
scopes. Deleting `lib/colors.ts` in pass 1b closes both gaps by construction.

### 0.3 🔴 Passes 1–4 hold OLD values behind NEW semantic names. Pass 5 is the only colour flip.

Restating the governing owner decision precisely, because "pass 5 flips the values" is too loose:

- **Colour** is the only family whose values are *held* through passes 1–4. `theme.js`'s `color`
  object ships with **today's hex** and flips to Vellum in pass 5. §1.6 gives the hold table.
- **Spacing** values are already correct at both baselines (91/102 utilities identical post-`inlineRem`
  flip), so pass 3a has nothing to hold and nothing to flip.
- **fontSize** is already identical at all seven mapped steps, so pass 2a has nothing to flip.
- **lineHeight / letterSpacing** flip in **pass 2b**, not pass 5.
- **Radius** flips in **pass 3b**, not pass 5 — it cannot be held (D2).
- **Family** flips in **pass 4** (system font → Literata/Figtree), not pass 5.

So pass 5 is **the colour flip and only the colour flip**: one object in one file, `git revert`-able.
Every other family moves inside its own gated pass. Anyone who reads "pass 5 changes what
everything looks like" as "nothing before pass 5 changes anything" will be wrong at 2b, 3b and 4 —
which is exactly why those three carry screenshot review and no identity gate.

---

## 1. PASS INVENTORY

### 1.0 The table

**IDENTITY** = the resolved value must be byte-identical before and after; any delta is a bug.
**VALUE** = a reviewed change; the gate proves *scope*, a human proves *acceptability*.

| pass | scope | edit sites | class | runnable gate |
|---|---|---|---|---|
| **0** ✅ **DONE** | prerequisites — 2 deps, `theme.js`, `theme.d.ts`, bridge config, gate script, harness | **0 product sites**; 7 files | ENABLING | `resolve-utilities --diff before after` → **`0 rule(s) moved`, exit 0**; `npm run gate` runs and prints all seven baselines; `tsc --noEmit` clean ×2 |
| **1a** | colour — the 1:1 literal + className renames | **~1,110** | **IDENTITY** | `--map colour-map.json` → **`0 … not value-preserving`**, exit 0 |
| **1b** | colour — the collapses that cannot be 1:1 (accent ×3→1, `primary`, `pink`, rgba-overlay range, scrims, A5) + delete `lib/colors.ts` | **~445** | **VALUE** | `no-raw-hex` = 0 · `no-legacy-tokens` = 0 · `lib/colors.ts` absent · §1.6b decision table fully filled · screenshot pass |
| **2a** | fontSize — 30 `text-4xl/5xl/6xl` + 25 `text-3xl` + 346 inline `fontSize:` (incl. §3.5's 28 fractional) + the `TYPE_FREEZE` config | **~401** | **IDENTITY** | `--diff` shows **only** `fontSize` keys and **every one equal**; `no-numeric-fontsize` = 0 |
| **2b** | lineHeight + letterSpacing — one config edit + strip 45 `leading-*` + 63 inline `lineHeight:` | **~109** + 1 config edit | **VALUE** (the largest vertical change in the revamp) | `no-leading-utilities` = 0 · `--diff` moves **exactly** the 12 ramp steps + removes exactly 5 `leading-*` rules, and the deltas equal §6.6 D/E to the pixel · screenshot pass |
| **3a** | spacing — 1,276 className usages / 102 utilities + `space-y-3` ×2 → `gap-3` + delete `w-30 h-30` ×4 | **~1,282** (mostly no-op renames) | **IDENTITY** | `--diff` = **0 moved** across every `p-/m-/gap-/w-/h-/inset-/top-/right-/bottom-/left-` rule · `space-[xy]-` = 0 · `w-30\|h-30` = 0 |
| **3b** | radius — 211 className + 162 inline `borderRadius:`, incl. the **49 grep-blind** sites | **373** | **VALUE** (D2) | `no-legacy-radii` = 0 · `--map radius-map.json` reports deltas that **equal §6.6 C exactly** (−2 ×73, +2 ×48, +4 ×4, −4 ×4, 0 ×82) and no others · the 49-site diff read by a human |
| **4** | weight → family, **atomic with the font install**: 328 className + 173 inline `fontWeight:` + 5 TTFs + `useFonts` + the global scaling freeze | **~501** + 6 files | **VALUE** (system font → Literata/Figtree) | `no-fontweight` = 0 (both halves) · a device screenshot proving **all five faces render distinctly** · `fontsLoaded \|\| fontError` gate present |
| **5** | the Vellum colour flip | **`theme.js` `color` + `chart` only** | **VALUE**, reversible | `git revert <sha>` restores the previous look exactly · full screenshot pass |

**Totals.** ~4,220 edit sites across ~60 files, in 9 gated commits (0, 1a, 1b, 2a, 2b, 3a, 3b, 4, 5)
plus 3 config-cutover sub-commits (§1.1). Pass 1 is the largest by a wide margin — **not pass 4.**

---

### 1.1 🔴 The config-staging problem, and its resolution — read before pass 0

`UI-revamp-design.md` §6.2's `tailwind.config.js` **replaces** `colors`, `spacing`, `borderRadius`
and `fontSize` rather than extending them. The moment it lands, every legacy utility stops
resolving: 565 retired custom names, 339 default-ramp names, ~160 radius usages, 55
`text-4xl/5xl/6xl`, 45 `leading-*` — all silently dropped, because NativeWind discards an
unresolvable utility without a warning.

**So §6.2's config cannot land in pass 0.** It would break the app before pass 1 migrated anything,
and the breakage would be invisible at build time. Instead the config lands in **four stages**,
each attached to the pass that earns it:

| stage | when | what | why it is safe |
|---|---|---|---|
| **S0 — bridge** | pass 0 | `theme.extend` gains: the 21 new **colour** keys · the 5 new **fontFamily** keys · `borderWidth.hairline` · the full **spacing** object (`space` + `spaceLegacy`) | Verified namespace-disjoint. New colour keys (`bg surface surface-raised surface-overlay locked fg fg-* border-* accent* on-accent success warning danger chart`) collide with **nothing** in Tailwind's defaults or the existing custom set (design V4: intersection empty). `sans` survives, and **`font-sans` has 0 usages** (measured), so adding 5 family keys is inert. `extend.spacing` is a **genuine no-op**: keys 0–12 already resolve to the identical post-flip values (§6.6 B), and 0.5/1.5/14/16/20/32/48/64/px carry **Tailwind's own** numbers. Nothing changes; new names simply start working. |
| **S1 — colour cutover** | end of pass 1b | `colors` moves `extend` → **replace** | Pass 1 just drove `no-raw-hex` and `no-legacy-tokens` to zero, so there is nothing left to break. **This is where "delete the defaults" becomes safe, and not before.** |
| **S2 — type cutover** | pass 2a, then 2b | 2a adds `fontSize` as a **replace** carrying `TYPE_FREEZE` (§1.4). 2b removes the freeze so `fontSize` derives from `theme.type`, **and deletes `theme.lineHeight`** | Splitting the one `fontSize` object into a frozen and an unfrozen form is the **only** way to honour D1 — size and lineHeight ship in the same Tailwind object, so nothing else separates them. |
| **S3 — spacing + radius cutover** | pass 3a, pass 3b | 3a moves `spacing` `extend` → **replace**. 3b lands `borderRadius` as a **replace** *inside the same commit* as all 373 radius rewrites | `borderRadius` **cannot bridge**: `sm/md/lg/xl` are legal keys in both scales with different values, so a bridge would force every site to be written twice. D2 already classifies radius as a value pass, so there is no identity to protect — land it atomically and read the diff. |

At the end of pass 3b + pass 4, `tailwind.config.js` is **byte-identical to §6.2**. Assert that:

```sh
# from mobile/ — the S3 exit condition
diff <(sed -n '/^\/\/ tailwind.config.js/,$p' ../plans/build-27.1/UI-revamp-design.md \
        | sed -n '/^const t = require/,/^};$/p') tailwind.config.js && echo "config == §6.2"
```

(Extract by hand if the sed is brittle; the point is that the end state is the design's file, not a
variant of it.)

---

### 1.2 ✅ PASS 0 — prerequisites · ENABLING · **COMPLETE (2026-07-30)**

> **DONE AND GATED.** All seven items landed; every gate below passed. Measured results:
> **`--diff` → `0 rule(s) moved, of 225 seen`, exit 0** · **225 rules at `inlineRem: 16`**, every
> spot-checked value matching §6.6 · **`space-y-3`, `w-30`, `h-30` confirmed ABSENT** from the
> runtime rule set · **all ten `token-gate.sh` baselines reproduce exactly** (exit 1, correct at
> pass 0) · **`tsc --noEmit` clean on `mobile/` and `server/`** (0/0) · **ZERO product `.tsx`
> modified.** Resolved deps: **`expo-font` 13.3.2**, **`@expo/vector-icons` 14.1.0** — both the
> exact versions already resolving transitively, so the install is a manifest change with **no
> runtime delta**.
>
> **🔴 THREE THINGS THE NEXT SESSION MUST NOT UNDO:**
>
> 1. 🔴 **`npx expo install expo-font` AUTO-ADDS `"expo-font"` TO `app.json`'s `plugins` ARRAY.**
>    It was **reverted**, deliberately. The owner-decided path is **runtime `useFonts`**
>    (`preflight-findings.md` §E3); the **config plugin is platform-asymmetric and fails
>    silently** on one side (§E2 — iOS resolves the PostScript name, Android the filename base,
>    and neither throws). **Do not mix the two paths.** If any future `expo install` re-adds it,
>    revert `app.json` again. Pass 0 leaves `app.json` byte-unchanged.
> 2. 🔴 **The pre-push hook runs the token gate REPORT-ONLY**, not under `set -e` as §1.2's
>    snippet shows. Wiring it as a hard failure makes the repo **unpushable for the whole
>    revamp** (the gate exits nonzero by design until pass 5) — **including the pass-0 commit
>    itself.** See §4.6. `tsc` blocks; the gate reports; `GATE_STRICT=1 git push` enforces.
> 3. **`scripts/resolve-utilities.js` was already on disk** from the session that authored
>    Appendix C (the previous handoff's *"never written into `mobile/`"* was inaccurate).
>    **Verified byte-identical to Appendix C — 5,186 bytes, `diff` clean.** Leave it alone.

**Scope: zero product sites.** Nothing in `app/` or `components/` is edited. Seven files.

| # | item | detail |
|---|---|---|
| 1 | `npx expo install expo-font` | **Currently transitive only** — verified absent from `mobile/package.json` dependencies; present in `node_modules` at `13.3.2` via `expo`. Runtime `useFonts` is the owner-decided path (`preflight-findings.md` §E3), **not** the config plugin — §E2 shows the plugin is platform-asymmetric and fails silently on one side. |
| 2 | `npx expo install @expo/vector-icons` | **Currently transitive via `expo`** at `14.1.0` — verified absent from `package.json`. Design I-4: the revamp puts Ionicons on essentially every screen and **deletes the emoji fallbacks**, so an Expo upgrade that re-versions the transitive dep loses every icon at once. One line removes the class of risk. |
| 3 | `mobile/theme.js` | **Verbatim §6.2's corrected `theme.js`**, with the `color` object carrying the **HELD** values from §1.6a, not Vellum's. 🔴 **Stays `.js`** — `tailwind.config.js` `require()`s it and Metro needs no transform. Do not "modernise" it to `.ts` or ESM. |
| 4 | `mobile/theme.d.ts` | §6.5's draft, verbatim. Free typo-catching for ~4,200 token edits through the existing `tsc --noEmit` gate. Keep the deliberate asymmetry: `space` typed, `spaceLegacy` as `Record<string, number>` so authoring against a migration key does not autocomplete. |
| 5 | `mobile/tailwind.config.js` | **Stage S0 only** (§1.1). Bridge form. |
| 6 | `mobile/scripts/token-gate.sh` | §7.2's seven rules in portable `grep -rEn` form (§3.0.2). Add `"gate": "bash scripts/token-gate.sh"` to `mobile/package.json` scripts. |
| 7 | `mobile/scripts/resolve-utilities.js` | The identity-pass harness (§4.2). Authored and **proven runnable** this session. |

**🔴 The prepush wiring does not exist and must be created.** Verified: no `prepush` script in
either `package.json`, no `husky`, no `.husky/`, `.git/hooks/` holds only `*.sample`, `core.hooksPath`
is unset, and there is **no `.github/` and no CI of any kind**. So "wired to prepush and CI" is
currently a description of nothing. Recommended shape — zero new dependencies, tracked in git:

```sh
mkdir -p .githooks
cat > .githooks/pre-push <<'EOF'
#!/usr/bin/env bash
set -e
cd "$(git rev-parse --show-toplevel)/mobile"
npx tsc --noEmit
bash scripts/token-gate.sh
EOF
chmod +x .githooks/pre-push
git config core.hooksPath .githooks     # ← per clone; an OWNER ACTION, register it
```

`core.hooksPath` is **not** carried by a clone, so it is a one-line owner action per machine.
Register it in `owner-actions.md`. Until it is set, the gate is a manual `npm run gate`.

**Gate for pass 0:**

```sh
cd mobile
node scripts/resolve-utilities.js > /tmp/p0-before.json     # BEFORE editing tailwind.config.js
# ... write theme.js, theme.d.ts, S0 bridge config ...
node scripts/resolve-utilities.js > /tmp/p0-after.json
node scripts/resolve-utilities.js --diff /tmp/p0-before.json /tmp/p0-after.json
#   MUST print "0 rule(s) moved" for every pre-existing class, and exit 0.
#   New classes appearing (text-fg, bg-surface, px-screen-x, font-body, border-hairline, …)
#   are ADDITIONS — they show as "BEFORE (absent)" and are expected. Everything that
#   existed before must be untouched.
npm run gate            # must RUN and report the seven §0.2 baselines; it will FAIL (nonzero) — correct at pass 0
npx tsc --noEmit        # mobile: clean
cd ../server && npx tsc --noEmit   # clean
```

**Rollback:** `git revert` the pass-0 commit. The two `expo install`s are additive dependencies with
no import sites yet, so reverting is a `package.json`/lockfile revert and nothing else.

---

### 1.3 PASS 1 — colour · **1a IDENTITY · 1b VALUE**

#### The real surface is ~1,555 sites, not 599

The brief's `~599` is the **literal** ledger. The gate's `no-legacy-tokens` rule also requires the
**className** ledger to reach zero, and that is 904 more usages. Both are pass 1.

| ledger | count | source |
|---|---|---|
| raw hex in `app`+`components` | **401** | 404 grep hits − 3 HTML entities (`&#10024;` `&#10003;` `&#8226;`) |
| `rgba()` / `rgb()` | **117** | measured |
| CSS colour keywords (`color:`/`…Color=`) | **81** (80 `white`, 1 `black`) | measured |
| **literal sub-total** | **599** | = the design's `~599` |
| retired **custom** className names | **565** | `white` 299 · `card` 64 + `background` 44 = 108 · `gold` 70 · `primary*` 66 · `pink` 14 · `black` 8 |
| default-ramp className names | **339** | `gray/red/purple/…-NNN` |
| arbitrary-value classes `bg-[#…]` | **27** | audit §2.6 |
| `lib/colors.ts` (deleted whole) | **23** literals, 1 file, **54 of 93 importers** | design V6 |
| **TOTAL** | **~1,555** | across **58+ files** |

`'transparent'` (8 sites) stays legal and is not counted.

🔴 **`mobile/app.json`'s two literals are NOT in this pass and not in any code pass.** `#0F0A1A`
at `:16` (`splash.backgroundColor`) and `#2D1B4E` at `:39`
(`android.adaptiveIcon.backgroundColor`) are **OS surfaces painted before any JS runs** — no token
reaches them and `no-raw-hex` is structurally blind to both. They ship with the **rebrand asset
item** (`owner-actions.md` **P18**, amended 2026-07-29) and must change **in the same cut as the new
splash and adaptive-icon images**, or 2.1.0 launches on the old purple and cross-fades into Vellum
on first paint.

#### 1.6a HELD colour values — what `theme.js` ships in passes 1–4

> ## 🟢 THE FLIP HAPPENED 2026-07-31 (pass 5, commit B). `theme.js` NOW CARRIES THE VELLUM COLUMN.
> **Every one of the 35 moved className rules was enumerated against this table and against design
> §2** — 21 `color` keys + 2 `chart` keys changed value; the 6 with no className call sites moved
> through inline reads only (see §1.8's banner). **Read the "HELD" column as history from here on.**
> 🔴 **Two SHAPE changes came with it, and both are load-bearing:** `border-subtle`/`border-strong`
> went solid-hex → `rgba()`, while `surface-raised`/`surface-overlay`/`locked` went `rgba()` → solid
> hex. §3.0.2.2.1 predicted the first; **the second is the one that mattered** — see `alpha()`'s
> comment and `O-37`.

Derived from the design's §2 "replaces" column and the audit's §2.3 palette. **This table is the
whole content of pass 1a's identity claim**, and it is what pass 5 flips.

| token | HELD (passes 1–4) | Vellum (pass 5) | held value comes from |
|---|---|---|---|
| `bg` | `#0F0A1A` | `#100E0D` | §2 "replaces `#0F0A1A`" · ×14 hex + `background` ×44 |
| `surface` | `#1A1425` | `#171412` | "replaces `#1A1425`" · ×9 hex + `card` ×64 |
| `surface-raised` | `rgba(255,255,255,0.05)` | `#1E1A17` | "replaces `rgba(255,255,255,0.05–0.08)`" — 🔴 an alpha **range**, see 1b |
| `surface-overlay` | `rgba(255,255,255,0.10)` | `#26211D` | "replaces `rgba(255,255,255,0.10)`" |
| `locked` | `rgba(255,255,255,0.05)` | `#2A2521` | 🔴 **no old equivalent** — held equal to `surface-raised` |
| 🆕 **`scrim`** | 🔴 **`#000000`** (a SOLID hex) | `#100E0D` | **P20 / V-5, as CORRECTED by OWNER RULING R3 (2026-07-30)** — one value, not three, and **not rgba**. The alpha lives on the utility at the site (`bg-scrim/60`, `bg-scrim/90`), never in the token. Collapses `rgba(0,0,0,0.5)` ×7 + `0.6` ×3 + `0.7` ×6, **and** the four `bg-black/{60,60,70,90}` className scrims — of which the four className ones are now **IDENTITY renames** (see V-5). ⚠️ **A bare `bg-scrim` is OPAQUE black; there is no default alpha** |
| `fg` | `#FFFFFF` | `#F4EFE9` | "replaces `#FFFFFF` ×39" · ×55 hex + `white` ×299 + `color:'white'` ×80 |
| `fg-secondary` | `#D1D5DB` | `#C6BDB2` | "replaces `#D1D5DB` ×28" (= `gray-300`) |
| `fg-muted` | `#9CA3AF` | `#8E867C` | "replaces `#9CA3AF` ×80" (= `gray-400`, className ×160) |
| `fg-placeholder` | `#6B7280` | `#6B645C` | `Input.tsx` `placeholderTextColor={colors.gray[500]}` |
| `fg-disabled` | `rgba(255,255,255,0.38)` | `rgba(244,239,233,0.38)` | 🔴 **no old equivalent** — today it is a container `opacity: 0.5`. Held value is already new; see 1b |
| `border-subtle` | `#1F2937` | `rgba(244,239,233,0.07)` | "replaces `border-gray-800` ×60" |
| `border-strong` | `#2D2640` | `rgba(244,239,233,0.16)` | `lib/colors.inputBorder` |
| **`accent`** | 🔴 **`#F59E0B`** | `#D98E57` | "replaces `#6B21A8` + `#F59E0B` + `primary-dark`" — **three→one, see 1b** |
| `accent-muted` | `rgba(245,158,11,0.14)` | `rgba(217,142,87,0.14)` | derived from held `accent` |
| `accent-2` | `#C084FC` | `#B3A6D9` | "replaces `#C084FC` ×17 · `#A78BFA`" |
| `accent-2-muted` | `rgba(192,132,252,0.12)` | `rgba(179,166,217,0.12)` | derived |
| `on-accent` | `#000000` | `#1A1512` | `(paywall)/index.tsx:177` `text-black` on `bg-gold` — the accessible pairing that already exists in the repo |
| `success` | `#10B981` | `#86A97B` | ×9 hex |
| `warning` | `#F59E0B` | `#D9A657` | = held `accent`; they separate at pass 5 |
| `danger` | `#EF4444` | `#C8695E` | ×9 hex + `red-*` |
| `chart.harmonious` | `#10B981` | `#7FA88F` | collapses `#10B981` + `#3B82F6` + Conjunction `#F59E0B` |
| `chart.tense` | `#EF4444` | `#C08A7E` | collapses `#EF4444` + `#EC4899` |

#### 1.6b ✅ The eight things pass 1 cannot do mechanically — **DECISION TABLE FILLED (P20, 2026-07-30)**

> **STATUS: ANSWERED. Pass 1b is UNBLOCKED.** All eight recommendations below are **approved as
> written**, with three changes the owner made — recorded in full immediately under this banner.
> The `recommendation` column is now **the ruling**, not a proposal.

**CHANGE 1 — V-5: `scrim` is ONE value, not three.** Added to `theme.color`, flipping at pass 5.
🔴 **The 0.5 / 0.6 / 0.7 spread is DRIFT, NOT DESIGN** — do not preserve it, and do not add
`scrim-light`/`scrim-heavy` to "be safe". All sixteen rgba sites collapse onto the single token.

> 🔴 **AMENDED BY OWNER RULING R3 (2026-07-30) — `scrim` IS A SOLID HEX, `'#000000'`, NOT
> `'rgba(0,0,0,0.6)'`.** Held `#000000` → Vellum `#100E0D`. **The alpha is carried by the utility
> modifier at every site** (`bg-scrim/60`, `bg-scrim/90`) and is never baked into the token. See
> V-5's MEASUREMENT block for what this changes — including the reclassification of four sites from
> 1b to **1a**, and the one footgun it introduces.

**CHANGE 2 — V-7 CORRECTION: the allow-list was wrong as written.** `PremiumBadge.tsx`,
`(paywall)/index.tsx:176-177`, `WeeklyDayCard.tsx:30-31` and `home.tsx:305` were listed as
*"already correct, do not touch."* They are **contrast-correct but NOT token-correct**: they are
`text-black`, and **`black` is in §1.6b's own 565-name retired ledger** (measured: `black` = 8 of
the 565), so it **stops resolving the moment the defaults are deleted at S1** and
`no-legacy-tokens` **will** fail on them. **Reworded to: "contrast already correct — rename to
`on-accent` only, do NOT re-resolve the role."**

**CHANGE 3 — V-2 ADDITION: enumerate the 66 `primary` sites by role BEFORE defaulting text to
`fg-secondary`, and identify any TAPPABLE labels.** 🔴 **Coloured text may be carrying the tap
affordance.** Moving a tappable label to `fg-secondary` **deletes that affordance silently, with
no visual error and nothing for any gate to catch.**

> ## 🔴 V-2 IS CORRECTED — OWNER RULING R1 (2026-07-30). **THIS TABLE IS THE MAPPING.**
>
> | role | target |
> |---|---|
> | **tappable, or a link** | 🔴 **`accent`** |
> | **deliberate emphasis, NON-interactive** | **`accent-2`** |
> | plain secondary copy | `fg-secondary` |
> | borders (`border-primary/20\|30\|40`) | `border-strong` |
> | 🆕 **a border indicating SELECTION, FOCUS or ACTIVE STATE** | 🔴 **`accent`** — see the ruling below |
>
> **What changed, and why the earlier form was wrong.** The superseded rule sent *"tappable label, or
> deliberate emphasis"* → **`accent-2`**. That is withdrawn. Turn 9's rule (design §16.1) wins:
> **`accent-2` is NEVER the colour of an element that triggers an action.** Sending tappable labels
> to `accent-2` would:
>
> 1. **create a second interactive colour and defeat the one-accent premise** — §16.2's non-collision
>    argument rests on *"`accent` is always the actionable thing on screen; if clay and iris appear
>    together, clay is the button"*; and
> 2. **contradict the design as already drawn** — §10.2's paywall renders its Terms / Privacy links
>    as **`accent`** links. The precedent for "tappable text is clay" is already in the comp.
>
> 🔴 **V-2's actual concern is fully satisfied.** The concern was never *which* colour — it was that
> demoting a tappable label to `fg-secondary` **silently deletes the affordance**. `accent` preserves
> it, more visibly than `accent-2` would, and it is the colour the rest of the system already uses
> for "you can do this".
>
> 🟢 **This CLOSES `O-17` and `P25(a)`** — the one place §14–§18 collided with a settled decision.
> Design §16.3's "an owner call is needed" is now answered; §1.6b and §16.1 **agree**.
>
> ⚠️ **All of it is 1b.** Pass 1a **enumerates** the 66 sites by role and writes the ledger; pass 1b
> rewrites them. Do not let 1a rewrite a single `primary` site — every branch of this table is a value
> change (`#C4B5FD` matches no held token).

> ### 🔴 STRUCTURAL BORDERS SEPARATE. STATE BORDERS SIGNAL. THEY CANNOT SHARE A TOKEN.
>
> **OWNER RULING (2026-07-31), from a regression 1b shipped and the screenshot pass would have
> caught late.** `birth-data`'s handedness toggle marked its SELECTED option with
> `border-primary` (`#C4B5FD`, bright lilac) against an unselected `border-gray-700` (`#374151`).
> C3's border branch sent it to `border-strong` `#2D2640` — **and the unselected side became
> `border-subtle` `#1F2937`. Two structural neutrals, nearly indistinguishable.** Selection was left
> resting on the label alone.
>
> 🔴 **THE MAPPING WAS LOCALLY CORRECT AND GLOBALLY WRONG — the SAME CLASS as V-2's tappable-label
> concern, arriving through borders instead of text.** A rule that resolves a token per site cannot
> see that two sites are a CONTRASTING PAIR.
>
> **The rule:** `border-subtle` and `border-strong` are **structural** — they separate regions. A
> border that communicates *selected / focused / active / on* is an **accent role**. A state border
> and a structural border may never be the two halves of one contrasting pair, because the design's
> two structural neutrals are deliberately close to each other.
>
> **The sweep this forced (every conditional border site in the app, audited):**
>
> | site | verdict |
> |---|---|
> | `birth-data` handedness toggle ×2 | 🔴 **FIXED** — selected → `border-accent` |
> | `(auth)/signup` terms checkbox | 🔴 **FIXED** — `termsAccepted` → `accent`. It was `border-strong` vs `border-subtle`: the checkbox would have looked unchecked when checked |
> | `numerology/name-destiny` analyse CTA | 🔴 **FIXED** — its DISABLED ground was `border-subtle`, **a border token used as a fill**. V-6: a disabled ground is `surface-raised`, its label `fg-disabled` |
> | `compatibility/index` ×2 (`isSelected`) | 🟢 already `accent` |
> | `qa.tsx` composer focus (`input ?`) | 🟢 already `accent` |
> | `qa.tsx` Deep-Insight toggle (`deepInsight ?`) | 🟢 `accent-muted` — accent-family, correct |
> | `(paywall)` selected plan cards ×2 | 🟢 accent-family (`accent-2` / `accent`). ⚠️ does NOT resolve the registered §16.2 tension on `accent-2` over a Pressable |
> | `WeeklyDayCard` `isToday` | 🟢 already `accent` |
> | tab bar active/inactive tint | 🟢 `accent` / `fg-muted` |
> | `Input.tsx` | ⚠️ **REGISTERED, NOT FIXED: `Input` has NO focus state at all** — only `error ? danger : border-subtle`. §2 row 12 assigns `border-strong` to "focused Input", so the design expects one. Adding it is NEW behaviour, so it belongs to the primitives phase, and there is no existing signal to lose |
>
> ⚠️ **Fixing `name-destiny`'s CTA also surfaced 4 more A5 labels** on its `accent` fill (the loading
> spinner, "Calculating cosmic blueprint...", "Analyze My Name", and the disabled "Resets on…").

**RECORDED, AND IT CONSTRAINS EVERY LATER PASS —** `accent-2` now absorbs **FOUR** brand colours
(`#C4B5FD` `primary` · `#EC4899` `pink` · `#A78BFA` · its own `#C084FC`) and `accent` absorbs
**three** (`#6B21A8` · `#F59E0B` · `#4C1D95`). 🔴 **`accent-2` MEANS "premium / brand secondary"
AND NOTHING ELSE. It must not become "the generic second colour."** Anything that is merely
*not-`accent`* belongs in `fg-secondary`, `fg-muted` or `border-strong`. Every future addition to
`accent-2` has to answer "is this premium/brand?" — if the answer is "it just needed to be a
different colour," it is the wrong token.

---

**🔴 TWO FACTUAL CORRECTIONS to Change 2's site list, found by measuring it during pass 0.** The
owner's *reasoning* is right and the reword stands; two of the four named sites are misidentified,
and one site is missing:

| # | correction |
|---|---|
| **a** | 🔴 **`home.tsx:305` is NOT a white-on-accent site at all — it is a FALSE POSITIVE of the ±4-line proximity grep,** which is exactly the *"proximity is not nesting"* failure mode §3.0.2's own comment predicts. `:305` is `<View className="w-12 h-12 rounded-full bg-gold …">` whose **only child is an emoji** (`🔢`, `:306`, `text-2xl`, no colour class). The `text-white` the grep pairs it with is at **`:309`**, a **sibling label outside the circle** on the dark `Card`. It carries **no `text-black`**, so there is **nothing to rename to `on-accent`**. It is an ordinary 1a `text-white → fg` rename. **Do not "fix" its contrast.** |
| **b** | **`PremiumBadge.tsx` is a two-pairing ternary, and only one branch is an accent fill.** `:9-10` are `bg-gold`+`text-black` (**the `on-accent` rename ✅**) and `bg-pink`+`text-white`. The `pink` branch is **V-3's problem, not V-7's** — `#FFFFFF` on `#EC4899` is ≈3.6:1, a *separate* A5 question that V-3's triage must answer. Renaming the whole `textColor` ternary to `on-accent` would put near-black text on pink. |
| **c** | 🆕 **A FOURTH `text-black`-on-`bg-gold` site the list omits: `app/(main)/compatibility/index.tsx:239-240`** — the free-user badge, `<View className="bg-gold rounded-2xl p-4 mb-6">` / `<Text className="text-black text-center font-semibold">`. Same treatment: rename to `on-accent`. |

**So V-7's `on-accent` rename set is FOUR sites** — `PremiumBadge.tsx:10` (plus-branch only) ·
`(paywall)/index.tsx:177` · `WeeklyDayCard.tsx:31` · `compatibility/index.tsx:240` — and
`home.tsx:305` leaves the list entirely.

> 🆕 **A FIFTH KNOWN VIOLATION, measured 2026-07-30, that NO grep can reach.** The
> known-violations list read *"`(paywall)/index.tsx` CTA label + spinner, and
> `astrology/index.tsx` CTA ×4."* **It is five in `astrology/index.tsx`, not four**, and the fifth
> lives in that file's own `StyleSheet.create`:
>
> ```js
> unlockButton:     { backgroundColor: '#F59E0B', … },   // the accent fill
> unlockButtonText: { color: 'white', fontWeight: '600' } // ← white on 2.15:1
> ```
>
> 🔴 **The `no-white-on-accent` report-only grep is STRUCTURALLY BLIND to it**, and not by ±4 lines:
> the two style keys are four properties apart, and `unlockButtonText` **names no accent at all**, so
> no proximity window of any size pairs them. This is the same class of miss as the astrology CTA
> (inline-ternary fill + bare `color:'white'`) but strictly worse — the fill and the text are in
> *different style objects*, joined only at the JSX call site.
>
> 🆕 **AND A SIXTH, found while rewriting the file in 1a — same file, same structural pattern:**
>
> ```js
> assumedNoteCta:     { backgroundColor: '#F59E0B', … },  // the accent fill
> assumedNoteCtaText: { color: '#FFFFFF', … }             // ← white on 2.15:1
> ```
>
> So **`astrology/index.tsx` holds SIX white-on-accent sites, not four**: the generate CTA ×4
> (inline, on the `isLoadingBirthChart ? '#92722D' : accent` ternary) · `styles.unlockButton` /
> `unlockButtonText` · `styles.assumedNoteCta` / `assumedNoteCtaText`. **Two of the six are
> StyleSheet pairs that no proximity grep can ever reach.**
>
> **Consequence for the rule, stated once:** `no-white-on-accent` cannot be promoted to a failure
> condition at any point in the revamp, because **the set it cannot see is non-empty and known**.
> It stays REPORT-ONLY forever (§3.0.2 already says so; this is the evidence for *why*).
>
> ### 🔴 AND PASS 1a BLINDED THE RULE — found by running it before and after (2026-07-30)
>
> The authored inline half matched **only raw hex**: `backgroundColor:[^,;]*#(F59E0B|92722D)`.
> **Pass 1a rewrites those literals to `t.color.accent`, which matches neither that pattern nor
> `bg-accent`** — there is no `bg-` prefix on an inline style. Measured: `astrology/index.tsx`
> went from **1 reported hit to 0** the instant 1a ran — **not because it was fixed, but because the
> rule stopped being able to see it.** The foreground half erodes identically: `color: 'white'`
> becomes `color: t.color.fg`.
>
> 🔴 **A gate that reports "clean" *because* the codemod ran is worse than no gate.** This is the
> same class of failure as the plan's own `no-legacy-tokens` warning, inverted: there, a token stops
> resolving silently; here, a *check* stops matching silently. **Both halves of the pattern were
> widened to match the legacy AND the token spelling** (`scripts/token-gate.sh`), and re-running it
> re-catches all three visible astrology sites including the genuine `Generate Birth Chart` violation.
>
> 🔴 **EVERY LATER PASS MUST RE-CHECK ITS OWN GREPS FOR THIS.** Any rule whose pattern names a
> *value* rather than a *token* erodes as the codemod migrates that value. `no-white-on-accent` was
> the only report-only rule, so it was the only one that could erode invisibly — the eight failing
> rules cannot, because their counts are supposed to fall to zero and a wrong zero is caught by the
> site ledger. **Verify this explicitly before pass 2a, 3b and 4 rewrite their own families.**
>
> 🆕 **Widening it surfaced THREE candidate sites the narrow pattern never caught**, all needing a
> human read in 1b (proximity is not nesting, so some may be false positives):
> `readings/combined.tsx` ≈`:67` · `components/readings/StrengthsList.tsx` ≈`:33` ·
> `components/readings/DestinyCard.tsx` ≈`:45`. ⚠️ The **two StyleSheet pairs in
> `astrology/index.tsx` are still NOT caught**, exactly as predicted — which is the standing proof
> that the rule can never become a failure condition.
>
> 🟢 **All six migrated their FILL and their FOREGROUND in 1a** (`accent` and `fg`, both
> identity-preserving). **1b changes only the foreground to `on-accent`** — the V-7 decomposition.
> So the 1b work on this file is *"re-resolve six `t.color.fg` references to `t.color['on-accent']`"*,
> which is a **named, enumerated list** rather than a hunt.
>
> ⚠️ **This is the local `SectionCard`'s locked-branch "Upgrade" button** — the one `UI-audit.md` §5.7
> replaces with the extracted `SectionCard` + one `LockShell`. So it may be **deleted rather than
> recoloured**. Either way it is **1b / R1 work, never 1a.**
>
> 🆕 **And one more `on-accent` candidate the four-site list omits:** `astrology/index.tsx`'s
> `premium_plus` PLUS badge — `backgroundColor: '#F59E0B'` with `color: 'black'` (the **single**
> `black` keyword in the whole 81-keyword ledger). Contrast is already correct, so it is a V-7 rename
> in kind — **but `UI-audit.md` §5.7 deletes this badge** as R1 gate #10. **Register, do not rename.**

⚠️ **One thing the pass-0 run found that the plan predicted wrongly, in the safe direction:**
§3.0.2 says the report-only grep *"NEVER catches the astrology CTA."* **It does** —
`astrology/index.tsx:579` appears in the output, because a `bg-gold`/`#F59E0B` fill happens to
fall inside its ±4-line window. Six hits total (4 allow-listed + the 2 known violations), not the
predicted five. The rule stays **report-only** regardless; do not promote it to a failure.

---

#### The table itself

**A concern, stated once and then built around:** D2 classifies pass 1 as an identity pass. That is
true of most of it and false of these eight rows, because the design's own token table collapses
several live colours into one and leaves three with no target at all. Nothing here re-opens D2 — it
splits pass 1 into **1a (identity, gated)** and **1b (value, reviewed)** so the identity gate is
applied only where it can pass. **Every row must be decided before pass 1 runs.** Recommendation
given; the owner's call is what ships.

| # | the collapse | sites | recommendation |
|---|---|---|---|
| **V-1** ✅🔴 **SPLIT BY SOURCE COLOUR** | **`accent` absorbs three live colours**: `#6B21A8` (`primary-dark`, ×13 hex + ×18 className), `#F59E0B` (`gold`, ×51 hex + ×70 className), and `primary-dark`'s *other* value `#4C1D95` (`lib/colors.primaryDark`). The audit already flagged the `#6B21A8`/`#4C1D95` split as *"a decision, not a cleanup"* (§2.3) | **~152** = **121 in 1a** + **~31 in 1b** | **Hold `accent` = `#F59E0B`** (the larger, and the one Vellum's clay orange actually succeeds). 🔴 **V-1 IS THREE OPERATIONS, NOT ONE ATOMIC ROW — see the ruling box below (O-23).** The ~31 purple sites move gold **visibly**, so they need 1b and a screenshot pass; the 121 gold sites carry **no delta at all** and belong in 1a. Most purple lives in `LinearGradient` slabs the design deletes anyway (21 of them → one `aura`), so audit each purple site for "does this element survive at all?" first. |

> ### 🔴 V-1 IS SPLIT BY SOURCE COLOUR — OWNER RULING (2026-07-30), resolving **`O-23`**
>
> | source colour | → | sites | delta | **pass** |
> |---|---|---|---|---|
> | **`#F59E0B`** (`gold`) — 51 hex + 70 className | `accent` | **121** | 🟢 **NONE — byte-identical.** `accent` is HELD at `#F59E0B` | 🟢 **1a** |
> | **`#6B21A8`** (`primary-dark`) — 13 hex + 18 className | `accent` | **~31** | 🔴 purple becomes gold — **visible** | **1b** |
> | **`#4C1D95`** (`lib/colors.primaryDark`) | `accent` | — | 🔴 **visible** | **1b** (and it rides `lib/colors.ts`'s deletion) |
>
> 🔴 **THE GOVERNING PRINCIPLE, recorded because it generalises to every other row:**
> **the 1a/1b boundary is VALUE PRESERVATION, not which document row mentions a colour.**
> Excluding the golds from 1a because `#F59E0B` appears in *V-1's prose* would define the split by
> **document structure** rather than by the property the gate actually measures. A row that names
> three source colours is three operations, and they are classified **independently**.
>
> **The arithmetic confirms it.** §1.3's headline `~1,110` for 1a reconciles at **~1,129 WITH** the
> golds and only **~1,008** without — i.e. the plan's own figure was written *assuming* the golds are
> 1a. See the re-measured split table below.
>
> ⚠️ **And nothing about the five A5 sites holds gold back** — this is the **V-7 decomposition already
> agreed**, applied consistently: a gold **BACKGROUND** → `bg-accent` is identity-preserving and
> migrates in **1a**, *even on an A5 site*; `#FFFFFF` → `fg` is identity-preserving and also migrates
> in **1a**. **A5 is a FOREGROUND problem.** 1b changes only the foreground, `fg` → `on-accent`. So on
> the paywall CTA and the astrology CTA the fill moves in 1a and the label moves in 1b — two passes,
> two properties, each gated by what it can actually prove.
| **V-2** ✅ | 🔴 **`primary` `#C4B5FD` has NO Vellum target.** 66 className usages — the app's most-used brand colour — and §2's table never names a replacement | **66** + `lib/colors.primary` | ✅ **RULED (P20). Split by role, not by find-and-replace** — and 🔴 **P20 ADDS A MANDATORY PRE-STEP: enumerate all 66 by role and identify any TAPPABLE labels BEFORE defaulting text sites to `fg-secondary`.** Coloured text may be **carrying the tap affordance**; moving it to `fg-secondary` **deletes that affordance silently, with no visual error and nothing any gate can catch.** Targets 🔴 **AS CORRECTED BY R1 (2026-07-30): tappable or a link → `accent`** · **deliberate NON-interactive emphasis → `accent-2`** · plain secondary copy → `fg-secondary` · borders (`border-primary/20\|30\|40`, 3 sites) → `border-strong`. **The earlier "tappable → `accent-2`" is WITHDRAWN** — see Change 3's ruling box. Do not let a codemod pick. |
| **V-3** ✅🔴 | 🔴 **`pink` `#EC4899` has no target** outside `BirthChartWheel` | 14 className + 18 hex = **32** | Most are gradient stops in slabs the design removes. **Triage first**: for each site, does the element survive the redesign? Survivors → `accent-2`. Register the residue. 🔴 **PLUS ONE REQUIRED DECISION — see the box below (R6 / O-22).** |

> ### 🔴 V-3 GAINS A REQUIRED DECISION — OWNER RULING R6 (2026-07-30). Registered as **O-22**.
>
> **`PremiumBadge.tsx`'s `bg-pink` / `text-white` branch is sub-AA and LIVE, and the mechanical
> mapping makes it worse.** This is **a decision, not a mapping** — do not let a pass resolve it.
>
> ```tsx
> // components/subscription/PremiumBadge.tsx — the premium (non-plus) branch
> const bgColor   = tier === 'premium_plus' ? 'bg-gold'    : 'bg-pink';    // ← this
> const textColor = tier === 'premium_plus' ? 'text-black' : 'text-white'; // ← and this
> ```
>
> | pairing | measured contrast | |
> |---|---|---|
> | **today** — `#FFFFFF` on `#EC4899` | **3.53:1** | 🔴 sub-AA, and the label is 13px `text-xs` |
> | `pink → accent-2` **HELD** `#C084FC`, white kept | **2.64:1** | 🔴 worse |
> | `pink → accent-2` **Vellum** `#B3A6D9`, white kept | **2.24:1** | 🔴 materially worse |
> | **`on-accent` on an iris fill** | **8.08:1** | 🟢 §16.7 already records this |
> | **`text-accent-2` on `surface`** (outline chip, no fill) | **8.18:1** | 🟢 §16.7; and it is what §16.6 DRAWS |
>
> 🔴 **So the mechanical V-3 mapping — `bg-pink` → `bg-accent-2`, keep `text-white` — takes a live
> 3.53:1 defect to 2.24:1.** It must not be applied as a rename.
>
> **Three options, the owner's to pick:**
>
> | | option | note |
> |---|---|---|
> | **(a)** 🟢 **recommended** | `bg-accent-2` + **`text-on-accent`** | **8.08:1**, no new token, and it mirrors the `premium_plus` branch's existing `on-accent` shape exactly |
> | **(b)** | **outline chip** — `text-accent-2` on the card's own `surface`, no fill | **8.18:1**. 🔴 **This is what §16.6 actually draws** for `PREMIUM` / `PLUS` chips, so it is the option most faithful to the design — but it is a **shape change**, not a colour change, and belongs to the **primitives/screens phase**, not to pass 1b |
> | **(c)** | accept 3.53:1 as a documented exception | 🔴 **NOT recommended, and O-20's exemption does NOT apply.** O-20 waives contrast for *decorative graphics*; this is a **text label**, so WCAG **1.4.3** governs and 4.5:1 is the real floor |
>
> 🟢 **The `premium_plus` branch is UNAFFECTED and stays a pure V-7 rename** (`bg-gold` + `text-black`
> → `text-on-accent`, contrast already correct, **do not re-resolve the role**).
>
> ⚠️ **Both branches are 1b.** In pass **1a** this file is untouched: `bg-gold`/`bg-pink`/`text-black`/
> `text-white` are all in the 565-name retired ledger and all four are 1b rows (V-1 / V-3 / V-7).
| **V-4** ✅ | **`surface-raised` / `surface-overlay` absorb an alpha range** — `rgba(255,255,255,0.03)` ×4, `0.04` ×6, `0.05` ×12, plus 0.08 and 0.10 | **~25** | Map 0.03/0.04/0.05 → `surface-raised`, 0.08/0.10 → `surface-overlay`, per §4.5's lightness ladder. The 0.03→0.05 sites get *lighter*; that is the intended depth model, but it is a value change. |
| **V-5** ✅🔴 | 🔴 **There is no `scrim` token.** `rgba(0,0,0,0.5)` ×7, `0.6` ×3, `0.7` ×6 = 16 sites. §9 #15 specifies the Sheet scrim as *"`bg` @ 60%"* — a component property, not a token | **16** + **4** | ✅ **RULED (P20), CORRECTED BY R3: add `scrim: '#000000'` — a SOLID HEX — to `theme.color`** (held), flipping to `#100E0D` at pass 5. **ONE value — the 0.5/0.6/0.7 spread is drift, not design.** Shipped in `theme.js` at pass 0. It is the only way `no-raw-hex` reaches zero on those 16. 🆕 **AND FOUR MORE SITES THE COUNT MISSES —** the scrims expressed as **classNames**, not `rgba()` literals, so no `no-raw-hex` grep sees them: `bg-black/70` (`LogoutConfirmModal.tsx:31`), `bg-black/60` (`NotificationPrompt.tsx:20`), `bg-black/90` (`SunSignReveal.tsx:59`), `bg-black/60` (`LockedOverlay.tsx:14`). They **are** caught by `no-legacy-tokens` (they are 4 of the 8 `black` sites). 🟢 **Under R3 all four KEEP their modifier and become byte-identical renames** — `bg-black/NN` → `bg-scrim/NN`, **1a not 1b.** **`SunSignReveal` keeps its 0.90** as `bg-scrim/90`; it does NOT go to 0.60. Only the 16 rgba literals carry a value change (the 0.5 and 0.7 sites move to 0.6) and only they need the 1b screenshot pass. |
| **V-6** ✅ | **`fg-disabled` and `locked` have no old equivalent** | ~19 `Button` disabled sites + 11 lock sites | Ship them at their Vellum-shaped held values (§1.6a). They are *new* roles; there is no identity to preserve. `fg-disabled` pairs with **`opacity: 1`**, replacing the old container-`opacity: 0.5` hack — a deliberate change, in 1b. |
| **V-7** ✅🔴 | **A5 — the `on-accent` floor.** `text-white`/`#FFFFFF`/`color:'white'` on a filled `accent`/`warning`/`success`/`danger` must become `on-accent`. Today: `#FFFFFF` on `#F59E0B` = **2.15:1** | **~10** (see below) | **Mechanical default + enumerated exceptions.** Rewrite *all* 434 white sites (`text-white` 299 + `color:'white'` 80 + `#FFFFFF` 55) → `fg`, which is byte-identical (held `fg` = `#FFFFFF`) and therefore **1a**. Then hand-resolve only the fill sites to `on-accent` — that is **1b** and it is the contrast fix. Known targets: `(paywall)/index.tsx` CTA label ×2 + its `#FFFFFF` spinner; `astrology/index.tsx` generate CTA `color:'white'` ×4 on `#F59E0B`/`#92722D`. 🔴 **REWORDED PER P20 — the old wording read "allow-list (already correct, do not touch)" and that is WRONG.** These are **contrast already correct — rename to `on-accent` only, do NOT re-resolve the role.** They are `text-black`, and `black` is 8 of the 565 retired names, so it **stops resolving at S1** and `no-legacy-tokens` **will** fail on them. The set is **FOUR**: `PremiumBadge.tsx:10` (**plus-branch only** — the `bg-pink`/`text-white` branch is V-3's), `(paywall)/index.tsx:177`, `WeeklyDayCard.tsx:31`, **`compatibility/index.tsx:240`** (newly found). 🔴 **`home.tsx:305` is NOT in this set** — it is a proximity false positive with no `text-black`; see correction (a) above. |
| **V-8** ✅ | **`#1A1A2E` ×6, `#1A1A24` ×4, `#4A3C1C` ×4, `#3a2f13`, `#92722D`, `#C6C6D2` ×3, `#374151` ×3** and the rest of the 64-value long tail | **~30** | Per-site, by role. `#374151` = `gray-700` → `border-subtle`. `#4A3C1C`/`#3a2f13`/`#92722D` are the gold-tinted DI-toggle and tag grounds → `accent-muted`. `#1A1A2E`/`#1A1A24` are near-`#1A1425` → `surface`. |

> ### 🔴 O-22 CONDITION (a) — "confirm it isn't upside down." **IT IS. And a swap is the wrong fix.**
>
> **Measured, today:**
>
> ```tsx
> const bgColor   = tier === 'premium_plus' ? 'bg-gold'    : 'bg-pink';    // PLUS = gold, PREMIUM = pink
> const textColor = tier === 'premium_plus' ? 'text-black' : 'text-white';
> const label     = tier === 'premium_plus' ? 'PLUS'       : 'PREMIUM';
> ```
>
> Under V-1/V-3 that maps **`premium_plus` → `accent` (clay)** and **`premium` → `accent-2` (iris)**.
> Against the owner's criterion — *"`accent-2` is the rarer, more distinctive accent, so the higher
> tier should take it"* — **the hierarchy IS inverted: the lower tier gets the rarer colour.**
>
> 🔴 **But swapping them is the wrong fix, for a reason that outranks the hierarchy argument.**
> **§16.1 names BOTH markers as `accent-2` territory** — *"…PREMIUM/PLUS/NEW markers"*, both of them.
> And **§16.2 says `accent` is "always the actionable thing on screen"**, so putting a tier badge in
> clay makes a non-interactive status marker read as an affordance. A swap fixes the ordering and
> keeps that second defect.
>
> **🟢 RECOMMENDATION: both branches → `bg-accent-2` + `text-on-accent`, distinguished by LABEL only.**
> Both land at **8.08:1**; both satisfy §16.1; neither claims the action colour; and the hierarchy
> question dissolves because `PREMIUM` and `PLUS` are already different words. **Cost:** the tier
> distinction is no longer carried by hue. If the owner wants a visual rank, the §16-compatible lever
> is **weight or a border** (`accent-2` fill for PLUS, `accent-2` outline for PREMIUM), **never clay.**
>
> ⚠️ **The app has FOUR different tier-badge treatments, not one convention** — so there is no
> established "PLUS = gold" rule to preserve:
>
> | site | treatment | fate |
> |---|---|---|
> | `PremiumBadge.tsx` | `bg-gold`+`text-black` / `bg-pink`+`text-white` | **O-22** |
> | `astrology/index.tsx` PLUS | `accent` fill + `color:'black'` | 🔴 **DELETED** by R1 gate #10 |
> | `home.tsx` ×2 PLUS pills | `bg-primary-dark` + `colors.primaryLight` text | 🔴 **DELETED** by R1 gates #29/#30 |
> | `readings/index.tsx` PREMIUM | `text-[#F59E0B]`, **no fill** — the *lower* tier in gold | 1a (B7) |
>
> 🔴 **AND A WORSE LIVE CONTRAST DEFECT FOUND WHILE CHECKING THIS: `home.tsx`'s two PLUS pills render
> `#9333EA` on `#6B21A8` — purple on purple, measured `1.62:1`.** That is *far* worse than O-22's
> 3.53:1, on the app's **highest-traffic screen**, and it is effectively invisible text. 🟢 **It
> self-resolves**: `UI-audit.md` §5.7 deletes both pills with their R1 gates (#29/#30), and *"a PLUS
> pill and its gate are one unit."* **Recorded so that if the R1 commit slips, this is known to be
> riding on it** — it must not be quietly left in place as "just a badge".



---

#### 🔬 THE OPACITY-MODIFIER MEASUREMENT — the load-bearing evidence for R2 and R3

> **Both rulings depend on one mechanical question: does a Tailwind opacity modifier compose against
> a theme colour, and in what spellings?** It was **measured**, not reasoned about — the repo's own
> `tailwindcss@3.4.19` + `nativewind@4.2.4` preset compiled over a probe file, then the emitted CSS
> fed through `react-native-css-interop@0.2.4`'s `cssToReactNativeRuntime` at `inlineRem: 16`. That
> is the same resolution path as `scripts/resolve-utilities.js` (§4.2).

| probe class | theme colour | emitted CSS | **resolved RN value** | verdict |
|---|---|---|---|---|
| `bg-scrim/60` | `#000000` solid | `rgb(0 0 0 / 0.6)` | **`#00000099`** | 🟢 composes |
| `bg-scrim/70` | `#000000` solid | `rgb(0 0 0 / 0.7)` | **`#000000b3`** | 🟢 composes |
| `bg-scrim/90` | `#000000` solid | `rgb(0 0 0 / 0.9)` | **`#000000e6`** | 🟢 composes |
| `bg-black/60` *(today)* | `#000000` | `rgb(0 0 0 / 0.6)` | **`#00000099`** | 🟢 **byte-identical to `bg-scrim/60`** |
| `bg-black/70` *(today)* | `#000000` | `rgb(0 0 0 / 0.7)` | **`#000000b3`** | 🟢 **byte-identical to `bg-scrim/70`** |
| `bg-black/90` *(today)* | `#000000` | `rgb(0 0 0 / 0.9)` | **`#000000e6`** | 🟢 **byte-identical to `bg-scrim/90`** |
| `bg-scrim` *(bare)* | `#000000` solid | `--tw-bg-opacity:1; rgb(0 0 0 / var(…))` | `[…,"rgba",[0,0,0,[…var…]]]` | ⚠️ **OPAQUE — no default alpha** |
| `bg-scrim/60` | `rgba(0,0,0,0.6)` | `rgba(0, 0, 0, 0.6)` | `#00000099` | 🔴 **composes — V-5's premise was WRONG** |
| `bg-scrim/90` | `rgba(0,0,0,0.6)` | `rgba(0, 0, 0, 0.9)` | `#000000e6` | 🔴 **the modifier REPLACES the alpha** |
| **`bg-success/12`** | `#10B981` solid | **— NOTHING —** | **`null` (rule absent)** | 🔴 **DOES NOT EXIST** |
| **`bg-danger/12`** | `#EF4444` solid | **— NOTHING —** | **`null` (rule absent)** | 🔴 **DOES NOT EXIST** |
| **`bg-success/[0.12]`** | `#10B981` solid | `rgb(16 185 129 / 0.12)` | **`#10b9811f`** | 🟢 works, but 🔴 **NOT the ruled spelling** |
| **`bg-success/10`** ✅ | `#10B981` solid | `rgb(16 185 129 / 0.1)` | **`#10b9811a`** | 🟢 **THE RULED SPELLING** |
| **`bg-danger/10`** ✅ | `#EF4444` solid | `rgb(239 68 68 / 0.1)` | **`#ef44441a`** | 🟢 **THE RULED SPELLING** |
| `bg-success/50` | `#10B981` solid | `rgb(16 185 129 / 0.5)` | `#10b98180` | 🟢 on-scale, composes |
| `text-fg/80` | `#FFFFFF` solid | `rgb(255 255 255 / 0.8)` | `#ffffffcc` | 🟢 = `text-white/80` exactly |
| `bg-fg/20` | `#FFFFFF` solid | `rgb(255 255 255 / 0.2)` | `#ffffff33` | 🟢 = `bg-white/20` exactly |

**Three conclusions, and each one changes an instruction:**

1. 🔴 **`bg-success/12` and `bg-danger/12` DO NOT COMPILE, and NativeWind drops them silently.**
   Tailwind 3.4's `theme.opacity` scale is **`0 5 10 15 20 … 95 100`** — steps of five. `12` is not a
   key, `nativewind/preset` does **not** override the scale (verified), and Tailwind 3 does **not**
   accept a bare off-scale number as an arbitrary modifier. **R2's mechanism is sound but its
   spelling is not.** The working forms are **`bg-success/[0.12]`** (arbitrary, exact 12%) or
   **`bg-success/10`** (on-scale, 10%). ⚠️ **This is precisely the failure mode §1.1 exists to
   prevent: no build error, no warning, no runtime signal — the wash just does not render.**
   🟢 **RULED 2026-07-30: USE `/10`.** On-scale, greppable, no new syntax. 🔴 **NOT `/[0.12]`** — 1a
   is *removing* 27 arbitrary-value classes, so adding a new one runs against the pass. 🔴 **NOT a
   `12` step on `theme.opacity`** either — that is a one-component value earning a config entry, the
   same objection that ruled out `success-muted`/`danger-muted`. **A 2% opacity difference on a
   decorative wash behind text is not load-bearing.** If the designer establishes that 12% *is*
   load-bearing, the fallback is **extending the scale, never arbitrary syntax.** Verified:
   `bg-success/10` → **`#10b9811a`**, `bg-danger/10` → **`#ef44441a`**.
2. 🟢 **R3's conclusion holds and gets STRONGER than its stated reason.** `bg-scrim/NN` on a solid hex
   is byte-identical to today's `bg-black/NN`, so **the four className scrims move from 1b to 1a.**
3. 🔴 **V-5's original justification is FALSE and must not be re-transcribed.** *"`bg-scrim/70` does
   not compose because `scrim` is itself an rgba value"* — measured, it **does** compose: Tailwind
   parses the `rgba()` and **replaces** the alpha channel. R3 is still the right call, but on grounds
   (1)+(2) above, **not** on that claim. Recorded because a false reason invites a "correction" back
   to rgba by the next reader who tests it.

> ⚠️ **ONE THING THAT LOOKS LIKE A CONFIG BUG AND IS NOT.** The resolved bases above read
> `#10b981` and `#ef4444` — **Tailwind's own `emerald-500` and `red-500`.** That is **correct**, and
> it is not the defaults leaking past the S0 bridge:
>
> - **`success` and `danger` are NOT Tailwind colour keys at all** (verified: `tailwindcss/colors`
>   has no `success`/`danger`). So `bg-success` can *only* resolve through `...t.color` in the bridge.
> - **`#10B981` and `#EF4444` ARE the HELD values** (§1.6a), because the app's original palette was
>   drawn from Tailwind's ramp in the first place. The coincidence is the *cause*, not a symptom.
> - **Vellum's `#86A97B` / `#C8695E` arrive at PASS 5**, per §0.3. Seeing them before pass 5 would be
>   the actual bug.
>
> **Recorded because "the base is emerald-500, so the token isn't resolving" is a very reasonable
> misreading**, and chasing it would mean re-opening a correct S0 bridge.

---

#### 🔴 THE 1a / 1b SPLIT — RE-MEASURED (2026-07-30). §1.3's original figures were wrong.

**§1.3 previously read:** *"1a ≈ 1,110 sites (the 434 whites → `fg`, the three `fg-*` roles, `bg`,
`surface`, the four status colours, the 339 default-ramp renames, the 27 arbitrary classes). 1b ≈ 445."*

🔴 **Three of those clauses assign sites to 1a that have NO identity target.** An identity pass whose
map contains a non-value-preserving row **cannot pass its own gate** — the rows would have to be
deleted from the map mid-pass, which is exactly the "measured against the wrong denominator" failure
§0.2's baseline correction warns about. Re-measured as MATCH counts:

| clause | §1.3 said | **measured** | correction |
|---|---|---|---|
| the 434 white sites → `fg` | 434, all 1a | **434 total, 427 in 1a** | ✅ all 434 ARE identity (held `fg` = `#FFFFFF`), but **7 are the deferred A5 violations** (paywall CTA label ×2 + its `#FFFFFF` spinner, `astrology/index.tsx` CTA `color:'white'` ×4) and belong to **1b**. ⚠️ Also: the composition is **286 `text-white` + 13 `bg-white`**, not "299 `text-white`" — `bg-white` → `bg-fg` is value-preserving but semantically odd, and 16 of the 299 carry a modifier (`text-white/80` ×8, `bg-white/20` ×8) which composes identically |
| the 339 default-ramp renames | 339, all 1a | 🔴 **293 in 1a · 46 in 1b** | **Only 6 of the 12 ramp classes in use have an identity target.** 1a: `gray-400`→`fg-muted` ×160 · `gray-800`→`border-subtle` ×63 · `gray-300`→`fg-secondary` ×44 · `gray-500`→`fg-placeholder` ×16 · `red-500`→`danger` ×9 · `purple-400`→`accent-2` ×1. 🔴 **1b (no held token matches the value):** `gray-700` `#374151` ×18 (V-8 already routes it to `border-subtle` — **a value change**) · `red-400` `#f87171` ×16 · `gray-600` `#4b5563` ×5 · `red-900` `#7f1d1d` ×4 · `red-600` `#dc2626` ×2 · `purple-500` `#a855f7` ×1 |
| the 27 arbitrary classes | 27, all 1a | 🔴 **24 in 1a · 3 in 1b** | 1a: `text-[#9CA3AF]` ×8 · `text-[#F59E0B]` ×6 · `bg-[#1A1425]` ×6 · `bg-[#F59E0B]` ×2 · `text-[#0F0A1A]` ×1 · `bg-[#0F0A1A]` ×1. 🔴 **1b:** `text-[#EC4899]` (V-3) · `bg-[#EC4899]` (V-3) · `bg-[#6B21A8]` (V-1) |

**Two more things the re-measurement surfaced, both registered rather than silently absorbed:**

- 🔴 **The gold sites are unassigned between 1a and 1b — see O-23.** It swings 1a by **121 sites**
  (51 `#F59E0B` literals + 70 `-gold` classNames) and it is the whole reason §1.3's `~1,110` and the
  measured floor of `~1,008` disagree. **Decide it before writing the map.**
- 🆕 **`ShareableQuote.tsx`'s `bg-[#F59E0B]` + `text-[#0F0A1A]` is a FIFTH `on-accent` candidate**
  that V-7's list of four omits. In **1a** it is two ordinary identity renames (`bg-accent` +
  `text-bg`); re-resolving `text-bg` → `text-on-accent` is a **value change** (`#0F0A1A` → `#000000`)
  and therefore **1b**. ⚠️ It is also a **W1 / X6 / X7 share surface** — read §7.3 before touching it.

**Corrected split — ✅ SETTLED (O-23: the golds are 1a).**

| | sites |
|---|---|
| **1a** | **~1,129** |
| **1b** | **~426** |
| total | **~1,555** — reconciles to §1.3's ledger exactly |

**Write this number into the pass-1a commit body alongside the gate output** (§4.6).

#### Gate for pass 1

```sh
cd mobile
# 1a — value preservation, mechanically asserted
node scripts/resolve-utilities.js --map /tmp/colour-map.json \
     --before /tmp/p1-before.json --after /tmp/p1-after.json
#   colour-map.json = { "text-white":"text-fg", "text-gray-400":"text-fg-muted",
#                       "text-gray-300":"text-fg-secondary", "bg-card":"bg-surface",
#                       "bg-background":"bg-bg", "border-gray-800":"border-border-subtle", ... }
#   MUST print "0 of N mapping(s) are not value-preserving", exit 0.
#   ⚠️ LIMIT: colour values resolve as rgba descriptors carrying a --tw-*-opacity var
#   indirection, so this asserts STRUCTURAL equality of the RGB triple. It proves
#   #9CA3AF -> rgba(156,163,175,var) is unchanged; it does NOT evaluate the var.
#   For the literal half, assert on theme.js's own hex digits (§1.6a) instead.

# 1b — scope, not value
bash scripts/token-gate.sh          # no-raw-hex = 0, no-legacy-tokens = 0
test ! -e lib/colors.ts             # the second token system must be GONE, not merely unused
grep -rEn "bg-\[#|text-\[#|border-\[#" app components   # arbitrary-value classes: expect 0
npx tsc --noEmit && (cd ../server && npx tsc --noEmit)
```

**Rollback:** 1a and 1b are separate commits. `git revert` either independently. **Do not squash
them** — 1a's whole value is that it is a diff nobody has to look at.

---

### 1.4 PASS 2a — fontSize · IDENTITY

> ## 🟢 DONE 2026-07-31 — `build27.1-pass2a-fontsize`. Five commits; full record in the progress log.
> `202d79a` (--members) · `f7c15a9` (S2 + 25 renames) · `83cdc5b` (191 sites) ·
> `27fba83` (26 fractional — **the only pixel-moving commit in the pass**) · `a48a208` (60 markers + gate).
>
> 🔴 **THE SECTION BELOW OVERSTATES THE PASS, AND THE NUMBERS THAT FOLLOW ARE THE MEASURED ONES.**
> "346 inline `fontSize:` → the ramp" reads as one mechanical sweep. It is not: the 341 sites (346
> before R1) span **29 distinct values of which only TEN are ramp steps.** Measured split —
>
> | class | sites | where it went |
> |---|---|---|
> | exact ramp match, role-admitted | **191** | ✅ 2a, Δ 0.0px |
> | §3.5 fractional | **26** | ✅ 2a, Δ ≤ 0.5px |
> | **GLYPH** — a pictograph's size is a DIMENSION, not a type step | **60** | 🔴 **PERMANENT** — marked `/* GLYPH */`, gate-excepted |
> | OFF-STEP type (9 · 10 · **14 ×34** · 22) | **44** | → **2b** |
> | ROLE-MISFIT — the step exists, its role forbids the site | **13** | → **2b** |
> | ABOVE-CEILING type (32 · 36 · 40 · 96) | **7** | → **2b** |
>
> 🔴 **WHY GLYPHS ARE PERMANENT, and it is not fastidiousness: at 20 and at 24 the ramp holds TWO
> steps of EQUAL SIZE** (`text-xl`/`display-sm`, `text-2xl`/`display-md`). A chevron has no role that
> chooses between them, so for a glyph the mapping is not hard — it is **UNDEFINED**.
>
> 🔴 **ROLE-MISFIT is the class this section does not anticipate at all.** A ramp step carries a ROLE
> as well as a size: `overline` 11 is **UPPERCASE-only** and `quote` 17 is **Literata-Italic**. Nine
> Title-case 11px sites and four bold 17px sites therefore have **no role-correct target at their
> current size**, which makes them value decisions. §3.3's own tab-label note is one of them.
>
> **Item 3's 30 ceiling sites did NOT happen here.** `4xl`/`5xl`/`6xl` are **frozen in the S2 config at
> today's 36/48/60** so they keep resolving; retiring them is a reviewed VALUE commit, not this one.
>
> ⚠️ **Item 4's "28 fractional, all in `qa.tsx` and `cosmic-report.tsx`" is wrong on both counts.** It
> is **26**, and **four are elsewhere** (`astrology/index.tsx` ×2, `cosmic-report-history.tsx` ×2).
> `token-gate.sh`'s comment has always said 26.
>
> **`TYPE_FREEZE` shipped with two deliberate departures from the block below** — no `letterSpacing`
> (emitting `0px` where nothing exists today ADDS a declaration and reports five moved rules in an
> identity pass), and the three frozen above-ceiling keys. Both are documented in the config itself.

#### Why this pass is nearly a no-op, and where its real work is

Post-`inlineRem`-flip, **every mapped ramp step's SIZE is already byte-identical** to its new token
(§6.6 D, re-measured this session through the production resolution path):

| class | rendered today | ramp target | size identical? |
|---|---|---|---|
| `text-xs` | `{fontSize: 13}` | 13 | ✅ |
| `text-sm` | `{fontSize: 15}` | 15 | ✅ |
| `text-base` | `{fontSize: 16, lineHeight: 24}` | 16 | ✅ |
| `text-lg` | `{fontSize: 18, lineHeight: 28}` | 18 | ✅ |
| `text-xl` | `{fontSize: 20, lineHeight: 28}` | 20 | ✅ |
| `text-2xl` | `{fontSize: 24, lineHeight: 32}` | 24 | ✅ |
| `text-3xl` | `{fontSize: 30, lineHeight: 36}` | `display-lg` 30 | ✅ |

So **630 of the 660 `text-*` className usages need no edit at all** — the class name is the same
string before and after. Pass 2a's actual work is four things:

1. **`TYPE_FREEZE`** — the config change (below).
2. **25 `text-3xl` → `display-lg`** (a rename; size 30 → 30, identical).
3. 🔴 **30 `text-4xl` / `text-5xl` / `text-6xl` sites in 27 files have NO ramp target** — the
   ceiling is `display-lg` 30, and today they render 36 / 48 / 60. **These are per-site decisions,
   never mechanical, and the design never enumerated them.** They are the one part of 2a that is
   not identity; treat each as a 1-line reviewed change and list them in the commit body.
4. **346 inline `fontSize:` declarations** → the ramp, including §3.5's 28 fractional sites
   (`10.5→overline 11` · `11.5→text-2xs 12` · `12.5→text-xs 13` · `13.5→text-xs 13` ·
   `14.5→text-sm 15` · `15.5→text-sm 15`; max displacement 0.5px, nothing moves more than one step).
   All 28 are in `qa.tsx` and `cosmic-report.tsx`, both **RESTYLE-ONLY, structure frozen** (D8) —
   these are pure value edits.

#### 🔴 `TYPE_FREEZE` — the config form that makes D1 possible

Size and lineHeight ship in **one** Tailwind `fontSize` object, so nothing separates them except
this. Pass 2a's config carries **`size` from `theme.type` and `lineHeight`/`letterSpacing` frozen at
each step's currently-rendered value** (measured, not guessed):

```js
// tailwind.config.js — PASS 2a ONLY. Removed in pass 2b. See codemod-plan §1.4.
// Sizes come from theme.type. lineHeight/letterSpacing are FROZEN at what the app
// renders today so pass 2a is provably fontSize-only. Measured via
// scripts/resolve-utilities.js at inlineRem 16.
const TYPE_FREEZE = {
  'display-lg': { lineHeight: '36px', letterSpacing: '0px' },  // was text-3xl 30/36
  'text-2xl':   { lineHeight: '32px', letterSpacing: '0px' },
  'text-xl':    { lineHeight: '28px', letterSpacing: '0px' },
  'text-lg':    { lineHeight: '28px', letterSpacing: '0px' },
  'text-base':  { lineHeight: '24px', letterSpacing: '0px' },
  'text-sm':    {},                                            // emits NO lineHeight today
  'text-xs':    {},                                            // emits NO lineHeight today
  // display-md, display-sm, quote, text-2xs, overline have ZERO existing usages,
  // so there is no rendered value to preserve — they ship at the ramp's own values.
};
```

`letterSpacing: '0px'` is byte-equivalent to unset (RN defaults `letterSpacing` to 0), so freezing
it at 0 is identity; the ramp's real tracking (`display-lg` −0.6, `overline` +1.3, …) arrives in 2b.

#### Gate for pass 2a

```sh
cd mobile
node scripts/resolve-utilities.js --diff /tmp/p2a-before.json /tmp/p2a-after.json
#   EVERY moved rule must be a text-* rule whose ONLY change is the class NAME
#   (text-3xl -> display-lg). No rule may change a fontSize, lineHeight or
#   letterSpacing NUMBER. If any number moves, the freeze table is wrong.
bash scripts/token-gate.sh   # no-numeric-fontsize must be 0
grep -rEn "text-(4xl|5xl|6xl|3xl)\b" app components   # expect 0
npx tsc --noEmit && (cd ../server && npx tsc --noEmit)
```

**Rollback:** one commit. Reverting restores the 346 inline sizes and the pre-freeze config together.

---

### 1.5 PASS 2b — lineHeight + letterSpacing · **VALUE. NOT identity-gated. Ever.**

> ## 🟢 APPLIED 2026-07-31 — `build27.1-pass2b-lineheight`. Six batches. Numbers below are MEASURED.
>
> | batch | what | gate |
> |---|---|---|
> | **D0** | `no-bare-overline` (O-28 a) + `no-variable-fontsize`. **Instrument only, no product code** | both re-validated in 3 directions |
> | **D1** | `TYPE_FREEZE` deleted; the ramp's lineHeight + letterSpacing land | `--diff` **8 rules moved, every one `text-*`, NO fontSize moved** |
> | **D2** 🔴 **LOSSY** | `lineHeight: {}` added to the config; **45 `leading-*` stripped** | `--diff` **exactly the 5 `leading-*` → (absent)**; `no-leading-utilities` **45 → 0** |
> | **D3** | **200 txt()/ramp conversions** + 59 P23 opt-ins | `tsc` ×2 clean; `--members` unchanged |
> | **D4** | **44 OFF-STEP** sites, per-site by role | `no-numeric-fontsize` inline **64 → 20** |
> | **D5** | **13 ROLE-MISFIT** sites | inline **20 → 7** (the named floor) |
>
> 🔴 **THE SCOPE CHANGED BEFORE IT RAN (owner, 2026-07-31): the ~180 `txt()` conversions moved
> from pass 4 into 2b.** They deliver 2b's own payload (leading on inline-styled text — an inline
> style cannot inherit a ramp) *and* pass 4's P23 opt-ins, so the sites are touched once instead
> of twice. **P23 is thereby closed from both ends**: pass 4's global
> `allowFontScaling = false` can no longer ship without its opt-ins, because they are already in.
>
> **The ~180 reconciled EXACTLY, and the split is the finding.** 217 sites carry a
> `t.type['<step>'].size` after 2a; **179 of them are on the five `scales: true` steps** — that is
> §3.6's "~180", measured rather than estimated. But they do not all take the same treatment:
>
> | home | count | treatment | why |
> |---|---|---|---|
> | JSX inline, `scales: true` | **138** | full `txt()` — style **and** both props | the clean case |
> | JSX inline, `scales: false` | **28** | `...txt(step).style` only | §3.3's `scales?` column is normative; opting a no-step in would DISABLE its scaling two passes early |
> | 🔴 **`StyleSheet.create`, `scales: true`** | **41** | plain property reads + prop at each **call site** | see below |
> | `StyleSheet.create`, `scales: false` | **10** | plain property reads | same module-scope argument |
>
> 🔴 **THE TWO STRUCTURAL FACTS "~180 txt() conversions" HIDES, both found by doing it:**
>
> 1. **51 of the 217 live inside `StyleSheet.create`, which is MODULE SCOPE.** A `txt()` call
>    there runs at **import**, before React mounts, so a bad step name throws where the root
>    `ErrorBoundary` cannot see it. They got `lineHeight`/`letterSpacing` as **plain property
>    reads** instead — a read on a bad key yields `undefined`, which RN ignores. Same values, no
>    import-time failure mode.
> 2. 🔴 **A STYLE OBJECT CANNOT CARRY THE OPT-IN AT ALL.** `allowFontScaling` and
>    `maxFontSizeMultiplier` are `<Text>` **PROPS**, not style keys. So for the 41 scaling
>    StyleSheet styles the P23 opt-in had to be placed on **every JSX element that consumes
>    them** — a different edit, in a different place, found by mapping each style key to its call
>    sites. **A style-object rewrite alone would have closed 138 of 179 and reported success.**
>
> **🔴 `FAMILY_FREEZE` — a NEW freeze, exactly mirroring `TYPE_FREEZE`, and 2b could not ship
> without it.** `txt()` returns `fontFamily` alongside the leading. The five faces do not exist in
> `assets/fonts/` until pass 4, and an unknown family makes RN fall back to the system font
> **silently**. Landing it on 179 sites here is precisely the partial-pass-4 that §1.7 bans. One
> flag in `theme.js` omits the line; **pass 4 deletes the flag atomically with the TTFs.** Grep
> `FAMILY_FREEZE`.
>
> **🟢 `txt()` is now MEMOISED and frozen, one instance per step.** C-i objected to the spread
> idiom because it invokes `txt()` twice per render; memoisation removes the objection and also
> stops the style prop's identity churning every render. `<Txt>` was **deliberately not built** —
> it is a new component (§9 is after the codemod for a reason) and `<Text>` → `<Txt>` changes the
> element, which `qa.tsx` and `cosmic-report.tsx` forbid (D8, structure-frozen).
>
> **Four sites overrode their step's `scales` flag, all by ROLE beating STEP:** `qa.tsx`'s
> composer (§3.6 names the chat composer as never-reflow), `Button` ×3 variants (§3.6 names X3),
> and `GeneratingReading` took the opposite exit — see the D3 note below.
>
> **D1 is binding: 2a and 2b never share a pass or a gate.** 2a has an automated identity gate.
> **2b has none, and must not pretend to.** It is a deliberate readability improvement, and the
> only honest verification is a human looking at screenshots.

**One config edit + two source sweeps.** The config edit is: delete `TYPE_FREEZE` so `fontSize`
derives `lineHeight`/`letterSpacing` from `theme.type` (i.e. §6.2 as authored), **and delete
`theme.lineHeight`**. That single edit produces the entire vertical change:

| change | magnitude | sites |
|---|---|---|
| 🔴 `text-sm` **gains** `lineHeight: 22` where it emits none today (RN font metrics ≈17.6 on Roboto) | **≈ +4.4px per line** | **218** in 41 files |
| 🔴 `text-xs` **gains** `lineHeight: 19` where it emits none today (≈15.2) | **≈ +3.8px per line** | **91** in 24 files |
| `text-base` 24 → 22 | −2 | 91 |
| `text-lg` 28 → 24 | **−4** | 83 |
| `text-xl` 28 → 26 | −2 | 69 |
| `text-2xl` 32 → 28 | **−4** | 53 |
| `display-lg` 36 → 34, tracking 0 → −0.6 | −2 | 25 |
| `leading-*` **stops resolving entirely** | `leading-5` 20→22 ×25 · `leading-4` 16→19 ×4 · `leading-8` 32→26 ×1 · 8 no-ops (6 × `text-base leading-6`, 2 × `text-lg leading-7`) | **45** |
| the ramp's real tracking arrives on all 12 steps | ±0.2 … ±1.3 | all `text-*` |

> ### 🔴 THE 45 `leading-*` SITES, MEASURED PER SITE BEFORE DELETION (2b pre-flight, step C)
>
> **Two findings, and neither is in the row above.**
>
> **🔴 FINDING 1 — D1 CONVERTS THE "8 NO-OPS" INTO LIVE OVERRIDES, so post-D1 ALL 45 override.**
> §6.6 E's "8 of them are no-ops" is true only *before* D1. D1 moves `text-base` 24 → 22 and
> `text-lg` 28 → 24, so the 6 × `text-base leading-6` become live **+2** and the 2 ×
> `text-lg leading-7` live **+4**. Post-D1 not one of the 45 is a no-op.
> **Its consequence for how the two commits read:** the 34 `text-sm`/`text-xs` sites that carry a
> `leading-*` (25 `leading-5` + 5 `leading-6` + 4 `leading-4`) are **the only places in the app
> where D1's vertical change does NOT land** — it arrives for them at D2. D1's headline "+4.4px on
> 218 `text-sm` sites" is +4.4px on **188** at D1, with the remaining 30 arriving one commit later
> and from a different direction. 🔴 **D1 and D2 are two commits and ONE visual change; never
> screenshot-review one without the other.**
>
> | class | ramp step | resolved lH today | ramp baked | Δ at D2 | sites |
> |---|---|---|---|---|---|
> | `leading-5` | `text-sm` | 20 | 22 | **+2** | 25 |
> | `leading-6` | `text-base` | 24 | 22 | **−2** | 6 |
> | `leading-6` | `text-sm` | 24 | 22 | **−2** | 5 |
> | 🔴 `leading-6` | ***none*** | 24 | ≈16.4 | **≈ −7.6** | **2** |
> | `leading-4` | `text-xs` | 16 | 19 | **+3** | 4 |
> | `leading-7` | `text-lg` | 28 | 24 | **−4** | 2 |
> | `leading-8` | `text-xl` | 32 | 26 | **−6** | 1 |
>
> **🔴 FINDING 2 — THE TWO "UNPAIRED" SITES ARE A REGRESSION, NOT A ROUNDING, AND WERE FIXED.**
> §6.6 E records "unpaired ×2" and stops there. Both are **body paragraphs with no size step at
> all** — `astrology/weekly.tsx`'s Premium-Feature explanation and `SunSignReveal`'s
> `lifePathMeaning`. With no `text-*` class they render at RN's default 14px, and `leading-6` was
> the *only* thing giving them leading. Deleting the scale drops them to the font-metric default:
> **24 → ≈16.4, about −7.6px per line — the largest delta in the 45-site set, on body copy, in the
> wrong direction** for a pass whose entire thesis is that reading copy gets more leading.
> **Fixed by ADDING `text-sm`** (§3.3's "default body · reading copy" step), which is what they
> should always have carried. Recorded because it is an *addition*, not a rename, and a later
> reader must not "revert the stray class".
>
> > #### 🔴 AND THE FIX MOVED `fontSize`, NOT ONLY `lineHeight` — IN A PASS SPLIT TO PREVENT EXACTLY THAT
> >
> > **OWNER RULING (2026-07-31): a fontSize movement inside 2b must be VISIBLE, never incidental.**
> > D1 is the whole reason 2a and 2b are separate passes — size is provably identical at every
> > mapped step, leading moves at all twelve, and `TYPE_FREEZE` exists so the two cannot ride
> > together. **These two sites cross that boundary**, because an element with no size class has no
> > step to attach leading to: adding `text-sm` necessarily sets a size as well.
> >
> > | site | before | after | Δ size | Δ leading |
> > |---|---|---|---|---|
> > | `astrology/weekly.tsx` — Premium-Feature explanation | **14** / 24 *(`leading-6`)* | **15** / 22 | **+1** | −2 |
> > | `SunSignReveal.tsx` — `lifePathMeaning` | **14** / 24 *(`leading-6`)* | **15** / 22 | **+1** | −2 |
> >
> > **14 is React Native's own default `Text` fontSize** — not a step, not a token, not anything the
> > ramp knows about. That is the point: these were the only two `leading-*` sites never assigned a
> > size at all, so they rendered at the platform default with a hand-set leading on top.
> >
> > **The counterfactual, and why the fix is still right.** Strip `leading-6` and add nothing, and
> > they keep fontSize 14 and fall to RN's font-metric default — `14 × ~1.17 ≈ 16.4` on Roboto,
> > i.e. **≈ −7.6px of leading per line** (the multiplier is font-dependent; at 1.2 it is −7.2, at
> > 1.24 it is −6.6 — the *class* of the number is what matters, and every value in the range is the
> > largest delta in the 45-site set). On body copy. In the **opposite direction** to the pass's
> > entire thesis. **+1px of size is the cheap half of avoiding that.**
> >
> > 🔴 **THE STANDING RULE THIS SETS:** 2b may move a `fontSize` only where a site has **no step at
> > all** and one must be assigned to attach leading. Every such move is enumerated here with its
> > before/after rendered size. **Two in this pass. If a future leading pass finds a third, it goes
> > in this table before it is written.**
>
> **The largest paired delta is `ShareableQuote`'s `text-xl leading-8` at −6**, and it is a **W1
> share surface** (X6/X7, view-shot captured). Put it at the top of the screenshot pass.

**~309 sites get taller and ~321 get tighter.** Paragraph blocks grow while headings compress —
that *is* the intended editorial rhythm, and it is **the largest vertical change in the revamp**.

**Two source sweeps must land in the same commit as the config edit:**

1. **Strip all 45 `leading-*` class tokens** from source. With the scale deleted they already do
   nothing; removing them is what lets `no-leading-utilities` reach zero. Same visual result either
   way, so there is no reason to split it.
2. **63 inline `lineHeight:` declarations** → the ramp's baked value, or delete where the step now
   supplies it. ⚠️ `numerology/index.tsx` `fontSize: 40, lineHeight: 50` is an **emoji glyph
   reservation under X17** — see §5.

**🔴 Every `minHeight` floor in the app is crossed by this pass.** §6.6.1 measured all of them as
already exceeded by their content, so they simply grow again (X13c ≈223→≈239, X14 ×7 ≈156→≈164,
X16 ≈236→≈252). Nothing overflows. **But any new fixed height a redesign introduces around body
copy must be sized against 22 / 19, never against today's font-metric default.**

#### Gate for pass 2b — scope proof + human review

```sh
cd mobile
node scripts/resolve-utilities.js --diff /tmp/p2b-before.json /tmp/p2b-after.json
#   The moved set must be EXACTLY: the 12 ramp steps (lineHeight and/or letterSpacing
#   only — never fontSize) plus the 5 leading-* rules going to "(absent)".
#   Cross-check every delta against the table above. A moved fontSize, or any moved
#   rule outside that set, is a bug.
bash scripts/token-gate.sh                      # no-leading-utilities must be 0
grep -rEn "\bleading-[a-z0-9]+" app components  # expect 0
grep -rEn "lineHeight\s*:" app components       # expect only the X17 emoji reservations
```

**Then the screenshot pass — the actual gate.** Capture the §4.4 screen list before and after on
one device at one font scale and read the pairs side by side. **Sign-off is a human saying the
denser reading copy is better, not a script returning 0.**

**Rollback:** one commit. `git revert` restores the freeze, the 45 classes and the 63 declarations
together — which is precisely why they must not be split.

---

### 1.6 PASS 3 — spacing (IDENTITY) + radius (VALUE) · two commits, two gates

D2 is explicit that the **spacing half is an identity pass and radius is not**. They are one pass
number and **two separate commits with two separate gates**. Never squash them.

#### 3a — spacing · IDENTITY

> ## 🟢 APPLIED 2026-08-01 — `build27.1-pass3-radius-spacing`. **FOUR batches. `--diff` = 0 MOVED.**
>
> | batch | what | gate result |
> |---|---|---|
> | **A** | the 4 named source fixes — the sibling-combinator utility ×2 → the flex-gap utility (D4) · the 4 dead `30`-key width/height classes DELETED | `--diff` **0 moved** · `--members` **0 unresolved** · both dead-class counters **2/4 → 0/0** |
> | **B** | the hand-rolled screen gutter → the two named tokens, **6 + 2 sites** | per-pattern counts **6→6, 2→2**, remaining 18→**12** · `--diff` **0** |
> | **C** | 🔴 **S3a — `spacing` `extend` → top-level REPLACE** | `--diff` **0 moved of 202** · `--members` **0 unresolved of 4,205 class tokens** |
> | **D** | the five §4.3 outliers — **enumerated, delta-reported, MARKED IN-FILE, not migrated** (`O-39`) | 0 pixels moved |
>
> 🟢 **PER-UTILITY IDENTITY, reported per utility and not in aggregate as the gate requires: 98 of 98
> live spacing utilities IDENTICAL, 0 MOVED, across 1,277 usages.** The remaining 2 of 100 census rows
> are a summary line and a `w-3/4` regex fragment, both non-utilities.
>
> 🔴 **AND THE PASS TURNED OUT TO BE *MORE* OF AN IDENTITY PASS THAN PLANNED — twice:**
> - **`O-39`: the "five outliers" are all `w-`/`h-` DIMENSIONS, not spacing.** The authoring
>   vocabulary tops out at 48dp against 56 / 128 / 192 / 256, so three of the four keys have **no
>   candidate target at all**. Marked, not migrated. See `O-39`.
> - **D4's `gap` conversion is rendered-identical, and that was measured rather than assumed.** Both
>   parents hold exactly **two MUTUALLY-EXCLUSIVE platform-gated children** (`Platform.OS === 'ios'`
>   / `=== 'android'`), so at most one ever renders and a gap between siblings can never apply. §1.6
>   calls D4 *"a behavioural fix, not a token migration"* — true of the mechanism, **not** of the
>   rendered result at these two sites.
>
> 🔴 **`--diff` CAUGHT THE COMMENT-HARVESTING HAZARD **TWICE** IN THIS PASS, ON NEW COMMENTS WRITTEN
> BY THE SESSION THAT WAS DOCUMENTING THE HAZARD.** Two ordinary English words in explanatory
> comments — one meaning "change the size of", one meaning "reduce" — are **bare Tailwind utility
> names**, so the content scanner emitted two live rules with **zero call sites**, moving the count
> 202 → 203 both times. `tsc` clean, every grep clean, the app renders identically. **This is the
> SIXTH and SEVENTH instance of `CLAUDE.md`'s "A COMMENT IS SOURCE", and the first two that were not
> class-like or literal-like at all** — they are ordinary prose. ⚠️ **The test widens again: not
> *"would a named rule match this line?"* but *"is any WORD in this sentence also a bare utility
> name?"* — `resize`, `truncate`, `italic`, `underline`, `uppercase`, `hidden`, `visible`, `static`,
> `fixed`, `absolute`, `relative`, `sticky`, `isolate`, `container`, `border`, `rounded`, `shadow`,
> `blur`, `filter`, `transform`, `transition`, `grayscale`, `invert`, `ordinal`, `overline` … Also
> measured: naming a LIVE class in prose (the flex-gap utility, ×4) inflated its census **9 → 13**
> without emitting anything, so `--diff` cannot see that half — only a census can.
>
> **This pass owes a replay for batch A only** (script-shaped, mechanical). B is 8 per-site role
> judgements, C is one config edit, D is comments — §3.2's test (*"could it have been a script whose
> output nobody needed to read?"*) says no for those three, and their gate is layer 3.

**1,276 className usages across 102 utilities, 1,246 of them at literally zero delta.** This is the
return on the `inlineRem: 16` flip: before it, all 1,246 carried +14.29%.

Most of 3a is **not an edit at all** — `p-6`, `mb-4`, `gap-3`, `w-12`, `h-px` are the same strings
before and after, and `extend.spacing` (S0) already made them resolve identically. The edits are:

| item | sites | note |
|---|---|---|
| `spacing` `extend` → **replace** | config | Safe once the two dead classes below are gone. Removes only unused default keys. `w-full`/`h-full`/`w-3/4`/`w-5/6` survive — they come from `theme.width`/`theme.height`, which merge spacing *plus* their own percentage and keyword keys (design V3). |
| 🔴 **`space-y-3` ×2 → `gap-3` on the parent** (D4) | **2** — `login.tsx` ≈`:186`, `signup.tsx` ≈`:277` | **A behavioural fix, not a token migration.** Tailwind emits `.space-y-3 > :not([hidden]) ~ :not([hidden])` and `react-native-css-interop` **cannot express a sibling combinator**, so the rule is **absent from the runtime rule set at both `inlineRem` baselines** — confirmed directly this session (`space-y-3` resolves to `null`). `space-y-*` can never work under NativeWind 4. **No §7.2 rule catches this** — it needs the explicit line item, or an eighth grep. |
| 🔴 **delete `w-30 h-30` ×4** | `profile.tsx` ≈`:186`, `≈:190` | Tailwind 3 has no `30` key, so these have **never resolved** — confirmed (`w-30` → `null`). Both are saved by an adjacent `style={{width:120,height:120}}`. **Delete the dead classes; do not adopt `30` into the scale.** `theme.js` excludes it deliberately. |
| the hand-rolled `24`/`32` screen padding → `px-screen-x` / `py-screen-y` | `ScreenContainer` + wherever it recurs | The two named tokens exist precisely so the next screen does not re-type `24`. |
| ⚠️ `max-w-sm` / `max-w-md` | **2** | 🔴 `theme.maxWidth` is **not** replaced by §6.2, so these stay `rem`-valued **permanently** (336→384, 392→448 at the flip) and remain `inlineRem`-dependent after the codemod. "The config is explicit px so `inlineRem` goes inert" is true of spacing/radius/fontSize; **not** of `maxWidth`. Leave them; register the caveat. |

```sh
# GATE 3a
node scripts/resolve-utilities.js --diff /tmp/p3a-before.json /tmp/p3a-after.json
#   MUST be 0 moved rules across every p-/m-/gap-/w-/h-/inset-/top-/right-/bottom-/left-
#   utility. Any nonzero delta here is a bug, full stop — this is the pass whose whole
#   claim is that the flip already made it free.
grep -rEn "\bspace-[xy]-" app components    # expect 0
grep -rEn "\b[wh]-30\b" app components      # expect 0
```

#### 3b — radius · VALUE (D2). Do NOT retune `radius.md`.

> **D2 is binding.** The design collapses 21 radius values to 5, which **cannot** be
> value-preserving. `rounded-2xl → rounded-md` being free was a coincidence of `inlineRem: 14` and
> the flip removed it. **Do not retune `radius.md` to 16 to buy back those 73 sites** — that
> corrupts the 8/14/20/28 scale for a gate that never applied to this half.

Measured this session, matching §6.6 C exactly:

| class | renders today | → token | new px | usages / files | Δ |
|---|---|---|---|---|---|
| `rounded-full` | 9999 | `rounded-pill` | 9999 | **82** / 28 | **0** ✅ |
| **`rounded-2xl`** | **16** | `rounded-md` | 14 | **73** / 28 | **−2px** |
| `rounded-xl` | 12 | `rounded-md` | 14 | **48** / 18 | **+2px** |
| bare `rounded` | 4 | `rounded-sm` | 8 | 4 / 2 | **+4px** |
| `rounded-3xl` | 24 | `rounded-lg` | 20 | 4 / 4 | **−4px** |
| `rounded-lg` | 8 | `rounded-sm` | 8 | 1 / 1 | **0** ✅ |

**82 of 211 className usages are identical; 125 carry a 2–4px delta.** Plus **162 inline
`borderRadius:` declarations across 21 distinct values** (including the one-offs `9, 11, 18, 25, 55`
and *both* `99` and `999` as pill spellings) → the 5-step scale.

🔴 **The 49 sites no grep can find, and why they must be hand-written.** `rounded-xl` (48) and
`rounded-lg` (1) are **legal names in both scales with different values** — 12px→28px and 8px→20px.
Nothing distinguishes an unmigrated `rounded-xl` at 12px from an intentional new one at 28px.
`no-legacy-radii` deliberately does not grep them (grepping would fail on correct code). **All 49
call sites are rewritten explicitly and the diff is read by a human.** There is no automated
substitute; that is C-k's whole point.

**Land `borderRadius` as a `replace` in the same commit as all 373 rewrites.** A bridge would
require a disjoint namespace (`rounded-r-md` → later renamed), i.e. writing every site twice, and
D2 already licenses the value change — so atomic-plus-diff-review is correct.

**Treat the 73 `rounded-2xl` sites as ONE reviewable visual decision, not 73.** 2px on a 16px
corner is at the edge of perceptible; the question "is 14 right for small cards?" is asked once.

```sh
# GATE 3b
bash scripts/token-gate.sh    # no-legacy-radii = 0 (rounded-3xl|2xl|full|bare|99|999|100)
node scripts/resolve-utilities.js --map /tmp/radius-map.json \
     --before /tmp/p3b-before.json --after /tmp/p3b-after.json
#   This one is EXPECTED to report failures — it is used as a DELTA LEDGER, not a pass/fail.
#   The reported non-preserving set must equal the table above EXACTLY: 73 at -2, 48 at +2,
#   4 at +4, 4 at -4, and rounded-full/rounded-lg preserving. Any OTHER non-preserving
#   mapping is an unplanned delta and is a bug.
grep -rEn "borderRadius\s*:\s*[0-9]" app components   # expect 0 outside theme.js
```

**Rollback:** 3a and 3b revert independently. 3b's revert also restores the old `borderRadius`
config, so the 49 hand-written sites go back atomically.

---

### 1.7 PASS 4 — weight → family · **ATOMIC WITH THE FONT INSTALL**

> ## 🟢 APPLIED 2026-07-31 — `build27.1-pass4-fonts`. **NINE batches.** Every number below is MEASURED.
>
> | batch | what | gate result |
> |---|---|---|
> | **E0** | widen `no-fontweight` to the JSX-prop form · **new `no-synthetic-italic`** · **new `text-defaults-installed`**. 🔴 **Instrument only, no product code** | all three re-validated in BOTH directions against the pre-migration tree |
> | **E1** | 5 static TTFs (**455 KB**) + both OFL licences + `useFonts` **behind** the splash hold | `--diff` **0 moved** · tsc ×2 clean |
> | **E2** | delete **`FAMILY_FREEZE`** · `fontFamily` `extend` → **replace** | `--diff` **0 moved of 202** — and provably, not luckily (below) |
> | **E3** | the **className** half — 328 sites, 3 operations | `no-fontweight/className` **328 → 0** · `--diff` **exactly 5** rules |
> | **E4** | the **inline** half — **171** sites (not 173) | `no-fontweight/inline` **171 → 0** |
> | **E4b** | the **italic** half — 20 sites → the one italic face | `no-synthetic-italic` **20 → 0** · `--diff` **exactly 2** rules |
> | **E6a** | 🔴 **the global default FAMILY** — `lib/textDefaults.ts` | `text-defaults-installed` **ABSENT → OK** |
> | **E6b** | the scaling freeze — one constant in the same module | `p23-optin-completeness` **MISSING 0** confirmed BEFORE it landed |
> | 🆕 **E7** | 🔴 **`family-arrival-check.js` — the 17th named rule and the first ARRIVAL gate.** 🔴 **Instrument only, no product code** (2b/D0's convention) | **0 of 117 pairs**, re-validated in both directions |
>
> 🔴 **THE 9 SITES THE GATE CAUGHT ARE CORRECTED INSIDE E4, NOT IN E7, AND THAT IS A RULING RATHER THAN
> A CONVENIENCE.** The alternative was to commit E4 with the defect and fix it in E7, giving a
> bisectable record of the mistake. Rejected on 2b's own grounds: **the broken intermediate no longer
> exists in the tree, so committing it would mean reconstructing it by INVERTING the fix — which is
> exactly the "fabricated history" 2b refused when it declined to split D3/D4/D5.** A commit nobody
> would ever want to bisect *to* is not worth manufacturing. So E4 carries the corrected output, E7
> carries the gate that proves it, and both commit bodies say so. It also keeps E7 green on landing.
>
> 🔴 **AND E7 IS THE ONE THAT MATTERS MOST, because it caught a defect the other eight had already
> declared clean.** The E4 rewriter inferred each site's family from the ramp step on the **same line**;
> nine style objects put the step spread on one line and the weight on the next, so those fell through
> to the weight-derived family and **wrote a Figtree face onto a Literata display step.**
> `no-fontweight` was 0, `--diff` clean, `--members` clean, `tsc` clean. See §3.0.2.0.1.
>
> **Prompt-letter mapping, so nothing reads as a renamed batch:** the brief's **E5** is not a batch —
> it is the P-2 most-specific-first ordering invariant, and it was exercised in **E0** (three
> alternation-ordered rules), **E3** (proved immaterial by running both orders and diffing) and
> **E4b** (where it was **violated and caught** — see below). **E0**, **E4b** and the **E6a/E6b**
> split are new, each forced by a pre-flight finding.
>
> ### 🔴 THE FIVE THINGS THIS PASS FOUND THAT NO DOCUMENT SAID
>
> 1. 🔴 **`Text.defaultProps` IS A SILENT NO-OP ON THIS STACK, so §3.6's and §1.7's own mechanism
>    does not work.** React 19.0.0 resolves `defaultProps` for **class components only**;
>    `resolveClassComponentProps()` in the installed renderer is reached solely through
>    `shouldConstruct()`, and `updateForwardRef()` merges nothing. RN 0.79.6's `Text` is a
>    `forwardRef`. **`O-30`.** Resolved by wrapping the forwardRef's `render` in
>    `lib/textDefaults.ts` — the one writable seam, and RN proves it is writable by assigning
>    `Text.displayName` itself.
> 2. 🔴 **A GLOBAL DEFAULT FAMILY IS MANDATORY, NOT CONVENIENT — AND NOTHING IN THE PLAN SAID SO.**
>    Census of `<Text>` opening tags in `app`+`components`: **1,118** total, of which **328** get a
>    face from E3 and **198** from E2 — leaving **592 (53%) WITH NO FAMILY AT ALL** (410 className
>    with a size but no family utility · 99 style-object only · 83 with no styling attribute). A
>    Tailwind size utility **cannot** carry a family, so the config can never reach them. Without
>    E6a, pass 4 ships an app that is **half Figtree, half Roboto**, and `no-fontweight` = 0,
>    `--diff`, `--members` and `tsc` are **all green**. **`O-31`.**
> 3. 🔴 **A SIXTH INSTANCE OF O-29's CLASS: `fontWeight=` AS A JSX PROP.** The rule anchored on the
>    property plus a **colon**, so the react-native-svg `<Text>` in the birth-chart wheel was
>    counted by nothing — not §0.2's 173, not §7.2's baseline, not any figure here. **170 colon +
>    1 prop = 171. `O-32`.**
> 4. 🔴 **`fontStyle: 'italic'` IS `fontWeight`'s TWIN AND THE PLAN NEVER MENTIONED IT.** 20 sites.
>    The design ships **exactly one italic face**, so an italic asked for by *style* is a synthetic
>    oblique — Android has only a NORMAL-style typeface registered
>    (`ReactFontManager.setTypeface(key, Typeface.NORMAL, tf)`), iOS adds a CoreText trait: two
>    platforms, two different fakes, no signal on either. **`O-33`.**
> 5. 🔴 **LITERATA'S NATURAL LINE BOX IS 26.7% TALLER THAN ROBOTO'S, AND THE DISPLAY STEPS' BAKED
>    lineHeight IS SMALLER THAN THE FACE WANTS** — negative leading of **−10.6 / −6.6 / −4.7px** at
>    `display-lg`/`md`/`sm`. RN draws the overflow rather than clipping it, so layout is unaffected,
>    but ink can extend past the line box. **`O-34`.**
>
> ### 🟢 AND THE ONE THAT MADE THE FIXED-HEIGHT RE-MEASURE A NON-EVENT — STRUCTURALLY, NOT LUCKILY
>
> **A face change can move rendered text height ONLY where `lineHeight` is unset.** Both platforms
> force the line box to an explicit `lineHeight` (Android `CustomLineHeightSpan` computes
> `leading = lineHeight − (A + D)` and splits it, *including when it is negative*; iOS sets
> `min/maximumLineHeight`). **Pass 2b baked a lineHeight into all twelve ramp steps** — so every
> ramp-stepped Text in the app is now **face-independent by construction.**
>
> Measured metrics: **Roboto 1.1719 em · Figtree 1.2000 · Literata 1.4850** (cap 0.711 / 0.700 /
> 0.700). Re-measured every fixed-height container: **0 OVERFLOW, 0 TIGHT, all SAFE.**
>
> | container | content | headroom | Δ from the face change |
> |---|---|---|---|
> | **X3** Button 48 / 56 / 64 | lineHeight 22 / 22 / 24 | **26 / 34 / 40** | **0** — explicit lineHeight |
> | **X11** StreakBadge 28 / 36 / 48 | the 🔥 emoji dominates at every size | ≈11.6 / 14.9 / 22.2 | **0** — emoji metrics come from the emoji font, before and after. Worst case anywhere in the badge is **+0.4px** on the numeral |
> | **X12** AstroNumeroBadge 44 / 56 / 88 | the circle **View** dominates (32/40/56) | 12 / 16 / 32 | **0** — a dimension, not a type |
> | **X17** GeneratingReading `minHeight: 58` | `text-base` 22 → 28.6 at the 1.3 cap, ×2 lines = 57.2 | **0.8** | **0** — 🔴 **it CANNOT flip**, and that is the point: the reservation is derived from an explicit lineHeight, which is the one thing a face change cannot move |
> | **X18** tab bar 85 (band 53) | icon 24 + marginTop 2 + lineHeight 16 = 42 | 11 | **0** |
> | **X20** DeleteAccountModal 56 ×2 | `text-base` lineHeight 22 | 34 | **0** |
> | X13a/b home tiles 140 | emoji 40 + 8 + lineHeight 22 + padding 32 | ≈31 | **0** |
>
> 🔴 **AND A PROOF RATHER THAN AN ASSURANCE: extracting every numeric `height/minHeight/width/
> padding/margin/borderRadius/fontSize/lineHeight/letterSpacing` declaration from both sides of the
> whole-pass diff and differencing the multisets returns 0 removed and 0 added.** X1–X20's explicit
> dimensions are provably untouched, and the pass moved no size or leading either.
>
> ### ⚠️ THREE THINGS TO KNOW BEFORE READING THE DIFF
>
> - 🔴 **E2's "0 rules moved" is provable, not lucky, and `--diff` is BLIND to E2's real payload.**
>   The only key the replace deletes is `sans`, whose utility has **0 usages**, so Tailwind never
>   emitted it; the five family keys had no call sites yet, so they were not emitted either.
>   Meanwhile E2's actual effect — `txt()` now returning `fontFamily` on **198 inline sites** — is an
>   *inline style*, which layer 3 cannot see at all. **The moved-rule enumeration belongs to E3
>   (5 rules) and E4b (2 rules), not to the config commit.**
> - 🔴 **P-2 WAS VIOLATED INSIDE E4b, AND THE VIOLATION IS THE BEST EVIDENCE FOR THE RULE.** The
>   *delete* rewrite (broad: any `fontStyle` italic surrounded by commas) was run **before** the
>   *replace* rewrite, so it consumed `combined.tsx`'s Personal Affirmation — a site that needed the
>   quote family, left with no italic and no family. Caught by the adoption count (14, expected 15),
>   fixed by hand. **The ordering invariant is not only about regex alternation; it governs the
>   order two whole rewrites run in.**
> - ⚠️ **A COMMENT IS SOURCE — it bit again, immediately.** E1's own explanatory comment quoted the
>   brand hex twice and took `no-raw-hex` from 15 to **17**. Reworded to name the constant instead.
>
> **Superseded below:** *"173 inline sites"* → **171**. *"~501 total"* → **499 weight sites + 20
> italic = 519**. *"one commit"* → eight, in the safe direction (fonts first); see §3.2's batch rule.

> 🔴 **This pass and the font registration are one commit. Never split them, and never run the
> weight half first.** Until the TTFs load, `font-body-semi` resolves to a family name no platform
> knows and RN silently falls back to the system font — so a className-only pass leaves **173
> inline sites rendering Regular** with no error, no warning and no build signal.
>
> ⚠️ **AS EXECUTED: eight commits, and the ban was honoured in the direction that matters.** §3.2's
> "one gated commit each, committed before the next starts" and this box's "one commit" are in
> tension; the resolution is that **the FONTS LAND FIRST (E1) and every later batch strictly
> increases family coverage.** The banned ordering is the *reverse* — weights before fonts — and no
> batch here does that. The five TTFs are their own commit, which also satisfies this section's own
> "keep the 5 TTFs in a separate `git add` hunk".

| half | sites | detail |
|---|---|---|
| className | **328** | `font-semibold` ×172 → `font-body-semi` · `font-bold` ×148 → `font-body-bold` · `font-medium` ×8 → `font-body-semi`. Design V5 confirms the ban regex cannot false-positive on the five new family names. |
| inline | **173** | `fontWeight:` is a **banned property** (B1): on a static face it is either a no-op or a platform fake-bold, differently on each platform. Each site becomes a `fontFamily` (via `txt(step).style` or `theme.family`). **The `fontWeight\s*:` grep is the only thing covering this half — the className regex does not match it**, which is why §7.2 carries both. |
| **total** | **~501** | not 328 |

**The five faces** (all SIL OFL 1.1, ~420 KB subset to Latin + Latin-Ext, which clears audit §7.4's
redistribution constraint that blocked Georgia server-side):
`Literata-Bold` · `Literata-Italic` · `Figtree-Regular` · `Figtree-SemiBold` · `Figtree-Bold`.
**Literata 600 is not shipped** — the ramp never asks for it.

**Registration: runtime `useFonts`, keyed exactly as `theme.family` names them.** Owner decision,
and `preflight-findings.md` §E2 is the reason: on the runtime path the JS key **is** the
`fontFamily` contract on both platforms by construction (iOS registers an alias and swizzles
`UIFont.fontNames(forFamilyName:)`; Android calls `ReactFontManager.setTypeface` with the same key),
so a mismatch is impossible. The **config-plugin path is platform-asymmetric** — iOS resolves the
font's internal PostScript name, Android the filename base — and when they differ **neither platform
throws, warns or logs**; one silently renders SF Pro and the other silently renders Roboto. Do not
mix the two paths.

```tsx
// app/_layout.tsx
const [fontsLoaded, fontError] = useFonts({
  'Literata-Bold':    require('../assets/fonts/Literata-Bold.ttf'),
  'Literata-Italic':  require('../assets/fonts/Literata-Italic.ttf'),
  'Figtree-Regular':  require('../assets/fonts/Figtree-Regular.ttf'),
  'Figtree-SemiBold': require('../assets/fonts/Figtree-SemiBold.ttf'),
  'Figtree-Bold':     require('../assets/fonts/Figtree-Bold.ttf'),
});
```

🔴 **Gate on `fontsLoaded || fontError`, never on `fontsLoaded` alone.** The root layout already
holds the splash behind three nested `BRAND_BG` layers as belt-and-braces against a white flash on
cold start; a `useFonts` gate adds a **second async condition** to that sequence, and a font that
fails to decode must not leave the app permanently on the splash. Follow the existing `stalled`
timeout precedent at `app/index.tsx` ≈`:40`.

#### 🔴 An accessibility regression this pass opens, and it needs an owner decision

§3.6 sets ~~`Text.defaultProps.allowFontScaling = false`~~ **once at app root** — 🔴 **that literal
mechanism is a NO-OP on React 19 and the working one is `lib/textDefaults.ts`; see `O-30`** — making
scaling opt-in
through `txt()`/`<Txt>` — and §8 puts the **~180 `txt()` conversions "additive AFTER pass 4."**

**Today every `<Text>` in the app scales with the OS font-size setting.** The moment the global
freeze lands, **nothing scales** — and if the ~180 conversions slip past 2.1.0, the release ships
with font scaling disabled app-wide. That is worse than today for low-vision users and is a real
Play Store accessibility exposure, not a cosmetic gap.

Two ways out; **recommendation (a)**:

- **(a) Pull the ~180 conversions into 2.1.0 scope**, at least for the five `scales: true` steps on
  reading-copy surfaces (`quote`, `text-lg`, `text-base`, `text-sm`, `text-xs`). Sizeable, but it is
  the only version that does not regress.
- **(b) Hold the global freeze** until the conversions land — accepting that until then `qa.tsx`'s
  composer and X3's fixed 48/56/64 button heights can reflow at large font scales, which is exactly
  what the freeze exists to prevent.

#### ✅ DECIDED — **P23 / O-13 ANSWERED (owner, 2026-07-30): option (a).**

> 🔴 **THE GLOBAL `allowFontScaling = false` DOES NOT LAND WITHOUT ITS OPT-INS.** The **five
> `scales: true` conversions** — `quote`, `text-lg`, `text-base`, `text-sm`, `text-xs` — **move
> INTO pass 4. Same files, same commit, same revert.** They are no longer "additive AFTER pass 4."

**The rationale, recorded because it inverts the intuition** that a freeze is the cautious choice:

- **`allowFontScaling` defaults to TRUE today.** So every inline-sized `<Text>` in the app already
  scales **UNBOUNDED** inside fixed heights — there is no cap at all right now.
- 🔴 **The §6.6.1 collision survey measured 1.0× ONLY.** Its *"0 TIGHT, 0 OVERFLOW"* verdict says
  nothing about 1.3×, and nothing whatsoever about the unbounded scaling that ships today.
- Therefore **the freeze plus a 1.3 cap is a NET IMPROVEMENT for chrome** — badges, tab labels,
  fixed-height buttons, the X11–X19 containers — because it replaces "unbounded" with "≤1.3×".
- **The only regression is body copy**, and body copy is **exactly what the five conversions opt
  back in.** Freeze the chrome, keep the reading surfaces scaling, cap them at 1.3.

**🔴 THE FALLBACK, IF PASS 4 PROVES TOO LARGE — and it is not "ship the freeze anyway":**

> **Do NOT set the global default in 2.1.0 at all.** Keep today's behaviour, **raise the per-site
> floors** instead (D3's `GeneratingReading` `minHeight` 44 → 58 is the template), and ship the
> freeze in **2.1.1** together with the conversions.
>
> 🔴 **NEVER SHIP THE FREEZE HALF.** A release carrying
> the global freeze (🔴 **not** via `Text.defaultProps`, which does nothing here — `O-30`) **without**
> the `txt()` opt-ins disables font
> scaling app-wide — worse than today for low-vision users, and a real Play Store accessibility
> exposure rather than a cosmetic gap. The two halves are one unit in either release.

Both halves are recorded in `mobile/theme.js`'s `txt()` comment, which is where an implementer will
actually be standing when it matters.

#### One more pass-4 interaction

`GeneratingReading`'s rotating message maps byte-perfectly (`fontSize:16, lineHeight:22` →
`text-base` 16/22, and 44px is exactly two lines) — **but `text-base` is a `scales: true` step**, so
at the 1.3 cap two lines = 57.2px against a 44px reservation and the one-vs-two-line jump the
reservation exists to prevent comes back. **D3: raise `minHeight` 44 → 58.** Do **not** exempt the
step from scaling — the rotating message is the entire activity on a 60-second wait screen.

```sh
# GATE 4
bash scripts/token-gate.sh          # no-fontweight = 0, BOTH halves
grep -rEn "font-(thin|light|normal|medium|semibold|bold|extrabold|black)" app components  # 0
grep -rEn "fontWeight\s*:" app components                                                  # 0
grep -rEn "\ballowFontScaling\b" app/_layout.tsx    # the global freeze, set once
ls -la assets/fonts/                # 5 files, ~420 KB total
npx tsc --noEmit && (cd ../server && npx tsc --noEmit)
```

**Then a device check — mandatory, not optional.** Screenshot one screen carrying all five faces and
confirm they render **distinctly**. A silent fallback to Roboto/SF is the documented failure mode of
this exact change and it is easy to miss in a dark-themed screenshot review. Also confirm the app
does **not** hang on the splash when a font is deliberately corrupted.

**Rollback:** one commit, but a large one. Reverting restores the system font and all 501 weight
sites together. Keep the 5 TTFs in a separate `git add` hunk so a revert of the code does not orphan
the assets.

---

### 1.8 PASS 5 — the Vellum colour flip · VALUE, reversible

> ## 🟢 DONE 2026-07-31 — `build27.1-pass5-vellum`. FOUR commits, and only ONE of them is the flip.
>
> | # | commit | scope | why it is separate |
> |---|---|---|---|
> | **A** | `O-35` — the display-step family arrival correction | 23 className sites + `family-arrival-check.js`'s new className half | 🔴 **A SCOPE ADDITION, found by pass 5's own arrival verification and landed FIRST on purpose.** It is a FAMILY change, not a colour change, so it must be revertable without touching the flip — and it had to precede commit C, because commit C's justification is Literata's ink extents and 23 of the 35 display sites were not rendering Literata |
> | **B** | 🔴 **THE FLIP** | **`mobile/theme.js` ONLY** — `git diff --name-only` returns exactly one path | §1.8's own rule, kept true: nothing else in this commit, so `git revert` restores the held palette exactly |
> | **C** | display leading 38 / 31 / 26 | `theme.js` `type` | closes `O-34`. A **design-doc revision** (§3.3), separately revertable from the colour |
> | **D** | `GATE_STRICT` default-on | `token-gate.sh`, `.githooks/pre-push`, + the 7 ABOVE-CEILING markers and one A5 ledger-drift fix | tooling, not appearance |
>
> **Measured:** `--diff` **37 rules moved** over the whole pass — **35 colour** (every one enumerated
> against §2 below), **`font-display` absent → `Literata-Bold`** (commit A's addition), and
> **`text-display-lg` lineHeight 34 → 38** (commit C). Not one fontSize, spacing, radius or
> letterSpacing moved. `tsc` **0/0**. `npm run gate` **exit 0 — the first clean run since pass 0**.
>
> ⚠️ **AND THE STANDING LIMIT, RESTATED BECAUSE IT IS AT ITS WORST HERE: `--diff` CANNOT SEE AN INLINE
> STYLE.** Six tokens have **zero className call sites** — `success`, `warning`, `locked`,
> `surface-overlay`, `accent-muted`, `accent-2-muted` — so Tailwind never emits their utilities and
> **not one of them appears in the 35.** Three of them genuinely move (26 inline `success` reads, 6
> `accent-muted`, 1 `surface-overlay`) and layer 3 is structurally blind to all of it. Likewise
> `display-md` and `display-sm` are inline-only, so commit C shows **1 moved rule for a 3-value
> change**. 🔴 **The 35 are the className ledger's complete enumeration and the inline ledger's
> nothing.** The inline half is carried by `alpha-callsite-check.js`, `tsc`, and cut 2.

**One file. One object. Roughly 22 values.** `mobile/theme.js`'s `color` (and `chart`) objects flip
from the HELD column of §1.6a to the Vellum column. **Nothing else changes** — no source file, no
class name, no other config key.

Everything downstream already consumes those literals through exactly three idioms that all read the
same object, which is the entire point of the token unification:
`className="text-fg-secondary"` · `<Txt color="fg-secondary">` ·
`StyleSheet.create({ x: { color: t.color['fg-secondary'] } })`.

```sh
# GATE 5
git diff --stat HEAD~1          # MUST be: 1 file changed (mobile/theme.js)
node scripts/resolve-utilities.js --diff /tmp/p5-before.json /tmp/p5-after.json
#   Every moved rule must be a COLOUR rule. A moved fontSize, spacing, radius or
#   lineHeight means the flip touched something it should not have.
bash scripts/token-gate.sh && npx tsc --noEmit && (cd ../server && npx tsc --noEmit)
```

**Then the full screenshot pass (§4.4), and the contrast spot-check** on the five A5 pairings:
`accent`/`on-accent` 6.86 · `accent-2` 8.08 · `warning` 8.20 · `success` 6.90 · `danger` 5.60. And
🔴 **the one unconditional prohibition: `danger` as text on `surface-overlay` is 4.28:1 and is
banned at any size and any weight.** It is the only surface-role prohibition in the system; the
destructive `Sheet` uses a `danger`-filled Button with an `on-accent` label instead.

**Rollback:** `git revert <sha>`. One file, one object, and the app returns to the held palette
exactly. **This is the single most valuable property in the whole plan** — keep it true by never
letting anything else into this commit.

---

## 2. ORDERING RATIONALE — why this order, and what breaks under any other

> ## 🔴 THE ORDER CHANGED. OWNER DECISION, 2026-07-31: **2a → 2b → 4 → 5 → 3a → 3b.**
>
> The table below is still correct about **what constrains what**; it is no longer the running
> order. Read it as the constraint set, and this box as the schedule.
>
> **The reasoning, which is about what each pass DEPENDS ON rather than what it changes.** Two
> passes need the *held* baseline to still be in place: 2a (an identity pass — its whole claim is
> measured against pre-flip values) and pass 4's className half (it rewrites weights against the
> current text). Pass 3 needs neither:
>
> - **3a is provably ZERO-DELTA.** §6.6 B measured 91 of 102 spacing utilities pixel-identical
>   post-`inlineRem` and **0 carrying any delta**. A pass that changes nothing cannot be disturbed
>   by running after the colour flip, and cannot disturb it.
> - **3b is a VALUE pass carrying 2–4px on 125 usages** (§6.6 C). It was never protected by the
>   hold either — radius cannot bridge (D2), so its deltas are read by a human whenever it runs.
>
> So moving both after pass 5 **costs nothing that the constraint table protects**, and buys the
> two things the owner is actually optimising for: **fonts and colour land two sessions sooner**,
> which is what a reviewer can see and judge. 🔴 **The strict orderings below still bind: 2a before
> 2b, 3a before 3b, 4 atomic, 5 alone.** Only the position of the 3-block moved.
>
> ### 🔴 THE CONSEQUENCE, AND IT IS NOT COSMETIC: **3b BECOMES A 2.1.0 RELEASE BLOCKER.**
>
> Under the old order, 3b landed mid-revamp and anything unfinished after it was obviously
> unfinished. Under the new order, **pass 5 makes the app LOOK done while 373 radius sites are
> still on the legacy scale.** That is the worst possible state to ship from, because the signal
> that work remains — the app looking half-migrated — is gone. A reviewer, a screenshot pass, and
> the owner will all read post-5 as "finished".
>
> **So 3b is registered in `owner-actions.md` as a RELEASE BLOCKER for 2.1.0, not as polish and
> not only as an `O-` item.** The `O-` registrar tracks open questions; a blocker has to sit where
> the pre-ship walk will hit it, and `owner-actions.md` is the file §CLAUDE.md says to walk before
> every deploy, cut, ship and promote.

**The governing shape:** passes 1–4 move ~4,200 sites onto semantic names while the *rendered
result* stays as close to today as each family allows. Pass 5 changes the palette. Colour is the
only family where "hold the old value" is both possible and useful, which is why it is the only one
deferred to 5 (§0.3).

| constraint | why | what breaks if violated |
|---|---|---|
| **`inlineRem: 16` (pass 0, already done) before 2a and 3a** | It is what makes "pixel-identical" true at all. Before the flip, spacing carried +14.29% on 1,246 usages and 4 of the 7 ramp steps were wrong — `text-sm` (15) rendered **larger** than `text-base` (14) | The codemod ships a uniform +14.29% rescale inside a diff described as mechanical, and both gates become false statements |
| **1 (colour) before 3 (radius/spacing)** | Audit §2.6: restyling `Card`/`Button`/`ScreenContainer` before the 401 hex literals move produces new containers full of old hardcoded colour — *"a worse outcome than not restyling at all"* | `astrology/index.tsx`, `face.tsx`, `palm.tsx`, `combined.tsx`, `cosmic-report.tsx` keep rendering the old palette inside new geometry, and every review says "it looks broken" without saying why |
| **1a before 1b** | 1a is provably value-preserving and needs no review; 1b needs a decision table and a screenshot pass | Squashed, the ~1,110 free renames hide the ~445 that a human must look at, and the identity gate cannot pass |
| 🔴 **2a strictly before 2b (D1)** | Size is provably identical at all seven mapped steps; lineHeight moves at all twelve. They live in **one** Tailwind `fontSize` object, so only the `TYPE_FREEZE` staging separates them | Squashed, the +4.4px/218-site leading change rides inside a pass advertised as pixel-identical, and there is no commit to revert if the denser copy is rejected |
| **2b before 3a?** No — either order works | 2b changes vertical rhythm, 3a changes nothing | — |
| 🔴 **3a strictly before 3b** | 3a is the pass whose entire claim is *zero delta*. 3b carries 2–4px on 125 usages by design | Squashed, 3b's expected deltas mask a genuine spacing regression, and `--diff` can no longer be asserted to 0 anywhere |
| 🔴 **4 = weight AND font, one commit** | Both directions are no-ops until the TTFs load | The className half looks fine on a smoke test while **173 inline sites render Regular**, silently, and nobody notices until a designer compares a heading to a comp |
| **5 last, alone** | It is the only commit that must stay independently revertible under a staged rollout | Fold anything else in and the rollback lever for the visual identity is gone — and `expo-updates` is `ON_ERROR_RECOVERY` only, so a percentage rollout is the *only* other lever (§10) |
| **Config staged, not big-bang (§1.1)** | §6.2 *replaces* four theme keys. Landing it in pass 0 kills 565 + 339 + ~160 + 55 + 45 utilities at once, silently | The app is visibly broken from pass 0 to pass 4 and no gate can tell you which pass did it |
| **Primitives AFTER the codemod (§9)** | Same argument as row 2, one level up | `ScreenContainer` (25/32 screens) gets restyled twice — once against old tokens, once against new |

**The one thing this order deliberately does not optimise:** it is slower than a big-bang. That is
the trade being made — nine reviewable commits, each with a stated gate and an independent
`git revert`, on a repo with **no staging, no CI and no pre-release device-test path** (§4.1).

---

## 3. PER-PASS PROCEDURE

### 3.0 Shared machinery

#### 3.0.1 Snapshot ritual — run at the start and end of every pass

```sh
cd mobile
node scripts/resolve-utilities.js > /tmp/p<N>-before.json   # BEFORE any edit in the pass
# ... do the pass ...
node scripts/resolve-utilities.js > /tmp/p<N>-after.json
node scripts/resolve-utilities.js --diff /tmp/p<N>-before.json /tmp/p<N>-after.json
```

⚠️ **The harness compiles over the repo's real `content` globs**, so Tailwind emits only utilities
that appear in source. A class deleted during the pass therefore shows as `AFTER (absent)` — that is
correct and expected, not a regression. Only a class that exists in **both** snapshots and whose
**value** moved is a delta.

#### 3.0.2.0 🔴 THE TWO CLASSES OF GATE RULE — and why one of them can be silently DISARMED

> **OWNER RULING (2026-07-30), generalised from pass 1a's own failure.** The gate-blinding found in
> 1a is **not specific to `no-white-on-accent`. It is a property of the gate's design**, and it
> partitions the named rules into two classes with opposite failure modes.

| class | rules | target | **can it be blinded?** |
|---|---|---|---|
| **DECREASING COUNTER** | `no-raw-hex` · `no-legacy-tokens` · `no-numeric-fontsize` · `no-legacy-radii` · `no-leading-utilities` | reach **0**, verified by asserting the count dropped by **exactly N** | 🟢 **NO. Structurally impossible.** A rewrite that dodges the pattern also fails the count — the site is still there, so the number does not fall by N. The counter *is* the cross-check |
| 🔴 **PERMANENT INVARIANT** | `no-white-on-accent` · 🆕 `no-bare-scrim` · **`no-fontweight` after pass 4** | **0 forever**, and the count is **already 0** | 🔴 **YES, SILENTLY.** With nothing to count down, a syntax change the pattern does not recognise **disarms the rule while it keeps reporting 0.** There is no second signal. **This is exactly what pass 1a did** |

> ## 🔴 THERE ARE **EIGHT** CLASSES OF GATE BLINDNESS, NOT TWO
>
> ⚠️ **Classes 1–4 are below; class 5 is `O-29`'s (the property the rule keys on is not where the
> value lives, with `O-32` as its second instance); 🔴 class 6 is §3.0.2.0.1's REMOVAL-vs-ARRIVAL
> distinction, added in pass 4 and the only one that applies to every remaining pass rather than to
> one property; 🔴 class 7 is `O-35`'s — A DOCUMENT'S INFERENCE IS NOT VERIFIED BY BEING WRITTEN —
> added at pass 3a (R-1) and the only one whose subject is this plan set rather than a rule;
> 🔴 **class 8 is `M-5`'s — A FILE OUTSIDE THE SEARCH ROOTS IS INVISIBLE TO EVERY CONTENT-BASED
> TOOL** — added 2026-08-03 at primitives item 1/R-C, and the only one that is about **WHERE a
> checker looks** rather than **WHAT it looks for.**
>
> **OWNER RULING (2026-07-31), completed after pass 1b hit the third and fourth.** The table above
> names two. Two more were found the hard way, and each has a DIFFERENT sole defence:
>
> | class | failure | sole defence |
> |---|---|---|
> | **1 · decreasing counter** | 🟢 **cannot be blinded** — the count cross-checks the pattern | itself |
> | **2 · permanent invariant** | a syntax change disarms it while it keeps reporting 0 | §3.0.2.0's widen-and-revalidate step |
> | **3 · SET completeness** | a whole MISSING BATCH is invisible; every executed batch's delta is correct | **§3.0.2.2.2's residual histogram**, over BOTH ledgers |
> | **4 · ENUMERATION completeness** | 🔴 **a rule that lists a vocabulary is only as good as its list** | 🔴 **`resolve-utilities.js --diff` — and NOTHING else** |
> | 🆕 **8 · SEARCH-ROOT completeness** (`M-5`) | 🔴 **a file outside the roots is invisible to EVERY content-based tool at once** — the rule set, the vocabulary and the resolved rules are all correct, and the file is simply never opened | 🔴 **`git ls-files` MINUS the roots — a set-difference, not a search.** No grep can find a file it was never pointed at |
>
> **Class 4, measured.** `no-legacy-tokens`'s ramp pattern named ten Tailwind colours and **omitted
> `orange`**, so `profile.tsx`'s streak badge was never counted by any rule, survived every batch,
> and stopped resolving the instant S1 deleted the defaults. A grep cannot catch this **because it
> can only search for what it was told to look for.**
>
> 🔴 **`--diff` IS THE ONLY LAYER THAT SEES "THIS CLASS NO LONGER RESOLVES", because it compares the
> RESOLVED RULE SET rather than searching source.** Therefore:
>
> **▶ RUN `resolve-utilities.js --diff` ON EVERY BATCH THAT TOUCHES `tailwind.config.js` OR
> `theme.js` — not only at pass boundaries.** That is S1, S2 (2a and 2b), S3 (3a and 3b), pass 4's
> `fontFamily`, and pass 5. A config edit is the only thing that can silently un-resolve a class
> that source-level greps have already declared clean.
>
> ---
>
> ### 🆕 🔴 CLASS 8 IN FULL — **WHERE a checker looks, not WHAT it looks for** (added 2026-08-03)
>
> **The first seven classes all describe a checker that is pointed at the right files and asks the
> wrong question.** Class 8 is the checker asking a perfectly good question of a **set that does not
> contain the file.** It is therefore not fixable by widening any pattern, and `--diff` — the sole
> defence for class 4 — is **equally blind to it**, because `--diff` resolves the same `content`
> globs.
>
> **The measured instance (`M-5`).** `mobile/SUBSCRIPTION_EXAMPLES.tsx` sat at the **mobile root**
> holding **39 retired token usages while `no-legacy-tokens` read 0.** Four layers, three blind:
>
> | layer | its search root | saw it? |
> |---|---|---|
> | `token-gate.sh`'s 20 named rules | `$SRC` = `app components lib store services hooks utils types` | 🔴 **NO** |
> | Tailwind's content scanner | `./app/**` + `./components/**` | 🔴 **NO** |
> | `resolve-utilities.js` `--diff` / `--members` | the same two globs | 🔴 **NO** |
> | `tsc` | `tsconfig`'s `**/*.tsx` | 🟢 **YES — the only one** |
>
> 🔴 **AND NOTE THE TWO ROOTS ARE DIFFERENT FROM EACH OTHER, WHICH IS THE SECOND HALF OF THE CLASS.**
> `$SRC` was extended to eight directories long ago; **Tailwind's globs were never extended with it**
> and still name two. So there is a real middle band — `lib/ store/ services/ hooks/ utils/ types/` —
> that the *gate* can see and *Tailwind* cannot. **A class written there emits no rule and therefore
> never renders**, while every named grep reads clean.
>
> #### 🟢 THE MIDDLE BAND IS MEASURED AND IT IS EMPTY — 2026-08-03, primitives item 2 pre-flight
>
> ```sh
> cd mobile && git ls-files '*.ts' '*.tsx' | grep -Ev '^(app|components)/'      # → 44 files
> ```
>
> **All 44 are `.ts`; there is not one `.tsx` outside the two globs.** Grepping every one of them for
> the class attribute returns **10 lines and zero live usages**:
>
> - **7** are the type augmentations in `types/nativewind.d.ts` — the declarations that *give* the
>   prop to RN's components. That file existing is the whole reason the prop typechecks; it authors
>   no value.
> - **3** are prose in comments — `lib/textDefaults.ts` and `theme.d.ts` ×2.
>
> 🔴 **One of those three is a live `A COMMENT IS SOURCE` hazard and is recorded rather than
> silently tolerated**: `theme.d.ts` names a real utility-with-modifier inside a doc comment. It is
> harmless **today** for a reason that is pure luck of geography — `theme.d.ts` is outside the
> content globs, and `G()` explicitly `--exclude=theme.d.ts` — but *"a gate happens not to be
> pointed here"* is class 8 restated, so **do not treat that exclusion as a licence.**
>
> **▶ THE STANDING CHECK IS A SET-DIFFERENCE AND IT IS ONE LINE** (`P41`). Run it on any pre-ship
> walk and whenever a source file is added anywhere but `app/` or `components/`.

#### 3.0.2.0.1 🔴 A SIXTH CLASS, AND A DIFFERENT KIND: **REMOVAL vs ARRIVAL**

> **OWNER RULING (2026-07-31), generalised from pass 4 — and it is the most load-bearing thing that
> pass found, because it applies to every remaining pass rather than to one property.**

🔴 **EVERY NAMED RULE IN `token-gate.sh` BEFORE PASS 4 COUNTED REMOVALS. A GATE THAT COUNTS
REMOVALS CANNOT SEE ABSENCE.**

The five classes above are all about whether a rule can *find* the thing it is looking for. This
one is about **what the rule asserts at all.** They are different assertions:

| | asserts | cannot see |
|---|---|---|
| **REMOVAL gate** — every rule up to pass 4 | *the old spelling is gone* | whether anything correct took its place |
| 🔴 **ARRIVAL gate** — new class | *the right thing is present, at every site that needs it* | nothing else does this |

**`no-fontweight` reaching 0 proves every legacy weight is gone. It says NOTHING about whether a
family arrived.** Measured in pass 4, twice over, and both were invisible to every other layer:

1. **592 of 1,118 `<Text>` nodes had no route to a family at all** (`O-31`). Removal was complete;
   arrival was 47%.
2. 🔴 **9 sites received the WRONG family** — a Figtree face written onto a Literata display step,
   because the rewriter inferred the step from the same line and those style objects put the step
   spread and the weight on different lines. **`no-fontweight` 0 · `--diff` clean · `--members`
   clean · `tsc` clean.** Found only by writing the arrival gate and running it.

**The same shape is waiting in every pass that maps sites onto tokens.** `no-raw-hex` reaching its
floor proves the literals are gone — **not that each element received the right token.** That is
exactly what §3.0.2.2's held-value collisions are, seen from the other side.

**▶ THE REQUIREMENT: every remaining pass must name its ARRIVAL gate, alongside its removal gates.**

| pass | removal gate(s) | 🔴 **arrival gate** |
|---|---|---|
| **4** ✅ | `no-fontweight`, `no-synthetic-italic` | **`family-arrival-check.js`** (step-vs-family, paired by BRACE BALANCE not by line window) **+ `text-defaults-installed`** (the 592) **+ the census in `O-31`** |
| **5** ✅ | `no-raw-hex` at its floor | 🟢 **SPLIT AND BOTH HALVES NAMED (§3.7).** The **static half ran at pass 5** — six token-reference assertions, four of them expect-zero, plus 🔴 **`alpha-callsite-check.js`**, which *invokes* all 120 `alpha()` sites against the flipped values (17 are module-scope, where a throw dies white and no screenshot is even possible). The **visual half is cut 2's capture list**, because after the real flip both error directions are already visible. ⚠️ The magenta run is retained as a **debugging tool for isolation, not a gate for detection** |
| **3b** | `no-legacy-radii` → 0 | the 49 grep-blind sites read by a human — already required; **restate it as arrival, because that is what it is** |
| **primitives (§9)** | — | 🔴 **STILL NEEDS ONE AND STILL DOES NOT HAVE ONE — now registered as `O-38` rather than left as a sentence here.** Extracting `SectionCard`/`LockShell`/`Sheet` moves sites onto components; nothing asserts that every site that *should* use the new primitive *does*. **Design it with the primitive, not after** |

⚠️ **AN ARRIVAL GATE IS USUALLY NOT A GREP**, and that is why they were missed: the two that exist
are a **node script** and an **existence check**. 🟢 **The precedent for building one is
`p23-optin-check.js`** — the 14th named rule and the first non-grep, written for exactly this reason
one pass earlier. **A mechanism is not verified by being specified.** `O-30` is the proof: two
shipped design documents specified a global default that does nothing, and only an existence check
could tell.

> #### 🔴 A SEVENTH CLASS, AND IT IS NOT ABOUT A RULE AT ALL: **A DOCUMENT'S INFERENCE IS NOT VERIFIED BY BEING WRITTEN**
>
> **OWNER RULING R-1 (2026-08-01), generalised from `O-35` — and it is the sibling of the sentence
> directly above.** *"A mechanism is not verified by being specified"* covers a document that
> **prescribes** something that does not work (`O-30`: `Text.defaultProps`). This covers a document
> that **reasons** its way to something false and then acts on the conclusion:
>
> | | the document said | what it did |
> |---|---|---|
> | **class 6 · a mechanism is not verified by being SPECIFIED** (`O-30`) | *"set `Text.defaultProps.allowFontScaling = false`"* | the line was written, assigned a property nothing reads, and **froze nothing** |
> | 🔴 **class 7 · an inference is not verified by being WRITTEN** (`O-35`) | §3.6: *"the className half is simpler — a size utility carries no family, so there is no step-family to reconcile"* | **the exact inversion.** Because a size utility carries no family, the className half is the **ONLY** half where the family must be explicit — nothing else can supply it. The document reasoned from a true premise (`O-31`) to the opposite of its consequence, and the pass then **scoped its arrival gate to the other half** |
>
> 🔴 **BOTH WERE CAUGHT BY INSTRUMENTS, NEVER BY READING**, and that is the whole content of the
> class. `O-30` needed an *existence check*; `O-35` needed a *grep for the token's call sites*
> (`font-display` — **zero**). Five sessions read §3.6's sentence and none of them noticed it was
> backwards, because it is fluent, it cites a real finding, and it reaches a conclusion that makes
> the work smaller. **A wrong inference in a plan is invisible to review in a way a wrong
> instruction is not**, because there is no step to try and watch fail.
>
> **▶ THE OPERATIONAL RULE:** wherever a plan document argues that a pass needs **LESS** verification
> than its neighbour — *"simpler", "a pure 1:1 map", "no judgement at all", "nothing to reconcile"* —
> **that sentence is a gate requirement, not a reassurance.** Measure the claim before scoping to it.
> The cheapest possible form is what would have caught `O-35` in one command: **grep the call-site
> count of every token the pass is supposed to make arrive, and assert it is nonzero.**
> ⚠️ `warning` (0 call sites, §3.7) shows the same command also has a legal zero — so the assertion
> is *"zero is a decision recorded somewhere"*, not *"zero is a bug"*.
>
> 🟢 **CLOSED AT PASS 3a:** `family-arrival-check.js` now also asserts the **MISSING**-family half —
> every `text-display-*` / `text-quote` className must carry its own family utility — with the two
> legal emoji sites carried as a **named, in-file, printed `GLYPH` exception** (pass 2a's idiom,
> reused because the argument is identical: a pictograph's step is a DIMENSION). Pass 5's own note
> said demanding a family there *"would be an OVER-find on correct code"* — true only while no
> exception mechanism existed, which is itself an instance of this class one turn smaller.
> Re-validated in **three** directions: **2** on the unmarked tree (equality, not "at least"),
> **0 live / 2 excepted** after marking, **1 / 1** with one marker removed.

**🔴 THE REQUIRED STEP, BEFORE EVERY REMAINING PASS:**

1. **List which permanent-invariant rules could stop matching after the syntax that pass introduces.**
2. **Widen their patterns** to match the legacy **and** the new spelling.
3. 🔴 **Re-run the widened pattern against the PRE-migration tree and assert it returns EXACTLY the
   known site set — not "at least" it.** The assertion is *"the same rule finds the same set on both
   trees"*, with equality in both directions:
   - **UNDER-finding** on old code means the widening moved the blind spot rather than closing it.
   - 🔴 **OVER-finding is the MORE INSIDIOUS failure, and it is the one this step exists to catch.**
     A noisy rule gets ignored, and an ignored rule is a disabled rule — **that is precisely how
     `C-f` was demoted to report-only in the first place.** A rule that cries wolf has not been
     strengthened; it has been decommissioned by its own output.

   ⚠️ **This is not hypothetical — it happened on the first application.** The initial widening of
   `no-white-on-accent` relaxed `backgroundColor:` to `(background)?[Cc]olor:`, which made a gold
   **foreground** count as a fill and took `astrology/index.tsx` from 1 hit to **3, two of them false**.
   The pre-migration run is the only thing that exposed it. Tightened back to `backgroundColor:` only;
   both trees now return the identical 6-site set.

**The scheduled re-validations, named so they are not left to memory:**

| after | re-validate | because |
|---|---|---|
| **pass 1b** | 🔴 **`no-bare-scrim`** | 1b rewrites the 16 `rgba(0,0,0,0.5–0.7)` literals to `bg-scrim/60` / `t.color.scrim`. That **changes what the rule is looking at** — it currently sees a token name that has no call sites at all |
| **pass 4** | 🔴 **`no-fontweight`** | it converts from a decreasing counter (~501 → 0) into a permanent invariant the moment it hits 0, and pass 4 introduces `font-body-semi` / `fontFamily:` as the replacement syntax |
| **every pass** | `no-white-on-accent` | ⚠️ but see §3.0.2.1 — its enforcement has **moved out of the gate entirely** |

**🟢 PROVEN ON ITS FIRST APPLICATION, not assumed (2026-07-30).** The widened `no-white-on-accent` was
run against both trees: it returns the **identical 6-site set** before and after 1a's rewrite
(`astrology/index.tsx` `:579` pre = `:584` post — the same site, shifted by the added import comment).
⚠️ **The first widening attempt was itself wrong** and the pre-migration run is what caught it: relaxing
`backgroundColor:` to `(background)?[Cc]olor:` made a gold **foreground** count as a fill, inflating
astrology from 1 hit to 3 with two false positives. **Tightened back to `backgroundColor:` only.**
That is the whole argument for step 3 in one example.

#### 3.0.2.2 🔴 HELD-VALUE COLLISIONS — the identity gate CANNOT distinguish two roles that share a value

> **Generalised from the B4 hazard (owner, 2026-07-30): "`warning` also = `#F59E0B`; free at 1a,
> separates at pass 5" is NOT free. It is a permanent decision made invisibly.** Audited `theme.js`
> exhaustively for the same trap. **There are FIVE collisions, not one.** ⬜ **SIX as of pass 3a — and
> the sixth is in `space`, not `color`, which is why the box below the table exists.** (`O-37` adds a
> seventh of a different kind: one the FLIP CREATED rather than resolves.)

**The mechanism, stated once.** Two distinct tokens holding the **same** value through passes 1–4 are
**indistinguishable to the identity gate**, because the gate compares *values*. Either assignment
passes byte-perfect. Then **pass 5 gives them different values** and the wrong one renders the wrong
colour — with **no gate having ever seen the decision.** 🔴 **This is structurally identical to
`C-k`** (`rounded-xl` legal in both radius scales with different values): both answers are locally
correct, so no grep can resolve it. **It needs a human decision recorded at the time of the rewrite.**

| held value | the two roles | diverges at pass 5 to | volume | pass | verdict |
|---|---|---|---|---|---|
| **`#F59E0B`** | **`accent`** / **`warning`** | `#D98E57` clay ↔ `#D9A657` amber | **110** (B3) | **1a** | 🔴 **HIGHEST RISK — enumerate by role before B3 runs** |
| **`#000000`** | **`scrim`** / **`on-accent`** | `#100E0D` ↔ `#1A1512` | 4 scrims (B5, 1a) + ~5 `black` (1b) | **1a + 1b** | 🔴 **LIVE AND UNFLAGGED until now.** Compounded by the bare-`bg-scrim` footgun: an unmodified `bg-scrim` is *also* `#000000`, so scrim/on-accent/opaque-black are all one value at 1a |
| **`rgba(255,255,255,0.05)`** | **`surface-raised`** / **`locked`** | `#1E1A17` ↔ `#2A2521` | ~12 rgba (V-4) + 11 lock sites (V-6) | **1b** | 🔴 **A full step apart on §4.5's lightness ladder.** `theme.js` already notes the hold; it was **not** framed as a decision hazard. A lock surface mis-assigned renders one step too dark at pass 5 |
| **`#10B981`** | **`success`** / **`chart.harmonious`** | `#86A97B` ↔ `#7FA88F` | 9 | 1a/1b | ⚠️ **CONTAINED by the §7.3 allow-list** — only `BirthChartWheel.tsx` may import `theme.chart` |
| **`#EF4444`** | **`danger`** / **`chart.tense`** | `#C8695E` ↔ `#C08A7E` | 9 | 1a/1b | ⚠️ same containment |

> ### 🔴 A SIXTH COLLISION, AND IT IS THE FIRST ONE OUTSIDE COLOUR: `screen-x` **=** `space-6` **=** 24
>
> **Found at pass 3a while migrating the hand-rolled screen gutter.** The table above is entirely
> colour, and the mechanism was written as if it were a colour property. It is not:
>
> | held value | the two roles | volume | what diverges them |
> |---|---|---|---|
> | **24dp** | **`screen-x`** (the gutter `ScreenContainer` OWNS) / **`space-6`** (section gap, card padding — the busiest step in the app at 266 usages) | **18** hand-typed inline `24`s, of which **6 are the gutter and 12 are a component's own padding** | nothing in the codemod. They diverge the **first time anyone retunes the screen gutter** — which is the entire reason §4.2 gave it a name |
>
> 🔴 **THE MEASUREMENT THAT MATTERS: §1.6's 3a row assumed the recurring 24s *are* the gutter** — *"the
> hand-rolled 24 horizontal, now named — one token, 25 screens … wherever it recurs."* **Measured, the
> ratio is inverted: 12 of the 18 are BUTTON or SHEET padding**, not the gutter (4 × `unlockButton`,
> `BiometricConsent` ×2, `LockedSection`, `ShareCard` — a W1 surface — `GeneratingReading`, and
> `TimezonePicker` ×3, which is the picker's OWN gutter, not the screen's). A mechanical sweep of
> `paddingHorizontal: 24` onto `screen-x` would have mis-roled two thirds of them, and **every gate
> reads green either way, because the value is the same.**
>
> **So pass 3a migrated only the 6 + 2 genuine gutter sites** (`ScreenContainer` ×2 — the canonical
> home · `welcome.tsx` ×2 — the X2 hand-rolled copy, which MUST match or the gutter drifts between one
> screen and 25 · `app/index.tsx` · `combined.tsx` ×3, which renders `withScrollView={false}` so
> `ScreenContainer` applies no padding at all and the gutter is genuinely that file's to own). The
> other 12 are the residual, with the named reason *"a component's own 24 is the step-6 token, not the
> gutter"*, and the reasoning is recorded **at the canonical site** in `ScreenContainer`.
>
> ⚠️ **The general form, because the spacing family has more of these than colour ever did:** a value
> that appears in the scale twice under two names is a collision, and **`screen-y` = 32 = `space-8` is
> the second one in the same object.** Any future named spacing token (`gutter`, `sheet-x`, …) adds
> another. Branch on ROLE — the same ruling §3.0.2.2.1 reached for `alpha()`.

🔴 **CONSEQUENCE FOR §7.3's ALLOW-LIST: it is LOAD-BEARING FOR PASS-5 CORRECTNESS, not hygiene.**
*"Only `BirthChartWheel.tsx` may import `theme.chart`"* is what confines the last two collisions to a
single file where "chart aspect or status?" has an obvious answer. **Relaxing that allow-list would
create two more undetectable pass-5 divergences.** Never widen it.

#### 3.0.2.2.1 🔴 A THIRD MEMBER OF THE SAME FAMILY — VALUE-SHAPED LOGIC IS FLIP-UNSTABLE

> **OWNER RULING (2026-07-31), generalised from `theme.alpha()`'s guard.**

🔴 **ANYTHING THAT INSPECTS A TOKEN'S *VALUE* RATHER THAN ITS *NAME* IS CORRECT WHILE HELD AND
WRONG AFTER THE FLIP.** This is the same class as the held-value collisions above — the
collisions are two names sharing one value; this is one name changing its value *shape*.

**The measured instance.** `alpha()` must reject a token that already carries alpha. The
obvious guard is value-shaped: *"throw unless the input matches `#RRGGBB`."* That is correct at
Vellum and **INCOMPLETE WHILE HELD**, because `border-subtle` is held at `#1F2937` and
`border-strong` at `#2D2640` — **solid six-digit hex** — and they only become
`rgba(244,239,233,0.07/0.16)` at **pass 5**. So `alpha(color['border-subtle'], 60)` written
during passes 1–4 works for the entire revamp and **starts throwing the moment pass 5 lands**:
a failure planted four passes before it fires, in the one pass whose whole claim is that it
changes values only. Fixed by a **denylist + reverse lookup** — it rejects by **ROLE**, so it
behaves identically before and after the flip.

**The rule:** any guard, assertion, gate pattern or conditional that branches on a token's
value must be re-expressed to branch on its **name/role**, or it must be listed as a pass-5
migration item. 🔴 **`alpha()` will not be the last thing to hit this** — the same trap waits
for anything that tests "is this token translucent?", "is this dark enough?", or "does this
need a light foreground?".

**The rule this establishes, for every remaining pass:** when a pass maps sites onto a token that
**shares its held value with another token**, the per-site assignment **must be recorded in the batch
commit body**, so pass 5 can be audited against *a decision* rather than *an accident*. §4.6 already
requires the gate numbers in the commit body; this adds the role assignment for collision tokens.

#### 3.0.2.2.1.1 🔴 COLLAPSING A COLOUR LADDER — TWO DISTINCT GROUNDS, NEVER CONFLATE THEM

> **OWNER RULING (2026-07-31), confirming O-24 and its extensions.** Both grounds reach the same
> answer — one hue — but they are different arguments, and **conflating them lets a future session
> re-derive one of them wrongly.**

| the ladder is | ground for collapsing | the precedent |
|---|---|---|
| 🔴 **ORDINAL** — scores, bands, confidence, "growth potential". `ScoreCard`, `CompatibilityScoreRing`, `CompatibilityShareCard`, `IMPACT_COLORS`, the 3-number card, both `career-destiny` ladders | **WELLBEING.** The value is **LLM-generated and uncalibrated**, so colouring "worse" **makes a claim about a person**. | **The energy bar** — its three-way colour logic was removed for exactly this reason, approved as a wellbeing call |
| 🔴 **NOMINAL** — category / type maps with no rank. `FocusAreaBadge`, `LifeAreaCard`, `NumerologyBadge`, `WeeklyDayCard` | **PALETTE EXHAUSTION + §16.** Identity already comes from **label, icon and POSITION**; `accent-2` means premium/brand and nothing else, so a category tint there is the "generic second colour" drift §16 exists to prevent. | **The Explore grouping** — position was shown to supply stable identity more cheaply than hue, **and to survive monochrome** |

🔴 **THE DECISIVE EVIDENCE FOR THE NOMINAL CASE: `FocusAreaBadge` ALREADY HELD A DUPLICATE BEFORE
1b** — `Career` and `Creativity` were both `accent`. **A 5–6 hue qualitative palette demonstrably
never existed here, so there was no distinction to preserve.** You cannot preserve a distinction
that was already broken.

🔴 **IF A VISIBLE RANKING IS EVER WANTED ON THE ORDINAL SET IT MUST BE A PROMINENCE LADDER — weight
or opacity on ONE hue — NEVER A HUE LADDER**, which in a one-accent system requires inventing
colours. (And `warning` is not an escape hatch: held `warning` **equals** held `accent`, so that
ladder collides *before* the flip and is undetectable until pass 5.)

#### 3.0.2.2.3 🔴 A NINTH BLINDNESS CLASS: **DISTANCE IS NOT ORDER** — a state-pair check that measures separation cannot see an inversion

> **`O-93`, 2026-08-04. Recorded here as a CLASS beside the other eight, not as the site fix that
> exposed it, because the next state-pair check anyone writes will get this wrong by default.**

**A state pair has two independent properties, and only one of them is what a difference measures:**

| property | question | what measures it |
|---|---|---|
| **SEPARATION** | are the two states *distinguishable*? | the contrast ratio **between** them |
| 🔴 **ORDER** | is the signalling state the *more prominent* one? | each state against **its own ground**, compared |

🔴 **A CONTRAST RATIO IS SYMMETRIC. `ratio(a,b) === ratio(b,a)`.** So a check built on the distance
between two states reads **the same number whichever way round the pair is**, and is therefore
structurally incapable of detecting that they are the wrong way round. This is not a gap in a
particular rule — it is a property of the measurement.

**MEASURED, and the shape of the evidence is the argument.** `border-control` raised sixteen resting
boundaries to the 1.4.11 floor without touching the signalling colours they pair with. Reading
SEPARATION across the resulting thirteen pairs:

```
  separation FELL at 5 sites   ->  all five were FINE on order
  separation ROSE at 4 sites   ->  one of them was INVERTED   🔴
```

> 🔴 **THE ONE BROKEN PAIR IS THE ONE A SEPARATION CHECK WOULD HAVE RANKED HEALTHIEST.** The Q&A
> Deep-Insight toggle's separation improved from **1.04 to 2.92** — the largest gain in the batch —
> while its ordering flipped: the ON edge (an accent *wash* used as a stroke, **1.25:1** against its
> ground) became **2.92× less prominent** than the OFF edge (**3.65:1**). Switching the control on
> made its outline fainter. **Every site whose separation fell was correct, and the site whose
> separation rose the most was the defect.** The two diagnostics are not merely different — on this
> batch they were *anti-correlated*.

**THE RULE, for any future state-pair check:** assert **ORDER**, not distance. Resolve each state
against the ground it actually sits on and require `prominence(signalling) > prominence(resting)`.
Separation remains worth reporting — a legal ordering with a 1.2:1 gap is still a weak indicator —
but it can never be the *only* assertion, and a rising separation is not evidence of health.

⚠️ **What shipped is the SYNTACTIC proxy, and the limit is stated where it lives:** full prominence
needs each edge's ground, i.e. the A5 pair rule's style-graph walk. The census asserts instead that
the signalling half of a border **state ternary** is a full accent-family token and never a wash or
an `alpha()` reduction — which needs no ground, because a wash cannot clear 3:1 as a stroke on any
ground in this palette. **A real prominence check is the correct future form; this is the cheap one
that catches the mechanism.** The **ternary** is what keeps it from over-finding: eight static
decorative wash borders exist and are legitimate, and none is a state pair.

#### 3.0.2.2.2 🔴 SET-COMPLETENESS RECONCILIATION — a RESIDUAL HISTOGRAM, at the end of every pass

> **OWNER RULING (2026-07-31), generalised from 1a's B4 omission — and it caught a real miss on its
> first application, in 1b.** 1a skipped batch B4 entirely and **every gate read green**, because a
> per-batch gate proves each *batch* and nothing proves the *set*.

**The required artefact: at the END of every pass, enumerate EVERY remaining match of every
decreasing-counter rule, and give each one a NAMED REASON for remaining.** A legal reason is exactly
one of:

1. a **§1.6b row** that defers it (e.g. "design §11.4 owns `BirthChartWheel`"),
2. an **allow-list entry** (§7.3's `theme.chart`; `no-white-on-accent`'s verified pairings),
3. a **named deferred batch** (e.g. "C11 deletes `lib/colors.ts`"),
4. a **structural permanent residue** (the 3 HTML entities; a hex inside a **comment**).

🔴 **A TOTAL CAN RECONCILE BY ACCIDENT; A NAMED REASON PER ENTRY CANNOT.** What caught B4 was not the
total — it was `#10B981` ×9 and `#EF4444` ×8 **sitting in the residue with held tokens available**, which
is not a legal reason. Reconciling the total would have missed it, because every executed batch's own
delta was correct.

🔴 **AND IT WORKS ON A FORM, NOT JUST A VALUE — 1b's own proof.** Batch C4 migrated `#6B21A8`'s **hex**
(14) and **rgba** (26) forms and **silently skipped its 18 `bg-primary-dark` classNames.** Every
per-literal assertion passed; `no-raw-hex` fell by exactly the sites rewritten; `tsc` was clean. The
histogram is what exposed it — `bg-primary-dark` ×18 had **no legal reason to remain**, because V-1's own
ruling box routes it to `accent`. 🔴 **So the histogram must be built over BOTH ledgers (literal AND
className), never just the one the batch happened to think in.** Completing it then surfaced **five more
A5 fill-label pairs**, none of which any list named.

**Where this lands:** the histogram goes in the pass's final commit body next to the gate numbers (§4.6),
and its reasons are the input to the next pass's pre-flight.

#### 3.0.2.1 ⚠️ `no-white-on-accent` IS PERMANENTLY REPORT-ONLY — enforcement lives in `CLAUDE.md`

> **OWNER RULING (2026-07-30). Stop trying to make it a failure condition.**

**Six sites in `astrology/index.tsx` alone, unreachable for three independent structural reasons:**
proximity is not nesting (the ±4-line window is a heuristic, not a parse) · background and text sit in
**different style objects** · **two of the six are StyleSheet pairs** joined only at a JSX call site.
No proximity window of any size closes those gaps, and widening the pattern does not either.

**So the enforcement moved to the place every session actually reads.** `CLAUDE.md`'s permanent
gotchas now carry:

> **`on-accent` is the only legal foreground on an `accent` / `warning` / `success` / `danger` fill.
> Never `fg`, never white. `#FFFFFF` on `#F59E0B` is 2.15:1.**

**The reasoning, recorded because it is a general principle:** once 1b fixes the known six, the
residual risk is **new code introducing a seventh** — and for that, **a documented rule in the file
every session reads beats a grep that cannot see it.** The gate keeps reporting the hits it *can*
find; it never fails on them.

#### 3.0.2.1.1 🔴 `O-73` AMENDED — A GRADIENT GROUND IS UNRESOLVABLE ONLY WHILE ITS RANGE IS FREE

> **Added 2026-08-04 by the motion phase's item 0 (`P77` / `P79`). `O-73`'s row in §12 is amended to
> point here.** The old ruling was *"treat any gradient ground as unresolvable"*, and it was
> **right for an UNCONSTRAINED gradient and too strong as a general rule.**

**What `O-73` correctly established:** on an accent-to-canvas slab, the on-fill role runs 6.86 → 1.06
and the plain role runs 2.31 → 16.84, so the two **CROSS**, and there is a band where no palette
token clears AA. Which end applies to a given text node depends on its vertical offset, which no
scanner resolves. That is why the share-card slabs were fixed by **subtraction** rather than by
measurement, and the conclusion "a gradient ground is a function of POSITION" is unchanged.

🔴 **What it got wrong is the word *any*, and the cost was X3's Button — the ONE gradient the design
keeps by name, on 60 call sites, live sub-AA over the last 25.3% of its own diagonal.** A class
declared unresolvable is a class nobody instruments, so the exception the design had already carved
out sat outside every instrument in the tree for the whole programme.

> ## 🟢 THE AMENDED RULE
> **A GRADIENT FILL'S RANGE MUST BE CONSTRAINED SO THAT ITS ENTIRE SPAN CLEARS AA AGAINST THE
> FOREGROUND THAT SITS ON IT.**
>
> Position-dependence is only fatal when the range is **free**. Clamp the range and position stops
> mattering — every point on the span is legal by construction, so the thing a scanner cannot resolve
> becomes the thing it does not need to. 🔴 **And unlike the crossing case that defeated the A5 pair
> rule, this is mechanically checkable**, because a stop list is a literal and the span between two
> stops is a segment.

**The instrument is `A6 gradient · span × label`, in `primitive-adoption-check.js`, and it BLOCKS.**
It parses each `colors={[…]}` into resolved RGBA, walks the element's subtree by tag depth, composes
every fill on the path from the gradient down to each label, and samples the span. **Four properties
are load-bearing and each was learned from a false result during the item:**

| property | why, measured |
|---|---|
| it samples the **SPAN**, not the stops | relative luminance is **convex** in a gamma-space channel, so a two-hue segment can dip **darker than either end** in the middle. Stops-only is sound *only* for a one-hue alpha ramp |
| it evaluates **BOTH ALPHA MODELS** and takes the worse | `O-103` — a translucent ramp renders differently premultiplied vs straight-alpha, and the straight-alpha **bulge** was the single largest source of findings in the item |
| the verdict is the **BEST ground's worst point** | a translucent stop has no single ground. Sweeping all five and taking the worst **invented grounds that do not exist** and produced **11 false positives on correct code**. The failure condition is the strongest available claim: *sub-AA no matter what it sits on* |
| every fill on the path is **COMPOSED**, never ignored | 🔴 **and a veil can make a pair BETTER OR WORSE, so only composing decides which.** Measured: a 20% light veil over an accent tile took a label to **1.93:1**, *worse* than the 2.31:1 the gradient alone predicted |

⚠️ **The irreducible residue is printed, not filed.** A pair that clears on some opaque grounds and
not others is `O-73`'s surviving half — where the element is mounted decides — so it prints as
`ground-sensitive` and never blocks. **A residue nobody reads is an assumed-empty one.**

#### 3.0.2.1.2 🔴 THE QUESTION IS NEVER "IS THERE A CHECK?" — IT IS **"DOES IT FAIL?"** (`O-105`)

> **Owner-ruled 2026-08-04, after the third instance of one shape.** A rule that reports but cannot
> fail is **not a control**, and in terminal output and in a commit body it is **indistinguishable
> from one that is.**

| instance | what printed | what it could not do |
|---|---|---|
| `no-white-on-accent` | its hits, every run, for a whole phase | fail — ruled §3.0.2.1, and **nine live AA failures** followed |
| the `A5 pair` class | a paragraph in `CLAUDE.md` calling it unenforceable | fail — until the 21st rule was written to BLOCK on it |
| 🔴 `S "excepted: DERIVED"` | **`3`, beside X11's and X12's COUPLED radii** | fail. `S()` never touches `fail`. **It was believed to be their check** |

🔴 **THE STRUCTURAL POINT: the report-only register at the foot of `token-gate.sh` enumerated
report-only RULES and was silent about report-only NUMBERS** — and there were ~23 of the latter,
printed in the identical `· label count` shape, two of them standing in for PRESERVE-BLINDLY rows.

🟢 **The discharge, in that file:** `SA()` — a sub-count that asserts — and six conversions.
`excepted: SHAPE` **exact 4** · `excepted: DERIVED` **exact 3** · `excepted: ABOVE-CEILING` **exact 6**
(⚠️ *the enumeration in that block says seven; one retired at `P66` and the prose was stale*) ·
`excepted: GLYPH` **max 35** · **both `BirthChartWheel` residues capped**, which mattered most because
`live = all − wheel`, so **growth in the residue silently LOWERED a blocking number** while the
comment beside it claimed the opposite in as many words.

⚠️ **The shape is chosen per number and `O-67` already ruled how:** `exact` for an invariant whose
members are enumerated, `max` for a residue that may only shrink, `S()` only for a genuine watchlist.
**And every remaining `S()` is now enumerated with a named reason at the foot of that file** — the
full sweep, both lists, so "which of these can fail?" is answerable without reading the code.

#### 3.0.2 The gate, in portable form

`mobile/scripts/token-gate.sh` — §7.2's seven named rules, `grep`-ported (§0.2), **failures
accumulate** (the authored version exits on the first hit, which turns a 500-site sweep into 500
sequential runs):

```sh
#!/usr/bin/env bash
# Token gate — the completeness proof. NativeWind DROPS an unknown utility silently, so an
# absent token is invisible at build time and a wrong-valued one is invisible until someone
# looks at the screen. Rules are named, NEVER numbered (the numbering churned across design
# turns and one authored "rule" held three greps). See UI-revamp-design.md §7.
set -uo pipefail
fail=0
SRC="app components lib store services hooks utils types"
INC="--include=*.ts --include=*.tsx"
G() { grep -rEn $INC --exclude=theme.js "$1" $SRC && fail=1 || true; }

# ── no-raw-hex ── baseline 401 in app+components + 23 in lib/colors.ts + 198 non-hex (C-j)
G "#[0-9a-fA-F]{3,8}\b"
G "rgba?\([0-9]"
G "[Cc]olor[:=][[:space:]]*[\"']?(white|black|red|green|blue|gray|grey|orange|yellow|purple|pink)\b"
# C-c: the SECOND token system must be GONE, not merely unused — 54 of 93 files import it,
# so left in place it keeps the old palette alive while this gate reports clean.
[ -e lib/colors.ts ] && { echo "no-raw-hex: lib/colors.ts still exists"; fail=1; }

# ── no-legacy-tokens ── (a) default ramp 339 · (b) retired custom 565 · (c) pre-emptive
G "(text|bg|border)-(gray|slate|zinc|neutral|stone|red|purple|violet|amber|emerald)-[0-9]{2,3}"
G "\b(text|bg|border)-(gold|primary|primary-dark|primary-light|pink|background|card|card-translucent|white|black|cosmic-[a-z-]+)\b"
G "\b(text|bg|border)-(text-)?(secondary|muted|placeholder|disabled)\b"

# ── no-legacy-radii ── rounded-sm/md/lg/xl/pill are VALID in the new scale and are NOT grepped.
# Dead spellings only, incl. C-k's rounded-2xl (73) which the authored pattern omitted.
G "rounded-3xl|rounded-2xl|rounded-full|(^|[\"' ])rounded([\"' ]|$)|borderRadius:[[:space:]]*(99|999|100)\b"
# 🔴 C-k HAS NO GATE FORM, AND THAT IS THE POINT: rounded-xl (48) and rounded-lg (1) are legal
#    in BOTH scales with DIFFERENT values. Pass 3b rewrites all 49 explicitly; a human reads it.

# ── no-fontweight ── className 328 + inline 173 = pass 4's ~501
G "font-(thin|light|normal|medium|semibold|bold|extrabold|black)"
G "fontWeight[[:space:]]*:"

# ── no-numeric-fontsize ── 346 inline, 26 fractional. The ramp is integers only, forever.
G "fontSize:[[:space:]]*[0-9]+(\.[0-9]+)?"

# ── no-leading-utilities ── 45 usages; 37 genuinely override the ramp, 8 are pure no-ops.
# Paired config action: DELETE theme.lineHeight (pass 2b).
G "\bleading-[a-z0-9]+"

# ── 🆕 no-bare-scrim ── THE EIGHTH NAMED RULE (owner ruling R3, 2026-07-30). Baseline 0, stays 0.
# `scrim` is a SOLID HEX, so the alpha lives on the utility at each site. That trades a FAIL-SAFE
# default for a FAIL-DANGEROUS one: with rgba(0,0,0,0.6) a forgotten modifier still rendered a 60%
# scrim; with #000000 it renders an OPAQUE BLACK OVERLAY. Measured: bare `bg-scrim` resolves to
# rgba(0,0,0,var(--tw-bg-opacity,1)) = fully opaque. No other rule catches it — `scrim` is a LEGAL
# token name, so no-legacy-tokens passes it and no-raw-hex never sees it. Matches `scrim` NOT
# followed by `/`, including at end-of-token (bg-scrim").
G "scrim([^/a-zA-Z0-9-]|$)"

# ── 🆕 ninth grep, from §7.4's note: two live dead classes no other rule catches ──
G "\bspace-[xy]-"          # can NEVER work under NativeWind 4 — sibling combinator
G "\b[wh]-30\b"            # Tailwind 3 has no `30` key; never resolved

# ── no-white-on-accent ── REPORT ONLY. Proximity is not nesting: measured, the ±4-line form
# returns 5 hits of which 4 are correct code, catches the paywall CTA only by accident via the
# spinner, and NEVER catches the astrology CTA (inline-ternary fill + bare `color:'white'`).
echo "no-white-on-accent (report only — review each hit):"
grep -rEn -C4 $INC "\bbg-(gold|accent|warning|success|danger)\b|backgroundColor:[^,;]*#(F59E0B|92722D)" $SRC \
  | grep -E "\btext-white\b|[Cc]olor[:=][[:space:]]*[\"']?(white|#FFF|#FFFFFF)\b" || true
# ALLOW-LIST, verified correct today, do not re-flag:
#   PremiumBadge.tsx:9-10 · (paywall)/index.tsx:176-177 · WeeklyDayCard.tsx:30-31 · home.tsx:305
# KNOWN VIOLATIONS to drive out: (paywall)/index.tsx CTA label + spinner · astrology/index.tsx CTA ×4

# (rule 5 removed — banning bare <Text style={{…}}> would force qa.tsx and cosmic-report.tsx
#  through txt(), which is the structural rewrite we deliberately excluded. Also redundant with
#  no-numeric-fontsize and blind to <Text style={styles.x}>.) ^ retained so nobody re-adds it.

[ $fail -eq 0 ] && echo 'token gate: clean'
exit $fail
```

> 🔴 **§7.3's `theme.chart` ALLOW-LIST IS LOAD-BEARING FOR PASS-5 CORRECTNESS, NOT HYGIENE.**
> `success` and `chart.harmonious` both hold `#10B981`; `danger` and `chart.tense` both hold `#EF4444`
> (§3.0.2.2, collisions C4/C5). The allow-list is the **only** thing confining those two collisions to a
> single file, where *"chart aspect or status?"* has an obvious answer. **Widening it — to "any chart
> component", or to a shared helper — creates two MORE undetectable pass-5 divergences**, because the
> identity gate cannot distinguish two tokens that hold the same value. **Never widen it.** It reads
> like a tidiness rule; it is a correctness rule.

**Two allow-lists exist and only two** (§7.3): `theme.chart` may be imported **only** by
`BirthChartWheel.tsx` — implemented as *"only this file may import `theme.chart`"*, 🔴 **never** as
`--exclude=BirthChartWheel.tsx` on `no-raw-hex`, which would permanently exempt that file's 11
existing raw hex literals; and `no-white-on-accent`'s four verified pairings.

#### 3.0.3 Enumeration is always by symbol or string (§0.1)

Every command below prints `file:line` from a **fresh grep**. Where this document gives a line, it
is `≈` and advisory.

---

### 3.1 ✅ PASS 0 — procedure · **COMPLETE 2026-07-30, all gates passed (see §1.2)**

**Enumerate:** nothing to enumerate; this pass has no product sites.

**Apply:**
```sh
cd mobile
node scripts/resolve-utilities.js > /tmp/p0-before.json    # ← FIRST, before any edit
npx expo install expo-font @expo/vector-icons
# write theme.js (§6.2 + the §1.6a HELD colour column), theme.d.ts (§6.5),
#   tailwind.config.js S0 bridge (§1.1), scripts/token-gate.sh, scripts/resolve-utilities.js
# add "gate": "bash scripts/token-gate.sh" to package.json scripts
```

**Verify:** §1.2's gate block. `--diff` must report **0 moved** for every pre-existing class.

**Rollback:** `git revert`. No import sites exist yet for either dependency.

---

### 3.2 PASS 1 — procedure

**Enumerate** (each command is the ledger for one sub-task):

```sh
cd mobile
SRC="app components"; INC="--include=*.ts --include=*.tsx"
# literals
grep -rEn $INC "#[0-9a-fA-F]{3,8}\b" $SRC                       # 404 (−3 HTML entities = 401)
grep -rEn $INC "rgba?\([0-9]" $SRC                              # 117
grep -rEn $INC "[Cc]olor[:=][[:space:]]*[\"']?(white|black)\b" $SRC   # 81
# className ledgers
grep -rEn $INC "\b(text|bg|border)-(gold|primary|primary-dark|pink|background|card|card-translucent|white|black)\b" $SRC   # 565
grep -rEn $INC "(text|bg|border)-(gray|slate|zinc|neutral|stone|red|purple|violet|amber|emerald)-[0-9]{2,3}" $SRC          # 339
grep -rEn $INC "(bg|text|border)-\[#" $SRC                      # 27 arbitrary-value
# the second token system and its reach
grep -rln $INC "lib/colors" $SRC                                # 54 of 93 files
# frequency, to drive the order of work
grep -rEoh $INC "#[0-9a-fA-F]{3,8}\b" $SRC | tr 'a-f' 'A-F' | sort | uniq -c | sort -rn | head -20
```

Measured frequency (top 8 account for **271 of 401**, 68%): `#9CA3AF` ×80 → `fg-muted` ·
`#FFFFFF` ×55 → `fg` · `#F59E0B` ×51 → `accent` · `#D1D5DB` ×28 → `fg-secondary` ·
`#EC4899` ×18 → **V-3, no target** · `#C084FC` ×17 → `accent-2` · `#0F0A1A` ×14 → `bg` ·
`#6B21A8` ×13 → **V-1, collapses into `accent`**.

**Apply — 🔴 PER-LITERAL, IN ROLE BATCHES. NOT file-by-file.** *(procedural change, 2026-07-30)*

> **Why the file-by-file order below was replaced.** §3.2 originally ordered the work by *scatter*
> (`astrology/index.tsx` first, then the other 7 heavy files, then a sweep). **If the unit of work is a
> literal (§11.1), a per-file procedure re-pays the same reasoning in every file containing that
> literal** — `#9CA3AF` appears in ~40 files and the decision "→ `fg-muted`" is identical in all of
> them. Sweeping globally per literal pays it once.
>
> **The alternative extremes are both bad:** 58 file-sized commits nobody can relate to a token
> decision, or **one unreviewable 1,129-site diff.** Role batches give **~6 commits that each answer a
> single question.**
>
> 🔴 **THIS DOES NOT WEAKEN THE CAUTION FROM §11.1. The check stays PER-LITERAL, NEVER PER-LINE** —
> `#F59E0B` (1a) and `#92722D` (1b) sit in **the same ternary** in `astrology/index.tsx`. Each literal
> carries its own value-preservation assertion, and a batch is only a commit boundary, not a shortcut.

**The batch sequence** — one gated commit each, in this order. Counts are the sites **remaining after
`astrology/index.tsx`** (measured 2026-07-30), so they are what the next session actually faces.

| # | batch | sites | contents | why here |
|---|---|---|---|---|
| **B0** ✅ | `astrology/index.tsx`, whole-file | **62** | the §11.1 calibration file | **DONE** — it had to be one unit to calibrate |
| **B1** | **neutrals** | **90** | `#9CA3AF` ×55 → `fg-muted` · `#D1D5DB` ×25 → `fg-secondary` · `#6B7280` ×7 → `fg-placeholder` · `#1F2937` ×3 → `border-subtle` | Largest, most mechanical, **zero interaction with any §1.6b row.** Establishes the batch rhythm on the safest possible content |
| **B2a** | **whites → `fg`, BARE forms only** | **~399** | `text-white`/`bg-white` (bare) · `color:'white'` ×64 · `#FFFFFF` ×53 | The value-preservation assertion **IS** the review — eyeballing 399 identical renames adds nothing. ⚠️ **`bg-white` → `bg-fg` is value-preserving but semantically odd**; flag the 13 for a 1b/primitives look, do not re-role them here |
| **B2b** | 🔴 **the 16 MODIFIER forms, as their own commit** | **16** | `text-white/80` ×8 · `bg-white/20` ×8 | 🔴 **SPLIT FROM B2a ON OWNER RULING (2026-07-30): this is the only part of the white batch where identity is NOT self-evident**, because the modifier **composes against the new base** rather than being carried verbatim. Small enough to be genuinely read. (Measured byte-identical — `text-fg/80` ≡ `text-white/80` → `#ffffffcc` — but *measured* is exactly why it deserves its own reviewable commit rather than being buried in 415.) |
| **B3** | **golds → `accent`** | **110** | `#F59E0B` ×40 · `-gold` ×70 | 🔴 **O-23's ruling in one commit** — the reviewable unit for "V-1 is split by source colour." Purples stay behind |
| **B4** | **status + `accent-2`** | **31** | `#10B981` ×9 → `success` · `#EF4444` ×8 → `danger` · `#C084FC` ×14 → `accent-2` | Small. 🔴 **`warning` also equals `#F59E0B`, and that choice is NOT free** — see **§3.0.2.2**. It is a permanent decision the identity gate cannot see. **Record the per-site assignment in the commit body.** |
| **B5** ✅ **UNBLOCKED** | **surfaces + scrims** | **135** | `#0F0A1A` ×14 → `bg` · `#1A1425` ×9 → `surface` · `bg-card` ×64 → `bg-surface` · `bg-background` ×44 → `bg-bg` · **`bg-black/{60,60,70,90}` ×4 → `bg-scrim/NN`** | ✅ **UNBLOCKED — the C1 enumeration is DONE (`held-collision-ledger.md` ENTRY 2) and it found B5 DOES NOT TOUCH C1.** B5's targets are `bg`/`surface`/`scrim`; C1's sides are `surface-raised`/`locked`, sourced from V-4 and V-6, **both 1b**. 🔴 **And `locked` has ZERO existing source sites** — lock state is an overlay + glyph + copy today, never a surface colour — so C1's whole exposure is **ONE decision in the primitives phase** (does `LockShell` ground in `locked` or `surface-raised`?), caught by §3.7's magenta dry-run. Superseded note: — `surface-raised`/`locked` is the **highest-risk** collision (§3.0.2.2 C1): a full lightness step apart, `locked` **carries meaning**, and **no vocabulary check separates a lock panel from a raised card.** The 11 lock sites must be named explicitly. The 4 scrims are identity **per R3** (`bg-scrim/60` ≡ `bg-black/60`). 🔴 **Run `no-bare-scrim` after this batch** — it is the first commit that gives `scrim` any call sites at all |
| **B6** | **default-ramp renames** | **293** *(of 339)* | `gray-400`→`fg-muted` ×160 · `gray-800`→`border-subtle` ×63 · `gray-300`→`fg-secondary` ×44 · `gray-500`→`fg-placeholder` ×16 · `red-500`→`danger` ×9 · `purple-400`→`accent-2` ×1 | 🔴 **Leave the 46 with no identity target** (`gray-700` ×18, `red-400` ×16, `gray-600` ×5, `red-900` ×4, `red-600` ×2, `purple-500` ×1) — they are 1b |
| **B7** | **arbitrary-value classes** | **24** *(of 27)* | `text-[#9CA3AF]` ×8 · `text-[#F59E0B]` ×6 · `bg-[#1A1425]` ×6 · `bg-[#F59E0B]` ×2 · `text-[#0F0A1A]` ×1 · `bg-[#0F0A1A]` ×1 | Last, because it is the only batch that also **drives a named gate to 0** (`(bg\|text\|border)-\[#`). 🔴 **Leave the 3 V-3/V-1 ones.** ⚠️ `ShareableQuote.tsx`'s `text-[#0F0A1A]` → `text-bg` is identity; the `on-accent` re-resolution is 1b, and it is a **W1/X6/X7 share surface** — read §7.3 |

> ### 🔴 B3 — THE GOLD ROLE ENUMERATION, COMPLETE (2026-07-30). Required by §3.0.2.2 before B3 runs.
>
> **Result: ALL 99 in-scope sites → `accent`. ZERO → `warning`.** Not one gold site in the app carries
> caution / alert / expiry / needs-attention semantics.
>
> **Form split first, because the headline 110 double-counts** (the same error B1 had):
>
> | | count | batch |
> |---|---|---|
> | `#F59E0B` quoted / JSX literals | 32 | — |
> | ├ in `BirthChartWheel.tsx` | **3** | 🔴 **DEFERRED to the §11 wheel work** (`Conjunction` is `chart.harmonious` per §1.6a, not `accent`) |
> | └ everywhere else | **29** | **B3** |
> | `-gold` classNames (`text-gold` 60 · `bg-gold` 8 · `border-gold` 2) | **70** | **B3** |
> | `[#F59E0B]` bracket classNames | **8** | **B7** — not B3 |
> | **B3 total** | **99** | |
>
> **The evidence that `warning` gets nothing** — four independent checks, all negative:
>
> 1. **No caution vocabulary** anywhere near a gold site: zero matches for
>    `expir|warn|caution|alert|error|fail|overdue|attention|invalid` across all 70 classNames **and**
>    all 29 literals.
> 2. **Genuine alerts already use RED**, not gold — 11 sites pair `#EF4444`/`text-red-*` with
>    expiry/failure/error copy. The app already has a warning colour and it is `danger`.
> 3. **`cosmic-report.tsx`'s `expired` and `failed` phases carry no gold at all** — the one surface
>    where a warning role would be most expected.
> 4. **The usage shape is uniformly brand/highlight**: 60 `text-gold` are headings, labels and values;
>    8 `bg-gold` are badges and CTAs; 2 `border-gold` are rules.
>
> **Three sub-roles appear, and all three are `accent`, not `warning`:**
>
> | sub-role | sites | why `accent` |
> |---|---|---|
> | brand / heading highlight | the bulk | §16.2's "clay is the actionable/brand thing" |
> | **achievement / score band** | `CompatibilityScoreRing.tsx` + `CompatibilityShareCard.tsx` (`score >= 90`), `ScoreCard.tsx` | Top-of-scale *reward*, the opposite of caution. ⚠️ `CompatibilityShareCard` is a **W1 share surface** |
> | **category hue** | `name-destiny` `Creativity`/`Expression`, `FocusAreaBadge` `Creativity` | A data-category tint. ⚠️ **Neither `accent` nor `warning` is really right** — but `accent` is the held-identical, lower-surprise choice. **Registered, not resolved** |
>
> 🔴 **AND THE FINDING THAT FALLS OUT OF THIS: `warning` ENDS PASS 1 WITH ZERO CALL SITES.**
> It exists in `theme.js` and §1.6a (held `#F59E0B` → Vellum `#D9A657`), and **nothing renders it.**
> At pass 5 it becomes a distinct amber that appears nowhere. Two honest options for the owner:
> **(a)** accept it as a **reserved** role, and say so in `theme.js` so a later reader does not
> "clean up" an apparently dead token; or **(b)** assign the surfaces that arguably *should* be
> warnings — candidates, all currently `danger`-red or uncoloured: `cosmic-report`'s **`expired`**
> phase · the Q&A **question-cap** notice · the **DI sub-cap** note. 🔴 **(b) is a VALUE change and
> belongs to 1b or later — it must not ride B3.**
>
> **So B3 is mechanically uniform**: every one of the 99 maps to `accent`, the assignment is recorded
> here, and pass 5 can be audited against this table rather than against an accident.



> ### ⚠️ EXPECTED, NOT A MISS: `no-raw-hex`'s KEYWORD sub-rule CANNOT REACH 0 IN 1a
>
> After B2a the keyword count is **1**, and **1 is the correct end state for pass 1a.** The survivor is
> `astrology/index.tsx`'s `color: 'black'` on the `premium_plus` PLUS badge — the single `black` keyword
> in the whole 81-keyword ledger. It is **not** migrated because **`UI-audit.md` §5.7 DELETES that badge**
> as R1 gate #10 ("a PLUS pill and its gate are one unit"). Renaming a line that is about to be removed
> is churn, and re-roling it to `on-accent` would be a V-7 decision on an element that will not exist.
>
> 🔴 **So `keywords` goes 81 → 1 in 1a and 1 → 0 in the R1 commit, not in 1b.** Recorded here so a later
> reader does not read the 1 as an incomplete sweep and "finish" it.

**Per-batch gate, every batch, no exceptions** (§3.0.1 + §1.3):

```sh
cd mobile
node scripts/resolve-utilities.js > /tmp/b<N>-before.json      # BEFORE the batch
# ... apply the batch, one literal at a time ...
node scripts/resolve-utilities.js > /tmp/b<N>-after.json
node scripts/resolve-utilities.js --map /tmp/b<N>-map.json \
     --before /tmp/b<N>-before.json --after /tmp/b<N>-after.json   # className half -> 0 not preserving
# literal half: assert each token equals the hex it replaced, against theme.js's own digits (§1.3)
npm run gate            # the batch's counts must fall by EXACTLY the sites rewritten
npx tsc --noEmit && (cd ../server && npx tsc --noEmit)
```

> ### 🔴 P-2 — REPLACEMENT LISTS ARE ORDERED MOST-SPECIFIC-FIRST, AND THE ORDERING IS AN INVARIANT
>
> **OWNER RULING (2026-07-31), generalised from B4's real bug.** B4 put the plain double-quoted form
> **before** the JSX-prop form, producing `color=t.color.success` — **a JSX attribute with no braces**,
> 2 sites in `FeatureComparisonTable.tsx`. Every earlier batch had ordered JSX-prop first **by luck**.
>
> **The invariant, stated so it can be checked:** within one batch script, a replacement whose pattern
> is a **prefix or substring** of another's must come **after** it. In practice that means, in order:
>
> 1. **JSX-prop forms** — `color="#X"` → `color={t...}` (braces REQUIRED; this is B4's bug)
> 2. **modifier-carrying classNames** — `bg-red-900/20` before bare `bg-red-900`
> 3. **role-divergent single sites** — the same literal that maps differently per site
> 4. **bulk / uniform sweeps** — last
>
> 🔴 **CONFIRMED TWICE IN 1b, in BOTH directions:**
> - **Double-quoted JSX props are a SEPARATE FORM from single-quoted values.** C6 swept `'#4fd3a6'`
>   and left four `<Ionicons color="#4fd3a6" />` untouched — same literal, different quoting, needs
>   braces. Only a post-batch grep found them.
> - **A bulk sweep destroys a role-divergent site placed after it.** C3's `weekly.tsx` holds 3 tappable
>   `text-primary` (→ `accent`) and 1 category heading (→ `accent-2`); `profile.tsx` holds three
>   `text-primary` with **three different** targets. Both were rewritten by their distinguishing
>   trailing classes **before** the bulk sweep ran.
>
> 🔴 **THE ORDERING APPLIES TO GATE PATTERNS TOO, not only to replacement lists.** `no-bare-scrim`'s
> widened regex must place `alpha\([^)]*scrim[^)]*\)` **before** the bare `scrim` branch: grep is
> leftmost-longest, so the legal helper call is consumed whole and then discarded. Put the bare branch
> first and all 17 legal calls re-appear as false positives.
>
> 🔴 **PASS 4 IS THE HIGHEST-RISK APPLICATION OF THIS RULE.** It expresses **one concept in three
> syntaxes**: inline `fontWeight:'600'`, className `font-semibold`, and the JSX-prop form. A
> mis-ordered pass-4 script produces exactly B4's unparseable output across ~501 sites instead of 2.

> ### 🔴 COMMIT AT THE END OF EACH BATCH. NEVER AT THE END OF THE SESSION.
>
> **OWNER RULING (2026-07-31). This is the THIRD occurrence, so it is procedure now, not advice.**
> 1a skipped B4 and only arithmetic caught it; 1b left ten batches uncommitted and had to
> RECONSTRUCT the per-batch history afterwards.
>
> 🔴 **PER-BATCH COMMITS MATTER MORE IN 1b–5 THAN THEY DID IN 1a.** 1a's batches were provably
> identity-preserving, so a bad batch failed its own gate. **1b, 2b, 3b, 4 and 5 change
> appearance**, and their gate is a human reading screenshots. When that review finds a wrong
> screen, **`git bisect` across the batch commits is the only cheap way to answer "which
> batch?"** One squashed commit turns that into a manual hunt across ~430 sites.
>
> **The batch is not done until it is committed.** Run the gate, paste the numbers into the
> body, commit, *then* start the next batch.
>
> **If it does happen anyway, the reconstruction is mechanical** (proven on 1b): back up the
> verified tree → reset product code to `HEAD` → re-apply each batch script in order →
> commit each → diff the final tree against the backup for byte-identity. **Scripts apply
> SEQUENTIALLY, so file overlap between batches is irrelevant.** Only per-*hunk* staging is
> lost, and that was never the method. ⚠️ **`git reset --hard` also discards uncommitted
> tracking-file edits — back those up too, not just product code.**
>
> 🟢 **AND THE REPLAY IS ITSELF A GATE — FOR A SCRIPT-GENERATED PASS.** 1b's byte-identity diff
> caught a bug nothing else could see: a replacement pattern that omitted its surrounding quotes
> produced `backgroundColor: 't.alpha(t.color.accent, 15)'` — **a STRING, not a call.** `tsc`
> accepts it (`backgroundColor` takes a string), the token gate counts it as migrated, and the
> colour simply never renders. 2a's replay caught its own tooling bug the same way (a backtracking
> marker regex that double-marked 60 lines). **Writing the batch as a re-runnable script converts a
> one-off edit into something that can be checked.**
>
> > ### 🔴 BUT THE REPLAY DOES NOT APPLY TO A PER-SITE-JUDGEMENT PASS, AND ASKING FOR IT THERE MAKES THINGS WORSE
> >
> > **OWNER RULING (2026-07-31), on pass 2b.** The replay is a gate **only because 1a, 1b and 2a
> > were script-generated**: the script is a *specification* of the edit, so replaying it on a fresh
> > tree either reproduces the interactive result — proving the edit was mechanical — or diverges,
> > which exposes a tooling bug. **The gate is the equality, and the equality is only meaningful
> > when the script fully determines the output.**
> >
> > 🔴 **Where the unit of work is a JUDGEMENT, the script does not determine the output — the
> > reasoning does, and the reasoning is not in the script.** Pass 2b's 44 off-step mappings, 13
> > role-misfit resolutions, 41 opt-in placements and 2 `leading-6` fixes are per-site calls.
> > "Replaying" them means **re-making those decisions**, so any difference is *divergence
> > introduced by the replay*, not a defect detected by it. **A check that manufactures the
> > discrepancies it reports is not a check.**
> >
> > **What replaces it, and it is not weaker for a config pass:** **layer 3.** `--diff` compares the
> > RESOLVED RULE SET, which no amount of per-site judgement can perturb. 2b's assertion is
> > *"13 rules moved — the 8 ramp steps plus the 5 `leading-*` → absent, and NOT ONE fontSize"*,
> > and that is exactly the property the pass claims. The per-site half is carried by `tsc`, the
> > named counters, and the screenshot review — which is what a VALUE pass's gate always was.
> >
> > **The test for whether a pass owes a replay:** *could the batch have been written as a script
> > whose output nobody needed to read?* If yes (1a, 1b, 2a, 3a), replay it. If no (2b, 3b, and
> > pass 4's inline half), do not — and say so in the commit body, so its absence reads as a
> > ruling rather than an omission.

> ### 🔴 THE LOSSY-BATCH RULE — A BATCH THAT DESTROYS INFORMATION SHIPS AS ITS OWN COMMIT, AND ITS ONLY UNDO IS `git revert`
>
> **OWNER RULING (2026-07-31), generalised from 2a's recovery and confirmed before 2b ran.**
>
> Most batches in this codemod are **inverse-mappable**: the old spelling is recoverable from the
> new one by reading the code, because the mapping is injective. `text-3xl` → `display-lg` can be
> undone by anyone with the table. **A LOSSY batch is one where two or more distinct old values
> map onto ONE new value, so the code no longer contains the information needed to reverse it.**
>
> 🔴 **2a PROVED THE FAILURE MODE AT A COST.** Its fractional batch mapped `15.5 → 15` and
> `14.5 → 15`. Both land on `t.type['text-sm'].size`, so **nothing in the resulting source says
> which site was 15.5** — the R1 recovery attempted an inverse mapping and came out **+40/−71**
> until the two fractional values were restored by hand from the commit.
>
> **The rule, in three parts:**
>
> 1. **A lossy batch is its own commit.** Never squashed with a neighbour, never split across two.
> 2. **Its revert path is `git revert <sha>` and nothing else.** Do not plan, write down, or
>    attempt an inverse-mapping recovery for it — the information is not in the tree.
> 3. **It must be MARKED LOSSY IN THE COMMIT BODY AND HERE, BEFORE IT RUNS.** The whole point is
>    that a later session planning a recovery has no way to discover the losslessness question by
>    reading the code; by then the evidence is gone.
>
> **🔴 THE LOSSY BATCHES IN THE REMAINING PLAN — marked up front, per part 3:**
>
> | batch | what is destroyed | why it cannot be inverted |
> |---|---|---|
> | ✅ **2a's fractional batch** (`27bb...`/`27fba83`) | `15.5` and `14.5` both → `text-sm` 15; `12.5` and `13.5` both → `text-xs` 13 | 4 source values, 2 targets. Already shipped; recorded here because its recovery already went wrong once |
> | 🔴 **2b · D2 — delete the `leading-*` scale** | the **45** per-site leading overrides (`leading-4/5/6/7/8`) | The class token is **removed entirely**. Post-D2 the source says only "this Text has no explicit leading"; which of five values it used to carry is unrecoverable. 5 values → 1 absence |
> | 🔴 **3b — the radius collapse** | 21 inline `borderRadius:` values + 6 class spellings → **5** keys | Many-to-one by construction (§6.6 C: `rounded-2xl` 14 and `rounded-xl` 12 both → `rounded-md`). D2 already classifies radius as a value pass; this adds that it is also **irreversible** |
>
> ⚠️ **2b · D1 (releasing `TYPE_FREEZE`) is NOT lossy** and the distinction is worth keeping sharp:
> it changes a config table whose old contents are one `git show` away and whose mapping is 1:1 per
> step. D1 and D2 are adjacent commits with **different** recovery stories, which is a large part of
> why the owner split them.
>
> ### 🔴 P-2 HAS THREE EVIDENCED DIRECTIONS NOW, AND THE THIRD IS NOT ABOUT REGEXES AT ALL
>
> **OWNER RULING (2026-07-31), added after pass 4's E4b violated it.** P-2 started as a rule about
> **replacement-list order**; it was then widened to cover **lookaheads and quoting**; pass 4 shows it
> governs a third thing. All three are now measured, not reasoned:
>
> | # | direction | the evidence |
> |---|---|---|
> | **1** | **replacement-list order** — most-specific-first | B4's bug: the plain double-quoted form preceded the JSX-prop form |
> | **2** | **alternation order inside one rule, and quoting is a separate form** — grep is leftmost-longest, so the legal spelling must be consumed WHOLE before the bare branch sees it | 2b's C6 swept a quoted literal and left four JSX props; `t.type["overline"]` false-positived where `t.type['overline']` did not. Now applies to `no-bare-scrim`, `no-bare-overline`, the GLYPH exception **and 🆕 `no-synthetic-italic`** |
> | 🔴 **3** 🆕 | **THE ORDER TWO WHOLE REWRITES RUN IN.** A BROAD rewrite run before a NARROW one consumes the narrow one's sites | **pass 4 · E4b.** The italic *delete* rewrite (broad: any slant declaration surrounded by commas) ran before the *replace* rewrite and consumed `combined.tsx`'s Personal Affirmation — a site that needed the quote family, left with neither italic nor family |
>
> 🔴 **DIRECTION 3's SIGNAL IS THE THING TO REMEMBER: there wasn't one, except an ADOPTION COUNT ONE
> SHORT.** `tsc` was clean, the removal counter hit 0 exactly as planned, and the site rendered — just
> in the wrong face with no emphasis. **So when a batch runs more than one rewrite, count the
> ARRIVALS per rewrite and reconcile them against the plan, not just the removals against zero**
> (§3.0.2.0.1). 14 where 15 was expected is the entire reason it was caught.
>
> ⚠️ **AND THE SYMMETRIC OBLIGATION: prove immateriality when you claim it.** E3's three className
> operations were claimed order-independent — and that claim was *tested*, by running both orders over
> a copy of the tree and diffing (byte-identical). **"Ordering doesn't matter here" is a measurement,
> not an observation.**
>
> ### 🔴 P-2 HAS NOW FIRED FOUR TIMES, AND THE FOURTH SIGNAL WAS THE WEAKEST OF ALL — SO IT GETS A MECHANICAL CHECK
>
> **OWNER RULING R-2 (2026-08-01), after pass 5 reproduced direction 1 on new code five passes
> after it was written down.** The four occurrences and — the point of the table — **four different
> instruments, in descending order of reliability:**
>
> | # | pass · batch | what it was | what caught it |
> |---|---|---|---|
> | 1 | **1a · B4** | JSX-prop form ordered after the plain quoted form → `color=t.color.success` | 🟢 **`tsc`** — unparseable output, cannot be missed |
> | 2 | **1b · C6** | double-quoted JSX props are a SEPARATE FORM from single-quoted values | 🟢 **a post-batch count** — four sites still matching |
> | 3 | **pass 4 · E4b** | a BROAD delete rewrite run before a NARROW replace rewrite consumed the narrow one's site | 🟠 **an ARRIVAL count ONE SHORT** — 14 where 15 was expected |
> | 4 | **pass 5 · commit A** | `body\|body-semi\|body-bold` matched `font-body` INSIDE `font-body-bold`, emitting `font-display-bold` — resolves to nothing | 🔴 **READING THE DIFF.** Nothing else. `tsc` clean, removal count exactly as planned, the class simply does not exist |
>
> 🔴 **OCCURRENCE 4 IS THE ARGUMENT: a human reading a diff is the only defence that scales with
> attention rather than with correctness**, and it is the one that will be skipped on the tenth batch
> of a long session. Occurrences 1–3 each had *a number that was wrong*; occurrence 4 had **no
> number at all** — because every number it produced was right.
>
> **▶ THE RULE, AND IT APPLIES FROM PASS 3a ONWARD: EVERY REPLACEMENT LIST ASSERTS A PER-PATTERN
> COUNT, BEFORE AND AFTER.** For each pattern *p* in the batch script, independently of every other:
>
> 1. **before**: `n_before(p)` = matches of *p*'s SEARCH form.
> 2. **after**: `n_after(p)` = matches of *p*'s REPLACEMENT form.
> 3. 🔴 **assert `n_after(p) == n_before(p)`, per pattern, and print both.** A pattern whose arrival
>    count is short of its own departure count had its sites **eaten by another pattern in the same
>    list** — which is every one of the four directions above, seen from one place.
>
> **Why per-pattern and not a total:** a total reconciles by accident, exactly as §3.0.2.2.2's
> residual histogram argues one level up. In occurrence 4 the TOTAL was correct — 23 sites left
> `font-body-bold` and 23 sites gained a `font-display*` spelling; only the *per-pattern* split
> reveals that 1 of them gained the wrong one. It is the same argument as *"a named reason per
> entry"*, applied to a rewrite instead of to a residue.
>
> ⚠️ **It is mechanical, so it does not depend on anyone noticing anything** — which is precisely
> what distinguishes it from the instrument that caught occurrence 4. It does **not** replace reading
> the diff; it means the diff is no longer the *only* thing standing between P-2 and a shipped class
> that resolves to nothing.
>
> ### 🔴 READ `no-white-on-accent` AFTER EVERY BATCH, NOT ONLY AT PASS END
>
> **OWNER RULING (2026-07-31), forced by C7.** A report-only rule nobody reads **is a disabled
> rule** — the same reasoning that demoted `C-f`. Add it to each batch's gate checklist.
>
> **Why C7 forced it:** `DeleteAccountModal`'s destructive buttons were `bg-red-600` + white =
> **4.83:1, PASSING AA**. C7's mechanical `red-600 → danger` map made them `#EF4444` + `fg` =
> **3.76:1, FAILING**. 🔴 **A pass whose own rule is "drive legacy tokens to zero" can
> INTRODUCE an accessibility regression while every count falls correctly.** Nothing in the
> four-layer stack sees that except this rule, and only if a human reads its output.
>
> **The check is two questions per hit:** is the ground a **FILL** or a **WASH**? (a wash
> inherits its ground's ratio, so `fg` is legal — design §16.7); and does the flagged label
> actually sit *inside* that fill? (proximity is not nesting). 1b's run: 7 hits, **all 7 false
> positives**, and the 2 genuine ones were found because the rule was read *mid-pass*.

🔴 **Two checks that are specific to a per-literal sweep and easy to skip:**

1. **Before replacing a literal globally, confirm no occurrence sits in a non-colour context** — a
   comment, an HTML entity, a non-style string. (Measured in `astrology/index.tsx`: all 45 were genuine
   colour contexts, and the 3 HTML entities in the tree are why `no-raw-hex`'s 404 reads as 401.)
2. **Confirm the deferred literals are DIFFERENT STRINGS from the migrated ones**, then verify with a
   post-batch grep that each deferred value's count is **unchanged**.

**Then, still 1a but after the batches:** `bg-card-translucent` ×1 and any residual identity renames
the seven batches did not name. **`lib/colors.ts` is NOT touched in 1a** — it and its 54 importers are
1b, deleted last (§3.2 step 4 below still applies, to 1b).

**The original per-file order, retained for 1b** (whose unit *is* the site, so file locality helps):

**Apply — file order, highest leverage first** (audit §2.6: the top 8 files hold 206 of 401 hex and
404 of 664 inline styles):

1. `astrology/index.tsx` — **52 hex, 97 inline styles, its own StyleSheet, 3 local components.**
   The single largest unit of work in the revamp. Do it first, by hand, and let it calibrate the
   estimate for everything else.
2. `readings/palm.tsx` (28) · `cosmic-report.tsx` (26, **D8 restyle-only**) · `readings/face.tsx` (23) ·
   `face-capture.tsx` (23) · `palm-capture.tsx` (22) · `readings/combined.tsx` (20) ·
   `name-destiny.tsx` (12)
3. Mechanical sweep of the remaining ~50 files.
4. **Delete `lib/colors.ts`** and repoint its 54 importers to `theme.js`. Do this **last** — it is
   the change that makes the file unopenable, so everything else should already be off it.
5. **1b's decision table (§1.6b)** — apply the owner's rulings, site by site.

**Verify:** §1.3's gate block. Then a screenshot pass on the §4.4 list for 1b only.

**Rollback:** two commits, revert independently.

---

### 3.3 PASS 2a — procedure

> ## 🟢 DONE 2026-07-31 — read §1.4's banner for what actually happened, not the block below.
> In particular the closing `grep … text-(4xl|5xl|6xl|3xl)` **does not expect 0**: `text-3xl` is 0,
> but the 30 `4xl`/`5xl`/`6xl` usages are deliberately still resolving against frozen config keys.

```sh
cd mobile
grep -rEn $INC "fontSize[[:space:]]*:[[:space:]]*[0-9]" app components   # 346
grep -rEn $INC "fontSize[[:space:]]*:[[:space:]]*[0-9]+\.[0-9]" app components  # 26 fractional
grep -rEn $INC "\btext-3xl\b" app components     # 25 → display-lg
grep -rEn $INC "\btext-(4xl|5xl|6xl)\b" app components   # 30 in 27 files — NO RAMP TARGET
```

**Apply:** the `TYPE_FREEZE` config (§1.4) · 25 `text-3xl` → `display-lg` · the 30 ceiling sites
**one at a time, each listed in the commit body** · 346 inline sizes → the ramp, with §3.5's closed
fractional table for the 28 sites in `qa.tsx` / `cosmic-report.tsx`.

⚠️ Two mappings the design got right and that a codemod will get wrong:
- **Tab-bar labels → `text-2xs` 12/16, NOT `overline`.** `overline` is **UPPERCASE-only** (§3.3) and
  the labels are Title Case.
- **`AstroNumeroBadge` large's emoji at 44 is above the ramp ceiling (30) and has no target** — it
  is one of the 30 per-site decisions, and the badge's dominant child is the **circle** (32/40/56),
  a dimension not a type, so the emoji can shrink without touching the badge height.

**Verify / rollback:** §1.4.

---

### 3.4 PASS 2b — procedure

> ## 🟢 DONE 2026-07-31 — read §1.5's banner for what actually happened, not the block below.
> Three corrections to the block, all found by running it:
>
> 1. 🔴 **"delete `theme.lineHeight`" IS NOT A DELETION — IT IS ADDING `lineHeight: {}`.** Tailwind's
>    `theme` replace is **per key**: omitting a key leaves Tailwind's DEFAULT scale in force, it does
>    not remove it. Design §6.2 omits `lineHeight` entirely, so **§6.2 as authored would leave every
>    `leading-*` utility resolving** — verified against the pre-D2 snapshot, where `leading-4/5/6/7/8`
>    were all live. An explicit empty object is the only spelling that works. Deleting that line later
>    silently resurrects the whole scale, which is why it carries a comment saying so.
> 2. 🔴 **NOT ONE COMMIT — SIX.** The owner split the pass because D2 is **LOSSY** (see §3.2's
>    lossy-batch rule) and must be independently `git revert`-able, and because the ~180 `txt()`
>    conversions moved in from pass 4. "It must stay one" was written when the pass was one config
>    edit plus two sweeps; it is now a ~380-site pass.
> 3. ⚠️ **"the 8 no-ops can be deleted without thought" is FALSE ONCE D1 HAS LANDED.** D1 turns all
>    eight into live overrides. See §1.5's per-site table.

```sh
cd mobile
grep -rEn $INC "\bleading-[a-z0-9]+" app components      # 45 — strip all
grep -rEn $INC "lineHeight[[:space:]]*:" app components   # 63
```

**Apply:** delete `TYPE_FREEZE` · **add `lineHeight: {}`** · strip the 45 `leading-*` tokens ·
resolve the 63 inline `lineHeight:` declarations · the ~180 `txt()` conversions (moved in from
pass 4) · the 44 off-step and 13 role-misfit sites 2a deferred.

**Verify:** §1.5's scope block, **then the screenshot pass, which is the actual gate.**

**Rollback:** per batch. 🔴 **D2's is `git revert` and only `git revert`** — §3.2.

---

### 3.5 PASS 3 — procedure

```sh
cd mobile
# 3a
grep -rEn $INC "\bspace-[xy]-" app components    # 2 → gap-3 on the parent
grep -rEn $INC "\b[wh]-30\b" app components      # 4 → delete
grep -rEn $INC "\bmax-w-(sm|md)\b" app components # 2 → leave, register the caveat
grep -rEn $INC "paddingHorizontal:[[:space:]]*24|paddingVertical:[[:space:]]*32" app components
# 3b
grep -rEn $INC "borderRadius[[:space:]]*:[[:space:]]*[0-9]" app components   # 162
grep -rEn $INC "\brounded(-(sm|md|lg|xl|2xl|3xl|full))?\b" app components    # 212
grep -rEn $INC "\brounded-(xl|lg)\b" app components  # ← THE 49. Hand-rewrite. Read the diff.
```

**Apply 3a:** `spacing` `extend` → replace · 2 `space-y-3` → `gap-3` · delete 4 `w-30 h-30` ·
`24`/`32` screen padding → `px-screen-x`/`py-screen-y`.
**Apply 3b:** `borderRadius` replace **plus** all 373 rewrites, atomically. The 49 by hand.

⚠️ **`StreakBadge`'s `borderRadius: cfg.height / 2` is derived from its X11 height** — see §5. The
"just use padding + `rounded-pill`" restyle is **banned on this component specifically**, because
removing the height also breaks the pill.

**Verify / rollback:** §1.6.

---

### 3.6 PASS 4 — procedure

> ## 🟢 DONE 2026-07-31 — read §1.7's banner for what actually happened, not the block below.
> ⚠️ **The second command below is the one that was WRONG, and it is `O-32`.** Anchored on the
> property plus a colon it returns **170**, not 173, and it cannot see the JSX-prop form at all.
> The correct enumeration — now what `token-gate.sh` runs — is:
>
> ```sh
> grep -rEn $INC "fontWeight[[:space:]]*[:=]" app components   # 171 = 170 colon + 1 JSX prop
> grep -rEn $INC "\bitalic\b" app components                   # 20  — the twin the plan never named
> ```

```sh
cd mobile
grep -rEn $INC "font-(thin|light|normal|medium|semibold|bold|extrabold|black)" app components  # 328
grep -rEn $INC "fontWeight[[:space:]]*:" app components                                        # 173
```

#### 🔴 RULE R — the per-site family assignment, recorded because E4 is the judgement half

The brief is right that the inline half needs FAMILY context the weight alone does not carry. But
the context is **already in the tree**: after pass 2b, an inline site that has a role has a *ramp
step*, and every step names its family. So the assignment reduces to one closed rule:

```
rank(weight):  400 -> body | 500,600 -> body-semi | 700,800,bold -> body-bold

site spreads a ramp step?
  step family is display or quote      -> DELETE the weight   (the ramp's face is the contract,
                                                               and no other Literata face ships)
  rank(step family) >= rank(weight)    -> DELETE the weight   (redundant)
  rank(step family) <  rank(weight)    -> REPLACE with the weight's family  (NEVER de-emphasise)
no ramp step                            -> REPLACE with the weight's family
```

**Measured distribution over the 171 sites** — 0 unparsed, 0 unknown weights:

| action | sites | which |
|---|---|---|
| **REPLACE**, no step | **70** | 31 × 600 · 25 × 700 · 7 × 500 · 4 × `bold` · 3 × 800 |
| **REPLACE**, step family `body` | **38** | `text-sm` / `text-xs` sites carrying 500–800 — the step is Regular, so the emphasis must be named explicitly |
| **DELETE**, step family `body-semi` | **27** | the weight was 500/600 and the step already is |
| **REPLACE**, step family `body-semi` | **20** | the weight was 700/800 — take Bold, never drop to SemiBold |
| **DELETE**, step family `body-bold` | **8** | `text-xl` / `text-2xl` / `overline` |
| **DELETE**, step family `display` | **5** | ⚠️ **3 of the 5 were 800.** Literata-Bold is 700 and no ExtraBold ships, so those go one rank *lighter* — a deliberate loss, recorded here rather than hidden |
| **TERNARY** | **2** | `compatibility/index.tsx` selection state → a ternary over two families |
| **JSX-PROP** | **1** | the birth-chart wheel — **hand-edited, weight DELETED not translated** (see below) |

> ## 🔴 THE PARAGRAPH BELOW IS WRONG, AND IT IS THE CAUSE OF `O-35`. CORRECTED AT PASS 5.
>
> *"The className half is simpler … a Tailwind size utility carries no family, so there is no
> step-family to reconcile — a pure 1:1 weight→family map with no judgement at all."*
>
> 🔴 **THAT IS THE EXACT INVERSION.** *Because* a size utility carries no family (`O-31`), the
> className half is **the ONLY half where the family must be reconciled against the step** — there is
> nothing else to supply it. The inline half has `txt()`, which already carries the step's face; that
> is why RULE R's serif branch correctly says DELETE there. On the className half the utility written
> at the site **IS** the rendered face.
>
> **Measured at pass 5: `font-display` had ZERO CALL SITES IN THE APP, and 23 of the 25
> `text-display-lg` classNames carried `font-body-bold`.** Every `display-lg` heading rendered in
> Figtree Bold. The 1:1 map below executed *faithfully* — `font-bold` → `font-body-bold`, 148 times —
> and 23 of those 148 sat on a serif step where the map had no business being mechanical.
>
> **RULE R's serif branch is ASYMMETRIC between the two paths, and both directions are right:**
>
> ```
> step family is display or quote,  INLINE     -> DELETE the family   (txt() carries the face)
> step family is display or quote,  className  -> REPLACE with font-display / font-quote
>                                                 (DELETING drops the site onto the global body
>                                                  default — the same defect, one step quieter)
> ```
>
> 🟢 The gate now covers both halves (`family-arrival-check.js`), and the paragraph is left standing
> below rather than deleted, because **a claim that caused a defect is more useful than its absence.**

**The className half is simpler than the inline half and it is worth saying why:** a Tailwind size
utility carries **no family**, so there is no step-family to reconcile — it is a pure 1:1
weight→family map with no judgement at all. 3 operations: `font-semibold` ×172 and `font-medium` ×8
→ the semi family, `font-bold` ×148 → the bold family. **Order proved immaterial** by running both
orders over a copy of the tree and diffing (byte-identical). ⚠️ The 8 `font-medium` sites are all
`text-sm` field labels and go **one rank up** (500 has no shipped face; the alternative was a rank
down into Regular, which would de-emphasise a label).

**The one site that took neither exit:** the birth-chart wheel's planet symbols. Its weight is
**deleted, not translated**, on three grounds — the planets render as astrological pictographs and a
pictograph's weight is not typography (pass 2a's own GLYPH argument); those codepoints are in
**neither shipped face**, so any family named there resolves through per-glyph fallback anyway and
the "bold" was always a synthetic skew of a fallback symbol font; and the zodiac-symbol `SvgText`
directly above it, same wheel and same kind of glyph, already carries no weight. 🔴 **The rejected
alternative was a `no-fontweight` floor of 1 — refused, because §4.6's own rule is that a floor must
never be created to avoid a decision, and a floor of 1 destroys exactly the "already 0, so a syntax
change disarms it silently" cross-check §3.0.2.0 depends on.**

#### The italic half — E4b, 20 sites, and there is only one italic face

| form | sites | action |
|---|---|---|
| inline `fontStyle` italic | **15** | → `fontFamily: t.family.quote`, keeping the site's existing step size |
| inline, already on the `quote` step | **1** | → **drop the declaration only.** `txt('quote')` already returns Literata-Italic; adding a slant *on top of a true italic* is a synthetic skew of an italic face |
| `italic` className | **4** | → the quote family utility. ⚠️ One of them (`astrology/daily.tsx`) also carried the semi family — impossible to honour, because no Figtree italic and no Literata SemiBold-Italic ship. The italic wins |

⚠️ **Two of the four className sites are `AffirmationCard` and `DestinyCard`, which §3.3 names by
name as `quote`-role surfaces** — so E4b moves them onto the face the design always intended, at
their existing size. Promoting them to the `quote` *step* (17px) is a SIZE decision and stays out.

> ## 🔴 TWO ITEMS LEFT THIS SECTION IN PASS 2b (owner scope change, 2026-07-31). READ FIRST.
>
> **1 · THE ~180 `txt()` CONVERSIONS AND THEIR P23 OPT-INS ARE ALREADY IN THE TREE.** They landed
> in 2b/D3 because they deliver 2b's own payload (leading on inline-styled text) as well as pass
> 4's. **Do not re-do them, and do not look for them here.** §1.5's banner has the measured record:
> 179 `scales: true` sites, of which 138 took the full `txt()` spread and **41 needed their opt-in
> placed at the JSX call site**, because their style lives in `StyleSheet.create` and
> `allowFontScaling` is a prop, not a style key. 59 opt-in props total.
>
> 🟢 **SO P23 IS CLOSED, AND THE CLOSURE IS STRUCTURAL RATHER THAN PROCEDURAL.** O-13/P23's whole
> risk was that pass 4 might ship `allowFontScaling = false` app-wide while the opt-ins slipped to
> a later release — shipping 2.1.0 **worse than today** for low-vision users. That can no longer
> happen: **the opt-ins are in the tree two passes before the freeze**, so the failure mode now
> requires actively deleting working code rather than merely forgetting to add it. The old fallback
> ("if pass 4 is too large, drop the global freeze") is retained below but is now nearly moot — the
> expensive half is done.
>
> **2 · `GeneratingReading`'s `minHeight` 44 → 58 ALSO LANDED IN 2b, and it had to.** It was
> scheduled here only because the scaling opt-in used to be here. §6.6.2's hazard is that
> `text-base` at the 1.3 cap makes two lines 57.2px against a 44px reservation — so the raise and
> the opt-in are **one decision**, and landing them in different passes would have shipped an
> opt-in against the old reservation. It moved with its cause.
>
> ⚠️ **What pass 4 must still do about families:** delete **`FAMILY_FREEZE`** in `theme.js`, in the
> same commit as the TTFs. 2b's `txt()` deliberately omits `fontFamily` — the five faces do not
> exist yet, and an unknown family falls back to the system font silently, which is exactly the
> partial-pass-4 §1.7 bans. **Grep `FAMILY_FREEZE`; it is one flag and one branch.**

**Apply, one commit:** 5 TTFs into `assets/fonts/` · `useFonts` in `app/_layout.tsx` gated on
`fontsLoaded || fontError` · `fontFamily` config `extend` → replace (safe: **`font-sans` has 0
usages**, re-measured at pass 0 — still 0) · 328 className rewrites · 173 inline `fontWeight:` →
`fontFamily` · **delete `FAMILY_FREEZE`** · the global scaling freeze — ✅ **O-13/P23 resolved to
(a)** on 2026-07-30, and its conversions are already in (see the box above):

```sh
# the five reading-copy steps that MUST opt back in — ✅ ALREADY DONE IN 2b/D3.
#   quote · text-lg · text-base · text-sm · text-xs
grep -rEn $INC "allowFontScaling" app components   # 59 opt-ins, placed in 2b — verify, do not re-add
grep -rEn $INC "\btext-(lg|base|sm|xs)\b" app components   # the className half
```

🔴 **THE className HALF OF P23 IS STILL OPEN, AND IT IS THE HALF NOTHING HAS TOUCHED.** 2b closed
the **inline** surface. A `<Text className="text-sm">` carries no props, so every className-typed
reading-copy site still relies on the global default and **freezes at pass 4**. That was always
true of option (a) — §3.6's own "the honest cost" paragraph says so — but it is easy to misread
2b's 59 opt-ins as the whole job. **Enumerate the className half before the freeze lands.**

🔴 **If pass 4 proves too large to land whole, the fallback is to DROP the global freeze from
2.1.0 entirely** (keep today's behaviour, raise the per-site floors, ship freeze + conversions in
2.1.1). **It is NEVER to ship the freeze without the conversions** — see §1.7's P23 block.

**Verify / rollback:** §1.7.

---

### 3.7 PASS 5 — procedure

> ## 🟢 DONE 2026-07-31 — `build27.1-pass5-vellum`. Four commits; full record in the progress log.
> **A · the display-step family arrival correction (`O-35`, 23 sites + the gate's className half) ·
> B · the colour flip (`theme.js` only) · C · display leading 38/31/26 · D · GATE_STRICT default-on.**
>
> ### 🔴 THE MAGENTA DRY-RUN IS **SPLIT**: THE STATIC HALF RAN AT PASS 5, THE VISUAL HALF MOVES TO CUT 2
>
> **Owner ruling 2026-07-31, and the reasoning is recorded because it trades attribution for a build
> cycle, deliberately.** The dry-run as specified below needs an EAS build and device screenshots per
> flipped token — six throwaway builds — which the implementing environment cannot produce (§4.1).
>
> 🔴 **THE DECISIVE ARGUMENT IS THAT AFTER THE REAL FLIP, BOTH ERROR DIRECTIONS ARE ALREADY VISIBLE.**
> A label that should be `fg` but got `on-accent` renders **near-black on a dark surface — invisible**;
> the reverse renders **light-on-clay — visibly low-contrast**. Cut 2's capture list already checks
> `on-accent` legibility across the 16 gradient sites (ENTRY 6). **So the magenta run's unique value
> is ISOLATION — *which token* caused it — not DETECTION. That makes it a DEBUGGING TOOL, not a gate.**
> It stays documented, in full, below: 🔴 **it is the path to take IF CUT 2 LOOKS WRONG**, and it is
> the fastest way to attribute a wrong colour to a token rather than hunting the site by hand.
>
> ### 🟢 WHAT RAN INSTEAD, AND FOUR OF THE SIX ASSERTIONS CAME OUT STRONGER THAN MAGENTA COULD
>
> **The STATIC ARRIVAL VERIFICATION**, immediately before the flip. The four expect-zero assertions
> are the ones §3.7 itself calls "the strongest checks available", and 🔴 **a grep proves an absence
> better than a screenshot does** — a screenshot proves nothing highlighted *on the screens you
> captured*, a grep proves nothing exists *anywhere in the tree*:
>
> | assertion | expected | **measured** | what it proves |
> |---|---|---|---|
> | `warning`, every spelling | ZERO | 🟢 **0** | B3's all-99-golds-to-`accent` claim, measured not hoped |
> | `locked`, every spelling | ZERO | 🟢 **0** | C1's whole exposure really is the one `LockShell` decision, and it is still ahead |
> | `chart.harmonious` / `chart.tense` | only `BirthChartWheel` | 🟢 **0 code references anywhere** | §7.3's allow-list held **VACUOUSLY** — the strongest form. C4/C5 were never misassignable |
> | `scrim` | 21 sites, `SunSignReveal` at /90 | 🟢 **21** — 4 className (70/60/**90**/60) + 17 inline (16×60, 1×85) | R3's per-site modifiers survived; ENTRY 5's 17-not-16 correction holds |
> | `surface-raised` vs `surface-overlay` | the V-4 split | 🟢 **32 / 1**, V-4's 26 all as assigned | the two hold DIFFERENT values, so this one was always gate-visible |
> | `on-accent` | == the ledger, both directions | ⚠️ **73 code sites; every one on a real accent-family FILL, but the ledger names ~45** | see the two findings below |
>
> **AND ONE THING NO SCREENSHOT COULD HAVE DONE AT ALL:** `scripts/alpha-callsite-check.js` **invokes
> all 120 `alpha()` call sites against the flipped `theme.js`.** 17 of them sit inside
> `StyleSheet.create`, i.e. module scope, where a throw runs at *import* and the app dies white before
> the root ErrorBoundary exists — an unrenderable screen cannot be photographed. 🔴 **It also measured
> §3.0.2.2.1 in the direction nobody predicted:** the plan foresaw a value-shaped guard *starting* to
> throw on `border-subtle`; the worse half is that it would have **STOPPED** throwing on
> `surface-raised`/`surface-overlay`/`locked`, which are plain hex now. A guard that silently opens
> beats a guard that loudly closes, and only the role-shaped form survived both.
>
> ### 🔴 THE TWO FINDINGS THE STATIC HALF PRODUCED, NEITHER OF WHICH THE MAGENTA RUN WOULD HAVE FOUND
>
> 1. 🔴 **`O-35` — 23 `display-lg` headings were rendering in FIGTREE, and `font-display` had ZERO
>    call sites in the app.** A colour dry-run cannot see a typeface. Fixed as commit A, and the
>    className half of `family-arrival-check.js` now gates it (0, re-validated in both directions:
>    exactly 23 on the pre-fix tree, 0 after).
> 2. 🔴 **`DeleteAccountModal.tsx`'s "Delete My Account" label was LEDGER DRIFT** — ENTRY 5 items
>    24–25 record *both* destructive buttons as `on-accent`; only `Continue` took it. `fg` on `danger`
>    was 3.76:1 held and **the flip makes it 3.26:1**. Corrected two-state (`on-accent` armed /
>    `fg-disabled` disabled). ⚠️ **Magenta on `on-accent` would have shown this site NOT highlighting
>    — but only if a reviewer noticed a button that failed to light up**, which is the weak direction
>    of a visual check. The ledger re-read found it in one pass.
>
> ⚠️ **AND THE `on-accent` SET IS LARGER THAN THE LEDGER, IN ONE DIRECTION ONLY.** All 73 code sites
> sit on a genuine `accent`/`accent-2`/`success`/`danger` fill — read individually, no exceptions — so
> **nothing was over-applied**. But ~28 of them are not named in ENTRY 5 or ENTRY 6: they arrived via
> the C-batch className renames, the border ruling's 4 `name-destiny` labels, and per-site A5 fixes
> made after ENTRY 5 was written. 🔴 **The ledger is a record of DECISIONS, not an index of SITES, and
> the two drifted apart the moment batches kept fixing A5 correctly without appending.** ENTRY 7 now
> records the measured set; the lesson is in §3.0.2.2.2's residual-histogram argument one level up.
>
> ---
>
> ## 🔴 THE MAGENTA DRY-RUN — retained IN FULL as the debugging path for cut 2
> ### Originally specified as 🔴 **PASS 5's ARRIVAL GATE** (§3.0.2.0.1) — see the split ruling above.
>
> **NAME IT THAT WAY, on owner ruling 2026-07-31.** `no-raw-hex` reaching its floor is a REMOVAL
> assertion: it proves the literals are gone. It cannot show an element that received a *plausible*
> token instead of the *right* one — which is precisely what a held-value collision is, and precisely
> what pass 4's 9 wrong-family sites were one family over. **Flipping every token to magenta and
> reading the screens is the only instrument that asserts ARRIVAL on a colour pass.** Treating it as a
> collision check that happens to catch this is how it gets skipped when the collision list looks
> short.
>
> **Owner ruling 2026-07-30, reframed after the C1 enumeration.** The dry-run was introduced to catch
> wrong held-value-collision assignments. Two of those collisions turned out to be **eliminated by
> ordering** (C1, C2 — see below), which makes the dry-run *more* valuable, not less: what it is
> actually for is **the one assertion class this repo has no other instrument for.**
>
> 🔴 **`no-white-on-accent` is permanently REPORT-ONLY and structurally blind** (§3.0.2.1): proximity is
> not nesting, a fill and its label routinely sit in different style objects, and **two of
> `astrology/index.tsx`'s six A5 pairs are `StyleSheet` entries that no proximity window can ever
> pair.** So **the magenta run is the ONLY mechanism that can verify the A5 contrast fix actually
> landed.** Nothing else in the four-layer stack (§4.5) can see it.
>
> **Method.** In `theme.js`, set **one** token to magenta `#FF00FF`, build, screenshot the §4.4 list,
> revert. One token at a time so the highlight is unambiguous. 🔴 **Throwaway — never commit it.**
>
> | flip | expected highlight | what it proves |
> |---|---|---|
> | **`on-accent`** | 🔴 **EXACTLY the A5 fill-label sites** — the 6 in `astrology/index.tsx`, the paywall CTA label + spinner, `PremiumBadge`, `WeeklyDayCard`, `compatibility/index.tsx` | 🔴 **THE POINT OF THE WHOLE EXERCISE.** The A5 fix is otherwise unverifiable. A fill-label pair that does **not** highlight was missed; anything else that does was over-applied |
> | **`warning`** | **ZERO elements** | Proves B3's central claim — all 99 golds went to `accent`, none to `warning`. If anything highlights, a gold was misassigned and pass 5 would have split the palette silently |
> | **`locked`** | **ZERO before the primitives phase**; exactly the lock surfaces after | Proves `locked` has no accidental call sites, then proves `LockShell` grounded on the token it meant |
> | **`chart.harmonious` / `chart.tense`** | **ONLY `BirthChartWheel`** | Proves §7.3's allow-list held. Any other file highlighting means the chart namespace leaked, which is a **pass-5 correctness** failure, not untidiness |
> | **`surface-raised`** | every raised card, and **no lock surface** | The other half of C1, read from the opposite side |
> | **`scrim`** | the 4 className scrims + the 16 rgba overlays | C3 — low harm, but free to check while the rig is set up |
>
> 🔴 **FOUR OF THE SIX ASSERTIONS ARE "EXPECT ZERO", AND THOSE ARE THE STRONGEST CHECKS AVAILABLE.**
> An expect-zero assertion cannot be satisfied by accident: there is no partial credit, no judgement
> call about whether the right thing highlighted, and a single stray element is an unambiguous failure.
> **Do not skip them on the grounds that they are empty** — "zero highlighted elements" is exactly the
> claim that is otherwise unprovable.
>
> **Why the two collisions it was designed for are already closed** (recorded so nobody re-derives it):
>
> - **C1 `surface-raised`/`locked` — eliminated by ORDERING.** `locked` has zero source sites, and its
>   call sites are **created in the primitives phase, which runs AFTER pass 5.** By then the two values
>   are **already visibly distinct** (`#2A2521` vs `#1E1A17`), so whoever grounds `LockShell` picks a
>   token and can **see** the result. 🔴 **The ambiguity exists only while both sides are held at one
>   value, and neither side is ever written during that window.**
> - **C2 `accent`/`warning` — eliminated by ABSENCE.** `warning` has zero call sites (B3, four
>   independent negative checks), so there is nothing to misassign. The collision is **dormant** and
>   re-arms only when the screens phase assigns `warning`.
>
> **Both remain in the dry-run anyway**, because "eliminated by ordering" is an argument and the
> dry-run is evidence.

```sh
cd mobile
git diff --stat            # must be exactly: mobile/theme.js | N +- , 1 file changed
```

**Apply:** the `color` + `chart` objects, HELD → Vellum (§1.6a). Nothing else, in any file.

> ### 🔴 PASS 5 DELIVERABLE — `GATE_STRICT=1` CANNOT GO DEFAULT-ON WITHOUT AN ALLOW-LIST
>
> **Owner ruling (2026-07-31), the operational consequence of putting `BirthChartWheel` in the
> SCREENS phase.** §4.6 item 2 says *"after pass 5, flip the hook to blocking, because at that point
> every count is 0."* 🔴 **Every count will NOT be 0.** The wheel is screens-phase work, so its
> **11 hex + 1 rgba sit at `no-raw-hex`'s floor until AFTER pass 5** — a KNOWN, NAMED residual, not
> a leak.
>
> **So the pass-5 commit must also add a `BirthChartWheel.tsx` allow-list to `no-raw-hex`,
> mirroring §7.3's existing `theme.chart` exception**, or the flip is blocked by a residual the plan
> itself scheduled. 🔴 **Implement it as "this file may hold raw chart literals until §11.4 lands",
> NEVER as `--exclude=BirthChartWheel.tsx`** — a blanket exclude permanently exempts the file and is
> exactly what §3.0.2's allow-list note forbids. **Remove the allow-list when §11.4 ships.**
>
> ### 🟢 SHIPPED 2026-07-31 — AND THE PREMISE WAS BROKEN TWICE OVER, NOT ONCE (`O-36`)
>
> The box above found ONE reason "every count is 0" is false. **There is a second, larger one, and it
> is structural rather than scoped: 🔴 PASS 5 IS NO LONGER THE LAST PASS.** The owner's reorder runs
> **2a → 2b → 4 → 5 → 3a → 3b**, so at the moment the hook goes blocking, two *decreasing counters*
> are still mid-flight and owed by passes that have not run — **177 legacy radii (3b)** and **6 dead
> spacing classes (3a)**. §3.7 and §4.6 were both written when pass 5 was last.
>
> **Three options; two of them are wrong, and the wrong ones are the tempting ones:**
>
> | | | verdict |
> |---|---|---|
> | **(a)** | block on them | 🔴 **EVERY PUSH FAILS until 3b lands.** That is §4.6's own *"a lockout, not a gate"*, and a lockout is defeated with `--no-verify` on day one and then never re-armed |
> | **(b)** | fold them into the named floors | 🔴 **Launders a TRANSIENT residue into a PERMANENT one.** §4.6: *"none of them may be closed by widening an exception — that is how a floor turns into a leak."* A floor with no owner and no removal condition never gets removed |
> | **(c)** 🟢 | **name them, attribute them to the owing pass, PRINT them every run, do not block** | keeps every OTHER rule genuinely blocking from today, and the debt keeps a named debtor |
>
> **(c) shipped**, as `GP()` in `token-gate.sh` — a *pending-pass counter*. It differs from `S()` in
> that a pending count is **a debt with a named debtor**, and from `G()` in that it does not block.
> 🔴 **WHEN 3a AND 3b LAND, CONVERT THEIR RULES BACK TO `G()` AND DELETE `GP()`** — a `GP()` with no
> callers is the signal that the revamp's counters are finally closed. Registered as an owner action.
>
> **Two more things pass 5 had to do before the hook could block, both self-reporting:**
>
> - **`no-raw-hex` now discards the HTML-entity form itself.** §0.2 had ALWAYS subtracted the three
>   glyph escapes in prose (*"404 grep hits − 3 HTML entities = 401"*). 🔴 **A rule that does its own
>   arithmetic beats a baseline with a footnote, because the footnote is what gets lost** — and the
>   footnote *had* been lost: the residue was carried as an unexplained `15` for two passes. Both
>   numbers still print. ⚠️ Alternation most-specific-first (P-2): the entity branch starts one
>   character earlier than the `#`, so grep consumes it whole.
> - 🔴 **The 7 ABOVE-CEILING sites are now MARKED IN-FILE**, using the same `/* … */` idiom as GLYPH.
>   §4.6 named this floor and enumerated the 7 *by file*, but they carried no marker — so the floor
>   was **a number in a document rather than a judgement recorded at the site**, which is what §0.1
>   rules against (a line-numbered list rots) and §5.3 item 2 argues against (put the reason where the
>   person about to "normalise" it will read it). **GATE_STRICT going blocking turns this floor from a
>   note into a load-bearing subtraction, and a load-bearing subtraction has to be auditable.** They
>   are counted SEPARATELY from GLYPH and never summed, so neither can absorb growth in the other.
>
> 🔴 **AND THE ESCAPE HATCH IS `GATE_LENIENT=1`, NOT `--no-verify`, ON PURPOSE.** Both bypass the
> gate; only one leaves a trace on the command line and in shell history, and only one prints "say why
> in the commit body" on its way past. **Give people a labelled door and they stop using the
> unlabelled one.** Proven in both directions before shipping: an injected raw hex exits **1**, the
> same tree under `GATE_LENIENT=1` exits **0** and says so, and the clean tree exits **0**.
>
> 🟢 **`npm run gate` now exits 0 for the first time since pass 0.** That is a change in what the exit
> code MEANS — from *"there are still sites to migrate"* to *"nothing outside a named residue"* — and
> it is the state §4.6 said the gate has to reach before it is worth having.

**Verify / rollback:** §1.8. `git revert <sha>`.

---

## 4. VERIFICATION STRATEGY — and its limits, stated plainly

### 4.1 🔴 What this environment cannot do

Four hard facts, none negotiable, all of them shaping everything below:

1. **There is no staging.** One live production backend. The Build-27 staging Railway project was
   torn down and the app is hardwired to prod via `app.json` `extra.apiUrl` + `eas.json`'s
   `EXPO_PUBLIC_API_URL`. **There is no pre-release device-test path** for anything server-touching.
   A pure-UI revamp is mostly unaffected — but "mostly" is doing work: pass 1 touches the paywall and
   pass 4 touches the root layout's splash sequence, and both are verified against live prod.
2. **There is no CI.** Verified: no `.github/`, no workflows, no test runner
   (`"test": "echo \"Error: no test specified\" && exit 1"`), no Jest, no Detox, no Maestro, no
   Storybook. **The gate runs where a human runs it**, and the prepush hook does not exist yet (§1.2).
3. **There is no screenshot-diffing capability, and standing one up is its own project.** Automated
   visual regression on React Native needs a device farm or a simulator harness plus a baseline
   store — new tooling, new native build config, and on a repo with no test infrastructure at all
   that is a larger change than the revamp it would be verifying. **This plan does not assert a
   screenshot-diff gate, because such a gate cannot run here.** §4.2 is what replaces it.
4. **`rg` is not on PATH**, so the authored gate is inoperative as written (§0.2). Ported to `grep`.

### 4.2 What replaces screenshot diffing: the rule-resolution harness

The identity passes' claim is about **resolved token values**, not rendered pixels. That claim *is*
mechanically checkable, at the exact layer where it is made — and it was **built and verified this
session**, not proposed.

**`mobile/scripts/resolve-utilities.js`** compiles `tailwind.config.js` with the repo's own
`tailwindcss@3.4.19` CLI through `nativewind@4.2.4`'s preset **over the repo's real `content`
globs**, then feeds the emitted CSS through `react-native-css-interop@0.2.4`'s
`cssToReactNativeRuntime` at the `inlineRem` **parsed out of `metro.config.js`**. That is byte-for-byte
the production resolution path: `withCssInterop` holds its options in a **closure** and hands them
straight to that same function (`react-native-css-interop/dist/metro/index.js:69,76,168`) — which is
also why `inlineRem` never appears on the resolved Metro config object.

It emits a stable, sorted JSON map `className → { resolved RN declarations }` and has three modes:

| mode | asserts | exit |
|---|---|---|
| *(default)* | produce a snapshot | 0 |
| `--diff before after` | **no rule's resolved value moved** | 0 iff none moved |
| `--map table --before A --after B` | **an old→new mapping table is value-preserving** | 0 iff all preserving |

**Verified working this session, against the live tree:**

```
inlineRem=16  rules=225                     <- matches §6.6 A's "225 emitted rules" exactly
text-sm       {"fontSize":15}               <- no lineHeight, exactly as §6.6 D states
text-base     {"fontSize":16,"lineHeight":24}
text-lg       {"fontSize":18,"lineHeight":28}
text-3xl      {"fontSize":30,"lineHeight":36}
p-6           {"padding":24}                <- §6.6 B: 21 @14 -> 24 @16
h-12          {"height":48}                 <- §6.6 B
rounded-2xl   {"borderRadius":16}           <- §6.6 C: the reversal, confirmed
rounded-lg    {"borderRadius":8}
leading-5     {"lineHeight":20}             <- §6.6 E
h-px          {"height":1}                  <- literal 1px, never moved
max-w-sm      {"maxWidth":384}              <- the rem-valued survivor
text-gray-400 {"color":[{},"rgba",[156,163,175,[{},"var",["--tw-text-opacity",1],1]]]}
space-y-3     null                          <- ABSENT from the runtime rule set. D4 confirmed
w-30          null                          <- ABSENT. dead at both baselines
```

Exit codes verified meaningful: an unchanged tree diffs to `0 rule(s) moved`, exit 0; perturbing a
single rule yields `1 rule(s) moved`, exit 1.

**Three limits, stated rather than papered over:**

- **Colour values resolve as unevaluated `rgba(...)` descriptors carrying a `--tw-*-opacity` CSS-var
  indirection.** The RGB triple is directly readable (`156,163,175` = `#9CA3AF` ✅), so structural
  identity is assertable — but the harness does not *evaluate* the var. For pass 1's literal half,
  assert on `theme.js`'s own hex digits (§1.6a) as well.
- **15 of the 225 rules resolve to `{}`** — `block`, `fixed`, `filter`, `ease-*`, `outline`,
  `static`, `!visible`, `backdrop-blur`, `collapse`, `inline`. Genuinely web-only no-ops, not a
  harness failure.
- **The harness sees `className` only.** It cannot see the **664 inline `style={{}}` objects** or the
  **16 `StyleSheet.create` blocks**, which is where most real spacing and colour lives. That
  asymmetry was already the audit's headline conclusion. The harness verifies the *token* layer; the
  greps verify the *source* layer. **Neither verifies the screen.**

### 4.3 🔴 What "pixel-identical" means operationally, for an identity pass

> For an IDENTITY pass, **"pixel-identical" means exactly this and nothing more**: for every
> `(old class, new class)` pair in the pass's mapping table, the resolved React Native declaration
> set emitted by `cssToReactNativeRuntime` for the **old** class under the **old** config equals the
> set emitted for the **new** class under the **new** config, byte for byte, for every property the
> old class set.
>
> **It does NOT mean "the screenshots match."** Nothing in this repo can assert that automatically,
> and no gate in this plan claims to. A pass can be provably value-preserving at the token layer and
> still look different if a site's *inline* style disagreed with its class — which is precisely the
> `w-30 h-30` failure mode, at scale.

Applies to **1a · 2a · 3a**. Explicitly does **not** apply to 1b, 2b, 3b, 4 or 5.

### 4.4 The manual screenshot pass — 🔴 **AFTER-ONLY, AGAINST SPEC. NOT a before/after diff.**

> ## 🔴 OWNER RULING (2026-07-31): THERE IS NO VALID PRE-REVAMP BASELINE, AND ONE IS NOT WANTED.
>
> **The "free baseline" premise is DELETED — do not re-derive it.** It read: *"pass 1a is
> pixel-identical to production, so the production screenshots are the pre-1b baseline."* **The
> first clause is true of 1a and FALSE of the branch**, because pass 0's **`inlineRem` flip moved
> 107 of 225 rules across 1,763 usages and de-inverted the radius ramp.** The branch is production
> **PLUS a 14.29% rescale**, so every before/after diff would be **dominated by the flip rather
> than by the pass under review** — the reviewer would spend the session re-confirming a change
> that is already gated and value-proven at layer 3.
>
> **THEREFORE: capture AFTER ONLY. No second build.**
>
> 🔴 **AND THE QUESTION CHANGES WITH IT.** 1b, 2b, 3b, 4 and 5 are *meant* to change appearance, so
> the reviewer's question is **NOT "did this change?"** — it is **"does this match the design's
> intent?"** That is answerable from the after alone, against **§2's token table**, **§6.2's
> values** and **§10's three comped screens**.
>
> 🟢 **"Did something change that shouldn't have?" is already covered BETTER by four instruments
> than by eyeballing:** the token gate's decreasing counters · the residual histogram (§3.0.2.2.2) ·
> the gradient-fill register (`held-collision-ledger.md` ENTRY 6) · `resolve-utilities.js --diff`.
> A human comparing two screenshots is the *weakest* available detector of unintended change and
> the *only* available judge of intent. Point them at the thing only they can do.
>
> 🟢 **CONSEQUENCE: the four captures with no plausible production baseline stop being a problem.**
> #13's safety-decline thread, #14's `ready` phase, #17 `DeleteAccountModal` and #18
> `GeneratingReading` had nothing to match against — and now neither does anything else. **Capture
> them after-only against spec like the rest.**

The rig still matters, so a capture is legible and reproducible for the NEXT pass's review.

**Rig — hold every one of these constant across a before/after pair:** one physical device · one OS
version · OS font size at **default** · OS display size at **default** · dark mode (the app is
dark-only) · the same account at the same tier · airplane mode **off** · the same scroll position,
reached by the same gesture count.

**The list — 18 captures, covering every leverage item and every invariant surface:**

| # | screen / state | why it is on the list |
|---|---|---|
| 1 | `home.tsx` top — greeting, StreakBadge, AstroNumeroBadge, quick actions | highest traffic; **X11, X12, X13a/b** |
| 2 | `home.tsx` This Month + Explore ×7 + Recent ×5 | **X13c `minHeight:200` (O-7), X13d**; the Explore emoji→Ionicon change is the biggest single visual change on Home |
| 3 | `readings/index.tsx` full scroll | **X14 ×7 `minHeight:140` + 7 × `overflow:'visible'` wells (X17)** |
| 4 | `readings/face.tsx` — a locked section | `SectionCard` + `LockedSection`, one of three lock treatments |
| 5 | `readings/palm.tsx` — score bar | 28 hex; the local `ScoreBar` duplicate |
| 6 | `readings/combined.tsx` — the full-screen lock | early-return lock (audit §5.6) |
| 7 | `astrology/index.tsx` top — Big Three + generate CTA | **the worst scatter file: 52 hex, 97 inline styles**; the A5 violation ×2 |
| 8 | `astrology/index.tsx` — BirthChartWheel | **I-5**; the 320dp overflow risk |
| 9 | `astrology/index.tsx` — PlanetCard ×10 + LifeThemeCard ×5 | the R1 life-theme fix |
| 10 | `astrology/monthly.tsx` — a `LockedSection` | **B1**, the decorative lock over data already on the wire |
| 11 | `numerology/index.tsx` bottom | **X15**; the `fontSize:40, lineHeight:50` emoji reservation (**X17**) |
| 12 | `profile.tsx` — avatar + tier + disclaimer | **the two dead `w-30 h-30`**; the truncated inline disclaimer (**X9**) |
| 13 | `qa.tsx` — a normal thread **and** a safety-decline thread | **D8**; **Q1's eight gates**; 14 of the 28 fractional sizes |
| 14 | `cosmic-report.tsx` — `generate` and `ready` phases | **D8**; the other 14 fractional sizes |
| 15 | `(paywall)/index.tsx` full | **highest revenue leverage**; **X19**; A5; the two uncovered `Alert` paths (**I-3**) |
| 16 | `(auth)/welcome.tsx` and `(auth)/login.tsx` | **X2**; the `h-px` hairline ×4; the `space-y-3` → `gap-3` fix |
| 17 | `DeleteAccountModal` — both buttons | **X20**, the only fixed-height + `className`-typed pair in the app |
| 18 | `GeneratingReading` mid-wait, at a 1-line **and** a 2-line rotating message | **X17 `minHeight:44`→58 (D3)**; the 0.97 asymptote; the wait users actually stare at |

**Which passes require it:** 1b (V-1's purple→gold is visible) · **2b (mandatory — it *is* the
gate)** · 3b (the 73-site radius decision) · **4 (mandatory — must prove all five faces render
distinctly)** · **5 (mandatory, full list)**. Not required for 0, 1a, 2a or 3a, whose claims are
mechanical.

### 4.5 The four-layer stack, summarised

| layer | proves | tool | runs when |
|---|---|---|---|
| **1 · type** | no token name is misspelled across ~4,200 edits | `npx tsc --noEmit` ×2 + `theme.d.ts` | every pass |
| **2 · source** | no legacy token, literal, weight, radius spelling or `leading-*` survives | `scripts/token-gate.sh` — 7 named rules + 🆕 **`no-bare-scrim`** (R3) + the dead-class grep | every pass |
| **3 · token** | resolved values did not move where they must not — 🔴 **AND it is the SOLE defence against ENUMERATION-INCOMPLETENESS (§3.0.2.0 class 4): the only layer that sees "this class no longer RESOLVES", because it compares the resolved rule set instead of searching source.** It caught `orange`, which no grep was looking for | `scripts/resolve-utilities.js --diff` / `--map` | 0, 1a, 2a, 2b, 3a, 3b, 5 — 🔴 **and EVERY batch that edits `tailwind.config.js` or `theme.js`** |
| **4 · screen** | it actually looks right | **a human, on the §4.4 list, on a device** | 1b, 2b, 3b, 4, 5 |

**Layer 4 has no substitute and no automation.** Say so in the release notes rather than implying a
visual gate exists.

### 4.6 🔴 THE GATE IS **ADVISORY BY CONSTRUCTION**, and every identity claim rests on it

> Stated plainly rather than left implied, per owner action **P22**.

`.githooks/pre-push` now exists and `core.hooksPath` is set (pass 0). That is a real improvement on
nothing. It is **not** enforcement, and the plan should not be read as if it were:

| the hole | why it is unclosable here |
|---|---|
| **There was no enforcement of any kind before pass 0.** No CI, no test runner, no husky, no `.git/hooks` beyond `*.sample`, no `core.hooksPath` | §4.1. The gate script authored in the design was, until pass 0, *a description of nothing* |
| 🔴 **`git push --no-verify` defeats the hook.** One flag, no record, no warning | That is what pre-push hooks *are*. There is no server-side hook and no branch protection to back it up |
| 🔴 **`core.hooksPath` is LOCAL config and is NEVER carried by a clone** | So the hook is inert on a fresh clone, on a second machine, and for any future contributor — until someone runs the one-line `git config` **again, per clone**. Registered as a standing owner action, not a one-time task |
| **Nothing runs the `--diff` identity harness automatically** | It is inherently a two-snapshot check (before/after a *pass*), which cannot be expressed as one pre-push invocation. It belongs to §3.0.1's ritual, run by a human, per pass |
| 🔴 **The token gate is wired REPORT-ONLY, deliberately** | It exits nonzero **by design** from pass 0 until pass 5 — counting the ~4,220 sites still to migrate *is its job*. §1.2's snippet runs it under `set -e`, which would fail **every push for the entire duration of the revamp, starting with the pass-0 commit itself.** That is a lockout, not a gate. `tsc` blocks (clean today, ×2); the token gate reports. `GATE_STRICT=1 git push` enforces on demand |

| 🔴 **A PERMANENT-INVARIANT RULE CAN BE SILENTLY DISARMED BY THE CODEMOD ITSELF** | See **§3.0.2.0**. `no-white-on-accent`, `no-bare-scrim` and (after pass 4) `no-fontweight` have a target of **0 forever** and a count that is **already 0**, so there is no counter to cross-check them. A pass that changes the syntax they match **turns them off while they keep reporting 0.** Pass 1a did exactly this: rewriting `#F59E0B` → `t.color.accent` took `astrology/index.tsx` from 1 reported hit to 0 with **nothing fixed.** 🔴 **Before every remaining pass: list the permanent-invariant rules that pass could blind, widen them, and re-run the widened pattern against the PRE-migration tree to prove it still finds the known sites.** A widened rule that finds nothing on old code has only moved the blind spot |

**The consequence, said once and not softened:** **the gate runs only when someone runs it.** Every
"IDENTITY", every "provably value-preserving", every "0 moved" in §1 and §4.3 is a claim about
**what a human chose to execute**, not about what the repository guarantees. Two things follow:

1. **Run `npm run gate` and the §3.0.1 snapshot ritual at the start AND end of every pass**, by
   hand, and paste the numbers into the commit body. The commit message is the only durable record
   that the check ran — there is no build log to appeal to.
2. 🟢 **DONE AT PASS 5 (2026-07-31): the hook is BLOCKING.** ~~At that point every count is 0~~ —
   🔴 **and that clause was FALSE IN THREE INDEPENDENT WAYS**, which is worth spelling out because
   each one needed a different mechanism and the first two were the only ones anyone had noticed:
   - **`no-raw-hex` has a named floor** — `BirthChartWheel`'s 11 hex + 1 rgba, until §11.4. Shipped
     as a **file-scoped, printed, subtracted** exception (never `--exclude=`); see §3.7's box.
   - 🔴 **`no-numeric-fontsize` CAN NEVER REACH 0.** 60 permanent GLYPH sites + 7 ABOVE-CEILING —
     the latter now **marked in-file** at pass 5, because a load-bearing subtraction has to be
     auditable at the site rather than in this table. `no-variable-fontsize` (11) is report-only.
   - 🔴 **AND THE ONE NOBODY HAD WRITTEN DOWN: PASS 5 IS NO LONGER THE LAST PASS.** The reorder runs
     2a → 2b → 4 → 5 → **3a → 3b**, so 177 legacy radii and 6 dead spacing classes are still owed by
     passes that have not run. Blocking on them is a lockout; folding them into the floors turns a
     transient residue into a permanent leak. Both were refused — see `O-36` and §3.7's box for the
     `GP()` pending-pass class that resolved it.

   The gate is now a genuine regression guard, which is the only state in which it earns its keep.
   Escape hatch: **`GATE_LENIENT=1 git push`** — deliberately NOT `--no-verify`, because it leaves a
   trace and prints an instruction to justify itself in the commit body.

> ### 🔴 THE NAMED FLOORS — RULES THAT WILL NEVER READ 0, AND WHY EACH IS CORRECT
>
> §4.6 item 2 assumed every decreasing counter reaches 0. **Three do not.** Each is a deliberate,
> reasoned residue; each must be in the `GATE_STRICT` allow-list before the hook can block; and
> **none of them may be closed by widening an exception**, which is how a floor turns into a leak.
>
> 🟢 **ALL THREE ARE NOW SELF-SUBTRACTING AND SELF-REPORTING (pass 5), and that is what let the hook
> go blocking.** Each prints `live / excepted / raw` and fails only on `live`, so an excepted set that
> grows says so in the output rather than in a document nobody re-reads.
> ⬜ **AND THERE IS A FOURTH CATEGORY, WHICH IS NOT A FLOOR — `PENDING` (`O-36`).** The 177 legacy
> radii (3b) and 6 dead spacing classes (3a) are owed by passes the reorder moved AFTER pass 5. They
> are **a debt with a named debtor**: printed every run, attributed to the owing pass, deliberately
> non-blocking, and converted back to a hard `G()` rule the moment that pass lands. 🔴 **Do not let
> them drift into this table.** A floor is permanent and reasoned; a pending counter is temporary and
> owned. Collapsing the two is precisely how a floor becomes a leak.
>
> > ### 🔴 R-3 — EVERY `PENDING` ENTRY CARRIES AN **EXPIRY**, AND WHEN ITS PASS LANDS THE ENTRY MUST *VANISH*
> >
> > **OWNER RULING R-3 (2026-08-01).** *"Attributed, printed, non-blocking"* is right and is not
> > weakened. What it was missing is the half that makes it terminate:
> >
> > 1. **Each entry NAMES THE PASS THAT CLEARS IT** — 177 radii → **3b**, 6 dead classes → **3a**.
> >    `GP()` already prints the owner, so this half was shipped at pass 5.
> > 2. 🔴 **AND WHEN THAT PASS LANDS THE ENTRY MUST DISAPPEAR — converted back to `G()`, not merely
> >    observed to read 0.** A `GP()` that survives its own pass is **not a cleared debt, it is a
> >    finding**: either the pass did not do what it claimed, or a transient residue has quietly
> >    become permanent, and those are the two failures the category was invented to keep apart.
> >
> > **The reasoning, because it generalises past this revamp:** a floor is defended every time
> > someone reads it; a pending counter is defended by *nobody*, because its whole contract is "this
> > is fine for now." 🔴 **Without an expiry, non-blocking residue is where things go to be
> > forgotten** — and it is worse than a floor precisely because it reads as temporary, so no
> > reviewer ever asks it to justify itself. `O-36` is the proof of the failure mode one level up:
> > a precondition phrased *"after pass N"* silently expired when N stopped being last, and **nothing
> > in the gate could say so** because nothing in the gate was dated.
> >
> > **▶ STATUS, and it is deliberately not tidy:**
> >
> > | entry | owing pass | status |
> > |---|---|---|
> > | `space-[xy]-` **2** · `[wh]-30` **4** | **3a** | 🟢 **EXPIRED AND CONVERTED at pass 3a.** Both are `G()` again — hard, blocking, at **0** |
> > | `dead-spellings` **177** | **3b** | ⬜ **STILL PENDING.** Pass 3b was scoped by the owner to **ENUMERATION ONLY** in the 3a session, so its rewrite has not run. The entry is therefore correct, not stale |
> >
> > 🔴 **`GP()` MUST BE DELETED WHEN 3b's REWRITE LANDS, and `GP()` having exactly one caller is now
> > the visible countdown.** Owner action **P35**. The function surviving with zero callers, or with a
> > caller whose pass has shipped, is itself the finding this ruling exists to make loud.
>
> | rule | floor | what it is | why it can never be 0 |
> |---|---|---|---|
> | **`no-numeric-fontsize`** | **60** excepted + **7** inline | **60 GLYPH** sites (marked in-file, pass 2a) + **7 ABOVE-CEILING** (pass 2b; 🆕 **marked in-file at pass 5**, for the reason in §3.7's GATE_STRICT box) | A pictograph's size is a **DIMENSION**; and at 20 and 24 the ramp holds two steps of equal size, so for a glyph the mapping is not hard, it is **UNDEFINED**. The 7 sit **above `display-lg` 30** (32 ×2, 36 ×2, 40 ×2, 96 ×1) — there is no target to move them to. The rule prints `inline / excepted / raw` so the excepted set **cannot grow unnoticed** |
> | **`no-raw-hex`** | **~12** | `BirthChartWheel.tsx`'s 11 hex + 1 rgba | §11.4 is screens-phase work, scheduled AFTER pass 5. Already recorded in §3.7's pass-5 deliverable box. 🔴 Implement as *"this file may hold raw chart literals until §11.4 lands"*, **never** `--exclude=BirthChartWheel.tsx` |
> | **`no-variable-fontsize`** 🆕 | **11**, report-only | `StreakBadge` ×3, `AstroNumeroBadge` ×8 | See **O-29**. Not debt — a **watchlist**. `fontSize: <expression>` is a legal idiom, so this can never be a failure condition; the number must be READ, and a RISE means a new indirected type size was introduced |
>
> **The 7 ABOVE-CEILING sites, enumerated so the floor is auditable rather than a number:**
> `verify-email.tsx` 32 ("Verify Your Email") · `app/index.tsx` 32 ("Revelia") ·
> `combined.tsx` 36 ×2 (the two decorative `"` marks) · `combined.tsx` 40 (`lifePathNumber`) ·
> `compatibility/index.tsx` `styles.fallbackIcon` 40 · `face-capture.tsx` `styles.countdownText` 96.
> ⚠️ **Two of them look like glyphs** — the `"` marks and `fallbackIcon` — and marking them GLYPH
> would drop the count to 4. **That was deliberately not done:** widening a scoped exception to
> improve a number is exactly the disarming move §3.0.2.0 describes, and the marker is supposed to
> record a *judgement made at the site*, not a convenient reclassification made later to tidy a
> report. They stay visible until someone rules on them.
>
> ### 🟢 PASS 4 ADDED NO FLOOR — AND IT WAS OFFERED ONE (2026-07-31)
>
> `no-fontweight` reaches **0 on BOTH ledgers** (className and inline) and the new
> `no-synthetic-italic` reaches **0**. Both are therefore now permanent invariants carrying the full
> §3.0.2.0 class-2 exposure: target 0, count already 0, no counter to cross-check them.
>
> 🔴 **The one candidate for a fourth floor was refused.** The birth-chart wheel's single JSX-prop
> weight (`O-32`) could have been allow-listed under the same §11.4 reason `no-raw-hex`'s ~12 already
> uses. It was converted instead, on two grounds: **a floor of 1 on a permanent-invariant rule
> destroys the only property that makes such a rule auditable at all**, and §4.6's own words are that
> a floor must "never be closed by widening an exception" — which applies equally to *opening* one to
> dodge a decision. The three floors above are still three.
>
> ⚠️ **`text-defaults-installed` is a decreasing counter running the other way**: it reads ABSENT
> until the module is wired and OK afterwards, so the only way it regresses is someone deleting
> working code. That is the correct shape for a mechanism whose absence is otherwise invisible.

---

## 5. 🔴 THE INVARIANT CONTRACT — X1 … X20

> **The line that makes this the highest-risk category in the entire revamp**, quoted from commit
> `6525a75`'s own message:
>
> > *"Android unchanged — flex propagation works there, explicit dimensions are no-ops."*
>
> **Stated as plainly as it can be: on Android, all eight of `6525a75`'s guards look like dead
> code.** Anyone restyling on an Android device or emulator can delete every one of them, see no
> change whatsoever, run the app, find nothing wrong — **and ship an iOS build in which eight
> surfaces collapse to thin ribbons.** X1/X2/X3 already record three earlier instances of the same
> fix; `6525a75` applied it to six more components and `c542b20` applied a related clipping fix to
> three more. Until `UI-audit.md` §5.1's X11–X18 block was written, all of that was documented **only
> in two commit messages** — and there is still **no in-file comment on X13, X14, X15 or X16**.
>
> The corollary the register does not spell out: **these are the invariants a codemod is most likely
> to destroy, because a codemod's whole job is to normalise magic numbers.** `minHeight: 140` ×7 in
> one file reads exactly like copy-paste cruft. It is the fix.

### 5.1 ⚠️ Can an iOS build actually be produced from this repo today? **YES.**

The brief asks for a real answer either way. It is **yes** — and the premise it was asked under needs
one correction.

**The `id000000000` placeholder is not evidence of anything.** It sits at `profile.tsx` ≈`:115-116`
inside the **rate-app deep link** — `'https://apps.apple.com/app/revelia/id000000000'`, with a
comment saying to replace it once the app is live on the App Store. It is a cosmetic TODO on a "Rate
the app" button and has no bearing on buildability.

**What the repo actually shows:**

| evidence | file | what it establishes |
|---|---|---|
| `ios: { simulator: false }` on **both** `preview` and `production` | `eas.json:26-28`, `:44-47` | Two real iOS build profiles exist, both **Release** configuration (only `development` sets `developmentClient` / `assembleDebug`) |
| `submit.production.ios` = `appleId: sid@revelia.me`, **`ascAppId: 6762566575`**, `appleTeamId: 7MF4U8534H` | `eas.json:63-67` | 🔴 **A real App Store Connect app record exists.** This is not a placeholder |
| `ios.bundleIdentifier: "com.revelia.app"`, **`ios.buildNumber: "5"`** | `app.json:23-24` | At least **five** iOS builds have already been produced |
| `usesAppleSignIn: true` + four `infoPlist` permission rationales | `app.json:25-33` | Store-review-ready `Info.plist` content, already written |
| *"iOS: **deferred** — last submission rejected under App Store 4.3(b); Android-first strategy"* | `docs/reference/architecture/infrastructure.md:24` | 🔴 **A build was submitted and reviewed.** A 4.3(b) rejection is a content/duplicate judgement — it presupposes a successfully built, signed, uploaded binary |

**Conclusion: iOS has been built, signed, uploaded and reviewed. It has never been *released*.** So
the twelve "invisible" HARD invariants (X1, X2, X3, X11–X19) do **not** exist to fix behaviour that
cannot be verified. **They can be verified, and this plan's position is therefore "preserve untouched
AND verify once on iOS," not "preserve untouched, never test."**

**Four owner-side unknowns that gate actually running it** — none determinable from the repo, all
cheap to check, and all to be cleared **before** the pass-5 cut is planned around an iOS pass:

| # | unknown | how to clear it |
|---|---|---|
| 1 | **Is the Apple Developer Program membership current?** | Apple Developer portal. A lapsed membership invalidates distribution signing |
| 2 | **Are the EAS-managed iOS distribution cert + provisioning profile still valid?** Apple distribution certs expire ~annually, and the last iOS build predates 2.0.0 | `eas credentials -p ios` — interactive, so **the owner runs it** |
| 3 | **`requireCommit: true`** (`eas.json:5`) | The working tree must be committed before any build. Relevant because this plan leaves committing to the owner |
| 4 | **`appVersionSource: "remote"`** (`eas.json:4`) | `app.json`'s `buildNumber: "5"` is **inert**; EAS owns the number. Do not hand-edit it |

**🔴 And the limit that matters most: an iOS build verifies LAYOUT, not commerce or push.**

- **There is no `EXPO_PUBLIC_REVENUECAT_IOS_KEY` in any `eas.json` env block** — only
  `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`. RevenueCat will not configure on iOS: `offerings` comes back
  null and the paywall shows its failed state. **The paywall's layout is verifiable; a purchase is
  not.**
- **No APNs / OneSignal iOS configuration is visible**, so push is dark on iOS.
- Google Sign-In has no iOS client ID in env; Apple Sign-In should work (`usesAppleSignIn: true`).

None of that blocks the job iOS is needed for. **X1–X19 are pure layout invariants**, and a Release
build on a real iOS device is exactly the right instrument.

**Which build to use, and which not to:**

| path | command | verdict |
|---|---|---|
| **TestFlight internal** | `eas build -p ios --profile production` → `eas submit -p ios` | 🟢 **Best.** Release configuration on a real device — closest to the *production* behaviour the collapse actually exhibited. Internal testers need no App Store review |
| ad-hoc internal | `eas build -p ios --profile preview` | 🟢 Good. Release config, but needs registered device UDIDs |
| 🔴 **simulator dev build** | `eas build -p ios --profile development` (`simulator: true`) | 🔴 **NOT a valid instrument.** It needs no credentials, which is exactly why it is tempting — but the original collapse was iOS **production** behaviour (Build 13), not debug. A green simulator run proves nothing about X1–X19 |

**Register as an owner action.** The handoff's *"iOS DEVICE PASS on the flip, BEFORE any codemod
runs"* is now actionable rather than aspirational, subject to unknowns 1 and 2.

### 5.2 The register — pass by pass, with the check

*Touched by* = passes that edit a file containing the invariant. *Must not change* = the literal
property. *Check* = the assertion, runnable where possible.

| # | invariant | touched by | must not change | check |
|---|---|---|---|---|
| **X1** | `ScreenContainer`'s outermost element stays pinned to `Dimensions.get('window')` with `position:'absolute', top:0, left:0`; `SafeAreaView` keeps `flex:1 + width:'100%' + minHeight:SCREEN_HEIGHT`; `ScrollView` keeps `flex:1` + `flexGrow:1, minHeight: SCREEN_HEIGHT - 100` | **1, 3a, §9 primitives** | the pinned structure. Grain is an absolute `pointerEvents="none"` **sibling INSIDE** the pinned View; the entrance animates the **content block**, never the pinned wrapper | `grep -n "Dimensions.get\|position: 'absolute'\|minHeight: SCREEN_HEIGHT" components/ui/ScreenContainer.tsx` — the four sites survive every pass. iOS device: 25 of 32 screens render full-height |
| **X2** | The same fix hand-rolled in `welcome.tsx` — do **not** "simplify" it to a plain `View` | 1, 3a, **grain mount ii** | same | `grep -n "Dimensions.get" app/(auth)/welcome.tsx` ≥ 1. Do **not** "unify" it onto `ScreenContainer`: it deliberately does not use it |
| **X3** | `Button` keeps explicit `SIZE_HEIGHT` 48/56/64 and the inner `LinearGradient` keeps `width:'100%', height:'100%'` — never padding-only sizing | **2a, 3b, 4, §9 Button** | the three heights and the 100%/100% gradient | Assert `SIZE_HEIGHT` still holds 48/56/64. 🔴 The radius change (12→pill) and the `lg` label change (18→16) are **outside** X3's scope and are allowed. Post-2b headroom 26 / 34 / 40 — all SAFE |
| **X4** | `recordMeaningfulAction(key)` is the **only** review entry point | **every pass touching a screen** | no per-screen counters, no `useRef` fire-once guards, no SecureStore "counted" flags, no direct `StoreReview` calls | `grep -rn "StoreReview\|attemptReview" app components` → **only** `lib/inAppReview.ts` + `store/reviewStore.ts`. See §7 |
| **X5** | `initReviewStore()` called exactly once in the root layout | **4** (the same file as `useFonts`) | the single call | `grep -c "initReviewStore" app/_layout.tsx` = 1. 🔴 Pass 4 edits this exact file — do not reorder it past the splash gate |
| **X6** | `shareReadingCard()` returns a **boolean**; callers gate on it; `failOnCancel:false` stays; dismissal uses the **exported** `isShareDismissal` | 1, 2, 3, **§9 ShareCard** | all four properties | see §7. **The design never mentions this, and it is the most explicitly-protected invariant in the repo** |
| **X7** | The share fallback chain stays **exactly one deep** | as X6 | one level | `grep -n "Sharing.shareAsync\|Share.share" utils/shareReading.ts` + the comment at ≈`:56` |
| **X8** | Entertainment disclaimer **present** on every reading-output screen: `daily`, `weekly`, `monthly`, `compatibility/[id]`, `combined`, `face`, `palm` | 1, 2a, 2b | **presence and string are HARD; container is SOFT** | `grep -rln "EntertainmentDisclaimer" app` = 7 files, before and after. 🔴 The design **adds** it to Home and the Astrology hub — additive, allowed, string **verbatim** |
| **X9** | Four inline disclaimer variants stay where they are: `name-destiny`, `career-destiny`, `profile`, `cosmic-report` (`FINE_PRINT_LONG`/`FINE_PRINT_SHORT`) | 1, 2a, 2b | presence + the exact strings | 🔴 **Do not consolidate the six divergent disclaimer strings.** Audit §9 Q3 is unanswered, and consolidating a compliance string is a legal call, not a design one |
| **X10** | Visual styling of all the above | all | — | **SOFT. This is the revamp.** |
| **X11** | `StreakBadge` `height: 28/36/48` **and `borderRadius: cfg.height / 2`** | **2a, 3b, 4** | both — **they are coupled** | 🔴 The "just use padding + `rounded-pill`" restyle is **banned on this component specifically**: deleting the height also breaks the pill. The in-file comment at ≈`:11-12` explains why — **keep the comment.** 🟠 **Post-2b, `small` drops to 6.0px of headroom** (from ≈12), the tightest surface in the register. **iOS check required.** |
| **X12** | `AstroNumeroBadge` `height: 44/56/88`, **and its `width:1 height:32` divider** | 2a, 3b, 4 | the three heights and both divider dimensions | The divider will read as an arbitrary magic number; §10.3 says it **recolours to `border-subtle` and keeps both dimensions**. Headroom 12/16/32 — SAFE, because the dominant child is the **circle** (32/40/56), a dimension not a type |
| **X13** | `home.tsx` `height:140` ×2 · `minHeight:200` · `minHeight:72` | **1, 2b, 3a, 3b** | all four | 🔴 **No in-file comment on any of the four** — the only record is `6525a75`. **Add one during the pass.** `:203`'s 200 **STAYS** (owner ruling O-7), with the empty-`keyDates` case as a short centred `fg-muted` line. `:528`'s 72 is no longer load-bearing post-flip (content is 76) — **keep it anyway**; it costs nothing |
| **X14** | `readings/index.tsx` `minHeight:140` ×7 | 1, 2b, 3a | all seven | 🔴 Seven near-identical inline objects that look exactly like cruft. **They are the fix.** `grep -c "minHeight: 140"` on that file = 7 |
| **X15** | `numerology/index.tsx` `minHeight:140` | 1, 2b, 3a | it | A lone magic number on a `LinearGradient`. Same grep = 1 |
| **X16** | `DailyInsightCard` `minHeight:160` on the **inner** `LinearGradient` | 1, 2b, 3a | it | 🔴 §10.1 reconciles this explicitly: **the outer card grows freely with no min-height; the inner gradient keeps its iOS floor.** They do not conflict |
| **X17** | `readings/index.tsx` `overflow:'visible'` ×7 on 56×56 wells · `SunSignReveal` 110×110 + emoji 52/60 · `GeneratingReading` `minWidth:220`, `minHeight:44`, `maxWidth:320 height:8` | **1, 2a, 2b, 3a** | all of them | 🔴 **`overflow:'visible'` reads as a no-op** — it *is* the CSS default, but **not** React Native's on Android. `grep -c "overflow: 'visible'"` on `readings/index.tsx` = 7. **D3: `minHeight:44` → 58.** ⚠️ `numerology/index.tsx`'s `fontSize:40, lineHeight:50` is an **emoji glyph reservation**, not typography — pass 2b must not "normalise" it |
| **X18** | Tab bar `height:85, paddingBottom:24, paddingTop:8` | 1, 2a, **§9 tab bar** | **85 / 24 / 8** | 🔴 **Build to 85/24/8.** Design I-6: turn 4's comp says `paddingTop 12` and computes a 49dp band; turn 7 says 8 and **wins on precedence**, so the real band is 85−24−8 = **53dp**. Treat "49dp" as stale. Changing the height means **re-verifying the five Build-22 Android clipping screens** (Home, Face, Monthly, Profile, Compatibility) because of `useBottomInsetPadding` |
| **X19** | Paywall close button keeps **both** `zIndex:50` **and** `elevation:10`, and stays `position:'absolute'` **outside** the `ScrollView` | **1, 3b, §9 paywall** | both properties **and** the position | 🔴 **The only `elevation:` in the entire codebase**, while §4.5 mandates "zero elevation" — so a cleanup pass will read it as dead code. It is a **stacking fix, not depth**: `zIndex` alone does not reliably raise a view above siblings on Android. Its shadow is genuinely invisible (a flat circle on a near-identical ground), which is exactly the trap. **If it is dropped, or the button moves inside the `ScrollView`, the only exit from the paywall modal can become untappable on Android** — on the highest-revenue surface, in a `presentation:'modal'` screen with **no header back button**. `grep -n "elevation" app/(paywall)/index.tsx` = 1 |
| **X20** 🆕 | `DeleteAccountModal` — `style={{height:56}}` + `<Text className="text-white text-base font-semibold">`, **twice** (Continue ≈`:148`, "Delete My Account" ≈`:202`) | **1, 2a, 2b, 4** | the two heights | **D5. Verified this session.** Of **71** fixed-`height:` sites in `app`+`components`, these are the **only two** that put a `className`-typed label inside a fixed height — the exact pattern the register exists to catch, and its only instance. Headroom 32, **SAFE**. They are hand-rolled buttons bypassing the `Button` primitive; §9 may absorb them, and if it does, X3 takes over |

### 5.3 Three standing consequences

1. ~~🔴 **Verifying any change to X1–X3 or X11–X19 requires an iOS build.**~~ **STILL TRUE, AND NOW
   PERMANENTLY UNSATISFIABLE — see §5.4.** An Android pass proves nothing; that is the entire content
   of `6525a75`'s closing line. §5.1 establishes the build is *producible*, but the founder has
   **paused iOS**, so it will not be produced. **The verification programme is CLOSED, not scheduled.**
2. **Add an in-file comment to every guard that lacks one, in the pass that touches it** — X13
   (4 sites), X14 (7), X15, X16 have **none**. This is the cheapest permanent risk reduction in the
   plan: one comment line each, converting "documented in a commit message" into "documented where
   the person about to delete it will read it."
3. **`useBottomInsetPadding` stays wired exactly as-is** on the five Build-22 screens. 🟠 Design I-8:
   the Astrology hub is **not** one of them, so the comp's "disclaimer above `bottomPad`" is **new
   wiring, not preserved wiring** — additive and probably correct, but its Android clipping behaviour
   has never been verified on that screen.


### 5.4 🔴 THE iOS VERIFICATION PROGRAMME IS CLOSED — "permanently unverifiable", never "deferred"

> **OWNER RULING (2026-07-31), forced by O-29's StreakBadge sites and generalised on the spot
> because they will not be the last.**

**iOS is paused by founder decision.** §5.1 spent considerable effort establishing that an iOS
build *is producible from this repo* — that finding stands and is not withdrawn. But producible is
not going to be produced, and **an item whose only verification path is an iOS build is therefore
not blocked, not scheduled and not deferred. It is UNVERIFIABLE, and it must be CLOSED as such.**

**🔴 THE GENERAL RULE, because this is the first item to hit it and it will not be the last:**

> **Any register entry whose sole verification path is an iOS build is CLOSED as
> PERMANENTLY-UNVERIFIABLE. It is given a named reason and removed from every pending list.
> It is NEVER carried as open work against a verification that cannot happen.**

**Why the distinction is not bookkeeping.** A deferred item is a promise: it sits in a register,
consumes attention at every review, and implies that someone will eventually resolve it. An
unverifiable item makes no such promise, and pretending otherwise has two costs that compound —
**a pending list that can never reach zero stops being read**, and **a reader who sees "pending an
iOS check" reasonably concludes the check is coming and defers a decision that should be made
now, on the evidence available.** O-7 is exactly that shape: *"it STAYS, pending an iOS check"*
is, in fact, simply *"it stays."*

**🔴 AND THE CONSEQUENCE THAT MATTERS MOST, STATED SO IT CANNOT BE READ THE OTHER WAY:**

**Closing the verification programme makes X1–X20 MORE load-bearing, not less.** The register
exists because on Android every one of those guards *looks like dead code* (`6525a75`:
*"Android unchanged — flex propagation works there, explicit dimensions are no-ops"*). Until now
there were two protections: the documented invariant, and the possibility of catching a mistake on
a device. **The second is now gone permanently, so the first is the only one left.**
🔴 **X1–X20 are PRESERVE-BLINDLY, and that instruction is now absolute rather than provisional.**
Nothing in this section licenses removing, simplifying or "cleaning up" a guard.

#### The sweep — every entry whose only verification path was an iOS build

| entry | was | now |
|---|---|---|
| **O-29's 11 variable-`fontSize` sites** — `StreakBadge` ×3, `AstroNumeroBadge` ×8 | "deferred, needs an iOS build" | 🟢 **CLOSED, permanently unverifiable.** Leave all 11 untouched. Reason: X11/X12 are preserve-blindly, their tables interleave glyph sizes with numerals and labels, and §6.6.2 puts `StreakBadge` small at **6.0px** — the tightest surface in the register. `no-variable-fontsize` keeps reporting **11** as a **watchlist floor**, not a debt |
| **§5.3 item 1** — "verifying any change to X1–X3 or X11–X19 requires an iOS build" | the standing verification programme | 🟢 **CLOSED.** Struck above. The guards stay; the verification does not exist |
| **O-7** — X13's `minHeight: 200` on Home's This Month | "it STAYS, **pending an iOS check**" | 🟢 **CLOSED — the ruling is now unconditional: IT STAYS.** The conditional clause is deleted, not left hanging. §6.6's two side effects already made "keep it" the cheaper call independently of any device |
| **X11's "iOS check required"** / §6.6.2's 🟠 6.0px `StreakBadge` row | "verify on iOS" | 🟢 **CLOSED as unverifiable — and MOOT in 2.1.0 anyway**, because the conversion that would have produced the 6.0px headroom was itself deferred. The badge still renders at its pre-2b metrics |
| **§5.1's "iOS DEVICE PASS on the flip, BEFORE any codemod runs"** + design §1981's same line | an owner action | 🟢 **CLOSED.** It did not happen before the codemod and now cannot |
| **O-14** — iOS certificate / Developer Program validity | the *enabler* for all of the above | 🟢 **CLOSED.** Nothing downstream is waiting on it any more. ⚠️ **Re-open O-14 FIRST if iOS is ever unpaused** — it is the gate everything else in this table hangs off |
| **§10.2's "the pass-5 cut is the natural place to spend one iOS build"** | a plan for cut 2 | 🟢 **CLOSED.** Cut 2 is Android-only |

⚠️ **What is NOT closed by this ruling, because it is not an iOS question:** **O-5** (W3's hairline
at 7% — an **Android** device check at cut 2), **O-4** (W1's `RadialGradient` under
`react-native-view-shot` — an **Android** check, unblocked by cut 1), and **P21** (iOS credentials),
which is an *operational* item about account state rather than a verification of this codebase.

🔴 **IF iOS IS EVER UNPAUSED, THIS TABLE IS THE RE-OPEN LIST.** That is the second reason to write
it as a table rather than delete the rows: closing an item as unverifiable must not destroy the
record of *what would have been verified*. Re-open O-14 first, then the rest.

---

## 6. THE R1 VIOLATION WORK — five sites, and which pass carries them

> ## 🟢 DONE 2026-07-31 — the SHIPS-NOW half of sites 1–4 landed; site 5 is §9, not this commit.
> **The ownership record is `UI-audit.md` §5.7a** (per-site: what shipped, what stays blocked, and
> the four things a later session must not "finish"). Ordering note: it ran **after** the cut-1
> pre-build verification rather than immediately after 1b — owner ruling, because R1 changes what
> *renders* and the lock surfaces overlap the capture set. One consequence is registered as **O-27**.
> 🔴 **Every "BLOCKED" cell below is a CLOSED DECISION. Do not re-open it without a server field.**

**R1** = the Build-27 principle: **the server owns entitlement; the client is a renderer.** The five
sites in `UI-audit.md` §5.7 are the client-side tier checks that decide UI inside the three screens
that were actually designed. **They are a subset, not the whole set** — `preflight-findings.md` §B
enumerates **31 distinct gates across 12 files (77 raw JSX branches)**, and §B5 identifies the one
server field (an `entitlements` map on the hydrated user object or on `GET /api/subscription/status`)
that would convert **nine** of the 31 from mechanism A to mechanism C.

### 6.1 🔴 Which pass carries them, and why it cannot be an identity pass

**These changes are BEHAVIOURAL.** Deleting a `tier === 'premium_plus'` check changes what happens
when a user taps a card. That cannot ride pass 1a, 2a or 3a — an identity pass's entire claim is that
the resolved output did not move, and `--diff` returning 0 would be *proof the behavioural change did
not land*.

> **Decision: the R1 work is its own commit, sequenced immediately after pass 1b and before pass 2a.**
>
> **Why there, specifically.** Three of the five sites are on `astrology/index.tsx` — the worst
> scatter file in the repo (52 hex, 97 inline styles, its own StyleSheet, three local components) —
> and pass 1b already has that file open and hand-edited. Landing the R1 deletions in the *same
> session* but a *separate commit* means the file is read once and the two diffs stay
> independently revertible. Doing it before 2a also means the five deleted branches never appear in
> any later pass's diff.
>
> Label it **`fix(build-27.1): R1 — the client stops deciding entitlement`**, not `docs:` and not a
> pass number. It is a behaviour fix that happens to be scheduled inside a styling programme.

### 6.2 The five sites — ships-now vs server-blocked

| # | site (locate by symbol) | the violation | ✅ SHIPS NOW (mobile-only) | 🔴 BLOCKED (needs server) |
|---|---|---|---|---|
| **1** | `home.tsx` — **Name Destiny** card. `grep -n "tier === 'premium_plus'" app/(main)/home.tsx` → three hits; the R1 ones are the **2nd and 3rd** (≈`:336`, ≈`:363`); the **1st (≈`:47`) is a FETCH GUARD and stays.** PLUS pill: `grep -n "PLUS" home.tsx` ≈`:352` | `if (tier === 'premium_plus')` in `onPress` decides navigate-vs-paywall, **plus** a hardcoded `PLUS` pill. §B gate **#29** | **Delete both the check and the pill. Always route; the destination decides** — `readings.routes.ts:32` already returns a 403 | **Any lock plate on the row.** No hub payload carries a lock signal for Name Destiny — eligibility is a **monthly `NameAnalysis` document count**, server-side only. So Home shows **no lock affordance at all** and the row is visually identical to Astrology and Numerology. **That is the correct honest state: the client genuinely does not know, so it must not imply that it does** |
| **2** | `home.tsx` — **Career Destiny** card (≈`:363`), PLUS pill ≈`:379` | Same shape. §B gate **#30** | Same | Same, except the signal is **staleness eligibility** rather than a doc count |
| **3** | `astrology/index.tsx` — `grep -n "const isPremium" ` → ≈`:136` (**design says `:143`**). Threaded into five `LifeThemeCard locked={!isPremium}` props (≈`:505,511,517,523,529`). §B gates **#5–#9** | 🔴 **Worse than the two Home cases**: those only chose where a tap went; **this decides what content renders** — and `astrology.routes.ts`'s `GET /birth-chart` does **no** tier filtering, so **the full life-themes prose is already in the payload for free users and is hidden client-side** | **Delete the check. Render presence-driven**: a theme with a body expands; a theme whose body the server did not send renders as **LockShell density 3's title-only variant**. *"Body absent" is already the signal* and needs no new field | **Distinguishing "withheld because unpaid" from "not generated yet."** No field carries it. Inventing one is server work (a `locked: string[]` on the response, or server-side omission of `lifeThemes` for free tier) |
| **4** | `astrology/index.tsx` — **Weekly Forecast**. `grep -n "tier !== 'premium_plus'"` → ≈`:561` (**design says `:604`**). `grep -n "Premium Feature"` → ≈`:563`. PLUS badge ≈`:582` (**design says `:625`**). §B gate **#10** | `if (tier !== 'premium_plus')` → `Alert.alert('Premium Feature', 'Upgrade to Premium Plus to unlock Weekly Forecasts and 7-day guidance.')` — 🔴 **a tier name in body copy** — plus a hardcoded `PLUS` badge | **Delete the check, the Alert and the badge. Route, and let the destination decide** — `insight.service.ts:667-669` already returns a 403. **No lock affordance**, for the same reason as sites 1–2 | A pre-render entitlement map (§B5). Until then the client cannot know before navigating |
| **5** | `astrology/index.tsx` — the **local `SectionCard`**'s `locked` branch (≈`:30-48`) | Hardcodes `"Unlock with Premium"` + an `"Upgrade"` button pushing `/(paywall)/`. One of the **three** competing lock treatments; **four byte-identical copies exist** | **Replace with the extracted `SectionCard` + one `LockShell`.** Renders the `locked` prop, names no tier | — **nothing blocked.** This one is pure consolidation, and it is §9's item 4 |

### 6.3 Two couplings that will bite a partial fix

1. 🔴 **A PLUS pill and its gate are ONE unit.** `home.tsx`'s two pills are classified *status
   display* in §B because they render a badge rather than withhold content — but they are the **same
   `tier` expression, inverted**, as gates #29/#30. **Change one and not the other and you get a card
   that says PLUS and navigates anyway, or a card that silently blocks with no explanation.**
2. **`astrology/index.tsx`'s tier-conditional subtitle is NOT in this register and survives all five
   deletions**: `tier === 'free' ? 'Basic forecast with key dates' : 'Complete monthly guidance'`
   (≈`:609`). It is **copy selection, not access** — but it means a `tier` read remains in the file
   after the R1 cleanup, and the 2.1 design's comp shows **only the `free` variant**. **Decide
   deliberately which string ships rather than discovering it in review.** Route it through §8 as a
   copy call.

### 6.4 Three things that look like R1 violations and are not — do not "fix" them

| site | why it stays |
|---|---|
| `home.tsx` ≈`:47` `if (tier === 'premium_plus')` around two `api.get` calls | **A FETCH GUARD, not a UI gate.** It decides whether to *ask*; the card self-hides when the server sends nothing. The server would 403 anyway. Purely an optimisation — removing it changes network noise and nothing else. The design treats continuity as "present or absent", never as "locked", so no tier name appears |
| `qa.tsx` ≈`:416,:419` `nextTier` | **Explicitly permitted by invariant Q4** — CTA *copy* only, never access |
| `compatibility/index.tsx` ≈`:39` client-side free quota | **Preserve as-is** (audit §5.6 HARD). It *is* mechanism A doing quota arithmetic on the client, and the server already computes the identical number and discards it (§B4) — but fixing it is server work and out of scope. Flag, do not touch |

### 6.5 What this work does NOT include

- **`astrology/monthly.tsx`'s decorative locks over data already on the wire** (§B1, gates #12–#19,
  `owner-actions.md` **P19**). Genuinely server work: `insight.service.ts:744` only tiers
  `'free'|'premium'`, so a Premium (non-Plus) user is **sent** `areas.money`, `areas.health`,
  `challenges` and `opportunities` and the client renders a `LockedSection` on top of them. Also a
  **cost** item — tokens are spent generating content that is then hidden.
- **`readings/combined.tsx`'s 100%-client-side paywall** (§B2). No `/readings/combined` route exists
  on the server; the screen composes from five endpoints a free user may call. Needs an owner ruling,
  not a codemod.
- **The 26 remaining gates** in §B. 2.1.0 is mobile-only; §B5's one field is what closes nine of them.
- 🟢 **Free cleanup while in the files:** `readings/face.tsx` ≈`:83` and `readings/palm.tsx` ≈`:111`
  both declare `const isPremiumPlus = tier === 'premium_plus'` and **never use it** (§B3). `tsc` does
  not flag it (`noUnusedLocals` is off). Two line deletions, so it does not get "reconnected" by
  someone assuming it was wired up.

---

## 7. 🔴 WHAT THE CODEMOD MUST NOT TOUCH — the hard list

Every item here is something a competent engineer would tidy up, and every one is load-bearing. Read
this before opening any of the named files.

### 7.1 `qa.tsx` — the eight independent `!safetyMode` gates

**Verified this session:** six literal `!safetyMode` expressions plus two derived suppressions.

| # | gate | locate by |
|---|---|---|
| a | counters row | `{!safetyMode && Counters()}` ≈`:652` |
| b | location-consent banner | `{!safetyMode && locationConsent === 'undecided' && …}` ≈`:653` |
| c | question-cap CTA vs composer | `{!safetyMode && atQuestionCap ? QuestionCapCta() : Composer()}` ≈`:677` |
| d | Deep-Insight cap note + Upgrade link | `{!safetyMode && diCapHit && …}` ≈`:529` |
| e | Deep-Insight toggle | `{!safetyMode && (…)}` ≈`:542` |
| f | paywall bounce on a capped send | `if (atQuestionCap && !safetyMode)` ≈`:244` |
| g | rating prompt | `if (r.mode === 'reflective' \|\| r.mode === 'timing')` ≈`:299` — so `recordMeaningfulAction` **never** fires for `crisis`/`unsafe`/`off_topic` |
| h | the bubble's own mystical chrome | a **separately derived** `const isSafety` at **module scope** ≈`:297-300`, gated ≈`:119` — no `🔮 Revelia` label, never a Deep-Insight tag |

> 🔴 **A redesign that centralises these into one conditional — one `if (safetyMode) return
> <CrisisView/>`, or one `showCommerce` flag — LOSES THE PROPERTY.** The guarantee today is
> **structural redundancy**: eight independent gates, so no single refactor, prop-drill mistake or
> future feature can re-expose commerce on a crisis screen by touching one line. A single centralised
> conditional makes exactly that a **one-line regression, on the app's most safety-critical surface.**
>
> **Say it to any designer or reviewer plainly: the crisis screen is not a screen variant. It is the
> absence of eight things, each suppressed on its own.** If the redesign wants a distinct crisis
> presentation, it must be **additive to the eight gates, never a replacement for them.**

**Also on this file** (all HARD; `qa.tsx` is **D8 restyle-only, structure frozen**):

- **Q3 — the one suppression surface with no explicit gate.** Suggestion chips are suppressed
  *structurally*: they live inside `EmptyState()`, which renders only when `messages.length === 0`,
  while `safetyMode` requires ≥1 assistant message. **Any redesign that moves the chips outside the
  empty state — a persistent chip row, chips under the composer, chips in a cap state — MUST add an
  explicit `!safetyMode` gate.** The structural guarantee does not survive that move.
- **Q6 — `Bubble` stays at module scope; `Counters` / `EmptyState` / `LocationConsentBanner` /
  `Composer` / `QuestionCapCta` stay rendered as FUNCTION CALLS, not JSX elements.** An inner
  component gets a fresh identity every render → remounts the message list and the composer's
  `TextInput` on **every keystroke** → keyboard focus loss. Documented in-file. 🔴 **This fights normal
  React style and a reviewer's instinct will be to "fix" it.**
- **Q4** — all gating stays server-driven: `remaining` from `GET /qa/credit` and each answered turn,
  the hard stop from a **top-level 402** whose `cap` payload is adopted wholesale and whose `code`
  selects DI-lock vs question-cap. No client re-implementation of caps, no tier-based guessing.
- **Q5** — the crisis/decline answer is rendered **verbatim from `r.answer`**; the client never
  composes safety copy. Server-authored, Sid-approved, curly apostrophes intentional.
- **Q7/Q8/Q9** — `X-Device-Id` rides **only** a Deep-Insight ask; location captured **only** when
  consent is `'granted'`; consent asked once and persisted; one idempotency key per logical send.
- ⚠️ `qa.tsx:358` defines a **local `EmptyState`** shadowing the shared component's import name.
  Different component, same identifier. Resolve the shadow only when §9 reaches `EmptyState`.

### 7.2 `cosmic-report.tsx` — the R9 poll (R3) and its neighbours

🔴 **The async poll keeps all four of its properties:**

1. **recursive `setTimeout`** — never `setInterval`;
2. **both backoff curves** — success `delay = min(delay + 1000, 8000)` from 3000; error
   `min(delay + 2000, 10000)`;
3. a **`cancelled` flag checked after every `await`**;
4. **cleanup returning `cancelled = true; clearTimeout(timer)`**.

`setInterval` would stack overlapping in-flight requests against a **minutes-long LibreOffice
render**. Without the `cancelled` check plus `clearTimeout`, navigating away mid-generation leaks a
polling loop and calls `setState` after unmount.

Also on this file (**D8 restyle-only, structure frozen** — 902 lines, the largest screen in the app):

- **R1/R2** — the lock decision keys on **`credit.limit === 0`**, never on a tier name; the secondary
  path is the server's `res.locked`. The tier→limit mapping is a **server-side, reversible** decision
  pending the owner's call (P12). A client tier check would hard-code today's policy into a shipped
  binary.
- **R4** — all **seven** server-driven phases stay distinct (`generate`, `free-locked`, `paid-cap`,
  `generating`, `ready`, `expired`, `failed`; `loading`/`error` are client transport states).
  **Collapsing any pair shows users the wrong action.**
- **R5** — the **rebuild** path is distinguished by `isRebuild`: on rebuild the report stays `ready`
  and completion is signalled by `regenerating` clearing, **not** by a status change. A rebuild never
  transitions through `queued`; treating it like a fresh generate **polls forever**.
- **R6** — `mountedRef` checked after **every** `await` in all handlers (~10 sites).
- **R7** — `sampleBusy` and `sharing` stay **separate** from `busy`. 🔴 **Merging them is the obvious
  "simplification" and it is wrong** — the sample-open and share spinners must not couple to
  Generate/Rebuild's.
- **R10** — the sample affordance is **hidden** when `sampleLink === null`. The sample object does not
  yet exist in prod R2 (owner action **P1**), so **the affordance is currently dark by design. Do not
  design a state that assumes the sample always exists.**
- **R8/R9** — `recordMeaningfulAction('reading:report')` fires from the `phase === 'ready'` **effect**,
  not a render path; share gates on `dismissedAction !== true` / `isShareDismissal`.
- **§6.5 copy** — `READING_SECTIONS` mirrors the **server's actual PDF section order** and
  `INSIDE_BULLETS` describes what the PDF contains. **Changing either misdescribes the delivered
  artefact.** Locked until the server's template changes.

### 7.3 `utils/shareReading.ts` — all four properties (X6/X7), and the branch the design missed

| property | must stay |
|---|---|
| `shareReadingCard()` returns a **`boolean`** | `true` = real share, `false` = dismissed |
| callers **gate on it** | `recordMeaningfulAction('share:…')` / `onShare` / `onShared` fire **only** on `true` |
| **`failOnCancel: false`** on `RNShare.open` | without it a dismissal **rejects** |
| dismissal detection uses the **exported `isShareDismissal(error)`** | **never redefined per file** |

Without `failOnCancel:false`, a dismissal rejects and the catch-driven fallback chain
(`RNShare → Sharing.shareAsync → Share.share`) **opens a second and a third share sheet**. Without
the boolean gate, a dismissal records a **phantom share**. `CLAUDE.md` explicitly forbids
"simplifying" either. **X7:** the chain stays **exactly one deep** on a genuine failure.

> 🟠 **I-7 — the omission that matters most here.** The design redesigns `ShareCard` (#9) and
> `ShareableQuote` (#10) with a four-state model — **composed · capturing · captured · failed** — and
> **never mentions X6/X7 at all.** The **"failed" branch is exactly where the cancel-cascade fix
> bites**: a *failed* share and a *dismissed* share are different things, and the repo's entire
> cancel-cascade fix exists to keep them apart.
>
> 🔴 **Binding rule for the implementing session: `ShareCard`'s "failed" state is reachable ONLY when
> `isShareDismissal(error)` is `false`.** A dismissal must land in `composed`, silently, exactly as
> today. Never render "failed" on a dismissal.

**Two existing bypasses the revamp will touch** (audit §8): `compatibility/[id].tsx` ≈`:89` defines
its **own local `shareReadingCard`** (importing only `isShareDismissal`), and `cosmic-report.tsx`
≈`:395-413` hand-rolls a PDF-attaching share. **Converging them onto the shared helper is §9 work and
makes `share_completed` a one-line instrumentation later instead of a three-site hunt** — but it must
preserve all four properties above, in all three places.

### 7.4 `recordMeaningfulAction` — the single review entry point (X4/X5)

🔴 **No per-screen counters. No `useRef` fire-once guards. No SecureStore "counted" flags. No direct
`StoreReview` calls.** `attemptReview()` is called **only** from `reviewStore`, and the prompt ladder
(`6→16→31→51→71→91…`, advancing only on a **real** attempt) lives there too. The old system had a
lost-update race — SecureStore re-read to compute an increment — and duplicate counting.
`recordMeaningfulAction` is **idempotent per dedup key**, so it is safe to call on remount, refetch or
revisit; that is why there are 15 call sites and no guards around them.

Retired in that refactor and **not to be reintroduced**: `reviewKeys.ts`, `useAppReview.ts`, and
`readingsStore`'s `completedReadingsCount` / `incrementCompletedReadings`.

`initReviewStore()` is called **exactly once** in the root layout. 🔴 **Pass 4 edits that exact file**
to add `useFonts` — do not reorder `initReviewStore` past the splash gate, and do not make it
conditional on `fontsLoaded`.

### 7.5 `verify-email.tsx` — the top-level `verificationToken` read (V1/V2)

```tsx
// ≈:112 — DO NOT "simplify"
const token = (verifyResponse as any).verificationToken;
```

The backend returns `verificationToken` at the **top level** of the response body, **not** nested
under `.data`. `verifyResponse.data?.verificationToken` is **always `undefined`** and **breaks email
signup entirely.** Keep the cast, keep the in-file comment, keep the falsy guard and the `signup(...)`
hand-off. This file also holds 10 raw hex literals, so **pass 1 will open it** — that is exactly when
the "clean up this ugly cast" instinct fires.

### 7.6 Copy-locked strings — audit §6, all six sub-sections

| § | surface | rule |
|---|---|---|
| **6.1** | **R7 safety copy** — crisis, unsafe, off-topic | **Sid-approved, server-authored, rendered verbatim from `r.answer`.** Never in the mobile bundle, so there is nothing to restyle but the plain bubble. 🔴 **Curly apostrophes and curly quotes are intentional** — do not normalise to ASCII |
| **6.2** | **Six divergent entertainment/advice disclaimers** | 🔴 **Treat all six as copy-locked and consolidate none.** `profile.tsx` ≈`:646` is a hand-truncated copy of the shared string; whether that is deliberate or drift **is not determinable from code** (audit §9 Q3, unanswered). Consolidating a compliance string is a legal call |
| **6.3** | **Monetisation copy** — the Q&A cap headline and reset line, "Upgrade and unlock more questions", the DI sub-cap note, **"Deep Insight"**, **"Ask the stars"**, "Unlock with Premium"/"Upgrade" ×4, the `tierDisplay` map | PM-owned. **Verify before changing.** Product names (`Deep Insight`, `Ask the stars`) are locked outright |
| **6.4** | **Q&A onboarding + suggestions** | Probably changeable — **except** the location-consent body, which is a **privacy disclosure** mirroring locked `app.json` permission strings. **Treat the consent text as copy-locked**; the banner around it is SOFT |
| **6.5** | `READING_SECTIONS` / `INSIDE_BULLETS` | Server-determined; see §7.2 |
| **6.6** | `app.json` permission rationales | Store-reviewed. Listed so nobody edits them incidentally |

**And the four Astrology button labels turn 7 explicitly reverted to source:** `Generate Birth Chart`,
`Retry Birth Chart`, `Add Birth Data`, `Add Birth Time`. **Verbatim, casing included.** Casing is not
a layout problem, so it is not the designer's to change; app-wide sentence-case buttons would be a PM
decision affecting every `Button` in the app.

### 7.7 Six more, briefly

| item | rule |
|---|---|
| `welcome.tsx` / `login.tsx` / `signup.tsx` guarded `require('expo-apple-authentication')` in try/catch | A top-level `import` **threw on parse** in the iOS production bundle and prevented the screen mounting. **Keep the try/catch** |
| `app/index.tsx` declarative `<Redirect>` computed during render | **Not** `router.replace()` in `useEffect` — the imperative form is *silently dropped* on iOS production. Plus a Build-24 gating-order dependency (`hasHydrated` **and** `lastFetchOk`) that fixed "Tell Us About Yourself reappears on warm resume" |
| `palm-capture.tsx` camera mount guards ×3 | iOS-production guards mirrored from `face-capture.tsx` |
| `astrology/monthly.tsx` `as string \| string[]` cast | A deliberate cast preserving a legacy array-handling branch, *"runtime-identical"*. **Looks like a type smell; is intentional** |
| `readings/index.tsx` ≈`:121` comment | **No tier pill on the Q&A entry, on purpose** — the gate is server-side. `home.tsx` says the same. **Do not add a tier badge to Q&A entry points** |
| `react-native-purchases` has no `codegenConfig` | Expected — RN 0.79 old-arch interop. **Not a bug, do not "fix" it.** Practical consequence: **no frame-synchronised animation tied to purchase callbacks.** The paywall's spinner runs on its own loop, started before the call and stopped after it — **never driven by, awaited on, or interpolated against the purchase promise** |

### 7.8 And one the design gets wrong — do not implement it as written

🔴 **The paywall "cancellation" fix is a TRI-STATE out of `lib/revenuecat.ts`, not a one-branch fix.**
Design finding (i) says *"RevenueCat throws on user cancellation, so backing out of the store sheet
accuses the user of an error"* and calls it a one-branch fix. **§A3 refuted this with line evidence:**
`lib/revenuecat.ts:51-61` **swallows every throw and returns `null`**, `subscriptionStore.ts:61-64`
collapses that to `false`, and the screen has **no `else` branch** — so the `Alert('Purchase Failed')`
is **unreachable**, and `userCancelled` is read **only to suppress a `console.warn`**.

**Today, cancel and genuine billing failure both produce absolutely nothing:** the user taps
Subscribe, the sheet closes, and the app says not one word.

- The **designed outcomes are right** and should ship — silent on cancel, inline strip on genuine
  failure.
- But the **cancelled** state is already today's behaviour, for the wrong reason.
- And **purchase-failed is NOT a one-branch fix**: it requires **propagating a tri-state
  (success / cancelled / failed) out of the `lib/` boundary** — changes in `lib/revenuecat.ts` **and**
  `subscriptionStore.ts`, not in the screen.
- **The repo already has the right shape to copy:** `utils/shareReading.ts`'s boolean + exported
  `isShareDismissal` (§7.3).
- 🔴 **Do NOT "fix" this by re-enabling the alert** — that surfaces an alert on cancellation, which is
  precisely what the design correctly wants to avoid.

**Also: there are SEVEN `Alert.alert` calls on that screen, not five**, and **two have no designed
state** (I-3): **restore succeeded** and **restore failed**. Ship the design as written and *a
successful restore silently does nothing* — meaning a paying user who reinstalled gets no confirmation
their subscription came back. **Add both states**, reusing the existing copy verbatim ("Your
subscription has been restored!", "Unable to restore purchases. Please try again."). And **P1/P2 stay
HARD**: keep reading `offerings.current?.availablePackages`, keep purchase/restore in
`subscriptionStore`.

---

## 8. COPY DEPENDENCIES — C-1 … C-5

**None of these is a design decision.** All five are PM/owner calls on user-facing strings.

> 🔴 **The standing default, and it is binding: if a call has not landed when the pass reaches the
> string, ship the SOURCE STRING VERBATIM. Never the design's proposal.** A design tool may not change
> copy, and "the comp said so" is not sign-off. Every deferral is recorded in `sid-signoff.md` with
> the file, the current string and the proposal, so the call can be made later at the cost of a
> one-line edit rather than a re-read.

| # | the call | blocks | current source string | the design proposes | default if the call has not landed |
|---|---|---|---|---|---|
| **C-1** 🔴 **HIGH** | **Tier copy on Home.** The design's own sentence is self-contradictory: *"Home keeps today's strings, rendered from the same `tierDisplay` map as `profile.tsx`"* | **pass 1** (the same edit region) and §9's `ProfileHeader` work | `home.tsx` ≈`:74` renders `` `${tier?.toUpperCase() ?? 'FREE'} Member` `` → **"FREE Member" / "PREMIUM Member" / "PREMIUM_PLUS Member"** | `profile.tsx`'s `tierDisplay` map → **"Free Plan" / "Premium" / "Premium Plus"** | 🔴 **Keep `home.tsx` byte-identical ("FREE Member").** See the box below — **do not let the plan inherit "no change" and silently ship the map version** |
| **C-2** MEDIUM | **`FeatureComparisonTable` abbreviations.** The design's own framing is *"restyled, not restructured, because it is marketing copy and PM-owned"* — and then it abbreviates | **pass 2a** (the table's `text-xs` rows) | headers **"Free" / "Premium" / "Plus"**; Compatibility values **"1 Love" / "Unlimited Love" / "All Types"** | headers "FREE / PREM / PLUS"; values "1 Love / Unlim. / All" | **Keep all six source strings.** Header casing is benign (`overline` is uppercase-only, so "Free"→"FREE" is a *render*, not a rewrite) — but **"Premium"→"PREM", "Unlimited Love"→"Unlim." and "All Types"→"All" are real copy edits** to strings the design itself calls PM-owned. They exist to fit three columns in 360dp; **abbreviating a plan name in a comparison table is a marketing decision** |
| **C-3** MEDIUM | **Four casing changes on non-uppercase elements.** Each renders at `text-sm`/`text-2xs`, **not** `overline`, so the change is **visible in the shipped UI** | **pass 1 / pass 2a** | **"Restore Purchases"** · **"View All"** · **"View Full Reading →"** · **"Ask the Stars"** | "Restore purchases" · "View all" · "View full reading ›" · "Ask the stars" | **Keep all four.** ⚠️ The last is the interesting one: the repo has **two casings for one product name** — `qa.tsx` ≈`:644` (the screen title, and the **copy-locked** form) says **"Ask the stars"**, while both entry points say **"Ask the Stars"**. So the design is *converging on the copy-locked form*, which is defensible and arguably a bug fix — but it is still an edit to two shipped strings, and the divergence is a pre-existing inconsistency the design normalises **silently**. **Surface it to PM; do not let it ride in a codemod diff** |
| **C-4** MEDIUM | **"Personalized Cosmic Report" → "Cosmic Report" in the Home Explore row only.** 🔴 **A LIVE, un-retracted proposal** — turn 6 reverted the tier copy but said nothing about this, it is **not** in §13's superseded list, and it is **not** among the five drifts that were caught | **pass 1** (Home's Explore rows) | `home.tsx` and `astrology/index.tsx` ≈`:437` both render **"Personalized Cosmic Report"** | "Cosmic Report" on Home only (the full string wraps to two lines at 360dp) | **Keep "Personalized Cosmic Report" on both screens.** If the rename ships on Home only, **the app calls one product two different names on two screens** — worse than either name used consistently. It is also **product naming**, i.e. §6.3 territory. **Decide once, apply everywhere or nowhere** |
| **C-5** LOW/MED | **Three tier-name literals the audit's §6.3 missed**, all retired by LockShell | **§9's LockShell merge** (post-codemod), not a codemod pass | `LockedSection.tsx` ≈`:51` **"Upgrade to Unlock"** · ≈`:79` **"Upgrade Now"** (banner) · ≈`:18` **"Premium" / "Premium Plus"** as a hardcoded badge label | all replaced by **"Unlock this section"**, no tier name | **Get the same PM sign-off as "Unlock with Premium."** Consistent with the no-tier-name-anywhere rule, and it removes **three more tier-name literals the design never counted.** Until signed off, LockShell renders the existing strings |

> ### 🔴 C-1 in full, because it is the one that will actually go wrong
>
> **Three separate errors in one design sentence:**
>
> 1. *"Home keeps today's strings"* and *"rendered from the `tierDisplay` map"* are **mutually
>    exclusive.** Today's string is "FREE Member"; the map's is "Free Plan". **Rendering from the map
>    IS the copy change turn 5 proposed and turn 6 claims to revert.**
> 2. *"The underscore problem stays visible until PM changes the map"* is **factually wrong.** The map
>    has **no underscore** — it yields "Premium Plus". The underscore comes from `home.tsx`'s own
>    `tier.toUpperCase()`, which is **precisely the thing being replaced**.
> 3. Turn 5's comps render **"Free plan" / "Premium Plus plan"** (lowercase *plan*) — which is
>    **neither** today's Home string **nor** the map's value.
>
> **The three options are distinct and must be chosen deliberately:**
> **(a)** keep `home.tsx` byte-identical → a genuine no-change; **(b)** render from `tierDisplay` →
> **is** a copy change and needs the PM sign-off audit §6.3 asks for; **(c)** a new string.
>
> **The plan's default is (a).** Anything else requires a signed-off call. The failure mode to prevent
> is a session reading "tier copy reverted", concluding "no change needed", and shipping (b) because
> the map was the nearest available implementation.

### 8.1 Two more copy items that are not C-1…C-5

- **C-6 · section-heading casing inside `overline` — benign, but do not rewrite the literals.** The
  comps render headings sentence-cased ("Your cosmic blueprint", "Planet placements", "Life themes",
  "Your numbers", "This month", "Key dates", "Today's insight", "Recent readings", "Start a
  reading"); the repo has them **Title Case**. Because `overline` is **UPPERCASE-only, the rendered
  output is identical either way** — a comp artefact, not drift. 🔴 **But an engineer transcribing
  from the comp will rewrite the source literals.** **Keep the source strings; apply
  `textTransform: 'uppercase'`.** One real deletion hides in here: **"Key Dates:" loses its colon.**
  Trivial, but it is a character.
- **C-7 · two labels deleted rather than reworded.** **"Overall Energy"** (`DailyInsightCard` ≈`:44`)
  and **"Unlock Full Insight"** (≈`:141`) do not appear in the design. Both are legitimate
  consequences of restructuring the card, **not** rewordings — recorded so nobody "restores" them
  later thinking they were lost by accident.
- **And the §6.3 item that needs a call nobody has asked for yet:** `astrology/index.tsx` ≈`:609`'s
  tier-conditional subtitle (§6.3 above). The comp shows only the `free` variant. **Pick one string,
  deliberately.**

---

## 9. PRIMITIVES SEQUENCING — after the codemod, in leverage order

**Why after, not before.** Audit §2.6, restated: restyling `Card`/`Button`/`ScreenContainer` before
the literals move produces *new containers full of old hardcoded colour* — "a worse outcome than not
restyling at all". Items 1–3 have low value until pass 1 lands.

`UI-audit.md` §3.5 ranks by **share of the 32 screens whose appearance changes**. That ranking is the
scope; this is the order.

| # | item | reach | why here | invariant to carry |
|---|---|---|---|---|
| **1** | **`ScreenContainer`** | **25 / 32 · 78%** | Owns background, gradient, scroll behaviour and the `24/32` content padding on every screen but 7. **Highest leverage by a wide margin** — changing its padding alone re-proportions three-quarters of the app | 🔴 **X1.** Restyle freely; **never touch the pinned-`Dimensions` structure.** Grain mounts as an absolute `pointerEvents="none"` **sibling inside** the pinned View; the card-entrance animates the **content block**, not the wrapper |
| **2** | **`Button`** | **19 · 59%** | Every primary CTA. The gradient, the `borderRadius: 12`, the haptic. Second-highest identity carrier after the background | 🔴 **X3.** Heights 48/56/64 frozen; inner `LinearGradient` keeps 100%/100%. The `primary` variant's gradient survives **with both stops equal** (a flat `accent` fill), so the largest saturated area on the paywall has no gradient to band. Press is opacity + scale **inside** the fixed box, so nothing reflows. **×5 variants**: primary / secondary / outline / ghost / **danger** |
| **3** | **`Card`** | **13 · 41%** | 33 lines, pure `className`, zero inline styles — **the cheapest meaningful win in the codebase.** Do it third to validate the new token set on something small | `shadow-lg` is **removed** (§4.5's zero-elevation rule). `rounded-lg` 20, `p-5`, `bg-surface`, optional `border-subtle` |
| **4** | 🔴 **Extract `SectionCard`** | **5 · 16%** | **Highest leverage-per-hour in the list.** Not a component yet: **5 inline copies, 4 byte-identical**, in `astrology/index`, `face`, `palm`, `combined`, `compatibility/[id]` — the *content body* of the app's main result surfaces, ~2,584 lines. It collapses 5 duplicated bodies **+ 5 duplicated `StyleSheet`s + 5 duplicated paywall CTAs** into one | The 4 `locked` variants render an identical body with a `🔒` emoji at hardcoded `{color:'#9CA3AF', fontSize:14}` → **Ionicon `lock-closed` 20** (§9.2 bans emoji-as-icon). `combined.tsx`'s copy is **different** (`{title, icon, children}`, no `locked`) — do not force it into the same shape blindly. **6 states**: default · collapsed · expanded · locked (→ LockShell density 2) · empty · error |
| **5** | **`Input`** | **9 · 28%** | All of `(auth)` + `birth-data` + the account modals. Owns the form aesthetic end to end | 🔴 **`label` is a required prop** — typed `label: string` with no default, so a placeholder-only field **cannot compile.** That is what makes `fg-placeholder`'s sub-AA 3.30:1 safe by construction. `h 56`, `rounded-md` 14, `bg-surface-overlay`, `border-subtle` → `border-strong` on focus. Error = a `danger` **1px border** with the message on `bg` at 5.17:1 |
| **6** | **`EntertainmentDisclaimer`** | **7 · 22%** | Trivial to restyle | 🔴 **X8. Restyle the container, never the string.** `role="text"`, **never** `importantForAccessibility="no"` — it is a legal notice and screen readers must reach it. Left-aligned, not centred. **Six string lengths (28→196 chars), no truncation, no "read more", no fixed height** |
| **7** | **`GeneratingReading`** | **5 · 16%** | The 60-second wait users actually stare at. **Disproportionate perceived-quality impact** relative to its screen count | 🔴 **The 0.97 asymptote is preserved exactly** — the existing four-leg `withSequence` (12s→25s→45s→60s, targets 0.35→0.65→0.88→0.97) stays, and the bar **never reaches 1.0** until the server says ready, then runs 0.97→1.0 in `dur-slow` 420. **X17: `minWidth:220`, `maxWidth:320 height:8`, and `minHeight` 44 → 58 (D3).** "About a minute" is a range, **never a countdown** |
| **8** | **`EmptyState`** | 4 · 13% | Also resolve the `qa.tsx` ≈`:358` name shadow while here | **One action maximum, never two.** The plate is `importantForAccessibility="no"` (decorative) |
| **9–11** | **`ShareCard` · `ShareableQuote` · `AffirmationCard`** | 4 each · 13% | 🔴 **`ShareCard` is what leaves the app and lands in someone's feed — marketing leverage far exceeds 13%** | 🔴 **X6/X7 — see §7.3, including the binding rule that "failed" is reachable only when `isShareDismissal` is false.** Both share surfaces are **excluded from the a11y tree**; the share *button* carries the label. **W1 (O-4)**: SVG `RadialGradient` inside `react-native-view-shot@4.0.0-alpha.2` on Android is unverified — the **flat fallback is a variant, not a degradation** (a `surface-raised` ground with the accent carried by a 2px rule and the type), so either can ship |
| **12** | **Loading system** (`LoadingView` + `LoadingSpinner`) | 4 each · 13% | Restyle as **one** system | **3 densities**: skeleton (known layout) · inline spinner (button/row) · screen (first paint). 🔴 **Never two at once on one screen.** Shimmer is self-driven `dur-ambient` 2600 / `ease-linear` |
| **13** | 🔴 **`LockShell` absorbs `LockedSection` + `LockedBanner`** | 3 → **11 sites** | **A rename PLUS a merge** — the 3 call sites become density-2 usages and **the old files go.** This is what unifies **three competing lock treatments** (audit §9 Q13): the duplicated `SectionCard` inline lock, `LockedSection`/`LockedBanner`, and `BlurView intensity={20}` | 🔴 **BlurView 20 retained at density 1 ONLY.** Blur is the **only** place in the system that blurs anything, so the meaning users already learned ("blurred = paywalled") is preserved rather than diluted. **Density 3 ships the title-only variant** — the richer "tease" is **BLOCKED** (O-1: no endpoint returns a teaser field), and density 3 upgrades to it later **with no layout change.** Locked and unlocked **share the same box, padding and radius** so the list does not reflow when the payload changes; locked **never dims the title.** The CTA **never names a tier or a price** |
| **14** | **Tab bar** (`(main)/_layout.tsx`) | **24 · 75%** | Not a component, but persistently visible on all 24 `(main)` screens. **Belongs in the primitives phase despite being a config block** | 🔴 **X18: 85 / 24 / 8 unchanged.** Labels are **`text-2xs` 12/16, not `overline`** (uppercase-only, and the labels are Title Case). `dur-base` 220 colour cross-fade; **the bar itself never moves** |
| **15** | **`Sheet`** 🆕 | 4 account modals + pickers + info | New. Replaces the astrology hub's bespoke Modal **and its 7 `assumedNote*` StyleSheet rules** | 🔴 **The only component whose ground is `surface-overlay`, so §2.1's prohibition lands here and only here: `danger` is banned as text at any size and any weight** (4.28:1). The destructive action is a **`danger`-filled Button with an `on-accent` label** at 5.60:1; cancel is `ghost`, **below** the destructive one so the thumb-nearest position is the reversible choice. `accessibilityViewIsModal`, focus moves to the title, **the scrim is a labelled dismiss button**. **Degrades to a plain `Modal` fade at the same duration if gestures are unproven** |
| **16** | `(auth)` / `(capture)` / `(paywall)` layout `contentStyle` | 13 · 41% | Three hardcoded background hexes (`#0F0A1A` ×2, `#0A0A0F` ×1) that will otherwise **flash the old colour behind new screens** | ⚠️ `#0A0A0F` appears **exactly once in the codebase** and audit §9 Q6 asks whether it is a deliberate darker camera surface or a digit transposition of `#0F0A1A`. **The token phase must either name it or delete it** — pass 1 forces the question |
| — | everything below | 1–2 each · ≤6% | **Screens-phase work, not primitives.** `StrengthsList`, `ScoreCard`, `GrowthCard`, the 4 account modals, capture overlays, `insights/` ×7, `profile/` ×4, `compatibility/` ×2, `BirthChartWheel`, `StreakBadge`, `FeatureComparisonTable`, `NewBadge`, `ErrorView`, `ErrorBoundary`, `NotificationPrompt`, `BiometricConsent`, `CaptureInfoModal` | — |

**Cut line for the primitives phase: items 1–15.** That is ~78% of screens through 6 real components,
2 extractions, 2 new components and 1 layout config — the smallest set that makes the screens phase
mostly mechanical.

### 9.1 FIVE cross-cutting items that ride the primitives phase

| item | detail |
|---|---|
| 🔴 **`openPaywall(source)`** | **The worst instrumentation seam in the app, and the cheapest to fix.** There is **no** helper: navigation to the paywall is an ad-hoc `router.push('/(paywall)/')` at **≥8 origins** — `qa.tsx` (a *local* `openPaywall`), `astrology/index.tsx` (inside the duplicated `SectionCard`), `astrology/weekly`, `astrology/daily`, `readings/index`, `numerology/index`, `profile.tsx` ×2, plus the 3 other `SectionCard` copies and `LockedSection`. **`hooks/usePaywall.ts` exists and no screen imports it.** 🟢 **Extracting `SectionCard` (item 4) collapses 4 of these by itself.** Route the rest through **one** `openPaywall(source: string)`. The `source` argument is what makes the eventual `paywall_shown` event useful — *which lock converts?* — and it is far cheaper to thread now than to retrofit |
| **Grain — THREE mount points (D6)** | 🔴 **`ScreenContainer` · `welcome.tsx` (inside its X2 wrapper) · `(paywall)/index.tsx`. NOT the `(auth)` layout.** Design finding **I-1**: all six non-welcome `(auth)` screens **already use `ScreenContainer`**, so a fourth mount lays a **second 5% layer over all seven visible `(auth)` screens — ~10% effective opacity on the entire first-run funnel**, twice the specified density, on the screens a new user sees first. Separately it is **not implementable as described**: `(auth)/_layout.tsx` is a **bare `<Stack>`** with no wrapping View and `contentStyle.backgroundColor` cannot carry a tiled image, so it would need wrapping the `Stack` in a `View` — a structural change to a layout file — after which the grain sits *above* the `Stack` and stays static while screens slide beneath it under `animation: 'slide_from_right'`. **Three mounts achieve W2's stated goal with no double-tiling and no layout surgery.** ⚠️ Also unverified: that RN 0.79's `Image` tiles reliably via `resizeMode="repeat"` on Android. Fallback is one pre-scaled 2×-density asset per mount — an asset change, not a design change |
| **`BirthChartWheel` — THREE lines (D7)** | 🔴 **Not the one-line change the design calls it.** In the repo `viewBox` is **templated from** `size` (`viewBox={\`0 0 ${size} ${size}\`}`) and `cx`/`cy` are **derived from** `size`, while `outerR=140`, `innerR=120`, `planetR=80` are **absolute**. Changing `size` alone does the **opposite** of the intent: at 280 the outer ring spans exactly 0→280 and clips its own stroke and the glyphs outside it; **at 240, `cx=cy=120 < outerR=140`, so the ring renders outside the viewBox and is cut off.** The three edits, and they must land together: **(1)** a `VIEWBOX = 300` constant with `cx`/`cy` = `VIEWBOX / 2`, **decoupled from the rendered size**; **(2)** `viewBox="0 0 300 300"` as a **literal**, never from `size`; **(3)** `size` from `onLayout` feeding **only** `width`/`height`. Then `Math.min(width, 320)` gives 280 at 360dp and 240 at 320dp, and **every radius, angle and glyph coordinate survives untouched.** Also: **11 raw hex → 2 namespaced `theme.chart` values**, and the allow-list is *"only this file may import `theme.chart`"*, 🔴 **never** a file-level exemption on `no-raw-hex` |
| **Deletions the plan carries explicitly** | **4 dead components** (`SkeletonCard`, `LuckyElementCard`, `LockedOverlay`, `PremiumBadge` — transitively dead, its only importer is `LockedOverlay`) · **`LockedSection` + `LockedBanner`** (absorbed by LockShell) · **`lib/colors.ts`** (pass 1) · **the dead config tokens**: the whole **`cosmic.*` nest** and **`primary-light`**, both at **zero className usages** · **`LIFE_THEME_EMOJIS`** (the 5 icon names are already in the data) · the 2 dead `w-30 h-30` classes · the 2 `space-y-3` classes. Audit §9 Q12 asks the owner to confirm the 4 components; **do it before deleting** |

| 🆕 🔴 **SIX TEXT-GLYPHS → Ionicons (owner ruling 2026-07-31, pass 4)** | **The Latin faces do not cover them, so they render per-OEM — which this project has already ruled against twice.** ▲ / ▼ (`U+25B2/25BC`) are absent from **Figtree**; ● (`U+25CF`) is absent from **both** faces. All six sit on Figtree Texts, so they resolve through the platform's symbol-font fallback (Noto Sans Symbols on Android, whatever the OEM ships elsewhere). **Five are disclosure toggles** — `birth-data.tsx:377` (the "Why we need this information" reveal), `astrology/index.tsx:85` and `:125`, `readings/face.tsx:69`, `readings/palm.tsx:73` — and **one is a pagination dot**, `cosmic-report.tsx:701`. 🔴 **THE RULING IS "CONVERT, NOT ACCEPT", and the precedent is already set twice: the 🔒 lock glyph and the Stage-1 rejection of text glyphs in the tab bar.** A ▲ that is functional iconography rendering in a per-OEM fallback face is exactly the thing those two decisions were about. Straight swaps, and Ionicons is already a dependency: `chevron-up` / `chevron-down` for the five toggles (the design's own idiom for disclosure) and `ellipse` for the dot. ⚠️ **It lands HERE and not in pass 4 because it changes the ELEMENT, not the style** — §9 owns iconography, and four of the six carry a `/* GLYPH */` marker whose whole point is that a codemod does not touch them. 🟢 Delete the markers with the glyphs; `no-numeric-fontsize`'s excepted count falls from 60 and **that fall is the arrival check** for this item |

### 9.2 Two additive items that come after the primitives, not with them

- ~~**~180 `txt()` / `<Txt>` conversions** for opt-in font scaling (§3.6).~~ 🟢 **DONE IN PASS 2b
  (2026-07-31), and this row is why it had to move**: the global scaling freeze without the
  conversions ships an app where nothing scales (O-13/P23). **200 conversions + 59 opt-in props
  landed; O-13's inline half is closed.** ⚠️ **The `className` half is not** — a
  `<Text className="text-sm">` carries no props and still freezes at pass 4. See §3.6.
  > ### ✅ CONSEQUENCE — RESOLVED. `<Txt>` WAS UNCLAIMED BY ANY PASS; IT IS NOW **DROPPED**.
  >
  > 🔴 **OWNER RULING R-A, 2026-08-03 — option (b).** All three references were corrected in the
  > same commit (`theme.js`'s C-i block, design §6.2's usage line and its C-i note, design §3.6),
  > which is the half that makes the ruling stick. **The binding reason is the one `primitives-plan.md`
  > §5 gives, and it is stronger than the table below states: option (a) CANNOT DELIVER THE
  > UNIFORMITY THAT IS ITS ONLY BENEFIT.** The two structure-frozen files hold 14 of the 28
  > fractional sites and a large share of the inline reading copy and *cannot* migrate — so (a)
  > ships two idioms for one concept permanently, which is the drift this system exists to remove.
  > One idiom everywhere beats a partial migration. **The row is closed; do not re-open it.**
  >
  > ⚠️ Recorded rather than buried: the one real argument for a wrapper survives — it reads better
  > at 200 sites and could place P23's className-half opt-in automatically. That win belongs to
  > **`C-P4-5`**, it is available to any wrapper later, and it never required this one now.
  >
  > *The original ruling text is kept below as the record of what was decided against.*
  >
  > **Owner ruling, 2026-07-31.** This bullet was the only place `<Txt>` was scheduled, and 2b
  > completed the work **without building it** — deliberately: it is a new component (§9 runs after
  > the codemod so nothing is restyled twice), and `<Text>` → `<Txt>` changes the JSX element, which
  > `qa.tsx` and `cosmic-report.tsx` forbid (D8, structure-frozen). The double-invocation cost that
  > motivated C-i's "prefer the wrapper" is gone anyway — **`txt()` is memoised and frozen, one
  > instance per step**, so `style={[t.txt('x').style, …]}` is free and referentially stable.
  >
  > **So `<Txt>` is now a component that the design names (`theme.js`'s C-i note, design §6.2 and
  > §3.6) and that no pass owns.** Two honest exits, and the primitives phase must pick one:
  >
  > | | |
  > |---|---|
  > | **(a) BUILD IT and migrate the ~200 memoised call sites to it** | The design's stated preferred idiom, and it reads better at 200 sites. Cost: a mechanical but real migration, plus a decision about the two structure-frozen files — which would have to stay on the `<Text>` + spread form, leaving **two idioms permanently**. |
  > | **(b) DROP IT from the design** | The `<Text {...t.txt(step)}>` + spread form is now the shipped idiom everywhere, it is uniform, and memoisation removed its only objection. Cost: `theme.js`'s C-i comment, design §6.2 and §3.6 all reference `<Txt>` and would need correcting so a later reader does not build it by mistake. |
  >
  > 🔴 **Do not simply leave the references in place.** A component named in three documents and
  > built by nobody is exactly the kind of half-fact that a future session resolves by *building*
  > it — mid-screens-phase, against the frozen files, for no benefit. **Whichever way it goes, the
  > references get updated in the same commit.**
- **The five spacing outliers** (`14, 30, 32, 48, 64` = 56/120/128/192/256 dp) migrating from
  migration-only keys onto authoring steps. **Requires visual sign-off — it changes pixels by design.**
  `w-12`/`h-12` alone is **32 usages**, i.e. every avatar and icon well in the app. Not part of any
  identity pass.

---

## 10. RELEASE — 2.1.0 as a staged rollout

### 10.1 Why a percentage rollout is the only real rollback lever

`expo-updates` is configured `checkAutomatically: "ON_ERROR_RECOVERY"` with
`runtimeVersion.policy: "appVersion"`. **2.1.0 bumps the version, so it is a full native build and
there is no OTA path** — an update can only be fetched on error recovery, not pushed to fix a bad
release. Combined with **no staging and no pre-release device-test path** (§4.1), that leaves exactly
one lever: **the Play Console rollout percentage.**

> **Ship 2.1.0 as a STAGED ROLLOUT at 5–10%.**

**Watch before each ramp:**

| signal | where | why this one |
|---|---|---|
| **crash-free user rate** | Play Console → Android vitals | The revamp touches the **root layout's splash sequence** (pass 4's `useFonts`) and the **font pipeline**. A font that fails to decode behind a gate on `fontsLoaded` alone hangs the app on the splash — which shows up as ANRs and 1-star reviews, not as a crash |
| **ANR rate** | Android vitals | Same reason, plus pass 4's blocking async condition |
| **review sentiment** | Play Console reviews | 🔴 **The only instrument that can detect the thing most likely to go wrong**, because there is no analytics in the app (§4.1) and the biggest risks are *visual*: pass 2b's +4.4px leading on 309 sites, pass 3b's 2px on 73 corners, the Explore emoji→Ionicon change, and Vellum itself. **A regression here is not a crash — it is users saying it looks worse**, and nothing but reviews will tell you |
| **subscription starts / restores** | RevenueCat dashboard | Pass 1 changes the paywall CTA's colour pairing (A5) and §7.8 changes its failure states. **This is the highest-revenue surface in the app** |
| **"Rate the app" prompt behaviour** | anecdotal | X4/X5 ride through pass 4's edit to the root layout |

**Ramp only when all five are flat against the 2.0.0 baseline.** Suggested: 5–10% → 20% → 50% → 100%,
with at least 48h at each step (long enough for the daily push scheduler and the once-a-month Cosmic
Report surface to have exercised).

### 10.2 The three internal-testing cut points

| cut | after | what it is for | promote? |
|---|---|---|---|
| **Cut 1** | 🔴 **pass 0 + pass 1 (1a + 1b) — and NOT the R1 commit.** ⚠️ **AMENDED 2026-07-31**: this row read "+ the R1 commit" until the ordering ruling moved 1b's review AHEAD of R1 (R1 changes what *renders*, so bundling them would conflate behavioural with colour changes in one review — and the lock surfaces are exactly where the two overlap). Cut 1 is therefore built at the END OF 1b. `versionCode 34`; see `owner-actions.md` P30. The R1 commit lands after the review, on cut 2's build. | The colour codemod is the largest single pass (~1,555 sites, 58+ files) and the R1 work is **behavioural**. Getting an APK in hand here means the token unification and `lib/colors.ts`'s deletion are exercised on a device **before** three more passes stack on top | 🔴 **NO** |
| **Cut 2** | **pass 5** (i.e. after 2a, 2b, 3a, 3b, 4, 5) | **The first cut that looks like Vellum.** Everything visual has landed. This is where the §4.4 screenshot pass is done properly and where **the one iOS build is spent** (§5.1 — TestFlight internal, Release config, the only instrument that can verify X1–X19) | 🔴 **NO** |
| **Cut 3** | **the primitives phase** (§9 items 1–15) | The release candidate. Full §4.4 pass, full `owner-actions.md` walk, the rebrand assets in place (P18, **including `app.json`'s two literals** — or the app launches on the old purple and cross-fades into Vellum) | 🟢 **YES — this is the AAB that gets promoted** |

🔴 **Do NOT promote cuts 1 or 2.** Both are mid-revamp states: after cut 1 the app is fully repainted
in the *old* palette behind new names, with old radii and the system font; after cut 2 the primitives
are still unextracted, `LockedSection` still exists beside `LockShell`, and the paywall's tri-state
(§7.8) may not have landed. **Neither is a shippable product** — they are instruments.

### 10.3 The release-cycle mechanics (per `dev-notes/workflow.md`)

`tsc --noEmit` clean ×2 → `npm run gate` clean → commit → push → **`eas build --platform android
--profile production`** (AAB; `autoIncrement: true`, so versionCode increments itself — **never
hand-edit it**, and `app.json`'s `versionCode: 26` is inert under `appVersionSource: "remote"`) →
**Play Internal Testing** → fix cycle if needed → **promote the same AAB** to Production, never
rebuild between tracks → merge to `main`.

**Version bump for 2.1.0:** `app.json` `version`, **both** `package.json` files. Leave
`versionCode` / `buildNumber` alone.

🔴 **Walk `tracking_files/owner-actions.md` before the cut-3 build, the promote, and the ramp** — it is
the durable list the handoff would lose. **P18 (rebrand assets) is a hard gate on 2.1.0** and it has a
Play-listing review turnaround: app icon, adaptive icon, splash, favicon, feature graphic,
screenshots, **plus `app.json`'s `#0F0A1A` at `:16` and `#2D1B4E` at `:39`**, plus `ShareCard`'s
hardcoded `['#6B21A8','#0F0A1A']` gradient — **every card already shared looks like a different
product** until that changes. **Do not discover this during the staged rollout.**

---

## 11. ESTIMATE — in sessions, and which passes need judgement

A "session" is one focused working session with a clean context. **These are honest, not optimistic**,
and the two lines marked 🔴 are the ones that cannot be automated at all.

> ## 🔴 THE UNIT OF WORK IS NOT THE SITE — RE-BUDGETED BY DISTINCT OPERATIONS (2026-07-30)
>
> **This table was built on SITE COUNTS throughout, and that is the wrong metric for most passes.**
> Pass 1a measured it: 62 sites in the worst file were **11 operations** (§11.1). Where a rewrite is
> **context-free** — every occurrence of a value maps to the same token — cost scales with **distinct
> values**, not occurrences. Where it needs **per-context judgement**, cost really does scale with
> sites.
>
> | pass | unit | why |
> |---|---|---|
> | **1a** | **literal** | ~64 distinct values, top 8 = 68% of occurrences. Identity is context-free |
> | **1b** | 🔴 **SITE** | Role resolution is **per-context** by definition — "is this label tappable?" cannot be answered per-value. **Stays the expensive pass** |
> | **2a** | **literal** | 29 distinct inline `fontSize:` values + §3.5's 6 fractional mappings |
> | **2b** | **literal** | The work is *deleting* explicit `lineHeight` so the ramp applies — one operation per distinct value |
> | **3a** | **utility** | ~102 distinct utilities across 1,246 sites, and the strings are **identical before and after** |
> | **3b** | 🔴 **SITE** | 🔴 **The 49 `rounded-xl`/`rounded-lg` are ambiguous BY NAME** — legal in both scales with different values, so **no per-literal shortcut can exist.** A human reads each |
> | **4** | ⚠️ **MIXED — split the estimate** | The className half is **~8 operations** (a 9-weight → 5-family map). The **~173 inline `fontWeight:` sites need family context** (`body` vs `display` vs `quote`), which is per-site |
>
> ⚠️ **And §3.2's scatter-ranked file order is NOT an effort model for the identity passes.** 97 inline
> styles and 3 local components make a file expensive to **RESTYLE** and nearly free to **RENAME**.
> **That ranking is right for the primitives and screens phases only.**

| pass | sessions | mechanical or judgement? | what drives the number |
|---|---|---|---|
| **0** | **1** | **mechanical** | 7 files, 2 `expo install`s, no product sites. The only real work is transcribing §6.2 correctly and getting the S0 bridge namespace-safe |
| **1a** | ~~2–3~~ 🟢 **1–2** | **mechanical — MORE so than estimated** | ~1,129 sites (O-23: golds included). **CALIBRATED against `astrology/index.tsx`, measured — see §11.1.** The estimate's premise was that the worst file needs *"most of one session"*; it took **well under half of one**, because 1a's unit of work is a **literal, not a site**: 62 sites in that file reduced to **11 distinct find-and-replace operations**. The `97 inline styles / 3 local components / own StyleSheet` framing predicted the wrong cost — those make a file hard to *restyle*, not hard to *rename* |
| **1b** | 🔴 **2–3** *(unchanged — per-SITE)* | 🔴 **JUDGEMENT — cannot be automated** | ~445 sites across §1.6b's eight decision rows. The three that carry real cost: **V-2's 66 `primary` sites have no design target at all** and need per-site role assignment (text → `fg-secondary`, decorative → `accent-2`, border → `border-strong`); **V-1's ~152-site three-into-one `accent` collapse** makes ~31 purple sites turn gold, visibly; and **the 80 `color:'white'` + 55 `#FFFFFF` + 299 `text-white` role resolutions** — which reduce to *mechanical default `fg` + ~10 reviewed `on-accent` fill sites*, so they cost far less than 434 suggests, **but only if V-7's enumeration is done first.** 🔴 **Blocked until the decision table is filled** |
| **R1 commit** | **1** | judgement (behavioural, but well-specified) | 5 sites, ~40 lines. §6's table is complete enough to implement directly; the cost is re-reading `astrology/index.tsx` and getting the pill/gate coupling right |
| **2a** | ~~1–2~~ 🟢 **1** | mixed — **per-LITERAL** | 630 of 660 `text-*` usages need **no edit**. The work is 346 inline `fontSize:` + the `TYPE_FREEZE` config + 🟠 **the 30 `text-4xl/5xl/6xl` sites in 27 files with NO ramp target** — per-site decisions the design never enumerated, ~30 small judgement calls |
| **2b** | **1** *(+1 for review)* — **apply is well under a session; the REVIEW is the cost** | **mechanical to apply, JUDGEMENT to accept** — **per-LITERAL** | One config edit + 45 class strips + 63 inline declarations. **Trivially small to write and the largest vertical change in the revamp** — budget a full separate review session for the §4.4 screenshot pass, because that pass **is** the gate |
| **3a** | ~~1~~ 🟢 **<1 (half)** | **mechanical — per-UTILITY, and the strings do not change** | Almost nothing to edit — the strings are the same before and after. The real work is the 4 named fixes (`space-y-3` ×2, `w-30 h-30` ×4, `24`/`32` → `screen-x`/`screen-y`) and asserting `--diff` = 0 across 102 utilities |
| **3b** | 🔴 **2** *(unchanged — per-SITE)* | 🔴 **JUDGEMENT — cannot be automated** | 373 sites, of which **the 49 `rounded-xl`/`rounded-lg` sites must be hand-written and the diff read by a human**, because both names are legal in both scales with different values and **no grep can distinguish migrated from unmigrated.** Plus 162 inline `borderRadius:` across 21 values (incl. the one-offs `9, 11, 18, 25, 55` and both `99` and `999`). The 73 `rounded-2xl` sites are **one** decision, not 73 |
| **4** | **2**, and 🔴 **SPLIT IT: ~0.25 className + ~1 inline + ~0.75 font install/device** | ⚠️ **MIXED** — className half mechanical, inline half **per-SITE** | ~501 sites is large but genuinely mechanical (a 3-way className map + 173 inline deletions). The cost is the atomic font install: 5 TTFs, the `useFonts` gate on `fontsLoaded \|\| fontError` inside an **already-delicate splash sequence**, and a mandatory device check that all five faces render distinctly — a silent fallback to Roboto/SF is this change's documented failure mode. **+1–3 sessions if O-13 resolves to (a)** and the ~180 `txt()` conversions come into scope |
| **5** | **1** *(mostly review)* | mechanical to apply | 22 values in one object. **The session is almost entirely the full §4.4 screenshot pass and the contrast spot-check** |
| **primitives (§9)** | **5–8** | mixed | 15 items. Items 1–3 are small and high-leverage. **Item 4 (extract `SectionCard`) is the highest leverage-per-hour in the plan** and also fixes 4 of the 8 `openPaywall` origins for free. Items 13 and 15 (`LockShell`, `Sheet`) are **new components**, not restyles. `BirthChartWheel`'s 3-line change is small but must be exactly right |
| **codemod total** | ~~13–17~~ 🟢 **10–13** | | Re-budgeted per the banner above. **1b and 3b are unchanged and now dominate the critical path** |
| **with primitives** | ~~18–25~~ 🟢 **15–21** | | Primitives unchanged at 5–8 — they are genuinely per-component |

### 11.1 🟢 CALIBRATION — `astrology/index.tsx`, measured (2026-07-30)

**The point of doing this file first was to calibrate the table. Here is what it actually cost.**

| | §11 predicted | **measured** |
|---|---|---|
| hex literals | 52 | **53** |
| rgba | — | 11 |
| `color:'white'\|'black'` | — | 17 (16 white + 1 black) |
| inline `style={{}}` objects | 97 | 97 ✅ |
| `StyleSheet.create` | 1 | 1 ✅ |
| ramp classNames | — | **0** |
| arbitrary-value classNames | — | **0** |
| retired custom classNames | — | **1** (`text-white`) |
| **1a-eligible sites** | — | **62** |
| **1b residue left behind** | — | **21** (11 rgba + 8 hex + 1 `black` + `colors.*` ×2) |
| **effort** | *"most of one session"* | 🟢 **well under half a session** |

**🔴 THE CALIBRATION FINDING, and it should change how the remaining 1a files are budgeted:**

> **1a's unit of work is a LITERAL, not a SITE.** 62 sites collapsed into **11 distinct operations**
> — 4 JSX-prop forms (`color="#9CA3AF"` → `color={t.color['fg-muted']}`), 6 quoted-literal forms,
> and 1 className. Every occurrence of a given hex maps to the same token **by definition**, because
> that is exactly what makes the pass an identity pass. So a file with 25 × `#9CA3AF` costs the same
> as a file with 1 × `#9CA3AF`.

**Consequences, stated so the next session does not re-derive them:**

1. 🟢 **Re-budget 1a at 1–2 sessions, not 2–3.** The driver is **distinct literals across the tree**
   (~64 values, of which the top 8 are 68% of all occurrences), **not** the ~1,129 occurrences.
2. 🔴 **The `97 inline styles / 3 local components / its own StyleSheet` framing predicted the wrong
   cost.** Those properties make a file expensive to **restyle** (passes 2b/3b, primitives) and are
   nearly free to **rename**. **Do not reuse §3.2's "file order, highest leverage first" ranking as a
   1a effort model** — it was built from scatter, which is the right metric for later passes.
3. ⚠️ **Where the real 1a cost sits is the EXCLUSIONS, not the replacements.** The only genuinely
   careful work in this file was deciding what to leave: the 8 V-8/V-3 hexes, the 11 rgba, the one
   `black` on a badge that R1 deletes, and both `colors.*` references. **Every exclusion needs a
   named §1.6b row to justify it** — that is the judgement, and it does not scale with occurrences
   either. A file with no 1b residue is nearly instant.
4. 🔴 **A blind global replace is CORRECT for 1a and would be WRONG for any other pass.** It is safe
   here only because identity makes the mapping context-free. Verify two things first, as this file
   did: that no occurrence sits in a non-colour context (a comment, a non-style string), and that the
   deferred literals are **different strings** from the migrated ones. `#F59E0B` (1a) vs `#92722D`
   (1b) sitting in the *same ternary* is exactly why the check is per-literal, not per-line.

**Three things that will make this longer than the table says, listed rather than absorbed:**

1. **1b is blocked on the §1.6b decision table and C-1…C-5.** If those calls arrive late, pass 1
   stalls and everything queues behind it. **Get the decision table filled before pass 0 finishes.**
2. **Each of the 5 review-gated passes (1b, 2b, 3b, 4, 5) needs an owner or designer in the loop.**
   The plan cannot compress someone else's calendar.
3. **The one iOS build (§5.1) depends on two owner-side unknowns** — Developer Program membership and
   certificate validity. If a certificate has expired, resolving it is Apple's timeline, not ours.

---

## 12. OPEN / BLOCKED — carried forward, each with what would unblock it

> ## 🔴 THIS SECTION IS THE SOLE OWNER OF THE `O-` SEQUENCE
> ### ▶ NEXT FREE NUMBER: **O-116**
>
> **OWNER RULING R5 (2026-07-30).** The `O-` sequence is **one** sequence across the whole plan set,
> and **this section is its registrar.** Rules:
>
> 1. **Before assigning any new `O-` number, in any document, read the "NEXT FREE NUMBER" line
>    above.** It is the only authority. Then assign, and **bump the line in the same edit.**
> 2. `UI-revamp-design.md` §12, `owner-actions.md`, `build-27-caveats.md` and the progress log all
>    **read** the number from here. They never derive it by scanning their own table.
> 3. **`owner-actions.md` owns the `P-` sequence** by the same rule, and this file reads it from there.
>
> **This is the fix for the O-14/15/16 collision**, in which a design-side transcription numbered five
> new items O-14…O-18 by counting its own table — colliding with this file's O-14 (iOS certs), O-15
> (`max-w-*` rem) and O-16 (`#0A0A0F`). Counting a local table can never be correct for a shared
> sequence, so the rule is *ask the registrar*, not *count harder*.
>
> **Current allocation** — `UI-revamp-design.md` §12 holds **O-1…O-10** and **O-17…O-21**; this
> section holds **O-11…O-16** and **O-22…O-51**. 🆕 **O-41…O-51 were assigned 2026-08-03** — O-41…O-47 discharge `primitives-plan.md` §11.2's backlog of `M-1`…`M-7`, and O-48…O-51 are that session's own findings.

**Carried from the design's §12.** Statuses re-stated as this plan needs them.

| # | item | status · what would unblock it |
|---|---|---|
| **O-1** | **LockShell density 3's *tease* field** — "real copy the server chose to send" describes a **server change, not 27.1** | **BLOCKED on server work.** The **mobile-only alternative ships instead**: the title-only variant (§9 item 13), using fields that already exist. If a teaser field lands later, density 3 upgrades **with no layout change** |
| **O-2** | **Life themes have no per-theme lock signal** | **Presence-driven rendering is the honest design** and it ships (§6, site 3). Distinguishing "withheld because unpaid" from "not generated yet" needs a `locked: string[]` on the response or server-side omission |
| **O-3** | **Weekly Forecast has no lock signal** | Ships as designed: route, let the destination decide. Closes only with **§B5's `entitlements` field** |
| **O-4** | 🔴 **W1 — SVG `RadialGradient` inside `react-native-view-shot@4.0.0-alpha.2` on Android.** Affects `ShareCard`, `ShareableQuote`, `CompatibilityShareCard` | **Needs device verification.** All three are designed so the aura is **removable without redesign**; the flat fallback is a variant, not a degradation. **Unblocked by cut 1's APK.** Related: audit §9 Q10 asks whether staying on an alpha is acceptable at all for the app's main organic-growth surface |
| **O-5** | 🔴 **W3 — `borderWidth: 1` at 7% white is 3 physical px on a 3× panel** | **`a11y.hairline` is a single token**, so the swap to `StyleSheet.hairlineWidth` is **one line** in `theme.js`, pending a device check. ⚠️ **Note the interaction: at hairline width the 7% opacity may need to rise to ~10% to stay visible** — a value change, not a structural one. **Unblocked by cut 2** |
| **O-6** | 🔴 **A6's consequence: the word "free" leaves the primary CTA** | **A PM decision.** The design's position: it is the only honest option on Android, because intro-offer eligibility is **per-user and unknowable client-side** (`introPrice` describes the *product*). PM may read it as a conversion cost |
| **O-7** ✅ **CLOSED 2026-07-31** | **X13's `minHeight: 200` on Home's This Month** | 🟢 **OWNER RULING: it STAYS — and the ruling is now UNCONDITIONAL.** The old "pending an iOS check" clause is deleted, not left hanging: iOS is paused, so the check cannot happen and the conditional was a promise nobody could keep (§5.4). The two flip side effects below already made "keep it" the cheaper call with no device involved. Superseded text: ~~pending an iOS check~~, with the empty case as a short centred `fg-muted` line. Two side effects of the flip make "keep it" cheaper: the empty-`keyDates` case grows ≈147→≈161 so the dead whitespace shrinks from ≈53px to ≈39px, and X13d's card now sits at 76 so its 72 floor is no longer load-bearing. **No longer blocked — closed. Cut 2 is Android-only.** |
| **O-8** | **`FeatureComparisonTable` cannot be payload-driven** — no per-package feature list reaches the client | Restyled, not restructured. 🔴 **If the entitlement map changes server-side, this table silently lies.** Same open decision as **P12** |
| **O-9** | **Explore icon differentiation at 20dp** | Needs a **squint test on a real device**: `planet-outline`, `sparkles-outline` and `star-outline` are all radial-symmetric line glyphs and may blur into one another in peripheral vision. The **grouped alternative is additive either way** (three `overline` groups: *Charts & numbers* · *Reports* · *Destiny*). **Unblocked by cut 1** |
| **O-10** | **`(paywall)`'s badge copy** — "MOST POPULAR" / "BEST VALUE" cannot survive a dynamic package list | **PM copy call**: derive **one** badge from computed savings, or drop both. **The comp works with zero badges** |
| **O-11** 🆕 | 🔴 **The §1.6b colour decision table is unfilled.** Eight rows, and three are genuine gaps in the design: **`primary` `#C4B5FD` ×66 has no Vellum target**, **`pink` `#EC4899` ×32 has none**, and **there is no `scrim` token** for the 16 `rgba(0,0,0,0.5–0.7)` sites | 🔴 **BLOCKS PASS 1b.** Unblocked by a designer/owner ruling on §1.6b's eight rows. Recommendations are in the table; the two token-table *additions* it implies (`scrim`, and a home for `primary`) should go back to the designer as such rather than being invented in a codemod |
| **O-12** 🆕 | **The prepush/CI wiring does not exist.** No `prepush` script, no husky, `.git/hooks` holds only samples, `core.hooksPath` unset, **no `.github/` and no CI of any kind**. And **`rg` is not on PATH**, so §7.2's gate is inoperative as authored | **Unblocked by pass 0**: ship the gate in portable `grep` form (§3.0.2) + a tracked `.githooks/pre-push`. The one-line `git config core.hooksPath .githooks` is **an owner action, per machine** — register it |
| **O-13** 🆕 | 🔴 **The global font-scaling freeze opens an accessibility regression.** §3.6 sets `allowFontScaling = false` app-wide at pass 4, while §8 puts the ~180 `txt()`/`<Txt>` conversions "additive AFTER pass 4". **Today every `<Text>` scales.** If the conversions slip past 2.1.0, the release ships with font scaling **disabled app-wide** — worse than today for low-vision users, and a real Play Store accessibility exposure | **An owner decision, and it must not ship undecided.** **(a) Recommended:** pull the ~180 conversions into 2.1.0 for the five `scales: true` steps on reading-copy surfaces (+1–3 sessions). **(b)** hold the global freeze until they land, accepting that `qa.tsx`'s composer and X3's fixed heights can reflow at large font scales in the meantime |
| **O-14** 🆕 | **iOS certificate/membership validity** (§5.1 unknowns 1–2) | `eas credentials -p ios` + the Apple Developer portal — **owner runs both.** Until then, "verify X1–X19 on iOS" is producible in principle but unscheduled in practice |
| **O-15** 🆕 | **`max-w-sm` / `max-w-md` stay `rem`-valued permanently.** §6.2 does not replace `theme.maxWidth`, so 2 sites remain `inlineRem`-dependent after the whole codemod | **Accept and register as a caveat**, or add `maxWidth` to the replaced keys — which would then need its own value decision for both sites. Low stakes (2 sites), but *"the config is explicit px so `inlineRem` goes inert"* is **false** for `maxWidth` and for `lineHeight`-until-2b, and someone will eventually rely on that claim |
| ~~**O-16**~~ ✅ **CLOSED 2026-08-03 — AND IT NEEDED NO CODE.** Owner ruling **R-D** directed *unify to the canvas*, with the clause *"confirm what it currently resolves to before changing anything — 1b may already have migrated it."* 🟢 **1b already had.** Measured at `8d97b0c`: all three layouts read the canvas token and **the literal is absent from the mobile tree entirely.** | 🔴 **Nothing. The question was moot before it was asked, which is exactly why R-D's confirm-first clause mattered — a session that had "fixed" it would have edited code that was already correct (`P17`'s failure mode).** ⚠️ The one surviving instance of the old brand colour is `app.json`'s splash value, and that is **`P18a`**, not this. 🟢 `primitives-plan.md` §3.1's item 16 is therefore **already complete**. |
| ~~**O-22**~~ ✅ **RETIRED BY REMOVAL 2026-08-03 — ITS SUBJECT NO LONGER EXISTS.** `PremiumBadge.tsx` was deleted as dead code under owner ruling **R-C** (audit Q12), so the sub-AA branch this row was written about is gone and the approved `accent-2` + `on-accent` remap has nothing to be applied to. 🔴 **RECORDED RATHER THAN SILENTLY DROPPED, because a row that vanishes reads identically to a row that was forgotten.** | 🔴 **Nothing — but the OPEN CONDITION (a) DOES NOT DIE WITH IT.** The tier→colour question it raised (`premium_plus`→`accent` while `premium`→`accent-2`, i.e. the LOWER tier taking the rarer iris, when §16.1 names BOTH markers as `accent-2` territory) is still live at the remaining badge treatments and is **`O-25`**'s to answer in the screens phase. Do not re-open this row to ask it. |
| **O-23** ✅ **RESOLVED** | 🔴 **The `#F59E0B` gold sites were UNASSIGNED between 1a and 1b, and the choice swings pass 1a by 121 sites.** | 🟢 **RULED 2026-07-30: THE GOLDS GO TO 1a.** V-1 is **three operations, not one atomic row**, classified independently by source colour: `#F59E0B` ×121 → `accent` is **byte-identical** (1a) · `#6B21A8` ×~31 → `accent` is **visible** (1b) · `#4C1D95` → `accent` is **visible** (1b, rides `lib/colors.ts`). 🔴 **The governing principle: the 1a/1b boundary is VALUE PRESERVATION, not which document row mentions a colour.** Excluding golds because `#F59E0B` appears in V-1's *prose* would define the split by document structure rather than by the property the gate measures. §1.3 restated to **~1,129 / ~426**. Full record: the V-1 ruling box in §1.6b.

| **O-24** ✅ **RULED — ONE COLOUR** | 🔴 Three score components encoded a 3-band ladder (gold/pink/purple); V-1 (purple→accent) + V-3 (pink→accent-2) made the BEST and WORST band IDENTICAL. Same shape in `name-destiny`’s 6-category `IMPACT_COLORS`, its 3-number card, and `career-destiny`’s `confidenceScore` + `growthPotential` ladders. | 🟢 **RULED 2026-07-31: COLLAPSE TO ONE COLOUR; the number or label carries the value.** Two grounds, both from settled decisions: **(a) THE ENERGY-BAR PRECEDENT** — its three-way colour logic was removed because the score is LLM-generated and a dimmed/greyed bar is the app editorialising about someone’s day (a wellbeing call); a trait at 3/10 in the “worst” colour makes the same claim about a person on the same uncalibrated output. **(b) A HUE LADDER BREAKS §16** — `accent-2` means premium/brand secondary and nothing else, so a mid-band score colour is exactly the “generic second colour” drift §16 exists to prevent. Same one-line change per site, and it removes the collision risk entirely. 🔴 **IF A VISIBLE RANKING IS EVER WANTED IT MUST BE A PROMINENCE LADDER (weight or opacity on ONE hue), NEVER A HUE LADDER** — hue ladders in a one-accent system require inventing colours. 🔴 **`warning` WAS CORRECTLY AVOIDED and the reasoning STAYS RECORDED: held `warning` EQUALS held `accent`, so that ladder would have collided BEFORE the flip and been undetectable until pass 5.** ⚠️ **EXTENSIONS PENDING CONFIRMATION (`P27`)**: the ruling named the SCORE ladder; 1b extended it on ground (b) to `IMPACT_COLORS`, the 3-number card, both `career-destiny` ladders and the four category maps. Strongest evidence for extending: **`FocusAreaBadge` already held a DUPLICATE before 1b** (Career and Creativity both `accent`) — a 5–6 hue qualitative palette does not exist here, and the icon/label/dot already identifies each row. |
| **O-25** 🆕 | ⚠️ **`readings/index.tsx`'s PREMIUM PLUS marker is a FIFTH tier-badge treatment** that §1.6b's O-22 box (which lists four) does not name: dark text on a **`bg-fg`** (white) pill. The mechanical §16.1 mapping (marker → `accent-2`) would have taken it from **8.3:1 to 2.23:1** — an O-22-class regression, in the opposite direction from O-22's own. | 🟡 **1b took the minimal fix: label → `on-accent`, pill left `bg-fg`** (21:1 held, ~15:1 Vellum). The **O-22-consistent** alternative is `bg-accent-2` + `text-on-accent` at 8.08:1, matching `PremiumBadge` exactly — but that is a **fill** change and belongs to the screens phase. Recorded so the app does not end up with five tier-badge treatments after O-22 unified two of them. |
| **O-26** 🆕 | 🔴 **THE ROLE-DIMENSION CLASS: `border-subtle` is used as a FILL at 13 sites, and for 6 of them §2 names a DIFFERENT token.** A token whose **name declares a role**, used in the wrong **DIMENSION**, passes every gate — the gates count legacy *removal*, not placement *correctness*. `tsc` passes, `no-legacy-tokens` passes (the name is legal), `no-white-on-accent` is blind (the name is not `white`). The 13, in three groups: **(a) 6 progress/score TRACKS** — `astrology/daily.tsx:163` · `compatibility/index.tsx:776` · `readings/palm.tsx:97` · `DailyInsightCard.tsx:46` · `ScoreCard.tsx:66` · `PalmLineCard.tsx:42` — where **§2 row 14 names `accent-muted` as "progress-track fill"**; **(b) 5 BLOCK FILLS** — `birth-data.tsx:278` (the "Clear" button) and `astrology/daily.tsx:229,233,237` (three cells); **(c) 2 DISABLED GROUNDS** — `name-destiny.tsx:173` and `qa.tsx:615`, **the pair that named this class in 1b**. | 🟡 **SURFACED AND DELIBERATELY NOT FIXED (2026-07-31, `build27.1-cut1-prebuild`).** Reasons differ per group and that is the point. **(a) is a DESIGN DECISION, not a codemod error**: these were `gray-800`-family neutrals on `main`, so `border-subtle` is the **value-preserving 1a mapping**. Moving 6 tracks from a slate to an amber wash is a **visible value change**, and applying it during a pre-build check would invent a design change *and* invalidate the screenshot the owner is about to take. 🔴 **Ruled on device at cut 1** — checklist rows H3, 5, 11. **(b) and (c) have NO LEGAL TARGET TOKEN**: §2 has no low-emphasis-fill role, and row 10 gives `fg-disabled` for the disabled *label* + `opacity: 1` while naming **no** disabled container fill. So (c) belongs to the **Button primitive (§9)** and (b) to the screens phase — neither is fixable now without inventing a token. 🟢 **EXPLICITLY CORRECT, do not re-flag**: the four `h-px bg-border-subtle` hairlines (`login.tsx:180,182` · `signup.tsx:274,276`) and `AstroNumeroBadge.tsx:88`'s `width:1 height:32` divider — a 1px View filled with the divider token **is** a divider (§2 row 11), and §10.3 rules the badge one explicitly. **Dimension is nominally *background*; ROLE is *divider*.** 🟢 The reverse sweep (`borderColor`/`border-*` holding an `fg-*`/`surface-*` token) is **ZERO hits**. Full record: `cut1-capture-checklist.md` §4. |

| **O-27** ✅ **CLOSED 2026-08-03 BY §9 ITEM 13 (commit `275147f`) — THE PROPER FIX LANDED AND THE STOPGAP NEVER RETURNED.** Both destiny screens swallowed the structured 403 in a **bare catch**, rendered their normal generate control, and then printed the middleware's raw *"requires &lt;tier&gt; subscription"* in the danger role with **no upgrade path and an internal tier slug in user copy**. Reading `err.response.status === 403` is what turns a dead end into a gate. All three screens migrated in one commit (`weekly.tsx`'s self-gate with them), and 🔴 **the exit action is a REQUIRED prop pair on density 1, which is the structural guarantee that the next dead end DOES NOT COMPILE.** ⚠️ **`combined.tsx` is NOT a d1 site — see `O-70`: §4.1 named it one and the pre-flight refuted it by measurement.** The superseded reconciliation follows.  🟢 **RECLASSIFIED 2026-08-03 — NO LONGER "ACCEPTED FOR 2.1.0", AND THE STOPGAP IS CANCELLED.** 🔴 **THIS ROW AND `owner-actions.md` WERE WRONG IN OPPOSITE DIRECTIONS**, which is the reconciliation `primitives-plan.md` §4.4 demanded: this one classified it 🟠 accepted with fix (a) assigned to the *screens* phase, while `owner-actions.md` overrode it to 🔴 RELEASE BLOCKER on the strength of a two-line stopgap. **Both are now superseded.** The defect is unchanged and real: R1 correctly moved the lock surface from the hub to the destination, and for Name/Career Destiny the destination's lock surface is `subscription.middleware.ts`'s raw tier slug rendered inline in danger red, with no upgrade CTA. | 🟢 **SCHEDULED: fix (b) — `LockShell` density 1, §9 ITEM 13**, using the structured 403 body the server already sends (`requiredTier` / `currentTier` / `upgradeUrl`). Owner decision 2026-08-03: **there is NO release split**, so the two-line stopgap is cancelled and this gets the proper fix ONCE rather than twice. ⚠️ `weekly.tsx`'s own self-gate is a d1 site too and migrates with them — three screens, one treatment, one commit. 🔴 **NOT `weekly.tsx:24`'s copy-paste**: that hardcodes a tier name in body copy, and duplicating it would add a FOURTH lock treatment in the phase that exists to collapse three into one. 🔴 **AND IT IS ON §9.0.1's NEVER-CUT LIST: if LockShell slips, the two-line stopgap RETURNS.** It was cancelled because the proper fix was scheduled, not because the defect was accepted. |

| **O-28** ✅ **CLOSED via (a), 2026-07-31 (pass 2b, D0)** — 🔴 **with one measured correction to the diagnosis, below.** | 🔴 **THE RAMP STEP `overline` COLLIDES WITH A TAILWIND UTILITY OF THE SAME NAME, AND THE TWO DO COMPLETELY DIFFERENT THINGS.** Tailwind ships `.overline { text-decoration-line: overline }`. The ramp's eyebrow step is emitted as **`text-overline`** (C-a prefixes the key), so `className="overline"` draws a **line above the text** at the inherited size instead of setting 11px/14/+1.3 tracking. Measured in pass 2a: the bare `overline` rule is now LIVE in the resolved set — not because anyone wrote the class, but because 🔴 **Tailwind's content scanner is a regex over raw files and harvested the step name out of `t.type['overline']`.** So the wrong spelling resolves silently to the wrong thing, which is the one failure mode `no-legacy-tokens` cannot see: `overline` is a legal Tailwind utility, so no rule flags it. ⚠️ **`quote` has the same shape and is currently harmless** — there is no `.quote` utility, so `className="quote"` resolves to nothing rather than to something wrong. | 🟡 **REGISTERED, NOT FIXED — the ramp has ZERO `overline` call sites today**, so nothing is broken now. Three ways to close it, cheapest first: **(a)** a one-line gate grep for `className` containing a bare `overline`/`quote` token (a decreasing counter at baseline 0, so it cannot be blinded); **(b)** rename the ramp key to `eyebrow`, which removes the collision by construction but diverges from §3.3's published table; **(c)** accept and rely on `--members`, which is **blind here by design** — `overline` DOES resolve, so membership passes it. 🔴 **(c) alone is not sufficient**, and that is the point worth recording: this is the first case in the revamp where a class resolves *correctly as far as every tool can tell* and is still wrong. — 🟢 **RULED AND SHIPPED: option (a).** `no-bare-overline` is the twelfth named rule in `token-gate.sh`, a PERMANENT INVARIANT at baseline 0, re-validated in three directions (clean tree 0 · all legal spellings 0 · injected bare class 1). **(b) was rejected as specified**: a `theme.js` that disagrees with design §3.3 is the exact drift this project exists to remove. ⚠️ **MEASURED CORRECTION TO THE DIAGNOSIS, and it lowers the severity without changing the verdict:** the claim *"draws a LINE above the text"* is the **WEB** behaviour. On React Native it does not — RN's `textDecorationLine` accepts only `none\|underline\|line-through\|underline line-through`, so `react-native-css-interop` DROPS the declaration and bare `overline` resolves to the **empty rule `{}`** (verified against the live resolved set). The real failure mode is a **SILENT NO-OP** — the eyebrow renders at the inherited size with no tracking — not a stray rule. Equally undetectable, materially less harmful. 🔴 **`quote` IS DELIBERATELY EXCLUDED FROM THE RULE, and the exclusion is itself the ruling:** measured, `\bquote\b` returns **14 hits and all fourteen are correct code** (a JSX prop name ×7, a TS field, a destructured param, a JSX expression), and there is no `.quote` Tailwind utility so the bare class resolves to nothing rather than to something wrong. §3.0.2.0 names OVER-finding as the more insidious direction; a rule that cries wolf 14 times is decommissioned by its own output. 🔴 **AND THE RULE CAUGHT ITSELF WITHIN THE SAME PASS:** D4 mapped the five uppercase 10px pills onto this step, introducing `t.txt('overline')` — a spelling that did not exist when the rule was written — and the count went **0 → 8, all eight correct code**. The legal branch was widened (and again for `[a-z]-overline`, so the rule can be *named in a comment* without flagging itself). **Standing consequence: every new way to name this step — `t.type.overline`, a destructured `{ overline }`, a `<Txt step="overline">` in §9 — will trip it again, and the fix is always to widen the LEGAL branch, never to relax the bare branch.** |

| **O-29** 🆕 | 🔴 **A FIFTH BLINDNESS CLASS: A TYPE SIZE INDIRECTED THROUGH A VARIABLE IS INVISIBLE TO EVERY COUNT IN THIS PLAN.** `no-numeric-fontsize` greps `fontSize:` followed by a **digit**. It is therefore structurally unable to see `fontSize: textSize` or `fontSize: cfg.emoji`. Measured at pass 2b: **15 such sites**, and **not one has ever appeared in any figure in this document** — not the 346 pass-0 baseline, not 2a's 341, not the 124 residual, not the 60-site glyph exception. They were never *skipped*; they were never *seen*. 🔴 **WHY THE SHAPE EXISTS, because it will recur:** all 15 live in per-size lookup tables that **MIX TYPE WITH DIMENSION** — `{ height: 28, paddingHorizontal: 10, emoji: 14, number: 13, label: 11 }`. At the literal the property is named `emoji`/`number`/`label`, so the value reads as a dimension to a human **and** is unreachable to a grep anchored on `fontSize:`. 🔴 **And they are concentrated, inevitably, in the three components §5 protects hardest — `Button` (X3), `StreakBadge` (X11), `AstroNumeroBadge` (X12)** — because those tables were written that way *precisely* to hold the iOS explicit-dimension guards. The register's own defence mechanism is what hid the type. ⚠️ Note this is **not** class 4 (enumeration incompleteness): `--members` cannot help, because these are inline styles, not classNames. It is a **new** class — *the property the rule keys on is not where the value lives*. | 🟡 **PARTIALLY CLOSED IN 2b, DELIBERATELY.** **(1) Instrument:** `no-variable-fontsize` added to `token-gate.sh` — **REPORT-ONLY and NOT a decreasing counter**, because `fontSize: <expression>` is a legal idiom (`Button` now reads its size from a `txt()` spread). It is a **watchlist**: baseline **11**, and a RISE means a new indirected type size was introduced. **(2) `Button` (4 sites) CONVERTED**: `TEXT_SIZE {14,16,18}` → `TEXT_STEP {text-sm, text-base, text-lg}`, style-only, no scaling props. 🟢 **The plan itself confirms this was in scope**: §5's X3 row already asserts *"Post-2b headroom 26 / 34 / 40"*, which is 48−22, 56−22, 64−24 **exactly** — the plan had assumed the conversion happened and nothing had done it. X3's protected values (SIZE_HEIGHT 48/56/64, the 100%/100% gradient) are untouched, and the designed `lg` 18→16 label change is left to §9. **(3) `StreakBadge` ×3 and `AstroNumeroBadge` ×8 DEFERRED, and the reason is the point:** their tables interleave GLYPH sizes (🔥 14/18/22, zodiac emoji 22/28/44) with numerals and labels, so each needs a per-entry role call; **§6.6.2 measures `StreakBadge` small at 6.0px of headroom — the tightest surface in the whole register** — and §5.3 says verifying it requires an iOS build this repo cannot produce. Blind-editing the two tightest X-register containers is exactly what §5 exists to prevent. 🟢 **AND THOSE 11 ARE NOW CLOSED AS PERMANENTLY UNVERIFIABLE, NOT DEFERRED (owner ruling, 2026-07-31 — see §5.4).** iOS is paused by founder decision, so "needs an iOS build" means *never*. X11/X12 are PRESERVE-BLINDLY and that instruction is now absolute rather than provisional, because the device check was the second of only two protections and it is gone. 🔴 **Leave all 11 untouched. Do NOT carry them as pending work.** `no-variable-fontsize` keeps reporting **11** as a WATCHLIST FLOOR — a rise still means a NEW indirected type size was introduced, which is the thing worth catching. Re-open only if iOS is unpaused (§5.4 is the re-open list). |

| **O-30** 🆕 ✅ **RESOLVED IN PASS 4 (E6a/E6b)** | 🔴 **THE GLOBAL TEXT DEFAULT SPECIFIED BY DESIGN §3.6 AND BY §1.7's OWN P23 BOX IS A SILENT NO-OP ON THIS STACK.** Both say to set `Text.defaultProps.allowFontScaling = false` once at app root. Measured against the installed renderer, not recalled: **React 19.0.0 resolves `defaultProps` for CLASS components only.** In `react-native/Libraries/Renderer/implementations/ReactFabric-dev.js` the merge is `resolveClassComponentProps()`, and all ten of its call sites are reached only via `shouldConstruct(type)`; `updateForwardRef()` hands `nextProps` straight to `renderWithHooks` with no merge. **RN 0.79.6's `Text` is `React.forwardRef(...)`.** So the line assigns a property nothing reads — no error, no warning, no build signal. 🔴 **THE SEVERITY IS THE INVERSION: this is P23's exact failure mode arriving THROUGH the fix rather than through forgetting it.** A release could carry the freeze line, pass every gate, and have neither frozen anything nor broken anything — and the first signal would be a low-vision user reporting that scaling still works, which nobody would ever file. | 🟢 **RESOLVED: wrap the forwardRef's `render`.** `mobile/lib/textDefaults.ts`, called at **module scope** in `app/_layout.tsx` (an effect runs after the first render, and a mounted `<Text>` does not re-resolve its typeface). `forwardRef` returns `{ $$typeof, render }` and **RN itself proves the object is mutable by assigning `Text.displayName`** right after creating it. 🔴 **TWO ORDERINGS INSIDE THE WRAPPER ARE LOAD-BEARING IN OPPOSITE DIRECTIONS**, and both are commented at the site: `allowFontScaling` is spread **before** `...props` so an explicit prop wins (this is what keeps 2b's 70 opt-ins alive — reversing it silently overrides them and ships the release P23 forbids); the default style goes **first in the style array** so a per-site `fontFamily` wins (this is what keeps `@expo/vector-icons` rendering icons, since `createIconSet` pushes its own family into `props.style`). `TextInput` gets the same treatment — §3.6 names the Q&A composer as a freeze surface, and a Roboto input in a Figtree app is the mixed-font defect this pass exists to remove. ⚠️ **The mechanism cannot be gated by a value check, only by an existence check** — `token-gate.sh`'s `text-defaults-installed`, the 16th named rule and the second that is not a grep over `$SRC`. A module that exists and is never imported is the failure mode it watches for. ⚠️ **Re-verify after any RN upgrade**: if `render` is not a function the patch logs loudly and returns false rather than throwing (a module-scope throw dies white, before the root ErrorBoundary). |

| **O-31** 🆕 ✅ **RESOLVED IN PASS 4 (E6a)** | 🔴 **A GLOBAL DEFAULT FAMILY IS MANDATORY, NOT CONVENIENT — AND NO DOCUMENT IN THIS PLAN SET SAID SO.** Census of `<Text>` opening tags across `app`+`components` (balanced-expression parse, so ternary and template classNames are counted): **1,118** total. **328** carry a family utility after E3; **198** carry a `txt()` spread after E2. **That leaves 592 — 53% — with NO family at all:** 410 with a className carrying a size but no family utility, 99 styled only through a `StyleSheet` reference, 83 with no styling attribute whatsoever. 🔴 **AND THE CONFIG CAN NEVER REACH THEM**: Tailwind's `fontSize` plugin honours only `lineHeight`, `letterSpacing` and `fontWeight` in its options object, so a family cannot be attached to a size utility. Design §3.2's own example (`className="text-sm font-body text-fg-secondary"`) assumes the family is written at every site — which is true of 328 of 1,118. **Without a global default, pass 4's headline claim ships half-delivered: an app that is half Figtree and half system font, with `no-fontweight` at 0, `--diff` clean, `--members` clean and `tsc` clean.** | 🟢 **RESOLVED by the same module as O-30** — the family default and the scaling freeze are one mechanism and therefore one file, with **two independent constants** so the freeze can be dropped (§1.7's named fallback) without losing the family. 🔴 **THE REJECTED ALTERNATIVE, recorded so it is not re-proposed as "cleaner": adding a family class to the 410 and a `fontFamily` to the 99 + 83.** That is ~592 further edits, it is a whole extra pass, and — decisively — **it can never cover a `<Text>` written tomorrow**, nor one inside a library. The per-site route makes coverage a thing you can forget; the default makes it a thing you have to actively opt out of. |

| **O-32** 🆕 ✅ **CLOSED IN PASS 4 (E0)** | 🔴 **A SIXTH INSTANCE OF O-29's CLASS, ONE PROPERTY OVER: THE RULE KEYS ON A SPELLING THE VALUE DOES NOT ALWAYS ARRIVE IN.** `no-fontweight`'s inline half anchored on `fontWeight` + a **COLON**, so it was structurally unable to see the **JSX-prop form** `fontWeight="bold"` — which exists in this tree exactly once, on the `react-native-svg` `<Text>` in `BirthChartWheel.tsx`. **That site was counted by NOTHING**: not §0.2's 173, not §7.2's baseline, not §1.7's table, not the pass-0 measurement. Measured: **170 colon-form + 1 prop-form = 171.** ⚠️ Note the family resemblance and the difference: O-29 hid a *value* behind a variable; this hid a *declaration* behind a different punctuation. Both are "the anchor is not where the thing is." | 🟢 **CLOSED: the rule is widened to `[:=]` and re-validated in BOTH directions per §3.0.2.0** — it finds exactly 171 on the pre-migration tree (equality, not "at least"), and injecting all five legal post-migration spellings scores **0**, so it over-finds nothing. Sub-counts for the two forms print separately and permanently, so neither can drift unnoticed. 🔴 **THE STANDING LESSON, because a seventh instance is now predictable: when a rule anchors on a PROPERTY, enumerate the SPELLINGS that property can arrive in — `x:`, `x=`, `x` inside a spread, `x` read from a table — before trusting its baseline.** |

| **O-33** 🆕 ✅ **CLOSED IN PASS 4 (E4b)** | 🔴 **`fontStyle: 'italic'` IS `fontWeight`'s TWIN, AND NO DOCUMENT IN THE PLAN SET MENTIONS IT.** B1 bans `fontWeight` because on a static face the platform either ignores it or fakes it, differently per platform. **The identical argument applies to a slant, and the design ships exactly ONE italic face** (`quote` = Literata-Italic) — so an italic asked for by *style* rather than named as a *family* is a synthetic oblique. Measured against the installed native code: **Android** registers each face with `ReactFontManager.setTypeface(key, Typeface.NORMAL, tf)` (`FontLoaderModule.kt:50`) — **NORMAL style only**, so a slanted request has no registered face and Android synthesises a skew; **iOS** resolves the alias through the swizzled `fontNames(forFamilyName:)` and CoreText adds the trait. Two platforms, two different fakes, no error on either. **20 sites: 16 inline declarations + 4 className tokens.** 🔴 **The one that proves the point is `combined.tsx`'s Unified Life Theme — already on the `quote` step, i.e. already a true italic, AND carrying an italic style prop: a synthetic slant applied on top of a real italic face.** | 🟢 **CLOSED: `no-synthetic-italic`, the 15th named rule** — a decreasing counter at baseline 20, driven to **0** in E4b, most-specific-first alternation with the hyphenated legal branch **so the rule can be named in prose without flagging itself** (the `no-bare-overline` lesson, applied pre-emptively — and it did fire on the first run). A report-only companion counts bare `fontStyle` declarations so a future upright-value declaration cannot become a new blind spot. ⚠️ **One site could not be honoured as authored**: `astrology/daily.tsx` carried *both* semi-bold and italic, and there is no Figtree italic and no Literata SemiBold-Italic in the five faces. The italic wins; recorded rather than silently resolved. |

| **O-34** ✅ **CLOSED IN PASS 5 (commit C) — the ramp now reads 38 / 31 / 26, and design §3.3 carries them** | 🔴 **LITERATA'S NATURAL LINE BOX IS 26.7% TALLER THAN ROBOTO'S, AND THE RAMP'S DISPLAY lineHeights ARE SMALLER THAN THE FACE WANTS.** Measured from the shipped files: **Roboto 1.1719 em · Figtree 1.2000 · Literata 1.4850** (`hheaAsc − hheaDesc + gap`). Against the baked steps that gives **negative leading**: `display-lg` 30/34 → **−10.55px**, `display-md` 24/29 → **−6.64px**, `display-sm` 20/25 → **−4.70px**. `text-2xl` is marginal at −0.80; every other step is positive. 🟢 **LAYOUT IS UNAFFECTED** — Android's `CustomLineHeightSpan` applies the negative leading and explicitly permits glyphs to draw outside the box; iOS's `min/maximumLineHeight` behaves the same — so the paragraph is exactly `lineHeight × lines` regardless. ⚠️ **What IS visible: on a TWO-LINE display heading the lines can collide**, because the box is up to 10.6px shorter than the glyphs want. | 🟡 **MEASURED, THEN REGISTERED — and the two-line risk is REAL BUT BOUNDED.** 🔴 **Re-derived from REAL GLYPH INK EXTENTS (`glyf` yMax/yMin), not from the per-em declaration**, which is the number that made this look worse than it is: capitals reach **+0.715 em**, lowercase **+0.782**, deepest descenders **−0.230** — but **accented capitals reach +0.970 em**. Line-2-tallest-ink vs line-1-lowest-ink, in px: <br>· `display-lg` typical caps **+5.65 CLEAR** · accented caps **−2.00 🔴 COLLIDES** <br>· `display-md` typical **+6.32 CLEAR** · accented **+0.20 🟠 TIGHT** <br>· `display-sm` typical **+6.10 CLEAR** · accented **+1.00 🟠 TIGHT** <br>🟢 **So an ordinary English two-line display heading does NOT collide.** The collision needs line 2 to begin with an accented capital (or another glyph above ≈0.85 em) while line 1 ends in a descender. 🔴 **THAT INTERSECTS EXACTLY WITH `C-P4-2`'s SURFACE** — user names and LLM-generated themes are where accents arrive — so the two caveats are one exposure seen from two directions. **THE WRAP FAILURE SET, enumerated over all 35 display sites at 360dp and 320dp** (advance widths measured from Literata-Bold, available width = screen − the site's own horizontal padding): **23 fit on one line at both widths** · **8 literal-content sites WRAP** — `(paywall)/index.tsx:104` "Unlock Your Full Destiny" 372px, `compatibility/index.tsx:139` 335px and `SunSignReveal.tsx:79` 301px wrap at **both** widths; `BiometricConsent.tsx:148`, `ErrorBoundary.tsx:55`, `GeneratingReading.tsx:374`, `CaptureInfoModal.tsx:113`, `LockedSection.tsx:168` wrap **at 320dp only** · **12 sites are UNBOUNDED** (LLM themes ×3, user names ×2, rules-table archetype/palm names ×3, server section titles, lucky values ×2 — plus 2 that are emoji glyphs and therefore not Literata at all). 🔴 **VERDICT: the display leading survives a wrap for the app's actual English copy, and does not survive one in accented text at `display-lg`.** **THE FIX, IF THE DEVICE READ SAYS SO, IS A DESIGN-DOC REVISION, NOT A CODEMOD FIX** — `theme.type`'s three display lineHeights. The arithmetic is closed: **38 / 31 / 26** puts accented caps at **+2.00 / +2.20 / +2.00** and clears every case with margin, at the cost of 4/2/1px more leading on the app's largest type. Tight leading on large display type is a legitimate editorial choice; it just cannot survive a wrap. ▶ **On cut 2's capture list explicitly: check every `display-*` heading for clipped ascenders and for collision with the element above — starting with the three that wrap at 360dp.** — 🟢 **RULED AND SHIPPED AT PASS 5: 38 / 31 / 26, AS A DESIGN-DOC REVISION TO §3.3, NOT A CODEMOD DEVIATION.** 🔴 **The device read was NOT waited for, deliberately, and the reasoning is the ruling:** shipping cut 2 with a MEASURED collision would make cut 2's own `display-*` check a DISCOVERY rather than a CONFIRMATION — and a capture list exists to confirm. The collision surface is exactly `C-P4-2`'s (accented names and LLM themes, in the primary market) and 12 of 35 sites are unbounded, so it WILL be reached. ⚠️ **It had to be the RAMP, not the 20 wrap-capable sites**: scoping the loosening per-site is precisely the drift the token system exists to remove — one step, one line-height. 🟢 **Layout re-checked and it is a NON-EVENT for a structural reason: not one fixed-height container in `app`+`components` holds a display step.** 0 OVERFLOW, 0 TIGHT. And the box was never face-dependent — 2b baked an explicit `lineHeight` into all twelve steps, so +4px of leading is +4px of box either way. ⚠️ **Cut 2 still reads the headings** — the check is now "does 38 look right", not "does 34 collide". |

| **O-35** 🆕 ✅ **CLOSED IN PASS 5 (commit A)** | 🔴 **EVERY `display-lg` HEADING IN THE APP WAS RENDERING IN FIGTREE, AND `font-display` HAD ZERO CALL SITES.** Measured on the eve of the flip: **23 of the 25 `text-display-lg` classNames carried `font-body-bold`**, so §17's "one hero per screen" moment — the paywall hero, every screen H1, the user's own name on Home, every rules-table archetype name — was Figtree Bold at Literata's size and tracking. 🔴 **§3.6's OWN WORDS WERE THE CAUSE, and they are the exact inversion of the truth:** *"the className half is simpler … a Tailwind size utility carries no family, so there is no step-family to reconcile — a pure 1:1 weight→family map with no judgement at all."* **Because a size utility carries no family (`O-31`), the className half is the ONLY half where the family MUST be reconciled against the step — there is nothing else to supply it.** The inline half has `txt()`, which carries the face; that is why RULE R's serif branch says DELETE there. On the className half deleting would drop the site onto the global body default — the same defect one step quieter. ⚠️ **This is `O-29`/`O-32`'s class arriving at a GATE rather than a rule: `family-arrival-check.js` was correct and complete over the ledger it covered, and blind to the other one.** Removal was 0 on both halves; arrival was gated on one. | 🟢 **FIXED: 23 sites `font-body-bold` → `font-display`**, script-generated, and 🔴 **the gate's className half now exists** — re-validated in BOTH directions per §3.0.2.0 (exactly **23** on the pre-fix tree, equality not "at least"; **0** after). ⚠️ **The RANK check is REPORT-ONLY on the className half and that asymmetry is itself a ruling**: the first version failed on it and returned **19 hits, all correct code** (`text-xl font-body-semi`, every one of which was `text-xl font-semibold` on `main`). On the inline half `rank(named) >= rank(step)` is right because `txt()` has already supplied the face and a lighter explicit family OVERRIDES it downward; on the className half the site is merely NAMING its own face, and the ramp's family column is a DEFAULT, not a prohibition. 19 false positives on a blocking rule is §3.0.2.0's OVER-finding mode — a decommissioned rule. It reports instead, as design drift for the screens phase. 🔴 **AND THE FIX SCRIPT REPRODUCED P-2 DIRECTION 1 ON ITS FIRST RUN**: `font-(body\|body-semi\|body-bold)` matched `font-body` INSIDE `font-body-bold` (the `-` is a word boundary), emitting `font-display-bold` — a class that resolves to nothing. Caught by reading the diff; the alternation is now most-specific-first and the lesson is commented at the site. |

| **O-36** 🆕 ✅ **CLOSED IN PASS 5 (commit D)** | 🔴 **`GATE_STRICT`'s PRECONDITION WAS BROKEN BY THE REORDER, AND NOTHING SAID SO.** §4.6 item 2 and §3.7 both say *"after pass 5 every count is 0, so flip the hook to blocking."* §3.7's own box had already found ONE reason that is false (`BirthChartWheel`'s ~12). **The larger reason is structural: pass 5 is no longer the last pass.** The owner's reorder runs 2a → 2b → 4 → 5 → **3a → 3b**, so at the moment the hook goes blocking **177 legacy radii and 6 dead spacing classes are still owed by passes that have not run.** ⚠️ Both documents were written when pass 5 was last, and neither was re-read against the reorder — **a precondition stated in terms of "after pass N" silently expires when N stops being last.** | 🟢 **RESOLVED by a fourth counter category — `GP()`, the PENDING-PASS counter.** The two wrong options were the tempting ones: **blocking** on them fails every push until 3b lands (§4.6's own *"a lockout, not a gate"*, defeated by `--no-verify` on day one and never re-armed), and **folding them into the named floors** launders a transient residue into a permanent one (*"none of them may be closed by widening an exception — that is how a floor turns into a leak"*). So they are **named, attributed to the owing pass, printed on every run, and non-blocking**, which keeps every OTHER rule genuinely blocking from today. 🔴 **WHEN 3a AND 3b LAND, CONVERT THEIR RULES BACK TO `G()` AND DELETE `GP()`** — a `GP()` with no callers is the signal the revamp's counters are closed. Registered as an owner action. Also shipped: the escape hatch is **`GATE_LENIENT=1`, deliberately NOT `--no-verify`**, because both bypass the gate but only one leaves a trace and prints "say why in the commit body" — **give people a labelled door and they stop using the unlabelled one.** Proven in both directions before shipping. |

| **O-37** 🆕 🟡 **REGISTERED — benign today, and the trap is named so it stays benign** | ⚠️ **THE FLIP *CREATED* A HELD-VALUE COLLISION, IN THE OPPOSITE DIRECTION FROM ALL FIVE THE LEDGER TRACKED.** The ledger's five were two names CONVERGING while held and DIVERGING at pass 5. This is the reverse: **`bg` and `scrim` were `#0F0A1A` and `#000000`, and are BOTH `#100E0D` at Vellum** (design §2 row 1 and §1.6a agree — it is intended, a scrim is the canvas at partial alpha). Harmless as it stands, because the only value-keyed logic left in the token layer is `alpha()`'s reverse lookup, which now returns `['bg','scrim']` and denies neither. 🔴 **THE TRAP: if anyone ever adds `bg` to `ALPHA_DENIED`, every inline scrim in the app starts THROWING AT IMPORT — 17 of them live inside `StyleSheet.create`, i.e. module scope, where a throw runs before React mounts and the app dies white with the root ErrorBoundary never seeing it.** ⚠️ Second-order: a forgotten alpha modifier on a scrim now paints the CANVAS colour over the content rather than black — still a total occlusion, but one that **looks deliberate**, which makes `no-bare-scrim` more valuable post-flip, not less. | 🟡 **REGISTERED, NOT FIXED — there is nothing to fix.** Documented at the token in `theme.js` (header note + the `scrim` line + `alpha()`'s comment) and asserted by **`alpha-callsite-check.js`**, which invokes all 120 call sites against the live values, so the day someone changes the denylist the gate fails loudly instead of the app dying silently. 🔴 **The generalisable finding: §3.0.2.2 tracked collisions that the FLIP RESOLVES. It never considered collisions the FLIP INTRODUCES, and the screens phase will add more** — every future token whose Vellum value coincides with another's is a new one. The check is the same question asked the other way round: *"after this edit, does any two-name/one-value pair include a name that some logic treats specially?"* |

| **O-38** 🆕 🔴 **OPEN — NAMED NOW RATHER THAN DISCOVERED AT BUILD TIME** | 🔴 **THE PRIMITIVES PHASE (§9) HAS NO ARRIVAL GATE, AND IT IS THE PHASE MOST EXPOSED TO ONE.** §3.0.2.0.1 requires every remaining pass to name its arrival gate; the primitives row has read *"needs one and does not have one"* since pass 4 and was still a sentence in a table rather than a tracked item. **Extracting `SectionCard` / `LockShell` / `Sheet` / `Button` moves sites ONTO components, and nothing asserts that every site which SHOULD use the new primitive DOES.** The failure mode is the one pass 4 and pass 5 both hit, twice each: **removal complete, arrival partial, every counter green.** 🔴 **And §9 is where three specific absences will hide, each already evidenced:** a **missing family** (`O-35` — a new `<Txt>` or `LockShell` label that names no face renders in the global body default), a **missing prop** (P23's className half — `allowFontScaling` cannot live in a style object, so every new primitive that wraps reading copy must place it at the JSX boundary, which is exactly what `p23-optin-check.js` was written for), and a **missing token assignment** (C1 — `LockShell`'s single grounding decision, `locked` vs `surface-raised`, whose two values are now visibly distinct so it is *checkable* for the first time). | 🔴 **OPEN. The design instruction is "design the gate WITH the primitive, not after"**, because a primitive's arrival gate is cheap while its call sites are being written and archaeology afterwards. **The precedents to copy are all in the tree**: `p23-optin-check.js` (the first non-grep rule), `family-arrival-check.js` (pairs by brace balance, never a line window — a line window is exactly what could not see pass 4's defect), and `alpha-callsite-check.js` (invokes the mechanism rather than searching for it). ⚠️ **An arrival gate is usually NOT a grep** — all three of the existing ones are node scripts, and that is why they were the last three to be written. |

| **O-39** 🆕 🟡 **REGISTERED AT PASS 3a — MEASURED, AND THE CONCLUSION IS "THERE IS NOTHING TO MIGRATE"** | 🔴 **DESIGN §4.3's "FIVE SPACING OUTLIERS" ARE NOT SPACING. ALL 13 LIVE USAGES ARE `w-`/`h-` — EXPLICIT DIMENSIONS THAT MERELY RESOLVE *THROUGH* THE SPACING SCALE**, because Tailwind's `width`/`height` scales MERGE `theme.spacing`. §4.3 prescribes migrating their call sites "onto authoring steps"; measured, **the authoring vocabulary (§4.2) tops out at `space-12` = 48dp and these are 56 / 128 / 192 / 256**, so the "nearest step" deltas are **−8px (−14.3%) · −80px (−62.5%) · −144px (−75%) · −208px (−81.3%)**. The last three are not migrations. Enumerated: **56×56 circular number badges ×4** (`numerology/index.tsx:428, 499, 539, 604`, each holding a 24px numeral) · **192×192 circular camera well ×1** (`compatibility/index.tsx:685`, holding a 60px glyph — the "migration" would make the container smaller than its content) · **128×128 spinner slot ×1** (`compatibility/index.tsx:768`) · **256-wide horizontal-scroller card ×1** (`WeeklyDayCard.tsx:24`, where the width IS the layout). The fifth key (`30` → 120dp) never resolved at all and pass 3a **deleted** its four dead classes. ⚠️ **This is `O-29`'s class one family over**: O-29 hid a TYPE size behind a variable; this hides a DIMENSION behind the spacing namespace. In both cases the property a rule or a document keys on is not where the value lives — and in both cases the concentration is in components where a magic number is load-bearing. | 🟡 **REGISTERED, DELIBERATELY NOT MIGRATED, AND MARKED IN-FILE AT ALL 7 SITES** (the `ABOVE-CEILING` idiom pass 5 established for the 7 above-ceiling type sizes, reused because the argument is identical: *there is no target to move them to*). Three independent grounds, any one sufficient: **(a)** §4.3 **itself** says the outlier migration *"is a separate pass requiring visual sign-off … not part of the pixel-identical codemod"*; **(b)** three of the four keys have **no candidate target at all**, so applying the rule as written would destroy four surfaces; **(c)** the sign-off it requires is a device read, and 🔴 **the marker is now the only protection**, because a future session reading §4.3 alone WILL migrate them. 🟢 **Consequence for pass 3a: it moved ZERO pixels. `--diff` reports 0 rules moved across all 202 rules, and the pass is a pure identity pass after all** — the owner's framing that "the five outliers are the only part of 3a that moves a pixel" was correct about the intent and is superseded by the measurement. 🔴 **THE GENERALISABLE FINDING: a DIMENSION expressed through a SPACING key is invisible to a spacing audit, and §4.1's own set (`14 · 30 · 32 · 48 · 64`) is 100% dimensions.** Before "migrating an outlier onto a step", check which FAMILY its utilities are in — `w-`/`h-`/`min-*`/`max-*` are dimensions and are not on the spacing ramp; `p-`/`m-`/`gap-`/`inset-` are. **If the fix belongs anywhere it is a `dimension` scale in `theme.js`, which is §9 primitives work, not a codemod pass.** |

| **O-40** 🆕 🟢 **RULED AND CLOSED IN PASS 3b — `ROLE BEATS ARITHMETIC`** | 🔴 **DESIGN §4.4 HELD TWO COMPETING SOURCES OF TRUTH AND NOTHING SAID WHICH ONE WINS.** Its `absorbs` column is VALUE-driven ("a 16px corner becomes the 14px key" — a description of the legacy migration); its `use` column is ROLE-driven ("a `Card` is 20, a `Button` is a pill" — a description of the system). A `Card` at 16 satisfies both, with different answers. 🔴 **THREE COLLISIONS came from reading `absorbs` as normative, each found by a different instrument: (1)** 6 hand-rolled buttons would have taken 14 while `Button` took the pill step — a mixed radius vocabulary inside ONE role, found by per-site review of the 49; **(2)** the paywall's segmented **track and its own segments** both took 14 — parent and child at the identical corner, which §6.6 C scores as *two correct +2s*, found by the geometry once the pair was read together; **(3)** 🔴 **`Card` itself took 14**, so the 12 panels nested inside it — assigned 14 on the stated grounds that it kept them *"one step tighter than their parent, since §4.4 puts Card at lg 20"* — sat at the **identical** corner to their parent. Found by **reading the diff, and only that.** ⚠️ **Collision 3 is decisive not because it is the largest but because the defect does not merely mis-assign sites — IT FALSIFIES THE PREMISE OF A RULING ALREADY MADE.** The panels' verdict was correct *conditional on* `Card` being 20, and the `absorbs` column made `Card` 14. 🔴 **This is `O-35`'s class (§3.0.2 class 7 — a document's inference is not verified by being written) and the FIRST instance where the document holds TWO COMPETING SOURCES OF TRUTH rather than one wrong one.** The earlier instances were a document being *wrong*; this is a document being *ambiguous*, which review cannot catch because both readings are supported by the text. | 🟢 **RULED (owner, 2026-08-01): `use` IS NORMATIVE, `absorbs` IS DESCRIPTIVE AND NON-NORMATIVE, and where they disagree `use` WINS.** Shipped in pass 3b: **the `absorbs` column is marked non-normative in §4.4 and is to be DELETED once the primitives phase is done with it** — it answers *"which key does this legacy value land near?"*, a question that stops being askable the moment no legacy value remains. 🔴 **It is retained rather than deleted now for exactly one reason: §4.4 is the reference for BUILDING `Card` / `SectionCard` / `LockShell` in the §11 primitives phase, where a reader who hits the disagreement gets NO DIFF TO READ.** Leaving it unmarked is what guarantees a fourth collision. 🔴 **AND THE BOUNDARY THE RULING NEEDED, because the concentric rule and the depth rule collide arithmetically:** design §4.5 now carries both halves — **inset < radius → geometrically concentric → `R − N`, nearest step** (the paywall track: 14 − 4 = 10 → 8); **inset ≥ radius → the child's corner is outside the parent's curve, so the relationship is HIERARCHY not geometry → one step tighter** (`Card`: 20 with `p-4` → 14). Without it, `R − N` at every depth drives everything to the 8px step and a five-step scale has two live members. 🟢 **Applied to all 373 sites with a stated, overrulable boundary: role overrides value where the role is NAMED — by §4.4, or by the site's own style-object name. An anonymous `<View>` inside a `Touchable` keeps the value mapping: a tappable card is a card.** |

| **O-41** 🆕 🟢 **NUMBERED 2026-08-03 (was `M-1`). MEASURED: `openPaywall` IS 22 CALL SITES IN 16 FILES, NOT "≥8".** Design §9.1's *"an ad-hoc `router.push('/(paywall)/')` at ≥8 origins"* listed nine and nobody had counted. ⚠️ **ONE OF THE 22 IS A `router.replace`, NOT A PUSH** (`combined.tsx`'s full-screen early-return lock) — a helper that only wraps `push` silently misses it, and one that CONVERTS it changes the back-stack behaviour of a lock screen. | 🟢 **Nothing blocked; it is item 17's expected set.** 🔴 **AND THE NUMBER HAS ALREADY MOVED: item 4's extraction collapsed four origins (astrology/index · compatibility/[id] · face · palm) into ONE inside `SectionCard`, so ITEM 17'S EXPECTED COUNT IS 19, not 22.** Re-measure at that item rather than inheriting either figure. `openPaywall` needs a `replace` option or that one site stays out deliberately, with a comment. |
| **O-42** 🆕 🔴 **NUMBERED 2026-08-03 (was `M-2`). `LockShell` IS A 28-CALL-SITE MERGE ACROSS 3 FILES, NOT "3 → 11 SITES".** Design §9 #13's **"3" WAS A FILE COUNT READ AS A SITE COUNT** — off by 9×. Measured: `<LockedSection>` **25** (monthly 7 · face 9 · palm 9) · `<LockedBanner>` **3** · `BlurView intensity={20}` lock **4 components** · the inline `SectionCard` lock branch. 🔴 **The consequence is not bookkeeping: §10's estimate, the adoption gate's expected set and R-2's per-pattern assertion were all sized off it.** | 🔴 **Item 13's scope. 🆕 AND ITEM 4 CORRECTED THE LAST ROW OF THE MEASUREMENT (2026-08-03): four SectionCard copies carried a lock branch but ONLY ONE EVER PASSES THE FLAG** — `compatibility/[id]`, at **6 of its 8 call sites**. face, palm and astrology/index carried dead branches. **So d2's SectionCard half is 6 sites in 1 file, not 4 files**, and two of the three contrast defects `O-44` records were latent for exactly that reason. |
| **O-43** 🆕 ✅ **NUMBERED 2026-08-03 (was `M-3`) AND ALREADY RULED. THE `teaser` PROP EXISTS AND HOLDS 25 CLIENT-AUTHORED MARKETING STRINGS**, passed at all 25 `LockedSection` sites. The title-only d3 variant would DELETE them. | 🟢 **CLOSED by owner ruling R-B (2026-08-03): KEEP THE 25 TEASERS.** The variant was specified as a FALLBACK for when no tease field exists; the field exists and carries hand-written copy, so **the fallback's precondition is FALSE and it must not fire.** Deleting 25 marketing strings is a monetisation change wearing a design change's clothes. 🔴 **`C-5` STAYS AT THREE TIER LITERALS and does NOT widen to 29** — no PM round trip. 🔴 **`O-1` is UNTOUCHED and still blocked: do not close it by pointing at this prop**, which is generic per-feature marketing, not a server-chosen truncation of *this user's* withheld content. |
| **O-44** 🆕 🔴 **NUMBERED 2026-08-03 (was `M-4`, WIDENED BY ITEM 4 INTO A LIVE AA FAILURE). THE LOCK SURFACES DERIVE THEIR CONTRAST AT THE SITE, AND THE SITES DISAGREE.** Two halves. **(a)** `LockedSection`'s `accentColor` ternary has TWO IDENTICAL BRANCHES (collapsed to a no-op during 1b's `O-24` ladder work; nobody removed it) and its `:18` tier badge hardcodes `Premium` / `Premium Plus` — an R1 violation in user-facing copy. **(b) 🔴 THE HALF FOUND BY ITEM 4'S MERGE, AND IT WAS LIVE:** of the four inline `SectionCard` copies with a lock branch, **three put the plain foreground on the `accent`-filled unlock CTA (~2.1:1, failing AA at every size) and only ONE had been fixed to `on-accent`.** `compatibility/[id]`'s is REACHABLE — 6 call sites, every free user, six times on one screen. | 🟢 **(b) IS FIXED — item 4's extraction derives the pairing ONCE, in `components/ui/SectionCard.tsx`, and `primitive-adoption-check.js` pins it as a literal.** (a) is item 13's: retiring the badge closes an R1 violation for free and retires the `tier` prop at all 25 sites. 🔴 **THE STANDING LESSON IS THE ONE `no-white-on-accent` WAS DEMOTED FOR: fill and label live in DIFFERENT style rules, joined only at a JSX call site, so no proximity window of any size pairs them.** A fix applied to one copy is not a fix. **Deriving it once in a primitive is the only mechanism that works**, and CLAUDE.md's prose remains the control everywhere a primitive has not reached. |
| **O-45** 🆕 🔴 **NUMBERED 2026-08-03 (was `M-5`). BLINDNESS CLASS 8 — A FILE OUTSIDE THE SEARCH ROOTS IS UNDETECTABLE TO EVERY CONTENT-BASED TOOL AT ONCE.** `mobile/SUBSCRIPTION_EXAMPLES.tsx` held **39 retired token usages while `no-legacy-tokens` read 0.** `token-gate.sh` could not see it (`$SRC` excludes the root), Tailwind's scanner could not (two globs), `--diff`/`--members` could not (same globs) — **`tsc` was the only witness**, and it only spoke because the file was the last importer of two components R-C deleted. | 🟢 **THE INSTANCE IS CLOSED; THE CLASS IS PERMANENT AND IS NOW §3.0.2's EIGHTH.** The first seven are about WHAT a checker looks for; this one is about WHERE it looks, so no pattern widening reaches it and **`--diff`, class 4's sole defence, is equally blind.** Its defence is a **SET-DIFFERENCE, not a search** — `P41`, two one-liners. 🆕 **Its second half, measured at item 2's pre-flight: `$SRC` is 8 directories and the content globs are 2, so a middle band (`lib/ store/ services/ hooks/ utils/ types/`) is gate-readable and Tailwind-blind — a class written there emits no rule and NEVER RENDERS.** 🟢 **The band is EMPTY**: 44 files, all `.ts`, not one `.tsx`, zero live class attributes. ⚠️ Re-run both lines the moment a `.tsx` is added outside `app/` or `components/`; the correct fix would be to extend the globs, never to move the file. |
| **O-46** 🆕 🔴 **NUMBERED 2026-08-03 (was `M-6`). THE TEXTURE LAYER'S ANDROID COST IS A MEMORY QUESTION, NOT A TILING QUESTION.** `TilePostprocessor` allocates a **view-sized bitmap with NO CACHE KEY, per mounted screen** — ~10 MB on a 1080×2400 panel, across **25 screens**, with mid-range Android as the primary market. It **reshapes `P38` check 3 rather than answering it**, and §4.6's stated fallback (a pre-scaled asset) does not address it. | 🟢 **BOTH BRANCHES PRE-DECIDED IN `P39` (amended 2026-08-03), so no further ruling is needed — execute whichever the device says.** 🔴 **The device question is NOT "can you see texture" but "DOES THE GRADIENT BANDING DISAPPEAR"** — masking 8-bit banding on a large radial wash is a stated FUNCTIONAL requirement (design §1/§4.6/§10.2.4; §4.6 mount (iv) names the paywall because it needs the dither most). **Banding unchanged → DROP grain** (the direction survives on plates, shape primitives, type contrast and asymmetry). **Banding masked → KEEP the effect, CHANGE THE MECHANISM** to a pre-tiled full-bleed PNG loaded by URI, so RN's image cache serves ONE bitmap to all 25 screens. 🔴 **Do not raise the opacity.** |
| **O-47** 🆕 🟡 **NUMBERED 2026-08-03 (was `M-7`). THE TEXTURE'S AMPLITUDE IS UNSPECIFIED BY THE DESIGN AND IS NOT A FREE PARAMETER.** §4.6 fixes the layer opacity and the tile size and says nothing about the tile's own strength. On a near-black canvas compositing is violently asymmetric — a symmetric tile is **ADDITIVE**, and page-to-card separation is only **7 levels**. Shipped 96/255 asymmetric, against two stated floors; the honest report is that at 1× it is a **dither, not a visible texture**. | 🟡 **A DESIGNER CALL WITH A MEASURED COST TABLE (`P39`), and it is SECOND in line behind `O-46`'s question, not first.** If banding is masked at the shipped amplitude, ship the shipped amplitude. 🔴 **A raise is only ever justified by the banding test, never by "you cannot see it"** — invisibility is the design's own intent (§14.2.1: *"the PAGE is textured, the objects on it are clean"*), not a defect. |
| **O-48** 🆕 🔴 **A NEW SUB-CLASS OF "A COMMENT IS SOURCE", FOUND THREE TIMES IN ONE SESSION (2026-08-03, items 2 and 3) — AND IT IS THE FIRST FROM ORDINARY ENGLISH PROSE THAT NAMES NO COLOUR, NO SIZE AND NO CLASS.** Every prior instance (seven of them) spelled something class-like or token-like. These three were **plain words in explanatory comments**: one meaning *"cannot be seen"*, one meaning *"a grid of values"*, and — the sharpest — a sibling elevation utility named inside the sentence explaining that the elevation utility had been REMOVED. All three are bare Tailwind utility names; the scanner has no parser, harvested them, and **emitted live rules with ZERO call sites.** | 🔴 **THE TEST HAS TO WIDEN AGAIN, AND THIS IS ITS FINAL FORM: not "is this a class name?", not "would any named rule match this line?", but "IS ANY WORD I AM WRITING ALSO A BARE UTILITY NAME?"** The candidate set is ordinary English — a comment cannot be written safely by inspection alone. 🟢 **THE ONLY WORKING CONTROL IS THE INSTRUMENT, AND ITS SCOPE MUST WIDEN TOO: `resolve-utilities.js --diff` was the ONLY layer that saw any of the three.** `tsc` clean, all twenty greps clean, the app renders identically, and the sole symptom was the resolved-rule count. **The standing rule "run `--diff` on any batch touching `tailwind.config.js` or `theme.js`" is NOW TOO NARROW — run it on ANY batch that adds prose to a file under the content globs**, which in the primitives phase is every item. |
| **O-49** 🆕 🔴 **AN ARRIVAL GATE'S OWN OVER-FINDING, AND CLASS 5 AT ONE REMOVE (2026-08-03, item 4).** `primitive-adoption-check.js`'s FACE assertion fired on all three of `SectionCard`'s text nodes; **two were FALSE POSITIVES.** The family lived in the file's own `StyleSheet`, one hop from the tag, and the check read only the brace-balanced opening tag. `SectionCard` is the FIRST primitive to use a `StyleSheet`, so nothing had hit it before — and items **7, 13 and 15 all use one.** | 🟢 **FIXED IN THE SAME COMMIT: the check now follows `styles.x` into the same file's sheet, ONE hop only.** A spread, a helper-built style or an imported rule still reports, which is the safe direction — a primitive is written now and can simply be explicit. 🔴 **THE REASON THIS IS REGISTRAR-WORTHY RATHER THAN A BUGFIX: §1.3 property 3 names OVER-finding as the insidious direction, because a rule that cries wolf is decommissioned by its own output — which is literally how `no-white-on-accent` became report-only.** An arrival gate that over-finds on its first real primitive is one release from being switched off. 🟢 **And the third hit was REAL** (the lock copy named no face in all five merged copies), which is the base rate holding for a fifth gate. |
| **O-50** ✅ **RULED 2026-08-03 — THE DISPLAY STEPS SCALE, AT THE SAME 1.3 CAP AS BODY COPY** (commit `3ce537f`; `theme.js`'s three `scales` flags plus the two hardcoded gate step-sets that hold the same contract). 🔴 **THE CONFLICT THIS ROW DESCRIBES IS DISSOLVED RATHER THAN TRADED: the freeze was an INHERITED PRINCIPLE that does not apply to this app.** Display type is frozen elsewhere because it usually sits in a fixed-height container, and pass 5 had already measured that **not one fixed-height container in this app holds a display step** — 0 OVERFLOW, 0 TIGHT. So the reason for the freeze was absent while its cost was being paid, and adopting a display step no longer subtracts anything from the dynamic-type coverage §0.0 rule 5 keeps. 🟢 **`O-58` / `P47` close with it, with NO value moved** (see that row), and the objection at `SectionCard` and `Sheet` is withdrawn — what remains there is an ordinary visual decision. ⚠️ **The className half (`C-P4-5`) is UNCHANGED**: a size utility cannot carry a prop, so the 25 `text-display-*` classNames still do not scale. The superseded entry follows.  🆕 🔴 **OPEN — AN OWNER CALL, AND A GENUINE CONFLICT BETWEEN THE DESIGN AND A DESCOPE RULING (2026-08-03, item 4). THE SECTION-TITLE STEP.** Design §9 row 4 specifies the small **display** step for `SectionCard`'s title, which would put Literata on **38 section titles** and is the most visible single change available in that item. 🔴 **But every display step is FROZEN by construction (§3.6), while the title it replaces carries an EXPLICIT scaling opt-in in all five merged copies.** Adopting it therefore **SUBTRACTS from the partial dynamic-type coverage that §0.0 rule 5 names as already shipped and explicitly KEEPS** while descoping the rest of the a11y work. | ⬜ **ONE OWNER SENTENCE — registered as `P42`.** Item 4 shipped the source step VERBATIM (§0.0 rule 1) and registered the gap rather than making the trade silently. ⚠️ **The same conflict recurs at every primitive whose designed title is a display step and whose current title is an opted-in body step** — `EmptyState` (item 8) and `Sheet` (item 15) are next, so the answer is worth more than one item. 🔴 **Note it cuts BOTH ways and neither side is free**: `O-35`'s whole lesson was that display steps were rendering in Figtree and *"nobody had ever seen Literata"*, so declining forever means the serif never reaches the surfaces the revamp was for. |
| **O-51** 🆕 🟢 **CLOSED ON ARRIVAL — THE `no-white-on-accent` PHANTOM +1, AND IT WAS A COMMENT (2026-08-03).** The rule read **22 for every pass up to and including pass 5 / C**, then **23 from `756f71e` (pass 5 / D) onward**, and every session since reported 23 without knowing why. Bisected across 13 commits: **no code moved.** 5/D added a comment explaining that this rule *cannot see* `DeleteAccountModal`'s destructive button — and that comment **spelled the nearby wash as a live class name** (the fill half) while the disabled-label class three lines below matched the foreground half. **The paragraph manufactured a hit at the very site it was describing**, and asserted *"22 reported hits"* while the rule printed 23. | 🟢 **Reworded in item 2's commit; back to 22, all reviewed.** 🔴 **THE REASON IT IS REGISTERED RATHER THAN JUST FIXED: an unexplained increment on a PERMANENTLY REPORT-ONLY, structurally blind rule is exactly what that rule exists to surface, and it sat unexplained for four sessions because 23 looked like a plausible number.** 🔴 **A FALL IN THIS COUNTER IS NORMALLY A FINDING**, so the 23→22 move is explained in that commit body rather than left to look like a fix. Eighth instance of the comment rule and the first on this one; see `O-48` for the sub-class the same session then found three more of. |
| **O-52** 🆕 🔴 **OPEN — A ROLE RULING WITH NUMBERS BEHIND IT, AND IT DIVERGES FROM A DESIGN ROW (2026-08-03, item 5). A STATE BORDER IS AN ACCENT ROLE, NEVER A STRUCTURAL ONE.** `Input` had NO focus state at all — the edge read `error ? danger : subtle` and nothing else, so WCAG 2.4.7 was unmet at 15 call sites. Design §2 row 12 assigns the STRONG NEUTRAL edge to a focused field. **Measured against this component's own fill: strong neutral 1.61:1, subtle neutral 1.20:1, and THE CHANGE BETWEEN THE TWO STATES 1.33:1** against WCAG 1.4.11's 3:1 for state information. The accent role is **6.04:1**. At 1.33:1 the specified indicator is not weak, it is ABSENT. | ⬜ **SHIPPED AS THE ACCENT ROLE, pinned from both sides** (`border-accent` asserted present, the strong neutral asserted absent with the reason recorded that a shipped design row invites it back). Registered as **`P43`** for ratification. 🟢 **Two independent authors already agreed**: `verify-email`'s filled digit box and `qa.tsx`'s non-empty composer BOTH signal state with accent and NEITHER with the strong neutral. 🔴 **The general rule: an edge that SIGNALS selection/focus/active is accent; an edge that SEPARATES two surfaces is neutral. They cannot share a token — the neutral pair exists to be QUIET, which is the one thing a state indicator must not be.** 1b shipped three regressions from collapsing the two. |
| **O-53** 🆕 🔴 **THE ROLE-vs-ROLE CLASS, WHICH IS `O-26` ONE TOKEN OVER (2026-08-03, items 5 and 6).** `O-26` is 13 sites where a token whose NAME DECLARES A ROLE is used in the wrong DIMENSION. This is the same failure with the wrong ROLE: design §2 row 9 contracts `fg-placeholder` to the `Input` placeholder **AND NOTHING ELSE**, because it is the only sub-AA foreground in the palette. **Measured: 21 sites spelled it as a live FOREGROUND.** 2 are legitimate (birth-data's date/time pseudo-fields). The copy riding the other 19 included a password rule, a naming instruction, and — worst — **the compliance disclaimer, which is X8/X9 and a legal notice**. 🔴 **EVERY OTHER GATE PASSES ON ALL 21**: the name is legal, it is not `white`, there is no hex, no weight, no numeric size, and `tsc` cannot have an opinion about a colour role. | 🟡 **21 → 17. Item 6 took all FOUR disclaimer renderings** (the shared component, profile's hand-shortened variant, and the report screen's two fine-print lines). **15 of the remaining 17 are misuse**, registered as **`P44`**. 🟢 **Now an EXACT-COUNT census in `primitive-adoption-check.js` that fails in BOTH directions**, so a fix that does not move the number fails too — which makes it the decreasing counter §0.2 says this phase barely gets. ⚠️ **NOT swept at items 5–6 on purpose: fixing 2 of 21 is the 'a fix applied to a copy is not a fix' antipattern item 4 exists to answer.** One class, one owner, one sweep. |
| **O-54** 🆕 🔴 **"A COMMENT IS SOURCE" CUTS **BOTH** WAYS, AND THE TWO DIRECTIONS HAVE OPPOSITE SAFETY PROPERTIES (2026-08-03, items 6 and 8). THE PRESENCE DIRECTION SILENTLY OPENS A GUARD.** All twelve prior instances were the same direction: prose ADDED something, so a rule FAILED — loud, safe, self-correcting. 🔴 **The `literals` half of `primitive-adoption-check.js` asserts an invariant's literal is still in the primitive's module. If the module's HEADER COMMENT spells that literal — and a header explaining an invariant is exactly where it would — the assertion is satisfied BY THE PARAGRAPH DESCRIBING IT, forever.** Measured: deleting `accessibilityRole` from the disclaimer's JSX left the gate EXITING 0. All 16 literal assertions were exposed; `Input`'s highest-value one survived only because its regex demands a semicolon and prose does not write one. | 🟢 **FIXED STRUCTURALLY: `literals` now reads the module with COMMENTS BLANKED, strings preserved.** 🔴 **`absent` and `treeAbsent` STAY TEXT-LEVEL and the asymmetry is deliberate** — there the prose direction fails loudly, and a comment naming a retired thing genuinely is a reason to reword the comment. **Do not "make them consistent".** ⚠️ **A COROLLARY, found at item 8: the presence half can therefore NEVER assert an in-file MARKER, because a marker IS a comment.** Markers belong to the text-level halves and to the counters that print them (the GLYPH exception reports itself every run). Instances 10 (the absence rule on its own paragraph, twice now), 11 (this), 12 (the same again on a props sentence), 13 (see `O-55`b). |
| **O-55** 🆕 🔴 **FIVE LIVE AA FAILURES, FIFTEEN REACHABLE SITES, ALL INVISIBLE TO EVERY INSTRUMENT — AND THE 21st NAMED RULE THAT NOW SEES THEM (2026-08-03, item 7).** Every one is the plain foreground on an accent-family FILL: **`primaryButtonText` in BOTH capture screens (2.31:1, 8 sites)** · **`errorText` in both (3.26:1, 3 sites)** · **`CaptureInfoModal.ctaText`** · **`LockedSection.bannerButtonText`** (the upgrade CTA every free user sees, 3 screens) · GeneratingReading's retry label (latent). 🔴 **The capture screens are the FIRST-RUN FUNNEL.** Distances between the fill rule and the label rule were 7, 9 and 21 lines against `no-white-on-accent`'s four-line window; it read **22 before and 22 after**. 🔴 **AND `face-capture.tsx` CONTAINED A BROKEN PAIR AND A CORRECT ONE TWENTY LINES APART — the correct one carrying a comment explaining the rule the broken one broke.** | 🟢 **ALL FIVE FIXED, and the class now has an instrument: `A5 pair · fill x label`, inside `primitive-adoption-check.js`, BLOCKING at 19 pairs / 0 violating.** It resolves the STYLE GRAPH rather than searching text: accent-family fill rules → the JSX elements consuming them → **that element's SUBTREE BY TAG DEPTH** → each text node's own style rule's colour. Distance becomes irrelevant, so the property that forced the old rule to be report-only is gone. ⚠️ **SELF-CLOSING ELEMENTS HAVE NO SUBTREE, and that is load-bearing** — it removes the one false positive the first draft produced (a 6×6 accent dot whose SIBLING was the instruction text) **structurally rather than by exception**, because over-finding is the direction that decommissions a rule. 🔴 **Two instruments, two shapes, neither widened onto the other's ground:** this one is style-rule-to-style-rule, the old one is inline-and-proximity. |
| **O-56** 🆕 🔴 **OPEN — AN UNREACHABLE CODE PATH PROTECTED FROM DELETION BY AN X-INVARIANT (2026-08-03, item 7).** All five `GeneratingReading` call sites pass `type` **and nothing else**: `error`, `onRetry`, `onGoHome` and `title` are unreachable, and the two capture screens render their **own byte-identical error overlay ON TOP of the component** instead. By the standing rule a zero-call-site option is a DEFECT and item 3 deleted one for exactly that. 🔴 **Deleting this one would delete X17's lower width bound, and §0.0 rule 3 is unconditional: an invariant violation is a HARD STOP, not a conservative choice.** So an iOS layout guard is protecting a control nobody can reach. | ⬜ **KEPT, its latent contrast defect FIXED (see `O-55`), and the decision registered as `P45`** — retire the props, or wire the two capture screens onto them and delete two duplicate overlays. **Nobody below the owner can retire an X number.** ⚠️ **The same shape recurred twice more in one session** — `AffirmationCard`'s lock branch (`O-60`) and the skeleton loading density — so *"unreachable, and protected by something that is not a bug"* is now a recognised pattern rather than a one-off. 🟢 **The gate did catch a real defect inside a dead branch** (lock copy that could not scale) and it was fixed rather than excepted: *"it is unreachable"* is not a reason to leave a defect in code a ruling may switch on. |
| **O-57** 🆕 🔴 **`O-26` WAS ENUMERATED BY TOKEN, SO IT COULD NOT CONTAIN A SEVENTH INSTANCE (2026-08-03, item 7).** `O-26` lists **6 progress/score TRACKS** using the subtle-edge token as a FILL, against design §2 row 14, which names the accent wash as the progress-track fill. `GeneratingReading`'s bar grounds on the **overlay step** instead — the same §2-row-14 misplacement, in a DIFFERENT wrong token, and therefore invisible to every search that found the other six. **The class is "a track on the wrong token"; the enumeration was "a track on THIS wrong token".** | ⬜ **LEFT ALONE DELIBERATELY so all SEVEN move together at cut 3's device ruling, or none do** — moving a track from a neutral to an amber wash is a visible value change, which is exactly why `O-26` was deferred rather than fixed. Commented at the site. 🔴 **The transferable lesson is class 4 at one remove: an enumeration built by grepping for the WRONG VALUE cannot find an instance that is wrong in a different value.** Enumerate by the ROLE that is missing, not by the token that is present. |
| **O-58** ✅ **CLOSED 2026-08-03 BY THE `P42` RULING, AND IT NEEDED NO RAMP CHANGE AT ALL.** The owner took the first of this row's three exits — **let the display steps scale at the same cap** — and that closes all FOUR specified pairings at once **without moving a single value**, because both sides now scale by the same multiplier and **every ratio in the ramp becomes SCALE-INVARIANT**. At the cap the pairing is **26/33.8 against 19.5/28.6**. 🟢 **AND THE ONE CHECK IT NEEDED WAS ANSWERED IN THE RENDERER RATHER THAN BY ENUMERATION:** the worry was `display-lg` 30 × 1.3 = 39 against a 38 line height, and **`lineHeight` scales by the SAME multiplier as `fontSize` on BOTH platforms** — Android `views/text/TextAttributes.java`'s `getEffectiveLineHeight()` makes the very call `getEffectiveFontSize()` makes; iOS `Libraries/Text/RCTTextAttributes.mm:139` multiplies by `effectiveFontSizeMultiplier`. So the pair is **39 / 49.4**, and the ramp's own accented-capital clearance formula is linear in the multiplier, giving **+2.60 / +2.86 / +2.60** at the cap against the +2.00 / +2.20 / +2.00 the raise was tuned for. **There is no scale at which ink meets ink.** ⚠️ **Widening the opt-in gate to the new step set then found FIVE live sites on its first run** — five StyleSheet rules hold a display step and their JSX consumers carried no scaling prop, so those titles would have stayed frozen with `theme.js` claiming otherwise. `P23`'s exact lesson one step up. The superseded measurement follows.  🆕 🔴 **`P42` / `O-50` MEASURED, AND THE COLLAPSE IS REAL — BUT IT IS A RAMP PROPERTY, NOT A COMPONENT ONE (2026-08-03, item 8).** The title takes the display step per the owner's ruling. Measured at the 1.3 cap: **small display step 20/26 FROZEN against the small body step 15/22 → 19.5/28.6.** The sizes land **HALF A PIXEL APART**, and 🔴 **the body's LINE HEIGHT OVERTAKES THE TITLE'S BY 2.6px** — so for any user who enlarges text the description block is vertically LARGER than the heading above it. The faces still differ (bold serif against regular sans), so they do not become identical; the SIZE hierarchy is what goes. | ⬜ **REPORTED, NOT FIXED — registered as `P47`.** The property is that a FROZEN display step sits at roughly (a scaling body step × 1.3). **Only the SMALL display step qualifies** — the medium one is 24 against the same 19.5 and is safe — so every surface pairing those two inherits it, and **the design specifies that pairing FOUR times**: `EmptyState`, `SectionCard`'s title, the monthly hub's This Month card, and the no-birth-date empty state. Three candidate exits (let the step scale at the same cap · move the step · cap the body lower on these surfaces) and **all three move the ramp**, which §0.0 rule 1 does not license. 🟢 **Also settled a documentation conflict: design §6.2's code block says line height 25 and §6.6's table says 26; the shipped ramp is 26.** |
| **O-59** ✅ **ANSWERED 2026-08-03 BY ITEM 13, AND IT IS WHAT THE CENSUS ALWAYS SAID** (commit `275147f`). 🟢 **`LockShell`'s 28dp lock plate is the token's FIRST — and by the census its ONLY — call site in the history of the codebase.** The competing claimant did not land and should not: `EmptyState`'s designed plate and its top padding are ONE decision belonging to **item 18**. 🔴 **The grounding was decided BY ROLE with a measurement behind it:** design §2 row 5 names this token the lock-plate fill, and the plate must read as a **step above its own ground** — against the raised step it measures **1.15:1**, **the largest step in the entire surface ladder** (the others are 1.05 and 1.06), while grounding it in the raised step would have made it **1.00:1**: invisible, permanently, and invisible to every gate too. 🟢 **The same measurement decided where the plate does NOT go** — on density 1's panel the ground is the overlay step, where it is **1.05:1**, and §4.2 independently rules that panel carries no plate. Two arguments, one answer. 🔴 **The durable part is the census SHAPE: it is now `exact: 1`, not `nonzero`**, because this token has exactly one legal home — so a second site is `O-53`'s role-vs-role class arriving, which `nonzero` could never see, and a fall to 0 fails too. It caught a defect immediately: see `O-68`. The superseded entry follows.  🆕 🔴 **THE `locked` TOKEN HAS TWO CLAIMANTS FOR ITS FIRST CALL SITE, AND THE CENSUS NAMES ONLY ONE (2026-08-03, item 8).** §1.2 C and the token census both assign `locked`'s first call site to **item 13 / LockShell**, on a stated ordering argument. 🔴 **But design §9 row 8 gives `EmptyState` a "`locked` plate 56"** — so item 8 is also a claimant. Whichever lands first flips a census that expects 0, **while the census's own owner note points at the other item**. Nobody had noticed the two rows disagree. | ⬜ **REGISTERED AS `P50`; the census is untouched and still reads 0.** Item 8 did NOT build the plate, and that is independently correct: the plate and its top padding are ONE decision belonging to **item 18**, where the plates are authored, because the padding only means anything once something sits above the title, and inventing a plate to justify the padding is what §0.0 rule 2 forbids. 🔴 **Whichever item flips the counter must move the owner note in the same commit** — a counter whose named debtor is wrong is worse than one with no debtor, because it reads as accounted for. |
| **O-60** 🆕 🔴 **OPEN — A MONETISATION CALL WEARING A DEAD-CODE CLEANUP'S CLOTHES, AND IT MOVES ITEM 13's SCOPE AGAIN (2026-08-03, item 11).** Measured across the four lock-bearing cards: **`AffirmationCard` 0 call sites pass a lock flag; `GrowthCard` 3, `PalmLineCard` 1, `ScoreCard` 4.** So one of the four is unreachable while every sibling gates its content — most likely a gate that was never wired rather than a capability nobody wanted. | ⬜ **KEPT, registered as `P46`.** Deleting it would be a **monetisation change wearing a design change's clothes**, which is the reasoning that produced ruling **R-B** about the 25 teaser strings, and §0.0 rule 1 puts preserving behaviour above tidying it. 🔴 **THREE CONSEQUENCES REGISTERED:** (i) **item 13's scope is "4 BlurView lock components" and it is THREE LIVE AND ONE DEAD** — the same correction `O-42` already took once, when only one of four section-card lock branches turned out to be reached; (ii) that branch's copy names a TIER, an R1 violation and a **FIFTH `C-5` literal** the audit's list of four missed, unreachable but not absent; (iii) its padlock is a **FIFTH pictograph** of the kind item 4 retired, left as a marked glyph because converting an icon in a branch that never renders is churn and item 13 deletes the branch outright. |
| **O-61** 🆕 🔴 **A WORD BOUNDARY IS NOT A TOKEN BOUNDARY — `\bbg-accent\b` MATCHES `bg-accent-2` (2026-08-03, item 11).** A word boundary sits happily before a hyphen, so **an assertion on the SHORTEST name in a token family silently accepts every longer sibling.** Measured by injection: swapping the primary accent for the secondary one on `AffirmationCard`'s copy control — **a deliberate `O-17` violation** — left the rule GREEN. The porous names in this palette are exactly the short ones most likely to be asserted: the plain accent, surface, foreground and body families. | 🟢 **FIXED with a non-token lookahead and re-verified caught.** ⚠️ **`no-white-on-accent`'s className half HAS THE SAME SHAPE and therefore treats a WASH as a FILL** — which is precisely what its own comment says was tightened out of its INLINE half at 1b. 🟢 **Measured all 22 of its reported hits: 20 sit on a real fill and NONE comes from a wash, so the defect is LATENT, not active.** 🔴 **LEFT ALONE DELIBERATELY: it is report-only, and 22 is a baseline every prior session's records depend on**, so moving that number for a defect with no live instance costs more than it buys. Re-measure if a wash ever gains a plain-foreground neighbour within four lines. |
| **O-62** 🆕 🔴 **AN INVARIANT THAT CANNOT BE MECHANISED, MEASURED RATHER THAN ASSUMED — AND A DEAD INDICATOR ON THE APP'S FIRST PAINT (2026-08-03, item 12).** Design §9 row 12's *"never two loading densities at once on one screen"* is about **SIMULTANEITY**, and static text cannot decide it: **NINE files mount more than one indicator and EIGHT are mutually-exclusive branches that never co-render**, so any per-file count over-finds on eight of nine. 🔴 **The one real instance is the SPLASH**, which mounts `LoadingSpinner` AND a second indicator as its immediate sibling **at zero opacity** — rendering nothing, animating anyway on the most performance-sensitive moment in the app, and reserving layout. | ⬜ **NOT GATED, and that is the finding: the rule stays PROSE in the module**, beside the instance, exactly like the on-accent rule it resembles — because a count that cries wolf on eight of nine files is the disarming direction, which is how `no-white-on-accent` became report-only. ⬜ **The splash instance is registered as `P48` and NOT deleted here**: its column is vertically centred, so removing ~30 points of column height **MOVES THE WHOLE SPLASH**, and the splash is `P18a`, an open owner gate whose asset has not landed. A visible shift on the first screen every user sees is not a tidy-up to slip into a loading-system commit. |
| **O-63** 🆕 🔴 **TWO SILENT-OPEN HOLES IN THE ARRIVAL GATE'S TEXT CHECKS, BOTH FOUND BY INJECTION (2026-08-03, item 7).** **(a) `<Animated.Text>` WAS INVISIBLE** to both the FACE and the OPT-IN half, because the element pattern anchored on the plain `<Text` name. Two such nodes exist tree-wide and **one of them is the rotating status message on the 60-second wait screen** — i.e. the text node a user stares at longest in this app sat outside the only check that can see a missing face. **(b) THE OPT-IN CHECK ACCEPTED `t.txt(x).style` AS EVIDENCE OF THE PROPS.** That form carries the style and provably NOT the props — that distinction is the entire content of `P23`, and the reason `p23-optin-check` matches the SPREAD form specifically. | 🟢 **BOTH FIXED AND RE-VALIDATED, and both were passing at the time — widened while it was free rather than after it bit** (§3.0.2.0's widen-and-revalidate step, and class 2's whole hazard: nothing counts down beside a rule sitting at 0). Verified by injection that removing ONLY the spread now fires OPT-IN and **not** face — the face legitimately still arrives via the style reference — and that removing both fires face too. 🆕 The FACE check also gained the **GLYPH marker** §1.2 A requires for a primitive rendering a pictograph, counted and printed separately, never summed. |
| **O-64** 🆕 🔴 **A SIZE THAT IS ABSENT RATHER THAN WRONG — CLASS 5 IN ITS PUREST FORM (2026-08-03, item 8).** `EmptyState`'s description carried a colour and an alignment **AND NO SIZE AT ALL**, so it rendered at the platform's own default of **14** — off the ramp, sitting between the 13 and 15 steps, at four call sites. 🔴 **Every type rule in this tree searches for a size that is WRONG. None of them can see a size that is ABSENT, because the platform supplies it AFTER THE LAST GREP HAS RUN.** `no-numeric-fontsize` finds a literal, `no-variable-fontsize` finds an indirection, `--diff` sees only what resolves, and the value here is in neither the file nor the config. | 🟢 **FIXED to the small body step, with the scaling opt-in.** 🔴 **The class is live and unmeasured elsewhere: a `<Text>` with a colour utility and no size utility renders at the platform default on every platform, and the census that would find it does not exist.** The nearest existing instrument is `family-arrival-check`'s *className MISSING family* half, which proves the shape is checkable — a **className MISSING SIZE** half would be its sibling and is not budgeted here. Recorded so the next session that wants a cheap high-yield census knows where one is. |
| **O-65** 🆕 🔴 **`BlurView` HAS NEVER BLURRED ANYTHING ON ANDROID IN THIS APP, AND THREE SHIPPED THINGS RESTED ON THE ASSUMPTION THAT IT DID (2026-08-03, item 13).** Measured in the installed `expo-blur@14.1.5`, not recalled: **`experimentalBlurMethod` defaults to `'none'`** (`src/BlurView.tsx`), and on that path `ExpoBlurView.setBlurMethod` calls `setBlurEnabled(false)` and paints `tint.toBlurEffect()` as a **flat background** instead. With no `tint` prop the Android branch is `TintStyle.DEFAULT`, whose colour is **white at `255 * (radius/100) * 0.44`** — alpha 22, i.e. **8.6%**, at intensity 20. 🔴 **Consequence 1, and it is a MONETISATION defect rather than a styling one: a white 8.6% sheet leaves the withheld text LEGIBLE, so the four card lock overlays were not locking anything on the only platform this app ships to.** Consequence 2: `primitives-plan.md` §4.2's whole preservation argument — *"the meaning users already learned, veiled = paywalled"* — **has a false premise on Android**. Consequence 3: `P38` check 4 asks about SVG under a blur and there is no blur to composite under. | 🟢 **THE LEAK IS CLOSED — item 13's merged overlay grounds OPAQUELY on the raised step**, which reverses the worry that removing the veil would delete a tease: there was no tease, there was a leak. 🔴 **The element STAYS at density 1**, because iOS renders the real material and the design specifies it; what changed is that the module now says what Android actually does, so nobody deletes it as dead on the strength of an Android screenshot. ⬜ **Turning the real method on is registered as `P52` and the default answer is NO:** `dimezisBlurView` is a **per-frame capture of the root view**, and `O-46` already has a per-frame Android cost open as a memory question for the texture — a second one, on the screen where a user decides whether to pay, is a device check with a real downside rather than a free switch. |
| **O-66** 🆕 🔴 **THE MUTED FOREGROUND IS SUB-AA ON THE OVERLAY SURFACE — 4.35:1 — AND THE ONE PUBLISHED FIGURE FOR IT IS AGAINST A DIFFERENT GROUND (2026-08-03, item 13).** Design §2 row 8 lists the muted role at **5.36:1**, which is measured against the CANVAS. Measured against the other surface steps: **canvas 5.31:1 ✅ · raised step 4.76:1 ✅ · OVERLAY step 4.35:1 🔴.** So the same role passes on three grounds and fails on the fourth, and nothing in the palette documentation says which ground its figure belongs to. 🔴 **§2.1 already bans the `danger` role as text on that exact surface at 4.28:1 — this is the SAME CLASS ONE TOKEN OVER, at a ratio 0.07 away, and it was unregistered.** | 🟢 **AVOIDED AT THE SITE: LockShell d1's body takes the SECONDARY role, 8.50:1 on that ground.** 🔴 **IT BINDS ITEM 15 DIRECTLY AND THAT IS THE REASON TO REGISTER IT: the overlay step is `Sheet`'s ground**, so every muted line in that component is this defect, and `Sheet` is the one component §2.1 already writes a surface-role prohibition for. ⚠️ **The transferable lesson is that a contrast figure without its GROUND named is not a measurement, it is a claim** — and a palette whose surfaces are 1.05 apart makes it easy to assume one figure covers all four. Whoever builds item 15 measures every foreground against the overlay step, not against the canvas. |
| **O-67** 🆕 🔴 **THE ARRIVAL GATE PRINTED A PER-SITE COUNT FROM ITEM 0 AND NEVER ASSERTED IT — FOUND BY AN INJECTION THAT ESCAPED (2026-08-03, item 13).** `R-2` (§0) has required *"a PER-PATTERN count, before and after"* since the first pass and `P-2` has fired on that gap four times. Measured by injection: **breaking ONE of `readings/palm.tsx`'s TEN `LockShell` call sites left the contract reading 11 expected / 11 actual / 0 residue**, because the file still rendered nine more. 🔴 **A file list cannot see a site disappearing inside an adopting file, and it matters most on exactly this primitive: 29 of its 36 sites are 7, 9 and 9 inside three files, and a lost lock does not look like a bug** — the free user simply sees nothing where a locked section was, which reads as content that was never generated. | 🟢 **FIXED: `siteCounts` asserts an EXACT count PER PATTERN — here per density, 3 / 29 / 4 — plus the sum**, which is what catches a tag carrying no density at all (a spread or an `as any` past the union, i.e. the one shape `tsc` cannot see). ⚠️ **Per pattern and not per total, deliberately:** a total reconciles by accident — one site lost in one file, one gained in another — and that is precisely what §3.0.2.2.2 warns about. **Re-validated with four further injections in both directions, all caught.** 🔴 **The general form: a number a gate PRINTS is not a number a gate CHECKS, and the printed one reads exactly like the checked one in a commit body.** |
| **O-68** 🆕 🔴 **"A COMMENT IS SOURCE" HAS A **THIRD** DIRECTION: PROSE THAT MOVES A **COUNT** (2026-08-03, item 13).** `O-54` established two directions with opposite safety properties — prose ADDS something and a rule fails (loud, safe), or prose SATISFIES a presence assertion (silent, dangerous). 🔴 **A CENSUS is neither: it is a NUMBER, so prose can move it in either direction and which way it fails depends entirely on the census's SHAPE.** Measured: naming the lock token in `LockShell`'s own header comment **inflated that token's exact census by one**, because the census reads raw source. 🔴 **Under `exact` it failed loudly. Under `nonzero` — which is what that entry was very nearly written as — the COMMENT ALONE would have satisfied the assertion, and the plate could have grounded on the wrong token with the gate green.** | 🟢 **Reworded, and the census hardened from `nonzero` to `exact: 1` in the same commit.** 🔴 **The rule for censuses: an inexact census over raw source is satisfiable by its own documentation.** Either read code only, or assert an exact number so prose fails loudly. ⚠️ **Two more instances in the same file's header, both loud:** the superseded ELEMENT names written in JSX form are harvested by the legacy assertion (which scans raw source and skips only the element's own module — **so a comment documenting the migration reports it as incomplete, in the file that completes it**; first instance inside the arrival gate rather than Tailwind or a grep), and 🔴 **the ordinary English word for a dimming layer is a token whose bare use is a permanent invariant at 0 — and then the sentence explaining THAT blocked the gate again, because THE RULE FLAGS ITS OWN NAME.** No token-lookup spelling rescues it; the workaround is to not use the word, a first for this class. |
| **O-69** 🆕 🔴 **THE "SAFE WORD" LIST IN THE STANDING NOTES IS FALSIFIED, AND THE DERIVATION IS RUNNABLE (2026-08-03, the `P42` batch).** `session_handoff.md`'s standing rules list **`rounded`, `italic`, `table`, `truncate`, `blur`, `contents`, `isolate`** as words that *"do NOT resolve today"* — offered as evidence that writing them in a comment is safe. 🔴 **Probed against the live config by dropping a scratch file into a content glob and diffing the resolved rule set: `contents`, `isolate`, `sticky`, `table`, `truncate` AND `grid` all resolve the moment they are written.** Only the value-taking families (`rounded`, `blur`, `border`, `shadow`, `flex`, `hidden`, `absolute`…) are genuinely inert bare. Found the expensive way: an ordinary English noun in a comment emitted a rule with zero call sites (**200 → 201**), and the sentence written to explain it emitted a **second** one. | 🟢 **Both reworded; `--diff` back to 0 of 200 — and `--diff` was the ONLY witness, which is the standing argument for running it on every batch that adds prose.** 🔴 **THE CORRECTED RULE, and it inverts how the old list reads: A WORD'S ABSENCE FROM THE RESOLVED SET IS NOT EVIDENCE THAT WRITING IT IS SAFE — it is the PRECONDITION for writing it being unsafe.** A word already in the set is harmless (the rule exists either way); a word absent from it is the one that creates a rule. ⚠️ **The probe is the derivation and it takes about ten seconds:** write the candidate words into a throwaway file under a content glob, resolve, diff, delete. **Guessing failed twice in one commit.** |
| **O-70** 🆕 🔴 **§4.1 ASSIGNS A FULL-SCREEN LOCK TO A SCREEN THAT HAS NOTHING TO LOCK, AND THE DEFINING PROPERTY OF THAT DENSITY IS FALSE AT EVERY SITE IT NAMES (2026-08-03, item 13).** `primitives-plan.md` §4.1 makes density 1's defining property *"the blurred layer is REAL content, not lorem"* and lists `readings/combined.tsx`'s early-return lock as a d1 site. **Measured: that screen skips `loadAllData()` ENTIRELY for an unentitled user**, so there is nothing behind the veil and d1 there would be a **WALL**, which §4.1 explicitly says d1 must not be. 🔴 **And it generalises: every full-screen gate in this app fires BEFORE the fetch, because the server refuses** — so the client never holds a withheld payload to show. Class 7 again, on the design's own central property rather than on a count. | 🟢 **`combined.tsx` STAYS a `router.replace` to the paywall and is recorded in the adoption contract's FORBIDDEN list with the reason** — so nobody "finishes" the migration later, and it remains `O-41`'s one replace site for item 17 to express rather than convert (converting it changes a lock screen's back stack). 🟢 **The other three d1 sites ship**, and at the two destiny screens what sits behind the veil is **the screen's own body — the form and the generate control, i.e. the feature being denied** — which is as close to the property as the client can get. A redacted payload is the same server work **`O-1`** is blocked on. 🔴 **The durable half: d1 MOUNTS LAST AND COVERS THE SCREEN rather than wrapping it**, which makes the withheld content inert for free and keeps every call site to one appended element. |
| **O-71** 🆕 🔴 **A THIRD NAME COLLISION WITH A SHARED SYMBOL, AND THIS ONE WOULD HAVE SHADOWED THE IMPORT SILENTLY (2026-08-03, item 17).** `readings/qa.tsx` already defined a **local function called `openPaywall`** — a thin wrapper firing a haptic and pushing the route. Importing the new helper into that file would have been **SHADOWED by the local**, so the screen would have kept pushing the route by hand while any identifier-based check counted it as an adopter. **Third instance of the class in this phase and the SECOND in this one file:** `combined.tsx`'s `SectionCard` (item 4, `O-42`) and `qa.tsx`'s `EmptyState` (item 8). | 🟢 **Renamed to `goToPaywall`, which keeps its medium haptic exactly where it was and calls through.** 🔴 **THE PATTERN IS NOW ESTABLISHED ENOUGH TO BE A PRE-FLIGHT STEP RATHER THAN A DISCOVERY: before extracting or introducing ANY shared symbol, grep the tree for that identifier as a LOCAL definition.** All three instances were in screens, all three would have made a gate blind rather than loud, and two of the three were in the one file that is structure-frozen and therefore hardest to fix later. |
| **O-72** 🆕 🟢 **A HELPER IS NOT AN ELEMENT, SO THE ARRIVAL GATE COULD NOT SEE ITEM 17 AT ALL — AND CLOSING THAT ALSO CLOSED CLASS 8 FOR IT (2026-08-03, item 17).** Every assertion in `primitive-adoption-check.js` keys on a **JSX element name**, on the stated ground that an element name survives both a className and a style. 🔴 **A FUNCTION HAS NO ELEMENT NAME, and neither does the navigation call it replaces**, so nothing in the tree could assert that `openPaywall` arrived or that the ad-hoc form left. ⚠️ **And the module lives in `lib/`, which that script's two roots (`app`, `components`) do not cover** — `hooks/usePaywall.ts` held TWO ad-hoc paywall pushes until item 17 deleted it and **no rule in the file could see either**, which is blindness class 8 (`O-45`) live rather than historical. | 🟢 **A HELPER CENSUS with the same four assertions one shape over** — adoption, undeclared, an **exact** site total, and the legacy form absent — **plus a second WIDE_ROOTS set (8 roots, 134 files) used by that section only.** 🔴 **The primitive contracts KEEP the narrow roots deliberately**: a JSX element outside `app/` and `components/` is not a screen or a component, so widening would count nothing and would silently move every adoption number in the file. **Two questions, two root sets, both stated in the module.** 🟢 **The legacy pattern needs NO EXCLUSION for the helper's own module** because its real calls pass a named constant rather than a literal route — **an exclusion is a hole; not needing one is strictly better** — which is also why that module PARAPHRASES the old call shape instead of quoting the design's sentence verbatim (instance 17, pre-empted). |
| 🆕 **`O-73`** | 🔴 **A GRADIENT GROUND IS A FUNCTION OF POSITION, NOT A PROPERTY OF A STYLE RULE — and it is the class the A5 pair rule is structurally unable to resolve.** Two of the three share cards ran an accent-to-canvas slab, down which the on-fill role (6.86 -> 1.06) and the plain role (2.31 -> 16.84) CROSS, leaving a band ~a third of the way down where NO palette token clears AA. Four live sub-AA rules sat in it, the worst being ShareableQuote's QUOTE at 3.87 -> 1.42 across all five of its call sites — model-authored copy, the card's entire point, baked into an image that leaves the app. The A5 pair rule joins a fill STYLE RULE to a label STYLE RULE; a two-colour `colors={[…]}` array is neither, and which end applies depends on a text node's vertical offset. It read 17/0 before and after; `no-white-on-accent` read 22 both times | 🟢 **CLOSED at items 9-10.** design §2's aura row already retires all 21 slabs except X3's, so the fix was a subtraction the design had ruled. All three surfaces now ground in ONE OPAQUE STEP and the brand moved onto elements with their own fills — which also makes every accent surface there a pairing the gate CAN resolve. 🔴 **The class is permanent: any gradient ground is invisible to the A5 rule** — but 🟢 **AMENDED 2026-08-04, SEE §3.0.2.1.1: the word *any* was too strong and it cost X3's Button.** A gradient whose RANGE IS CONSTRAINED so its whole span clears AA is resolvable, mechanically, and `A6 gradient · span × label` now blocks on it |
| 🆕 **`O-74`** | ⚠️ **A CONTRAST FIGURE'S GROUND MAY NOT EXIST IN §2's TABLE AT ALL** — `O-66` one ground over. The two WASH grounds (`accent-muted` / `accent-2-muted` over the canvas) put the label role at **4.41 and 4.47** — sub-AA, in §2.1's prohibited band — and §2 publishes that role only across the four SURFACE steps | 🟡 **A row for the wash grounds belongs in §2's table.** Both existing wash-grounded cards are clean; the quote card's footer moved up a step at items 9-10 to keep it so. `C-P5-5` |
| 🆕 **`O-75`** | 🔴 **A PRINTED COUNT IS NOT A CHECKED COUNT — NAMED AS A PRINCIPLE** (owner, 2026-08-04), and it has now fired in FOUR different fields: a per-primitive site count, a PRESENCE assertion over N identical literals (X20's two heights; the plate stroke floor's ten), the A5 resolver's own pair count (a broken four-stage walk prints `0 pairs, 0 violating` and reads as a pass), and an inexact census over raw source | 🟢 **CLOSED STRUCTURALLY** — `siteCounts`, 🆕 `literalCounts`, a nonzero FLOOR on the resolver, `exact` on every census. ⚠️ **Choose the SHAPE: a floor for a DISCOVERY number that legitimately moves both ways, an exact count for an INVARIANT.** An exact assertion on a discovery number cries wolf, which is how `no-white-on-accent` was demoted |
| 🆕 **`O-76`** | 🔴 **A DEFECT-INJECTION HARNESS THAT READS AN EXIT CODE AND NOT A REASON PROVES NOTHING.** One run was invalid from case 11 onward because an `exact` census had already turned the baseline red, so every later "CAUGHT" was the stale count | 🟢 **CLOSED** — assert a GREEN BASELINE before each case and grep for the SPECIFIC finding. Four batches then ran 21 / 13 / 21 / 22 cases with zero incorrect results, and three cases were themselves findings |
| 🆕 **`O-77`** | 🔴 **A TYPE ARGUMENT IS NOT A JSX ELEMENT.** `useRef<Text>(null)` matched the adoption gate's element scanner and was reported as a text node naming no face — the gate demanded a font family from a TYPE. Every generic in the tree is the same shape | 🟢 **CLOSED, no parser needed**: in JSX `<` is NEVER immediately preceded by an identifier character; in a type-argument list it always is. Fixed in the scanner rather than by renaming the ref, because the workaround would have hidden it for the next reader — and over-finding is the direction that decommissions a rule |
| 🆕 **`O-78`** | 🔴 **THE GLYPH EXCEPTION *IS* A COMMENT, so blanking comments for a presence check DELETES THE EXCEPTION MECHANISM.** Fixing `O-54` for the text-node census broke three passing primitives, reporting legitimately-excepted pictographs as faceless. CLAUDE.md's own corollary, hit from the opposite side | 🟢 **CLOSED — the split is PER FIELD:** enumeration stripped (prose must not invent a node) · face/step stripped (`O-54`) · **marker RAW** (it is a comment by construction). stripComments is length-preserving, so the raw tag is the same byte span at the same offset |
| 🆕 **`O-79`** | 🔴 **THE FIFTH NAME COLLISION: `LockShell` defined a LOCAL `Plate`** with two call sites, identical to §14's new component. It gave that component's contract TWO FALSE ADOPTERS of a file it does not import, and an import would have been SHADOWED | 🟢 **CLOSED** — renamed `LockPlate`, which is also design §2 row 5's own words. **Third `O-71` instance in three items: grep for a local definition BEFORE reaching for a shared name** |
| 🆕 **`O-80`** | 🔴 **A CONTROL CHARACTER IN A GATE SCRIPT, HIDDEN BY EVERY TERMINAL READING OF IT.** A word-boundary escape in one `siteCounts` regex was written as a literal 0x08 byte, so the pattern matched nothing and the count printed 0 against an expected 2 — while the file looked correct | 🟢 **CLOSED** — found only by comparing the printed `re.source` against the file's bytes. ⚠️ **Same family as everything else in this phase: the instrument read fine and was wrong.** Generated-edit hazard; prefer a direct editor over shell-quoted rewrites for regex literals |
| 🆕 **`O-81`** | ⚠️ **FOUR MORE CLASS-7 SCOPE CLAIMS, and acting on one would have been an A11Y REGRESSION**: the share cards are NOT off-screen render targets (hiding them from the a11y tree would have hidden the only rendering of the quote) · `Sheet`'s "4 account modals" are four full-screen FORMS whose migration would CREATE §2.1 violations · tab icons are 25/18, not 24, and X18's band arithmetic was off by one · `comet` never landed at item 13 | 🟡 **All four recorded, none acted on beyond the two in-file corrections.** `C-P5-6`. **Where a design section argues an item is small, that sentence is a measurement requirement** |
| **O-82 is the next free number.** ⚠️ **Two pass-4 measurements remain recorded as caveats rather than `O-` items, because neither is a decision anyone has to make:** the **non-Latin coverage** answer (Literata and Figtree are Latin faces; a Devanagari/Tamil name in a heading renders through the platform's per-script fallback at **regular weight**, because the weight is now expressed as a family the fallback cannot honour — and `birth-data.tsx`'s own name validator already restricts to Latin + Latin-Ext, so the exposure is the ~10 display sites reachable via signup / UpdateName / compatibility) and — 🟢 **NOW DISCHARGED** — the **five ▲▼ sites plus one ●**, which landed as Ionicons in `C-P4-3` (2026-08-03): five carets and one disc, the excepted GLYPH count falling **56 → 51**, which IS the arrival check. |

**Carried forward unchanged from the pre-flight, because they are still live:**

- **P-A** — do A1 + A1b + A2 + A4 ship as a **2.0.1 hotfix ahead of the revamp**? (~50 lines, one
  file; recommended yes.) If they do, this plan's pass 1 rebases onto a paywall that already reads
  RevenueCat.
- **P-B** — **what do the four products actually cost?** `docs/REVENUECAT_SETUP.md:66-69` says
  `$14.99/$99.99`; the code says `$12.99/$89.99`. **Blocks P-A's code and needs a Play-signed build.**
  (`owner-actions.md` **P17** covers the doc half.)
- ⚠️ **Unverified comp-tier clobber risk** — `subscriptionStore.applyTierToAuthUser()` overwrites the
  server's comp-derived tier with the **RevenueCat-derived** one, and it is invoked from the **global
  `CustomerInfo` listener registered at app launch**. A comped user has no RevenueCat entitlement, so
  `mapCustomerInfoToTier` returns `'free'` — **locking every mechanism-A gate while the server
  continues to grant access.** Recorded as plausible-but-unverified (it depends on RevenueCat SDK
  runtime behaviour, not on code). Cheap to check with `scripts/grant-comp-tier.ts` on a Play-signed
  build, i.e. **at cut 1**. It is also a standalone argument for §B5.
- **Audit §9 Q3–Q13** remain open. The ones this plan is actually blocked on are **Q6** (→ O-16),
  **Q12** (confirm the 4 dead components before deleting) and **Q13** (three lock treatments →
  resolved by LockShell, but the owner should confirm).
- **`sid-signoff.md` S-R7f / S-R7g** still open — unrelated to the revamp, listed so they are not lost.

---

## Appendix A — verification performed by the session that wrote this plan

- `npx tsc --noEmit` in `mobile/` — **clean, 0 errors.**
- `npx tsc --noEmit` in `server/` — **clean, 0 errors.**
- **No product code, no dependency, no config and no codemod was touched.** The only file created in
  the repo is this one. `scripts/resolve-utilities.js` was authored and executed **in the session
  scratchpad**, never written into `mobile/`.
- **Every count in §0.2 was re-measured** against the live tree with `grep -rE` and reproduces the
  design's baselines exactly (404 hex / 117 rgba / 81 keywords / 339 + 565 legacy tokens / 328 + 173
  weights / 346 fontSize / 45 leading / 73 + 48 + 4 + 82 radii / 54 of 93 `lib/colors` importers).
- **The gate harness was built and run end-to-end** at `inlineRem: 16`: **225 emitted rules**, every
  spot-checked value matching `UI-revamp-design.md` §6.6 (`text-sm` 15 with no `lineHeight`,
  `text-base` 16/24, `text-lg` 18/28, `p-6` 24, `h-12` 48, `rounded-2xl` 16, `rounded-lg` 8,
  `leading-5` 20, `h-px` 1, `max-w-sm` 384). **`space-y-3` and `w-30` confirmed ABSENT from the
  runtime rule set** — D4 and the dead-class finding verified directly rather than inherited. Exit
  codes verified meaningful (0 on an unchanged tree, 1 on a single perturbed rule).
- **Invariant anchors re-located by symbol** and confirmed present: the 6 literal `!safetyMode` gates
  plus `isSafety` and the `mode` filter in `qa.tsx`; `GeneratingReading`'s `minWidth:220` /
  `minHeight:44` / `maxWidth:320`; `BirthChartWheel`'s `const size = 300` at **`:55`** with
  `viewBox` templated from `size` and `outerR/innerR/planetR` absolute; X20's two `height:56` +
  `text-base` buttons in `DeleteAccountModal.tsx`; the R1 sites at `home.tsx` ≈`:336`/`:363`,
  `astrology/index.tsx` ≈`:136`/`:561`.
- **iOS buildability established from `eas.json`, `app.json` and
  `docs/reference/architecture/infrastructure.md`** — two Release iOS profiles, a real
  `ascAppId 6762566575`, `buildNumber 5`, and a recorded App Store 4.3(b) rejection that presupposes
  a signed upload. **No `eas` command was run** (`eas credentials` is interactive and belongs to the
  owner).
- **Confirmed absent**, each a premise this plan depends on: `expo-font` and `@expo/vector-icons` from
  `mobile/package.json` dependencies · any `prepush` script, husky, git hook or `core.hooksPath` ·
  any `.github/` or CI · `rg` on PATH · `font-sans` usage (0, so replacing `fontFamily` is safe).

## Appendix B — suggested commit message

```
docs(build-27.1): codemod deep-plan — 6 gated passes, the X1–X20 contract, iOS answered

Adds plans/build-27.1/codemod-plan.md: the step-by-step working document the
implementing sessions run from. Authored against UI-revamp-design.md §6.2/§6.6/
§7.2/§8, UI-audit.md §2/§3.5/§5/§5.7/§6/§7 and preflight-findings.md §B–§E,
on the nine settled owner decisions (D1–D9).

Twelve sections: pass inventory (0, 1a/1b, 2a, 2b, 3a/3b, 4, 5) each with a
RUNNABLE gate and an IDENTITY-vs-VALUE classification; ordering rationale;
per-pass procedure (enumerate / apply / verify / roll back); verification
strategy and its limits; the X1–X20 invariant contract; the R1 violation work;
the do-not-touch list; C-1..C-5 copy dependencies; primitives sequencing;
the staged-rollout release plan; per-pass estimates; open/blocked.

Findings that changed the plan's shape:

- iOS IS producible. eas.json carries two Release iOS profiles and a real
  ascAppId 6762566575; app.json is on buildNumber 5; and a recorded App Store
  4.3(b) rejection presupposes a signed upload. The id000000000 placeholder is
  a rate-app deep link, not a build blocker. So the twelve invisible HARD
  invariants CAN be verified: the plan says "preserve untouched AND verify once
  on iOS", not "never test". Caveat: no RevenueCat iOS key exists, so an iOS
  build verifies LAYOUT, not commerce.
- §6.2's config REPLACES four theme keys, so it cannot land in pass 0 without
  silently killing 565+339+~160+55+45 utilities. Staged into S0..S3, each
  attached to the pass that earns it. TYPE_FREEZE is what makes D1's 2a/2b
  split possible at all, since size and lineHeight ship in one Tailwind object.
- Pass 1 is ~1,555 sites, not 599 — the gate also requires the 904-usage
  className ledger. It is the largest pass, not pass 4. Split 1a (identity,
  ~1,110) / 1b (value, ~445), because `accent` collapses three live colours and
  `primary` (x66), `pink` (x32) and the 16 scrim sites have NO Vellum target.
  Eight-row decision table; blocks 1b.
- The gate harness (compile -> cssToReactNativeRuntime at the real inlineRem)
  was built and verified: 225 rules, every value matching §6.6, meaningful exit
  codes. space-y-3 and w-30 confirmed absent from the runtime rule set.
- The authored gate cannot run here: rg is not on PATH, and no prepush hook,
  husky or CI exists. Ported to grep; all ten baselines reproduce exactly.
- The global allowFontScaling freeze (pass 4) without the ~180 txt()
  conversions would ship 2.1.0 with font scaling disabled app-wide. Registered
  as O-13 with a recommendation; must not ship undecided.

Docs-only. tsc --noEmit clean on both mobile and server. No product code, no
dependencies, no config, no codemod execution.
```

## Appendix C — `mobile/scripts/resolve-utilities.js`, verbatim

Pass 0 item 7. **Authored and executed in this session's scratchpad, never written into `mobile/`.**
It is reproduced here so the implementing session creates a known-working file rather than
re-deriving one. Verified against the live tree: 225 rules at `inlineRem: 16`, every spot-checked
value matching `UI-revamp-design.md` §6.6, exit 0 on an unchanged tree and exit 1 on a single
perturbed rule.

Two details that took iteration and will be re-broken if rewritten from scratch:

1. **Do not serialise with `JSON.stringify(obj, Object.keys(obj).sort(), 2)`.** The second argument
   is a **replacer allow-list applied at every depth**, so it silently strips `n`/`d`/`s` and every
   rule flattens to `{}`. Sort by rebuilding the object instead.
2. **A rule's `d` array holds "groups", and a group is EITHER a list of declarations OR itself a
   single tuple declaration `[valueDescriptor, "propName"]`** — told apart by whether its last
   element is a string. Numeric families use the plain `{prop: value}` form; **every colour family
   uses the tuple form**, which is why a naive `.flat()` loses all colour declarations.

```js
#!/usr/bin/env node
/**
 * resolve-utilities.js — the IDENTITY-PASS GATE HARNESS for the 2.1.0 codemod.
 *
 * Compiles mobile/tailwind.config.js with the repo's own tailwindcss CLI through
 * nativewind's preset over the repo's real `content` globs, then feeds the emitted CSS
 * through react-native-css-interop's cssToReactNativeRuntime at the inlineRem actually
 * set in metro.config.js — i.e. byte-for-byte the production resolution path, because
 * withCssInterop holds the options in a closure and hands them straight to this same
 * function (react-native-css-interop/dist/metro/index.js:69,76,168).
 *
 * Output: a stable, sorted JSON map  className -> { resolved RN style declarations }.
 *
 * Usage, from mobile/:
 *   node scripts/resolve-utilities.js > /tmp/before.json
 *   node scripts/resolve-utilities.js > /tmp/after.json
 *   node scripts/resolve-utilities.js --diff /tmp/before.json /tmp/after.json
 *   node scripts/resolve-utilities.js --map map.json --before /tmp/before.json --after /tmp/after.json
 *
 * Writes nothing into mobile/. The temp CSS goes to the OS temp dir and is removed.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MOBILE = process.cwd();

function readInlineRem() {
  const src = fs.readFileSync(path.join(MOBILE, 'metro.config.js'), 'utf8');
  const m = src.match(/inlineRem\s*:\s*(false|\d+(?:\.\d+)?)/);
  if (!m) return 14; // nativewind's own default — nativewind/dist/metro/index.js:14
  return m[1] === 'false' ? false : Number(m[1]);
}

function compileCss() {
  const out = path.join(os.tmpdir(), `revelia-gate-${process.pid}.css`);
  const win = process.platform === 'win32';
  const bin = path.join(MOBILE, 'node_modules', '.bin', win ? 'tailwindcss.cmd' : 'tailwindcss');
  execFileSync(bin, ['-i', './global.css', '-o', out], {
    cwd: MOBILE, stdio: ['ignore', 'ignore', 'ignore'], shell: win,
  });
  const css = fs.readFileSync(out, 'utf8');
  fs.unlinkSync(out);
  return css;
}

/**
 * A rule is  { n: [ { d: [ group, ... ] } ] }.  A `group` is EITHER a list of
 * declarations OR itself a single tuple declaration `[valueDescriptor, "propName"]`
 * — told apart by whether its last element is a string. A declaration is either a
 * plain `{prop: value}` object (all the numeric families) or that tuple form (every
 * colour family, whose value stays an unevaluated rgba/var descriptor).
 */
function flatten(rule) {
  const acc = {};
  const groups = (rule?.n ?? []).flatMap((n) => n.d ?? []);
  for (const group of groups) {
    const isTuple = Array.isArray(group) && typeof group[group.length - 1] === 'string';
    for (const decl of isTuple ? [group] : (Array.isArray(group) ? group : [group])) {
      if (Array.isArray(decl)) {
        const prop = decl[decl.length - 1];
        if (typeof prop === 'string') acc[prop] = decl[0];
      } else if (decl && typeof decl === 'object') {
        Object.assign(acc, decl);
      }
    }
  }
  return acc;
}

function resolveAll() {
  const inlineRem = readInlineRem();
  const { cssToReactNativeRuntime } = require(
    path.join(MOBILE, 'node_modules', 'react-native-css-interop', 'dist', 'css-to-rn')
  );
  const rt = cssToReactNativeRuntime(compileCss(), { inlineRem });
  const map = {};
  for (const [cls, rule] of Object.entries(rt.rules ?? {})) map[cls] = flatten(rule);
  process.stderr.write(`inlineRem=${inlineRem}  rules=${Object.keys(map).length}\n`);
  return map;
}

function stable(o) {
  const out = {};
  for (const k of Object.keys(o).sort()) out[k] = o[k];
  return JSON.stringify(out, null, 2);   // NOT (o, keys.sort(), 2) — see the note above
}

const args = process.argv.slice(2);
const argOf = (f) => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1]; };

if (args[0] === '--diff') {
  const a = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  const b = JSON.parse(fs.readFileSync(args[2], 'utf8'));
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  let n = 0;
  for (const k of keys) {
    const x = k in a ? JSON.stringify(a[k]) : '(absent)';
    const y = k in b ? JSON.stringify(b[k]) : '(absent)';
    if (x !== y) { n++; console.log(`${k}\n  BEFORE ${x}\n  AFTER  ${y}`); }
  }
  console.log(`\n${n} rule(s) moved, of ${keys.length} seen.`);
  process.exit(n === 0 ? 0 : 1);
}

if (args[0] === '--map') {
  const table = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  const a = JSON.parse(fs.readFileSync(argOf('--before'), 'utf8'));
  const b = JSON.parse(fs.readFileSync(argOf('--after'), 'utf8'));
  let bad = 0;
  for (const [oldCls, newCls] of Object.entries(table)) {
    const x = a[oldCls], y = b[newCls];
    const ok = x && y && Object.entries(x).every(([p, v]) => JSON.stringify(y[p]) === JSON.stringify(v));
    if (!ok) {
      bad++;
      console.log(`NOT VALUE-PRESERVING  ${oldCls} -> ${newCls}`);
      console.log(`  old ${JSON.stringify(x ?? null)}\n  new ${JSON.stringify(y ?? null)}`);
    }
  }
  console.log(`\n${bad} of ${Object.keys(table).length} mapping(s) are not value-preserving.`);
  process.exit(bad === 0 ? 0 : 1);
}

console.log(stable(resolveAll()));
```

**Reference output on the current tree** (`fix/build-27.1`, `inlineRem: 16`), for anyone checking a
fresh copy of the script behaves the same:

```
inlineRem=16  rules=225
text-xs       {"fontSize":13}
text-sm       {"fontSize":15}
text-base     {"fontSize":16,"lineHeight":24}
text-lg       {"fontSize":18,"lineHeight":28}
text-xl       {"fontSize":20,"lineHeight":28}
text-2xl      {"fontSize":24,"lineHeight":32}
text-3xl      {"fontSize":30,"lineHeight":36}
text-4xl      {"fontSize":36,"lineHeight":40}
text-5xl      {"fontSize":48}
text-6xl      {"fontSize":60}
rounded       {"borderRadius":4}
rounded-lg    {"borderRadius":8}
rounded-xl    {"borderRadius":12}
rounded-2xl   {"borderRadius":16}
rounded-3xl   {"borderRadius":24}
rounded-full  {"borderRadius":9999}
rounded-sm    (absent — 0 usages, so Tailwind never emits it)
rounded-md    (absent — same)
leading-4/5/6/7/8   16 / 20 / 24 / 28 / 32
p-6           {"padding":24}      h-12  {"height":48}      h-px  {"height":1}
gap-3         {"rowGap":12,"columnGap":12}
max-w-sm      {"maxWidth":384}    max-w-md  {"maxWidth":448}
text-gray-400 {"color":[{},"rgba",[156,163,175,[{},"var",["--tw-text-opacity",1],1]]]}
bg-card       {"backgroundColor":[{},"rgba",[26,20,37,[{},"var",["--tw-bg-opacity",1],1]]]}
space-y-3     (absent — sibling combinator, unrepresentable in NativeWind 4)
w-30 / h-30   (absent — Tailwind 3 has no `30` key)
```

### 12.x 🆕 `O-82`…`O-89` — THE FUNNEL-SCREENS PHASE'S FINDINGS (2026-08-04)

> **Assigned by the funnel-screens phase in the same edit that bumped the NEXT-FREE line above (R5).**
> Nine commits: seven screens in §3.4's funnel order, plus R-1's mount map and R-4's placeholder sweep.

| # | finding | what would close it |
|---|---|---|
| 🔴 **`O-82`** | **THE RAMP HAS A `className` HALF AND FIVE INSTRUMENTS ARE BLIND TO IT.** The config replaced `theme.fontSize`, but the DEFAULT scale's larger keys are still RESOLVABLE NAMES, so writing one emits a live rule (O-28's mechanism). Measured against the resolved set: the 4xl key emits size 36 + leading 40 with NO tracking and NO family; **the 6xl key emits size 60 with NO LEADING AT ALL.** 🔴 The severe half is the LEADING, and it is O-64's mirror — a size PRESENT with a leading ABSENT, where `no-leading-utilities` is structurally blind because there is no leading utility to find. `no-numeric-fontsize` 0 (it greps an INLINE declaration) · `--members` 0 (they DO resolve) · `--diff` clean (always there) · `family-arrival` 0 (a family IS named at most of them — that gate checks a step and a family AGREE and cannot object when the SIZE is off-system) · `tsc` clean. | 🟢 **THE 22nd NAMED RULE, `no-offramp-fontsize-class`, SHIPPED**, REPORT-ONLY by ruling, and added to the footer's report-only enumeration in the same edit (O-67: a number this script prints without asserting must be enumerable somewhere). Baseline 19, enumerated by class at the rule; **15 now.** Residue: 4 identical `(auth)` screen titles (mechanical, descope rung 4) · profile's monogram in a fixed disc (a DIMENSION question, needs a ruling) · 🔴 the compatibility percentage on the score ring AND the same value on the share card, **COUPLED** — §17.3 assigns that screen's one display hero to exactly that numeral and the ramp's ceiling is eighteen points below what it renders at today. Move them together or the app shows one number at two sizes. |
| ✅ **`O-83`** **CLOSED 2026-08-04 — §2 GAINED THE ROLE (row 12a, `border-control` `#7A7268`)** | **NO BORDER TOKEN CAN CARRY A CONTROL BOUNDARY, ANYWHERE IN THE APP.** WCAG 1.4.11 wants 3:1 for a user-interface component's boundary. Measured on the canvas: the subtle border role **1.16:1**, the strong border role **1.51:1**. Both exist to separate SURFACES, where being nearly invisible is the point, and **§2 names no control-boundary role at all.** 🔴 AND THE "A SELECTION BORDER IS AN ACCENT ROLE" RULING ONLY FIXED HALF THE CONTRACT — it governs the SELECTED state and says nothing about the RESTING one, so a fully correct application of it leaves a control the user cannot see: signup's unchecked consent box rendered as blank space beside "I agree to the Terms". Four instances fixed this phase (the consent box, the handedness pair, the shutter's ring, both plan cards). | 🔴 **A DESIGN CALL — `P61`.** All four took the meta role (5.36:1) as the nearest specified value that clears the threshold, and it must be a NEUTRAL because the accent carries "chosen". ~~§2 either gains a control-boundary role or ratifies the meta role for that use.~~ 🟢 **§2 GAINED THE ROLE — `border-control` `#7A7268`, a new named row 12a.** Derived against the WORST ground a control can reach rather than against `surface`: **4.07 / 3.87 / 3.65 / 3.37 / 3.20** across bg / surface / raised / overlay / locked, because a value tuned to exactly 3:1 on the card step measures **2.73 on the overlay step**, which is `Input`'s own fill. **The meta role was NOT ratified** — a foreground token doing a border's job is `O-39` in the ROLE axis, so the trade is a deliberate small loss (5.36 → 4.07) bought for a correct role, and a census now asserts the foreground family never returns to a border tree-wide. 16 control boundaries in 8 files; the line is *the boundary carries the control's identity or its state*, which is what keeps outline buttons on the strong role and stops §2 row 12 being emptied. `P61` closed. ⚠️ §10.2.3's own cell pairs the paywall's selected card with the STRONG border role; at 1.55:1 that cannot signal selection, so the owner ruling won in BOTH places rather than one. |
| 🔴 **`O-84`** | **THE `danger` ROLE FAILS AA ON ITS OWN WASH AND `success` DOES NOT.** Measured on each label's own 10% wash over the SURFACE step: success **6.02:1**, danger **4.41:1**. §2.1 publishes that role's failure at the OVERLAY step (4.28:1); it fails here too, on a ground §2 publishes no column for. 🔴 **So a "semantic wash + matching semantic label" pattern is SAFE FOR ONE OF THE TWO ROLES AND UNSAFE FOR THE OTHER — and §10.1.0's hero drawing specifies exactly that pattern for BOTH.** Third O-66 instance. | 🟢 **CLOSED IN CODE**: both labels take the plain foreground and the pair is distinguished by its wash and its own words. Colouring only the one that passes would read as a defect AND hide the finding. ⚠️ The generalisation stays open: any future semantic-wash surface must measure its label on that wash, never against §2's four surface-step columns. |
| 🔴 **`O-85`** | **O-73's LIMIT CASE — A CONTROL OVER A CAMERA FEED HAS A RUNTIME-DEPENDENT, UNBOUNDED GROUND.** O-73 says a gradient ground is a function of POSITION, so no static analysis resolves it. A camera feed is one step further out: no contrast figure can be computed against it at all — not by a gate, not by hand, not from one screenshot. | 🔴 **NOTHING, AND THE RULE IS STRUCTURAL RATHER THAN NUMERIC. It is now written at both sites: a control over a camera feed or a captured photo MUST CARRY ITS OWN OPAQUE GROUND.** Both capture screens' secondary preview action was transparent over the just-taken photo; both now carry the surface step, and what actually makes the shutter visible is its opaque inner disc rather than any token on its ring. |
| ✅ **`O-86`** **CLOSED 2026-08-04 — the MOUNT is dropped, and the fix was a RECLASSIFICATION rather than a tint** | **A §14 PLATE'S TINT ALLOW-LIST HAS NO TOKEN LEGIBLE ON AN ACCENT FILL, SO §14.3.2's NAMED SURFACE CANNOT TAKE ITS ASSIGNED PLATE.** The `tint` prop is a compiler-enforced list of three neutrals, chosen in §14.2 so a plate survives any of the four SURFACE steps. On the readings hub's accent-filled hero all three measure **1.42 / 1.36 / 1.15** — and the component also draws its accent NODES internally, so a node on an accent fill is **1.00:1**. There is no legal configuration of the component for that surface. | 🟢 **RESOLVED BY DROPPING THE MOUNT (`P65` closed), NOT by a designer choosing a tint.** WCAG 1.4.11 applies only to **meaningful** graphics and exempts purely decorative ones outright; §14.5 says a plate carries no information and §14.1.1 removes it from the accessibility tree. **So §14.2's floor here is a VISIBILITY standard, not a compliance one — the same reading owner ruling R4 gave `tide` at ~2.0:1 (`O-20`) — and that inverts the question from "which tint is legal" to "can anyone SEE it". At 1.15–1.42 nobody can, and a plate nobody can see still costs binary weight and a render.** 🔴 **NOT WIDENING THE ALLOW-LIST WAS RIGHT AND WAS NOT A RESOLUTION**: it left the surface named, unmounted and unexplained, which is how a drop becomes a rediscovery — and both readings it was registered against (the surface loses its accent ground / the system gains an on-fill tint) are DESIGN CHANGES neither of which answers the question that mattered. Registered mechanically in the `Plate` contract's `forbidden` list, the one entry there whose reason is visibility rather than product policy. `constellation` keeps its `EmptyState` mount. 🟢 The slot took the Ionicon Home's Explore row uses for the same destination, so the two Q&A entry points now agree. |
| ✅ **`O-87`** **CLOSED 2026-08-04 — by the same new row 12a** | **NO AVAILABLE MEANS IDENTIFIES A TEXT FIELD'S BOUNDARY AT 3:1.** Measured on the card ground: the field FILL step (overlay against raised) **1.08:1**, the subtle border role as a hairline **1.20:1**. So `Input`'s resting boundary at 15 sites, birth-data's two date/time pseudo-fields and both capture screens' uncertain-modal control are all below 1.4.11 — and a field is currently identified by a ~1.08 fill step. | 🔴 **ONE RULING APPLIED AT THE PRIMITIVE — `P62`. NOT patched site by site**, deliberately: fixing two of seventeen would leave the forms MORE inconsistent than they are now, which is the direction that makes a class harder to see later. `O-83`'s sibling, one control class over. 🟢 **CLOSED by row 12a at 3.37:1 on the field's own fill** — applied at the primitive AND at the four field-shaped controls that are FORBIDDEN from adopting it (verify-email's six-box code entry, name-destiny's three hand-rolled fields), because *"one ruling at the primitive" only reaches the sites that adopted it.* ✅ **THE TOGGLE IS RESOLVED (2026-08-04) AND THE GAP WAS NOT THE ONE EXPECTED** — design §2.3.2. Refusing to put the boundary role on it is CONFIRMED (its states are track FILLS, and a border role on a fill is the mirror of the `O-39` error this closes), and the state clears 1.4.11 **by colour alone: the two track fills are 5.92:1 apart**, because the off track is a 7% foreground WASH and the on track is the accent role — not two neighbouring surface steps. The thumb's POSITION is a second, non-colour cue and clears 3:1 against both the card (16.04) and the off track (13.66), which is also why the off track's own 1.17 is **not** a violation: the groove carries neither the component's identity nor its state. 🔴 **What measuring it DID find was the A5 ratio exactly — the thumb was the plain foreground on the ON track at 2.31:1**, so the position cue was degrading in the one state that matters most. Fixed to the on-fill role (6.86 on, 13.66 off). ⚠️ **Invisible to both accent-pair instruments** — the "foreground" is a `thumbColor` PROP, not a text node, so there is no label to pair with a fill. **Reading the file found it.** ⬜ **ONE gap stays open:** the three ACCOUNT MODALS' fields have **no border to recolour** (`bg` on a `surface` card = 1.08:1), which is a boundary to CREATE, at three sites already `ADOPTION-EXEMPT(Input)` with named debtors. |
| 🔴 **`O-88`** | **A CORRECT ROLE FIX CAN CREATE AN AA FAILURE UNLESS ITS NEIGHBOUR MOVES IN THE SAME EDIT.** Two instances: birth-data's Clear chip — closing O-26's border-as-fill moved a 5.36:1 label onto a ground where it measures **4.44:1**; and the paywall's price sub-lines — adding §10.2.3's specified wash would have taken the meta role to **4.12:1** exactly when the user selects that plan. **In both cases no instrument would have said so:** both tokens are legal names and neither pair is an accent pair. | 🔴 **NOTHING MECHANICAL, AND THE DISCIPLINE IS THE DELIVERABLE: when a GROUND changes, re-measure every foreground on it before committing.** This is O-66 read as a procedure rather than as a published figure. |
| 🔴 **`O-89`** | **AN EMPTY HANDLER IS INVISIBLE TO EVERY INSTRUMENT.** The paywall's Terms and Privacy links were no-op arrow functions — dead, on the screen whose own auto-renew disclosure paragraph sits directly below them, i.e. a store-review exposure rather than a styling gap. Valid TypeScript, matching no pattern in the tree. **Found by READING the file.** | 🟢 **CLOSED in code** — the destinations already existed (signup opens both), so the same two URLs were wired to the controls built to open them; nothing invented. ⚠️ The CLASS is permanent and has no instrument: a no-op handler is well-formed at every layer. The only defence is that a control which does nothing is worth looking for on any screen a pass opens. |
| 🔴 **`O-90`** | **A CONTRAST FIX TO ONE END OF A STATE PAIR IS A CHANGE TO THE PAIR — even when NO ground moves.** `O-88` is the ground-change case; this is its sibling and it needed no ground change at all. Raising `Input`'s RESTING edge to the 1.4.11 floor moved the **resting→focused separation from 5.01 to 1.79**, and resting→error from 3.55 to **1.27**, because only one of the two colours moved. Both edges remain individually legal against the fill (3.37 and 6.04) — they are simply no longer legible as a CHANGE, which is the thing 1.4.11 asks about a STATE. Measured across all 16 boundaries the new role landed on, the separation **ROSE at four and FELL at five**; at four of the five falls a fill, a stroke width, an icon or the field's own content also changes, so exactly **ONE site was unmitigated**. | 🟢 **A NON-COLOUR STATE CUE, AND IT IS THE REPO'S OWN PRECEDENT:** `Input`'s focus/error edge steps **1px → 2px**, which 1.4.11 credits and which compatibility's chips and birth-data's radios already do. **Both halves are asserted as ONE literal** in `primitive-adoption-check.js`, so dropping either re-opens the state defect while every ratio in the file still reads legal on its own. 🔴 **The general rule: after raising any resting value, re-measure the state it is a pair with.** No instrument can see this — both tokens are legal names and neither pair is an accent pair. |
| ✅ **`O-91`** **FIXED 2026-08-04 — and the FIRST answer to it was wrong, which is the more useful half of the entry** | 🔴 **AN APOSTROPHE IS SOURCE — a new member of the "a comment is source" family, in a NEW tool, by a NEW mechanism, and it SILENTLY DELETED COVERAGE.** `family-arrival-check.js`'s `objects()` skips comments correctly but has no idea what JSX is, so the `'` in ordinary English — in JSX **text** or in a **comment** — is treated as a string delimiter. One unmatched apostrophe opens a phantom string that swallows every brace until the next apostrophe, and every innermost-object resolution below it is then whatever the parity happens to be. **PROVEN by controlled experiment on a copy, not inferred:** removing the single apostrophe in `You've used your Deep Insight this month.` flips the two `fontFamily` sites below it from `span=6040, 3 steps → SKIPPED` to `span=88 / 169, 1 step → CHECKED`. Two real pairings were invisible to the only instrument that can see a wrong family on an inline step, and they became visible again only because an unrelated comment containing `screen's` re-balanced the parity. **And the check printed "113 checked" while never printing that it could not check 15 of 128.** | 🔴 **THE FIRST ANSWER WAS TO PUBLISH THE DOUBT AS TWO REPORT-ONLY COUNTERS, and to argue in the module that a fix "needs a PARSER, not a scanner." THAT WAS WRONG, and wrong in the direction that matters: it moved a real defect into a number nobody blocks on.** `O-67` says a printed count is not a checked count; publishing a coverage shortfall is the same half-measure one level up, because the gate still passes while coverage rots. 🟢 **IT NEEDED NO PARSER — ONE LINE: "a single- or double-quoted literal in this tree never spans a newline, and a prose apostrophe never closes on its own line."** Look ahead for the closing quote before the next newline; if it is not there, the quote is prose. Template literals keep the unbounded scan. **Unparsed 4 → 0, and FOUR real pairings became visible (113 → 117 checked) with no site changing verdict.** 🟢 **THE DOUBT IS NOW ASSERTED, NOT PUBLISHED:** `present == checked + excluded + unparsed`, printed on every run, with **unparsed at a hard 0** and the one legitimate exclusion (11 sites reading a step through a VARIABLE key — class 5) enumerated per site. Both report-only counters were **DELETED**, so token-gate.sh's register went seven → five. 🟢 **AND THE SAME SWEEP RAN ACROSS EVERY SCANNER THAT PRINTS A CHECKED COUNT:** the className half gained `1349 present = 1346 readable + 3 expression-form`, with the 4 it cannot resolve **asserted SERIF-FREE** rather than counted (an exact count of expression-form classNames would fail on ordinary React; the only direction that can render the wrong typeface is a serif step, and all four are body steps — provably benign, not assumed); `alpha-callsite-check.js` gained `99 present (code only) = 96 ok + 0 throwing + 3 non-literal`, which **blocks** on any shape `CALL_RE` cannot read and counts `present` with **comments blanked** so prose can neither inflate the total nor supply a call site to invoke. `p23-optin-check.js` prints discovery counts rather than a checked count and has no quote scanner — a considered exclusion, not an oversight. 🔴 **THE STANDING RULE THAT CAME OUT OF IT: report-only is for a finding a rule DECLINES to block on, never for a gate's own BLIND SPOT. A blind spot is a bug in the gate, and bugs get fixed.** 7 injection cases, 7 correct, including reverting the one-line fix (unparsed 0 → 4, blocking) and two must-escape cases. |
| 🔴 **`O-92`** | **NO INSTRUMENT IN THE REPO HAD EVER LOOKED AT A BINARY, so the brand rasters were the one asset class with no checker at all — and a geometric defect shipped in 2.0.0.** `app.json` pointed BOTH `icon` and `android.adaptiveIcon.foregroundImage` at ONE file, and those two specs are **mutually exclusive by construction** (OPAQUE + full-bleed vs TRANSPARENT + inside the centre 66%). So the shipped foreground was 100% opaque at 100% of its canvas and **every circular launcher mask cropped 65.8% of the artwork** — worst possible for a zodiac RING, whose outer ring is exactly what the corners lose. **It is a distinct class from `M-5` / class 8:** that one is about search ROOTS, this one is about the FILE TYPE — no widening of any glob reaches a PNG and `--diff` is equally blind. ⚠️ **And the checker that did exist still mis-measured it:** `safe-zone-66` reads the ALPHA bbox, which on a fully opaque file is the whole canvas *by definition*, so it measured the purple GROUND rather than the drawing. The INK bbox, by hue, is 1560×1497. | 🟢 **CLOSED BY GEOMETRY ALONE, WHICH IS THE POINT — the recolour it was bundled with (`P70`) is still open, and a colour-only fix would have left all three format defects shipping.** `check-brand-assets.js --emit` now generates both files from `logo.png`, deterministically, with zero new dependencies, and **the emitter and the verifier share one decoder and one rule set** so each output is checked against its own four rules by the code that wrote it. 🟢 **All nine assertions pass, so the script went green BY BEING SATISFIED — the precondition its own footer named — and is WIRED INTO `npm run gate` in the same commit** (the 23rd named rule, and the first that reads a binary). ⚠️ It also made `adaptiveIcon.backgroundColor` live for the first time: `C-P5-4`'s colour half had set it and recorded it as INERT behind an opaque layer. |
| 🔴 **`O-93`** | **A STATE INDICATOR MUST NEVER BE LESS PROMINENT THAN THE RESTING STATE IT REPLACES — and `O-90`'s own fix created one.** Raising sixteen resting edges to the 1.4.11 floor without touching the signalling colours they pair with is a change to **thirteen state pairs**. Measured as PROMINENCE (each state against its own ground): **twelve gained, ONE inverted.** The Q&A Deep-Insight toggle's ON edge was an accent **WASH** used as a stroke — **1.25:1 against a resting edge now at 3.65:1**, so switching the control ON made its outline **2.92× fainter**. 🔴 **AND THE SHARP PART: SEPARATION AND ORDERING ARE INDEPENDENT DIAGNOSTICS.** That site was in the group where separation **ROSE** (1.04 → 2.92); a check on the distance between two states reads the same number either way round, so it cannot see an inversion at all — the four sites whose separation *fell* were all fine, and the one a separation check would have called healthiest was the broken one. 🔴 **§2 ROW 12 IS THE OTHER HALF: it assigns the strong neutral to a focused `Input`, which on that component's own fill is 1.61 against a 3.37 resting edge — 2.09× LESS PROMINENT.** A correct reading of the shipped design document now produces a defect. | 🟢 **FIXED at the one site (the plain accent, 6.55:1 — the wash stays as the FILL and was only ever wrong as the STROKE), and ROW 12's "focused Input" is DELETED AT THE SOURCE** (design §2.3.1) rather than left as a registered divergence, because a discrepancy a later reader can "correct" back is a defect with a delay on it. `border-strong` keeps its three structural jobs and loses the one STATE job it was ever given. 🟢 **ASSERTED** by a census at **exact 0**: the signalling half of a border **state ternary** must be a full accent-family token, never a wash and never an `alpha()` reduction. ⚠️ **Honest limit:** full prominence needs each edge's GROUND, i.e. the A5 pair rule's style-graph machinery, which is a separate job. The syntactic form needs no ground because **a wash cannot clear 3:1 as a stroke on ANY ground in this palette.** 🟢 The **ternary** is what stops it over-finding — eight static decorative wash borders are legitimate and none is a state pair. 6 injection cases, 6 correct, including both must-escape directions. |
| 🔴 **`O-94`** | **THE DEFECT-INJECTION HARNESS — THE THING WHOSE ONLY JOB IS TO PROVE THE GATES WORK — WAS THE LEAST DISCIPLINED CODE IN THE REPO. FIVE defects in one session, against ZERO gate defects, and TWO OF THEM REPORTED SUCCESS FOR DOING NOTHING.** Every run had been an ad-hoc shell script rewritten per item. **(1)** Restore by `git checkout` reverted the item's own **uncommitted** work and invalidated its own cases 2–9; a second instance the same day, outside the harness, left an injected defect sitting in the tree after an ad-hoc `cp` lost its backup path to a `||` short-circuit. **(2)** 🔴 An expected pattern of `1[0-9]` against a baseline of **15** — the injection moved nothing and **two cases printed CAUGHT for doing nothing.** **(3)** A `perl` pattern spanning `\n` matched nothing in a **CRLF** tree. **(4)** An expected number that did not match the injection's **multiplicity** (a `perl -pi -e` with no line scope replaced both sites, so a census moved by 2 where the case expected 1). **(5)** A snapshot loop that tried to `cp` an untracked **directory**, printing a spurious "ALTERED". 🔴 **A validator that can report a false pass is worse than no validator, because its output is what justifies shipping.** | 🟢 **`mobile/scripts/lib/inject-harness.sh` — committed, shared, and SELF-TESTING (`--self-test` drives each guard into its own failure mode and requires it to report INVALID).** Three structural guards: **`ih_require_clean` REFUSES TO START on a dirty tree** (which makes defect 1 impossible rather than unlikely — it costs one commit *before* validating instead of a lost edit *after*), restore is a **BYTE COPY** so it never depends on git state, and `ih_report` re-asserts the tree is clean afterwards; **an expectation that ALREADY MATCHES THE BASELINE fails the case** (defect 2 — `O-67` inside the harness: a pattern that cannot distinguish the injected state from the baseline is not an assertion); and **an injection that changed nothing is INVALID, never a pass** (defect 3). Defect 4 needed no new guard — the *exact-number* discipline is what caught it, and it is kept in the record as the counter-example proving guard 2's value. Defect 5's mechanism is **deleted**: snapshotting only ever existed to mitigate defect 1. 🔴 **THE TRANSFERABLE RULE: the harness needs the same discipline as the gates it validates — a clean precondition, an exact expectation, and proof that what it did actually changed something.** |

⚠️ **Two further findings are recorded here as prose rather than numbered, because neither is a
decision anyone has to make.** (1) **THE ORPHANED-DEBT SHAPE:** an ADOPTION-EXEMPT note that defers
work to an item which then MEASURES ITS WAY OUT of doing it leaves the debt with no owner and the
comment as its only record — `ChangePasswordModal`'s sub-AA hint and `EmptyState`'s plate were both
stranded that way by item 15's and item 18's measurements, and both were paid off this phase. Same
failure shape as a stale registrar: a pointer that outlives the thing it points at. (2) Item 8's own
prediction that the §14 plate would flip the `locked` census was **measured FALSE** at the mount — the
§14 plate takes a `tint` prop defaulting to the meta role; the LOCK plate is a different component
with a different ground. The two were only ever the same word. That census is unchanged at exactly 1.

---

## 12.1 🆕 `O-95` … `O-99` — REGISTERED BY THE ALIGNMENT PASS (2026-08-04, session `build27.1-alignment-fixes`)

| # | the finding | the rule it leaves behind |
|---|---|---|
| 🔴 **`O-95`** | **A FONT'S DECLARED EXTENT SAYS NOTHING ABOUT LAYOUT ONCE A LINE HEIGHT IS SET, AND THE WHOLE `includeFontPadding` HYPOTHESIS COLLAPSED ON ONE FILE.** The session opened on a well-formed premise: Android defaults `includeFontPadding` to true, Literata declares a line box **26.7% taller** than the Roboto it replaced (1.4850 vs 1.1719 em, both re-measured from the shipped TTFs' own `hhea` tables), so every display heading should carry ~27% more reserved space. Measured in the installed RN 0.79.6 instead of reasoned: `CustomLineHeightSpan.kt` pins `fm.top = fm.ascent` on the first line and `fm.bottom = fm.descent` on the last, so **font padding contributes EXACTLY ZERO to any text carrying an explicit line height** — and all twelve ramp steps bake one, at both authoring paths. Setting `includeFontPadding: false` would have moved **zero pixels** app-wide. ⚠️ And the residue is nothing either: the two shipped faces declare a glyph bbox that sits INSIDE their `hhea` box (Figtree) or 0.016 em outside it (Literata), while **Roboto's overhangs by 0.155 em** — so lineHeight-free text got *shorter*, not taller. | 🔴 **THE ARITHMETIC OF A HYPOTHESIS IS NOT EVIDENCE FOR IT. A METRIC CLAIM ABOUT A PLATFORM IS SETTLED IN THE PLATFORM'S INSTALLED SOURCE.** Both halves here were individually true — the default IS on, the face IS 26.7% taller — and the conclusion was still wrong, because a third fact neither of them mentions cancels both. ⚠️ **The corollary is a gate that was NOT written:** the brief pre-authorised an arrival gate "if H-1 lands". It did not land, so there is nothing to assert, and asserting a property that moves nothing would have been a permanent invariant with no defect behind it. |
| 🔴 **`O-96`** | **THE SAME BOX GROWTH THAT LOOKS LIKE A CENTRING BUG IS SYMMETRIC ABOUT THE BASELINE, SO IT MOVES NOTHING OPTICALLY.** The second hypothesis was that pass 2b's leading increase (+4.4px on 218 sites, +3.8px on 91) shifts any text centred against a non-text sibling by "roughly HALF that", ~2.2px, across a class of **136 centred rows in 54 files**. Derived from the span above: leading is split `ceil`/`floor` about the baseline, so a centred box's ink offset is `(ascent − descent) × size / 2` — **a function of the FACE and the SIZE, and not of the line height at all.** Measured per step, the real shift is **0.47–1.26px**, and it goes UP on the serif steps while going DOWN on every body step. | ⚠️ **BEFORE ENUMERATING A CLASS, DERIVE WHETHER ITS MECHANISM CAN PRODUCE THE SYMPTOM.** Enumerating 136 sites and nudging each would have "fixed" a 0.6px shift with per-site constants that the next ramp change invalidates — which is the failure the brief's own "fix by class" rule exists to prevent, arriving from the other direction. |
| 🔴 **`O-97`** | **A PRESERVE-BLINDLY INVARIANT WAS ALREADY BROKEN IN THE TREE, BY AN UNRELATED COMMIT, WITH NOTHING POINTED AT IT.** `main` carries the clipping override on all SEVEN of the readings hub's icon wells; `611674b` dropped ONE while converting that card's pictograph to a glyph. It was found only by counting the declaration across `main` / `HEAD` / the working tree — not something anyone does routinely. `UI-audit` §5.1's X17 row predicts this exact deletion and rates it "very likely", **and the paragraph did not stop it.** | 🔴 **AN INVARIANT WITH A NAMED RISK AND NO NUMBER IS A PREDICTION, NOT A CONTROL.** Every X1–X20 row whose subject is COUNTABLE should be a census. Two were added (`7` and `2`, one per file) — 🔴 **and SPLIT deliberately: tree-wide the declaration counts 11, and one total lets a FALL in one file be cancelled by a RISE in another.** That is `siteCounts`' per-pattern argument applied to the axis a token census spans, and it is why the census gained a `files` scope. |
| 🔴 **`O-98`** | **`ih_escape` AND THE HARNESS'S OWN GUARD 2 ARE IN DIRECT CONFLICT, AND `O-94` CREATED IT.** An escape case asserts that a LEGAL edit is *not* flagged — i.e. that the output still reads the same. Guard 2 rejects any expectation that already matches the baseline. So the natural escape case is categorically INVALID, and it reported exactly that on first use. | ⚠️ **AN ESCAPE CASE MUST TARGET A NUMBER THE LEGAL EDIT LEGITIMATELY MOVES** — not the number that must stay put. Re-authored as "an adopter renders the control twice": adoption holds at 5/5/0 while call sites go 5 → 6, which is falsifiable and passed. **The precondition is unstated in the harness and should be.** 🟢 Not a defect in either guard; a missing sentence between them. |
| 🔴 **`O-99`** | **A COMPONENT'S OWN HEADER ASSERTED A TREE-WIDE PROPERTY THAT WAS NEVER MEASURED — AND FOUR MORE CENSUSES WENT THE SAME WAY IN ONE SESSION.** `LoadingSpinner`'s header says "THIS IS NOW THE ONLY SCREEN-DENSITY LOADING SURFACE IN THE APP, and making that true was the item." It was checked against the other COMPONENT and never against the **hand-rolled form**; three screens still had it, all unlabelled, all announcing nothing to a screen reader. The same shape produced the session's other four findings: the paywall's placeholder-foreground class had **0** members, the plate tint was **not** load-bearing (every stroke already carries a literal, so `P38` check 2 gates nothing), the credit display was **never lost**, and the hub's "seven-hue palette" was **three tokens**. | 🔴 **A CENSUS THAT KEYS ON A NAME CANNOT SEE THE SHAPE.** Blindness class 3, and the tell is a claim of the form *"X is now the only Y"* written in the commit that made X. **The reported symptom and the reported cause are separate claims and the second one is a hypothesis** — five of this session's ten items had a stated cause that measurement refuted, and in four of those the real defect was worse than the reported one. |

---

## 12.2 🆕 `O-100` … `O-104` — REGISTERED BY THE INVARIANT-COVERAGE PASS (2026-08-04, session `build27.1-invariant-coverage`)

> 🔴 **`O-99` IS PROMOTED FROM A FINDING TO A STANDING RULE BY THIS SESSION, and it is stated once
> here in the form later sessions should inherit:**
>
> ### 🔴 A SYMPTOM REPORT NAMES WHAT WAS **SEEN**. THE CAUSE IS A **HYPOTHESIS** — INCLUDING THE OWNER'S. MEASURE BEFORE FIXING.
>
> The evidence is a whole session: **five of ten items had a stated cause that measurement refuted,
> and in four of those five the DIAGNOSIS found the real defect that the requested fix would have
> papered over.** A reported cause is the most useful hypothesis available and it is still a
> hypothesis; treating it as a specification converts a real symptom into a wrong fix, and the wrong
> fix then *hides* the symptom's actual source. **This session added a sixth instance in a new place:
> P71's requested fix was correct, and the OBVIOUS way to implement it was wrong** (`O-103`).
>
> ⚠️ The operational form: state the symptom, derive whether the stated mechanism can produce it,
> measure, and report **both** the refutation and what the measurement found instead. Do the work
> either way — a refuted cause is not a reason to skip the item.

| # | the finding | the rule it leaves behind |
|---|---|---|
| 🔴 **`O-100`** | **THIRTEEN OF THE TWENTY PRESERVE-BLINDLY INVARIANTS HAD NO CHECK OF ANY KIND, AND "DOCUMENTED" AND "ASSERTED" READ IDENTICALLY FROM EVERY VANTAGE POINT THE PROJECT HAS.** `O-97` established that X17 was broken on HEAD despite being documented, predicted, and rated "very likely". Walking all twenty rows and asking one question of each — *which assertion FAILS if this is violated?* — returned: **4 asserted** (X3, X17, X18, X20), **2 half-asserted** (X2's "must not adopt" half without its structure; X8's presence without its STRING), **1 SOFT by design** (X10), and **13 with nothing at all** — including X1 (the pinned structure 25 of 32 screens inherit), X19 (the only exit from the paywall modal) and X11 (which §2.3 calls the most likely violation in the phase). ⚠️ And two of the thirteen LOOKED covered: `no-numeric-radius` PRINTS `excepted: DERIVED 3`, but `S()` in `token-gate.sh` is report-only and never touches `fail` — `O-67` again, one field over. | 🔴 **A REGISTER NEEDS A ROLL CALL, AND "MERELY WRITTEN DOWN" MUST NOT BE A LEGAL STATE.** The 22nd named rule asserts, before it reads a single file, that the register is **DENSE** (X1..X20, once each) and that **every row is CLAIMED by an assertion or carries a stated reason it cannot be**. A row with neither FAILS. That is the structural fix, and it is the assertion that could not have existed before X17 broke — the hole was not a wrong number, it was NO number, and no instrument could tell the difference. |
| 🔴 **`O-101`** | **A COMPLEMENT-PROJECTION IDENTITY ASSERTS THAT A PARTITION IS *TOTAL*, NOT THAT IT IS *CORRECT* — AND THE FIRST DRAFT OF THIS SESSION'S OWN GATE CLAIMED OTHERWISE.** `commentsOnly()` was added as the exact complement of `stripComments()` so that `count(P, code) + count(P, comments) == count(P, raw)` could be asserted per pattern, and its header called that an `O-91` detector. **A defect injection refuted it in one case:** re-introducing `O-91`'s original bug — the unbounded quote skip, where one prose apostrophe swallows a region — left the identity **GREEN**, because both functions walk with the SAME logic and therefore stay complements of each other *even when that logic is wrong*. The swallowed span is kept by one projection and blanked by the other exactly as a correct span would be. | 🔴 **AN INVARIANT THAT HOLDS BY CONSTRUCTION CANNOT BE EVIDENCE ABOUT THE CONSTRUCTION.** Ask what the assertion would print if the thing it guards were broken — if the answer is "the same", it is not an assertion. 🟢 The fix is a **known-answer fixture**: `walkerSelfTest()` in `scripts/lib/source-scan.js`, four sub-assertions over a four-line source containing a prose apostrophe, a comment after it, and a real string holding a comment marker. It runs before the gate opens a register file and it BLOCKS. **Both assertions are kept and neither is enough alone** — the identity catches a straddling pattern and offset drift, the fixture catches a mis-placed boundary. |
| 🔴 **`O-102`** | **A ROW ASSERTED IN ANOTHER SCRIPT CAN HAVE ITS ASSERTION DELETED IN THAT SCRIPT WHILE THE REGISTER GOES ON CLAIMING THE ROW IS COVERED.** Five of the twenty rows are legitimately asserted in `primitive-adoption-check.js`, because they live inside a primitive's own module and that is where its contract belongs. A roll call that merely *points* at them is a coverage claim with no way to fail. | ⚠️ **A CROSS-REFERENCE MUST CARRY A PROBE, NOT A POINTER.** Each such row names the foreign script and an exact substring — the literal regex source, not the X label — and asserts the count. 15 probes; deleting the Button md-height literal from that contract now fails the register. ⚠️ **Read CODE ONLY there too**: the foreign script's prose discusses these literals at length, so a raw-text probe is satisfied by its commentary. ⚠️ **And a probe whose substring is ambiguous is not a proof** — X18's safe-area value occurs twice in that script, so it is asserted at its own site here instead. |
| 🔴 **`O-103`** | **THE OBVIOUS IMPLEMENTATION OF A CORRECT FIX WAS PLATFORM-DEPENDENT, AND IT COULD RENDER BRIGHTER THAN THE STOP IT REPLACED.** P71's ruling was right: the 60-second wait screen's ground had to fall from a full-strength accent to §2's 14% aura stop, a **21.3× luminance drop**. The obvious edit is to fade the aura stop to the ground. **Measured, that renders two different ways.** A translucent warm stop interpolating toward an OPAQUE near-black ramps down monotonically under premultiplied interpolation, but under straight-alpha interpolation it **BULGES near the midpoint past stop 1's own value** — RGB stays warm while alpha climbs — taking the muted role to **3.30:1** on the way. | 🟢 **A TRANSLUCENT GRADIENT STOP MUST FADE TO ITS OWN HUE AT ZERO ALPHA, NEVER TO AN OPAQUE GROUND.** Then only alpha moves, RGB is constant, and both models agree to the byte (verified across the ramp: 13.85 → 16.84 for the plain foreground, IDENTICAL under both). 🔴 **AND THE SAFE FORM TURNED OUT TO BE THE SPECIFIED FORM** — §2's aura row reads *"`accent-muted` → transparent"*, so the design already said it and the shortcut was the deviation. ⚠️ Paired requirement: a translucent stop needs a NAMED ground beneath it, or it composites over whatever the navigator paints. That is the half a reviewer deletes as redundant. |
| 🔴 **`O-104`** | **THE ONE INSTRUMENT BUILT TO FIND ACCENT GROUNDS COULD NOT SEE THE LARGEST ACCENT GROUND IN THE APP, AND NOT BECAUSE OF A WINDOW WIDTH.** The `A5 pair` resolver walks style rules whose body sets a **fill** to an accent-family token, then the consuming element's subtree. A full-bleed gradient slab names its accent inside a stop **ARRAY on a prop**, and the element carries **no fill declaration at all** — so the wait screen's full-strength ground, held for 60+ seconds on five flows, was invisible to it, and the proximity rule's ±4-line window never reached it either. ⚠️ Second finding of this exact shape: the readings hub's six sub-AA CTA pills were missed for the same reason one session earlier. 🔴 **And a THIRD now stands open as `P77`:** the primary `Button`'s own fill is a three-stop ramp whose last two stops are TRANSLUCENT, and its label goes sub-AA over the final 25.3% of the diagonal — on 60 call sites — while the pair rule passes, because the token PAIR is legal. | ⚠️ **A FILL IS NOT ALWAYS A FILL DECLARATION, AND A LEGAL TOKEN PAIR IS NOT A MEASURED CONTRAST.** A rule keyed on a fill property is blind to every gradient in the tree, and the design keeps one gradient idiom by name. 🔴 **Do NOT widen the pair resolver onto stop arrays speculatively** — over-finding is what decommissioned `no-white-on-accent`, and a gradient's stops have no single ground to resolve against. The discharge that works is the shape used here: assert the **specific stop list**, per file, as an exact count, in the commit that sets it, plus a text-level `absent` on the spelling that must never return. |

---

## 12.3 🆕 `O-105` … `O-106` — REGISTERED BY THE MOTION PHASE'S ITEM 0 (2026-08-04, session `build27.1-motion`)

> **Both came out of one instruction: fix `P77`, then GENERALISE AND GATE IT.** The generalisation is
> `O-106`; the sweep the owner asked for in the same breath is `O-105`. Full method text lives at
> **§3.0.2.1.1** and **§3.0.2.1.2** — these rows are the register entries.

| # | the finding | the rule it leaves behind |
|---|---|---|
| 🔴 **`O-105`** | **THE QUESTION IS NEVER "IS THERE A CHECK?" — IT IS "DOES IT FAIL?", AND THE THIRD INSTANCE PROVED THE REGISTER OF EXCEPTIONS WAS ITSELF INCOMPLETE.** `token-gate.sh`'s foot enumerated the FIVE rules that are report-only by ruling and said nothing about **~23 report-only NUMBERS** printing in the identical `· label count` shape beside the blocking ones. Two of those numbers stood in for **PRESERVE-BLINDLY** rows: `S "excepted: DERIVED" 3` was believed to be X11's and X12's coupled-radius check and never touched `fail`. 🔴 **And one was actively load-bearing in the wrong direction** — `GX()` computes `live = all − wheel` and printed `wheel` without asserting it, so growth in the residue would have **silently LOWERED a number the gate blocks on**, while the comment beside it claimed *"if `excepted` RISES, the output says so."* It did say so, to nobody. | 🟢 **`SA()` — A SUB-COUNT THAT ASSERTS**, plus six conversions: `SHAPE` exact 4 · `DERIVED` exact 3 · `ABOVE-CEILING` exact 6 · `GLYPH` max 35 · both wheel residues CAPPED. ⚠️ **The shape is chosen per number, per `O-67`**: `exact` for an enumerated invariant, `max` for a residue that may only shrink, `S()` only for a genuine watchlist. 🔴 **AND EVERY REMAINING `S()` IS NOW ENUMERATED WITH A NAMED REASON AT THE FOOT OF THAT FILE** — both lists, so "which of these can fail?" is answerable without reading code. ⚠️ Found while writing it: the `ABOVE-CEILING` block's own prose says SEVEN and the tree holds SIX (one retired at `P66`) — **a stale enumeration is what an exact assertion is for.** |
| 🔴 **`O-106`** | **`O-73` CLOSED A CLASS AS UNRESOLVABLE AND THE WORD *ANY* WAS TOO STRONG — WHICH LEFT THE ONE GRADIENT THE DESIGN KEEPS BY NAME OUTSIDE EVERY INSTRUMENT FOR THE WHOLE PROGRAMME.** X3's primary `Button`, 60 call sites, ran stops 100/85/70 of one hue; the last two are TRANSLUCENT, so the fill darkens toward whatever it sits on, and the third stop composited to luminance 0.173 = **3.85:1** against its own on-fill label. The ramp crossed 4.5:1 at **74.7%** of the diagonal. **A class declared unresolvable is a class nobody instruments.** | 🟢 **A GRADIENT FILL'S RANGE MUST BE CONSTRAINED SO ITS ENTIRE SPAN CLEARS AA AGAINST THE FOREGROUND ON IT** — then position-dependence stops mattering, because every point is legal by construction, and *that* is mechanically checkable. Owner ruling: **clamp the range** (100/90/80, worst point 4.72:1), never recolour the label and never flatten the fill. Gated by `A6 gradient · span × label`, BLOCKING. 🔴 **Four properties are load-bearing and each came from a false result during the item**: sample the SPAN not the stops (luminance is convex, so a two-hue segment can dip darker than either end) · evaluate BOTH alpha models and take the worse (`O-103`) · the verdict is the **BEST ground's** worst point (sweeping all five invented grounds that do not exist and produced **11 false positives on correct code**) · **COMPOSE every fill on the path** — a 20% light veil over an accent tile took a label to **1.93:1**, *worse* than the gradient alone predicted, so a veil can cut either way and only composing decides. |

### 12.3.1 🔴 WHAT THE `A6` RULE FOUND ON ITS FIRST RUN — the arrival-gate base rate holds at 100%

**Fourteen live pairs across nine files, and `P77` was only the first of them.** Every number is the
worst point of the span over the lightest usable ground, i.e. the strongest claim the rule can make.

| # | site | pair | before | after | class |
|---|---|---|---|---|---|
| 1 | `ui/Button.tsx` | on-fill label on a 100/85/70 one-hue ramp | **3.85** | 4.72 | `P77` — the RANGE |
| 2 | `common/BiometricConsent.tsx` consent CTA | on-fill label on a 60→100 ramp | **3.57** | 5.03 | 🔴 **`P77`'s SECOND INSTANCE, same defect, same fix** |
| 3 | `app/(main)/numerology` Name-Destiny CTA | plain foreground on a 20% veil over an accent tile | **1.93** | 8.19 | the worst reachable pairing found; an A5 violation nothing could see |
| 4–5 | `common/BiometricConsent.tsx` sheet | muted role ×2 on `[canvas, accent 10%]` | **3.35** | 4.72 | `O-103` shape — straight-alpha bulge |
| 6–7 | `common/ErrorBoundary.tsx` | muted + danger on the same shape | **3.35 / 3.23** | 4.72 / 4.54 | ditto — and this is the LAST-RESORT surface |
| 8–10 | `profile/ProfileHeader.tsx` | muted role ×3 | **3.28** | 4.78 | bulge **plus** a real tint problem: the muted role starts at 4.76 on that step, so any tint sinks it |
| 11–12 | `profile/SunSignReveal.tsx` | accent + iris roles | **3.96 / 3.46** | 4.52 / 5.32 | bulge |
| 13 | `profile/SunSignReveal.tsx` trait chips | iris role under THREE stacked layers | **3.85** | 4.54 | 🔴 **only a composed path sees this** |
| 14 | `readings/ArchetypeHeader.tsx` | accent + muted on a 30% wash fading to the `transparent` KEYWORD | **4.34 / 3.19** | 6.41 / 4.72 | `transparent` is transparent BLACK, so straight-alpha drags toward black |
| — | `readings/GeneratingReading.tsx` error branch | muted role on the specified 14% aura stop | **4.41** | 8.54 | 🔴 **the ROLE moved, not the aura** — the aura value is SPECIFIED (§2 row 14) and §0.0 rule 2 forbids inventing another |

🔴 **AND A RULE OF THUMB CAME OUT OF IT, APPLIED FOUR TIMES AND WORTH STATING ONCE:** when a pair
fails on a decorative wash, **move the WASH, not the LABEL.** A tint strength carries no design
ruling; a foreground role does. The exception is where the wash value is itself specified — then the
role moves instead. **Both directions are recorded at each site, with the number.**

⚠️ **Three declarations exist and each is a stated decision rather than a silence** (`GRADIENT-FG`):
`Button` declares its role because its child is a **variable**, so the subtree holds no text element
and the rule measured **zero pairs on the one site it was written for** — it read green.
`ScreenContainer` declares the **weakest reading role** because its children arrive from 25 other
files. `GrowthCard` declares `none` because its gradient is a 2dp **ring**, not a fill. 🔴 **A
gradient that resolves no label now FAILS unless it says why** — the `O-100` move, one field over.

---

## 12.4 🆕 `O-107` … `O-110` — REGISTERED BY THE MOTION PHASE'S ITEMS 2–3 (2026-08-04, owner ruling R-5)

> **All four came out of building two animations, and three of the four are about the INSTRUMENTS
> rather than the code.** That ratio is itself the finding: by this point in the programme the gates
> are mature enough that most defects are in the things checking, not the things checked.

| # | the finding | the rule it leaves behind |
|---|---|---|
| 🔴 **`O-107`** | **A TOKEN REACHED THROUGH A LIVE HOOK IS NOT A DEAD TOKEN — AND THE ITEM THAT WAS SUPPOSED TO DISCHARGE THREE PENDING DEBTORS PROVED THEY WERE UNDISCHARGEABLE BY CONSTRUCTION.** `motion-arrival-check.js`'s token census was scoped OUTSIDE `lib/motion.ts`, because a tree-wide count is satisfied by the module's own definitions. Four rows then read 0 and were marked ⬜ PENDING with a debtor apiece — three of them "arrives with the Button press item". **That item landed, `usePress` gained two call sites, and the three rows still read 0**, because the tokens are consumed BY THE HOOK. Under R-3 a pending entry that survives its own pass is a FINDING; here it could never have been discharged at all. | 🟢 **THE CARVE-OUT TO THE ZERO-CALL-SITE RULE: reachability, not locality.** The census returns to TREE-WIDE and is paired with a second assertion — *every exported helper has a call site outside the module* — and the two together partition the space with no residue: referenced nowhere → the census fails · referenced only inside a helper nobody calls → the helper rule fails · referenced inside a helper that IS called → **reachable, and correctly credited.** 🔴 So the PENDING mechanism is DELETED rather than kept, and `token-gate.sh`'s standing rule is confirmed to apply to a gate's own scaffolding: **before adding a pending counter, ask whether the thing it measures is actually assertable.** Here it was — by a second rule rather than a marker. |
| 🔴 **`O-108`** | **NO HARNESS CASE MAY SCOPE ITS INJECTION BY LINE NUMBER, AND THIS IS THE *THIRD DOMAIN* FOR ONE RULE.** Four injection cases used `if $. == <line>` to handle multiplicity (`inject-harness.sh` defect 4: an unscoped `perl -pi` replaces EVERY match, so a census moves by 2 where the case expected 1). Then the button-press item added comment blocks to `Button.tsx`, every line below them moved, and **case 14 silently stopped injecting anything** — caught only by guard 3, which is the sole reason it was not recorded as a pass. | 🔴 **A LINE SCOPE IS A LINE-NUMBERED ALLOW-LIST, AND IT ROTS.** §0.1 ruled on design references that drift ~80 lines; `no-numeric-fontsize`'s GLYPH exception ruled on gate allow-lists and moved to an in-file MARKER for the same reason; this is the same rule arriving in a third place. **Every scope is a CONTEXT now** — a string unique enough to identify the one site, or an insertion anchored to a unique line. It costs nothing and it cannot drift. ⚠️ And note which guard caught it: not the expectation, which would have matched a healthy baseline, but the *"the injection changed NOTHING"* check. **A validator needs a guard that its own action took effect.** |
| 🔴 **`O-109`** | **A VALIDATION CASE CAN OUTLIVE ITS SUBJECT AND REPORT A FAILURE AGAINST A CORRECT GATE.** Case 26 asserted that a PENDING census row which arrives must be converted (R-3's obligation). `O-107` deleted that mechanism, so on the next run the case reported **MISSED against a gate behaving exactly as designed.** | ⚠️ **A CASE IS A CLAIM ABOUT A MECHANISM, so a deleted mechanism leaves a STALE CLAIM, not a regression** — and the failure mode is `C-f`'s: a check that cries wolf gets ignored, and an ignored check is a disabled one. 🟢 **The right handling is to DELETE the case and leave the reasoning in place of its body**, so the next reader learns why the mechanism went rather than finding a numbered gap. It is R-3's shape one level down: an entry outliving its subject. |
| 🔴 **`O-110`** | **INSERTING A NODE INTO A FLEX CHAIN IS NEVER NEUTRAL, AND THE MEASUREMENT IS ONE GREP.** The obvious implementation of the screen-content entrance is to wrap the content block in an `Animated.View`. **Six live screens pass `contentContainerStyle={{ justifyContent: 'center' }}`** — `forgot-password`, `login`, `reset-password`, `signup`, `verify-code`, `verify-email` — so a node between the scroll content container and the real children makes that alignment centre the WRAPPER, which already fills the box, and the children go back to top-aligned. **That is the entire login funnel**, and on Android it reads as a redesign nobody asked for rather than as a bug. | 🔴 **RECORD IT BESIDE X1, BECAUSE IT IS X1's CONTENT ARRIVING IN A NEW PLACE.** X1's guards are a FLEX PROPAGATION CHAIN — pinned box → safe area → scroll view — that iOS **production** does not perform for free (Build 13), so a new link in it is precisely the class §5.4 closed the verification programme for: a no-op on Android and unverifiable here. 🟢 **The discharge is to ride an element that already exists**: append the animated style to that element's style ARRAY. Zero new nodes, the invariant's literals byte-identical and in place, and only `opacity`/`transform` animate so nothing reflows. Both motion entrances in this phase are built that way, and both are contracted in three legs because "declared" and "rendered" are different states. |

---

## 12.5 🆕 `O-111` — REGISTERED BY THE MOTION PHASE'S ITEMS 4–8 (2026-08-05)

| # | the finding | the rule it leaves behind |
|---|---|---|
| 🔴 **`O-111`** | **AN ANIMATED ALIAS IS AN ELEMENT RENAME, AND A RULE THAT ENUMERATES ELEMENT NAMES GOES BLIND TO IT — AND THIS PHASE DID IT TO ITS OWN GATE.** `Animated.createAnimatedComponent(X)` binds a NEW local name. Motion item 6 made the wait screen's aura `<AnimatedAura>` so its opacity could breathe, and `elements(code, 'LinearGradient')` cannot see that name: the largest accent ground on that screen left the `A6` population without a word — **`gradients read` fell 25 → 24 while everything still printed `0 violating`**, because the A6 floor only fires at ZERO. ⚠️ Diagnosing it found a second loss underneath: as a PINNED SIBLING the aura is self-closing, so the walk `continue`d on an empty subtree and skipped it before its declaration could be read. Previously it was the PARENT of the whole screen and its subtree held every text node there; **those were measured pairs, and they went 74 → 72 with nothing saying so.** | 🔴 **BLINDNESS CLASS 4 — ENUMERATION COMPLETENESS — AND THE POPULATION WAS CHANGED BY THE SAME PHASE THAT OWNED THE RULE**, four items later, while following the no-new-node discipline that phase had itself established. Neither decision was wrong; the **join** between them was missing. 🟢 Two structural fixes: `animatedAliases()` resolves the declaration form per file and maps each alias back to its target (applied to the gradient enumeration, the fill-path walk, the nested-gradient re-grounding AND the text-node walk — items 2, 3, 4 and 8 each introduced one of these names), and a self-closing gradient now FALLS THROUGH to the declaration path instead of being skipped. 🔴 **Plus `O-91` on the POPULATION itself** — `population · walked N of M present in source`. Every other rule asks whether a gradient PASSES; this asks whether the rule SAW it. ⚠️ **AND ITS FIRST DRAFT WAS `O-101` VERBATIM**: both sides derived from the same name list, so breaking the list hid the gradient from the walk AND from the count at once and the assertion stayed equal. A defect injection proved it. Presence is now counted from the LITERAL imported name, which the package import fixes — independent of whatever list the walk holds. |

### 12.5.1 ⚠️ AND THE HARNESS REMAINS WHERE THE DEFECTS ARE — EIGHT RUNS, ZERO GATE DEFECTS

**Across eight injection runs in this phase, every single incorrect result was a HARNESS or CASE
defect. Not one was a gate defect.** `inject-harness.sh` now carries six numbered defects, and
`inject-a6.sh`'s header carries the three ROT shapes that appeared once the phase started editing the
same files its cases pointed at:

| shape | what happened | the rule |
|---|---|---|
| **the anchor is refactored away** | item 8 routed a hand-rolled animation through a hook and three cases' targets stopped existing | 🟢 **guard 3 catches it LOUDLY.** A context scope rots too — it just rots audibly, where a line scope rots silently (`O-108`) |
| **a count in an expectation is a coupling** | three escapes asserted `74 pairs measured` and the population legitimately moved | ⚠️ **prefer a pattern that names the FINDING, not a total** |
| 🔴 **the gate prints a regex SOURCE** | five cases expected `useAmbient\(0.5, 1\)` while the line reads `/useAmbient\(0\.5, 1\)/ is GONE.` — the escapes are literal output text | **match the NAME and `is GONE`, never the escaped argument list** |

🔴 **AND TWO CASES EARNED THEIR KEEP BY HAVING NOTHING TO HIT.** Case 42 replaced the navigator's curve
constructor and NOTHING failed — the easing-boundary rule counts `Easing.` generically, so the RN family
could have been swapped for `linear` or dropped with every gate green and the tab transition still
running at an unspecified curve. Case 52 set the success scale to **1.08** — a bounce, which §5.3 bans
outright — and passed. **Both gaps are now assertions**, in a new spec-number block that pins the
module's own §5.4 values: the success scale, both press values, the error rise as an EXPRESSION (it is
half the entrance distance, and a literal stops being half of anything), the entrance rise as a token
read, and the navigator curve as a token read. **A case with no assertion to hit is a finding about the
gate, not about the case.**

## 12.6 🆕 `O-112` … `O-115` — THE CUT-3 DEVICE REVIEW (2026-08-05) + ITS FOLLOW-UP (2026-08-06)

> ⚠️ **`O-114` AND `O-115` LAND HERE RATHER THAN IN A NEW SECTION BECAUSE THEY ARE THE SAME
> DEVICE REPORT'S SECOND HALF.** `O-112` explained why the PLATES were invisible; `O-114` is why
> the CONTENT was, and the two were one symptom (*"no motion anywhere"*) with two independent
> causes. 🔴 **That is worth keeping as a shape: a single device observation split into two
> defects, and fixing the loud one first made the quiet one look fixed.**

| # | the finding | the rule it leaves behind |
|---|---|---|
| 🔴 **`O-112`** | **AN ANIMATED STYLE HANDED TO A COMPONENT THAT *CLONES* ITS `style` PROP IS FROZEN AT THE FIRST-RENDER SNAPSHOT — FOREVER.** Cut 3 shipped with **every plate in the app invisible** and not one of the 26 named rules could see it. Measured in the installed `react-native-svg@15.11.2`: `Svg.render()` does not merely forward `style`, it **clones it onto the inner `<G>`** (`const gStyle = Object.assign({}, StyleSheet.flatten(style))`), which is a SECOND host node. Reanimated exists to drive the value on the UI thread **without a React re-render**, so it updates the node it resolved and never re-runs `render()`; `PropsFilter`'s `_initialPropsMap` then replays the same snapshot on any later re-render. An opacity-0 entrance therefore holds the whole drawing at group-opacity 0 while the outer node's opacity animates **perfectly and invisibly**. ⚠️ **AND `O-111` IS THE SAME PAIRING REACHED FROM THE OTHER SIDE** — there the animated alias broke a rule's *enumeration*; here it breaks the *render*. Both come from `createAnimatedComponent` over a third-party component, four items apart. | 🔴 **A TENTH BLINDNESS CLASS: REACHABILITY. Every motion rule that existed asked about a VALUE — is the duration on the ramp, the curve named, the token referenced, the layout property untouched — and this defect has NO WRONG VALUE ANYWHERE.** It is a start state with no path to its end state, which is the arrival-gate question (§1.1) asked of motion instead of type or colour. 🟢 **`motion-arrival-check.js` rule 10**, two legs: every 0-start opacity hook has a **written path to 1** (5 of 5 exact), and `createAnimatedComponent` is a **DECLARED, COUNTED set of 4** with a stated channel each — a `react-native-svg` target may carry `animatedProps` and **MUST NOT** carry `style`, with calls-vs-declarations reconciled so an unreadable call shape is a hole rather than a pass. 🔴 **AND `O-67` WEARING A THIRD FACE: the Plate contract DID assert the entrance, exactly — as `<AnimatedSvg`. It pinned the broken form.** A checked count is not a checked MECHANISM. ⚠️ Injection case 4 then found a defect in the new rule itself: it recovered the wrapper's local name from the regex match, which contains no `const`, so the svg-channel check **never executed** — `O-54` direction 2 inside a gate. |
| 🔴 **`O-113`** | **THE GATES ENFORCE CONTRAST, NOT DESIGN INTENT — AND NOTHING CHECKS WHETHER A SURFACE IS *SUPPOSED* TO BE ACCENT-FILLED.** All seven cards on the readings hub shipped as full-bleed `accent` fills with `on-accent` labels. **Every pair measured 6.86:1, which is exactly WHY `A5` and `A6` passed.** §2 grounds a card in the card role and reserves the accent for the ACTION role; seven full-bleed accent cards is the loudest treatment in the palette repeated seven times, and it is why the screen read generic. ⚠️ **THE MISREADING IS THE REUSABLE PART:** collapsing seven category hues to one accent meant *"stop using hue for IDENTITY"* — cards keep the card ground, the accent goes on the CTA and the icon. It did **not** mean *"fill every card with accent."* | ⚠️ **THIS IS THE STATED BOUNDARY OF WHAT `A5` / `A6` CAN PROVE, and it is not a gap to be closed by widening them.** A role-correctness rule would have to encode which surfaces may be accent-filled, i.e. the design itself — and §0.0 rule 2 forbids a session inventing that list. 🔴 **So the control is the same shape as `no-white-on-accent`'s: a human reading §2's role column, plus the reviewer on the device.** What IS mechanical is the consequence — the moment a ground changes, re-measure every pair on it: on a dark ground the label returns to the plain foreground role, **never** `on-accent`. 🔴 **AND A RULING THAT RESTED ON THE OLD GROUND MUST BE RE-BASED IN THE SAME COMMIT**: `O-86`/`P65` dropped the Ask-the-stars plate *because* that card was an accent fill (all three legal tints at 1.42/1.36/1.15). On the card role they are 5.11/9.89/3.87, so the drop now rests on a narrower basis and says so — a ruling whose premise is quietly swapped is how a decision becomes folklore. |
| 🔴 **`O-114`** | **REACHABLE IS NOT THE SAME AS PERCEPTIBLE — TWO ALPHA CURVES ON ONE SURFACE MULTIPLY, AND THE PRODUCT IS INVISIBLE.** Cut 3's device pass reported *no motion anywhere*; `O-112`'s style-clone explained the plates and **not the content entrance**, which was correct at every value and still could not be seen. The mechanism, measured in the installed navigators rather than argued: a navigator fades the CONTAINER while `useEntrance` fades the CONTENT, so the eye receives the PRODUCT of two alpha ramps. `ease-enter` (`0, 0, 0.22, 1`) is a hard decelerate — **83% of a 300ms curve is spent inside the first 150ms**, which is exactly the window the root fade (`rns_fade_in.xml`, 150ms) occupies; the tab scene runs 220ms and the nested-Stack default 133ms (API 33+) or 200ms (pre-33). The whole perceptible part of the entrance therefore happened underneath the container's own arrival, and what remained was the last sixth of an alpha ramp. 🔴 **AND THE 8dp RISE DID NOT RESCUE IT, BECAUSE 8 WAS SPECIFIED AS A COMPANION TO THE FADE** — under a simultaneous fade it is below noticing. | 🟢 **THE FIX IS A DELETION, AND THE ASYMMETRY IS WHY: alpha × alpha is DESTRUCTIVE; alpha × POSITION is not.** At composite alpha 0.5 the content is half-visible **and still moving**, so a translate survives a composition a fade cannot. Removing the colliding channel therefore fixes it BY CONSTRUCTION — no focus listener, no `transitionEnd`, no ordering race, and no `useRef` guard turning a missed entrance into a permanent one (which is a *worse* failure than an imperceptible one). 🟢 **`motion-arrival-check.js` rule 10 LEG C**: an entrance that plays once per MOUNT **and** animates nothing but alpha must start no earlier than the LONGEST container animation finishes. The container animations are a **DECLARED, COUNTED set** — a fact about a library, not about this tree, so it cannot be discovered by grepping this tree — with the two that have code sites PROBED and the ungreppable nested-Stack default declared with its measured value, because dropping an ungreppable row is `M-5` arriving inside a rule. ⚠️ **It reads the COMMENT-STRIPPED projection** or the paragraph explaining why a hook is alpha-only would name the surviving channel and EXEMPT the hook it describes (`O-54` direction 2). **Injection 4/4 caught, reason matched.** ⚠️ **The distance question could NOT be closed the same way** — the residual after the tab boundary is 4% of the travel, so reaching 4dp would need a ~93dp rise, which §5.3 rule 3 forbids. 12 is recommended and registered (`P97`), not shipped. |
| 🔴 **`O-115`** | **A TEST THAT RE-IMPLEMENTS ITS SUBJECT CAN ONLY EVER CHECK THE COPY — AND IT REPORTS THAT AS A PASS.** `nameUpdateRateLimit.smoke.ts` was green through **three occurrences** of the raw-tier defect, because `decide()` is a HAND COPY of the middleware's logic: the middleware read `subscription.tier` directly, the test reproduced the same line, and the two agreed with each other. Nine cases, all passing, all measuring nothing about the shipped code path. 🔴 **This is `O-67` in a fourth field: a printed PASS is not a checked pass.** The failure is structural rather than lazy — the middleware is Express-shaped and this repo has no request harness, so copying the logic was the only way to test it at all, which is exactly what makes the pattern attractive and exactly why it must be labelled. | 🟢 **THE MINIMUM HONEST REPAIR IS TO IMPORT THE PART THAT CAN BE IMPORTED AND LABEL THE REST.** The tier half now calls the real `getEffectiveTier`; the windowing half is still a copy and the file's header says so in those words. **A test that admits which half it copies is worth keeping; one that does not is worse than none**, because it is read as coverage. ⚠️ **The general form: whenever a test cannot invoke its subject, name the seam in the file.** 🟢 **And the durable half is a GATE, not a test** — `effective-tier.check.ts` makes every direct read a DECLARED one with a stated kind and pins the fixed sites at exact 0, so the class cannot recur even where no test reaches. ⚠️ **It also needed a FLOOR on `getEffectiveTier` call sites**, because an allow-list rule is otherwise satisfiable by deleting the resolver: every raw read stays declared, every count stays exact, and no entitlement decision consults a comp at all. A boundary whose protected side has emptied out reads green while guarding nothing — the same shape as an easing boundary with no curves behind it. 🟢 **PROMOTED TO A STANDING RULE IN `CLAUDE.md` AND SWEPT, owner-ruled 2026-08-06 — `decide()` WAS THE ONLY INSTANCE IN THE REPO.** `check-prose-sanitiser`, `qa-prompt-invariants`, `qa-router-fixtures`, `timing-fixtures`, `nameValidation.smoke` and the new `ai-generation-log` all import and INVOKE their subject; `qa-device-gate` invokes `enforceQaCaps` for real and scans source only for the one claim that cannot be invoked without a live request (the cap precedes the model call), which is the honest hybrid; `alpha-callsite-check` and `family-arrival-check` load the real `theme.js`; `resolve-utilities` resolves the real config. ⚠️ **A SOURCE-LEVEL CHECK IS NOT AUTOMATICALLY THIS DEFECT** — most gates in `mobile/scripts/` correctly scan text because TEXT IS THE SUBJECT. The defect is re-implementing BEHAVIOUR, and the test is: *if the subject changed, would this check still pass?* 🔴 **It is the third member of a family and the family is the useful part: *a printed count is not a checked count* (`O-67`) · *does it fail?* · *does it CALL the thing?*** |

## 12.7 🆕 `O-116` — THE R9 QA INCIDENT (2026-08-06, session `build27.1-r9-qa-incident`)

> **Not a mobile finding, and it lands here anyway** because the method register is where the
> *shape* of a mistake is kept, and this one is a class the mobile passes have hit repeatedly from
> the other side: a text-level sweep applied to something that was not text.

| # | the finding | the rule it leaves behind |
|---|---|---|
| 🔴 **`O-116`** | **A PROMPT'S DIRECTIVES ARE BEHAVIOUR, NOT PROSE — AND THE PROJECT ALREADY KNEW THAT, IN WRITING, ABOUT A DIFFERENT PROMPT.** The em-dash sweep (`8c6c45a`) correctly left the **crisis-routing classifier** alone (`P93`), on the stated grounds that *"rewriting the punctuation of instructions that decide is this suicidal ideation? is a behavioural change on the safety path with no test runner to prove otherwise."* One day later `61fd46c` edited **7 sentence-break em-dashes inside the R9 report prompt's directives** — a document whose directives include the **no-face rule**, which exists because face content is a Play Store reclassification risk. **Same category, opposite call, and the difference was never argued: one prompt had been *named* a safety path and the other had not.** ⚠️ **The selection inside `61fd46c` was itself careful** — it left 12 STRUCTURAL uses (table cells, headings, definition lists) because none joined a sentence. The discrimination was real; it was just applied one level too low. | 🟢 **REVERTED (`70594da`, server-only, exact inverse: 6 lines, census 12 → 19).** The rule is in `CLAUDE.md`: **punctuation edits to instructions that decide compliance, safety or structure must not ride a style sweep; only a prompt's own PROSE EXAMPLES may be style-edited.** ⚠️ **The test is not "is this a safety prompt?" but "does this sentence DECIDE something?"** — a directive that gates output, selects a mode, bounds a length or forbids a category is behaviour whatever surface it serves. 🔴 **NOT GATED, and deliberately so:** an exact em-dash census over a Sid-gated document cries wolf on every legitimate edit, which is how `no-white-on-accent` got demoted (`61fd46c` reached the same conclusion for the same reason). The control is this paragraph plus `P92`'s recorded count. |
| ⚠️ **`O-116b`** | 🔴 **AND THE REVERT WAS NOT THE FIX — THE RULE IS RIGHT AND THE DIAGNOSIS THAT REACHED IT WAS WRONG.** Both hypotheses named a prompt change; both were refuted by measurement. **The page-count failure was pinned to a deploy boundary that PREDATES both**, using a field the sweep itself had added: `ai_generations.emDashesRemoved` is ABSENT on the failing 2026-08-05 row and PRESENT on the 2026-08-06 rows, so the deploy landed between them and the first failure ran on pre-sweep code. Word count did not move either (7223 / 7351 / 7252 / 7098 before, 7290 after — inside the prior range, 61 words *below* a report that passed). **The real cause is a cap that never had headroom** (`C-R9-1`). | 🟢 **THE INSTRUMENT IS THE REUSABLE PART: A SCHEMA FIELD ADDED BY A CHANGE IS A DEPLOY MARKER FOR THAT CHANGE.** Commit clocks tell you when code was *authored*; a field that only the new code writes tells you when it *ran*. On a project with no staging, no CI and a single auto-deploying backend, that is the only boundary available — and it was free, because the field already existed for another purpose. ⚠️ **`O-99` restated with teeth:** a plausible cause arriving at the same time as a failure is a coincidence until a boundary is measured. Two independent hypotheses both fit the story here, and both were wrong. |
