import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Button } from './Button';
import * as t from '@/theme';
import { openPaywall } from '@/lib/paywall';

/**
 * §9 item 13 — LockShell. ONE SYSTEM, THREE DENSITIES, replacing THREE lock treatments.
 *
 * 🔴 THE SCOPE WAS OFF BY 9x IN THE DESIGN AND THE PRE-FLIGHT MOVED IT AGAIN. design §9 row 13
 *    says "replaces 3 treatments on 11 sites"; `O-42` corrected that to a 28-call-site merge
 *    (§9's "3" was a FILE count read as a SITE count). Measured again at this commit:
 *
 *      the section element      25 sites   astrology/monthly 7 · readings/face 9 · readings/palm 9
 *      the banner element        3 sites   one in each of the same three files
 *
 *    ⚠️ THE TWO ROWS ABOVE NAME THOSE ELEMENTS IN PROSE ON PURPOSE. Written in JSX form they
 *       are HARVESTED BY THIS PHASE'S OWN GATE: assertion 4 scans raw source for the superseded
 *       element and does NOT strip comments, and it skips only the element's own module — so a
 *       header comment documenting the migration would report the migration as incomplete, in
 *       the file that completes it. Fourteenth instance of "a comment is source", first one
 *       inside the arrival gate rather than Tailwind or a grep.
 *      SectionCard `locked`    1 branch  (its 4 inline copies were merged at item 4)
 *      card lock overlays      4 components — 3 LIVE, 1 DEAD (AffirmationCard, `O-60`)
 *      full-screen gates       3 screens (§4.4's O-27 pair + weekly's self-gate)
 *
 * ── 🔴 WHAT THE DUPLICATION PRE-FLIGHT FOUND, AND IT IS THE ITEM'S JUSTIFICATION ──────────────
 *
 * The 25 section sites are UNIFORM — every one passes {title, teaser, tier} and not one passes
 * the `icon` prop that `LockedSection` declares, so that option had ZERO call sites. The FOUR
 * card overlays are where the divergence lives, and it is a live accessibility failure:
 *
 *      AffirmationCard   plain foreground   scaling opt-in ✅   pictograph marked ✅   0 sites
 *      GrowthCard        🔴 the ON-FILL role on a BLURRED SURFACE — 1.25:1        1 site, LIVE
 *      PalmLineCard      plain foreground   no opt-in           unmarked          1 site, LIVE
 *      ScoreCard         plain foreground   no opt-in           unmarked          1 site, LIVE
 *
 * 🔴 `GrowthCard`'s lock label is UNREADABLE ON ANDROID AND IT SHIPS TODAY. Measured in the
 *    installed `expo-blur@14.1.5`, not recalled: with no `tint` prop the Android path takes
 *    `TintStyle.DEFAULT`, whose `toColorInt` falls to the final branch — a WHITE overlay at
 *    `255 * (radius/100) * 0.44`. At radius 20 that is alpha 22, i.e. white at 8.6% over the
 *    card ground, giving a backdrop of about 43/40/38. The on-fill foreground role measures
 *    **1.25:1** against it and the plain foreground measures 12.6:1. So the ONE component that
 *    reached for the accessible-pairing token is the one that is invisible — the role is correct
 *    only on an ACCENT FILL, and a blurred neutral is not one.
 * 🔴 THAT IS THE `O-55` SHAPE AGAIN: four near-identical treatments, one of them wrong, and no
 *    instrument in the tree can see it. Deriving the pairing ONCE, here, is what closes it.
 *
 * ── THE INVARIANT: LOCKED AND UNLOCKED SHARE THE BOX (§4) ─────────────────────────────────────
 *
 * Same box, same padding, same corner, so a list does not reflow when the server payload
 * changes. Locked drops the BODY to the muted role and adds the plate; 🔴 IT NEVER DIMS THE
 * TITLE — a dimmed title reads as broken rather than as gated.
 *
 * ── 🔴 THE GROUNDING DECISION — ABSENCE C, THE LAST HELD-VALUE COLLISION (§4.5) ────────────────
 *
 * ⚠️ THE TWO TOKEN NAMES BELOW ARE WRITTEN IN PROSE, NOT AS LOOKUPS, AND THAT IS INSTANCE 15 OF
 *    "A COMMENT IS SOURCE" — caught by this file. The reserved lock token has an EXACT CENSUS in
 *    the arrival gate, the census reads raw source, and naming the token in this paragraph
 *    INFLATED ITS OWN COUNT BY ONE. 🔴 That is a third direction for the hazard: not prose adding
 *    a rule (loud) and not prose satisfying an assertion (silent), but prose MOVING A COUNT — and
 *    which way it fails depends entirely on the census's shape. Under `exact` it failed loudly.
 *    Under `nonzero`, which is what this entry was almost written as, the comment ALONE would
 *    have satisfied it and the plate could have grounded on the wrong token with the gate green.
 *
 * The reserved lock-plate token and the raised-surface token were held at ONE value through
 * passes 1-4, so
 * no gate could ever have told a right answer from a wrong one; `locked` measured ZERO call sites
 * at every measurement and its FIRST call site is created here, after the flip, when the two are
 * visibly a step apart. THE PLATE GROUNDS IN `locked`, on three grounds and one measurement:
 *
 *   1. design §2 row 5 names it BY ROLE — "lock-plate fill, a neutral, never a colour event".
 *      Branching on a token's ROLE rather than its VALUE is the standing rule (CLAUDE.md).
 *   2. The plate must read as a STEP ABOVE ITS OWN GROUND, and d2's ground is the raised step.
 *      Measured: plate-on-raised is 1.15:1 while the ladder's other steps are 1.05 and 1.06 —
 *      so this is the LARGEST step in the whole surface ladder and it is the only pair here
 *      that separates at all. Grounding the plate in the raised step would make it 1.00:1.
 *   3. The alternative leaves `locked` at zero call sites permanently, and no gate in this tree
 *      can see an unused token — its own comment in theme.js says so.
 *
 * ⚠️ AND THE MEASUREMENT THAT DECIDED WHERE THE PLATE DOES *NOT* GO: on d1's panel the ground is
 *    the overlay step, where the plate measures **1.05:1** and simply does not render as an
 *    object. §4.2 independently rules that d1's panel carries no plate because "the panel is an
 *    action surface", so d1 shows the padlock alone. Two arguments, same answer.
 *
 * ── 🔴 THREE THINGS THAT ARE RULED AND MUST NOT BE RE-OPENED ──────────────────────────────────
 *
 * 1. 🔴 THE 25 TEASERS PASS THROUGH UNCHANGED — owner ruling R-B. The title-only variant was
 *    specified as a FALLBACK for when no tease field exists. The field EXISTS at all 25 sites and
 *    carries hand-written marketing copy, so the fallback's precondition is FALSE and it must not
 *    fire. Deleting 25 shipped strings is a monetisation change wearing a design change's
 *    clothes. `C-5` therefore stays at THREE tier literals, not 29.
 * 2. 🔴 `O-1` IS UNAFFECTED AND STILL BLOCKED. These teasers are generic per-feature marketing,
 *    not a server-chosen truncation of THIS user's withheld content. Do not "close O-1" by
 *    pointing at the `teaser` prop.
 * 3. 🔴 THE CTA IS d1 AND d2 ONLY, AND IT IS TIER-NEUTRAL. d3's row IS the affordance (§4.3):
 *    d3's whole purpose is that a locked row is the same height as an unlocked one, and a
 *    control inside it breaks the one property it exists for. The tier-neutral CTA is what
 *    retires `LockedSection`'s hardcoded tier badge — an R1 violation closed for free.
 *
 * ── ⚠️ WHAT IS DESIGNED AND IS DELIBERATELY NOT HERE, each with a named owner ──────────────────
 *
 *  · 🔴 d1's veiled layer is supposed to be REAL WITHHELD CONTENT (§4.1: "not lorem"), and the
 *    pre-flight found that precondition is only PARTLY satisfiable: every full-screen gate in
 *    this app fires BEFORE the fetch, because the server refuses, so there is no withheld payload
 *    on the client to show. What IS behind the veil at the two destiny screens is the screen's own
 *    body — the form and the generate control, i.e. the feature being denied — and at weekly there
 *    is nothing at all. A redacted payload is the same server work `O-1` is blocked on.
 *  · the §14 `comet` plate below the veil — item 18, and it rides `P38` check 4. 🔴 If SVG under
 *    that layer composites badly on Android the plate is DROPPED from d1 entirely and NEVER moved
 *    above it: a crisp plate over withheld content reads as part of the unlock UI and dilutes the
 *    one meaning this treatment has. ⚠️ Check 4 as written asks about SVG under a BLUR; on the
 *    default Android path there is no blur to composite under, so the check is really about the
 *    flat tint. Re-scope it before running it.
 *  · the panel is a Sheet AT REST, not a Sheet. No presentation, no dimming layer behind it, no
 *    gesture, no focus management — item 15 owns those. It is built to the same visual spec on
 *    purpose, so the gesture and no-gesture builds look identical (§4.1), and item 15 absorbs it.
 *    ⚠️ THE PHRASE "no dimming layer" IS WRITTEN THAT WAY ON PURPOSE — instance 16 of "a comment
 *       is source", and it took TWO rewordings rather than one. The ordinary English word for that
 *       layer is the name of a token whose bare use is a permanent invariant at 0, and the rule
 *       matches that token followed by ANY non-slash character — so a comma after it blocked the
 *       gate. 🔴 THEN THE SENTENCE EXPLAINING THAT BLOCKED IT AGAIN, because naming the rule
 *       spells the token too: THE RULE FLAGS ITS OWN NAME. The gate's source already records that
 *       property for the sibling rule one block down, which is the only reason it was quick to
 *       find. A token-lookup spelling does not rescue it either — the only legal form of that
 *       token is inside an alpha() call, so there is no spelling that satisfies every tool. The
 *       workaround is to not use the word, and that is a first for this hazard class.
 *  · MOTION — cut for this release (§0.0 rule 5). No entrance, no blur ramp.
 */

