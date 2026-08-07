/**
 * Report renderer — R9 Personalized Cosmic Report (Build 27), charter §14 STEP 6a.
 *
 * Mode B (R9-report.md §0/§4, spec §12-D2, prompt §8 Output Contract): the Fable
 * model emits ONLY structured PROSE, split by `===SECTION: <id>===` delimiters and
 * carrying `[[CHART: <id>]]` / `[[TABLE: <id>]]` markers. This module CONSUMES that
 * prose plus the injected `ASTRONOMY_JSON` / `NUMEROLOGY_JSON` (5a's validated
 * payloads) and produces the finished 18-26pp PDF:
 *
 *   parse the §8 prose contract  ->  build the 3 charts (matplotlib SVG) + the 12
 *   data tables FROM THE INJECTED DATA  ->  assemble the docx (Node `docx`)  ->
 *   convert docx -> PDF via LibreOffice `soffice` headless  ->  return the bytes.
 *
 * The renderer draws every chart and fills every table cell from the injected
 * data; it NEVER reads a number out of the model's prose and does NO arithmetic
 * beyond formatting (dates, degree-minute strings, year fractions for the axis).
 *
 * ── CHART FORMAT = VECTOR SVG (settled R9 §14 step 6a / §0.1 B1) ───────────────
 * The shipped sample PDF is VECTOR (pymupdf: 0 raster image xobjects on every
 * page; chart pages are 44-48 vector path groups). matplotlib-SVG embedded via a
 * docx SVG ImageRun was proven to PRESERVE that vector end-to-end through
 * `soffice` docx->PDF (output page: 0 raster xobjects, 61 vector items). So charts
 * are emitted as matplotlib SVG (text kept selectable); the PNG at dpi 200 is only
 * the OOXML SVG fallback blip LibreOffice does not use. This CONFIRMS the Q1 fork
 * choice (docx -> LibreOffice) with no reopen. The prompt §8 "dpi 200 PNG" line and
 * a claude.ai browser run both said raster; the SHIPPED artifact settles it as
 * vector and this renderer matches the shipped artifact.
 *
 * ── STYLE (prompt §9, verified by the step-7 QA dash scan) ─────────────────────
 * ZERO em (U+2014) and en (U+2013) dashes anywhere the renderer emits — table
 * cells, chart labels, captions, date ranges ("2030 to 2036", or a plain hyphen in
 * "2028-2031"). Chart text is kept selectable, so a stray dash in a label would be
 * caught by the PDF text extraction; the chart script pins `axes.unicode_minus`
 * off to avoid the U+2212 glyph too.
 *
 * ── SCOPE (6a) ────────────────────────────────────────────────────────────────
 * Standalone renderer, proven LOCALLY on the Monty fixture. NO Dockerfile / NO
 * Railway deploy (6b); NO QA gate module (step 7); NO R2 upload / delivery
 * (step 8). `report.service` still stamps `pdfKey:'STUB'` until step 7/8 wire the
 * gate-before-ready. External binaries (`python3` + matplotlib, `soffice`) are
 * resolved from env (6b bakes them into the image).
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  PageBreak,
  VerticalAlign,
  convertInchesToTwip,
} from 'docx';
import {
  ReportAstronomyPayload,
  ReportNumerologyPayload,
  ReportPalmPayload,
  CompoundReduced,
} from './report-inject.service';
import { ZodiacSign } from '../types/shared';
import { logger } from '../utils/logger';

// ===========================================================================
// Palette / type constants (prompt §8 renderer-guidance). Hex WITHOUT '#' for
// docx shading/color fields.
// ===========================================================================
const INDIGO = '2D2A6E';
const GOLD = 'B8963E';
const INK = '1A1A2E';
const CREAM = 'F6F1E3';
const LTGRAY = 'EDEBF5';
const GRAY = '6B6B7B';
const WHITE = 'FFFFFF';

const FONT = 'Georgia';
const BODY_PT = 22; // 11pt in half-points
const CELL_PT = 19; // 9.5pt
const HEADER_CELL_PT = 20; // 10pt
const H1_PT = 32; // 16pt
const H2_PT = 26; // 13pt

const TABLE_WIDTH_DXA = 9360; // prompt §8

// US Letter portrait, 1" margins.
const LETTER_W = 12240;
const LETTER_H = 15840;
const MARGIN = convertInchesToTwip(1);

// ===========================================================================
// The §8 section manifest — the strict, pinned parse contract (prompt §8). A
// missing / extra / misordered id is a HARD error (surfaces to step 7's gate).
// ===========================================================================
export const SECTION_IDS = [
  'highlights',
  'cover',
  'how-to-read',
  'part-i',
  'part-ii',
  'part-iii',
  'part-iv',
  'part-v',
  'part-vi',
  'part-vii',
  'appendix-a',
  'appendix-b',
  'appendix-c',
  'appendix-d',
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

/** Canonical printed human titles (prompt §8) — the renderer FORCES these as the
 *  H1 heading regardless of the model's title line, so the step-7 QA section-
 *  presence gate is satisfied by construction. `highlights` is not printed; the
 *  cover has no H1 (its own centered layout). */
export const SECTION_TITLES: Record<SectionId, string | null> = {
  highlights: null,
  cover: null,
  'how-to-read': 'How to Read This Report',
  'part-i': 'Part I. Two Charts, One Sky',
  'part-ii': 'Part II. The Person',
  'part-iii': 'Part III. The Clock',
  'part-iv': 'Part IV. Life Domains',
  'part-v': 'Part V. Windows and the Tending Register',
  'part-vi': 'Part VI. The Decades',
  'part-vii': 'Part VII. The Convergence Layers',
  'appendix-a': 'Appendix A. Full Positions and Divisional Detail',
  'appendix-b': 'Appendix B. Transit Ingress Tables',
  'appendix-c': 'Appendix C. Glossary',
  'appendix-d': 'Appendix D. Methodology, Sources, and Disclosures',
};

const CHART_IDS = ['rasi-chart', 'western-wheel', 'dasha-timeline'] as const;
type ChartId = (typeof CHART_IDS)[number];

const SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
const SIGN_ABBR: Record<ZodiacSign, string> = {
  Aries: 'Ari', Taurus: 'Tau', Gemini: 'Gem', Cancer: 'Can', Leo: 'Leo', Virgo: 'Vir',
  Libra: 'Lib', Scorpio: 'Sco', Sagittarius: 'Sag', Capricorn: 'Cap', Aquarius: 'Aqu', Pisces: 'Pis',
};
const BODY_ABBR: Record<string, string> = {
  sun: 'Su', moon: 'Mo', mercury: 'Me', venus: 'Ve', mars: 'Ma',
  jupiter: 'Ju', saturn: 'Sa', rahu: 'Ra', ketu: 'Ke',
};
const BODY_LABEL: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu',
};

