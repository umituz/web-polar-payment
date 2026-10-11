/**
 * Billing Portal Types
 *
 * View-model types for the hosted billing portal (plans, subscription,
 * payment methods, invoices, usage). These are deliberately kept separate
 * from the Polar domain entities — the portal renders whatever the host's
 * `BillingApiClient` returns, and `PlanTier` is a UI projection, not a
 * Polar shape. The only shared contract is `BillingCycle`, imported from
 * the domain enum so wire values stay canonical.
 */

import type { ReactNode } from 'react';
import { BILLING_CYCLE } from '../../domain/enums/billing-cycle.enum';
import type { BillingCycle } from '../../domain/enums/billing-cycle.enum';
import { SUBSCRIPTION_STATUS, INVOICE_STATUS, CURRENCY } from './constants';
import type { BillingLabelsOverrides } from './labels';

export { BILLING_CYCLE };
export type { BillingCycle } from '../../domain/enums/billing-cycle.enum';

/**
 * Subscription status
 */
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];

/**
 * Invoice status
 */
export type InvoiceStatus = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];

/**
 * Plan type - dynamic string from product provider
 */
export type PlanType = string;

/**
 * Currency
 */
export type Currency = typeof CURRENCY[keyof typeof CURRENCY];

/**
 * A single feature line — plain string or a rich entry with emphasis and
 * inclusion flags (`included: false` renders as struck-through).
 */
export type PlanFeature = string | { text: string; bold?: boolean; included?: boolean };

/**
 * Plan pricing tier
 */
export interface PlanTier {
  /** Plan ID */
  id: string;
  /** Plan type - optional, from product metadata */
  type?: PlanType;
  /** Plan name */
  name: string;
  /** Plan description */
  description: string;
  /** Badge text */
  badge?: string;
  /** Badge color */
  badgeColor?: string;
  /** Monthly price */
  monthlyPrice: number;
  /** Yearly price */
  yearlyPrice: number;
  /** Currency */
  currency: Currency;
  /** Features list */
  features: PlanFeature[];
  /** Highlight/recommend */
  highlight?: boolean;
  /** Maximum users/seats */
  maxUsers?: number;
  /** Storage limit in GB */
  storageLimit?: number;
  /** API call limit */
  apiLimit?: number;
}

/**
 * Subscription info
 */
export interface Subscription {
  /** Subscription ID */
  id: string;
  /** Plan ID */
  planId: string;
  /** Plan details */
  plan: PlanTier;
  /** Subscription status */
  status: SubscriptionStatus;
  /** Billing cycle */
  cycle: BillingCycle;
  /** Current period start */
  currentPeriodStart: string;
  /** Current period end */
  currentPeriodEnd: string;
  /** Cancel at period end */
  cancelAtPeriodEnd?: boolean;
  /** Trial end date */
  trialEnd?: string;
  /** User/seat count */
  seats?: number;
}

/**
 * Payment method type
 */
export type PaymentMethodType = 'card' | 'bank_account' | 'wallet';

/**
 * Payment method
 */
export interface PaymentMethod {
  /** Payment method ID */
  id: string;
  /** Type */
  type: PaymentMethodType;
  /** Is default */
  isDefault: boolean;
  /** Card details */
  card?: {
    /** Last 4 digits */
    last4: string;
    /** Brand (Visa, Mastercard) */
    brand: string;
    /** Expiry month */
    expiryMonth: number;
    /** Expiry year */
    expiryYear: number;
    /** Cardholder name */
    name?: string;
  };
  /** Bank account details */
  bankAccount?: {
    /** Last 4 digits */
    last4: string;
    /** Bank name */
    bankName: string;
    /** Account type */
    accountType?: 'checking' | 'savings';
  };
  /** Created date */
  createdAt: string;
}

/**
 * Invoice item
 */
export interface InvoiceItem {
  /** Item description */
  description: string;
  /** Quantity */
  quantity: number;
  /** Unit price */
  unitPrice: number;
  /** Amount */
  amount: number;
}

/**
 * Invoice
 */
export interface Invoice {
  /** Invoice ID */
  id: string;
  /** Invoice number */
  number: string;
  /** Amount */
  amount: number;
  /** Currency */
  currency: Currency;
  /** Status */
  status: InvoiceStatus;
  /** Invoice date */
  date: string;
  /** Due date */
  dueDate: string;
  /** Paid date */
  paidAt?: string;
  /** Invoice URL */
  invoiceUrl?: string;
  /** PDF download URL */
  pdfUrl?: string;
  /** Line items */
  items?: InvoiceItem[];
  /** Subtotal */
  subtotal?: number;
  /** Tax amount */
  tax?: number;
  /** Total amount */
  total?: number;
}

/**
 * Usage metric
 */
export interface UsageMetric {
  /** Metric ID */
  id: string;
  /** Metric name */
  name: string;
  /** Current usage */
  current: number;
  /** Limit */
  limit: number;
  /** Unit */
  unit: string;
  /** Reset period */
  resetPeriod: 'daily' | 'monthly' | 'yearly';
  /** Reset date */
  resetAt?: string;
}

/**
 * Billing summary — the single payload `BillingApiClient.loadBilling` returns.
 */
