import type { SubscriptionStatusValue } from '../enums/subscription-status.enum';
import type { BillingCycle } from '../enums/billing-cycle.enum';

/**
 * Subscription status snapshot for a user.
 *
 * Represents the canonical, normalized state of a user's subscription as the
 * application should consume it. Maps from raw Firestore/Polar data via
 * `SubscriptionRepository`.
 */
export interface SubscriptionStatus {
  plan: string;
  subscriptionId?: string;
  subscriptionStatus: SubscriptionStatusValue;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  billingCycle?: BillingCycle;
  polarCustomerId?: string;
}

/**
 * Free (no subscription) snapshot — used as a neutral default and as a
 * recoverable fallback when status loading fails.
 */
export const FREE_SUBSCRIPTION_STATUS: SubscriptionStatus = Object.freeze({
  plan: 'free',
  subscriptionStatus: 'none',
}) as SubscriptionStatus;

export function isActiveSubscription(status: SubscriptionStatus): boolean {
  return (
    status.subscriptionStatus === 'active' ||
    status.subscriptionStatus === 'trialing'
  );
}
