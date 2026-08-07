import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { showAlert } from '@/lib/alert';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useCompatibilityStore } from '../../../store/compatibilityStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import * as Haptics from 'expo-haptics';

export default function CompatibilityHistoryScreen() {
  const { readings, isLoadingReadings, fetchReadings, deleteReading } = useCompatibilityStore();
  
  useEffect(() => {
    fetchReadings();
  }, []);
  
  const handleDelete = (id: string, partnerName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert(
      'Delete Reading',
      `Are you sure you want to delete the reading with ${partnerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await deleteReading(id);
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              showAlert('Error', 'Failed to delete reading');
            }
          }
        }
      ]
    );
  };
  
  if (isLoadingReadings) {
    return <LoadingSpinner text="Loading your compatibility readings..." fullScreen />;
  }
  
  if (readings.length === 0) {
    return (
      <ScreenContainer withScrollView={false}>
        <View className="px-6 pt-4 pb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-accent text-lg">← Back</Text>
          </TouchableOpacity>
        </View>
        <EmptyState
          title="No Compatibility Readings"
          description="Discover your cosmic connections with friends, partners, and loved ones"
          actionTitle="Start First Reading"
          onAction={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withScrollView={false}>
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between py-4 mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-accent text-lg">← Back</Text>
          </TouchableOpacity>
        </View>
        
        <Text className="text-fg text-display-lg font-display mb-2">
          Past Readings
        </Text>
        <Text className="text-fg-muted text-sm mb-6">
          {readings.length} {readings.length === 1 ? 'reading' : 'readings'}
        </Text>
      
      {readings.map(reading => (
        <TouchableOpacity
          key={reading._id}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/(main)/compatibility/${reading._id}` as any);
          }}
          onLongPress={() => handleDelete(reading._id, reading.partnerName)}
          className="bg-surface rounded-lg p-4 mb-3 flex-row items-center"
          activeOpacity={0.7}
        >
          <Image 
            source={{ uri: reading.partnerImageUrl }} 
            className="w-16 h-16 rounded-pill mr-4"
          />
          <View className="flex-1">
            <Text className="text-fg text-lg font-body-semi">
              {(() => {
                const icons: Record<string, string> = {
                  love: '❤️',
                  business: '💼',
                  sibling: '👨‍👧',
                  parent_child: '👨‍👧',
                  friend: '🤝',
                };
                const icon = icons[(reading as any).relationshipType] || '❤️';
                return `${icon} ${reading.partnerName}`;
              })()}
            </Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-accent text-base font-body-semi mr-2">
                {reading.reading.overallScore}%
              </Text>
              <Text className="text-fg-muted text-sm">
                {new Date(reading.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <Text className="text-fg-muted text-2xl">›</Text>
        </TouchableOpacity>
      ))}
      
      <View className="mb-8" />
    </ScrollView>
    </ScreenContainer>
  );
}
