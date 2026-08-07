# `assets/textures/` — provenance

**One file, and there is deliberately no second one.** `UI-revamp-design.md` §4.6: the whole
design system adds exactly one raster, and every other decorative mark in it (the five plates,
the four shape primitives) is SVG line art at zero binary weight.

| file | what | size |
|---|---|---|
| `grain.png` | 120×120 tileable paper texture, PNG-8 (4-bit indexed + `tRNS`) | **7,476 bytes** |

⚠️ §4.6 costed it at *"~6 KB"* and estimated the system's total added weight at ~426 KB.
Measured: **7.5 KB**, so the real total is ~427 KB. The gap is noise, but it is recorded rather
than rounded away.

---

## Reproducing it

```sh
cd mobile && node scripts/make-grain.js
```

Deterministic — a fixed seed and a fixed PRNG, so a re-run produces a byte-identical file. The
generator is the provenance record, in the same way `assets/fonts/README.md` carries the subset
command for the five faces rather than the faces arriving as opaque binaries.

## Why it is generated rather than drawn

§4.6 specifies the texture completely **as a medium** — one 120×120 tileable tile, ~6 KB, at
`opacity 0.05`, absolutely positioned, `pointerEvents="none"` — and specifies it for a functional
reason as much as a decorative one: it dithers the 8-bit banding that a large radial wash shows on
cheap OLED panels (§10.2.4). The asset itself was never delivered with the design. Per
`primitives-plan.md` §0.0 rule 2 the response to an unspecified value is *the nearest specified
value, plus a registered gap* — so the tile is produced from the design's own numbers, and the one
number the design does **not** give is named below.

## 🔴 THE ONE REGISTERED PARAMETER — the tile's own amplitude

§4.6 fixes the **layer** opacity (0.05) and the tile size. It says nothing about how strong the
tile itself is, and that number is not free, because **compositing over a near-black canvas is
violently asymmetric.** Measured against the live tokens:

- the canvas (`bg`) is `16, 14, 13`;
- at the specified 0.05, a **black** pixel at full alpha can darken it by at most **0.8** of the
  256 levels;
- a **white** pixel at the same alpha lifts it by **12.0**.

So a symmetric tile is not neutral — it is an additive one. 🔴 **And that matters because the page
and a card face are only 7 levels apart** (`bg` 16 vs `surface` 23): a texture that lifts the page
eats the separation the whole *"textured page, clean objects"* reading (§14.2.1) depends on. A
texture that moves the ground is a palette change wearing a texture's clothes, and the palette was
settled at pass 5.

**Two floors were therefore stated, and the parameters chosen against them:**

| floor | why |
|---|---|
| mean lift **< 1.0 level** | below one quantisation step, so the canvas token survives |
| deviation **≥ 1.5 levels** | comfortably above the ONE-level step that banding is made of |

**Shipped: light peak `96/255`, dark peak `255/255`** — asymmetric on purpose, the dark half run
to full alpha to claw back what little it can.

| tile | mean lift | deviation | page-to-card separation (of 7) |
|---|---|---|---|
| **96 light / 255 dark — SHIPPED** | **+0.92** | **1.70** | **6.08** |
| 119 / 119 | +1.30 | 1.97 | 5.70 |
| 255 / 255 (the naive "full-range noise") | +2.79 | 4.23 | 4.21 |

⚠️ **THIS IS A DESIGNER CALL AWAITING REVIEW, not a settled value.** It is one line in
`scripts/make-grain.js` plus a re-run. What a review should decide is whether the texture is meant
to be *seen* at 1× or only to *work* as a dither: at the shipped amplitude it is a dither — legible
under magnification, essentially imperceptible at 1× — and making it visibly grainy costs
page-to-card separation at the rate the table shows.

## The three properties that make it correct

1. **Bipolar, with unequal halves** — see above.
2. **Per-pixel independent, so it tiles with no seam by construction.** There is no spatial
   correlation to match across an edge, so no seam can exist. That is what lets the tile be
   120×120 instead of screen-sized.
3. **PNG-8, 4-bit indexed with a `tRNS` ramp** — exactly the "PNG-8" §4.6 names. 16 palette
   entries: 8 black at a rising alpha, 8 white at a rising alpha.

⚠️ §4.6 says *"WebP with a PNG-8 fallback"*. **Only the PNG-8 ships.** The repo has no image
tooling and adding an encoder dependency to save ~3 KB on a 7.5 KB asset is not a trade worth
making. If a WebP is ever wanted it is an asset swap behind one `require`, not a design change.

## 🔴 The Android tiling mechanism — verified in the installed source, not recalled

`primitives-plan.md` §6.3 check 3 asks whether `resizeMode="repeat"` tiles reliably on RN 0.79
Android, because the texture rides 25 screens. **The mechanism is present**, measured in
`node_modules/react-native`:

- `ReactAndroid/.../image/ImageResizeMode.kt` maps `"repeat"` to `ScaleTypeStartInside` **and** to
  `Shader.TileMode.REPEAT`;
- `ReactAndroid/.../image/ReactImageView.kt` uses that pair in `TilePostprocessor`, which builds a
  `BitmapShader(source, REPEAT, REPEAT)` and draws it across the view's rect.

🔴 **What that reading also found, and it is the thing to actually watch on a device — not whether
it tiles:** the postprocessor allocates a destination bitmap **the size of the view**
(`bitmapFactory.createBitmap(width, height)`), and `BasePostprocessor` supplies no cache key, so
the result is **not cached**. A full-screen texture therefore costs one full-screen bitmap **per
mounted screen**, re-made whenever the view is re-measured. On a 1080×2400 panel that is ~10 MB
each, and a router stack keeps more than one screen mounted.

**So the device question changes shape**: it is a memory-and-churn question on low-end Android, not
a "does it tile" question. §4.6's stated fallback — one pre-scaled full-bleed asset per mount —
does **not** help, because a full-screen raster decodes to the same bitmap either way. If the cost
proves real, the cheap fix is to mount the layer **once, high in the tree**, instead of per screen.

**Still unverified here and honestly so: no device, no emulator, no CI. Nothing in this repo can
render it.**
