import React from 'react';
import { View, Text } from 'react-native';
import { DailyContinuity } from '@shared/types';
import { Button } from '@/components/ui/Button';

/**
 * "What's shifted since your last reading" card — Build 27 R6 Option C.
 *
 * A purely ADDITIVE surface over the already-computed continuity delta (server
 * continuity.service). It renders the structured `DailyContinuity` (short,
 * honesty-gated highlight labels) plus the finished `hook` sentence. It shows
 * NOTHING when there is no meaningful shift (continuity absent / no highlights)
 * — the server only sends the fields on a real shift, so the card self-hides.
 *
 * `onUnlock`, when provided (non-Premium-Plus viewers), renders the upgrade CTA.
 */
interface ContinuityCardProps {
  continuity?: DailyContinuity | null;
  hook?: string | null;
  onUnlock?: () => void;
}

export function ContinuityCard({ continuity, hook, onUnlock }: ContinuityCardProps) {
  if (!continuity || continuity.highlights.length === 0) return null;

  return (
    <View className="bg-surface rounded-lg p-5 border border-border-subtle">
      <View className="flex-row items-center mb-2">
        <Text className="text-base mr-2">✨</Text>
        <Text className="text-fg text-base font-body-bold">What's shifted</Text>
      </View>

      {hook ? (
        <Text className="text-accent text-sm font-body-semi mb-3">{hook}</Text>
      ) : (
        <Text className="text-fg-muted text-xs mb-3">
          Since you were last here ~{continuity.gapDays} days ago
        </Text>
      )}

      {continuity.highlights.map((h, i) => (
        <View key={i} className="flex-row items-start mb-1.5">
          <Text className="text-accent-2 text-sm mr-2">•</Text>
          <Text className="text-fg-secondary text-sm flex-1">{h}</Text>
        </View>
      ))}

      {onUnlock ? (
        <View className="mt-3">
          <Button
            title="Unlock deeper daily guidance"
            onPress={onUnlock}
            variant="secondary"
            fullWidth
          />
        </View>
      ) : null}
    </View>
  );
}

export default ContinuityCard;
