import { Stack } from 'expo-router';
import * as t from '@/theme';

export default function NumerologyLayout() {
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
      <Stack.Screen name="name-destiny" />
    </Stack>
  );
}
