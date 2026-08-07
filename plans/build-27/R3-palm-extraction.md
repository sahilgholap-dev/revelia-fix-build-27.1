# R3 — Palm: structured feature extraction (stable hand/palm feature vector → chiromancy rules table → traits)

> Part of **Build 27** (see `../build-27.md`). Status: **PLANNED — PHASE-0 SPIKE DONE (2026-07-01) → GO for impl.** Verdict: **Part A (hand geometry) = GO** · **Part B (palm lines) = GEOMETRY-ONLY V1** (lines ship as flagged LLM flavor, not measured). §4 DECIDE-IN-SPIKE rows are now LOCKED (annotated inline); §9.0 marked DONE; §11 risks #1/#2 resolved. Next action = §9 step 1. Area: Both (server primary: CV + rules + storage; mobile minor / possible fallback path). Priority: High. Third in the empirical sequence (R1 ✅ done → R2 ✅ scaffolding done → **R3** → R4 → R5 …).
>
> **Direct analog of R2.** Same pattern: `image → landmark/CV → structured feature vector → server-side curated rules table → trait list → LLM consumes traits (never the raw image for substance) → stable readings`. Inherits R2's **"land the structured DATA into the model + `UserInsightProfile`, but DEFER the synthesis-prompt COPY rewrite to R5"** pattern: R3 produces and stores a stable palm/hand-trait layer and feeds it into palm-reading generation, but the daily/weekly/monthly/compatibility/career **synthesis** copy stays as-is until R5 (R3's traits are one of R5's four feature sets — don't rewrite that copy twice).
>
> ⚠️ **R3 IS HARDER THAN R2 — stated up front.** R2's CV (68 facial landmarks) is a mature, single-image, single-model problem that spiked GO on the first library swap. R3 has **two distinct CV problems of very different maturity**: (1) **hand geometry** from hand-LANDMARK models (21 keypoints) — tractable, mirrors R2; (2) **palm LINES** (heart/head/life/fate presence/length/depth) — needs line/crease detection that is **far less mature than landmark detection** and may simply not be reproducibly or discriminatingly extractable from a phone palm photo. Plus palm reading is **two images** (dominant + non-dominant), not one. The spike must resolve both CV questions before any impl.

---

## 1. Goal

Replace **freeform Claude-Vision palm interpretation** (the model looks at the photo and invents palm type, line observations, scores, talents, destiny) with a **deterministic feature-extraction layer** — exactly the shape R2 built for face:

```
palm image → hand-landmark detection (+ optional line detection)
           → structured hand/palm feature vector (palm-shape ratio, finger-length ratios, spacing, [line features IF the spike says they're honestly measurable])
           → server-side CURATED chiromancy rules table → stable trait list + palmType + naturalTalents
           → LLM consumes the trait list (not the raw pixels for substance) → stable reading
```

Acceptance (from build-27 §3): **the same palm image produces a stable feature vector and a stable reading across repeated runs.** Today it does not — re-running palm reading on the identical photo yields different palm types, different line observations, different 40–95 scores, and different talents, because every substantive claim is a fresh LLM vision call.

Keep the existing Claude Vision **validation** pass (`validatePalmImage` — is-this-a-palm / palm-side / quality) exactly as-is — it gates *whether* we read; the new layer governs *what* we read.

---

## 2. Current state (verified in codebase) + disconnection verdict

### Capture → upload → R2 storage (mobile + server)
- **Capture**: `mobile/app/(capture)/palm-capture.tsx` — `expo-camera` (`CameraView`, back camera) live capture (`handleCapture()` ~L81). **Two-step flow**: `step` state `'dominant' | 'non-dominant'`. Free tier captures **dominant only** (`Step 1 of 1`); premium captures **both** (`Step 1 of 2` → `Step 2 of 2`). On confirm, `handleUsePhoto()` (~L157) calls `uploadService.uploadPalm(capturedPhoto, isDominant)`, then `generatePalmReading(hand)` from `readingsStore`. Biometric consent gate (`biometric_consent_palm` SecureStore key). Soft-fail `uncertain` modal mirrors face-capture.
- **Mobile upload**: `mobile/services/upload.service.ts` `uploadPalm(imageUri, isDominant)` (~L36) → `POST /upload/palm` as `multipart/form-data`, `isDominant` flag in the body.
- **Server upload**: `server/src/controllers/upload.controller.ts` → `server/src/services/upload.service.ts` `uploadPalmImage(userId, imageBuffer, isDominant, mimetype)` (L182–263):
  1. format check (`imageProcessing.validateImage`, L191),
  2. **Claude Vision validation** — base64s the buffer (L197) and calls `validatePalmImage(base64, mediaType)` (L199); `invalid` → 422, `valid`/`uncertain` pass through,
  3. `imageProcessing.processImage` resize/compress (L209, **`sharp@0.33.2`**, already a dependency),
  4. `r2Service.uploadImage(processedBuffer, userId, type)` (L225) where `type = isDominant ? 'palm-dominant' : 'palm-non-dominant'`,
  5. persists `images.palmDominant.{url,uploadedAt}` **or** `images.palmNonDominant.{url,uploadedAt}` on `UserProfile` (L234–245).
  - ⚠️ **KEY GAP vs face**: `uploadPalmImage` has **NO feature-extraction hook**. Compare `uploadFaceImage` (L101–155), which R2 already wired to `extractFaceFeatures` → `mapFeaturesToTraits` → persist `faceFeatures`/`faceTraits`/`faceArchetypeResult`/`faceRulesVersion`. Palm upload just validates → processes → stores the URL. **This is exactly where R3 slots in** (per-hand).
- **R2 client**: `server/src/services/r2.service.ts` — bucket `revelia-images`; keys `${userId}/palm-dominant/${ts}.jpg` and `${userId}/palm-non-dominant/${ts}.jpg`.

### Reading generation (server)
- `POST /api/readings/palm` → `reading.controller.ts` → `reading.service.ts getPalmReading(userId, hand, forceRegenerate)` (L161+): premium-gates the **non-dominant** hand (L183–184: free tier 403 on non-dominant), reads `images.palmDominant/palmNonDominant.url`, returns cached `profile.palmReading` (dominant) / `profile.palmReadingNonDominant` (non-dominant) unless `forceRegenerate`, else calls `claudeService.generatePalmReadingWithRetry(imageUrl, tier, isDominant, handedness, userContext)` (L227). Caches via atomic `$set` on `palmReading` / `palmReadingNonDominant` (L236–240) + writes a `Reading` history doc (L243–249).
- `server/src/services/claude.service.ts generatePalmReading` (L198–266): `MODEL = 'claude-sonnet-4-6'`, `PALM_MAX_TOKENS`; `buildPalmReadingPrompt(tier, isDominant, handedness, userContext)` → fetches the R2 URL → base64 (`fetchImageAsBase64`) → sends **image + the palm-reading prompt** to Claude Vision → `parseClaudeJSON<PalmReadingOutput>`. `generatePalmReadingWithRetry` (L309–315) wraps it in `withRetry`.
- **Prompt**: `server/src/prompts/palm-reading.prompt.ts` (L1–322). Output `PalmReadingOutput` (L14–119) is a rich JSON blob: `palmEnergyType`, `palmType{name:"Earth/Air/Fire/Water Hand", description}`, `majorLines{heartLine,headLine,lifeLine,fateLine}` each with `observation`/`insight`/etc., `wealthAndSuccess{financialGrowthScore 40–95,…}`, `loveAndMarriage`, `hiddenPalmSecret`, `karmaAndPastInfluence`, `decisionMakingStyle`, `destiny{lifeTheme, description}`, `naturalTalents[]`, `dailyPalmInsight`, `premiumContent{sunLine,minorLines,detailedLifeTimeline,spiritualPath}`, `shareableQuote`, + legacy `lines`/`mounts`. **Every value here is produced by the model from the pixels** — the prompt says *"Analyze the uploaded palm image"* (L175) and *"Reference actual lines and features you observe"* (L293).
- **Validation pass** (keep): `server/src/services/imageValidation.service.ts validatePalmImage` (L134–198) — separate Claude Vision call, three-state `valid|invalid|uncertain`, 15s timeout, reasons `NO_PALM|NOT_PALM|WRONG_SIDE|LOW_QUALITY|INVALID_IMAGE`. Independent of reading substance.

