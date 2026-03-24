/**
 * Billing Constants
 * @description Standardized subscription states and plan names
 */

// Object.freeze() prevents accidental mutations and enables V8 optimizations
export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'active' as const,
  CANCELED: 'canceled' as const,
  REVOKED: 'revoked' as const,
  TRIALING: 'trialing' as const,
  PAST_DUE: 'past_due' as const,
  INCOMPLETE: 'incomplete' as const,
  INCOMPLETE_EXPIRED: 'incomplete_expired' as const,
  UNPAID: 'unpaid' as const,
  NONE: 'none' as const,
}) as Readonly<{
  ACTIVE: 'active';
  CANCELED: 'canceled';
  REVOKED: 'revoked';
  TRIALING: 'trialing';
  PAST_DUE: 'past_due';
  INCOMPLETE: 'incomplete';
  INCOMPLETE_EXPIRED: 'incomplete_expired';
  UNPAID: 'unpaid';
  NONE: 'none';
}>;

export const FREE_PLAN = 'free';
