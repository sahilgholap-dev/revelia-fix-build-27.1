import React, { useState } from 'react';
import { View, Text, Platform, TouchableOpacity, Linking } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { BackButton } from '@/components/ui/BackButton';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import * as t from '@/theme';

// Guarded require for expo-apple-authentication. The original top-level
// `import * as AppleAuthentication` crashed silently on iOS production
// when the native module failed to initialize. The require + try/catch
// lets the screen render even if the module is missing.
let AppleAuth: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AppleAuth = require('expo-apple-authentication');
} catch {
  // Apple Sign In unavailable — button just won't show.
}

export default function Signup() {
  const router = useRouter();
  const { signup, loginWithApple, loginWithGoogle, isLoading, error, clearError } = useAuthStore();
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  // Check if Apple Sign In is available
  React.useEffect(() => {
    if (Platform.OS === 'ios' && AppleAuth?.isAvailableAsync) {
      AppleAuth.isAvailableAsync()
        .then((avail: boolean) => setIsAppleAvailable(avail))
        .catch(() => setIsAppleAvailable(false));
    }
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = async () => {
    // Clear previous errors
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    clearError();

    // Validate inputs
    let hasError = false;

    if (!name.trim()) {
      setNameError('Name is required');
      hasError = true;
    }

    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }

    if (!termsAccepted) {
      showAlert('Terms Required', 'Please accept the Terms of Service and Privacy Policy');
      hasError = true;
    }

    if (hasError) return;

    // Send verification OTP before creating account
    setIsSendingOtp(true);
    clearError();
    try {
      await api.post('/auth/send-verification', { email: email.toLowerCase().trim() });
      // Navigate to verification screen with signup data
      router.push({
        pathname: '/(auth)/verify-email' as any,
        params: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          password,
        },
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to send verification code';
      showAlert('Error', errorMessage);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await loginWithApple();
    } catch (err: any) {
      // User-cancelled flows aren't a failure — silently swallow.
      if (err?.code === 'ERR_REQUEST_CANCELED' || err?.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Apple Sign In error:', err);
      showAlert(
        'Apple Sign In Unavailable',
        "Apple Sign In is temporarily unavailable. Please tap 'Get Started' to create an account."
      );
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
    }
  };

  return (
    <ScreenContainer

      withKeyboardAvoiding
      scrollViewProps={{ showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' }}
      contentContainerStyle={{ justifyContent: 'center' }}
    >
          <View className="mb-8">
            {/* Pushed from the welcome screen and from the sign-in screen, and it had no way back
                from either — on the screen every paid install reaches. */}
            <BackButton className="mb-4" />
            {/* 🔴 §17 — THIS SCREEN'S ONE HERO, AND IT RETIRES AN OFF-RAMP className SIZE.
                §17.3 gives a screen title the display hero when no data hero exists, and this
                screen has no value on it at all. The size utility it used carried NO family and
                NO tracking (§3.1: a size utility cannot carry a face), so the step's serif
                arrives from the spread and the explicit family goes. See the 22nd named rule. */}
            <Text {...t.txt('display-lg')} style={{ ...t.txt('display-lg').style, color: t.color.fg }} className="mb-2">
              Create Account
            </Text>
            {/* §17.1's pairing — the eyebrow step as the hero's immediate neighbour, with no
                mid-ramp step between them, which is the contrast mechanism itself. Turn 8a's
                own argument for the whole direction is RANGE: "uses its ends". At the 18 step
                this pair read 30-against-18, which is not a pair. ⚠️ The lede's step therefore
                DROPS, which is owner-visible; the string is untouched and the casing is a
                textTransform render (C-6). Registered. */}
            <Text
              {...t.txt('overline')}
              style={{ ...t.txt('overline').style, color: t.color['fg-muted'], textTransform: 'uppercase' }}
            >
              Start your cosmic journey today
            </Text>
          </View>

          {/* Error message
              🔴 THE STRIP TAKES design §10.2.5's SPECIFIED ERROR TREATMENT, which is the only
              place in the design an inline error strip IS specified: a 1px `danger` BORDER on a
              surface step, with the message in the PLAIN foreground — "never in danger" — and
              that is the nearest specified value (§0.0 rule 2) for the same element class here.
              What it replaces: a ground mixed from an alpha nobody specified, carrying the
              danger role as TEXT at a measured 4.68:1 — legal, but a margin of 0.18 over AA on
              a ground the contrast matrix does not publish a column for. §2.1 already bans that
              role as text one surface step over (4.28:1), so the whole class is a step away from
              the prohibition. The role stays, as a BORDER: a non-text boundary needs 3:1 and it
              measures 4.92:1 on this ground, while the message moves to 16.04:1. */}
          {error && (
            <View
              className="mb-4 p-4 rounded-md border"
              style={{ backgroundColor: t.color.surface, borderColor: t.color.danger }}
            >
              <Text className="text-fg text-sm font-body">{error}</Text>
            </View>
          )}

          <View className="mb-6">
            <Input
              label="Full Name"
              placeholder="Enter your name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setNameError('');
              }}
              autoCapitalize="words"
              error={nameError}
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={emailError}
            />

            <Input
              label="Password"
              placeholder="Create a password (8+ characters)"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
              }}
              secureTextEntry
              autoCapitalize="none"
              error={passwordError}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setConfirmPasswordError('');
              }}
              secureTextEntry
              autoCapitalize="none"
              error={confirmPasswordError}
            />
          </View>

          {/* Terms Checkbox
              🔴 THIS IS A LEGAL-CONSENT CONTROL GATING ACCOUNT CREATION, AND ITS RESTING STATE
              WAS INVISIBLE. Pass 1b fixed the CHECKED half correctly — a selection signal is an
              accent role, never a structural border role — and left the UNCHECKED half on a
              structural neutral. Measured against WCAG 1.4.11, which requires 3:1 for the
              boundary of a user-interface component:

                  the subtle border role     1.16:1   🔴 fails by a factor of nearly three
                  the strong border role     1.51:1   🔴 also fails
                  the meta role              5.36:1   passes with margin

              🔴 SO NEITHER STRUCTURAL BORDER TOKEN CAN CARRY A CONTROL BOUNDARY, AND THAT IS A
              GAP IN §2 RATHER THAN A MISTAKE AT THIS SITE. Both border roles exist to separate
              SURFACES, where being nearly invisible is the point; §2 names no control-boundary
              role at all. Registered. Per §0.0 rule 2 this takes the nearest specified value
              that clears the threshold, which is the meta role — and it must be a NEUTRAL,
              because the accent is what carries "checked".

              ⚠️ AND NOTE WHICH HALF OF THE RULING WAS UNFINISHED. "A selection border is an
              accent role" fixes the SELECTED state. It says nothing about the resting state, so
              a correct application of it leaves a control the user cannot see — an unchecked box
              beside "I agree to the Terms" that renders as blank space. The two halves are one
              contract.

              The states now differ on THREE simultaneous channels rather than one: fill
              (none -> clay), boundary (neutral -> clay), and glyph (absent -> present). A
              consent control gating account creation should not be legible on a single channel.

              🔴 THE TICK IS AN IONICON, NOT A TEXT GLYPH — §9.2 names ticks explicitly, and the
              character it replaced is C-P4-3's class exactly: like the carets and the disc that
              pass retired, it is absent from the body face and resolved through the platform's
              symbol-font fallback. C-P4-3 converted six sites and missed this one, so it is the
              seventh of the same class.

              ⚠️ A 20dp box is far below the 48dp target the token-level a11y half already
              shipped, so the control takes a hitSlop that brings its effective target to 48.
              §9.2 prefers a REAL target over hitSlop for the provenance icon; here a real 48dp
              box would move the copy off its own baseline, and the row's two links must stay
              independently tappable, so the row itself cannot be the target. Divergence noted at
              the site rather than silently chosen. The role and state props are on the control,
              not the box, because that is the element a screen reader focuses — and this one
              cannot be left unannounced whatever the label sweep's descope says. */}
          <View className="flex-row items-start mb-6">
            <TouchableOpacity
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              style={{ marginRight: t.space['3'], marginTop: 2 }}
            >
              <View
                className="w-5 h-5 rounded-sm border-2 items-center justify-center"
                style={{
                  // 🔴 THE UNCHECKED BOX RENDERED AS BLANK SPACE, AND THIS IS THE THIRD TIME THIS
                  //    ONE CONTROL HAS SURFACED AS A DEFECT. It is a legal-consent control gating
                  //    account creation on the screen every paid install reaches, and its box is
                  //    the ONLY thing that identifies it — there is no fill and no glyph until it
                  //    is checked, so the boundary is the control.
                  // ⚠️ IT HELD THE META FOREGROUND ROLE, which was contrast-legal (5.11) and role-
                  //    WRONG: a text token doing a border's job, `O-39`. The control-boundary role
                  //    is a small LOSS of contrast here (5.36 -> 4.07 on this screen's canvas
                  //    ground) bought for a correct role, and the gate now asserts the foreground
                  //    family never returns to a border anywhere in the tree.
                  borderColor: termsAccepted ? t.color.accent : t.color['border-control'],
                  backgroundColor: termsAccepted ? t.color.accent : 'transparent',
                }}
              >
                {termsAccepted && (
                  <Ionicons name="checkmark" size={14} color={t.color['on-accent']} />
                )}
              </View>
            </TouchableOpacity>
            <Text className="flex-1 text-fg-muted text-sm">
              I agree to the{' '}
              <Text
                style={{ textDecorationLine: 'underline', color: t.color.accent }}
                onPress={() => Linking.openURL('https://revelia.me/terms')}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text
                style={{ textDecorationLine: 'underline', color: t.color.accent }}
                onPress={() => Linking.openURL('https://revelia.me/privacy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>

          <Button
            title="Create Account"
            onPress={handleSignup}
            variant="primary"
            fullWidth
            size="lg"
            loading={isLoading || isSendingOtp}
          />

          {/* Divider */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-border-subtle" />
            <Text className="mx-4 text-fg-muted text-sm">or continue with</Text>
            <View className="flex-1 h-px bg-border-subtle" />
          </View>

          {/* Social Sign In Buttons */}
          {/* 🔴 D4 · PASS 3a — this was the legacy vertical-space utility (the `space-y` family)
              and it is now the flex-gap utility written below. NOT a token rename: Tailwind emits
              the old one as a SIBLING COMBINATOR rule, and react-native-css-interop cannot express
              a sibling combinator at all, so the old class was ABSENT
              from the runtime rule set at BOTH inlineRem baselines — verified, it resolved to
              null. It never spaced anything. The flex-gap utility below is the only spelling that
              works under NativeWind 4; no scale change can fix the old one, so do not "restore" it.
              ⚠️ Do NOT write EITHER class name out in full anywhere in a comment. The gate greps the
              old one literally (so writing it re-opens the counter this pass closed), and Tailwind's
              content scanner harvests the new one out of prose — measured, it inflated that
              utility's census from 9 to 13 in this very pass before this wording was fixed. */}
          <View className="gap-3">
            {/* Apple Sign In - iOS only. Gated on the runtime guarded
                require + isAvailableAsync result, so a missing/broken
                native module can never block the screen from mounting. */}
            {Platform.OS === 'ios' && isAppleAvailable && AppleAuth?.AppleAuthenticationButton && (
              <AppleAuth.AppleAuthenticationButton
                buttonType={AppleAuth.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuth.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={t.radius.md}
                style={{ width: '100%', height: 56 }}
                onPress={handleAppleSignIn}
              />
            )}

            {/* Google Sign In — Android-only (Apple guideline 4.8 on iOS)
                🔴 THE SECOND COPY OF THE SAME HAND-ROLLED CONTROL welcome.tsx CARRIED: a
                full-width CTA sized by padding alone, which is exactly the shape X3 pins three
                heights against, reproduced OUTSIDE the component X3 protects. Taking the
                primitive is what puts it under that guard, on the variant whose fill IS the
                surface step this copy used. Its hand-rolled dimmed-while-loading treatment goes
                with it: the primitive owns ONE disabled model for all its sites, and two
                treatments for one state is what the primitive exists to collapse. */}
            {Platform.OS === 'android' && (
              <Button
                title="Sign in with Google"
                onPress={handleGoogleSignIn}
                disabled={isLoading}
                variant="secondary"
                fullWidth
                size="lg"
              />
            )}
          </View>

          {/* Login Link */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-fg-muted text-base">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="text-base font-body-semi" style={{ color: t.color.accent }}>
                Log In
              </Text>
            </TouchableOpacity>
          </View>
    </ScreenContainer>
  );
}
