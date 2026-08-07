import { create } from 'zustand';
import { authAPI, User } from '../lib/api';
import { storage } from '../lib/storage';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { identifyUser, logoutRevenueCat } from '../lib/revenuecat';
import { subscriptionService } from '../services/subscription.service';
import { configureGoogleSignIn, signInWithGoogle, signOutGoogle, GOOGLE_SIGN_IN_CANCELLED } from '../lib/googleSignIn';
import { loginOneSignalUser, logoutOneSignalUser, setUserTags } from '../lib/onesignal';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // True after the first checkAuth() call resolves (success or failure). Lets
  // app/index.tsx hold the splash before evaluating any redirect, avoiding the
  // expo-router 5 race where the router renders on resume before SecureStore
  // reads complete and routes a still-rehydrating user to onboarding.
  hasHydrated: boolean;

  // Actions
  signup: (name: string, email: string, password: string, verificationToken?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithApple: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUserName: (newName: string) => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  hasHydrated: false,

  signup: async (name, email, password, verificationToken?) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.signup(name, email, password, verificationToken);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Signup failed');
      }

      const { user, token } = response.data;

      await storage.saveToken(token);
      await storage.saveUser(user);

      set({ user, token, isAuthenticated: true, isLoading: false });

      // Identify user with RevenueCat
      try {
        await identifyUser(user._id);
        await subscriptionService.linkRevenueCatUser(user._id);
      } catch (error) {
        console.error('RevenueCat identification error:', error);
      }

      loginOneSignalUser(user._id).catch(e => console.warn('[OneSignal] signup login failed:', e));

      // Navigate to birth data collection
      router.replace('/(capture)/birth-data' as any);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Signup failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(email, password);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Login failed');
      }

      const { user, token } = response.data;

      await storage.saveToken(token);
      await storage.saveUser(user);

      set({ user, token, isAuthenticated: true, isLoading: false });

      // Identify user with RevenueCat
      try {
        await identifyUser(user._id);
        await subscriptionService.linkRevenueCatUser(user._id);
      } catch (error) {
        console.error('RevenueCat identification error:', error);
      }

      try {
        loginOneSignalUser(user._id);
        setUserTags({ tier: user.subscription?.tier || 'free', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      } catch (error) {
        console.error('OneSignal login error:', error);
      }

      // Defer to index.tsx for the canonical post-auth routing decision.
      // index.tsx checks profile state (birthData, face image, palm image)
      // and routes to /(capture)/birth-data, face-capture, palm-capture, or
      // /(main)/home. This handles the edge case of a user who bailed mid-
      // onboarding and now logs back in.
      router.replace('/' as any);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  loginWithApple: async () => {
    if (Platform.OS !== 'ios') {
      set({ error: 'Apple Sign In is only available on iOS' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Use require for conditional import
      const AppleAuthentication = require('expo-apple-authentication');

      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign In is not available on this device');
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      // Apple returns fullName ONLY on the first sign-in for a given
      // Apple ID + bundle ID combo. Subsequent attempts (re-installs,
      // dev resets, returning users) come back with fullName=null —
      // Apple's intentional privacy posture. Backend tolerates null and
      // falls through to the birth-data onboarding name field.
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(' ')
            .trim() || null
        : null;

      const response = await authAPI.loginWithApple(
        credential.identityToken,
        fullName,
        credential.fullName || credential.email
          ? {
              name: credential.fullName
                ? {
                    firstName: credential.fullName.givenName || undefined,
                    lastName: credential.fullName.familyName || undefined,
                  }
                : undefined,
              email: credential.email || undefined,
            }
          : undefined
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Apple Sign In failed');
      }

      const { user, token } = response.data;

      await storage.saveToken(token);
      await storage.saveUser(user);

      set({ user, token, isAuthenticated: true, isLoading: false });

      // Identify user with RevenueCat
      try {
        await identifyUser(user._id);
        await subscriptionService.linkRevenueCatUser(user._id);
      } catch (error) {
        console.error('RevenueCat identification error:', error);
      }

      try {
        loginOneSignalUser(user._id);
        setUserTags({ tier: user.subscription?.tier || 'free', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      } catch (error) {
        console.error('OneSignal login error:', error);
      }

      // Defer to index.tsx for the canonical post-auth routing decision.
      // For NEW Apple users (no birthData/face/palm yet) this routes to
      // /(capture)/birth-data — they need onboarding before reaching home.
      // For RETURNING Apple users with full profile, index.tsx routes
      // straight to /(main)/home as before.
      router.replace('/' as any);
    } catch (error: any) {
      // User cancelled the sign-in flow
      if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED') {
        set({ isLoading: false });
        return;
      }

      const errorMessage = error.response?.data?.error || error.message || 'Apple Sign In failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  loginWithGoogle: async () => {
    // 🔴 TWO gates guard this flow and BOTH have to agree — the button's own
    //    Platform check in the three auth screens, and this one. Widening only
    //    the UI made the button appear and then do nothing: this guard returned
    //    early and merely set an inline error, so nothing threw and no dialog
    //    appeared. If Google ever seems dead on a platform, check both.
    //
    //    Android and web are allowed; iOS-native is not, because App Store
    //    guideline 4.8 requires Sign in with Apple alongside any third-party
    //    sign-in. That rule governs an App Store binary — a PWA in Safari is
    //    not reviewed by Apple, so the WEB build may offer Google on an iPhone,
    //    which matters because web is the only route iOS users have.
    if (Platform.OS !== 'android' && Platform.OS !== 'web') {
      set({ error: 'Google Sign In is not available on this platform' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      configureGoogleSignIn();
      const { idToken, name } = await signInWithGoogle();

      const response = await authAPI.loginWithGoogle(idToken, name);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Google Sign In failed');
      }

      const { user, token } = response.data;
      await storage.saveToken(token);
      await storage.saveUser(user);

      set({ user, token, isAuthenticated: true, isLoading: false });

      try {
        await identifyUser(user._id);
        await subscriptionService.linkRevenueCatUser(user._id);
      } catch (error) {
        console.error('RevenueCat identification error:', error);
      }

      try {
        loginOneSignalUser(user._id);
        setUserTags({ tier: user.subscription?.tier || 'free', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      } catch (error) {
        console.error('OneSignal login error:', error);
      }

      // Defer to index.tsx for canonical post-auth routing — new Google users
      // (no profile yet) go to /(capture)/birth-data; returning users go to home.
      router.replace('/' as any);
    } catch (error: any) {
      if (error.code === GOOGLE_SIGN_IN_CANCELLED) {
        set({ isLoading: false });
        return;
      }
      const errorMessage = error.response?.data?.error || error.message || 'Google Sign In failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    try {
      logoutOneSignalUser();
    } catch (error) {
      console.error('OneSignal logout error:', error);
    }

    // Logout from RevenueCat
    await logoutRevenueCat();

    if (Platform.OS === 'android') {
      try {
        await signOutGoogle();
      } catch (error) {
        console.error('Google sign-out error:', error);
      }
    }

    await storage.clearAll();
    set({ user: null, token: null, isAuthenticated: false, error: null });
    router.replace('/(auth)/login');
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await storage.getToken();

      if (!token) {
        set({ isLoading: false, isAuthenticated: false, hasHydrated: true });
        return;
      }

      // Verify token with backend
      const response = await authAPI.getMe();

      if (!response.success || !response.data) {
        throw new Error('Invalid token');
      }

      const user = response.data.user;

      await storage.saveUser(user);

      set({ user, token, isAuthenticated: true, isLoading: false, hasHydrated: true });
      loginOneSignalUser(user._id).catch(e => console.warn('[OneSignal] checkAuth login failed:', e));
    } catch (error) {
      console.error('Auth check failed:', error);
      await storage.clearAll();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false, hasHydrated: true });
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user: User) => set({ user }),

  /**
   * Update the user's display name. Optimistically updates local state,
   * rolls back on backend failure. Backend enforces tier-based rate limit
   * + multi-layer validation; mobile only does a length check for UX.
   */
  updateUserName: async (newName: string) => {
    const previousUser = get().user;
    if (!previousUser) {
      throw new Error('Not signed in');
    }
    // Optimistic update
    set({ user: { ...previousUser, name: newName.trim() } });
    try {
      const response = await authAPI.updateName(newName);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update name');
      }
      // Backend echoes the canonical user object — adopt it as truth.
      const updatedUser = response.data.user;
      await storage.saveUser(updatedUser);
      set({ user: updatedUser });
    } catch (err: any) {
      // Roll back optimistic update on failure
      set({ user: previousUser });
      throw err;
    }
  },
}));

export default useAuthStore;
