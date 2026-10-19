/**
 * Billing Portal — public surface of `@umituz/web-polar-payment/portal`
 *
 * A self-hosted billing UI (plans, subscription, payment methods,
 * invoices, usage) that renders whatever a `BillingApiClient` returns.
 * Moved here from `@umituz/web-dashboard` so billing UI lives with the
 * billing SDK — dashboards stay app skeletons.
 */

// Components
export {
  BillingPortal,
  BillingLayout,
  BillingPage,
  PlanComparison,
  PaymentMethodsList,
  InvoiceCard,
  UsageCard,
  PortalButton,
  PortalSpinner,
  RADIO_GROUP_NAME,
} from './components';
export type {
  PortalButtonProps,
  PortalButtonVariant,
  PortalButtonSize,
} from './components';

// Hooks (data seam)
export { useBilling, createStubBillingApiClient } from './hooks';
export type { BillingApiClient, UseBillingOptions, UseBillingReturn } from './hooks';

// Labels (i18n replacement)
export {
  DEFAULT_BILLING_LABELS,
  BillingLabelsProvider,
  useBillingLabels,
  mergeLabels,
  formatLabel,
} from './labels';
export type { BillingLabels, BillingLabelsOverrides } from './labels';

// Utils
export {
  formatNumber,
  formatPrice,
  calculateDiscount,
  calculateProratedAmount,
  getPlanPrice,
  calculateUsagePercentage,
  isNearLimit,
  getStatusTone,
  getStatusLabel,
  getInvoiceStatusTone,
  getInvoiceStatusLabel,
  formatCardNumber,
  formatExpiry,
  getDaysRemaining,
  isTrialExpiringSoon,
  getNextBillingDate,
  groupInvoicesByStatus,
  calculateInvoiceTotal,
  sortInvoicesByDate,
  formatFeature,
  isPopularPlan,
  getTrialDaysText,
  transformPolarProductToPlan,
  transformPolarProducts,
} from './utils';

// Types
export type {
  BillingCycle,
  SubscriptionStatus,
  PlanType,
  Currency,
  PlanTier,
  Subscription,
  PaymentMethodType,
  PaymentMethod,
  PaymentMethodInput,
  InvoiceStatus,
  InvoiceItem,
  Invoice,
  UsageMetric,
  BillingSummary,
  PlanComparisonProps,
  PaymentMethodsListProps,
  InvoiceCardProps,
  UsageCardProps,
  BillingPortalProps,
  BillingTabId,
  BillingLayoutProps,
  BillingConfig,
  BillingPageProps,
} from './types';

// Constants
export {
  SUBSCRIPTION_STATUS,
  INVOICE_STATUS,
  CURRENCY,
  PLAN_TYPE,
  DEFAULT_BILLING_CONFIG,
} from './constants';
export { BILLING_CYCLE } from './types';

// Polar glue — adapter binding + turnkey page over a PolarAdapter
export {
  createPolarPortalClient,
  PolarBillingPage,
} from './polar';
export type {
  PolarPortalClient,
  PolarPortalClientOptions,
  PolarBillingPageProps,
} from './polar';