// ===========================================================================
// Types.
// ===========================================================================
export interface RenderReportMeta {
  preparedFor: string; // full display name (cover + header short-name)
  dobDisplay: string; // "March 23, 1983"
  tobDisplay: string; // "10:55 IST" or unknown marker
  pobDisplay: string; // "Mumbai, India"
  generatedDate: string; // "July 3, 2026"
  subjectType: 'adult' | 'child';
}

export interface RenderReportArgs {
  interpretation: string;
  astronomy: ReportAstronomyPayload;
  numerology: ReportNumerologyPayload;
  palm: ReportPalmPayload;
  meta: RenderReportMeta;
  /** External-binary overrides (harness / 6b container). Defaults: env then PATH. */
  bin?: { python?: string; soffice?: string; chartScript?: string };
}

/** Thrown on a malformed §8 manifest (missing / extra / misordered section id). */
export class ReportContractError extends Error {
  constructor(message: string) {
    super(`[report-render:contract] ${message}`);
    this.name = 'ReportContractError';
  }
}

/** Thrown when the external render toolchain (python / soffice) fails. */
export class ReportRenderError extends Error {
  constructor(message: string) {
    super(`[report-render:toolchain] ${message}`);
    this.name = 'ReportRenderError';
  }
}

/**
 * Thrown by `report.service` when a report exhausts its bounded QA repair budget
 * (a persistent QA failure). Carries the QA `failures[]` + the aggregate class so
 * the worker can write a descriptive `failureReason`. The worker treats this like
 * `ReportInjectValidationError`: TERMINAL fail-fast (no MAX_ATTEMPTS retry — a
 * re-claim would only re-render/re-Fable the same deficient inputs), which drops
 * the report out of the partial unique index → the month's slot is REFUNDED. NO
 * credit is ever spent on a QA-failed report.
 */
export class ReportQaFailedError extends Error {
  readonly failures: string[];
  readonly failureClass: QaFailureClass;
  constructor(failures: QaFailure[], failureClass: QaFailureClass) {
    super(
      `[report-render:qa] report failed QA (${failureClass}): ` +
        failures.map((f) => `${f.check}[${f.class}] ${f.detail}`).join('; ')
    );
    this.name = 'ReportQaFailedError';
    this.failures = failures.map((f) => `${f.check}[${f.class}]: ${f.detail}`);
    this.failureClass = failureClass;
  }
}

interface ParsedSection {
  id: SectionId;
  /** Ordered content items: prose paragraphs, callouts, and markers, verbatim. */
  lines: string[];
}

// ===========================================================================
// §8 CONTRACT PARSER — split on the delimiter, validate the pinned manifest.
// ===========================================================================
const DELIM_RE = /^===SECTION:\s*([a-z-]+)\s*===$/;
const MARKER_RE = /^\[\[(CHART|TABLE):\s*([a-z-]+)\]\]$/;

export function parseContract(interpretation: string): ParsedSection[] {
  const rawLines = interpretation.replace(/\r\n/g, '\n').split('\n');
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const line of rawLines) {
    const m = line.trim().match(DELIM_RE);
    if (m) {
      const id = m[1] as SectionId;
      current = { id, lines: [] };
      sections.push(current);
      continue;
    }
    if (current) current.lines.push(line);
    // Text before the first delimiter is ignored (prompt §8 has none).
  }

  // Validate: EXACTLY the pinned manifest, in order (a hard error either way).
  const got = sections.map((s) => s.id);
  if (got.length !== SECTION_IDS.length) {
    throw new ReportContractError(
      `expected ${SECTION_IDS.length} sections, got ${got.length}: [${got.join(', ')}]`
    );
  }
  for (let i = 0; i < SECTION_IDS.length; i++) {
    if (got[i] !== SECTION_IDS[i]) {
      throw new ReportContractError(
        `section ${i} must be '${SECTION_IDS[i]}', got '${got[i]}' ` +
          `(full order: [${got.join(', ')}])`
      );
    }
  }
  return sections;
}

/** Split a section body into paragraph blocks (blank-line separated); a marker
 *  is always its own block (it is alone on its line per §8). */
function paragraphsOf(lines: string[]): string[] {
  const blocks: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join(' ').trim();
    if (text) blocks.push(text);
    buf = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      flush();
      continue;
    }
    if (MARKER_RE.test(line)) {
      flush();
      blocks.push(line);
      continue;
    }
    buf.push(line);
  }
  flush();
  return blocks;
}

// ===========================================================================
// Formatting helpers (formatting ONLY — no arithmetic beyond it).
// ===========================================================================
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** ISO "YYYY-MM-DD" -> "Mar 30, 2025" (prompt §9 table date form; no dashes). */
function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${MONTHS[parseInt(mo, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

/** ISO date -> decimal year (for the dasha timeline axis). Formatting, not astronomy. */
function isoToYearFrac(iso: string): number {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return NaN;
  const [, y, mo, d] = m.map(Number) as unknown as number[];
  const dt = Date.UTC(y, mo - 1, d);
  const yearStart = Date.UTC(y, 0, 1);
  const yearLen = Date.UTC(y + 1, 0, 1) - yearStart;
  return y + (dt - yearStart) / yearLen;
}

/** Degree-minute string within a sign, "7°29'" (prompt §9). */
function dmsOf(longitude: number): string {
  const within = ((longitude % 30) + 30) % 30;
  let deg = Math.floor(within);
  let min = Math.round((within - deg) * 60);
  if (min === 60) {
    min = 0;
    deg += 1;
  }
  return `${deg}°${String(min).padStart(2, '0')}'`;
}

function signFromLon(longitude: number): ZodiacSign {
  return SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)];
}

/** Present a numerology value with its master framing (prompt §4). No dashes. */
function fmtNumerology(v: CompoundReduced | { compound?: number; reduced: number; isMaster: boolean }): string {
  if (v.isMaster) return `${v.reduced} (master)`;
  return `${v.reduced}`;
}

// ===========================================================================
// docx cell / row / table builders (prompt §8 renderer-guidance styling).
// ===========================================================================
function cellPara(text: string, opts: { bold?: boolean; color?: string; header?: boolean } = {}): Paragraph {
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts.header ? HEADER_CELL_PT : CELL_PT,
        bold: opts.bold ?? opts.header ?? false,
        color: opts.color ?? (opts.header ? WHITE : INK),
      }),
    ],
  });
}

