/**
 * Polar glue for the billing portal — the BillingApiClient binding and
 * the turnkey page composition over a `PolarAdapter`.
 */

export { createPolarPortalClient } from './create-polar-portal';
export type { PolarPortalClient, PolarPortalClientOptions } from './create-polar-portal';
export { PolarBillingPage } from './PolarBillingPage';
export type { PolarBillingPageProps } from './PolarBillingPage';
