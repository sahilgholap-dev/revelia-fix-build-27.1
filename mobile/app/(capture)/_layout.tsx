import * as t from '@/theme';
import { Stack } from 'expo-router';

export default function CaptureLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.color.bg },
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="face-capture" />
      <Stack.Screen name="palm-capture" />
    </Stack>
  );
}
