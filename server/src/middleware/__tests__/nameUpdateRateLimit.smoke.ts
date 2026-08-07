/**
 * Smoke test: name-update rate limit logic.
 * Tests the tier-based windowed rate-limit decisions without hitting Express.
 *
 * Run: ts-node --transpile-only src/middleware/__tests__/nameUpdateRateLimit.smoke.ts
 *
 * 🔴 READ THIS BEFORE TRUSTING A GREEN RUN. `decide()` below is a HAND COPY of
 *    the middleware's logic, not a call into it — so every case here passes
 *    whatever the middleware actually does. That is exactly why this file was
 *    green through P88: the middleware read `subscription.tier` directly and
 *    gave comped accounts the free limit, and this test reproduced the same
 *    wrong line and agreed with itself. A test that re-implements its subject
 *    can only ever check the copy.
 * 🟢 The tier resolution is now the REAL `getEffectiveTier` (2026-08-06) and the
 *    two comp cases at the bottom exercise it, so at least the half that was
 *    wrong is no longer duplicated. The windowing half is still a copy.
 *    Registered rather than rebuilt — driving the Express middleware needs a
 *    request harness this repo does not have.
 */
import { getEffectiveTier } from '../../utils/subscriptionTier';
import { SubscriptionTier } from '../../types/shared';

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const TIER_LIMITS: Record<string, number> = {
  free: 1,
  premium: 5,
  premium_plus: 15,
};

interface HistoryEntry {
  updatedAt: Date;
  previousName: string;
  newName: string;
}

interface FakeUser {
  subscription: {
    tier: SubscriptionTier;
    comp?: {
      tier?: SubscriptionTier;
      expiresAt?: Date | string | null;
      active?: boolean;
    } | null;
  };
  nameUpdateHistory: HistoryEntry[];
}

interface Decision {
  allow: boolean;
  nextAvailableAt?: string;
}

function decide(user: FakeUser, now = Date.now()): Decision {
  const tier = getEffectiveTier(user);
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  const windowStart = now - WINDOW_MS;
  const recent = (user.nameUpdateHistory ?? []).filter(
    (e) => new Date(e.updatedAt).getTime() >= windowStart
  );
  if (recent.length < limit) return { allow: true };
  const oldest = recent.reduce(
    (acc, e) => Math.min(acc, new Date(e.updatedAt).getTime()),
    Infinity
  );
  return {
    allow: false,
    nextAvailableAt: new Date(oldest + WINDOW_MS).toISOString(),
  };
}

let pass = 0;
let fail = 0;

function check(label: string, expected: boolean, actual: boolean) {
  const ok = expected === actual;
  if (ok) {
    pass++;
    console.log(`OK  ${label}  →  allow=${actual}`);
  } else {
    fail++;
    console.log(`FAIL ${label}  →  allow=${actual} (expected ${expected})`);
  }
}

const NOW = Date.now();
const daysAgo = (d: number) => new Date(NOW - d * 24 * 60 * 60 * 1000);

// FREE TIER
check(
  'free, 0 updates → allow',
  true,
  decide({ subscription: { tier: 'free' }, nameUpdateHistory: [] }, NOW).allow
);
check(
  'free, 1 update 5 days ago → deny',
  false,
  decide(
    {
      subscription: { tier: 'free' },
      nameUpdateHistory: [{ updatedAt: daysAgo(5), previousName: '', newName: 'A' }],
    },
    NOW
  ).allow
);
check(
  'free, 1 update 31 days ago → allow (outside window)',
  true,
  decide(
    {
      subscription: { tier: 'free' },
      nameUpdateHistory: [{ updatedAt: daysAgo(31), previousName: '', newName: 'A' }],
    },
    NOW
  ).allow
);

// PREMIUM TIER
check(
  'premium, 4 updates → allow',
  true,
  decide(
    {
      subscription: { tier: 'premium' },
      nameUpdateHistory: [
        { updatedAt: daysAgo(1), previousName: '', newName: 'A' },
        { updatedAt: daysAgo(2), previousName: '', newName: 'B' },
        { updatedAt: daysAgo(3), previousName: '', newName: 'C' },
        { updatedAt: daysAgo(4), previousName: '', newName: 'D' },
      ],
    },
    NOW
  ).allow
);
check(
  'premium, 5 updates → deny',
  false,
  decide(
    {
      subscription: { tier: 'premium' },
      nameUpdateHistory: [
        { updatedAt: daysAgo(1), previousName: '', newName: 'A' },
        { updatedAt: daysAgo(2), previousName: '', newName: 'B' },
        { updatedAt: daysAgo(3), previousName: '', newName: 'C' },
        { updatedAt: daysAgo(4), previousName: '', newName: 'D' },
        { updatedAt: daysAgo(5), previousName: '', newName: 'E' },
      ],
    },
    NOW
  ).allow
);