function tableCell(text: string, colWidth: number, opts: { header?: boolean; zebra?: boolean } = {}): TableCell {
  return new TableCell({
    width: { size: colWidth, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 30, bottom: 30, left: 90, right: 90 },
    shading: opts.header
      ? { type: ShadingType.CLEAR, color: 'auto', fill: INDIGO }
      : opts.zebra
        ? { type: ShadingType.CLEAR, color: 'auto', fill: LTGRAY }
        : { type: ShadingType.CLEAR, color: 'auto', fill: WHITE },
    children: [cellPara(text, { header: opts.header })],
  });
}

interface TableData {
  headers: string[];
  rows: string[][];
}

function buildDocxTable(data: TableData): Table {
  const nCols = data.headers.length;
  const colW = Math.floor(TABLE_WIDTH_DXA / nCols);
  const colWidths = Array(nCols).fill(colW);

  const headerRow = new TableRow({
    tableHeader: true,
    children: data.headers.map((h) => tableCell(h, colW, { header: true })),
  });
  const bodyRows = data.rows.map(
    (row, i) =>
      new TableRow({
        children: row.map((c) => tableCell(c, colW, { zebra: i % 2 === 1 })),
      })
  );

  return new Table({
    width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: colWidths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: LTGRAY },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: LTGRAY },
      left: { style: BorderStyle.SINGLE, size: 2, color: LTGRAY },
      right: { style: BorderStyle.SINGLE, size: 2, color: LTGRAY },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: LTGRAY },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: LTGRAY },
    },
    rows: [headerRow, ...bodyRows],
  });
}

// ===========================================================================
// THE 12 DATA TABLES — every cell sourced from the INJECTED data (never prose).
// Each returns { headers, rows }; the FIRST data row is what the step-7 gate
// asserts against the injected payload.
// ===========================================================================
export type TableId =
  | 'birth-details' | 'patrika-reconciliation' | 'vedic-positions' | 'western-positions'
  | 'named-combinations' | 'mahadasha-ladder' | 'antardasha' | 'panchanga'
  | 'tending-windows' | 'appendix-a-positions' | 'appendix-b-transits'
  | 'numerology-grid' | 'numerology-letter-values';

/** Exported for the step-7 QA gate + the 6a fidelity harness: proves each table's
 *  cells are built FROM THE INJECTED DATA (never the model prose). */
