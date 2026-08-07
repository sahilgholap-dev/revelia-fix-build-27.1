import React from 'react';
import { View, Text } from 'react-native';
import * as t from '@/theme';

/**
 * Gold "NEW" badge — R9 §14 step 9 (the only net-new visual token besides the
 * indigo report icon). Small rounded-pill gold pill with dark text, matching the
 * app's existing inline-pill styling. Used on the Personalized Cosmic Report
 * entry cards (Home → Explore + the Astrology tab).
 */
export function NewBadge() {
  return (
    <View
      style={{
        backgroundColor: t.color.accent,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: t.radius.pill,
      }}
    >
      <Text style={{ ...t.txt('overline').style, color: t.color['on-accent'] }}>
        NEW
      </Text>
    </View>
  );
}

export default NewBadge;
