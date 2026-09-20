/**
 * `@umituz/web-polar-payment/react` — React bindings.
 *
 * Provider, hooks, and UI components. Requires `react` (peer dependency,
 * >= 18). Also re-exports the full core surface so React consumers need a
 * single import.
 */

export * from './core';

/* ----- Components ----- */
export { PolarProvider } from './presentation/components/PolarProvider';
export type { PolarProviderProps } from './presentation/components/PolarProvider';
export { PolarCheckoutButton } from './presentation/components/PolarCheckoutButton';
export type {
  PolarCheckoutButtonProps,
  PolarCheckoutButtonVariant,
  PolarCheckoutButtonLabels,
} from './presentation/components/PolarCheckoutButton';
export { SubscriptionStatusBadge } from './presentation/components/SubscriptionStatusBadge';
export type {
  SubscriptionStatusBadgeProps,
  SubscriptionStatusBadgeLabels,
} from './presentation/components/SubscriptionStatusBadge';
export { PricingTable } from './presentation/components/PricingTable';
export type { PricingTableProps, PricingTableLabels } from './presentation/components/PricingTable';
export { BillingHistoryList } from './presentation/components/BillingHistoryList';
export type {
  BillingHistoryListProps,
  BillingHistoryListLabels,
} from './presentation/components/BillingHistoryList';
export { CustomerPortalLink } from './presentation/components/CustomerPortalLink';
export type {
  CustomerPortalLinkProps,
  CustomerPortalLinkLabels,
} from './presentation/components/CustomerPortalLink';
export { CancelSubscriptionButton } from './presentation/components/CancelSubscriptionButton';
export type {
  CancelSubscriptionButtonProps,
  CancelSubscriptionButtonLabels,
} from './presentation/components/CancelSubscriptionButton';

/* ----- Context / hooks ----- */
export { PolarContext, usePolarBilling } from './presentation/context/polar-context';
export type { PolarContextValue } from './presentation/context/polar-context';
export { useCheckoutButton } from './presentation/hooks/useCheckoutButton';
export type {
  UseCheckoutButtonOptions,
  UseCheckoutButtonResult,
} from './presentation/hooks/useCheckoutButton';
export { useCancelSubscription } from './presentation/hooks/useCancelSubscription';
export type {
  UseCancelSubscriptionOptions,
  UseCancelSubscriptionResult,
} from './presentation/hooks/useCancelSubscription';
export { usePolarProducts } from './presentation/hooks/usePolarProducts';
export type {
  UsePolarProductsOptions,
  UsePolarProductsResult,
} from './presentation/hooks/usePolarProducts';

/* ----- Navigation (injectable redirect strategy) ----- */
export {
  WindowNavigationStrategy,
  NoopNavigationStrategy,
} from './presentation/navigation/navigation.strategy';
export type { NavigationStrategy } from './presentation/navigation/navigation.strategy';

/* ----- Theming (for custom components that match the SDK's look) ----- */
export { VisualTokens, TONE_PAIRS } from './presentation/theme/visual-tokens';
export type { VisualTone, VisualTonePair } from './presentation/theme/visual-tokens';

/* ----- Reason catalog (for custom cancel flows) ----- */
export { CANCELLATION_REASON_CATALOG } from './presentation/utils/cancellation-reason-catalog';
export type { CancellationReasonOption } from './presentation/utils/cancellation-reason-catalog';
