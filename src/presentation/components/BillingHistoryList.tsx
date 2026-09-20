/**
 * `<BillingHistoryList>` — show the user's order history.
 *
 * Loads the billing history on mount (and exposes a refresh) and
 * renders each order as a row. Loading + empty + error states are
 * explicit.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { OrderItem } from '../../domain/entities/order.entity';
import { usePolarBilling } from '../context/polar-context';
import { MoneyFormatter } from '../../infrastructure/utils/money-formatter';
import { DateRenderer } from '../../infrastructure/utils/date-renderer';
import { VisualTokens } from '../theme/visual-tokens';

export interface BillingHistoryListProps {
  /**
   * Render the list immediately on mount. Set `false` for a "View history"
   * disclosure pattern.
   */
  autoLoad?: boolean;
  /**
   * Override the orders array. Used for tests / Storybook previews.
   */
  orders?: OrderItem[];
  loading?: boolean;
  /** Locale used for currency + date rendering (e.g. `"de-DE"`). */
  locale?: string;
  /** User-facing strings — override any subset for localization. */
  labels?: BillingHistoryListLabels;
}

/** User-facing strings — override any subset for localization. */
export interface BillingHistoryListLabels {
  loading?: string;
  empty?: string;
  refresh?: string;
  retry?: string;
  paid?: string;
  invoiceLink?: string;
  invoiceFallback?: string;
  colDate?: string;
  colProduct?: string;
  colStatus?: string;
  colAmount?: string;
  colInvoice?: string;
}

const DEFAULT_LABELS: Required<BillingHistoryListLabels> = Object.freeze({
  loading: 'Loading billing history…',
  empty: 'No invoices yet.',
  refresh: 'Refresh',
  retry: 'Retry',
  paid: 'Paid',
  invoiceLink: 'View',
  invoiceFallback: '—',
  colDate: 'Date',
  colProduct: 'Product',
  colStatus: 'Status',
  colAmount: 'Amount',
  colInvoice: 'Invoice',
});

export function BillingHistoryList({
  autoLoad = true,
  orders: ordersOverride,
  loading: loadingOverride,
  locale,
  labels,
}: BillingHistoryListProps) {
  const { getBillingHistory } = usePolarBilling();
  const [orders, setOrders] = useState<OrderItem[]>(ordersOverride ?? []);
  const [loading, setLoading] = useState(autoLoad && ordersOverride === undefined);
  const [error, setError] = useState<string | null>(null);

  const moneyFormatter = useMemo(() => new MoneyFormatter(locale), [locale]);
  const dateRenderer = useMemo(() => new DateRenderer(locale), [locale]);
  const text = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labels }),
    [labels],
  );

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const next = await getBillingHistory();
      setOrders(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing history');
    } finally {
      setLoading(false);
    }
  }, [getBillingHistory]);

  useEffect(() => {
    if (autoLoad && ordersOverride === undefined) {
      void refresh();
    }
  }, [autoLoad, ordersOverride, refresh]);

  if (ordersOverride !== undefined && ordersOverride.length > 0) {
    return renderList(ordersOverride, moneyFormatter, dateRenderer, text);
  }
  if (loadingOverride !== undefined && loadingOverride) {
    return <div role="status">{text.loading}</div>;
  }

  if (loading) {
    return <div role="status">{text.loading}</div>;
  }

  if (error) {
    return (
      <div
        role="alert"
        style={{
          background: VisualTokens.color.surfaceDanger,
          padding: VisualTokens.spacing.lg,
          borderRadius: VisualTokens.radius.md,
        }}
      >
        {error}{' '}
        <button type="button" onClick={() => void refresh()}>
          {text.retry}
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return <div style={{ color: VisualTokens.color.textMuted }}>{text.empty}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: VisualTokens.spacing.md }}>
        <button type="button" onClick={() => void refresh()}>
          {text.refresh}
        </button>
      </div>
      {renderList(orders, moneyFormatter, dateRenderer, text)}
    </div>
  );
}

function renderList(
  orders: OrderItem[],
  moneyFormatter: MoneyFormatter,
  dateRenderer: DateRenderer,
  text: Required<BillingHistoryListLabels>,
) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: `1px solid ${VisualTokens.color.borderSubtle}` }}>
          <th style={{ padding: VisualTokens.spacing.md }}>{text.colDate}</th>
          <th style={{ padding: VisualTokens.spacing.md }}>{text.colProduct}</th>
          <th style={{ padding: VisualTokens.spacing.md }}>{text.colStatus}</th>
          <th style={{ padding: VisualTokens.spacing.md }}>{text.colAmount}</th>
          <th style={{ padding: VisualTokens.spacing.md }}>{text.colInvoice}</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id} style={{ borderBottom: `1px solid ${VisualTokens.color.surfaceSubtle}` }}>
            <td style={{ padding: VisualTokens.spacing.md }}>{dateRenderer.short(order.createdAt)}</td>
            <td style={{ padding: VisualTokens.spacing.md }}>{order.productName}</td>
            <td style={{ padding: VisualTokens.spacing.md }}>
              {order.paid ? text.paid : order.status}
            </td>
            <td style={{ padding: VisualTokens.spacing.md }}>
              {moneyFormatter.format(order.amount, order.currency)}
            </td>
            <td style={{ padding: VisualTokens.spacing.md }}>
              {order.invoiceUrl ? (
                <a href={order.invoiceUrl} target="_blank" rel="noreferrer">
                  {text.invoiceLink}
                </a>
              ) : (
                text.invoiceFallback
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
