# `assets/fonts/` — the five faces, and how to reproduce them exactly

Landed in **Build 27.1, codemod pass 4, batch E1** (2026-07-31). Design contract:
`plans/build-27.1/UI-revamp-design.md` §3.1–§3.3. Registration decision:
`plans/build-27.1/preflight-findings.md` §E2–§E3.

| file | bytes | source (static instance, **never** the variable font) | PostScript name |
|---|---|---|---|
| `Literata-Bold.ttf` | 161,040 | `googlefonts/literata` `fonts/ttf/Literata-Bold.ttf` | `Literata-Bold` |
| `Literata-Italic.ttf` | 150,328 | `googlefonts/literata` `fonts/ttf/Literata-Italic.ttf` | `Literata-Italic` |
| `Figtree-Regular.ttf` | 51,384 | `erikdkennedy/figtree` `fonts/ttf/Figtree-Regular.ttf` | `Figtree-Regular` |
| `Figtree-SemiBold.ttf` | 51,440 | `erikdkennedy/figtree` `fonts/ttf/Figtree-SemiBold.ttf` | `Figtree-SemiBold` |
| `Figtree-Bold.ttf` | 51,500 | `erikdkennedy/figtree` `fonts/ttf/Figtree-Bold.ttf` | `Figtree-Bold` |

**Total 465,692 bytes = 455 KB.** The plan estimated "~420 KB"; 455 KB is the measured figure
after subsetting and it is the number to quote from now on. Both families are **SIL OFL 1.1**
(`OFL-Literata.txt`, `OFL-Figtree.txt`, shipped beside the fonts as the licence requires),
which is what clears `UI-audit.md` §7.4's redistribution constraint — the one that blocked
Georgia server-side.

## 🔴 STATIC INSTANCES ONLY — and the Google Fonts repo does not have them

`google/fonts` `ofl/literata` and `ofl/figtree` ship **variable fonts only**
(`Literata[opsz,wght].ttf`, `Figtree[wght].ttf`). RN 0.79 exposes no variation axes, so a
variable file renders at its default instance — and for Literata that default is *Regular*, not
Bold, which is exactly the silent-wrong-face failure this whole registration decision exists to
avoid. The static instances come from the **upstream** repos, which is why the source column
above names those and not Google Fonts.

## Reproducing the subset

Latin + Latin-Ext (Google's own two subset ranges, verbatim) **plus every non-ASCII codepoint
the source actually renders**, so subsetting cannot drop a glyph the app uses:

```sh
LATIN="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
EXT="U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"
# keep.txt = every codepoint > U+007F found in app/ + components/ (22 of them, emoji excluded)
python -m fontTools.subset "<Face>.ttf" --unicodes="$LATIN,$EXT" --text-file=keep.txt \
  --layout-features='*' --name-IDs='*' --output-file="<Face>.ttf"
```

`--name-IDs='*'` is load-bearing: it preserves the `name` table, and the PostScript names above
were re-verified **after** subsetting. `--layout-features='*'` keeps kerning and ligatures.

## Measured metrics — the reason the fixed-height register did not move

| face | default line height (`hheaAsc − hheaDesc + gap`, per em) | cap | x-height |
|---|---|---|---|
| **Roboto** (the Android system font this replaces) | **1.1719** | 0.7109 | 0.5283 |
| **Figtree** (all three) | **1.2000** | 0.7000 | 0.5000 |
| **Literata** (both) | **1.4850** | 0.7000 | 0.5120 |

🔴 **Literata's natural line box is 26.7% taller than Roboto's, and that number never reaches a
layout** — because pass 2b baked an explicit `lineHeight` into all twelve ramp steps, and RN
forces the line box to exactly that value (Android `CustomLineHeightSpan`, iOS
`NSParagraphStyle.min/maximumLineHeight`). A face change can only move rendered height where
`lineHeight` is UNSET. See the pass-4 record in `tracking_files/claude_progress.md`.

⚠️ **The one consequence that IS visible:** on the three Literata display steps the baked
lineHeight is *smaller* than the face wants, so the leading is negative and ink may extend
beyond the line box — `display-lg` −10.6px, `display-md` −6.6px, `display-sm` −4.7px (≈half of
each above and below). RN draws it rather than clipping it, so nothing is lost unless an
ancestor sets `overflow: 'hidden'`. Registered as a caveat, not fixed here: changing a step's
lineHeight is a 2b-class value decision.

## Codepoints the faces do NOT cover

Measured against the five originals *and* the subsets — subsetting removed nothing:

| codepoint | where | covered by |
|---|---|---|
| `U+25B2` / `U+25BC` (▲▼) | 5 live disclosure indicators | Literata **yes**, Figtree **no** |
| `U+25CF` (●) | `cosmic-report.tsx` page dot | neither |
| `U+23F0` (⏰) | lucky-element icon | neither — it is emoji-presentation and comes from the system emoji font |
| `U+024F` `U+2208` `U+2500` `U+2248` | a regex character class and three comments | never rendered |

The five ▲▼ sites and the ● sit on Figtree Texts, so those glyphs resolve through the platform's
per-glyph fallback (Noto Sans Symbols on Android). They did the same thing under Roboto; the
fallback face may differ slightly. All but one are already `/* GLYPH */`-marked and therefore
PRESERVE-BLINDLY; the unmarked one is `birth-data.tsx`'s "Why we need this information" toggle.
