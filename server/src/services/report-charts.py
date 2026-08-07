#!/usr/bin/env python3
"""
Revelia Complete Reading — chart renderer (R9 §14 step 6a).

Draws the report's three charts as VECTOR (matplotlib SVG, text kept as text) +
a PNG fallback, from a Node-prepared spec. The Node renderer
(`report-render.service.ts`) does ALL arithmetic and hands this script only a
pure drawing spec — this file does NO astronomy, only layout.

CHART FORMAT = SVG (settled R9 §14 step 6a / §0.1 B1): the shipped sample PDF is
vector (0 raster xobjects), and matplotlib-SVG -> docx -> LibreOffice was proven
to PRESERVE that vector end-to-end. PNG (dpi 200) is emitted only as the OOXML
SVG fallback blip that LibreOffice does not use.

Usage:  python report-charts.py <spec.json> <outdir>
  spec.json = { "charts": { "rasi-chart": {...}, "western-wheel": {...},
                            "dasha-timeline": {...} } }
  writes    = <outdir>/<chart-id>.svg  and  <outdir>/<chart-id>.png

STYLE RULE (prompt §9): NO em (U+2014) or en (U+2013) dashes in any label; use
"to" for ranges and plain hyphens only. `axes.unicode_minus=False` prevents the
U+2212 minus glyph. All text is kept selectable (svg.fonttype=none), so any dash
would be caught by the step-7 QA dash scan of the extracted PDF text.
"""
import json
import math
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import FancyBboxPatch  # noqa: E402

matplotlib.rcParams["svg.fonttype"] = "none"       # keep text as text (searchable)
matplotlib.rcParams["axes.unicode_minus"] = False   # never emit the U+2212 minus glyph
matplotlib.rcParams["font.family"] = "serif"
matplotlib.rcParams["font.serif"] = ["Georgia", "DejaVu Serif", "Times New Roman"]

INDIGO = "#2D2A6E"
GOLD = "#B8963E"
INK = "#1A1A2E"
LTPURPLE = "#8985C9"
RED = "#C0392B"
DASHA_COLORS = [
    "#6C6AA0", "#8A7CB0", "#A88FA0", "#C0A97E", "#9CAF88",
    "#7FA0A8", "#B08A8A", "#8A96B8", "#A0A0A0",
]


