# R9 — Personalized Cosmic Report (paid, async-generated 18–26pp PDF reading)

> Part of **Build 27** (see `../build-27.md`). Status: **📋 DEEP-PLANNED (2026-07-16)** — PLANNING ONLY, no code, no deps, no schema changes, no commits. This doc + the `plans/build-27.md` update (at the end) are the whole deliverable. HEAD unchanged.
> **Area: Both** (a large server generation/render/delivery pipeline + a mobile placement/results/history surface). R9 is the flagship paid deliverable of the build; it is **implemented BEFORE R7** (owner sequencing — `session_handoff.md`), which inverts one dependency: R9 builds the **sidereal astronomy foundation** R7's plan describes, and R7 later reuses it (see §0 / §5).
> **Depends on:** R1 (astronomy engine, ✅), R4 (numerology consolidation, ✅), R5 (`createSynthesisMessage` / Fable 5 → Opus 4.8 routing + the server-side `fallbacks` beta, ✅), R3 (stored palm trait layer, ✅). Does **NOT** depend on R7 (the generation prompt excludes the Timing Engine — spec §1).
>
> **Source hierarchy (spec §0, binding):**
> 0. **`Revelia_Complete_Reading_Generation_Prompt_v1.md` (Sid, INTERNAL/CONFIDENTIAL)** — AUTHORITATIVE for *what the report contains and how it computes*: inputs block, fixed astronomy settings, numerology/palm specs, **section/Part/Appendix order, document format, style rules, QA checklist, child rules.** **Home RESOLVED (D8, PM 2026-07-17): committed to this private, org-only (dev + founder) repo** as a normal server-side file — the backend reads it **bundled** (no Railway runtime-load problem); it stays out of the client bundle. ✅ **Committed at `server/src/prompts/Revelia_Complete_Reading_Generation_Prompt_v1.md`** (read bundled by the backend). This plan was written **without reading it**, so every prompt-specific fact (exact section manifest, exact QA-checklist wording, exact child-rule domains) is written as **"verify against the generation prompt"** rather than invented — mirroring the spec's own §15 discipline.
> 1. **`R9-report-spec.md` (claude.ai strategist)** — the reviewed requirements spec; its §0/§2/§3/§4/§14/§15 are the binding structure this plan implements.
> 2. **The Monty Adams sample PDF** — the static sample shown to all users + the fidelity/format reference ("a correct run should be indistinguishable from this"). **Home RESOLVED (D8): hosted on R2** as a plain **public** object (shown to all, incl. free — not a paid per-user report; NOT git). ⚠️ **Not yet uploaded** — a local gitignored copy is fine as the render-spike fidelity target (§6, §7).
> 3. **Mockups (2 screenshots)** — PROTOTYPES ONLY; UI finalized + PM-approved post-build (D6).
>
> ⚠️ **All Anthropic facts below were verified against the `claude-api` skill at plan time (2026-07-16)** — Fable 5 id/pricing/limits, thinking-always-on, the server-side `fallbacks` beta header, refusal handling, the code-execution tool + Files API, 30-day retention. Re-verify before implementing (models/pricing drift).
>
> ✅ **In-repo §15 facts independently verified 2026-07-16** via a four-way read-only exploration (generation/delivery/async/storage/email · astronomy engine · numerology/tier/palm · mobile/OneSignal/types). Every file:line claim below was confirmed by that pass; where a fact is not in the repo it is written as **"verify X."**

---

## 0. The §15.1 architecture SPIKE — RESULT (read before sizing Phase A)

Spec §4/§15.1 make the generation architecture a **first-class spike, not an assumption.** A read-only investigation of the whole server settles the *in-repo* half outright; one *runtime* probe remains (pyswisseph-in-code-execution) and gates only the astronomy sub-decision, not the build shape. **Verdict: this is an almost-entirely net-new pipeline; Mode B (backend-computes / model-writes / controlled-renderer-builds) is the recommended shape, and the render half is Mode B regardless of the probe.**

### What is verified ABSENT today (all net-new)

- **No document generation of any kind.** No `pdfkit` / `puppeteer` / `playwright` / `docx` / `pdf-lib` / `@react-pdf` / `html-pdf` / `carbone` / `pptxgenjs`, and no chart renderer (`chartjs-node-canvas` / `chart.js` / `d3`) anywhere (`server/package.json:37-66`; package-lock grep clean). `sharp@0.33.2` (`:63`) is image-resize only. **The 18–26pp PDF + 3 charts is the single largest net-new build item.**
- **No async job / queue / worker.** The only scheduling primitive is `node-cron ^4.2.1` (`server/package.json:62`) used in-process by `jobs/pushScheduler.ts` (two cron ticks, guarded by module booleans, no persistence/retry). No BullMQ/Bull/bee-queue/agenda/Redis. A durable job lifecycle (`queued → generating → ready → failed`) with persisted status is **entirely net-new.**
- **All current readings are synchronous** `request → LLM → JSON → in-app display` (`claude.service.ts`, `reading.controller.ts`); nothing is rendered to a file or emailed. A minutes-long Fable 5 report **cannot** be a synchronous HTTP request (R5 already flagged minutes-long Fable turns).
- **Storage: R2 exists, but images are served via PUBLIC URL, and PDF storage is effectively net-new.** `r2.service.ts uploadImage` (`:40-63`) **hardcodes `ContentType: 'image/jpeg'`** (`:55`) and returns a public `${R2_PUBLIC_URL}/${key}` URL (`:60`) — it cannot store a PDF as written. A `getSignedUrl(key, expiresIn=3600)` helper **exists** (`:84-91`, via `@aws-sdk/s3-request-presigner`) but is **dead/unused** (no caller in `src`). So durable PDF hosting (non-image content type, private key namespace) + actually using presigned/expiring links is mostly net-new; the primitive exists, just unwired.
- **SendGrid works for OTP/welcome only, and Export-My-Data emails nothing.** `email.service.ts` `sendEmail` is private (`:34-88`), `EmailOptions` has **no `attachments`** field (`:12-17`), env key `SENDGRID_API_KEY` (`:8-9`). `account.controller.ts exportData` (`:32-57`) **never calls the email layer** — it returns a hardcoded "within 24 hours" string (comment `:42-44`). This is the shared integration R9's email delivery rides (spec §7 / D5).

### The astronomy finding (larger than R7's; it changes the sizing)

The engine today is **tropical-only, Placidus-only, single-moment.** The report needs far more than R1's natal snapshot **and** more than R7's *moment chart*:

| Report-required output | Status | Evidence |
|---|---|---|
| Tropical Western natal | **PRESENT** | `computeNatalChart` `astrology.service.ts:269-330` |
| Lahiri **sidereal** natal | **net-new** (R7 *plans* it but R7 impl is deferred until after R9 → **R9 builds it**) | grep: absent; feasibility proven `R7-QA.md:23` |
| Whole-sign houses (sidereal) | **net-new** (R7-planned) | `'W'` to `houses_ex`; type value only `shared.ts:327` |
| Whole-sign houses (tropical) | **net-new for R9** (not in R7 scope) | — |
| Vimshottari **dasha LADDER** (all MD + antardasha sub-periods) | **net-new for R9** (R7 plans only the *current running* MD/AD) | pure arithmetic off sidereal Moon nakshatra `R7-QA.md:28` |
| Long-range **transit ingress tables** (Saturn ~30y, Jupiter, Rahu) | **net-new for R9** | `computeTransits` is single-date, UTC-noon, no location `astrology.service.ts:393-414` |
| **Sade Sati** + planetary **returns** | **net-new for R9** | no scan/solver anywhere |
| **Panchanga** (tithi/nakshatra/yoga/karana/vara) | **net-new for R9** (dasha computes the Moon nakshatra en route) | — |
| **Navamsa (D9)** divisional chart | **net-new for R9** | — |
| **Dignities** (exalt/debil/own) + **yogas** | **net-new for R9** | — |

