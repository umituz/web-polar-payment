/**
 * `<PolarCheckoutButton>` — drop-in CTA for a single product.
 *
 * Renders a button that triggers a checkout for the supplied product.
 * Loading + error states are owned by the component so consumers only
 * supply the product and a label.
 *
 * ```tsx
 * <PolarCheckoutButton
 *   productId="prod_xxx"
 *   billingCycle="monthly"
 *   label="Upgrade to Pro"
 *   variant="primary"
 * />
 * ```
 */

import { useMemo } from 'react';
import { useCheckoutButton } from '../hooks/useCheckoutButton';
import type { CheckoutParams } from '../../domain/entities/checkout.entity';
import { CheckoutButtonVisual } from '../utils/checkout-button-visual';
import { InlineErrorVisual } from '../utils/inline-error-visual';

export type PolarCheckoutButtonVariant = 'primary' | 'secondary' | 'danger';

/** User-facing strings — override any subset for localization. */
export interface PolarCheckoutButtonLabels {
  /** Shown while the checkout session is being created. */
  loading?: string;
}

export interface PolarCheckoutButtonProps {
  productId: string;
  billingCycle?: CheckoutParams['billingCycle'];
  successUrl?: string;
  planKey?: string;
  label: string;
  variant?: PolarCheckoutButtonVariant;
  disabled?: boolean;
  onError?: (error: Error) => void;
  className?: string;
  labels?: PolarCheckoutButtonLabels;
}

const DEFAULT_LABELS: Required<PolarCheckoutButtonLabels> = Object.freeze({
  loading: 'Redirecting…',
});

export function PolarCheckoutButton({
  productId,
  billingCycle,
  successUrl,
  planKey,
  label,
  variant = 'primary',
  disabled = false,
  onError,
  className,
  labels,
}: PolarCheckoutButtonProps) {
  const { start, loading, error } = useCheckoutButton({
    productId,
    billingCycle,
    successUrl,
    planKey,
    onError,
  });

  const style = useMemo(
    () => CheckoutButtonVisual.resolve({ variant, disabled, loading }),
    [variant, disabled, loading],
  );

  const text = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labels }),
    [labels],
  );

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button
        type="button"
        style={style}
        className={className}
        onClick={() => void start()}
        disabled={disabled || loading}
        aria-busy={loading}
      >
        {loading ? text.loading : label}
      </button>
      {InlineErrorVisual.element(error?.message)}
    </span>
  );
}
