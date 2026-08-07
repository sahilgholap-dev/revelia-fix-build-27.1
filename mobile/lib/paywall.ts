import { router } from 'expo-router';

/**
 * §9 item 17 — openPaywall(source). ONE ENTRY POINT TO THE PAYWALL, and a named origin.
 *
 * ── 🔴 THE SCOPE CLAIM HAS NOW BEEN WRONG THREE TIMES, IN THE SAME DIRECTION ──────────────────
 *
 * ⚠️ THE NEXT SENTENCE PARAPHRASES THE OLD CALL SHAPE INSTEAD OF QUOTING IT, AND THAT IS INSTANCE
 *    17 OF "A COMMENT IS SOURCE" — pre-empted rather than caught, for once. The gate rule this
 *    commit adds asserts that shape is absent tree-wide, and it reads raw source; quoting the
 *    design's own sentence verbatim would have made this file the sole violator of the rule it
 *    exists to satisfy. 🟢 AND NOTE WHAT THE PARAPHRASE BUYS: the rule then needs NO EXCLUSION for
 *    this module, because the real calls below pass a named constant rather than a literal route.
 *    An exclusion is a hole; not needing one is strictly better.
 *
 * design §9.1 says an ad-hoc navigation to the paywall route group sits at ">=8 origins" and lists
 * nine. `O-41`
 * measured 22 call sites in 16 files. Item 4 collapsed four of them into the extracted section
 * card, putting the estimate at 19. Item 13 collapsed six more — the two the retired lock
 * component owned, the section card's, weekly's self-gate, and the two the destiny screens would
 * otherwise have needed. MEASURED AT THIS COMMIT: 15 sites in 10 files, plus 2 in a hook nothing
 * imports, which this commit deletes.
 * 🟢 THAT IS THE ARGUMENT FOR §3.1's "17 BEFORE OR WITH 4" SEQUENCING PAYING OFF TWICE: threading
 *    a source through code that is about to be deleted is work that deletes itself, and the count
 *    only stops moving once the components that owned those origins exist.
 *
 * ── 🔴 WHY A HELPER AT ALL, GIVEN IT WRAPS ONE LINE ───────────────────────────────────────────
 *
 * Not to save the line. Three things a bare push cannot have:
 *
 *  1. **A NAMED ORIGIN.** There is no analytics in this app (§9.2), so the highest-value signal
 *     on the highest-revenue surface is currently unobtainable: WHICH surface sent a user to the
 *     paywall. The union below is the seam. 🔴 It is deliberately a UNION and not a string: a free
 *     string would drift into fifteen spellings of four things, which is the same failure the
 *     token system exists to prevent one layer up. Adding the sink is one edit inside this file.
 *  2. **ONE ROUTE SPELLING.** The 15 sites carried FOUR different ones — `'/(paywall)/'`,
 *     `'/(paywall)'`, each with and without `as any`. A route group typed `as any` at fifteen
 *     sites is fifteen chances for a typo that only fails at runtime, on the surface where a
 *     failure costs a subscription.
 *  3. 🔴 **THE ONE `replace`.** `O-41` flagged it and it is the reason a push-only helper is
 *     WORSE than no helper: `readings/combined.tsx`'s early-return lock REPLACES rather than
 *     pushes, so a helper that only wraps push either misses it — leaving exactly the ad-hoc form
 *     the item exists to remove, at the one site nobody would look at again — or converts it and
 *     silently changes a lock screen's back stack. It is an option here, used once, named.
 *
 * ── ⚠️ WHAT THIS DELIBERATELY DOES NOT DO ─────────────────────────────────────────────────────
 *
 *  · 🔴 NO HAPTIC. Measured across the 15 sites: five fire one already (three at the light
 *    weight, one at the medium weight, one inside the chat composer), four inherit one from the
 *    Button primitive, and six fire none — two of those because they are alert actions and one
 *    because it runs in a mount effect. Adding one here would double-fire at nine sites and
 *    invent feedback at six; §0.0 rule 1 puts preserving behaviour above unifying it. The
 *    unification belongs to whatever decides what a paywall entry FEELS like, which is a design
 *    call nobody has made.
 *  · NO ENTITLEMENT CHECK. `hooks/usePaywall.ts` had one — `requirePremium(cb)` — and it is
 *    DELETED in this commit rather than kept beside this file. It had zero importers (measured;
 *    §11.3 corrected an earlier claim here, because the one file that did import it was itself
 *    invisible to three of four verification layers). 🔴 A SECOND UNUSED PAYWALL HELPER BESIDE A
 *    NEW ONE IS THE lib/colors.ts FAILURE MODE REBUILT FROM SCRATCH, which is §3.2's own wording.
 *    Every call site already branches on tier in its own terms — free vs premium vs premium_plus,
 *    a remaining-count, a server 403 — and a two-branch helper cannot express the third.
 *  · NO NAVIGATION STATE. It is not a hook and must not become one: it is called from alert
 *    actions and from a catch block, i.e. outside React's render tree, where a hook cannot go.
 */

