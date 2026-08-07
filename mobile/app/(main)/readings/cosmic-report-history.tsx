import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { getReportHistory, getReportCredit, Report } from '@/lib/reports';
import * as t from '@/theme';

/**
 * "Your reports" history — R9 §14 step 9 DO 5. Link-less list (GET /reports; NO
 * per-item presign). Each row: month + headline + a status pill. Tap → the hub in
 * the matching state (GET /:id mints the fresh link there). Top chip shows the
 * next-unlock date (GET /credit resetsAt).
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

function monthYear(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatMonthDay(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

type PillKind = 'ready' | 'gen' | 'exp' | 'fail';

/**
 * The list is link-less, so true expiry (the R2 object gone) is only known on
 * GET /:id. Approximate the pill client-side: a `ready` report older than the
 * 60-day PDF lifecycle is shown Expired; the exact state resolves when tapped.
 */
function pillFor(r: Report): { kind: PillKind; label: string } {
  if (r.status === 'failed') return { kind: 'fail', label: 'Failed' };
  if (r.status === 'queued' || r.status === 'generating') return { kind: 'gen', label: 'Generating' };
  if (r.status === 'ready') {
    if (r.regenerating) return { kind: 'gen', label: 'Rebuilding' };
    const stamp = new Date(r.generatedAt || r.createdAt).getTime();
    if (Date.now() - stamp > SIXTY_DAYS_MS) return { kind: 'exp', label: 'Expired' };
    return { kind: 'ready', label: 'Ready' };
  }
  return { kind: 'gen', label: 'Generating' };
}

const PILL_STYLE: Record<PillKind, { bg: string; fg: string }> = {
  ready: { bg: t.alpha(t.color.success, 10), fg: t.color.success },
  gen: { bg: t.alpha(t.color.accent, 10), fg: t.color.accent },
  exp: { bg: t.alpha(t.color['fg-muted'], 10), fg: t.color['fg-muted'] },
  fail: { bg: t.alpha(t.color.danger, 10), fg: t.color.danger },
};

export default function CosmicReportHistory() {
  const router = useRouter();
  const bottomPad = useBottomInsetPadding();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [resetsAt, setResetsAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [list, credit] = await Promise.all([getReportHistory(), getReportCredit()]);
        if (!mounted) return;
        setReports(list);
        setResetsAt(credit.resetsAt);
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const openReport = (id: string) => {
    router.push({ pathname: '/(main)/readings/cosmic-report', params: { id } } as any);
  };

  return (
    <ScreenContainer withScrollView={false}>
      <View className="flex-row items-center px-6 pt-4 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={t.color.fg} />
        </TouchableOpacity>
        <Text className="text-fg text-2xl font-body-bold">Your reports</Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {loading ? (
          /* IN-PAGE, so the primitive is used WITHOUT its full-screen branch: this loader sits
             inside a scroll container under a header that is already drawn, and the full-screen
             branch would fill and re-ground a region that is not the screen. Same component, same
             announcement, correct box. */
          <View style={{ paddingTop: 60 }}>
            <LoadingSpinner text="Loading your reports..." />
          </View>
        ) : error ? (
          <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], textAlign: 'center', marginTop: 40 }}>
            We couldn't load your reports right now.
          </Text>
        ) : reports.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <Text style={{ fontSize: 44 /* GLYPH */, marginBottom: 12 }}>🌙</Text>
            <Text {...t.txt('text-base')} style={{ ...t.txt('text-base').style, color: t.color.fg, fontFamily: t.family['body-bold'] }}>No reports yet</Text>
            <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'], textAlign: 'center', marginTop: 8, maxWidth: 250 }}>
              Generate your Personalized Cosmic Report and it will appear here.
            </Text>
          </View>
        ) : (
          <>
            {resetsAt && (
              <View style={{ alignItems: 'center', marginTop: 2, marginBottom: 14 }}>
                <View
                  style={{
                    backgroundColor: t.color.surface,
                    borderColor: t.color['border-strong'],
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: t.radius.pill,
                  }}
                >
                  <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['accent-2'], fontFamily: t.family['body-semi'] }}>
                    Next report unlocks {formatMonthDay(resetsAt)}
                  </Text>
                </View>
              </View>
            )}

            {reports.map((r) => {
              const pill = pillFor(r);
              const s = PILL_STYLE[pill.kind];
              const dim = pill.kind === 'exp' || pill.kind === 'fail';
              return (
                <TouchableOpacity
                  key={r._id}
                  activeOpacity={0.85}
                  onPress={() => openReport(r._id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 13,
                    backgroundColor: t.color['surface-raised'],
                    borderWidth: 1,
                    borderColor: t.color['border-subtle'],
                    borderRadius: t.radius.md,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: t.radius.sm,
                      backgroundColor: t.color.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: dim ? 0.55 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 18 /* GLYPH */ }}>🌙</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ ...t.txt('overline').style, color: t.color['fg-muted'], textTransform: 'uppercase' }}>
                      {monthYear(r.createdAt)}
                    </Text>
                    <Text {...t.txt('text-xs')} numberOfLines={1} style={{ ...t.txt('text-xs').style, color: t.color.fg, fontFamily: t.family['body-semi'], marginTop: 2 }}>
                      {r.highlights?.headline || 'Personalized Cosmic Report'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: s.bg, paddingHorizontal: 9, paddingVertical: 3, borderRadius: t.radius.pill }}>
                    <Text style={{ ...t.txt('overline').style, color: s.fg }}>
                      {pill.label.toUpperCase()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
