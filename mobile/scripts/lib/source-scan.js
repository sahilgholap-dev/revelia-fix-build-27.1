/**
 * source-scan.js — the ONE quote-and-comment-safe source walker the gate scripts share.
 *
 * ── 🔴 WHY THIS FILE EXISTS: ONE BUG, THREE COPIES (`O-91`) ──────────────────────────────────
 *
 * Three scanners in `scripts/` had independently copy-pasted the same five lines:
 *
 *     if (c === '"' || c === "'" || c === '`') {
 *       const q = c; i++;
 *       while (i < src.length && !(src[i] === q && src[i - 1] !== '\\')) i++;
 *       i++; continue;
 *     }
 *
 * None of them knows what JSX is, so the `'` in ordinary English — in JSX TEXT or in a comment —
 * was treated as a string delimiter. One unmatched apostrophe opens a phantom string that swallows
 * every brace, every `>` and every `//` until the next apostrophe, and whatever the scanner was
 * computing below that point silently becomes a function of apostrophe parity.
 *
 * 🔴 IT WAS LIVE IN ONE COPY AND LATENT IN THE OTHER TWO, WHICH IS THE WORST DISTRIBUTION:
 *   · `family-arrival-check.js` `objects()` — LIVE. The JSX text `You've used your Deep Insight
 *     this month.` desynchronised the brace scan so that two real `fontFamily` sites resolved
 *     against ONE 6,040-character span holding three different steps and were silently skipped.
 *     Fixing it revealed FOUR more real pairings (113 -> 117 checked).
 *   · `primitive-adoption-check.js` `openingTag()` — latent. It finds the `>` that ends a JSX
 *     opening tag, and EVERY adoption count and text-node census is built on it.
 *   · `primitive-adoption-check.js` `stripComments()` — latent, and the most dangerous of the
 *     three. It is what makes `O-54` / `O-68` direction 2's control work: the `literals` half reads
 *     each module with COMMENTS BLANKED so a presence assertion cannot be satisfied by the
 *     paragraph describing it. With an unbounded quote skip, one prose apostrophe copies a large
 *     region through VERBATIM — including every `//` inside it — so those comments are never
 *     blanked and a presence assertion becomes satisfiable by prose again.
 *
 * 🟢 THE FIX IS ONE LINE OF THOUGHT: **a single- or double-quoted JS literal in this tree never
 *    spans a newline, and a prose apostrophe never closes on its own line.** So look ahead for the
 *    closing quote BEFORE the next newline; if it is not there, the quote is prose and is not a
 *    delimiter. Template literals DO span lines and keep the unbounded scan.
 *
 * 🔴 AND THE REASON IT IS A MODULE RATHER THAN A FOURTH PASTE: the bug existed in three places
 *    BECAUSE the idiom was copied three times. This project's own standing line is that a fix
 *    applied to one control is not a fix. A fourth copy would be indefensible.
 *
 * No dependencies. Every function is pure and length-preserving where it says so.
 */

const BS = '\\';

/**
 * If `src[i]` opens a quoted region, return the index just past its close; otherwise -1.
 *
 * 🔴 THE ASYMMETRY IS THE WHOLE POINT AND MUST NOT BE "TIDIED": a backtick scans unbounded because
 *    a template literal may legally span lines. A `'` or `"` must close on its OWN LINE or it was
 *    never a string — that is what makes prose apostrophes harmless.
 */
function skipQuoted(src, i) {
  const c = src[i];
  if (c === '`') {
    let j = i + 1;
    while (j < src.length && !(src[j] === '`' && src[j - 1] !== BS)) j++;
    return j + 1;
  }
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < src.length && src[j] !== '\n' && !(src[j] === c && src[j - 1] !== BS)) j++;
    return j < src.length && src[j] === c ? j + 1 : -1;      // -1 = prose, not a delimiter
  }
  return -1;
}

/** True when `src[i]` starts a `//` or a block comment. */
function commentEnd(src, i) {
  if (src[i] !== '/') return -1;
  if (src[i + 1] === '/') { const n = src.indexOf('\n', i); return n < 0 ? src.length : n; }
  if (src[i + 1] === '*') { const n = src.indexOf('*/', i); return n < 0 ? src.length : n + 2; }
  return -1;
}

/**
 * Blank every comment, preserving LENGTH and NEWLINES so byte offsets and line numbers still line
 * up with the original. Strings are preserved verbatim, so a comment marker inside a real string
 * literal is not mistaken for a comment.
 */
function stripComments(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const ce = commentEnd(src, i);
    if (ce >= 0) { out += src.slice(i, ce).replace(/[^\n]/g, ' '); i = ce; continue; }
    const qe = skipQuoted(src, i);
    if (qe >= 0) { out += src.slice(i, qe); i = qe; continue; }
    out += src[i]; i++;
  }
  return out;
}