**Reusable primitives (compose, don't rebuild):** `computePositions(jd)` (`astrology.service.ts:206`), `toJulianDayUT` (`:172`, full IANA-tz wall-clock→UTC→JD), `houses_ex` (`:283`), `reduceToSingleDigit` (numerology). ⚠️ **`swe.set_sid_mode(...)` is process-global** on the shared `sweph` instance that also serves R1's tropical consumers (`reading.controller`/`insight.service`/`continuity.service`/`compatibility.service`/`profile.service`/`astrology.routes`/`backfill-natal-chart`) — a naive flip silently makes all of them sidereal. **R9 must own the sidereal lifecycle in an isolated module (set-then-reset, or a dedicated code path), same hazard R7 flagged (`R7-QA.md:33`), and add a regression check that a tropical natal computed after a sidereal report is byte-identical to one before.** Because R9 ships first, **R9 establishes this sidereal engine module and R7 later inherits it.**

### The one remaining runtime probe (Phase 0 — does NOT block the build shape)

> **⛔ SUPERSEDED (2026-07-18, §0.1 Part A) — probe NOT run, offload REJECTED on cost.** Astronomy stays in Node (R7's spike already proved Lahiri sidereal + Vimshottari dasha reachable by config with no new libs / no `.se1`). The code-execution + `pyswisseph` OFFLOAD is rejected on cost, not feasibility: a prior claude.ai code-execution report-generation run (same content-generation prompt) produced a full report PDF but consumed ~100% of the session's token budget for a SINGLE report, with no benefit under Mode B (which computes astronomy deterministically in Node and injects it). No probe was run. The paragraph below is retained for history only.

Mode A (spec §4) is "the model runs the prompt end-to-end via Anthropic's **code-execution** tool: compute astronomy inline with `pyswisseph`, draw the 3 charts, build the `.docx`." From the `claude-api` skill, the code-execution sandbox has `matplotlib`, `python-docx`, `pypdf`, `pillow` pre-installed (good for charts + docx), **but has no internet access** (`pip install` reaches a mirror at best) and its **`pyswisseph` availability is unverified** — and it produces a **`.docx`, not a PDF** (docx→PDF still needs conversion, and there is no LibreOffice in the sandbox). So Mode A cannot deliver the product PDF end-to-end and its astronomy leg is unproven. **The only thing a probe decides is whether code-execution+pyswisseph could OFFLOAD the ~10 net-new Node astronomy derivations** — an optimization, not the architecture. **Recommendation: run a small Phase-0 code-execution probe** (one `code_execution_20260521` call attempting `import swisseph` + a Lahiri sidereal position + a `matplotlib` PNG + a `python-docx` write, retrieved via the Files API) analogous to R5's Fable probe. **verify: does the code-execution sandbox expose `pyswisseph`/`swisseph` and file output?** If NO (likely) → all astronomy is Node (Mode B). If YES → astronomy *could* move to code-execution, but the render still stays server-side (Mode B), so the recommendation below is unchanged either way.

### Spike recommendation (architecture-shaping)

> **Mode B — backend computes, model writes, controlled renderer builds.** The backend deterministically computes astronomy (isolated sidereal engine module extending R1) + numerology (the R4 util) and hands Fable 5 a validated `ASTRONOMY_JSON` + `NUMEROLOGY_JSON`; Fable 5 returns the **interpretive content only** (JSON, per-section prose — never arithmetic, which the prompt itself forbids); a **controlled server-side renderer** builds the PDF + the 3 charts from a template, then the **QA gate** (§8) runs before the report is marked `ready` and the credit is spent. This is the spec's recommended path, gives full control over page-count / section-presence / no-em-dash / embedded-images, and keeps the model out of arithmetic. It is the biggest build but the only one that satisfies the QA gates + PDF delivery. The render half is Mode B **regardless** of the Phase-0 probe.

**Report this spike outcome before sizing Phase A** (spec §15.1). The build shape is decided (**D2 = APPROVED, Mode B**): **net-new async job + net-new astronomy derivations + net-new PDF/chart renderer + net-new durable PDF storage + a net-new delivery seam** (buffer-upload + private-path/TTL link + link-email — built in Phase A, reused later by Export-My-Data; **D5 reframed — not a broken-integration fix**). ⚠️ **The private R2 bucket (per-user PDFs) is being provisioned by Sid (D7).** **D8 ✅ RESOLVED (PM 2026-07-17):** the confidential prompt is **committed at `server/src/prompts/`** (read bundled — no Railway runtime-load problem); the sample PDF goes to **R2 (public object)** and still needs uploading.

---

## 0.1 Phase-0 spike RESULTS (dated 2026-07-18)

> **Scope of this step.** Phase-0 SPIKE: investigate + record. **NO product code, NO committed dependencies, NO schema.** The only committed artifact is this subsection (plus the §0 "one remaining runtime probe" supersede above). All tooling installed for the spike (Python venv + matplotlib/pymupdf, a throwaway `docx` npm package, LibreOffice) was scratch and reverted; nothing was staged except `R9-report.md`.
>
> **✅ Mode B is UNCHANGED.** Nothing below alters the architecture verdict. This step validated the CONFIRMED render toolchain and sized cost; it was not a renderer bake-off.

### Part A — Astronomy offload: RECORDED (no probe run)

**Astronomy stays in Node.** R7's spike proved Lahiri sidereal + Vimshottari dasha are reachable by config on the existing `sweph` Moshier engine (`server/package.json` → `sweph ^2.10.3-5`), with **no new libraries and no `.se1` files**. The code-execution + `pyswisseph` OFFLOAD is **REJECTED on cost**, not feasibility: a prior claude.ai code-execution report-generation run (same content-generation prompt) produced a full report PDF but consumed **~100% of the session's token budget for a SINGLE report**, with no benefit under Mode B (which computes astronomy deterministically in Node and injects it). **No probe was run** (the §0 "one remaining runtime probe" paragraph is superseded above). ⚠️ The ~100% figure was a **claude.ai SUBSCRIPTION session cap** — irrelevant to the API-based pipeline (the API has **no** per-report subscription session cap; see Part B4).

### Part B — Render toolchain validated on the confirmed chain (matplotlib → Node `docx` → LibreOffice `soffice` → pypdf/pymupdf QA)

The sample's toolchain is treated as KNOWN and was not re-litigated. This step ran the chain locally against the real sample and assessed Railway deployability + cost.

**B1 — FIDELITY of the confirmed chain: CONFIRMED (natal wheel + text page both reproduced).**

Fidelity target = the local `Personalized_Cosmic _Sample_Report.pdf` (Monty Adams; 25 pp, 6,812 words). Its forensic profile (pymupdf): **25 pages** (inside the 18–26 gate), **0 em-dashes** but **2 en-dashes** present, **0 raster image xobjects** (the 3 charts are drawn as **vector**, ~44–48 vector paths on the chart pages 5/9/22), and text renders in **Helvetica/Times-Roman base-14 fonts — Georgia is NOT embedded in the shipped sample**.

- **Western natal WHEEL — reproduced (matplotlib).** From the sample's real tropical positions (Gemini 13°51' rising; Sun 2°01' Aries, Mars 20°00' Aries, Moon 16°44' Cancer, Venus 4°37' Taurus, Jupiter 10°53' Sagittarius, Saturn 3°13' Scorpio, Mercury 28°48' Pisces, Nodes 29°33' Gemini/Sagittarius) a matplotlib render reproduced the sample's wheel **1:1 on the substantive content**: three concentric indigo circles, 12 gold italic sign sectors from Gemini at 9 o'clock, all planets in white circles at the correct sectors (Mo/NN upper-left, Sa upper-right, Ju/SN right, Ve lower-left Taurus, Su/Me/Ma bottom Aries cluster), red ASC line at 9 o'clock, whole-sign house numbers 1–12, and the exact caption string. Rendered cleanly to **both PNG (dpi 200) and SVG**. One convention delta, NOT a toolchain gap: an independent RAMC-based MC computation put MC in Pisces, whereas the sample anchors the MC line at the top of the wheel — an MC-placement convention to lock at build, orthogonal to render fidelity.
- **TEXT page — reproduced (Node `docx@9` → `soffice`).** A representative "How to Read" page built with the `docx` npm package reproduced the §8 house style faithfully after `soffice --headless --convert-to pdf`: gold right-aligned running header (`REVELIA · The Complete Reading · Monty Adams`), indigo H1, justified serif body, an indigo-header / alternating-row table, the cream-fill callout with gold left-border and bold-gold `In plain terms:` prefix + italic ink body, an embedded chart image, and the centered gray page-numbered footer. The `.docx` was valid OOXML (`word/document.xml` + `word/media/` with the embedded chart). Visual match to sample page 2 was near-exact.

  **Three fidelity findings folded back to the plan (§5/§8):**
  1. **Charts should be emitted as VECTOR (matplotlib → SVG/PDF), not dpi-200 raster PNG** — the shipped sample's charts are vector (0 raster xobjects); vector is crisper, smaller, and is what the reference artifact actually is. Re-examine the §8 "dpi 200 PNG" line toward SVG at build.
     - ✅ **RESOLVED at §14 step 6a (2026-07-21) — the chart vector-vs-raster question is SETTLED, and the docx→LibreOffice-preserves-vector question is answered YES.** 6a re-inspected the ACTUAL shipped sample PDF itself (pymupdf): **0 raster image xobjects on EVERY one of the 25 pages; the chart pages (3 Rasi, 5 Western wheel, 9/22/24 dasha) are 44–48 vector path groups → the sample is DEFINITIVELY VECTOR.** This overrides both the prompt §8 "dpi 200 PNG" line AND the claude.ai browser run's "raster PNG, no SVG" report — the SHIPPED artifact is the fidelity target and it is vector. **Then the decisive downstream test (owner-flagged fork-reopen risk):** a matplotlib **SVG** (text kept selectable, `svg.fonttype=none`) embedded via a docx **SVG `ImageRun`** (+ PNG fallback blip) was converted through **`soffice` docx→PDF** and the OUTPUT re-inspected — **0 raster xobjects, 61 vector items → LibreOffice PRESERVES the SVG as VECTOR end-to-end. The Q1 fork does NOT reopen.** Re-confirmed on the REAL report charts in the full Monty render: output PDF has **0 raster xobjects doc-wide** and the 3 chart pages carry 125/201/221 vector items. **Decision: charts are matplotlib SVG; the renderer emits SVG through docx→LibreOffice. (`report-render.service.ts` + `report-charts.py`, `svg.fonttype=none` + `axes.unicode_minus=False` so no chart-label dash/minus survives the §9 scan.)**
  2. **The render container MUST install + embed Georgia (or a licensed metric-compatible substitute).** Both my page AND the shipped sample fell back to base-14/substitute serif because Georgia was absent from the render environment; exact typographic fidelity depends on the font being present in the container, a build-time config item (pairs with the Dockerfile in B2).
  3. **The QA em/en-dash scan is necessary and must catch EN-dashes too.** Even the "gold" sample ships with 0 em-dashes but **2 en-dashes** — i.e., the reference artifact itself fails the §9 "zero en-dashes" rule. The §8 deterministic scan must flag `–` (U+2013) as well as `—` (U+2014).

**B2 — LibreOffice on Railway: VERDICT = VIABLE-WITH-DOCKERFILE.**

`soffice` was confirmed working headless in the spike environment: `soffice --headless --convert-to pdf` converted both a smoke file and the real `page.docx` (exit 0), embedded chart preserved; warm conversion ~**1.4 s** (a 25-pp doc will be a few seconds; first/cold headless invocation initializes a user profile, typically ~3–8 s).

- **Deployability (evidence-based, empirical Railway deploy DEFERRED to Phase A step-1).** LibreOffice is a standard Debian **apt** package (`libreoffice`, or the slimmer `libreoffice-writer` + `libreoffice-core` — Writer + core is all a docx→PDF needs, no Draw/Calc/Impress) and a nixpkgs package. The repo currently has **NO `Dockerfile` / `nixpacks.toml` / `railway.json`** → Railway builds via **default Nixpacks auto-detection** (Node ≥20, `npm run build` → `npm start`). LibreOffice can be added either via a `nixpacks.toml` `aptPkgs`/`nixPkgs` entry **or** a Dockerfile. **Recommendation: a Dockerfile** (`FROM node:20-bookworm-slim`, `apt-get install -y libreoffice-writer libreoffice-core fonts-*`), because a ~350 MB–1 GB system dependency + font embedding + first-run profile is far cleaner to control deterministically in a Dockerfile than layered into Nixpacks. The existing **glibc/non-Alpine** constraint (CLAUDE.md: "no Alpine on Railway — sweph glibc") is exactly what LibreOffice needs (Alpine/musl is problematic for both `sweph` and LibreOffice), so this is consistent with the current image.
- **Costs.** Image **+~350–500 MB** (`libreoffice-writer`+`libreoffice-core`) or ~1 GB (full suite). Per-conversion RAM ~150–400 MB → a 25-pp doc fits comfortably in a ~1 GB container. Cold-start: only the **first** headless invocation pays the ~3–8 s profile init; because the report pipeline is already **async (minutes-long Fable turn)**, that one-time init is negligible, and can be pre-warmed by launching a persistent `soffice` listener at boot.
- **Caveat.** Adding a Dockerfile is a deliberate change to the repo's build path (currently Nixpacks-auto). Flagged as a Phase-A infra step; the actual Railway build + cold-start timing on Railway's builders is DEFERRED to Phase A step-1 (this spike validated the chain locally and assessed deployability — it did not deploy to Railway).

**B3 — No-LibreOffice fallback (RECORDED, not built).**

There is **no high-fidelity pure-JS `docx→PDF` renderer** on Node (`libreoffice-convert` / `docx-pdf` all shell out to `soffice` or MS Word), so a no-LibreOffice path means **abandoning the docx-authoring leg**, not swapping the converter. Most fidelity-preserving fallback: **HTML + CSS → headless Chromium (Playwright/Puppeteer) → PDF** — this is the plan §0 "D-render" original primary; charts would be matplotlib→SVG inlined into the HTML. Deploy weight is **comparable** to LibreOffice (Chromium ~300 MB + system libs; also needs a Dockerfile/nixpacks + `--no-sandbox`), so it trades one heavy system dep for another. Lighter, lower-fidelity second fallback: **`@react-pdf/renderer`** (pure-JS, no browser) — smallest deploy footprint but weaker pagination/typography control and a full layout re-author. **Recommendation: keep LibreOffice as primary (B2 viable); hold HTML→Chromium as the fidelity-preserving fallback if the Railway LibreOffice deploy proves unviable at Phase-A step-1.**

**B4 — Rough per-report Fable 5 cost estimate: ~$1.5–$2.5 per report (order-of-magnitude ~$2).**

Method note: `count_tokens` could not be called (no `ANTHROPIC_API_KEY` / `ant` CLI in the spike environment), so this is a **char→token heuristic estimate** (Fable 5 uses the Opus 4.8 tokenizer; ~3.7 chars/token English, ~3.3 for dense JSON). Order-of-magnitude, per the spike brief. Fable 5 pricing (claude-api skill): **$10 / MTok input, $50 / MTok output.**

- **INPUT** ≈ generation prompt (25,921 chars ≈ ~7,000 tok) + injected `ASTRONOMY_JSON` (~2.6 KB) + `NUMEROLOGY_JSON` (~0.5 KB) (~3.1 KB ≈ ~950 tok) + inputs block/palm observations (~1 KB ≈ ~300 tok) → **~8–9K input tokens ≈ ~$0.08–0.09**. (Prompt caching can further cut the stable-prefix input cost across reports.)
  - ✅ **MEASURED (2026-07-20, step-5 cost pass — official `count_tokens` vs `claude-fable-5`, reconciled prompt + a faithful Monty inject):** **reconciled prompt (system, stable across all reports) = 11,038 tok; injected Monty block (Inputs + ASTRONOMY_JSON + NUMEROLOGY_JSON + PALM_OBSERVATIONS) = 10,562 tok; TOTAL INPUT = 21,595 tok ≈ $0.22/report (fixed).** This is **~2.4× the char-heuristic above** — the reconciled prompt alone is ~11K (vs the ~7K estimate) and the real engine JSON (full dasha ladder w/ antardashas ~81 rows, both-zodiac positions + nakshatra/pada/D9/dignity, panchanga, named yogas, forward transit tables) is far richer than the heuristic assumed. **BUT input is only ~10% of the bill** (output dominates at $50/MTok) → the per-report conclusion (~$2, ceiling ~$3) is UNCHANGED. The stable 11K system prefix is an ideal prompt-caching candidate across reports. (Output not yet measured — a live generation is needed; the heuristic below stands until step 5/Phase-B measures it.)
  - ✅ **OUTPUT MEASURED (2026-07-21, step-5b cost smoke — ONE real `createSynthesisMessage` per model, Monty fixture, `tracking_files/build27-usage-cost.md`):** **Opus-4.8 (flag OFF, the prod floor): 37,199 in / 27,469 out → $0.87/report, ~5.6 min, `end_turn` (no truncation).** **Fable-5 (flag ON): 37,199 in / 59,535 out → $3.35/report, ~11.7 min.** Fable ≈ 3.8× Opus (2× input rate + 2.2× output from heavier always-on thinking); output = ~90% of the bill as predicted. Both AT/UNDER the ~$2/~$3 estimates → **comfortably affordable at 1/month/paid-user.** `maxTokens`=96K holds (max output 59.5K). Verified per-MTok rates (claude-api skill): Opus $5/$25, Fable $10/$50 — `report.service.MODEL_RATES` confirmed correct. Real input = 37.2K (the 21.6K count_tokens estimate was low but still tiny vs output). ⚠️ **The smoke ALSO surfaced the OUTPUT-CONTRACT / Mode mismatch — see §14 step 6 / caveats / sid-signoff (the prompt is a Mode-A code-exec prompt; run as a plain text call it emits a .docx BUILD-SCRIPT, not prose). Resolution gates step 6.**
- **OUTPUT** ≈ visible per-section interpretive text (sample body 42,566 chars; in Mode B the numeric tables are Node-rendered, so ~11K tok of model-authored prose+JSON structure) **plus Fable 5's always-on thinking at high effort** (a long structured generation plausibly adds ~15–35K thinking tokens, billed as output) → **~25–45K output tokens ≈ ~$1.25–$2.25**.
- **PER REPORT ≈ $1.4–$2.4 (call it ~$2), ceiling ~$3** at a pessimistic ~60K output tokens. The dominant driver is **Fable 5 output + always-on thinking at $50/MTok**, not input. At **1 report / month / paid user** this is comfortably affordable. Critically, the matplotlib/docx/LibreOffice steps run in **Node at ZERO model cost**, and the **API has NO subscription session cap** (the Part A ~100% figure was a claude.ai subscription cap, not an API cost).

### Mode B — explicitly UNCHANGED

This spike changed nothing about the architecture: backend computes astronomy (Node) + numerology and injects validated JSON; Fable 5 writes interpretation only; a controlled Node render pipeline (matplotlib charts → `docx` → `soffice` PDF → pypdf/pymupdf QA) builds the artifact; the QA gate runs before `ready`/credit. **D2 = Mode B, APPROVED, unchanged.** The three B1 fidelity findings (vector charts, embed Georgia, en-dash scan) and the B2 Dockerfile recommendation are Phase-A build refinements within Mode B, not architecture changes.

---

## 0.2 Prompt facts FOLDED — every "verify against the prompt" placeholder resolved (2026-07-18)

> **Scope of this step.** DOCS-ONLY prompt-facts fold. NO product code, NO deps, NO schema. Source = the committed confidential prompt `server/src/prompts/Revelia_Complete_Reading_Generation_Prompt_v1.md` (read FULLY this session). Every fact below cites the prompt § it came from; these SUPERSEDE the "verify against the prompt" placeholders elsewhere in this doc (§3/§5/§8). The 12c-audit code-delta findings inlined here were each **re-verified against the code** this session (file:line confirmed).

### A. Section manifest (prompt §8 "Section order (fixed)") — drives the §8 QA section-presence gate + the renderer template

Fixed order the report MUST emit, top to bottom:

1. **Cover** (prompt §8 cover layout: `R E V E L I A` gold 15pt letter-spaced / `THE COMPLETE READING` indigo 28pt / subtitle italic 13pt / `Prepared for {name}` / birth line / panchanga line 10pt gray / `Generated {date} · Computed with Swiss Ephemeris` / EDITION_LINE / closing italic disclaimer).
2. **How to Read This Report** (the two zodiacs + ayanamsa, houses, the dasha clock, transits; purpose + exclusions per subject type; blind-mode framing if applicable; closing callout).
3. **Part I. Two Charts, One Sky** (birth-detail table or PATRIKA reconciliation; Vedic chart image + full position table; Western chart image + table; "Where the Two Lenses Agree" + house-agreement count).
4. **Part II. The Person** (Vedic portrait 3–5 paras, lagna+lord first; Western portrait 1–2 paras; Family Weave if applicable; "Named Combinations" table).
5. **Part III. The Clock** (Moon-nakshatra fraction + birth balance; dasha-timeline image; mahadasha table; Life-Chapter Map [blind] or Validation Pass [biography]; current/education antardasha table; Western timing layer; closing callout).
6. **Part IV. Life Domains** (four lettered domains per subject type; technical read → callout each).
7. **Part V. Windows and the Tending Register** ("a watering schedule, not warnings"; 3-column table of 6–8 dated rows; honest-summary callout).
8. **Part VI. The Decades** (2–4 H2 blocks, decade strokes, one flowing paragraph each).
9. **Part VII. The Convergence Layers** (intro + any stand-in disclosure; **The Numbers** [§4]; **The Hand** [§5]; ~~The Face [§6]~~ **OMITTED — see EXCLUSION below**; The Convergence Verdict + epistemics sentence; closing callout).
10. **Appendix A. Full Positions and Divisional Detail** (sidereal position+dignity, nakshatra/pada, D9 sign, tropical position, all bodies + Asc [+ MC for adults]; mean-node primary, true node footnoted).
11. **Appendix B. Transit Ingress Tables** (sidereal, mapped to houses: Saturn ~30y, Jupiter selected, Rahu-Ketu selected; mark Sade Sati / returns / stellium passes / nodal return).
12. **Appendix C. Glossary** (12–15 terms actually used, one line each).
13. **Appendix D. Methodology, Sources, and Disclosures** (computation settings + ayanamsa value; input sources; frame findings; blind-mode/child-rules statement; Part VII sources + letter-value reproducibility line + palm hedging + stand-in disclosure if applicable + biometric process-and-delete line; standing disclaimers; engine credit line).

**EXCLUSION — the prompt's Section 6 face/samudrika layer is OMITTED from the R9 v1 manifest (recorded so a later reader does NOT "restore missing section 6").** Prompt §6 ("Face spec (Part VII layer three, optional)") defines an **adult-only, photo-based face-zone read** (samudrika shastra: forehead/brows-eyes/nose/cheekbones/mouth-jaw + a zone-map decade cross-referenced to the dasha clock; "only if FACE_PHOTO = provided and SUBJECT_TYPE = adult"; auto-skipped for children). This is **methodologically distinct from R2's `faceArchetype`** (R2 = stored geometry-derived traits/archetype; the prompt's §6 = live photographic face-zone physiognomy). **R9 is face-free** (Play Store reclassification, §1). Therefore: the **manifest omits the "The Face" sub-block of Part VII**; the **renderer template** must produce a face-free Part VII (Numbers → Hand → Convergence Verdict, no Face); and the **QA section-presence gate does NOT expect a Face section** and DOES assert zero face-derived content (see §8 new gate item). Because the prompt already `auto-skip`s Face for children and gates it on `FACE_PHOTO=provided`, a self-path run that never supplies a face photo naturally omits it — R9 hard-enforces this rather than relying on input absence.

### B. QA checklist (prompt §10 "Build and QA checklist") → the Mode-B QA gate (§8)

Prompt §10 steps, mapped to the Mode-B deterministic gate (keeping the spike's corrections):

| Prompt §10 step | Mode-B gate item (§8) |
|---|---|
| 1. Compute/validate astronomy; print key values (lagna, Moon+nakshatra, ayanamsa, dasha balance, current MD-AD) | Node computes + validates `ASTRONOMY_JSON`; log the key values (mirror R5 `ai_generations`). |
| 2. Compute numerology + verify **Soul Urge + Personality = Expression** internal check | Node computes `NUMEROLOGY_JSON` (compute-once-inject, D1); assert the Soul-Urge+Personality=Expression identity before render. |
| 3. Generate 3 images; sanity-check house placements | Charts emitted as **VECTOR (matplotlib→SVG)** not dpi-200 raster (spike B1: sample charts are vector); embed check. |
| 4. Build the .docx | Node `docx` build (Mode B). |
| 5. Convert to PDF; confirm **page count 18–26**; text-extract + confirm **every Part and Appendix heading present** | render-measured page count 18–26 + section-manifest presence check against the **face-free** manifest (A above). |
| 6. Verify **zero em/en dashes** — search extracted text for BOTH characters | deterministic scan for `—` (U+2014, EM) **AND** `–` (U+2013, EN); any hit → repair/regenerate. (Spike: the sample itself ships **2 en-dashes** → the scan MUST catch en-dashes, not only em-dashes.) |
| 7. Verify **docx opens** (zip integrity + python-docx) + **images embedded** (media entries) | Mode-B equivalent = **PDF opens + renders all pages** + charts embedded (the "docx opens" line is a Mode-A artifact). |
| 8. Deliver (.docx + chat summary, no-dash style) | Mode-B = the delivery triple (§7) + highlights payload. |

**NEW gate item (belt-and-braces on the face exclusion): ZERO face-derived content.** Scan the rendered report for face/samudrika-face language and any `faceArchetype`/`faceTraits`-derived phrasing — the correct result is **zero**. Rationale: R2 face fields (`faceArchetype`, `faceTraits`, `faceShape`) exist upstream in `UserInsightProfile`; the injected-payload allow-list (charter step 5) must exclude them by construction, and this gate is the runtime backstop.

### C. Fixed astronomy settings + derived quantities (prompt §3) — resolves the §5 "verify against the prompt" placeholder

**Fixed settings (prompt §3 "Fixed settings, both modes"):**
- **Sidereal mode: Lahiri (Chitrapaksheeya)** — print the ayanamsa value at birth to **4 decimals** in Appendix A + Appendix D.
- **Houses: whole sign, BOTH zodiacs** — Asc + MC from `houses_ex` with house system **`W`** (both sidereal and tropical).
- **Nodes: mean node PRIMARY**; compute true node once and **footnote it in Appendix A**.
- **Ephemeris: Moshier (`FLG_MOSEPH`) acceptable; include `FLG_SPEED`** (retro/stations from speed sign; |speed|≈0 → flag "stationary").
- **Vimshottari year = 365.25 days.**

**Derived quantities (prompt §3 "Derived quantities (compute in both modes)"):**
1. Sign + degree-minute string (`7°29'`), **nakshatra + pada** for every body + Asc (`n = floor(lon/(360/27))`; `pada = floor(remainder/(360/108))+1`; nakshatra-lord cycle from Ashwini: Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury).
2. **Navamsa (D9)** sign for every body + lagna (3°20' pada advance; start Aries[fire]/Capricorn[earth]/Libra[air]/Cancer[water]).
3. **Whole-sign house** of every body from sidereal lagna AND from tropical Asc; **count how many of the 9 bodies hold the same house in both zodiacs** (reported in Part I).
4. **Dignities**: exaltation/debilitation/own/moolatrikona; retro+stationary flags; **combustion** (Mercury 14/retro 12; Venus 10/retro 8; Mars 17; Jupiter 11; Saturn 15; state escape margin). **Yogas**: Mahapurusha (Ruchaka/Bhadra/Hamsa/Malavya/Shasha), Budha-Aditya, Gaja-Kesari, Neecha Bhanga (state cancellation), yogakaraka, dig bala, vargottama, dhana linkages (2/5/9/11 lords+houses).
5. **Panchanga**: tithi (`floor(((Moon-Sun)mod360)/12)+1` + Shukla/Krishna paksha); yoga (`floor(((Moon+Sun)mod360)/(360/27))`); karana; vara (civil weekday + strict Vedic vara if birth precedes sunrise, state both when they differ).
6. **Vimshottari**: birth MD lord = Moon-nakshatra lord; balance = `(1-fraction)×lord-years` (Ketu 7/Venus 20/Sun 6/Moon 10/Mars 7/Rahu 18/Jupiter 16/Saturn 19/Mercury 17); lay out **all mahādashās with dates**; **antardashās** (`AD = MD×AD-lord-years/120`) for every MD intersecting the reporting window; identify current MD-AD (+PD if a "now" statement is needed).
7. **Transits**: sidereal ingress dates for **Saturn (~30y fwd), Jupiter (selected), mean Rahu**, mapped to houses; **Sade Sati** windows (Saturn over 12th/1st/2nd from natal Moon), past + future; **Saturn return** years (~29.5y); note Jupiter passes over natal stellium/lagna/Moon in the forecast horizon.

**These CONFIRM §5's isolated-sidereal-engine derivation list.** ↔ **The concrete deltas the 12c-audit found vs R1's shipped engine (`astrology.service.ts`, re-verified this session):**

| Report requirement (prompt §3) | R1 shipped today (verified) | Delta |
|---|---|---|
| Lahiri **sidereal** + **whole-sign `'W'`** in BOTH zodiacs | Placidus **`'P'`**, **tropical only** (`houses_ex(...,'P')` `:288`; `houseSystem:'placidus'` `:325`; no `SEFLG_SIDEREAL`/`set_sid_mode`/ayanamsa anywhere — grep clean) | **(a)** net-new sidereal engine + whole-sign for both zodiacs |
| **mean node** primary (true node footnoted) | **`SE_TRUE_NODE`** (`:65`) | **(b)** switch to mean-node primary; footnote true |
| nakshatra/pada, D9 navamsa, Vimshottari dasha, Panchanga, Vedic dignities/yogas | **ALL MISSING** (grep for nakshatra/navamsa/dasha/panchanga/vimshottari/yoga/dignit = **0 matches**) | **(c)** all net-new derivations |
| sidereal ingress / Sade-Sati / returns | `computeTransits` = **tropical aspect-to-natal, UTC-noon, single-date, no location** (`:414-428`) | **(d)** net-new date-solver scan for ingress/Sade-Sati/returns |

These four deltas define charter **step 1**'s build surface (§14). Do NOT paper over them — R1's Placidus/true-node **tropical** natal path stays byte-identical (the set-sid-mode regression guard proves it).

### D. Numerology tables (prompt §4) — resolves the §5 numerology placeholder + records THREE Sid/home-owned open items

**Pythagorean letter values (prompt §4):** `1=A J S · 2=B K T · 3=C L U · 4=D M V · 5=E N W · 6=F O X · 7=G P Y · 8=H Q Z · 9=I R`. (Matches code `nameNumerology.ts:7-10`.)
**Chaldean letter values (prompt §4):** `1=A I J Q Y · 2=B K R · 3=C G L S · 4=D M T · 5=E H N X · 6=U V W · 7=O Z · 8=F P` (**no 9**). — **net-new** (code has only Pythagorean today).
**Rules (prompt §4):** reduce to single digit but **preserve master 11/22** at any intermediate total (report as "11 (master), resolving to 2"). Life Path = reduce month/day/year separately then sum+reduce (master birthday like 22 kept whole). **Birthday Number** = day of month. Expression = all letters (Pyth); Soul Urge = vowels; Personality = consonants; **verify Soul Urge + Personality = Expression**. Maturity = Life Path + Expression, reduced. **Vedic Mulank** = birth-day reduced; **Bhagyank** = all DOB digits reduced (planet map: 1 Sun/2 Moon/3 Jupiter/4 Rahu/5 Mercury/6 Venus/7 Ketu/8 Saturn/9 Mars). **Chaldean** full-name compound + reduced (first-name compound when master/fortunate; never fear-framed compound lore). Current name (if provided) = Pythagorean expression of used name. **Personal Years** for current + next two calendar years (birth-month + birth-day + universal-year, each reduced, masters preserved).
**Presentation (prompt §4):** short narrative paragraph → **four-column table (Number · Value · Classical Meaning · Where the Chart Agrees)** → personal-years paragraph mapping 9/1/master years onto the dasha clock's gates → plain-terms box. Every "Where the Chart Agrees" cell must reference a REAL computed feature of this subject's chart.

**THREE things recorded here — NONE resolved in this docs step (Sid + home chat own them):**
- **(i) Y-rule THREE-WAY conflict.** Prompt §4 (line ~114) = **contextual-Y** ("Y counts as a vowel when it is the only vowel sound in its syllable, otherwise as a consonant"); **D1** (Sid, 2026-07-16) = **always-vowel, project-wide**; **code** = **always-consonant** (`nameNumerology.ts:13` `VOWELS={a,e,i,o,u}`, comment `:33` "Y is treated as consonant for simplicity", Y-value 7 `:10`). Flagged inline at §5/§12-D1; already in `sid-signoff.md` S-R9 (D1) + `build-27-caveats.md` R9 §.
- **(ii) CONTRADICTION with Mode B / D1 (12c-audit finding C).** The committed prompt tells the model to **SELF-COMPUTE** numerology — §4 "Compute from SUBJECT_NAME_AT_BIRTH exactly as spelled" (~:106), QA §10.2 "Compute numerology and verify…" (~:232) — and provides **NO NUMEROLOGY_JSON injection slot** (the prompt's only injected payload is `ASTRONOMY_JSON`, §3 Mode B). This **directly conflicts** with Mode B ("model never does arithmetic") and D1 ("compute once in the shared util, INJECT, so the report and the Numerology tab cannot diverge"). **Recorded as an OPEN GAP** in §5 + §12-D1.
- **(iii) The Sid-gated prompt reconciliation this implies** (a flagged PREREQUISITE — do NOT perform it here; it edits the confidential prompt): (1) add a **`NUMEROLOGY_JSON` injection block** mirroring the existing `ASTRONOMY_JSON` Mode-B pattern; (2) change the numerology section from "compute" to **"present + interpret the injected values, do not recompute"**; (3) reconcile the contextual-Y wording to **always-vowel** (or remove the Y-rule prose, since the model would no longer compute). **This reconciliation is a DEPENDENCY of charter step 5** (§14).

### E. Palette / type / 3 image specs (prompt §8) — resolves the §8 format placeholders + folds the spike B1 findings

**Palette (prompt §8):** INDIGO **`#2D2A6E`** (H1, chart lines, table headers) · GOLD **`#B8963E`** (H2, accents, page header) · INK **`#1A1A2E`** (body) · CREAM **`#F6F1E3`** (callout fill) · LTGRAY **`#EDEBF5`** (alternating table rows).
**Type (prompt §8):** **Georgia throughout.** Body 11pt justified, line-spacing ~1.15, space-after ~8pt. H1 16pt bold indigo. H2 13pt bold gold. Table header: indigo fill, white bold 10pt. Cells 9.5pt, alternating white/LTGRAY. Total table width 9360 DXA. Callout ("In plain terms:"): cream fill, gold left border size 18, indent 200 DXA, bold-gold prefix + italic-ink body. Page header right-aligned gold bold 8pt `REVELIA · The Complete Reading · {name}`. Footer centered gray 8pt `For insight and entertainment · Not medical, legal, or financial advice · Page {n}`.
**3 images (prompt §8 "Images"):** (1) **North Indian Vedic chart** ~500×525 (fixed diamond, indigo lw 2-3, house 1 top-center CCW, gold sign numbers, planet abbrevs+degree-min, caption "Rasi Chart (D1) · Sidereal, Lahiri · Whole Sign · {Lagna} Lagna"); (2) **Western wheel** ~510×520 (three concentric circles, 12 spokes, gold sign names at r0.93 CCW from Asc at 9 o'clock, planet labels at ~r0.68 white boxes, red Asc line, red dashed MC line, caption "Western Natal Wheel · Tropical · Whole Sign Houses · {Sign} Rising"); (3) **Dasha timeline** ~660×296 two stacked panels (top: full MD bar segmented by era + red NOW line; bottom: zoom of relevant MD's antardashās, signature AD in gold, red NOW).
**Spike B1 findings folded (supersede the §8 "dpi 200 PNG" line):** (1) emit charts as **VECTOR (matplotlib→SVG)** not raster PNG — the sample's charts are vector (0 raster xobjects); (2) the render container **MUST install + embed Georgia** (or a licensed metric-compatible substitute) — the shipped sample fell back to base-14; a build-time Dockerfile config item; (3) MC-placement convention (RAMC-based MC vs sample's top-anchored MC line) to lock at build — orthogonal to render fidelity.

### F. Child rules (prompt §7) — captured for DEFERRED Phase D (v1 is self-only; do NOT build)

Prompt §7 "CHILD RULES (SUBJECT_TYPE = child), all mandatory": purpose statement in How-to-Read (temperament/learning/rhythms/timing; **excludes romance beyond one adult-era line, fear-framed health, destiny verdicts**; "the child authors the life"); **Part IV domains become A. Mind/Temperament/How He-She Learns · B. Education Timeline + Aptitude Lanes (honestly ranked) · C. Health & Vitality (gentle, parent-facing) · D. Family/Roots**; at most one sentence about adult partnership; aptitude lanes are tendencies ("expects to be pleasantly wrong wherever the child decides otherwise"). Age-from-DOB → `SUBJECT_TYPE=child` (D4). **DEFERRED to Phase D (end of internal testing); v1 self-only, adult accounts — do NOT build.** Alongside it: the prompt's **face/samudrika layer (§6) is HARD-excluded for v1** and **never returns in the self-path** (face-free, Play Store).

---

## 1. Goal & thesis

**Goal.** A flagship **paid, long-form PDF reading (18–26 pages)** generated by **Fable 5** from Sid's confidential prompt, combining **Western (tropical) + Vedic (sidereal) astrology, the full birth chart + transits, numerology, and palm (self only)**. Delivered three ways per generation: an **emailed secure download link**, an **in-app PDF results page** (highlights first, full PDF below), and a **native share** button. **One generation per month** for paid users (shared self-or-other credit, no rollover); a **fixed static sample** for everyone. **NO face reading** anywhere (Play Store reclassification risk), **no third-party palm** (BIPA), **Timing Engine out of scope** (the prompt excludes it — this is why R9 ships independent of R7).

**Thesis.** This is the premium expression of the multi-modal moat — the depth artifact a generic app can't produce — and the **"generate for someone else"** path is the deliberate virality mechanic.

> **⚠️ v1 SCOPE SPLIT (D4 RESOLVED, §12).** **v1 ships "generate for YOURSELF" only.** The **"generate for someone else"** path (typed third-party data, minors via `SUBJECT_TYPE=child`, no third-party palm) is **fully designed + turn-on-ready in this plan** but **DEFERRED to a phase at the end of internal testing** (§9). It is cleanly additive — the pipeline is subject-agnostic; enabling it later is inputs + the child-rule branch + the chooser UI, no re-architecture. Face stays excluded (Play Store); third-party palm stays excluded (BIPA).

```
TODAY                                           AFTER R9
Readings = synchronous LLM→JSON→in-app.          POST /api/reports (async) → job(queued/generating/
No PDF/docx/chart generation anywhere.             ready/failed) → Fable 5 writes interp. from injected
No async jobs; only node-cron push ticks.          ASTRONOMY_JSON+NUMEROLOGY_JSON → controlled PDF render
Astronomy = tropical / Placidus / single-moment.   (+3 charts) → QA gate → store PDF + secure link →
R2 serves public image URLs; no PDF storage.       email + push + in-app results page + share.
SendGrid: OTP/welcome only; Export-Data stub.     Astronomy = tropical + Lahiri sidereal, whole-sign,
                                                    dasha ladder, ingress tables, sade sati, returns,
                                                    panchanga, D9, dignities/yogas (net-new, isolated
                                                    sidereal engine module R7 later reuses).
```

---

## 2. Current state (verified) + what R9 inherits vs what is net-new

Every fact verified read-only (file:line). Where a fact is not in the repo it is written **"verify X."**

### What R9 INHERITS (reuse, don't re-derive)

| Seam | Where | R9 reuse |
|---|---|---|
| **Astronomy engine** | `astrology.service.ts` — `computeNatalChart` (`:269`), `computeNatalChartFromBirthData` (`:348`), primitives `computePositions(jd)` (`:206`) / `toJulianDayUT` (`:172`) / `houses_ex` (`:283`); `sweph` Moshier (`:32-36`), no `.se1`. | Compose the primitives for the **sidereal** natal + dasha + moment/ingress computations (isolated module, §5). Stored tropical `UserProfile.natalChart` stays untouched (persisted, consumed by R1–R6/mobile). |
| **Fable 5 → Opus 4.8 routing** | `synthesis-routing.ts` — `createSynthesisMessage({surface, prompt, maxTokens, image?})`, `FABLE_MODEL`/`FABLE_FALLBACK`/`SYNTHESIS_FABLE_ENABLED`, streams `.finalMessage()` with `betas:['server-side-fallback-2026-06-01']` + `fallbacks:[{model:'claude-opus-4-8'}]` + refusal-checked-before-content. | The report generation call is a **new marquee `SynthesisSurface`** (`report`, Fable 5 → Opus 4.8, high effort). Reuses the `fable` tier + `fallbacks` wiring unchanged. ⚠️ Long output (per-section JSON) → stream server-side; see §3. **verify** whether the current helper's per-surface `max_tokens` ceiling suffices for a full report payload or needs raising. |
| **Numerology util + cache** | `utils/numerology.ts` (`reduceToSingleDigit` `:72`, `getLifePathNumber` `:99`, `getPersonalYear/Month`), `utils/nameNumerology.ts` (`computeNameNumbers` trio `:66`), `services/numerology.service.ts` (`ensureProfileNumerology`, `planNumerologyUpdate`), cached sub-doc `UserProfile.numerology` (`numerologySchema` `UserProfile.ts:452`; `NumerologyNumbers` `shared.ts:661`), `NUMEROLOGY_VERSION='1.0.0'` (`numerology.ts:11`), `backfill-numerology.ts`. | **Compute numerology once via the util and INJECT it** into the report (spec §5) so the report and the app's Numerology tab can never diverge. Requires the util to gain the report's fields + the Y-rule change (§5, D1). |
| **Palm trait layer (self)** | `UserProfile` — `images.palmDominant/palmNonDominant {url,uploadedAt}` (`:79-82,553-559`), `palmDominant/NonDominantFeatures` (`HandFeatureVector`), `palmDominant/NonDominantTraits` (`PalmTrait[]`), `palmProfileResult` (`{palmType,lifeTheme,naturalTalents,sourceTraits,energyType}` `:428,585`). Read precedent: `insight.service.ts:201-275` (prefers structured layer, falls back to legacy blob). | Self path pulls `palmProfileResult` + `palmDominantTraits` (+ non-dominant if premium — `UserProfile.ts:115`) as the prompt's `PALM_OBSERVATIONS` structure. **No re-upload, no re-detect.** |
| **Tier resolution** | `getEffectiveTier(user)` `subscriptionTier.ts:50` (returns free/premium/premium_plus; comp only upgrades; lazy expiry, no cron; `TIER_RANK`). Tiers confirmed free/premium/premium_plus, **no lifetime** (`User.ts:164`, `webhook.service.ts:39-42`). | The report gate calls `getEffectiveTier`. |
| **1/month credit pattern (doc-counting, no counter/cron)** | `reading.controller.ts` — `getCurrentMonthRange()` (`:228-233`) + `NameAnalysis.countDocuments({userId, generatedAt:{$gte,$lt}})` (`:245/286/324`) → block when `>=1` (403, `:329-336`); `resetsOn=end`. Career mirrors it (`:513-520`). | The report credit = **doc-counting against the new `Report` collection's `generatedAt`.** This gives *no rollover*, *shared self-or-other* (count all report docs regardless of subject), and *deduct-only-on-success* (the doc is written post-generation) **for free — no `user.qa` counter, no cron.** Simpler than R7's design. |
| **R2 storage client** | `r2.service.ts` — `S3Client` (`:11-20`), `uploadImage` (`:40-63`), **unused** `getSignedUrl(key, 3600)` (`:84-91`). Env `R2_*`. | Reuse the client; add a PDF upload path (non-jpeg content type, private key) + **wire the presigned-URL helper** for secure download links (§7). |
| **SendGrid core** | `email.service.ts` — `sendEmail` private (`:34-88`), env `SENDGRID_API_KEY`; senders OTP/reset/welcome. | Reuse `sendEmail`; add attachment support (or link-only email) + a `sendReportEmail` sender. **Gated on the D5 SendGrid fix** (§7). |
| **OneSignal push helper** | `pushScheduler.ts sendOneSignalPush(userId, headings, contents, name, data?)` (`:17-42`) — POST `https://api.onesignal.com/notifications`, `Authorization: Key ${ONESIGNAL_REST_API_KEY}`, `include_aliases.external_id`, `name` = idempotency key, `data` = deep link. Per-user `lastXPushSentAt` dedup on `User.ts:79-81,226-228`. Mobile `lib/onesignal.ts` (`loginOneSignalUser`/`logoutOneSignalUser`). | The 7 campaigns (§ push) reuse `sendOneSignalPush` verbatim; add per-campaign `lastReport*PushSentAt` fields + event-triggered calls (launch/sample-viewed/delivery-confirmation) or cron ticks (nudges). |
| **Shared-types dual-home** | `packages/shared/types.ts` (`@shared/types`, mobile) hand-copied into `server/src/types/shared.ts` (Railway self-contained). `CompatibilityReading` (`:756-774`) = the best precedent for a typed *other-subject* (`partnerName`, `partnerBirthData{date,sunSign?,lifePathNumber?}`, `partnerBirthTime?`, `partnerBirthPlace?`). `BirthData` (`:105-113`), `BirthLocation` (`:94-103`). Model precedent: `CareerDestiny.ts:21-50` (per-user generated-output doc: `userId`, `inputData{}` snapshot, output block, `generatedAt`). Self birth data: `UserProfile.birthData` (`IBirthData` `UserProfile.ts:43-48`). | The `Report` DTO goes in **both** type files; the `Report` model mirrors `CareerDestiny`; the someone-else typed-subject block mirrors `CompatibilityReading.partner*`. |

### What is NET-NEW (nothing to reuse — verified absent)

- **The whole document pipeline:** PDF renderer + 3 charts + a section template; a **durable async job** model/worker with `queued/generating/ready/failed`; **PDF storage** (non-image R2 key namespace) + **presigned secure links** actually used; **email attachment / link delivery** (SendGrid `attachments` net-new).
- **~10 astronomy derivations** (sidereal natal, tropical+sidereal whole-sign, dasha ladder, ingress tables, sade sati, returns, panchanga, D9, dignities, yogas) in an **isolated sidereal engine module** (R7 later reuses it).
- **A `report` credit pool** (doc-counting `Report` collection) + the report gate.
- **Numerology report fields** (Chaldean, Vedic Mulank/Bhagyank, birthday number, personal-year series) — all absent (§5, D1).
- **Mobile:** the report **rows/cards** in both tabs, a **NEW badge** + **indigo** color token (neither exists — `colors.ts` has gold `#F59E0B` but no indigo; no NEW-badge component), a **results page** (highlights + embedded PDF viewer + share), and **report history**. `expo`-based PDF viewing/sharing to **verify** (share via `react-native-share` exists per CLAUDE.md; PDF display component to confirm).
- **The confidential generation prompt** — ✅ committed at `server/src/prompts/Revelia_Complete_Reading_Generation_Prompt_v1.md` (D8 ✅), read bundled (not read by this planning pass → "verify against the prompt" at build).

### Verdict — R9 is the largest, most cross-cutting Build-27 requirement

R1–R4 were extraction/data; R5 prompt+routing; R6 a woven delta; R7 a new endpoint + compute engine + chat UI. **R9 is a new async pipeline + a new document renderer + a new astronomy sub-engine + new durable storage + a new delivery triple + a new mobile surface + a paid credit pool — and it gates a currently-broken shared dependency (SendGrid).** The empirical grounding (R1/R3/R4/R5) is reused; almost everything else is built.

---

## 3. Target architecture (the §4 pipeline, Mode B)

```
MOBILE                                    SERVER
Astrology tab row + Explore(hub) card  →  (discovery; free = sample only, Generate locked → paywall)
  │ paid taps "Generate Reading"
  ▼ choose SELF or SOMEONE-ELSE
POST /api/reports  {subject:'self'|'other', other?{name,dob,tob?,pob?}}
  │  auth bearer; getEffectiveTier gate (free → 403/upgrade); credit check (doc-count, §6)
  ▼
[enqueue]  create Report{status:'queued'}  → return {reportId, status} immediately (NOT synchronous)
  ▼  WORKER picks up the job (net-new; see "Job runner" below)
[1] RESOLVE INPUTS
      self  → UserProfile.birthData + palmProfileResult/palmDominantTraits (+non-dom if premium)
      other → typed name/DOB/TOB/POB; NO palm (BIPA); geocode POB server-side (existing geocoder)
      derive SUBJECT_TYPE = child if DOB < 18y (D4) → prompt's child rules; else adult
[2] COMPUTE (deterministic, backend)  status:'generating'
      ASTRONOMY_JSON  ← isolated sidereal engine module (§5): tropical + Lahiri sidereal natal,
                        whole-sign (both), dasha LADDER (MD+AD), ingress tables, sade sati, returns,
                        panchanga, D9, dignities/yogas   [set_sid_mode lifecycle owned + reset]
      NUMEROLOGY_JSON ← numerology util (compute-once-and-inject; Y-as-vowel per D1)
      PALM_OBSERVATIONS ← stored trait layer (self only)
[3] FABLE 5 WRITES INTERPRETATION (no arithmetic)
      createSynthesisMessage(surface:'report', prompt = confidential prompt + injected JSON blocks,
        Fable 5 → Opus 4.8, effort high, streamed server-side)  → per-section interpretive JSON
      refusal handled before content (fallbacks auto-recovers policy declines; final-chain refusal → job 'failed', NO credit)
[4] RENDER (controlled template)
      section template + injected computed tables + 3 charts (SVG/PNG) → PDF   (Mode B render)
[5] QA GATE (§8) — page count 18–26 · all Parts/Appendices present · ZERO em/en dashes ·
      images embedded · PDF opens/parses.   FAIL → repair-or-regenerate; still fail → status:'failed', NO credit
[6] STORE + DELIVER (only on QA PASS)  status:'ready'; deduct credit (write generatedAt)
      PDF → R2 (private key) → presigned secure link
      highlights payload persisted for the results page
      DELIVERY TRIPLE: sendReportEmail(secure link) + OneSignal delivery-confirmation push +
        in-app results page (highlights first, PDF below) + native share
  ▼
MOBILE  polls/receives push → results page (highlights + PDF viewer + share) + report history
```

**Scope note (D4).** The pipeline above is drawn subject-agnostic (the full design). **v1 wires the `self` branch live only**; the `other` / `SUBJECT_TYPE=child` branch (the boxed `other →` line + the age-derive) is built behind a flag and **turned on in the deferred phase at the end of internal testing** (§9) — no re-architecture, since compute/render/deliver are subject-independent.

**Job runner (net-new, deliberately minimal — no queue library).** There is no BullMQ/Redis and adding one is a big infra step for a **1/month/paid-user** feature. Recommended v1: a **DB-backed job** = the `Report` row itself is the job record (`status` field), claimed and advanced by a **worker driven by the existing `node-cron` in `pushScheduler.ts`** (a new tick that scans `status:'queued'`, claims one atomically via `findOneAndUpdate({status:'queued'}→'generating')`, runs the pipeline, sets `ready`/`failed`), with a module-boolean concurrency guard exactly like the existing daily/re-engagement ticks. This reuses the only scheduling primitive present, needs no new dependency, and the low volume makes a heavyweight queue unjustified. **verify** at build time whether Railway's single instance + this cron-claim model is sufficient, or whether a light queue (`bee-queue`/BullMQ) is warranted once concurrency/observability matters — recorded as a caveat, not a v1 blocker. (Alternative considered: run generation inline in the request with a long timeout — rejected; minutes-long Fable turns + the render step would hit HTTP/idle timeouts, per R5.)

**Streaming.** Fable 5 report generation streams **server-side** (`.finalMessage()`) to avoid idle-connection drops on the minute-long turn; the client never holds the connection (it polls the job / receives the push). Same posture R5/R7 use.

---

## 4. Key decisions

> ⚠️ These are the *architecture* decisions this plan RESOLVES on recommendation (Amey/eng-owned, buildable now). The *product/owner* decisions the plan must **NOT** resolve (D1–D8) are restated verbatim in §12.

| Decision | Recommendation | Why / caveat |
|---|---|---|
| **Mode A vs Mode B (the §4 spike)** | **Mode B** — backend computes astronomy+numerology, Fable 5 writes interpretation from injected JSON, controlled server-side renderer builds the PDF + charts + runs the QA gate. | Only Mode B satisfies the QA gates (page count / section presence / zero em-dash / embedded images) + PDF delivery + keeps the model out of arithmetic (the prompt insists on this). Mode A (code-execution) can't deliver a PDF end-to-end (produces docx; no LibreOffice; no internet) and its pyswisseph leg is unproven. Even if the Phase-0 probe passes, the render stays Mode B. (§0) |
| **Astronomy: Node vs code-execution** | **Compute in Node** (isolated sidereal engine module extending R1's primitives). | One language, one deploy, reuses `computePositions`/`toJulianDayUT`/`houses_ex`, and R7 reuses the module later. Cost: ~10 net-new derivations (§5) — the biggest astronomy build in the app. The Phase-0 probe could offload this to code-execution+pyswisseph *if* it passes, but that's an optimization; do not gate the plan on it. |
| **Data injection vs model-compute** | **Compute once (astronomy in Node, numerology in the R4 util) and INJECT** as validated JSON blocks; Fable 5 authors interpretation only. | Guarantees the report and the app's Numerology/Astrology surfaces can never disagree (spec §5), and keeps arithmetic deterministic + testable. Mirrors R6's "engine decides, model phrases." |
| **Document render path (sub-decision "D-render")** | **HTML template → headless-Chrome (Puppeteer/Playwright) → PDF**, charts as inline SVG; **`@react-pdf/renderer` is the lighter fallback** if the Chromium weight on Railway proves too heavy. | HTML→Chrome gives the best control over pagination (18–26pp), embedded images, and typography matching the sample; the cost is a Chromium binary on Railway (cold-start/memory). react-pdf is pure-JS (no browser) but pagination control is harder. **Run a small render spike** on the sample's layout before committing. The "docx opens" QA line in Sid's prompt is a **Mode-A artifact**; in Mode B the equivalent gate is "**PDF opens + renders all pages**." |
| **Credit pool (D3 ✅ RESOLVED)** | **Doc-counting against the new `Report` collection's `generatedAt`** (mirror `NameAnalysis`, not R7's `user.qa` counter). | **Calendar-month boundary (1st, UTC), no rollover, one shared self-or-other pool** (D3). Doc-counting resets implicitly at the 1st-of-month UTC boundary → **no new cron** (or the `0 0 1 * *` UTC cron if an explicit refill is wanted); deduct-only-on-success for free (the doc is written only after a QA-passed `ready` report → a failed job never consumes the credit, spec §6). No subscription-renewal alignment. |
| **Subject scope + child handling (D4 ✅ RESOLVED — scope split)** | **v1 = SELF only.** The `other` path (typed third-party data; minors via `SUBJECT_TYPE=child`; **no third-party palm**) is designed + turn-on-ready but **deferred to end of internal testing** (§9). Age-from-DOB → child rules is designed now, wired at turn-on. | The prompt already has responsible child rules (Mind/Temperament/Learning, gentle health, no romantic/fear content, face auto-skipped — verify against the prompt). Never produce sexualized/fear-based content about a minor. Applies to someone-else AND a self report whose DOB implies a minor. Face stays excluded (Play Store); third-party palm stays excluded (BIPA). |
| **Job runner** | DB-backed `Report`-as-job, advanced by a new `node-cron` tick with an atomic claim + module-boolean guard (no queue library for v1). | Reuses the only scheduling primitive; low volume. Revisit a real queue if concurrency/observability grows (caveat). |
| **Confidential-config home (D8 ✅ RESOLVED)** | **Generation prompt → committed to this private, org-only repo** as a server-side file (read **bundled** — no Railway runtime-load problem; out of the client bundle). **Sample PDF → R2** (public object, not git). | Split by sensitivity: the prompt is INTERNAL but repo-committable (org-only access); the sample is a public asset shown to all. The **R7 Timing-Engine rule set** is tighter (stays OUT of git → a private-R2 `loadConfidentialConfig` loader R7 inherits). §12 D8. |

---

## 5. Data sources (reuse, don't rebuild)

### Astronomy — the isolated sidereal engine module (net-new, R7 reuses it)

Extend the R1 engine **without mutating the tropical natal path.** A new module (e.g. `astrology-sidereal.service.ts` / a `vedic/` folder) that:
- owns the `swe.set_sid_mode(SE_SIDM_LAHIRI, 0, 0)` lifecycle (set-then-reset around each sidereal computation, or a dedicated code path) — **process-global hazard** (`astrology.service.ts` shared instance; §0);
- composes `computePositions(jd)` / `toJulianDayUT` / `houses_ex('W')` for: **sidereal natal** (Lahiri, whole-sign, **mean** node — `SE_TRUE_NODE → SE_MEAN_NODE`, speed on);
- derives, as pure arithmetic off those positions: **Vimshottari dasha LADDER** (all mahādashās, each with antardashā sub-periods; 120-year sequence on 365.25-day years, off the sidereal Moon nakshatra), **navamsa (D9)**, **panchanga** (tithi/nakshatra/yoga/karana/vara), **dignities** (exalt/debil/own tables) + **yogas** (rule-based detection);
- scans positions over time for the **transit ingress tables** (Saturn ~30y, selected Jupiter, Rahu) + **Sade Sati** (Saturn over natal Moon ±one sign) + **planetary returns** (Saturn/Jupiter) — a date-solver loop over `computePositions`, since `computeTransits` is single-date/UTC-noon/no-location (`astrology.service.ts:393-414`);
- produces **tropical + sidereal whole-sign** overlays for the "both zodiacs" Western+Vedic requirement.

Output = a validated `ASTRONOMY_JSON` block injected into the prompt. Cache the per-subject sidereal artifact alongside the report record (it's deterministic from birth data). ⚠️ **Add a regression check** that a tropical natal computed *after* a sidereal report equals one computed before (the set_sid_mode guard). ✅ **Fixed settings RESOLVED — folded from prompt §3 in §0.2.C** (Lahiri sidereal; whole-sign `'W'` BOTH zodiacs; mean-node primary + true-node footnoted; Moshier+`FLG_SPEED`; Vimshottari 365.25d; nakshatra/pada, D9, dignities/yogas, panchanga, dasha ladder, ingress/Sade-Sati/returns). The four concrete deltas vs R1's shipped engine (Placidus↔whole-sign · true↔mean node · missing sidereal/nakshatra/D9/dasha/panchanga/dignities · tropical-aspect↔sidereal-ingress) are the step-1 build surface — see §0.2.C table + §14 step 1.

### Numerology — compute once and INJECT (spec §5; D1)

The report needs the Pythagorean core (life path + expression/soul-urge/personality — **present**, `nameNumerology.ts`/`numerology.ts`) **plus net-new fields**: **Chaldean** numbers, **Vedic Mulank/Bhagyank**, **birthday number**, **personal-year series** — all **absent** today (only Pythagorean `LETTER_VALUES` `nameNumerology.ts:7`; single current-year `getPersonalYear` `numerology.ts:124`). Add these to the shared util (reuse `reduceToSingleDigit` `:72`), compute once, and inject `NUMEROLOGY_JSON` so the report can't diverge from the Numerology tab. ✅ **Exact tables + rules + presentation RESOLVED — folded from prompt §4 in §0.2.D** (Pythagorean + Chaldean letter maps, Mulank/Bhagyank planet map, master 11/22, birthday number, personal-year series; presentation = narrative → four-column table [Number·Value·Classical Meaning·Where the Chart Agrees] → personal-years paragraph → plain-terms box).

⚠️ **OPEN GAP — the committed prompt SELF-COMPUTES numerology; there is NO `NUMEROLOGY_JSON` slot (12c-audit finding C).** Prompt §4 ("Compute from SUBJECT_NAME_AT_BIRTH exactly as spelled" ~:106) + QA §10.2 ("Compute numerology and verify…" ~:232) instruct the model to do the arithmetic itself, and the prompt's ONLY injected payload is `ASTRONOMY_JSON` (§3 Mode B) — no numerology injection block exists. This **contradicts Mode B** ("model never does arithmetic") **and D1** ("compute once, INJECT, so report and Numerology tab cannot diverge"). **Resolution is Sid-gated (a prompt edit), recorded as a DEPENDENCY of charter step 5** (§14): add a `NUMEROLOGY_JSON` injection block mirroring `ASTRONOMY_JSON`, change the numerology section from "compute" to "present + interpret injected values, do not recompute", and reconcile the contextual-Y wording to always-vowel (or drop the Y prose). See §0.2.D(ii)/(iii) + §12-D1.

⚠️ **The Y-rule change (D1) is a project-wide migration, shared with R7 — restate not resolve (§12).** Verified current state: **Y is still a CONSONANT** — `VOWELS = new Set(['a','e','i','o','u'])` (`nameNumerology.ts:13`), comment "Y is treated as consonant for simplicity" (`:34`), Y value 7 (`:10`). Sid's 2026-07-16 decision (per `session_handoff.md`) is **Y always a vowel, project-wide.** Implementation when built: add `'y'` to the single `VOWELS` set → flips soul-urge/personality everywhere → **bump `NUMEROLOGY_VERSION`** (`numerology.ts:11`; the backfill `backfill-numerology.ts` is already version-aware — a mismatch forces recompute, `numerology.service.ts:185-192`) → re-run `backfill:numerology`. **User-visible:** soul-urge/personality shift for some existing Y-name users across Complete Reading, Name Destiny, Career, insights, compatibility, AND R9. R9 must **consume the post-migration util** — do NOT fork a Y-rule for the report. Recorded as a caveat (§ caveats) and an open-items row (§ sign-off).

### Palm (self only) — stored trait layer (spec §5)

Pull `palmProfileResult.{palmType,lifeTheme,naturalTalents,energyType}` + `palmDominantTraits[].{trait,band,description}` (+ `palmNonDominantTraits` if premium — non-dominant is premium-only, `UserProfile.ts:115`) as the prompt's `PALM_OBSERVATIONS` structure (precedent `insight.service.ts:201-275`; the prompt's §5 observation schema = HAND_TYPE/THUMB/FINGERS/HEART_LINE/HEAD_LINE/LIFE_LINE/FATE_LINE/LINE_DENSITY/LEFT_VS_RIGHT/RINGS_OR_MARKS). **No third-party palm** (someone-else = astrology + numerology only). ✅ **Prompt §5 hard rules folded (§0.2 ref):** claim only majors/mounts/finger-architecture/left-right (fine markings never claimed); open with the hedging sentence; every palm observation cross-references one computed chart feature ("the palm agreeing with the clock", never independent proof); the **biometric process-and-delete line is mandatory in Appendix D** (prompt §5). Palm photos already store in R2; the report references the stored trait layer, not fresh pixels.

---

## 6. Data model, credit pool & persistence

### `Report` record (net-new model — mirror `CareerDestiny.ts:21-50`)

Per generation, indexed by `userId`:
- `userId`, `subject: 'self' | 'other'`, `subjectType: 'adult' | 'child'` (derived from DOB, D4);
- **other** subjects: typed `{ name, dob, tob?, pob? }` (mirror `CompatibilityReading.partner*` `shared.ts:756-774`); self reads stored `UserProfile.birthData`;
- `status: 'queued' | 'generating' | 'ready' | 'failed'` (+ `failureReason?`), `attempts`;
- `model`, `usage`, `costEstimate` (log per-report cost + duration from day one — spec §4);
- `pdfKey` (R2 private key), `secureLink` (+ `linkExpiresAt`), `highlights` (payload for the results page);
- `generatedAt` (written only when a QA-passed report becomes `ready`) — the **completion stamp** for the results page + analytics; **NOT** the credit-count field (see the credit pool below). `createdAt`/`updatedAt` (via `timestamps` — `createdAt` = the enqueue time that IS the credit bucket). Optional `feedback`.

### Credit pool (doc-counting — no counter, no cron)

`getEffectiveTier(user)` gates entry (free → locked → paywall). **Credit = RESERVE-AT-ENQUEUE (async-safe):** remaining = `tierLimit − Report.countDocuments({ userId, status: {$ne:'failed'}, createdAt: {$gte: monthStart, $lt: monthEnd} })` via `getCurrentMonthRange()` (mirror `reading.controller.ts:228`). The `Report` doc is created at **enqueue** as `queued`, so it counts **immediately** — reserving the credit and blocking a concurrent double-enqueue (two fast taps / a retry) on the single-instance backend. A terminally-**`failed`** report is **excluded** from the count (credit refunded); a stale `generating` is timed-out → `failed` by the worker (§14 step 4), which refunds it. **`generatedAt` plays NO role in the count** (it is the completion stamp). One shared pool covers self **or** other (subject-agnostic; v1 only self docs exist, so the deferred other-path drops in). **Reset = calendar-month boundary (1st, UTC), no rollover (D3 ✅)** — implicit via the `createdAt` month-range query, **no cron** (or `0 0 1 * *` UTC for an explicit refill); no subscription-renewal alignment. ⚠️ **This reserve-at-enqueue model (from §14 step 3/4) SUPERSEDES the earlier `generatedAt`/ready-only wording**, which had a concurrent-double-enqueue hole (both taps see 0 `ready` → both generate → 2 reports + ~2× Fable cost on a 1/month credit).

### Sample asset

One **static pre-generated** Monty Adams PDF served to **every** user on first open — never generated on the fly, never a per-user teaser. **Hosting RESOLVED (D8): R2 as a plain public object** (like images — it's shown to all incl. free, not a paid per-user report; kept out of git). A local gitignored copy is the render-spike fidelity target. The sample PDF is the fidelity reference for the QA gate ("indistinguishable from this").

### Shared types

Add a `Report` DTO (subject, subjectType, status, pdfSecureLink, highlights, timestamps — the mobile-read fields only) to **both** `packages/shared/types.ts` and `server/src/types/shared.ts`. Server-only computed types (`ASTRONOMY_JSON`, the engine internals) stay server-side (never a DTO). Third-party typed birth inputs are stored on the report record; note the **privacy retention** of a named third party's birth data in the privacy posture (spec §8/§10).

---

## 7. Delivery (all three, every generation) + the SendGrid gate

- **Email (secure link) — the delivery seam is built IN Phase A (D5 ✅ REFRAMED — not a broken-integration fix).** The seam = a `sendReportEmail` wrapper around `email.service.ts` that emails the **presigned secure link** (not the 18–26pp attachment — SendGrid attachment ceilings + size). This is first-class R9 infra, not a "fix the broken SendGrid" pre-ship gate. **Export-My-Data (R8) completion is a FAST-FOLLOW that reuses this same seam** (it currently never calls the email layer, `account.controller.ts:32-57`). `EmailOptions` may still gain an `attachments` field for R8, but R9 uses link-email. Verify `SENDGRID_API_KEY` on Railway.
- **In-app results page** — highlights first, full PDF viewable below; native share button on the same page.
- **Share** — native share sheet. **verify** the PDF-share path reuses the existing `react-native-share` + the `shareReadingCard` boolean-gate / `failOnCancel:false` / `isShareDismissal` discipline (CLAUDE.md "Reading share" gotcha) — do NOT reintroduce the Android cancel-cascade.
- **Storage + secure links (D7 ⏳ resolving)** — the delivery seam's storage half = a **buffer-upload path** (`uploadBuffer` for non-image content; `uploadImage` is jpeg-only, `r2.service.ts:55`) to R2 under a **private** key/path, served via the **presigned expiring link** (`getSignedUrl`, currently dead code `:84-91`, now wired with a TTL). ⏳ **The private R2 bucket is being provisioned by Sid** (D7); confirm the exact link-TTL policy at build.

### Push notifications (7 campaigns — spec §11)

Reuse `sendOneSignalPush` (`pushScheduler.ts:17-42`) verbatim; the 7 approved copies from Ani's spec §9 (launch, sample-viewed, mid-cycle nudge, credit-expiring, virality, delivery-confirmation, re-engagement) are used **verbatim** (copy is owner-supplied — do not rewrite). Event-triggered calls for launch / sample-viewed / delivery-confirmation; cron ticks (new `node-cron`) for mid-cycle nudge / credit-expiring / re-engagement; add per-campaign `lastReport*PushSentAt` dedup fields on `User` (pattern `User.ts:79-81,226-228`); `name` = idempotency key; `data:{screen:'cosmic-report', reportId}` deep link. **verify** the OneSignal env/wiring end-to-end (`ONESIGNAL_REST_API_KEY`, FCM already configured per CLAUDE.md).

---

## 8. Generation QA gates (enforce BEFORE `ready` + before the credit is spent)

The report is marked `ready` (and the credit deducted) **only** after a deterministic post-render gate passes (spec §4). From the spec:
- **Page count 18–26** (render-measured);
- **every Part / Appendix present** — a section-manifest check against the **FACE-FREE fixed manifest folded in §0.2.A** (prompt §8 "Section order"): Cover → How to Read → Part I–VII (Part VII = Numbers → Hand → Convergence Verdict, **no Face**) → Appendix A–D. Do NOT expect (or "restore") the prompt's §6 Face section — it is deliberately omitted (§0.2.A EXCLUSION);
- **ZERO em-dashes AND en-dashes** — a deterministic scan for `—` (U+2014) **and** `–` (U+2013) across all rendered text; any hit → repair (replace per house style) or regenerate. (Spike B1: even the gold sample ships 0 em- but **2 en-dashes** → the scan must catch en-dashes too.);
- **ZERO face-derived content** — scan the rendered report for face/samudrika-face language and any `faceArchetype`/`faceTraits`-derived phrasing; correct result = zero. Belt-and-braces on the face exclusion (R2 face fields exist upstream in `UserInsightProfile`; the injected-payload allow-list must exclude them by construction — step 5);
- **images embedded** — the 3 charts (emitted as **VECTOR / SVG**, not dpi-200 raster — spike B1) + any glyphs render (not broken refs);
- **PDF opens / renders all pages** — the Mode-B equivalent of the prompt's "docx opens" gate (a Mode-A artifact);
- **disclosures present** — entertainment/insight disclaimer, biometric process-and-delete line (palm), no-face confirmation, relationship/health constrained-content (prompt §7/§8 Appendix D; exact strings folded in §0.2 + D6-style copy).

A gate FAIL → attempt a bounded repair/regenerate; persistent fail → `status:'failed'`, **no credit spent**, a graceful in-app message + (optionally) a re-engagement retry. Log the gate result + per-report cost/duration (mirror R5's `ai_generations` fire-and-forget logging).

---

## 9. Sequencing (Phase 0 spike → A pipeline → B Premium soft-launch + SendGrid → C all paid + push)

- **Phase 0 — spikes (before sizing Phase A commitments).**
  (a) the **code-execution / pyswisseph probe** (§0 — decides whether astronomy can offload; NOT a build-shape blocker);
  (b) a **render spike** on the sample layout (HTML→Chrome vs react-pdf; D-render);
  (c) the confidential prompt is committed at `server/src/prompts/` (D8 ✅ — read bundled); **upload the sample PDF to R2**, then read the prompt's exact section manifest + QA checklist + child rules.
- **Phase A — the pipeline, SELF path only (server, the bulk).** Isolated sidereal engine module + the ~10 derivations (§5) with the set_sid_mode regression guard → numerology report fields + the D1 Y-rule migration (shared with R7) → `Report` model + credit doc-counting (calendar-month, D3) + tier gate → the async job runner (cron-claim) with `queued/generating/ready/failed` → Fable 5 `report` surface (compute→inject→interpret) → the controlled renderer (+3 charts) → the QA gate → **the delivery seam** (`uploadBuffer` → private R2 key/TTL link → `sendReportEmail`, D5 — built here, reused by R8) → the static sample display → the mobile placement (both tabs) + results page + history. **The `other`/child branch is coded behind a flag but not turned on.** **Gate "report marked ready" on the QA checklist.**
- **Phase B — soft-launch to Premium (internal).** Verify fidelity vs the sample; exercise the full delivery triple end to end (the seam is already in Phase A); log per-report cost/latency (week-one, mirrors R7). Premium only, self path.
- **Phase C — open to all paid tiers + enable the push campaign** (7 copies), self path.
- **Phase D — turn on "generate for someone else" (END OF INTERNAL TESTING, D4).** Flip on the already-built `other` branch: the typed third-party inputs + chooser UI + `SUBJECT_TYPE=child` (age-from-DOB) rules; astronomy+numerology only, **no third-party palm**. Cleanly additive — no re-architecture (compute/render/deliver are subject-agnostic). Face stays excluded; third-party palm stays excluded.
- **Phase 0 prerequisite (D8 ✅ RESOLVED — now an action, not a blocker):** the confidential prompt is committed at `server/src/prompts/` (read bundled); **upload the sample PDF to R2** before Phase A is fully specified. This plan did not read the prompt → prompt-specific facts stay "verify against the prompt" until read at build.

---

## 10. Passing criteria

- [ ] **Spike reported before Phase A** — §0 recorded; Mode B confirmed; the pyswisseph probe + render spike results documented.
- [ ] **Report indistinguishable from the sample** — a real self run reproduces the sample's format/depth/typography (fidelity review against the Monty Adams PDF).
- [ ] **QA gates pass** — 18–26pp, all Parts/Appendices present, **zero em/en dashes**, 3 charts embedded, PDF opens; a report failing any gate is NOT marked ready and does NOT spend the credit.
- [ ] **Credit correctness** — paid sees "1 remaining this month"; a QA-passed report decrements it; a failed job does not; one shared pool covers self OR other; no rollover; calendar-month reset (D3).
- [ ] **Access model** — free sees the static sample only, "Generate" locked → paywall, no report ever generated for a free user; paid entry shows credit + View Sample + Generate; **v1 = self path works** (someone-else is the deferred phase, D4 — its acceptance = other=astrology+numerology, no palm, minors→child rules, verified at turn-on).
- [ ] **Delivery triple works** — emailed secure link arrives (post-SendGrid-fix), in-app results page (highlights + PDF), native share (no Android cancel-cascade).
- [ ] **Async lifecycle** — queued→generating→ready/failed reflected in the UI; no synchronous-request blocking; minutes-long Fable turn survives (server-side stream).
- [ ] **Per-report cost + latency logged** from day one.
- [ ] **Disclosures present** — entertainment, biometric process-and-delete, no-face, constrained relationship/health content.
- [ ] **No face anywhere; no third-party palm; Timing Engine absent.**
- [ ] **Numerology single-source** — the report consumes the post-D1-migration util (Y-as-vowel); report numbers equal the Numerology tab's for the same user.
- [ ] **Sidereal isolation** — a tropical natal computed after a sidereal report is byte-identical to one before (set_sid_mode guard); R1–R6 tropical charts unaffected.
- [ ] **`tsc --noEmit` clean** on mobile AND server; no regression in shipped features.

---

## 11. Risks / open questions

- **#1 — Generation-architecture feasibility (the biggest).** A net-new PDF+charts renderer, a net-new async job, ~10 net-new astronomy derivations, net-new durable PDF storage — all at once. The Phase-0 spikes de-risk render + astronomy-offload; the astronomy breadth (far beyond R7's moment chart) is the largest single sub-item. Mitigate by building/verifying the sidereal engine module against fixtures first (reuse R7's fixture discipline where the Monty Adams natal overlaps).
- **#2 — Fable 5 latency/cost.** The most expensive single generation in the app; minute-long turns (R5). Bounded by 1/month/paid-user; stream server-side; log cost/duration from day one; Fable 5 = $10/$50 per MTok (verify at build). `SYNTHESIS_FABLE_ENABLED` availability posture + `fallbacks` policy-decline layer apply (do not conflate — R5 invariant).
- **#3 — Delivery reliability (D5 ✅ reframed, no longer a blocking pre-ship "fix").** The delivery seam (buffer-upload + private-path/TTL link + `sendReportEmail`) is built in Phase A as first-class R9 infra; R8 (Export-My-Data) rides it later. Residual risk is ordinary: verify `SENDGRID_API_KEY` on Railway + link-TTL correctness. Recommend emailing the link, not the 18–26pp attachment.
- **#4 — Numerology divergence (D1).** Y-rule is still consonant in code; Sid's project-wide always-vowel decision requires a `NUMEROLOGY_VERSION` bump + backfill shared with R7. If R9 ships before the migration, the report would disagree with the (old) app numbers — so R9 must land the migration and consume the migrated util. Soul-urge/personality shift for some users (correctness fix; mirror R4's value-change note).
- **#5 — Page-count / format variance.** Fable 5 output length varies; the QA gate (18–26pp) may fail and need repair/regenerate. HTML→Chrome render gives the most pagination control; budget repair passes; the render spike calibrates.
- **#6 — Child-subject handling (D4 ✅ resolved via scope split).** Minors arrive only with the deferred "someone-else" phase (end of internal testing); v1 (self-only, adult accounts) sidesteps the surface. The child-rule branch (age-from-DOB → `SUBJECT_TYPE=child`, never romantic/fear content, face auto-skipped) is designed now and enforced end-to-end at turn-on. Residual risk lives in the deferred phase, not v1.
- **#7 — Confidential prompt + sample PDF not yet added (home RESOLVED, D8).** The prompt is committed at `server/src/prompts/` (read bundled — no runtime-load problem); the sample PDF → R2 (public object). The exact section manifest, QA-checklist wording, and child-rule domains come from the prompt; the fidelity target is the sample. Residual risk is only that the **sample still needs uploading to R2** before Phase A is fully specified, and that this plan did not read the prompt — treated as "verify against the prompt" at build.
- **#8 — Job runner minimalism.** The cron-claim DB-job has no retry/observability of a real queue; fine at 1/month volume, but revisit if concurrency grows (caveat).
- **#9 — Chromium on Railway (if HTML→Chrome).** Cold-start/memory weight; the render spike + react-pdf fallback mitigate.
- **#10 — Someone-else privacy.** Storing a named third party's typed birth data — document retention + the BIPA rationale for excluding third-party palm (spec §8/§10).

---

## 12. DECISIONS (Sid / PM / Amey) — status as of 2026-07-16

**D1/D2/D3/D4/D5 RESOLVED** (2026-07-16); **D8 RESOLVED** (PM 2026-07-17 — prompt → private repo, sample → R2); **D6/D7 are ordinary build/eng items** (D7 resolving — private bucket being provisioned). No open decision blockers remain; the prompt is committed at `server/src/prompts/` — the only residual action is uploading the sample PDF to R2.

- **D1 — Numerology Y-rule [Sid; spans R7 + R9] — ✅ DECIDED (always-vowel, project-wide); migration not yet built.** Current code still treats Y as a consonant (`nameNumerology.ts:13,34`). Implementation = add `y` to the single `VOWELS` set → `NUMEROLOGY_VERSION` bump + one-time backfill (shared migration task with R7), consumed by R9's inject-once path. Soul-urge/personality change for existing Y-name users. **Open item = execution + owner FYI, not the decision.** (Caveat + sign-off row.)
- **D2 — Generation architecture [Amey/eng] — ✅ APPROVED: Mode B.** Backend-computes / model-writes / controlled-renderer-builds (§0/§4). The astronomy-offload sub-question is still settled by the Phase-0 pyswisseph probe (an optimization, not a re-architecture); the render path (D-render, HTML→Chrome vs `@react-pdf`) by the render spike. Build size acknowledged.
- **D3 — Credit reset boundary [PM] — ✅ RESOLVED: calendar-month boundary (1st, UTC), no rollover, one shared self-or-other pool.** No subscription-renewal alignment. **Mechanism (reserve-at-enqueue, async-safe — §14 step 3/4 authoritative):** remaining = `tierLimit − count of NON-FAILED reports in the calendar-month by `createdAt`` — the `queued` doc created at enqueue counts immediately (blocks a concurrent double-enqueue); a terminally-`failed` report is excluded (refund); a stale `generating` → `failed` by the worker (refund). Resets implicitly at the 1st-of-month UTC boundary — **no reset cron** (or `0 0 1 * *` UTC for an explicit refill). **`generatedAt` is the completion stamp, NOT the credit field.** (Supersedes the earlier `generatedAt`/ready-only wording, which had a concurrent-double-enqueue hole; see §6.)
- **D4 — Subject scope [PM + safety] — ✅ RESOLVED (scope split).** **v1 = "generate for YOURSELF" ONLY.** The **"generate for someone else"** path — typed third-party name/DOB/TOB/POB, **minors via the prompt's `SUBJECT_TYPE=child` rules**, **NO third-party palm** — is fully **DESIGNED + turn-on-ready** in this plan but **DEFERRED to a phase at the END OF INTERNAL TESTING** (kept as a deferred phase, §9). **Cleanly additive:** face stays excluded (Play Store); third-party palm stays excluded (BIPA); the sidereal/numerology/render pipeline is subject-agnostic, so enabling other-subjects later is *inputs + the child-rule branch + the chooser UI*, no re-architecture. Age-from-DOB → child rules (never romantic/fear content about a minor; face auto-skipped) is designed now, wired at turn-on.
- **D5 — Delivery seam [Amey/eng] — ✅ REFRAMED / RESOLVED: not a broken-integration fix.** The delivery seam — a **buffer-upload path** (`uploadBuffer` for non-image content, since `uploadImage` is jpeg-only `r2.service.ts:55`) + a **private R2 key/path with a TTL** (wire the dead `getSignedUrl` `:84-91`) + a **link-email wrapper** (`sendReportEmail` around `email.service.ts`) — is built **INSIDE Phase A** as first-class R9 infra. **Export-My-Data (R8) completion is a FAST-FOLLOW that reuses the same seam.** So there is no "blocking pre-ship fix of a broken SendGrid": R9 builds the seam it needs; R8 rides it. (Email the presigned link, not the 18–26pp attachment.)
- **D6 — Mockups finalization [PM/design] — build item (post-build).** Screenshots are prototypes; finalize UI + PM approval post-build (incl. the **indigo icon + gold NEW badge**, net-new tokens).
- **D7 — PDF hosting + secure-link policy [eng] — ⏳ resolving.** **A private R2 bucket is being provisioned by Sid.** PDFs live under a private key/path in that bucket; the D5 seam wires `getSignedUrl` for TTL'd links. Confirm the exact link-TTL policy at build.
- **D8 — Confidential-config home [PM] — ✅ RESOLVED (PM 2026-07-17), split by sensitivity tier.** (1) **Generation prompt → committed to this private, org-only (dev + founder) repo** as a normal server-side file (text/methodology, access-controlled). The backend reads it **bundled** → there is **no Railway runtime-loading problem** (the earlier "gitignored ≠ deployed" concern is moot — it's committed, not gitignored). (2) **Monty-Adams sample PDF → R2**, NOT git — a plain **public** object (shown to every user incl. free; it's not a paid per-user report). A local gitignored copy is fine as the render-spike fidelity target. (3) The **R7 Timing-Engine rule set stays OUT of git regardless** (its access list is tighter than whole-repo) → a private-R2 `loadConfidentialConfig` loader, which **R7 inherits** when it's built. **Remaining action (not a decision):** the prompt is now committed at `server/src/prompts/Revelia_Complete_Reading_Generation_Prompt_v1.md`; upload the sample PDF to R2. This plan did not read the prompt → prompt-specific facts stay "verify against the prompt" at build.

---

## 13. Files in scope (checklist)

**Server**
- `server/package.json` — add the render dep (Puppeteer/Playwright **or** `@react-pdf/renderer`) + a chart lib (or inline SVG); confirm no queue lib for v1.
- `server/src/services/astrology-sidereal.service.ts` (**NEW**) — isolated sidereal engine module: sidereal natal, whole-sign (both), dasha ladder, ingress tables, sade sati, returns, panchanga, D9, dignities/yogas; owns the `set_sid_mode` lifecycle. (R7 later reuses.)
- `server/src/services/astrology.service.ts` — leave the tropical natal path untouched; expose primitives to the new module (or an options object) + the set_sid_mode regression guard.
- `server/src/utils/numerology.ts` + `server/src/utils/nameNumerology.ts` — add Chaldean / Mulank / Bhagyank / birthday-number / personal-year-series; **D1 Y-rule** (`VOWELS` + `NUMEROLOGY_VERSION` bump).
- `server/src/scripts/backfill-numerology.ts` — re-run for the D1 migration (version-aware already).
- `server/src/models/Report.ts` (**NEW**) — the report/job record (mirror `CareerDestiny.ts`).
- `server/src/services/report.service.ts` (**NEW**) — compute→inject→interpret→render→QA→store→deliver pipeline; per-report cost/duration logging.
- `server/src/services/report-render.service.ts` (**NEW**) — the controlled document renderer + 3 charts + QA gate (page count / section manifest / em-dash scan / images / opens).
- `server/src/services/synthesis-routing.ts` — add the `report` marquee `SynthesisSurface` (Fable 5 → Opus 4.8, high effort); **verify** max_tokens ceiling for the report payload.
- `server/src/controllers/report.controller.ts` (**NEW**) + `server/src/routes/report.routes.ts` (**NEW**) — `POST /api/reports` (enqueue + tier/credit gate), `GET /api/reports/:id` (status/results), `GET /api/reports` (history), sample-serve; mount in `routes/index.ts`.
- `server/src/jobs/pushScheduler.ts` — add the report job-runner cron tick (claim queued → run → ready/failed, module-boolean guard) + the report push campaigns.
- `server/src/services/r2.service.ts` — PDF upload path (private key, non-jpeg content type) + **wire `getSignedUrl`** for secure links.
- `server/src/services/email.service.ts` — add `attachments` to `EmailOptions` (or link-only) + `sendReportEmail`; **the D5 fix**.
- `server/src/models/User.ts` — per-campaign `lastReport*PushSentAt` fields.
- `server/src/types/shared.ts` — the `Report` DTO (dual-homed).
- `server/src/prompts/Revelia_Complete_Reading_Generation_Prompt_v1.md` — ✅ committed (D8; read bundled, out of client bundles). The static sample PDF — **upload to R2** as a public object (D8 ✅; not git). A private-R2 `loadConfidentialConfig` loader is built later for R7's stricter rule set (R9's prompt does not need it).

**Mobile**
- `mobile/app/(main)/astrology/index.tsx` — the "Personalized Cosmic Report" **row** in the "Your Insights" section (mirror `:476-556`; add the indigo circular icon + gold NEW badge — net-new tokens).
- `mobile/app/(main)/readings/index.tsx` — the report **card** (mirror the LinearGradient card pattern; gold/indigo gradient; NEW badge; locked→paywall).
- `mobile/app/(main)/readings/cosmic-report/` (**NEW**) — the entry screen (credit + View Sample + Generate), the self/someone-else chooser, the async status UI, the **results page** (highlights first, PDF viewer below, share), and report **history**.
- `mobile/lib/colors.ts` — add an **indigo** token (no indigo exists today).
- `mobile/components/subscription/` (or a new `NewBadge.tsx`) — the gold **NEW** badge (mirror `PremiumBadge.tsx`; net-new).
- `mobile/lib/constants.ts` — `FEATURE_ACCESS.cosmicReport` + a `FREE_TIER_LIMITS` report credit entry.
- `packages/shared/types.ts` — the `Report` DTO (dual-homed with the server copy).
- **verify** the in-app PDF viewer component + the report-share path (reuse `react-native-share` + the `shareReadingCard` boolean-gate discipline).

**Coordinate with R7:** R9 builds the **isolated sidereal engine module** (sidereal natal + dasha + the process-global `set_sid_mode` lifecycle) that R7's plan describes; R7 (implemented after R9) **reuses it** and adds the moment-chart + trade-secret rule set. R9 also lands the **shared D1 numerology migration** (Y-as-vowel + `NUMEROLOGY_VERSION` bump + backfill) that R7 depends on. Keep the sidereal module's public surface stable for R7.

---

## 14. Phase-A implementation CHARTER (SELF path only) — ordered, individually-runnable steps

> Breaks §9 Phase A into discrete steps; each = **{ goal · files-in-scope (from §13) · acceptance criteria · dependencies }**. The **FOUNDATIONS GROUP** (steps 1, 2, and the generic delivery-seam half of step 8) is built first — cross-feature, low-coupling. The `other`/child branch stays behind a flag (Phase D); Mode B unchanged. Ordering below is adjusted from §9 only where the prompt facts / 12c-audit demand it (noted per step).

### FOUNDATIONS GROUP (build first — cross-feature, low-coupling)

**Step 1 — Isolated sidereal engine module + set_sid_mode lifecycle + byte-identical-tropical regression guard.**
- **Goal:** a net-new sidereal engine that closes the four §0.2.C deltas without touching R1's tropical natal path.
- **Files:** `server/src/services/astrology-sidereal.service.ts` (NEW); `server/src/services/astrology.service.ts` (expose primitives / options only + regression guard).
- **Acceptance:** reproduces the sample's sidereal placements **+ the full dasha table** (the Monty Adams sample = the fixture); emits whole-sign **`'W'`** for BOTH sidereal and tropical; **mean-node primary, true-node footnoted**; adds nakshatra/pada + **D9 navamsa** + **Vimshottari ladder (MD+AD)** + **Panchanga** + **dignities/yogas**; scans for **ingress/Sade-Sati/returns**; owns the process-global `set_sid_mode` set-then-reset; a **regression guard proves a tropical natal computed after a sidereal report is byte-identical** to one before (R1 output unchanged; `houses_ex(...,'P')`/`SE_TRUE_NODE` tropical path intact).
- **Dependencies:** none (pure astronomy, testable against the sample). R7 later reuses this module.

**Step 2 — Numerology report fields + the D1 Y-as-vowel migration.**
- **Goal:** add the net-new numerology fields (§0.2.D) + land the shared always-vowel migration.
- **Files:** `server/src/utils/numerology.ts`, `server/src/utils/nameNumerology.ts` (add Chaldean / Mulank / Bhagyank / birthday-number / personal-year-series; add `'y'` to `VOWELS`; bump `NUMEROLOGY_VERSION` from `'1.0.0'`); `server/src/scripts/backfill-numerology.ts` (re-run at the new version).
- **Acceptance:** add `'y'` to the single `VOWELS` set + bump `NUMEROLOGY_VERSION`; run the **existing** versioned `backfill:numerology` (`:dry` first) **ONCE** at the new version. This **SUPERSEDES R4's pending post-deploy backfill** (12c-audit B — it is unrun; do NOT run it separately → one always-vowel pass, no consonant→R4→always-vowel double migration). The lazy recompute-on-version-mismatch fallback (`numerology.service.ts`) covers un-migrated docs → fail-open. **GATE:** review the `:dry` diff (Y-name Soul-Urge + Personality both change) and land the Y edit + version bump **BEFORE** the first prod backfill run. Shared with R7.
- **Dependencies:** none (self-contained util + migration). Shared migration with R7.

**Step 8a (FOUNDATIONS half) — GENERIC bucket-agnostic delivery seam (12c-audit D split).**
- **Goal:** the reusable, bucket-agnostic delivery primitives — built here so Export-My-Data (R8) inherits them and step 8 shrinks to bucket-wiring only.
- **Files:** `server/src/services/r2.service.ts` (add `uploadBuffer(buffer, key, contentType)`, defaulting `Bucket` to the existing `R2_BUCKET_NAME` const `:22`; wire the currently-dead `getSignedUrl(key, 3600)` `:84`); `server/src/services/email.service.ts` (a link-email wrapper on `sendEmail`, reusing the existing html/text body).
- **Acceptance:** `uploadBuffer` stores non-image content (unlike `uploadImage`, jpeg-hardcoded `:55`); `getSignedUrl` (dead/unused today) is wired and callable; the link-email wrapper sends via the existing `sendEmail`. **NO Sid gate; testable against the existing bucket.**
- **Dependencies:** none. R8 fast-follow rides this.

### PIPELINE GROUP

**Step 3 — `Report` model + credit doc-counting (calendar-month, D3) + tier gate.**
- **Goal:** the per-generation record + the credit pool.
- **Files:** `server/src/models/Report.ts` (NEW, mirror `CareerDestiny.ts`); `server/src/types/shared.ts` + `packages/shared/types.ts` (the `Report` DTO, dual-homed).
- **Acceptance:** credit = **COUNT of non-failed Report docs in the current calendar-month range**, mirroring the house pattern (`countDocuments` over `getCurrentMonthRange()`, verified `reading.controller.ts:228/245`); **reset is IMPLICIT via the month-range query — NO reset cron** (12c-audit E corrects D3's "reuse existing cron" — there is none for credits; `getEffectiveTier` `subscriptionTier.ts:50` gates entry). Shared self-or-other pool, no rollover.
- **Dependencies:** none (model + type).

**Step 4 — async cron-claim job runner (queued/generating/ready/failed).**
- **Goal:** the durable minimal job lifecycle (no queue lib).
- **Files:** `server/src/jobs/pushScheduler.ts` (new claim tick, module-boolean guard); `server/src/models/Report.ts` (status field is the job record).
- **Acceptance:** the Report doc **IS the job record, created ATOMICALLY at enqueue** (with the credit check) so it counts immediately and blocks concurrent over-enqueue past the tier limit; a **terminally-FAILED report is EXCLUDED from the credit count** (effectively refunded → a failed generation never consumes the month's credit); **stale `generating` docs time out → failed** (releases the reserved credit). Net: only a QA-passed or in-flight report holds the credit.
- **Dependencies:** step 3 (Report model + credit).

**Step 5 — report Fable-5 synthesis surface (compute → inject → interpret).**
- **Goal:** the `report` marquee surface that consumes injected JSON and writes interpretation only.
- **Files:** `server/src/services/synthesis-routing.ts` (add the `report` `SynthesisSurface`, Fable 5 → Opus 4.8, high effort; verify max_tokens ceiling); `server/src/services/report.service.ts` (NEW, the compute→inject→interpret orchestration).
- **Acceptance:** the inject payload is an **EXPLICIT ALLOW-LIST** (astronomy + numerology + self-palm traits only) — **NOT** a `UserInsightProfile`/`buildUserInsightProfile` dump and does **NOT** reuse R5's `buildFeatureContext` (both carry R2 face fields — 12c-audit A) → **face is structurally absent by construction**. The surface **CONSUMES injected `NUMEROLOGY_JSON`** and does **NOT** self-compute numerology.
- **Dependencies:** steps 1 + 2 (astronomy + numerology payloads). ⚠️ **HARD DEPENDENCY — the Sid-gated prompt reconciliation from §0.2.D(iii)** (add `NUMEROLOGY_JSON` block + consume-not-compute + always-vowel) **must land first**, since the committed prompt self-computes numerology and has no injection slot.

**Step 6 — controlled renderer + 3 charts + the LibreOffice Dockerfile (§0.1 B2 empirical Railway deploy happens here).**
- **Goal:** the Mode-B render pipeline; verdict = viable-with-Dockerfile.
- **Files:** `server/src/services/report-render.service.ts` (NEW, matplotlib→SVG charts + `docx` + `soffice` PDF); `server/package.json` (render dep); a NEW `Dockerfile`.
- **Acceptance (12c-audit G2 — HIGHEST RISK):** Railway currently builds via **NIXPACKS with NO Dockerfile** → adding one **SWITCHES the entire backend build system** (Nixpacks-auto → Docker), affecting EVERY deploy, not just report rendering. The Dockerfile **MUST reproduce the full existing Nixpacks build/start behavior** (Node version, install, build, start command) AND the backend **must boot with `/api/health` green BEFORE** anything depends on `soffice`. Emit charts as **VECTOR/SVG** (spike B1); **install + embed Georgia** in the container. A broken Dockerfile breaks ALL backend deploys on the single live-prod Railway — treat as the highest-risk step; HTML→Chromium held as fallback (§0.1 B3).
- **Dependencies:** step 5 (interpretive JSON to render). Infra-critical (touches every deploy).
- **✅ 6a DONE (2026-07-21) — the renderer SERVICE, proven LOCALLY on the Monty fixture (NO Dockerfile / NO Railway — that is 6b).** NEW `server/src/services/report-render.service.ts` `renderReportPdf({interpretation, astronomy, numerology, palm, meta})` + bundled `report-charts.py` (matplotlib). Flow: **parse the §8 prose contract** (split on `===SECTION: <id>===` → validate EXACTLY the 14-id manifest in order [missing/extra/misordered = hard `ReportContractError`]; resolve every `[[CHART|TABLE]]` marker; **birth-details deduped** — cover is text-only so its birth-details marker is dropped, the part-i one renders) → **3 charts (matplotlib SVG, VECTOR — settled §0.1 B1) from injected data** → **12 tables built FROM THE INJECTED DATA** (per the §8 TABLE-ID→PATH map; palette/type styling: indigo header, alt LTGRAY rows, 9.5pt Georgia) → **assemble the docx** (`docx@9.7.1`, US Letter, 1" margins, Georgia, indigo H1 / gold H2 / cream "In plain terms:" callouts / gold header + gray page-number footer; canonical §8 titles FORCED as H1) → **`soffice` docx→PDF** (installed LOCALLY — `C:\Program Files\LibreOffice`). **PROGRAMMATIC fidelity gate PASSED on the local Monty PDF: 18 pages ∈ [18,26]; all 13 printed §8 headings; ZERO em (U+2014) AND en (U+2013) dashes; 3 chart captions present as VECTOR (0 raster xobjects doc-wide); each table's row-1 == its injected payload (mahadasha[0]/positions[0]/expression/first-Saturn-ingress/antardasha[0]/D9/letter-values[0], machine-checked end-to-end).** Contract-split proof: 14 sections in order, all markers resolved, birth-details deduped, no bleed, malformed/missing-id manifests throw. `docx` dep added. tsc clean both sides. **Chart vector/raster fully settled + soffice-preserves-vector = YES (see §0.1 B1 resolution).** Residual cosmetics logged in `build-27-caveats.md` (transit-date birthplace-TZ localization deferred; H2 sub-heading heuristic; minor rasi label crowding). **6b = the Dockerfile + NEW STAGING Railway deploy (Nixpacks→Docker; `soffice` within Pro-tier RAM; @react-pdf fallback iff RAM exceeded) + owner Fable-on-reconciled-prompt spot-check.**

**Step 7 — QA gate.**
- **Goal:** the deterministic pre-`ready` gate (§8, folded from prompt §10 in §0.2.B).
- **Files:** `server/src/services/report-render.service.ts` (QA gate) + `server/src/services/report.service.ts` (gate-before-ready + cost/duration log).
- **Acceptance:** section-manifest (**face-free**, §0.2.A) + **page count 18–26** + **en/em-dash scan** (`—` U+2014 **and** `–` U+2013) + **images embedded (vector)** + **PDF opens/renders all pages** + **ZERO face-derived content**; FAIL → bounded repair/regenerate → persistent fail → `status:'failed'`, no credit.
- **Dependencies:** step 6 (rendered artifact).

**Step 8b (R9-specific half) — private-bucket path/TTL + presigned-link delivery.**
- **Goal:** the R9-specific delivery (the generic half is step 8a in FOUNDATIONS).
- **Files:** `server/src/services/report.service.ts` (`sendReportEmail` wiring); `server/src/services/r2.service.ts` (private key namespace/TTL); `server/src/services/email.service.ts` (`sendReportEmail`).
- **Acceptance:** PDF → private R2 key/path → `getSignedUrl(key, TTL)` presigned link → `sendReportEmail` emails the **link, not the 18–26pp attachment**.
- **Dependencies:** step 8a (generic seam) + steps 6/7 (artifact + QA pass). **GATED on Sid's private R2 bucket landing (D7).**

**Step 9 — static sample display + mobile placement (both tabs) + results page + history.**
- **Goal:** the mobile surface.
- **Files:** `mobile/app/(main)/astrology/index.tsx` (Insights row + indigo icon + gold NEW badge); `mobile/app/(main)/readings/index.tsx` (report card, locked→paywall); `mobile/app/(main)/readings/cosmic-report/` (NEW — entry, async status, results page [highlights + PDF viewer + share], history); `mobile/lib/colors.ts` (indigo token); `mobile/components/.../NewBadge.tsx` (NEW); `mobile/lib/constants.ts` (`FEATURE_ACCESS.cosmicReport`); `packages/shared/types.ts` (`Report` DTO).
- **Acceptance:** static sample shown to all (incl. free); paid entry shows credit + View Sample + Generate; results page reuses the `shareReadingCard` boolean-gate discipline (no Android cancel-cascade); history lists prior reports.
- **Dependencies:** steps 3–8 (the pipeline + delivery). UI finalization = D6 (post-build).

**Deferred (NOT Phase A):** the `other`/child branch (Phase D, end of internal testing) stays behind a flag; the 7-campaign push (Phase C). Mode B unchanged throughout.

---

**PLANNING ONLY.** No code, no deps, no schema changes, no commits. Deliverables: this doc (incl. the §0 spike report + the §0.2 prompt-facts fold + the §14 Phase-A charter) + the `plans/build-27.md` update + the `build-27-caveats.md` / `sid-signoff.md` register entries.
