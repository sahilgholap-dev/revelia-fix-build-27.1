import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform, Linking, Image, Share } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { useBottomInsetPadding } from '@/hooks/useBottomInsetPadding';
import { ChangePasswordModal } from '@/components/account/ChangePasswordModal';
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal';
import { LogoutConfirmModal } from '@/components/account/LogoutConfirmModal';
import { UpdateNameModal } from '@/components/account/UpdateNameModal';
import { TimezonePicker } from '@/components/profile/TimezonePicker';
import { useAuth } from '@/hooks/useAuth';
import { useProfileStore } from '@/store/profileStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useEngagementStore } from '@/store/engagementStore';
import { useReadingsStore } from '@/store/readingsStore';
import { accountService } from '@/services/account.service';
import { TIER_DISPLAY_NAME } from '@/lib/constants';
import { requestNotificationPermission, optInToNotifications, optOutOfNotifications, setUserTags } from '@/lib/onesignal';
import { DateTimeField } from '@/components/ui/DateTimeField';
import * as Haptics from 'expo-haptics';
import { version } from '../../package.json';
import * as t from '@/theme';
import { openPaywall } from '@/lib/paywall';

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { profile, numerology, fetchProfile, fetchNumerology } = useProfileStore();
  const { preferences, fetchPreferences, updatePreferences } = useNotificationStore();
  const { streakData, fetchStreak } = useEngagementStore();
  const { faceReading } = useReadingsStore();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUpdateName, setShowUpdateName] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const bottomPad = useBottomInsetPadding();

  useEffect(() => {
    fetchProfile();
    fetchNumerology();
    fetchPreferences();
    fetchStreak();
  }, []);

  useEffect(() => {
    if (preferences?.dailyInsightTime) {
      const [hours, minutes] = preferences.dailyInsightTime.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      setSelectedTime(date);
    }
  }, [preferences]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  const handleExportData = async () => {
    showAlert(
      'Export Your Data',
      'We will prepare your data and send it to your email address.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const result = await accountService.exportData();
              showAlert('Success', result.message || 'Your data export has been requested.');
            } catch (error: any) {
              showAlert('Error', error.response?.data?.error || 'Failed to export data');
            }
          },
        },
      ]
    );
  };

  const handleShareApp = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // RN's Share API opens the native share sheet for text/URL content.
      // expo-sharing's shareAsync is for FILE URIs only — the previous call
      // passed an empty URI and silently failed before reaching here.
      await Share.share({
        title: 'Share Revelia',
        message: 'Discover your destiny with Revelia! Your face, your palm, your future revealed. Download now: https://revelia.me',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleRateApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const storeUrl = Platform.select({
      // Replace id000000000 with the numeric App Store ID once the app is live on the App Store.
      ios: 'https://apps.apple.com/app/revelia/id000000000',
      android: 'https://play.google.com/store/apps/details?id=com.revelia.app',
    });
    if (storeUrl) {
      Linking.openURL(storeUrl);
    }
  };

  const handleContactSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL('mailto:support@revelia.me?subject=Revelia Support Request');
  };

  const handleTimeChange = (event: any, date?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');

    if (date) {
      setSelectedTime(date);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      updatePreferences({ dailyInsightTime: timeString });
      setUserTags({ tier: user?.subscription?.tier || 'free', timezone: preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  /* 🔴 EXTRACTED TO lib/constants.ts AT THE FUNNEL PHASE'S SCREEN 6, and the local name is kept as
     an alias so the two read sites below are untouched. Home needed these three strings and could
     not reach them, so it was constructing its tier line from the raw tier field instead — the
     second copy this map would otherwise have grown. See the extracted declaration for why a copy
     was the wrong answer. */
  const tierDisplay = TIER_DISPLAY_NAME;

  return (
    <ScreenContainer withScrollView={false}>
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <Text className="text-fg text-display-lg font-display">Profile</Text>
        <Text className="text-fg-muted text-sm mt-1">
          {getGreeting()}, {profile?.name || user?.name || 'Guest'}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {/* 1. Profile Header */}
        <Card className="mb-6">
          <View className="items-center">
            {/* Profile Photo */}
            {/* 🔴 PASS 3a — BOTH branches below had two dead `30`-key width/height classes, and all
                four were DELETED rather than migrated. Tailwind 3 has no `30` key at all, so they
                never resolved at either inlineRem baseline (verified: null), and both elements have
                always been sized by their own inline 120×120. `theme.js` excludes that key
                DELIBERATELY — do not adopt it into the scale to make the classes "work"; that would
                silently change this avatar's dimensions. The inline dimension is the size.
                ⚠️ AND NOTE WHAT THIS COMMENT ALREADY DID ONCE: the word it used to carry for that
                idea is ITSELF a bare Tailwind utility name, so the content scanner harvested it out
                of this comment and emitted a live rule with ZERO call sites — caught by
                `resolve-utilities.js --diff` going 202 -> 203, and by nothing else. Before adding a
                word here, ask whether it is also a Tailwind class.
                ⚠️ Do NOT spell those classes out anywhere in a comment: `token-gate.sh` greps for
                them literally and they are a permanent invariant at 0 from this pass on, so writing
                them here re-opens a counter and the reopening looks exactly like a regression. */}
            {profile?.images?.face?.url ? (
              <Image
                source={{ uri: profile.images.face.url }}
                className="rounded-pill mb-4"
                style={{ width: 120, height: 120, borderRadius: t.radius.pill }}
              />
            ) : (
              <View className="rounded-pill bg-accent/20 items-center justify-center mb-4" style={{ width: 120, height: 120 }}>
                <Text className="text-fg text-4xl font-body-bold">
                  {(profile?.name || user?.name || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}

            {/* Name & Email */}
            <Text className="text-fg text-2xl font-body-bold mb-1">
              {profile?.name || user?.name || 'Guest'}
            </Text>
            <Text className="text-fg-muted text-sm mb-4">{user?.email}</Text>

            {/* Archetype Badge */}
            {faceReading?.archetype && (
              <View className="bg-accent/20 rounded-pill px-4 py-2 mb-3">
                <Text className="text-accent-2 font-body-semi">
                  {typeof faceReading.archetype === 'string' ? faceReading.archetype : (faceReading.archetype as any).name}
                </Text>
              </View>
            )}

            {/* Sun Sign + Life Path Row */}
            <View className="flex-row gap-3 mb-3">
              {profile?.sunSign && (
                <View className="bg-surface rounded-pill px-4 py-2 border border-accent">
                  <Text className="text-accent font-body-semi">☀️ {profile.sunSign}</Text>
                </View>
              )}
              {profile?.lifePathNumber && (
                <View className="bg-surface rounded-pill px-4 py-2 border border-accent-2">
                  <Text className="text-accent-2 font-body-semi">✨ Life Path {profile.lifePathNumber}</Text>
                </View>
              )}
            </View>

            {/* Streak Badge */}
            {streakData && streakData.currentStreak > 0 && (
              <View className="bg-accent/10 rounded-pill px-4 py-2 mb-3">
                <Text className="text-accent font-body-semi">
                  🔥 {streakData.currentStreak}-day streak
                </Text>
              </View>
            )}

            {/* Subscription Tier Badge */}
            <View className="bg-accent-2/20 rounded-pill px-4 py-2">
              <Text className="text-accent-2 font-body-semi">
                {tierDisplay[user?.subscription?.tier || 'free']}
              </Text>
            </View>
          </View>
        </Card>

        {/* 2. My Revelia Profile Card */}
        {(faceReading || profile?.sunSign || profile?.lifePathNumber) && (
          <Card className="mb-6">
            <Text className="text-fg text-xl font-body-bold mb-4">My Revelia Profile</Text>

            {faceReading?.archetype && (
              <View className="mb-3">
                <Text className="text-fg-muted text-sm">Face Archetype</Text>
                <Text className="text-fg text-base font-body-semi">
                  {typeof faceReading.archetype === 'string' ? faceReading.archetype : (faceReading.archetype as any).name}
                </Text>
              </View>
            )}

            {profile?.sunSign && (
              <View className="mb-3 pt-3 border-t border-border-subtle">
                <Text className="text-fg-muted text-sm">Sun Sign</Text>
                <Text className="text-fg text-base font-body-semi">☀️ {profile.sunSign}</Text>
              </View>
            )}

            {profile?.lifePathNumber && numerology && (
              <View className="mb-3 pt-3 border-t border-border-subtle">
                <Text className="text-fg-muted text-sm">Life Path Number</Text>
                <Text className="text-fg text-base font-body-semi">
                  {profile.lifePathNumber} - {numerology.lifePathMeaning}
                </Text>
              </View>
            )}

            {numerology?.personalYear && (
              <View className="pt-3 border-t border-border-subtle">
                <Text className="text-fg-muted text-sm">Personal Year</Text>
                <Text className="text-fg text-base font-body-semi">
                  {numerology.personalYear} - {numerology.personalYearMeaning}
                </Text>
              </View>
            )}

            <View className="mt-4">
              <Button
                title="View Your Readings"
                onPress={() => router.push('/(main)/readings' as any)}
                variant="outline"
                fullWidth
              />
            </View>
          </Card>
        )}

        {/* 3. Subscription Section */}
        <View className="mb-6">
          <Text className="text-fg text-xl font-body-semi mb-3">Subscription</Text>
          <Card>
            {user?.subscription?.tier === 'free' ? (
              <>
                <Text className="text-fg text-lg font-body-bold mb-2">Free Plan</Text>
                <Text className="text-fg-muted mb-4">
                  Upgrade to unlock premium features and insights
                </Text>
                <Button
                  title="Upgrade to Premium"
                  onPress={() => openPaywall('profile-upgrade')}
                  variant="primary"
                  fullWidth
                />
              </>
            ) : (
              <>
                <Text className="text-fg text-lg font-body-bold mb-2">
                  {tierDisplay[user?.subscription?.tier || 'free']}
                </Text>
                <Text className="text-fg-muted mb-4">
                  You have access to all premium features
                </Text>
                {user?.subscription?.expiresAt && (
                  <Text className="text-fg-muted text-sm mb-4">
                    Next billing: {formatDate(user.subscription.expiresAt)}
                  </Text>
                )}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Open App Store/Play Store subscription management
                    const url = Platform.select({
                      ios: 'https://apps.apple.com/account/subscriptions',
                      android: 'https://play.google.com/store/account/subscriptions',
                    });
                    if (url) Linking.openURL(url);
                  }}
                  className="mb-3"
                >
                  <Text className="text-accent text-base">Manage Subscription →</Text>
                </TouchableOpacity>
                <Button
                  title="Change Plan"
                  onPress={() => openPaywall('profile-change-plan')}
                  variant="outline"
                  fullWidth
                />
              </>
            )}
          </Card>
        </View>

        {/* 4. Notification Settings */}
        <View className="mb-6">
          <Text className="text-fg text-xl font-body-semi mb-3">Notifications</Text>
          <Card>
            {/* Master toggle */}
            <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-border-subtle">
              <View className="flex-1 mr-4">
                <Text className="text-fg text-base font-body-semi mb-1">
                  Enable Notifications
                </Text>
                <Text className="text-fg-muted text-sm">
                  Get your daily insights and cosmic updates
                </Text>
              </View>
              {/* 🔴 THE APP'S ONLY TOGGLE, AND ITS 1.4.11 STATUS IS SETTLED HERE RATHER THAN LEFT
                    AMBIGUOUS — 2026-08-04. The control-boundary role added at the border item was
                    deliberately NOT applied to this control, because it has no boundary: its states
                    are TRACK FILLS, and putting a border role on a fill is the exact mirror of the
                    `O-39` error that item closed. That refusal was right. What it left open was
                    whether the states are distinguishable at all, and the answer is MEASURED:

                      OFF track (the subtle wash over this Card)   1.17 vs the card
                      ON  track (the accent role)                  6.95 vs the card
                      🟢 OFF track vs ON track                     5.92   <- 1.4.11 wants 3.00

                    🟢 SO THE STATE CLEARS BY COLOUR ALONE, and the feared "the two fills are one
                    1.08 surface step apart" does not apply to this control: the off track is a 7%
                    foreground WASH and the on track is the accent role, which are not neighbouring
                    surface steps. There was no gap of that shape to register.

                    🟢 AND THERE IS A NON-COLOUR CUE ON TOP OF IT: the thumb's POSITION. The thumb
                    clears 3:1 against the card ground (16.04) and against the off track (13.66), so
                    the position is readable independently of hue — which also answers why the off
                    track's own 1.17 is NOT a violation. The control is identified by its THUMB, not
                    by its groove; 1.4.11 governs the information REQUIRED to identify a component
                    and its state, and the groove carries neither.

                    🔴 BUT MEASURING IT FOUND A DIFFERENT GAP, AND IT IS THE A5 RATIO EXACTLY: the
                    thumb was the plain foreground on the ON track, i.e. a near-white shape on an
                    accent fill at 2.31:1 — the same 2.31 that made A5 a token-table rule. With the
                    switch ON the thumb was barely separable from its own track, so the POSITION cue
                    the paragraph above relies on was degrading in the one state that matters most.
                    🟢 Fixed the way A5 already rules for anything on an accent fill: the on-fill
                    role, 6.86:1. The thumb is now state-dependent, which is the only way to keep
                    both ends legal — 13.66 off, 6.86 on. */}
              <Switch
                value={preferences?.notifications || false}
                onValueChange={async (value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updatePreferences({ notifications: value });
                  if (value) {
                    await requestNotificationPermission();
                    await optInToNotifications();
                  } else {
                    await optOutOfNotifications();
                  }
                }}
                trackColor={{ false: t.color['border-subtle'], true: t.color.accent }}
                thumbColor={preferences?.notifications ? t.color['on-accent'] : t.color.fg}
              />
            </View>

            {preferences?.notifications && (
              <>
                {/* Daily insight time */}
                <View className="mb-4">
                  <Text className="text-fg text-base font-body-semi mb-2">
                    Daily Insight Time
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowTimePicker(true);
                    }}
                    className="bg-bg rounded-md p-3"
                  >
                    <Text className="text-fg">
                      {preferences?.dailyInsightTime || '09:00'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Timezone — tappable picker (Build 22) */}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowTimezonePicker(true);
                  }}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-fg text-sm font-body-semi mb-1">
                      Timezone
                    </Text>
                    <Text className="text-fg-muted text-sm">
                      {preferences?.timezone || 'America/New_York'}
                    </Text>
                  </View>
                  <Text className="text-accent text-sm">Change ›</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>
        </View>

        {/* Time Picker Modal */}
        {showTimePicker && (
          <DateTimeField
            value={selectedTime}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        {/* 5. Account Section */}
        <View className="mb-6">
          <Text className="text-fg text-xl font-body-semi mb-3">Account</Text>
          <Card>
            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowUpdateName(true);
              }}
            >
              <Text className="text-fg text-base">Update Name</Text>
              {!!user?.name && (
                <Text className="text-fg-muted text-xs mt-0.5">{user.name}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(capture)/birth-data' as any);
              }}
            >
              <Text className="text-fg text-base">Update Birth Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(capture)/face-capture' as any);
              }}
            >
              <Text className="text-fg text-base">Retake Face Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(capture)/palm-capture' as any);
              }}
            >
              <Text className="text-fg text-base">Retake Palm Photo</Text>
            </TouchableOpacity>

            {user?.authProvider === 'email' && (
              <TouchableOpacity
                className="py-3 border-b border-border-subtle"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowChangePassword(true);
                }}
              >
                <Text className="text-fg text-base">Change Password</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="py-3"
              onPress={handleExportData}
            >
              <Text className="text-fg text-base">Export My Data</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* 6. Privacy Section */}
        <View className="mb-6">
          <Text className="text-fg text-xl font-body-semi mb-3">Privacy & Legal</Text>
          <Card>
            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://revelia.me/privacy');
              }}
            >
              <Text className="text-fg text-base">Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://revelia.me/terms');
              }}
            >
              <Text className="text-fg text-base">Terms of Service</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://revelia.me/support');
              }}
            >
              <Text className="text-fg text-base">Support</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* 7. About Section */}
        <View className="mb-6">
          <Text className="text-fg text-xl font-body-semi mb-3">About</Text>
          <Card>
            <View className="py-3 border-b border-border-subtle">
              <Text className="text-fg-muted text-sm mb-1">App Version</Text>
              <Text className="text-fg text-base">{version}</Text>
            </View>

            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={handleRateApp}
            >
              <Text className="text-fg text-base">Rate Revelia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={handleShareApp}
            >
              <Text className="text-fg text-base">Share Revelia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={handleContactSupport}
            >
              <Text className="text-fg text-base">Contact Support</Text>
            </TouchableOpacity>

          </Card>
        </View>

        {/* 7b. Social Section */}
        <View className="mb-6">
          <Text className="text-fg text-xl font-body-semi mb-3">Follow Us</Text>
          <Card>
            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://www.tiktok.com/@revelia.app');
              }}
            >
              <Text className="text-fg text-base">TikTok</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://www.instagram.com/reveliaapp/');
              }}
            >
              <Text className="text-fg text-base">Instagram</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://www.facebook.com/share/14Wiai7WX2m/');
              }}
            >
              <Text className="text-fg text-base">Facebook</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://x.com/ReveliaApp');
              }}
            >
              <Text className="text-fg text-base">X (Twitter)</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* 8. Danger Zone */}
        <View className="mb-6">
          <Text className="text-danger text-xl font-body-semi mb-3">Danger Zone</Text>
          <Card className="border-danger/30">
            <TouchableOpacity
              className="py-3 border-b border-border-subtle"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowLogoutConfirm(true);
              }}
            >
              <Text className="text-danger text-base font-body-semi">Log Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3"
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setShowDeleteAccount(true);
              }}
            >
              <Text className="text-danger text-base font-body-semi">Delete Account</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* 9. Entertainment Disclaimer Footer */}
        {/* 🔴 A DIVERGENT COPY OF THE COMPLIANCE NOTICE, and audit §6.2 row 6 records it as a
            hand-shortened variant of the shared component's string. It was on the sub-AA
            placeholder role, exactly as the shared component was, so it takes the same role fix
            and the same scaling opt-in. The COPY is untouched: replacing this with the shared
            component would restore the two dropped sentences, and that is a Q3 decision. */}
        <View className="py-6 mb-6">
          <Text
            accessibilityRole="text"
            allowFontScaling
            maxFontSizeMultiplier={1.3}
            className="text-fg-muted text-xs font-body text-center"
          >
            Revelia readings are for entertainment and self-reflection purposes only.
          </Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <UpdateNameModal
        visible={showUpdateName}
        onClose={() => setShowUpdateName(false)}
      />

      <TimezonePicker
        visible={showTimezonePicker}
        selected={preferences?.timezone}
        birthplaceTz={profile?.birthData?.location?.timezone || null}
        onSelect={(tz) => {
          updatePreferences({ timezone: tz });
          setShowTimezonePicker(false);
          setUserTags({ tier: user?.subscription?.tier || 'free', timezone: tz });
        }}
        onClose={() => setShowTimezonePicker(false)}
      />

      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      <DeleteAccountModal
        visible={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onComplete={handleLogout}
      />

      <LogoutConfirmModal
        visible={showLogoutConfirm}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </ScreenContainer>
  );
}
