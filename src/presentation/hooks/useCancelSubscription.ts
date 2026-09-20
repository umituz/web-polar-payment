/**
 * useCancelSubscription — encapsulates the cancel flow.
 *
 * Mirrors `useCheckoutButton` so the loading/error states live in one place
 * and can be composed into buttons, dialogs, or full-page forms.
 */

import { useCallback, useState } from 'react';
import type { CancellationReason, CancelResult } from '../../domain/entities/cancellation.entity';
import { usePolarBilling } from '../context/polar-context';

export interface UseCancelSubscriptionOptions {
  onError?: (error: Error) => void;
  onSuccess?: (result: CancelResult) => void;
}

export interface UseCancelSubscriptionResult {
  cancel: (reason?: CancellationReason) => Promise<CancelResult | null>;
  loading: boolean;
  error: Error | null;
}

export function useCancelSubscription(
  options: UseCancelSubscriptionOptions = {},
): UseCancelSubscriptionResult {
  const { cancelSubscription } = usePolarBilling();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { onSuccess, onError } = options;

  const cancel = useCallback(
    async (reason?: CancellationReason): Promise<CancelResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await cancelSubscription(reason);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        setError(normalized);
        onError?.(normalized);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [cancelSubscription, onSuccess, onError],
  );

  return { cancel, loading, error };
}