def _save(fig, outdir, chart_id):
    fig.savefig(f"{outdir}/{chart_id}.svg", format="svg", bbox_inches="tight")
    fig.savefig(f"{outdir}/{chart_id}.png", format="png", dpi=200, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# 1. Rasi chart (North Indian diamond) — house 1 top-center, CCW.
# ---------------------------------------------------------------------------

# Fixed North Indian house anchor positions (unit square 0..1), house 1 top-center.
RASI_ANCHORS = {
    1: (0.50, 0.72), 2: (0.26, 0.90), 3: (0.10, 0.74), 4: (0.28, 0.50),
    5: (0.10, 0.26), 6: (0.26, 0.10), 7: (0.50, 0.28), 8: (0.74, 0.10),
    9: (0.90, 0.26), 10: (0.72, 0.50), 11: (0.90, 0.74), 12: (0.74, 0.90),
}
# Where the small gold sign-number sits for each house (nearer the outer edge).
RASI_SIGN_POS = {
    1: (0.50, 0.88), 2: (0.10, 0.95), 3: (0.03, 0.74), 4: (0.12, 0.50),
    5: (0.03, 0.26), 6: (0.10, 0.05), 7: (0.50, 0.12), 8: (0.90, 0.05),
    9: (0.97, 0.26), 10: (0.88, 0.50), 11: (0.97, 0.74), 12: (0.90, 0.95),
}


def draw_rasi(spec, outdir):
    fig, ax = plt.subplots(figsize=(5.0, 5.25))
    ax.set_xlim(-0.02, 1.02)
    ax.set_ylim(-0.06, 1.06)
    ax.set_aspect("equal")
    ax.axis("off")

    # Outer square + both diagonals + inner (edge-midpoint) diamond.
    ax.plot([0, 1, 1, 0, 0], [0, 0, 1, 1, 0], color=INDIGO, lw=2.5)
    ax.plot([0, 1], [0, 1], color=INDIGO, lw=2.0)
    ax.plot([0, 1], [1, 0], color=INDIGO, lw=2.0)
    ax.plot([0.5, 1, 0.5, 0, 0.5], [0, 0.5, 1, 0.5, 0], color=INDIGO, lw=2.0)

    houses = {int(h["house"]): h for h in spec.get("houses", [])}
    for hnum in range(1, 13):
        h = houses.get(hnum)
        if not h:
            continue
        sx, sy = RASI_SIGN_POS[hnum]
        ax.text(sx, sy, str(h.get("signNum", "")), color=GOLD, fontsize=8,
                ha="center", va="center", fontweight="bold")
        ax, _ = _stack_labels(ax, RASI_ANCHORS[hnum], h.get("planets", []))

    ax.set_title(spec.get("caption", ""), color=INDIGO, fontsize=9,
                 fontstyle="italic", pad=8)
    _save(fig, outdir, "rasi-chart")


def _stack_labels(ax, anchor, labels):
    ax_x, ax_y = anchor
    n = len(labels)
    if n == 0:
        return ax, 0
    start = ax_y + (n - 1) * 0.033 / 2
    for i, lbl in enumerate(labels):
        ax.text(ax_x, start - i * 0.033, lbl, color=INK, fontsize=7.5,
                ha="center", va="center", fontweight="bold")
    return ax, n


# ---------------------------------------------------------------------------
# 2. Western natal wheel — tropical, whole-sign houses, Asc at 9 o'clock.
# ---------------------------------------------------------------------------

def _wheel_theta(longitude, asc_longitude):
    """Screen angle (deg, CCW from +x): Asc at 180 deg (9 o'clock), zodiac CCW."""
    return 180.0 + (longitude - asc_longitude)


def draw_western(spec, outdir):
    fig, ax = plt.subplots(figsize=(5.1, 5.2))
    ax.set_xlim(-1.15, 1.15)
    ax.set_ylim(-1.15, 1.15)
    ax.set_aspect("equal")
    ax.axis("off")

    asc = float(spec.get("ascLongitude", 0.0))

    for r, lw in ((1.0, 3.0), (0.86, 1.6), (0.30, 1.6)):
        ax.add_patch(plt.Circle((0, 0), r, fill=False, color=INDIGO, lw=lw))

    # 12 spokes at whole-sign boundaries (every 30 deg from the Asc sign start).
    asc_sign_start = math.floor(asc / 30.0) * 30.0
    for k in range(12):
        th = math.radians(_wheel_theta(asc_sign_start + k * 30.0, asc))
        ax.plot([0.30 * math.cos(th), 1.0 * math.cos(th)],
                [0.30 * math.sin(th), 1.0 * math.sin(th)], color=INDIGO, lw=0.8)

    # Sign names at r=0.93, centered in each 30-deg sector.
    for s in spec.get("signs", []):
        th = math.radians(_wheel_theta(s["centerLon"], asc))
        ax.text(0.93 * math.cos(th), 0.93 * math.sin(th), s["name"],
                color=GOLD, fontsize=7.5, ha="center", va="center",
                fontstyle="italic", rotation=0)

    # House numbers at r=0.40.
    for k in range(12):
        th = math.radians(_wheel_theta(asc_sign_start + k * 30.0 + 15.0, asc))
        ax.text(0.40 * math.cos(th), 0.40 * math.sin(th), str(k + 1),
                color=LTPURPLE, fontsize=7, ha="center", va="center")

    # Planet labels at r=0.68 with white rounded boxes + simple collision offset.
    used = []
    for p in spec.get("planets", []):
        th_deg = _wheel_theta(p["longitude"], asc)
        r = 0.68
        while any(abs(((th_deg - u) + 180) % 360 - 180) < 7 for u in used):
            r -= 0.075
            if r < 0.36:
                break
        used.append(th_deg)
        th = math.radians(th_deg)
        ax.text(r * math.cos(th), r * math.sin(th), p["label"], color=INK,
                fontsize=7.5, ha="center", va="center", fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec=INDIGO, lw=0.5))

    # Red ascendant line + label at 9 o'clock.
    th = math.radians(180.0)
    ax.plot([0, 1.0 * math.cos(th)], [0, 1.0 * math.sin(th)], color=RED, lw=1.4)
    ax.text(-1.06, 0, "Asc", color=RED, fontsize=8, ha="center", va="center",
            fontweight="bold")
    # Red dashed MC line.
    if spec.get("mcLongitude") is not None:
        thmc = math.radians(_wheel_theta(float(spec["mcLongitude"]), asc))
        ax.plot([0, 1.0 * math.cos(thmc)], [0, 1.0 * math.sin(thmc)],
                color=RED, lw=1.2, linestyle=(0, (4, 3)))

    ax.set_title(spec.get("caption", ""), color=INDIGO, fontsize=9,
                 fontstyle="italic", pad=8)
    _save(fig, outdir, "western-wheel")


