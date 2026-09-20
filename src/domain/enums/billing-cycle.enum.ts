/**
 * Billing cycle enum.
 *
 * Polar.sh exposes `month` / `year` (and legacy `monthly` / `yearly`).
 * The enum + a normalizer keep the public contract strictly `monthly | yearly`.
 *
 * The type guard only accepts canonical values, so a `BillingCycle`-typed
 * value can never be `month` / `year` at runtime. Alias inputs go through
 * `parseBillingCycle`, which maps them to the canonical form.
 */

export const BILLING_CYCLE = Object.freeze({
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const);

export const BILLING_CYCLE_VALUES = Object.freeze([
  BILLING_CYCLE.MONTHLY,
  BILLING_CYCLE.YEARLY,
] as const);

export type BillingCycle = (typeof BILLING_CYCLE_VALUES)[number];

const CANONICAL_BILLING_CYCLES: ReadonlySet<string> = new Set(BILLING_CYCLE_VALUES);

/** Polar/legacy aliases mapped to the canonical domain value. */
const BILLING_CYCLE_ALIASES: ReadonlyMap<string, BillingCycle> = new Map([
  [BILLING_CYCLE.MONTHLY, BILLING_CYCLE.MONTHLY],
  ['month', BILLING_CYCLE.MONTHLY],
  [BILLING_CYCLE.YEARLY, BILLING_CYCLE.YEARLY],
  ['year', BILLING_CYCLE.YEARLY],
]);

export function isKnownBillingCycle(value: unknown): value is BillingCycle {
  return typeof value === 'string' && CANONICAL_BILLING_CYCLES.has(value.toLowerCase());
}

/**
 * Parse any known billing-cycle spelling (including Polar's `month` / `year`)
 * into the canonical `BillingCycle`. Returns `null` for unknown input so
 * callers choose their own fallback.
 */
export function parseBillingCycle(value: unknown): BillingCycle | null {
  if (typeof value !== 'string') return null;
  return BILLING_CYCLE_ALIASES.get(value.toLowerCase()) ?? null;
}
