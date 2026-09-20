/**
 * Polar checkout-return handler.
 *
 * Drop this component on the route that matches your Polar `success_url`.
 * On mount it pulls `checkout_id` from the URL, calls `syncSubscription`,
 * and surfaces the resulting state.
 */

import { useEffect, useState } from 'react';
import { usePolarBilling, type SyncResult } from '@umituz/web-polar-payment';

export function CheckoutReturn() {
  const { syncSubscription, status } = usePolarBilling();
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await syncSubscription();
        if (!cancelled) setResult(r);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Sync failed');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncSubscription]);

  if (error) {
    return (
      <div role="alert" style={{ padding: 24 }}>
        <h1>Sync failed</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!result) {
    return <p style={{ padding: 24 }}>Syncing your subscription…</p>;
  }

  if (!result.synced) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Almost there</h1>
        <p>We could not link this checkout to your account yet. Refresh in a minute.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>You're on the {result.plan ?? status.plan} plan</h1>
      <p>Thanks for subscribing.</p>
    </div>
  );
}
