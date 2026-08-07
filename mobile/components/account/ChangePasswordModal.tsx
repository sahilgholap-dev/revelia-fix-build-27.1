import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { accountService } from '@/services/account.service';
import * as Haptics from 'expo-haptics';
import * as t from '@/theme';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return false;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    setError('');

    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    try {
      await accountService.changePassword(currentPassword, newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your password has been changed successfully');
      handleClose();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-bg">
        <View className="flex-1">
          {/* Header */}
          <View className="px-6 py-4 border-b border-border-subtle flex-row items-center justify-between">
            <Text className="text-fg text-2xl font-body-bold">Change Password</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text className="text-accent text-lg">Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="flex-1 px-6 pt-6">
            <Card>
              <Text className="text-fg-muted text-sm mb-6">
                Choose a strong password with at least 8 characters.
              </Text>

              {/* Current Password */}
              <View className="mb-4">
                <Text className="text-fg text-sm font-body-semi mb-2">Current Password</Text>
                <View className="flex-row items-center bg-bg rounded-md px-4 py-3">
                  {/* ADOPTION-EXEMPT(Input): deferred to item 15 - this modal and its two siblings become a Sheet there, and its THREE copies of the reveal control plus its sub-AA hint all retire in that one edit rather than in two. */}
                  <TextInput
                    className="flex-1 text-fg"
                    placeholder="Enter current password"
                    placeholderTextColor={t.color['fg-placeholder']}
                    secureTextEntry={!showCurrentPassword}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                    <Text className="text-accent text-sm">
                      {showCurrentPassword ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View className="mb-4">
                <Text className="text-fg text-sm font-body-semi mb-2">New Password</Text>
                <View className="flex-row items-center bg-bg rounded-md px-4 py-3">
                  <TextInput
                    className="flex-1 text-fg"
                    placeholder="Enter new password"
                    placeholderTextColor={t.color['fg-placeholder']}
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Text className="text-accent text-sm">
                      {showNewPassword ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-fg-muted text-xs mt-1">Minimum 8 characters</Text>
              </View>

              {/* Confirm Password */}
              <View className="mb-4">
                <Text className="text-fg text-sm font-body-semi mb-2">Confirm New Password</Text>
                <View className="flex-row items-center bg-bg rounded-md px-4 py-3">
                  <TextInput
                    className="flex-1 text-fg"
                    placeholder="Confirm new password"
                    placeholderTextColor={t.color['fg-placeholder']}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Text className="text-accent text-sm">
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error Message */}
              {error ? (
                <View className="bg-danger/10 border border-danger rounded-md p-3 mb-4">
                  <Text className="text-danger text-sm">{error}</Text>
                </View>
              ) : null}

              {/* Submit Button */}
              <Button
                title="Change Password"
                onPress={handleChangePassword}
                loading={loading}
                disabled={loading}
                fullWidth
              />
            </Card>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default ChangePasswordModal;
