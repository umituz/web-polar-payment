/**
 * PaginationClamp — clamps a caller-supplied page size to Polar.sh's
 * hard limits.
 *
 * Polar rejects `limit` values outside `[1, 100]`. Centralizing the
 * clamp means future changes (e.g. raising the cap) are one-line edits.
 */

import { POLAR_API_MAX_PAGE_SIZE } from '../constants/billing.constants';

export const MIN_PAGE_SIZE = 1;

export class PaginationClamp {
  static pageSize(raw: number | undefined, max: number = POLAR_API_MAX_PAGE_SIZE): number {
    if (raw === undefined) return max;
    return Math.min(Math.max(MIN_PAGE_SIZE, raw), max);
  }
}
