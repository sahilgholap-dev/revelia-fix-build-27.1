import { Stack } from 'expo-router';
import * as t from '@/theme';

export default function AstrologyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: t.color.bg,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="daily" />
      <Stack.Screen name="weekly" />
      <Stack.Screen name="monthly" />
    </Stack>
  );
}
