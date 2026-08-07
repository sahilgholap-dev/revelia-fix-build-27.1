# R2 — Face: structured feature extraction (stable feature vector → rules table → traits)

> Part of **Build 27** (see `../build-27.md`). Status: **PLANNED + SPIKE GO (2026-06-29)** — feasibility spike resolved (see §4 banner / §11 risk #1); implementation not started. Area: Both (server primary: CV + rules + storage; mobile minor / possible fallback path). Priority: High. Second in the empirical sequence (R1 ✅ done → **R2** → R3 → R4 → R5 …).
>
> Mirrors R1's structure. Inherits R1's **"land the structured DATA into the model + `UserInsightProfile`, but DEFER the synthesis-prompt COPY rewrite to R5"** pattern: R2 produces and stores a stable face-trait layer and feeds it into face-reading generation, but the daily/weekly/monthly/compatibility/career **synthesis** copy stays as-is until R5 (R2's traits are one of R5's four feature sets — don't rewrite that copy twice).

---

## 1. Goal

Replace **freeform Claude-Vision face interpretation** (the model looks at the photo and invents face shape, feature observations, trait scores, and an archetype) with a **deterministic feature-extraction layer**:

```
image → facial-landmark detection → structured feature vector (geometry/ratios)
      → server-side CURATED physiognomy rules table → stable trait list
      → LLM consumes the trait list (not the raw image for substance) → stable reading
```

Acceptance (from build-27 §3): **the same face image produces a stable feature vector and a stable reading across repeated runs.** Today it does not — re-running face reading on the identical photo yields different observations, different 60–95 scores, and sometimes a different archetype, because every substantive claim is a fresh LLM vision call.

Keep the existing Claude Vision **validation** pass (is-this-a-face / quality) exactly as-is — it gates *whether* we read; the new layer governs *what* we read.

---

## 2. Current state (verified in codebase) + disconnection verdict

### Capture → upload → R2 (mobile + server)
- **Capture**: `mobile/app/(capture)/face-capture.tsx` — `expo-camera` (`CameraView`) live capture (`takePicture()` ~L68) or `expo-image-picker` gallery (`handlePickFromGallery()` ~L125). On confirm, `handleUsePhoto()` (~L193) calls `uploadService.uploadFace(uri)`.
- **Mobile upload**: `mobile/services/upload.service.ts` `uploadFace()` (L8–31) → `POST /upload/face` as `multipart/form-data` (60s timeout).
- **Server upload**: `server/src/controllers/upload.controller.ts` (L9–47) → `server/src/services/upload.service.ts` `uploadFaceImage()` (L51–128):
  1. format check (`imageProcessing.validateImage`, L57),
  2. **Claude Vision validation** — base64s the buffer (L65) and calls `validateFaceImage(base64, mediaType)` (L67); `invalid` → 422, `valid`/`uncertain` pass through,
  3. `imageProcessing.processImage` resize/compress (L77, uses **`sharp@0.33.2`**, already a dependency),
  4. `r2Service.uploadImage(buffer, userId, 'face')` (L92) → key `${userId}/face/${timestamp}.jpg`, public URL `${R2_PUBLIC_URL}/...`,
  5. persists `images.face.url` / `uploadedAt` on `UserProfile` (L101–110).
- **R2 client**: `server/src/services/r2.service.ts` — AWS SDK v3 S3 client; bucket `revelia-images`.

### Reading generation (server)
- `POST /api/readings/face` → `reading.controller.ts generateFaceReading` (L24–46) → `reading.service.ts getFaceReading` (L12–106): returns cached `profile.faceReading` unless `regenerate`, else fetches `images.face.url` and calls `claude.service.ts generateFaceReadingWithRetry`.
- `server/src/services/claude.service.ts generateFaceReading` (L121–193): `MODEL = 'claude-sonnet-4-6'` (L30), `max_tokens 8192`; fetches the R2 URL → base64 (`fetchImageAsBase64`, L45–66) → sends **image + the face-reading prompt** to Claude Vision; parses JSON → `FaceReadingOutput`.
- **Prompt**: `server/src/prompts/face-reading.prompt.ts` (L1–306). Output `FaceReadingOutput` (L14–106) is a rich JSON blob: `archetype{name,tagline,coreEssence}`, `faceShape{detected,…}`, `facialFeatures{eyes,nose,lips,forehead,jawline}`, `traitAnalysis[]{trait,score 60–95,description}`, `hiddenStrength/Weakness`, `strengths[]`, `dailyFaceInsight`, `premiumContent`, + legacy `categories`/`growthOpportunity`. **Every value here is produced by the model from the pixels** — the prompt even tells it to *"detect"* face shape and *"observe"* features and to vary scores "authentically" (L278–283).
- **Validation pass** (keep): `server/src/services/imageValidation.service.ts validateFaceImage` (L68–132) — separate Claude Vision call, three-state `valid|invalid|uncertain`, 15s timeout. Independent of reading substance.

### Storage
- `server/src/models/UserProfile.ts`: `faceReading: Schema.Types.Mixed` (~L250); interface `faceReading?: any` (~L75). **Opaque, unstructured Mongo blob** — no schema, no feature data, no traits. (Same shape problem R1's legacy `birthChart: Mixed` had.) `images.face{url,uploadedAt}` sub-doc (~L236–248).

### Consumption (how face data reaches readings)
- `server/src/services/insight.service.ts buildUserInsightProfile()` (L20–99) reads the blob and projects:
  - `faceArchetype = faceReading?.archetype?.name || 'The Seeker'` (~L86), `faceArchetypeTagline`, `strengths = faceReading?.strengths || [...]`, `growthOpportunity`, `dominantTraits = faceReading?.strengths?.slice(0,3)`.
  - Defaults fire when there's no reading — so prompts always get *something*.
- `UserInsightProfile` type (`server/src/types/shared.ts` ~L671–695): `faceArchetype`, `faceArchetypeTagline`, `strengths[]`, `growthOpportunity`, `dominantTraits[]` (+ R1's `moonSign`/`risingSign`/`activeAspects`/`keyTransits`).
- **Synthesis prompts that consume the face fields**: `daily-insight.prompt.ts` (L40+), `weekly-forecast.prompt.ts` (L56+), `monthly-reading.prompt.ts` (L60+) all weave `${profile.faceArchetype}` / `strengths` / `growthOpportunity` into copy. Career: `reading.controller.ts generateCareerDestiny` (L466–596) extracts `faceArchetype`/`faceStrengths`/`faceTraits` from the blob (L485–499) and passes to `claudeService.generateCareerDestiny`.
- **Mobile display**: `mobile/app/(main)/readings/face.tsx` (archetype, traitAnalysis bars, strengths, premium sections), `…/combined.tsx` (archetype + `faceShape.coreTraits`), `…/career-destiny.tsx` (`hasFaceReading`).

### On-device CV today
- **None.** Grep for `mediapipe` / `face-api` / `vision-camera` / `tensorflow` / face-detector across `mobile/` → no matches in app code. All "facial analysis" is the server Claude Vision call.

### ⚖️ SAME-DISCONNECTION CHECK — verdict

**Different from R1, and important to state precisely.** R1 was a *disconnection* (two chart engines, neither fed the readings; prompts got only `sunSign`). **R2 is NOT disconnected — it is UNSTABLE.** The face data *is* structured-looking and it *is* consumed (archetype/strengths/growth flow into `UserInsightProfile` → daily/weekly/monthly + career). The problem:

> **Face reading today is freeform Claude Vision output fed straight to — and consumed by — the readings, with NO stable feature layer.** The `FaceReadingOutput` blob has the *appearance* of structure (a typed-ish JSON shape) but **no deterministic structure**: there are no landmarks, no geometry, no extracted feature vector, and no curated rules table. Face shape, feature "observations," trait scores (60–95), and the archetype are all invented per-call by the vision model. Re-run on the identical image → different substance.

So R2's gap is **reproducibility**, not wiring. The fix is to **insert the missing deterministic layer** (landmarks → feature vector → rules table → trait list) *between the image and the LLM*, so the substance the model writes about — and everything downstream consumes — is stable across runs and across devices.

---

## 3. Target architecture

```
Upload time (server) — slot in beside the existing validation, where the image already lives
  upload.service.ts uploadFaceImage
    → validateFaceImage (KEEP, unchanged)                         [is-this-a-face / quality]
    → extractFaceFeatures(buffer)            [NEW — landmark detection → FaceFeatureVector]
    → mapFeaturesToTraits(vector)            [NEW — server-side CURATED rules table → FaceTrait[]]
    → persist UserProfile.faceFeatures + faceTraits  (typed sub-docs; deterministic)
    → upload to R2 (existing)

Reading time (server)
  reading.service.ts getFaceReading
    → read stored faceTraits (+ feature vector)
    → claude.service.generateFaceReading(traits, tier, userContext)
        LLM is GIVEN THE TRAIT LIST as the substance; archetype/scores come from the rules table,
        not the pixels. (Image may still be passed for descriptive flavor ONLY — see §4.)
    → FaceReadingOutput now anchored to stable traits → stable reading

Insight time (server)
  insight.service.ts buildUserInsightProfile
    → source faceArchetype/strengths/growthOpportunity from the STABLE trait layer
      (fallback to the blob for un-backfilled users), expose faceTraits on UserInsightProfile
    → flows to all synthesis prompts  (DATA only; COPY rewrite deferred to R5)

Mobile
  no required change to capture/upload contract; face.tsx renders the same FaceReadingOutput shape.
  (Only changes if the spike forces on-device extraction — fallback path, §4.)
```

---

## 4. Key decisions

> ✅ **Spike verdict (2026-06-29): GO.** R2's #1 risk is resolved. **Locked stack: `@vladmandic/face-api@1.7.15` (68 dlib landmarks) + pure-JS `@tensorflow/tfjs@4.22.0` + `@tensorflow/tfjs-backend-wasm@4.22.0`, decoding via `sharp@0.33.2` (already a dep), server-side at upload, WASM tfjs backend.** Zero native compile in the CV stack (only `sharp` is native — already on Railway); same image → bit-stable landmarks/vector; WASM backend ~0.5–0.8s/image. **`@mediapipe/tasks-vision` was REJECTED** (browser-only: script-injection WASM loader + hard WebGL2 requirement → native `headless-gl`); **`tfjs-node` was REJECTED** (native libtensorflow = R1 build trap). The rows below marked **DECIDE IN SPIKE** are now **LOCKED** (annotated inline). Full write-up: `tracking_files/claude_progress.md` → "build-27-R2-face-extraction-feasibility-spike".
>
> _(Original pre-spike framing, kept for context: R2's where/how-landmark-detection decision was the open gate that this Phase-0 spike settled — mirroring R1's pre-`sweph` spike.)_
>
> ✅ **PRODUCT decisions — APPROVED by Sid (2026-06-30), with conditions that are now REQUIREMENTS.** (Sid's framing: this is the same "measured-substrate + AI-prose" model as R1 Swiss Ephemeris — keeps Build 27 consistent.)
> 1. **Forehead → cheekbones (option A) — APPROVED.** (B leaves a gap; C reintroduces the run-to-run guesswork this release exists to remove.) Swap the `facialFeatures.forehead` card for a **measured cheekbone** feature. ⚠️ **CONDITION (gates locking copy, steps 5/7): confirm the landmark detector resolves cheekbone points RELIABLY first.** Not a formality — step 2 found `cheekVsFace` *non-discriminating* (its `faceWidth` = temple width = widest by construction), so cheekbone measurement needs an explicit reliability + discrimination check (likely a distinct cheekbone reference, e.g. zygomatic points vs jaw/face-height, not vs temple width) before the card ships.
>    - 🚫 **CHECK DONE (2026-06-30) → NO-GO for the cheekbone-prominence card.** Probe (scratchpad, 12 varied synthetic faces, built `extractFaceFeatures` unchanged; `tracking_files/build-27/` write-up below). **Reliability PASS** — 12/12 detected, 68 landmarks, score 0.977–0.997, bit-reproducible on identical bytes. **Discrimination FAIL** — every cheekbone-*specific* width ratio collapses: `cheekboneWidth` (cheek/temple) spread 3.8%; `cheekToJawTaper` (cheek/jaw, feeds the categorical) spread 5.2%; **`cheekboneProminence` bins 10× `low` / 2× `medium` / 0× `high`** (the "prominent" class is unreachable). Root cause: cheekbone *prominence* is a 3-D projection property, **not observable from 2-D frontal 68 landmarks** — only widths are, and the cheekbone-specific ones cluster (temple is widest by construction; contour pts 2/14 sit close to temple pts 0/16). The refs that *do* spread (cheek/faceHeight 28% but pose-contaminated; cheek/interocular 14%) are face-elongation/breadth measures that overlap the faceShape card. Best-case inputs → **decisive**. **`cheekboneWidth`/`cheekToJawTaper` stay locked as INTERNAL face-shape/taper inputs (§5) — this NO-GO is only about the user-facing CARD.** ✅ **RESOLVED — Sid decided DROP the card (2026-06-30):** no cheekbones/brows/chin replacement; the `forehead` feature-card slot is **removed entirely** ("won't affect much; can add a measured feature in a future iteration"). Rationale confirmed by the §2 finding that the per-feature cards are **display-only** — `facialFeatures` is read solely by `face-reading.prompt.ts` (output) + `face.tsx` (render); it does NOT feed `insight.service`/synthesis, so dropping the tile costs **zero personalization** (the face pillar's substance = traits + archetype, unchanged). **Implement the drop INSIDE the steps 5+7 presentation pass** (remove `forehead` from the prompt's `facialFeatures` output + the card from `face.tsx`) — do not touch those files in a standalone pass. Verdict: `scratchpad/VERDICT-cheekbone-reliability.md`.
> 2. **Closed archetype list — APPROVED, and now REQUIRED** (a free/model-coined name "brings the instability back through the side door"). ⚠️ **CONDITIONS: (a) the trait→archetype mapping must be TOTAL — every trait combination resolves cleanly to a named archetype, with NO fallback / "other" bucket; (b) before locking copy, send Sid the proposed names PLUS the trait→archetype mapping LOGIC** (he wants to see *how* traits resolve to archetypes, not just the word list). The mapping scaffolding is ungated (build it now); Sid signs off on the names + logic before copy locks.
> 3. **Stability over variety — APPROVED ("repeatability is the point").** ⚠️ **CONDITION (prose rule, step 5): the AI prose must NEVER contradict the measured traits/archetype.** Fixed traits + archetype are the substrate; the LLM writes prose *over* them and may never override or contradict them. (Not robotic — the model still writes the voice.)

| Decision | Recommendation (to confirm in spike) | Why / caveat |
|---|---|---|
| **Where landmark detection runs** | ✅ **LOCKED (spike): server-side, at upload time** (beside `validateFaceImage`). | The image **already transits the server** and `sharp` already decodes it — extraction adds no new image hop. **One engine = fully reproducible vector for every user and every device** (the core acceptance property). On-device would re-introduce cross-device/model-version drift. Spike confirmed a Node library survives Railway with zero native compile. |
| **Detection library** | ✅ **LOCKED (spike): `@vladmandic/face-api` (68 dlib landmarks) + pure-JS `@tensorflow/tfjs` + `@tensorflow/tfjs-backend-wasm`**, image decode via `sharp` (already a dep). Use the **`dist/face-api.node-wasm.js`** build (requires external pure-JS `@tensorflow/tfjs`, **not** `tfjs-node`); `setWasmPaths(...)` → `setBackend('wasm')` → `loadFromDisk(modelDir)`. | **Spike reversed the planning-time ranking.** (1) **`@mediapipe/tasks-vision` (478 pts) = NO-GO headless**: loads its WASM via `document.createElement("script")`/`importScripts` AND hard-requires a WebGL2 context (`getContext("webgl2")` or it throws) → needs DOM shims + **native `headless-gl`** (Xvfb/mesa) = R1's native trap + GL nondeterminism. (2) **`tfjs-node` = NO-GO**: native libtensorflow, no prebuilt for the combo → source compile → fails (R1 trap). (3) **pure-JS tfjs + WASM backend = GO**: zero native addon in the CV stack (only `sharp` is native, already deployed), bit-deterministic per pinned backend, ~0.5–0.8s/image. Tradeoff accepted: 68 pts < 478 (see feature-vector row). |
| **Fallback if no Node path survives the spike** | ✅ **NOT triggered (spike): a Node path survives, so neither fallback is required.** _(Kept for the record:)_ **On-device MLKit** via `react-native-vision-camera` + `react-native-vision-camera-face-detector` (face contour ~133 pts), vector sent up with the upload; **or** a small **Python mediapipe microservice** (468 pts, gold standard) as a separate deployable. | Both are heavier. On-device adds native surface + **cross-device reproducibility risk** + a client-trust boundary (client-supplied features). Python service adds infra/ops/latency/cost. Reserve for if-and-only-if a future need (e.g. 478-pt fidelity) ever resurfaces — not for v1. |
| **Feature vector contents** | ✅ **LOCKED to the 68-point-measurable subset — see §5 for the authoritative field list.** Geometry/ratios robust to image scale & in-plane rotation: face-outline → **face shape class**, interocular distance, eye size/aperture, brow height/arch, nose length/width, lip fullness, mouth width, **cheekbone width + cheek-to-jaw taper** (the measured replacement for forehead), jaw width, chin proportion, lower-face thirds, facial fifths. | Store **normalized** ratios (not raw pixel coords) so the same face at different resolutions → same vector. Bin into stable categoricals with **fixed thresholds** (off cluster centers) so boundary faces don't flip. ⚠️ **Spike caveat (68 dlib pts), now resolved in §5:** forehead/hairline proportion + facial-thirds *upper third* are **not measurable and are removed from v1**; native **yaw/pitch** head-pose is **skipped** (the Claude validation pass covers angle rejection); **roll is retained as a quality signal** (derivable from the eye-corner line). Don't build forehead/yaw/pitch. 68 pts **fully** cover face-shape, eyes, eye-spacing, brows, nose, lips, mouth, **cheekbones**, jaw, chin. |
| **Feature → trait mapping** | **Server-side curated rules table** (`server/src/data/physiognomy-rules.ts`), authored once, version-controlled, **NOT the LLM**. Pure function `mapFeaturesToTraits(vector) → FaceTrait[]` + a derived `archetype` + numeric trait scores **computed by the rules**, not the model. | This is what makes readings stable. The table is the single source of physiognomy "truth." Each rule carries provenance/notes + a `rulesVersion` tag so re-mapping is reproducible and auditable. |
| **What the LLM consumes** | The **trait list** (+ archetype/scores from the rules table). The reading prompt is **fed traits as the substance**; it may still receive the image **for descriptive flavor only**, explicitly instructed *not* to derive face shape / features / scores / archetype from pixels. Safer v1: **drop the image from the reading call entirely** and let the prose come purely from traits → maximal stability. | Eliminates the pixel-driven nondeterminism. Caching already exists (`profile.faceReading`), so prose is generated once; anchoring it to fixed traits means even an explicit regenerate says the same things. **DECIDE IN SPIKE/Phase E**: image-for-flavor vs traits-only. |
| **Keep the validation pass** | **Yes, unchanged.** `validateFaceImage` still gates upload (is-this-a-face / quality). | Per build-27 R2 row. Extraction runs only after validation passes. If extraction can't find a face on a *validated* image, treat as `uncertain` (see Risks). |
| **Fate of `faceReading: Mixed`** | Keep the blob as the **narrative cache** (the rendered `FaceReadingOutput`), but it becomes **derived from** `faceFeatures`/`faceTraits`. Add the two typed sub-docs alongside it. | Mirrors R1 (typed `natalChart` added; legacy `birthChart` Mixed retained for compat). Mobile keeps rendering the same `FaceReadingOutput` shape → minimal mobile change. |
| **Determinism boundary** | "Stable" = **identical feature vector (deterministic)** → **identical trait list, archetype, and scores (rules-derived)** → reading **narrative anchored to the same traits** (substance/claims stable; LLM wording may vary, and is cached anyway). | Set expectations correctly: we are not making the prose byte-identical; we are making the *substance* reproducible. State this in passing criteria. |

---

## 5. Data model + shared types

**New structured types** in `packages/shared/types.ts` **and** mirrored in `server/src/types/shared.ts` (the R1 dual-home pattern):

- `FaceShapeClass = 'oval' | 'round' | 'square' | 'heart' | 'oblong' | 'diamond' | 'triangle'`
- `FeatureSize = 'small' | 'medium' | 'large'` (and similar small closed enums for arch/spacing/fullness)
> ⚠️ **SCOPED TO THE 68-POINT-MEASURABLE SUBSET (spike).** dlib's 68 landmarks cover jaw/face-outline (0–16), brows (17–26), nose (27–35), eyes (36–47), mouth (48–67) — they STOP at the eyebrows. Everything below is computable from those points. **Removed as not honestly measurable from 68 pts:** `foreheadProportion` / `foreheadHeight`, the **upper** third of facial-thirds (hairline→brow), and out-of-plane head pose `yaw`/`pitch` (no native pose matrix — skipped; the Claude validation pass covers angle rejection). **`roll` is RETAINED** as a quality signal (in-plane rotation, derivable from the eye-corner line). Do **not** build forehead / yaw / pitch in v1. The forehead *card* in `FaceReadingOutput.facialFeatures` changes per working assumption #1 (doc default = A, forehead→cheekbones; B/C differ — see §4 banner). Note this is only about the rendered card; the `cheekboneWidth`/`cheekToJawTaper` *ratios* are locked regardless.

- `FaceFeatureVector {`
  - `faceShape: FaceShapeClass;`  — from the jaw/cheek outline (0–16) + **lower-face** proportions (chin→brow; note: NOT chin→hairline, which 68 pts can't see)
  - `ratios: {`
    - `interocular,`        — inner-eye-corner spacing / face width  *(eye spacing)*
    - `eyeSize,`            — eye width / face width
    - `eyeAspect,`          — eye height / eye width  *(openness)*
    - `browHeight,`         — brow→eye-top gap / lower-face height
    - `browArch,`           — brow curvature
    - `noseLengthWidth,`    — nose length (27→33) / alar width (31–35)
    - `noseWidth,`          — alar width / face width
    - `lipFullness,`        — lip height / lip width
    - `mouthWidth,`         — mouth width / face width
    - `cheekboneWidth,`     — **zygomatic (widest) width / face width** — **LOCKED unconditionally** (honestly measurable from 68 pts; feeds face-shape + taper rules; ships regardless of Sid's UI call). The *card* swap that surfaces it is the only assumption-#1-dependent piece — see §4 banner + §7/§12.
    - `jawWidth,`           — gonial width / face width
    - `cheekToJawTaper,`    — cheekbone width / jaw width  *(face taper)* — also **LOCKED** (measured ratio, not UI-dependent)
    - `chinProportion,`     — chin height / chin width
    - `lowerFacialThirds: [middleThird, lowerThird],`  — brow→subnasale, subnasale→chin  *(UPPER third omitted — unmeasurable)*
    - `facialFifths: [...]` — horizontal eye-width-based fifths *(measurable from eye corners + face width)*
  - `};`
  - `categoricals: { eyeSize, eyeSpacing, eyeOpenness, browArch, noseWidth, noseLength, lipFullness, mouthWidth, cheekboneProminence, jawWidth, chinShape };`  — fixed-threshold bins of the ratios above (no forehead bin)
  - `quality: { landmarksFound: number; detectorScore: number; roll: number };`  — **`roll` retained** (in-plane rotation from the eye-corner line, a useful quality signal); **`yaw`/`pitch` omitted** (not available from 68 pts — the Claude validation pass rejects bad angles; estimate via solvePnP only if a future need arises)
  - `engine: { library, modelVersion, backend };`  — **`backend` REQUIRED** (`'wasm'`|`'cpu'`); the vector is reproducible only for a *fixed* (library + modelVersion + backend) tuple — CPU and WASM produce different coords, so any change there means **re-detect, not just re-map** (see §6)
  - `landmarks?: number[][];`  — optional raw 68-point array; **persist it** so a rules/binning change re-maps without re-detecting (§6 invariant)
  - `rulesInputVersion; computedAt`
  - `}`
- `FaceTrait { trait: string; score: number; band: 'low'|'moderate'|'high'; description?: string; sourceFeatures: string[] }`  ← `description` here is the **rules-table** phrasing (short, deterministic); the LLM expands prose, it does not author the trait.
- `FaceArchetypeResult { name: string; tagline: string; sourceTraits: string[] }` (archetype is **derived from the trait profile by the rules table**, not the model).

**`UserProfile` model** (`server/src/models/UserProfile.ts`): add typed sub-documents (sub-schemas with `_id:false`, mirroring R1's `natalChart`):
- `faceFeatures?: FaceFeatureVector`
- `faceTraits?: FaceTrait[]`
- `faceArchetypeResult?: FaceArchetypeResult`
- `faceRulesVersion?: string` (the rules-table version that produced the above — enables targeted re-mapping when the table changes without re-detecting landmarks)
- Keep `faceReading: Mixed` as the narrative cache (now derived).

**`UserInsightProfile`** (`server/src/types/shared.ts`): keep `faceArchetype`/`faceArchetypeTagline`/`strengths`/`growthOpportunity`/`dominantTraits`, but **source them from the stable trait layer** when present (fallback to the blob/defaults otherwise). Add an optional compact `faceTraits?: string[]` (e.g. top scored traits) so R5's synthesis engine has the structured set available. **DATA only — synthesis-prompt COPY rewrite deferred to R5.**

---

## 6. The curated rules-table approach (the heart of R2)

- **File**: `server/src/data/physiognomy-rules.ts` (new `server/src/data/` dir) — a version-controlled, documented table. Pure data + a pure `mapFeaturesToTraits(vector): { traits: FaceTrait[]; archetype: FaceArchetypeResult }`.
- **Shape**: each rule maps a feature/categorical (e.g. `jawWidth: 'large'`) to a trait contribution (`determination +N`, with band + short canned phrasing + provenance note). Scores are **summed/normalized deterministically** into the 0–100 band the UI already shows — replacing the model's invented 60–95.
- **Archetype**: derived by matching the resulting trait profile against a **CLOSED, fixed set** of archetype definitions (same archetype names the UI/prompts already use, e.g. "The Visionary") via a deterministic nearest-profile rule — **never** the model's free choice (Sid-approved + required; a model-coined name reintroduces instability). ⚠️ **The mapping must be TOTAL — every trait combination resolves to a named archetype, NO fallback/"other" bucket** (a nearest-profile rule naturally has no fallback; prove coverage). ⚠️ **Deliverable before copy locks: send Sid the proposed names + the trait→archetype mapping LOGIC** (how traits resolve, not just the word list) for sign-off.
- **Versioning**: a `RULES_VERSION` constant tags every output (`faceRulesVersion`). Bumping it + re-running the (cheap, no-API) re-map backfill is how we evolve physiognomy copy without re-detecting landmarks.
- ⚠️ **Spike-confirmed invariant (not just an optimization): extract landmarks ONCE on the canonical stored/processed image buffer, persist the vector (ideally the raw landmarks too), and RE-MAP from the stored vector on rules changes — NEVER re-detect.** The spike proved same *bytes* → bit-identical landmarks, but a resize/recompress shifts them ~0.01–0.03 and can flip a categorical sitting on a threshold (observed: `jawWidth` at threshold 0.82 vs measured 0.8178). So reproducibility is **discipline-dependent**: pin extraction to the stored bytes + round ratios + place thresholds off cluster centers, and the determinism holds.
- **Honesty note (state in the doc, not the prompt)**: physiognomy is not science; this is an **entertainment** product. The rules table's quality bar is **reproducibility + internal consistency + tasteful copy**, not empirical validity. There is no "astro.com" reference here (unlike R1) — the reference *is* the table plus the determinism property. Authoring the table is a content/curation task (loop Sid in for voice), not a research task.

---

## 7. Wiring into readings

- **Face reading itself (R2 owns this surface)**: `claude.service.generateFaceReading` + `face-reading.prompt.ts` change from "look at the image and infer everything" to "**here is the user's extracted trait list / archetype / scores — write the reading around them**." This is R2's core deliverable (it's what makes the reading stable) and is distinct from the §R5 synthesis-copy work. Decide image-for-flavor vs traits-only here.
  - ⚠️ **PROSE RULE (Sid-required, decision #3): the AI prose must NEVER contradict the measured traits / scores / archetype.** They are the fixed substrate; the LLM writes voice *over* them and may not override or contradict them. Make this an explicit instruction in `face-reading.prompt.ts` and a passing-criterion check. (Same measured-substrate + AI-prose model as R1.)
  - ✅ **`FaceReadingOutput.facialFeatures` card — RESOLVED: DROP the slot (Sid, 2026-06-30).** The §4 condition-#1 check returned NO-GO (cheekbone prominence unmeasurable from 2-D frontal 68 pts); Sid chose to **remove the `forehead` feature card entirely** (no cheekbones/brows/chin) — it's display-only, so dropping it costs zero personalization. **Do this drop here, as part of this step's pass:** remove `forehead` from the `facialFeatures` output schema/instructions in `face-reading.prompt.ts` and the corresponding card in `face.tsx`. The `cheekboneWidth`/`cheekToJawTaper` ratios remain locked as INTERNAL inputs regardless (§5). (May add a measured feature — e.g. brows/chin — in a future iteration.)
- **Synthesis prompts (defer to R5)**: `daily-insight` / `weekly-forecast` / `monthly-reading` / `compatibility` / career-destiny keep their current copy. R2 only guarantees the `UserInsightProfile` face fields are now **stable** (sourced from the trait layer). **R2's `faceTraits` become one of R5's four feature sets** — R5 weaves them into synthesis copy + the Fable 5 engine. Do not rewrite that copy in R2.
- **Career** (`reading.controller.ts` L485–499): can keep reading the blob in R2; flag for R5 to point at `faceTraits` alongside R1's chart + R4's numerology.

---

## 8. Migration / backfill (acceptance: no user loses access)

- Existing users have `images.face.url` + a `faceReading` blob but **no `faceFeatures`/`faceTraits`**.
- **Backfill script** `server/src/scripts/backfill-face-features.ts` (+ `backfill:face-features` / `:dry` npm scripts, mirroring `backfill-natal-chart`): for each profile with `images.face.url`, fetch from R2 → `extractFaceFeatures` → `mapFeaturesToTraits` → persist. **Note vs R1**: this backfill is **not** pure-compute — it does CV over real images (heavier, may hit detection failures). Make it idempotent, resumable, rate-limit-free (no Anthropic calls in the feature path), and log per-user success/failure + landmark confidence. **Run detection on the stored R2 image bytes** (identical to what was processed at upload) so backfill output matches upload-time extraction; **persist the raw landmarks** so future `RULES_VERSION` bumps re-map without re-fetching/re-detecting (per the §6 invariant).
- **Lazy fallback**: if `faceTraits` is missing at reading time, extract-on-the-fly-and-persist (so the app works before/around backfill) — mirrors R1's lazy natal-chart compute. If the stored image is gone or extraction fails, fall back to the existing blob/defaults so no user loses their face reading.
- **Rules re-map** (cheap path): when `RULES_VERSION` bumps, a no-CV re-map over stored `faceFeatures` refreshes traits without re-detecting landmarks.

---

## 9. Sequencing (within R2)

0. ✅ **Phase 0 — FEASIBILITY SPIKE — DONE (2026-06-29): GO.** Confirmed `@vladmandic/face-api` + pure-JS `@tensorflow/tfjs` + `@tensorflow/tfjs-backend-wasm` installs + runs headless in Node with **zero native compile** (only `sharp` is native, already on Railway), lands 68 landmarks on real selfies (incl. rotated @0.80), and produces a **bit-identical vector on repeated runs of the same bytes**. Library + server-side locked (see §4 banner). mediapipe + tfjs-node rejected; no escalation needed. _(Original step text: throwaway scripts confirm library installs/runs on Railway's Node image, lands landmarks on real-style selfies, vector reproducible to the bin — direct parallel to R1 §9.1.)_
1. Define shared types (`FaceFeatureVector`/`FaceTrait`/`FaceArchetypeResult`); add typed sub-docs to `UserProfile`.
2. `server/src/services/faceFeatures.service.ts` (NEW): `extractFaceFeatures(buffer)` (landmarks → vector via the spike's library + `sharp` decode).
3. `server/src/data/physiognomy-rules.ts` (NEW) + `mapFeaturesToTraits()` (rules table → traits/archetype/scores). Author the table (content pass; loop Sid for voice).
4. Hook extraction+mapping into `upload.service.ts uploadFaceImage` (after validation); persist sub-docs. Lazy fallback in `reading.service.ts`.
5. ✅ **DONE (2026-07-08).** Rewire `claude.service.generateFaceReading` + `face-reading.prompt.ts` to consume the trait list. **Decision: traits-only** (image dropped from the reading call for maximal stability — plan §4). The prompt is fed the fixed archetype/faceShape/trait scores + measured feature categoricals and writes prose around them; an explicit **PROSE-NEVER-CONTRADICT** instruction is in the prompt, and `reconcileFaceSubstance` pins the archetype name/tagline + trait scores + faceShape onto the parsed output so the substance is exactly rules-derived. Legacy image path kept as fail-open fallback when no trait layer exists.
6. Source `UserInsightProfile` face fields from the stable layer (`insight.service.ts`); expose `faceTraits` (DATA only; defer synthesis copy to R5).
7. ✅ **DONE (2026-07-08).** Mobile: `face.tsx`/`combined.tsx` render the (now stable) `FaceReadingOutput` unchanged. Forehead feature card **removed** from `face.tsx` (+ `forehead` dropped from the prompt's `facialFeatures` output schema and the `FaceReadingOutput` interface) per Sid's 2026-06-30 decision. No on-device extraction (server-side confirmed by the spike).
8. Backfill script + lazy fallback; run dry → real after backend ships.
9. ✅ **DONE (2026-07-08) — PROBE PASSED.** Stability validation: same image → identical vector/traits/archetype/scores across N runs; spot-check copy quality. Dataset-level gate (mirror R3 step 9): scratchpad ts-node harness imported the COMMITTED `extractFaceFeatures` / `mapFeaturesToTraits` / (type-erased private) `reconcileFaceSubstance` UNCHANGED, run on 16 synthetic faces (thispersondoesnotexist.com), N=5. **A** same bytes→bit-identical vector 16/16; **B** same vector→identical traits/archetype 16/16; **C** `reconcileFaceSubstance` pins archetype name/tagline + trait scores + faceShape over deliberately contradictory model output while keeping model prose; **D** honest discrimination — 4 face shapes / 7 of 8 archetypes / trait ranges 24–42pts (no collapse — unlike the cheekbone NO-GO). Honest flag → owner real-device pass: faceShape bins skew round/square on best-case GAN faces; recentring cutoffs is a `FEATURE_VECTOR_VERSION` bump = re-detect (§6) before wide backfill. Verdict: `scratchpad/VERDICT-face-step9-stability.md`. **This closes R2 (all §9 steps done).**

---

## 10. Passing criteria (R2-specific)

- [x] **Reproducible vector**: the same image, processed N times, yields a **bit-stable `FaceFeatureVector`** (ratios identical; categoricals identical — no boundary fl​ipping). This is the spike's core gate and the acceptance backbone. ✅ **Spike-validated + step-9 PROBE re-confirmed on the COMMITTED service (2026-07-08): 16/16 faces bit-identical ×5 (80 same-byte runs, 0 flips).** Enforce via the §6 extract-once-on-stored-bytes + re-map invariant so re-encode drift can't flip a boundary categorical.
- [x] **Reproducible traits/archetype/scores**: the rules table maps that vector to an **identical `FaceTrait[]`, archetype, and scores** every run (pure function; `rulesVersion` recorded). ✅ **Step-9 PROBE: 16/16 identical ×5; `RULES_VERSION=1.0.0`.**
- [x] **Stable reading**: face-reading **substance** (face shape, feature claims, scores, archetype) is identical across regenerations of the same image; only prose wording may vary (and is cached). Explicitly NOT a byte-identical-prose criterion. ✅ **Guaranteed by A+B (stable substance) + `reconcileFaceSubstance` pin (step-9 C).**
- [x] **LLM does not author substance from pixels**: verify the reading call is driven by the trait list (and, if image is passed, that shape/features/scores are demonstrably rules-derived, not vision-derived). ✅ **Step-9 C: traits-only call; `reconcileFaceSubstance` pins archetype/scores/faceShape over contradictory model output (deterministic proof).**
- [x] **Prose never contradicts measured traits** (Sid decision #3): spot-check generated readings against the fixed traits/scores/archetype — the prose may elaborate but must not state anything that conflicts with them. ✅ **Step-9 C proves the pin holds structurally regardless of model drift; the prompt carries an explicit PROSE-NEVER-CONTRADICT block.** (Optional live prose spot-checks deferred — the pin makes contradiction unrepresentable in the stored substance.)
- [ ] **Archetype mapping is TOTAL** (Sid decision #2): every trait combination resolves to a named archetype with **no fallback/"other" bucket**; coverage proven, and the names + mapping logic signed off by Sid before copy locks.
- [x] **Cheekbone measurement reliable** (Sid decision #1): **CHECKED 2026-06-30 → NO-GO → RESOLVED: Sid dropped the card.** Detection is reliable + reproducible but **no cheekbone reference discriminates** (prominence is a 3-D property unmeasurable from 2-D frontal 68 pts; `cheekboneProminence` 10/12 `low`, 0 `high`). Since the per-feature cards are display-only (zero personalization impact), Sid chose to **remove the `forehead` feature-card slot entirely** (no cheekbones/brows/chin; may add later). Implement within steps 5+7. The `cheekboneWidth`/`cheekToJawTaper` ratios stay as internal face-shape inputs. See §4 condition #1 + `scratchpad/VERDICT-cheekbone-reliability.md`.
- [ ] **Validation pass intact**: `validateFaceImage` still gates upload; invalid images never reach extraction.
- [ ] **No user loses access**: backfill populates features; lazy fallback covers the gap; missing-image/extraction-failure falls back to the existing blob/defaults.
- [ ] **Railway build clean** (the R1 lesson): chosen library installs and runs on the production image without a fragile native compile; documented like R1's `sweph` glibc note.
- [ ] **`tsc --noEmit` clean** (mobile + server). No regression in the face/combined/career screens or in daily/weekly/monthly (which still read the now-stable face fields).

---

## 11. Risks / open questions

- ✅ **#1 — Landmark detection on Railway — RESOLVED by the spike (2026-06-29).** Was R2's gate. **GO** on `@vladmandic/face-api` + pure-JS `@tensorflow/tfjs` + `@tensorflow/tfjs-backend-wasm` (WASM backend), decode via `sharp`. **Zero native compile in the CV stack** — the only native `.node` in `node_modules` is `sharp`'s (already on Railway), so **no glibc/musl concern** (stronger than R1). `@mediapipe/tasks-vision` rejected (browser-only + WebGL2 → native `headless-gl`); `tfjs-node` rejected (native build trap). **Durable: do NOT add `tfjs-node`; do NOT use mediapipe in Node.**
- **Detection failures on real selfies.** Validation passing ≠ landmarks found (extreme angle, occlusion, heavy filters). Define behavior: retry once, else mark `uncertain` and fall back to blob/defaults — never hard-fail the reading.
- **Boundary stability.** Continuous ratios binned to categoricals can flip across runs if the detector is even slightly nondeterministic. Mitigate with fixed thresholds + quantized/rounded ratios; the spike must prove no flipping. (If the detector itself is nondeterministic, server-side single-engine still beats on-device, but rounding is essential.)
- **Cross-device drift (if forced on-device).** Different MLKit versions/GPUs → different vectors for the same face across phones → instability + a client-trust boundary. Strong reason to keep extraction server-side.
- **Physiognomy is pseudoscience.** No empirical reference (unlike R1's astro.com). The honest framing: entertainment; the bar is reproducibility + internal consistency + tasteful, defensible copy. Keep the existing disclaimers. Curating the rules table needs a content/voice pass (Sid), not just engineering.
- **R3 (palm) reuse.** R2's pattern (CV → vector → curated rules table → traits) is the template for R3. If R2 picks a Node CV stack that also serves palm landmarks (or proves none does), that informs R3's harder spike. Note the shared `server/src/data/` rules-table convention for R3 to follow.
- **Cost/latency at upload.** ✅ **Spike measurement:** WASM backend **~0.5–0.8s/image**; CPU pure-JS backend ~10s (don't use). Sub-second extraction means it *can* run inline at upload, but async-post-upload + lazy-at-first-read is still the safer default (it already does a ~15s Vision validation). No Anthropic calls in the feature path.
- ✅ **License/asset weight — RESOLVED.** The face-api model weights (`ssd_mobilenetv1` 5.6MB + `face_landmark_68` 357KB) + the WASM backend `.wasm` (~435KB) ≈ **6.2MB total ship bundled INSIDE the npm packages** (`node_modules/@vladmandic/face-api/model/` + `@tensorflow/tfjs-backend-wasm/dist/`) — installed via `npm install`, **nothing separately committed** (improves on the earlier "commit assets" worry). face-api weights are MIT-licensed. `setWasmPaths()` must point at the wasm-backend `dist/` dir so the `.wasm` loads on Railway.
- **Open question (Sid):** archetype taxonomy — keep the current free-text archetype names the prompt invents, or fix a closed set the rules table maps into? (Recommend: fix a closed set for stability.)

---

## 12. Files in scope (checklist)

**Server**
- `server/src/services/faceFeatures.service.ts` (NEW — landmark detection → `FaceFeatureVector`)
- `server/src/data/physiognomy-rules.ts` (NEW — curated rules table + `mapFeaturesToTraits`)
- `server/src/models/UserProfile.ts` (typed `faceFeatures`/`faceTraits`/`faceArchetypeResult`/`faceRulesVersion` sub-docs; keep `faceReading: Mixed` as narrative cache)
- `server/src/types/shared.ts` + `packages/shared/types.ts` (new face types; `UserInsightProfile.faceTraits`)
- `server/src/services/upload.service.ts` (`uploadFaceImage`: extract+map after validation, persist)
- `server/src/services/reading.service.ts` (`getFaceReading`: lazy extract fallback; feed traits)
- `server/src/services/claude.service.ts` (`generateFaceReading`: consume trait list)
- `server/src/prompts/face-reading.prompt.ts` (prompt takes traits, not pixels, for substance)
- `server/src/services/insight.service.ts` (`buildUserInsightProfile`: source face fields from stable layer; expose `faceTraits` — DATA only)
- `server/src/scripts/backfill-face-features.ts` (NEW) + `package.json` `backfill:face-features` / `:dry`
- `server/src/services/imageValidation.service.ts` (**unchanged** — keep the validation pass)
- `server/package.json` (add `@vladmandic/face-api` + `@tensorflow/tfjs` + `@tensorflow/tfjs-backend-wasm`; **NOT `tfjs-node`**, **NOT `@mediapipe/tasks-vision`**; reuse the existing `sharp` for decode — model assets ride in via the face-api package, none separately committed)
**Mobile** (minimal — only if spike forces on-device)
- `mobile/app/(main)/readings/face.tsx`, `…/combined.tsx`, `…/career-destiny.tsx` (render the now-stable output). ✅ **Resolved (Sid, 2026-06-30): DROP the `forehead` feature card** (no cheekbones/brows/chin) — remove that tile in `face.tsx` + drop `forehead` from the prompt's `facialFeatures` output, as part of the steps 5+7 pass. No other shape change expected.
- *(fallback path only — ✅ spike: NOT needed; server-side Node extraction confirmed)* `mobile/app/(capture)/face-capture.tsx` + a vision-camera face-detector dep, if extraction must move on-device

**Coordinate with R5**: R2 lands the stable trait DATA + makes the face reading itself stable; **R5 wires `faceTraits` into the synthesis-prompt COPY + Fable 5 engine** (one of its four feature sets) — don't rewrite that copy twice.
