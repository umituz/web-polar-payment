/**
 * PolarBillingPage — the turnkey composition of the billing portal over a
 * `PolarAdapter`. Data (useBilling), mutations (checkout / cancel / hosted
 * portal), plan selection and the tabbed portal UI are all wired here;
 * hosts provide the adapter, the server-fetched product catalog and the
 * brand config — nothing else.
 *
 * The cycle toggle is a view state: the chosen cycle is carried into the
 * checkout that plan selection starts.
 */

import { useMemo, useState } from 'react';
import type { PolarAdapter } from '../../../domain/interfaces';
import type { BillingCycle } from '../../../domain/entities';
import type { PolarProduct } from '../../../domain/entities';
import { NoopNavigationStrategy } from '../../navigation/navigation.strategy';
import type { NavigationStrategy } from '../../navigation/navigation.strategy';
import { useBilling } from '../hooks';
import { BillingPage, PlanComparison, PortalButton, PortalSpinner } from '../components';
import { transformPolarProducts } from '../utils';
import type { BillingLabelsOverrides } from '../labels';
import type { BillingConfig, PlanTier } from '../types';
import { createPolarPortalClient } from './create-polar-portal';

export interface PolarBillingPageProps {
  adapter: PolarAdapter;
  /** Server-fetched product catalog (never shipped with a token). */
  products: PolarProduct[];
  /** Branding — brandName is required, plans default to the catalog. */
  config: Omit<BillingConfig, 'plans'> & { plans?: PlanTier[] };
  /** Acting user/tenant id — forwarded to every adapter call. */
  userId?: string;
  /** Cycle used when a checkout carries none. Default `monthly`. */
  defaultCycle?: BillingCycle;
  /** Checkout return URL; `{CHECKOUT_ID}` templating supported. */
  successUrl?: string;
  /** Redirect strategy — defaults to `window.location` in browsers. */
  navigation?: NavigationStrategy;
  locale?: string;
  /** User-facing strings — override any subset for localization. */
  labels?: BillingLabelsOverrides;
  /** Called when a checkout or portal redirect fails before navigating. */
  onError?: (error: Error) => void;
}

function browserNavigation(): NavigationStrategy {
  if (typeof window === 'undefined') return new NoopNavigationStrategy();
  return {
    redirect(url: string): void {
      window.location.href = url;
    },
  };
}

export function PolarBillingPage({
  adapter,
  products,
  config,
  userId,
  defaultCycle,
  successUrl,
  navigation,
  locale,
  labels,
  onError,
}: PolarBillingPageProps) {
  const [cycle, setCycle] = useState<BillingCycle>(defaultCycle ?? 'monthly');
  const [selecting, setSelecting] = useState(false);

  const client = useMemo(
    () =>
      createPolarPortalClient({
        adapter,
        products,
        ...(userId !== undefined ? { userId } : {}),
        ...(defaultCycle !== undefined ? { defaultCycle } : {}),
        ...(successUrl !== undefined ? { successUrl } : {}),
        navigation: navigation ?? browserNavigation(),
      }),
    [adapter, products, userId, defaultCycle, successUrl, navigation],
  );

  const { billing, isLoading, error, loadBilling, cancelSubscription } = useBilling({ apiClient: client });

  const plans = config.plans ?? transformPolarProducts(products);

  const selectPlan = async (productId: string) => {
    setSelecting(true);
    try {
      await client.selectPlan(productId, cycle);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSelecting(false);
    }
  };

  const openPortalSafely = async () => {
    try {
      await client.openPortal();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const viewInvoice = async (invoiceId: string) => {
    try {
      await client.getInvoiceUrl(invoiceId);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const mergedConfig: BillingConfig = { ...config, plans };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      <PlanComparison
        plans={plans}
        selectedPlan={billing?.subscription.plan.id}
        cycle={cycle}
        onPlanSelect={(productId) => void selectPlan(productId)}
        onCycleChange={setCycle}
        loading={selecting}
        labels={labels}
      />

      {billing ? (
        <BillingPage
          config={mergedConfig}
          billing={billing}
          loading={isLoading}
          error={error ?? undefined}
          locale={locale}
          labels={labels}
          onAddPaymentMethod={() => void openPortalSafely()}
          onSetDefaultPaymentMethod={() => void openPortalSafely()}
          onRemovePaymentMethod={() => void openPortalSafely()}
          onViewInvoice={(invoice) => void viewInvoice(invoice.id)}
          onCancelSubscription={() => cancelSubscription().then(() => loadBilling())}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32 }}>
          {isLoading ? (
            <PortalSpinner />
          ) : error ? (
            <>
              <span>{error}</span>
              <PortalButton onClick={() => void loadBilling()}>Retry</PortalButton>
            </>
          ) : (
            <PortalSpinner />
          )}
        </div>
      )}
    </div>
  );
}
