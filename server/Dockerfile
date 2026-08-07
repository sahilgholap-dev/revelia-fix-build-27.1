# ============================================================================
# Revelia backend — R9 §14 STEP 6b Dockerfile.
#
# WHY THIS FILE EXISTS / WHAT IT CHANGES
# --------------------------------------
# Railway currently builds this backend with RAILPACK (Railway's default builder;
# Nixpacks is deprecated) and NO Dockerfile. Adding this file FLIPS the whole
# backend build system RAILPACK -> Docker for EVERY deploy. It therefore has two
# jobs, and both must hold or deploys break:
#
#   1. Reproduce what Railpack does today, EXACTLY:
#        - Node major 20 (the staging service runs node@20.20.2 — PINNED here,
#          NOT guessed from engines/.nvmrc)
#        - npm ci  ->  npm run build (tsc)  ->  node dist/index.js
#        - PORT honored from env (Railway injects it); `trust proxy` unaffected
#      Plus the NATIVE build toolchain Railpack provisions implicitly, so the
#      native deps compile/resolve (see NATIVE DEPS note below) — otherwise the
#      image builds clean but crashes on the first ephemeris call.
#
#   2. Add the R9 report render toolchain the renderer (report-render.service.ts)
#      shells out to: LibreOffice `soffice` (docx -> PDF), python3 + matplotlib
#      (the bundled report-charts.py SVG charts), and a serif font for the body.
#
# NATIVE DEPS (server/package.json) — how Railpack builds them vs this Dockerfile:
#   - sweph      : node-gyp-build loader; ships prebuilds/linux-x64/sweph.node ->
#                  loads the PREBUILT binary on glibc linux-x64, no source compile.
#   - bcrypt     : @mapbox/node-pre-gyp install --fallback-to-build -> downloads a
#                  prebuilt binary; falls back to a source build (needs the
#                  toolchain + python3) if the download is unavailable.
#   - sharp      : prebuilt @img/sharp-libvips-linux-x64 optional deps, no compile.
#   Railpack resolves these the same way (prebuilts), which is why it "just works"
#   without an obvious toolchain. This Dockerfile installs build-essential +
#   python3 in the BUILDER stage anyway (belt-and-braces) so any fallback-to-source
#   still succeeds. glibc (bookworm), NOT Alpine/musl — required by sweph AND
#   LibreOffice (CLAUDE.md: "no Alpine on Railway").
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — BUILDER: install ALL deps (with the native toolchain), compile TS,
# stage the non-TS assets, then prune to production deps (native artifacts kept).
# ---------------------------------------------------------------------------
FROM node:20-bookworm AS builder

# Robust apt: disable HTTP pipelining (some proxies mangle it) and retry transient
# fetch failures.
RUN printf 'Acquire::http::Pipeline-Depth "0";\nAcquire::Retries "5";\n' \
      > /etc/apt/apt.conf.d/99-revelia-robust

# Native build toolchain (node-gyp fallback path for sweph/bcrypt). python3 is
# node-gyp's build dependency, not the runtime matplotlib python.
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install against the lockfile first (layer-cached unless deps change).
COPY package.json package-lock.json ./
RUN npm ci

# Compile.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ASSET-COPY (closes the owner-action): tsc emits only .js — copy the confidential
# prompt(s) and the matplotlib chart script into dist so loadConfidentialPrompt()
# and resolveChartScript() resolve from `node dist/index.js` at runtime.
RUN mkdir -p dist/prompts dist/services \
  && cp src/prompts/*.md dist/prompts/ \
  && cp src/services/*.py dist/services/

# Drop devDependencies (typescript, ts-node-dev, etc.) WITHOUT recompiling natives
# — prune keeps the already-built .node artifacts in place.
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
# Stage 2 — RUNTIME: slim Node + the render toolchain only.
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime

# Render toolchain:
#   - libreoffice-writer (+ its libreoffice-core dep) = `soffice` docx->PDF. The
#     minimal Writer set, NOT the full suite (no Calc/Impress/Draw), to bound
#     image size + RAM. --no-install-recommends drops Java/help packs docx->PDF
#     does not need.
#   - python3 + python3-matplotlib = the bundled report-charts.py (SVG charts).
#   - python3-pypdf = the bundled report-qa.py (STEP 7 QA inspector: page count /
#     text extract / distinct raster-image count / open-ability). One small apt add
#     (Debian bookworm pypdf) that keeps PDF inspection in a mature lib and matches
#     the existing spawn-python architecture (report-charts.py); report-qa.py falls
#     back to PyMuPDF on a dev box that lacks pypdf, but the container uses pypdf.
#   - fonts-dejavu-core = the Georgia SUBSTITUTE (see the .conf below); Georgia is
#     proprietary + non-redistributable, DejaVu Serif is a Georgia-width serif and
#     is report-charts.py's own next fallback, so body text and chart text match.
#   - fonts-liberation2 = base metric-compatible sans/serif safety net.
#   - fontconfig = applies the Georgia->DejaVu alias.
RUN printf 'Acquire::http::Pipeline-Depth "0";\nAcquire::Retries "5";\n' \
      > /etc/apt/apt.conf.d/99-revelia-robust \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
       libreoffice-writer \
       python3 \
       python3-matplotlib \
       python3-pypdf \
       fonts-dejavu-core \
       fonts-liberation2 \
       fontconfig \
  && rm -rf /var/lib/apt/lists/*

# Georgia -> DejaVu Serif substitution (report docx requests "Georgia" in every run).
COPY docker/fontconfig/99-revelia-georgia.conf /etc/fonts/conf.d/99-revelia-georgia.conf
RUN fc-cache -f >/dev/null 2>&1 || true

WORKDIR /app
ENV NODE_ENV=production
# soffice/python resolve on PATH; set explicitly so a base-image path change can
# not silently break the renderer's binary resolution.
ENV REPORT_SOFFICE_BIN=soffice
ENV REPORT_PYTHON_BIN=python3
# matplotlib needs a writable config dir when HOME is read-only / unusual.
ENV MPLCONFIGDIR=/tmp/matplotlib

# Production node_modules (native artifacts intact) + compiled app + package.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Vendored hand-pose model weights (R3 palm extraction). These live at
# server/assets/hand-pose/ — OUTSIDE src/ and dist/, so tsc/npm never touch them
# and nothing above copies them into the image. palmFeatures.service resolves
# them at <server-root>/assets/hand-pose/... (= /app/assets/...); without this
# COPY the detector load throws
# `ENOENT: /app/assets/hand-pose/detector/model.json` and palm extraction fails,
# which in turn trips the face+palm gate on daily/monthly insights.
COPY assets ./assets

# Railway injects PORT; documented here (Railpack default was 3000 via env.ts).
EXPOSE 3000

# Reproduce Railpack's start command exactly.
CMD ["node", "dist/index.js"]
