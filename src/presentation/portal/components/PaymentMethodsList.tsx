/**
 * Payment Methods List
 *
 * Manages saved payment methods with a11y semantics and
 * brand-specific card icon styling. Confirmation is inline — the
 * consumer provides onRemove and the two-step confirm happens here.
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  CreditCard,
  Trash2,
  Check,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { VisualTokens } from '../../theme/visual-tokens';
import { useBillingLabels } from '../labels';
import type { PaymentMethod, PaymentMethodsListProps } from '../types';
import { formatCardNumber, formatExpiry } from '../utils/billing';
import { PortalButton } from './PortalButton';
import { PortalSpinner } from './PortalSpinner';
import { alertDanger, mutedText, row, stack, visuallyHidden } from '../styles';

/**
 * Map card brand → gradient. These are brand-accurate literals (Visa blue,
 * Amex cyan…), not theme tokens — each card wears its network's colors.
 */
const BRAND_GRADIENT: Record<string, string> = {
  visa: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
  mastercard: 'linear-gradient(135deg, #f97316, #ef4444)',
  amex: 'linear-gradient(135deg, #0e7490, #06b6d4)',
  discover: 'linear-gradient(135deg, #f59e0b, #f97316)',
  default: 'linear-gradient(135deg, #334155, #64748b)',
};

const cardGradient = (brand: string | undefined): string => {
  if (!brand) return BRAND_GRADIENT.default;
  const key = brand.toLowerCase();
  return BRAND_GRADIENT[key] ?? BRAND_GRADIENT.default;
};

export const PaymentMethodsList = ({
  paymentMethods,
  loading = false,
  busyId,
  onSetDefault,
  onRemove,
  onAddNew,
}: PaymentMethodsListProps) => {
  const labels = useBillingLabels();
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ ...row, justifyContent: 'center', padding: `${VisualTokens.spacing.section}px 0` }} role="status" aria-live="polite">
        <PortalSpinner size={32} />
        <span style={visuallyHidden}>{labels.common.loading}</span>
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: `${VisualTokens.spacing.section}px 0` }}>
        <CreditCard
          size={48}
          aria-hidden="true"
          style={{ color: VisualTokens.color.textMuted, marginBottom: VisualTokens.spacing.lg }}
        />
        <p style={{ ...mutedText, margin: 0, marginBottom: VisualTokens.spacing.section }}>
          {labels.paymentMethods.none}
        </p>
        {onAddNew && (
          <PortalButton type="button" onClick={onAddNew} variant="outline" icon={<Plus size={16} />}>
            {labels.paymentMethods.add}
          </PortalButton>
        )}
      </div>
    );
  }

  const requestRemove = (id: string) => setPendingRemove(id);
  const cancelRemove = () => setPendingRemove(null);
  const confirmRemove = (id: string) => {
    onRemove?.(id);
    setPendingRemove(null);
  };

  return (
    <div style={stack}>
      {paymentMethods.map((method) => (
        <PaymentMethodItem
          key={method.id}
          method={method}
          allMethods={paymentMethods}
          onRemove={onRemove}
          isBusy={busyId === method.id}
          pendingRemove={pendingRemove === method.id}
          onRequestRemove={requestRemove}
          onCancelRemove={cancelRemove}
          onConfirmRemove={confirmRemove}
          onSetDefault={onSetDefault}
        />
      ))}

      {onAddNew && (
        <PortalButton
          type="button"
          onClick={onAddNew}
          variant="outline"
          fullWidth
          icon={<Plus size={16} />}
        >
          {labels.paymentMethods.add}
        </PortalButton>
      )}
    </div>
  );
};

interface PaymentMethodItemProps {
  method: PaymentMethod;
  allMethods: PaymentMethod[];
  onRemove?: (id: string) => void;
  isBusy: boolean;
  pendingRemove: boolean;
  onRequestRemove: (id: string) => void;
  onCancelRemove: () => void;
  onConfirmRemove: (id: string) => void;
  onSetDefault?: (id: string) => void;
}

