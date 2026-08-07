import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/components/ui/Button';
/* Grepped for a local definition of this name in this file first (O-71/O-79) — none. */
import { Plate } from '@/components/ui/Plate';

/**
 * EmptyState — §9 item 8. 4 files, 4 call sites (design §9 row 8's "4" measured out unchanged).
 *
 * ── 🔴 ONE ACTION MAXIMUM, NEVER TWO — and it is enforced by the PROP SHAPE, not by review ───
 *
 * There is exactly one action pair and no slot for a second. An empty state offering two choices
 * is not an empty state, it is a decision screen: the surface exists because the user has nothing
 * yet, so there is one thing to do next. A second action would need a NEW PROP, which is visible in
 * a diff — whereas a second control slipped into a nested-content slot would not be. That is why
 * this component accepts no nested content, and why the gate asserts that no such prop exists.
 *
 * ⚠️ That sentence is worded around the prop's real name on purpose: the absence half of the gate is
 *    TEXT-LEVEL by design, so naming a forbidden declaration in prose reports it as present. Twelfth
 *    instance of "a comment is source", and the loud, safe direction of it.
 *
 * ── 🟢 THE TITLE TAKES THE DISPLAY STEP, AND THE COST IT USED TO CARRY IS NOW **PAID OFF** ──────
 *
 * design §9 row 8 specifies the small display step for the title and the small body step for the
 * description. 🔴 WHEN THE DISPLAY STEPS WERE FROZEN, THAT PAIRING COLLAPSED AT THE 1.3 CAP, and
 * item 8 measured it:
 *
 *                       title (WAS frozen)   body at 1.0      body at the 1.3 cap
 *      size                 20                  15                 19.5
 *      line height          26                  22                 28.6
 *
 * Half a pixel of size apart, with the body's LINE HEIGHT OVERTAKING THE TITLE'S by 2.6px — so for
 * any user who enlarged text, the description block was vertically LARGER than the heading above
 * it. It was reported as a RAMP finding (`O-58` / `P47`) rather than fixed here, because the
 * property was the ramp's: a FROZEN display step sits at roughly (a scaling body step x 1.3), and
 * design specifies that exact pairing FOUR times.
 *
 * 🟢 `P42` (owner ruling, 2026-08-03) UNFROZE THE THREE DISPLAY STEPS AT THE SAME 1.3 CAP, AND THAT
 *    CLOSES IT AT ALL FOUR PAIRINGS WITHOUT MOVING A SINGLE VALUE. Both sides now scale by the same
 *    multiplier, so every ratio in the ramp is scale-invariant: at the cap this title is 26/33.8
 *    against a body of 19.5/28.6, and the ordering holds at every setting rather than at one.
 *    🔴 THE RAMP NEEDED NO RE-TUNING — IT NEEDED THE FREEZE LIFTED. The freeze was an inherited
 *       principle (display type usually sits in a fixed-height container) and pass 5 had already
 *       measured that not one fixed-height container in this app holds a display step. The full
 *       argument and the two renderer measurements behind it live in theme.js beside the ramp.
 *    ⚠️ This paragraph is kept rather than deleted because the collapse is the evidence the ruling
 *       rests on. Do not re-derive "the display steps are frozen" from the figures above.
 * 🔴 AND THE WORD "figures" IS DOING WORK THERE — instances 18 AND 19 of "a comment is source",
 *    found by `--diff` and by nothing else. The two ordinary English nouns for a rectangular
 *    arrangement of numbers are BOTH live Tailwind display utilities, so the first spelling emitted
 *    a rule with zero call sites (200 -> 201) and the sentence written to explain THAT emitted a
 *    second one. Third time this session that explaining the hazard reintroduced it.
 * 🔴 IT ALSO FALSIFIES A STANDING NOTE, and the correction is measured rather than argued. The
 *    session handoff lists four words as ones that "do NOT resolve today", i.e. as safe. Probed
 *    against the live config by dropping a scratch file into a content glob and diffing the
 *    resolved set: ALL FOUR resolve the moment they are written, and so do the two nouns above.
 *    Only the value-taking families are genuinely inert bare. 🔴 A WORD'S ABSENCE FROM THE RESOLVED
 *    SET IS NOT EVIDENCE THAT WRITING IT IS SAFE — it is the precondition for writing it being
 *    unsafe. The probe is the derivation, and it takes about ten seconds; guessing failed twice.
 *
 * ── WHAT WAS ACTUALLY BROKEN, AND NO GATE COULD SEE IT ───────────────────────────────────────
 *
 * The description carried a colour and an alignment AND NO SIZE AT ALL, so it rendered at the
 * platform's own default of 14 — a value that is not on the ramp, sitting between the 13 and 15
 * steps.
 * 🔴 Every type rule in this tree searches for a size that is WRONG. None of them can see a size
 *    that is ABSENT, because the platform supplies it after the last grep has run. It is
 *    codemod-plan §3.0.2 class 5 in its purest form: the property the rule keys on is not where the
 *    value lives — it is nowhere in the file at all. Now the small body step, and it scales.
 *
 * ── THE TWO THINGS THIS ITEM DELIBERATELY DOES NOT BUILD ─────────────────────────────────────
 *
 * 🟢 **BOTH LANDED AT THE FUNNEL PHASE'S MOUNT SWEEP — see the render below.** The section that
 * follows is kept as the record of why they waited and what one of its predictions got wrong.
 *
 * design §9 row 8 also gives this surface a 56dp plate and top padding in place of centring. Those
 * are ONE decision and it belonged to item 18, where the plates are authored: the padding only means
 * anything once something sits above the title, and §14.5 lists section-level empty states as a
 * place a plate MAY appear. Inventing a plate here to justify the padding is what §0.0 rule 2
 * forbids. ⚠️ Item 18's descope then left this unpaid — it mounted ONE plate in the whole app — so
 * the debtor named here retired without paying, which is why R-1 reversed that descope.
 * 🔴 AND ONE PREDICTION IN THIS PARAGRAPH WAS WRONG, WHICH IS WORTH KEEPING BECAUSE IT WAS WRONG IN
 *    THE CAUTIOUS DIRECTION: it said this plate "would ground on the lock token, whose census names
 *    item 13 as its owner", so whichever landed first would flip that counter. Measured at the
 *    mount: it does not. The §14 plate takes a `tint` PROP defaulting to the meta role, while the
 *    LOCK plate is a different component with a different ground — the two were only ever the same
 *    word. That census is unchanged at exactly 1, before and after.
 *
 * The pictograph slot is what the plate REPLACES — §9 row 8's own word — so the prop that carried it
 * is gone rather than defaulted, and its marked above-ceiling size goes with it. It was hidden from
 * the accessibility tree on BOTH platforms, because neither property covers the other, and its
 * successor inherits that from the plate component itself rather than from a per-site prop.
 */
