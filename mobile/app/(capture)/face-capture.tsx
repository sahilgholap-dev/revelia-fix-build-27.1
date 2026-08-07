import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import { router } from 'expo-router';
import * as SecureStore from '@/lib/secureStorage';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { curve, dur } from '@/lib/motion';
import { useCamera } from '@/hooks/useCamera';
import { FaceGuideOverlay } from '@/components/capture/FaceGuideOverlay';
import { CaptureInfoModal } from '@/components/capture/CaptureInfoModal';
import { BiometricConsent } from '@/components/common/BiometricConsent';
import { uploadService } from '@/services/upload.service';
import { useProfileStore } from '@/store/profileStore';
import { useReadingsStore } from '@/store/readingsStore';
import { GeneratingReading } from '@/components/readings/GeneratingReading';
import * as t from '@/theme';

export default function FaceCaptureScreen() {
  /* 🔴 THIS SCREEN HAS NO SAFE AREA AT ALL — the camera preview is deliberately full-bleed and every
     control on it is positioned from a window edge. Under Android 16's enforced edge-to-edge the
     window extends behind the system navigation row, so the three window-edge distances below are
     each raised by the real inset. Left as constants, the shutter's lower ~8 and both preview
     buttons sit inside the system row's touch region on 3-button navigation — the funnel's primary
     control, partly untappable. The TOP controls are NOT touched: their distances predate this and
     the status row has always overlaid this screen. */
  const insets = useSafeAreaInsets();
  const [showConsent, setShowConsent] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownValue, setCountdownValue] = useState(0);
  // Soft-fail modal state. When upload returns validation.status='uncertain',
  // pause before runGeneration() to let user choose retake or continue.
  const [showUncertainModal, setShowUncertainModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownScale = useSharedValue(1);

  const { hasPermission, requestPermission, cameraRef, takePicture, isReady, setIsReady } = useCamera({
    facing: 'front'
  });
  
  const { fetchProfile } = useProfileStore();
  const { generateFaceReading } = useReadingsStore();
  
  // Check biometric consent on mount
  useEffect(() => {
    checkConsent();
  }, []);
  
  const checkConsent = async () => {
    const consent = await SecureStore.getItemAsync('biometric_consent_face');
    if (!consent) {
      setShowConsent(true);
    }
  };
  
  const handleConsent = async () => {
    await SecureStore.setItemAsync('biometric_consent_face', 'true');
    setIsReady(false); // Force camera to re-signal readiness after consent dismissal
    setShowConsent(false);
  };
  
  const handleDecline = () => {
    router.back();
  };
  
  const doCapture = useCallback(async () => {
    setIsCapturing(true);
    try {
      const uri = await takePicture();
      if (uri) {
        setCapturedPhoto(uri);
      } else {
        setError('Camera wasn\'t ready. Please try again.');
      }
    } catch (err) {
      console.error('Capture failed:', err);
      setError('Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
      setCountdownActive(false);
    }
  }, [takePicture]);

  const handleCapture = () => {
    if (isCapturing || countdownActive) return;
    setError(null); // Clear any previous error
    setCountdownActive(true);
    setCountdownValue(3);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    /* 🔴 THE INSTANT LEG CARRIES A `SNAP` MARKER, AND THAT IS A RULING RATHER THAN AN ESCAPE HATCH:
       ZERO IS NOT A DURATION, IT IS THE ABSENCE OF ONE. `no-numeric-radius` already accepts exactly
       this argument for a flush square corner — "the scale has five steps and no zero, correctly" —
       and adding a seventh duration token whose value is nothing would put a non-value in the scale.
       The marker is an EXACT-2 set in `motion-arrival-check.js`; both members are in this file.
       ⚠️ The settle was 800ms, which §5.1 has no token for. `dur-slow` 420 is the nearest specified
       value (§0.0 rule 2) and it still finishes well inside the 1000ms countdown tick. */
    countdownScale.value = withSequence(
      withTiming(1.3, { duration: 0 /* SNAP */ }),
      withTiming(1, { duration: dur.slow, easing: curve.enter })
    );

    let remaining = 3;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdownValue(remaining);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        countdownScale.value = withSequence(
          withTiming(1.3, { duration: 0 /* SNAP */ }),
          withTiming(1, { duration: dur.slow, easing: curve.enter })
        );
      } else {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCountdownValue(0);
        doCapture();
      }
    }, 1000);
  };

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const countdownAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countdownScale.value }],
  }));
  
  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedPhoto(result.assets[0].uri);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setError(null);
    setIsReady(false); // Reset so onCameraReady fires again
  };
  
  const [photoUploaded, setPhotoUploaded] = useState(false);

  const runGeneration = async (): Promise<boolean> => {
    setIsGenerating(true);
    setError(null);

    // 180s safety timeout: aligned with the backend/Express ceiling so we
    // don't give up before the server finishes. First-run readings can take
    // 60-110s; this guards against truly hung requests.
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      setError(
        "This is taking longer than expected. Please check your connection and try again."
      );
    }, 180_000);

    try {
      await generateFaceReading();
      clearTimeout(timer);
      if (timedOut) return false;

      const readingsState = useReadingsStore.getState();
      if (readingsState.error) {
        setError(readingsState.error);
        return false;
      }
      return true;
    } catch (err: any) {
      clearTimeout(timer);
      setError(err?.message || 'Failed to generate reading. Please try again.');
      return false;
    }
  };

  const handleRetryGeneration = async () => {
    // Photo already uploaded — just retry the reading endpoint.
    const ok = await runGeneration();
    if (!ok) return;

    const currentProfile = useProfileStore.getState().profile;
    const hasPalmReading = currentProfile?.palmReading || currentProfile?.images?.palmDominant;
    if (hasPalmReading) {
      router.replace('/(main)/readings/face' as any);
    } else {
      router.replace('/(capture)/palm-capture');
    }
  };

  const handleUsePhoto = async () => {
    if (!capturedPhoto) return;

    setIsUploading(true);
    setError(null);

    try {
      if (!photoUploaded) {
        const response = await uploadService.uploadFace(capturedPhoto);
        if (!response.success) {
          throw new Error(response.error || 'Upload failed');
        }
        await fetchProfile();
        setPhotoUploaded(true);

        // Three-state validation: 'uncertain' pauses for user decision.
        // 'valid' (or absent / legacy) proceeds silently as before.
        if (response.data?.validation?.status === 'uncertain') {
          setIsUploading(false);
          setShowUncertainModal(true);
          return;
        }
      }

      setIsUploading(false);

      const ok = await runGeneration();
      if (!ok) return; // Stay on generating screen with error overlay

      // Smart navigation: onboarding vs returning user
      const currentProfile = useProfileStore.getState().profile;
      const hasPalmReading = currentProfile?.palmReading || currentProfile?.images?.palmDominant;

      if (hasPalmReading) {
        router.replace('/(main)/readings/face' as any);
      } else {
        router.replace('/(capture)/palm-capture');
      }
    } catch (err: any) {
      console.error('Upload/generation error:', err);

      // Check for image validation rejection (422)
      if (err.response?.status === 422 && err.response?.data?.error === 'INVALID_IMAGE') {
        const reason = err.response.data.reason;
        const message = err.response.data.message || getValidationErrorMessage('face', reason);
        setError(message);
        setIsUploading(false);
        setIsGenerating(false);
        return;
      }

      setError(err.message || 'Failed to process. Please try again.');
      setIsUploading(false);
      setIsGenerating(false);
    }
  };

  // Soft-fail handlers: invoked when validation came back 'uncertain'.
  // Continue → proceed to runGeneration() with the already-uploaded photo.
  // Retake → drop the photo and return to camera.
  const handleUncertainContinue = async () => {
    setShowUncertainModal(false);
    const ok = await runGeneration();
    if (!ok) return;
    const currentProfile = useProfileStore.getState().profile;
    const hasPalmReading = currentProfile?.palmReading || currentProfile?.images?.palmDominant;
    if (hasPalmReading) {
      router.replace('/(main)/readings/face' as any);
    } else {
      router.replace('/(capture)/palm-capture');
    }
  };

  const handleUncertainRetake = () => {
    setShowUncertainModal(false);
    setCapturedPhoto(null);
    setPhotoUploaded(false);
    setError(null);
    setIsGenerating(false);
  };

  function getValidationErrorMessage(type: 'face' | 'palm', reason?: string): string {
    if (type === 'face') {
      switch (reason) {
        case 'NO_FACE': return "We couldn't detect a face in your photo. Please take a clear, front-facing selfie with good lighting.";
        case 'MULTIPLE_FACES': return "We detected multiple faces. Please take a photo with only your face visible.";
        case 'NOT_HUMAN': return "Please upload a photo of your face. We need a clear human face for your personalized reading.";
        case 'LOW_QUALITY': return "Your photo is a bit unclear. Please retake with better lighting and make sure your face is centered.";
        default: return "We couldn't process this image. Please try again with a clear photo of your face.";
      }
    }
    switch (reason) {
      case 'NO_PALM': return "We couldn't detect a palm in your photo. Please place your open hand palm-up with fingers spread.";
      case 'NOT_PALM': return "This doesn't appear to be a palm photo. Please upload a clear photo of your open palm.";
      case 'WRONG_SIDE': return "It looks like you're showing the back of your hand. Please flip your hand to show your palm.";
      case 'LOW_QUALITY': return "Your palm lines aren't clear enough. Please retake in good lighting with your palm fully open.";
      default: return "We couldn't process this image. Please try again with a clear palm photo.";
    }
  }

  // Permission loading
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator color={t.color.accent} size="large" />
        </View>
      </View>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          {/* P42 (owner ruling, 2026-08-03) — the display steps scale now, and this prop is the
              only way a StyleSheet-held step can honour that: allowFontScaling is a <Text> PROP
              and cannot live in a style object. The gate found all five of these on its first run
              after the ramp flag moved, which is P23's whole lesson repeated one step up. */}
          <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.permissionText}>
            Revelia needs camera access to capture your face photo for readings.
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.primaryButton}>
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.ghostButton}>
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.ghostButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Show generating screen with error recovery
  if (isGenerating) {
    return (
      <View style={{ flex: 1 }}>
        <GeneratingReading type="face" />
        {error && (
          <View style={styles.generatingErrorOverlay}>
            <View style={styles.generatingErrorBox}>
              <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.generatingErrorTitle}>
                {photoUploaded
                  ? 'Photo uploaded — generating reading failed'
                  : 'Something went wrong'}
              </Text>
              <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.generatingErrorText}>{error}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                {photoUploaded ? (
                  <TouchableOpacity
                    onPress={handleRetryGeneration}
                    style={[styles.button, styles.primaryButtonAction, { flex: 1 }]}
                  >
                    <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.primaryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => { setIsGenerating(false); setError(null); setCapturedPhoto(null); }}
                    style={[styles.button, styles.secondaryButton, { flex: 1 }]}
                  >
                    <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.secondaryButtonText}>Retake</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => router.replace('/(main)/home')}
                  style={[styles.button, styles.primaryButtonAction, { flex: 1 }]}
                >
                  <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.primaryButtonText}>Go Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }
  
  // Show consent modal
  if (showConsent) {
    return (
      <BiometricConsent
        visible={showConsent}
        onConsent={handleConsent}
        onDecline={handleDecline}
        type="face"
      />
    );
  }
  
  // Show preview
  if (capturedPhoto) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedPhoto }} style={styles.preview} />

        {error && (
          <View style={styles.errorContainer}>
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Both distances take the same inset, so the prompt keeps its gap above the actions. Raising
            one without the other is what makes them collide. */}
        <View style={[styles.previewPrompt, { bottom: 110 + insets.bottom }]}>
          <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.previewPromptText}>Does your face look clear and centered?</Text>
        </View>

        <View style={[styles.previewActions, { bottom: 40 + insets.bottom }]}>
          <TouchableOpacity
            onPress={handleRetake}
            style={[styles.button, styles.secondaryButton]}
            disabled={isUploading}
          >
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.secondaryButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleUsePhoto}
            style={[styles.button, styles.primaryButtonAction]}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color={t.color.fg} />
            ) : (
              <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.primaryButtonText}>Use Photo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Camera view
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        onCameraReady={() => setIsReady(true)}
      >
        <FaceGuideOverlay instructionOverride={countdownActive ? 'Hold still...' : undefined} />
      </CameraView>

      {/* Error toast on camera view */}
      {error && !countdownActive && (
        <View style={styles.errorContainer}>
          <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Countdown overlay */}
      {countdownActive && countdownValue > 0 && (
        <View style={styles.countdownOverlay}>
          <Animated.Text style={[styles.countdownText, countdownAnimStyle]}>
            {countdownValue}
          </Animated.Text>
        </View>
      )}

      {/* Close button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.closeButton}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      {/* Info button — opens "Why we ask for your face" modal */}
      <TouchableOpacity
        onPress={() => setShowInfoModal(true)}
        style={styles.infoButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="information-circle-outline" size={26} color={t.color['fg-muted']} />
      </TouchableOpacity>

      {/* Bottom controls — the shutter. Its window-edge distance carries the system inset, and the
          guide overlay's tip row carries the same one so the two keep their spacing. */}
      <View style={[styles.bottomControls, { bottom: 40 + insets.bottom }]}>
        {/* Gallery button */}
        <TouchableOpacity onPress={handlePickFromGallery} style={styles.galleryButton} disabled={countdownActive}>
          <Ionicons name="images" size={28} color={t.color.fg} />
        </TouchableOpacity>

        {/* Capture button */}
        <TouchableOpacity
          onPress={handleCapture}
          style={[styles.captureButton, (!isReady || isCapturing || countdownActive) && { opacity: 0.5 }]}
          disabled={!isReady || isCapturing || countdownActive}
        >
          {isCapturing ? (
            <ActivityIndicator color={t.color.fg} size="large" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>

        {/* Spacer for symmetry */}
        <View style={{ width: 50 }} />
      </View>

      {/* Educational modal — opens from the (i) button top-right. */}
      <CaptureInfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        captureType="face"
      />

      {/* Soft-fail modal — shown when validation status is 'uncertain'.
          User chooses retake (drop photo) or continue (proceed to reading). */}
      <Modal
        visible={showUncertainModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUncertainModal(false)}
      >
        <View style={styles.uncertainBackdrop}>
          <View style={styles.uncertainCard}>
            <Ionicons name="alert-circle-outline" size={32} color={t.color.accent} />
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.uncertainTitle}>Photo accepted with limited clarity</Text>
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.uncertainBody}>
              We had some difficulty validating your photo. The reading may be less accurate than usual.
            </Text>
            <TouchableOpacity
              onPress={handleUncertainRetake}
              style={[styles.uncertainBtn, styles.uncertainBtnPrimary]}
            >
              <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.uncertainBtnPrimaryText}>Retake photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleUncertainContinue}
              style={[styles.uncertainBtn, styles.uncertainBtnSecondary]}
            >
              <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.uncertainBtnSecondaryText}>Continue anyway</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.color.bg,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: t.type['display-md'].size,
    lineHeight: t.type['display-md'].lineHeight,
    letterSpacing: t.type['display-md'].letterSpacing,
    fontFamily: t.family.display,
    color: t.color.fg,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
    color: t.color['fg-muted'],
    textAlign: 'center',
    marginBottom: 32,

  },
  preview: {
    flex: 1,
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    backgroundColor: t.alpha(t.color.scrim, 60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: t.color.fg,
    fontSize: 24 /* GLYPH */,
  },
  infoButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    backgroundColor: t.alpha(t.color.scrim, 60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: t.radius.pill,
    backgroundColor: t.alpha(t.color.scrim, 60),
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    // 🔴 THE SHUTTER'S RING WAS A STRUCTURAL BORDER ROLE — 1.51:1 AGAINST A DARK GROUND AND
    //    UNKNOWABLE AGAINST A BRIGHT ONE. A structural border role exists to separate SURFACES,
    //    where being nearly invisible is the point; the ring of the shutter is an ACTIVE control's
    //    boundary. Same finding as signup's consent box and birth-data's handedness pair, third
    //    instance — and here it lands on the one control the whole screen exists for.
    // 🔴 AND palm-capture's COPY OF THIS RULE DIVERGED ON BOTH PROPERTIES: its ring and wash were
    //    the SECONDARY accent, which §16.2 forbids outright on anything that triggers an action.
    //    One control, two screens, two treatments, neither right. They are one treatment now, and
    //    it is the primary accent on both — §16.2: "if clay and iris appear together, clay is the
    //    button."
    // ⚠️ The wash keeps its own alpha rather than the named accent wash: that role is tuned to an
    //    opaque card ground, and this control floats over a LIVE CAMERA FEED — a ground that is
    //    not merely position-dependent (O-73) but RUNTIME-dependent and unbounded, so no contrast
    //    figure can be computed against it at all. What actually makes this control visible is the
    //    OPAQUE INNER DISC below. That is the general rule for this screen family: a control over
    //    a camera feed must carry its own opaque ground.
    width: 80,
    height: 80,
    borderRadius: t.radius.pill,
    backgroundColor: t.alpha(t.color.accent, 30),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: t.color.accent,
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: t.radius.pill,
    backgroundColor: t.color.fg,
  },
  previewActions: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: t.color.accent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: t.radius.pill,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonAction: {
    backgroundColor: t.color.accent,
  },
  secondaryButton: {
    // 🔴 A TRANSPARENT CONTROL OVER A CAPTURED PHOTO HAS NO MEASURABLE CONTRAST AT ALL. This is
    //    the secondary preview action (Retake) and it sat over the just-taken image with no fill
    //    and a 16%-white hairline: 1.51:1 against a dark photo and undefined against a bright
    //    one. Its primary sibling has an accent FILL, so only the secondary was unreadable.
    // 🟢 THE FIX IS THE ONE THIS SCREEN FAMILY'S GROUND FORCES, and it is the same sentence as
    //    the shutter's: a control over imagery must carry its OWN OPAQUE GROUND. The fill is the
    //    surface step `Button`'s secondary variant uses, so this is the primitive's own treatment
    //    rather than a new one — the hairline is kept on top for edge definition, which is what
    //    `Button`'s outline variant contributes. Both figures are now computable.
    // ⚠️ It stays hand-rolled: the adoption contract lists both camera screens as FORBIDDEN for
    //    that primitive, because their controls are sized to the viewfinder.
    backgroundColor: t.color.surface,
    borderWidth: 2,
    borderColor: t.color['border-strong'],
  },
  ghostButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  primaryButtonText: {
    // 🔴 A5, AND IT WAS LIVE ON THE FIRST-RUN FUNNEL. This rule is the label for BOTH
    //    accent-filled controls in this file - `primaryButton` (Grant Permission) and
    //    `primaryButtonAction` (Try Again / Go Home / Use Photo). It carried the plain
    //    foreground on an accent fill: about 2.31:1, failing AA at every size, at four
    //    reachable sites per capture screen.
    // 🔴 AND `uncertainBtnPrimaryText`, TWENTY LINES BELOW IN THIS SAME FILE, ALREADY HAD IT
    //    RIGHT - with a comment explaining the rule this one broke. Same file, two accent
    //    fills, one fixed and one not: that is item 4's finding for the third time, and it is
    //    what duplication does. A fix applied to one control is not a fix.
    // 🔴 `no-white-on-accent` IS STRUCTURALLY BLIND HERE and always was: the fill lives in
    //    one style rule, the label in another TWENTY-ONE lines away, and they are joined only
    //    at a JSX call site. Its window is four lines. It reported nothing before or after.
    color: t.color['on-accent'],
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
    fontFamily: t.family['body-semi'],
  },
  secondaryButtonText: {
    color: t.color.accent,
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
    fontFamily: t.family['body-semi'],
  },
  ghostButtonText: {
    color: t.color['fg-muted'],
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
    fontFamily: t.family['body-semi'],
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  countdownText: {
    fontSize: 96 /* ABOVE-CEILING */,
    fontFamily: t.family['body-bold'],
    color: t.color.fg,
    textShadowColor: t.alpha(t.color.scrim, 60),
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  previewPrompt: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  previewPromptText: {
    color: t.color.fg,
    fontSize: t.type['text-sm'].size,
    lineHeight: t.type['text-sm'].lineHeight,
    letterSpacing: t.type['text-sm'].letterSpacing,
    fontFamily: t.family['body-semi'],
    textAlign: 'center',
    backgroundColor: t.alpha(t.color.scrim, 60),
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: t.radius.lg,
    overflow: 'hidden',
  },
  errorContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: t.color.danger,
    padding: 12,
    borderRadius: t.radius.sm,
  },
  errorText: {
    // 🔴 A5 / R-4, WHICH IS PERMANENT: `errorContainer` is a SOLID danger fill, and the plain
    //    foreground on it is 3.26:1 - the exact ratio Button's own A5 note records as the third
    //    time this defect shipped in this repo. R-4's ruling is a danger fill with an on-accent
    //    label at 5.60:1, and the reason it is permanent is that all three previous instances
    //    came from deriving the colour AT THE SITE, which is what this rule does.
    //    Every consuming site is inside `errorContainer`; there is no non-filled use to break.
    color: t.color['on-accent'],
    fontSize: t.type['text-sm'].size,
    lineHeight: t.type['text-sm'].lineHeight,
    letterSpacing: t.type['text-sm'].letterSpacing,
    textAlign: 'center',
  },
  generatingErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: t.alpha(t.color.scrim, 60),
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  generatingErrorBox: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    padding: 24,
    width: '100%',
  },
  generatingErrorTitle: {
    color: t.color.fg,
    fontSize: t.type['text-lg'].size,
    lineHeight: t.type['text-lg'].lineHeight,
    letterSpacing: t.type['text-lg'].letterSpacing,
    fontFamily: t.family['body-bold'],
    textAlign: 'center',
    marginBottom: 8,
  },
  generatingErrorText: {
    color: t.color['fg-muted'],
    fontSize: t.type['text-sm'].size,
    lineHeight: t.type['text-sm'].lineHeight,
    letterSpacing: t.type['text-sm'].letterSpacing,
    textAlign: 'center',
  },
  uncertainBackdrop: {
    flex: 1,
    backgroundColor: t.alpha(t.color.scrim, 60),
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  uncertainCard: {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  uncertainTitle: {
    color: t.color.fg,
    fontSize: t.type['text-lg'].size,
    lineHeight: t.type['text-lg'].lineHeight,
    letterSpacing: t.type['text-lg'].letterSpacing,
    fontFamily: t.family['body-bold'],
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  uncertainBody: {
    color: t.color['fg-muted'],
    fontSize: t.type['text-sm'].size,
    lineHeight: t.type['text-sm'].lineHeight,
    letterSpacing: t.type['text-sm'].letterSpacing,
    textAlign: 'center',
    marginBottom: 20,

  },
  uncertainBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    marginBottom: 10,
  },
  uncertainBtnPrimary: {
    backgroundColor: t.color.accent,
  },
  uncertainBtnPrimaryText: {
    // A5: this label sits on `uncertainBtnPrimary`, an ACCENT fill -> on-accent.
    color: t.color['on-accent'],
    fontFamily: t.family['body-bold'],
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
  },
  uncertainBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: t.color['border-subtle'],
  },
  uncertainBtnSecondaryText: {
    color: t.color['fg-secondary'],
    fontFamily: t.family['body-semi'],
    fontSize: t.type['text-base'].size,
    lineHeight: t.type['text-base'].lineHeight,
    letterSpacing: t.type['text-base'].letterSpacing,
  },
});
