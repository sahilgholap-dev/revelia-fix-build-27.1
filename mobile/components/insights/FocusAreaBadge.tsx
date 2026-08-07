import React from 'react';
import { View, Text } from 'react-native';
import * as t from '@/theme';

interface FocusAreaBadgeProps {
  area: 'Career' | 'Love' | 'Health' | 'Growth' | 'Creativity';
  size?: 'small' | 'medium';
}

/* 🔴 `O-24` / `P27` COMPLETED HERE — the map was collapsed to one hue at THREE of five entries in
   pass 1b and TWO were left behind, which is the worst possible state: a reader sees the ruling's
   comment on `Growth` and reasonably concludes the map was swept.
     · `Love` held `accent-2`. §16.5: iris means premium / brand secondary AND NOTHING ELSE — "it
       just needed to be a different colour" is the wrong token by definition.
     · `Health` held `success`. That is a STATUS role (ready · verified), and a wellbeing category
       painted in the ready colour reads as a verdict on the user's health.
   🟢 IDENTITY SURVIVES BECAUSE IT NEVER CAME FROM THE HUE: this badge renders its ICON and its
      NAME, side by side, at every size. §16's own argument for the lock system is the same one —
      a marker labels, it does not encode. */
const areaConfig = {
  Career: { icon: '💼', color: t.color.accent },
  Love: { icon: '💖', color: t.color.accent },
  Health: { icon: '🌿', color: t.color.accent },
  Growth: { icon: '🌱', color: t.color.accent },      // O-24: one hue; the ICON identifies it
  Creativity: { icon: '🎨', color: t.color.accent },
};

export function FocusAreaBadge({ area, size = 'medium' }: FocusAreaBadgeProps) {
  const config = areaConfig[area];
  const isSmall = size === 'small';

  return (
    <View 
      className={`flex-row items-center rounded-pill px-3 py-2 self-start`}
      style={{ backgroundColor: t.alpha(config.color, 10) }}
    >
      <Text className={isSmall ? 'text-base mr-1' : 'text-xl mr-2'}>
        {config.icon}
      </Text>
      <Text 
        className={`font-body-semi ${isSmall ? 'text-sm' : 'text-base'}`}
        style={{ color: config.color }}
      >
        {area}
      </Text>
    </View>
  );
}
