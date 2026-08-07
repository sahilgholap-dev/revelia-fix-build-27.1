# R9 STEP-5b Cost + Quality Smoke — Report to the R9 home chat

> **Two passes recorded here.** **PASS 1 (below)** = the original step-5b smoke on the **Mode-A (pre-reconcile) prompt** — surfaced the Mode-A `.docx`-code-blob problem. **PASS 2 (bottom of file)** = the **S-R9k confirm-smoke** on the **reconciled Mode-B prompt (`2755538`)** — **3/3 PASS, S-R9k CLOSED, step 6 unblocked.** Read PASS 2 for the current state.

---

## PASS 1 — Mode-A (pre-reconcile) prompt

Pure measurement. **No product code / DB / commit touched** (`git status` clean on `feature/build-27`).
Fixture = **Monty Adams** (Mar 23 1983, 10:55 IST, Mumbai; `asOf` = Jul 3 2026) — payload **exactly reproduces the sample** (ayanamsa 23.6227°, Taurus/Rohini lagna, Moon Gemini/Punarvasu, Life Path 11). Method: a throwaway harness mirrored `report.service`'s real assembly (confidential prompt as SYSTEM via `fs.readFileSync`, `buildReportInjectPayload` → `buildUserMessage` → `createSynthesisMessage({surface:'report', maxTokens:96_000})`) **without the DB**. Script deleted after; both interpretation dumps retained in the scratchpad for review.

---

## 1. Verified per-MTok rates (claude-api skill = authoritative)

| Model | Input | Output | report.service `MODEL_RATES` |
|---|---|---|---|
| `claude-opus-4-8` | **$5** | **$25** | `$5/$25` ✅ correct |
| `claude-fable-5` | **$10** | **$50** | `$10/$50` ✅ correct |

→ **The open MODEL_RATES caveat is SETTLED — both constants are correct. No one-constant fix needed.**

## 2. OPUS-4.8 run (flag OFF — the mandatory prod-default floor)

| in tok | out tok | **$/report** | wall-clock | stopReason | fellBack |
|---|---|---|---|---|---|
| 37,199 | 27,469 | **$0.87** | 338.8 s (~5.6 min) | `end_turn` | false |

(input $0.186 + output $0.687)

## 3. FABLE-5 run (flag ON — optional on-state)

| in tok | out tok | **$/report** | wall-clock | stopReason | fellBack |
|---|---|---|---|---|---|
| 37,199 | 59,535 | **$3.35** | 701 s (~11.7 min) | `end_turn` | false |

(input $0.372 + output $2.977)

Fable ≈ **3.8× the Opus cost** (2× input rate + 2.2× output tokens from heavier always-on thinking) and 2× the latency. **Output is the ~90% cost driver**, as predicted. Opus lands **well under** the plan's ~$2 estimate; Fable near the plan's ~$3 pessimistic ceiling.

## 6. Truncation

**None.** Both `end_turn`; max output was Fable's 59.5K vs the 96K ceiling. **96K stands — do NOT raise.** (Prior-pass input estimate of 21.6K was low; real input = 37.2K, still tiny relative to output.)

## 4 + 5. QUALITY EYEBALL — ⚠️ the decisive STEP-6 finding

**The confidential prompt `Revelia_Complete_Reading_Generation_Prompt_v1.md` is a MODE-A code-execution prompt, but `report.service` runs it as a plain text call with no code tool.**

Prompt §1: *"Run it in a fresh Claude chat that has **code execution and file creation** … the model computes, writes, verifies, and returns the **.docx**."*
Prompt §8 target: *"one **.docx** … Node `docx` package, Python matplotlib, LibreOffice headless."*

Consequence — **both models emitted a `.docx` build-script transcript, not a prose interpretation:**

- **Opus** wrote ` ```python `/` ```output ` blocks with **hallucinated tool output** (fake `PAGE COUNT: 21`, `DOCX saved`, `PdfReader`, `embedded media: image1/2/3.png`, `em/en: 0/0 PASS`), a **dead `computer:///tmp/…docx` download link**, then a chat summary. None executed — no container is wired.
- **Fable** opened *"Mode B run acknowledged"* then built a matplotlib + `docx` Python module (`doc.save(...)`, 10× matplotlib), staging the injected longitudes into a data structure. Cleaner (no dead link, explicit data module) but still pure code.

`report.service` would persist this **script blob** as `report.interpretation`. Against the checklist:

- **(a) All §8 sections present?** ✅ Both: Cover, How to Read, Part I–VII, Appendix A–D (as `h1(...)` calls). Structurally complete.
- **(b) Zero model-computed arithmetic?** ⚠️ **Mixed.** Core values are **consumed, not fabricated** — spot-checks pass: Asc Taurus 20°09' Rohini pada 4, Sun Pisces 8°24' (= sidereal 338.4°), Moon Gemini 23°07' Punarvasu, ayanamsa 23.6227, LP 11, SU 15 + P 20 → Expr 8 — all match the injected payload (Fable literally embeds the raw injected longitude floats). **BUT** both run **validation arithmetic in code** (sid+ayan=trop, Rahu-Ketu 180°, numerology identity) with simulated outputs — Mode-A residue that pollutes a clean Mode-B deliverable.
- **(c) Sample-level prose?** ✅ The prose *inside* the `para()`/`callout()` string literals is genuinely sample-grade (dual-zodiac synthesis, gold-box plain-language summaries, no dashes, blind-mode framing). Writing quality is high — it's the *packaging* (code) that's wrong.
- **(d) Length → pp?** Opus 7,387 w, Fable 8,274 w (sample = 6,812 w / 25 pp). Both models *claim* 21 pp — but that's **hallucinated pypdf output**, not real. Embedded-prose-only would plausibly land ~18–24 pp.

