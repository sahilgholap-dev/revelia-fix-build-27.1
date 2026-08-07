# In-App Review / Rating-Trigger System — Read-Only Inventory

> **Purpose:** Verbatim snapshot of the current in-app-review / rating-trigger system and the code a planned counter-based refactor will touch. This is an inventory for planning only — **no code was changed**. Branch: `feature/build-26`. Captured 2026-06-25.

---

## Section 1 — The system being retired (full contents)

### `mobile/store/readingsStore.ts`

**Call-outs:**
- **`completedReadingsCount` field** — declared in the `ReadingsState` interface at **line 20** (`completedReadingsCount: number;`) and initialized to `0` in the store body at **line 63** (`completedReadingsCount: 0,`).
- **`incrementCompletedReadings()` action** — declared at **line 27** (`incrementCompletedReadings: () => Promise<number>;`) and implemented at **lines 119–130**. It reads the persisted value from SecureStore, increments it, writes it back, updates store state, and returns the new count. On any error it falls back to `get().completedReadingsCount + 1` **without** persisting.
- **Exact SecureStore key** — `'revelia_completed_readings_count'`, defined as the module-level constant `COMPLETED_READINGS_KEY` at **line 6**.

```tsx
import { create } from 'zustand';
import { FaceReadingOutput, PalmReadingOutput } from '@shared/types';
import { readingsService } from '@/services/readings.service';
import * as SecureStore from 'expo-secure-store';

const COMPLETED_READINGS_KEY = 'revelia_completed_readings_count';

interface ReadingsState {
  faceReading: FaceReadingOutput | null;
  palmReadingDominant: PalmReadingOutput | null;
  palmReadingNonDominant: PalmReadingOutput | null;
  combinedProfile: object | null;

  isLoadingFace: boolean;
  isLoadingPalm: boolean;
  error: string | null;
  errorCode: string | null;
  debugRef: string | null;

  completedReadingsCount: number;

  fetchFaceReading: () => Promise<void>;
  generateFaceReading: () => Promise<void>;
  fetchPalmReading: (hand: 'dominant' | 'non-dominant') => Promise<void>;
  generatePalmReading: (hand: 'dominant' | 'non-dominant') => Promise<void>;
  clearError: () => void;
  incrementCompletedReadings: () => Promise<number>;
}

interface ParsedErr {
  message: string;
  code: string | null;
  debugRef: string | null;
}

function parseErr(error: any, fallback: string): ParsedErr {
  const body = error?.response?.data;
  // New structured shape: { success:false, error: { code, message, debugRef? } }
  if (body?.error && typeof body.error === 'object') {
    return {
      message: body.error.message || fallback,
      code: body.error.code || null,
      debugRef: body.error.debugRef || null,
    };
  }
  // Legacy shape: { success:false, error: 'string' }
  if (typeof body?.error === 'string') {
    return { message: body.error, code: null, debugRef: null };
  }
  return { message: error?.message || fallback, code: null, debugRef: null };
}

export const useReadingsStore = create<ReadingsState>((set, get) => ({
  faceReading: null,
  palmReadingDominant: null,
  palmReadingNonDominant: null,
  combinedProfile: null,
  isLoadingFace: false,
  isLoadingPalm: false,
  error: null,
  errorCode: null,
  debugRef: null,
  completedReadingsCount: 0,

  fetchFaceReading: async () => {
    set({ isLoadingFace: true, error: null, errorCode: null, debugRef: null });
    try {
      const response = await readingsService.getFaceReading();
      set({ faceReading: response.reading, isLoadingFace: false });
    } catch (error: any) {
      const e = parseErr(error, 'Failed to fetch face reading');
      set({ error: e.message, errorCode: e.code, debugRef: e.debugRef, isLoadingFace: false });
    }
  },

  generateFaceReading: async () => {
    set({ isLoadingFace: true, error: null, errorCode: null, debugRef: null });
    try {
      const response = await readingsService.generateFaceReading();
      set({ faceReading: response.reading, isLoadingFace: false });
    } catch (error: any) {
      const e = parseErr(error, 'Failed to generate face reading');
      set({ error: e.message, errorCode: e.code, debugRef: e.debugRef, isLoadingFace: false });
    }
  },

  fetchPalmReading: async (hand) => {
    set({ isLoadingPalm: true, error: null, errorCode: null, debugRef: null });
    try {
      const response = await readingsService.getPalmReading(hand);
      if (hand === 'dominant') {
        set({ palmReadingDominant: response.reading, isLoadingPalm: false });
      } else {
        set({ palmReadingNonDominant: response.reading, isLoadingPalm: false });
      }
    } catch (error: any) {
      const e = parseErr(error, 'Failed to fetch palm reading');
      set({ error: e.message, errorCode: e.code, debugRef: e.debugRef, isLoadingPalm: false });
    }
  },

  generatePalmReading: async (hand) => {
    set({ isLoadingPalm: true, error: null, errorCode: null, debugRef: null });
    try {
      const response = await readingsService.generatePalmReading(hand);
      if (hand === 'dominant') {
        set({ palmReadingDominant: response.reading, isLoadingPalm: false });
      } else {
        set({ palmReadingNonDominant: response.reading, isLoadingPalm: false });
      }
    } catch (error: any) {
      const e = parseErr(error, 'Failed to generate palm reading');
      set({ error: e.message, errorCode: e.code, debugRef: e.debugRef, isLoadingPalm: false });
    }
  },

  clearError: () => set({ error: null, errorCode: null, debugRef: null }),

  incrementCompletedReadings: async () => {
    try {
      const stored = await SecureStore.getItemAsync(COMPLETED_READINGS_KEY);
      const current = stored ? parseInt(stored, 10) : 0;
      const next = current + 1;
      await SecureStore.setItemAsync(COMPLETED_READINGS_KEY, String(next));
      set({ completedReadingsCount: next });
      return next;
    } catch {
      return get().completedReadingsCount + 1;
    }
  },
}));

export default useReadingsStore;
```

