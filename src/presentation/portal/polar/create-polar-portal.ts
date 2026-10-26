/**
 * createPolarPortalClient — binds a `PolarAdapter` (any transport:
 * http, custom) to the portal's `BillingApiClient` seam.
 *
 * One structural difference from Stripe-shaped backends: Polar manages
 * payment methods inside its hosted customer portal (there is no card
 * CRUD API), so the payment-method operations redirect there instead
 * of mutating local state.
 *
 * Plan keys: when `SubscriptionStatus.plan` carries the host's plan key
 * (not a Polar product id), products tagged with `metadata.planId` are
 * matched against it — servers that expose the catalog can attach that
 * tag once and everything lines up.
 */

import type { PolarAdapter } from '../../../domain/interfaces';
import type {
  BillingCycle,
  OrderItem,
  SubscriptionStatus as CoreSubscriptionStatus,
} from '../../../domain/entities';
import type { PolarProduct } from '../../../domain/entities';
import { WindowNavigationStrategy } from '../../navigation/navigation.strategy';
import type { NavigationStrategy } from '../../navigation/navigation.strategy';
import { transformPolarProducts } from '../utils';
import type { BillingApiClient } from '../hooks';
import type {
  BillingSummary,
  Invoice,
  PaymentMethod,
  PlanTier,
  Subscription,
} from '../types';
import { CURRENCY, INVOICE_STATUS, SUBSCRIPTION_STATUS } from '../constants';

export interface PolarPortalClientOptions {
  adapter: PolarAdapter;
  /** Server-fetched product catalog (never shipped with a token). */
  products: PolarProduct[];
  /** Acting user/tenant id — forwarded to every adapter call. */
  userId?: string;
  /** Cycle used when a checkout carries none. Default `monthly`. */
  defaultCycle?: BillingCycle;
  /** Checkout return URL; `{CHECKOUT_ID}` templating supported. */
  successUrl?: string;
  /** Redirect strategy — defaults to `window.location` in browsers. */
  navigation?: NavigationStrategy;
}

/** BillingApiClient plus the Polar-specific operations the portal page uses. */
export interface PolarPortalClient extends BillingApiClient {
  /** Start a checkout for a product at an explicit cycle. */
  selectPlan: (productId: string, cycle?: BillingCycle) => Promise<void>;
  /** Open the hosted customer portal (payment methods, invoices). */
  openPortal: () => Promise<string>;
}

function portalStatus(core: CoreSubscriptionStatus['subscriptionStatus']): Subscription['status'] {
  switch (core) {
    case 'active':
      return SUBSCRIPTION_STATUS.ACTIVE;
    case 'trialing':
      return SUBSCRIPTION_STATUS.TRIALING;
    case 'past_due':
      return SUBSCRIPTION_STATUS.PAST_DUE;
    case 'unpaid':
      return SUBSCRIPTION_STATUS.UNPAID;
    case 'incomplete':
    case 'incomplete_expired':
      return SUBSCRIPTION_STATUS.INCOMPLETE;
    case 'revoked':
      return SUBSCRIPTION_STATUS.REVOKED;
    // 'none' and unknown values render as lapsed — nothing is owed.
    default:
      return SUBSCRIPTION_STATUS.CANCELED;
  }
}

function freeTier(planKey: string): PlanTier {
  return {
    id: planKey,
    name: planKey === 'free' ? 'Free' : planKey,
    description: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: CURRENCY.USD,
    features: [],
  };
}

function orderToInvoice(order: OrderItem): Invoice {
  const paid = order.paid || order.status === 'paid';
  const date = order.createdAt.length >= 10 ? order.createdAt.slice(0, 10) : order.createdAt;
  return {
    id: order.id,
    number: order.id.slice(-8).toUpperCase(),
    amount: order.amount,
    currency: order.currency.toUpperCase(),
    status: paid ? INVOICE_STATUS.PAID : INVOICE_STATUS.OPEN,
    date,
    dueDate: date,
    ...(paid ? { paidAt: date } : {}),
    ...(order.invoiceUrl ? { invoiceUrl: order.invoiceUrl } : {}),
    items: [
      {
        description: order.productName,
        quantity: 1,
        unitPrice: order.amount,
        amount: order.amount,
      },
    ],
  };
}

