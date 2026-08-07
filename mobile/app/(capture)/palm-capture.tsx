import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView } from 'expo-camera';
import { router } from 'expo-router';
import * as SecureStore from '@/lib/secureStorage';
import { useCamera } from '@/hooks/useCamera';
import { PalmGuideOverlay } from '@/components/capture/PalmGuideOverlay';
import { CaptureInfoModal } from '@/components/capture/CaptureInfoModal';
import { BiometricConsent } from '@/components/common/BiometricConsent';
import { uploadService } from '@/services/upload.service';
import { useProfileStore } from '@/store/profileStore';
import { useAuthStore } from '@/store/authStore';
import { useReadingsStore } from '@/store/readingsStore';
import { GeneratingReading } from '@/components/readings/GeneratingReading';
import * as t from '@/theme';

type CaptureStep = 'dominant' | 'non-dominant';

export default function PalmCaptureScreen() {
  /* Same reasoning as face-capture, and the same two distances: a full-bleed camera preview with no
     safe area, so under Android 16's enforced edge-to-edge the window-edge distances have to carry
     the real system inset or the shutter and both preview buttons sit inside the system row. */
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<CaptureStep>('dominant');
  const [showConsent, setShowConsent] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  // Soft-fail modal — same pattern as face-capture. Shown when validation
  // status came back 'uncertain'.
  const [showUncertainModal, setShowUncertainModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const { hasPermission, requestPermission, cameraRef, takePicture, isReady, setIsReady, permissionError } = useCamera({
    facing: 'back'
  });
  
  // Stable selectors instead of whole-store destructure. Subscribing to the
  // entire profile object (as we did before) caused palm-capture to
  // re-render every time any profileStore field changed — including the
  // parallel profile fetches kicked off by Profile screen and _layout.tsx
  // when the user navigates Profile → Retake Palm. Re-renders during
  // <CameraView> mount can drop the iOS native onCameraReady callback,
  // leaving isReady stuck at false (the intermittent grayed-shutter bug).
  // Face-capture doesn't subscribe to `profile`, which is why it doesn't
  // reproduce. We mirror that pattern here.
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const handedness: 'right' | 'left' = useProfileStore(
    (s) => (s.profile?.handedness === 'left' ? 'left' : 'right')
  );
  const user = useAuthStore((state) => state.user);
  const { generatePalmReading } = useReadingsStore();
  const tier = user?.subscription?.tier || 'free';
  
  // Check biometric consent on mount
  useEffect(() => {
    checkConsent();
  }, []);
  
  const checkConsent = async () => {
    const consent = await SecureStore.getItemAsync('biometric_consent_palm');
    if (!consent) {
      setShowConsent(true);
    }
  };
  
  const handleConsent = async () => {
    await SecureStore.setItemAsync('biometric_consent_palm', 'true');
    // Force camera to re-signal readiness after consent dismissal —
    // mirrors face-capture. Without this the iOS production camera mounted
    // behind the modal can leave isReady=false indefinitely, leaving the
    // shutter button disabled.
    setIsReady(false);
    setShowConsent(false);
  };
  
  const handleDecline = () => {
    router.back();
  };
  
  const handleCapture = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const uri = await takePicture();
      if (uri) {
        setCapturedPhoto(uri);
      }
    } finally {
      setIsCapturing(false);
    }
  };
  
  const handleRetake = () => {
    setCapturedPhoto(null);
    setError(null);
    setIsReady(false); // Reset so onCameraReady fires again
  };
  
  const runPalmGeneration = async (hand: 'dominant' | 'non-dominant'): Promise<boolean> => {
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
      await generatePalmReading(hand);
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

  const handleRetryPalmGeneration = async () => {
    const hand = step === 'dominant' ? 'dominant' : 'non-dominant';
    const ok = await runPalmGeneration(hand);
    if (!ok) return;

    if (step === 'dominant') {
      const hadPalmReading = useProfileStore.getState().profile?.palmReading != null;
      if (hadPalmReading) {
        router.replace('/(main)/readings/palm' as any);
      } else if (tier === 'free') {
        const hasFaceReading = useReadingsStore.getState().faceReading || useProfileStore.getState().profile?.faceReading;
        if (hasFaceReading) router.replace('/(main)/home');
        else router.replace('/(main)/readings/palm' as any);
      } else {
        setIsGenerating(false);
        setCapturedPhoto(null);
        setPhotoUploaded(false);
        setStep('non-dominant');
      }
    } else {
      router.replace('/(main)/readings/palm' as any);
    }
  };

  const handleUsePhoto = async () => {
    if (!capturedPhoto) return;

    setIsUploading(true);
    setError(null);

    try {
      const isDominant = step === 'dominant';
      if (!photoUploaded) {
        const response = await uploadService.uploadPalm(capturedPhoto, isDominant);
        if (!response.success) {
          throw new Error(response.error || 'Upload failed');
        }
        await fetchProfile();
        setPhotoUploaded(true);

        // Three-state validation: 'uncertain' pauses for user decision.
        // Continue path resumes from runPalmGeneration via handleUncertainContinue.
        if (response.data?.validation?.status === 'uncertain') {
          setIsUploading(false);
          setShowUncertainModal(true);
          return;
        }
      }

      // After dominant photo uploaded
      if (step === 'dominant') {
        setIsUploading(false);
        const ok = await runPalmGeneration('dominant');
        if (!ok) return;

        if (tier === 'free') {
          // Check if this was an update (user already had a palm reading)
          const hadPalmReading = useProfileStore.getState().profile?.palmReading != null;
          if (hadPalmReading) {
            // Update flow: go to palm reading results
            router.replace('/(main)/readings/palm' as any);
          } else {
            // Onboarding flow: go to home if face reading exists
            const hasFaceReading = useReadingsStore.getState().faceReading || useProfileStore.getState().profile?.faceReading;
            if (hasFaceReading) {
              router.replace('/(main)/home');
            } else {
              router.replace('/(main)/readings/palm' as any);
            }
          }
        } else {
          // Premium users: capture non-dominant
          setIsGenerating(false);
          setCapturedPhoto(null);
          setPhotoUploaded(false);
          setStep('non-dominant');
        }
      } else {
        // After non-dominant uploaded, generate and show reading
        setIsUploading(false);
        const ok2 = await runPalmGeneration('non-dominant');
        if (!ok2) return;

        // Always go to palm results after non-dominant hand
        router.replace('/(main)/readings/palm' as any);
      }
    } catch (err: any) {
      console.error('Upload/generation error:', err);

      // Check for image validation rejection (422)
      if (err.response?.status === 422 && err.response?.data?.error === 'INVALID_IMAGE') {
        const reason = err.response.data.reason;
        const message = err.response.data.message || getValidationErrorMessage('palm', reason);
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

  // Soft-fail handlers — invoked from the 'uncertain' modal.
  // Continue: resumes the post-upload navigation logic for the current step.
  // Retake: drops the photo and returns to the camera (within the same step).
  const handleUncertainContinue = async () => {
    setShowUncertainModal(false);
    if (step === 'dominant') {
      const ok = await runPalmGeneration('dominant');
      if (!ok) return;
      if (tier === 'free') {
        const hadPalmReading = useProfileStore.getState().profile?.palmReading != null;
        if (hadPalmReading) {
          router.replace('/(main)/readings/palm' as any);
        } else {
          const hasFaceReading =
            useReadingsStore.getState().faceReading ||
            useProfileStore.getState().profile?.faceReading;
          if (hasFaceReading) {
            router.replace('/(main)/home');
          } else {
            router.replace('/(main)/readings/palm' as any);
          }
        }
      } else {
        setIsGenerating(false);
        setCapturedPhoto(null);
        setPhotoUploaded(false);
        setStep('non-dominant');
      }
    } else {
      const ok2 = await runPalmGeneration('non-dominant');
      if (!ok2) return;
      router.replace('/(main)/readings/palm' as any);
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

  // Permission still resolving — block camera mount until we know.
  // Without this guard, iOS production can mount <CameraView> while
  // permission is null, the camera renders in a non-functional state,
  // and `onCameraReady` may never fire — leaving the shutter disabled.
  // Mirrors face-capture's pattern.
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
          {/* P42 — see face-capture.tsx: a StyleSheet-held display step needs the prop at the
              JSX boundary, because a style object cannot carry one. */}
          <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.permissionText}>
            Revelia needs camera access to capture your palm photo for readings.
          </Text>
          {/* A refused request must SAY something. expo-camera's web path maps an
              insecure origin, a site-blocked camera and a missing camera onto one
              identical `denied` result, so without this line the screen re-renders
              unchanged and the button reads as broken. Null on native, where the OS
              dialog is its own explanation. */}
          {permissionError ? (
            <Text
              allowFontScaling
              maxFontSizeMultiplier={1.3}
              style={styles.permissionText}
            >
              {permissionError}
            </Text>
          ) : null}
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
  
  // Show generating screen with cancel option
  if (isGenerating) {
    return (
      <View style={{ flex: 1 }}>
        <GeneratingReading type="palm" />
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
                    onPress={handleRetryPalmGeneration}
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
        type="palm"
      />
    );
  }
  
  // Show preview
  if (capturedPhoto) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedPhoto }} style={styles.preview} resizeMode="contain" />
        
        {error && (
          <View style={styles.errorContainer}>
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.errorText}>{error}</Text>
          </View>
        )}
        
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
        facing="back"
        onCameraReady={() => setIsReady(true)}
      >
        <PalmGuideOverlay handType={step} />
      </CameraView>
      
      {/* Close button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.closeButton}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      {/* Info button — opens "Why we ask for your palm" modal */}
      <TouchableOpacity
        onPress={() => setShowInfoModal(true)}
        style={styles.infoButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="information-circle-outline" size={26} color={t.color['fg-muted']} />
      </TouchableOpacity>

      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.stepText}>
          {step === 'dominant' ? 'Step 1 of ' + (tier === 'free' ? '1' : '2') : 'Step 2 of 2'}
        </Text>
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.stepLabel}>
          {step === 'dominant' ? 'Dominant Hand' : 'Non-Dominant Hand'}
        </Text>
      </View>
      
      {/* Capture button — window-edge distance plus the system inset, matched by the guide overlay's
          tip row so the two keep their spacing. */}
      <View style={[styles.captureContainer, { bottom: 40 + insets.bottom }]}>
        <TouchableOpacity
          onPress={handleCapture}
          style={[styles.captureButton, (!isReady || isCapturing) && { opacity: 0.5 }]}
          disabled={!isReady || isCapturing}
        >
          {isCapturing ? (
            <ActivityIndicator color={t.color.fg} size="large" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>
      </View>

      {/* Educational modal — opens from the (i) button top-right. */}
      <CaptureInfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        captureType="palm"
      />

      {/* Soft-fail modal — same UX as face-capture. */}
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
  closeText: {
    color: t.color.fg,
    fontSize: 24 /* GLYPH */,
  },
  stepIndicator: {
    position: 'absolute',
    top: 54,
    left: 60,
    right: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  stepText: {
    color: t.color['fg-muted'],
    fontSize: t.type['text-xs'].size,
    lineHeight: t.type['text-xs'].lineHeight,
    letterSpacing: t.type['text-xs'].letterSpacing,
    marginBottom: 2,
  },
  stepLabel: {
    color: t.color.fg,
    fontSize: t.type['text-lg'].size,
    lineHeight: t.type['text-lg'].lineHeight,
    letterSpacing: t.type['text-lg'].letterSpacing,
    fontFamily: t.family['body-semi'],
  },
  captureContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    // 🔴 THE SHUTTER IS THE ACTION, SO IT CANNOT BE THE SECONDARY ACCENT. §16.2's rule is
    //    greppable and unconditional: the secondary accent "is never the colour of an element
    //    that triggers an action", and "if clay and iris appear together, clay is the button".
    //    This control was the iris on BOTH its ring and its wash — on the single most important
    //    control in the capture flow. §16.1's own list is long-form / generated / premium-depth
    //    CONTENT; a shutter is none of those. It is the same decorative "palm is iris"
    //    convention welcome's feature list carried at screen 2, and §16 exists to remove it.
    // 🔴 AND FACE-CAPTURE'S COPY OF THIS RULE DIVERGED FROM IT ON BOTH PROPERTIES — one screen's
    //    shutter was the iris, the other's ring was a structural neutral. One control, two
    //    screens, two treatments, and neither was right. They are one treatment now.
    // ⚠️ THE WASH STAYS AT ITS OWN ALPHA RATHER THAN TAKING THE NAMED accent-muted ROLE, AND
    //    THAT IS DELIBERATE. The named wash is tuned to read on an opaque card ground; this
    //    control floats over a LIVE CAMERA FEED, i.e. a ground that is not merely
    //    position-dependent (O-73) but RUNTIME-dependent and unbounded. At the named wash's
    //    alpha it would disappear against a bright frame. Its alpha sits on the 5-step scale,
    //    which is what alpha() requires.
    // 🔴 AND WHAT ACTUALLY MAKES THIS CONTROL VISIBLE IS THE OPAQUE INNER DISC BELOW, NOT ANY
    //    OF THIS. That is the general rule for this screen family: no contrast figure can be
    //    computed against a camera feed, so a control over one must carry its own opaque ground.
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
    // 🔴 THE SECOND COPY OF THE SAME DEFECT — a transparent control over a captured photo, i.e.
    //    over arbitrary imagery, so it has no measurable contrast: 1.51:1 against a dark photo and
    //    undefined against a bright one. Its primary sibling has an accent FILL, so only the
    //    secondary was unreadable. The fill is the surface step `Button`'s secondary variant uses,
    //    so this is the primitive's treatment rather than a new one, with the hairline kept on top
    //    for edge definition. Same sentence as the shutter's: a control over imagery must carry
    //    its own opaque ground.
    // ⚠️ Hand-rolled by ruling — the adoption contract lists both camera screens as FORBIDDEN for
    //    that primitive.
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
