/**
 * VisualTokens — centralized design system.
 *
 * Single source of truth for spacing, typography, color, and shape used
 * by every component in the SDK. No raw hex / px / pt values are
 * permitted in component files; consume `VisualTokens` instead.
 *
 * Mirrors the global iOS theme rule: spacing tokens, semantic colors,
 * and a typography scale.
 */

export const VisualTokens = Object.freeze({
  spacing: Object.freeze({
    none: 0,
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    section: 24,
    page: 32,
  }),

  radius: Object.freeze({
    sm: 6,
    md: 8,
    lg: 12,
    pill: 999,
  }),

  fontSize: Object.freeze({
    caption: 12,
    body: 14,
    title: 18,
    display: 24,
  }),

  fontWeight: Object.freeze({
    regular: 400,
    medium: 500,
    strong: 600,
  }),

  lineHeight: Object.freeze({
    tight: 1.25,
    normal: 1.5,
  }),

  opacity: Object.freeze({
    muted: 0.7,
    disabled: 0.6,
    hover: 0.85,
  }),

  color: Object.freeze({
    textPrimary: '#111827',
    textMuted: '#6b7280',
    textOnPrimary: '#ffffff',
    textInverse: '#ffffff',
    textError: '#b91c1c',
    textOnError: '#ffffff',

    surfacePrimary: '#ffffff',
    surfaceMuted: '#f9fafb',
    surfaceSubtle: '#f3f4f6',
    surfaceWarning: '#fef3c7',
    surfaceDanger: '#fee2e2',
    surfaceDangerMuted: '#fef2f2',

    borderSubtle: '#e5e7eb',
    borderStrong: '#d1d5db',
    borderWarning: '#fecaca',

    brandPrimary: '#2563eb',
    brandPrimaryHover: '#1d4ed8',
    brandDanger: '#dc2626',
    brandDangerHover: '#b91c1c',
    brandDangerText: '#991b1b',

    badgeNeutralBg: '#e5e7eb',
    badgeNeutralFg: '#111827',
    badgeActiveBg: '#dcfce7',
    badgeActiveFg: '#166534',
    badgeWarningBg: '#fef3c7',
    badgeWarningFg: '#92400e',
    badgeDangerBg: '#fee2e2',
    badgeDangerFg: '#991b1b',
  }),

  transition: Object.freeze({
    instant: '120ms ease',
  }),

  layout: Object.freeze({
    cardMinWidth: 260,
    benefitListMax: 5,
  }),
} as const);

export type VisualTone = 'neutral' | 'active' | 'warning' | 'danger';

export interface VisualTonePair {
  readonly bg: string;
  readonly fg: string;
}

export const TONE_PAIRS: Readonly<Record<VisualTone, VisualTonePair>> = Object.freeze({
  neutral: { bg: VisualTokens.color.badgeNeutralBg, fg: VisualTokens.color.badgeNeutralFg },
  active: { bg: VisualTokens.color.badgeActiveBg, fg: VisualTokens.color.badgeActiveFg },
  warning: { bg: VisualTokens.color.badgeWarningBg, fg: VisualTokens.color.badgeWarningFg },
  danger: { bg: VisualTokens.color.badgeDangerBg, fg: VisualTokens.color.badgeDangerFg },
});
