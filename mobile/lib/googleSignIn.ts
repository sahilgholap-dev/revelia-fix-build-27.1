import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const GOOGLE_SIGN_IN_CANCELLED = 'GOOGLE_SIGN_IN_CANCELLED';

export function configureGoogleSignIn(): void {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
}

export async function signInWithGoogle(): Promise<{ idToken: string; name: string }> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') {
    const err: any = new Error('Sign-In cancelled');
    err.code = GOOGLE_SIGN_IN_CANCELLED;
    throw err;
  }
  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error('No ID token received from Google — ensure webClientId is set');
  }
  const name = response.data?.user?.name ?? '';
  return { idToken, name };
}

export async function signOutGoogle(): Promise<void> {
  // The SDK isn't guaranteed configured at logout time (e.g. after an app
  // restart), and unconfigured calls can throw — so configure first.
  configureGoogleSignIn();
  await GoogleSignin.signOut();
}
