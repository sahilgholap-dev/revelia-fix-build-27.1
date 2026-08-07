#!/usr/bin/env python3
"""
Report QA PDF inspector — R9 Personalized Cosmic Report (Build 27), charter §14
STEP 7.

Deterministic, read-only inspection of a rendered report PDF. Emits a single JSON
object on stdout that the TypeScript QA gate (report-render.service.ts
`qaReportPdf`) turns into the §8 pass/fail verdict. This script does NO judging —
it only EXTRACTS the raw facts (page count, full text, distinct embedded raster
image count, open-ability); the deterministic criteria (page range, section
manifest, dash scan, face scan, chart floor) live in TypeScript so they are typed
and unit-testable.

PDF LIB — pypdf preferred (the 6b Dockerfile installs `python3-pypdf`), with a
PyMuPDF (`fitz`) fallback so the same script also runs on a dev box that only has
fitz. Both report the SAME facts:
  - pageCount     : number of pages.
  - text          : all page text concatenated (newline-joined). On the shipped
                    container LibreOffice 7.4 the charts are RASTERISED, so chart
                    labels are NOT in this text (only body prose + table cells +
                    forced H1 section titles) — which is exactly what the section /
                    dash / face scans want.
  - imageCount    : count of DISTINCT embedded raster image xobjects doc-wide
                    (deduped by object id / xref). On the container this is 3 (the
                    3 dpi-200 raster charts LO 7.4 produces from the docx SVGs). On
                    a dev-box LibreOffice that PRESERVES vector it is 0 — that is a
                    LO-version artifact, not a missing chart (see step-6b caveat).
                    The gate counts raster xobjects and ACCEPTS dpi-200 raster; it
                    does NOT assert vector.

Usage:  python3 report-qa.py <pdf-path>
Output: {"ok": true, "lib": "pypdf"|"fitz", "pageCount": N, "imageCount": M,
         "text": "..."}  |  {"ok": false, "error": "..."}
"""
import json
import sys


def inspect_with_pypdf(path):
    from pypdf import PdfReader

    reader = PdfReader(path)
    pages = reader.pages
    texts = []
    xrefs = set()
    for page in pages:
        try:
            texts.append(page.extract_text() or "")
        except Exception:
            texts.append("")
        # Distinct embedded raster images, deduped by the underlying object id so a
        # chart referenced from a shared resource is not counted once per page.
        try:
            for img in page.images:
                ref = getattr(img, "indirect_reference", None)
                key = ref.idnum if ref is not None else img.name
                xrefs.add(key)
        except Exception:
            pass
    return {
        "ok": True,
        "lib": "pypdf",
        "pageCount": len(pages),
        "imageCount": len(xrefs),
        "text": "\n".join(texts),
    }


def inspect_with_fitz(path):
    import fitz

    doc = fitz.open(path)
    texts = []
    xrefs = set()
    for page in doc:
        try:
            texts.append(page.get_text() or "")
        except Exception:
            texts.append("")
        # get_images returns the page's image xobjects; the first tuple element is
        # the xref — dedup doc-wide so a shared chart resource counts once.
        for img in page.get_images(full=True):
            xrefs.add(img[0])
    return {
        "ok": True,
        "lib": "fitz",
        "pageCount": doc.page_count,
        "imageCount": len(xrefs),
        "text": "\n".join(texts),
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "usage: report-qa.py <pdf-path>"}))
        return
    path = sys.argv[1]
    try:
        try:
            result = inspect_with_pypdf(path)
        except ImportError:
            result = inspect_with_fitz(path)
    except Exception as exc:  # unreadable / corrupt / truncated PDF
        result = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
