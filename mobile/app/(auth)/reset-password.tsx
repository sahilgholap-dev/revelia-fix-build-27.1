import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { api } from '@/lib/api';
import * as t from '@/theme';

export default function ResetPassword() {
  const router = useRouter();
  const { email, code } = useLocalSearchParams<{ email: string; code: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    setPasswordError('');
    setConfirmError('');

    let hasError = false;

    if (!newPassword) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmError('Please confirm your password');
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      showAlert(
        'Password Reset',
        'Your password has been reset successfully. You can now log in.',
        [{ text: 'Log In', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.data?.error || 'Failed to reset password. Please try again.';
      showAlert('Error', message);
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
            <Text {...t.txt('display-lg')} style={{ ...t.txt('display-lg').style, color: t.color.fg }} className="mb-2">New Password</Text>
            <Text className="text-fg-muted text-lg">
              Create a new password for your account
            </Text>
          </View>

          <View className="mb-6">
            <Input
              label="New Password"
              placeholder="Enter new password (8+ characters)"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                setPasswordError('');
              }}
              secureTextEntry
              autoCapitalize="none"
              error={passwordError}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setConfirmError('');
              }}
              secureTextEntry
              autoCapitalize="none"
              error={confirmError}
            />
          </View>

          <Button
            title="Reset Password"
            onPress={handleReset}
            variant="primary"
            fullWidth
            size="lg"
            loading={isLoading}
          />
    </ScreenContainer>
  );
}
