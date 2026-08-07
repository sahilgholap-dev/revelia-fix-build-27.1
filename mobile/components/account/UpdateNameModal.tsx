import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import * as Haptics from 'expo-haptics';
import * as t from '@/theme';

interface UpdateNameModalProps {
  visible: boolean;
  onClose: () => void;
}

const TIER_LIMIT_COPY: Record<string, string> = {
  free: 'You can update your name once every 30 days.',
  premium: 'You can update your name up to 5 times per 30 days.',
  premium_plus: 'You can update your name up to 15 times per 30 days.',
};

export function UpdateNameModal({ visible, onClose }: UpdateNameModalProps) {
  const user = useAuthStore((s) => s.user);
  const updateUserName = useAuthStore((s) => s.updateUserName);

  const [name, setName] = useState(user?.name ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-prefill when modal opens (in case user changed since last open).
  useEffect(() => {
    if (visible) {
      setName(user?.name ?? '');
      setError(null);
    }
  }, [visible, user?.name]);

  const tier = user?.subscription?.tier ?? 'free';
  const tierCopy = TIER_LIMIT_COPY[tier] ?? TIER_LIMIT_COPY.free;

  const trimmed = name.trim();
  const currentName = (user?.name ?? '').trim();
  const tooShort = trimmed.length < 1;
  const tooLong = trimmed.length > 50;
  const unchanged = trimmed === currentName;
  const saveDisabled = loading || tooShort || tooLong || unchanged;

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    setError(null);

    if (tooShort) {
      setError('Please enter a name.');
      return;
    }
    if (tooLong) {
      setError('Name must be 50 characters or fewer.');
      return;
    }
    if (unchanged) {
      handleClose();
      return;
    }

    setLoading(true);
    try {
      await updateUserName(trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Backend returns 400 (validation) or 429 (rate limit) with { error }.
      // 429 also carries { nextAvailableAt, limit, windowDays, currentTier }.
      const data = err?.response?.data;
      const status = err?.response?.status;
      if (status === 429 && data?.nextAvailableAt) {
        const nextDate = new Date(data.nextAvailableAt).toLocaleDateString();
        setError(
          `${data.error ?? 'Limit reached'}. You can try again on ${nextDate}.`
        );
      } else if (data?.error) {
        setError(data.error);
      } else {
        setError('Could not update right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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
            <Text className="text-fg text-2xl font-body-bold">Update Name</Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Text className="text-accent text-lg">Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="flex-1 px-6 pt-6">
            <Card>
              <Text className="text-fg-muted text-sm mb-6">{tierCopy}</Text>

              <View className="mb-2">
                <Text className="text-fg text-sm font-body-semi mb-2">
                  Your name
                </Text>
                <View className="flex-row items-center bg-bg rounded-md px-4 py-3">
                  {/* ADOPTION-EXEMPT(Input): deferred to item 15 with its two sibling modals - one field, and its hint below the field is on the sub-AA placeholder role, which the primitive's helper slot fixes by construction. */}
                  <TextInput
                    className="flex-1 text-fg"
                    placeholder="Enter your name"
                    placeholderTextColor={t.color['fg-placeholder']}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={100}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (!saveDisabled) handleSave();
                    }}
                  />
                </View>
                <Text className="text-fg-muted text-xs mt-2">
                  Use your real name for the most accurate readings.
                </Text>
              </View>

              {/* Error Message */}
              {error ? (
                <View className="bg-danger/10 border border-danger rounded-md p-3 mt-4 mb-4">
                  <Text className="text-danger text-sm">{error}</Text>
                </View>
              ) : (
                <View className="mt-4" />
              )}

              {/* Save Button */}
              <Button
                title="Save"
                onPress={handleSave}
                loading={loading}
                disabled={saveDisabled}
                fullWidth
              />
            </Card>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default UpdateNameModal;
