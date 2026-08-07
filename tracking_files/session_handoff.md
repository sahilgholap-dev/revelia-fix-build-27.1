# Session Handoff — Revelia

> **HOW TO USE**: When a session ends, the outgoing session overwrites the "CURRENT HANDOFF" block below. The incoming session reads it, then checks `claude_progress.md` for full current-build history. Keep this file compact — just enough for a cold-start pickup.

---

## CURRENT HANDOFF

**Written by**: `build27.1-r9-qa-incident` | 2026-08-06
**Branch**: `fix/build-27.1` — 🟢 **49 COMMITS. ⚠️ COMMITTED, NOT PUSHED.** Tree clean.
**`npx tsc --noEmit`**: 🟢 **mobile 0 / server 0.** · **`npm run gate`**: 🟢 **exit 0.**
**server**: `check:prose` 0 · `check:tier` 0 · `check:ailog` 0 · timing 8/8 · qa-prompt · qa-router ·
qa-device-gate all green
**`--diff`** not re-run and **it does not need to be** — this session touched **no file under a
Tailwind content glob** (`mobile/app/**`, `mobile/components/**`). Proven by `git diff --name-only`.

# 🔴 PUSH `70594da` NOW. A PAID DELIVERABLE IS BROKEN IN PRODUCTION.

**This was an incident session, not the build round.** Two commits, server-side + docs.
⚠️ **Everything the previous handoff said about the pending BUILD is unchanged and still true** —
the mobile work is untouched, the device checklist is unrun, and the next action after the push is
still `owner-actions.md` walk → EAS → Internal Testing.

| commit | what | deploys? |
|---|---|---|
| `70594da` | **revert** the R9 prompt's 7 directive em-dashes. One file, exact inverse, census 12 → 19 | 🔴 **YES — server, auto-deploys on push** |
| `684ad6a` | `O-116` in CLAUDE.md · `C-R9-1`…`C-R9-5` · `P108`–`P111` · codemod §12.7 | no |

## 🔴 THE INCIDENT — AND BOTH HYPOTHESES WERE WRONG

The Cosmic Report was failing QA (`pages=27 > 26`, `face: physiognom`). The brief's two suspects
were our own prompt edits. **Measured against the live `reports` / `ai_generations` collections:**

**H-1 · PROSE_STYLE_RULES made it wordier — REFUTED, AND THE PREMISE WAS FALSE.**
🔴 **PROSE_STYLE_RULES WAS NEVER IN THE R9 PROMPT.** `report.service.ts` sets
`system: loadConfidentialPrompt()` — the .md and nothing else. The append rides `HONESTY_PREAMBLE`,
which nine builders import and the report is not one of them. `61fd46c`'s own body says so.

**H-2 · the 7 em-dash edits broke the no-face rule — REFUTED BY THE PROSE ITSELF.**
Both `physiognom` hits are **disclosures of ABSENCE**: *"No face photograph was provided for this
reading, so the physiognomy layer is omitted entirely."* That is the no-face rule WORKING. Section 6
and self-check item 6 were both untouched by the edits.

## 🔴 THE FIVE MECHANISMS WORTH INHERITING

**1 · A SCHEMA FIELD ADDED BY A CHANGE IS A DEPLOY MARKER FOR THAT CHANGE** (`O-116b`). Commit
clocks say when code was *authored*. `ai_generations.emDashesRemoved` is a field the em-dash sweep
itself added: **absent on the failing Aug-5 row, present on the Aug-6 rows.** The deploy landed
between them, so the first failure provably ran on pre-sweep code. **With no staging and no CI that
is the only boundary available, and it was free.**

**2 · THE CAP HAS NEVER HAD HEADROOM, AND THE FLOOR IS WHY NOBODY LOOKED.** Every report ever:
7223→26 · 7351→26 · 7252→**27** · 7098→26 · 7290→**27**, against `QA_PAGE_MAX = 26`. The prompt's
length nudge (`6f1b489`) was written to clear the 17pp **FLOOR**; the ceiling was never measured.
🔴 **And word count does not ORDER page count — 7351→26 but 7252→27** — so every "the prompt got
wordier" theory will keep finding support in noise. `C-R9-1` / `P108`.

**3 · A LOCAL RENDER IS 3–4 PAGES SHORT, SO A LOCAL `pageCount: true` MEANS NOTHING** (`C-R9-5`).
Measured as a free control on all five stored interpretations: −4 / −3 / −3 / −3 / −4. The
LibreOffice-version difference was on record **only as a chart-count artifact**; it moves the page
count by more than the gate's entire margin. 🟢 `face` / `dashes` / `sections` ARE faithful locally.
⚠️ **`QA_PAGE_MAX` was very likely tuned on a dev box. Confirm against a container render.**

