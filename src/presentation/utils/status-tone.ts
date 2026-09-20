/**
 * StatusTone — maps a subscription status to its visual tone.
 *
 * Single mapping table for the entire SDK. UI components consume
 * `getStatusTone` instead of branching on raw status values.
 */

import { TONE_PAIRS, type VisualTone, type VisualTonePair } from '../theme/visual-tokens';
import type { SubscriptionStatusValue } from '../../domain/enums/subscription-status.enum';

export class StatusTone {
  private static readonly MAP: Readonly<Record<SubscriptionStatusValue, VisualTone>> = Object.freeze({
    active: 'active',
    trialing: 'active',
    past_due: 'warning',
    incomplete: 'warning',
    canceled: 'danger',
    revoked: 'danger',
    unpaid: 'danger',
    incomplete_expired: 'danger',
    none: 'neutral',
  });

  static forStatus(status: SubscriptionStatusValue): VisualTone {
    return StatusTone.MAP[status] ?? 'neutral';
  }

  static pairFor(status: SubscriptionStatusValue): VisualTonePair {
    return TONE_PAIRS[StatusTone.forStatus(status)];
  }
}
