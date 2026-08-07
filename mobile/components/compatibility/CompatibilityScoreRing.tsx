import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as t from '@/theme';
import { curve, dur } from '@/lib/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CompatibilityScoreRingProps {
  score: number;
  size?: number;
  animated?: boolean;
}

export function CompatibilityScoreRing({ 
  score, 
  size = 200, 
  animated = true 
}: CompatibilityScoreRingProps) {
  const progress = useSharedValue(0);
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  useEffect(() => {
    if (animated) {
      /* §5.2 restricts `curve.linear` to "progress and loops only", and this ring IS progress. The
         beat before it starts is `dur-moderate` 300 — an EXACT match for the 300 that was already
         here — and the sweep takes `dur-slow` 420, the nearest specified value to 1500 (§0.0 rule 2).
         ⚠️ THIS ONE ANIMATES AN SVG PROP, NOT A STYLE, so `motion-arrival-check`'s layout rule cannot
         see it and does not need to: `strokeDashoffset` is a PAINT property. §18's ban is on layout
         because layout REFLOWS, and a stroke offset does not. */
      progress.value = withDelay(dur.moderate, withTiming(score / 100, { duration: dur.slow, easing: curve.linear }));
    } else {
      progress.value = score / 100;
    }
  }, [score, animated]);
  
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });
  
  // 🔴 O-24 (owner, 2026-07-31): ONE COLOUR — full reasoning in ScoreCard.tsx. The score is
  //    uncalibrated LLM output, so a "worst" hue editorialises about a person; and a hue ladder
  //    would drift accent-2 into a generic second colour (§16). The NUMBER carries the value.
  const getColor = () => t.color.accent;
  
  const color = getColor();
  
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={t.color['border-subtle']}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      
      {/* Score text */}
      <View className="absolute items-center">
        <Text className="text-fg text-5xl font-body-bold">{score}</Text>
        <Text className="text-fg-muted text-lg">%</Text>
      </View>
    </View>
  );
}
