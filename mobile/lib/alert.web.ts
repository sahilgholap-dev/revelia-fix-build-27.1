import type { AlertButton } from 'react-native';
import * as t from '@/theme';

export type { AlertButton };

// Web fork of lib/alert.ts — a real modal, because react-native-web's Alert is
// `static alert() {}` and does nothing at all.
//
// WHY IMPERATIVE DOM RATHER THAN A REACT COMPONENT: the call sites are
// callbacks, catch blocks and store actions, not render trees. A React modal
// would need a host mounted at the root plus a global store to reach it from
// non-component code. Building the element directly is smaller, has no ordering
// requirements, and works from anywhere — including a module with no React
// context at all.
//
// window.confirm() was rejected: it caps out at two buttons and the app's
// dialogs have three (View / Update / Cancel), it cannot express a destructive
// action, and it is not styleable.

const Z_INDEX = 100000;

let openDialog: (() => void) | null = null;

function styleEl(el: HTMLElement, styles: Record<string, string>) {
  for (const [k, v] of Object.entries(styles)) el.style.setProperty(k, v);
}

/** Matches RN's precedence: an explicit `cancel` button, else the last one. */
function cancelButtonOf(buttons: AlertButton[]): AlertButton | undefined {
  return buttons.find((b) => b.style === 'cancel') ?? buttons[buttons.length - 1];
}

export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  if (typeof document === 'undefined') return;

  // One dialog at a time, mirroring the native behaviour of a modal alert.
  openDialog?.();

  const list: AlertButton[] =
    buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' }];

  const backdrop = document.createElement('div');
  styleEl(backdrop, {
    position: 'fixed',
    inset: '0',
    // The veil role at 60%, taken through alpha(). Naming that token WITHOUT
    // alpha() would paint an opaque ground instead of a veil, and a literal
    // rgba() is a raw value the gate blocks — alpha() is the one legal form.
    background: t.alpha(t.color.scrim, 60),
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    padding: '24px',
    'z-index': String(Z_INDEX),
  });

  const card = document.createElement('div');
  card.setAttribute('role', 'alertdialog');
  card.setAttribute('aria-modal', 'true');
  styleEl(card, {
    background: t.color['surface-overlay'],
    border: `1px solid ${t.color['border-subtle']}`,
    'border-radius': `${t.radius.lg}px`,
    padding: `${t.space[6]}px`,
    width: '100%',
    'max-width': '340px',
    'box-shadow': `0 12px 48px ${t.alpha(t.color.scrim, 55)}`,
    'font-family': t.family.body,
  });

  const titleStep = t.txt('text-lg').style;
  const h = document.createElement('div');
  h.textContent = title;
  h.id = 'revelia-alert-title';
  card.setAttribute('aria-labelledby', h.id);
  styleEl(h, {
    color: t.color.fg,
    'font-family': String(titleStep.fontFamily),
    'font-size': `${titleStep.fontSize}px`,
    'line-height': `${titleStep.lineHeight}px`,
    'margin-bottom': message ? `${t.space[2]}px` : `${t.space[5]}px`,
  });
  card.appendChild(h);

  if (message) {
    const bodyStep = t.txt('text-sm').style;
    const m = document.createElement('div');
    m.textContent = message;
    styleEl(m, {
      color: t.color['fg-secondary'],
      'font-family': String(bodyStep.fontFamily),
      'font-size': `${bodyStep.fontSize}px`,
      'line-height': `${bodyStep.lineHeight}px`,
      'margin-bottom': `${t.space[5]}px`,
    });
    card.appendChild(m);
  }

  const row = document.createElement('div');
  styleEl(row, {
    display: 'flex',
    'flex-direction': 'column',
    gap: `${t.space[2]}px`,
  });

  let closed = false;
  const close = (then?: () => void) => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    openDialog = null;
    then?.();
  };

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      const cancel = cancelButtonOf(list);
      close(() => cancel?.onPress?.());
    }
  }

  const labelStep = t.txt('text-base').style;
  list.forEach((button) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = button.text ?? 'OK';

    const destructive = button.style === 'destructive';
    const cancel = button.style === 'cancel';
    styleEl(el, {
      // A cancel reads as a quiet control; everything else takes the accent
      // fill, and a destructive action takes the danger role.
      background: cancel ? 'transparent' : destructive ? t.color.danger : t.color.accent,
      color: cancel ? t.color['fg-secondary'] : t.color['on-accent'],
      border: cancel ? `1px solid ${t.color['border-control']}` : 'none',
      'border-radius': `${t.radius.md}px`,
      // The primitive's own minimum, so a dialog button is as tappable as any
      // other control in the app.
      'min-height': `${t.a11y.tapMin}px`,
      padding: `0 ${t.space[4]}px`,
      'font-family': String(labelStep.fontFamily),
      'font-size': `${labelStep.fontSize}px`,
      cursor: 'pointer',
      width: '100%',
    });
    el.addEventListener('click', () => close(() => button.onPress?.()));
    row.appendChild(el);
  });

  card.appendChild(row);
  backdrop.appendChild(card);

  // Tapping the backdrop is a dismissal, which is what the native sheet does.
  backdrop.addEventListener('click', (event) => {
    if (event.target !== backdrop) return;
    const cancel = cancelButtonOf(list);
    close(() => cancel?.onPress?.());
  });

  document.addEventListener('keydown', onKey, true);
  document.body.appendChild(backdrop);
  // A later showAlert STOMPS this dialog (see the call above): closing with no
  // handler would strand any promise a caller built around this dialog's
  // buttons settling. Only an EXPLICIT `cancel` style runs here — never the
  // Escape/backdrop fallback to the last button — because a stomp is not a
  // user decision and must not fire a destructive action nobody chose.
  openDialog = () => close(() => list.find((b) => b.style === 'cancel')?.onPress?.());

  // Focus the primary action so the dialog is reachable by keyboard.
  (row.firstElementChild as HTMLButtonElement | null)?.focus();
}
