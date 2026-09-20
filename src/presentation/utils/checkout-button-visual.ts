/**
 * CheckoutButtonVisual — computes the inline style for a
 * `<PolarCheckoutButton>` based on the chosen variant and disabled /
 * loading state.
 *
 * Pulled out of the component so the same styling can be reused for
 * custom CTAs (e.g. hero upgrade buttons) without forking the
 * component.
 */

import { VisualTokens } from '../theme/visual-tokens';
import type { PolarCheckoutButtonVariant } from '../components/PolarCheckoutButton';

export interface CheckoutButtonVisualInput {
  variant: PolarCheckoutButtonVariant;
  disabled: boolean;
  loading: boolean;
}

interface ButtonColorScheme {
  backgroundColor: string;
  color: string;
  border: string;
}

const VARIANT_COLOR_SCHEMES: Readonly<Record<PolarCheckoutButtonVariant, ButtonColorScheme>> = Object.freeze({
  primary: Object.freeze({
    backgroundColor: VisualTokens.color.brandPrimary,
    color: VisualTokens.color.textOnPrimary,
    border: `1px solid ${VisualTokens.color.brandPrimary}`,
  }),
  secondary: Object.freeze({
    backgroundColor: VisualTokens.color.surfacePrimary,
    color: VisualTokens.color.textPrimary,
    border: `1px solid ${VisualTokens.color.borderStrong}`,
  }),
  danger: Object.freeze({
    backgroundColor: VisualTokens.color.brandDanger,
    color: VisualTokens.color.textOnPrimary,
    border: `1px solid ${VisualTokens.color.brandDanger}`,
  }),
});

export class CheckoutButtonVisual {
  static resolve({ variant, disabled, loading }: CheckoutButtonVisualInput): React.CSSProperties {
    const scheme = VARIANT_COLOR_SCHEMES[variant];
    const isInactive = disabled || loading;
    return {
      ...scheme,
      padding: `${VisualTokens.spacing.lg}px ${VisualTokens.spacing.xl}px`,
      fontSize: VisualTokens.fontSize.body,
      fontWeight: VisualTokens.fontWeight.strong,
      borderRadius: VisualTokens.radius.md,
      cursor: isInactive ? 'not-allowed' : 'pointer',
      opacity: isInactive ? VisualTokens.opacity.disabled : 1,
      transition: VisualTokens.transition.instant,
    };
  }
}
