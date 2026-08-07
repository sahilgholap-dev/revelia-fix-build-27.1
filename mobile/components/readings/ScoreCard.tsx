import React from 'react';
import { View, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFill, dur } from '@/lib/motion';
import { LockShell } from '@/components/ui/LockShell';
import * as t from '@/theme';

interface ScoreCardProps {
  title: string;       // "Intellect"
  score: number;       // 0-100
  description: string;
  icon?: string;       // Optional emoji or icon
  isLocked?: boolean;  // For free tier
}

export function ScoreCard({ title, score, description, icon, isLocked }: ScoreCardProps) {
  /* 🔴 THE BAR ANIMATES `scaleX`, NOT `width`, AND THAT IS §18's CONTRACT RATHER THAN A REFACTOR.
     "opacity and transform ONLY. ZERO layout properties animated — animating layout causes reflow."
     A percentage width inside a worklet re-lays-out the row EVERY FRAME, and this card renders
     several times per reading screen. `motion-arrival-check.js` found three such bars on its FIRST
     run — here, in `palm.tsx`'s local copy, and on the 60-second wait screen — and no other
     instrument in the tree can see them, because a worklet's return value is neither a className nor
     a StyleSheet rule.
     ⚠️ THE ANCHOR IS `transformOrigin`, NOT A TRANSLATE SANDWICH. `scaleX` scales about the centre by
     default, which would grow the fill outward from the middle; `transformOrigin: 'left'` is
     available from RN 0.74 (verified in the installed `processTransformOrigin.js`). The track keeps
     its own clipping, so a zero fill is invisible exactly as before.
     ⚠️ AND THE FILL NOW SPANS THE FULL TRACK: a scaled element must start at 100% width or there is
     nothing to scale. */
  const { style: animatedStyle } = useFill(score / 100, dur.base);

  // 🔴 O-24 (owner ruling, 2026-07-31): ONE COLOUR. The three-way hue ladder is REMOVED.
  //    (a) THE ENERGY-BAR PRECEDENT. Its three-way colour logic was removed because the score
  //        is LLM-generated: a dimmed or greyed bar is the app editorialising about someone's
  //        day. This is the same thing — a trait at 3/10 in the "worst" colour makes the same
  //        claim about a person, on the same uncalibrated output. Approved as a wellbeing call.
  //    (b) A HUE LADDER BREAKS §16. `accent-2` means premium / brand secondary and nothing
  //        else; a mid-band score colour is exactly the "generic second colour" drift §16
  //        exists to prevent.
  //    So: one colour, and the NUMBER carries the value. This also removes the collision risk
  //    entirely (V-1 purple->accent + V-3 pink->accent-2 would have made the BEST and WORST
  //    band identical). If a visible ranking is ever wanted it MUST be a PROMINENCE ladder
  //    (weight or opacity on one hue), NEVER a hue ladder — hue ladders in a one-accent system
  //    require inventing colours.
  const getColor = () => t.color.accent;

  return (
    <View className="bg-surface rounded-lg p-5 mb-4">
      {/* One of the four card lock overlays merged at item 13 — see GrowthCard's note for the
          measured reason the four had diverged. Blur is density 1's alone (§4.1), the overlay
          structure stays so the card does not reflow, the pictograph becomes the plate glyph, and
          the copy loses its tier name. This overlay had no scaling opt-in either. */}
      {isLocked && (
        <View className="absolute inset-0 z-10 rounded-lg overflow-hidden">
          <View className="flex-1 items-center justify-center bg-surface-raised">
            <LockShell density={3} title="Upgrade to Unlock" />
          </View>
        </View>
      )}
      
      <View className="flex-row items-center mb-3">
        {icon && <Text className="text-2xl mr-2">{icon}</Text>}
        <Text className="text-fg text-lg font-body-semi flex-1" style={{ textTransform: 'capitalize' }}>{title}</Text>
        <Text className="text-fg text-display-lg font-display">{score}</Text>
      </View>

      {/* Score bar */}
      <View className="h-2 bg-border-subtle rounded-pill overflow-hidden mb-3">
        <Animated.View
          style={[animatedStyle, { backgroundColor: getColor(), transformOrigin: 'left' }]}
          className="h-full w-full rounded-pill"
        />
      </View>

      <Text className="text-fg-muted text-sm">{description}</Text>
    </View>
  );
}
