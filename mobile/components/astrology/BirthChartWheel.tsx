import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
// Pass 2a: the one numeric fontSize in this file. 🔴 This import is DELIBERATELY NARROW —
// §7.3's allow-list makes this the ONLY file permitted to touch `t.chart`, and that
// allow-list is load-bearing for pass-5 correctness (success/chart.harmonious and
// danger/chart.tense are held-value collisions). Importing the theme here does not widen
// it; the wheel's 11 raw hex literals stay with the §11.4 wheel work.
import * as t from '@/theme';

const ZODIAC_SIGNS = [
  { symbol: '\u2648', name: 'Aries' },
  { symbol: '\u2649', name: 'Taurus' },
  { symbol: '\u264A', name: 'Gemini' },
  { symbol: '\u264B', name: 'Cancer' },
  { symbol: '\u264C', name: 'Leo' },
  { symbol: '\u264D', name: 'Virgo' },
  { symbol: '\u264E', name: 'Libra' },
  { symbol: '\u264F', name: 'Scorpio' },
  { symbol: '\u2650', name: 'Sagittarius' },
  { symbol: '\u2651', name: 'Capricorn' },
  { symbol: '\u2652', name: 'Aquarius' },
  { symbol: '\u2653', name: 'Pisces' },
];

const PLANET_SYMBOLS: Record<string, string> = {
  sun: '\u2609',
  moon: '\u263D',
  mercury: '\u263F',
  venus: '\u2640',
  mars: '\u2642',
  jupiter: '\u2643',
  saturn: '\u2644',
  uranus: '\u2645',
  neptune: '\u2646',
  pluto: '\u2647',
};

const ASPECT_COLORS: Record<string, string> = {
  Conjunction: '#F59E0B',
  Sextile: '#10B981',
  Square: '#EF4444',
  Trine: '#3B82F6',
  Opposition: '#EC4899',
};

function getSignIndex(signName: string): number {
  const idx = ZODIAC_SIGNS.findIndex(
    (s) => s.name.toLowerCase() === signName.toLowerCase()
  );
  return idx >= 0 ? idx : 0;
}

interface BirthChartWheelProps {
  chartData: any;
}

export function BirthChartWheel({ chartData }: BirthChartWheelProps) {
  if (!chartData?.planets) return null;

  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 140;
  const innerR = 120;
  const planetR = 80;

  // Calculate planet positions
  const getPlanetPos = (planet: string) => {
    const data = chartData.planets[planet];
    if (!data) return { x: cx, y: cy };
    const signIdx = getSignIndex(data.sign);
    const angle = ((signIdx * 30 + (data.degree || 15)) - 90) * (Math.PI / 180);
    return {
      x: cx + planetR * Math.cos(angle),
      y: cy + planetR * Math.sin(angle),
    };
  };

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer zodiac ring */}
        <Circle cx={cx} cy={cy} r={outerR} stroke="#F59E0B" strokeWidth={1} fill="none" opacity={0.5} />
        <Circle cx={cx} cy={cy} r={innerR} stroke="#6B7280" strokeWidth={0.5} fill="none" opacity={0.3} />

        {/* House divisions */}
        {[...Array(12)].map((_, i) => {
          const angle = ((i * 30) - 90) * (Math.PI / 180);
          return (
            <Line
              key={`div-${i}`}
              x1={cx}
              y1={cy}
              x2={cx + outerR * Math.cos(angle)}
              y2={cy + outerR * Math.sin(angle)}
              stroke="#374151"
              strokeWidth={0.5}
              opacity={0.4}
            />
          );
        })}

        {/* Zodiac symbols */}
        {ZODIAC_SIGNS.map((sign, i) => {
          const angle = ((i * 30 + 15) - 90) * (Math.PI / 180);
          const x = cx + 130 * Math.cos(angle);
          const y = cy + 130 * Math.sin(angle);
          return (
            <SvgText
              key={`sign-${i}`}
              x={x}
              y={y + 5}
              fill="#F59E0B"
              fontSize={12}
              textAnchor="middle"
              opacity={0.7}
            >
              {sign.symbol}
            </SvgText>
          );
        })}

        {/* Aspect lines */}
        {chartData.aspects &&
          chartData.aspects.slice(0, 8).map((aspect: any, i: number) => {
            const p1 = getPlanetPos(aspect.planet1.toLowerCase());
            const p2 = getPlanetPos(aspect.planet2.toLowerCase());
            const color = ASPECT_COLORS[aspect.aspect] || '#6B7280';
            const isDashed = aspect.aspect === 'Square' || aspect.aspect === 'Opposition';
            return (
              <Line
                key={`aspect-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth={0.8}
                opacity={0.4}
                strokeDasharray={isDashed ? '4,4' : undefined}
              />
            );
          })}

        {/* Planet positions */}
        {Object.entries(chartData.planets).map(([planet, data]: [string, any]) => {
          const pos = getPlanetPos(planet);
          const symbol = PLANET_SYMBOLS[planet] || planet[0].toUpperCase();
          return (
            <G key={`planet-${planet}`}>
              <Circle cx={pos.x} cy={pos.y} r={10} fill="rgba(107,33,168,0.3)" />
              {/* 🔴 PASS 4 · E4 — THE ONLY JSX-PROP WEIGHT IN THE TREE, AND NO FIGURE IN THE PLAN
                  HAD EVER COUNTED IT. The `no-fontweight` inline rule anchored on the property
                  plus a COLON, so it could not see a prop form at all: 170 colon-form sites,
                  1 here, total 171. Same shape as O-29 one property over — the rule keys on a
                  spelling the value does not always arrive in. The rule is widened (E0).

                  THE WEIGHT IS DELETED, NOT TRANSLATED TO A FAMILY, for three reasons:
                    1. this is a GLYPH site — the planets render as astrological pictographs, and
                       a pictograph's weight is not typography (the same argument as pass 2a's 60
                       glyph fontSize exceptions);
                    2. those codepoints are in NEITHER shipped face, so any family named here
                       would resolve through the platform's per-glyph fallback regardless — and
                       the "bold" was therefore always a SYNTHETIC skew of a fallback symbol font,
                       differently on each platform, which is exactly what B1 bans;
                    3. the zodiac-symbol SvgText above (the file's own precedent, same wheel, same
                       kind of glyph) already carries no weight. This makes the two layers agree.

                  ⚠️ CONSEQUENCE, registered rather than hidden: the 11px planet symbols render
                  slightly lighter than before. Design §11.4 owns this file and is scheduled after
                  pass 5; if the wheel reads thin, the fix belongs there, as a treatment, not as a
                  re-added banned property.

                  ⚠️ ALSO NOTE: this is react-native-svg's Text, NOT React Native's, so the global
                  default in lib/textDefaults does not reach it. It keeps the platform font by
                  design — there is nothing here for a Latin face to render. */}
              <SvgText
                x={pos.x}
                y={pos.y + 4}
                fill="white"
                fontSize={11}
                textAnchor="middle"
              >
                {symbol}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      {!chartData.risingSign && (
        <Text style={styles.noTimeWarning}>
          Add birth time for Rising sign & houses
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noTimeWarning: {
    color: '#9CA3AF',
    fontSize: t.type['text-2xs'].size,
    lineHeight: t.type['text-2xs'].lineHeight,
    letterSpacing: t.type['text-2xs'].letterSpacing,
    marginTop: 8,
    textAlign: 'center',
  },
});
