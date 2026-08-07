import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as t from '@/theme';

interface CaptureInfoModalProps {
  visible: boolean;
  onClose: () => void;
  captureType: 'face' | 'palm';
}

interface SectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

function Section({ icon, title, body }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={t.color.accent} />
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

export function CaptureInfoModal({ visible, onClose, captureType }: CaptureInfoModalProps) {
  const isFace = captureType === 'face';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            {/* P42 — the display steps scale from 2026-08-03 and the prop cannot live in the
                style object that carries the step. */}
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.title}>
              Why we ask for your {isFace ? 'face' : 'palm'}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color={t.color['fg-muted']} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Section
              icon="sparkles"
              title="What we analyze"
              body={
                isFace
                  ? "Revelia's AI vision examines facial proportions, expressions, and features that traditional physiognomy connects to personality archetypes — patterns observed across centuries of practice."
                  : "Revelia's AI vision examines the shape of your palm and the major lines (heart, head, life, fate) that traditional palmistry connects to your story and tendencies."
              }
            />
            <Section
              icon="shield-checkmark"
              title="What we don't do"
              body="No facial recognition. No biometric matching. No identity verification. We don't share your photo with third parties or use it for advertising. Your photo is for your reading only."
            />
            <Section
              icon="lock-closed"
              title="Where it's stored"
              body="Encrypted on Cloudflare R2 secure storage. Only you and our reading service have access. You control deletion at any time from Profile → Account."
            />
            <Section
              icon="trash"
              title="If you change your mind"
              body="Delete your photo from Profile → Account → Delete Photo. Or delete your entire account from Profile → Delete Account, which removes all your data permanently."
            />
          </ScrollView>

          <Pressable style={styles.cta} onPress={onClose}>
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.ctaText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: t.alpha(t.color.scrim, 60),
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: t.color.fg,
    fontSize: t.type['display-sm'].size,
    lineHeight: t.type['display-sm'].lineHeight,
    letterSpacing: t.type['display-sm'].letterSpacing,
    fontFamily: t.family.display,
    flex: 1,
    marginRight: 12,
  },
  body: {
    flexGrow: 0,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  sectionTitle: {
    color: t.color.fg,
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
    fontFamily: t.family['body-semi'],
  },
  sectionBody: {
    color: t.color['fg-muted'],
    fontSize: t.type['text-sm'].size,
    lineHeight: t.type['text-sm'].lineHeight,
    letterSpacing: t.type['text-sm'].letterSpacing,
  },
  cta: {
    marginTop: 8,
    backgroundColor: t.color.accent,
    paddingVertical: 14,
    borderRadius: t.radius.pill,
    alignItems: 'center',
  },
  ctaText: {
    // 🔴 A5: `cta` above is an accent FILL, so the only legal foreground is on-accent. This
    //    was the plain foreground at about 2.31:1 - failing AA at every size, on a modal the
    //    first-run capture flow opens. Found by joining the fill rule to the label rule across
    //    the seven lines between them, which is a join no proximity grep in this tree can make.
    color: t.color['on-accent'],
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
    fontFamily: t.family['body-bold'],
  },
});

export default CaptureInfoModal;
