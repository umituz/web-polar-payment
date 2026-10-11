/**
 * Billing Portal Constants
 *
 * Centralized constants for the portal view model. `BillingCycle` is NOT
 * redefined here — the domain enum is the single source of truth.
 */

/**
 * Subscription status constants
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
  INCOMPLETE: 'incomplete',
  REVOKED: 'revoked',
} as const;

/**
 * Invoice status constants
 */
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  PAID: 'paid',
  VOID: 'void',
  UNCOLLECTIBLE: 'uncollectible',
  REFUNDED: 'refunded',
} as const;

/**
 * Currency constants
 */
export const CURRENCY = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  TRY: 'TRY',
  JPY: 'JPY',
} as const;

export type Currency = typeof CURRENCY[keyof typeof CURRENCY];

/**
 * Plan type constants
 */
export const PLAN_TYPE = {
  STANDARD: 'standard',
  PRO: 'pro',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise',
} as const;

/**
 * Default billing configuration used as a base when the consumer
 * does not provide all required fields. Brand name is intentionally
 * NOT defaulted here — the consumer must provide it explicitly.
 */
export const DEFAULT_BILLING_CONFIG = {
  enableYearlyDiscount: true,
  yearlyDiscount: 20,
  currencies: [CURRENCY.USD, CURRENCY.EUR, CURRENCY.GBP] as Currency[],
  defaultCurrency: CURRENCY.USD,
  taxRate: 0,
} as const;
