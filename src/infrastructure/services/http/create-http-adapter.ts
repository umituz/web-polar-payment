/**
 * createHttpAdapter — `PolarAdapter` over a conventional REST surface.
 *
 * For backends that run as your own API worker next to the app, this
 * adapter implements the SDK contract against six endpoints under a
 * single base path (default `/api/billing`):
 *
 *   GET  /status?userId=              -> SubscriptionStatus
 *   POST /checkout   { productId, billingCycle?, successUrl?, userId? } -> CheckoutResult
 *   POST /sync       { userId, checkoutId? }                          -> SyncResult
 *   GET  /history?userId=             -> OrderItem[]
 *   POST /cancel     { userId?, reason? }                              -> CancelResult
 *   GET  /portal?userId=              -> { url: string }
 *
 * Method parameters (the SDK's `userId`) are passed as `userId` — in the
 * query for GETs and in the body for POSTs — falling back to `getUserId`
 * when the SDK does not supply one. The server derives the acting user
 * from its own session when neither is present.
 */

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

export interface HttpAdapterConfig {
  /** Base path of the billing endpoints. Default `/api/billing`. */
  baseUrl?: string;
  /** Injectable fetch for tests. Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
  /** Resolves the acting user/tenant id when the SDK does not supply one. */
  getUserId?: () => string | undefined | Promise<string | undefined>;
  /** Extra request headers (auth tokens, trace ids). */
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
}

interface ErrorEnvelope {
  error?: string | { message?: string };
  message?: string;
}

function errorMessage(status: number, body: unknown): string {
  const envelope = (body ?? {}) as ErrorEnvelope;
  const errorDetail = typeof envelope.error === 'string' ? envelope.error : envelope.error?.message;
  const detail = errorDetail ?? envelope.message ?? 'Billing request failed';
  return `${detail} (HTTP ${status})`;
}

export function createHttpAdapter(config: HttpAdapterConfig = {}): PolarAdapter {
  const baseUrl = (config.baseUrl ?? '/api/billing').replace(/\/$/, '');
  const doFetch = config.fetchImpl ?? globalThis.fetch.bind(globalThis);

  async function request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
    explicitUserId?: string,
  ): Promise<T> {
    const userId = explicitUserId || (config.getUserId ? await config.getUserId() : undefined);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(config.getHeaders ? await config.getHeaders() : {}),
    };
    const withUser = { ...(userId ? { userId } : {}), ...(body ?? {}) };
    if (Object.keys(withUser).length > 0) headers['Content-Type'] = 'application/json';

    const query = userId && method === 'GET' ? `?userId=${encodeURIComponent(userId)}` : '';
    const response = await doFetch(`${baseUrl}${path}${query}`, {
      method,
      headers,
      ...(method === 'POST' && Object.keys(withUser).length > 0 ? { body: JSON.stringify(withUser) } : {}),
    });

    let data: unknown = null;
    const text = await response.text();
    if (text.length > 0) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!response.ok) {
      throw new Error(errorMessage(response.status, data));
    }
    return data as T;
  }

  return {
    getStatus(userId: string) {
      return request<SubscriptionStatus>('GET', '/status', undefined, userId);
    },

    createCheckout(params: CheckoutParams) {
      return request<CheckoutResult>(
        'POST',
        '/checkout',
        {
          productId: params.productId,
          ...(params.billingCycle ? { billingCycle: params.billingCycle } : {}),
          ...(params.successUrl ? { successUrl: params.successUrl } : {}),
          ...(params.planKey ? { planKey: params.planKey } : {}),
          ...(params.customerEmail ? { customerEmail: params.customerEmail } : {}),
          ...(params.seats !== undefined ? { seats: params.seats } : {}),
          ...(params.metadata ? { metadata: params.metadata } : {}),
        },
        params.userId,
      );
    },

    syncSubscription(userId: string, checkoutId?: string) {
      return request<SyncResult>('POST', '/sync', checkoutId ? { checkoutId } : undefined, userId);
    },

    async getBillingHistory(userId: string) {
      const items = await request<OrderItem[] | { items: OrderItem[] }>('GET', '/history', undefined, userId);
      return Array.isArray(items) ? items : items.items ?? [];
    },

    cancelSubscription(reason?: CancellationReason) {
      return request<CancelResult>('POST', '/cancel', {
        ...(reason ? { reason } : {}),
      });
    },

    async getPortalUrl(userId: string) {
      const result = await request<string | { url: string }>('GET', '/portal', undefined, userId);
      return typeof result === 'string' ? result : result.url;
    },
  };
}
