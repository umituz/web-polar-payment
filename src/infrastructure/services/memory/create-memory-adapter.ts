import type { PolarAdapter } from '../../../domain/interfaces';
import type {
  CancellationReason,
  CancelResult,
  CheckoutParams,
  CheckoutResult,
  OrderItem,
  SubscriptionStatus,
  SyncResult,
} from '../../../domain/entities';

export interface MemoryAdapterConfig {
  initialStatus?: Partial<SubscriptionStatus>;
  initialHistory?: OrderItem[];
  portalUrl?: string;
  onCheckout?: (params: CheckoutParams) => void;
  onCancel?: (reason?: CancellationReason) => void;
}

export function createMemoryPolarAdapter(config: MemoryAdapterConfig = {}): PolarAdapter {
  let status: SubscriptionStatus = {
    plan: 'free',
    subscriptionStatus: 'none',
    billingCycle: 'monthly',
    cancelAtPeriodEnd: false,
    ...config.initialStatus,
  };

  const history: OrderItem[] = config.initialHistory ? [...config.initialHistory] : [];
  const portalUrl = config.portalUrl ?? 'https://polar.sh/purchases';

  return {
    async getStatus(_userId: string): Promise<SubscriptionStatus> {
      return { ...status };
    },

    async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
      config.onCheckout?.(params);
      const checkoutId = `chk_${Date.now()}`;
      const planName = params.planKey ?? params.productId;

      status = {
        ...status,
        plan: planName,
        subscriptionStatus: 'active',
        subscriptionId: `sub_${Date.now()}`,
        billingCycle: params.billingCycle ?? status.billingCycle,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      history.unshift({
        id: `ord_${Date.now()}`,
        amount: 2900,
        currency: 'usd',
        createdAt: new Date().toISOString(),
        productName: planName,
        status: 'paid',
        paid: true,
      });

      const url = params.successUrl
        ? params.successUrl.replace('{CHECKOUT_ID}', checkoutId)
        : `https://polar.sh/checkout/${checkoutId}`;

      return {
        id: checkoutId,
        url,
      };
    },

    async syncSubscription(_userId: string, _checkoutId?: string): Promise<SyncResult> {
      return {
        synced: true,
        plan: status.plan,
      };
    },

    async getBillingHistory(_userId: string): Promise<OrderItem[]> {
      return [...history];
    },

    async cancelSubscription(reason?: CancellationReason): Promise<CancelResult> {
      config.onCancel?.(reason);
      status = {
        ...status,
        subscriptionStatus: 'canceled',
        cancelAtPeriodEnd: true,
      };
      return {
        success: true,
        endsAt: new Date().toISOString(),
      };
    },

    async getPortalUrl(_userId: string): Promise<string> {
      return portalUrl;
    },
  };
}
