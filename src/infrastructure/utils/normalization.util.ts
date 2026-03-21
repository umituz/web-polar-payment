import type { SubscriptionStatusValue, BillingCycle } from '../../domain/entities';

/**
 * Normalize a raw Polar status string to a known value.
 * @description Defaults to 'none' for unknown statuses.
 */
export function normalizeStatus(raw: string): SubscriptionStatusValue {
  const map: Record<string, SubscriptionStatusValue> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
    unpaid: 'unpaid',
    canceled: 'canceled',
    cancelled: 'canceled',
    revoked: 'revoked',
    none: 'none',
  };
  return map[raw?.toLowerCase()] ?? 'none';
}

/** 
 * Normalize billing interval
 * @description Maps 'month'/'year' to 'monthly'/'yearly'
 */
export function normalizeBillingCycle(interval: string): BillingCycle {
  if (interval === 'month' || interval === 'monthly') return 'monthly';
  if (interval === 'year' || interval === 'yearly') return 'yearly';
  return 'monthly';
}
