// Web fork of components/ui/DateTimeField.tsx.
//
// Renders a real <input type="date|time">, which gives iOS Safari its own
// native wheel picker — the closest web equivalent to the spinner the native
// build shows, and far better than any JS calendar we could draw.
//
// The onChange signature is kept identical to @react-native-community/
// datetimepicker's (event, date) so the five call sites are unchanged: they
// already ignore the event argument and read the second parameter.
//
// Call sites mount this conditionally (showPicker && <DateTimeField .../>), so
// mounting is the user's "open the picker" gesture. showPicker() on mount
// forwards that gesture to the browser's picker where supported, matching the
// native modal's behaviour.
import React, { useEffect, useRef } from 'react';
import * as t from '@/theme';

// react-native-web ships no type declarations, so its unstable_createElement is
// not usable under `strict`. React.createElement with a string tag reaches the
// same place: on web the renderer IS react-dom, so this mounts a real <input>.
// The style object below is plain CSS (react-dom appends "px" to the numeric
// values), not an RN style object, so no RN-to-CSS normalisation is needed.
const createElement = React.createElement;

type WebPickerEvent = {
  type: 'set' | 'dismissed';
  nativeEvent: { timestamp: number };
};

type Props = {
  value: Date;
  mode?: 'date' | 'time';
  display?: string;
  is24Hour?: boolean;
  maximumDate?: Date;
  minimumDate?: Date;
  onChange?: (event: WebPickerEvent, date?: Date) => void;
};

// Local-time formatters. toISOString() would shift by the UTC offset and can
// land the user on the wrong calendar day, which for a birth date changes the
// chart.
const pad = (n: number) => String(n).padStart(2, '0');
const toDateValue = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeValue = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function DateTimeField({
  value,
  mode = 'date',
  maximumDate,
  minimumDate,
  onChange,
}: Props) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    try {
      el?.showPicker?.();
    } catch {
      // Not user-activated, or unsupported: the input is still visible and
      // tappable, so this is an enhancement rather than a requirement.
    }
  }, []);

  const base = value instanceof Date && !isNaN(value.getTime()) ? value : new Date();

  // Take the whole step from txt() rather than naming a family: text-base
  // resolves to body-semi, and hardcoding t.family.body here de-emphasised the
  // control by one rank. family-arrival-check caught exactly that.
  const step = t.txt('text-base').style;

  return createElement('input', {
    ref,
    type: mode === 'time' ? 'time' : 'date',
    value: mode === 'time' ? toTimeValue(base) : toDateValue(base),
    max: mode === 'date' && maximumDate ? toDateValue(maximumDate) : undefined,
    min: mode === 'date' && minimumDate ? toDateValue(minimumDate) : undefined,
    onChange: (e: { target: { value: string } }) => {
      const raw = e.target.value;
      if (!raw) return;
      const next = new Date(base);
      if (mode === 'time') {
        const [h, m] = raw.split(':').map(Number);
        next.setHours(h, m, 0, 0);
      } else {
        const [y, mo, d] = raw.split('-').map(Number);
        next.setFullYear(y, mo - 1, d);
      }
      onChange?.(
        { type: 'set', nativeEvent: { timestamp: next.getTime() } },
        next,
      );
    },
    style: {
      backgroundColor: t.color['surface-raised'],
      color: t.color.fg,
      borderWidth: t.a11y.hairline,
      borderStyle: 'solid',
      borderColor: t.color['border-control'],
      borderRadius: t.radius.md,
      padding: t.space[3],
      marginTop: t.space[2],
      width: '100%',
      fontFamily: step.fontFamily,
      fontSize: step.fontSize,
      letterSpacing: step.letterSpacing,
      // px STRING, deliberately. A bare number is unitless in CSS, so react-dom
      // would emit line-height:22 — twenty-two TIMES the font size — where RN
      // reads the same number as 22dp. One of the few places the two style
      // dialects disagree silently.
      lineHeight: `${step.lineHeight}px`,
      // Tells the browser to paint its picker chrome for a dark ground.
      colorScheme: 'dark',
    },
  });
}
