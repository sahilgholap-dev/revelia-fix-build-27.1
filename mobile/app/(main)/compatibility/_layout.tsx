import { Stack } from 'expo-router';
import * as t from '@/theme';

export default function CompatibilityLayout() {
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
      <Stack.Screen name="[id]" />
      <Stack.Screen name="history" />
    </Stack>
  );
}