/**
 * 🔴 ONE MEMBER PER ORIGIN, AND THE NAMES ARE SURFACES RATHER THAN TIERS. A source called
 *    'premium-plus' would answer the question the entitlement already answers and lose the one it
 *    cannot: where the user was standing.
 */
export type PaywallSource =
  // ── astrology ──
  | 'daily-continuity'            // the shift card's unlock, shown to non-plus viewers only
  | 'monthly-upgrade'             // the monthly reading's full-width upgrade control
  // ── compatibility ──
  | 'compat-type-locked'          // an alert on a non-love relationship type
  | 'compat-free-limit-cta'       // the control that replaces Start when the free reading is used
  | 'compat-free-limit-alert'     // the same limit, discovered server-side mid-generation
  // ── numerology ──
  | 'numerology-name-destiny'     // the hub's card for a plus-only feature
  // ── profile ──
  | 'profile-upgrade'             // a free user's subscription card
  | 'profile-change-plan'         // an entitled user changing plan
  // ── readings ──
  | 'readings-combined-profile'   // the hub's gate on the combined profile
  | 'readings-name-destiny'       // the hub's card, same destination as the numerology one
  | 'readings-career-destiny'     // the hub's card
  | 'combined-gate'               // 🔴 THE ONE `replace` — see the header
  | 'cosmic-report-upgrade'       // the report screen's upgrade control
  | 'qa-deep-insight'             // the chat's deep-insight lock and its two CTAs
  // ── the lock system (§9 item 13) ──
  // 🔴 THE DENSITY IS THE SOURCE, WHICH IS WHY LockShell's 36 CALL SITES NEEDED NO PROP. Finer
  //    attribution — which of the 25 sections — is one optional prop away and nothing consumes it
  //    yet, so adding it now would be a zero-call-site option (the standing rule).
  | 'lock-d1'
  | 'lock-d2';

interface OpenPaywallOptions {
  /**
   * 🔴 REPLACE INSTEAD OF PUSH — one call site, and it is `O-41`'s. `readings/combined.tsx` gates
   * on mount and must not leave a premium-only screen underneath the paywall for the back gesture
   * to return to. §4.1 lists that screen as a LockShell density-1 site and item 13's pre-flight
   * refuted it by measurement: the screen skips its whole data load for an unentitled user, so
   * there is nothing behind the veil and a full-screen lock would be a wall rather than a door.
   * So the replace stays, deliberately, and this is where it is expressed.
   */
  replace?: boolean;
}

/**
 * 🔴 THE SINK IS THE ONLY THING MISSING, AND ITS ABSENCE IS DELIBERATE RATHER THAN UNFINISHED.
 *    There is no analytics client in this app to send it to (§9.2 names review sentiment and the
 *    RevenueCat dashboard as the only instruments that exist), and adding one is a product and
 *    privacy decision, not a primitives-phase one. What this phase can do is make the origin
 *    KNOWN at the boundary, so wiring a sink later is one edit in one file instead of fifteen.
 * ⚠️ The dev breadcrumb is not the sink and must not be mistaken for one; it exists so the union
 *    is exercised rather than merely declared, and it costs nothing in a release build.
 */
function record(source: PaywallSource, replace: boolean) {
  if (__DEV__) {
    console.log(`[paywall] open source=${source}${replace ? ' replace' : ''}`);
  }
}

export function openPaywall(source: PaywallSource, options?: OpenPaywallOptions): void {
  const replace = options?.replace === true;
  record(source, replace);
  // 🔴 ONE ROUTE SPELLING, ONE CAST. The route group is not in the generated type graph, which is
  //    why every one of the 15 sites carried its own cast; there is now exactly one.
  const route = '/(paywall)/' as any;
  if (replace) router.replace(route);
  else router.push(route);
}

export default openPaywall;
