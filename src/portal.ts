/**
 * `@umituz/web-polar-payment/portal` entry point.
 *
 * The hosted billing portal UI (BillingPortal, BillingLayout, BillingPage,
 * PlanComparison, payment methods, invoices, usage) plus the
 * `BillingApiClient` data seam. Opt-in via the `./portal` subpath —
 * hosts that only want the SDK core never pull the React UI.
 */

export * from './presentation/portal';