export function buildTableData(
  id: TableId,
  astro: ReportAstronomyPayload,
  num: ReportNumerologyPayload,
  meta: RenderReportMeta
): TableData | null {
  const d = astro.derived;
  switch (id) {
    case 'birth-details': {
      const moon = d.positions.find((p) => p.body === 'moon');
      const rows: string[][] = [
        ['Name', num.name_at_birth],
        ['Date of Birth', meta.dobDisplay],
        ['Time of Birth', meta.tobDisplay],
        ['Place of Birth', meta.pobDisplay],
      ];
      if (d.ascendant) rows.push(['Lagna (Ascendant)', `${d.ascendant.sign} ${d.ascendant.dms}`]);
      if (moon) rows.push(['Moon Nakshatra', `${moon.nakshatra} (pada ${moon.pada})`]);
      rows.push(['Tithi', d.panchanga.tithiLabel]);
      rows.push(['Yoga', d.panchanga.yogaName]);
      rows.push(['Vara', d.panchanga.varaCivil]);
      return { headers: ['Field', 'Value'], rows };
    }
    case 'vedic-positions': {
      const dignities = new Map(d.dignities.map((x) => [x.body, x]));
      const rows = d.positions.map((p) => {
        const dig = dignities.get(p.body);
        return [
          BODY_LABEL[p.body] ?? p.body,
          `${p.sign} ${p.dms}${p.retrograde ? ' (R)' : ''}`,
          p.siderealHouse != null ? String(p.siderealHouse) : '',
          `${p.nakshatra} (${p.pada})`,
          dig ? dig.dignity : '',
        ];
      });
      return { headers: ['Body', 'Position', 'House', 'Nakshatra (Pada)', 'Dignity'], rows };
    }
    case 'western-positions': {
      const wd = new Map(d.westernDignities.map((x) => [x.body, x]));
      const ascSignIdx = astro.tropical.asc != null ? Math.floor(astro.tropical.asc / 30) : null;
      const bodies: Array<{ key: keyof typeof astro.tropical; body: string }> = [
        { key: 'sun', body: 'sun' }, { key: 'moon', body: 'moon' }, { key: 'mercury', body: 'mercury' },
        { key: 'venus', body: 'venus' }, { key: 'mars', body: 'mars' }, { key: 'jupiter', body: 'jupiter' },
        { key: 'saturn', body: 'saturn' }, { key: 'rahu_mean', body: 'rahu' },
      ];
      const rows = bodies.map(({ key, body }) => {
        const lon = astro.tropical[key] as number;
        const sign = signFromLon(lon);
        let house = '';
        if (ascSignIdx != null) house = String((((SIGNS.indexOf(sign) - ascSignIdx + 12) % 12) + 1));
        const cond = wd.get(body as never);
        return [BODY_LABEL[body] ?? body, `${sign} ${dmsOf(lon)}`, house, cond ? cond.condition : ''];
      });
      return { headers: ['Body', 'Position', 'House', 'Condition'], rows };
    }
    case 'named-combinations': {
      const rows = d.yogas.yogas.map((y) => [
        y.name,
        y.basis,
        y.bodies.map((b) => BODY_LABEL[b] ?? b).join(', '),
      ]);
      if (rows.length === 0) rows.push(['None detected', 'No classical yoga met its formation conditions', '']);
      return { headers: ['Combination', 'Technical Basis', 'Bodies'], rows };
    }
    case 'mahadasha-ladder': {
      const rows = d.dasha.mahadashas.map((m) => [
        m.lord,
        fmtDate(m.start),
        fmtDate(m.end),
        `${m.startAge} to ${m.endAge}`,
      ]);
      return { headers: ['Mahadasha', 'Start', 'End', 'Age Range'], rows };
    }
    case 'antardasha': {
      const current = d.dasha.current;
      const md =
        (current && d.dasha.mahadashas.find((m) => m.lord === current.mahadashaLord)) ||
        d.dasha.mahadashas.find((m) => m.antardashas.length > 0);
      const ads = md ? md.antardashas : [];
      const rows = ads.map((a) => [
        `${a.mahadashaLord} to ${a.lord}`,
        fmtDate(a.start),
        fmtDate(a.end),
        a.years.toFixed(2),
      ]);
      return { headers: ['Antardasha', 'Start', 'End', 'Years'], rows };
    }
    case 'panchanga': {
      const p = d.panchanga;
      const rows: string[][] = [
        ['Tithi', p.tithiLabel],
        ['Paksha', p.paksha],
        ['Yoga', p.yogaName],
        ['Vara (civil)', p.varaCivil],
      ];
      if (p.varaDiverges) rows.push(['Vara (strict, sunrise rule)', p.varaStrict]);
      return { headers: ['Element', 'Value'], rows };
    }
    case 'tending-windows':
    case 'appendix-b-transits': {
      const t = d.transits;
      type Ev = { date: string; label: string; sign: ZodiacSign; house: number | null };
      const evs: Ev[] = [];
      t.ingresses.saturn.forEach((i) => evs.push({ date: i.date, label: `Saturn enters ${i.sign}`, sign: i.sign, house: i.house }));
      t.ingresses.jupiter.forEach((i) => evs.push({ date: i.date, label: `Jupiter enters ${i.sign}`, sign: i.sign, house: i.house }));
      t.ingresses.rahu.forEach((i) => evs.push({ date: i.date, label: `Rahu enters ${i.sign}`, sign: i.sign, house: i.house }));
      t.sadeSati.forEach((s) => evs.push({ date: s.start, label: `Sade Sati begins (${s.timing})`, sign: s.startSign, house: null }));
      t.returns.forEach((r) => evs.push({ date: r.date, label: `${BODY_LABEL[r.body] ?? r.body} return (${r.kind})`, sign: r.sign, house: r.house }));
      t.jupiterPasses.forEach((j) => evs.push({ date: j.date, label: `Jupiter over ${j.targetLabel}`, sign: j.sign, house: j.house }));
      evs.sort((a, b) => a.date.localeCompare(b.date));
      // Part V's tending register keeps a focused 6-to-8-row spine; Appendix B is
      // the full sequence. (Silent cap flagged: Part V trims to the nearest 8.)
      const chosen = id === 'tending-windows' ? evs.slice(0, 8) : evs;
      const rows = chosen.map((e) => [e.label, fmtDate(e.date), e.sign, e.house != null ? String(e.house) : '']);
      return { headers: ['Window / Signature', 'Date', 'Sign', 'House'], rows };
    }
    case 'appendix-a-positions': {
      const dignities = new Map(d.dignities.map((x) => [x.body, x]));
      const tropByBody: Record<string, number> = {
        sun: astro.tropical.sun, moon: astro.tropical.moon, mercury: astro.tropical.mercury,
        venus: astro.tropical.venus, mars: astro.tropical.mars, jupiter: astro.tropical.jupiter,
        saturn: astro.tropical.saturn, rahu: astro.tropical.rahu_mean,
      };
      const rows = d.positions.map((p) => {
        const dig = dignities.get(p.body);
        const trop = tropByBody[p.body];
        return [
          BODY_LABEL[p.body] ?? p.body,
          `${p.sign} ${p.dms}${p.retrograde ? ' (R)' : ''}`,
          dig ? dig.dignity : '',
          `${p.nakshatra} (${p.pada})`,
          p.navamsaSign,
          trop != null ? `${signFromLon(trop)} ${dmsOf(trop)}` : '',
        ];
      });
      if (d.ascendant) {
        const tropAsc = astro.tropical.asc;
        rows.push([
          'Ascendant', `${d.ascendant.sign} ${d.ascendant.dms}`, '',
          `${d.ascendant.nakshatra} (${d.ascendant.pada})`, d.ascendant.navamsaSign,
          tropAsc != null ? `${signFromLon(tropAsc)} ${dmsOf(tropAsc)}` : '',
        ]);
      }
      if (d.midheaven && meta.subjectType === 'adult') {
        const tropMc = astro.tropical.mc;
        rows.push([
          'Midheaven', `${d.midheaven.sign} ${d.midheaven.dms}`, '', '', '',
          tropMc != null ? `${signFromLon(tropMc)} ${dmsOf(tropMc)}` : '',
        ]);
      }
      return {
        headers: ['Body', 'Sidereal Position', 'Dignity', 'Nakshatra (Pada)', 'D9 Sign', 'Tropical Position'],
        rows,
      };
    }
    case 'numerology-grid': {
      const rows: string[][] = [
        ['Expression', fmtNumerology(num.expression)],
        ['Soul Urge', fmtNumerology(num.soul_urge)],
        ['Personality', fmtNumerology(num.personality)],
        ['Life Path', fmtNumerology(num.life_path)],
        ['Maturity', fmtNumerology(num.maturity)],
        ['Birthday', num.birthday.isMaster ? `${num.birthday.reduced} (master)` : `${num.birthday.value}`],
        ['Mulank (Vedic)', `${num.mulank.value} (${num.mulank.planet})`],
        ['Bhagyank', `${num.bhagyank.reduced} (${num.bhagyank.planet})`],
        ['Chaldean Full Name', fmtNumerology(num.chaldean.full_name)],
        [
          'Personal Years',
          num.personal_years.map((y) => `${y.year}: ${y.isMaster ? `${y.value} (master)` : y.value}`).join('; '),
        ],
      ];
      return { headers: ['Number', 'Value'], rows };
    }
    case 'numerology-letter-values': {
      const pyth = num.letter_values.pythagorean;
      const chald = new Map(num.letter_values.chaldean.map((x, i) => [i, x]));
      const rows = pyth.map(([letter, pv], i) => {
        const c = chald.get(i);
        return [letter, String(pv), c ? String(c[1]) : ''];
      });
      return { headers: ['Letter', 'Pythagorean', 'Chaldean'], rows };
    }
    case 'patrika-reconciliation':
      // Only emitted when PATRIKA supplied (never in the self/blind path). No marker
      // appears, so this returns null and is never rendered in v1.
      return null;
    default:
      return null;
  }
}

