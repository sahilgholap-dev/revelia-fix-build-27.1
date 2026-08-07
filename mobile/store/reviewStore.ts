import { create } from 'zustand';
import * as SecureStore from '@/lib/secureStorage';
import { attemptReview } from '@/lib/inAppReview';

// Single source of truth for the app-rating counter. Mirrors the persist/
// rehydrate idiom of authStore.ts + storage.ts, but this store owns its own
// SecureStore calls (storage.ts exposes no generic setter and we don't add one).
//
// Persistence model: one SecureStore key holding one JSON blob. The in-memory
// Zustand state is authoritative once initReviewStore() has rehydrated it at
// launch; SecureStore is just the durable mirror. We never re-read SecureStore
// to compute an increment (that was the lost-update race in the old system).

const REVIEW_STATE_KEY = 'revelia_review_state';

interface ReviewState {
  count: number;
  nextThreshold: number;            // rating-prompt ladder; starts at 6
  oneTime: Record<string, true>;    // keys like 'reading:face', 'share:palm', 'compat:<id>'
  lastDailyDate: string | null;     // 'YYYY-MM-DD'
  lastMonthlyMonth: string | null;  // 'YYYY-MM'
  // Runtime-only; NOT persisted. True once the blob has been read at launch.
  hydrated: boolean;
}

const DEFAULTS = {
  count: 0,
  nextThreshold: 6,
  oneTime: {} as Record<string, true>,
  lastDailyDate: null as string | null,
  lastMonthlyMonth: null as string | null,
};

export const useReviewStore = create<ReviewState>(() => ({
  ...DEFAULTS,
  hydrated: false,
}));

// Rating-prompt ladder. Given the current threshold, returns the next one:
// +10, then +15, then +20 forever. Pure → testable by inspection:
//   6 → 16 → 31 → 51 → 71 → 91 → 111 → ...
export function nextThresholdAfter(current: number): number {
  if (current === 6) return 16;  // +10
  if (current === 16) return 31; // +15
  return current + 20;           // +20 forever (31→51→71→91→…)
}

// Snapshot of the persisted fields only (excludes the runtime `hydrated` flag).
function persistedSnapshot() {
  const s = useReviewStore.getState();
  return {
    count: s.count,
    nextThreshold: s.nextThreshold,
    oneTime: s.oneTime,
    lastDailyDate: s.lastDailyDate,
    lastMonthlyMonth: s.lastMonthlyMonth,
  };
}

// Fire-and-forget write of the whole blob. Failures are non-fatal — the
// in-memory state stays correct for the session; we just lose durability.
function persist(): void {
  SecureStore.setItemAsync(REVIEW_STATE_KEY, JSON.stringify(persistedSnapshot())).catch((e) => {
    console.warn('[Review] persist failed:', e);
  });
}

// Guard against double-init (mirrors initSubscriptionSync's customerInfoListenerRegistered).
let initialized = false;

/**
 * Read the persisted blob once and load it into memory. Call at app launch
 * (root _layout) so the count survives restarts — the rehydration the old
 * counter never had. Idempotent.
 */
export async function initReviewStore(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const raw = await SecureStore.getItemAsync(REVIEW_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      useReviewStore.setState({
        count: typeof parsed.count === 'number' ? parsed.count : DEFAULTS.count,
        nextThreshold:
          typeof parsed.nextThreshold === 'number' ? parsed.nextThreshold : DEFAULTS.nextThreshold,
        oneTime:
          parsed.oneTime && typeof parsed.oneTime === 'object' ? parsed.oneTime : {},
        lastDailyDate: typeof parsed.lastDailyDate === 'string' ? parsed.lastDailyDate : null,
        lastMonthlyMonth:
          typeof parsed.lastMonthlyMonth === 'string' ? parsed.lastMonthlyMonth : null,
        hydrated: true,
      });
    } else {
      // Absent → initialize defaults and persist them.
      useReviewStore.setState({ ...DEFAULTS, hydrated: true });
      persist();
    }
  } catch (e) {
    // Parse failure / read error → fall back to defaults and persist.
    console.warn('[Review] init failed, using defaults:', e);
    useReviewStore.setState({ ...DEFAULTS, hydrated: true });
    persist();
  }
}

/**
 * The single entry point screens call when the user reaches a meaningful
 * moment. `key` is one of:
 *   reading:<type>   share:<type>   compat:<id>
 *   daily:<YYYY-MM-DD>   monthly:<YYYY-MM>   astrologer:<YYYY-MM-DD>
 *
 * Idempotent per dedup key — calling it repeatedly on remount / refetch /
 * cached revisit is a no-op after the first time (this replaces BUG-003's
 * per-screen guard). On a genuinely new action it increments the count,
 * persists, and may surface the native review prompt.
 */
export async function recordMeaningfulAction(key: string): Promise<void> {
  // Never increment off a stale/zero in-memory count before the persisted blob
  // has been read. Normally init already ran at launch; this is cheap insurance
  // (initReviewStore is idempotent) for an early call.
  if (!useReviewStore.getState().hydrated) {
    await initReviewStore();
  }

  const s = useReviewStore.getState();

  // Dedup: daily/monthly compare against the last recorded period (single
  // value, no unbounded growth); everything else is a one-time key.
  if (key.startsWith('daily:')) {
    const date = key.slice('daily:'.length);
    if (s.lastDailyDate === date) return;
    useReviewStore.setState({ count: s.count + 1, lastDailyDate: date });
  } else if (key.startsWith('monthly:')) {
    const month = key.slice('monthly:'.length);
    if (s.lastMonthlyMonth === month) return;
    useReviewStore.setState({ count: s.count + 1, lastMonthlyMonth: month });
  } else {
    if (s.oneTime[key]) return;
    useReviewStore.setState({ count: s.count + 1, oneTime: { ...s.oneTime, [key]: true } });
  }

  // In-memory count is authoritative; persist the whole blob fire-and-forget.
  persist();

  // Prompt check. Advance the ladder ONLY if a real prompt attempt was made
  // (Android + available + not already prompted this session). If no real
  // attempt, leave nextThreshold unchanged so the next eligible action retries.
  const { count, nextThreshold } = useReviewStore.getState();
  if (count >= nextThreshold) {
    const attempted = await attemptReview();
    if (attempted) {
      useReviewStore.setState({ nextThreshold: nextThresholdAfter(nextThreshold) });
      persist();
    }
  }
}

// ── Build 27 seam ────────────────────────────────────────────────────────────
// The AI Astrologer action will record through this same entry point. Nothing
// is wired live yet (and no imports are added for it). When Build 27 lands,
// call from the astrologer screen at conversation/session completion, e.g.:
//
//   recordMeaningfulAction('astrologer:' + todayYMD)   // 'astrologer:2026-07-01'
//
// 'astrologer:<date>' falls into the one-time bucket above, giving once-per-day
// dedup automatically — no special-casing needed here.
