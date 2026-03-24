export interface CheckoutParams {
  productId: string;
  planKey?: string;
  billingCycle?: 'monthly' | 'yearly';
  successUrl?: string;
  userId?: string;
}

export interface CheckoutResult {
  url: string;
  id: string;
}
