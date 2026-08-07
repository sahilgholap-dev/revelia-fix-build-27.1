import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import * as t from '@/theme';

export default function VerifyEmail() {
  const router = useRouter();
  const { email, name, password } = useLocalSearchParams<{
    email: string;
    name: string;
    password: string;
  }>();

  const { signup } = useAuthStore();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');

    if (digit.length > 1) {
      // Handle paste — distribute digits across boxes
      const pastedDigits = digit.slice(0, 6).split('');
      const newDigits = [...digits];
      pastedDigits.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setDigits(newDigits);
      setError('');
      // Focus last filled or next empty
      const nextIndex = Math.min(index + pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      // Auto-submit if all filled
      if (newDigits.every((d) => d !== '')) {
        handleVerify(newDigits.join(''));
      }
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError('');

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5 && newDigits.every((d) => d !== '')) {
      handleVerify(newDigits.join(''));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      // Move back on empty backspace
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const otp = code || digits.join('');
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Step 1: Verify the OTP
      const verifyResponse = await api.post('/auth/verify-email', { email, otp });
      // Backend returns verificationToken at the TOP LEVEL of the body
      // (auth.controller.ts), not nested in `data`. The ApiResponse<any>
      // type doesn't model that, so cast to read it without a TS error.
      const verificationToken = (verifyResponse as any).verificationToken;

      if (!verificationToken) {
        throw new Error('Verification failed — no token received');
      }

      // Step 2: Complete signup with verification token
      await signup(name || '', email || '', password || '', verificationToken);
      // Navigation handled by authStore.signup
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || err.message || 'Verification failed. Please try again.';
      setError(errorMessage);
      // Clear digits on error for easy retry
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      await api.post('/auth/send-verification', { email });
      setResendCooldown(60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
      setDigits(['', '', '', '', '', '']);
      setError('');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to resend code';
      Alert.alert('Error', msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ScreenContainer

      withKeyboardAvoiding
      contentContainerStyle={{ justifyContent: 'center' }}
    >
        <View style={{ paddingHorizontal: 0 }}>
          {/* Header */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 32 /* ABOVE-CEILING */, fontFamily: t.family['body-bold'], color: t.color.fg, marginBottom: 8 }}>
              Verify Your Email
            </Text>
            <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color['fg-muted'] }}>
              We sent a 6-digit code to
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.accent }}>
                {email}
              </Text>
              <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.accent }}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* OTP Input Boxes */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                value={digit}
                onChangeText={(text) => handleDigitChange(index, text)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={6}
                style={{ ...t.txt('text-2xl').style, width: 48,
                  height: 56,
                  borderRadius: t.radius.md,
                  backgroundColor: digit ? t.alpha(t.color.accent, 30) : t.color['surface-raised'],
                  borderWidth: 2,
                  // 🔴 SIX BOXES, ONE VALUE, AND AN EMPTY BOX IS THE DEFAULT STATE OF THIS SCREEN.
                  //    The edge is the only thing that says where to type: the fill sits 1.08:1
                  //    off the card and the box is empty by definition until a digit lands, so at
                  //    1.20:1 the control did not visually exist. It is the control-boundary role
                  //    now — 3.65:1 on this fill — and the state separation stays legible because
                  //    the FILL also changes and the digit itself appears.
                  //    ⚠️ This control is FORBIDDEN from adopting the field primitive by name (six
                  //    elements for one value, no per-box label), so the role has to be written
                  //    here rather than inherited. That is exactly the shape `P62` warned about:
                  //    seventeen field-like things, one ruling, applied at every one of them.
                  borderColor: error
                    ? t.color.danger
                    : digit
                    ? t.color.accent
                    : t.color['border-control'],
                  color: t.color.fg,
                  fontFamily: t.family['body-bold'],
                  textAlign: 'center' }}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Error message */}
          {error ? (
            <View style={{ marginBottom: 16, padding: 12, borderRadius: t.radius.sm, backgroundColor: t.alpha(t.color.danger, 10) }}>
              <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.danger, textAlign: 'center' }}>{error}</Text>
            </View>
          ) : null}

          {/* Verify button */}
          <TouchableOpacity
            onPress={() => handleVerify()}
            disabled={isVerifying || digits.some((d) => !d)}
            style={{
              backgroundColor: t.color.accent,
              borderRadius: t.radius.md,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: isVerifying || digits.some((d) => !d) ? 0.5 : 1,
              marginBottom: 24,
            }}
          >
            {isVerifying ? (
              <ActivityIndicator color={t.color.fg} />
            ) : (
              <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.fg }}>
                Verify & Create Account
              </Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={{ alignItems: 'center' }}>
            {/* D4: the countdown below is 14 → `text-xs` 13, NOT the batch default
                `text-sm` 15. It is META beside the action, not the action — §3.3 puts
                "meta · helper" on text-xs. One of the four fourteens that go DOWN.
                Its sibling, the "Resend" control, takes the default text-sm. */}
            {resendCooldown > 0 ? (
              <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'] }}>
                Resend code in {resendCooldown}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isResending}>
                <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.accent, fontFamily: t.family['body-semi'] }}>
                  {isResending ? 'Sending...' : "Didn't receive a code? Resend"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Back link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 32 }}>
            <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color['fg-muted'] }}>Wrong details? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.accent }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
    </ScreenContainer>
  );
}
