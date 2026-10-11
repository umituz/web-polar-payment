/**
 * Billing Portal — shared inline style fragments
 *
 * The portal is camp-agnostic: every visual property is set inline from
 * `VisualTokens` (no CSS classes, no utility framework, immune to host
 * preflight resets). These fragments are the common denominators so
 * component files stay free of repeated literal objects.
 */

import type { CSSProperties } from 'react';
import { VisualTokens } from '../theme/visual-tokens';

/** Screen-reader-only text (replaces utility-framework `sr-only`). */
export const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/** Base card surface used by every portal section. */
export const card: CSSProperties = {
  background: VisualTokens.color.surfacePrimary,
  border: `1px solid ${VisualTokens.color.borderSubtle}`,
  borderRadius: VisualTokens.radius.lg,
  padding: VisualTokens.spacing.section,
  boxSizing: 'border-box',
};

/** Card + pointer semantics for clickable cards (invoice rows, plan cards). */
export const cardInteractive: CSSProperties = {
  ...card,
  cursor: 'pointer',
};

/** Section heading inside a card. */
export const sectionTitle: CSSProperties = {
  fontSize: VisualTokens.fontSize.title,
  fontWeight: VisualTokens.fontWeight.strong,
  color: VisualTokens.color.textPrimary,
  margin: 0,
  marginBottom: VisualTokens.spacing.xl,
};

/** Secondary/muted copy. */
export const mutedText: CSSProperties = {
  color: VisualTokens.color.textMuted,
  fontSize: VisualTokens.fontSize.body,
};

/** Vertical stack (the utility-framework `space-y` replacement). */
export const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: VisualTokens.spacing.xl,
};

/** Horizontal row. */
export const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

/** Responsive card grid without media queries — container-driven. */
export const autoGrid = (minColumnWidth = 260): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`,
  gap: VisualTokens.spacing.section,
});

/** Inline alert box (destructive/warning confirmations). */
export const alertDanger: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: VisualTokens.spacing.md,
  padding: VisualTokens.spacing.lg,
  borderRadius: VisualTokens.radius.md,
  border: `1px solid ${VisualTokens.color.borderWarning}`,
  background: VisualTokens.color.surfaceDangerMuted,
  color: VisualTokens.color.brandDangerText,
  fontSize: VisualTokens.fontSize.body,
};
