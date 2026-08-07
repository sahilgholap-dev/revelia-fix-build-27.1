import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LockShell } from './LockShell';
import * as t from '@/theme';

interface SectionCardProps {
  title: string;
  locked?: boolean;
  children: React.ReactNode;
}

/**
 * §9 item 4 — the section ground. EXTRACTED from FIVE inline definitions, 38 call sites.
 *
 * 🔴 FOUR OF THE FIVE WERE BYTE-IDENTICAL AND THEY HAD ALREADY DRIFTED. That is the whole
 *    argument for this file, and it is not a tidiness argument — see the A5 note below.
 *    The fifth, `readings/combined.tsx`, is A DIFFERENT COMPONENT WEARING THE SAME NAME
 *    ({title, icon, children}, no lock branch, a different header rule). It is renamed at
 *    its own site rather than forced into this shape (§3.3 M-2), because leaving the name
 *    collision in place would make the adoption gate — which keys on the JSX ELEMENT NAME —
 *    permanently unable to tell an adopter from a look-alike.
 *
 * ── 🔴 THE A5 DEFECT THIS EXTRACTION FIXES, AND WHY NOTHING COULD HAVE FOUND IT ──────────
 *
 * The unlock CTA is an `accent` FILL. Its only legal foreground is the on-accent role
 * (CLAUDE.md; design §2.2) — the plain foreground on that fill is about 2.1:1 and fails AA
 * at every size. MEASURED 2026-08-03, across the four copies that had a lock branch:
 *
 *     astrology/index      on-accent   ✅ fixed at some earlier pass
 *     compatibility/[id]   fg          🔴 and it is LIVE — 6 call sites pass the lock flag
 *     readings/face        fg          🔴 unreachable today (no call site passes the flag)
 *     readings/palm        fg          🔴 unreachable today (same)
 *
 * 🔴 SO EXACTLY ONE COPY WAS FIXED AND THE FIX DID NOT PROPAGATE — which is the failure mode
 *    duplication produces and the reason a fix applied to a copy is not a fix.
 * 🔴 AND THIS IS THE PAIR `no-white-on-accent` DOCUMENTS ITSELF AS STRUCTURALLY UNABLE TO SEE:
 *    the fill is on one style rule and the label is on another, four properties apart, joined
 *    only at a JSX call site. No proximity window of any size pairs them. That rule is
 *    permanently REPORT-ONLY for precisely this reason, and CLAUDE.md's prose is the control.
 *    Deriving the pairing HERE, once, is what actually closes it.
 *
 * ── ✅ THE LOCK BRANCH WAS A SEAM AND ITEM 13 HAS TAKEN IT ────────────────────────────────
 *
 * §3.1's sequencing bound 4 BEFORE 13 so the lock branch would not be written twice. It is
 * now ONE LINE: the locked state IS a LockShell density 2, so this component delegates
 * rather than nesting.
 * 🔴 AND THE REASON IT DELEGATES INSTEAD OF WRAPPING IS A MEASUREMENT: the box below and
 *    LockShell d2's box are the same box — same ground, same corner, same padding, same
 *    margins — because `LockedSection` and these five copies had independently converged on
 *    it. Nesting would double the box and break §4's share-the-box invariant, so the locked
 *    branch returns the shell INSTEAD OF the card. Retired with it: the duplicated lock panel,
 *    the lock copy that named a TIER (an R1 violation and a fifth C-5 literal), the second
 *    unlock control, and this file's ad-hoc paywall navigation.
 * ⚠️ THE HEADER'S PADLOCK GOES TOO, and it is not lost: it becomes the shell's 28dp PLATE,
 *    which is the slot d3 depends on for a locked row to match an unlocked one.
 *
 * ── ⬜ WHAT IS DESIGNED AND IS DELIBERATELY NOT HERE, each with a named owner (§8.2) ──────
 *
 *  · the eyebrow kicker — design §9 row 4 lists one; NO call site has one and the data
 *    carries none. Shipping the prop now adds a second zero-call-site option, which is the
 *    dead-variant shape item 3 deleted one instance of on the same day. Screens phase.
 *  · collapsed / expanded — no call site collapses. The disclosure glyphs are §9.2's
 *    Ionicons pair and `C-P4-3` owns that conversion. Screens phase.
 *  · empty / error — no call site has either state.
 *  · 🔴 THE TITLE STEP — 🟢 THE OBJECTION IS GONE, AND THE CHANGE IS STILL NOT TAKEN HERE.
 *    Design §9 row 4 specifies the small display step, which would put Literata on 29 section
 *    titles and is the most visible single change available in this file. It was declined on an
 *    a11y measurement, not on taste: the display steps were FROZEN while the title being replaced
 *    carried an explicit scaling opt-in, so adopting the step would have SUBTRACTED sites from the
 *    partial dynamic-type coverage §0.0 rule 5 keeps. 🟢 `P42` (owner ruling, 2026-08-03) UNFROZE
 *    the display steps at the same 1.3 cap, so that trade no longer exists and the objection is
 *    withdrawn.
 *    ⚠️ IT IS STILL NOT TAKEN, on a DIFFERENT and much smaller ground: what remains is an ordinary
 *       visual decision about 29 shipped titles, with no invariant and no a11y cost attached. That
 *       belongs to the screens phase or a designer, and §0.0 rule 1's smaller-change default
 *       applies. 🔴 Do not re-derive the OLD reason from this paragraph — it is retired.
 */
export function SectionCard({ title, locked, children }: SectionCardProps) {
  if (locked) return <LockShell density={2} title={title} />;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        {/* role=header is design §9 row 4's a11y column, on the component so no call site can
            forget it. NOT §0.0 rule 5's descoped per-site label sweep — that stays cut. */}
        <Text
          accessibilityRole="header"
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          style={styles.sectionTitle}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: t.color['surface-raised'],
    // 🔴 O-40: a SectionCard is the lg step 20 BY ROLE. §4.4's `use` column names it beside
    //    Card and the lock plate, and the competing value-driven column that sent it to 14 was
    //    DELETED in item 3's commit (C-P3b-1). All five copies were at 14; this is the change.
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.color['border-subtle'],
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: t.type['text-lg'].size,
    lineHeight: t.type['text-lg'].lineHeight,
    letterSpacing: t.type['text-lg'].letterSpacing,
    fontFamily: t.family['body-semi'],
    color: t.color.fg,
  },
  // 🔴 THE FOUR LOCK RULES ARE GONE AND THE A5 ASSERTION MOVED WITH THEM, IT WAS NOT DROPPED.
  //    Item 4 pinned the on-fill pairing here because this file had become the only site that
  //    derived it. Item 13's shell renders the CTA through the Button primitive, which derives
  //    the pairing once for all 54 of its call sites — so the assertion now lives on THAT
  //    module, in the same commit that deleted it from this one. An invariant that changes
  //    owner must change owner in one edit; a gap of even one commit is how one gets lost.
});

export default SectionCard;
