import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useAmbient } from '@/lib/motion';
import * as t from '@/theme';

const { width, height } = Dimensions.get('window');

interface PalmGuideOverlayProps {
  handType: 'dominant' | 'non-dominant';
}

export function PalmGuideOverlay({ handType }: PalmGuideOverlayProps) {
  /* 🔴 THE BREATHE IS `dur-ambient` 2600 AND IT CANCELS ON UNMOUNT. §5.1: 2600 is THE ONLY LOOPING
     DURATION IN THE SYSTEM, so 1500 was not a near miss, it was a value from outside the ramp. The
     curve was `Easing.inOut(Easing.ease)` — an unnamed recipe, one of three different ones live in
     this tree — and it becomes `ease-standard`, which is the named curve for anything that starts
     and ends on screen.
     ⚠️ `UI-audit` §4.1 flagged that neither of the two `withRepeat` loops in this tree had ANY
     teardown: "not a confirmed leak, but worth verifying on device", on a device this project does
     not have. `useAmbient` cancels, so the question is closed rather than deferred. */
  const scale = useAmbient(1, 1.05);

  /* The tip row sits just above the shutter, whose window-edge distance now carries the system inset
     (`palm-capture.tsx`). This one carries the SAME inset or the two overlap on 3-button navigation. */
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));
  
  // Rectangle guide dimensions
  const guideWidth = width * 0.75;
  const guideHeight = height * 0.6;
  
  const handLabel = handType === 'dominant' ? 'Your active traits' : 'Your inherited potential';
  
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Dark overlay with cutout effect */}
      <View style={styles.overlay}>
        {/* Top */}
        <View style={styles.overlaySection} />
        
        {/* Middle with rectangle */}
        <View style={styles.middleSection}>
          <View style={styles.overlaySection} />
          <View style={{ width: guideWidth, height: guideHeight }}>
            {/* Rectangle guide */}
            <Animated.View style={[styles.rectangleGuide, animatedStyle, { width: guideWidth, height: guideHeight }]}>
              {/* Palm lines guides */}
              <View style={[styles.guideLine, { top: '30%' }]} />
              <View style={[styles.guideLine, { top: '50%' }]} />
              <View style={[styles.guideLine, { top: '70%' }]} />
            </Animated.View>
          </View>
          <View style={styles.overlaySection} />
        </View>
        
        {/* Bottom */}
        <View style={styles.overlaySection} />
      </View>
      
      {/* Instructions */}
      <View style={styles.instructionsTop}>
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.instructionText}>
          Place your {handType} palm flat
        </Text>
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.subtitleText}>{handLabel}</Text>
      </View>
      
      <View style={[styles.tipsBottom, { bottom: 150 + insets.bottom }]}>
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.tipText}>Spread fingers • Good lighting • Keep steady</Text>
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
  rectangleGuide: {
    borderRadius: t.radius.lg,
    borderWidth: 3,
    borderColor: t.color['accent-2'],
    borderStyle: 'dashed',
    position: 'relative',
  },
  guideLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: t.color['accent-2'],
    opacity: 0.3,
  },
  instructionsTop: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionText: {
    color: t.color.fg,
    fontSize: t.type['text-lg'].size,
    lineHeight: t.type['text-lg'].lineHeight,
    letterSpacing: t.type['text-lg'].letterSpacing,
    fontFamily: t.family['body-semi'],
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitleText: {
    color: t.color.accent,
    fontSize: t.type['text-sm'].size,
    lineHeight: t.type['text-sm'].lineHeight,
    letterSpacing: t.type['text-sm'].letterSpacing,
    textAlign: 'center',
  },
  tipsBottom: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tipText: {
    color: t.color['fg-muted'],
    fontSize: t.type['text-xs'].size,
    lineHeight: t.type['text-xs'].lineHeight,
    letterSpacing: t.type['text-xs'].letterSpacing,
    textAlign: 'center',
  },
});
