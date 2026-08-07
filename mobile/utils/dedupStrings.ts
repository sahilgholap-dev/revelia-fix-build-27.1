/**
 * Deduplicate a list of human-readable strings (strengths, traits, etc.)
 * Combining face/palm/chart/numerology source readings often surfaces the
 * same underlying trait expressed slightly differently — this helper
 * collapses near-duplicates while preserving the first occurrence's
 * original casing.
 *
 * Process:
 *   1. Drop falsy / empty values
 *   2. Trim whitespace
 *   3. Exact-match dedup on normalized form (lowercase, punctuation stripped)
 *   4. Pairwise Jaccard-similarity dedup on significant word sets
 *      (stop words excluded from the comparison)
 *   5. Cap at maxLength
 */

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'the',
  'of',
  'in',
  'into',
  'for',
  'to',
  'with',
  'by',
  'on',
  'at',
  'is',
  'are',
  'be',
  'as',
  'or',
  'ability',
  'abilities',
  'capacity',
  'sense',
  'strong',
  'great',
  'good',
]);

interface DedupOptions {
  caseInsensitive?: boolean;
  similarityThreshold?: number; // 0..1, default 0.6
  maxLength?: number; // default 8
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function significantWords(s: string): string[] {
  return normalize(s)
    .split(' ')
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

/**
 * Two significant words are considered the "same root" if their longest
 * common prefix is at least 5 characters. Catches morphological variants
 * that share a stem but diverge at a suffix:
 *   creative (8) ↔ creativity (10)  → LCP "creativ" (7) → match
 *   leader (6) ↔ leadership (10)    → LCP "leader" (6) → match
 *   decisive ↔ decisiveness         → LCP "decisive" (8) → match
 *   communication ↔ communicating   → LCP "communicat" (10) → match
 *   curiosity ↔ creativity          → LCP "c" (1) → no match
 */
function wordsSameRoot(a: string, b: string): boolean {
  if (a === b) return true;
  const minLen = Math.min(a.length, b.length);
  let i = 0;
  while (i < minLen && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  return i >= 5;
}

/**
 * Compute fuzzy intersection size — two words count as overlapping if they
 * share a 4+ character prefix (catches morphological variants).
 */
function fuzzyIntersectionSize(a: string[], b: string[]): number {
  const matchedB = new Set<number>();
  let count = 0;
  for (const wa of a) {
    for (let i = 0; i < b.length; i++) {
      if (matchedB.has(i)) continue;
      if (wordsSameRoot(wa, b[i])) {
        count++;
        matchedB.add(i);
        break;
      }
    }
  }
  return count;
}

/**
 * Two phrases are considered duplicates when EITHER:
 *   (a) The shorter word-set is fully contained in the longer (asymmetric
 *       containment) — catches "Creativity" vs "Creative thinking".
 *   (b) Symmetric Jaccard similarity exceeds the threshold — catches
 *       phrases that share most words but differ in incidentals.
 */
function isDuplicatePhrase(
  a: string[],
  b: string[],
  threshold: number
): boolean {
  if (a.length === 0 && b.length === 0) return true;
  if (a.length === 0 || b.length === 0) return false;
  const inter = fuzzyIntersectionSize(a, b);
  const minLen = Math.min(a.length, b.length);
  // Containment: shorter set is fully a subset of longer.
  if (inter === minLen) return true;
  // Jaccard: union-based similarity.
  const union = a.length + b.length - inter;
  return union > 0 && inter / union >= threshold;
}

export function dedupStrings(items: string[], options: DedupOptions = {}): string[] {
  const { similarityThreshold = 0.6, maxLength = 8 } = options;

  // Step 1+2: filter falsy + trim
  const cleaned = items
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Step 3: exact-match dedup on normalized form, keep first occurrence
  const seenNormalized = new Set<string>();
  const exactDeduped: string[] = [];
  for (const item of cleaned) {
    const norm = normalize(item);
    if (norm.length === 0) continue;
    if (seenNormalized.has(norm)) continue;
    seenNormalized.add(norm);
    exactDeduped.push(item);
  }

  // Step 4: pairwise similarity dedup. Drop the second occurrence when
  // fuzzy-Jaccard or asymmetric containment flags it as a duplicate.
  const result: string[] = [];
  const wordLists: string[][] = [];
  for (const item of exactDeduped) {
    const itemWords = significantWords(item);
    let isDuplicate = false;
    for (const existingWords of wordLists) {
      if (isDuplicatePhrase(itemWords, existingWords, similarityThreshold)) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      result.push(item);
      wordLists.push(itemWords);
    }
    if (result.length >= maxLength) break;
  }

  return result;
}