### Storage
- `server/src/models/UserProfile.ts`: `palmReading: Schema.Types.Mixed` (L372) + `palmReadingNonDominant: Schema.Types.Mixed` (L373); interface `palmReading?: any` / `palmReadingNonDominant?: any` (L81–82). **Opaque, unstructured Mongo blobs** — no schema, no feature data, no traits (same shape problem R1's legacy `birthChart: Mixed` and R2's `faceReading: Mixed` had). `images.palmDominant/palmNonDominant.{url,uploadedAt}` sub-docs (L362–368). `handedness: 'right'|'left'` (L70).

### Consumption (how palm data reaches readings)
- `server/src/services/insight.service.ts buildUserInsightProfile()` reads the dominant blob and projects (L166–168):
  - `palmType = palmReading?.palmType?.name || 'Earth Hand'`
  - `palmLifeTheme = palmReading?.destiny?.lifeTheme || 'A life of purpose and growth'`
  - `naturalTalents = palmReading?.destiny?.naturalTalents || ['Problem-solving','Communication','Leadership']`
  - Defaults fire when there's no reading (note L63–64 **hard-requires** both `faceReading` && `palmReading` before generating insights — so palm is a prerequisite, not optional, for insight generation).
- `UserInsightProfile` type (`server/src/types/shared.ts` L792–797): `palmType`, `palmLifeTheme`, `naturalTalents[]` (+ R1's `moonSign`/`risingSign`/`activeAspects`/`keyTransits`, R2's `faceArchetype`/`faceTraits`).
- **Synthesis prompts that consume the palm fields**: `daily-insight.prompt.ts` (L43–45, L65 — `palmType`/`palmLifeTheme`/`naturalTalents`), `monthly-reading.prompt.ts` (L63–65, L74), `compatibility.prompt.ts` (L89, L230 — `user1.palmType`). Career: `reading.controller.ts generateCareerDestiny` (L501–517) extracts `palmType = pr.palmType?.name`, builds `palmLines` from `majorLines` descriptions, `palmTalents` from `destiny.naturalTalents`, passes to `claudeService.generateCareerDestiny`.
- **Mobile display**: `mobile/app/(main)/readings/palm.tsx` (uses `PalmTypeHeader`, `PalmLineCard`, `DestinyCard`, `ShareableQuote`, score bars, premium `LockedSection`s), `…/combined.tsx`, `…/career-destiny.tsx`. `PalmTypeHeader` keys its element icon/tint off `name.toLowerCase().includes('fire'/'water'/'earth'/'air')`; `PalmLineCard` renders a `strength: 'strong'|'moderate'|'faint'` 3-dot bar + interpretation.

### On-device CV today
- **None.** No `mediapipe` / `handpose` / `hand-pose-detection` / `vision-camera` hand-detector in `mobile/` app code. All "palm analysis" is the server Claude Vision call. (Same starting point R2 had.)

### ⚖️ SAME-DISCONNECTION CHECK — verdict

**Same result as R2: NOT disconnected — UNSTABLE.** The palm data *is* structured-looking (`PalmReadingOutput` is a typed-ish JSON shape) and it *is* consumed (`palmType`/`palmLifeTheme`/`naturalTalents` flow into `UserInsightProfile` → daily/monthly/compatibility/career; palm.tsx renders the blob directly). The problem:

> **Palm reading today is freeform Claude Vision output fed straight to — and consumed by — the readings, with NO stable feature layer.** The `PalmReadingOutput` blob has the *appearance* of structure but **no deterministic structure**: no hand landmarks, no palm geometry, no extracted line features, no curated rules table. Palm type, line "observations," scores (40–95), talents, and destiny are all invented per-call by the vision model. Re-run on the identical image → different substance.

So R3's gap is **reproducibility**, not wiring (identical to R2). The fix is to **insert the missing deterministic layer** (hand landmarks [+ maybe lines] → feature vector → chiromancy rules table → trait list) *between the image and the LLM*, so the substance the model writes about — and everything downstream consumes — is stable across runs and devices. **This must be done per hand** (dominant + non-dominant), and the feature layer must survive the palm-line CV question the spike will decide.

---

## 3. Target architecture

```
Upload time (server) — slot in beside the existing validation, PER HAND, where the image already lives
  upload.service.ts uploadPalmImage(userId, buffer, isDominant)
    → validatePalmImage (KEEP, unchanged)                          [is-this-a-palm / side / quality]
    → extractHandFeatures(buffer)            [NEW — hand-landmark detection → HandFeatureVector]
        (+ extractPalmLines(buffer) ONLY IF the spike proves lines are honestly measurable — else omit)
    → mapFeaturesToPalmTraits(vector)        [NEW — server-side CURATED chiromancy rules table → PalmTrait[] + palmType + talents]
    → persist UserProfile.{palmDominantFeatures | palmNonDominantFeatures} + {palmDominantTraits | …} + palmRulesVersion
      (typed sub-docs; deterministic; PER HAND — free tier = dominant only, premium = both)
    → upload to R2 (existing)

Reading time (server)
  reading.service.ts getPalmReading(userId, hand)
    → read stored palm{Dominant|NonDominant}Traits (+ feature vector)
    → claude.service.generatePalmReading(traits, tier, isDominant, handedness, userContext)
        LLM is GIVEN THE TRAIT LIST / palmType / talents as the substance; NOT the pixels.
        (Image may still be passed for descriptive flavor ONLY — see §4; safer v1 = traits-only.)
    → PalmReadingOutput now anchored to stable traits → stable reading

Insight time (server)
  insight.service.ts buildUserInsightProfile
    → source palmType / palmLifeTheme / naturalTalents from the STABLE dominant-hand trait layer
      (fallback to the blob for un-backfilled users), optionally expose compact palmTraits on UserInsightProfile
    → flows to all synthesis prompts  (DATA only; COPY rewrite deferred to R5)

Mobile
  no required change to capture/upload contract; palm.tsx renders the same PalmReadingOutput shape.
  (Only changes if the spike forces on-device extraction — fallback path, §4.)
```

---

## 4. Key decisions

