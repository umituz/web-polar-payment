/**
 * Backward-compat entrypoint for the Firebase billing adapter.
 *
 * The implementation has been split into focused modules
 * (client, repositories, facade) under `firebase/`. This file re-exports the
 * public surface so existing consumers keep working.
 */

export {
  createFirebaseAdapter,
  type FirebaseAdapterConfig,
  type BillingLogger,
} from './firebase/create-firebase-adapter';

export { FirebaseBillingError } from '../errors/firebase-billing.error';
