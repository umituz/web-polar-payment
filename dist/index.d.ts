import * as firebase_firestore from 'firebase/firestore';
import * as firebase_functions from 'firebase/functions';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode } from 'react';

type SubscriptionStatusValue = 'active' | 'canceled' | 'revoked' | 'trialing' | 'past_due' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'none';
type BillingCycle = 'monthly' | 'yearly';
interface SubscriptionStatus {
    plan: string;
    subscriptionId?: string;
    subscriptionStatus: SubscriptionStatusValue;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: string;
    billingCycle?: BillingCycle;
    polarCustomerId?: string;
    /** Token balance (for token-based projects like Aria) */
    tokens?: number;
}
interface OrderItem {
    id: string;
    createdAt: string;
    amount: number;
    currency: string;
    status: string;
    paid: boolean;
    productName: string;
    invoiceUrl?: string;
}
interface CheckoutParams {
    productId: string;
    planKey?: string;
    billingCycle?: BillingCycle;
    successUrl?: string;
    /** Injected automatically by PolarProvider — do not pass manually */
    userId?: string;
}
interface CheckoutResult {
    url: string;
    id: string;
}
type CancellationReason = 'too_expensive' | 'missing_features' | 'switched_service' | 'unused' | 'customer_service' | 'low_quality' | 'too_complex' | 'other';
interface CancelResult {
    success: boolean;
    endsAt?: string;
}
interface SyncResult {
    synced: boolean;
    plan?: string;
}

declare const SUBSCRIPTION_STATUS: {
    ACTIVE: "active";
    CANCELED: "canceled";
    REVOKED: "revoked";
    TRIALING: "trialing";
    PAST_DUE: "past_due";
    INCOMPLETE: "incomplete";
    INCOMPLETE_EXPIRED: "incomplete_expired";
    UNPAID: "unpaid";
    NONE: "none";
};
declare const FREE_PLAN = "free";
/**
 * Normalize a raw Polar status string to a known value.
 * Defaults to 'none' (not 'canceled') so unknown statuses don't
 * accidentally revoke a user's access.
 */
declare function normalizeStatus(raw: string): SubscriptionStatusValue;
/** Normalize billing interval ('month' → 'monthly', 'year' → 'yearly') */
declare function normalizeBillingCycle(interval: string): 'monthly' | 'yearly';

/**
 * Backend-agnostic interface every adapter must implement.
 * All adapters receive checkoutId from the context layer (never read from window.location).
 */
interface PolarAdapter {
    getStatus(userId: string): Promise<SubscriptionStatus>;
    createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
    /** checkoutId is read from URL by the context and passed explicitly */
    syncSubscription(userId: string, checkoutId?: string): Promise<SyncResult>;
    getBillingHistory(userId: string): Promise<OrderItem[]>;
    cancelSubscription(reason?: CancellationReason): Promise<CancelResult>;
    getPortalUrl(userId: string): Promise<string>;
}

interface SupabaseAdapterConfig {
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
declare function createSupabaseAdapter(config: SupabaseAdapterConfig): PolarAdapter;

type FirebaseFunctions = firebase_functions.Functions;
type FirebaseFirestore = firebase_firestore.Firestore;
interface FirebaseAdapterConfig {
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
declare function createFirebaseAdapter(config: FirebaseAdapterConfig): PolarAdapter;

interface PolarContextValue {
    status: SubscriptionStatus;
    loading: boolean;
    refresh: () => Promise<void>;
    startCheckout: (params: CheckoutParams) => Promise<void>;
    syncSubscription: () => Promise<SyncResult>;
    getBillingHistory: () => Promise<OrderItem[]>;
    cancelSubscription: (reason?: CancellationReason) => Promise<CancelResult>;
    getPortalUrl: () => Promise<string>;
}
interface PolarProviderProps {
    adapter: PolarAdapter;
    userId?: string;
    children: ReactNode;
}
declare function PolarProvider({ adapter, userId, children }: PolarProviderProps): react_jsx_runtime.JSX.Element;
declare function usePolarBilling(): PolarContextValue;
declare const useSubscription: typeof usePolarBilling;

export { type BillingCycle, type CancelResult, type CancellationReason, type CheckoutParams, type CheckoutResult, FREE_PLAN, type FirebaseAdapterConfig, type OrderItem, type PolarAdapter, PolarProvider, SUBSCRIPTION_STATUS, type SubscriptionStatus, type SubscriptionStatusValue, type SupabaseAdapterConfig, type SyncResult, createFirebaseAdapter, createSupabaseAdapter, normalizeBillingCycle, normalizeStatus, usePolarBilling, useSubscription };
