import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DailyInsightOutput, DailyTeaserOutput } from '@shared/types';
import { Button } from '@/components/ui/Button';
/* 🔴 GREPPED FOR AS A LOCAL DEFINITION FIRST (O-71/O-79 — five name collisions in this programme,
   and the fifth was a LOCAL of exactly this name inside LockShell, which gave the plate contract
   two FALSE adopters). No local of this name exists in this file. */
import { Plate } from '@/components/ui/Plate';
import * as t from '@/theme';

/**
 * DailyInsightCard — Home's HERO, and design §10.1.0's mechanisms 2 and 3 both land here.
 *
 * ── 🔴 THE ENERGY BAR HAD THE THREE-WAY COLOUR LOGIC §10.1.4 RETIRES ────────────────────────
 *
 * It read the accent at a score of 7 or more, a half-strength accent at 4 or more, and a
 * STRUCTURAL BORDER TOKEN below that — i.e. at a low score the fill became the same token as the
 * empty track behind it, so the bar rendered as if it had no value at all. §10.1.4's ruling is that
 * the bar is ALWAYS the accent and the NUMBER carries the value: a dimmed bar on a low-energy day is
 * the app editorialising about someone's life, and the score is model-generated, so the
 * editorialising is not even calibrated. The colour logic is deleted; the width still carries the
 * score.
 * ⚠️ Its low branch was also O-26's role-vs-dimension class — a border token used as a FILL.
 *
 * ── 🔴 THE SCORE IS THE SCREEN'S ONE DISPLAY HERO, AND IT WAS RENDERING AT THIRTEEN POINTS ───
 *
 * §17.3 assigns Home's single display moment to the energy numeral, and §10.1.0's mechanism 3
 * specifies the shape: an eyebrow immediately above, the numeral at the ramp's top step, the unit
 * beside it at the smallest step. It was a 13-point run-in on the date row.
 * 🔴 AND §17 IS WHY THE NAME ON home.tsx CAME DOWN A STEP IN THE SAME COMMIT: two display moments
 *    in one viewport cancel each other (§17.1), the comp drew both, and §10.1.0's finding (ii)
 *    rules that §17 governs and the name stays a step below.
 * ⚠️ NO COPY WAS AUTHORED TO DO THIS. Mechanism 3 spells the unit as a phrase that does not exist
 *    in this file; the existing label two lines below IS the eyebrow, moved rather than written, and
 *    the unit is the substring the score already carried. Every string here is in `git diff` as a
 *    MOVE, never as an edit.
 *
 * ── §10.1.0 MECHANISM 2 — THE PLATE SLOT ────────────────────────────────────────────────────
 *
 * One plate, right-aligned beside the score, at the width the mechanism names. 🔴 THE COLUMN IS
 * FIXED so prose length cannot move it (§14.4's reservation discipline), and the plate is CONTENT-
 * level, so the texture layer sits below it (§14.2's corrected z-order). Its own component carries
 * both a11y props, so no mount can forget them.
 * 🔴 THIS IS THE ONLY PLATE ON THIS SCREEN AND HOME SPENDS NO OTHER §14 BUDGET — §14.5 forbids two
 *    plates in one viewport, and §15.2's per-screen budget is one ridge, one arc, one plate. Home
 *    already spends the ridge and the arc.
 *
 * ── ⚠️ X16 IS IN THIS FILE AND IT IS IN THE *LEGACY* BRANCH ─────────────────────────────────
 *
 * The `minHeight` on the second branch's gradient is an iOS-production collapse guard (6525a75),
 * a no-op on Android. It is untouched. That branch's slab is retired to equal stops — the same
 * mechanism §10.2.4 specifies for X3's button — because a two-stop ground has no single legal
 * foreground (O-73) and the node itself must survive.
 */
interface DailyInsightCardProps {
  insight?: DailyInsightOutput | DailyTeaserOutput | null;
  isTeaser?: boolean;
  onTap: () => void;
  onUnlock?: () => void;
  /**
   * §10.1.0's mechanism 4(b) — the hero abandons the RIGHT margin: curved on the left, flush on the
   * right. Opt-in rather than unconditional because this card also renders inside gutters elsewhere,
   * and an unconditional flush edge would be a layout change at every call site. One call site
   * today, named: Home.
   * ⚠️ THE WORD FOR A SOFTENED CORNER IS NOT WRITTEN ANYWHERE IN THIS FILE, and that is not
   *    fussiness: `no-legacy-radii` greps the bare form, so a sentence about corners re-opens a
   *    counter that reads 0 — CLAUDE.md records that there is no spelling which satisfies every
   *    tool, so the word is simply not used. It cost two hits here before this wording.
   */
  flushRight?: boolean;
}