// 🔴 THE 28dp PLATE SLOT (§4.1 d3). It is the ONE dimension this component pins, and it is what
//    makes a locked row the same height as an unlocked one — the property d3 exists for. A
//    density-3 row that sized itself to its own content would reflow the list it sits in.
const PLATE = 28;

// The glyph inside the plate. §9.2: NO text glyph and NO emoji renders as an icon anywhere in the
// system, and the padlock sites are named in that rule. This replaces FIVE pictographs — four
// card overlays plus LockedSection's own — at four different raw sizes.
const PLATE_GLYPH = 14;
const PANEL_GLYPH = 28;

type LockShellProps =
  | {
      /** full screen — the only place in the system that veils anything (§4.1). It mounts as the
       *  LAST child of a ScreenContainer and covers it, so whatever the screen already renders
       *  becomes the withheld layer with no call site restructuring and no duplicated JSX. */
      density: 1;
      title: string;
      body: string;
      /** 🔴 REQUIRED, and that is the O-27 guarantee: a full-screen gate ALWAYS has an exit.
       *  The two destiny screens shipped with none — a raw server tier slug in the danger role
       *  and no way forward or back. Making this a required pair means the compiler refuses the
       *  next dead end rather than a reviewer having to notice it. */
      secondaryTitle: string;
      onSecondary: () => void;
    }
  | {
      /** section — the 25 locked sections, the 3 banners, SectionCard's locked state. */
      density: 2;
      title: string;
      /** 🔴 R-B: the client-authored marketing string, passed through UNCHANGED at 25 sites. */
      teaser?: string;
    }
  | {
      /** inline / title-only — reuses the same plate slot so a locked row matches an unlocked
       *  one. 🔴 NO CTA: the row IS the affordance (§4.3). */
      density: 3;
      title: string;
    };

