/**
 * useBilling
 *
 * Pure state + side-effect container for the billing portal.
 * No mock data, no commented-out API stubs — all persistence
 * goes through the `apiClient` injected via options.
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  BillingSummary,
  BillingCycle,
  PaymentMethod,
  PaymentMethodInput,
  Invoice,
} from '../types';
import { DEFAULT_BILLING_CONFIG } from '../constants';

export type { Invoice };

/**
 * API client contract — implementations can be a real fetch wrapper
 * or a test double.
 */
export interface BillingApiClient {
  loadBilling: () => Promise<BillingSummary>;
  updatePlan: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  updateCycle: (cycle: BillingCycle) => Promise<void>;
  addPaymentMethod: (input: PaymentMethodInput) => Promise<PaymentMethod>;
  removePaymentMethod: (methodId: string) => Promise<void>;
  setDefaultPaymentMethod: (methodId: string) => Promise<void>;
  getInvoiceUrl: (invoiceId: string) => Promise<string>;
}

export interface UseBillingOptions {
  /** Initial billing data (avoids loading flash on mount) */
  initialData?: BillingSummary;
  /** API client — required to actually persist mutations */
  apiClient: BillingApiClient;
}

export interface UseBillingReturn {
  billing: BillingSummary | null;
  isLoading: boolean;
  error: string | null;
  loadBilling: () => Promise<void>;
  updatePlan: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  updateCycle: (cycle: BillingCycle) => Promise<void>;
  addPaymentMethod: (input: PaymentMethodInput) => Promise<PaymentMethod | null>;
  removePaymentMethod: (methodId: string) => Promise<void>;
  setDefaultPaymentMethod: (methodId: string) => Promise<void>;
  getInvoiceUrl: (invoiceId: string) => Promise<string | null>;
}

/**
 * Translate a thrown value into a user-facing error message.
 * Non-Error throws are surfaced as a generic message — never
 * as the raw thrown value (which can be a string, object, or symbol).
 */
const toErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

/**
 * Wrap an async billing action with the standard
 * isLoading + error contract. Errors are both surfaced to state
 * and re-thrown so the caller can react when needed.
 */
const executeBillingAction = async <T>(
  setIsLoading: (loading: boolean) => void,
  setError: (message: string | null) => void,
  fallbackMessage: string,
  action: () => Promise<T>,
): Promise<T | null> => {
  setIsLoading(true);
  setError(null);
  try {
    return await action();
  } catch (err) {
    setError(toErrorMessage(err, fallbackMessage));
    return null;
  } finally {
    setIsLoading(false);
  }
};

export function useBilling(options: UseBillingOptions): UseBillingReturn {
  const { initialData, apiClient } = options;

  const [billing, setBilling] = useState<BillingSummary | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    const result = await executeBillingAction(setIsLoading, setError, 'Failed to load billing', () =>
      apiClient.loadBilling(),
    );
    if (result) setBilling(result);
  }, [apiClient]);

  const updatePlan = useCallback(
    async (planId: string) => {
      await executeBillingAction(setIsLoading, setError, 'Failed to update plan', () =>
        apiClient.updatePlan(planId).then(() => {
          setBilling((prev) =>
            prev
              ? { ...prev, subscription: { ...prev.subscription, planId } }
              : prev,
          );
        }),
      );
    },
    [apiClient],
  );

  const cancelSubscription = useCallback(async () => {
    await executeBillingAction(setIsLoading, setError, 'Failed to cancel subscription', () =>
      apiClient.cancelSubscription().then(() => {
        setBilling((prev) =>
          prev
            ? {
                ...prev,
                subscription: {
                  ...prev.subscription,
                  status: 'canceled',
                  cancelAtPeriodEnd: true,
                },
              }
            : prev,
        );
      }),
    );
  }, [apiClient]);

  const updateCycle = useCallback(
    async (cycle: BillingCycle) => {
      await executeBillingAction(setIsLoading, setError, 'Failed to update cycle', () =>
        apiClient.updateCycle(cycle).then(() => {
          setBilling((prev) =>
            prev
              ? { ...prev, subscription: { ...prev.subscription, cycle } }
              : prev,
          );
        }),
      );
    },
    [apiClient],
  );

  const addPaymentMethod = useCallback(
    async (input: PaymentMethodInput): Promise<PaymentMethod | null> => {
      return executeBillingAction(setIsLoading, setError, 'Failed to add payment method', () =>
        apiClient.addPaymentMethod(input).then((method) => {
          setBilling((prev) =>
            prev ? { ...prev, paymentMethods: [...prev.paymentMethods, method] } : prev,
          );
          return method;
        }),
      );
    },
    [apiClient],
  );

  const removePaymentMethod = useCallback(
    async (methodId: string) => {
      await executeBillingAction(setIsLoading, setError, 'Failed to remove payment method', () =>
        apiClient.removePaymentMethod(methodId).then(() => {
          setBilling((prev) =>
            prev
              ? {
                  ...prev,
                  paymentMethods: prev.paymentMethods.filter((pm) => pm.id !== methodId),
                }
              : prev,
          );
        }),
      );
    },
    [apiClient],
  );

  const setDefaultPaymentMethod = useCallback(
    async (methodId: string) => {
      await executeBillingAction(setIsLoading, setError, 'Failed to set default payment method', () =>
        apiClient.setDefaultPaymentMethod(methodId).then(() => {
          setBilling((prev) => {
            if (!prev) return prev;
            const methods = prev.paymentMethods.map((pm) => ({
              ...pm,
              isDefault: pm.id === methodId,
            }));
            const defaultPaymentMethod = methods.find((pm) => pm.id === methodId);
            return { ...prev, paymentMethods: methods, defaultPaymentMethod };
          });
        }),
      );
    },
    [apiClient],
  );

  const getInvoiceUrl = useCallback(
    async (invoiceId: string): Promise<string | null> => {
      const result = await executeBillingAction(
        setIsLoading,
        setError,
        'Failed to get invoice URL',
        () => apiClient.getInvoiceUrl(invoiceId),
      );
      return result;
    },
    [apiClient],
  );

  return useMemo(
    () => ({
      billing,
      isLoading,
      error,
      loadBilling,
      updatePlan,
      cancelSubscription,
      updateCycle,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
      getInvoiceUrl,
    }),
    [
      billing,
      isLoading,
      error,
      loadBilling,
      updatePlan,
      cancelSubscription,
      updateCycle,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
      getInvoiceUrl,
    ],
  );
}

/**
 * Convenience factory: creates a no-op API client useful for tests
 * and Storybook. Throws by default so dev mistakes surface fast.
 */
export const createStubBillingApiClient = (
  overrides?: Partial<BillingApiClient>,
): BillingApiClient => {
  const notConfigured: BillingApiClient = {
    loadBilling: () => Promise.reject(new Error('BillingApiClient not configured')),
    updatePlan: () => Promise.reject(new Error('BillingApiClient not configured')),
    cancelSubscription: () => Promise.reject(new Error('BillingApiClient not configured')),
    updateCycle: () => Promise.reject(new Error('BillingApiClient not configured')),
    addPaymentMethod: () => Promise.reject(new Error('BillingApiClient not configured')),
    removePaymentMethod: () => Promise.reject(new Error('BillingApiClient not configured')),
    setDefaultPaymentMethod: () => Promise.reject(new Error('BillingApiClient not configured')),
    getInvoiceUrl: () => Promise.reject(new Error('BillingApiClient not configured')),
  };
  return { ...notConfigured, ...overrides };
};

export { DEFAULT_BILLING_CONFIG };
