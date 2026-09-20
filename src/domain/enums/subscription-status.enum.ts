/**
 * Subscription status enum.
 *
 * Single source of truth for the Polar.sh subscription status contract.
 * Derived types (`SubscriptionStatusValue`, `SubscriptionStatusMap`) come from
 * this enum to prevent drift between values, runtime objects, and unions.
 */

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  REVOKED: 'revoked',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
  UNPAID: 'unpaid',
  NONE: 'none',
} as const;

export const SUBSCRIPTION_STATUS_VALUES = Object.freeze([
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.CANCELED,
  SUBSCRIPTION_STATUS.REVOKED,
  SUBSCRIPTION_STATUS.TRIALING,
  SUBSCRIPTION_STATUS.PAST_DUE,
  SUBSCRIPTION_STATUS.INCOMPLETE,
  SUBSCRIPTION_STATUS.INCOMPLETE_EXPIRED,
  SUBSCRIPTION_STATUS.UNPAID,
  SUBSCRIPTION_STATUS.NONE,
] as const);

export type SubscriptionStatusValue = (typeof SUBSCRIPTION_STATUS_VALUES)[number];

const SUBSCRIPTION_STATUS_SET: ReadonlySet<string> = new Set(SUBSCRIPTION_STATUS_VALUES);

export function isKnownSubscriptionStatus(value: unknown): value is SubscriptionStatusValue {
  return typeof value === 'string' && SUBSCRIPTION_STATUS_SET.has(value.toLowerCase());
}