**4 · THE FACE RULE FIRES ON THE COMPLIANCE STATEMENT, AND THE E2E DEMONSTRATED IT.** The verifying
run wrote *"so the **face** layer is omitted"*; the failing one wrote *"so the **physiognomy** layer
is omitted"*. **The identical sentence, one word apart** — one passes, one fails. The gate's own
comment predicted this class (it excludes bare "face" for exactly this reason) and stopped one word
short. `C-R9-3` / `P110`. 🔴 **Do not "fix" it by deleting the term.**

**5 · THE PERSISTED COST UNDER-REPORTS BY HALF, AND THAT ONE IS JUST A BUG.**
`synthesizeInterpretation` does `$set: { costEstimate }` — overwrite, not increment — so a re-Fabled
report records only its LAST call. The Aug-6 failure shows `$1.6362`; it cost **$3.2023**. **Any
spend figure taken from `reports.costEstimate` is low by the discarded generations.** `C-R9-2`.

## 🔴 WHAT THE REVERT DOES AND DOES NOT DO

🟢 **Safe**: one real Fable-5 generation on the reverted prompt gave **em=0, en=0** with all 19
em-dashes restored, `face` PASS, `sections` PASS. It cannot regress dash compliance.
🔴 **NOT A FIX, and the verification says so twice**: the run produced **7466 words — the longest
output ever recorded** (the revert made it *longer*), and 23 local pages is **26–27 in production**
by mechanism 3. **Expect the next production report to fail again.**

## 🔴 THE FOUR OWNER DECISIONS — `P108`–`P111`, and `P108` is blocking

| | decision | note |
|---|---|---|
| 🔴 **`P108`** | raise `QA_PAGE_MAX` **and/or** take the renderer trim | ⚠️ the product copy says "18-to-26-page document" — raising the gate is a copy question too. **Do NOT reach for the word target: it does not move the page count** |
| 🔴 **`P109`** | stop discarding a $1.6 generation for one page of LAYOUT | only ONE `PageBreak` exists (the cover), so the levers are `spacing.after` / `line` / margins — deterministic and free |
| 🔴 **`P110`** | the face rule's missing negation context | ⚠️ guards a Play Store reclassification risk. Whatever replaces it must still fail a report that really reads a face |
| ⚠️ **`P111`** | a retry cap? | 🟢 the "your monthly report wasn't used" copy **IS accurate** — verified in code AND in prod data (a user failed at 10:52Z and re-enqueued at 11:42Z, same `monthKey`) |

## ⚠️ CARRIED FORWARD, UNTOUCHED BY THIS SESSION

- 🔴 **The whole mobile device checklist from the previous handoff is unrun** — the tab cut, the wave
  draw-in, `P105`/`P106`, the Name Destiny tile, Explore as a flat list, the lock slot at large font
  scale, and the 3-button / clipping / comped-account / gesture checks from four handoffs ago.
- ⚠️ **`dc6755a` (B4, sanitise-on-read) is still SERVER-ONLY and also auto-deploys on push.**
- 🔴 **`SYNTHESIS_FABLE_ENABLED=true` in prod** — every report runs Fable 5 at `high` effort,
  ~$1.56 per generation, ~5.5 min per call. Confirmed against the live rows.

## ⚠️ STANDING RULES

- 🆕 🔴 **`O-116`: A PROMPT'S DIRECTIVES ARE BEHAVIOUR, NOT PROSE.** Punctuation edits to
  instructions that decide compliance, safety or structure must not ride a style sweep. **The
  project got this right for the crisis classifier (`P93`) and wrong for R9 one day later.** The
  test is not *"is this a safety prompt?"* but *"does this sentence DECIDE something?"*
- 🔴 **`O-99` with teeth**: a plausible cause arriving at the same time as a failure is a
  coincidence until a boundary is measured. **Two independent hypotheses fit this story and both
  were wrong.**
- 🔴 **`O-69`: `--diff` on every batch that adds prose to a file under a content glob.** Satisfied
  structurally here — no such file was touched.
- 🔴 **X1–X21 ARE PRESERVE-BLINDLY.** §4.6: the gate BLOCKS; escape hatch `GATE_LENIENT=1 git push`.
- **No staging. One live prod backend. No CI, no test runner, no screenshot diffing, no device.**

## 🧭 Register map

| File | What it holds |
|---|---|
| 🔴 **`plans/build-27.1/primitives-plan.md`** | **THE PROCEDURE.** §0.0's auto-mode rules · §2 X1–X20 |
| **`plans/build-27.1/codemod-plan.md`** | **THE METHOD.** 🆕 §12.7 = `O-116` / `O-116b` — **next free `O-117`** |
| `plans/build-27.1/UI-revamp-design.md` | unchanged this session |
| `build-27-caveats.md` | 🆕 § "THE R9 QA INCIDENT" — `C-R9-1`…`C-R9-5` |
| `owner-actions.md` | Owns `P-` (**next free P112**). 🆕 `P108` the page cap · `P109` the discard + the cost bug · `P110` the face rule · `P111` the retry cap |
| `CLAUDE.md` | 🆕 the `O-116` section, between `O-115` and the `Text.defaultProps` section |