## 5b renderer-contract bonus — sharpens the DO-6 finding

Section boundaries are **extremely stable and machine-parseable** — but as **Python markers** (`# ===== PART I =====`, `h1("Part I…")`, `make_table(...)`, `print("Part I done")`), not prose headings. This forces the STEP-6 architecture decision into the open:

- **If Mode A** (run the script in a real code-exec sandbox) → the `.docx` *is* the deliverable; the model *is* the renderer; the STUB / step-6 renderer plan is moot.
- **If Mode B** (persist prose + build the step-6 renderer) → the current output is **unusable as-is**; the prompt must be **rewritten to emit ONLY structured prose** (drop the `docx`/matplotlib/code-exec machinery), or step-6 must execute the emitted script in a sandbox.

## 7. Scope confirmation

No product code, no DB writes, no Report doc, no commit, no renderer/QA/delivery. Scratch script deleted; both dumps retained at `…/scratchpad/r9_report_claude-opus-4-8_opus.md` and `…/scratchpad/r9_report_claude-fable-5_fable.md` for review.

---

## STEP-6 GO/NO-GO implications (the three settled inputs)

1. **Cost:** measured — **Opus $0.87, Fable $3.35** per report, no truncation, 96K ceiling holds. Comfortably affordable at 1/month/paid-user either way.
2. **MODEL_RATES caveat:** settled — constants correct.
3. **Renderer-contract:** the prompt/orchestration **Mode mismatch is the gating issue** — not a renderer detail but a build-shape decision. **Recommend flagging this as the #1 STEP-6 GO/NO-GO item for Sid:** the shipped prompt targets code-exec `.docx` (Mode A) while `report.service` is wired for Mode B prose-persist. Must be resolved before step-6 — either **rewrite the prompt to pure-prose Mode B**, or **wire a code-execution renderer**. The chart **vector-vs-raster** settle is *downstream* of that decision: Mode A has the model draw the charts (matplotlib, as both runs did); Mode B needs the separate Node renderer.

### Follow-up options for STEP-6
- (a) Draft the prompt-rewrite-to-pure-Mode-B scope, **or**
- (b) Spike the code-execution-renderer (Mode A) path.

→ **Resolved: option (a) was taken (commit `2755538`) and confirmed by PASS 2 below.**

---

## PASS 2 — S-R9k CONFIRM-SMOKE on the reconciled Mode-B prompt (`2755538`)

Purpose: prove the S-R9k prompt rewrite (option A, Mode-B pure-prose Output Contract) actually changed the model's output. Same throwaway harness, same Monty fixture, **Opus-4.8 floor (flag OFF), one run**. No product code / DB / commit touched (`git status` clean); scratch script deleted; dump retained at `…/scratchpad/r9_report_claude-opus-4-8_opus_RECONCILED.md`.

**Run:** `claude-opus-4-8`, `fellBack` false, `stopReason` **`end_turn`** (no truncation). input **41,232** / output **10,294** tok → **$0.46/report** (in $0.206 + out $0.257), wall-clock **168 s (~2.8 min)**, **4,747 words**. Output fell 27.5K → 10.3K vs PASS 1's Mode-A run (the `.docx`-build code scaffolding is gone), roughly halving cost.

### The three checks — pass/fail

| # | Check | Result |
|---|---|---|
| 1 | **Prose, not code** | ✅ **PASS** — 0 code fences, 0 ` ```python `/` ```output `, 0 `docx`/matplotlib/`print`/`h1`/`para`, 0 `computer://` links, 0 hallucinated tool output. Pure structured prose with `In plain terms:` callouts + human title lines. |
| 2 | **All 14 `===SECTION===` ids exact + in order** | ✅ **PASS** — exactly 14, exact kebab-case, exact fixed order: `highlights, cover, how-to-read, part-i, part-ii, part-iii, part-iv, part-v, part-vi, part-vii, appendix-a, appendix-b, appendix-c, appendix-d`. None added/dropped/renamed/reordered. |
| 3 | **`[[CHART]]`/`[[TABLE]]` markers bare, no model-authored cells** | ✅ **PASS** — all 3 charts (`rasi-chart`, `western-wheel`, `dasha-timeline`) + 12 table markers alone on their own lines; **0 markdown pipe-table rows / 0 authored cells**; numbers consumed verbatim (ayanamsa 23.6227, Taurus lagna 20°09', LP master 11 — matches injected payload, no arithmetic). |

**Verdict: 3/3 PASS.** The reconciled prompt produces clean Mode-B prose against the machine-parseable §8 renderer contract. **S-R9k CLOSED; step 6 unblocked** (`sid-signoff.md` S-R9k).

**One cosmetic residual (NOT a fail → logged `build-27-caveats.md` OUTPUT-CONTRACT):** `[[TABLE: birth-details]]` was emitted **twice** — in `cover` (line 27) and again in `part-i` (line 47). Both are valid per the contract's "`cover` / `part-i`" mapping, so it is not a breach — but the step-6 renderer should dedupe a repeated table-id, or a one-line prompt tweak could pin `birth-details` to a single section. Decide at step 6.
