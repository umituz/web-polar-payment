/**
 * Billing Constants
 * @description Standardized subscription states and plan names
 */

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
