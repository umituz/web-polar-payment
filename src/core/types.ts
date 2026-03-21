export type SubscriptionStatusValue =
  | 'active'
  | 'canceled'
  | 'revoked'
  | 'trialing'
  | 'past_due'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'none'; // unauthenticated / free plan / not yet synced

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

export interface OrderItem {
  id: string;
  createdAt: string;
  amount: number;
  currency: string;
  status: string;
  paid: boolean;
  productName: string;
  invoiceUrl?: string;
}

export interface CheckoutParams {
  productId: string;
  planKey?: string;
  billingCycle?: BillingCycle;
  successUrl?: string;
  /** Injected automatically by PolarProvider — do not pass manually */
  userId?: string;
}

export interface CheckoutResult {
  url: string;
  id: string;
}

export type CancellationReason =
  | 'too_expensive'
  | 'missing_features'
  | 'switched_service'
  | 'unused'
  | 'customer_service'
  | 'low_quality'
  | 'too_complex'
  | 'other';

export interface CancelResult {
  success: boolean;
  endsAt?: string;
}

export interface SyncResult {
  synced: boolean;
  plan?: string;
}
