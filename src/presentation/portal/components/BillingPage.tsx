/**
 * BillingPage
 *
 * Compose BillingLayout + BillingPortal. Brand name and support
 * contact are required — there's no silent fallback brand that
 * pretends everything is fine when the consumer forgets to
 * provide them.
 */

import { BillingLayout, BillingPortal } from '.';
import type { BillingConfig, BillingPageProps } from '../types';
import { DEFAULT_BILLING_CONFIG } from '../constants';
import { BillingLabelsProvider } from '../labels';

export const BillingPage = ({ config, labels, ...portalProps }: BillingPageProps) => {
  const mergedConfig: BillingConfig = {
    ...DEFAULT_BILLING_CONFIG,
    ...config,
  };

  return (
    <BillingLabelsProvider labels={labels}>
      <BillingLayout config={mergedConfig}>
        <BillingPortal showTabs {...portalProps} />
      </BillingLayout>
    </BillingLabelsProvider>
  );
};

export default BillingPage;
