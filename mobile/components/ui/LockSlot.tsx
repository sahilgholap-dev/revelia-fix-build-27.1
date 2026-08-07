import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as t from '@/theme';

/**
 * The gated-card lock affordance — 🔴 AND IT IS THE FIX FOR TWO DEFECTS AT ONCE, ONE OF THEM R1.
 *
 * ── WHAT IT REPLACES ───────────────────────────────────────────────────────────────────────
 *
 * Absolutely-positioned pills, top-right, rendering the literal tier names as user-facing copy and
 * OVERLAPPING the card titles on device.
 *
 * 🔴 THE R1 HALF IS THE SERIOUS ONE. Those strings were CLIENT-SIDE literals selected by a
 *    CLIENT-SIDE tier read, which is the exact class `P53` records as already retired from four other
 *    surfaces: *"a client-selected tier name in user-facing copy is an R1 violation — the tier badge
 *    (Premium / Premium Plus)."* The server owns entitlement; the client is a renderer. So the
 *    correct treatment is NOT a smaller pill, it is **no tier name at all** — which is also the
 *    pattern the readings hub ALREADY established for the Q&A row, deliberately, and Home's Explore
 *    rows for the same destinations. A lock icon says *what* without claiming *which*.
 *
 * 🔴 THE LAYOUT HALF IS FIXED BY LAYOUT, NOT BY SHRINKING ANYTHING. The slot is a real child of the
 *    title row, so the title block's `flex-1` shrinks around it and wraps. **No title length can
 *    collide with it**, at any font scale — which is the property an absolute pill could never have,
 *    and the reason the overlap was a matter of luck rather than of size.
 *
 * ── 🔴 WHY IT IS A FILE NOW, AND IT IS THE SWEEP THAT WAS OWED ─────────────────────────────
 *
 * It was written as a LOCAL function inside the readings hub, for the three cards in that file, and
 * the numerology hub's Name Destiny tile — **the same destination, gated on the same entitlement** —
 * kept the tier-badge treatment for another two sessions. 🔴 **THE FINDING IS NOT THAT ONE CARD WAS
 * MISSED; IT IS THAT NOTHING COULD HAVE FOUND IT.** Contrast was correct on both, so `A5` and `A6`
 * passed; the badge was a well-formed on-fill pairing. **The gates enforce CONTRAST, not DESIGN
 * INTENT**, and a local helper is invisible to an adoption count by construction.
 * 🟢 So the second adopter arrives as an IMPORT rather than as a copy, and
 * `primitive-adoption-check.js` now carries the site list — which is the only instrument that can see
 * a THIRD gated card being hand-rolled next to these two.
 *
 * ── TWO CHOICES WORTH DEFENDING ────────────────────────────────────────────────────────────
 *
 * ⚠️ THE ICON IS HIDDEN FROM ASSISTIVE TECH, and that is not a shortcut around the CUT a11y label
 *    sweep (`P78`). A bare Ionicon announces nothing useful either way, and the locked state is
 *    ALREADY carried in text by the card's own CTA — which reads the shipped, PM-ruled, tier-neutral
 *    string on every adopter. Marking it decorative matches the icon wells in those files exactly;
 *    inventing a label here would be starting the cut sweep in one component.
 * ⚠️ THE MUTED ROLE, NOT THE ACCENT: §2 row 8 is labels · meta · **locked-row subtitle**, and this is
 *    a STATE indicator rather than an action. The accent on these cards belongs to the CTA and the
 *    category icon (§2 row 13), and a third accent in one card is the treatment this class removes.
 *
 * ⚠️ IT IS NOT `LockShell`, AND THE TWO MUST NOT MERGE. `LockShell`'s three densities each GROUND
 *    something — they own a box, a plate and a CTA. This owns 20dp beside a title that is already
 *    there. §9 row 13's own words for density 3 are "reusing the same 28dp plate slot"; a marker
 *    that reserved a plate slot would reflow every card it sits in.
 */
export function LockSlot() {
  return (
    <View className="ml-3" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Ionicons name="lock-closed" size={20} color={t.color['fg-muted']} />
    </View>
  );
}

export default LockSlot;
