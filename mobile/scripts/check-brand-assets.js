#!/usr/bin/env node
/**
 * check-brand-assets.js — decodes every brand raster `app.json` references and ASSERTS the
 * platform format rules against it. Zero dependencies; `zlib` only, exactly as `make-grain.js`.
 *
 * Usage, from mobile/:   node scripts/check-brand-assets.js
 *                        node scripts/check-brand-assets.js --census        (adds the colour tables)
 *                        node scripts/check-brand-assets.js --root <dir>    (validation only)
 *
 * ⚠️ `--root` exists so the assertions below can be DEFECT-INJECTED against throwaway copies
 * rather than against `mobile/assets/`. It is the seam that makes this script validatable at all;
 * without it every case would have to mutate the real brand files. It is not used in normal runs.
 *
 * ── 🔴 WHY THIS IS A CHECKER AND NOT THE RECOLOURER IT WAS COMMISSIONED AS ──────────────────
 *
 * P18a was scoped as "recolour the existing mark, do not design a new one" — the right call, and
 * this file does not reopen it. The instrument specified was a per-pixel channel map over the
 * retired palette: the two purples and the gold to `accent`, the two lavenders to `accent-2`,
 * white to `fg`. That instrument was specified before anyone decoded the files. Decoded, it
 * cannot run, and the two reasons point in opposite directions:
 *
 *   1. IT IS A NO-OP ON EVERYTHING THAT SHIPS. `logo.png` (which serves BOTH `icon` and
 *      `adaptiveIcon.foregroundImage`) and `splash.png` contain ZERO occurrences of any retired
 *      literal. They are continuous-tone artwork — 85,802 and 271,806 distinct RGBA values — an
 *      amber line-art medallion over a purple GRADIENT. There is no literal to substitute.
 *      The map matches only the web favicon and two unreferenced orphans.
 *
 *   2. 🔴 ON THE FILES IT *DOES* MATCH, IT ERASES THE MARK. The map sends the retired purple and
 *      the retired gold to the SAME target. In those files the purple is the GROUND (95.18% of
 *      `icon.png`) and the gold is the INK (4.69%) — so 99.87% of the file collapses to one flat
 *      colour and the monogram disappears. Two source roles, one target.
 *
 * Reason 2 is why this script does not simply "fix" the map. Repairing it means deciding WHICH
 * role takes WHICH token, and that is the design decision itself, not a preliminary to it. An
 * agent picking the ground's token is an agent choosing what the app icon looks like.
 *
 * 🟢 SO THE RE-SKIN IS STILL LIVE — the mark is NOT inseparable from purple. Measured, the two
 * colour populations part across an EMPTY HUE VALLEY of 235° in `logo.png` and 230° in `splash.png`
 * (the `separability` block below computes it; it is the longest run of unoccupied 5° bins, walked
 * twice round the circle so a gap spanning 0° is measured rather than split). The drawing survives
 * the separation intact.
 *
 * ⚠️ THAT FIGURE WAS FIRST PUBLISHED AS "240°" — read off 15° buckets by eye, and wrong by 5–10.
 * It is stated per-file here because the two files genuinely differ, and a single rounded number
 * covering both is the shape of error `O-66` names for contrast ratios: one published figure read
 * as if it covered every case. Re-derive it from this script, never quote it from a commit body.
 *
 * What is missing is a role→token table, which is `P70`, and a recolourer written before that table
 * exists would be encoding a guess as a committed script.
 *
 * ── WHAT THIS FILE IS FOR INSTEAD, AND WHY IT OUTLIVES P18a ─────────────────────────────────
 *
 * Three format defects are LIVE on the shipped 2.0.0 icon, and none of them is a colour question
 * (see FORMAT_RULES). They were invisible because nothing in this repo had ever decoded these
 * files: there is no CI, no test runner, no screenshot diffing. `no-raw-hex` cannot see a PNG,
 * and `app.json` is neither under the gate's $SRC set nor a directory its greps walk — so the
 * brand rasters are the one asset class with NO instrument at all pointed at them.
 *
 * 🔴 THE DEFECT THAT MATTERS TODAY: `adaptiveIcon.foregroundImage` is 100% OPAQUE and its content
 * fills 100% of the canvas. Android composites that layer over `backgroundColor` and then masks
 * the result to a circle, squircle or rounded square — so the background colour is dead, and every
 * mask CROPS THE MEDALLION'S OUTER RING. It has shipped that way. A colour-only fix would have
 * left it shipping that way, which is precisely why a checker is worth more here than a recolour.
 *
 * ── 🔴 IT IS DELIBERATELY *NOT* WIRED INTO `npm run gate`, AND THAT IS O-67's LESSON ──────────
 *
 * This script exits NON-ZERO today, because the three defects are real and an assertion that
 * lies about the present in order to look green is not an assertion. But `token-gate.sh` does not
 * call it. Wiring a red check into the gate now would turn the BASELINE red, and O-67's own
 * re-validation record shows what that costs: one run was invalid from case 11 onward because an
 * `exact` census had already reddened the baseline, so every later "CAUGHT" was the stale count
 * rather than the injected defect. A gate that is red for a known reason teaches everyone to read
 * past it.
 *
 * 🟢 SO IT SHIPS STANDALONE WITH A NAMED DEBTOR — `P18a` — exactly as the two ⬜ PENDING counters
 * in the gate footer do. Wiring it in is ONE LINE in `token-gate.sh` and it should happen in the
 * same commit as the replacement artwork, at which point the assertions go green by being
 * satisfied rather than by being weakened. Do not weaken them to land them early.
 *
 * ⚠️ ONE RULE IS REPORT-ONLY ON PURPOSE and it is marked `advisory` below: `icon` at 1024. Expo
 * resizes it and no platform rejects an oversized square, so failing on it would be this file
 * crying wolf on a working build — the OVER-finding mode that decommissions a rule. The two
 * transparency/safe-zone rules are the ones with a user-visible consequence, and those FAIL.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const rootFlag = process.argv.indexOf('--root');
const MOBILE = rootFlag > -1 ? path.resolve(process.argv[rootFlag + 1]) : path.resolve(__dirname, '..');
const CENSUS = process.argv.includes('--census');

// ── the retired palette and its specified Vellum targets — P18a's map, verbatim, so the
//    no-op and the role collapse are both RE-DERIVED here rather than quoted from a commit body.
const SPECIFIED_MAP = {
  '6B21A8': 'D98E57', '4C1D95': 'D98E57',   // the two retired purples -> accent
  'F59E0B': 'D98E57',                        // the retired gold        -> accent
  'C4B5FD': 'B3A6D9', 'C084FC': 'B3A6D9',   // the two lavenders       -> accent-2
  'FFFFFF': 'F4EFE9',                        // white                   -> fg
};

// ── the hue arc the mark's two populations live on. Measured, not chosen: every saturated pixel
//    in both live assets falls in 270..315 (ground) or 0..34 (ink), with a 315..360 antialias
//    band between them and NOTHING between 34 and 270.
const INK_ARC = [0, 45];
const GROUND_ARC = [260, 315];

const FORMAT_RULES = {
  icon: [
    { id: 'square', advisory: false, why: 'a non-square icon is cropped unpredictably' },
    { id: 'size-1024', advisory: true, why: 'Expo resizes; no platform rejects an oversized square' },
    { id: 'no-transparency', advisory: false, why: 'iOS composites the icon on black; alpha reads as a hole' },
    { id: 'no-baked-corners', advisory: false, why: 'the OS masks the corners — baking them double-rounds' },
  ],
  foregroundImage: [
    { id: 'square', advisory: false, why: 'the adaptive layer must be square before masking' },
    { id: 'size-1024', advisory: true, why: 'as above' },
    { id: 'has-transparency', advisory: false, why: 'an opaque layer hides backgroundColor entirely' },
    { id: 'safe-zone-66', advisory: false, why: 'launchers crop to circle / squircle / rounded square' },
  ],
  splashImage: [
    { id: 'has-transparency', advisory: false, why: 'the image sits on splash.backgroundColor' },
    // 🔴 THE ONE THAT MATTERS AFTER THE PALETTE FLIP, added 2026-08-04. `splash.backgroundColor` is
    //    `bg` (#100E0D) and is painted by the OS before any JS runs, so a splash image carrying a
    //    BAKED GROUND renders that ground as a rectangle floating on warm black — strictly worse
    //    than the matched state before pass 5, on the first thing every user sees.
    // 🟢 MEASURED TODAY: 0. The purple in this file is entirely PARTIAL-ALPHA (max 175/255) and
    //    every one of its 1,516,952 fully-opaque pixels is INK — amber, hue 21-24. So the ground is
    //    already `backgroundColor` and there is nothing to strip.
    // ⚠️ IT IS ASSERTED ANYWAY BECAUSE NEW SPLASH ARTWORK IS STILL COMING (`P18a` item 1), and this
    //    is the one defect a replacement is most likely to reintroduce — every design tool exports a
    //    filled artboard by default. A permanent invariant at 0 whose pressure is a pending asset.
    // 🔴 DELIBERATELY *NOT* APPLIED TO `icon` OR `foregroundImage`, AND THE NUMBERS SHOW WHY IT WOULD
    //    BE WRONG THERE RATHER THAN MERELY INCONVENIENT: they measure 809,145 and 347,553 opaque
    //    ground-hue px. `icon` MUST be opaque and full-bleed, so its ground is baked BY NECESSITY;
    //    `foregroundImage`'s purple sits inside the mark's own cropped bounding box, which the owner
    //    ruled STAYS — an icon is seen on a launcher wallpaper beside a dozen others rather than
    //    inside this app's palette, and remapping across the 235° hue valley risks the filigree's
    //    legibility for no user-visible gain. Asserting 0 there would encode the opposite of a
    //    standing ruling. See `P70`'s closure.
    // 🟢 THE SPLASH IS DIFFERENT IN KIND: its ground is not baked into the artwork at all, it is
    //    `splash.backgroundColor`, a value the palette already owns. That is what makes 0 the right
    //    number here and the wrong number two rows up.
    { id: 'no-baked-ground', advisory: false, why: 'an opaque ground hides splash.backgroundColor and renders as a slab on the warm-black canvas' },
    // 🆕 2026-08-04 — THE SECOND HALF, AND THE ROW ABOVE COULD NEVER HAVE CAUGHT IT.
    //    `no-baked-ground` counts only FULLY OPAQUE ground-hue px, so a translucent corner glow
    //    passes it at any strength. That is exactly what shipped: 1,940,019 px in the ground arc,
    //    mean alpha 65/255, peak 175 — measured, classified "artwork rather than an alpha defect",
    //    and left. 🔴 THE CLASSIFICATION WAS THE DEFECT. It was invisible while the canvas beneath
    //    it was the retired violet, and the palette flip turned it into a purple smear across the
    //    corner of the first thing every user sees.
    //    So the two rows ask genuinely different questions and BOTH are needed: one asks whether
    //    the file HIDES the ground key, this asks whether what it lets through BELONGS on it.
    // 🔴 A PERMANENT INVARIANT AT 0, i.e. blindness class 2 at its most exposed — the count is
    //    already 0, so any new artwork silently disarms nothing and loudly fails this instead.
    //    That is the whole reason it is asserted rather than reported: replacement splash artwork
    //    is still coming, and a glow is the single easiest thing for a design tool to re-export.
    { id: 'no-ground-glow', advisory: false, why: 'a translucent ground-hue wash was drawn to blend into the RETIRED canvas and composites as a smear on the warm-black one' },
  ],
};

// ════════════════════════════════════════════════════════════════════════════════════════════
// PNG decode — inflate + unfilter. Handles the colour types these assets actually use.
// ════════════════════════════════════════════════════════════════════════════════════════════
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function readChunks(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  const out = [];
  let p = 8;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    out.push({ type: buf.toString('ascii', p + 4, p + 8), data: buf.slice(p + 8, p + 8 + len) });
    p += 12 + len;
  }
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decode to a flat RGBA8 buffer. Throws on interlaced / bit depths these assets do not use. */
function decodePNG(file) {
  const buf = fs.readFileSync(file);
  const chunks = readChunks(buf);
  const ihdr = chunks.find(c => c.type === 'IHDR').data;
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4);
  const depth = ihdr[8], colourType = ihdr[9], interlace = ihdr[12];
  if (interlace !== 0) throw new Error(`${file}: interlaced PNGs are not decoded`);
  if (depth !== 8) throw new Error(`${file}: bit depth ${depth} is not decoded (only 8)`);

  const ch = CHANNELS[colourType];
  const bpp = ch, rowBytes = ch * w;
  const idat = zlib.inflateSync(Buffer.concat(chunks.filter(c => c.type === 'IDAT').map(c => c.data)));
  const raw = Buffer.alloc(rowBytes * h);
  let sp = 0;
  for (let y = 0; y < h; y++) {
    const filter = idat[sp++];
    const cur = raw.slice(y * rowBytes, (y + 1) * rowBytes);
    idat.copy(cur, 0, sp, sp + rowBytes);
    sp += rowBytes;
    const prev = y > 0 ? raw.slice((y - 1) * rowBytes, y * rowBytes) : Buffer.alloc(rowBytes);
    for (let i = 0; i < rowBytes; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      if (filter === 1) cur[i] = (cur[i] + a) & 0xff;
      else if (filter === 2) cur[i] = (cur[i] + b) & 0xff;
      else if (filter === 3) cur[i] = (cur[i] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) cur[i] = (cur[i] + paeth(a, b, c)) & 0xff;
      else if (filter !== 0) throw new Error(`${file}: bad filter type ${filter}`);
    }
  }

  const plte = chunks.find(c => c.type === 'PLTE');
  const trns = chunks.find(c => c.type === 'tRNS');
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * ch, q = i * 4;
    if (colourType === 6) { px[q] = raw[o]; px[q + 1] = raw[o + 1]; px[q + 2] = raw[o + 2]; px[q + 3] = raw[o + 3]; }
    else if (colourType === 2) { px[q] = raw[o]; px[q + 1] = raw[o + 1]; px[q + 2] = raw[o + 2]; px[q + 3] = 255; }
    else if (colourType === 0) { px[q] = px[q + 1] = px[q + 2] = raw[o]; px[q + 3] = 255; }
    else if (colourType === 4) { px[q] = px[q + 1] = px[q + 2] = raw[o]; px[q + 3] = raw[o + 1]; }
    else if (colourType === 3) {
      const idx = raw[o];
      px[q] = plte.data[idx * 3]; px[q + 1] = plte.data[idx * 3 + 1]; px[q + 2] = plte.data[idx * 3 + 2];
      px[q + 3] = trns && idx < trns.data.length ? trns.data[idx] : 255;
    }
  }
  return { w, h, depth, colourType, px, bytes: buf.length, chunkTypes: [...new Set(chunks.map(c => c.type))] };
}

