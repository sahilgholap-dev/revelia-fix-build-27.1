import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recordMeaningfulAction } from '@/store/reviewStore';
import {
  askQuestion,
  getQaCredit,
  QaCredit,
  QaCapPayload,
  QaMode,
} from '@/lib/qa';
import {
  captureQaLocation,
  getQaLocationConsent,
  setQaLocationConsent,
  requestQaLocationPermission,
  QaLocationConsent,
} from '@/lib/qaLocation';
import { getDeviceId } from '@/lib/deviceId';
import * as t from '@/theme';
import { openPaywall } from '@/lib/paywall';

/**
 * Conversational Q&A (the "Astrologer") — R7 §13e Item A (§13e-1).
 *
 * A single-thread chat surface over the LIVE §13d serving pipeline. The client is
 * a thin renderer: it keys purely on the server's `mode` + `answer` (never a raw
 * classification), threads follow-ups by echoing `conversationId`, and shows
 * counters seeded from GET /qa/credit and refreshed from each answered turn's
 * `remaining`. All gating is SERVER-DRIVEN — the DI lock and the cap CTA react to
 * `remaining` + the top-level 402, they never guess the tier.
 *
 * Item B (§13e-2) LANDED here:
 *   • CRISIS-SCREEN SUPPRESSION (safety-critical, LG3) — when the active answer's
 *     mode ∈ {crisis, unsafe, off_topic} the screen SELLS NOTHING: no counters, no
 *     cap CTA, no Deep-Insight upsell, no suggestion chips, and no rating prompt
 *     (safety modes never call recordMeaningfulAction). The decline renders plainly.
 *   • LOCATION CONSENT (D7) — a one-time in-app consent prompt + privacy note gates
 *     city-level, per-question location. On grant the ask carries `location`; on
 *     deny/undecided it is omitted → the server falls back to birth-city.
 *   • DEVICE-ID (D5) — the raw device id rides the `X-Device-Id` header on the
 *     Deep-Insight ask only (server salts+hashes for free-DI anti-farming).
 */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode?: QaMode;
  deepInsight?: boolean;
}

/** One key per logical send. A network auto-retry of the SAME send reuses it (the
 *  request config persists across the interceptor's token refresh); a fresh tap
 *  mints a new one → a new turn. */
function genIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** UTC day key for the once-per-day `astrologer:<YYYY-MM-DD>` review seam. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** ISO → "August 1" (UTC — matches the server's month-boundary reset). */
function formatResetDate(iso?: string): string {
  if (!iso) return 'next month';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'next month';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

const SUGGESTIONS = [
  'Is this a good time to change jobs?',
  'What should I focus on this month?',
  'How are my relationships looking right now?',
];

/**
 * One chat bubble. MODULE-SCOPE (stable component identity) on purpose: it is
 * rendered inside a keyed `.map`, and a component defined INSIDE AstrologerChat
 * gets a fresh identity every render, which unmounts/remounts the whole message
 * list on each keystroke. Keeping it at module scope (and rendering the other
 * inner sections as function CALLS, see below) is what keeps the composer's
 * TextInput from losing focus while typing — do NOT move it back inside.
 */
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  const isTiming = msg.mode === 'timing';
  // A safety decline (crisis/unsafe/off_topic) renders PLAINLY — no mystical
  // "🔮 Revelia" label and never a Deep-Insight tag. It sells nothing.
  const isSafety =
    msg.mode === 'crisis' || msg.mode === 'unsafe' || msg.mode === 'off_topic';
  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '86%',
        marginBottom: 12,
      }}
    >
      {!isUser && !isSafety && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: 4 }}>
          <Text style={{ fontSize: 13 /* GLYPH */ }}>🔮</Text>
          <Text style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'], marginLeft: 5 }}>
            {isTiming ? 'Timing read' : 'Revelia'}
            {msg.deepInsight ? ' · Deep Insight' : ''}
          </Text>
        </View>
      )}
      <View
        style={{
          backgroundColor: isUser ? t.color.accent : t.color.surface,
          borderWidth: isUser ? 0 : 1,
          borderColor: t.color['border-subtle'],
          borderRadius: t.radius.md,
          borderTopRightRadius: isUser ? 4 /* SHAPE */ : t.radius.md,
          borderTopLeftRadius: isUser ? t.radius.md : 4 /* SHAPE */,
          paddingHorizontal: 14,
          paddingVertical: 11,
        }}
      >
        <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.fg }}>{msg.text}</Text>
      </View>
    </View>
  );
}

