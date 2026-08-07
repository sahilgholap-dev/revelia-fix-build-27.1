import { Stack } from 'expo-router';
import * as t from '@/theme';

export default function PaywallLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.color.bg },
        presentation: 'modal',
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
