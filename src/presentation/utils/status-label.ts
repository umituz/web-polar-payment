/**
 * StatusLabel — user-facing display labels for subscription statuses.
 *
 * Centralizes the strings so the i18n layer can swap them later without
 * touching components.
 */

import type { SubscriptionStatusValue } from '../../domain/enums/subscription-status.enum';

export class StatusLabel {
  private static readonly MAP: Readonly<Record<SubscriptionStatusValue, string>> = Object.freeze({
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past due',
    incomplete: 'Incomplete',
    canceled: 'Canceled',
    revoked: 'Revoked',
    unpaid: 'Unpaid',
    incomplete_expired: 'Expired',
    none: 'Free',
  });

  static forStatus(
    status: SubscriptionStatusValue,
    overrides?: Partial<Record<SubscriptionStatusValue, string>>,
  ): string {
    return overrides?.[status] ?? StatusLabel.MAP[status] ?? 'Free';
  }
}
