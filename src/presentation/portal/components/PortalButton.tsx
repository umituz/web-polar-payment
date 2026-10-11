/**
 * PortalButton
 *
 * Local button primitive for the billing portal — styled entirely inline
 * from VisualTokens so the portal works inside any host (vanilla CSS,
 * Tailwind, …) without importing a design-system package.
 */

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { VisualTokens } from '../../theme/visual-tokens';

export type PortalButtonVariant = 'default' | 'outline' | 'destructive' | 'ghost';
export type PortalButtonSize = 'sm' | 'md';

export interface PortalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PortalButtonVariant;
  size?: PortalButtonSize;
  /** Stretch to the full width of the container. */
  fullWidth?: boolean;
  /** Pill-shaped ends (used by plan-card CTAs). */
  pill?: boolean;
  /** Render a leading icon inside the button. */
  icon?: ReactNode;
  children?: ReactNode;
}

const VARIANT_STYLES: Record<PortalButtonVariant, CSSProperties> = {
  default: {
    background: VisualTokens.color.brandPrimary,
    color: VisualTokens.color.textOnPrimary,
    border: '1px solid transparent',
  },
  outline: {
    background: 'transparent',
    color: VisualTokens.color.textPrimary,
    border: `1px solid ${VisualTokens.color.borderStrong}`,
  },
  destructive: {
    background: VisualTokens.color.brandDanger,
    color: VisualTokens.color.textOnError,
    border: '1px solid transparent',
  },
  ghost: {
    background: 'transparent',
    color: VisualTokens.color.textMuted,
    border: '1px solid transparent',
  },
};

const SIZE_STYLES: Record<PortalButtonSize, CSSProperties> = {
  sm: {
    padding: `${VisualTokens.spacing.xs}px ${VisualTokens.spacing.lg}px`,
    fontSize: VisualTokens.fontSize.caption,
  },
  md: {
    padding: `${VisualTokens.spacing.md}px ${VisualTokens.spacing.xxl}px`,
    fontSize: VisualTokens.fontSize.body,
  },
};

export const PortalButton = ({
  variant = 'default',
  size = 'md',
  fullWidth = false,
  pill = false,
  icon,
  children,
  disabled,
  style,
  type = 'button',
  ...rest
}: PortalButtonProps) => {
  return (
    <button
      type={type}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: VisualTokens.spacing.sm,
        borderRadius: pill ? VisualTokens.radius.pill : VisualTokens.radius.md,
        fontWeight: VisualTokens.fontWeight.medium,
        lineHeight: VisualTokens.lineHeight.normal,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? VisualTokens.opacity.disabled : 1,
        width: fullWidth ? '100%' : undefined,
        boxSizing: 'border-box',
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
};