---

### `mobile/lib/reviewKeys.ts`

```tsx
export const REVIEW_COUNTED_KEYS = {
  face: 'revelia_face_reading_counted',
  palm: 'revelia_palm_reading_counted',
} as const;
```

---

### `mobile/lib/inAppReview.ts`

**Call-outs:**
- **`hasPromptedThisSession` guard** — module-level `let` at **line 4**. Set to `true` at **line 11** the first time a prompt is requested in a given app session, so the native review sheet is requested **at most once per app launch** regardless of how many call sites fire. (This is in-memory only — it resets on every app restart.)
- **`isAvailableAsync()` check** — **line 9**; bails out at line 10 if `StoreReview` reports the review API is unavailable on the device.
- **Android platform gate** — **line 7** (`if (Platform.OS !== 'android') return;`). The function is a no-op on every non-Android platform, so iOS never reaches the `isAvailableAsync()` / `requestReview()` calls.

```tsx
import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

let hasPromptedThisSession = false;

export async function requestReviewIfEligible(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (hasPromptedThisSession) return;
  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return;
  hasPromptedThisSession = true;
  await StoreReview.requestReview();
}
```

---

## Section 2 — Current review/count call sites

### `mobile/app/(main)/readings/face.tsx`

Imports (lines 22–25) and the count/review `useEffect` (lines 88–101). The effect runs on every change of `faceReading`; it uses the per-reading SecureStore flag `REVIEW_COUNTED_KEYS.face` as a one-time guard so a given reading is only counted once across sessions, then increments the global count and triggers the review **only when `newCount === 2`**.

