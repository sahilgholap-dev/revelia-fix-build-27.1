import React, { useState } from 'react';
import { View, Text, Platform, TouchableOpacity } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { BackButton } from '@/components/ui/BackButton';
import { useAuthStore } from '@/store/authStore';
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

export default function Login() {
  const router = useRouter();
  const { login, loginWithApple, loginWithGoogle, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
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

  const handleLogin = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    clearError();

    // Validate inputs
    let hasError = false;

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
    }

    if (hasError) return;

    try {
      await login(email, password);
      // Navigation handled by store
    } catch (err: any) {
      // Error displayed via store error state
      console.error('Login error:', err);
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
      showAlert(
        'Sign In Failed',
        'Google Sign In is unavailable. Please try again or use another sign-in method.'
      );
    }
  };

  return (
    <ScreenContainer

      withKeyboardAvoiding
      scrollViewProps={{ showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' }}
      contentContainerStyle={{ justifyContent: 'center' }}
    >
          <View className="mb-8">
            {/* Four ways in, and they split: PUSHED from the welcome screen and from sign-up, so
                back means something; REPLACED into on sign-out and on the password-reset success
                path, where it must not appear at all. The guard is what tells them apart. */}
            <BackButton className="mb-4" />
            <Text {...t.txt('display-lg')} style={{ ...t.txt('display-lg').style, color: t.color.fg }} className="mb-2">Welcome Back</Text>
            <Text className="text-fg-muted text-lg">Sign in to continue your journey</Text>
          </View>

          {/* Error message */}
          {error && (
            <View className="mb-4 p-4 rounded-md" style={{ backgroundColor: t.alpha(t.color.danger, 10) }}>
              <Text className="text-danger text-sm">{error}</Text>
            </View>
          )}

          <View className="mb-6">
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
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
              }}
              secureTextEntry
              autoCapitalize="none"
              error={passwordError}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              className="self-end mt-1"
            >
              <Text className="text-sm font-body-semi" style={{ color: t.color.accent }}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Log In"
            onPress={handleLogin}
            variant="primary"
            fullWidth
            size="lg"
            loading={isLoading}
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
                cornerRadius={12}
                style={{ width: '100%', height: 56 }}
                onPress={handleAppleSignIn}
              />
            )}

            {/* Google Sign In — Android AND web. Never iOS-native: App Store guideline
                4.8 requires Sign in with Apple alongside any third-party sign-in, and
                that rule governs an APP STORE BINARY. A PWA in Safari is not reviewed by
                Apple, so the web build may offer Google on an iPhone as freely as on a
                desktop — which matters here, because web is the ONLY route iOS users
                have. Do not "restore consistency" by dropping web from this gate.

                ⚠️ Requires the deployed origin to be listed under Authorized JavaScript
                origins on the OAuth client (Google Cloud project revelia-497203). Until
                it is, GSI refuses with origin_mismatch and the catch surfaces a "Sign In
                Failed" dialog — honest, but not working. */}
            {(Platform.OS === 'android' || Platform.OS === 'web') && (
              <TouchableOpacity
                onPress={handleGoogleSignIn}
                className="w-full rounded-pill items-center justify-center border border-border-strong"
                style={{ backgroundColor: t.color.surface, paddingVertical: 14 }}
              >
                <Text className="text-base font-body-semi text-fg">
                  Sign in with Google
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Sign Up Link */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-fg-muted text-base">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text className="text-base font-body-semi" style={{ color: t.color.accent }}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
    </ScreenContainer>
  );
}
