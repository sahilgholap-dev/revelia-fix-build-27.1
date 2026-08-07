import { Stack } from 'expo-router';
import * as t from '@/theme';

export default function ReadingsLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: t.color.bg,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="face" />
      <Stack.Screen name="palm" />
      <Stack.Screen name="combined" />
      <Stack.Screen name="career-destiny" />
      <Stack.Screen name="cosmic-report" />
      <Stack.Screen name="cosmic-report-history" />
      <Stack.Screen name="qa" />
    </Stack>
  );
}
