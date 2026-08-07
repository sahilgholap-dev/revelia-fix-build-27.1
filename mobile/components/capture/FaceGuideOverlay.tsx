import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAmbient, curve, dur } from '@/lib/motion';
import * as t from '@/theme';

const { width, height } = Dimensions.get('window');

const INSTRUCTIONS = [
  'Center your face in the oval',
  'Ensure good, even lighting',
  'Look directly at the camera',
  'Keep a neutral expression',
];

interface FaceGuideOverlayProps {
  instructionOverride?: string;
}

export function FaceGuideOverlay({ instructionOverride }: FaceGuideOverlayProps) {
  /* The tip row sits just above the shutter, and the shutter's window-edge distance now carries the
     system inset (`face-capture.tsx`). This one has to carry the SAME inset or the two overlap on
     3-button navigation — the tips are the thing that moves, because the shutter is the control. */
  const insets = useSafeAreaInsets();
  const [tipIndex, setTipIndex] = useState(0);

  // Animated pulse effect
  /* 🔴 THE BREATHE IS `dur-ambient` 2600 AND IT CANCELS ON UNMOUNT. §5.1: 2600 is THE ONLY LOOPING
     DURATION IN THE SYSTEM, so 1500 was not a near miss, it was a value from outside the ramp. The
     curve was `Easing.inOut(Easing.ease)` — an unnamed recipe, one of three different ones live in
     this tree — and it becomes `ease-standard`, which is the named curve for anything that starts
     and ends on screen.
     ⚠️ `UI-audit` §4.1 flagged that neither of the two `withRepeat` loops in this tree had ANY
     teardown: "not a confirmed leak, but worth verifying on device", on a device this project does
     not have. `useAmbient` cancels, so the question is closed rather than deferred. */
  const scale = useAmbient(1, 1.05);
  const tipOpacity = useSharedValue(1);

  // Cycle instructions every 3s
  useEffect(() => {
    if (instructionOverride) return;

    const interval = setInterval(() => {
      /* §5.4 — a colour/opacity cross-fade is `dur-base` 220 on `ease-standard`. 250 was close
         enough to read identically and far enough to be off the ramp, which is exactly the drift a
         token system exists to stop. The text swaps at the trough, so the swap delay tracks the
         fade rather than being tuned separately. */
      tipOpacity.value = withTiming(0, { duration: dur.base, easing: curve.standard }, () => {
        tipOpacity.value = withTiming(1, { duration: dur.base, easing: curve.standard });
      });
      setTimeout(() => {
        setTipIndex(prev => (prev + 1) % INSTRUCTIONS.length);
      }, dur.base);
    }, 3000);

    return () => clearInterval(interval);
  }, [instructionOverride]);

  const tipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tipOpacity.value,
  }));

  const ovalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  // Oval dimensions
  const ovalWidth = width * 0.7;
  const ovalHeight = height * 0.5;

  // Corner bracket positions (relative to screen center)
  const ovalLeft = (width - ovalWidth) / 2;
  const ovalTop = (height - ovalHeight) / 2 - 20; // slight offset for visual center
  const bracketSize = 24;
  const bracketOffset = 10;

  const displayText = instructionOverride || INSTRUCTIONS[tipIndex];
  const isOverride = !!instructionOverride;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Dark overlay with cutout effect */}
      <View style={styles.overlay}>
        {/* Top */}
        <View style={styles.overlaySection} />

        {/* Middle with oval */}
        <View style={styles.middleSection}>
          <View style={styles.overlaySection} />
          <View style={{ width: ovalWidth, height: ovalHeight }}>
            {/* Oval border */}
            <Animated.View style={[styles.ovalBorder, ovalAnimatedStyle, { width: ovalWidth, height: ovalHeight }]}>
              <View style={styles.ovalInner} />
            </Animated.View>
          </View>
          <View style={styles.overlaySection} />
        </View>

        {/* Bottom */}
        <View style={styles.overlaySection} />
      </View>

      {/* Center alignment dot */}
      <View style={styles.centerDot} />

      {/* Corner brackets */}
      {/* Top-left */}
      <View style={[styles.bracket, {
        top: ovalTop - bracketOffset,
        left: ovalLeft - bracketOffset,
        borderTopWidth: 2,
        borderLeftWidth: 2,
      }]} />
      {/* Top-right */}
      <View style={[styles.bracket, {
        top: ovalTop - bracketOffset,
        right: ovalLeft - bracketOffset,
        borderTopWidth: 2,
        borderRightWidth: 2,
      }]} />
      {/* Bottom-left */}
      <View style={[styles.bracket, {
        top: ovalTop + ovalHeight + bracketOffset - bracketSize,
        left: ovalLeft - bracketOffset,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
      }]} />
      {/* Bottom-right */}
      <View style={[styles.bracket, {
        top: ovalTop + ovalHeight + bracketOffset - bracketSize,
        right: ovalLeft - bracketOffset,
        borderBottomWidth: 2,
        borderRightWidth: 2,
      }]} />

      {/* Cycling instruction */}
      <View style={styles.instructionsTop}>
        <Animated.View style={[styles.instructionBadge, tipAnimatedStyle, isOverride && styles.instructionBadgeGreen]}>
          <Text allowFontScaling maxFontSizeMultiplier={1.3} style={[styles.instructionText, isOverride && styles.instructionTextGreen]}>
            {displayText}
          </Text>
        </Animated.View>
      </View>

      <View style={[styles.tipsBottom, { bottom: 140 + insets.bottom }]}>
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.tipText}>
          Tip: Good lighting and a straight-on angle give the best reading
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  overlaySection: {
    flex: 1,
    backgroundColor: t.alpha(t.color.scrim, 60),
  },
  middleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalBorder: {
    borderRadius: t.radius.pill,
    borderWidth: 3,
    borderColor: t.color.accent,
    borderStyle: 'dashed',
  },
  ovalInner: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 6,
    height: 6,
    borderRadius: t.radius.pill,
    backgroundColor: t.color.accent,
    opacity: 0.4,
    marginTop: -23,
    marginLeft: -3,
  },
  bracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: t.color.accent,
    opacity: 0.6,
  },
  instructionsTop: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionBadge: {
    backgroundColor: t.alpha(t.color.scrim, 60),
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: t.radius.lg,
  },
  instructionBadgeGreen: {
    backgroundColor: t.alpha(t.color.success, 30),
  },
  instructionText: {
    color: t.color.fg,
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
    fontFamily: t.family['body-semi'],
    textAlign: 'center',
  },
  instructionTextGreen: {
    color: t.color.success,
  },
  tipsBottom: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  tipText: {
    color: t.color['fg-muted'],
    fontSize: t.type['text-sm'].size,
    lineHeight: t.type['text-sm'].lineHeight,
    letterSpacing: t.type['text-sm'].letterSpacing,
    textAlign: 'center',
  },
});
