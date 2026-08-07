#!/usr/bin/env node
/**
 * make-grain.js — generates `assets/textures/grain.png`, the ONLY raster the design system adds.
 *
 * ── WHY A GENERATOR AND NOT A DESIGNED FILE ────────────────────────────────────────────────
 *
 * UI-revamp-design.md §4.6 specifies the texture completely as a MEDIUM — "one 120x120 tileable
 * tile, ~6 KB, at opacity 0.05, absolutely positioned, pointer-events off" — and it exists for a
 * functional reason as much as a decorative one: it dithers the 8-bit banding a large radial
 * wash shows on cheap OLED panels (§10.2.4). The asset itself was never delivered. So it is
 * generated here, deterministically, exactly as the five font faces carry a reproducible subset
 * command in `assets/fonts/README.md` rather than arriving as an opaque binary.
 *
 * 🔴 ONE PARAMETER IS *NOT* IN THE DESIGN AND IS THEREFORE REGISTERED, NOT INVENTED: the tile's
 *    internal AMPLITUDE. §4.6 fixes the layer opacity (0.05) and the tile size (120x120) and says
 *    nothing about how strong the tile itself is. The value below is a stated choice with a
 *    stated reason, and changing it is a one-line edit plus a re-run — see `assets/textures/README.md`.
 *
 * ── THE THREE PROPERTIES THAT MATTER, AND WHY EACH IS WHAT IT IS ───────────────────────────
 *
 * 1. 🔴 BIPOLAR, AND THE TWO HALVES ARE DELIBERATELY *NOT* THE SAME STRENGTH — because the canvas
 *    is near-black and compositing over it is violently asymmetric. Measured against the real
 *    tokens: the canvas sits at 16/14/13, so a BLACK pixel at full alpha and the specified 0.05
 *    layer opacity can darken it by at most 0.8 of the 256 levels, while a WHITE pixel at the same
 *    alpha lifts it by 12.0. A symmetric tile is therefore not neutral — it is an additive one.
 *    🔴 THAT MATTERS BECAUSE THE PAGE AND THE CARD FACE ARE ONLY 7 LEVELS APART (16 vs 23). A
 *    full-range symmetric tile lifts the page by 2.8 and eats 40% of the separation the whole
 *    "textured page, clean objects" reading depends on — a texture that moves the ground is a
 *    palette change wearing a texture's clothes, and the palette was decided at pass 5.
 *    So the white half is capped and the black half runs to full alpha to claw back what it can.
 * 2. THE TWO NUMBERS BELOW ARE CHOSEN AGAINST TWO STATED FLOORS, both measurable, neither invented:
 *      · mean lift  < 1.0 level  — below one quantisation step, so the canvas token survives
 *      · deviation >= 1.5 levels — comfortably above the ONE-level step that banding is made of
 *    Measured at the values below: mean +0.92, sd 1.70, page-to-card separation 6.08 of 7.
 *    (Symmetric alternatives, for the record: 119/119 -> +1.30, sd 1.97; 255/255 -> +2.79, sd 4.23.)
 * 3. PER-PIXEL INDEPENDENT, SO IT TILES WITH NO SEAM BY CONSTRUCTION. There is no spatial
 *    correlation to match across an edge, so no seam can exist. This is the reason the tile can
 *    be 120x120 rather than screen-sized.
 *
 * Deterministic: a fixed seed and a fixed PRNG, so re-running produces the identical file.
 * PNG-8 (4-bit indexed + tRNS) — the exact "PNG-8" §4.6 names. Encoded with node's zlib only;
 * this repo has no image tooling and adding one for a 14,400-pixel tile is not a trade worth making.
 *
 * Usage, from mobile/:   node scripts/make-grain.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 120;          // §4.6, verbatim
const SEED = 0x52564C41;   // fixed, so the file is reproducible
const PEAK_LIGHT = 96;     // 🔴 the registered parameters — see property 1 and 2 in the header
const PEAK_DARK = 255;     //    asymmetric ON PURPOSE: the canvas is too dark to darken
const LEVELS = 8;          // alpha steps per polarity; 8 + 8 = a 16-entry palette = 4 bits/pixel

// mulberry32 — small, deterministic, and adequate for a dither tile.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

// ── palette: entries 0..7 black at a rising alpha, 8..15 white at the same ──
const ramp = peak => Array.from({ length: LEVELS }, (_, i) => Math.round((peak * i) / (LEVELS - 1)));
const plte = Buffer.alloc(16 * 3);
for (let i = 0; i < LEVELS; i++) {
  plte[i * 3] = plte[i * 3 + 1] = plte[i * 3 + 2] = 0x00;                          // the dark half
  const j = LEVELS + i;
  plte[j * 3] = plte[j * 3 + 1] = plte[j * 3 + 2] = 0xFF;                          // the light half
}
const trns = Buffer.from([...ramp(PEAK_DARK), ...ramp(PEAK_LIGHT)]);

// ── pixels: one uniform draw per pixel, packed two 4-bit indices per byte ──
const rand = rng(SEED);
const rowBytes = SIZE / 2;
const raw = Buffer.alloc((rowBytes + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  const base = y * (rowBytes + 1);
  raw[base] = 0;                                    // filter type 0 — noise gains nothing from a filter
  for (let x = 0; x < SIZE; x += 2) {
    const hi = Math.floor(rand() * 16) & 0x0F;
    const lo = Math.floor(rand() * 16) & 0x0F;
    raw[base + 1 + x / 2] = (hi << 4) | lo;
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 4;    // bit depth
ihdr[9] = 3;    // colour type: indexed
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  chunk('IHDR', ihdr),
  chunk('PLTE', plte),
  chunk('tRNS', trns),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.resolve(__dirname, '..', 'assets', 'textures', 'grain.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log(`${path.relative(path.resolve(__dirname, '..'), out)}  ${SIZE}x${SIZE}  ` +
            `${png.length} bytes  (peak alpha light ${PEAK_LIGHT}/255 · dark ${PEAK_DARK}/255, ` +
            `${LEVELS * 2} palette entries, seed 0x${SEED.toString(16)})`);
