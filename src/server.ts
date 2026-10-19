/**
 * `@umituz/web-polar-payment/server` entry point.
 *
 * Server-side Polar.sh operations: checkout sessions, the customer portal,
 * subscription management and webhook signature verification. Runs on any
 * runtime with `fetch` (Node >= 18, Cloudflare Workers, Deno) and must be
 * kept on the server — the OAT token grants full organization access.
 */

export {
  PolarBillingClient,
  POLAR_SANDBOX_BASE_URL,
} from './infrastructure/services/polar-billing.client';
export type {
  PolarBillingConfig,
  CheckoutSessionParams,
  CheckoutSession,
  PolarSubscriptionRecord,
  PortalSession,
} from './infrastructure/services/polar-billing.client';

export {
  verifyPolarWebhook,
} from './infrastructure/webhook/verify-webhook';
export type {
  WebhookHeadersLike,
  VerifyWebhookOptions,
} from './infrastructure/webhook/verify-webhook';

export { PolarApiError, isPolarApiError } from './infrastructure/services/polar-product.repository';
export { POLAR_API_BASE_URL } from './infrastructure/constants/billing.constants';