function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
}

const hex = n => n.toString(16).padStart(2, '0').toUpperCase();
const rgbHex = (r, g, b) => `${hex(r)}${hex(g)}${hex(b)}`;

// 🔴 NOT `toLocaleString()`. Its grouping follows the RUNNER's locale — this repo's own machine
//    groups by lakh, so `3109921` printed as `31,09,921` — which makes the output of a script
//    whose whole purpose is a reproducible measurement differ per machine. Grouping is cosmetic;
//    determinism is not.
const num = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ════════════════════════════════════════════════════════════════════════════════════════════
// Measurement
// ════════════════════════════════════════════════════════════════════════════════════════════
function measure(img) {
  const { w, h, px } = img;
  const total = w * h;
  let opaque = 0, clear = 0, partial = 0;
  const colours = new Map();
  const literals = {};
  let saturated = 0, ink = 0, ground = 0, blend = 0, neutral = 0;
  // 🔴 THE OPAQUE-ONLY GROUND POPULATION — the `no-baked-ground` assertion's subject, and the
  //    distinction from `ground` above is the whole point. `ground` counts EVERY pixel in the
  //    ground hue arc at ANY alpha, so on this splash it reads 53.5% and says nothing about whether
  //    a slab exists: that 53.5% is a translucent corner glow at mean alpha 65/255. Only a FULLY
  //    OPAQUE ground-hue pixel can hide `backgroundColor`, and separating the two is what turns
  //    "there is a lot of purple in this file" into a decidable question.
  let opaqueGround = 0;
  let maxGroundAlpha = 0;
  // content bbox over anything not fully transparent
  let x0 = w, y0 = h, x1 = -1, y1 = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const q = (y * w + x) * 4;
      const a = px[q + 3];
      if (a === 255) opaque++; else if (a === 0) clear++; else partial++;
      if (a > 0) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }

      const key = rgbHex(px[q], px[q + 1], px[q + 2]);
      if (a > 0) {
        colours.set(`${key}${hex(a)}`, (colours.get(`${key}${hex(a)}`) || 0) + 1);
        if (key in SPECIFIED_MAP) literals[key] = (literals[key] || 0) + 1;
        const [hh, ss] = hsv(px[q], px[q + 1], px[q + 2]);
        if (ss < 0.15) neutral++;
        else {
          saturated++;
          if (hh >= INK_ARC[0] && hh <= INK_ARC[1]) ink++;
          else if (hh >= GROUND_ARC[0] && hh <= GROUND_ARC[1]) {
            ground++;
            if (a === 255) opaqueGround++;
            if (a > maxGroundAlpha) maxGroundAlpha = a;
          }
          else blend++;
        }
      }
    }
  }

  // the 240-degree valley claim, re-derived: which 5-degree hue bins are OCCUPIED at all
  const bins = new Array(72).fill(0);
  for (let i = 0; i < total; i++) {
    if (!px[i * 4 + 3]) continue;
    const [hh, ss] = hsv(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    if (ss >= 0.15) bins[Math.min(71, Math.floor(hh / 5))]++;
  }
  let longestGap = 0, gap = 0;
  for (let i = 0; i < 144; i++) {           // two laps, so a gap spanning 0 is measured
    if (bins[i % 72] === 0) { gap++; if (gap > longestGap) longestGap = gap; } else gap = 0;
  }
  longestGap = Math.min(longestGap, 72);

  return {
    total, opaque, clear, partial, distinct: colours.size, colours, literals,
    saturated, ink, ground, blend, neutral, opaqueGround, maxGroundAlpha,
    bbox: x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 },
    emptyHueDegrees: longestGap * 5,
  };
}

