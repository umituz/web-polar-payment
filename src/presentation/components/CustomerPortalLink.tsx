/**
 * `<CustomerPortalLink>` — link out to the Polar customer portal.
 *
 * Polar's customer portal lets the user update payment methods,
 * change plan, view invoices, and cancel. This component fetches the
 * URL on demand and navigates.
 */

import { useState } from 'react';
import { usePolarBilling } from '../context/polar-context';
import { InlineErrorVisual } from '../utils/inline-error-visual';
import { VisualTokens } from '../theme/visual-tokens';

export interface CustomerPortalLinkProps {
  label?: string;
  /**
   * `'redirect'` performs a full-page navigation (the portal requires
   * it for cookie-based session). `'open'` opens in a new tab.
   */
  target?: 'redirect' | 'open';
  className?: string;
  /** User-facing strings — override any subset for localization. */
  labels?: CustomerPortalLinkLabels;
}

/** User-facing strings — override any subset for localization. */
export interface CustomerPortalLinkLabels {
  /** Shown while the portal URL is being fetched. */
  loading?: string;
}

const DEFAULT_LABEL = 'Manage subscription';
const DEFAULT_LOADING_LABEL = 'Opening…';

export function CustomerPortalLink({
  label = DEFAULT_LABEL,
  target = 'open',
  className,
  labels,
}: CustomerPortalLinkProps) {
  const { getPortalUrl } = usePolarBilling();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingLabel = labels?.loading ?? DEFAULT_LOADING_LABEL;

  const open = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = await getPortalUrl();
      if (target === 'open') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open portal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: VisualTokens.spacing.xs }}>
      <button
        type="button"
        onClick={() => void open()}
        disabled={loading}
        className={className}
        style={{
          background: 'transparent',
          color: VisualTokens.color.brandPrimary,
          border: 'none',
          padding: 0,
          textDecoration: 'underline',
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? loadingLabel : label}
      </button>
      {InlineErrorVisual.element(error)}
    </span>
  );
}