// ===========================================================================
// CHART SPEC BUILDERS — pure drawing specs from the injected data; the python
// script does layout only (no astronomy).
// ===========================================================================
function buildChartSpecs(astro: ReportAstronomyPayload): Record<ChartId, unknown> {
  const d = astro.derived;

  // rasi-chart (North Indian, sidereal).
  const rasiHouses: Array<{ house: number; signNum: number; planets: string[] }> = [];
  if (d.houses.sidereal && d.ascendant) {
    for (let h = 1; h <= 12; h++) {
      const sign = d.houses.sidereal[h - 1];
      const signNum = SIGNS.indexOf(sign) + 1;
      const planets: string[] = [];
      if (h === 1) planets.push('As');
      d.positions.forEach((p) => {
        if (p.siderealHouse === h) planets.push(`${BODY_ABBR[p.body] ?? p.body} ${p.dms}`);
      });
      rasiHouses.push({ house: h, signNum, planets });
    }
  }
  const rasi = {
    lagnaSign: d.ascendant?.sign ?? '',
    caption: d.ascendant
      ? `Rasi Chart (D1) · Sidereal, Lahiri · Whole Sign · ${d.ascendant.sign} Lagna`
      : 'Rasi Chart (D1) · Sidereal, Lahiri · Whole Sign',
    houses: rasiHouses,
  };

  // western-wheel (tropical).
  const asc = astro.tropical.asc ?? 0;
  const planetKeys: Array<[keyof ReportAstronomyPayload['tropical'], string]> = [
    ['sun', 'sun'], ['moon', 'moon'], ['mercury', 'mercury'], ['venus', 'venus'],
    ['mars', 'mars'], ['jupiter', 'jupiter'], ['saturn', 'saturn'], ['rahu_mean', 'rahu'],
  ];
  const wheelPlanets = planetKeys.map(([key, body]) => {
    const lon = astro.tropical[key] as number;
    return { abbr: BODY_ABBR[body], longitude: lon, label: `${BODY_ABBR[body]} ${dmsOf(lon)}` };
  });
  // Ketu = Rahu + 180 (formatting the opposition point for display only).
  const ketuLon = (((astro.tropical.rahu_mean + 180) % 360) + 360) % 360;
  wheelPlanets.push({ abbr: 'Ke', longitude: ketuLon, label: `Ke ${dmsOf(ketuLon)}` });
  const western = {
    ascLongitude: asc,
    mcLongitude: astro.tropical.mc,
    caption: `Western Natal Wheel · Tropical Zodiac · Whole Sign Houses · ${signFromLon(asc)} Rising`,
    planets: wheelPlanets,
    signs: SIGNS.map((s, i) => ({ name: SIGN_ABBR[s], centerLon: i * 30 + 15 })),
  };

  // dasha-timeline.
  const mahadashas = d.dasha.mahadashas.map((m) => ({
    lord: m.lord,
    startYear: isoToYearFrac(m.start),
    endYear: isoToYearFrac(m.end),
    startAge: m.startAge,
    endAge: m.endAge,
  }));
  const current = d.dasha.current;
  const currentMd = current && d.dasha.mahadashas.find((m) => m.lord === current.mahadashaLord);
  const antardashas = (currentMd ? currentMd.antardashas : []).map((a) => ({
    lord: a.lord,
    startYear: isoToYearFrac(a.start),
    endYear: isoToYearFrac(a.end),
  }));
  const dasha = {
    mahadashas,
    current,
    antardashas,
    signatureLord: current?.antardashaLord ?? null,
    nowYear: isoToYearFrac(d.transits.asOf),
    captionTop: 'Vimshottari Mahadasha Sequence',
    captionBot: current ? `${current.mahadashaLord} Mahadasha, Antardashas` : 'Antardashas',
  };

  return { 'rasi-chart': rasi, 'western-wheel': western, 'dasha-timeline': dasha };
}

/** Run the bundled matplotlib chart script, returning {svg,png} buffers per id. */
function renderCharts(
  specs: Record<ChartId, unknown>,
  workDir: string,
  bin: { python: string; chartScript: string }
): Record<ChartId, { svg: Buffer; png: Buffer }> {
  const specPath = path.join(workDir, 'charts-spec.json');
  fs.writeFileSync(specPath, JSON.stringify({ charts: specs }), 'utf8');

  const res = spawnSync(bin.python, [bin.chartScript, specPath, workDir], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.status !== 0) {
    throw new ReportRenderError(
      `chart script failed (status=${res.status}): ${res.stderr || res.error?.message || 'unknown'}`
    );
  }

  const out = {} as Record<ChartId, { svg: Buffer; png: Buffer }>;
  for (const id of CHART_IDS) {
    const svgPath = path.join(workDir, `${id}.svg`);
    const pngPath = path.join(workDir, `${id}.png`);
    if (fs.existsSync(svgPath) && fs.existsSync(pngPath)) {
      out[id] = { svg: fs.readFileSync(svgPath), png: fs.readFileSync(pngPath) };
    }
  }
  return out;
}

// ===========================================================================
// PARAGRAPH / SECTION rendering.
// ===========================================================================
function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 276, lineRule: 'auto' }, // ~8pt after, ~1.15 line
    children: [new TextRun({ text, font: FONT, size: BODY_PT, color: INK })],
  });
}

function h1Paragraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 320, after: 160 },
    keepNext: true,
    children: [new TextRun({ text, font: FONT, size: H1_PT, bold: true, color: INDIGO })],
  });
}

function h2Paragraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    keepNext: true,
    children: [new TextRun({ text, font: FONT, size: H2_PT, bold: true, color: GOLD })],
  });
}

/** "In plain terms:" callout — cream fill, gold left border, bold-gold prefix +
 *  italic ink body (prompt §8). */
function calloutParagraph(text: string): Paragraph {
  const prefix = 'In plain terms:';
  const rest = text.slice(prefix.length).replace(/^\s+/, '');
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 120, after: 200, line: 276, lineRule: 'auto' },
    indent: { left: 200, right: 200 },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: CREAM },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 6 } },
    children: [
      new TextRun({ text: 'In plain terms:  ', font: FONT, size: BODY_PT, bold: true, color: GOLD }),
      new TextRun({ text: rest, font: FONT, size: BODY_PT, italics: true, color: INK }),
    ],
  });
}

function chartParagraph(img: { svg: Buffer; png: Buffer }, width: number, height: number): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [
      new ImageRun({
        type: 'svg',
        data: img.svg,
        transformation: { width, height },
        fallback: { type: 'png', data: img.png },
      }),
    ],
  });
}

// Sizes track the prompt §8 image specs (~500x525 / ~510x520 / ~660x296),
// capped to the 6.5in (624px @ 96dpi) text column.
const CHART_SIZE: Record<ChartId, { w: number; h: number }> = {
  'rasi-chart': { w: 500, h: 525 },
  'western-wheel': { w: 500, h: 510 },
  'dasha-timeline': { w: 600, h: 269 },
};

/** Heuristic sub-heading (H2): a short standalone line, no comma/colon, ends '.'. */
function looksLikeH2(text: string): boolean {
  if (text.length > 40 || text.includes(',') || text.includes(':')) return false;
  if (!/[.]$/.test(text)) return false;
  return text.split(/\s+/).length <= 5;
}