const PaymentMethodItem = ({
  method,
  allMethods,
  onRemove,
  isBusy,
  pendingRemove,
  onRequestRemove,
  onCancelRemove,
  onConfirmRemove,
  onSetDefault,
}: PaymentMethodItemProps) => {
  const labels = useBillingLabels();

  const itemStyle: CSSProperties = {
    borderRadius: VisualTokens.radius.lg,
    border: `1px solid ${method.isDefault ? VisualTokens.color.brandPrimary : VisualTokens.color.borderSubtle}`,
    background: method.isDefault ? VisualTokens.color.surfaceMuted : VisualTokens.color.surfacePrimary,
    padding: VisualTokens.spacing.xl,
  };

  return (
    <div style={itemStyle}>
      <div style={{ ...row, justifyContent: 'space-between', gap: VisualTokens.spacing.xl }}>
        <div style={{ ...row, gap: VisualTokens.spacing.xl, minWidth: 0 }}>
          <div
            style={{
              width: 48,
              height: 32,
              borderRadius: VisualTokens.radius.sm,
              background: cardGradient(method.card?.brand),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {method.card && (
              <CreditCard size={20} color={VisualTokens.color.textInverse} aria-hidden="true" />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontWeight: VisualTokens.fontWeight.medium,
                color: VisualTokens.color.textPrimary,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {method.card
                ? formatCardNumber(method.card.last4, method.card.brand)
                : labels.paymentMethods.bankAccount}
            </p>
            <p style={{ ...mutedText, margin: 0 }}>
              {method.card
                ? `${labels.paymentMethods.expires} ${formatExpiry(
                    method.card.expiryMonth,
                    method.card.expiryYear,
                  )}`
                : method.bankAccount
                ? `${method.bankAccount.bankName} •••• ${method.bankAccount.last4}`
                : null}
            </p>
          </div>
          {method.isDefault && (
            <span
              style={{
                fontSize: VisualTokens.fontSize.caption,
                background: VisualTokens.color.brandPrimary,
                color: VisualTokens.color.textOnPrimary,
                padding: `${VisualTokens.spacing.xs}px ${VisualTokens.spacing.md}px`,
                borderRadius: VisualTokens.radius.pill,
                fontWeight: VisualTokens.fontWeight.medium,
                flexShrink: 0,
              }}
              aria-label={labels.paymentMethods.default}
            >
              {labels.paymentMethods.default}
            </span>
          )}
        </div>

        <div style={{ ...row, gap: VisualTokens.spacing.sm, flexShrink: 0 }}>
          {!method.isDefault && onSetDefault && (
            <PortalButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSetDefault(method.id)}
              disabled={isBusy}
              aria-label={labels.paymentMethods.setDefault}
            >
              <Check size={16} />
            </PortalButton>
          )}
          {onRemove && paymentMethodsAllowsRemove(method, allMethods) && (
            <PortalButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRequestRemove(method.id)}
              disabled={isBusy}
              aria-label={labels.paymentMethods.remove}
              style={{ color: isBusy ? undefined : VisualTokens.color.brandDanger }}
            >
              {isBusy ? <PortalSpinner size={16} /> : <Trash2 size={16} />}
            </PortalButton>
          )}
        </div>
      </div>

      {pendingRemove && (
        <div
          role="alert"
          style={{ ...alertDanger, marginTop: VisualTokens.spacing.lg, justifyContent: 'space-between' }}
        >
          <span style={{ ...row, gap: VisualTokens.spacing.md }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            {labels.paymentMethods.removeConfirm}
          </span>
          <div style={{ ...row, gap: VisualTokens.spacing.sm }}>
            <PortalButton type="button" variant="ghost" size="sm" onClick={onCancelRemove}>
              {labels.paymentMethods.cancelRemove}
            </PortalButton>
            <PortalButton
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onConfirmRemove(method.id)}
            >
              {labels.paymentMethods.confirmRemove}
            </PortalButton>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * A payment method is removable if there is at least one other method
 * left — a user must always have at least one valid payment method.
 */
const paymentMethodsAllowsRemove = (
  method: PaymentMethod,
  all: PaymentMethod[],
): boolean => all.length > 1 || !method.isDefault;
