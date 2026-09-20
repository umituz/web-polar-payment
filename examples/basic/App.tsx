/**
 * @umituz/web-polar-payment — basic usage example.
 *
 * Demonstrates:
 *   - Building a Firebase adapter
 *   - Wrapping the app in <PolarProvider>
 *   - Reading state with usePolarBilling
 *   - Rendering the included UI components
 */

import { useState } from 'react';
import {
  PolarProvider,
  createFirebaseAdapter,
  SubscriptionStatusBadge,
  PricingTable,
  BillingHistoryList,
  CustomerPortalLink,
  CancelSubscriptionButton,
  usePolarBilling,
} from '@umituz/web-polar-payment';
import { getFunctions } from 'firebase/functions';
import { getFirestore } from 'firebase/firestore';

const adapter = createFirebaseAdapter({
  functions: getFunctions(),
  firestore: getFirestore(),
});

function AccountPage() {
  const { status, loading, refresh } = usePolarBilling();
  const [polarApiToken] = useState<string | undefined>(undefined); // OAT — server only

  if (loading) return <p>Loading subscription…</p>;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24, display: 'grid', gap: 24 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Account</h1>
        <SubscriptionStatusBadge />
      </header>

      <section>
        <h2>Current plan</h2>
        <p>Plan: <strong>{status.plan}</strong></p>
        {status.currentPeriodEnd ? (
          <p>Renews on {status.currentPeriodEnd.slice(0, 10)}</p>
        ) : null}
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button type="button" onClick={() => void refresh()}>
            Refresh
          </button>
          <CustomerPortalLink target="open" />
          <CancelSubscriptionButton onSuccess={() => void refresh()} />
        </div>
      </section>

      <section>
        <h2>Billing history</h2>
        <BillingHistoryList />
      </section>

      {polarApiToken ? (
        <section>
          <h2>Available plans</h2>
          <PricingTable apiToken={polarApiToken} />
        </section>
      ) : null}
    </main>
  );
}

export function App({ userId }: { userId?: string }) {
  return (
    <PolarProvider adapter={adapter} userId={userId}>
      <AccountPage />
    </PolarProvider>
  );
}
