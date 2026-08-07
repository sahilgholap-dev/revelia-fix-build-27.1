import React from 'react';
import { View, Text, Image } from 'react-native';
import * as t from '@/theme';

interface PalmTypeHeaderProps {
  name: string;        // "Fire Hand"
  description: string;
  imageUrl?: string;   // Palm image thumbnail
}

export function PalmTypeHeader({ name, description, imageUrl }: PalmTypeHeaderProps) {
  /* 🔴 `O-24` / `P27` — THE FOUR-HUE ELEMENT MAP IS COLLAPSED, AND THIS ONE WAS THE WIDEST
     SURVIVOR: four categories, four different tokens, three of them STATUS roles being spent as
     decoration. `danger` means failed · destructive, and a fire hand is neither; `success` means
     ready · verified, and an earth hand is neither. §16.5 rules out the iris the same way — iris is
     premium / brand secondary and nothing else. A palm ELEMENT is a nominal category with no
     ranking in it at all, so a hue was never carrying information here, only a mood.
     🟢 The element is named IN THE HEADING (`name` is "Fire Hand") and drawn by the pictograph
        directly above it. Identity comes from the label, the icon and the position — §16's own
        argument, which is why this collapses rather than being re-hued.
     ⚠️ THE ICON BRANCHES SURVIVE AND THE COLOUR BRANCH DOES NOT, deliberately: a function that
        returns the same value on every path is the dead-variant shape, so the wash is a constant
        and only the thing that actually differs is still computed. */
  const ELEMENT_WASH = t.alpha(t.color.accent, 20);

  const getElementIcon = () => {
    if (name.toLowerCase().includes('fire')) return '🔥';
    if (name.toLowerCase().includes('water')) return '💧';
    if (name.toLowerCase().includes('earth')) return '🌍';
    if (name.toLowerCase().includes('air')) return '💨';
    return '✋';
  };

  const icon = getElementIcon();

  return (
    <View
      style={{ backgroundColor: ELEMENT_WASH }}
      className="rounded-xl p-6 items-center mb-6"
    >
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          className="w-12 h-12 rounded-pill mb-4"
          resizeMode="cover"
        />
      )}
      
      <Text className="text-4xl mb-3">{icon}</Text>
      
      <Text className="text-accent text-2xl font-body-bold text-center mb-2">
        {name}
      </Text>
      
      <Text className="text-fg-muted text-base text-center">
        {description}
      </Text>
    </View>
  );
}
