import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Button } from '../ui/Button';

interface NotificationPromptProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function NotificationPrompt({ visible, onAccept, onDecline }: NotificationPromptProps) {
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View className="flex-1 bg-scrim/60 items-center justify-center p-6">
        <View className="bg-surface rounded-lg p-6 w-full max-w-sm">
          <Text className="text-fg text-2xl font-body-bold text-center mb-4">
            🔔 Never Miss an Insight
          </Text>
          
          <Text className="text-fg-secondary text-center mb-6">
            Get personalized daily guidance delivered to you every morning
          </Text>
          
          {/* Mock notification preview */}
          <View className="bg-bg rounded-md p-4 mb-6">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-sm bg-accent items-center justify-center mr-3">
                <Text className="text-fg text-lg">✨</Text>
              </View>
              <Text className="text-fg font-body-semi">Revelia</Text>
              <Text className="text-fg-muted text-xs ml-auto">9:00 AM</Text>
            </View>
            <Text className="text-fg text-sm font-body-semi mb-1">
              Your Daily Insight
            </Text>
            <Text className="text-fg-muted text-xs">
              A Day for Bold Decisions
            </Text>
          </View>
          
          <Button
            title="Enable Notifications"
            onPress={onAccept}
            variant="primary"
            fullWidth
            className="mb-3"
          />
          
          <TouchableOpacity onPress={onDecline}>
            <Text className="text-fg-muted text-center text-sm">
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
