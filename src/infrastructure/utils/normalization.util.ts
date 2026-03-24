import type { SubscriptionStatusValue, BillingCycle } from '../../domain/entities';
import { SUBSCRIPTION_STATUS } from '../constants/billing.constants';

const STATUS_MAP: Readonly<Record<string, SubscriptionStatusValue>> = Object.freeze({
  [SUBSCRIPTION_STATUS.ACTIVE]: SUBSCRIPTION_STATUS.ACTIVE,
  [SUBSCRIPTION_STATUS.CANCELED]: SUBSCRIPTION_STATUS.CANCELED,
  [SUBSCRIPTION_STATUS.REVOKED]: SUBSCRIPTION_STATUS.REVOKED,
  [SUBSCRIPTION_STATUS.TRIALING]: SUBSCRIPTION_STATUS.TRIALING,
  [SUBSCRIPTION_STATUS.PAST_DUE]: SUBSCRIPTION_STATUS.PAST_DUE,
  [SUBSCRIPTION_STATUS.INCOMPLETE]: SUBSCRIPTION_STATUS.INCOMPLETE,
  [SUBSCRIPTION_STATUS.INCOMPLETE_EXPIRED]: SUBSCRIPTION_STATUS.INCOMPLETE_EXPIRED,
  [SUBSCRIPTION_STATUS.UNPAID]: SUBSCRIPTION_STATUS.UNPAID,
  [SUBSCRIPTION_STATUS.NONE]: SUBSCRIPTION_STATUS.NONE,
});

export function normalizeStatus(raw: string): SubscriptionStatusValue {
  if (raw == null || typeof raw !== 'string') return 'none';
  return STATUS_MAP[raw.toLowerCase()] ?? 'none';
}

export function normalizeBillingCycle(interval: string): BillingCycle {
  if (typeof interval !== 'string') return 'monthly';
  const normalized = interval.toLowerCase();
  if (normalized === 'month' || normalized === 'monthly') return 'monthly';
  if (normalized === 'year' || normalized === 'yearly') return 'yearly';
  return 'monthly';
}
