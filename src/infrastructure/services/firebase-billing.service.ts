import type { PolarAdapter } from '../../domain/interfaces';
import type {
  CheckoutParams,
  CheckoutResult,
  OrderItem,
  CancellationReason,
  CancelResult,
  SubscriptionStatus,
  SyncResult,
} from '../../domain/entities';
import { normalizeStatus, normalizeBillingCycle } from '../utils/normalization.util';
import { asString, asBoolean, isTimestamp } from '../utils/firebase-helpers.util';

type FirestoreDoc = (firestore: unknown, collectionPath: string, docId: string) => unknown;
type FirestoreGetDoc = (ref: unknown) => Promise<{ exists: boolean; data(): Record<string, unknown> }>;

export interface FirebaseAdapterConfig {
  functions: unknown;
  firestore: unknown;
  callables?: {
    createCheckout?: string;
    syncSubscription?: string;
    getBillingHistory?: string;
    cancelSubscription?: string;
    getPortalUrl?: string;
  };
  db?: {
    usersCollection?: string;
    planField?: string;
    billingCycleField?: string;
    subscriptionIdField?: string;
    subscriptionStatusField?: string;
    polarCustomerIdField?: string;
    cancelAtPeriodEndField?: string;
    currentPeriodEndField?: string;
  };
}

/**
 * Custom error class for Firebase billing operations
 */
export class FirebaseBillingError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'FirebaseBillingError';
  }
}

