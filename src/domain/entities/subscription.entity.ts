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
  tokens?: number;
}
