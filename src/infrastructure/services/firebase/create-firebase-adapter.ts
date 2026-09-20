/**
 * createFirebaseAdapter — Factory + Builder patterns.
 *
 * Public entrypoint for the Firebase implementation. Resolves all the
 * callables + repository dependencies and wires them into the
 * `FirebaseBillingFacade`. Callers receive a ready-to-use `PolarAdapter`.
 */

import type { PolarAdapter } from '../../../domain/interfaces';
import {
  DEFAULT_CALLABLE_NAMES,
  DEFAULT_FIRESTORE_PATHS,
} from '../../constants/billing.constants';
import type { FirebaseBillingError } from '../../errors/firebase-billing.error';
import { CallableClient } from './callable-client';
import { FirebaseBillingFacade } from './firebase-billing.facade';
import { BillingRepository } from './billing.repository';
import { CancellationRepository } from './cancellation.repository';
import { CheckoutRepository } from './checkout.repository';
import { PortalRepository } from './portal.repository';
import { SubscriptionRepository } from './subscription.repository';
import { SyncRepository } from './sync.repository';

/**
 * Receives non-critical failures (e.g. billing-history load errors) that the
 * adapter recovers from internally. Swap it to route failures into your own
 * telemetry instead of the default `console.error`.
 */
export type BillingLogger = (error: FirebaseBillingError) => void;

export interface FirebaseAdapterConfig {
  functions: unknown;
  firestore: unknown;
  /**
   * Override the Firebase Callable function names. Values are free-form
   * strings; keys stay constrained to the known callable slots.
   */
  callables?: Partial<Record<keyof typeof DEFAULT_CALLABLE_NAMES, string>>;
  /**
   * Override the Firestore field/collection names. Values are free-form
   * strings; keys stay constrained to the known field slots.
   */
  firestorePaths?: Partial<Record<keyof typeof DEFAULT_FIRESTORE_PATHS, string>>;
  /** Overrides how recovered (non-throwing) failures are reported. */
  logger?: BillingLogger;
}

export function createFirebaseAdapter(config: FirebaseAdapterConfig): PolarAdapter {
  const callables = { ...DEFAULT_CALLABLE_NAMES, ...(config.callables ?? {}) };
  const paths = { ...DEFAULT_FIRESTORE_PATHS, ...(config.firestorePaths ?? {}) };

  const callableClient = new CallableClient(config.functions);

  const subscription = new SubscriptionRepository({
    firestore: config.firestore,
    collection: paths.USERS_COLLECTION,
    planField: paths.PLAN_FIELD,
    billingCycleField: paths.BILLING_CYCLE_FIELD,
    subscriptionIdField: paths.SUBSCRIPTION_ID_FIELD,
    subscriptionStatusField: paths.SUBSCRIPTION_STATUS_FIELD,
    polarCustomerIdField: paths.POLAR_CUSTOMER_ID_FIELD,
    cancelAtPeriodEndField: paths.CANCEL_AT_PERIOD_END_FIELD,
    currentPeriodEndField: paths.CURRENT_PERIOD_END_FIELD,
  });

  const checkout = new CheckoutRepository(callableClient, callables.CREATE_CHECKOUT);
  const billing = new BillingRepository(
    callableClient,
    callables.GET_BILLING_HISTORY,
    config.logger,
  );
  const sync = new SyncRepository(callableClient, callables.SYNC_SUBSCRIPTION);
  const cancellation = new CancellationRepository(callableClient, callables.CANCEL_SUBSCRIPTION);
  const portal = new PortalRepository(callableClient, callables.GET_PORTAL_URL);

  return new FirebaseBillingFacade(
    subscription,
    checkout,
    billing,
    sync,
    cancellation,
    portal,
  );
}