```tsx
import * as SecureStore from 'expo-secure-store';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { requestReviewIfEligible } from '@/lib/inAppReview';
import { REVIEW_COUNTED_KEYS } from '@/lib/reviewKeys';

// ... (component setup) ...

  const { faceReading, isLoadingFace, error, fetchFaceReading, clearError, incrementCompletedReadings } = useReadingsStore();
  const { user } = useAuthStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const { showPrompt, handleAccept, handleDecline } = useNotificationPermission();

  const tier = user?.subscription?.tier || 'free';
  const isPremium = tier !== 'free'; // premium or premium_plus
  const isPremiumPlus = tier === 'premium_plus';
  const bottomPad = useBottomInsetPadding();

  useEffect(() => {
    loadReading();
  }, []);

  useEffect(() => {
    if (!faceReading) return;
    (async () => {
      const alreadyCounted = await SecureStore.getItemAsync(REVIEW_COUNTED_KEYS.face);
      if (alreadyCounted) return;
      await SecureStore.setItemAsync(REVIEW_COUNTED_KEYS.face, 'true');
      const newCount = await incrementCompletedReadings();
      if (newCount === 2) requestReviewIfEligible();
    })();
  }, [faceReading]);
```

**Note:** `face.tsx` uses the **SecureStore-flag guard pattern** (`REVIEW_COUNTED_KEYS.face`), not a `useRef` guard. There is no `hasTriggeredReviewRef` in this file.

---

### `mobile/app/(main)/readings/palm.tsx`

Imports (lines 26–28) and the count/review `useEffect` (lines 119–128). Same pattern as `face.tsx` but keyed on `palmReadingDominant` and `REVIEW_COUNTED_KEYS.palm`.

```tsx
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { requestReviewIfEligible } from '@/lib/inAppReview';
import { REVIEW_COUNTED_KEYS } from '@/lib/reviewKeys';

// ... (component setup) ...

  const { palmReadingDominant, isLoadingPalm, error, fetchPalmReading, clearError, incrementCompletedReadings } = useReadingsStore();
  const { user } = useAuthStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const bottomPad = useBottomInsetPadding();

  const tier = user?.subscription?.tier || 'free';
  const isPremium = tier !== 'free'; // premium or premium_plus
  const isPremiumPlus = tier === 'premium_plus';

  useEffect(() => {
    loadReading();
  }, []);

  useEffect(() => {
    if (!palmReadingDominant) return;
    (async () => {
      const alreadyCounted = await SecureStore.getItemAsync(REVIEW_COUNTED_KEYS.palm);
      if (alreadyCounted) return;
      await SecureStore.setItemAsync(REVIEW_COUNTED_KEYS.palm, 'true');
      const newCount = await incrementCompletedReadings();
      if (newCount === 2) requestReviewIfEligible();
    })();
  }, [palmReadingDominant]);
```

**Note:** `palm.tsx` keys the effect on `palmReadingDominant` only — the non-dominant hand (`palmReadingNonDominant`) does not participate in the count.

---

### `mobile/app/(main)/readings/career-destiny.tsx`

Import (line 14) and the review `useEffect` (lines 32–38). This screen does **NOT** use the count system at all — no `incrementCompletedReadings`, no `REVIEW_COUNTED_KEYS`. It uses a `useRef` (`hasTriggeredReviewRef`) as a once-per-mount guard and calls `requestReviewIfEligible()` unconditionally as soon as `career` data is present.

```tsx
import { requestReviewIfEligible } from '@/lib/inAppReview';

// ... (component setup) ...

  const [career, setCareer] = useState<any>(null);
  const [canRegenerate, setCanRegenerate] = useState(false);

  useEffect(() => {
    fetchExisting();
  }, []);

  const hasTriggeredReviewRef = React.useRef(false);

  useEffect(() => {
    if (!career || hasTriggeredReviewRef.current) return;
    hasTriggeredReviewRef.current = true;
    requestReviewIfEligible();
  }, [career]);
```

---

### `mobile/app/(main)/compatibility/[id].tsx`

Import (line 23) and the review `useEffect` (lines 71–77). Same pattern as `career-destiny.tsx`: no count system, `useRef` guard (`hasTriggeredReviewRef`), unconditional `requestReviewIfEligible()` once `reading` is present.

```tsx
  useEffect(() => {
    loadReading();
  }, [id]);

  const hasTriggeredReviewRef = useRef(false);

  useEffect(() => {
    if (!reading || hasTriggeredReviewRef.current) return;
    hasTriggeredReviewRef.current = true;
    requestReviewIfEligible();
  }, [reading]);
```

