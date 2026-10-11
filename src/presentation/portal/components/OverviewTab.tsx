/**
 * Billing — Overview Tab
 *
 * Shows the current subscription summary, usage metrics, and
 * upcoming invoice. Single responsibility: render overview data.
 */

import { VisualTokens, TONE_PAIRS } from '../../theme/visual-tokens';
import { useBillingLabels } from '../labels';
import type { BillingSummary } from '../types';
import { UsageCard } from './UsageCard';
import { card, sectionTitle, stack } from '../styles';
import {
  formatPrice,
  getDaysRemaining,
  getPlanPrice,
  getStatusTone,
} from '../utils/billing';

export interface OverviewTabProps {
  billing: BillingSummary;
  locale: string;
}

export const OverviewTab = ({ billing, locale }: OverviewTabProps) => {
  const labels = useBillingLabels();
  const { subscription, usage, upcomingInvoice } = billing;
  const statusTone = getStatusTone(subscription.status);

  return (
    <div style={stack}>
      <section style={card} aria-labelledby="overview-subscription-heading">
        <h3 id="overview-subscription-heading" style={sectionTitle}>
          {labels.overview.currentSubscription}
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: VisualTokens.spacing.lg }}>
          <div>
            <p
              style={{
                fontSize: VisualTokens.fontSize.display,
                fontWeight: VisualTokens.fontWeight.strong,
                color: VisualTokens.color.textPrimary,
                margin: 0,
              }}
            >
              {subscription.plan.name}
            </p>
            <p
              style={{
                fontSize: VisualTokens.fontSize.body,
                fontWeight: VisualTokens.fontWeight.medium,
                color: TONE_PAIRS[statusTone].fg,
                margin: 0,
              }}
            >
              {labels.status[subscription.status]}
            </p>
            <p
              style={{
                fontSize: VisualTokens.fontSize.body,
                color: VisualTokens.color.textMuted,
                margin: 0,
                marginTop: VisualTokens.spacing.xs,
              }}
            >
              {formatPrice(
                getPlanPrice(subscription.plan, subscription.cycle),
                subscription.plan.currency,
              )}
              /{subscription.cycle}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            {subscription.status === 'trialing' && subscription.trialEnd && (
              <p
                style={{
                  fontSize: VisualTokens.fontSize.body,
                  color: VisualTokens.color.textMuted,
                  margin: 0,
                }}
              >
                {getDaysRemaining(subscription.trialEnd)}{' '}
                {labels.overview.trialDaysLeft}
              </p>
            )}
            {upcomingInvoice && (
              <p
                style={{
                  fontSize: VisualTokens.fontSize.body,
                  color: VisualTokens.color.textMuted,
                  margin: 0,
                }}
              >
                {labels.overview.nextBilling}{' '}
                {new Date(upcomingInvoice.date).toLocaleDateString(locale)}
              </p>
            )}
          </div>
        </div>
      </section>

      {usage.length > 0 && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: VisualTokens.spacing.xl }} aria-label={labels.common.usage}>
          {usage.map((metric) => (
            <UsageCard key={metric.id} metric={metric} locale={locale} />
          ))}
        </section>
      )}

      {upcomingInvoice && (
        <section style={card} aria-labelledby="overview-upcoming-heading">
          <h3 id="overview-upcoming-heading" style={{ ...sectionTitle, marginBottom: VisualTokens.spacing.md }}>
            {labels.overview.upcomingInvoice}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p
                style={{
                  fontSize: VisualTokens.fontSize.display,
                  fontWeight: VisualTokens.fontWeight.strong,
                  color: VisualTokens.color.textPrimary,
                  margin: 0,
                }}
              >
                {formatPrice(upcomingInvoice.amount, upcomingInvoice.currency)}
              </p>
              <p
                style={{
                  fontSize: VisualTokens.fontSize.body,
                  color: VisualTokens.color.textMuted,
                  margin: 0,
                }}
              >
                {labels.invoices.due}{' '}
                {new Date(upcomingInvoice.date).toLocaleDateString(locale)}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
