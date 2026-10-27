import type { BillingCycle } from '../enums/billing-cycle.enum';

export interface CheckoutParams {
  productId: string;
  planKey?: string;
  billingCycle?: BillingCycle;
  successUrl?: string;
  userId?: string;
  customerEmail?: string;
  seats?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface CheckoutResult {
  url: string;
  id: string;
}