> ⚠️ **UNLIKE R2, THE SPIKE IS NOT YET RUN.** R2 entered its impl session already spike-GO with a locked stack. R3's Phase-0 spike (§9.0) is **outstanding and is the biggest single risk in the empirical thrust**. The rows below marked **DECIDE IN SPIKE** are genuinely open. Do **not** write extraction code until the spike resolves both the landmark path *and* the palm-line question.
>
> ✅ **SPIKE RESOLVED — 2026-07-01 (`build27-R3-Palm-Extraction-Phase0-feasibility-spike`).** Full write-up in `claude_progress.md` + scratchpad `VERDICT-palm-spike.md`. **PART A = GO** and **PART B = GEOMETRY-ONLY V1** (the expected outcome), on evidence. The DECIDE-IN-SPIKE rows below are now **LOCKED** (annotated inline). Summary:
> - **PART A (hand geometry): GO.** `@tensorflow-models/hand-pose-detection@2.0.1` (runtime `'tfjs'`, MediaPipeHands `full`) on pure-JS `@tensorflow/tfjs*@4.22.0` + **WASM backend** + `sharp` decode, **server-side at upload**. Runs **headless in Node, ZERO native compile** (only sharp's `.node`, already on Railway). Same bytes → **bit-identical** landmarks + vector. **palmType discriminates across all 4 classes** (earth/air/water/fire) on real palms — does NOT collapse. Risk #2 (headless landmark path) retired; fallbacks not needed.
> - **PART B (palm lines): GEOMETRY-ONLY V1.** Lines are NOT honestly measurable from phone photos with any no-native approach — classical edge signal **fails reproducibility** (up to 13.5% drift on a re-encode vs ≤3% geometry) **and doesn't localize the major lines** (measures generic skin texture + contrast — the cheekbone trap, doubled). Measured palm-line extraction = a **trained-U-Net microservice** (out of v1 scope; [arXiv 2102.12127] confirms classical CV "severely under-performs"). **Lines ship as clearly-flagged LLM flavor** (or dropped), NOT measured. Mounts (3-D prominence) = same, NOT measured.
> - **One genuinely new piece vs R2**: model weights are **NOT bundled in the npm package** and the lib defaults to fetching from **tfhub.dev (deprecated)** → **vendor/commit the ~7.6 MB model files** + load offline via a small **custom `tf.io` fs load-router** (proven bit-identical to network; pure-JS tfjs has no `file://` handler, tfjs-node stays rejected). Pin exact deps. `engine{}` = `{ library:'@tensorflow-models/hand-pose-detection@2.0.1', modelVersion:'mediapipe-hands/handpose_3d-full', backend:'wasm' }`.
> - **Demote pose-dependent ratios**: `thumbAngle` (164% spread) + `fingerSpread` (35%) reflect capture pose, not intrinsic geometry → coarse/quality only or drop. Intrinsic core = `palmShape`, `fingerLength`, per-finger ratios, `digitRatio2D4D`.
> - **Follow-up gate**: this is a **dataset GO** (Wikimedia palm photos, some phone-casual) — re-confirm on-device end-to-end via an EAS `preview` build on a real phone (§9 step 10 / §10), where real-world failure rate + capture-to-capture stability surface.

### The central R3 decision — WHERE/HOW detection runs, and WHAT is honestly measurable

R3 has **two CV problems**, and they must be judged separately:

**(1) Hand GEOMETRY from hand-landmark models — tractable, mirrors R2.**
- Hand-landmark models (**MediaPipe Hands** / **tfjs `@tensorflow-models/hand-pose-detection`**) return **21 hand keypoints** (wrist + 4 joints per finger). From those you get robust, scale/rotation-normalizable **hand geometry**:
  - **Palm-shape ratio** (palm width ÷ palm length) → square vs rectangular.
  - **Finger-length ratio** (mean finger length ÷ palm length) → short vs long.
  - Together these classify the traditional **palmType** — **Earth / Air / Water / Fire Hand** (Earth = square palm + short fingers; Air = square palm + long fingers; Water = long palm + long fingers; Fire = long palm + short fingers). **This is pure geometry and is the discriminating, reproducible core R3 can safely ship** — the palm analog of R2's `faceShape`.
  - Also measurable: individual finger-length ratios (incl. index-vs-ring / "2D:4D"), finger spacing/spread, thumb angle, relative finger-base positions.
- **Stack question mirrors R2's exactly** — and R2's lesson applies directly: **prefer pure-JS/WASM, NO native compile on Railway.**
  - ⚠️ **`@mediapipe/tasks-vision` `HandLandmarker` will almost certainly hit the SAME browser/WebGL2 wall the face-landmarker did** (R2 rejected it: loads WASM via `document.createElement("script")`/`importScripts` + hard-requires a WebGL2 context → needs DOM shims + native `headless-gl`). **Flag it, expect NO-GO headless, do not plan around it.**
  - ⚠️ **`@tensorflow-models/hand-pose-detection` (tfjs runtime) is the R2-analog candidate** — it runs on pure-JS `@tensorflow/tfjs` + `@tensorflow/tfjs-backend-wasm` (the exact stack R2 locked). **BUT unlike `@vladmandic/face-api`, it does NOT ship a purpose-built `*.node-wasm` headless build** — it's authored for the browser and may pull DOM/`ImageData`/canvas dependencies. **Whether it runs headless in Node with `sharp`-decoded tensors and the WASM backend is the #1 thing the spike must prove.** The older `@tensorflow-models/handpose` is a simpler tfjs-only model and is the fallback candidate if the newer one won't go headless.
  - ⚠️ **`tfjs-node` stays REJECTED** (R2: native libtensorflow = build trap). Reuse `sharp@0.33.2` for decode.

**(2) Palm LINES (heart/head/life/fate) — the HARD, possibly-infeasible half. APPLY THE CHEEKBONE LESSON.**
- Hand-landmark models give **zero** line information — they locate finger joints, not palmar creases. Extracting the **major lines** (presence, length, depth, curvature) needs **actual line/crease detection**: classical ridge/edge CV (Gabor filters, Frangi/Hessian ridge filters, morphological line extraction, Canny/Hough on the palm ROI) **or** a trained palm-line segmentation model. **This is FAR less mature than landmark detection**, has no plug-and-play Node library, and a **phone palm photo** (variable lighting, focus, skin, hand pose) may not yield **reproducible, discriminating** lines at all.
- 🚨 **THE CHEEKBONE TRAP, RESTATED FOR PALM LINES.** R2's decisive lesson: *do NOT ship a "measured" feature that doesn't actually discriminate.* R2 found `cheekboneProminence` binned 10/12 `low`, 0 `high` — reliable detection, but **no discrimination**, because prominence is a 3-D property invisible to 2-D frontal landmarks. **Palm lines are the same risk, doubled**: even if an edge detector *fires*, the extracted "heart line length" may (a) not be reproducible across two photos of the same palm (lighting/pose shift the traced contour), and (b) not discriminate across people (everyone bins "moderate"). **If the spike cannot show palm-line features are reproducible AND discriminating on real phone photos, they do NOT ship as measured features** — full stop.
- **Fallback if lines fail the spike (expected outcome): scope R3 v1 to hand-GEOMETRY / palmType only.** The rules table drives `palmType` + geometry-derived traits + talents deterministically; the **lines** either (a) stay **LLM-described from the image as pure flavor** (explicitly NOT part of the stable substrate — the prose rule below forbids them from contradicting the measured traits, and they'd carry a "descriptive, not measured" honesty framing), or (b) are **dropped** from the structured layer entirely. **Say which, explicitly, once the spike decides.** Recommendation pending spike: **geometry-only measured substrate; lines as clearly-flagged LLM flavor** so the existing `majorLines` UI doesn't regress, while the *stable* part of the reading is the geometry.

### The spike is a hard gate — R3's #1 risk (bigger than R2's)
**Phase-0 go/no-go FEASIBILITY SPIKE must answer BOTH:**
- **(a) Reproducible hand landmarks server-side on Railway with no native compile?** — Does `@tensorflow-models/hand-pose-detection` (or `handpose`) run headless in Node on pure-JS tfjs + WASM backend, decode via `sharp`, land 21 keypoints on real palm photos, and produce a **bit-stable vector on repeated runs of the same bytes** (R2's core gate)? If neither hand-pose lib goes headless → escalate to the R2-style fallbacks (on-device MLKit hand-detector via `react-native-vision-camera`, or a Python MediaPipe-Hands microservice).
- **(b) Are palm LINES reliably + reproducibly + DISCRIMINATINGLY detectable from real palm photos, or are they the cheekbone trap?** — Run a classical CV line-extraction probe (+ any available Node/WASM palm-line model) on a set of **varied real palm photos**; measure reproducibility on re-encodes of the same image AND spread across different palms. **Decision: lines ship as measured only if they clear both bars; otherwise geometry-only v1.**

### Carry R2's hard-won rules verbatim
- **Measured-substrate + AI-prose** (same model as R1 Swiss Ephemeris + R2 face — keeps Build 27 consistent): the feature vector + rules-table traits/palmType/scores are the fixed substrate; the LLM writes prose *over* them and **may never override or contradict them** (Sid decision #3 analog — make it an explicit prompt rule + passing check).
- **Extract-once-on-stored-bytes + re-map-not-re-detect**: run detection ONCE on the **canonical `processedBuffer`** (the exact bytes uploaded to R2 — not the raw multipart buffer; a re-encode shifts coordinates and can flip a categorical on a threshold), persist the vector (and ideally the raw 21 landmarks), and on rules-table changes **RE-MAP from the stored vector — never re-detect**. This is the R2 §6 invariant and it applies identically.
- **Pin exact CV deps** (no `^`) + store `engine{library, modelVersion, backend}` in the vector — the vector is reproducible only for a fixed tuple (lib version + tfjs backend); CPU vs WASM hash differently. A bump = deliberate re-detect-everyone backfill, not a casual update. (R2's "don't switch to Alpine / don't add tfjs-node".)
- **Prose never contradicts measured traits** (prompt rule + passing check).
- **Closed, TOTAL mapping** (R2 decision #2 analog): palmType is already a **closed set** (Earth/Air/Water/Fire) — good. If R3 introduces a palm "archetype"/energy-type, the trait→archetype mapping must be **TOTAL** (every combination resolves, no "other" bucket) and the names + logic go to **Sid** before copy locks. (The prompt's current `palmEnergyType` — Leader/Healer/Creator/Visionary/Survivor/Scholar Palm — is model-coined today; decide in the rules pass whether to make it rules-derived closed-set or drop it.)

| Decision | Recommendation | Why / caveat |
|---|---|---|
| **Where detection runs** | ✅ **LOCKED (spike 2026-07-01): server-side, at upload time** (beside `validatePalmImage`, per hand). | The image already transits the server and `sharp` already decodes it (no new image hop). One engine = fully reproducible vector for every user/device (the core acceptance property). On-device re-introduces cross-device/model-version drift + a client-trust boundary. Spike confirmed the Node library survives Railway with zero native compile. |
| **Hand-landmark library** | ✅ **LOCKED (spike): `@tensorflow-models/hand-pose-detection@2.0.1` (runtime `'tfjs'`, model `MediaPipeHands` / handpose_3d, `modelType:'full'`, `maxHands:1`)** on pure-JS `@tensorflow/tfjs-core`+`tfjs-converter`+**`tfjs-backend-wasm`@4.22.0** (WASM backend). Decode via `sharp`. **Candidate B (`@tensorflow-models/handpose`) NOT needed** — A went headless. `@mediapipe/tasks-vision`/`tfjs-node` **rejected** (not installed). | **Headless-Node risk RESOLVED**: the tfjs runtime input path is DOM-free; fed a `sharp`-decoded `tf.tensor3d` directly, no DOM/WebGL shims. (Its `@mediapipe/hands` peer-dep is the *browser* runtime we avoid by choosing `runtime:'tfjs'`.) |
| **Fallback if no Node path survives the spike** | ✅ **NOT TRIGGERED (spike).** The Node/WASM path went headless → on-device MLKit / Python MediaPipe-Hands microservice **not needed** for geometry. (Would only return if measured *lines* were in scope — they are not, see below.) | The tfjs-runtime GO retired R3 §11 risk #2. Keep the fallbacks documented but unbuilt. |
| **Palm-LINE detection** | ✅ **LOCKED (spike): GEOMETRY-ONLY V1 — lines NOT measured.** Classical edge/ridge CV **fails reproducibility** (≤13.5% drift on a re-encode vs ≤3% geometry) **and fails to localize the major lines** (measures skin texture + contrast, not heart/head/life/fate — the cheekbone trap doubled). Ship lines as **clearly-flagged LLM flavor** (or dropped); mounts (3-D) also NOT measured. | The honesty gate held. Measured lines = a trained-U-Net microservice ([arXiv 2102.12127]: classical CV "severely under-performs") = out of v1 scope. Did NOT fake a measured feature. |
| **Feature vector contents** | ✅ **LOCKED (spike):** intrinsic geometry (scale/in-plane-rotation robust): **palmShape, fingerLength, per-finger ratios (incl. `digitRatio2D4D`)** → `palmType` (earth/air/water/fire) + categoricals. **`thumbAngle` + `fingerSpread` DEMOTED** to coarse/quality-only (pose-dependent: 164% / 35% spread — capture pose, not intrinsic). **`lines` block OMITTED** from the measured vector. Persist raw 21 `landmarks[]`. | Store **normalized** ratios; fixed-threshold bins **off cluster centers**; re-encode drift ~3% → extract-once-on-stored-bytes + re-map-not-re-detect is MANDATORY (R2 §6). `engine{}` = `{library:'@tensorflow-models/hand-pose-detection@2.0.1', modelVersion:'mediapipe-hands/handpose_3d-full', backend:'wasm'}`. |
| **Model assets (NEW vs R2 — spike finding)** | ✅ **Vendor/commit the model weights** (`detector-full` 2.3 MB + `landmark-full` 5.3 MB = **7.6 MB**) into the repo + load offline via a small **custom `tf.io` fs load-router**. Pin exact deps (no caret). | The lib does NOT bundle weights (unlike R2's face-api) and defaults to **tfhub.dev (deprecated)** → runtime fetch is fragile + non-reproducible. Offline local load proven **bit-identical** to the network run; pure-JS tfjs has no `file://` handler and tfjs-node stays rejected. |
| **Feature → trait mapping** | **Server-side curated chiromancy rules table** (`server/src/data/chiromancy-rules.ts`, new file in the `server/src/data/` dir R2 established), authored once, version-controlled, **NOT the LLM**. Pure `mapFeaturesToPalmTraits(vector) → { traits: PalmTrait[]; palmType; naturalTalents; [energyType?] }` + rules-computed scores replacing the model's 40–95. | This is what makes readings stable — the palm analog of `physiognomy-rules.ts`. Each rule carries provenance + a `RULES_VERSION` tag so re-mapping is reproducible and auditable. |
| **What the LLM consumes** | The **trait list** (+ palmType/talents/scores from the rules table). The prompt is **fed traits as the substance**; safer v1 = **drop the image from the reading call entirely** (traits-only → maximal stability). If lines survive as flavor, the image may be passed **for line description only**, explicitly instructed not to derive palmType/scores/talents from pixels. | Eliminates pixel-driven nondeterminism. Caching already exists (`palmReading`/`palmReadingNonDominant`), so prose is generated once; anchoring it to fixed traits means even an explicit regenerate says the same things. **DECIDE IN SPIKE/impl**: traits-only vs image-for-line-flavor. |
| **Two hands** | Extract + map **per hand**. Free tier = dominant only; premium = both (non-dominant gated at reading time already, L183–184). Store separate feature/trait sub-docs for each. Insight/synthesis source from the **dominant** hand (as today). | Palm is two images, unlike face. The backfill + lazy fallback + clear-on-reupload logic all run per hand. |
| **Keep the validation pass** | **Yes, unchanged.** `validatePalmImage` still gates upload. | Extraction runs only after validation passes. If extraction can't find a hand on a *validated* image, treat as `uncertain` → fall back to blob/defaults (never hard-fail the reading). |
| **Fate of `palmReading: Mixed`** | Keep both blobs (`palmReading`, `palmReadingNonDominant`) as the **narrative cache** (the rendered `PalmReadingOutput`), now **derived from** the feature/trait layer. Add typed sub-docs alongside. | Mirrors R1 (`natalChart` added, `birthChart` kept) and R2 (`faceFeatures` added, `faceReading` kept). Mobile keeps rendering the same `PalmReadingOutput` shape → minimal mobile change. |
| **Determinism boundary** | "Stable" = **identical feature vector (deterministic)** → **identical trait list, palmType, talents, scores (rules-derived)** → reading narrative anchored to the same traits (substance stable; prose wording may vary, and is cached). | Same expectation-setting as R2: we make the *substance* reproducible, not the prose byte-identical. |

---

## 5. Data model + shared types

**New structured types** in `packages/shared/types.ts` **and** mirrored in `server/src/types/shared.ts` (the R1/R2 dual-home pattern):

- `PalmTypeClass = 'earth' | 'air' | 'water' | 'fire'` (the closed set the UI/prompt already use as "Earth/Air/Fire/Water Hand"; `PalmTypeHeader` keys its icon off the name string, so keep the display name aligned).
- Small closed enums as needed: `FingerLength = 'short' | 'long'`, `PalmShape = 'square' | 'rectangular'`, `LineStrength = 'faint' | 'moderate' | 'strong'` (reuse — `PalmLineCard` already renders exactly these three), `LinePresence = 'present' | 'faint' | 'absent'`.

> ⚠️ **SCOPED TO WHAT THE SPIKE PROVES MEASURABLE.** 21 hand landmarks cover finger joints + wrist → all **geometry** (palm shape, finger lengths, spread, thumb angle). They give **zero line information**. **Line fields are CONDITIONAL on the spike** — include them only if palm-line CV clears the reproducible-AND-discriminating bar (the cheekbone gate). If not, omit the `lines` block from the measured vector entirely (lines become flagged LLM flavor or are dropped). **Mounts** ("prominence" of the fleshy pads) are a **3-D property** — the direct cheekbone analog — and are **NOT measurable from 2-D landmarks**; do not ship mount *prominence* as measured (mount *position* proxies are possible but low-value — defer).

- `HandFeatureVector {`
  - `hand: 'dominant' | 'non-dominant';`
  - `palmType: PalmTypeClass;`  — derived from palmShape × fingerLength (Earth/Air/Water/Fire)
  - `ratios: {`
    - `palmShape,`          — palm width / palm length  *(square vs rectangular)*
    - `fingerLength,`       — mean finger length / palm length  *(short vs long)*
    - `indexRatio, middleRatio, ringRatio, pinkyRatio,`  — each finger length / palm length
    - `digitRatio2D4D,`     — index length / ring length  *(the classic 2D:4D)*
    - `fingerSpread,`       — mean inter-fingertip spacing / palm width
    - `thumbAngle,`         — thumb-to-index opening angle *(flexibility proxy)*
  - `};`
  - `categoricals: { palmShape: PalmShape; fingerLength: FingerLength; fingerSpread: 'narrow'|'moderate'|'wide'; thumbFlexibility: 'low'|'moderate'|'high' };`  — fixed-threshold bins
  - `lines?: {`  — **CONDITIONAL (spike-gated); omit the whole block if lines fail the cheekbone test**
    - `heartLine: { presence: LinePresence; lengthRatio: number; strength: LineStrength };`
    - `headLine:  { presence: LinePresence; lengthRatio: number; strength: LineStrength };`
    - `lifeLine:  { presence: LinePresence; lengthRatio: number; strength: LineStrength };`
    - `fateLine:  { presence: LinePresence; lengthRatio: number; strength: LineStrength };`
  - `};`
  - `quality: { landmarksFound: number; detectorScore: number; roll?: number };`  — in-plane rotation retained as a quality signal (R2 parallel); out-of-plane pose omitted (validation covers bad angles)
  - `engine: { library: string; modelVersion: string; backend: 'wasm' | 'cpu' };`  — **`backend` REQUIRED**; vector reproducible only for a fixed tuple → a change means re-detect, not just re-map (R2 §6)
  - `landmarks?: number[][];`  — optional raw 21-point array; **persist it** so a rules/binning change re-maps without re-detecting
  - `rulesInputVersion?: string; computedAt: string;`  — **ISO timestamp string** (as shipped in §9 step 1), matching `NatalChart.computedAt` + `FaceFeatureVector.computedAt`; the earlier `Date` typing here was unintentional drift from the R1/R2 convention (no Date-native querying needed).
  - `}`
- `PalmTrait { trait: string; score: number; band: 'low'|'moderate'|'high'; description?: string; sourceFeatures: string[] }`  ← `description` is the **rules-table** phrasing (short, deterministic); the LLM expands prose, it does not author the trait.
- `PalmProfileResult { palmType: PalmTypeClass; lifeTheme: string; naturalTalents: string[]; sourceTraits: string[]; energyType?: string }`  — **derived from the trait profile by the rules table**, not the model (if `energyType` is kept as a closed set, its mapping must be TOTAL — Sid sign-off, §4).

**`UserProfile` model** (`server/src/models/UserProfile.ts`): add typed sub-documents (sub-schemas with `_id:false`, mirroring R1's `natalChart` and R2's `faceFeatures`), **per hand**:
- `palmDominantFeatures?: HandFeatureVector`, `palmNonDominantFeatures?: HandFeatureVector`
- `palmDominantTraits?: PalmTrait[]`, `palmNonDominantTraits?: PalmTrait[]`
- `palmProfileResult?: PalmProfileResult` (derived from the dominant hand — the one insight/synthesis reads)
- `palmRulesVersion?: string` (the rules-table version that produced the above — enables targeted re-mapping)
- Keep `palmReading` / `palmReadingNonDominant: Mixed` as the narrative caches (now derived).

**`UserInsightProfile`** (`server/src/types/shared.ts` L792–797): keep `palmType`/`palmLifeTheme`/`naturalTalents`, but **source them from the stable dominant-hand trait layer** when present (fallback to the blob/defaults otherwise). Optionally add a compact `palmTraits?: string[]` so R5's synthesis engine has the structured set available. **DATA only — synthesis-prompt COPY rewrite deferred to R5.**

---

## 6. The curated chiromancy rules-table approach (the heart of R3)

- **File**: `server/src/data/chiromancy-rules.ts` (in the `server/src/data/` dir R2 established for `physiognomy-rules.ts`) — a version-controlled, documented table. Pure data + a pure `mapFeaturesToPalmTraits(vector): { traits: PalmTrait[]; palmType: PalmTypeClass; naturalTalents: string[]; profile: PalmProfileResult }`.
- **palmType is deterministic geometry**: `palmShape × fingerLength → {earth,air,water,fire}` via the fixed 2×2 chiromancy mapping (Earth = square+short, Air = square+long, Water = rectangular+long, Fire = rectangular+short). This alone replaces today's model-invented `palmType.name` with a stable, discriminating class — the safe R3 core.
- **Shape**: each rule maps a feature/categorical (e.g. `fingerLength: 'long'`, `digitRatio2D4D: high`, or `lines.headLine.strength: 'strong'` **if lines ship**) to a trait contribution (`analytical +N`, band + short canned phrasing + provenance note). Scores are **summed/normalized deterministically** into the 0–100 band the UI shows — replacing the model's invented 40–95.
- **naturalTalents / lifeTheme**: derived from the resulting trait profile against a fixed table (replacing `destiny.naturalTalents` / `destiny.lifeTheme` — the exact fields `insight.service` reads at L167–168).
- **Optional palm `energyType`/archetype**: if kept, match the trait profile against a **CLOSED, fixed set** via a deterministic nearest-profile rule (never the model's free choice). **TOTAL mapping, no fallback bucket** (R2 decision #2). Otherwise drop the model-coined `palmEnergyType`. Send Sid the names + mapping logic before copy locks.
- **Versioning**: a `RULES_VERSION` constant tags every output (`palmRulesVersion`). Bumping it + re-running the cheap (no-CV, no-API) re-map backfill is how palm copy evolves without re-detecting landmarks.
- ⚠️ **Same invariant as R2 §6: extract landmarks ONCE on the canonical stored/processed buffer, persist the vector (+ raw landmarks), and RE-MAP from the stored vector on rules changes — NEVER re-detect.** Same bytes → bit-identical; a re-encode shifts coordinates and can flip a threshold categorical. Reproducibility is discipline-dependent: pin extraction to the stored bytes + round ratios + place thresholds off cluster centers.
- **Honesty note** (state in the doc, not the prompt): chiromancy is not science; this is an **entertainment** product. The rules table's bar is **reproducibility + internal consistency + tasteful copy**, not empirical validity. There is no "astro.com" reference (unlike R1) — the reference *is* the table + the determinism property. Loop Sid in for the trait/talent voice. **And per §4: never surface a line/mount feature as "measured" unless the spike proved it discriminates.**

---

## 7. Wiring into readings

- **Palm reading itself (R3 owns this surface)**: `claude.service.generatePalmReading` + `palm-reading.prompt.ts` change from "analyze the uploaded palm image and infer everything" to "**here is the user's extracted palm trait list / palmType / talents / scores — write the reading around them**." This is R3's core deliverable (what makes the reading stable) and is distinct from R5 synthesis-copy work. Runs **per hand**. Decide traits-only vs image-for-line-flavor here (spike-informed).
  - ⚠️ **PROSE RULE (measured-substrate model, R2 decision #3 analog): the AI prose must NEVER contradict the measured traits / palmType / scores / talents.** They are the fixed substrate; the LLM writes voice *over* them. Explicit instruction in `palm-reading.prompt.ts` + a passing-criterion check.
  - ⚠️ **If lines are geometry-only-v1 flavor**: the `majorLines` block in `PalmReadingOutput` stays (so palm.tsx `PalmLineCard` UI doesn't regress), but it is generated as **clearly-scoped descriptive flavor from the image**, explicitly NOT part of the stable substrate, and forbidden from contradicting the measured palmType/traits. State this honestly. (`PalmLineCard`'s `strength` dot-bar would then reflect LLM description, not a measured band — acceptable for v1 flavor, but note it.)
- **Synthesis prompts (defer to R5)**: `daily-insight` / `monthly-reading` / `compatibility` / career-destiny keep their current copy. R3 only guarantees the `UserInsightProfile` palm fields (`palmType`/`palmLifeTheme`/`naturalTalents`) are now **stable** (sourced from the trait layer). **R3's palm traits become one of R5's four feature sets** — R5 weaves them into synthesis copy + the Fable 5 engine. Do not rewrite that copy in R3.
- **Career** (`reading.controller.ts` L501–517): can keep reading the blob in R3; flag for R5 to point `palmType`/`palmLines`/`palmTalents` at the stable trait layer alongside R1's chart + R2's face traits + R4's numerology.

---

## 8. Migration / backfill (acceptance: no user loses access)

- Existing users have `images.palmDominant.url` (+ `palmNonDominant.url` for premium) + `palmReading`/`palmReadingNonDominant` blobs but **no feature/trait sub-docs**.
- **Backfill script** `server/src/scripts/backfill-palm-features.ts` (+ `backfill:palm-features` / `:dry` npm scripts, mirroring `backfill-face-features.ts` and `backfill-natal-chart.ts`): for each profile with a palm image, fetch the stored R2 bytes → `extractHandFeatures` (+ lines if shipping) → `mapFeaturesToPalmTraits` → persist, **per hand**. Idempotent, resumable, per-user fail-soft, log per-user success/failure + landmark confidence. **No Anthropic calls in the feature path.** Run detection on the **stored R2 bytes** (identical to upload-time) so backfill matches upload extraction; **persist raw landmarks** so future `RULES_VERSION` bumps re-map without re-fetching/re-detecting (R2 precedent — that backfill reused the canonical-stored-bytes path with no re-encode). Heavier than R1's pure-compute backfill: CV over real images, may hit detection failures.
- **Lazy fallback**: if palm features are missing at reading time, extract-on-the-fly-and-persist (so the app works before/around backfill) — mirrors R1's lazy natal compute + R2's face fallback. If the stored image is gone or extraction fails, fall back to the existing blob/defaults so no user loses their palm reading.
- **Clear-on-reupload** (R2 parallel, per hand): when a new palm photo is uploaded, if extraction yields no usable vector, **clear the stale per-hand features** so the previous hand's data doesn't stay attached to the new photo (see `uploadFaceImage` L144–151 for the exact pattern to mirror).
- **Rules re-map** (cheap path): a `RULES_VERSION` bump triggers a no-CV re-map over stored `palm*Features` — refreshes traits without re-detecting landmarks.

---

## 9. Sequencing (within R3) — SPIKE FIRST

0. **Phase 0 — FEASIBILITY SPIKE — ✅ DONE (2026-07-01). THE GATE — PASSED.** Verdict: **PART A GO** (hand-pose-detection@2.0.1 tfjs+WASM, headless, no native compile, bit-stable, palmType discriminates) + **PART B GEOMETRY-ONLY V1** (lines fail reproducibility + discrimination → LLM flavor, not measured). §4 rows LOCKED (annotated). Full write-up: `claude_progress.md` session `build27-R3-Palm-Extraction-Phase0-feasibility-spike` + scratchpad `VERDICT-palm-spike.md`. Original gate criteria (both confirmed):
   - **(a) Hand landmarks headless on Railway, no native compile:** `@tensorflow-models/hand-pose-detection` (tfjs runtime) — or fallback `@tensorflow-models/handpose` — installs + runs in Node on pure-JS `@tensorflow/tfjs` + `@tensorflow/tfjs-backend-wasm`, decodes via `sharp`, lands 21 keypoints on real palm photos, and produces a **bit-identical vector on repeated runs of the same bytes**. Verify **no `binding.gyp`/node-gyp** in the CV stack (only `sharp` native, already on Railway). If neither lib goes headless → escalate to fallbacks (on-device MLKit / Python microservice). **Reject mediapipe-tasks-vision + tfjs-node up front.**
   - **(b) Palm lines — the cheekbone test:** on **varied real palm photos**, probe classical line-extraction CV (+ any Node/WASM palm-line model) and measure **reproducibility** (re-encode of the same image) AND **discrimination** (spread across different palms). **Decide: lines ship as measured (both bars cleared) OR geometry-only v1 (lines → LLM flavor or dropped).** Write the verdict up like R2's cheekbone `VERDICT-*.md`.
   - **Record the full spike write-up in `tracking_files/claude_progress.md`** (R2 precedent) and update §4 rows from DECIDE-IN-SPIKE → LOCKED.
1. Define shared types (`HandFeatureVector`/`PalmTrait`/`PalmProfileResult`); add typed per-hand sub-docs to `UserProfile`.
2. `server/src/services/palmFeatures.service.ts` (NEW): `extractHandFeatures(buffer)` (landmarks → geometry vector via the spike's library + `sharp` decode) + `extractPalmLines(buffer)` **only if the spike greenlit lines**.
3. `server/src/data/chiromancy-rules.ts` (NEW) + `mapFeaturesToPalmTraits()` (rules table → palmType/traits/talents/scores). Author the table (content pass; loop Sid for voice + any closed archetype set).
4. Hook extraction+mapping into `upload.service.ts uploadPalmImage` (after validation, **per hand**); persist sub-docs; clear-on-reupload. Lazy fallback in `reading.service.ts getPalmReading`.
5. Rewire `claude.service.generatePalmReading` + `palm-reading.prompt.ts` to consume the trait list (traits-only vs image-for-line-flavor decision; prose-never-contradicts rule).
6. Source `UserInsightProfile` palm fields from the stable dominant-hand layer (`insight.service.ts` L166–168); optionally expose `palmTraits` (DATA only; defer synthesis copy to R5).
7. Mobile: verify `palm.tsx`/`combined.tsx`/`career-destiny.tsx` still render the (now stable) `PalmReadingOutput`; only touch mobile if the spike forced on-device extraction.
8. Backfill script + lazy fallback (per hand); run dry → real after backend ships.
9. Stability validation: same image → identical vector/traits/palmType/talents/scores across N runs; the **honest-discrimination check** (palmType + any shipped line feature must actually spread across real palms, not collapse to one bin — the cheekbone criterion); spot-check copy quality.
10. **On-device workability test (real phone, EAS build).** Spike/backfill run on stored/dataset bytes = best-case inputs; the true target is a **real phone palm capture**. After wiring (steps 4–7), device-test the full pipeline end-to-end via an EAS **preview** build (`eas build --platform android --profile preview` → internal testing on a physical device, per `dev-notes/workflow.md`): capture real palms (dominant + non-dominant) through `palm-capture.tsx`, confirm `validatePalmImage` → extraction → rules → reading works on real-world inputs, and that the same captured palm re-reads stably. This is where real-world detection-failure rates + line-signal quality actually surface (a dataset GO should be re-confirmed here). Feeds back into thresholds via a cheap `RULES_VERSION` re-map, never a re-detect.

---

## 10. Passing criteria (R3-specific)

- [ ] **Spike resolved (both halves)**: (a) reproducible hand landmarks headless on Railway, no native compile; (b) palm-lines decision made on the reproducible-AND-discriminating evidence (ship-as-measured or geometry-only-v1) and written up. **This is the entry gate — nothing below is built until this passes.**
- [ ] **Reproducible vector**: the same image, processed N times, yields a **bit-stable `HandFeatureVector`** (ratios identical; categoricals identical — no boundary flipping). Enforce via the §6 extract-once-on-stored-bytes + re-map invariant.
- [ ] **Reproducible traits/palmType/talents/scores**: the rules table maps that vector to an **identical `PalmTrait[]`, palmType, talents, and scores** every run (pure function; `palmRulesVersion` recorded).
- [ ] **Stable reading**: palm-reading **substance** (palmType, trait claims, scores, talents) is identical across regenerations of the same image; only prose wording may vary (and is cached). Explicitly NOT a byte-identical-prose criterion.
- [ ] **Honest discrimination (the cheekbone criterion)**: every feature surfaced as "measured" must actually **discriminate across real palms** — `palmType` must spread across earth/air/water/fire on a varied sample (not collapse to one class), and **any shipped line feature must not bin everyone into one band**. A measured feature that doesn't discriminate does NOT ship (it becomes flavor or is dropped).
- [ ] **LLM does not author substance from pixels**: verify the reading call is driven by the trait list (and, if the image is passed for line flavor, that palmType/scores/talents are demonstrably rules-derived, not vision-derived).
- [ ] **Prose never contradicts measured traits**: spot-check generated readings against the fixed traits/palmType/scores — prose may elaborate but must not conflict.
- [ ] **Both hands**: dominant (all tiers) and non-dominant (premium) each get a stable vector + traits; free tier unaffected by the non-dominant path.
- [ ] **Validation pass intact**: `validatePalmImage` still gates upload; invalid images never reach extraction.
- [ ] **On-device workability (real phone, EAS build)**: the full capture→upload→extract→rules→reading pipeline works end-to-end on a **physical device** with **real phone palm captures** (not just stored/dataset bytes) — verified via an EAS `preview` build in internal testing (`dev-notes/workflow.md`). Real-world detection-failure rate is acceptable (fail-open path covers the rest); a captured palm re-reads stably.
- [ ] **No user loses access**: backfill populates features; lazy fallback covers the gap; missing-image/extraction-failure falls back to the existing blob/defaults.
- [ ] **Railway build clean** (the R1/R2 lesson): chosen library installs and runs on the production image without a fragile native compile; documented like R2's face-api note.
- [ ] **`tsc --noEmit` clean** (mobile + server). No regression in palm/combined/career screens or in daily/monthly/compatibility (which read the now-stable palm fields).

---

## 11. Risks / open questions

- **#1 — Palm-LINE CV maturity (THE top risk). ✅ RESOLVED BY SPIKE (2026-07-01) → GEOMETRY-ONLY V1.** Confirmed the cheekbone trap, doubled: classical edge/ridge CV fails BOTH reproducibility (≤13.5% drift on a re-encode) AND honest discrimination (measures skin texture + contrast, not the major lines). Measured lines = a trained-U-Net microservice, out of v1 scope (see §13). **Lines ship as flagged LLM flavor, NOT measured.** No fake measured feature shipped.
  - ⚠️ **OPEN PRODUCT DECISION (Sid) — gates the step-5 prompt copy, PENDING sign-off.** Palm *lines* (heart/head/life/fate) are the iconic palmistry visual, so the "geometry-only v1" call is a **product** decision, not just an engineering one — surface it to Sid like the R2 cheekbone call, don't bury it. **The important clarification: lines are NOT removed.** The `majorLines` UI (`palm.tsx` `PalmLineCard`) stays and still renders; line descriptions remain **LLM-generated from the image exactly as they are today** — the only change is they don't become part of the stable *measured* substrate (palmType/traits/talents/archetype do). So there is **zero user-facing regression** vs the current app; what we decline to do is *label lines "measured"* when classical CV can't honestly measure them (a fake-measured line would be simultaneously unstable, non-discriminating, AND dishonest — strictly worse than an honest description). **The ask to Sid:** approve (a) lines stay LLM-described for v1 (flagged, not measured), and (b) true *measured* line segmentation is deferred to a future R3.x (§13) with its own spike. Recommendation: **approve** — v1 still delivers the real stability win (palmType/traits stop flip-flopping) with no regression; measured lines are a genuine future enhancement, not a v1 gap. **This does NOT block R3 §9 step 1–2** (types + extraction are geometry-only regardless); it gates only the step-5 prompt framing.
- **#2 — Hand-landmark headless-Node path. ✅ RESOLVED BY SPIKE → GO.** `@tensorflow-models/hand-pose-detection@2.0.1` **runtime `'tfjs'`** runs headless in Node on pure-JS tfjs + WASM with a `sharp`-decoded `tf.tensor3d` — no DOM/canvas/WebGL, zero native compile. Fallbacks (on-device MLKit / Python microservice) NOT needed. `@mediapipe/tasks-vision` / `tfjs-node` rejected (not installed). **NEW residual (not a blocker):** weights aren't npm-bundled + tfhub default is deprecated → vendor/commit ~7.6 MB weights + custom fs load-router (proven).
- **#3 — Two-image complexity.** Palm is dominant + non-dominant (non-dominant premium-gated). Extraction, backfill, lazy fallback, and clear-on-reupload all run per hand — more surface than R2's single face image. Insight/synthesis read the dominant hand only.
- **Detection failures on real palm photos.** Validation passing ≠ landmarks found (odd pose, occlusion, cropping, lighting). Retry once, else mark `uncertain` and fall back to blob/defaults — never hard-fail the reading (R2 pattern).
- **Boundary stability.** Continuous ratios binned to categoricals can flip across runs if the detector is slightly nondeterministic. Fixed thresholds + quantized/rounded ratios; the spike must prove no flipping (R2 lesson).
- **Cross-device drift (if forced on-device).** Different MLKit versions/GPUs → different vectors for the same palm across phones → instability + client-trust boundary. Strong reason to keep extraction server-side.
- **Mounts are the cheekbone trap too.** Mount *prominence* (fleshiness) is a 3-D property invisible to 2-D landmarks — do NOT ship mount prominence as measured. Mount *position* proxies are low-value; defer.
- **Chiromancy is pseudoscience.** No empirical reference (unlike R1's astro.com). Honest framing: entertainment; the bar is reproducibility + internal consistency + tasteful, defensible copy. Keep the existing disclaimers + the `HONESTY_PREAMBLE` the prompt already imports. Curating the rules table needs a content/voice pass (Sid).
- **Open question (Sid):** keep the model-coined `palmEnergyType` (Leader/Healer/Creator/… Palm), convert it to a rules-derived closed set (TOTAL mapping, sign-off on names + logic), or drop it? (`palmType` Earth/Air/Water/Fire is already closed + measurable — keep it as the stable core regardless.)
- **R2 reuse dividend.** R3 reuses R2's whole scaffold pattern: `server/src/data/` rules-table convention, the extract-once/re-map invariant, `engine{}` pinning, per-hand mirror of `uploadFaceImage`'s persist+clear logic, and the backfill/lazy-fallback shape. Where R3 diverges: two images, a harder+possibly-skipped line-CV half, and an unproven headless landmark lib.

---

## 12. Files in scope (checklist)

**Server**
- `server/src/services/palmFeatures.service.ts` (NEW — hand-landmark detection → `HandFeatureVector`; `extractPalmLines` only if spike-greenlit)
- `server/src/data/chiromancy-rules.ts` (NEW — curated rules table + `mapFeaturesToPalmTraits`)
- `server/src/models/UserProfile.ts` (typed per-hand `palm*Features`/`palm*Traits`/`palmProfileResult`/`palmRulesVersion` sub-docs; keep `palmReading`/`palmReadingNonDominant: Mixed` as narrative caches)
- `server/src/types/shared.ts` + `packages/shared/types.ts` (new palm/hand types; `UserInsightProfile.palmTraits`)
- `server/src/services/upload.service.ts` (`uploadPalmImage`: extract+map after validation, **per hand**, persist, clear-on-reupload — mirror `uploadFaceImage` L101–155)
- `server/src/services/reading.service.ts` (`getPalmReading`: lazy extract fallback; feed traits)
- `server/src/services/claude.service.ts` (`generatePalmReading`: consume trait list)
- `server/src/prompts/palm-reading.prompt.ts` (prompt takes traits, not pixels, for substance; prose-never-contradicts rule; lines-as-flavor framing if geometry-only-v1)
- `server/src/services/insight.service.ts` (`buildUserInsightProfile`: source palm fields from the stable dominant-hand layer; optionally expose `palmTraits` — DATA only)
- `server/src/scripts/backfill-palm-features.ts` (NEW) + `package.json` `backfill:palm-features` / `:dry`
- `server/src/services/imageValidation.service.ts` (**unchanged** — keep `validatePalmImage`)
- `server/package.json` (add the spike-locked hand-landmark lib + reuse pinned `@tensorflow/tfjs`/`@tensorflow/tfjs-backend-wasm` from R2, reuse `sharp`; **NOT `tfjs-node`, NOT `@mediapipe/tasks-vision`**; pin EXACT versions)

**Mobile** (minimal — only if the spike forces on-device)
- `mobile/app/(main)/readings/palm.tsx`, `…/combined.tsx`, `…/career-destiny.tsx` (render the now-stable output — no shape change expected)
- *(fallback path only — if extraction must move on-device)* `mobile/app/(capture)/palm-capture.tsx` + a vision-camera hand-detector dep

**Coordinate with R5**: R3 lands the stable palm-trait DATA + makes the palm reading itself stable; **R5 wires `palmTraits` into the synthesis-prompt COPY + Fable 5 engine** (one of its four feature sets) — don't rewrite that copy twice.

---

## 13. Future / post-v1 roadmap — measured palm-line segmentation (R3.x)

> **Deferred, NOT dropped.** The spike proved *classical* CV can't measure the major lines reproducibly or discriminatingly — it did **not** prove measured lines are impossible. The honest route exists; it's just its own project, out of R3 v1 scope. Captured here so "geometry-only v1" is a deliberate, revisitable decision rather than a silent cap.

- **What it is**: promote heart/head/life/fate lines from LLM-described flavor to a **measured, reproducible feature layer** (presence / normalized length / a coarse depth-clarity band per line), feeding the `chiromancy-rules.ts` table the same way geometry does — so line-driven traits/scores become stable across runs, matching the palmType/geometry substrate.
- **The only honest way to do it**: a **trained palm-line segmentation model** (U-Net / ridge-segmentation CNN), NOT classical edge/ridge CV (the spike's ≤13.5% re-encode drift + skin-texture confound rules classical out — [arXiv 2102.12127] concurs classical "severely under-performs"). Runs as a **separate deployable** (likely a Python microservice, mirroring the R3 spike's "escalation" fallback) or a Node-runnable ONNX/tfjs export if one proves headless (the R2/R3 pure-JS+WASM discipline).
- **What it needs (real scope, own effort)**: a labeled palm-line dataset (or a usable pre-trained model + license), a training/eval pipeline, a **discrimination + reproducibility spike of its own** (the same two bars R3's spike applied — must clear BOTH before shipping, per the cheekbone criterion), plus infra/ops/latency/cost for the microservice.
- **Reproducibility must still hold**: extract-once-on-stored-bytes + persist the line features + re-map-not-re-detect (§6), and pin the model in `engine{}` exactly like the landmark model — a model bump = deliberate re-detect backfill, not a casual update.
- **Gating / trigger**: revisit **after v1 ships** and only if (a) Sid/product wants measured lines as a differentiator, and (b) a segmentation model clears its own feasibility spike on **real phone palm photos** (dataset-clean ≠ phone-real — same follow-up gate as §9 step 10). Until then, lines stay LLM-described flavor and the palm pillar's *measured* substance is geometry (palmType/traits/talents/archetype).
- **No wasted work**: v1's data model already isolates this cleanly — the `HandFeatureVector.lines?` block was specced as CONDITIONAL/omittable (§5), so adding a measured `lines` layer later is an additive `RULES_VERSION` + schema extension, not a rewrite.
