import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { showAlert } from '@/lib/alert';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { useCompatibilityStore } from '../../../store/compatibilityStore';
import { useAuthStore } from '../../../store/authStore';
import { useProfileStore } from '../../../store/profileStore';
import { router } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useCamera } from '../../../hooks/useCamera';
import { CameraView, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { ActivityIndicator } from 'react-native';
import * as t from '@/theme';
import { openPaywall } from '@/lib/paywall';

type Step = 'intro' | 'info' | 'capture' | 'generating';

export default function CompatibilityScreen() {
  const [step, setStep] = useState<Step>('intro');
  const user = useAuthStore(state => state.user);
  const tier = user?.subscription?.tier || 'free';
  const { readings, fetchReadings, resetFlow, isLoadingReadings } = useCompatibilityStore();
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    resetFlow();
    fetchReadings().then(() => {
      setInitialLoadDone(true);
      setLoadError(false);
    }).catch(() => {
      setInitialLoadDone(true);
      setLoadError(true);
    });
  }, []);

  const remainingFree = tier === 'free' ? Math.max(0, 1 - readings.length) : Infinity;
  
  // Step: Intro
  if (step === 'intro') {
    return (
      <IntroStep
        remainingFree={remainingFree}
        tier={tier}
        onStart={() => setStep('info')}
        onViewHistory={() => router.push('/(main)/compatibility/history' as any)}
        readingsCount={readings.length}
        isLoading={!initialLoadDone}
        loadError={loadError}
        onRetry={() => {
          setInitialLoadDone(false);
          setLoadError(false);
          fetchReadings().then(() => {
            setInitialLoadDone(true);
            setLoadError(false);
          }).catch(() => {
            setInitialLoadDone(true);
            setLoadError(true);
          });
        }}
      />
    );
  }
  
  // Step: Partner Info
  if (step === 'info') {
    return (
      <PartnerInfoStep
        onNext={() => setStep('capture')}
        onBack={() => setStep('intro')}
      />
    );
  }
  
  // Step: Photo Capture
  if (step === 'capture') {
    return (
      <PartnerCaptureStep
        onCaptured={() => setStep('generating')}
        onBack={() => setStep('info')}
      />
    );
  }
  
  // Step: Generating
  if (step === 'generating') {
    return (
      <GeneratingCompatibilityStep
        partnerName={useCompatibilityStore.getState().partnerName}
        onReset={() => {
          // Re-fetch readings to get accurate count after error/success
          setInitialLoadDone(false);
          fetchReadings().then(() => {
            setInitialLoadDone(true);
            setLoadError(false);
          }).catch(() => {
            setInitialLoadDone(true);
            setLoadError(true);
          });
          setStep('intro');
        }}
      />
    );
  }
  
  return null;
}