---

## Section 3 — Screens that will gain a recorder call

### `mobile/app/(main)/astrology/daily.tsx`

This screen currently has **no review / count logic** of any kind. Data comes from `useInsightsStore` via `fetchDailyInsight()`.

**The variable that flips when the reading is ready:** `dailyInsight` (from `useInsightsStore`). The loaded/displayed state is gated by:
- `isLoadingDaily` — `true` while fetching (renders `<LoadingSpinner>`).
- `!dailyInsight` — renders the "Daily Insight Unavailable" empty/error state.
- Once `dailyInsight` is truthy and `isLoadingDaily` is false, the full result renders.

Setup + render gating (lines 52–99):

```tsx
export default function DailyInsightScreen() {
  const router = useRouter();
  const bottomPad = useBottomInsetPadding();
  const { user } = useAuthStore();
  const { dailyInsight, isLoadingDaily, error, fetchDailyInsight, clearError } = useInsightsStore();
  const shareRef = useRef(null);

  useEffect(() => {
    fetchDailyInsight();
  }, []);

  if (isLoadingDaily) {
    return (
      <ScreenContainer withScrollView={false}>
        <LoadingSpinner text="Consulting the cosmos for you..." fullScreen />
      </ScreenContainer>
    );
  }

  if (!dailyInsight) {
    return (
      <ScreenContainer withScrollView={false}>
        <View className="flex-1 items-center justify-center p-6">
          <TouchableOpacity onPress={() => router.back()} className="absolute top-16 left-6">
            <Text className="text-primary text-lg">← Back</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold mb-3">
            Daily Insight Unavailable
          </Text>
          <Text className="text-gray-400 text-center mb-6">
            {error || 'Complete your face and palm readings first to unlock daily insights.'}
          </Text>
          <Button
            title="Retry"
            onPress={() => { clearError(); fetchDailyInsight(); }}
            variant="primary"
          />
        </View>
      </ScreenContainer>
    );
  }

  // Detect new vs legacy format
  const isNewFormat = 'overallEnergy' in dailyInsight;
  const score = dailyInsight.overallEnergy?.score || 7;
  const headline = dailyInsight.overallEnergy?.headline || (dailyInsight as any).headline || '';

  return (
    <ScreenContainer withScrollView={false}>
      <ScrollView ...>
        {/* result render begins here — energy card, sections, lucky elements, etc. */}
```

There is a `shareRef` used with `ShareableQuote` (`onShare={() => shareReadingCard(shareRef)}`) but **no review call is wired to it**.

---

### `mobile/app/(main)/astrology/monthly.tsx`

This screen also currently has **no review / count logic**. Data comes from `useInsightsStore` via `fetchMonthlyReading()`.

**The variable that flips when the reading is ready:** `monthlyReading` (from `useInsightsStore`). Gating:
- `renderError` (local state) — renders an error fallback if a render-time data-shape error was caught.
- `isLoadingMonthly` — `true` while fetching (renders `<GeneratingReading type="monthly" />`).
- `!monthlyReading` — renders the "Monthly Reading Unavailable" empty/error state.
- Once `monthlyReading` is truthy (and not loading / no render error), the full result renders.

Setup + render gating (lines 39–93):

