import type { SubscriptionStatusValue, BillingCycle } from '../../domain/entities';

/**
 * Normalize a raw Polar status string to a known value.
 * @description Defaults to 'none' for unknown statuses or non-string input.
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

  if (typeof raw !== 'string') return 'none';
  return map[raw.toLowerCase()] ?? 'none';
}

/**
 * Normalize billing interval
 * @description Maps 'month'/'year' to 'monthly'/'yearly'. Defaults to 'monthly' for unknown values or non-string input.
 */
export function normalizeBillingCycle(interval: string): BillingCycle {
  if (typeof interval !== 'string') return 'monthly';
  const normalized = interval.toLowerCase();
  if (normalized === 'month' || normalized === 'monthly') return 'monthly';
  if (normalized === 'year' || normalized === 'yearly') return 'yearly';
  return 'monthly';
}
