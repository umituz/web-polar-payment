import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PolarAdapter } from './types';
import type {
  CheckoutParams,
  CheckoutResult,
  OrderItem,
  CancellationReason,
  CancelResult,
  SubscriptionStatus,
  SyncResult,
} from '../core/types';

export interface SupabaseAdapterConfig {
  supabaseUrl: string;
  supabaseKey: string;
  functions?: {
    checkout?: string;
    verify?: string;
    syncSubscription?: string;
    billingHistory?: string;
    cancelSubscription?: string;
    customerPortal?: string;
  };
  db?: {
    profilesTable?: string;
    planColumn?: string;
    tokensColumn?: string;
    userIdColumn?: string;
  };
}

export function createSupabaseAdapter(config: SupabaseAdapterConfig): PolarAdapter {
  const supabase: SupabaseClient = createClient(config.supabaseUrl, config.supabaseKey);

  const fn = {
    checkout: config.functions?.checkout ?? 'polar-checkout',
    verify: config.functions?.verify ?? 'polar-verify',
    sync: config.functions?.syncSubscription ?? 'polar-verify',
    billingHistory: config.functions?.billingHistory ?? 'polar-billing-history',
    cancel: config.functions?.cancelSubscription ?? 'polar-cancel',
    portal: config.functions?.customerPortal ?? 'polar-portal',
  };

  const db = {
    table: config.db?.profilesTable ?? 'profiles',
    plan: config.db?.planColumn ?? 'plan',
    tokens: config.db?.tokensColumn ?? 'tokens',
    userId: config.db?.userIdColumn ?? 'user_id',
  };

  return {
    async getStatus(userId: string): Promise<SubscriptionStatus> {
      const { data, error } = await supabase
        .from(db.table)
        .select('*')
        .eq(db.userId, userId)
        .single();

      // User exists in auth but not yet in profiles (e.g., trigger hasn't run)
      // Return free plan instead of throwing
      if (error) {
        if (error.code === 'PGRST116') {
          return { plan: 'free', subscriptionStatus: 'none' };
        }
        throw error;
      }

      const row = data as Record<string, unknown>;
      return {
        plan: (row[db.plan] as string) ?? 'free',
        tokens: (row[db.tokens] as number) ?? 0,
        subscriptionStatus: (row[db.plan] as string) && (row[db.plan] as string) !== 'free'
          ? 'active'
          : 'none',
      };
    },

    async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
      const { data, error } = await supabase.functions.invoke(fn.checkout, {
        body: {
          productId: params.productId,
          userId: params.userId,
          successUrl: params.successUrl,
          planKey: params.planKey,
          billingCycle: params.billingCycle,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL returned from edge function');
      return { url: data.url as string, id: (data.id as string | undefined) ?? '' };
    },

    async syncSubscription(_userId: string, checkoutId?: string): Promise<SyncResult> {
      if (!checkoutId) return { synced: false };

      const { data, error } = await supabase.functions.invoke(fn.verify, {
        body: { checkoutId },
      });
      if (error) throw error;
      const status = (data as Record<string, unknown>)?.status as string | undefined;
      return {
        synced: status === 'succeeded',
        plan: (data as Record<string, unknown>)?.plan as string | undefined,
      };
    },

    async getBillingHistory(_userId: string): Promise<OrderItem[]> {
      const { data, error } = await supabase.functions.invoke(fn.billingHistory, {});
      if (error) throw error;
      return ((data as Record<string, unknown>)?.orders as OrderItem[] | undefined) ?? [];
    },

    async cancelSubscription(reason?: CancellationReason): Promise<CancelResult> {
      const { data, error } = await supabase.functions.invoke(fn.cancel, {
        body: { reason },
      });
      if (error) throw error;
      return {
        success: true,
        endsAt: (data as Record<string, unknown>)?.endsAt as string | undefined,
      };
    },

    async getPortalUrl(_userId: string): Promise<string> {
      const { data, error } = await supabase.functions.invoke(fn.portal, {});
      if (error) throw error;
      const d = data as Record<string, unknown>;
      // Support both `url` and `customerPortalUrl` field names
      const url = (d?.url ?? d?.customerPortalUrl) as string | undefined;
      if (!url) throw new Error('No portal URL returned');
      return url;
    },
  };
}
