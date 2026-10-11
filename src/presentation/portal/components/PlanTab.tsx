/**
 * Billing — Plan Tab
 *
 * Active plan summary + change/cancel actions with a two-step
 * cancel confirmation surfaced inline.
 */

import { useState } from 'react';
import { Calendar, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { VisualTokens, TONE_PAIRS } from '../../theme/visual-tokens';
import { useBillingLabels } from '../labels';
import type { Subscription } from '../types';
import { PortalButton } from './PortalButton';
import { alertDanger, card, sectionTitle, stack } from '../styles';
import {
  formatPrice,
  getPlanPrice,
  getStatusTone,
} from '../utils/billing';

export interface PlanTabProps {
  subscription: Subscription;
  onChangePlan?: () => void;
  onCancelSubscription?: () => void | Promise<void>;
  locale?: string;
}

export const PlanTab = ({
  subscription,
  onChangePlan,
  onCancelSubscription,
  locale = 'en-US',
}: PlanTabProps) => {
  const labels = useBillingLabels();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!onCancelSubscription) return;
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      await onCancelSubscription();
    } catch {
      // Surface the failure — never leave it as an unhandled rejection.
      setCancelError(labels.plan.cancelFailed);
    } finally {
      setCancelling(false);
      setConfirmingCancel(false);
    }
  };

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const statusTone = getStatusTone(subscription.status);

  return (
    <div style={stack}>
      <section style={card} aria-labelledby="plan-current-heading">
        <h3 id="plan-current-heading" style={sectionTitle}>
          {labels.plan.title}
        </h3>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: VisualTokens.spacing.xl,
            flexWrap: 'wrap',
          }}
        >
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
                marginTop: VisualTokens.spacing.xs,
              }}
            >
              {labels.status[subscription.status]}
            </p>
            <p
              style={{
                fontSize: VisualTokens.fontSize.title,
                fontWeight: VisualTokens.fontWeight.strong,
                color: VisualTokens.color.textPrimary,
                margin: 0,
                marginTop: VisualTokens.spacing.lg,
              }}
            >
              {formatPrice(
                getPlanPrice(subscription.plan, subscription.cycle),
                subscription.plan.currency,
              )}
              <span
                style={{
                  fontSize: VisualTokens.fontSize.body,
                  fontWeight: VisualTokens.fontWeight.regular,
                  color: VisualTokens.color.textMuted,
                }}
              >
                /{subscription.cycle}
              </span>
            </p>
            <p
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: VisualTokens.fontSize.caption,
                color: VisualTokens.color.textMuted,
                margin: 0,
                marginTop: VisualTokens.spacing.sm,
              }}
            >
              <Calendar size={14} aria-hidden="true" />
              {subscription.currentPeriodStart &&
                new Date(subscription.currentPeriodStart).toLocaleDateString(locale)}
              {' → '}
              {subscription.currentPeriodEnd &&
                new Date(subscription.currentPeriodEnd).toLocaleDateString(locale)}
            </p>
          </div>

          {isActive ? (
            <CheckCircle2
              size={24}
              color={TONE_PAIRS.active.fg}
              aria-hidden="true"
            />
          ) : (
            <XCircle size={24} color={VisualTokens.color.brandDanger} aria-hidden="true" />
          )}
        </div>
      </section>

      <section style={card} aria-labelledby="plan-actions-heading">
        <h4
          id="plan-actions-heading"
          style={{
            fontSize: VisualTokens.fontSize.body,
            fontWeight: VisualTokens.fontWeight.strong,
            color: VisualTokens.color.textPrimary,
            margin: 0,
            marginBottom: VisualTokens.spacing.xl,
          }}
        >
          {labels.plan.actionsTitle}
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: VisualTokens.spacing.lg }}>
          {onChangePlan && (
            <PortalButton onClick={onChangePlan} variant="default">
              {labels.plan.changePlan}
            </PortalButton>
          )}
          {onCancelSubscription && isActive && (
            <PortalButton
              onClick={handleCancel}
              variant={confirmingCancel ? 'destructive' : 'outline'}
              disabled={cancelling}
            >
              {cancelling
                ? labels.plan.cancelling
                : confirmingCancel
                ? labels.plan.confirmCancel
                : labels.plan.cancelSubscription}
            </PortalButton>
          )}
        </div>

        {confirmingCancel && !cancelError && (
          <div role="alert" style={{ ...alertDanger, marginTop: VisualTokens.spacing.xl }}>
            <AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
            <span>{labels.plan.cancelConfirmMessage}</span>
          </div>
        )}

        {cancelError && (
          <div role="alert" style={{ ...alertDanger, marginTop: VisualTokens.spacing.xl }}>
            <AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
            <span>{cancelError}</span>
          </div>
        )}
      </section>
    </div>
  );
};
