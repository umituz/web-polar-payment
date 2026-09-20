/**
 * `@umituz/web-polar-payment/firebase` — Firebase adapter for the
 * `PolarAdapter` contract.
 *
 * Requires the host app to provide `firebase` (optional peer dependency):
 * the modular SDK instances are passed in via `createFirebaseAdapter` and
 * loaded lazily — nothing Firebase-related is evaluated at import time.
 */

export { createFirebaseAdapter } from './infrastructure/services/firebase/create-firebase-adapter';
export type {
  FirebaseAdapterConfig,
  BillingLogger,
} from './infrastructure/services/firebase/create-firebase-adapter';

export {
  FirebaseBillingError,
  isFirebaseBillingError,
} from './infrastructure/errors/firebase-billing.error';

export { BILLING_ERROR_CODE } from './domain/enums/error-code.enum';
export type { BillingErrorCode } from './domain/enums/error-code.enum';