/**
 * The exact COMPLEMENT of `stripComments`: comment bodies kept, every other character blanked.
 * Also length- and newline-preserving.
 *
 * WHY A SECOND PROJECTION EXISTS: it lets a caller assert that its two views of a file are TOTAL.
 * The two functions keep exactly what the other blanks, so for any pattern P:
 *
 *     count(P, stripComments(s)) + count(P, commentsOnly(s)) === count(P, s)
 *
 * ...and a break in that identity means the pattern STRADDLES a comment boundary, or an offset
 * drifted. Both are real, both are worth blocking on, and the fix is the pattern — never the count.
 *
 * 🔴 BUT READ WHAT IT DOES *NOT* PROVE, BECAUSE THE FIRST DRAFT OF THIS PARAGRAPH CLAIMED IT AND A
 *    DEFECT INJECTION REFUTED IT. It is NOT an `O-91` detector. Both functions walk with the SAME
 *    logic, so they stay complements of each other even when that logic is WRONG: injecting the
 *    original O-91 bug — the unbounded quote skip, where one prose apostrophe swallows a region —
 *    left the sum intact, because the swallowed span was kept by one projection and blanked by the
 *    other exactly as a correct span would be. **The identity asserts the partition is TOTAL. It
 *    says nothing about whether the partition is in the RIGHT PLACES.**
 *
 * 🟢 THAT SECOND PROPERTY NEEDS A KNOWN-ANSWER FIXTURE, and there is one: `walkerSelfTest()` below.
 *    It is called by `scripts/invariant-register-check.js` before that check reads a single file,
 *    and it BLOCKS. A number nobody can falsify is the shape this project keeps finding; the two
 *    assertions together are what make this walker's output usable, and neither alone is enough.
 */
function commentsOnly(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const ce = commentEnd(src, i);
    if (ce >= 0) { out += src.slice(i, ce); i = ce; continue; }
    const qe = skipQuoted(src, i);
    if (qe >= 0) { out += src.slice(i, qe).replace(/[^\n]/g, ' '); i = qe; continue; }
    out += src[i] === '\n' ? '\n' : ' '; i++;
  }
  return out;
}

/**
 * Every balanced `{...}` span in `src`, innermost-first-friendly (each pair pushed as it closes).
 * Comments and strings are skipped, so a brace inside either never opens or closes a span.
 */
function braceSpans(src) {
  const out = [], stack = [];
  let i = 0;
  while (i < src.length) {
    const ce = commentEnd(src, i);
    if (ce >= 0) { i = ce; continue; }
    const qe = skipQuoted(src, i);
    if (qe >= 0) { i = qe; continue; }
    if (src[i] === '{') stack.push(i);
    else if (src[i] === '}') { const s = stack.pop(); if (s !== undefined) out.push([s, i + 1]); }
    i++;
  }
  return out;
}

/**
 * 🔴 THE WALKER'S OWN KNOWN-ANSWER FIXTURE. Returns a list of failure strings; empty means healthy.
 *
 * It exists because the `code + comment == raw` identity CANNOT see a mis-placed boundary (see
 * `commentsOnly`'s header), and the one bug this module was extracted to fix is exactly that: an
 * unbounded quote skip, where one apostrophe in ordinary English opens a phantom string and
 * swallows every brace, every `>` and every `//` until the next apostrophe.
 *
 * 🔴 LINE 2 OF THE FIXTURE IS THE ORIGINAL DEFECT, VERBATIM IN SHAPE — a JSX sentence with a prose
 *    apostrophe and no closing quote on its line, followed by a comment. Under the bug the comment
 *    is treated as string content, so `stripComments` KEEPS it, and assertion 1 fails. Line 3 is the
 *    opposite direction and is why the fix cannot simply be "never treat `'` as a delimiter": a real
 *    string that legitimately contains `//` must stay code, or a comment marker inside a string
 *    becomes a comment.
 *
 * ⚠️ CALLED BY A GATE AND BLOCKING. Keep it dependency-free and keep it cheap.
 */
function walkerSelfTest() {
  const lines = [
    'const a = 1;                       // C1',
    "<Text>You've used your Deep Insight</Text>   // C2",
    "const s = 'a // not a comment';    // C3",
    '/* C4 */ const b = 2;',
  ];
  const src = lines.join('\n');
  const code = stripComments(src);
  const note = commentsOnly(src);
  const bad = [];
  // 1 · a comment must never survive into the CODE view. This is the direction that silently opens
  //     a presence assertion, so it is listed first.
  for (const c of ['C1', 'C2', 'C3', 'C4'])
    if (code.includes(c)) bad.push(`comment ${c} survived into the CODE view`);
  // 2 · every comment must be reachable in the COMMENT view, or the complement is not a complement.
  for (const c of ['C1', 'C2', 'C3', 'C4'])
    if (!note.includes(c)) bad.push(`comment ${c} is missing from the COMMENT view`);
  // 3 · code must never leak into the comment view — including a string that contains a comment
  //     marker, which must stay code.
  for (const k of ['const a', "You've", 'not a comment', 'const b'])
    if (note.includes(k)) bad.push(`code \`${k}\` leaked into the COMMENT view`);
  // 4 · both projections are length- and newline-preserving, which is what keeps reported line
  //     numbers accurate.
  if (code.length !== src.length) bad.push('the CODE view changed length');
  if (note.length !== src.length) bad.push('the COMMENT view changed length');
  if (code.split('\n').length !== lines.length) bad.push('the CODE view lost a newline');
  if (note.split('\n').length !== lines.length) bad.push('the COMMENT view lost a newline');
  return bad;
}

module.exports = { skipQuoted, commentEnd, stripComments, commentsOnly, braceSpans, walkerSelfTest };