/** The lock plate. d2 and d3 only — see the header for why d1's panel has none.
 *
 * 🔴 RENAMED AT ITEM 18, AND THE RENAME IS THE POINT. §14's plate component is called `Plate` and
 *    landed in this same phase; this local had the identical name, so it was the FIFTH name
 *    collision of the programme and the second hazard of the `O-71` class in as many items. Two
 *    consequences, and the second is the one nothing else would have caught: an import of the
 *    shared component into this file would have been SHADOWED by the local, and the shared
 *    component's ADOPTION CONTRACT — which keys on the JSX element name — counted this file's two
 *    local uses as two false adopters of a component it does not render. `LockPlate` is also the
 *    more accurate name: design §2 row 5 calls the token it fills "lock-plate fill". */
function LockPlate() {
  return (
    <View style={styles.plate}>
      <Ionicons name="lock-closed" size={PLATE_GLYPH} color={t.color['fg-muted']} />
    </View>
  );
}

export function LockShell(props: LockShellProps) {
  /* 🟢 ITEM 17 LANDED AND IT CHANGED EXACTLY THIS LINE — none of the 36 call sites moved, because
     THE DENSITY IS THE SOURCE for a lock shell. Finer attribution (which of the 25 sections) is
     one optional prop away and nothing consumes it, so adding it now would be a zero-call-site
     option. This is also why item 13 shipped before item 17 rather than the reverse: threading a
     source through the treatments item 13 was deleting is work that deletes itself. */
  const handleUpgrade = () => openPaywall(props.density === 1 ? 'lock-d1' : 'lock-d2');

  if (props.density === 1) {
    const { title, body, secondaryTitle, onSecondary } = props;
    return (
      /* 🔴 IT COVERS THE SCREEN, WHICH MAKES THE WITHHELD CONTENT INERT FOR FREE. Without that a
         free user can type into a field they cannot submit and tap controls the server will
         refuse. Covering rather than wrapping is also what keeps the call sites to one appended
         element each: the screen keeps rendering exactly what it rendered before. */
      <View style={styles.d1Root}>
        {/* 🔴 THE ONE VEILED LAYER IN THE SYSTEM (§4.1/§4.2) — retained here and nowhere else, so
            the treatment is not diluted across four card overlays.
            🔴 AND WHAT IT ACTUALLY DOES ON ANDROID IS NOT A BLUR. Measured in the installed
               expo-blur@14.1.5, not recalled: `experimentalBlurMethod` DEFAULTS TO 'none'
               (src/BlurView.tsx), and on that path ExpoBlurView calls setBlurEnabled(false) and
               paints tint.toBlurEffect() as a flat background instead. With no tint prop the
               Android branch is TintStyle.DEFAULT, whose colour is white at
               255*(radius/100)*0.44 — alpha 22, i.e. 8.6%, at this radius.
            🔴 SO THE SHIPPING PLATFORM HAS NEVER SEEN A BLUR HERE, AND §4.2's PRESERVATION
               ARGUMENT — "the meaning users already learned, veiled = paywalled" — HAS A FALSE
               PREMISE ON ANDROID. iOS renders the real material, which is why the element stays.
               Turning the other method on is a NEW native rendering path (a per-frame capture of
               the root view) and `O-46` already has the texture layer's per-frame Android cost
               open as a memory question, so it is a device check, not a free switch. */}
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />

        <View style={styles.d1Panel}>
          <View style={styles.handle} />
          <Ionicons
            name="lock-closed"
            size={PANEL_GLYPH}
            color={t.color['fg-muted']}
            style={styles.panelGlyph}
          />
          <Text
            {...t.txt('display-sm')}
            accessibilityRole="header"
            style={[t.txt('display-sm').style, styles.d1Title]}
          >
            {title}
          </Text>
          {/* 🔴 THE SECONDARY ROLE, NOT THE MUTED ONE, AND IT IS A MEASUREMENT. The muted
              foreground is 5.31:1 on the canvas and 4.76:1 on the raised step, but this panel
              grounds on the OVERLAY step, where it measures 4.35:1 — sub-AA for body copy. The
              secondary role measures 8.50:1 on the same ground. §2.1 already bans the danger
              role as text on this exact surface at 4.28:1; this is the same class one token
              over, and nothing had registered it. */}
          <Text {...t.txt('text-sm')} style={[t.txt('text-sm').style, styles.d1Body]}>
            {body}
          </Text>
          <Button title="Upgrade to Unlock" onPress={handleUpgrade} variant="primary" fullWidth />
          {/* §4.1 — the secondary action is a ghost control BELOW the primary, never beside it. */}
          <View style={styles.d1Secondary}>
            <Button title={secondaryTitle} onPress={onSecondary} variant="ghost" fullWidth />
          </View>
        </View>
      </View>
    );
  }

  if (props.density === 2) {
    const { title, teaser } = props;
    return (
      <View style={styles.d2Card}>
        <View style={styles.row}>
          <LockPlate />
          <Text
            {...t.txt('text-lg')}
            accessibilityRole="header"
            style={[t.txt('text-lg').style, styles.d2Title]}
          >
            {title}
          </Text>
        </View>
        {teaser ? (
          /* 🔴 THE FACE IS THE SHIPPED ONE AND IT IS DELIBERATE, NOT AN OVERSIGHT. All 25 sites
             render this string in the slanted face today. §0.0 rule 1's conservative default is
             verbatim source over the design's proposal, and §4.1 names only the COLOUR for this
             line. Changing the face of 25 shipped marketing strings is a designer call, so it is
             registered rather than taken. */
          <Text
            {...t.txt('text-sm')}
            style={[t.txt('text-sm').style, styles.d2Teaser]}
          >
            {teaser}
          </Text>
        ) : null}
        <Button
          title="Upgrade to Unlock"
          onPress={handleUpgrade}
          variant="primary"
          size="sm"
          fullWidth
        />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <LockPlate />
      <Text {...t.txt('text-lg')} style={[t.txt('text-lg').style, styles.d3Title]}>
        {props.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── the plate ──
  plate: {
    width: PLATE,
    height: PLATE,
    borderRadius: t.radius.sm,
    // 🔴 ABSENCE C, RESOLVED. See the module header for the three grounds and the measurement.
    //    This is the token's FIRST call site in the history of the codebase.
    backgroundColor: t.color.locked,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // The slot's own height is the floor for the row, so a locked row cannot be shorter than
    // the plate even if its title wraps to nothing.
    minHeight: PLATE,
  },

  // ── density 2 ──
  // 🔴 THE BOX IS BYTE-FOR-BYTE SectionCard's, AND THAT IS WHY SectionCard DELEGATES RATHER THAN
  //    NESTS. Both treatments already grounded on the raised step at the lg corner with the same
  //    padding and the same margins, so a locked SectionCard IS this component — nesting one
  //    inside the other would double the box and break §4's share-the-box invariant.
  d2Card: {
    backgroundColor: t.color['surface-raised'],
    borderRadius: t.radius.lg,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    // The locked edge, verbatim from the treatment this replaces. It is the one property that
    // distinguishes a locked section from an unlocked one at a glance, and §4 leaves the EDGE
    // unspecified while pinning the box — so the shipped value carries.
    borderColor: t.alpha(t.color.accent, 40),
  },
  d2Title: {
    color: t.color.fg,   // 🔴 §4 — NEVER dimmed. A dimmed title reads as broken, not as gated.
    flex: 1,
    marginLeft: 12,
  },
  d2Teaser: {
    color: t.color['fg-muted'],
    fontFamily: t.family.quote,
    marginTop: 12,
    marginBottom: 16,
  },

  // ── density 3 ──
  d3Title: {
    color: t.color.fg,
    marginLeft: 12,
  },

  // ── density 1 ──
  // Pinned over the screen with the panel at the bottom edge. `justifyContent` is what puts the
  // panel there without a second absolute rule, so there is exactly one positioned element here.
  d1Root: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  d1Panel: {
    backgroundColor: t.color['surface-overlay'],
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: t.radius.pill,
    backgroundColor: t.color['border-strong'],
    alignSelf: 'center',
    marginBottom: 20,
  },
  panelGlyph: { alignSelf: 'center', marginBottom: 12 },
  d1Title: { color: t.color.fg, textAlign: 'center' },
  d1Body: {
    color: t.color['fg-secondary'],
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  d1Secondary: { marginTop: 8 },
});

export default LockShell;