# ---------------------------------------------------------------------------
# 3. Dasha timeline — two stacked panels (full MD bar + current-MD antardashas).
# ---------------------------------------------------------------------------

def draw_dasha(spec, outdir):
    fig, (top, bot) = plt.subplots(2, 1, figsize=(6.6, 2.96))
    now = spec.get("nowYear")

    mds = spec.get("mahadashas", [])
    if mds:
        lo = min(m["startYear"] for m in mds)
        hi = max(m["endYear"] for m in mds)
        for i, m in enumerate(mds):
            c = DASHA_COLORS[i % len(DASHA_COLORS)]
            top.barh(0, m["endYear"] - m["startYear"], left=m["startYear"],
                     height=0.6, color=c, edgecolor="white")
            mid = (m["startYear"] + m["endYear"]) / 2.0
            top.text(mid, 0, f"{m['lord']}\n{int(m['startYear'])} to {int(m['endYear'])}",
                     color="white", fontsize=6.5, ha="center", va="center",
                     fontweight="bold")
        top.set_xlim(lo, hi)
        if now is not None and lo <= now <= hi:
            top.axvline(now, color=RED, lw=1.5)
            top.text(now, 0.42, "NOW", color=RED, fontsize=7, ha="center",
                     fontweight="bold")
    top.set_ylim(-0.5, 0.6)
    top.set_yticks([])
    top.set_title(spec.get("captionTop", "Mahadasha Sequence"), color=INDIGO,
                  fontsize=8, fontweight="bold")

    ads = spec.get("antardashas", [])
    if ads:
        lo = min(a["startYear"] for a in ads)
        hi = max(a["endYear"] for a in ads)
        sig = spec.get("signatureLord")
        for a in ads:
            c = GOLD if a["lord"] == sig else "#B8B8CC"
            bot.barh(0, a["endYear"] - a["startYear"], left=a["startYear"],
                     height=0.6, color=c, edgecolor="white")
            mid = (a["startYear"] + a["endYear"]) / 2.0
            bot.text(mid, 0, a["lord"], color=INK, fontsize=6, ha="center",
                     va="center")
        bot.set_xlim(lo, hi)
        if now is not None and lo <= now <= hi:
            bot.axvline(now, color=RED, lw=1.5)
    bot.set_ylim(-0.5, 0.6)
    bot.set_yticks([])
    bot.set_title(spec.get("captionBot", "Current Mahadasha, Antardashas"),
                  color=INDIGO, fontsize=8, fontweight="bold")

    fig.tight_layout()
    _save(fig, outdir, "dasha-timeline")


DRAW = {
    "rasi-chart": draw_rasi,
    "western-wheel": draw_western,
    "dasha-timeline": draw_dasha,
}


def main():
    spec_path, outdir = sys.argv[1], sys.argv[2]
    with open(spec_path, "r", encoding="utf-8") as fh:
        spec = json.load(fh)
    charts = spec.get("charts", {})
    written = []
    for chart_id, cspec in charts.items():
        fn = DRAW.get(chart_id)
        if fn is None:
            continue
        fn(cspec, outdir)
        written.append(chart_id)
    print(json.dumps({"written": written}))


if __name__ == "__main__":
    main()