export function DailyInsightCard({ insight, isTeaser, onTap, onUnlock, flushRight }: DailyInsightCardProps) {
  if (!insight) return null;

  /* 🔴 THE TWO ZEROES ARE MARKED AS A SHAPE PARAMETER, NOT SMUGGLED PAST THE RULE. `no-numeric-radius`
     is right to flag them and the marker is its documented in-file mechanism, printed and counted
     separately so the excepted set can never grow unnoticed. They belong to SHAPE's own stated class
     — "not a step" — for a reason the corner scale makes structural: the scale has FIVE steps and no
     zero, correctly, because a squared corner is not a design step, it is the ABSENCE of one. This
     edge has no corner because it has no edge: the card runs off the screen. Inventing a zero step
     to satisfy the grep would put a non-value in the scale, which is worse than an audited
     exception. SHAPE's rationale in token-gate.sh is extended in the same commit — an exception
     whose documentation names only its first class is a stale register. */
  const flushCorners = flushRight
    ? { borderTopRightRadius: 0 /* SHAPE */, borderBottomRightRadius: 0 /* SHAPE */ }
    : null;

  const isNewFormat = 'overallEnergy' in insight;
  const isFullInsight = 'focusArea' in insight;

  // New rich format
  if (isNewFormat && isFullInsight && !isTeaser) {
    const data = insight as DailyInsightOutput;
    const score = data.overallEnergy?.score || 7;
    const headline = data.overallEnergy?.headline || '';

    return (
      <TouchableOpacity onPress={onTap} activeOpacity={0.9}>
        <View className="bg-surface rounded-lg p-5 border border-border-subtle" style={flushCorners}>
          <Text className="text-fg-muted text-xs mb-3">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>

          {/* §10.1.0 mechanisms 2 + 3 — the hero row: eyebrow, numeral, unit, and the plate column
              on the right. The plate column's width is FIXED, so a long headline below cannot move
              it (§14.4). */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              {/* The eyebrow. This is the label that used to sit below beside a pictograph — MOVED,
                  not written, and the pictograph is gone (§9.2: no emoji renders as an icon). */}
              <Text
                {...t.txt('overline')}
                style={{ ...t.txt('overline').style, color: t.color['fg-muted'], textTransform: 'uppercase' }}
              >
                Overall Energy
              </Text>
              <View className="flex-row items-baseline">
                <Text {...t.txt('display-lg')} style={{ ...t.txt('display-lg').style, color: t.color.fg }}>
                  {score}
                </Text>
                <Text
                  {...t.txt('text-2xs')}
                  style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'], marginLeft: t.space['1'] }}
                >
                  /10
                </Text>
              </View>
            </View>
            <Plate name="lunar" width={92} />
          </View>

          {/* Energy Bar — 🔴 ALWAYS THE ACCENT (§10.1.4). The width carries the score; the colour
              never does. See the module header for what was here. */}
          <View className="mb-3">
            <View className="h-2 rounded-pill overflow-hidden" style={{ backgroundColor: t.color['border-subtle'] }}>
              <View
                className="h-2 rounded-pill"
                style={{ width: `${score * 10}%`, backgroundColor: t.color.accent }}
              />
            </View>
          </View>

          {/* Headline */}
          <Text className="text-accent text-lg font-body-bold mb-3">
            "{headline}"
          </Text>

          {/* Category Summaries */}
          {data.career?.summary && (
            <View className="flex-row items-center mb-1.5">
              <Text className="text-sm mr-2">💼</Text>
              <Text className="text-fg-secondary text-sm flex-1" numberOfLines={1}>
                {data.career.summary}
              </Text>
            </View>
          )}
          {data.love?.summary && (
            <View className="flex-row items-center mb-1.5">
              <Text className="text-sm mr-2">💕</Text>
              <Text className="text-fg-secondary text-sm flex-1" numberOfLines={1}>
                {data.love.summary}
              </Text>
            </View>
          )}
          {data.friendship?.summary && (
            <View className="flex-row items-center mb-3">
              <Text className="text-sm mr-2">👥</Text>
              <Text className="text-fg-secondary text-sm flex-1" numberOfLines={1}>
                {data.friendship.summary}
              </Text>
            </View>
          )}

          {/* Do / Avoid */}
          {/* Do / Avoid — 🔴 §10.1.0's FINDING (iii) IS EXPLICIT THAT NO TOKEN MAY BE INVENTED
              HERE. The comp draws these as a success wash and a danger wash, and §2's palette has
              only the two ACCENT washes: there is no success wash and no danger wash. This code
              already reached the same result through alpha(), which IS the sanctioned mechanism, so
              nothing is added and nothing is invented — recorded because "adopt the comp's hero as
              drawn" reads like an instruction to add two tokens, and it is not.
              🔴 THE TWO PICTOGRAPHS ARE DROPPED RATHER THAN CONVERTED, and that is the conservative
              branch of §9.2 rather than a shortcut: the design enumerates the Ionicons it wants by
              name and names none for these two, so converting would mean CHOOSING two glyphs, while
              dropping them loses nothing — the label beside each one already says which it is. Same
              reasoning as §10.1's own ruling that Home's celebration pictograph is "decorative, not
              expressive" and simply goes. The labels' own strings are untouched.
              🔴 AND THE LABELS COME OFF THEIR SEMANTIC ROLES, BECAUSE ONE OF THEM WAS SUB-AA AND
              THE OTHER WAS NOT. Measured on each label's OWN wash over the SURFACE step — the
              ground it actually sits on, which is the only figure that means anything (O-66):

                  the success role on the success wash    6.02:1   passes
                  the danger role  on the danger  wash    4.41:1   🔴 SUB-AA

              §2.1 publishes the danger role's failure at the OVERLAY step (4.28:1). It fails here
              too, on its own wash over a DIFFERENT step, and §2 publishes no column for that
              ground at all — so the prohibition's real reach is wider than the sentence that
              states it. Third instance of O-66 in this phase.
              🔴 SO A "SEMANTIC WASH PLUS MATCHING SEMANTIC LABEL" PATTERN IS SAFE FOR ONE OF THESE
              TWO ROLES AND UNSAFE FOR THE OTHER — and §10.1.0's hero drawing specifies exactly
              that pattern for BOTH. Both labels take the plain foreground, and the pair is
              distinguished by its WASH and by its own words rather than by label colour. Colouring
              only the one that passes would read as a defect and would hide the finding.
              ⚠️ They also take the eyebrow step, which is what finding (iii) calls them. */}
          {data.action && (
            <View className="flex-row mb-3" style={{ gap: 8 }}>
              <View className="flex-1 rounded-md p-3" style={{ backgroundColor: t.alpha(t.color.success, 10) }}>
                <Text
                  {...t.txt('overline')}
                  style={{ ...t.txt('overline').style, color: t.color.fg, textTransform: 'uppercase', marginBottom: t.space['1'] }}
                >
                  Do
                </Text>
                <Text className="text-fg text-xs" numberOfLines={2}>{data.action.doToday}</Text>
              </View>
              <View className="flex-1 rounded-md p-3" style={{ backgroundColor: t.alpha(t.color.danger, 10) }}>
                <Text
                  {...t.txt('overline')}
                  style={{ ...t.txt('overline').style, color: t.color.fg, textTransform: 'uppercase', marginBottom: t.space['1'] }}
                >
                  Avoid
                </Text>
                <Text className="text-fg text-xs" numberOfLines={2}>{data.action.avoidToday}</Text>
              </View>
            </View>
          )}

          {/* View Full Insight */}
          <Text className="text-accent text-sm font-body-semi text-center">
            View Full Insight →
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Legacy format fallback or teaser
  const headline = (insight as any).headline || (insight as any).overallEnergy?.headline || '';
  const text = isTeaser && 'teaser' in insight
    ? (insight as DailyTeaserOutput).teaser
    : (isFullInsight ? (insight as any).insight || '' : '');

  /* 🔴 THE LEGACY / TEASER BRANCH CARRIED TWO LIVE SUB-AA FAILURES AND BOTH WERE O-73's CLASS.
     Its ground was a diagonal accent slab running from a 60%-alpha accent to the full accent, so a
     text node's contrast was a function of its POSITION in the box, which no static analysis can
     resolve and which the A5 pair rule therefore reads as clean. Measured across it:

         the on-fill role at the START of the ramp     3.11:1   🔴 sub-AA for the BODY step
                         at the END                   6.86:1
         🔴 the META role on the tap line              1.42:1   — on an ACCENT FILL

     The second one is the same figure as the worst reachable text found in the whole programme
     (ShareableQuote's quote, items 9-11). Here it is the affordance that tells the user the card
     is tappable.

     🟢 THE FIX IS THE SUBTRACTION §2 ALREADY RULED, and the node survives it: both stops are now
     EQUAL — the mechanism §10.2.4 specifies for X3's button — so the ground is ONE opaque accent
     fill and A5 applies unambiguously: the on-fill role is the ONLY legal foreground, everywhere in
     the box. All three text nodes take it, and they rank by STEP rather than by colour, which is
     the prominence-ladder rule: two lines of copy on one fill share one foreground and differ by
     size, never by hue.
     🔴 X16 IS ON THIS ELEMENT — the height floor is an iOS-production collapse guard (6525a75) and a
     no-op on Android, so deleting it would look free on every device this project can build. It is
     untouched, and so is the gradient node itself.
     ⚠️ The unlock control's branch has no caller passing the teaser flag today. It is NOT deleted:
     the same ruling as GeneratingReading's error branch (O-56) — an unreachable branch holding a
     live invariant is not dead code. */
  return (
    <TouchableOpacity onPress={onTap} activeOpacity={0.9}>
      <LinearGradient
        colors={[t.color.accent, t.color.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: t.radius.md,
          padding: 24,
          minHeight: 160,
          ...(flushCorners ?? {}),
        }}
      >
        <Text className="text-on-accent text-2xl font-body-bold mb-3">
          {headline}
        </Text>

        {text ? (
          <Text className="text-on-accent text-base mb-4" numberOfLines={isTeaser ? 3 : undefined}>
            {text}
          </Text>
        ) : null}

        {isTeaser && onUnlock && (
          <Button
            title="Unlock Full Insight"
            onPress={onUnlock}
            variant="secondary"
            fullWidth
          />
        )}

        {!isTeaser && (
          <Text className="text-on-accent text-sm mt-2">
            Tap to view full insight →
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}
