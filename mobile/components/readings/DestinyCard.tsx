import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as t from '@/theme';

interface DestinyCardProps {
  lifeTheme: string;
  naturalTalents: string[];
  challenges?: string;
  advice?: string;
  isFullVersion: boolean;  // Premium shows all
}

export function DestinyCard({ lifeTheme, naturalTalents, challenges, advice, isFullVersion }: DestinyCardProps) {
  const displayedTalents = isFullVersion ? naturalTalents : naturalTalents.slice(0, 2);

  return (
    <View className="mb-6">
      <View className="flex-row items-center mb-4">
        <Text className="text-2xl mr-2">⭐</Text>
        <Text className="text-fg text-xl font-body-semi">Your Destiny</Text>
      </View>
      
      <LinearGradient
        colors={[t.alpha(t.color.accent, 30), t.alpha(t.color.accent, 10)]}
        className="rounded-lg p-6 mb-4"
      >
        <Text className="text-fg text-lg font-quote text-center">
          {lifeTheme}
        </Text>
      </LinearGradient>
      
      {/* Natural Talents */}
      <View className="mb-4">
        <View className="flex-row items-center mb-3">
          <Text className="text-2xl mr-2">✨</Text>
          <Text className="text-fg text-xl font-body-semi">Natural Talents</Text>
        </View>
        <View style={{ gap: 10 }}>
          {displayedTalents.map((talent, index) => (
            <View
              key={index}
              style={{ borderLeftWidth: 3, borderLeftColor: t.color.accent }}
              className="bg-surface rounded-md px-4 py-3"
            >
              <Text className="text-fg text-sm">{talent.charAt(0).toUpperCase() + talent.slice(1)}</Text>
            </View>
          ))}
          {!isFullVersion && naturalTalents.length > 2 && (
            <View className="bg-surface-raised rounded-md px-4 py-3">
              <Text className="text-fg-muted text-sm font-body-semi">+{naturalTalents.length - 2} more talents with Premium</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Challenges (Premium) */}
      {isFullVersion && challenges && (
        <View className="bg-surface rounded-lg p-4 mb-4">
          <Text className="text-accent text-base font-body-semi mb-2">Challenges</Text>
          <Text className="text-fg-muted text-sm">{challenges}</Text>
        </View>
      )}
      
      {/* Advice (Premium) */}
      {isFullVersion && advice && (
        <View className="bg-surface rounded-lg p-4">
          <Text className="text-accent text-base font-body-semi mb-2">Advice</Text>
          <Text className="text-fg-muted text-sm">{advice}</Text>
        </View>
      )}
    </View>
  );
}