export default function AstrologerChat() {
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [deepInsight, setDeepInsight] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [credit, setCredit] = useState<QaCredit | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Set when the QUESTION cap is hit — replaces the composer with an upgrade CTA.
  const [questionCap, setQuestionCap] = useState<QaCapPayload | null>(null);
  // Set when the DI sub-cap is hit — an inline note; normal questions still work.
  const [diCapHit, setDiCapHit] = useState(false);
  // Persisted per-question location-consent decision (D7). null while loading.
  const [locationConsent, setLocationConsent] = useState<QaLocationConsent | null>(null);

  const mountedRef = useRef(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    mountedRef.current = true;
    loadCredit();
    getQaLocationConsent().then((c) => {
      if (mountedRef.current) setLocationConsent(c);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadCredit = async () => {
    try {
      const c = await getQaCredit();
      if (!mountedRef.current) return;
      setCredit(c);
      // If already at the cap, `atQuestionCap` (derived below) surfaces the CTA;
      // the CTA falls back to a tier-derived `nextTier` when no 402 payload exists.
    } catch {
      // Non-fatal: the server is authoritative on send. Counters show "—".
    }
  };

  const questionsRemaining = credit?.remaining.questions ?? null;
  const diRemaining = credit?.remaining.deepInsight ?? 0;
  const diLocked = credit !== null && diRemaining <= 0;
  const atQuestionCap =
    !!questionCap || (questionsRemaining !== null && questionsRemaining <= 0);

  // ── CRISIS / SAFETY suppression (LG3, safety-critical) ──────────────────────
  // When the MOST RECENT answer is a safety decline (crisis/unsafe/off_topic) the
  // screen sells nothing: the counters, the cap CTA, the Deep-Insight upsell, the
  // consent banner and the suggestion chips are all suppressed while it is on
  // screen. A crisis screen never routes to the paywall. (Rating prompts are
  // already never fired for safety modes — see handleSend.)
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const safetyMode =
    !!lastMsg &&
    lastMsg.role === 'assistant' &&
    (lastMsg.mode === 'crisis' || lastMsg.mode === 'unsafe' || lastMsg.mode === 'off_topic');

  /** Route to the in-app paywall. The server's `upgradeCta.deepLink` is
   *  `revelia://paywall`, which maps to this route group. */
  const goToPaywall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    openPaywall('qa-deep-insight');
  };

  const handleToggleDi = () => {
    if (diLocked) {
      // Free gets 1 DI/month; once spent the toggle is locked behind the CTA.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
      setDiCapHit(true);
      return;
    }
    setDiCapHit(false);
    setDeepInsight((v) => !v);
  };

  // Consent handlers (D7). "Use my location" → OS prompt → persist the outcome;
  // "Not now" → persist a deny (the birth-city fallback stands). Asked once.
  const handleAllowLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    const granted = await requestQaLocationPermission();
    const decision: 'granted' | 'denied' = granted ? 'granted' : 'denied';
    await setQaLocationConsent(decision);
    if (mountedRef.current) setLocationConsent(decision);
  };
  const handleDeclineLocation = async () => {
    await setQaLocationConsent('denied');
    if (mountedRef.current) setLocationConsent('denied');
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q || sending) return;
    // A crisis/safety screen never routes to the paywall (sells nothing); only a
    // normal screen bounces a capped send to the upgrade flow.
    if (atQuestionCap && !safetyMode) {
      goToPaywall();
      return;
    }

    const requestedDi = deepInsight && !diLocked;
    const userMsg: ChatMessage = { id: genIdempotencyKey(), role: 'user', text: q };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setNotice(null);
    setDiCapHit(false);
    setSending(true);
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

    try {
      // D7 — send a city-level location ONLY when the user has granted consent;
      // otherwise omit it and let the server fall back to the birth city. Captured
      // per question (the querent may be somewhere new). D5 — the raw device id
      // rides along ONLY on a Deep-Insight ask (anti-farming), never otherwise.
      const location = locationConsent === 'granted' ? await captureQaLocation() : null;
      const deviceId = requestedDi ? (await getDeviceId()) ?? undefined : undefined;

      const res = await askQuestion({
        question: q,
        deepInsight: requestedDi,
        conversationId,
        idempotencyKey: userMsg.id,
        location,
        deviceId,
      });
      if (!mountedRef.current) return;

      if (res.ok) {
        const r = res.result;
        setMessages((m) => [
          ...m,
          {
            id: r.answerId,
            role: 'assistant',
            text: r.answer,
            mode: r.mode,
            deepInsight: r.deepInsight,
          },
        ]);
        if (r.conversationId) setConversationId(r.conversationId);
        // Refresh the counters from the answered turn (present on reflective/timing).
        if (r.remaining) {
          setCredit((prev) =>
            prev ? { ...prev, remaining: r.remaining! } : prev
          );
        }
        // A DI answer consuming the last slot re-locks the toggle next render.
        if (r.deepInsight) setDeepInsight(false);
        // Real answered turn → the once-per-day meaningful-action seam.
        if (r.mode === 'reflective' || r.mode === 'timing') {
          recordMeaningfulAction(`astrologer:${todayKey()}`);
        }
      } else {
        // TOP-LEVEL 402 — remove the optimistic bubble, restore the text, refresh
        // counters, and surface the right CTA per `code`.
        setMessages((m) => m.filter((msg) => msg.id !== userMsg.id));
        setInput(q);
        // The 402 carries the freshest counts + reset — adopt them wholesale.
        setCredit({
          tier: res.cap.tier,
          remaining: res.cap.remaining,
          resetsAt: res.cap.resetsAt,
        });
        if (res.cap.code === 'deep_insight_limit_reached') {
          // Normal questions still work — just lock DI + note it inline.
          setDeepInsight(false);
          setDiCapHit(true);
        } else {
          // Hard stop for the month — swap the composer for the upgrade CTA.
          setQuestionCap(res.cap);
        }
      }
    } catch {
      if (!mountedRef.current) return;
      setMessages((m) => m.filter((msg) => msg.id !== userMsg.id));
      setInput(q);
      setNotice('Something went wrong. Please try again.');
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const handleSuggestion = (s: string) => {
    if (sending || atQuestionCap) return;
    setInput(s);
  };

  // ── Counters chip row ───────────────────────────────────────────────────────
  const Counters = () => (
    <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 10 }}>
      <View style={chipStyle}>
        <Ionicons name="chatbubble-ellipses-outline" size={13} color={t.color.accent} />
        <Text style={chipTextStyle}>
          {questionsRemaining === null ? '—' : questionsRemaining} question
          {questionsRemaining === 1 ? '' : 's'} left
        </Text>
      </View>
      <View style={chipStyle}>
        <Ionicons name="sparkles-outline" size={13} color={t.color.accent} />
        <Text style={chipTextStyle}>
          {credit === null ? '—' : diRemaining} deep insight
          {diRemaining === 1 ? '' : 's'} left
        </Text>
      </View>
    </View>
  );

  // ── Empty state (no messages yet) ─────────────────────────────────────────────
  // 🔴 RENAMED FROM `EmptyState` AT §9 ITEM 8, AND THE RENAME IS THE WHOLE CHANGE.
  //    It shadowed `components/common/EmptyState`, which is a DIFFERENT COMPONENT: that one is a
  //    centred full-screen surface with one action, this one is the chat's opening panel with an
  //    icon well, a lede and six suggestion chips. While they shared the name, importing the
  //    shared one into this file would have been silently shadowed by the local const, and every
  //    grep counted this screen as an adopter of a component it has never rendered. Same hazard
  //    item 4 resolved by renaming `combined.tsx`'s look-alike.
  //
  // 🔴 STRUCTURE UNCHANGED, DELIBERATELY, AND THE REASON IS A SAFETY INVARIANT (audit §9 Q3,
  //    rated HARD). THE SUGGESTION CHIPS ARE SUPPRESSED IN CRISIS MODE BY LAYOUT ACCIDENT: they
  //    live inside this function, which renders only when there are no messages, while the safety
  //    surface requires at least one assistant message. THERE IS NO EXPLICIT SAFETY GATE HERE.
  //    So any redesign that lifts the chips out of this function — a persistent chip row, chips
  //    under the composer, chips in a cap state — MUST add that gate explicitly, because the
  //    structural guarantee does not survive the move. This file is also D8 structure-frozen.
  const ChatEmptyState = () => (
    <View style={{ paddingTop: 24, alignItems: 'center' }}>
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: t.radius.lg,
          backgroundColor: t.color.accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 30 /* GLYPH */ }}>🔮</Text>
      </View>
      <Text {...t.txt('text-lg')} style={{ ...t.txt('text-lg').style, color: t.color.fg, fontFamily: t.family['body-bold'], textAlign: 'center' }}>
        Ask about your path
      </Text>
      <Text {...t.txt('text-xs')}
        style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'],
          textAlign: 'center',
          marginTop: 8,
          maxWidth: 280 }}
      >
        Grounded in your birth chart. Ask about timing, direction, or what a season
        is really about.
      </Text>

      <View style={{ marginTop: 22, width: '100%', gap: 9 }}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => handleSuggestion(s)}
            activeOpacity={0.8}
            style={{
              backgroundColor: t.color['surface-raised'],
              borderWidth: 1,
              borderColor: t.color['border-subtle'],
              borderRadius: t.radius.md,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-secondary'] }}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ── Question-cap CTA (replaces the composer) ──────────────────────────────────
  const QuestionCapCta = () => {
    // Prefer the 402's structural CTA; fall back to a tier-derived next tier when
    // the user simply landed at the cap (no fresh 402 payload). null at the top.
    const tier = questionCap?.tier ?? credit?.tier ?? 'free';
    const nextTier =
      questionCap?.upgradeCta.nextTier ??
      (tier === 'free' ? 'premium' : tier === 'premium' ? 'premium_plus' : null);
    return (
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: t.color['border-subtle'],
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Text {...t.txt('text-sm')} style={{ ...t.txt('text-sm').style, color: t.color.fg, fontFamily: t.family['body-bold'], textAlign: 'center' }}>
          You've used this month's questions
        </Text>
        <Text {...t.txt('text-xs')}
          style={{ ...t.txt('text-xs').style, color: t.color['fg-muted'],
            textAlign: 'center',
            marginTop: 6 }}
        >
          Your questions reset on{' '}
          <Text style={{ color: t.color.fg }}>{formatResetDate(credit?.resetsAt)}</Text>.
          {nextTier ? " Don't want to wait? Upgrade now" : ''}
        </Text>
        {nextTier ? (
          <TouchableOpacity onPress={goToPaywall} activeOpacity={0.85} style={ctaButtonStyle}>
            {/* P23 opt-in for `ctaButtonTextStyle`'s `text-sm`: the style object is at
                module scope and cannot carry a prop, so it lands here. Copy is §6.3
                PM-owned and unchanged. */}
            <Text allowFontScaling maxFontSizeMultiplier={1.3} style={ctaButtonTextStyle}>Upgrade and unlock more questions</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  // ── Location consent banner (D7 — asked once) ─────────────────────────────────
  // A consent prompt + one-line privacy note for CITY-LEVEL, PER-QUESTION location.
  // Shown only while undecided (and never on a safety screen). "Not now" keeps the
  // birth-city fallback; "Use my location" triggers the OS permission prompt.
  const LocationConsentBanner = () => (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 10,
        backgroundColor: t.color.surface,
        borderWidth: 1,
        borderColor: t.color['border-subtle'],
        borderRadius: t.radius.md,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Ionicons name="location-outline" size={15} color={t.color.accent} />
        <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color.fg, fontFamily: t.family['body-bold'], marginLeft: 6 }}>
          Time readings to where you are
        </Text>
      </View>
      <Text style={{ ...t.txt('text-2xs').style, color: t.color['fg-muted'] }}>
        Revelia can use your approximate (city-level) location for this question only,
        to time your reading. Otherwise we use your birth city. You can change this
        anytime.
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <TouchableOpacity
          onPress={handleAllowLocation}
          activeOpacity={0.85}
          style={{
            flex: 1,
            backgroundColor: t.color.accent,
            borderRadius: t.radius.sm,
            paddingVertical: 10,
            alignItems: 'center',
          }}
        >
          <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color.fg, fontFamily: t.family['body-bold'] }}>Use my location</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDeclineLocation}
          activeOpacity={0.85}
          style={{
            flex: 1,
            backgroundColor: t.color['surface-raised'],
            borderWidth: 1,
            borderColor: t.color['border-subtle'],
            borderRadius: t.radius.sm,
            paddingVertical: 10,
            alignItems: 'center',
          }}
        >
          <Text {...t.txt('text-xs')} style={{ ...t.txt('text-xs').style, color: t.color['fg-secondary'], fontFamily: t.family['body-semi'] }}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Composer (input + DI toggle + send) ───────────────────────────────────────
  const Composer = () => (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: t.color['border-subtle'],
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      {/* The Deep-Insight upsell + toggle are suppressed on a safety screen — a
          crisis/decline screen sells nothing. The plain text field remains so the
          user can keep reaching out. */}
      {!safetyMode && diCapHit && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 8 }}>
          <Ionicons name="lock-closed" size={12} color={t.color.accent} />
          <Text style={{ ...t.txt('text-2xs').style, color: t.color.accent, marginLeft: 6, flex: 1 }}>
            You've used your Deep Insight this month.
          </Text>
          <TouchableOpacity onPress={goToPaywall}>
            <Text style={{ ...t.txt('text-2xs').style, color: t.color.accent, fontFamily: t.family['body-bold'] }}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Deep Insight toggle */}
      {!safetyMode && (
        <TouchableOpacity
          onPress={handleToggleDi}
          activeOpacity={0.8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: t.radius.pill,
            marginBottom: 8,
            backgroundColor: deepInsight ? t.color['accent-muted'] : t.color['surface-raised'],
            borderWidth: 1,
            // 🔴 THE OFF STATE OF A TOGGLE IS ITS RESTING BOUNDARY, and at 1.20:1 this chip was
            //    invisible until switched on. It is the control-boundary role now, 3.65:1 on this
            //    fill.
            // 🔴 AND THE ON BRANCH WAS THE ONLY TRUE INVERSION IN THE APP — FIXED 2026-08-04.
            //    Raising the OFF edge to the boundary floor made the ON edge the LESS VISIBLE of
            //    the two: an accent WASH used as a stroke reads 1.25:1 against this ground versus
            //    the off edge's 3.65:1, so switching the control ON made its outline 2.92x fainter.
            //    A state indicator must never be less prominent than the resting state it replaces.
            //    It is the plain accent now — 6.55:1, and the ruling already said so: an edge that
            //    SIGNALS selection, focus or active state is an ACCENT role. The wash is correct as
            //    the FILL and was only ever wrong as the STROKE, so the fill is untouched.
            // ⚠️ SEPARATION AND ORDERING ARE DIFFERENT DIAGNOSTICS AND THIS SITE PROVES IT: its
            //    separation ROSE at the last item (1.04 -> 2.92) while its ordering INVERTED. A
            //    check on separation alone would have called this the healthiest site in the batch.
            borderColor: deepInsight ? t.color.accent : t.color['border-control'],
            opacity: diLocked ? 0.6 : 1,
          }}
        >
          <Ionicons
            name={diLocked ? 'lock-closed' : deepInsight ? 'sparkles' : 'sparkles-outline'}
            size={14}
            color={deepInsight ? t.color.accent : t.color['fg-muted']}
          />
          <Text
            style={{ ...t.txt('text-2xs').style, color: deepInsight ? t.color.accent : t.color['fg-muted'],
              fontFamily: t.family['body-semi'],
              marginLeft: 6 }}
          >
            Deep Insight
          </Text>
        </TouchableOpacity>
      )}

      {notice && (
        <Text style={{ ...t.txt('text-2xs').style, color: t.color.danger, marginBottom: 6, marginLeft: 4 }}>
          {notice}
        </Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        {/* 🔴 THE ONE SITE IN D3 THAT TAKES THE STEP'S STYLE AND REFUSES ITS SCALING.
            `text-sm` is a `scales: true` step, so the txt() spread opts it in — and design
            §3.6 names the chat composer, by hand, as a surface that must NEVER reflow
            ("chrome, numerals and tab labels freeze so X3's fixed 48/56/64 heights and the
            chat composer never reflow"). Both statements are in the design and they
            disagree here, because the ramp classifies by STEP and §3.6 classifies by ROLE:
            this is a 15px input, i.e. chrome that happens to be sized like body copy.
            §3.6 wins — the composer has `minHeight: 44` / `maxHeight: 120` and a send
            button pinned to its baseline, so at the 1.3 cap the text would grow inside a
            box that cannot. The override is AFTER the spread so it wins, and it is
            explicit rather than achieved by omitting the spread, because the style half
            (15/22 leading) is still wanted. Do not "tidy" it back to the spread's value.
            ⚠️ qa.tsx is D8 RESTYLE-ONLY: this adds PROPS to an existing element and
            changes no component boundary and no `!safetyMode` gate. */}
        <TextInput {...t.txt('text-sm')} allowFontScaling={false} maxFontSizeMultiplier={1}
          value={input}
          onChangeText={setInput}
          placeholder="Ask a question…"
          placeholderTextColor={t.color['fg-placeholder']}
          multiline
          editable={!sending}
          style={{ ...t.txt('text-sm').style, flex: 1,
            color: t.color.fg,
            maxHeight: 120,
            minHeight: 44,
            backgroundColor: t.color.surface,
            borderWidth: 1,
            // 🔴 AN EMPTY COMPOSER IS THE DEFAULT STATE OF THIS SCREEN, and its edge was the
            //    structural strong neutral at 1.55:1 — a field the user is meant to type into,
            //    with no identifiable boundary until they already have. Control-boundary role,
            //    3.87:1 on this fill.
            // ⚠️ The separation to the filled state falls 4.48 -> 1.79, and it needs no width step
            //    the way the field primitive did: the state here IS "has content", so the content
            //    is the cue. Nobody needs an edge to know they have typed.
            borderColor: input ? t.color.accent : t.color['border-control'],
            borderRadius: t.radius.md,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 10 }}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !input.trim()}
          activeOpacity={0.85}
          style={{
            width: 44,
            height: 44,
            borderRadius: t.radius.pill,
            backgroundColor: input.trim() && !sending ? t.color.accent : t.color['border-subtle'],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {sending ? (
            <ActivityIndicator color={t.color.fg} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={20} color={t.color.fg} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* 🔴 THE ANDROID BRANCH WAS `undefined`, WHICH IS NOT A FALLBACK — IT IS NO AVOIDANCE
            AT ALL. This screen is the only keyboard surface in the app that had it; every form
            in the tree reaches the shared screen wrapper, whose Android branch is 'height'.
            The reason it used to work anyway, and no longer does: the platform's soft-input
            mode that used to re-lay-out the window is inert once an app is drawn edge to edge,
            and edge to edge became mandatory at the API level this app has targeted since the
            Play-compliance bump. So nothing lifted the composer and the keyboard simply sat on
            top of it — the flagship paid feature, unreadable the moment the user typed.
            ⚠️ Fixed by taking the app's OWN idiom rather than inventing one: same expression as
            the shared wrapper's, so the two cannot drift.
            ⚠️ RESTYLE-ONLY is respected — this changes ONE PROP VALUE on an element that is
            already here. No component boundary moves and none of the eight independent
            safety-state gates is touched. */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color={t.color.fg} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ ...t.txt('display-sm').style, color: t.color.fg }}>AI Astrologer</Text>
            </View>
          </View>

          {/* Rendered as function CALLS, not <Counters/> elements: an inner
              component gets a new identity each render, so mounting it as JSX
              would remount the composer's TextInput on every keystroke and drop
              keyboard focus. Invoking them inlines their output into this tree. */}
          {!safetyMode && Counters()}
          {!safetyMode && locationConsent === 'undecided' && LocationConsentBanner()}

          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              ChatEmptyState()
            ) : (
              messages.map((msg) => <Bubble key={msg.id} msg={msg} />)
            )}
            {sending && (
              <View style={{ alignSelf: 'flex-start', marginBottom: 12, marginLeft: 4 }}>
                <ActivityIndicator color={t.color.accent} size="small" />
              </View>
            )}
          </ScrollView>

          {/* A safety screen never shows the upgrade CTA — it renders the plain
              composer (DI upsell already suppressed inside it). */}
          {!safetyMode && atQuestionCap ? QuestionCapCta() : Composer()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const chipStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 5,
  backgroundColor: t.color['surface-raised'],
  borderWidth: 1,
  borderColor: t.color['border-subtle'],
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: t.radius.pill,
};

// 🔴 MODULE SCOPE — `lineHeight`/`letterSpacing` are PLAIN PROPERTY READS, deliberately
//    NOT `...t.txt('text-2xs').style`. txt() here would run at IMPORT, before React mounts,
//    so a mistyped step name throws where the root ErrorBoundary cannot see it and the app
//    dies white. A property read on a bad key yields `undefined`, which RN ignores. Same
//    values, no import-time failure mode. See theme.js's txt() note.
//    `text-2xs` is a `scales: false` step, so there is no opt-in to place either.
const chipTextStyle = { color: t.color['fg-secondary'], fontSize: t.type['text-2xs'].size, lineHeight: t.type['text-2xs'].lineHeight, letterSpacing: t.type['text-2xs'].letterSpacing };

const ctaButtonStyle = {
  marginTop: 12,
  backgroundColor: t.color.accent,
  borderRadius: t.radius.md,
  paddingVertical: 13,
  alignItems: 'center' as const,
};

// 🔴 MODULE SCOPE — property reads, not a txt() spread. Same reason as chipTextStyle above.
// ⚠️ AND THE HALF A STYLE OBJECT CANNOT CARRY: `text-sm` IS a `scales: true` step, but
//    `allowFontScaling` / `maxFontSizeMultiplier` are <Text> PROPS, not style keys. So the
//    P23 opt-in for this style lives at its ONE call site (the "Upgrade and unlock more
//    questions" CTA), not here. That split is why 41 of D3's 179 scaling sites could not be
//    closed by a style-object rewrite alone — see the pass-2b notes.
const ctaButtonTextStyle = { color: t.color.fg, fontSize: t.type['text-sm'].size, lineHeight: t.type['text-sm'].lineHeight, letterSpacing: t.type['text-sm'].letterSpacing, fontFamily: t.family['body-bold'] };