/** Baked rounded corners: a corner is "cut" if the extreme pixel is clear while the centre is not. */
function cornerReport(img) {
  const { w, h, px } = img;
  const at = (x, y) => px[(y * w + x) * 4 + 3];
  const corners = { TL: at(0, 0), TR: at(w - 1, 0), BL: at(0, h - 1), BR: at(w - 1, h - 1) };
  const cut = Object.values(corners).filter(a => a === 0).length;
  return { corners, cut };
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// Assertions
// ════════════════════════════════════════════════════════════════════════════════════════════
let failures = 0, advisories = 0;

function assert(rule, ok, detail) {
  const tag = ok ? '  🟢 PASS' : rule.advisory ? '  ⚠️  ADVISORY' : '  🔴 FAIL';
  if (!ok) { if (rule.advisory) advisories++; else failures++; }
  console.log(`${tag}  ${rule.id.padEnd(17)} ${detail}`);
  if (!ok) console.log(`${' '.repeat(22)} why: ${rule.why}`);
}

function checkRuleSet(kind, img, m) {
  for (const rule of FORMAT_RULES[kind]) {
    switch (rule.id) {
      case 'square':
        assert(rule, img.w === img.h, `${img.w}×${img.h}`);
        break;
      case 'size-1024':
        assert(rule, img.w === 1024 && img.h === 1024, `${img.w}×${img.h}, expected 1024×1024`);
        break;
      case 'no-transparency':
        assert(rule, m.clear === 0 && m.partial === 0,
          `${((100 * (m.clear + m.partial)) / m.total).toFixed(2)}% of pixels carry alpha < 255`);
        break;
      case 'has-transparency':
        assert(rule, m.clear + m.partial > 0,
          m.clear + m.partial > 0
            ? `${((100 * m.clear) / m.total).toFixed(1)}% clear, ${((100 * m.partial) / m.total).toFixed(1)}% partial`
            : `0% — the layer is FULLY OPAQUE across all ${img.w}×${img.h} px, so backgroundColor is dead`);
        break;
      case 'no-baked-corners': {
        const c = cornerReport(img);
        assert(rule, c.cut === 0, `${c.cut}/4 extreme corners fully transparent`);
        break;
      }
      case 'no-baked-ground':
        assert(rule, m.opaqueGround === 0,
          m.opaqueGround === 0
            ? `0 fully-opaque ground-hue px (the purple here peaks at alpha ${m.maxGroundAlpha}/255 — a glow, not a slab)`
            : `🔴 ${num(m.opaqueGround)} FULLY OPAQUE ground-hue px — a baked ground that hides backgroundColor`);
        break;
      case 'no-ground-glow':
        // 🔴 AT ANY ALPHA. The alpha split is the previous row's job and it is the wrong question
        //    here — a wash at alpha 65 is what actually shipped and what actually shows.
        assert(rule, m.ground === 0,
          m.ground === 0
            ? `0 px in the ground hue arc at ANY alpha (arc ${GROUND_ARC[0]}..${GROUND_ARC[1]}°, empty valley ${m.emptyHueDegrees}° wide)`
            : `🔴 ${num(m.ground)} px in the ground hue arc, peak alpha ${m.maxGroundAlpha}/255 — run \`--strip-glow\``);
        break;
      case 'safe-zone-66': {
        // the mask keeps the centre 66%; content outside it can be cropped by some launcher
        const lo = Math.floor(img.w * 0.17), hi = Math.ceil(img.w * 0.83);
        const inside = m.bbox && m.bbox.x0 >= lo && m.bbox.y0 >= lo && m.bbox.x1 <= hi && m.bbox.y1 <= hi;
        const pct = m.bbox ? ((100 * m.bbox.w) / img.w).toFixed(1) : 'n/a';
        assert(rule, !!inside,
          `content spans ${pct}% of width (bbox ${m.bbox ? `${m.bbox.w}×${m.bbox.h}` : 'none'}); ` +
          `safe zone is x,y ∈ [${lo}, ${hi}]`);
        break;
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// Run
// ════════════════════════════════════════════════════════════════════════════════════════════
const appJson = JSON.parse(fs.readFileSync(path.join(MOBILE, 'app.json'), 'utf8')).expo;

// ════════════════════════════════════════════════════════════════════════════════════════════
// 🆕 `--emit` — THE GEOMETRY SPLIT.  `P18a`'s ARTWORK HALF, GEOMETRY ONLY.  2026-08-04.
// ════════════════════════════════════════════════════════════════════════════════════════════
//
// 🔴 THE DEFECT IS GEOMETRIC, PRE-EXISTING, AND HAS NOTHING TO DO WITH THE PALETTE. `app.json`
//    points BOTH `icon` and `android.adaptiveIcon.foregroundImage` at ONE file, and the two rule
//    sets above are mutually exclusive by construction — `no-transparency` vs `has-transparency`.
//    No single file can satisfy both, which is why the header block at the top of this script
//    reports it as a constraint on the artwork brief. This mode discharges it.
//
// 🔴 AND THE HALF THAT IS LIVE ON HOME SCREENS TODAY IS `safe-zone-66`. Android composites the
//    foreground layer over `backgroundColor` and then masks the result to a circle, squircle or
//    rounded square. Measured on the shipped file: content spans 100% of the canvas, so a
//    CIRCULAR mask keeps only pi/4 * (2/3)^2 = 34.9% OF THE LAYER'S AREA — 65.1% is cropped,
//    a third of the width goes along each centreline, and 52.9% of each diagonal is cut. A
//    ZODIAC RING IS THE WORST POSSIBLE SHAPE FOR THAT, because its outer ring is precisely what
//    the corners lose. It has shipped that way since 2.0.0.
//
// ── 🔴 GEOMETRY ONLY. THIS MODE MAKES NO COLOUR DECISION, AND THAT IS A HARD BOUNDARY ────────
//
// The recolour question is `P70` and it is a DESIGNER's: the mark's two populations separate
// cleanly by hue, but where the purple GROUND goes is a role->token choice nobody has made, and
// §0.0 rule 2 forbids a session inventing one. So:
//
//   · `icon.png` COMPOSITES over the brand ground rather than replacing anything. On a fully
//     opaque source that composite is a MEASURED NO-OP — every pixel keeps its own colour. It is
//     written anyway because it is the correct operation, and it becomes load-bearing the moment
//     the artwork gains the alpha the format wants.
//   · `adaptive-icon.png` CROPS to the mark's own bounding box and scales it into the safe zone.
//     🔴 CROPPING IS GEOMETRY. Whatever ground sits INSIDE that box is carried through untouched;
//     only the area OUTSIDE becomes transparent. No pixel is remapped.
//
// 🟢 AND THAT TRANSPARENCY IS WHAT FINALLY MAKES `adaptiveIcon.backgroundColor` LIVE. `C-P5-4`'s
//    colour half set it to the brand ground and recorded that it was INERT, because the layer in
//    front of it was 100% opaque. It stops being inert here — which is the two halves of P18a
//    meeting without either one having to know about the other.
//
// ⚠️ THE INK BBOX, NOT THE ALPHA BBOX, IS WHAT GETS CROPPED TO — and the distinction is the
//    whole reason `safe-zone-66` reads 100% today. `measure()`'s bbox is over anything with
//    alpha > 0, and on a fully opaque file that is the entire canvas by definition. It measures
//    the GROUND, not the drawing. So the crop is driven by the SATURATED INK population instead,
//    the same `INK_ARC` the separability report uses, so both halves of this script agree about
//    what "the mark" means.
//
// NO NEW DEPENDENCY — `zlib` only, exactly as `make-grain.js`, whose CRC/chunk idiom the encoder
// below follows. Deterministic: same input, same bytes, so re-running is a no-op in `git status`.

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** RGBA8 -> PNG colour type 6, filter 0. The decoder above is its exact inverse. */
function encodePNG(w, h, px) {
  const rowBytes = w * 4;
  const raw = Buffer.alloc((rowBytes + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (rowBytes + 1)] = 0;                       // filter 0 — see make-grain.js
    px.copy(raw, y * (rowBytes + 1) + 1, y * rowBytes, (y + 1) * rowBytes);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Bounding box of the SATURATED INK population — the drawing, not its ground. */
function inkBBox(img) {
  const { w, h, px } = img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const q = (y * w + x) * 4;
      if (!px[q + 3]) continue;
      const [hh, ss] = hsv(px[q], px[q + 1], px[q + 2]);
      if (ss < 0.15 || hh < INK_ARC[0] || hh > INK_ARC[1]) continue;
      n++;
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, n };
}

/**
 * Area-average resample of a source RECTANGLE into a destination rectangle on `dst`.
 * Alpha-premultiplied, so a partially transparent edge cannot drag its colour toward black —
 * the source here is opaque so that is currently inert, and it is written correctly anyway
 * because "inert today" is how a latent defect gets described afterwards.
 */
function boxResize(src, sx, sy, sw, sh, dst, dw, dh, dx, dy, dW) {
  for (let j = 0; j < dh; j++) {
    const y0 = sy + Math.floor((j * sh) / dh), y1 = sy + Math.max(Math.floor(((j + 1) * sh) / dh), Math.floor((j * sh) / dh) + 1);
    for (let i = 0; i < dw; i++) {
      const x0 = sx + Math.floor((i * sw) / dw), x1 = sx + Math.max(Math.floor(((i + 1) * sw) / dw), Math.floor((i * sw) / dw) + 1);
      let r = 0, g = 0, b = 0, a = 0, cnt = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const q = (y * src.w + x) * 4, av = src.px[q + 3] / 255;
          r += src.px[q] * av; g += src.px[q + 1] * av; b += src.px[q + 2] * av;
          a += src.px[q + 3]; cnt++;
        }
      }
      const o = ((dy + j) * dW + (dx + i)) * 4;
      const am = a / cnt;
      const un = am > 0 ? 255 / am : 0;
      dst[o] = Math.round(Math.min(255, (r / cnt) * un));
      dst[o + 1] = Math.round(Math.min(255, (g / cnt) * un));
      dst[o + 2] = Math.round(Math.min(255, (b / cnt) * un));
      dst[o + 3] = Math.round(am);
    }
  }
}

const OUT_SIZE = 1024;                       // FORMAT_RULES' `size-1024`, both rule sets
// 🔴 THE SAFE-ZONE SIDE IS DERIVED FROM THE ASSERTION'S OWN FORMULA, never re-typed as 66% of
//    1024. `safe-zone-66` computes floor(w*0.17)..ceil(w*0.83) and requires the bbox INSIDE it;
//    a hand-computed 676 that disagreed by one pixel would fail the check it was sized to pass.
const SZ_LO = Math.floor(OUT_SIZE * 0.17), SZ_HI = Math.ceil(OUT_SIZE * 0.83);
const SAFE_SIDE = OUT_SIZE - 2 * SZ_LO;      // centred, so both edges land on the boundary

if (process.argv.includes('--emit')) {
  const srcRel = './assets/logo.png';
  const srcFile = path.join(MOBILE, srcRel);
  const src = decodePNG(srcFile);
  const sm = measure(src);
  const ink = inkBBox(src);
  // The brand ground is READ from app.json, not re-typed — the colour half already ruled it, and
  // a second literal here is the two-live-palettes failure mode in a new file.
  const bg = appJson.splash.backgroundColor;
  const bgRGB = [1, 3, 5].map(i => parseInt(bg.slice(i, i + 2), 16));

  console.log('══ --emit · the geometry split (P18a artwork half, GEOMETRY ONLY) ═══════════════');
  console.log(`  source ${srcRel}  ${src.w}×${src.h}  colour type ${src.colourType}  ${num(src.bytes)} bytes`);
  console.log(`  alpha channel PRESENT (${CHANNELS[src.colourType]}ch) but ` +
              `${((100 * sm.opaque) / sm.total).toFixed(1)}% opaque / ${((100 * sm.clear) / sm.total).toFixed(1)}% clear` +
              ` — so an alpha bbox is the whole canvas by definition`);
  console.log(`  alpha bbox   ${sm.bbox.w}×${sm.bbox.h} at (${sm.bbox.x0},${sm.bbox.y0})  ` +
              `= ${((100 * sm.bbox.w) / src.w).toFixed(1)}% of width   <- the GROUND`);
  if (!ink) { console.log('  🔴 NO INK POPULATION FOUND — cannot locate the mark. STOPPING.'); process.exit(1); }
  console.log(`  INK bbox     ${ink.w}×${ink.h} at (${ink.x0},${ink.y0})  ` +
              `= ${((100 * ink.w) / src.w).toFixed(1)}% of width   <- the DRAWING (${num(ink.n)} px)`);

  // ── the crop under a circular mask, computed rather than quoted
  const keptArea = (Math.PI / 4) * (SAFE_SIDE / OUT_SIZE) ** 2;
  console.log(`  ── crop under a CIRCULAR mask, as shipped (content at 100% of the canvas) ──`);
  console.log(`     mask keeps a centred circle of diameter ${(100 * SAFE_SIDE / OUT_SIZE).toFixed(1)}% of the layer`);
  console.log(`     area kept ${(100 * keptArea).toFixed(1)}%  ->  🔴 ${(100 - 100 * keptArea).toFixed(1)}% OF THE ARTWORK IS CROPPED`);
  console.log(`     along each centreline ${(100 * (1 - SAFE_SIDE / OUT_SIZE)).toFixed(1)}% of the width is lost;` +
              ` along each diagonal ${(100 * (1 - (SAFE_SIDE / OUT_SIZE) / Math.SQRT2)).toFixed(1)}%`);

  // ── the square crop the adaptive layer scales from: centred on the ink, side = max(w,h)
  let side = Math.max(ink.w, ink.h);
  let cx = Math.round((ink.x0 + ink.x1) / 2), cy = Math.round((ink.y0 + ink.y1) / 2);
  let sx = Math.round(cx - side / 2), sy = Math.round(cy - side / 2);
  if (sx < 0) sx = 0; if (sy < 0) sy = 0;
  if (sx + side > src.w) sx = src.w - side;
  if (sy + side > src.h) sy = src.h - side;
  if (side > src.w || side > src.h) { side = Math.min(src.w, src.h); sx = Math.max(0, sx); sy = Math.max(0, sy); }

  // 🔴 THE RESOLUTION STOP. Upscaling is silently lossy and is an OWNER decision, not a script's.
  const stops = [];
  if (src.w < OUT_SIZE || src.h < OUT_SIZE) stops.push(`source is ${src.w}×${src.h}, below ${OUT_SIZE}×${OUT_SIZE}`);
  if (side < SAFE_SIDE) stops.push(`the ink crop is ${side}px, below the ${SAFE_SIDE}px safe-zone side`);
  if (stops.length) {
    console.log(`\n  🔴 STOPPING — THE SOURCE CANNOT PRODUCE A CLEAN ${OUT_SIZE}×${OUT_SIZE} WITHOUT UPSCALING:`);
    stops.forEach(s => console.log(`     · ${s}`));
    console.log('     Not upscaling silently. This is an owner decision — supply higher-resolution art.');
    process.exit(1);
  }
  console.log(`  ── the crop the adaptive layer scales from ──`);
  console.log(`     square ${side}×${side} at (${sx},${sy}), centred on the ink  ` +
              `-> ${SAFE_SIDE}×${SAFE_SIDE} (downscale ${(SAFE_SIDE / side).toFixed(3)}×)`);
  console.log(`     safe zone x,y ∈ [${SZ_LO}, ${SZ_HI}] — derived from the assertion's own formula`);

  // ── 1 · icon.png — OPAQUE, full-bleed, composited over the brand ground
  const iconPx = Buffer.alloc(OUT_SIZE * OUT_SIZE * 4);
  boxResize(src, 0, 0, src.w, src.h, iconPx, OUT_SIZE, OUT_SIZE, 0, 0, OUT_SIZE);
  let composited = 0;
  for (let i = 0; i < OUT_SIZE * OUT_SIZE; i++) {
    const q = i * 4, a = iconPx[q + 3] / 255;
    if (a < 1) {
      composited++;
      for (let c = 0; c < 3; c++) iconPx[q + c] = Math.round(iconPx[q + c] * a + bgRGB[c] * (1 - a));
    }
    iconPx[q + 3] = 255;                     // `no-transparency`: alpha is a hole on iOS
  }
  fs.writeFileSync(path.join(MOBILE, 'assets', 'icon.png'), encodePNG(OUT_SIZE, OUT_SIZE, iconPx));

  // ── 2 · adaptive-icon.png — TRANSPARENT, the crop centred inside the safe zone
  const advPx = Buffer.alloc(OUT_SIZE * OUT_SIZE * 4);     // zero-filled = fully transparent
  const off = (OUT_SIZE - SAFE_SIDE) / 2;
  boxResize(src, sx, sy, side, side, advPx, SAFE_SIDE, SAFE_SIDE, off, off, OUT_SIZE);
  fs.writeFileSync(path.join(MOBILE, 'assets', 'adaptive-icon.png'), encodePNG(OUT_SIZE, OUT_SIZE, advPx));

  console.log(`\n  wrote assets/icon.png           ${num(fs.statSync(path.join(MOBILE, 'assets', 'icon.png')).size)} bytes` +
              `   (${num(composited)} px needed the ${bg} composite — ${composited ? 'live' : 'a MEASURED NO-OP on an opaque source'})`);
  console.log(`  wrote assets/adaptive-icon.png  ${num(fs.statSync(path.join(MOBILE, 'assets', 'adaptive-icon.png')).size)} bytes`);

  // ── 3 · VERIFY EACH OUTPUT AGAINST ITS *OWN* RULE SET, through the same decoder that wrote it
  for (const [rel, kind] of [['./assets/icon.png', 'icon'], ['./assets/adaptive-icon.png', 'foregroundImage']]) {
    const img = decodePNG(path.join(MOBILE, rel));
    const m = measure(img);
    console.log(`\n══ ${rel}  —  verified as \`${kind}\` ${'═'.repeat(Math.max(0, 28 - rel.length))}`);
    console.log(`  ${img.w}×${img.h}  colour type ${img.colourType}  ${num(img.bytes)} bytes  ` +
                `distinct RGBA ${num(m.distinct)}`);
    console.log(`  alpha: ${((100 * m.opaque) / m.total).toFixed(1)}% opaque / ` +
                `${((100 * m.clear) / m.total).toFixed(1)}% clear / ${((100 * m.partial) / m.total).toFixed(1)}% partial`);
    checkRuleSet(kind, img, m);
  }
  console.log(`\n══ --emit verdict ═══════════════════════════════════════════════════════════════`);
  console.log(`  ${failures} blocking failure(s), ${advisories} advisory.`);
  console.log('  🔴 GEOMETRY ONLY — no pixel was remapped. The recolour is `P70` and needs a role->token');
  console.log('     table from the designer. Re-running this is a no-op: same input, same bytes.');
  process.exit(failures ? 1 : 0);
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// 🆕 `--strip-glow` — THE SPLASH'S CORNER GLOW.  2026-08-04.
// ════════════════════════════════════════════════════════════════════════════════════════════
//
// 🔴 THE EARLIER CLASSIFICATION WAS WRONG, AND IT IS WORTH SAYING WHY RATHER THAN JUST FIXING IT.
//    A previous session measured this file, found the purple to be translucent everywhere (peak
//    alpha 175/255, never opaque), concluded `no-baked-ground` was satisfied — which it is — and
//    then reasoned from that to "the purple is ARTWORK, not an alpha defect", and left it.
//
//    Both halves of that are true and the conclusion still does not follow. `no-baked-ground` asks
//    whether the file HIDES the key beneath it. This asks whether what it lets through BELONGS on
//    the ground that key now paints. The glow was drawn to blend into a violet canvas that the
//    palette flip retired; over warm black it composites to a smear across the corner of the very
//    first thing every user sees. 🟢 **Decoration that exists only to blend with a retired ground
//    is not artwork — removing it RESTORES the mark rather than editing it.**
//
// ── THE RULE, AND WHY IT IS A HUE TEST RATHER THAN AN ALPHA ONE ──────────────────────────────
//
// Alpha cannot separate these two populations: the ink has antialiased edges, so it owns partial
// alphas too, and a "strip everything below 255" rule would eat the drawing's own outline. Hue
// can, and the separability report is the evidence — the two populations sit either side of an
// EMPTY 230-degree valley, so no threshold inside it is a judgement call.
//
//   · a saturated pixel in `GROUND_ARC`  -> alpha 0, and its colour channels zeroed too, so the
//     result compresses and no retired value survives in a byte nobody renders.
//   · a saturated pixel in `INK_ARC`     -> COPIED THROUGH BYTE FOR BYTE. Asserted afterwards.
//   · anything else (the blend band, and any neutral) -> KEPT.
//
// 🔴 KEEPING THE BLEND BAND IS A MEASURED DECISION, NOT A CAUTIOUS DEFAULT, AND THE FIRST GUESS
//    ABOUT IT WAS WRONG. It was assumed to be the ink's antialiased edge lying over the glow —
//    a thin fringe, safe either way. Measured, it is 536,251 px that are:
//      · hue 315..360 ONLY, spread evenly across all nine bins — no tail toward the ground arc;
//      · 76.8% of them at alpha 224..255, i.e. essentially OPAQUE, not a soft edge;
//      · concentrated in the middle deciles of BOTH axes — i.e. under the mark, not around it.
//    It is the plum-toned interior line work of the palm: the creases, the stipple and the fill
//    inside the hand. Rendering the canvas over the brand ground with the band stripped as well
//    shows the palm's lines and the filigree visibly THINNED. So the band is drawing, the strip
//    stops at the hue valley, and the report below prints what remains.
//
// ⚠️ UNLIKE `--emit`, THIS MODE HAS NO PRISTINE SOURCE TO RE-DERIVE FROM — it rewrites its own
//    input, so `git` is the only original. It is still idempotent: a second run finds nothing in
//    the arc and reports 0 stripped. Verify before writing with a bare `--strip-glow`; add
//    `--write` to commit the bytes.
if (process.argv.includes('--strip-glow')) {
  const rel = appJson.splash.image;                     // read, never re-typed
  const file = path.join(MOBILE, rel);
  const src = decodePNG(file);
  const before = measure(src);
  const write = process.argv.includes('--write');

  console.log('══ --strip-glow · the splash corner glow ════════════════════════════════════════');
  console.log(`  source ${rel}  ${src.w}×${src.h}  colour type ${src.colourType}  ${num(src.bytes)} bytes`);
  console.log(`  alpha  ${((100 * before.opaque) / before.total).toFixed(1)}% opaque / ` +
              `${((100 * before.clear) / before.total).toFixed(1)}% clear / ` +
              `${((100 * before.partial) / before.total).toFixed(1)}% partial`);
  console.log(`  ink arc ${INK_ARC[0]}..${INK_ARC[1]}°   ground arc ${GROUND_ARC[0]}..${GROUND_ARC[1]}°   ` +
              `empty valley between them ${before.emptyHueDegrees}°`);

  const out = Buffer.from(src.px);
  let stripped = 0, keptInk = 0, keptBlend = 0, keptNeutral = 0, alreadyClear = 0;
  let glowAlphaSum = 0, glowAlphaMax = 0;
  // the visible bounding box of WHAT SURVIVES, so the report can state what remains rather than
  // what left — a subtraction is only checkable against the shape it leaves behind
  let x0 = src.w, y0 = src.h, x1 = -1, y1 = -1;
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const q = (y * src.w + x) * 4;
      const a = src.px[q + 3];
      if (a === 0) { alreadyClear++; continue; }
      const [hh, ss] = hsv(src.px[q], src.px[q + 1], src.px[q + 2]);
      const isGround = ss >= 0.15 && hh >= GROUND_ARC[0] && hh <= GROUND_ARC[1];
      if (isGround) {
        stripped++; glowAlphaSum += a; if (a > glowAlphaMax) glowAlphaMax = a;
        out[q] = out[q + 1] = out[q + 2] = out[q + 3] = 0;
        continue;
      }
      if (ss < 0.15) keptNeutral++;
      else if (hh >= INK_ARC[0] && hh <= INK_ARC[1]) keptInk++;
      else keptBlend++;
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
    }
  }
  console.log(`\n  stripped  ${num(stripped)} px in the ground arc  ` +
              `(mean alpha ${(glowAlphaSum / Math.max(1, stripped)).toFixed(1)}/255, peak ${glowAlphaMax}/255)`);
  console.log(`  kept      ${num(keptInk)} ink · ${num(keptBlend)} blend band · ${num(keptNeutral)} neutral`);
  console.log(`  untouched ${num(alreadyClear)} already clear`);
  if (x1 >= 0) {
    console.log(`  what REMAINS occupies ${x1 - x0 + 1}×${y1 - y0 + 1} at (${x0},${y0}) — ` +
                `${((100 * (x1 - x0 + 1)) / src.w).toFixed(1)}% of width, ` +
                `${((100 * (y1 - y0 + 1)) / src.h).toFixed(1)}% of height`);
  }

  // 🔴 THE INK ASSERTION IS THE POINT OF THE MODE, so it runs whether or not bytes are written,
  //    and it compares BYTES rather than counts — a count can match while a channel moved.
  let inkMoved = 0;
  for (let i = 0; i < src.w * src.h; i++) {
    const q = i * 4;
    if (!src.px[q + 3]) continue;
    const [hh, ss] = hsv(src.px[q], src.px[q + 1], src.px[q + 2]);
    if (ss < 0.15 || hh < INK_ARC[0] || hh > INK_ARC[1]) continue;
    if (out[q] !== src.px[q] || out[q + 1] !== src.px[q + 1] ||
        out[q + 2] !== src.px[q + 2] || out[q + 3] !== src.px[q + 3]) inkMoved++;
  }
  console.log(`\n  ${inkMoved === 0 ? '🟢 PASS' : '🔴 FAIL'}  ink-byte-identical    ` +
              `${num(inkMoved)} of ${num(keptInk)} ink px changed`);
  if (inkMoved) { console.log('  🔴 STOPPING — the mark would be edited, which this mode may not do.'); process.exit(1); }

  if (!write) {
    console.log('\n  DRY RUN — nothing written. Re-run with `--write` to commit the bytes.');
    process.exit(0);
  }

  fs.writeFileSync(file, encodePNG(src.w, src.h, out));

  // ── VERIFY THROUGH THE SAME DECODER THAT WROTE IT, against the splash rule set
  const re = decodePNG(file);
  const after = measure(re);
  let residual = 0;
  for (let i = 0; i < re.w * re.h; i++) {
    const q = i * 4;
    if (!re.px[q + 3]) continue;
    const [hh, ss] = hsv(re.px[q], re.px[q + 1], re.px[q + 2]);
    if (ss >= 0.15 && hh >= GROUND_ARC[0] && hh <= GROUND_ARC[1]) residual++;
  }
  console.log(`\n  wrote ${rel}  ${num(before.total && re.bytes)} bytes  ` +
              `(was ${num(src.bytes)} — ${(((re.bytes - src.bytes) * 100) / src.bytes).toFixed(1)}%)`);
  console.log(`  alpha  ${((100 * after.opaque) / after.total).toFixed(1)}% opaque / ` +
              `${((100 * after.clear) / after.total).toFixed(1)}% clear / ` +
              `${((100 * after.partial) / after.total).toFixed(1)}% partial`);
  console.log(`  ${residual === 0 ? '🟢 PASS' : '🔴 FAIL'}  no-ground-hue-px      ` +
              `${num(residual)} px remain in the ground arc at ANY alpha`);
  console.log(`\n══ ${rel}  —  verified as \`splashImage\` ═════════════════════`);
  checkRuleSet('splashImage', re, after);
  console.log(`\n══ --strip-glow verdict ═════════════════════════════════════════════════════════`);
  console.log(`  ${failures} blocking failure(s), ${advisories} advisory.`);
  process.exit(failures || residual ? 1 : 0);
}

const TARGETS = [
  { key: 'icon', rel: appJson.icon, rules: 'icon' },
  { key: 'android.adaptiveIcon.foregroundImage', rel: appJson.android.adaptiveIcon.foregroundImage, rules: 'foregroundImage' },
  { key: 'splash.image', rel: appJson.splash.image, rules: 'splashImage' },
  { key: 'web.favicon', rel: appJson.web.favicon, rules: null },
];

console.log('══ brand assets — what app.json actually points at ══════════════════════════════');
const seen = new Map();
for (const t of TARGETS) {
  console.log(`  ${t.key.padEnd(38)} -> ${t.rel}`);
  seen.set(t.rel, (seen.get(t.rel) || 0) + 1);
}
for (const [rel, n] of seen) {
  if (n > 1) {
    console.log(`\n  🔴 ONE FILE SERVES ${n} KEYS: ${rel}`);
    console.log('     `icon` must be OPAQUE and `foregroundImage` must be TRANSPARENT, so a single');
    console.log('     file CANNOT satisfy both rule sets. The replacement must be two files —');
    console.log('     a constraint on the artwork brief, not on the code. See P70.');
  }
}

console.log(`\n  splash.backgroundColor            = ${appJson.splash.backgroundColor}`);
console.log(`  android.adaptiveIcon.background   = ${appJson.android.adaptiveIcon.backgroundColor}`);

const measured = new Map();
for (const t of TARGETS) {
  const file = path.join(MOBILE, t.rel);
  if (!fs.existsSync(file)) { console.log(`\n🔴 MISSING: ${t.rel}`); failures++; continue; }
  const img = decodePNG(file);
  const m = measure(img);
  measured.set(t.rel, { img, m });

  console.log(`\n══ ${t.rel}  —  ${t.key} ${'═'.repeat(Math.max(0, 40 - t.rel.length))}`);
  console.log(`  ${img.w}×${img.h}  colour type ${img.colourType} (${CHANNELS[img.colourType]}ch/${img.depth}bit)  ` +
              `${num(img.bytes)} bytes  chunks [${img.chunkTypes.join(' ')}]`);
  console.log(`  distinct RGBA (alpha>0) ${num(m.distinct)}  ` +
              `alpha: ${((100 * m.opaque) / m.total).toFixed(1)}% opaque / ` +
              `${((100 * m.clear) / m.total).toFixed(1)}% clear / ${((100 * m.partial) / m.total).toFixed(1)}% partial`);

  if (t.rules) checkRuleSet(t.rules, img, m);

  // ── the P18a premise, re-derived per file
  const hits = Object.entries(m.literals);
  const totalHits = hits.reduce((s, [, n]) => s + n, 0);
  console.log(`  ── P18a's specified literal map ──`);
  if (!totalHits) {
    console.log(`     🔴 ZERO matches. A per-literal channel map is a NO-OP on this file.`);
  } else {
    const targets = new Set(hits.map(([k]) => SPECIFIED_MAP[k]));
    for (const [k, n] of hits.sort((a, b) => b[1] - a[1])) {
      console.log(`     #${k} -> #${SPECIFIED_MAP[k]}   ${num(n)} px  ${((100 * n) / m.total).toFixed(2)}%`);
    }
    if (targets.size < hits.length) {
      console.log(`     🔴 ROLE COLLAPSE: ${hits.length} source colours -> ${targets.size} target(s).`);
      console.log(`        ${((100 * totalHits) / m.total).toFixed(2)}% of this file becomes ONE colour — the mark is ERASED.`);
    }
  }

  // ── separability: the P70 evidence
  if (m.saturated) {
    console.log(`  ── separability (P70) ──`);
    console.log(`     ink ${((100 * m.ink) / m.saturated).toFixed(1)}%  ` +
                `ground ${((100 * m.ground) / m.saturated).toFixed(1)}%  ` +
                `antialias band ${((100 * m.blend) / m.saturated).toFixed(1)}%  ` +
                `neutral ${num(m.neutral)} px`);
    console.log(`     largest empty hue span: ${m.emptyHueDegrees}°  ` +
                `${m.emptyHueDegrees >= 180 ? '🟢 the two populations are cleanly separable' : '⚠️ populations overlap'}`);
    // 🔴 THE GROUND POPULATION SPLIT BY OPACITY, printed because the percentage above is what made
    //    the splash look like it had a purple ground. "ground 53.5%" counts any alpha; only the
    //    opaque half can hide `backgroundColor`, and here that half is EMPTY.
    console.log(`     ground px: ${num(m.opaqueGround)} FULLY OPAQUE, peak alpha ${m.maxGroundAlpha}/255  ` +
                `${m.opaqueGround === 0 ? '🟢 translucent only — backgroundColor IS the ground' : '🔴 a baked ground'}`);
  }

  if (CENSUS) {
    console.log(`  ── top 12 colours ──`);
    for (const [k, n] of [...m.colours.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
      console.log(`     #${k.slice(0, 6)} a=${parseInt(k.slice(6), 16).toString().padStart(3)}  ` +
                  `${num(n).padStart(9)}  ${((100 * n) / m.total).toFixed(3)}%`);
    }
  }
}

// ── orphans: files in assets/ that no key references
console.log(`\n══ unreferenced brand rasters ═══════════════════════════════════════════════════`);
const referenced = new Set(TARGETS.map(t => path.basename(t.rel)));
const orphans = fs.readdirSync(path.join(MOBILE, 'assets'))
  .filter(f => f.endsWith('.png') && !referenced.has(f));
if (!orphans.length) console.log('  none');
for (const f of orphans) {
  const p = path.join(MOBILE, 'assets', f);
  const img = decodePNG(p);
  const m = measure(img);
  const hits = Object.entries(m.literals).sort((a, b) => b[1] - a[1]);
  console.log(`  ${f.padEnd(22)} ${img.w}×${img.h}  ${num(img.bytes)} bytes  ` +
              `${m.distinct} distinct  ${hits.length ? `retired literals: ${hits.map(([k, n]) => `#${k} ${((100 * n) / m.total).toFixed(1)}%`).join(' + ')}` : 'no retired literals'}`);
}
// 🔴 THIS NOTE USED TO NAME `icon.png` AND `adaptive-icon.png` AS BYTE-IDENTICAL PLACEHOLDERS
//    CARRYING A BARE "R". That was true until 2026-08-04 and is now false — `--emit` overwrote
//    both from `logo.png` and `app.json` points at them, so they are the LIVE icons. The note is
//    rewritten rather than deleted because the ORPHAN-WEIGHT point survives and merely moved: it
//    is `logo.png` that is now unreferenced.
// ⚠️ AND IT IS DERIVED FROM THE ORPHAN LIST RATHER THAN HARDCODED, which is why the old version
//    went stale silently. A hardcoded sentence about a measured fact is a second source of truth.
if (orphans.length) {
  const weight = orphans.reduce((s, f) => s + fs.statSync(path.join(MOBILE, 'assets', f)).size, 0);
  console.log(`  ⚠️ ${num(weight)} bytes of unreferenced raster still ships: assetBundlePatterns is`);
  console.log('     "**/*", so every file above is in the AAB whether a key points at it or not.');
  console.log('     `logo.png` is the SOURCE the two icons are emitted from and is deliberately');
  console.log("     KEPT — deleting it is the owner's call, and it is what `--emit` re-runs against.");
}

console.log(`\n══ verdict ══════════════════════════════════════════════════════════════════════`);
console.log(`  ${failures} blocking failure(s), ${advisories} advisory.`);
// 🟢 WIRED INTO `npm run gate` ON 2026-08-04, AND THE PRECONDITION THIS LINE USED TO STATE IS
//    EXACTLY WHY IT COULD BE. It read: "NOT wired in on purpose ... wiring it in is one line in
//    token-gate.sh and belongs in the SAME COMMIT AS THE REPLACEMENT ARTWORK, so the assertions
//    go green by being satisfied, not by being weakened." `--emit` satisfied all nine of them in
//    that same commit, so the line was discharged rather than deleted.
// 🔴 IT IS THE ONLY INSTRUMENT POINTED AT THE BRAND RASTERS AT ALL. `no-raw-hex` cannot see a
//    PNG, `app.json` is outside the gate's $SRC set and outside every content glob, and there is
//    no CI and no test runner. Unwired, nothing stops the next `app.json` edit from pointing both
//    icon keys at one file again — which is the defect this commit fixed, shipped since 2.0.0.
console.log('  🟢 WIRED INTO `npm run gate` (2026-08-04) — it went green by being SATISFIED, which is');
console.log('     the condition this line used to name. It is the only instrument pointed at the');
console.log('     brand rasters: no-raw-hex cannot see a PNG and app.json is outside every glob.');
process.exit(failures ? 1 : 0);