interface EmptyStateProps {
  title: string;
  description: string;
  /** 🔴 ONE action pair, and there is deliberately no second. See the header. */
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionTitle, onAction }: EmptyStateProps) {
  return (
    /* 🔴 THE PLATE, AND THE TOP PADDING, AND THEY ARE ONE DECISION — item 8 said so and named item
       18 as the debtor; item 18's descope left it unpaid, so the funnel phase's mount sweep is where
       it lands. design §9 row 8 gives this surface a plate at 56 and TOP PADDING IN PLACE OF
       CENTRING, and §14.3.2 names WHICH plate by naming this surface in its own heading. The padding
       only makes sense once something occupies the upper area, which is why the two could not ship
       apart.
       🔴 AND THE PLATE REPLACES THE PICTOGRAPH RATHER THAN JOINING IT — §9 row 8's words. So the
       `icon` prop is GONE, not defaulted: a prop nothing passes is the zero-call-site defect this
       programme has ruled on four times, and leaving it would let a future site re-add an emoji to a
       surface §9.2 bans them from. Its four call sites each passed a different pictograph; the title
       and the sentence below it carry that differentiation now, which is §10.1.3's argument (position
       and words give stable identity; a glyph at one size does not).
       🟢 Retires the last marked pictograph className in the tree: `no-offramp-fontsize-class`'s
       marked-GLYPH sub-count goes 1 -> 0 and its total falls with it.
       ⚠️ ONE PLATE PER VIEWPORT (§14.5) IS SAFE HERE BY CONSTRUCTION: this component fills the
       screen, and the one screen that mounts a plate elsewhere AND uses this component renders them
       in mutually exclusive branches (the readings hub returns this early). */
    <View className="flex-1 bg-bg items-center px-6 pt-12">
      <View className="mb-4">
        <Plate name="constellation" width={56} />
      </View>
      {/* design §9 row 8: the title and the body READ AS ONE NODE. A screen reader that stops on
          the heading and then again on the sentence explaining it makes the user assemble a
          two-part message that was always one. */}
      <View accessible accessibilityRole="text">
        <Text className="text-fg text-display-sm font-display text-center mb-2">{title}</Text>
        <Text
          allowFontScaling
          maxFontSizeMultiplier={1.3}
          className="text-fg-muted text-sm font-body text-center"
        >
          {description}
        </Text>
      </View>
      {actionTitle && onAction && (
        <View className="mt-6">
          <Button title={actionTitle} onPress={onAction} variant="primary" />
        </View>
      )}
    </View>
  );
}

export default EmptyState;
