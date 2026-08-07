import React from 'react';
import { View, Text } from 'react-native';
import * as t from '@/theme';

interface StrengthsListProps {
  strengths: string[];
  title?: string;
}

export function StrengthsList({ strengths, title = 'Your Strengths' }: StrengthsListProps) {
  return (
    <View>
      <View className="flex-row items-center mb-4">
        <Text className="text-2xl mr-2">⭐</Text>
        <Text className="text-fg text-xl font-body-semi">{title}</Text>
      </View>

      <View style={{ gap: 10 }}>
        {strengths.map((strength, index) => (
          <View
            key={index}
            style={{
              backgroundColor: t.alpha(t.color.accent, 15),
              borderLeftWidth: 3,
              borderLeftColor: t.color.accent,
              borderRadius: t.radius.md,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16 /* GLYPH */, marginRight: 10, color: t.color.accent }}>✓</Text>
            <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.fg, fontFamily: t.family['body-semi'], flex: 1 }}>
              {strength.charAt(0).toUpperCase() + strength.slice(1)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
