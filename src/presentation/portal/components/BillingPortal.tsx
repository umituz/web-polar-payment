/**
 * Billing Portal
 *
 * Main billing portal with tabs.
 * Uses proper a11y semantics (role=tablist, role=tab, aria-selected,
 * aria-controls) and delegates tab content to dedicated subcomponents.
 */

import { CreditCard, FileText, BarChart3, Settings, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { VisualTokens } from '../../theme/visual-tokens';
import type { BillingPortalProps, BillingTabId } from '../types';
import { BillingLabelsProvider, useBillingLabels } from '../labels';
import { PaymentMethodsList } from './PaymentMethodsList';
import { InvoiceCard } from './InvoiceCard';
import { PlanTab } from './PlanTab';
import { OverviewTab } from './OverviewTab';
import { PortalSpinner } from './PortalSpinner';
import { stack, visuallyHidden } from '../styles';

const TABS: ReadonlyArray<{ id: BillingTabId; labelKey: 'overview' | 'paymentMethods' | 'invoices' | 'plan'; icon: LucideIcon }> = [
  { id: 'overview', labelKey: 'overview', icon: BarChart3 },
  { id: 'payment-methods', labelKey: 'paymentMethods', icon: CreditCard },
  { id: 'invoices', labelKey: 'invoices', icon: FileText },
  { id: 'plan', labelKey: 'plan', icon: Settings },
];

export const BillingPortal = ({
  billing,
  loading = false,
  error,
  showTabs = true,
  activeTab = 'overview',
  locale = 'en-US',
  onTabChange,
  onAddPaymentMethod,
  onSetDefaultPaymentMethod,
  onRemovePaymentMethod,
  onViewInvoice,
  onChangePlan,
  onCancelSubscription,
  labels,
}: BillingPortalProps) => {
  return (
    <BillingLabelsProvider labels={labels}>
      <BillingPortalBody
        billing={billing}
        loading={loading}
        error={error}
        showTabs={showTabs}
        activeTab={activeTab}
        locale={locale}
        onTabChange={onTabChange}
        onAddPaymentMethod={onAddPaymentMethod}
        onSetDefaultPaymentMethod={onSetDefaultPaymentMethod}
        onRemovePaymentMethod={onRemovePaymentMethod}
        onViewInvoice={onViewInvoice}
        onChangePlan={onChangePlan}
        onCancelSubscription={onCancelSubscription}
      />
    </BillingLabelsProvider>
  );
};

const BillingPortalBody = ({
  billing,
  loading = false,
  error,
  showTabs = true,
  activeTab = 'overview',
  locale = 'en-US',
  onTabChange,
  onAddPaymentMethod,
  onSetDefaultPaymentMethod,
  onRemovePaymentMethod,
  onViewInvoice,
  onChangePlan,
  onCancelSubscription,
}: Omit<BillingPortalProps, 'labels'>) => {
  const labels = useBillingLabels();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${VisualTokens.spacing.page * 3}px 0`,
          color: VisualTokens.color.textMuted,
        }}
        role="status"
        aria-live="polite"
      >
        <PortalSpinner size={48} />
        <span style={visuallyHidden}>{labels.common.loading}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: VisualTokens.spacing.xl,
          padding: `${VisualTokens.spacing.page * 3}px 0`,
          color: VisualTokens.color.brandDangerText,
        }}
        role="alert"
      >
        <AlertCircle size={24} aria-hidden="true" />
        <p style={{ margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (!billing) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab billing={billing} locale={locale} />;
      case 'payment-methods':
        return (
          <PaymentMethodsList
            paymentMethods={billing.paymentMethods}
            onAddNew={onAddPaymentMethod}
            onSetDefault={onSetDefaultPaymentMethod}
            onRemove={onRemovePaymentMethod}
          />
        );
      case 'invoices':
        return (
          <InvoiceList invoices={billing.recentInvoices} onView={onViewInvoice} locale={locale} />
        );
      case 'plan':
        return (
          <PlanTab
            subscription={billing.subscription}
            onChangePlan={onChangePlan}
            onCancelSubscription={onCancelSubscription}
            locale={locale}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {showTabs && (
        <div
          style={{ borderBottom: `1px solid ${VisualTokens.color.borderSubtle}`, marginBottom: VisualTokens.spacing.section }}
          role="tablist"
          aria-orientation="horizontal"
        >
          <div style={{ display: 'flex', gap: VisualTokens.spacing.section }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`billing-tab-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-controls="billing-tab-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onTabChange?.(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      const idx = TABS.findIndex((tt) => tt.id === activeTab);
                      const nextIdx =
                        e.key === 'ArrowRight'
                          ? (idx + 1) % TABS.length
                          : (idx - 1 + TABS.length) % TABS.length;
                      onTabChange?.(TABS[nextIdx].id);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: VisualTokens.spacing.sm,
                    paddingBottom: VisualTokens.spacing.section,
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? VisualTokens.color.brandPrimary : 'transparent'}`,
                    background: 'transparent',
                    fontSize: VisualTokens.fontSize.body,
                    fontWeight: isActive ? VisualTokens.fontWeight.medium : VisualTokens.fontWeight.regular,
                    color: isActive ? VisualTokens.color.textPrimary : VisualTokens.color.textMuted,
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{labels.tabs[tab.labelKey]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        id="billing-tab-panel"
        role="tabpanel"
        aria-labelledby={`billing-tab-${activeTab}`}
      >
        {renderContent()}
      </div>
    </div>
  );
};

/**
 * Invoices list — extracted inline so BillingPortal stays focused on layout.
 */
const InvoiceList = ({
  invoices,
  onView,
  locale,
}: {
  invoices: NonNullable<BillingPortalProps['billing']>['recentInvoices'];
  onView?: (invoice: NonNullable<BillingPortalProps['billing']>['recentInvoices'][number]) => void;
  locale: string;
}) => {
  const labels = useBillingLabels();

  if (invoices.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: `${VisualTokens.spacing.page * 1.5}px 0`,
          color: VisualTokens.color.textMuted,
        }}
      >
        <FileText size={48} style={{ opacity: 0.5, marginBottom: VisualTokens.spacing.xl }} aria-hidden="true" />
        <p style={{ margin: 0 }}>{labels.invoices.empty}</p>
      </div>
    );
  }

  return (
    <div style={stack}>
      {invoices.map((invoice) => (
        <InvoiceCard key={invoice.id} invoice={invoice} onClick={onView} locale={locale} />
      ))}
    </div>
  );
};

export default BillingPortal;
