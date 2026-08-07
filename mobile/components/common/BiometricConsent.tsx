import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as t from '@/theme';

interface BiometricConsentProps {
  visible: boolean;
  onConsent: () => void;
  onDecline?: () => void;
  type: 'face' | 'palm';
}

export function BiometricConsent({ visible, onConsent, onDecline, type }: BiometricConsentProps) {
  const title = type === 'face' ? 'Face Photo' : 'Palm Photo';
  const description = type === 'face' 
    ? 'your face photo to create personalized face readings'
    : 'your palm photo to create personalized palm readings';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 🔴 `O-103` / `P79` — THE OPAQUE GROUND MOVED OFF THE STOP LIST AND UNDER IT.
              The ramp used to run from the opaque canvas step to a 10% accent tint, i.e. a
              translucent stop paired with an OPAQUE stop of a different hue — which is exactly the
              shape `O-103` rules against, and it renders TWO different ways. Straight-alpha
              interpolation lerps the colour toward accent while the alpha falls, so mid-span it
              BULGES to a band lighter than either end and took the muted role on this sheet to
              3.35:1. Premultiplied does not. The ground is now an opaque `backgroundColor` BENEATH
              the ramp and both stops are ONE HUE, so the two models agree to the byte, the endpoints
              are unchanged, and the worst point on the span is 4.72:1 for the muted role. */}
          <LinearGradient
            colors={[t.alpha(t.color.accent, 0), t.alpha(t.color.accent, 10)]}
            style={[styles.gradient, { backgroundColor: t.color.bg }]}
          >
            <ScrollView 
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🔒</Text>
              </View>

              {/* Title */}
              {/* P42 — the display steps scale; the prop belongs at the element, not the style. */}
              <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.title}>Your Privacy Matters</Text>

              {/* Description */}
              <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.description}>
                Revelia uses {description}.
              </Text>

              {/* Privacy Points */}
              <View style={styles.privacyPoints}>
                <View style={styles.point}>
                  <Text style={styles.bullet}>•</Text>
                  <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.pointText}>
                    Photos are encrypted and stored securely
                  </Text>
                </View>
                
                <View style={styles.point}>
                  <Text style={styles.bullet}>•</Text>
                  <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.pointText}>
                    We never share your images with third parties
                  </Text>
                </View>
                
                <View style={styles.point}>
                  <Text style={styles.bullet}>•</Text>
                  <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.pointText}>
                    You can delete your data anytime
                  </Text>
                </View>
              </View>

              {/* Footer Note */}
              <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.footerNote}>
                Your photo is used only for generating your personal readings.
              </Text>

              {/* Buttons */}
              <View style={styles.buttons}>
                <TouchableOpacity
                  onPress={onConsent}
                  style={styles.consentButton}
                  activeOpacity={0.8}
                >
                  {/* 🔴 `P77`'s SECOND INSTANCE, found by the A6 rule on its first run — the same
                      defect as X3's Button one file over, and NOT the same fix as the ramp above.
                      Here the whole ramp is ONE HUE already; what was wrong was its RANGE. The dark
                      end sat at 60%, which composites to 3.11:1 on the canvas and 3.57:1 even on the
                      lightest opaque step, against the on-fill label this control centres on top of
                      it. Clamped to 80% — the lowest step on the 5-step opacity scale that clears
                      4.5:1 over EVERY ground (4.72 on the canvas, 5.03 on the lightest). The
                      direction, the stop count and the pill are untouched. */}
                  <LinearGradient
                    colors={[t.alpha(t.color.accent, 80), t.color.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.consentButtonText}>
                      I Understand & Consent
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {onDecline && (
                  <TouchableOpacity
                    onPress={onDecline}
                    style={styles.declineButton}
                    activeOpacity={0.7}
                  >
                    <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.declineButtonText}>Not Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: t.alpha(t.color.scrim, 85),
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: t.radius.lg,
    overflow: 'hidden',
  },
  gradient: {
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: t.radius.pill,
    backgroundColor: t.alpha(t.color.accent, 10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40 /* GLYPH */,
  },
  title: {
    fontSize: t.type['display-md'].size,
    lineHeight: t.type['display-md'].lineHeight,
    letterSpacing: t.type['display-md'].letterSpacing,
    fontFamily: t.family.display,
    color: t.color.fg,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
    color: t.color['fg-secondary'],
    textAlign: 'center',
    marginBottom: 24,
  },
  privacyPoints: {
    width: '100%',
    marginBottom: 24,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bullet: {
    fontSize: 20 /* GLYPH */,
    color: t.color.accent,
    marginRight: 12,
    marginTop: -2,
  },
  pointText: {
    flex: 1,
    fontSize: t.type['text-sm'].size,
    lineHeight: t.type['text-sm'].lineHeight,
    letterSpacing: t.type['text-sm'].letterSpacing,
    color: t.color['fg-secondary'],
  },
  footerNote: {
    fontSize: t.type['text-xs'].size,
    lineHeight: t.type['text-xs'].lineHeight,
    letterSpacing: t.type['text-xs'].letterSpacing,
    color: t.color['fg-muted'],
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: t.family.quote,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  consentButton: {
    width: '100%',
    borderRadius: t.radius.pill,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  consentButtonText: {
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
    fontFamily: t.family['body-semi'],
    // A5: this label sits on an accent-filled LinearGradient (ENTRY 6 row 16).
    color: t.color['on-accent'],
  },
  declineButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
    fontFamily: t.family['body-semi'],
    color: t.color['fg-muted'],
  },
});