// ===========================================================================
// COVER — centered layout from the model's supplied text values (prompt §8).
// ===========================================================================
function renderCover(lines: string[]): Paragraph[] {
  const nonEmpty = lines.map((l) => l.trim()).filter((l) => l && !MARKER_RE.test(l));
  const out: Paragraph[] = [];
  const push = (text: string, size: number, opts: { bold?: boolean; italics?: boolean; color?: string } = {}) =>
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 120 },
        children: [
          new TextRun({ text, font: FONT, size, bold: opts.bold, italics: opts.italics, color: opts.color ?? INK }),
        ],
      })
    );

  // Top third spacer.
  out.push(new Paragraph({ spacing: { after: 1200 }, children: [] }));

  for (const line of nonEmpty) {
    const upper = line.toUpperCase();
    if (/^R\s*E\s*V\s*E\s*L\s*I\s*A$/.test(line) || line === 'R E V E L I A') {
      push('R E V E L I A', 30, { bold: true, color: GOLD });
    } else if (upper === 'THE COMPLETE READING') {
      push('THE COMPLETE READING', 56, { bold: true, color: INDIGO });
    } else if (/unified|astrological analysis/i.test(line)) {
      push(line, 26, { italics: true, color: INK });
    } else if (/^prepared for/i.test(line)) {
      push(line, 26, { bold: true });
    } else if (/^born /i.test(line)) {
      push(line, 22);
    } else if (/nakshatra|rashi|lagna|tithi|yoga/i.test(line)) {
      push(line, 20, { color: GRAY });
    } else if (/^generated /i.test(line) || /swiss ephemeris/i.test(line)) {
      push(line, 20, { color: GRAY });
    } else if (/^version |edition/i.test(line)) {
      push(line, 20, { color: GRAY });
    } else if (/^blind reading/i.test(line)) {
      push(line, 20, { color: INK });
    } else if (/insight, never fate|entertainment|not medical/i.test(line)) {
      push(line, 18, { italics: true, color: GRAY });
    } else {
      push(line, 22);
    }
  }
  // Cover is its own page (matches the sample); the body starts fresh after it.
  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

// ===========================================================================
// SECTION assembly — prose + markers -> docx children, in document order.
// ===========================================================================
function isTitleLine(text: string, canonical: string | null): boolean {
  if (!canonical) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[.,]/g, '').trim();
  const t = norm(text);
  const c = norm(canonical);
  return t === c || c.endsWith(t) || /^(part\s|appendix\s|how to read)/i.test(text.trim());
}

function renderSection(
  section: ParsedSection,
  charts: Record<ChartId, { svg: Buffer; png: Buffer }>,
  astro: ReportAstronomyPayload,
  num: ReportNumerologyPayload,
  meta: RenderReportMeta,
  renderedTables: Set<string>
): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  const canonical = SECTION_TITLES[section.id];

  if (section.id === 'cover') {
    out.push(...renderCover(section.lines));
    return out;
  }

  // Forced canonical H1 (prompt §8: the renderer styles the heading).
  if (canonical) out.push(h1Paragraph(canonical));

  const blocks = paragraphsOf(section.lines);
  let titleConsumed = false;
  for (const block of blocks) {
    const marker = block.match(MARKER_RE);
    if (marker) {
      const kind = marker[1];
      const markerId = marker[2];
      if (kind === 'CHART') {
        const img = charts[markerId as ChartId];
        const size = CHART_SIZE[markerId as ChartId];
        if (img && size) out.push(chartParagraph(img, size.w, size.h));
      } else {
        // TABLE — dedup (the confirm-smoke emitted birth-details in BOTH cover &
        // part-i; cover is text-only so the cover one is already dropped, and this
        // Set makes any repeat idempotent).
        if (!renderedTables.has(markerId)) {
          const data = buildTableData(markerId as TableId, astro, num, meta);
          if (data) {
            out.push(buildDocxTable(data));
            renderedTables.add(markerId);
          }
        }
      }
      continue;
    }
    // Drop the model's title line (H1 is forced from canonical) — once.
    if (!titleConsumed && isTitleLine(block, canonical)) {
      titleConsumed = true;
      continue;
    }
    if (/^in plain terms\s*:/i.test(block)) {
      out.push(calloutParagraph(block));
    } else if (looksLikeH2(block)) {
      out.push(h2Paragraph(block));
    } else {
      out.push(bodyParagraph(block));
    }
  }
  return out;
}

// ===========================================================================
// PUBLIC ENTRY.
// ===========================================================================
function resolveChartScript(override?: string): string {
  if (override) return override;
  if (process.env.REPORT_CHART_SCRIPT) return process.env.REPORT_CHART_SCRIPT;
  const candidates = [
    path.join(__dirname, 'report-charts.py'),
    path.join(process.cwd(), 'src', 'services', 'report-charts.py'),
    path.join(process.cwd(), 'dist', 'services', 'report-charts.py'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new ReportRenderError(`report-charts.py not found; tried: ${candidates.join(', ')}`);
}

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts[0] || full;
}

function buildHeaderFooter(meta: RenderReportMeta): { header: Header; footer: Footer } {
  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: `REVELIA  ·  The Complete Reading  ·  ${shortName(meta.preparedFor)}`,
            font: FONT,
            size: 16,
            bold: true,
            color: GOLD,
          }),
        ],
      }),
    ],
  });
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'For insight and entertainment · Not medical, legal, or financial advice · Page ',
            font: FONT,
            size: 16,
            color: GRAY,
          }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GRAY }),
        ],
      }),
    ],
  });
  return { header, footer };
}

/**
 * Render the Complete Reading PDF from the model's §8 prose + the injected data.
 * Returns the PDF bytes. Pure-ish: no DB, no R2, no Fable. Uses a per-call temp
 * work dir (removed on exit) for the chart SVGs, the docx, and the soffice output.
 */
export async function renderReportPdf(args: RenderReportArgs): Promise<Buffer> {
  const python = args.bin?.python || process.env.REPORT_PYTHON_BIN || 'python3';
  const soffice = args.bin?.soffice || process.env.REPORT_SOFFICE_BIN || 'soffice';
  const chartScript = resolveChartScript(args.bin?.chartScript);

  // 1) Parse + validate the §8 contract (hard error on a malformed manifest).
  const sections = parseContract(args.interpretation);

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'revelia-report-'));
  try {
    // 2) Build the 3 charts (matplotlib SVG + PNG fallback) from injected data.
    const specs = buildChartSpecs(args.astronomy);
    const charts = renderCharts(specs, workDir, { python, chartScript });

    // 3) Assemble the docx body in document order.
    const renderedTables = new Set<string>();
    const children: (Paragraph | Table)[] = [];
    for (const section of sections) {
      if (section.id === 'highlights') continue; // app-facing, not printed (prompt §8)
      children.push(...renderSection(section, charts, args.astronomy, args.numerology, args.meta, renderedTables));
    }

    const { header, footer } = buildHeaderFooter(args.meta);
    const doc = new Document({
      styles: {
        default: {
          document: { run: { font: FONT, size: BODY_PT, color: INK } },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: LETTER_W, height: LETTER_H },
              margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
            },
          },
          headers: { default: header },
          footers: { default: footer },
          children,
        },
      ],
    });

    // 4) Pack the docx, convert docx -> PDF via LibreOffice `soffice` headless.
    const docxBuf = await Packer.toBuffer(doc);
    const docxPath = path.join(workDir, 'report.docx');
    fs.writeFileSync(docxPath, docxBuf);

    const conv = spawnSync(
      soffice,
      ['--headless', '--convert-to', 'pdf', '--outdir', workDir, docxPath],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );
    const pdfPath = path.join(workDir, 'report.pdf');
    if (!fs.existsSync(pdfPath)) {
      throw new ReportRenderError(
        `soffice did not produce a PDF (status=${conv.status}): ` +
          `${conv.stderr || conv.error?.message || 'unknown'}`
      );
    }
    const pdf = fs.readFileSync(pdfPath);
    logger.info(
      `[report-render] rendered PDF: ${pdf.length} bytes, ${sections.length} sections, ` +
        `${Object.keys(charts).length} charts, ${renderedTables.size} tables`
    );
    return pdf;
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
}

