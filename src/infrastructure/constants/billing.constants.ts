/**
 * Billing constants — default collection/field names used by the Firebase
 * adapter. Centralized so consuming apps can override them in one place.
 *
 * NOTE: the `SUBSCRIPTION_STATUS` constant now lives in
 * `domain/enums/subscription-status.enum.ts` (single source of truth). This
 * file keeps the legacy re-export for backward compatibility.
 */

export {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_STATUS_VALUES,
  isKnownSubscriptionStatus,
} from '../../domain/enums/subscription-status.enum';
export type { SubscriptionStatusValue } from '../../domain/enums/subscription-status.enum';

export const DEFAULT_FIRESTORE_PATHS = Object.freeze({
  USERS_COLLECTION: 'users',
  PLAN_FIELD: 'plan',
  BILLING_CYCLE_FIELD: 'billingCycle',
  SUBSCRIPTION_ID_FIELD: 'subscriptionId',
  SUBSCRIPTION_STATUS_FIELD: 'subscriptionStatus',
  POLAR_CUSTOMER_ID_FIELD: 'polarCustomerId',
  CANCEL_AT_PERIOD_END_FIELD: 'cancelAtPeriodEnd',
  CURRENT_PERIOD_END_FIELD: 'currentPeriodEnd',
} as const);

export const DEFAULT_CALLABLE_NAMES = Object.freeze({
  CREATE_CHECKOUT: 'createCheckoutSession',
  SYNC_SUBSCRIPTION: 'syncSubscription',
  GET_BILLING_HISTORY: 'getBillingHistory',
  CANCEL_SUBSCRIPTION: 'cancelSubscription',
  GET_PORTAL_URL: 'getCustomerPortalUrl',
} as const);

export const POLAR_API_BASE_URL = 'https://api.polar.sh/v1';
export const POLAR_API_MAX_PAGE_SIZE = 100;
