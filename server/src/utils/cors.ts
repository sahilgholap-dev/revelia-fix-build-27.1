/**
 * CORS origin resolution.
 *
 * 🔴 WHY THIS IS A MODULE AND NOT FOUR LINES IN app.ts. app.ts runs its whole
 * setup at import — helmet, rate limiting, routes — so nothing can import it to
 * check one function. This logic decides whether a first-party app can talk to
 * the API at all, and its failure mode is invisible from the server side: a
 * blocked request looks exactly like one that was never made. It needs to be
 * callable by a check, so it lives where a check can reach it.
 */

/**
 * Extra origins supplied by the `CORS_ORIGIN` environment variable.
 *
 * Comma-separated. Additive only — see `resolveProductionCorsOrigins`.
 *
 * @param raw the raw variable, passed in so this is a pure function
 * @param warn called for input that is accepted-but-wrong, so it is never silent
 */
export function extraOriginsFromEnv(
  raw: string | undefined,
  warn: (message: string) => void = () => {}
): string[] {
  if (!raw) return [];

  const out: string[] = [];
  for (const part of raw.split(',')) {
    // A trailing slash is the classic way to write an origin that never
    // matches: the browser sends an origin with no path, so "https://x.me/" is
    // not "https://x.me". Strip it rather than let it fail silently.
    const value = part.trim().replace(/\/+$/, '');
    if (!value) continue;

    // '*' is meaningless inside an allow-list array — the cors package compares
    // the request origin against each entry, so it would sit there matching
    // nothing while looking like it had opened everything.
    if (value === '*') {
      warn('CORS_ORIGIN contains "*", which is ignored in production. List origins explicitly.');
      continue;
    }

    out.push(value);
  }
  // Deduplicated here as well as in the resolver, so this function is safe to
  // use on its own — a caller should not have to know that the dedupe happens
  // one layer up.
  return [...new Set(out)];
}

/**
 * The production allow-list: the hardcoded floor, plus anything `CORS_ORIGIN`
 * adds, deduplicated.
 *
 * 🔴 ADDITIVE BY CONSTRUCTION. The variable can only EXTEND the list — it can
 * never narrow or replace it — so a typo in the Railway dashboard cannot lock
 * the first-party apps out of their own API.
 */
export function resolveProductionCorsOrigins(
  base: readonly string[],
  raw: string | undefined,
  warn: (message: string) => void = () => {}
): string[] {
  return [...new Set([...base, ...extraOriginsFromEnv(raw, warn)])];
}
