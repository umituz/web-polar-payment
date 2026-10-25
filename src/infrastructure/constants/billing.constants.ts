/**
 * Billing constants — the Polar.sh API surface shared by every client.
 *
 * NOTE: the `SUBSCRIPTION_STATUS` constant now lives in
 * `domain/enums/subscription-status.enum.ts` (single source of truth). This
 * file keeps the legacy re-export for backward compatibility.
 */

export {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_STATUS_VALUES,
  isKnownSubscriptionStatus,
} from '../../domain/enums/subscription-status.enum';
export type { SubscriptionStatusValue } from '../../domain/enums/subscription-status.enum';

export const POLAR_API_BASE_URL = 'https://api.polar.sh/v1';
export const POLAR_API_MAX_PAGE_SIZE = 100;
