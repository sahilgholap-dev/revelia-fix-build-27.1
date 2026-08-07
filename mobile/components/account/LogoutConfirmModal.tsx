import React from 'react';
import { Sheet } from '@/components/ui/Sheet';
import * as Haptics from 'expo-haptics';

/**
 * LogoutConfirmModal — migrated onto `Sheet` at §9 item 15.
 *
 * 🔴 IT IS THE ONE ACCOUNT MODAL WHOSE SHAPE ALREADY MATCHED. The other four are full-screen page
 *    sheets with headers and multi-field forms; converting them is screens-phase work and would
 *    import §2.1's prohibition into files where the danger role is currently legal (their ground is
 *    the canvas at 5.17:1, not the overlay step at 4.28:1). See Sheet's own header.
 *
 * ⚠️ LOG OUT IS NOT A DESTRUCTIVE ACTION AND IS DELIBERATELY NOT STYLED AS ONE. It is fully
 *    reversible — you log back in — and §2.1's destructive treatment is for the irreversible. The
 *    action keeps the PRIMARY variant it has always had (§0.0 rule 1: preserve behaviour). The one
 *    genuinely destructive surface in the app is the account-deletion flow, and that is where the
 *    danger-fill pairing stays pinned.
 *
 * ⚠️ THE TWO ACTIONS RESTACK, AND THAT IS THE DESIGN'S LAYOUT, NOT A SIDE EFFECT. They were side by
 *    side, cancel on the left; §2.1 puts the reversible choice BELOW so it is thumb-nearest. That
 *    ordering is the whole reason the spec mentions position at all.
 */
interface LogoutConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({ visible, onConfirm, onCancel }: LogoutConfirmModalProps) {
  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
  };

  return (
    <Sheet
      visible={visible}
      title="Log Out?"
      body="Are you sure you want to log out of your account?"
      onDismiss={handleCancel}
      primary={{ title: 'Log Out', onPress: handleConfirm }}
      cancel={{ title: 'Cancel', onPress: handleCancel }}
    />
  );
}

export default LogoutConfirmModal;