```tsx
export default function MonthlyReadingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const tier = user?.subscription?.tier || 'free';
  const { monthlyReading, isLoadingMonthly, error, fetchMonthlyReading, clearError } = useInsightsStore();
  const [renderError, setRenderError] = useState<string | null>(null);
  const bottomPad = useBottomInsetPadding();

  useEffect(() => {
    fetchMonthlyReading();
  }, []);

  // Catch render errors from data shape mismatches
  if (renderError) {
    return (
      <MonthlyReadingErrorFallback
        error="We had trouble displaying your reading. Please try refreshing."
        onRetry={() => { setRenderError(null); clearError(); fetchMonthlyReading(); }}
      />
    );
  }

  if (isLoadingMonthly) {
    return <GeneratingReading type="monthly" />;
  }

  if (!monthlyReading) {
    return (
      <ScreenContainer withScrollView={false}>
        <View className="flex-1 items-center justify-center p-6">
          <TouchableOpacity onPress={() => router.back()} className="absolute top-16 left-6">
            <Text className="text-primary text-lg">← Back</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold mb-3">
            Monthly Reading Unavailable
          </Text>
          <Text className="text-gray-400 text-center mb-6">
            {error || 'Complete your face and palm readings first to unlock monthly insights.'}
          </Text>
          <Button
            title="Retry"
            onPress={() => { clearError(); fetchMonthlyReading(); }}
            variant="primary"
          />
        </View>
      </ScreenContainer>
    );
  }

  const isPremium = tier !== 'free';
  const isPremiumPlus = tier === 'premium_plus';

  console.log('Monthly reading data:', JSON.stringify(monthlyReading?.areas ? Object.keys(monthlyReading.areas) : 'no areas'));

  return (
    <ScreenContainer withScrollView={false}>
      <ScrollView ...>
        {/* result render begins here — theme, overview, key dates, etc. */}
```

**Note:** the monthly `ShareableQuote` is wired to a no-op (`onShare={() => {}}`), so unlike `daily.tsx` it has no working share path.

---

## Section 4 — Share completion path

### `mobile/utils/shareReading.ts` (full contents)

A successful share resolves when `RNShare.open(...)` resolves (line 26), or — in its `catch` — when `Sharing.shareAsync(...)` resolves (line 33), or when there is no captured image and `Share.share(...)` resolves (line 36). The function returns `Promise<void>` and has **no return value / success flag** to hook onto; a recorder would have to be placed after the `await` resolves (i.e. after this function returns without throwing). Note the capture failure path: if `captureRef` throws, `uri` stays `null`, the error is only `console.error`'d, and the function falls through to the text-only `Share.share`.

