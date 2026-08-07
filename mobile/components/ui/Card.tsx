import React from 'react';
import { ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { staggerFor, useEntrance } from '@/lib/motion';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  /**
   * §5.4's CARD ENTRANCE — the item's position in its list, which is the only thing the stagger
   * needs. 🔴 **OMIT IT AND THE CARD DOES NOT ANIMATE AT ALL**, which is the design rather than a
   * default: a card inside a `ScreenContainer` already rises with the screen entrance, and a second
   * one at stagger 0 ADDS the two rise curves to **24dp — §5.3 rule 3's shape is a settle, not a
   * slide.** So the entrance is opt-in at the sites that are genuinely LISTS, where the stagger is
   * the point. ⚠️ The two now start together as well as adding: both wait out the same arrival
   * clearance, so a card at stagger 0 is exactly the screen's own rise, doubled.
   * ⚠️ Pass the map callback's index, not a hand-counted number: `staggerFor` caps at 5 itself.
   */
  index?: number;
}

/**
 * §9 item 3 — the card ground. 13 files, 43 call sites.
 *
 * 🔴 THE CORNER IS THE `lg` STEP 20 AND IT IS NORMATIVE, NOT ARITHMETIC.
 *    Owner ruling O-40 (2026-08-01): design §4.4 held two competing sources of truth and
 *    nothing said which won. Its `use` column is ROLE-driven ("a card is the 20 step"); its
 *    `absorbs` column was VALUE-driven ("a 16px corner lands near the 14 key"). A card at 14
 *    satisfies both columns with different answers — and it was O-40's THIRD and decisive
 *    collision, because the 12 panels nested inside a card had already been ruled one step
 *    tighter ON THE STATED PREMISE THAT THE CARD IS 20. At 14 the parent and every child sit
 *    at the identical corner. `use` is normative; `absorbs` is descriptive and is DELETED from
 *    §4.4 in this commit (C-P3b-1), because the primitives phase is exactly the reader it was
 *    kept intact for and exactly the reader it would mislead.
 *    🔴 A PANEL NESTED IN HERE TAKES THE 14 STEP, NEVER THIS ONE.
 *
 * 🔴 NO ELEVATION. Design §4.5 is zero-elevation system-wide: depth is carried by the surface
 *    ladder, never by a cast shadow. The elevation utility this component used to carry was the
 *    ONLY one in `app` + `components`, so removing it removes the resolved rule outright — a
 *    rule set that SHRINKS is as unreadable to every grep as one that grows, which is why the
 *    commit that did it recorded the vanishing rule by name.
 *    ⚠️ The single surviving elevation in the codebase is the paywall close button's, and it is
 *    X19: a STACKING fix, not depth. Never "clean it up" on the strength of this paragraph.
 *
 * ⬜ THREE OF THE FOUR DESIGNED STATES ARE NOT HERE, EACH WITH A NAMED OWNER — §8.2's residual
 *    histogram, which is satisfied by a reason per entry and never by a total:
 *      · pressable — the capability is trivial, but every one of the 43 call sites that needs
 *        it already hand-wraps this component in a touchable and works. Shipping the prop
 *        without migrating them adds a second idiom with zero call sites, which is the exact
 *        dead-variant shape this commit is DELETING one instance of (see below). It rides the
 *        screens phase, with the migration.
 *      · locked  — delegates to LockShell density 2, which is item 13.
 *      · loading — delegates to the loading system's skeleton density, which is item 12.
 *    Building either delegate's surface here means writing it twice (§3.1's "4 before 13").
 *
 * ⚠️ `border-subtle` is UNCONDITIONAL, while design §9 row 3 calls it "optional". Deliberate,
 *    and it is §0.0 rule 1: the design names no prop for it, no call site wants it off, and
 *    inventing one would add a second zero-call-site option to the file below. Registered as a
 *    gap rather than guessed at (§0.0 rule 2).
 */
export const Card: React.FC<CardProps> = ({
  children,
  className,
  style,
  index,
  ...props
}) => {
  /* 🔴 THE HOOK IS CALLED UNCONDITIONALLY AND GATED BY ITS OWN FLAG, because React forbids a
     conditional hook call. With no `index` it starts nothing and resolves its value to the final
     state, so a card that is not in a list renders byte-identically to how it did before this item —
     which is what keeps 43 call sites unchanged while three of them gain a stagger.
     ⚠️ THE HOOK NOW SUBSCRIBES TO THE SCREEN'S FOCUS EVENT, so this component requires a navigation
        context — which every one of the 43 call sites has, because all of them mount under a route.
        A `Card` rendered outside the router (an error fallback above the navigator, say) would be
        the one shape that breaks, and there is none today. */
  const entrance = useEntrance({ delay: staggerFor(index ?? 0), enabled: index !== undefined });
  // 🔴 THE SEMI-OPAQUE VARIANT IS DELETED, AND IT WAS MEASURED, NOT ASSUMED: ZERO call sites
  //    across `app` + `components`, in either spelling, at 2026-08-03. It was an S1 carry that
  //    reproduced a retired key's value byte-identically so nothing moved during the colour
  //    cutover; the cutover is four passes behind us and nothing ever adopted it. A second
  //    unused option living beside a live one is the `lib/colors.ts` failure mode rebuilt at
  //    component scale — it survives because deleting it looks like a risk and keeping it looks
  //    free, and then somebody copies it. Its fill was the only user of its resolved rule, so
  //    that rule vanishes with it; recorded in the commit body for the same reason as above.
  //    ⚠️ ITS NAME IS DELIBERATELY NOT SPELLED HERE. The adoption gate asserts that name absent
  //    from this file as TEXT, not as code, and that is on purpose rather than a limitation: a
  //    comment naming a retired thing is exactly how the pre-revamp palette survived four passes
  //    inside SUBSCRIPTION_EXAMPLES.tsx, waiting to be copied. Measured — the first draft of this
  //    very paragraph tripped the rule.
  /* 🔴 THE ENTRANCE APPENDS TO THE EXISTING STYLE AND ADDS NO NODE — the third time in this phase,
     and here the reason is `O-110` at its widest: this component is the ground for 43 call sites, so
     a wrapper would put a new link in 43 flex chains at once. `style` stays BEFORE the entrance, so a
     caller still wins on everything except the two animated properties. */
  return (
    <Animated.View
      className={`bg-surface rounded-lg p-5 border border-border-subtle ${className || ''}`}
      style={[style, entrance]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

export default Card;
