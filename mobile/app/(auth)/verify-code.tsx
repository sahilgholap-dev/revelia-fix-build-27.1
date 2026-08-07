import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { api } from '@/lib/api';
import * as t from '@/theme';

export default function VerifyCode() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    setCodeError('');

    if (!code || code.length !== 6) {
      setCodeError('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/verify-reset-code', { email, code });
      router.push({ pathname: '/(auth)/reset-password' as any, params: { email, code } });
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.data?.error || 'Invalid or expired code';
      setCodeError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await api.post('/auth/forgot-password', { email });
      Alert.alert('Code Sent', 'A new reset code has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ScreenContainer

      withKeyboardAvoiding
      scrollViewProps={{ showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' }}
      contentContainerStyle={{ justifyContent: 'center' }}
    >
          <View className="mb-8">
            <Text {...t.txt('display-lg')} style={{ ...t.txt('display-lg').style, color: t.color.fg }} className="mb-2">Verify Code</Text>
            <Text className="text-fg-muted text-lg">
              Enter the 6-digit code sent to {email}
            </Text>
          </View>

          <View className="mb-6">
            <Input
              label="Reset Code"
              placeholder="Enter 6-digit code"
              value={code}
              onChangeText={(text) => {
                setCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                setCodeError('');
              }}
              keyboardType="number-pad"
              error={codeError}
            />
          </View>

          <Button
            title="Verify Code"
            onPress={handleVerify}
            variant="primary"
            fullWidth
            size="lg"
            loading={isLoading}
            disabled={code.length !== 6}
          />

          <TouchableOpacity onPress={handleResend} disabled={isResending} className="mt-6 items-center">
            <Text className="text-base" style={{ color: t.color.accent }}>
              {isResending ? 'Sending...' : "Didn't receive a code? Resend"}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-8">
            <Text className="text-fg-muted text-base">Wrong email? </Text>
            <Text
              className="text-base font-body-semi"
              style={{ color: t.color.accent }}
              onPress={() => router.back()}
            >
              Go Back
            </Text>
          </View>
    </ScreenContainer>
  );
}