```tsx
import { Share, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { RefObject } from 'react';
import { SHARE_FOOTER } from '@/lib/shareUtils';
import RNShare from 'react-native-share';

export async function shareReadingCard(viewRef: RefObject<View | null>): Promise<void> {
  if (!viewRef.current) {
    throw new Error('View ref not ready');
  }

  let uri: string | null = null;
  try {
    uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile'
    });
  } catch (error) {
    console.error('Failed to capture view snapshot:', error);
  }

  if (uri) {
    try {
      await RNShare.open({
        title: 'Revelia Reading',
        message: SHARE_FOOTER,
        url: `file://${uri}`,
        type: 'image/png',
      });
    } catch {
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    }
  } else {
    await Share.share({ message: SHARE_FOOTER });
  }
}
```

---

### Inline share function in `mobile/app/(main)/compatibility/[id].tsx`

`shareReadingCard` (lines 91–127). This is a **local, in-component reimplementation** — it does NOT call `utils/shareReading.ts`. The successful-share point is the `Haptics.notificationAsync(...Success)` at **line 121**, reached after whichever share path (`RNShare.open` → fallback `Sharing.shareAsync`, or text-only `Share.share`) resolves without throwing. Any throw lands in the `catch` at line 122 (error haptic + alert).

```tsx
  const shareReadingCard = async () => {
    if (!shareRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let uri: string | null = null;
    try {
      uri = await captureRef(shareRef, {
        format: 'png',
        quality: 1,
      });
    } catch (error) {
      console.error('Failed to capture view snapshot:', error);
    }

    try {
      if (uri) {
        try {
          await RNShare.open({
            title: 'Revelia Reading',
            message: SHARE_FOOTER,
            url: `file://${uri}`,
            type: 'image/png',
          });
        } catch {
          await Sharing.shareAsync(uri, { mimeType: 'image/png' });
        }
      } else {
        await Share.share({ message: SHARE_FOOTER });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Share error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Share Failed', 'Unable to share the reading');
    }
  };
```

---

## Section 5 — Patterns to mirror

### `mobile/lib/storage.ts` (full contents)

**Wrapper method names:** `saveToken` / `getToken` / `removeToken`, `saveRefreshToken` / `getRefreshToken` / `removeRefreshToken`, `saveUser` / `getUser` / `removeUser`, and `clearAll`. Internally each wraps `SecureStore.setItemAsync` / `getItemAsync` / `deleteItemAsync`. Keys: `revelia_auth_token`, `revelia_refresh_token`, `revelia_user`.

> **Note:** this is a thin per-key wrapper module, **not** a generic `getItem(key)`/`setItem(key)` interface — every value gets its own named method. There is no generic key-value setter exposed; the review-count system bypasses `storage.ts` entirely and calls `SecureStore` directly (see `readingsStore.ts` and the screens).

```tsx
import * as SecureStore from 'expo-secure-store';

// User type
export interface User {
  _id: string;
  email: string;
  name?: string;
  authProvider: 'email' | 'apple' | 'google';
  appleId?: string;
  googleId?: string;
  subscription: {
    tier: 'free' | 'premium' | 'premium_plus';
    revenueCatId?: string;
    expiresAt?: string;
  };
  preferences: {
    notifications: boolean;
    dailyInsightTime?: string;
    timezone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const TOKEN_KEY = 'revelia_auth_token';
const REFRESH_TOKEN_KEY = 'revelia_refresh_token';
const USER_KEY = 'revelia_user';

export const storage = {
  // Token management
  saveToken: async (token: string) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  },

  getToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  removeToken: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },

  // Refresh token management
  saveRefreshToken: async (refreshToken: string) => {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Error saving refresh token:', error);
      throw error;
    }
  },

  getRefreshToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  removeRefreshToken: async () => {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error removing refresh token:', error);
    }
  },

  // User management (for quick access without API call)
  saveUser: async (user: User) => {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  },

  getUser: async (): Promise<User | null> => {
    try {
      const userData = await SecureStore.getItemAsync(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  removeUser: async () => {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  },

  // Clear all auth data
  clearAll: async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing all storage:', error);
    }
  },
};

export default storage;
```

---

### Representative persist + rehydrate store

**Store chosen: `mobile/store/authStore.ts` (NOT `readingsStore.ts`, NOT `insightsStore.ts`).**

**Why:**
- `readingsStore.ts` is **not** a clean persist+rehydrate example. It persists only a single counter (`completedReadingsCount`) to SecureStore via inline `SecureStore` calls inside `incrementCompletedReadings`, and it **never rehydrates that value at launch** — the store always initializes `completedReadingsCount: 0` and only reads the persisted number transiently inside the increment action. So the in-memory `completedReadingsCount` is effectively meaningless across launches; the real source of truth is the SecureStore key read fresh each time.
- `insightsStore.ts` does **not persist at all** (no SecureStore / no AsyncStorage / no persist middleware — confirmed by grep; it is just `create<InsightsState>((set) => ({ ... }))`).
- No store in `mobile/store/` uses zustand's `persist` middleware or `AsyncStorage` (grep for `persist`/`AsyncStorage` over the store dir returns nothing). **The only genuine persist-then-rehydrate-at-launch pattern in the codebase is `authStore` + `storage.ts`.**

**The pattern to mirror (from `authStore.ts`):**
- **Persist on write:** every login path calls `await storage.saveToken(token)` + `await storage.saveUser(user)` before/with `set(...)` (see `login` lines 89–92, `signup` 54–57, Apple 185–188, Google 241–244).
- **Rehydrate at launch:** `checkAuth()` (lines 303–331) reads the persisted token via `storage.getToken()`, verifies it against the backend (`authAPI.getMe()`), re-saves the canonical user, and `set(...)`s the rehydrated state. It also flips a `hasHydrated` flag so the splash/router waits for the SecureStore read to complete before routing (lines 17–21 comment explains the expo-router race).
- **Clear on logout:** `logout()` calls `storage.clearAll()` then resets store state (lines 298–299).

Relevant excerpts:

```tsx
// --- interface flag for rehydration completion ---
  // True after the first checkAuth() call resolves (success or failure). Lets
  // app/index.tsx hold the splash before evaluating any redirect, avoiding the
  // expo-router 5 race where the router renders on resume before SecureStore
  // reads complete and routes a still-rehydrating user to onboarding.
  hasHydrated: boolean;

// --- persist on write (login path) ---
      const { user, token } = response.data;

      await storage.saveToken(token);
      await storage.saveUser(user);

      set({ user, token, isAuthenticated: true, isLoading: false });

// --- rehydrate at launch ---
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

// --- clear on logout ---
    await storage.clearAll();
    set({ user: null, token: null, isAuthenticated: false, error: null });
```

---

## Section 6 — Prose answers

### 6.1 — Is `completedReadingsCount` read or referenced anywhere besides `face.tsx` / `palm.tsx`?

**No.** A grep of the entire `mobile/` tree for `completedReadingsCount` / `incrementCompletedReadings` returns references in only two places:

- **`mobile/store/readingsStore.ts`** — where it is *defined*:
  - `readingsStore.ts:20` — interface field `completedReadingsCount: number;`
  - `readingsStore.ts:27` — interface action `incrementCompletedReadings: () => Promise<number>;`
  - `readingsStore.ts:63` — initial value `completedReadingsCount: 0,`
  - `readingsStore.ts:119` — action implementation
  - `readingsStore.ts:125` — `set({ completedReadingsCount: next });`
  - `readingsStore.ts:128` — fallback `return get().completedReadingsCount + 1;`
- **`mobile/app/(main)/readings/face.tsx`** — `face.tsx:78` (destructured from store) and `face.tsx:98` (called).
- **`mobile/app/(main)/readings/palm.tsx`** — `palm.tsx:106` (destructured) and `palm.tsx:126` (called).

There is **no UI surfacing** of the count (it is never rendered), **no backend sync** (it is never sent to the server), and **no other gate** keyed on it. The `career-destiny.tsx` and `compatibility/[id].tsx` review triggers do **not** touch the count at all.

### 6.2 — SecureStore keys related to reviews / ratings / counts

| Key string | File(s) it is written/read in | Survives a fresh install? |
|---|---|---|
| `revelia_completed_readings_count` | `mobile/store/readingsStore.ts:6` (const), read `:121`, write `:124` | No — SecureStore only; never backed up to or restored from a backend. |
| `revelia_face_reading_counted` | `mobile/lib/reviewKeys.ts:2`; read `face.tsx:95`, write `face.tsx:97` | No — SecureStore only; local guard flag. |
| `revelia_palm_reading_counted` | `mobile/lib/reviewKeys.ts:3`; read `palm.tsx:122`, write `palm.tsx:124` | No — SecureStore only; local guard flag. |
| `last_review_request` | `mobile/hooks/useAppReview.ts` — read `:10`, write `:38` | No — SecureStore only. **(Belongs to the dormant `useAppReview` hook — see 6.4.)** |
| `review_declined_count` | `mobile/hooks/useAppReview.ts` — read `:11` & `:43`, write `:45` | No — SecureStore only. **(Dormant — see 6.4.)** |

**Confirmation:** none of these keys are written to a backend or restored from one. They are all written/read exclusively via `expo-secure-store`. On Android, SecureStore is cleared on uninstall, so **none survive a fresh install** — a reinstalled user starts the counter at 0 and both per-reading guard flags reset.

Related-but-not-review SecureStore keys found nearby (for completeness, not part of the review system): `notification_prompt_shown` (`useNotificationPermission.ts`), `biometric_consent_palm` / `biometric_consent_face` (capture screens), and the auth keys in `storage.ts`.

### 6.3 — Is the review trigger currently Android-only in practice, and what gates it?

**Yes — Android-only in practice.** The single gate is in `mobile/lib/inAppReview.ts:7`: `if (Platform.OS !== 'android') return;`. Because *every* call site (`face.tsx`, `palm.tsx`, `career-destiny.tsx`, `compatibility/[id].tsx`) routes through `requestReviewIfEligible()`, the platform check applies uniformly and the native review sheet is never requested on iOS.

Additional gates layered on top (Android path only):
- **`hasPromptedThisSession`** (in-memory `let`, `inAppReview.ts:4`/`:8`/`:11`) — at most one prompt per app launch.
- **`StoreReview.isAvailableAsync()`** (`inAppReview.ts:9`) — bails if the device's review API is unavailable.
- **Per-call-site count/guard logic** — on `face`/`palm`, the SecureStore "counted" flag + the `newCount === 2` condition; on `career-destiny`/`compatibility`, a per-mount `useRef` guard with no count condition.

There is **no iOS App Store ID placeholder** anywhere — iOS is simply never reached. (The dormant `useAppReview` hook is platform-agnostic but is not wired in; see 6.4.)

### 6.4 — Other things a counter-based refactor would need to account for

1. **Two parallel, divergent trigger patterns exist today.** `face.tsx`/`palm.tsx` use the SecureStore-flag + global-count + `=== 2` pattern; `career-destiny.tsx`/`compatibility/[id].tsx` use a `useRef`-guard + unconditional-fire pattern that ignores the count entirely. A unified counter-based refactor must reconcile these — today a user can hit the review prompt from career/compatibility **without ever incrementing or consulting the count**, so the "2 readings" intent is not actually enforced globally.

2. **`incrementCompletedReadings` never rehydrates at launch.** The store always inits `completedReadingsCount: 0` and reads the real value transiently from SecureStore inside the action. The in-memory value is therefore unreliable across launches — any refactor that reads `useReadingsStore().completedReadingsCount` directly (instead of the SecureStore key) will see stale/zero values until an increment runs.

3. **`newCount === 2` is a strict equality, not `>=`.** If a counted-flag write succeeds but the increment's `set` is interrupted, or if the count is ever decremented/desynced, the trigger can be permanently missed (count jumps past 2). A robust refactor should consider `>=` plus a "already prompted" flag rather than exact-equality.

4. **The per-reading guard flag and the global count are two separate SecureStore writes** (`REVIEW_COUNTED_KEYS.face`/`.palm` set, then `incrementCompletedReadings`). They are not atomic; an interruption between the two leaves a reading marked "counted" but not actually counted (or vice-versa on the fallback path where `incrementCompletedReadings` catches and returns a number **without persisting**).

5. **Dominant-palm-only counting.** `palm.tsx` keys its effect on `palmReadingDominant`. A second (non-dominant) palm reading does not count.

6. **Effect re-fire on data identity change.** The `face`/`palm` effects depend on the reading object (`[faceReading]` / `[palmReadingDominant]`). The SecureStore "counted" flag (not a ref) is what prevents double-counting across re-renders/remounts and across sessions; if a refactor drops that flag in favor of an in-memory ref, navigating away and back (remount) or a store refetch that produces a new object reference could re-count.

7. **Dormant duplicate review system — `mobile/hooks/useAppReview.ts`.** A second, more sophisticated review mechanism exists (30-day cooldown via `last_review_request`, max-3-declines via `review_declined_count`, platform-agnostic) but is **not imported by any screen** (grep for `useAppReview` only hits its own definition and `mobile/UI_POLISH_COMPLETE.md` docs). It owns two SecureStore keys (see 6.2). A refactor should decide whether to delete it, or adopt its cooldown/decline logic into the new system — and clean up its orphaned keys.

8. **`monthly.tsx` share is a no-op** (`onShare={() => {}}`) and `daily.tsx`/`monthly.tsx` have no review logic at all today — so adding a recorder there is net-new wiring, not a modification of existing trigger code. `daily.tsx` does have a working `shareReadingCard(shareRef)` path; `monthly.tsx` does not.

9. **`career-destiny.tsx` fires on cached data too.** Its effect fires as soon as `career` is set, which includes the `fetchExisting()` path (previously generated, loaded from backend) — i.e. it can prompt on a screen the user has merely revisited, not freshly generated.