// PREMIUM PLUS TIER
check(
  'premium_plus, 14 updates → allow',
  true,
  decide(
    {
      subscription: { tier: 'premium_plus' },
      nameUpdateHistory: Array.from({ length: 14 }, (_, i) => ({
        updatedAt: daysAgo(i + 1),
        previousName: '',
        newName: `N${i}`,
      })),
    },
    NOW
  ).allow
);
check(
  'premium_plus, 15 updates → deny',
  false,
  decide(
    {
      subscription: { tier: 'premium_plus' },
      nameUpdateHistory: Array.from({ length: 15 }, (_, i) => ({
        updatedAt: daysAgo(i + 1),
        previousName: '',
        newName: `N${i}`,
      })),
    },
    NOW
  ).allow
);

// 🔴 THE THREE CASES P88 WAS ABOUT — a BILLING-free account whose ENTITLEMENT is
//    not free. Before 2026-08-06 all three read `subscription.tier` and returned
//    the free limit of 1, so a comped influencer lost 4 or 14 of their changes.
//    ⚠️ The last one is the OWNER'S OWN account shape and is a SECOND, separate
//       grant mechanism: no comp at all (`active: false`), just a direct
//       `subscription.tier` write. Both must keep working, in both directions.
const inAYear = new Date(NOW + 365 * 24 * 60 * 60 * 1000);
const lastWeek = new Date(NOW - 7 * 24 * 60 * 60 * 1000);
check(
  'comp premium on a free billing tier, 4 updates → allow (was deny)',
  true,
  decide(
    {
      subscription: {
        tier: 'free',
        comp: { tier: 'premium', expiresAt: inAYear, active: true },
      },
      nameUpdateHistory: Array.from({ length: 4 }, (_, i) => ({
        updatedAt: daysAgo(i + 1),
        previousName: '',
        newName: `N${i}`,
      })),
    },
    NOW
  ).allow
);
check(
  'EXPIRED comp on a free billing tier, 1 update → deny (falls back correctly)',
  false,
  decide(
    {
      subscription: {
        tier: 'free',
        comp: { tier: 'premium_plus', expiresAt: lastWeek, active: true },
      },
      nameUpdateHistory: [{ updatedAt: daysAgo(2), previousName: '', newName: 'A' }],
    },
    NOW
  ).allow
);
check(
  'direct premium_plus grant with comp.active false, 14 updates → allow',
  true,
  decide(
    {
      subscription: {
        tier: 'premium_plus',
        comp: { active: false },
      },
      nameUpdateHistory: Array.from({ length: 14 }, (_, i) => ({
        updatedAt: daysAgo(i + 1),
        previousName: '',
        newName: `N${i}`,
      })),
    },
    NOW
  ).allow
);
// 🔴 AND THE DIRECTION THAT MATTERS MOST: a comp may only ever UPGRADE. A lower
//    comp over a real paid subscription must not demote the buyer.
check(
  'comp premium over a REAL premium_plus purchase, 14 updates → allow (no demotion)',
  true,
  decide(
    {
      subscription: {
        tier: 'premium_plus',
        comp: { tier: 'premium', expiresAt: inAYear, active: true },
      },
      nameUpdateHistory: Array.from({ length: 14 }, (_, i) => ({
        updatedAt: daysAgo(i + 1),
        previousName: '',
        newName: `N${i}`,
      })),
    },
    NOW
  ).allow
);

// nextAvailableAt is computed from oldest entry in window
const denyResult = decide(
  {
    subscription: { tier: 'free' },
    nameUpdateHistory: [{ updatedAt: daysAgo(10), previousName: '', newName: 'A' }],
  },
  NOW
);
check(
  'free deny carries nextAvailableAt timestamp',
  true,
  denyResult.allow === false && typeof denyResult.nextAvailableAt === 'string'
);

// A tier outside the enum → defaults to the free limit.
// ⚠️ THE CAST IS DELIBERATE AND IT IS THE POINT OF THE CASE. `FakeUser.subscription.tier` is now
//    the real `SubscriptionTier` union (it was `string` while `decide` re-implemented the lookup),
//    so this value cannot arrive from typed code at all — it can only arrive from MONGO, where the
//    schema enum is the only thing between a hand-edited document and this line. That is exactly
//    the shape worth keeping a case for, and it is why the cast is not a smell here.
check(
  'a tier outside the enum → falls back to free, 1 update → deny',
  false,
  decide(
    {
      subscription: { tier: 'unknown_tier' as SubscriptionTier },
      nameUpdateHistory: [{ updatedAt: daysAgo(1), previousName: '', newName: 'A' }],
    },
    NOW
  ).allow
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
