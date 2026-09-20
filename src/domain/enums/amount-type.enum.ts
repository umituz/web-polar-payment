/**
 * Polar price amount type enum.
 *
 * Polar.sh returns `amount_type` as an open string. We narrow it to the
 * documented set for type safety while still being explicit about the unknown
 * case via a fallback.
 */

export const POLAR_AMOUNT_TYPE = Object.freeze({
  FIXED: 'fixed',
  CUSTOM: 'custom',
  FREE: 'free',
  SEAT_BASED: 'seat_based',
  METERED_UNIT: 'metered_unit',
} as const);

export type PolarAmountType = (typeof POLAR_AMOUNT_TYPE)[keyof typeof POLAR_AMOUNT_TYPE];
