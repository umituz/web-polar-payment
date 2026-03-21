import type { SubscriptionStatusValue } from './types';

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active' as const,
  CANCELED: 'canceled' as const,
  REVOKED: 'revoked' as const,
  TRIALING: 'trialing' as const,
  PAST_DUE: 'past_due' as const,
  INCOMPLETE: 'incomplete' as const,
  INCOMPLETE_EXPIRED: 'incomplete_expired' as const,
  UNPAID: 'unpaid' as const,
  NONE: 'none' as const,
};

export const FREE_PLAN = 'free';

/**
 * Normalize a raw Polar status string to a known value.
 * Defaults to 'none' (not 'canceled') so unknown statuses don't
 * accidentally revoke a user's access.
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
    cancelled: 'canceled', // Polar uses both spellings
    revoked: 'revoked',
    none: 'none',
  };
  return map[raw?.toLowerCase()] ?? 'none';
}

/** Normalize billing interval ('month' → 'monthly', 'year' → 'yearly') */
export function normalizeBillingCycle(interval: string): 'monthly' | 'yearly' {
  if (interval === 'month' || interval === 'monthly') return 'monthly';
  if (interval === 'year' || interval === 'yearly') return 'yearly';
  return 'monthly';
}
