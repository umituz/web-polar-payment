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

type FirebaseFunctions = import('firebase/functions').Functions;
type FirebaseFirestore = import('firebase/firestore').Firestore;

export interface FirebaseAdapterConfig {
  functions: FirebaseFunctions;
  firestore: FirebaseFirestore;
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

  async function callable<T = unknown, R = unknown>(name: string, data?: T): Promise<R> {
    const { httpsCallable } = await import('firebase/functions');
    const fn = httpsCallable<T, R>(config.functions, name);
    const result = await fn(data);
    return result.data;
  }

  return {
    async getStatus(userId: string): Promise<SubscriptionStatus> {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(config.firestore, db.collection, userId));

      if (!snap.exists()) {
        return { plan: 'free', subscriptionStatus: 'none' };
      }

      const d = snap.data() as Record<string, unknown>;

      let currentPeriodEnd: string | undefined;
      const rawEnd = d[db.currentPeriodEnd];
      if (rawEnd != null) {
        if (typeof rawEnd === 'object' && 'toDate' in (rawEnd as object)) {
          currentPeriodEnd = (rawEnd as { toDate(): Date }).toDate().toISOString();
        } else if (typeof rawEnd === 'string') {
          currentPeriodEnd = rawEnd;
        }
      }

      return {
        plan: (d[db.plan] as string) ?? 'free',
        billingCycle: normalizeBillingCycle((d[db.billingCycle] as string) ?? 'monthly'),
        subscriptionId: d[db.subscriptionId] as string | undefined,
        subscriptionStatus: normalizeStatus((d[db.subscriptionStatus] as string) ?? 'none'),
        polarCustomerId: d[db.polarCustomerId] as string | undefined,
        cancelAtPeriodEnd: d[db.cancelAtPeriodEnd] as boolean | undefined,
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