// Intro Step Component
function IntroStep({ remainingFree, tier, onStart, onViewHistory, readingsCount, isLoading, loadError, onRetry }: {
  remainingFree: number;
  tier: string;
  onStart: () => void;
  onViewHistory: () => void;
  readingsCount: number;
  isLoading: boolean;
  loadError: boolean;
  onRetry: () => void;
}) {
  const { profile } = useProfileStore();
  const userFaceUrl = profile?.images?.face?.url;
  const { relationshipType, setRelationshipType } = useCompatibilityStore();
  const user = useAuthStore(state => state.user);
  const isPremiumPlus = user?.subscription?.tier === 'premium_plus';
  const bottomPad = useBottomInsetPadding();

  return (
    <ScreenContainer withScrollView={false}>
      <ScrollView
        className="flex-1 p-6"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingBottom: bottomPad,
        }}
      >
      <Text className="text-fg text-display-lg font-display mb-4 text-center">
        Compatibility Reading
      </Text>

      <Text className="text-fg-muted text-base mb-8 text-center">
        Discover your cosmic connection with someone special
      </Text>

      {/* Illustration */}
      <View className="items-center mb-8">
        <View className="flex-row items-center">
          <View style={avatarStyles.circle}>
            {userFaceUrl ? (
              <Image source={{ uri: userFaceUrl }} style={avatarStyles.image} />
            ) : (
              <Text style={avatarStyles.fallbackIcon}>👤</Text>
            )}
          </View>
          <Text className="text-4xl mx-3">💫</Text>
          <View style={avatarStyles.circle}>
            <Text style={avatarStyles.fallbackIcon}>❓</Text>
          </View>
        </View>
      </View>

      {/* Relationship Type Selector */}
      {!isLoading && !loadError && (
        <View className="mb-6">
          <Text className="text-fg text-sm font-body-semi mb-3 text-center">
            Relationship Type
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {[
              { key: 'love', icon: '❤️', label: 'Love' },
              { key: 'friend', icon: '🤝', label: 'Friend' },
              { key: 'business', icon: '💼', label: 'Business' },
              { key: 'parent_child', icon: '👨‍👧', label: 'Family' },
            ].map(({ key, icon, label }) => {
              const isSelected = relationshipType === key;
              const isLocked = key !== 'love' && !isPremiumPlus;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    if (isLocked) {
                      showAlert(
                        'Premium Plus Feature',
                        'Non-love relationship types require Premium Plus.',
                        [
                          { text: 'Upgrade', onPress: () => openPaywall('compat-type-locked') },
                          { text: 'Cancel', style: 'cancel' },
                        ]
                      );
                      return;
                    }
                    setRelationshipType(key);
                  }}
                  // 🔴 THE UNSELECTED EDGE IS THE CONTROL-BOUNDARY ROLE — 2026-08-04. These are
                  //    selectable chips whose resting edge is the only thing that draws them, and
                  //    the structural strong neutral reads 1.58:1 against this fill. 3.65:1 now.
                  //    ⚠️ The same swap lands on the sub-type row further down this file; the two
                  //    rows are one control family and were deliberately changed together.
                  // 🟢 The separation to the selected state falls 4.14 -> 1.79 and needs no help:
                  //    the width already steps 1 -> 2 here and the fill goes to an accent wash, so
                  //    the state carries on two non-colour channels. That width step is the
                  //    precedent the field primitive borrowed when its own separation collapsed.
                  style={{
                    backgroundColor: isSelected ? t.alpha(t.color.accent, 60) : t.color['surface-raised'],
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? t.color.accent : t.color['border-control'],
                    borderRadius: t.radius.md,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    opacity: isLocked ? 0.5 : 1,
                  }}
                >
                  <Text style={{ textAlign: 'center' }}>
                    <Text style={{ fontSize: 16 /* GLYPH */ }}>{icon}</Text>
                    {' '}
                    <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color.fg, fontFamily: isSelected ? t.family['body-bold'] : t.family['body-semi'] }}>{label}</Text>
                    {isLocked && <Text style={{ fontSize: 10 /* GLYPH */ }}> 🔒</Text>}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {isLoading ? (
        <View className="items-center mb-6">
          <ActivityIndicator size="small" color={t.color.accent} />
        </View>
      ) : loadError ? (
        <View className="mb-6">
          <Text className="text-fg-muted text-center mb-3">
            Could not load your readings. Please try again.
          </Text>
          <Button
            title="Retry"
            onPress={onRetry}
            variant="secondary"
            fullWidth
          />
        </View>
      ) : (
        <>
          {/* Free user badge */}
          {tier === 'free' && (
            <View className="bg-accent rounded-lg p-4 mb-6">
              <Text className="text-on-accent text-center font-body-semi">
                {remainingFree > 0
                  ? `You have ${remainingFree} free compatibility reading${remainingFree !== 1 ? 's' : ''}`
                  : "You've used your free compatibility reading"}
              </Text>
            </View>
          )}

          {/* Start button */}
          <Button
            title="Start Compatibility Reading"
            onPress={onStart}
            disabled={tier === 'free' && remainingFree === 0}
            fullWidth
          />

          {tier === 'free' && remainingFree === 0 && (
            <View className="mt-4">
              <Button
                title="Unlock Unlimited Readings"
                onPress={() => openPaywall('compat-free-limit-cta')}
                variant="secondary"
                fullWidth
              />
            </View>
          )}

          {/* View history */}
          {readingsCount > 0 && (
            <Button
              title="View Past Readings"
              onPress={onViewHistory}
              variant="secondary"
              fullWidth
              style={{ marginTop: 16 }}
            />
          )}
        </>
      )}
      </ScrollView>
    </ScreenContainer>
  );
}

// Relationship-type-specific labels and sub-type options
const RELATIONSHIP_CONFIG: Record<string, {
  nameLabel: string;
  namePlaceholder: string;
  subTypes?: string[];
  subTypeLabel?: string;
}> = {
  love: { nameLabel: "Partner's Name", namePlaceholder: 'Enter their name' },
  friend: { nameLabel: "Friend's Name", namePlaceholder: "Enter your friend's name" },
  business: {
    nameLabel: "Colleague's Name",
    namePlaceholder: "Enter their name",
    subTypeLabel: 'Work Relationship',
    subTypes: ['Co-founder', 'Manager', 'Teammate', 'Client', 'Business Partner', 'Other'],
  },
  parent_child: {
    nameLabel: "Family Member's Name",
    namePlaceholder: "Enter their name",
    subTypeLabel: 'Relationship',
    subTypes: ['Mother', 'Father', 'Brother', 'Sister', 'Son', 'Daughter', 'Cousin', 'Uncle', 'Aunt', 'Grandparent', 'Other'],
  },
};

