import { Alert, AlertButton } from 'react-native';

export type { AlertButton };

/**
 * Cross-platform replacement for `Alert.alert`.
 *
 * 🔴 WHY THIS EXISTS: react-native-web's Alert is a LITERAL NO-OP —
 *
 *     class Alert { static alert() {} }
 *
 * — so on web every confirmation, every error message and every destructive
 * "are you sure?" simply did not happen. No dialog, no callback, no console
 * warning. 52 call sites across 19 files were affected, including login and
 * signup errors, password reset, paywall purchase failures, and the delete-
 * account confirmation. The reported symptom was Home's Face and Palm tiles
 * "not working": both call an alert when a reading already exists, so the
 * button genuinely did nothing.
 *
 * Native keeps the platform dialog verbatim — same arguments, same behaviour.
 * The web fork draws an equivalent modal; see alert.web.ts.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  Alert.alert(title, message, buttons);
}