export interface BillingSummary {
  /** Current subscription */
  subscription: Subscription;
  /** Payment methods */
  paymentMethods: PaymentMethod[];
  /** Default payment method */
  defaultPaymentMethod?: PaymentMethod;
  /** Upcoming invoice */
  upcomingInvoice?: {
    amount: number;
    currency: Currency;
    date: string;
  };
  /** Usage metrics */
  usage: UsageMetric[];
  /** Recent invoices */
  recentInvoices: Invoice[];
}

/**
 * Input shape for adding a new payment method.
 * Providers can extend this via a discriminated union on `type`.
 */
export type PaymentMethodInput =
  | {
      type: 'card';
      last4: string;
      brand: string;
      expiryMonth: number;
      expiryYear: number;
      name?: string;
    }
  | {
      type: 'bank_account';
      last4: string;
      bankName: string;
      accountType?: 'checking' | 'savings';
    };

/**
 * Plan comparison props
 */
export interface PlanComparisonProps {
  /** Available plans */
  plans: PlanTier[];
  /** Selected plan ID */
  selectedPlan?: string;
  /** Billing cycle */
  cycle: BillingCycle;
  /** Show yearly toggle */
  showCycleToggle?: boolean;
  /** Show features */
  showFeatures?: boolean;
  /** On plan select */
  onPlanSelect?: (planId: string) => void;
  /** On cycle change */
  onCycleChange?: (cycle: BillingCycle) => void;
  /** Loading state */
  loading?: boolean;
  /** User-facing strings — override any subset for localization */
  labels?: BillingLabelsOverrides;
}

/**
 * Payment methods list props
 */
export interface PaymentMethodsListProps {
  /** Payment methods */
  paymentMethods: PaymentMethod[];
  /** Loading state */
  loading?: boolean;
  /** ID of the method currently being mutated (set default / remove) */
  busyId?: string | null;
  /** On set default */
  onSetDefault?: (methodId: string) => void;
  /** On remove */
  onRemove?: (methodId: string) => void;
  /** On add new */
  onAddNew?: () => void;
}

/**
 * Invoice card props
 */
export interface InvoiceCardProps {
  /** Invoice data */
  invoice: Invoice;
  /** Compact view */
  compact?: boolean;
  /** On click */
  onClick?: (invoice: Invoice) => void;
  /** On download (overrides default window.open) */
  onDownload?: (invoice: Invoice) => void;
  /** Locale for date formatting (default: en-US) */
  locale?: string;
}

/**
 * Usage card props
 */
export interface UsageCardProps {
  /** Usage metric */
  metric: UsageMetric;
  /** Locale for date/number formatting (default: en-US) */
  locale?: string;
  /** Show progress bar */
  showProgress?: boolean;
  /** Show limit */
  showLimit?: boolean;
}

/**
 * Billing portal tab identifiers — typed union to keep tabs exhaustive.
 */
export type BillingTabId = 'overview' | 'payment-methods' | 'invoices' | 'plan';

/**
 * Billing portal props
 */
export interface BillingPortalProps {
  /** Billing summary */
  billing: BillingSummary;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
  /** Show tabs */
  showTabs?: boolean;
  /** Active tab */
  activeTab?: BillingTabId;
  /** Locale for date/number formatting (default: en-US) */
  locale?: string;
  /** On tab change */
  onTabChange?: (tab: BillingTabId) => void;
  /** On add payment method */
  onAddPaymentMethod?: () => void;
  /** On set default payment method */
  onSetDefaultPaymentMethod?: (methodId: string) => void;
  /** On remove payment method */
  onRemovePaymentMethod?: (methodId: string) => void;
  /** On view invoice */
  onViewInvoice?: (invoice: Invoice) => void;
  /** On change plan */
  onChangePlan?: () => void;
  /** On cancel subscription */
  onCancelSubscription?: () => void | Promise<void>;
  /** User-facing strings — override any subset for localization */
  labels?: BillingLabelsOverrides;
}

/**
 * Billing layout props
 */
export interface BillingLayoutProps {
  /** Billing configuration */
  config: BillingConfig;
  /** Children content */
  children?: ReactNode;
  /**
   * SPA navigation for the "back to dashboard" affordance. When omitted,
   * a plain `<a href={config.cancelRoute}>` is rendered — the portal
   * itself stays router-free.
   */
  onBack?: () => void;
}

/**
 * Billing configuration
 */
export interface BillingConfig {
  /** Brand name */
  brandName: string;
  /** Brand mark — any ReactNode (e.g. the host's own logo component) */
  logo?: ReactNode;
  /** Available plans */
  plans: PlanTier[];
  /** Supported currencies */
  currencies?: Currency[];
  /** Default currency */
  defaultCurrency?: Currency;
  /** Enable yearly discounts */
  enableYearlyDiscount?: boolean;
  /** Yearly discount percentage */
  yearlyDiscount?: number;
  /** Tax rate */
  taxRate?: number;
  /** Support email */
  supportEmail?: string;
  /** Cancel subscription route */
  cancelRoute?: string;
  /** Update payment route */
  updatePaymentRoute?: string;
  /** Invoice history route */
  invoiceHistoryRoute?: string;
}

/**
 * BillingPage props — BillingPortalProps minus showTabs, plus config.
 */
export interface BillingPageProps extends Omit<BillingPortalProps, 'showTabs'> {
  /** Billing configuration */
  config: BillingConfig;
}