/** Marker row for the hosted portal — the seam requires a return value,
 *  and the page unloads on redirect before it could ever render. */
const HOSTED_PORTAL_METHOD: PaymentMethod = {
  id: 'hosted-portal',
  type: 'card',
  isDefault: true,
  createdAt: new Date(0).toISOString(),
  card: { last4: '••••', brand: 'Managed in the billing portal', expiryMonth: 0, expiryYear: 0 },
};

export function createPolarPortalClient(options: PolarPortalClientOptions): PolarPortalClient {
  const { adapter, products, userId, successUrl } = options;
  const defaultCycle: BillingCycle = options.defaultCycle ?? 'monthly';
  const navigation: NavigationStrategy = options.navigation ?? new WindowNavigationStrategy();
  const tiers = transformPolarProducts(products);

  /** Host plan key -> product, from the catalog's metadata.planId tags. */
  const productByPlanKey = new Map<string, PolarProduct>();
  for (const product of products) {
    const key = product.metadata?.planId;
    if (typeof key === 'string' && key.length > 0) productByPlanKey.set(key, product);
  }

  async function checkout(productId: string, cycle?: BillingCycle): Promise<void> {
    const { url } = await adapter.createCheckout({
      productId,
      billingCycle: cycle ?? defaultCycle,
      ...(successUrl ? { successUrl } : {}),
      ...(userId ? { userId } : {}),
    });
    navigation.redirect(url);
  }

  async function openPortal(): Promise<string> {
    const url = await adapter.getPortalUrl(userId ?? '');
    navigation.redirect(url);
    return url;
  }

  return {
    async loadBilling(): Promise<BillingSummary> {
      const [status, history] = await Promise.all([
        adapter.getStatus(userId ?? ''),
        adapter.getBillingHistory(userId ?? ''),
      ]);

      const tierById = tiers.find((tier) => tier.id === status.plan);
      const product = productByPlanKey.get(status.plan);
      const tier =
        tierById ??
        (product ? tiers.find((t) => t.id === product.id) : undefined) ??
        freeTier(status.plan);

      const subscription: Subscription = {
        id: status.subscriptionId ?? 'none',
        planId: status.plan,
        plan: tier,
        status: portalStatus(status.subscriptionStatus),
        cycle: status.billingCycle ?? defaultCycle,
        currentPeriodStart: '',
        currentPeriodEnd: status.currentPeriodEnd ?? '',
        ...(status.cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd: status.cancelAtPeriodEnd } : {}),
      };

      const price =
        subscription.cycle === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;

      return {
        subscription,
        paymentMethods: [],
        usage: [],
        recentInvoices: history.map(orderToInvoice),
        ...(subscription.status === SUBSCRIPTION_STATUS.ACTIVE && subscription.currentPeriodEnd
          ? {
              upcomingInvoice: {
                amount: price,
                currency: tier.currency,
                date: subscription.currentPeriodEnd,
              },
            }
          : {}),
      };
    },

    updatePlan: (productId: string) => checkout(productId),
    selectPlan: (productId: string, cycle?: BillingCycle) => checkout(productId, cycle),

    updateCycle: async (cycle: BillingCycle) => {
      const status = await adapter.getStatus(userId ?? '');
      const product = productByPlanKey.get(status.plan) ?? tiers.find((t) => t.id === status.plan);
      if (!product) throw new Error('Cannot switch cycle without a purchasable plan catalog');
      await checkout(product.id, cycle);
    },

    cancelSubscription: async () => {
      await adapter.cancelSubscription();
    },

    addPaymentMethod: async () => {
      await openPortal();
      return HOSTED_PORTAL_METHOD;
    },
    removePaymentMethod: () => openPortal().then(() => undefined),
    setDefaultPaymentMethod: () => openPortal().then(() => undefined),

    getInvoiceUrl: async (invoiceId: string) => {
      const history = await adapter.getBillingHistory(userId ?? '');
      const order = history.find((item) => item.id === invoiceId);
      return order?.invoiceUrl ?? (await openPortal());
    },

    openPortal,
  };
}
