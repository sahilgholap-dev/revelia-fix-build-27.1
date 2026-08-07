import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import * as t from '@/theme';

interface LifeAreaCardProps {
  area: 'love' | 'career' | 'money' | 'health';
  forecast: string;
  bestDays: string[];
}

/* 🔴 `O-24` / `P27` COMPLETED — one of four was collapsed in pass 1b and two were left. `love` held
   `accent-2` (§16.5: iris is premium / brand secondary, never the generic second colour) and
   `money` held `success` (a STATUS role; a money forecast in the ready colour reads as a verdict on
   the user's finances). The label is spelled out in full beside the icon on every instance, so the
   hue was carrying nothing the row did not already say in words. */
const areaConfig = {
  love: { icon: '💖', label: 'Love & Relationships', color: t.color.accent },
  career: { icon: '💼', label: 'Career & Purpose', color: t.color.accent },
  money: { icon: '💰', label: 'Money & Abundance', color: t.color.accent },
  health: { icon: '🌿', label: 'Health & Wellness', color: t.color.accent },  // O-24
};

export function LifeAreaCard({ area, forecast, bestDays }: LifeAreaCardProps) {
  const config = areaConfig[area];

  return (
    <Card className="mb-3">
      <View className="flex-row items-center mb-3">
        {/* GLYPH — this holds a pictograph, so the ramp step is a DIMENSION, not a type step, and
            the face is the platform emoji font either way. That is why it names no family utility.
            Keep the marker: it is what family-arrival-check.js's MISSING-family assertion excepts,
            and without it this site reads as an O-35 defect. Same argument as pass 2a's fontSize GLYPH. */}
        <Text /* GLYPH */ className="text-display-lg mr-3">{config.icon}</Text>
        <Text className="text-fg text-lg font-body-bold flex-1">{config.label}</Text>
      </View>
      
      <Text className="text-fg text-sm mb-3">
        {forecast}
      </Text>
      
      {bestDays && bestDays.length > 0 && (
        <View>
          <Text className="text-fg-muted text-xs mb-2">Best Days:</Text>
          <View className="flex-row flex-wrap">
            {bestDays.map((day, index) => (
              <View 
                key={index}
                className="rounded-pill px-3 py-1 mr-2 mb-2"
                style={{ backgroundColor: t.alpha(config.color, 10) }}
              >
                <Text className="text-xs font-body-semi" style={{ color: config.color }}>
                  {day}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}
