/**
 * Subscription Entity
 * @description Types for subscription status and billing cycles
 */

export type SubscriptionStatusValue =
  | 'active'
  | 'canceled'
  | 'revoked'
  | 'trialing'
  | 'past_due'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'none';

export type BillingCycle = 'monthly' | 'yearly';

export interface SubscriptionStatus {
  plan: string;
  subscriptionId?: string;
  subscriptionStatus: SubscriptionStatusValue;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  billingCycle?: BillingCycle;
  polarCustomerId?: string;
  /** Token balance (for token-based projects like Aria) */
  tokens?: number;
}
