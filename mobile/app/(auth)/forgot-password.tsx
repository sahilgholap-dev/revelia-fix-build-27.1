import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { api } from '@/lib/api';
import * as t from '@/theme';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    setEmailError('');

    if (!email) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      Alert.alert(
        'Code Sent',
        'If an account exists with that email, a reset code has been sent. Check your email.',
        [{ text: 'OK', onPress: () => router.push({ pathname: '/(auth)/verify-code' as any, params: { email } }) }]
      );
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.data?.error || 'Something went wrong. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer

      withKeyboardAvoiding
      scrollViewProps={{ showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' }}
      contentContainerStyle={{ justifyContent: 'center' }}
    >
          <View className="mb-8">
            <Text {...t.txt('display-lg')} style={{ ...t.txt('display-lg').style, color: t.color.fg }} className="mb-2">Forgot Password</Text>
            <Text className="text-fg-muted text-lg">
              Enter your email and we'll send you a reset code
            </Text>
          </View>

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
          </View>

          <Button
            title="Send Reset Code"
            onPress={handleSubmit}
            variant="primary"
            fullWidth
            size="lg"
            loading={isLoading}
          />

          <View className="flex-row justify-center mt-8">
            <Text className="text-fg-muted text-base">Remember your password? </Text>
            <Text
              className="text-base font-body-semi"
              style={{ color: t.color.accent }}
              onPress={() => router.back()}
            >
              Log In
            </Text>
          </View>
    </ScreenContainer>
  );
}
