import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/Button';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { recordMeaningfulAction } from '@/store/reviewStore';
import { isShareDismissal } from '@/utils/shareReading';
import { shareReportPdf } from '@/utils/shareReportPdf';
import {
  getReport,
  getReportCredit,
  getReportHistory,
  getReportSample,
  createReport,
  rebuildReport,
  Report,
  ReportCredit,
} from '@/lib/reports';
import * as t from '@/theme';
import { openPaywall } from '@/lib/paywall';

/**
 * Personalized Cosmic Report HUB — R9 §14 step 9 (§12u DO 2-6, 8).
 *
 * ONE state-driven screen. Content is chosen purely by GET /reports/:id `status`
 * + GET /reports/credit `tier`/`resetsAt` + the POST 402 tier (NEVER by a
 * client-side tier guess — the server is the source of truth). States:
 *   generate | free-locked | paid-cap | generating | ready | expired | failed.
 *
 * v1 = SELF only. No face anywhere. Built with the app's existing theme tokens.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** ISO → "August 1" (UTC — matches the server's month-boundary reset). */
function formatMonthDay(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** ISO → "Jul 22, 2026" (UTC generation-date display convention). */
function formatGenDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** ISO → month name ("July"). */
function monthName(iso?: string): string {
  if (!iso) return 'this month';
  return MONTHS[new Date(iso).getUTCMonth()];
}

/** Start of the current UTC month (for "is this the current slot" checks). */
function startOfThisUtcMonth(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

type Phase =
  | 'loading'
  | 'generate'
  | 'free-locked'
  | 'paid-cap'
  | 'generating'
  | 'ready'
  | 'expired'
  | 'failed'
  | 'error';

const FINE_PRINT_LONG =
  "Takes a few minutes. We'll email you and it will appear here when it's ready.\nFor insight and entertainment. Not medical, legal, or financial advice.";
const FINE_PRINT_SHORT = 'For insight and entertainment. Not medical, legal, or financial advice.';

const INSIDE_BULLETS: { t: string; s: string }[] = [
  { t: 'Two charts, one sky', s: 'Sidereal and tropical, side by side' },
  { t: 'The clock', s: 'Dated windows across your life' },
  { t: 'Life domains', s: 'Health, wealth, relationships' },
  { t: 'Number and hand', s: 'Numerology and palm, where they agree' },
];

const READING_SECTIONS = [
  'Two Charts, One Sky',
  'The Person',
  'The Clock',
  'Life Domains',
  'The Decades',
  'Number and Hand',
];

export default function CosmicReportHub() {
  const router = useRouter();
  const bottomPad = useBottomInsetPadding();
  const params = useLocalSearchParams<{ id?: string }>();

  const [phase, setPhase] = useState<Phase>('loading');
  const [credit, setCredit] = useState<ReportCredit | null>(null);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  // The current-month non-failed report (for "open this month's" from paid-cap).
  const [monthReport, setMonthReport] = useState<Report | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [isRebuild, setIsRebuild] = useState(false);
  const [resetsAt, setResetsAt] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Static Monty sample — a fresh 1h presigned link (null = not provisioned yet
  // → the "view sample" affordance is hidden). Separate `sampleBusy` so the
  // sample open-spinner never couples to Generate/Rebuild's `busy`.
  const [sampleLink, setSampleLink] = useState<string | null>(null);
  const [sampleBusy, setSampleBusy] = useState(false);
  // Share downloads + attaches the PDF (async) — its own flag so the Share
  // spinner never couples to Open/Rebuild's `busy`.
  const [sharing, setSharing] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Probe the shared sample once on mount. Static asset → one lightweight fetch;
  // failure (asset/R2 not provisioned) leaves sampleLink null and the button hidden.
  useEffect(() => {
    getReportSample().then((r) => {
      if (mountedRef.current && r.ok) setSampleLink(r.secureLink);
    });
  }, []);

  // ── Initial resolution ─────────────────────────────────────────────────────
  useEffect(() => {
    resolveInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const routeByReport = (r: Report) => {
    setActiveReport(r);
    setReportId(r._id);
    if (r.status === 'queued' || r.status === 'generating') {
      setIsRebuild(false);
      setPhase('generating');
    } else if (r.status === 'failed') {
      setPhase('failed');
    } else if (r.status === 'ready') {
      if (r.regenerating) {
        setIsRebuild(true);
        setPhase('generating');
      } else if (r.expired) {
        setPhase('expired');
      } else {
        setPhase('ready');
      }
    }
  };

  const resolveInitial = async () => {
    setPhase('loading');
    setNotice(null);
    try {
      // A specific report was requested (history tap / deep link).
      if (params.id) {
        const r = await getReport(params.id);
        if (!mountedRef.current) return;
        routeByReport(r);
        return;
      }

      const [c, history] = await Promise.all([getReportCredit(), getReportHistory()]);
      if (!mountedRef.current) return;
      setCredit(c);
      setResetsAt(c.resetsAt);

      // The live current-month slot: newest non-failed report created this month.
      const monthStart = startOfThisUtcMonth();
      const current =
        history.find(
          (r) => r.status !== 'failed' && new Date(r.createdAt).getTime() >= monthStart
        ) || null;
      setMonthReport(current);

      if (current) {
        // Fetch a fresh delivery state (secureLink / expired) and route by it.
        const fresh = await getReport(current._id);
        if (!mountedRef.current) return;
        setMonthReport(fresh);
        routeByReport(fresh);
        return;
      }

      // No current report → the server's monthly LIMIT decides the landing.
      // The report is Premium-Plus-only, so free AND premium have limit 0 →
      // locked; only premium_plus (limit 1) lands on generate. Key on `limit`,
      // never the tier name.
      if (c.limit === 0) setPhase('free-locked');
      else setPhase('generate');
    } catch {
      if (mountedRef.current) setPhase('error');
    }
  };

  // ── Async generation / rebuild poll ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'generating' || !reportId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let delay = 3000;

    const tick = async () => {
      try {
        const r = await getReport(reportId);
        if (cancelled) return;
        setActiveReport(r);

        if (isRebuild) {
          // Rebuild: the report stays `ready`; done when `regenerating` clears.
          if (!r.regenerating) {
            if (!r.expired && r.secureLink) {
              setPhase('ready');
            } else {
              setNotice("We couldn't rebuild your PDF just now. Please try again.");
              setPhase('expired');
            }
            return;
          }
        } else {
          if (r.status === 'ready') {
            setPhase(r.expired ? 'expired' : 'ready');
            return;
          }
          if (r.status === 'failed') {
            setPhase('failed');
            return;
          }
        }
        delay = Math.min(delay + 1000, 8000);
        timer = setTimeout(tick, delay);
      } catch {
        if (cancelled) return;
        delay = Math.min(delay + 2000, 10000);
        timer = setTimeout(tick, delay);
      }
    };

    timer = setTimeout(tick, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reportId, isRebuild]);

  // Record the meaningful action once a report is viewable as ready.
  useEffect(() => {
    if (phase === 'ready') recordMeaningfulAction('reading:report');
  }, [phase]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const res = await createReport();
      if (!mountedRef.current) return;
      if (res.ok) {
        setReportId(res.reportId);
        setIsRebuild(false);
        setActiveReport(null);
        setPhase('generating');
      } else {
        // 402 — tier is the switch (never show upgrade to a paid user).
        if (res.locked) {
          setPhase('free-locked');
        } else {
          setResetsAt(res.resetsAt);
          setPhase('paid-cap');
        }
      }
    } catch {
      if (mountedRef.current) setNotice("Something went wrong. Please try again.");
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const handleOpenPdf = async () => {
    if (busy) return;
    setBusy(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      // Always mint a FRESH secureLink at open-time — never a cached/stale one.
      const r = reportId ? await getReport(reportId) : activeReport;
      if (!mountedRef.current) return;
      if (r) setActiveReport(r);
      if (r?.expired || !r?.secureLink) {
        setPhase('expired');
        return;
      }
      await Linking.openURL(r.secureLink);
    } catch {
      if (mountedRef.current) setNotice("Couldn't open the report. Please try again.");
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const handleRebuild = async () => {
    if (busy || !reportId) return;
    setBusy(true);
    setNotice(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const res = await rebuildReport(reportId);
      if (!mountedRef.current) return;
      if (res.ok) {
        setIsRebuild(true);
        setPhase('generating');
      } else if (res.reason === 'cannot_rebuild') {
        setNotice("This report can't be rebuilt.");
      } else {
        setNotice('Something went wrong. Please try again.');
      }
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const handleUpgrade = () => {
    openPaywall('cosmic-report-upgrade');
  };

  // Open the static Monty sample PDF in the device viewer — same open path as a
  // real report (Linking.openURL; no in-app PDF lib installed). The link is the
  // fresh 1h one probed at mount; a long-lingering screen that outlives it just
  // shows a soft notice.
  const handleViewSample = async () => {
    if (sampleBusy || !sampleLink) return;
    setSampleBusy(true);
    setNotice(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Linking.openURL(sampleLink);
    } catch {
      if (mountedRef.current) setNotice("Couldn't open the sample right now. Please try again.");
    } finally {
      if (mountedRef.current) setSampleBusy(false);
    }
  };

  const handleOpenExisting = () => {
    if (monthReport) routeByReport(monthReport);
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    setNotice(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      // Fresh secureLink (presigned links expire) — same re-GET as Open.
      const r = reportId ? await getReport(reportId) : activeReport;
      if (!mountedRef.current) return;
      if (r) setActiveReport(r);
      if (r?.expired || !r?.secureLink) {
        setPhase('expired');
        return;
      }

      // Download the PDF to a local file, then share the FILE — never the private
      // presigned link (a 1h URL would leak + soon 404). Both halves live in
      // utils/shareReportPdf so the web bundle can fork them; the returned
      // boolean carries the same dismissal semantics the inline block had.
      const shared = await shareReportPdf(r.secureLink);
      if (!mountedRef.current) return;
      if (shared) recordMeaningfulAction('share:report');
    } catch (err) {
      if (!mountedRef.current) return;
      if (isShareDismissal(err)) return;
      setNotice("Couldn't share your report right now. Please try again.");
    } finally {
      if (mountedRef.current) setSharing(false);
    }
  };

  // ── Small render helpers ─────────────────────────────────────────────────────
  const ReportTitleRow = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 2 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: t.radius.md,
          backgroundColor: t.color.accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 20 /* GLYPH */ }}>🌙</Text>
      </View>
      <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, fontFamily: t.family['body-bold'], flex: 1 }}>
        Personalized Cosmic Report
      </Text>
    </View>
  );

  const ValueTags = () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
      {['Dual-zodiac', 'Dated timing', 'Downloadable PDF'].map((tag) => (
        <View
          key={tag}
          style={{
            borderWidth: 1,
            borderColor: t.color['accent-muted'],
            backgroundColor: t.alpha(t.color.accent, 5),
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: t.radius.pill,
          }}
        >
          <Text style={{ ...t.txt('text-2xs').style, color: t.color.accent }}>{tag}</Text>
        </View>
      ))}
    </View>
  );

  const Hero = ({ text }: { text: string }) => (
    <Text style={{ ...t.txt('display-sm').style, color: t.color.fg, marginTop: 14, marginBottom: 8 }}>
      {text}
    </Text>
  );

  const NoticeLine = () =>
    notice ? (
      <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color.accent, textAlign: 'center', marginTop: 12 }}>
        {notice}
      </Text>
    ) : null;

  // ── Phase content ────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (phase) {
      case 'loading':
        return (
          <View style={{ paddingTop: 80, alignItems: 'center' }}>
            <ActivityIndicator color={t.color.accent} size="large" />
          </View>
        );

      case 'error':
        return (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, fontFamily: t.family['body-bold'] }}>Something went wrong</Text>
            <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], textAlign: 'center', marginTop: 8, maxWidth: 260 }}>
              We couldn't load your report right now.
            </Text>
            <View style={{ height: 20 }} />
            <Button title="Try again" onPress={resolveInitial} />
          </View>
        );

      case 'generate':
        return (
          <>
            <ReportTitleRow />
            <Hero text="One birth, read through two great traditions at once." />
            <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-secondary'], marginBottom: 4 }}>
              A 20 to 24 page reading that fuses Vedic and Western astrology, your dasha timing,
              transits, and numerology into one dated, downloadable PDF.
            </Text>
            <ValueTags />

            <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.fg, fontFamily: t.family['body-bold'], marginTop: 18, marginBottom: 6 }}>
              What's inside
            </Text>
            {INSIDE_BULLETS.map((b) => (
              <View
                key={b.t}
                style={{ flexDirection: 'row', gap: 11, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: t.color['border-subtle'] }}
              >
                <View style={{ width: 7, height: 7, borderRadius: t.radius.pill, backgroundColor: t.color.accent, marginTop: 6 }} />
                <View style={{ flex: 1 }}>
                  <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color.fg, fontFamily: t.family['body-semi'] }}>{b.t}</Text>
                  <Text style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'] }}>{b.s}</Text>
                </View>
              </View>
            ))}

            <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: t.alpha(t.color.success, 10),
                  borderColor: t.alpha(t.color.success, 30),
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: t.radius.pill,
                }}
              >
                <Ionicons name="checkmark-circle" size={15} color={t.color.success} />
                <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color.success, fontFamily: t.family['body-semi'], marginLeft: 7 }}>
                  1 report available this month
                </Text>
              </View>
            </View>

            <Button title="Generate my report" onPress={handleGenerate} loading={busy} />
            {/* Paid entry pairs "Generate" with "View Sample Reading" (spec §3.3).
                Hidden until the shared sample asset is provisioned. */}
            {sampleLink && (
              <>
                <View style={{ height: 10 }} />
                <Button
                  title="View a sample report"
                  variant="outline"
                  onPress={handleViewSample}
                  loading={sampleBusy}
                />
              </>
            )}
            <NoticeLine />
            {/* 🔴 ITEM 6 MOVED THE ROLE HERE, NOT THE STEP, AND THE STEP IS A NAMED RESIDUE.
                Both fine-print lines are compliance copy (audit §6.2 rows 2-3) and both were on
                the sub-AA placeholder role; that is fixed. They still sit on the 11px eyebrow
                step, which carries +1.3 tracking, the bold face and `scales: false` — so a
                140-character legal sentence cannot grow for a user who enlarges text, and design
                §4.2's requirement for this surface is the phrase "not 8pt grey". Moving the step
                is a visible change on a structure-frozen screen and belongs to that screen's own
                item, not to this one. Do not read the fixed colour as the whole fix. */}
            <Text style={{ ...t.txt('overline').style, color: t.color['fg-muted'], textAlign: 'center', marginTop: 14 }}>
              {FINE_PRINT_LONG}
            </Text>
          </>
        );

      case 'free-locked':
        return (
          <>
            <ReportTitleRow />
            <Hero text="One birth, read through two great traditions at once." />
            <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-secondary'], marginBottom: 4 }}>
              A 20 to 24 page reading that fuses astrology, dasha timing, transits, and numerology
              into one dated PDF.
            </Text>
            <ValueTags />

            <View style={{ alignItems: 'center', marginTop: 22, marginBottom: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: t.color['accent-muted'],
                  borderColor: t.color['accent-muted'],
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: t.radius.pill,
                }}
              >
                <Ionicons name="lock-closed" size={14} color={t.color.accent} />
                <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color.accent, fontFamily: t.family['body-semi'], marginLeft: 7 }}>
                  A Premium Plus feature
                </Text>
              </View>
            </View>
            <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-secondary'], textAlign: 'center', marginBottom: 18 }}>
              The Personalized Cosmic Report is part of Premium Plus. Upgrade to generate one full
              reading every month.
            </Text>

            <Button title="Unlock with Premium Plus" onPress={handleUpgrade} />
            {/* "See before you buy" — the sample stays viewable to free users
                (spec §2/§3.2; mockup screen 4). Hidden until the asset exists. */}
            {sampleLink && (
              <>
                <View style={{ height: 10 }} />
                <Button
                  title="View a sample report"
                  variant="outline"
                  onPress={handleViewSample}
                  loading={sampleBusy}
                />
              </>
            )}
            <NoticeLine />
            <Text style={{ ...t.txt('overline').style, color: t.color['fg-muted'], textAlign: 'center', marginTop: 14 }}>
              {FINE_PRINT_SHORT}
            </Text>
          </>
        );

      case 'paid-cap':
        return (
          <>
            <ReportTitleRow />
            <View style={{ alignItems: 'center', paddingTop: 22 }}>
              <View
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: t.radius.lg,
                  backgroundColor: t.color.surface,
                  borderWidth: 1,
                  borderColor: t.color['border-strong'],
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons name="calendar-outline" size={30} color={t.color["accent-2"]} />
              </View>
              <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, fontFamily: t.family['body-bold'] }}>
                You've used this month's report
              </Text>
              <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], textAlign: 'center', marginTop: 8, maxWidth: 260 }}>
                Your next Personalized Cosmic Report unlocks on{' '}
                <Text style={{ color: t.color.fg }}>{formatMonthDay(resetsAt)}</Text>. Your{' '}
                {monthName(monthReport?.createdAt)} reading is saved and ready to reopen.
              </Text>
            </View>

            <View style={{ height: 26 }} />
            {monthReport && (
              <Button
                title={`Open ${monthName(monthReport.createdAt)}'s report`}
                onPress={handleOpenExisting}
              />
            )}
            <View style={{ height: 10 }} />
            <Button
              title="View all reports"
              variant="outline"
              onPress={() => router.push('/(main)/readings/cosmic-report-history' as any)}
            />
            <NoticeLine />
          </>
        );

      case 'generating':
        return (
          <View style={{ paddingTop: 8 }}>
            <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 6 }}>
              <ActivityIndicator color={t.color.accent} size="large" />
            </View>
            <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, fontFamily: t.family['body-bold'], textAlign: 'center', marginTop: 14 }}>
              {isRebuild ? 'Rebuilding your PDF' : 'Preparing your report'}
            </Text>
            <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], textAlign: 'center', marginTop: 8, alignSelf: 'center', maxWidth: 270 }}>
              {isRebuild
                ? "We're rebuilding your PDF from your saved reading. This only takes a moment."
                : "We're computing your charts and writing your reading. This usually takes a few minutes."}
            </Text>

            <View style={{ marginTop: 22 }}>
              {(isRebuild
                ? ['Building your charts', 'Building your PDF']
                : ['Computing your charts', 'Writing your reading', 'Building your PDF']
              ).map((label, i) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}>
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: t.radius.pill,
                      backgroundColor: i === 0 ? t.alpha(t.color.accent, 10) : 'transparent',
                      borderWidth: i === 0 ? 0 : 1.5,
                      borderColor: t.color['border-strong'],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i === 0 && (
                      <Ionicons name="ellipse" size={8} color={t.color.accent}
                        accessibilityLabel="Current step" />
                    )}
                  </View>
                  <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: i === 0 ? t.color.accent : t.color['fg-muted'] }}>{label}</Text>
                </View>
              ))}
            </View>

            {!isRebuild && (
              <View style={{ backgroundColor: t.color.bg, borderRadius: t.radius.md, padding: 14, marginTop: 18 }}>
                <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'] }}>
                  You can close this screen. We'll email you when it's ready, and it will be waiting
                  here in your reports.
                </Text>
              </View>
            )}
          </View>
        );

      case 'ready':
        return (
          <View style={{ paddingTop: 8 }}>
            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: t.radius.lg,
                  backgroundColor: t.color.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Text style={{ fontSize: 28 /* GLYPH */ }}>🌙</Text>
              </View>
              <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, fontFamily: t.family['body-bold'] }}>Your report is ready</Text>
            </View>

            {!!activeReport?.highlights?.headline && (
              <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, fontFamily: t.family['body-bold'], textAlign: 'center', marginTop: 14, marginHorizontal: 6 }}>
                {activeReport.highlights.headline}
              </Text>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12, marginBottom: 16 }}>
              {activeReport?.pageCount ? <MetaPill text={`${activeReport.pageCount} pages`} /> : null}
              {activeReport?.generatedAt ? <MetaPill text={formatGenDate(activeReport.generatedAt)} /> : null}
              <MetaPill text="Swiss Ephemeris" />
            </View>

            <Button title="Open report (PDF)" onPress={handleOpenPdf} loading={busy} />
            <View style={{ height: 10 }} />
            <Button title="Share" variant="outline" onPress={handleShare} loading={sharing} />
            <NoticeLine />

            <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.fg, fontFamily: t.family['body-bold'], marginTop: 20, marginBottom: 8 }}>
              In this reading
            </Text>
            <View style={{ backgroundColor: t.color['surface-raised'], borderWidth: 1, borderColor: t.color['border-subtle'], borderRadius: t.radius.md, paddingHorizontal: 14, paddingVertical: 4 }}>
              {READING_SECTIONS.map((s, i) => (
                <View
                  key={s}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 11,
                    paddingVertical: 10,
                    borderBottomWidth: i === READING_SECTIONS.length - 1 ? 0 : 1,
                    borderBottomColor: t.color['border-subtle'],
                  }}
                >
                  <View style={{ width: 7, height: 7, borderRadius: t.radius.pill, backgroundColor: t.color.accent }} />
                  <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color.fg, fontFamily: t.family['body-semi'] }}>{s}</Text>
                </View>
              ))}
            </View>
            <Text style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'], textAlign: 'center', marginTop: 14 }}>
              Saved to your reports for 60 days. Reopen it anytime.
            </Text>
          </View>
        );

      case 'expired':
        return (
          <View style={{ paddingTop: 8 }}>
            <View style={{ alignItems: 'center', paddingTop: 32 }}>
              <View
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: t.radius.lg,
                  backgroundColor: t.color.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons name="time-outline" size={30} color={t.color.fg} />
              </View>
              <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, fontFamily: t.family['body-bold'] }}>
                This report's download expired
              </Text>
              <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], textAlign: 'center', marginTop: 8, maxWidth: 280 }}>
                Downloadable PDFs are kept for 60 days. Your full reading is saved, so we can rebuild
                this PDF for you at no cost.
              </Text>
            </View>

            <View style={{ height: 26 }} />
            <Button title="Rebuild my PDF (free)" onPress={handleRebuild} loading={busy} />
            <Text style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'], textAlign: 'center', marginTop: 10 }}>
              This doesn't use your monthly report.
            </Text>
            <View style={{ height: 12 }} />
            <Button
              title="Back to your reports"
              variant="outline"
              onPress={() => router.push('/(main)/readings/cosmic-report-history' as any)}
            />
            <NoticeLine />
          </View>
        );

      case 'failed':
        return (
          <View style={{ paddingTop: 8 }}>
            <View style={{ alignItems: 'center', paddingTop: 32 }}>
              <View
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: t.radius.lg,
                  backgroundColor: t.color.surface,
                  borderWidth: 1,
                  borderColor: t.color['border-strong'],
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons name="alert-circle-outline" size={30} color={t.color.danger} />
              </View>
              <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, fontFamily: t.family['body-bold'], textAlign: 'center' }}>
                We couldn't finish your report
              </Text>
              <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], textAlign: 'center', marginTop: 8, maxWidth: 280 }}>
                Your monthly report wasn't used, so you can try again.
              </Text>
            </View>

            <View style={{ height: 26 }} />
            <Button title="Try again" onPress={handleGenerate} loading={busy} />
            <NoticeLine />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScreenContainer withScrollView={false}>
      <View className="flex-row items-center px-6 pt-4 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={t.color.fg} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-fg text-2xl font-body-bold">Cosmic Report</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(main)/readings/cosmic-report-history' as any)}>
          <Ionicons name="time-outline" size={22} color={t.color.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {renderContent()}
      </ScrollView>
    </ScreenContainer>
  );
}

function MetaPill({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: t.color.bg,
        borderWidth: 1,
        borderColor: t.color['border-strong'],
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: t.radius.sm,
      }}
    >
      <Text style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'] }}>{text}</Text>
    </View>
  );
}
