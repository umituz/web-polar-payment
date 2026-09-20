/**
 * Normalization utilities.
 *
 * Convert raw vendor strings (Polar statuses, intervals) into the narrow
 * domain enums. The previous `STATUS_MAP` was a 1:1 identity map; we now use
 * a `Set` for membership and fall back to a sane default.
 */

import {
  SUBSCRIPTION_STATUS,
  isKnownSubscriptionStatus,
  type SubscriptionStatusValue,
} from '../../domain/enums/subscription-status.enum';
import {
  BILLING_CYCLE,
  parseBillingCycle,
  type BillingCycle,
} from '../../domain/enums/billing-cycle.enum';

export function normalizeStatus(raw: string | null | undefined): SubscriptionStatusValue {
  if (typeof raw !== 'string') return SUBSCRIPTION_STATUS.NONE;
  return isKnownSubscriptionStatus(raw) ? raw : SUBSCRIPTION_STATUS.NONE;
}

export function normalizeBillingCycle(
  interval: string | null | undefined,
): BillingCycle {
  return parseBillingCycle(interval) ?? BILLING_CYCLE.MONTHLY;
}
