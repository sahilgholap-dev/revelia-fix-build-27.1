import React from 'react';
import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as t from '@/theme';

interface ArchetypeHeaderProps {
  name: string;        // "The Visionary"
  tagline: string;     // One-line description
  imageUrl?: string;   // User's face image thumbnail
}

export function ArchetypeHeader({ name, tagline, imageUrl }: ArchetypeHeaderProps) {
  /* 🔴 `P79` — TWO CHANGES, AND ONLY THE FIRST IS THE `O-103` SHAPE.
        (1) the far stop was the keyword transparent, which is transparent BLACK — so straight-alpha
            interpolation drags the colour toward black as the alpha falls. Fading accent to its own
            hue at zero is `O-103`'s prescription verbatim and makes both models agree.
        (2) the near stop fell from 30% to 10%, and that is the real defect: at 30% the wash is
            light enough that BOTH labels this header carries go sub-AA at the strong end — the
            archetype name in the accent role at 4.34:1 and the tagline in the muted role at 3.19:1.
            At 10% they read 6.41:1 and 4.72:1.
        ⚠️ AGAIN THE WASH MOVED RATHER THAN THE LABELS: the accent-coloured archetype name is a
           design decision and a decorative tint strength is not. And note what this rule reaches
           that nothing else could — the pair is a className label on a gradient stop ARRAY, which is
           the exact intersection `no-white-on-accent` and the A5 pair rule both miss. */
  return (
    <LinearGradient
      colors={[t.alpha(t.color.accent, 10), t.alpha(t.color.accent, 0)]}
      className="rounded-xl p-6 items-center"
    >
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          className="w-12 h-12 rounded-pill mb-4"
          resizeMode="cover"
        />
      )}
      <Text className="text-accent text-display-lg font-display text-center mb-2">
        {name}
      </Text>
      <Text className="text-fg-muted text-base text-center">
        {tagline}
      </Text>
    </LinearGradient>
  );
}
