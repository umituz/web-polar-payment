// src/core/constants.ts
var SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  CANCELED: "canceled",
  REVOKED: "revoked",
  TRIALING: "trialing",
  PAST_DUE: "past_due",
  INCOMPLETE: "incomplete",
  INCOMPLETE_EXPIRED: "incomplete_expired",
  UNPAID: "unpaid",
  NONE: "none"
};
var FREE_PLAN = "free";
function normalizeStatus(raw) {
  const map = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    incomplete: "incomplete",
    incomplete_expired: "incomplete_expired",
    unpaid: "unpaid",
    canceled: "canceled",
    cancelled: "canceled",
    // Polar uses both spellings
    revoked: "revoked",
    none: "none"
  };
  return map[raw?.toLowerCase()] ?? "none";
}
function normalizeBillingCycle(interval) {
  if (interval === "month" || interval === "monthly") return "monthly";
  if (interval === "year" || interval === "yearly") return "yearly";
  return "monthly";
}

// src/adapters/supabase.ts
import { createClient } from "@supabase/supabase-js";
function createSupabaseAdapter(config) {
  const supabase = createClient(config.supabaseUrl, config.supabaseKey);
  const fn = {
    checkout: config.functions?.checkout ?? "polar-checkout",
    verify: config.functions?.verify ?? "polar-verify",
    sync: config.functions?.syncSubscription ?? "polar-verify",
    billingHistory: config.functions?.billingHistory ?? "polar-billing-history",
    cancel: config.functions?.cancelSubscription ?? "polar-cancel",
    portal: config.functions?.customerPortal ?? "polar-portal"
  };
  const db = {
    table: config.db?.profilesTable ?? "profiles",
    plan: config.db?.planColumn ?? "plan",
    tokens: config.db?.tokensColumn ?? "tokens",
    userId: config.db?.userIdColumn ?? "user_id"
  };
  return {
    async getStatus(userId) {
      const { data, error } = await supabase.from(db.table).select("*").eq(db.userId, userId).single();
      if (error) {
        if (error.code === "PGRST116") {
          return { plan: "free", subscriptionStatus: "none" };
        }
        throw error;
      }
      const row = data;
      return {
        plan: row[db.plan] ?? "free",
        tokens: row[db.tokens] ?? 0,
        subscriptionStatus: row[db.plan] && row[db.plan] !== "free" ? "active" : "none"
      };
    },
    async createCheckout(params) {
      const { data, error } = await supabase.functions.invoke(fn.checkout, {
        body: {
          productId: params.productId,
          userId: params.userId,
          successUrl: params.successUrl,
          planKey: params.planKey,
          billingCycle: params.billingCycle
        }
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned from edge function");
      return { url: data.url, id: data.id ?? "" };
    },
    async syncSubscription(_userId, checkoutId) {
      if (!checkoutId) return { synced: false };
      const { data, error } = await supabase.functions.invoke(fn.verify, {
        body: { checkoutId }
      });
      if (error) throw error;
      const status = data?.status;
      return {
        synced: status === "succeeded",
        plan: data?.plan
      };
    },
    async getBillingHistory(_userId) {
      const { data, error } = await supabase.functions.invoke(fn.billingHistory, {});
      if (error) throw error;
      return data?.orders ?? [];
    },
    async cancelSubscription(reason) {
      const { data, error } = await supabase.functions.invoke(fn.cancel, {
        body: { reason }
      });
      if (error) throw error;
      return {
        success: true,
        endsAt: data?.endsAt
      };
    },
    async getPortalUrl(_userId) {
      const { data, error } = await supabase.functions.invoke(fn.portal, {});
      if (error) throw error;
      const d = data;
      const url = d?.url ?? d?.customerPortalUrl;
      if (!url) throw new Error("No portal URL returned");
      return url;
    }
  };
}

// src/adapters/firebase.ts
function createFirebaseAdapter(config) {
  const callables = {
    createCheckout: config.callables?.createCheckout ?? "createCheckoutSession",
    sync: config.callables?.syncSubscription ?? "syncSubscription",
    billing: config.callables?.getBillingHistory ?? "getBillingHistory",
    cancel: config.callables?.cancelSubscription ?? "cancelSubscription",
    portal: config.callables?.getPortalUrl ?? "getCustomerPortalUrl"
  };
  const db = {
    collection: config.db?.usersCollection ?? "users",
    plan: config.db?.planField ?? "plan",
    billingCycle: config.db?.billingCycleField ?? "billingCycle",
    subscriptionId: config.db?.subscriptionIdField ?? "subscriptionId",
    subscriptionStatus: config.db?.subscriptionStatusField ?? "subscriptionStatus",
    polarCustomerId: config.db?.polarCustomerIdField ?? "polarCustomerId",
    cancelAtPeriodEnd: config.db?.cancelAtPeriodEndField ?? "cancelAtPeriodEnd",
    currentPeriodEnd: config.db?.currentPeriodEndField ?? "currentPeriodEnd"
  };
  async function callable(name, data) {
    const { httpsCallable } = await import("firebase/functions");
    const fn = httpsCallable(config.functions, name);
    const result = await fn(data);
    return result.data;
  }
  return {
    async getStatus(userId) {
      const { doc, getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(config.firestore, db.collection, userId));
      if (!snap.exists()) {
        return { plan: "free", subscriptionStatus: "none" };
      }
      const d = snap.data();
      let currentPeriodEnd;
      const rawEnd = d[db.currentPeriodEnd];
      if (rawEnd != null) {
        if (typeof rawEnd === "object" && "toDate" in rawEnd) {
          currentPeriodEnd = rawEnd.toDate().toISOString();
        } else if (typeof rawEnd === "string") {
          currentPeriodEnd = rawEnd;
        }
      }
      return {
        plan: d[db.plan] ?? "free",
        billingCycle: normalizeBillingCycle(d[db.billingCycle] ?? "monthly"),
        subscriptionId: d[db.subscriptionId],
        subscriptionStatus: normalizeStatus(d[db.subscriptionStatus] ?? "none"),
        polarCustomerId: d[db.polarCustomerId],
        cancelAtPeriodEnd: d[db.cancelAtPeriodEnd],
        currentPeriodEnd
      };
    },
    async createCheckout(params) {
      return callable(callables.createCheckout, params);
    },
    async syncSubscription(_userId, _checkoutId) {
      return callable(callables.sync, {});
    },
    async getBillingHistory(_userId) {
      const result = await callable(
        callables.billing,
        {}
      );
      return result.orders ?? [];
    },
    async cancelSubscription(reason) {
      return callable(callables.cancel, { reason });
    },
    async getPortalUrl(_userId) {
      const result = await callable(
        callables.portal,
        {}
      );
      const url = result.url ?? result.customerPortalUrl;
      if (!url) throw new Error("No portal URL returned from Cloud Function");
      return url;
    }
  };
}

// src/react/context.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo
} from "react";
import { jsx } from "react/jsx-runtime";
var PolarContext = createContext(void 0);
var FREE_STATUS = {
  plan: "free",
  subscriptionStatus: "none"
};
function PolarProvider({ adapter, userId, children }) {
  const [status, setStatus] = useState(FREE_STATUS);
  const [loading, setLoading] = useState(true);
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;
  const refreshAbortRef = useRef(null);
  const refresh = useCallback(async () => {
    const uid = userId?.trim();
    if (!uid) {
      setStatus(FREE_STATUS);
      setLoading(false);
      return;
    }
    refreshAbortRef.current?.abort();
    const ctrl = new AbortController();
    refreshAbortRef.current = ctrl;
    try {
      setLoading(true);
      const s = await adapterRef.current.getStatus(uid);
      if (!ctrl.signal.aborted) setStatus(s);
    } catch (err) {
      if (!ctrl.signal.aborted) {
        console.error("[polar-billing] getStatus failed:", err);
        setStatus(FREE_STATUS);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    refresh();
    return () => {
      refreshAbortRef.current?.abort();
    };
  }, [refresh]);
  const startCheckout = useCallback(async (params) => {
    const result = await adapterRef.current.createCheckout({ ...params, userId: userId?.trim() });
    if (!result.url.startsWith("https://")) {
      throw new Error("Invalid checkout URL returned");
    }
    window.location.href = result.url;
  }, [userId]);
  const syncSubscription = useCallback(async () => {
    const uid = userId?.trim();
    if (!uid) return { synced: false };
    const checkoutId = new URLSearchParams(window.location.search).get("checkout_id") ?? void 0;
    const result = await adapterRef.current.syncSubscription(uid, checkoutId);
    if (result.synced) await refresh();
    return result;
  }, [userId, refresh]);
  const getBillingHistory = useCallback(async () => {
    const uid = userId?.trim();
    if (!uid) return [];
    return adapterRef.current.getBillingHistory(uid);
  }, [userId]);
  const cancelSubscription = useCallback(
    async (reason) => {
      const result = await adapterRef.current.cancelSubscription(reason);
      if (result.success) await refresh();
      return result;
    },
    [refresh]
  );
  const getPortalUrl = useCallback(async () => {
    const uid = userId?.trim();
    if (!uid) throw new Error("No authenticated user");
    return adapterRef.current.getPortalUrl(uid);
  }, [userId]);
  const value = useMemo(
    () => ({
      status,
      loading,
      refresh,
      startCheckout,
      syncSubscription,
      getBillingHistory,
      cancelSubscription,
      getPortalUrl
    }),
    [status, loading, refresh, startCheckout, syncSubscription, getBillingHistory, cancelSubscription, getPortalUrl]
  );
  return /* @__PURE__ */ jsx(PolarContext.Provider, { value, children });
}
function usePolarBilling() {
  const ctx = useContext(PolarContext);
  if (!ctx) throw new Error("usePolarBilling must be used within <PolarProvider>");
  return ctx;
}
var useSubscription = usePolarBilling;
export {
  FREE_PLAN,
  PolarProvider,
  SUBSCRIPTION_STATUS,
  createFirebaseAdapter,
  createSupabaseAdapter,
  normalizeBillingCycle,
  normalizeStatus,
  usePolarBilling,
  useSubscription
};
