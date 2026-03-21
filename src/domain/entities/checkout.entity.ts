/**
 * Checkout Entity
 * @description Types for initiating and following process of checkouts
 */

export interface CheckoutParams {
  productId: string;
  planKey?: string;
  billingCycle?: 'monthly' | 'yearly';
  successUrl?: string;
  /** Injected automatically by PolarProvider — do not pass manually */
  userId?: string;
}

export interface CheckoutResult {
  url: string;
  id: string;
}
