import type { BillingCycle } from '../enums/billing-cycle.enum';

export interface CheckoutParams {
  productId: string;
  planKey?: string;
  billingCycle?: BillingCycle;
  successUrl?: string;
  userId?: string;
}

export interface CheckoutResult {
  url: string;
  id: string;
}
