import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import * as t from '@/theme';

interface WeeklyDayCardProps {
  day: string;
  energy: 'high' | 'moderate' | 'reflective';
  focus: string;
  isToday?: boolean;
}

/* 🔴 `O-24` / `P27` COMPLETED — and this map is the ORDINAL half of the ruling rather than the
   nominal half, which makes the surviving entry the more serious of the two kinds. `energy` is a
   three-band LADDER over LLM-derived output, and a band painted its own hue is the app ranking the
   user's week in colour. `ScoreCard`'s ruling is verbatim applicable: "a trait at 3/10 in the
   'worst' colour makes a claim about a person, on uncalibrated output." `reflective` was collapsed
   in pass 1b and `moderate` kept `accent-2`, which is also §16.5's generic-second-colour drift.
   🟢 The band is named IN WORDS on the same row and marked by its own dot, so nothing is lost.
   ⚠️ If a visible ranking is ever wanted here it is a PROMINENCE ladder — weight or opacity on one
      hue — never a hue ladder. A hue ladder in a one-accent system requires inventing colours. */
const energyConfig = {
  high: { color: t.color.accent, label: 'High Energy', dot: '🟡' },
  moderate: { color: t.color.accent, label: 'Moderate', dot: '🟣' },
  reflective: { color: t.color.accent, label: 'Reflective', dot: '🔵' },  // O-24; the DOT identifies it
};

export function WeeklyDayCard({ day, energy, focus, isToday }: WeeklyDayCardProps) {
  const config = energyConfig[energy];

  return (
    // 🔴 ABOVE-CEILING DIMENSION — pass 3a. This card is 256 wide because it is a page in a
    //    HORIZONTAL scroller; the width IS the layout. §4.3 lists this key among the five spacing
    //    outliers to migrate onto an authoring step, but the vocabulary tops out at 48dp, so the
    //    "nearest step" is an 81% reduction that would make the card narrower than its own day label.
    //    It is a DIMENSION resolving through the spacing scale, not spacing. Registered as O-39.
    <Card
      className={`mr-3 w-64 ${isToday ? 'border-2' : ''}`}
      style={isToday ? { borderColor: t.color.accent } : {}}
    >
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-fg text-lg font-body-bold">{day}</Text>
        {isToday && (
          <View className="bg-accent rounded-pill px-2 py-1">
            <Text className="text-on-accent text-xs font-body-bold">TODAY</Text>
          </View>
        )}
      </View>
      
      <View className="flex-row items-center mb-3">
        <Text className="text-xl mr-2">{config.dot}</Text>
        <Text className="text-sm" style={{ color: config.color }}>
          {config.label}
        </Text>
      </View>
      
      <Text className="text-fg text-sm">
        {focus}
      </Text>
    </Card>
  );
}
