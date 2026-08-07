import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { accountService } from '@/services/account.service';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as t from '@/theme';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Step = 'warning' | 'confirmation' | 'processing' | 'complete';

export function DeleteAccountModal({ visible, onClose, onComplete }: DeleteAccountModalProps) {
  const [step, setStep] = useState<Step>('warning');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setStep('warning');
    setConfirmText('');
    setError('');
    onClose();
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('confirmation');
  };

  const handleDelete = async () => {
    if (confirmText.toUpperCase() !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setError('');
    setStep('processing');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      await accountService.deleteAccount();
      setStep('complete');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Auto-logout after 2 seconds
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.response?.data?.error || 'Failed to delete account');
      setStep('confirmation');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-bg">
        <View className="flex-1">
          {/* Header */}
          <View className="px-6 py-4 border-b border-border-subtle flex-row items-center justify-between">
            <Text className="text-fg text-2xl font-body-bold">
              {step === 'complete' ? 'Account Deleted' : 'Delete Account'}
            </Text>
            {step !== 'processing' && step !== 'complete' && (
              <TouchableOpacity onPress={handleClose}>
                <Text className="text-accent text-lg">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <View className="flex-1 px-6 pt-6">
            {/* Step 1: Warning */}
            {step === 'warning' && (
              <Card>
                {/* §9.2 — no emoji renders as an icon anywhere in the system. A warning
                    pictograph at a display size is the clearest case of it in the app, and it sat
                    on the most destructive flow. Hidden from the accessibility tree: the heading
                    below already says what this screen is, and a screen reader announcing an
                    unlabelled pictograph first says nothing and delays the sentence that matters. */}
                <View className="items-center mb-4">
                  <Ionicons
                    name="warning"
                    size={56}
                    color={t.color.danger}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                </View>
                <Text className="text-fg text-xl font-body-bold text-center mb-4">
                  Delete Your Account?
                </Text>
                <Text className="text-fg-muted text-base mb-6">
                  This action cannot be undone. All of your data will be permanently deleted:
                </Text>

                <View className="mb-6">
                  <View className="flex-row items-center mb-3">
                    <Text className="text-danger mr-2">•</Text>
                    <Text className="text-fg-secondary">Face and palm readings</Text>
                  </View>
                  <View className="flex-row items-center mb-3">
                    <Text className="text-danger mr-2">•</Text>
                    <Text className="text-fg-secondary">Astrology and numerology profiles</Text>
                  </View>
                  <View className="flex-row items-center mb-3">
                    <Text className="text-danger mr-2">•</Text>
                    <Text className="text-fg-secondary">Compatibility reports</Text>
                  </View>
                  <View className="flex-row items-center mb-3">
                    <Text className="text-danger mr-2">•</Text>
                    <Text className="text-fg-secondary">Daily insights and history</Text>
                  </View>
                  <View className="flex-row items-center mb-3">
                    <Text className="text-danger mr-2">•</Text>
                    <Text className="text-fg-secondary">All uploaded photos</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-danger mr-2">•</Text>
                    <Text className="text-fg-secondary">Account and subscription data</Text>
                  </View>
                </View>

                <View className="bg-danger/10 border border-danger rounded-md p-4 mb-6">
                  <Text className="text-danger text-sm font-body-semi text-center">
                    This action cannot be undone.
                  </Text>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      title="Cancel"
                      onPress={handleClose}
                      variant="outline"
                      fullWidth
                    />
                  </View>
                  <View className="flex-1">
                    <TouchableOpacity
                      onPress={handleContinue}
                      className="bg-danger rounded-pill items-center justify-center"
                      style={{ height: 56 }}
                      activeOpacity={0.8}
                    >
                      <Text className="text-on-accent text-base font-body-semi">Continue</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            )}

            {/* Step 2: Confirmation */}
            {step === 'confirmation' && (
              <Card>
                <Text className="text-fg text-xl font-body-bold mb-4">
                  Type DELETE to confirm
                </Text>
                <Text className="text-fg-muted text-base mb-6">
                  This is your last chance. Type DELETE in capital letters to permanently delete your account.
                </Text>

                <View className="mb-4">
                  {/* ADOPTION-EXEMPT(Input): the field's LABEL is the card title two elements up, and `Input`
                      types `label` as REQUIRED with no default - so adopting it here means either
                      duplicating a visible string or inventing one, and §7 forbids inventing copy.
                      ⚠️ The previous reason said this file would be rewritten at item 15; item 15
                      MEASURED that it must not be (migrating this 4-step flow onto `Sheet` would
                      turn its 8 legal danger-role uses into §2.1 violations), so the reason it
                      gave for deferring has expired and is replaced rather than left to rot. */}
                  <TextInput
                    className="bg-bg text-fg rounded-md px-4 py-3 text-lg"
                    placeholder="Type DELETE"
                    placeholderTextColor={t.color['fg-placeholder']}
                    value={confirmText}
                    onChangeText={setConfirmText}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>

                {error ? (
                  <View className="bg-danger/10 border border-danger rounded-md p-3 mb-4">
                    <Text className="text-danger text-sm">{error}</Text>
                  </View>
                ) : null}

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      title="Cancel"
                      onPress={handleClose}
                      variant="outline"
                      fullWidth
                    />
                  </View>
                  <View className="flex-1">
                    <TouchableOpacity
                      onPress={handleDelete}
                      disabled={confirmText.toUpperCase() !== 'DELETE'}
                      className={`rounded-pill items-center justify-center ${
                        confirmText.toUpperCase() === 'DELETE' ? 'bg-danger' : 'bg-surface-raised'
                      }`}
                      style={{ height: 56 }}
                      activeOpacity={0.8}
                    >
                      {/* 🔴 THE SPEC THIS SITE IMPLEMENTS IS design §2.1 / §9 #15, PERMANENTLY, AND
                          IT IS NAMED HERE BECAUSE THIS BUTTON HAS BEEN A CONTRAST DEFECT TWICE
                          (owner ruling R-4, 2026-08-01): 4.83:1 on `main` -> 3.76:1 at 1b's C7
                          mechanical remap -> 3.26:1 at the pass-5 flip. §2.1 is unambiguous and it
                          is not a per-site judgement: a destructive action is a DANGER FILL with an
                          ON-ACCENT label, measured 5.60:1, and no red copy anywhere on the sheet.
                          Read that spec BEFORE changing anything below. A third occurrence can only
                          happen by re-deriving the colours here instead of reading §2.1 — which is
                          exactly what produced occurrences one and two.
                          ⚠️ When §9 #15's `Sheet` and the `Button` primitive absorb this hand-rolled
                          button, the spec does not change: it MOVES to the primitive, and X20 hands
                          over to X3. Do not drop the pairing on the way through.
                          🔴 §9 ITEM 2 CONSIDERED THAT ABSORPTION AND DELIBERATELY DID NOT TAKE IT.
                          The primitive now HAS the fifth variant this pair needs, and md is 56
                          exactly — so the armed state maps one-to-one. THE DISARMED STATE DOES NOT.
                          V-6 gives the primitive ONE disabled model: the fill stays at full
                          strength and only the label recedes. This button's disarmed state swaps
                          the GROUND instead, to a raised surface. Absorbing it without teaching the
                          primitive a second disabled model would render a full-strength red
                          "Delete My Account" that is not armed — a worse affordance than today's,
                          on the app's most destructive flow. primitives-plan §0.0 rule 1 (preserve
                          behaviour; take the smaller change) settles it, and §2.2 phrases the
                          absorption as conditional and pairs it with `Sheet`. 🔴 SO X20 IS STILL
                          LIVE, both `height: 56` literals stay, and the absorption belongs to
                          item 15 — where the second disabled model can be designed rather than
                          discovered. */}
                      {/* 🔴 A5 — LEDGER DRIFT CORRECTED AT PASS 5 (held-collision-ledger ENTRY 5,
                          items 24–25). The ledger recorded BOTH destructive buttons as `on-accent`;
                          only `Continue` above actually took it, and this one was left on `fg`.
                          It is the surviving half of the pair C7's `red-600 -> danger` mapping
                          CREATED: `fg` on `danger` measured 3.76:1 while HELD and the flip makes it
                          WORSE, 3.26:1 — a 16px semibold label, so 4.5:1 is the floor and this fails
                          it. The GROUND IS TWO-STATE and so is the label: armed is a `danger` FILL
                          (-> the only legal foreground is `on-accent`, 5.60:1), and the other state
                          is a DISABLED `surface-raised` ground, whose label is `fg-disabled` per §2
                          row 10 / V-6 — not `fg`, which read as enabled.
                          ⚠️ `no-white-on-accent` CANNOT see this and never could: the fill is an
                          interpolated ternary inside a template className and the label is a
                          separate element. Its 22 reported hits include this file's 10%-danger
                          WASH about 80 lines up — a false positive — and miss the real one here.
                          Proximity is not nesting. X20's `height: 56` above is untouched.
                          🔴 AND THE SENTENCE ABOVE USED TO SPELL THAT WASH AS A LIVE CLASS NAME,
                          WHICH IS WHY IT SAID 22 WHILE THE RULE PRINTED 23. `A COMMENT IS SOURCE`,
                          eighth instance, and the first on THIS rule: the spelled class became the
                          fill half of a fresh proximity pair, and the disabled-label class three
                          lines below matched the foreground half — so the paragraph explaining that
                          the rule cannot see this site MANUFACTURED a hit at this site. Bisected to
                          756f71e (pass 5 / D), which is the commit that wrote it; every count
                          before it was 22 and every count after was 23, and no code moved.
                          🔴 Do not re-spell it. The test is not "is this a class name?" but
                          "would ANY of the twenty named rules match this line if it were code?" */}
                      <Text className={`text-base font-body-semi ${
                        confirmText.toUpperCase() === 'DELETE' ? 'text-on-accent' : 'text-fg-disabled'
                      }`}>Delete My Account</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            )}

            {/* Step 3: Processing */}
            {step === 'processing' && (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={t.color.accent} />
                <Text className="text-fg text-lg mt-4">Deleting your account...</Text>
              </View>
            )}

            {/* Step 4: Complete */}
            {step === 'complete' && (
              <View className="flex-1 items-center justify-center">
                {/* §9.2 again — a tick glyph is an icon. It also resolves through the platform
                    symbol font in both shipped faces (the same finding as C-P4-3's six), so what
                    rendered here was never Figtree. */}
                <Ionicons
                  name="checkmark-circle"
                  size={56}
                  color={t.color.success}
                  style={{ marginBottom: 16 }}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <Text className="text-fg text-2xl font-body-bold mb-2">Account Deleted</Text>
                <Text className="text-fg-muted text-center">
                  Your data has been permanently removed.
                </Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default DeleteAccountModal;
