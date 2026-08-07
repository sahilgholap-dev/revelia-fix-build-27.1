import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useRouter } from 'expo-router';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { BackButton } from '@/components/ui/BackButton';
import { SunSignReveal } from '@/components/profile/SunSignReveal';
import { useProfileStore } from '@/store/profileStore';
import { useAuthStore } from '@/store/authStore';
import { BirthDataInput } from '@shared/types';
import * as Haptics from 'expo-haptics';
import * as t from '@/theme';
import { Ionicons } from '@expo/vector-icons';

export default function BirthDataScreen() {
  const router = useRouter();
  const { setBirthData, isLoading, error, clearError } = useProfileStore();
  const { user, updateUserName } = useAuthStore();

  // Pre-fill name from auth state, but skip the legacy "User" default and
  // the new "Guest" backend fallback — those aren't the user's real name.
  // The backend's email-local-part fallback (e.g. "Siddharth") DOES pre-fill
  // and the user can confirm or edit. Apple-provided fullName flows here
  // verbatim. If Apple withheld it (returning user, dev re-install), the
  // field is empty/email-fallback and the user must type their real name.
  const initialName =
    user?.name && user.name !== 'User' && user.name !== 'Guest'
      ? user.name
      : '';

  // Form state
  const [name, setName] = useState(initialName);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [birthTime, setBirthTime] = useState<Date | null>(null);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [handedness, setHandedness] = useState<'right' | 'left' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showInfoSection, setShowInfoSection] = useState(false);
  const [nameSubmitting, setNameSubmitting] = useState(false);

  // Sun sign reveal state
  const [showReveal, setShowReveal] = useState(false);
  const [revealData, setRevealData] = useState<any>(null);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Select time (optional)';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const validateBirthDate = (date: Date): boolean => {
    const now = new Date();
    const minDate = new Date();
    minDate.setFullYear(now.getFullYear() - 120);

    if (date > now) {
      showAlert('Invalid Date', 'Birth date cannot be in the future');
      return false;
    }

    if (date < minDate) {
      showAlert('Invalid Date', 'Please enter a valid birth date');
      return false;
    }

    return true;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate && validateBirthDate(selectedDate)) {
      setBirthDate(selectedDate);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setBirthTime(selectedTime);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const trimmedName = name.trim();
  const nameValid =
    trimmedName.length >= 2 &&
    trimmedName.length <= 100 &&
    /^[A-Za-zÀ-ɏ\s'\-.]+$/.test(trimmedName);

  const handleSubmit = async () => {
    if (!nameValid) {
      showAlert(
        'Name Required',
        'Please enter your full name (2-100 characters, letters only).'
      );
      return;
    }
    if (!birthDate || !handedness) {
      showAlert('Required Fields', 'Please fill in your birth date and handedness');
      return;
    }

    try {
      // Persist name FIRST when it differs. updateUserName is a no-op
      // server-side when name matches the stored value (post-trim), so
      // pre-filled-and-confirmed cases don't burn the user's tier slot.
      // For mismatches, the backend runs Haiku validation — surface any
      // rejection to the user before proceeding to birth-data.
      const currentName = (user?.name ?? '').trim();
      if (trimmedName !== currentName) {
        setNameSubmitting(true);
        try {
          await updateUserName(trimmedName);
        } catch (err: any) {
          setNameSubmitting(false);
          const msg =
            err?.response?.data?.error ||
            err?.message ||
            'Could not save your name. Please try again.';
          showAlert('Name Issue', msg);
          return;
        }
        setNameSubmitting(false);
      }

      const birthData: BirthDataInput = {
        date: birthDate.toISOString().split('T')[0], // YYYY-MM-DD
        handedness,
      };

      // Add optional time
      if (birthTime) {
        const hours = birthTime.getHours().toString().padStart(2, '0');
        const minutes = birthTime.getMinutes().toString().padStart(2, '0');
        birthData.time = `${hours}:${minutes}`;
      }

      // Add optional location (simple implementation for MVP)
      if (city && country) {
        birthData.location = {
          city,
          country,
          lat: 0, // Will be enhanced later with geocoding
          lng: 0,
        };
      }

      const calculated = await setBirthData(birthData);

      // Show sun sign reveal
      setRevealData(calculated);
      setShowReveal(true);
    } catch (err: any) {
      showAlert('Error', err.response?.data?.error || 'Failed to save birth data');
    }
  };

  const handleContinue = () => {
    setShowReveal(false);
    router.replace('/(capture)/face-capture');
  };

  const isFormValid = nameValid && birthDate !== null && handedness !== null;

  return (
    <>
      {/* 🔴 O-73's SLAB RETIRES, AND HERE IT CAN GO ENTIRELY. welcome's copy had to keep its
          gradient NODE because X2 forbids replacing it with a plain View; this screen reaches the
          same node through ScreenContainer, whose flag defaults to a flat canvas fill, so
          dropping the two props IS the subtraction — no equal-stop workaround needed.
          Measured down the retired ramp: the meta role fell 5.36:1 -> 5.07:1. Legal at both
          ends, so this is not an AA fix; it is design §2's aura row, which retires every
          gradient slab in the system except the primary control's fill, and the reason it
          matters is that a ground built from a translucent stop has no published contrast
          column, so every figure on it is a claim rather than a measurement (O-66).
          ⚠️ AND THE GUTTER OVERRIDE GOES WITH IT. This screen hand-typed a horizontal padding
          one step below the gutter, so it was the only form in the app inset differently from
          the 25 screens that take the primitive's own token. The number was on the scale but
          not in the ROLE — branch on role, never on value (C-P3a-1). Removing the override is
          what makes the token apply. */}
      <ScreenContainer
        scrollViewProps={{ showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' }}
      >
          {/* Header */}
          <View className="pt-6 pb-8">
            {/* The other screen the review named — and the ONE that proves the guard is required
                rather than tidy. It is pushed from the astrology hub and the profile, and it is
                REPLACED into by the root layout on first run, when there is nothing beneath it.
                A hard-coded arrow would be a dead control on the first screen a new install sees. */}
            <BackButton className="mb-4" />
            {/* 🔴 §17 — this screen's one hero, and the third off-ramp className size the funnel
                phase retires. §17.3 gives a screen title the display hero where no data hero
                exists. The size utility carried no family and no tracking; the step's serif
                arrives from the spread. */}
            <Text {...t.txt('display-lg')} style={{ ...t.txt('display-lg').style, color: t.color.fg }} className="mb-2">
              Tell us about yourself
            </Text>
            {/* §17.1's pairing — the eyebrow step, no mid-ramp step between. String untouched;
                the casing is a textTransform render (C-6). */}
            <Text
              {...t.txt('overline')}
              style={{ ...t.txt('overline').style, color: t.color['fg-muted'], textTransform: 'uppercase' }}
            >
              Your cosmic blueprint begins here
            </Text>
          </View>

          {/* Form */}
          <View className="pb-8">
            {/* Full Name */}
            <Card className="mb-4">
              {/* The card's own title and hint are now the field's own label and helper —
                  §9 item 5 made `label` required, and a second rendering of the same words
                  above the field would be a duplicate name for one control. Both strings are
                  byte-identical to what shipped. */}
              <Input
                label="Full Name"
                required
                helper="Used for personalized readings"
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={100}
                containerClassName="mb-0"
              />
            </Card>

            {/* Birth Date */}
            <Card className="mb-4">
              <Text className="text-fg text-base font-body-semi mb-2">
                When were you born? <Text className="text-danger">*</Text>
              </Text>
              <Text className="text-fg-muted text-sm mb-4">
                Your birth date reveals your cosmic blueprint
              </Text>
              {/* 🔴 A PSEUDO-FIELD IS A FIELD FOR 1.4.11's PURPOSES. It looks like the text input
                  it stands in for, its value is the only thing inside it, and its fill sits 1.08:1
                  off the card behind it — so before this the edge at 1.16:1 was the whole boundary
                  and there effectively was none. This and its sibling below are the two survivors
                  of the placeholder census, where the role genuinely IS a placeholder; that makes
                  the boundary carry MORE weight here, not less, because an unfilled field's only
                  content is deliberately sub-AA copy. Registered as `P62`, closed here. */}
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="bg-bg border border-border-control rounded-md px-4 py-4"
              >
                <Text className={birthDate ? 'text-fg text-base' : 'text-fg-placeholder text-base'}>
                  {formatDate(birthDate)}
                </Text>
              </TouchableOpacity>
            </Card>

            {showDatePicker && (
              <DateTimeField
                value={birthDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}

            {/* Birth Time */}
            <Card className="mb-4">
              <Text className="text-fg text-base font-body-semi mb-2">
                What time were you born?
              </Text>
              <Text className="text-fg-muted text-sm mb-4">
                Optional - provides deeper accuracy
              </Text>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  className="flex-1 bg-bg border border-border-control rounded-md px-4 py-4 mr-2"
                >
                  <Text className={birthTime ? 'text-fg text-base' : 'text-fg-placeholder text-base'}>
                    {formatTime(birthTime)}
                  </Text>
                </TouchableOpacity>
                {/* 🔴 TWO DEFECTS IN ONE FIVE-LINE CONTROL, AND BOTH ARE NAMED CLASSES.
                    (1) O-26 (b) — THE ROLE-vs-DIMENSION CLASS. Its fill was a BORDER token. A
                    token whose name declares a role, used in the wrong dimension, passes every
                    gate: tsc passes, no-legacy-tokens passes (the name is legal), and the A5
                    rule is blind (the name is not an accent). O-26's own note says (b), the
                    block fills, "belongs to the screens phase" and that §2 names no
                    low-emphasis-fill role — so this takes the nearest specified control fill,
                    which is the step Input and Sheet both ground on.
                    (2) 🔴 O-66 — ITS LABEL WAS SUB-AA AND THE MOVE IN (1) WOULD HAVE MADE THAT
                    WORSE. The meta role measures 4.44:1 on that step. This is exactly O-66's
                    warning: the four surface steps sit ~1.05 apart, so one published figure
                    reads as if it covers all four, and the overlay step is where the meta role
                    stops clearing AA. The label moves up one role, to 8.59:1.
                    ⚠️ The two are COUPLED: fixing the fill alone would have moved a 5.36:1 label
                    onto a ground where it measures 4.44:1 — a correct role fix that introduces
                    an AA failure. */}
                {birthTime && (
                  <TouchableOpacity
                    onPress={() => {
                      setBirthTime(null);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className="bg-surface-overlay rounded-pill px-4 py-4 justify-center"
                  >
                    <Text className="text-fg-secondary text-sm font-body">Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>

            {showTimePicker && (
              <DateTimeField
                value={birthTime || new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}

            {/* Birth Location */}
            <Card className="mb-4">
              <Text className="text-fg text-base font-body-semi mb-2">
                Where were you born?
              </Text>
              <Text className="text-fg-muted text-sm mb-4">
                Optional - enhances your reading
              </Text>
              {/* 🔴 The heading above stays: it asks ONE question of TWO controls, so it is a
                  group name, not a field name. Each field takes its own label, and the word
                  each placeholder used to carry is that label now — one string, moved off the
                  weakest foreground in the palette and onto an AA one. */}
              <Input
                label="City"
                value={city}
                onChangeText={setCity}
                containerClassName="mb-2"
              />
              <Input
                label="Country"
                value={country}
                onChangeText={setCountry}
                containerClassName="mb-0"
              />
            </Card>

            {/* Handedness */}
            <Card className="mb-4">
              <Text className="text-fg text-base font-body-semi mb-2">
                Which is your dominant hand? <Text className="text-danger">*</Text>
              </Text>
              <Text className="text-fg-muted text-sm mb-4">
                Used for palm reading accuracy
              </Text>
              {/* 🔴 A REQUIRED TWO-UP CHOICE CONTROL WHOSE UNSELECTED HALF HAD NO VISIBLE
                  BOUNDARY — the same finding as signup's consent checkbox, second instance, and
                  the same unfinished half of the same ruling. "A border indicating SELECTION,
                  FOCUS or ACTIVE state is an ACCENT role" fixes the SELECTED state and says
                  nothing about the resting one. Measured against WCAG 1.4.11's 3:1 for a
                  user-interface component's boundary:

                      the subtle border role   1.16:1   🔴 two points of nothing
                      the meta role            5.36:1   passes

                  So the resting boundary takes the meta role — a NEUTRAL, because the accent is
                  what carries "chosen". Neither structural border token can carry a control
                  boundary anywhere in the app; that is a gap in §2, registered, not patched with
                  an invented token.

                  🔴 AND THE SELECTED WASH WAS AN AD-HOC ALPHA WHERE A NAMED ROLE EXISTS. §2 names
                  the accent wash, and §10.2.3 specifies exactly it for the paywall's selected
                  card. Branch on ROLE, never on VALUE. It is also the BETTER of the two by
                  measurement — the accent label reads 6.00:1 on the named wash against 5.36:1 on
                  the hand-mixed one — so the role fix and the contrast fix are the same edit.

                  ⚠️ ONE CONFLICT RECORDED RATHER THAN RESOLVED SILENTLY: §10.2.3's own cell pairs
                  that wash with the STRONG BORDER role for the paywall's selected card. At
                  1.51:1 that role cannot signal selection, and the owner ruling for this screen
                  is explicit that a selection border is the accent role — 1b shipped three
                  regressions from exactly this. The ruling wins here; the paywall's cell is
                  flagged for screen 7.

                  🔴 AND THE UNSELECTED HALF WAS STILL WRONG AFTER ALL OF THAT — 2026-08-04. The
                  selection ruling above governs the SELECTED state, so applying it correctly
                  still leaves a radio the user cannot see: the resting edge took the META
                  FOREGROUND role as the nearest specified value, which is `O-39`'s role-DIMENSION
                  error (a text token doing a border's job) and was the only remaining reason a
                  foreground token appeared as a border anywhere in this tree. It is now the
                  control-boundary role, 4.07:1 on this ground, and the separation between the two
                  states RISES here (1.36 -> 1.79) because the accent wash and the label weight
                  both change with it. */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setHandedness('right');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: handedness === 'right' }}
                  className={`flex-1 rounded-md py-4 border-2 ${
                    handedness === 'right'
                      ? 'bg-accent-muted border-accent'
                      : 'bg-bg border-border-control'
                  }`}
                >
                  <Text
                    className={`text-center font-body-semi ${
                      handedness === 'right' ? 'text-accent' : 'text-fg-muted'
                    }`}
                  >
                    Right-handed
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setHandedness('left');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: handedness === 'left' }}
                  className={`flex-1 rounded-md py-4 border-2 ${
                    handedness === 'left'
                      ? 'bg-accent-muted border-accent'
                      : 'bg-bg border-border-control'
                  }`}
                >
                  <Text
                    className={`text-center font-body-semi ${
                      handedness === 'left' ? 'text-accent' : 'text-fg-muted'
                    }`}
                  >
                    Left-handed
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Why we need this */}
            <TouchableOpacity
              onPress={() => setShowInfoSection(!showInfoSection)}
              className="mb-6"
            >
              <View className="flex-row items-center justify-center">
                <Text className="text-accent text-sm font-body-semi">
                  Why we need this information
                </Text>
                <Ionicons
                  name={showInfoSection ? 'caret-up' : 'caret-down'}
                  size={20}
                  color={t.color.accent}
                  accessibilityLabel={showInfoSection ? 'Collapse' : 'Expand'}
                  style={{ marginLeft: 8 }}
                />
              </View>
            </TouchableOpacity>

            {showInfoSection && (
              <Card className="mb-6">
                <Text className="text-fg text-sm font-body-semi mb-3">
                  Your Personal Cosmic Data
                </Text>
                <Text className="text-fg-muted text-sm mb-3">
                  • <Text className="font-body-semi">Birth Date:</Text> Calculates your sun sign and life path number
                </Text>
                <Text className="text-fg-muted text-sm mb-3">
                  • <Text className="font-body-semi">Birth Time:</Text> Provides more accurate astrological insights
                </Text>
                <Text className="text-fg-muted text-sm mb-3">
                  • <Text className="font-body-semi">Birth Location:</Text> Enhances reading precision
                </Text>
                <Text className="text-fg-muted text-sm">
                  • <Text className="font-body-semi">Handedness:</Text> Essential for accurate palm reading analysis
                </Text>
              </Card>
            )}

            {/* Error Message */}
            {/* 🔴 `error` IS NOT A TOKEN — the role name is `danger` (§2 row 20). All three
                classes here resolved to NOTHING: NativeWind drops an unresolvable utility
                silently, so this banner rendered with no fill, no border colour and RN's
                default near-black text on the dark canvas. Pre-existing on `main`, and unseen
                by every gate: `no-legacy-tokens` enumerates names it was told to look for and
                `error` was never in the list — the same enumeration-incompleteness class as
                `orange`. Found by comparing source classNames against the RESOLVED rule set,
                which is the only layer that can see a class that no longer resolves.
                §2.1's prohibition does not bite: the ground is the screen canvas, not
                `surface-overlay`.
                🔴 AND AT SCREEN 4 IT TOOK design §10.2.5's SPECIFIED TREATMENT, which is the only
                place in the design an inline error strip IS specified: a 1px danger BORDER on a
                surface step, message in the PLAIN foreground — "never in danger". The border was
                already right. What changed is the ground (an ad-hoc alpha, whose composite has no
                published contrast column) and the message's role, which measured 4.68:1 on that
                ground: legal, but 0.18 over AA, and §2.1 bans the same role as text one surface
                step over at 4.28:1. The message now reads 16.04:1. signup's identical strip took
                the same treatment at screen 3, so the two error surfaces on the funnel agree. */}
            {error && (
              <View
                className="rounded-md border p-4 mb-4"
                style={{ backgroundColor: t.color.surface, borderColor: t.color.danger }}
              >
                <Text className="text-fg text-sm font-body">{error}</Text>
              </View>
            )}

            {/* Submit Button */}
            <Button
              title="Continue"
              onPress={handleSubmit}
              disabled={!isFormValid || nameSubmitting}
              loading={isLoading || nameSubmitting}
              fullWidth
              size="lg"
            />
          </View>
      </ScreenContainer>

      {/* Sun Sign Reveal Modal */}
      {revealData && (
        <SunSignReveal
          visible={showReveal}
          sunSign={revealData.sunSign}
          sunSignTraits={revealData.sunSignTraits}
          lifePathNumber={revealData.lifePathNumber}
          lifePathMeaning={revealData.lifePathMeaning}
          onContinue={handleContinue}
        />
      )}
    </>
  );
}
