import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/components/ui/Button';

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <View className="flex-1 bg-bg items-center justify-center p-6">
      <Text className="text-6xl mb-4">⚠️</Text>
      <Text className="text-fg text-xl font-body-bold mb-2">Oops!</Text>
      <Text className="text-fg-muted text-center mb-6">{message}</Text>
      {onRetry && (
        <Button title="Try Again" onPress={onRetry} variant="primary" />
      )}
    </View>
  );
}

export default ErrorView;
