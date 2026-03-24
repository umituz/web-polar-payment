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

/**
 * Type guard to safely extract string value from unknown Firestore data
 */
function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  return undefined;
}

/**
 * Type guard to safely extract boolean value from unknown Firestore data
 */
function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

/**
 * Type guard to safely check if value is an object with toDate method
 */
function isTimestamp(value: unknown): value is { toDate(): Date } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  );
}

// Internal type aliases for Firebase SDK compatibility
// Using 'any' internally to avoid DTS build issues with external Firebase packages
type FirebaseFunctions = any;
type FirebaseFirestore = any;

export interface FirebaseAdapterConfig {
  /** Firebase Functions instance from firebase/functions */
  functions: unknown;
  /** Firebase Firestore instance from firebase/firestore */
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
 * Firebase Billing Service
 * @description Implementation of PolarAdapter for Firebase Functions and Firestore.
 */
export function createFirebaseAdapter(config: FirebaseAdapterConfig): PolarAdapter {
  // Cast internally to Firebase types for implementation
  const functions = config.functions as FirebaseFunctions;
  const firestore = config.firestore as FirebaseFirestore;

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

  // Cache imports to avoid repeated dynamic import overhead
  // Reduces latency on subsequent calls and GC pressure
  let httpsCallableCache: typeof import('firebase/functions')['httpsCallable'] | null = null;
  let firestoreCache: { doc: any; getDoc: any } | null = null;

  async function getHttpsCallable() {
    if (!httpsCallableCache) {
      const mod = await import('firebase/functions');
      httpsCallableCache = mod.httpsCallable;
    }
    return httpsCallableCache;
  }

  async function getFirestore() {
    if (!firestoreCache) {
      const mod = await import('firebase/firestore');
      firestoreCache = { doc: mod.doc, getDoc: mod.getDoc };
    }
    return firestoreCache;
  }

  async function callable<T = unknown, R = unknown>(name: string, data?: T): Promise<R> {
    const httpsCallable = await getHttpsCallable();
    const fn = (httpsCallable as any)(functions, name) as (data?: T) => Promise<{ data: R }>;
    const result = await fn(data);
    return result.data;
  }

  return {
    async getStatus(userId: string): Promise<SubscriptionStatus> {
      const { doc, getDoc } = await getFirestore();
      const snap = await getDoc((doc as any)(firestore, db.collection, userId));

      if (!snap.exists()) {
        return { plan: 'free', subscriptionStatus: 'none' };
      }

      const d = snap.data() as Record<string, unknown>;

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

    async syncSubscription(_userId: string, _checkoutId?: string): Promise<SyncResult> {
      return callable<Record<string, never>, SyncResult>(callables.sync, {});
    },

    async getBillingHistory(_userId: string): Promise<OrderItem[]> {
      const result = await callable<Record<string, never>, { orders?: OrderItem[] }>(
        callables.billing,
        {},
      );
      return result.orders ?? [];
    },

    async cancelSubscription(reason?: CancellationReason): Promise<CancelResult> {
      return callable<{ reason?: string }, CancelResult>(callables.cancel, { reason });
    },

    async getPortalUrl(_userId: string): Promise<string> {
      const result = await callable<Record<string, never>, { url?: string; customerPortalUrl?: string }>(
        callables.portal,
        {},
      );
      const url = result.url ?? result.customerPortalUrl;
      if (!url) throw new Error('No portal URL returned from Cloud Function');
      return url;
    },
  };
}
