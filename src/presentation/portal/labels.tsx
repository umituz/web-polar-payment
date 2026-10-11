/**
 * Billing Portal Labels
 *
 * The portal ships zero i18n dependencies. Every user-facing string lives
 * in one frozen English catalog; hosts override any subset via the
 * `labels` prop (or `<BillingLabelsProvider>`) — the same contract the
 * rest of this SDK's components (`PricingTableLabels`, …) follow, scaled
 * to a multi-tab portal.
 *
 * Interpolated strings use `{param}` placeholders, replaced by
 * `formatLabel` — translation catalogs stay plain string maps.
 */

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { InvoiceStatus, SubscriptionStatus } from './types';

/** Replace every `{param}` placeholder in a label template. */
export function formatLabel(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

/**
 * The full label catalog. `status` / `invoiceStatus` are keyed records so
 * every enum value is translatable without string surgery.
 */
export interface BillingLabels {
  /** Strings shared across multiple sections. */
  common: {
    loading: string;
    usage: string;
  };
  page: {
    backToDashboard: string;
    title: string;
    description: string;
    needHelp: string;
    /** Template with `{email}`. */
    contactAria: string;
  };
  tabs: {
    overview: string;
    paymentMethods: string;
    invoices: string;
    plan: string;
  };
  overview: {
    currentSubscription: string;
    trialDaysLeft: string;
    nextBilling: string;
    upcomingInvoice: string;
  };
  invoices: {
    empty: string;
    moreItems: string;
    due: string;
    viewInvoice: string;
    downloadPdf: string;
  };
  plan: {
    title: string;
    actionsTitle: string;
    changePlan: string;
    cancelSubscription: string;
    confirmCancel: string;
    cancelling: string;
    cancelConfirmMessage: string;
    cancelFailed: string;
  };
  planComparison: {
    monthly: string;
    yearly: string;
    monthlyShort: string;
    yearlyShort: string;
    /** Template with `{percent}`. */
    save: string;
    /** Template with `{percent}`. */
    saveWithYearly: string;
    mostPopular: string;
    currentPlan: string;
    selectPlan: string;
    processing: string;
    billingCycleLabel: string;
    radiogroupLabel: string;
  };
  paymentMethods: {
    none: string;
    add: string;
    bankAccount: string;
    expires: string;
    default: string;
    setDefault: string;
    remove: string;
    removeConfirm: string;
    confirmRemove: string;
    cancelRemove: string;
  };
  usage: {
    limit: string;
    resets: string;
  };
  status: Record<SubscriptionStatus, string>;
  invoiceStatus: Record<InvoiceStatus, string>;
}

/** Partial, one-level-deep override shape of {@link BillingLabels}. */
export type BillingLabelsOverrides = {
  [K in keyof BillingLabels]?: BillingLabels[K] extends string
    ? string
    : { [K2 in keyof BillingLabels[K]]?: BillingLabels[K][K2] };
};

export const DEFAULT_BILLING_LABELS: Readonly<BillingLabels> = Object.freeze({
  common: Object.freeze({
    loading: 'Loading…',
    usage: 'usage',
  }),
  page: Object.freeze({
    backToDashboard: 'Back to dashboard',
    title: 'Billing',
    description: 'Manage your subscription, payment methods, and invoices.',
    needHelp: 'Need help?',
    contactAria: 'Contact {email}',
  }),
  tabs: Object.freeze({
    overview: 'Overview',
    paymentMethods: 'Payment Methods',
    invoices: 'Invoices',
    plan: 'Plan',
  }),
  overview: Object.freeze({
    currentSubscription: 'Current Subscription',
    trialDaysLeft: 'days left in trial',
    nextBilling: 'Next billing:',
    upcomingInvoice: 'Upcoming Invoice',
  }),
  invoices: Object.freeze({
    empty: 'No invoices yet',
    moreItems: 'more items',
    due: 'Due',
    viewInvoice: 'View invoice',
    downloadPdf: 'Download PDF',
  }),
  plan: Object.freeze({
    title: 'Current Plan',
    actionsTitle: 'Plan Actions',
    changePlan: 'Change Plan',
    cancelSubscription: 'Cancel Subscription',
    confirmCancel: 'Click again to confirm',
    cancelling: 'Cancelling…',
    cancelConfirmMessage:
      'Your subscription stays active until the end of the current billing period.',
    cancelFailed: 'Failed to cancel subscription. Please try again.',
  }),
  planComparison: Object.freeze({
    monthly: 'Monthly',
    yearly: 'Yearly',
    monthlyShort: 'mo',
    yearlyShort: 'yr',
    save: 'Save {percent}%',
    saveWithYearly: 'Save {percent}% with yearly billing',
    mostPopular: 'Most Popular',
    currentPlan: 'Current Plan',
    selectPlan: 'Select Plan',
    processing: 'Processing…',
    billingCycleLabel: 'Billing cycle',
    radiogroupLabel: 'Available plans',
  }),
  paymentMethods: Object.freeze({
    none: 'No payment methods on file',
    add: 'Add Payment Method',
    bankAccount: 'Bank Account',
    expires: 'Expires',
    default: 'Default',
    setDefault: 'Set as default',
    remove: 'Remove',
    removeConfirm: 'Remove this payment method?',
    confirmRemove: 'Remove',
    cancelRemove: 'Cancel',
  }),
  usage: Object.freeze({
    limit: 'limit',
    resets: 'Resets',
  }),
  status: Object.freeze({
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past Due',
    canceled: 'Canceled',
    unpaid: 'Unpaid',
    incomplete: 'Incomplete',
    revoked: 'Revoked',
  }),
  invoiceStatus: Object.freeze({
    draft: 'Draft',
    open: 'Open',
    paid: 'Paid',
    void: 'Void',
    uncollectible: 'Uncollectible',
    refunded: 'Refunded',
  }),
});

/**
 * Deep-merge a partial override over the default catalog. Only this
 * package's fixed two-level shape is handled — no generic deep merge.
 */
export function mergeLabels(overrides?: BillingLabelsOverrides): BillingLabels {
  if (!overrides) return { ...DEFAULT_BILLING_LABELS } as BillingLabels;
  const merged = { ...DEFAULT_BILLING_LABELS } as BillingLabels;
  for (const key of Object.keys(overrides) as (keyof BillingLabelsOverrides)[]) {
    const override = overrides[key];
    if (override === undefined) continue;
    const base = DEFAULT_BILLING_LABELS[key];
    const target = merged as unknown as Record<string, unknown>;
    if (typeof base === 'string' || typeof override === 'string') {
      target[key] = override;
    } else {
      target[key] = { ...base, ...override };
    }
  }
  return merged;
}

const BillingLabelsContext = createContext<BillingLabels>(
  DEFAULT_BILLING_LABELS as BillingLabels,
);

/**
 * Scope label overrides to a portal subtree. Components read the merged
 * catalog via {@link useBillingLabels}; without a provider the frozen
 * English defaults apply.
 */
export function BillingLabelsProvider({
  labels,
  children,
}: {
  labels?: BillingLabelsOverrides;
  children: ReactNode;
}) {
  const value = useMemo(() => mergeLabels(labels), [labels]);
  return <BillingLabelsContext.Provider value={value}>{children}</BillingLabelsContext.Provider>;
}

/** Merged label catalog for this subtree. */
export function useBillingLabels(): BillingLabels {
  return useContext(BillingLabelsContext);
}