// ===========================================================================
// QA GATE (charter §14 STEP 7, §8 folded from prompt §10) — the deterministic
// pre-`ready` gate. A QA-PASS (not the STUB sentinel) is what authorizes a report
// to become `ready`. Runs on the RENDERED PDF via the bundled report-qa.py
// inspector (page count / full text / distinct raster image count / open-ability);
// the criteria themselves are applied here, in TypeScript, so they are typed and
// unit-testable.
// ===========================================================================

/**
 * A QA failure is classified so `report.service` can route repair correctly (DO 4
 * A2 — the #1 correctness point). Re-Fabling a render bug burns money on the wrong
 * layer.
 *   - CONTENT : the interpretation itself is deficient (too short / a section
 *               absent from the prose / a model-authored dash or face phrase) →
 *               re-Fable (nonce bump → a fresh interpretation), bounded TIGHT.
 *   - RENDER  : the interpretation is fine but the PDF is wrong (a chart missing,
 *               a section present in the prose but absent from the PDF, a toolchain
 *               hiccup) → RE-RENDER ONLY, no re-Fable, no spend.
 * The determinant: content that is PRESENT in the interpretation but ABSENT from
 * the PDF ⇒ RENDER; content ABSENT from the interpretation prose ⇒ CONTENT.
 */
export type QaFailureClass = 'CONTENT' | 'RENDER';

export interface QaFailure {
  check: string;
  class: QaFailureClass;
  detail: string;
}

export interface QaChecks {
  opens: boolean;
  pageCount: boolean;
  sections: boolean;
  dashes: boolean;
  charts: boolean;
  face: boolean;
}

export interface QaResult {
  pass: boolean;
  checks: QaChecks;
  failures: QaFailure[];
  /** Aggregate repair class: CONTENT if ANY failure is CONTENT, else RENDER. */
  failureClass: QaFailureClass;
  /** Raw facts (for logging / the page-count length watch). */
  facts: { pageCount: number; imageCount: number; wordCount: number; lib?: string };
}

export interface QaContext {
  /** The persisted interpretation prose — the content-vs-render classifier. */
  interpretation: string;
  subjectType?: 'adult' | 'child';
  /** Inspector-binary overrides (harness / 6b container). Defaults: env then PATH. */
  bin?: { python?: string; qaScript?: string };
}

// ── Gate thresholds ──────────────────────────────────────────────────────────
/**
 * ⚠️ PAGE FLOOR = 17, NOT 18 (DO 2). 6a's reconciled Monty prose renders to
 * EXACTLY 18pp; a floor of 18 would turn every slightly-short report into a paid
 * re-Fable loop for zero fidelity gain. The floor must sit BELOW the typical
 * output. The real length lever is the Sid-gated "target ~20-24pp" prompt nudge
 * (a flagged owner-action), NOT a tight floor — this floor is only the safety net
 * so a typical report never triggers a paid regenerate.
 */
export const QA_PAGE_MIN = 17;
export const QA_PAGE_MAX = 26;
/** ≥3 chart images (rasi / western / dasha). Counted as RASTER image xobjects. */
export const QA_MIN_CHARTS = 3;
/**
 * Word floor to classify a page-too-short failure. Below this, the interpretation
 * ITSELF is short → CONTENT (re-Fable); at/above it, ample prose rendered to too
 * few pages → RENDER (re-render / layout). Reconciled Monty ≈ 4.7K words → 18pp,
 * so a genuinely thin interpretation sits well under this.
 */
const QA_WORD_FLOOR = 3500;

/**
 * FACE-derived-content scan terms (DO 2 — §8 "NEW gate item"; runtime backstop on
 * 5a's STRUCTURAL exclusion, which is the real guarantee). Deliberately targets
 * AFFIRMATIVE face-feature phrasing + the literal inject keys — NOT the bare word
 * "face": the correct report legitimately contains the exclusion DISCLOSURE ("The
 * Face. No face photograph was provided…") and palm content uses "hasta
 * samudrika", so scanning bare "face"/"samudrika" would false-positive on a GOOD
 * report. Matched case-insensitively against the extracted text.
 */
const FACE_TERMS = [
  'facearchetype', 'facetraits', 'faceshape', // literal 5a inject keys (never in prose)
  'face shape', 'face reading', 'facereading', 'facial', 'physiognom',
  'jawline', 'cheekbone', 'forehead', 'brow ridge', 'eyebrow',
  'nose shape', 'chin shape', 'samudrika of the face',
];

const NORM = (s: string) => s.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();

