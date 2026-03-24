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
type HttpsCallableFn = <T = unknown, R = unknown>(data?: T) => Promise<{ data: R }>;
type HttpsCallable = (name: string) => HttpsCallableFn;

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

  let httpsCallableCache: HttpsCallable | null = null;
  let firestoreCache: { doc: FirestoreDoc; getDoc: FirestoreGetDoc } | null = null;

  async function getHttpsCallable(): Promise<HttpsCallable> {
    if (!httpsCallableCache) {
      const mod = await import('firebase/functions');
      httpsCallableCache = mod.httpsCallable(functions) as HttpsCallable;
    }
    return httpsCallableCache;
  }

  async function getFirestore(): Promise<{ doc: FirestoreDoc; getDoc: FirestoreGetDoc }> {
    if (!firestoreCache) {
      const mod = await import('firebase/firestore');
      firestoreCache = { doc: mod.doc as FirestoreDoc, getDoc: mod.getDoc as FirestoreGetDoc };
    }
    return firestoreCache;
  }

  async function callable<T = unknown, R = unknown>(name: string, data?: T): Promise<R> {
    const httpsCallable = await getHttpsCallable();
    const fn = httpsCallable(name) as (data?: T) => Promise<{ data: R }>;
    const result = await fn(data);
    return result.data;
  }

  return {
    async getStatus(userId: string): Promise<SubscriptionStatus> {
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
    },

    async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
      return callable<CheckoutParams, CheckoutResult>(callables.createCheckout, params);
    },

    async syncSubscription(userId: string, checkoutId?: string): Promise<SyncResult> {
      return callable<{ userId: string; checkoutId?: string }, SyncResult>(callables.sync, { userId, checkoutId });
    },

    async getBillingHistory(userId: string): Promise<OrderItem[]> {
      const result = await callable<{ userId: string }, { orders?: OrderItem[] }>(
        callables.billing,
        { userId },
      );
      return result.orders ?? [];
    },

    async cancelSubscription(reason?: CancellationReason): Promise<CancelResult> {
      return callable<{ reason?: string }, CancelResult>(callables.cancel, { reason });
    },

    async getPortalUrl(userId: string): Promise<string> {
      const result = await callable<{ userId: string }, { url: string }>(
        callables.portal,
        { userId },
      );
      return result.url;
    },
  };
}
