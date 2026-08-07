import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/components/ui/Card';

interface MonthlyKeyDateCardProps {
  date: string;
  significance: string;
  advice: string;
}

export function MonthlyKeyDateCard({ date, significance, advice }: MonthlyKeyDateCardProps) {
  return (
    <Card className="mb-3">
      <View className="flex-row items-start mb-3">
        {/* GLYPH — a pictograph, so the ramp step is a DIMENSION, not a type step, and the face is
            the platform emoji font either way. That is why it names no family utility. Keep the
            marker: it is what family-arrival-check.js's MISSING-family assertion excepts. */}
        <Text /* GLYPH */ className="text-display-lg mr-3">🗓️</Text>
        <View className="flex-1">
          <Text className="text-accent text-lg font-body-bold mb-1">{date}</Text>
          <Text className="text-fg text-base mb-2">{significance}</Text>
          <Text className="text-fg-muted text-sm">{advice}</Text>
        </View>
      </View>
    </Card>
  );
}