/** Resolve the bundled QA inspector script (mirrors resolveChartScript). */
function resolveQaScript(override?: string): string {
  if (override) return override;
  if (process.env.REPORT_QA_SCRIPT) return process.env.REPORT_QA_SCRIPT;
  const candidates = [
    path.join(__dirname, 'report-qa.py'),
    path.join(process.cwd(), 'src', 'services', 'report-qa.py'),
    path.join(process.cwd(), 'dist', 'services', 'report-qa.py'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new ReportRenderError(`report-qa.py not found; tried: ${candidates.join(', ')}`);
}

interface QaInspection {
  ok: boolean;
  error?: string;
  lib?: string;
  pageCount?: number;
  imageCount?: number;
  text?: string;
}

/** Spawn report-qa.py on the PDF bytes → the raw extracted facts. */
function inspectPdf(pdf: Buffer, bin: { python: string; qaScript: string }): QaInspection {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'revelia-qa-'));
  try {
    const pdfPath = path.join(workDir, 'report.pdf');
    fs.writeFileSync(pdfPath, pdf);
    const res = spawnSync(bin.python, [bin.qaScript, pdfPath], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (res.status !== 0 && !res.stdout) {
      return { ok: false, error: `qa inspector failed (status=${res.status}): ${res.stderr || res.error?.message || 'unknown'}` };
    }
    try {
      return JSON.parse(res.stdout) as QaInspection;
    } catch {
      return { ok: false, error: `qa inspector returned non-JSON: ${(res.stdout || res.stderr || '').slice(0, 200)}` };
    }
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
}

/**
 * Deterministic QA gate on a rendered report PDF. Returns pass/fail + per-check
 * booleans + a classified failure list. Does NOT throw on a QA failure (returns
 * `pass:false`); throws only on an unusable toolchain resolution.
 *
 * ⚠️ CHART CRITERION accepts DPI-200 RASTER (counts image xobjects; does NOT
 * assert vector). 6b proved LO 7.4 rasterises the docx SVG charts; asserting
 * vector would FAIL on the real deployment. On a dev-box LibreOffice that
 * preserves vector, imageCount is 0 — that is an LO-version artifact, so the
 * chart criterion is verified against a real container raster render, not a local
 * vector one.
 */
export async function qaReportPdf(pdf: Buffer, ctx: QaContext): Promise<QaResult> {
  const python = ctx.bin?.python || process.env.REPORT_PYTHON_BIN || 'python3';
  const qaScript = resolveQaScript(ctx.bin?.qaScript);

  const insp = inspectPdf(pdf, { python, qaScript });
  const failures: QaFailure[] = [];
  const checks: QaChecks = {
    opens: false, pageCount: false, sections: false, dashes: false, charts: false, face: false,
  };

  // ── opens / renders ────────────────────────────────────────────────────────
  if (!insp.ok || !insp.pageCount || insp.pageCount < 1) {
    checks.opens = false;
    failures.push({ check: 'opens', class: 'RENDER', detail: insp.error || 'PDF did not open / 0 pages' });
    // Cannot inspect further — the PDF is unusable. RENDER class (re-render).
    return { pass: false, checks, failures, failureClass: 'RENDER', facts: { pageCount: 0, imageCount: 0, wordCount: 0, lib: insp.lib } };
  }
  checks.opens = true;

  const pageCount = insp.pageCount;
  const imageCount = insp.imageCount ?? 0;
  const text = insp.text || '';
  const normText = NORM(text);
  const wordCount = ctx.interpretation.trim().split(/\s+/).filter(Boolean).length;
  const interpNorm = NORM(ctx.interpretation);
  const interpRaw = ctx.interpretation;

  // ── page count ∈ [QA_PAGE_MIN, QA_PAGE_MAX] ──────────────────────────────────
  if (pageCount < QA_PAGE_MIN) {
    // Short: thin interpretation ⇒ CONTENT; ample prose but few pages ⇒ RENDER.
    const cls: QaFailureClass = wordCount < QA_WORD_FLOOR ? 'CONTENT' : 'RENDER';
    failures.push({ check: 'pageCount', class: cls, detail: `pages=${pageCount} < ${QA_PAGE_MIN} (words=${wordCount})` });
  } else if (pageCount > QA_PAGE_MAX) {
    // Too long ⇒ the interpretation is over-length; shorter prose is the lever ⇒ CONTENT.
    failures.push({ check: 'pageCount', class: 'CONTENT', detail: `pages=${pageCount} > ${QA_PAGE_MAX} (words=${wordCount})` });
  } else {
    checks.pageCount = true;
  }

  // ── section manifest (the 12 PRINTED §8 titles; cover/highlights have no H1) ──
  const printedTitles = SECTION_IDS
    .map((id) => SECTION_TITLES[id])
    .filter((t): t is string => !!t);
  const missing = printedTitles.filter((title) => !normText.includes(NORM(title)));
  if (missing.length > 0) {
    // Present in the interpretation prose but absent from the PDF ⇒ RENDER; absent
    // from the prose too ⇒ CONTENT.
    const anyContent = missing.some((title) => !interpNorm.includes(NORM(title)));
    failures.push({
      check: 'sections',
      class: anyContent ? 'CONTENT' : 'RENDER',
      detail: `missing printed section title(s): ${missing.join(' | ')}`,
    });
  } else {
    checks.sections = true;
  }

  // ── em (U+2014) AND en (U+2013) dash scan → zero (both codepoints) ───────────
  const emCount = (text.match(/—/g) || []).length;
  const enCount = (text.match(/–/g) || []).length;
  if (emCount + enCount > 0) {
    // A dash the RENDERER emitted would be a render bug, but the renderer emits no
    // dashes (tables/labels use " to " / hyphens, unicode_minus off). A dash in the
    // PDF therefore originates from the model prose ⇒ CONTENT (re-render cannot
    // remove model-authored text; only a re-Fable can). Belt-and-braces: if it is
    // somehow NOT in the interpretation, it is a render artifact ⇒ RENDER.
    const inInterp = /[–—]/.test(interpRaw);
    failures.push({
      check: 'dashes',
      class: inInterp ? 'CONTENT' : 'RENDER',
      detail: `em=${emCount} en=${enCount} (inInterpretation=${inInterp})`,
    });
  } else {
    checks.dashes = true;
  }

  // ── ≥3 chart images embedded — RASTER xobject count (accept dpi-200 raster) ───
  if (imageCount < QA_MIN_CHARTS) {
    // Charts are renderer-produced from injected data, independent of the prose ⇒
    // always RENDER (re-render, no re-Fable).
    failures.push({ check: 'charts', class: 'RENDER', detail: `raster image xobjects=${imageCount} < ${QA_MIN_CHARTS}` });
  } else {
    checks.charts = true;
  }

  // ── ZERO face-derived content ────────────────────────────────────────────────
  const faceHits = FACE_TERMS.filter((term) => normText.includes(term));
  if (faceHits.length > 0) {
    // Face phrasing originates from the model prose (renderer never emits it) ⇒
    // CONTENT; if somehow only in renderer output, RENDER.
    const inInterp = faceHits.some((term) => interpNorm.includes(term));
    failures.push({
      check: 'face',
      class: inInterp ? 'CONTENT' : 'RENDER',
      detail: `face-derived phrasing: ${faceHits.join(', ')}`,
    });
  } else {
    checks.face = true;
  }

  const pass = failures.length === 0;
  const failureClass: QaFailureClass = failures.some((f) => f.class === 'CONTENT') ? 'CONTENT' : 'RENDER';
  return {
    pass,
    checks,
    failures,
    failureClass,
    facts: { pageCount, imageCount, wordCount, lib: insp.lib },
  };
}
