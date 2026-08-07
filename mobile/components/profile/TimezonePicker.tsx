import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as t from '@/theme';

interface TimezoneItem {
  tz: string;
  label: string;
}

interface TimezoneRegion {
  label: string;
  items: TimezoneItem[];
}

const TIMEZONE_REGIONS: TimezoneRegion[] = [
  {
    label: 'Americas',
    items: [
      { tz: 'America/New_York', label: 'New York (Eastern)' },
      { tz: 'America/Chicago', label: 'Chicago (Central)' },
      { tz: 'America/Denver', label: 'Denver (Mountain)' },
      { tz: 'America/Los_Angeles', label: 'Los Angeles (Pacific)' },
      { tz: 'America/Phoenix', label: 'Phoenix (No DST)' },
      { tz: 'America/Anchorage', label: 'Anchorage' },
      { tz: 'Pacific/Honolulu', label: 'Honolulu' },
      { tz: 'America/Toronto', label: 'Toronto' },
      { tz: 'America/Mexico_City', label: 'Mexico City' },
      { tz: 'America/Sao_Paulo', label: 'São Paulo' },
    ],
  },
  {
    label: 'Europe',
    items: [
      { tz: 'Europe/London', label: 'London' },
      { tz: 'Europe/Paris', label: 'Paris' },
      { tz: 'Europe/Berlin', label: 'Berlin' },
      { tz: 'Europe/Madrid', label: 'Madrid' },
      { tz: 'Europe/Rome', label: 'Rome' },
      { tz: 'Europe/Athens', label: 'Athens' },
      { tz: 'Europe/Moscow', label: 'Moscow' },
    ],
  },
  {
    label: 'Asia',
    items: [
      { tz: 'Asia/Kolkata', label: 'India (IST)' },
      { tz: 'Asia/Dubai', label: 'Dubai' },
      { tz: 'Asia/Singapore', label: 'Singapore' },
      { tz: 'Asia/Hong_Kong', label: 'Hong Kong' },
      { tz: 'Asia/Tokyo', label: 'Tokyo' },
      { tz: 'Asia/Shanghai', label: 'Shanghai' },
      { tz: 'Asia/Seoul', label: 'Seoul' },
      { tz: 'Asia/Bangkok', label: 'Bangkok' },
    ],
  },
  {
    label: 'Oceania',
    items: [
      { tz: 'Australia/Sydney', label: 'Sydney' },
      { tz: 'Australia/Melbourne', label: 'Melbourne' },
      { tz: 'Pacific/Auckland', label: 'Auckland' },
    ],
  },
  {
    label: 'Africa',
    items: [
      { tz: 'Africa/Cairo', label: 'Cairo' },
      { tz: 'Africa/Johannesburg', label: 'Johannesburg' },
      { tz: 'Africa/Lagos', label: 'Lagos' },
    ],
  },
];

interface Props {
  visible: boolean;
  selected: string | null | undefined;
  birthplaceTz?: string | null;
  onSelect: (tz: string) => void;
  onClose: () => void;
}

export function TimezonePicker({
  visible,
  selected,
  birthplaceTz,
  onSelect,
  onClose,
}: Props) {
  // Surface birthplace tz at the top if it's not already in the curated
  // list. Lets users with obscure birthplaces (e.g., Africa/Nairobi)
  // still pick their tz without scrolling through every region.
  const showBirthplaceShortcut = useMemo(() => {
    if (!birthplaceTz) return false;
    const all = TIMEZONE_REGIONS.flatMap((r) => r.items.map((i) => i.tz));
    return !all.includes(birthplaceTz);
  }, [birthplaceTz]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {/* P42 — the display steps scale; the prop belongs at the element, not the style. */}
          <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.title}>Choose Timezone</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color={t.color['fg-muted']} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {showBirthplaceShortcut && birthplaceTz && (
            <View style={styles.region}>
              <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.regionLabel}>Your Birthplace</Text>
              <RowItem
                label={`Other (${birthplaceTz})`}
                tz={birthplaceTz}
                isSelected={selected === birthplaceTz}
                onSelect={onSelect}
              />
            </View>
          )}
          {TIMEZONE_REGIONS.map((region) => (
            <View key={region.label} style={styles.region}>
              <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.regionLabel}>{region.label}</Text>
              {region.items.map((item) => (
                <RowItem
                  key={item.tz}
                  label={item.label}
                  tz={item.tz}
                  isSelected={selected === item.tz}
                  onSelect={onSelect}
                />
              ))}
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function RowItem({
  label,
  tz,
  isSelected,
  onSelect,
}: {
  label: string;
  tz: string;
  isSelected: boolean;
  onSelect: (tz: string) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onSelect(tz)}
      style={[styles.row, isSelected && styles.rowSelected]}
    >
      <View style={{ flex: 1 }}>
        <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtle}>{tz}</Text>
      </View>
      {isSelected && (
        <Ionicons name="checkmark-circle" size={20} color={t.color.accent} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.color.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.color['border-subtle'],
  },
  title: {
    color: t.color.fg,
    fontSize: t.type['display-sm'].size,
    lineHeight: t.type['display-sm'].lineHeight,
    letterSpacing: t.type['display-sm'].letterSpacing,
    fontFamily: t.family.display,
  },
  scroll: {
    flex: 1,
  },
  region: {
    marginTop: 12,
  },
  regionLabel: {
    color: t.color.accent,
    fontSize: t.type['text-xs'].size,
    lineHeight: t.type['text-xs'].lineHeight,
    letterSpacing: t.type['text-xs'].letterSpacing,
    fontFamily: t.family['body-bold'],
    textTransform: 'uppercase',

    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: t.color['border-subtle'],
  },
  rowSelected: {
    backgroundColor: t.alpha(t.color.accent, 10),
  },
  rowLabel: {
    color: t.color.fg,
    fontSize: t.type['text-sm'].size,
    lineHeight: t.type['text-sm'].lineHeight,
    letterSpacing: t.type['text-sm'].letterSpacing,
    fontFamily: t.family['body-semi'],
  },
  rowSubtle: {
    color: t.color['fg-muted'],
    fontSize: t.type['text-2xs'].size,
    lineHeight: t.type['text-2xs'].lineHeight,
    letterSpacing: t.type['text-2xs'].letterSpacing,
    marginTop: 2,
  },
});

export default TimezonePicker;