// Partner Info Step Component
function PartnerInfoStep({ onNext, onBack }: {
  onNext: () => void;
  onBack: () => void;
}) {
  const bottomPad = useBottomInsetPadding();
  const { setPartnerInfo, relationshipType, relationshipSubType, setRelationshipSubType } = useCompatibilityStore();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [birthTime, setBirthTime] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [birthPlace, setBirthPlace] = useState('');

  const config = RELATIONSHIP_CONFIG[relationshipType] || RELATIONSHIP_CONFIG.love;

  const handleNext = () => {
    if (!name.trim()) {
      showAlert('Name Required', `Please enter the ${config.nameLabel.toLowerCase()}`);
      return;
    }
    if (!birthDate) {
      showAlert('Birth Date Required', "Please enter their birth date for an accurate compatibility reading");
      return;
    }

    setPartnerInfo(
      name.trim(),
      birthDate.toISOString().split('T')[0],
      birthTime || undefined,
      birthPlace.trim() || undefined
    );
    onNext();
  };

  return (
    <ScrollView
      className="flex-1 bg-bg p-6"
      contentContainerStyle={{ paddingBottom: Math.max(120, bottomPad) }}
    >
      {/* Header */}
      <TouchableOpacity onPress={onBack} className="mb-6">
        <Text className="text-accent text-lg">← Back</Text>
      </TouchableOpacity>

      <Text className="text-fg text-2xl font-body-bold mb-6">
        Who would you like to compare with?
      </Text>

      {/* Name input */}
      <Input
        label={config.nameLabel}
        value={name}
        onChangeText={setName}
        placeholder={config.namePlaceholder}
        containerClassName="mb-6"
      />

      {/* Sub-type selector (for family/business) */}
      {config.subTypes && (
        <View className="mb-6">
          <Text className="text-fg text-sm font-body-semi mb-3">
            {config.subTypeLabel}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {config.subTypes.map((st) => {
              const isSelected = relationshipSubType === st;
              return (
                <TouchableOpacity
                  key={st}
                  onPress={() => setRelationshipSubType(isSelected ? null : st)}
                  style={{
                    backgroundColor: isSelected ? t.alpha(t.color.accent, 60) : t.color['surface-raised'],
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? t.color.accent : t.color['border-control'],
                    borderRadius: t.radius.sm,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color.fg, fontFamily: isSelected ? t.family['body-bold'] : t.family.body }}>{st}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Birth date */}
      <View className="mb-6">
        <Text className="text-fg text-sm font-body-semi mb-2">
          Birth Date *
        </Text>
        <Text className="text-fg-muted text-xs mb-3">
          Required for astrological and numerological compatibility analysis
        </Text>

        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          className="bg-surface rounded-lg p-4"
        >
          <Text className="text-fg">
            {birthDate ? birthDate.toLocaleDateString() : 'Select birth date'}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimeField
            value={birthDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setBirthDate(selectedDate);
            }}
            maximumDate={new Date()}
          />
        )}

        {birthDate && (
          <TouchableOpacity onPress={() => setBirthDate(null)} className="mt-2">
            <Text className="text-fg-muted text-sm">Clear date</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Optional birth time */}
      <View className="mb-6">
        <Text className="text-fg text-sm font-body-semi mb-2">
          Birth Time
        </Text>
        <Text className="text-fg-muted text-xs mb-3">
          Optional — improves reading accuracy
        </Text>

        <TouchableOpacity
          onPress={() => setShowTimePicker(true)}
          className="bg-surface rounded-lg p-4"
        >
          <Text className="text-fg">
            {birthTime ? birthTime : 'Select birth time'}
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimeField
            value={(() => {
              if (birthTime) {
                const [h, m] = birthTime.split(':').map(Number);
                const d = new Date();
                d.setHours(h, m, 0, 0);
                return d;
              }
              return new Date();
            })()}
            mode="time"
            display="default"
            onChange={(event, selectedDate) => {
              setShowTimePicker(false);
              if (selectedDate) {
                const hours = selectedDate.getHours().toString().padStart(2, '0');
                const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
                setBirthTime(`${hours}:${minutes}`);
              }
            }}
          />
        )}

        {birthTime && (
          <TouchableOpacity onPress={() => setBirthTime(null)} className="mt-2">
            <Text className="text-fg-muted text-sm">Clear time</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Optional birth place */}
      <View className="mb-6">
        {/* Title and hint move onto the field itself — §9 item 5's required label. The
            placeholder stays because it is an EXAMPLE, not the field's name. */}
        <Input
          label="Birth Place"
          helper="Optional — city or region for enhanced cosmic insights"
          value={birthPlace}
          onChangeText={setBirthPlace}
          placeholder="e.g. New York, London"
          containerClassName=""
        />
      </View>

      {/* Next button */}
      <Button
        title="Next: Add Photo"
        onPress={handleNext}
        disabled={!name.trim()}
        fullWidth
      />
    </ScrollView>
  );
}

// Partner Capture Step Component
function PartnerCaptureStep({ onCaptured, onBack }: {
  onCaptured: () => void;
  onBack: () => void;
}) {
  const { partnerName, setPartnerImage, uploadPartnerImage, isUploading } = useCompatibilityStore();
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const { hasPermission, requestPermission, cameraRef, takePicture, isReady, setIsReady } = useCamera({
    facing: 'front' as CameraType
  });

  const handleTakePhoto = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const uri = await takePicture();
      if (uri) {
        setCapturedPhoto(uri);
        setShowCamera(false);
      }
    } finally {
      setIsCapturing(false);
    }
  };
  
  const handleChooseFromGallery = async () => {
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
  
  const handleUsePhoto = async () => {
    if (!capturedPhoto) return;

    try {
      setPartnerImage(capturedPhoto);
      await uploadPartnerImage();
      onCaptured();
    } catch (error: any) {
      // Handle face validation rejection (422)
      if (error?.response?.status === 422 && error?.response?.data?.error === 'INVALID_IMAGE') {
        const reason = error.response.data.reason;
        const validationMessage = getValidationMessage(reason);
        showAlert(
          'Invalid Photo',
          validationMessage,
          [
            { text: 'Retake', onPress: () => setCapturedPhoto(null) },
            { text: 'Choose Another', onPress: () => { setCapturedPhoto(null); handleChooseFromGallery(); } }
          ]
        );
        return;
      }

      const message = error?.response?.data?.error || error?.message || 'Please try again later';
      if (message.toLowerCase().includes('network') || !error?.response) {
        showAlert(
          'Upload Failed',
          'Network error. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        showAlert('Upload Failed', message);
      }
    }
  };
  
  const getValidationMessage = (reason?: string): string => {
    switch (reason) {
      case 'NO_FACE': return `We couldn't detect a face in the photo. Please take a clear photo of ${partnerName}'s face with good lighting.`;
      case 'MULTIPLE_FACES': return "We detected multiple faces. Please take a photo with only one person visible.";
      case 'NOT_HUMAN': return "This doesn't appear to be a photo of a person. Please upload a clear photo of your partner's face.";
      case 'LOW_QUALITY': return "The photo is a bit unclear. Please retake with better lighting and make sure the face is centered.";
      default: return "We couldn't process this image. Please try again with a clear face photo.";
    }
  };

  const handleOpenCamera = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        showAlert('Camera Permission', 'Camera access is required to take photos');
        return;
      }
    }
    setShowCamera(true);
  };
  
  // Camera view
  if (showCamera) {
    return (
      <View className="flex-1 bg-bg">
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          onCameraReady={() => setIsReady(true)}
        >
          <View className="flex-1">
            <TouchableOpacity onPress={() => setShowCamera(false)} className="absolute top-12 left-6">
              <Text className="text-fg text-2xl">✕</Text>
            </TouchableOpacity>
            
            <View className="absolute bottom-8 left-0 right-0 items-center">
              <Text className="text-fg text-lg mb-4">
                Take a photo of {partnerName}
              </Text>
              <TouchableOpacity
                onPress={handleTakePhoto}
                className="w-20 h-20 rounded-pill bg-accent items-center justify-center"
                style={(!isReady || isCapturing) ? { opacity: 0.5 } : undefined}
                disabled={!isReady || isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator color={t.color.fg} size="large" />
                ) : (
                  <View className="w-16 h-16 rounded-pill bg-fg" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }
  
  // Photo preview
  if (capturedPhoto) {
    return (
      <View className="flex-1 bg-bg">
        <Image source={{ uri: capturedPhoto }} className="flex-1" />
        
        <View className="absolute bottom-8 left-6 right-6 flex-row gap-3">
          <Button
            title="Retake"
            onPress={() => setCapturedPhoto(null)}
            variant="secondary"
            style={{ flex: 1 }}
          />
          <Button
            title="Use Photo"
            onPress={handleUsePhoto}
            style={{ flex: 1 }}
            loading={isUploading}
          />
        </View>
      </View>
    );
  }
  
  // Photo selection
  return (
    <View className="flex-1 bg-bg p-6">
      <TouchableOpacity onPress={onBack} className="mb-6">
        <Text className="text-accent text-lg">← Back</Text>
      </TouchableOpacity>
      
      <Text className="text-fg text-2xl font-body-bold mb-4">
        Add {partnerName}'s Photo
      </Text>
      
      <Text className="text-fg-muted text-base mb-8">
        We'll analyze their face to complete the compatibility reading
      </Text>
      
      <View className="items-center mb-8">
        {/* 🔴 ABOVE-CEILING DIMENSION — pass 3a. A 192×192 circular camera well. Design §4.3 lists
            this key among the five spacing outliers to migrate onto an authoring step; the
            vocabulary tops out at 48dp, so the "migration" would be 192 -> 48, a 75% reduction of a
            circle whose own content is a 60px glyph — i.e. smaller than what it contains. There is
            no target. It is a DIMENSION resolving through the spacing scale, not spacing. O-39. */}
        <View className="w-48 h-48 rounded-pill bg-surface items-center justify-center mb-6">
          <Text className="text-6xl">📷</Text>
        </View>
      </View>
      
      <Button
        title="Take Photo"
        onPress={handleOpenCamera}
        fullWidth
        style={{ marginBottom: 16 }}
      />
      
      <Button
        title="Choose from Gallery"
        onPress={handleChooseFromGallery}
        variant="secondary"
        fullWidth
      />
    </View>
  );
}

// Generating Step Component
function GeneratingCompatibilityStep({ partnerName, onReset }: { partnerName: string; onReset: () => void }) {
  const { generateReading, resetFlow } = useCompatibilityStore();
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Analyzing features...');

  useEffect(() => {
    let mounted = true;

    // Start generation
    generateReading().then(() => {
      // Success — store navigates to results. Reset step so returning to tab shows intro.
      if (mounted) {
        resetFlow();
        onReset();
      }
    }).catch(error => {
      if (!mounted) return;
      const msg = error?.response?.data?.error || error?.message || 'Something went wrong';
      // Check if it's a free tier limit
      if (msg.toLowerCase().includes('free') || msg.toLowerCase().includes('upgrade') || error?.response?.status === 403) {
        showAlert(
          'Free Limit Reached',
          'You\'ve used your free compatibility reading. Upgrade to Premium for unlimited readings!',
          [
            { text: 'Upgrade', onPress: () => { resetFlow(); onReset(); openPaywall('compat-free-limit-alert'); } },
            { text: 'OK', onPress: () => { resetFlow(); onReset(); }, style: 'cancel' }
          ]
        );
      } else {
        showAlert('Generation Failed', msg);
        resetFlow();
        onReset();
      }
    });
    
    // Cycle progress messages
    const messages = [
      `Analyzing ${partnerName}'s features...`,
      'Comparing your cosmic profiles...',
      'Calculating compatibility...',
      'Discovering your connection...',
      'Almost there...'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setMessage(messages[index]);
      setProgress(prev => Math.min(95, prev + 20));
    }, 3000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
  
  return (
    <View className="flex-1 bg-bg items-center justify-center p-6">
      {/* Cosmic animation */}
      {/* 🔴 ABOVE-CEILING DIMENSION — pass 3a. A 128×128 reserved slot for the spinner. §4.3's
          "migrate the outlier onto an authoring step" would make it 48 (−62.5%); the vocabulary has
          nothing above 48dp. A DIMENSION resolving through the spacing scale, not spacing. O-39. */}
      <View className="w-32 h-32 mb-8">
        <ActivityIndicator size="large" color={t.color.accent} />
      </View>
      
      <Text className="text-fg text-xl font-body-semi mb-2 text-center">
        {message}
      </Text>
      
      <View className="w-full bg-border-subtle rounded-pill h-2 mt-4">
        <View
          className="bg-accent h-2 rounded-pill"
          style={{ width: `${progress}%` }}
        />
      </View>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: {
    width: 96,
    height: 96,
    borderRadius: t.radius.pill,
    backgroundColor: t.alpha(t.color.accent, 30),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: t.radius.pill,
  },
  fallbackIcon: {
    fontSize: 40 /* ABOVE-CEILING */,
    lineHeight: 50,
  },
});
