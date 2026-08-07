import React from 'react';
import { View, Text } from 'react-native';

/**
 * EntertainmentDisclaimer — §9 item 6. 7 screens, 7 call sites.
 *
 * 🔴 X8: PRESENCE AND THE STRING ARE HARD; THE CONTAINER IS SOFT. This is a compliance surface,
 *    so this item restyles the container and does not touch a single character of copy.
 *
 * ── 🔴 WHAT THIS ITEM ACTUALLY FIXED, AND IT WAS NOT A STYLE PREFERENCE ──────────────────────
 *
 * A LEGAL NOTICE WAS RENDERING BELOW AA. This node carried the placeholder role, which design
 * §2 row 9 contracts to the `Input` placeholder ALONE because it is the one sub-AA foreground in
 * the palette — 3.30:1 here. design §2 row 8 names `disclaimer` in the muted role's own list, at
 * 5.36:1, and design §4.2's stated requirement for this surface is the phrase "not 8pt grey".
 *
 * 🔴 AND THE SAME DEFECT WAS LIVE IN THREE MORE PLACES, WHICH IS THE POINT: six disclaimer
 *    strings ship across this app (audit §6.2) and only TWO of the six were on the right role.
 *    Nobody could see that, because the divergence is per-file and every gate passes on all of
 *    them — the token name is legal, it is not `white`, there is no hex, no weight, no numeric
 *    size, and a type checker cannot have an opinion about a colour role. The census in
 *    `primitive-adoption-check.js` is the instrument that made it countable.
 *
 * ⚠️ THE SIX STRINGS ARE NOT CONSOLIDATED AND MUST NOT BE. Audit §9 Q3 asks the owner whether
 *    they should be, and it is UNANSWERED: consolidating a compliance string is a legal call, not
 *    a design one. So this component keeps ONE hardcoded string and takes NO props — a `text`
 *    prop here would be a zero-call-site option today and an invitation to answer Q3 by accident.
 *
 * ── THE CONTAINER, per design §9 row 6, which specifies it completely ────────────────────────
 *
 * The 13/19 step · the muted role · a subtle top rule · `pt-4` · 🔴 LEFT-ALIGNED, NOT CENTRED.
 * No height is pinned and the string is never shortened, so the one layout absorbs all six
 * lengths (28 to 196 characters) without a "read more" control — that property is what makes the
 * container safe to restyle at all.
 *
 * 🔴 NO BOTTOM PADDING, AND THAT IS MEASURED RATHER THAN ASSUMED. This is the last child of the
 *    ScrollView on all seven screens, and all seven pass `paddingBottom: bottomPad` from
 *    `useBottomInsetPadding`. The design's "above bottomPad" is literally true at every mount.
 *
 * ⚠️ `px-6` IS THE COMPONENT'S OWN 24 AND STAYS THE STEP-6 TOKEN, not the screen gutter — that
 *    is `C-P3a-1`'s ruling, and the two names hold the same number for different reasons.
 *
 * ── 🔴 THE ACCESSIBILITY CONTRACT IS AN INVARIANT IN BOTH DIRECTIONS ────────────────────────
 *
 * `accessibilityRole="text"` must be PRESENT (it was absent until this item), and the Android
 * property that hides a subtree from the accessibility tree must be ABSENT, forever. A screen
 * reader has to reach a legal notice. Both halves are asserted mechanically, because "we removed
 * it once" is not a guard — hiding this node is a compliance regression that renders identically.
 *
 * ⚠️ AND THAT SECOND PROPERTY IS DELIBERATELY NOT SPELLED IN THIS COMMENT. Writing it here made
 *    the gate's own absence rule fire on the paragraph describing it — instance 10 of "a comment
 *    is source", and the second time this particular rule has caught its own documentation. That
 *    is the rule working: it is text-level on purpose, so naming a forbidden thing anywhere in
 *    the file counts as the thing being present.
 *
 * It also opts back IN to font scaling. The step scales by contract, but a size class cannot
 * carry a prop (`C-P4-5`), so this notice was frozen at 13px for every user who enlarges text —
 * which is precisely the population a legibility requirement is written for.
 */
export function EntertainmentDisclaimer() {
  return (
    <View className="px-6 pt-4 border-t border-border-subtle">
      <Text
        accessibilityRole="text"
        allowFontScaling
        maxFontSizeMultiplier={1.3}
        className="text-fg-muted text-xs font-body"
      >
        Revelia readings are for entertainment and self-reflection purposes only. 
        They should not be used as a substitute for professional medical, financial, 
        legal, or psychological advice.
      </Text>
    </View>
  );
}

export default EntertainmentDisclaimer;
