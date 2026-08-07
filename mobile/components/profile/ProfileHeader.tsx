import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getZodiacEmoji } from '@/lib/zodiacEmojis';
import * as t from '@/theme';

interface ProfileHeaderProps {
  name: string;
  sunSign: string;
  lifePathNumber: number;
  memberSince: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name,
  sunSign,
  lifePathNumber,
  memberSince,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  /* 🔴 `O-103` / `P79` — TWO CHANGES, AND THEY ARE TWO DIFFERENT FINDINGS.
        (1) the opaque ground moved OFF the stop list and UNDER the ramp, so both alpha models
            agree and the straight-alpha midpoint stops bulging lighter than either end;
        (2) the tint fell from 10% to 5%, and that one is NOT a rendering artefact. This card's
            ground is the raised surface step rather than the canvas, where the muted role starts at
            4.76:1 — so ANY accent tint on top of it puts the three muted lines under AA (measured
            4.42:1 even with the ramp fixed). 5% leaves 4.78:1.
        ⚠️ THE TINT MOVED RATHER THAN THE THREE LABELS, DELIBERATELY: a decorative wash strength
           carries no design ruling, and the muted role on a profile card does. The smaller change
           (§0.0 rule 1) is the one that does not touch a foreground role. */
  return (
    <LinearGradient
      colors={[t.alpha(t.color.accent, 0), t.alpha(t.color.accent, 5)]}
      className="rounded-xl p-6 border border-border-strong"
      style={{ backgroundColor: t.color.surface }}
    >
      {/* Name */}
      <Text className="text-display-lg font-display text-fg mb-4">{name}</Text>
      
      {/* Cosmic Identity */}
      <View className="flex-row items-center mb-4">
        {/* Sun Sign */}
        <View className="flex-row items-center bg-bg/50 rounded-md px-4 py-3 mr-3">
          <Text className="text-4xl mr-2">{getZodiacEmoji(sunSign)}</Text>
          <View>
            <Text className="text-xs text-fg-muted">Sun Sign</Text>
            <Text className="text-fg font-body-semi">{sunSign}</Text>
          </View>
        </View>
        
        {/* Life Path Number */}
        <View className="flex-row items-center bg-bg/50 rounded-md px-4 py-3">
          <View className="w-12 h-12 bg-accent rounded-pill items-center justify-center mr-3">
            {/* A5: on an `accent` fill the only legal foreground is `on-accent`. `bg` is the
                app-canvas role — contrast-correct here, but a canvas token in the foreground
                dimension, which no gate can see. */}
            <Text className="text-xl font-body-bold text-on-accent">
              {lifePathNumber}
            </Text>
          </View>
          <View>
            <Text className="text-xs text-fg-muted">Life Path</Text>
            <Text className="text-fg font-body-semi">Number</Text>
          </View>
        </View>
      </View>
      
      {/* Member Since */}
      <View className="flex-row items-center">
        <Text className="text-fg-muted text-sm">
          Member since {formatDate(memberSince)}
        </Text>
      </View>
    </LinearGradient>
  );
};

export default ProfileHeader;