export function createFirebaseAdapter(config: FirebaseAdapterConfig): PolarAdapter {
  const functions = config.functions;
  const firestore = config.firestore;

  const callables = {
    createCheckout: config.callables?.createCheckout ?? 'createCheckoutSession',
    sync: config.callables?.syncSubscription ?? 'syncSubscription',
    billing: config.callables?.getBillingHistory ?? 'getBillingHistory',
    cancel: config.callables?.cancelSubscription ?? 'cancelSubscription',
    portal: config.callables?.getPortalUrl ?? 'getCustomerPortalUrl',
  };

  const db = {
    collection: config.db?.usersCollection ?? 'users',
    plan: config.db?.planField ?? 'plan',
    billingCycle: config.db?.billingCycleField ?? 'billingCycle',
    subscriptionId: config.db?.subscriptionIdField ?? 'subscriptionId',
    subscriptionStatus: config.db?.subscriptionStatusField ?? 'subscriptionStatus',
    polarCustomerId: config.db?.polarCustomerIdField ?? 'polarCustomerId',
    cancelAtPeriodEnd: config.db?.cancelAtPeriodEndField ?? 'cancelAtPeriodEnd',
    currentPeriodEnd: config.db?.currentPeriodEndField ?? 'currentPeriodEnd',
  };

  let firestoreCache: { doc: FirestoreDoc; getDoc: FirestoreGetDoc } | null = null;

  async function getFirestore(): Promise<{ doc: FirestoreDoc; getDoc: FirestoreGetDoc }> {
    if (!firestoreCache) {
      const mod = await import('firebase/firestore');
      firestoreCache = { doc: mod.doc as FirestoreDoc, getDoc: mod.getDoc as FirestoreGetDoc };
    }
    return firestoreCache;
  }

  /**
   * Call a Firebase callable function with proper error handling
   */
  async function callable<T = unknown, R = unknown>(name: string, data?: T): Promise<R> {
    try {
      const { httpsCallable: hc } = await import('firebase/functions');
      const fn = hc(functions, name) as (data?: T) => Promise<{ data: R }>;
      const result = await fn(data);
      return result.data;
    } catch (error) {
      // Handle Firebase Functions errors
      if (error && typeof error === 'object') {
        const err = error as { code?: string; message?: string };
        throw new FirebaseBillingError(
          err.message || `Function ${name} failed`,
          err.code,
          error
        );
      }
      throw new FirebaseBillingError(
        `Unknown error calling ${name}`,
        'unknown',
        error
      );
    }
  }

  /**
   * Validate userId is not empty
   */
  function validateUserId(userId: string | undefined): void {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new FirebaseBillingError('User ID is required and cannot be empty', 'invalid-argument');
    }
  }

  return {
    async getStatus(userId: string): Promise<SubscriptionStatus> {
      try {
        const { doc, getDoc } = await getFirestore();
        const docRef = doc(firestore, db.collection, userId);
        const snap = await getDoc(docRef);

        const exists = (snap as { exists: boolean }).exists;
        if (!exists) {
          return { plan: 'free', subscriptionStatus: 'none' };
        }

        const d = snap.data();

        let currentPeriodEnd: string | undefined;
        const rawEnd = d[db.currentPeriodEnd];
        if (rawEnd != null) {
          if (isTimestamp(rawEnd)) {
            currentPeriodEnd = rawEnd.toDate().toISOString();
          } else if (typeof rawEnd === 'string') {
            currentPeriodEnd = rawEnd;
          }
        }

        return {
          plan: asString(d[db.plan]) ?? 'free',
          billingCycle: normalizeBillingCycle(asString(d[db.billingCycle]) ?? 'monthly'),
          subscriptionId: asString(d[db.subscriptionId]),
          subscriptionStatus: normalizeStatus(asString(d[db.subscriptionStatus]) ?? 'none'),
          polarCustomerId: asString(d[db.polarCustomerId]),
          cancelAtPeriodEnd: asBoolean(d[db.cancelAtPeriodEnd]),
          currentPeriodEnd,
        };
      } catch (error) {
        if (error instanceof FirebaseBillingError) throw error;
        throw new FirebaseBillingError('Failed to load subscription status', 'status-load-failed', error);
      }
    },

    async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
      // Validate checkout params
      if (!params.productId || typeof params.productId !== 'string' || params.productId.trim() === '') {
        throw new FirebaseBillingError('Product ID is required', 'invalid-argument');
      }

      try {
        return await callable<CheckoutParams, CheckoutResult>(callables.createCheckout, params);
      } catch (error) {
        if (error instanceof FirebaseBillingError) throw error;
        throw new FirebaseBillingError('Failed to create checkout session', 'checkout-failed', error);
      }
    },

    async syncSubscription(userId: string, checkoutId?: string): Promise<SyncResult> {
      validateUserId(userId);

      try {
        return await callable<{ userId: string; checkoutId?: string }, SyncResult>(
          callables.sync,
          { userId, checkoutId }
        );
      } catch (error) {
        if (error instanceof FirebaseBillingError) throw error;
        throw new FirebaseBillingError('Failed to sync subscription', 'sync-failed', error);
      }
    },

    async getBillingHistory(userId: string): Promise<OrderItem[]> {
      validateUserId(userId);

      try {
        const result = await callable<{ userId: string }, { orders?: OrderItem[] }>(
          callables.billing,
          { userId }
        );
        return result.orders ?? [];
      } catch (error) {
        if (error instanceof FirebaseBillingError) throw error;
        // Return empty array on error instead of throwing
        console.error('[FirebaseBilling] Failed to load billing history:', error);
        return [];
      }
    },

    async cancelSubscription(reason?: CancellationReason): Promise<CancelResult> {
      try {
        return await callable<{ reason?: string }, CancelResult>(callables.cancel, { reason });
      } catch (error) {
        if (error instanceof FirebaseBillingError) throw error;
        throw new FirebaseBillingError('Failed to cancel subscription', 'cancel-failed', error);
      }
    },

    async getPortalUrl(userId: string): Promise<string> {
      validateUserId(userId);

      try {
        const result = await callable<{ userId: string }, { url: string }>(
          callables.portal,
          { userId }
        );

        if (!result?.url || typeof result.url !== 'string') {
          throw new FirebaseBillingError('Invalid portal URL returned', 'invalid-response');
        }

        return result.url;
      } catch (error) {
        if (error instanceof FirebaseBillingError) throw error;
        throw new FirebaseBillingError('Failed to get customer portal URL', 'portal-failed', error);
      }
    },
  };
}
