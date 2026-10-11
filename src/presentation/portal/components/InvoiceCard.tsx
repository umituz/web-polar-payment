/**
 * Invoice Card
 *
 * Renders an invoice summary with optional compact/full view and
 * keyboard-accessible actions. External links use `rel="noopener noreferrer"`
 * to prevent tabnabbing.
 */

import { FileText, Download, ExternalLink } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { VisualTokens, TONE_PAIRS } from '../../theme/visual-tokens';
import { useBillingLabels } from '../labels';
import type { InvoiceCardProps } from '../types';
import { cardInteractive, mutedText, row } from '../styles';
import {
  formatPrice,
  formatNumber,
  getInvoiceStatusTone,
} from '../utils/billing';

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

/**
 * Open an external URL in a new tab with safe rel attributes.
 */
const openExternal = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const InvoiceCard = ({
  invoice,
  compact = false,
  locale = 'en-US',
  onClick,
  onDownload,
}: InvoiceCardProps) => {
  const labels = useBillingLabels();
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(invoice);
    }
  };

  const statusTone = getInvoiceStatusTone(invoice.status);

  const iconBox = {
    width: compact ? 40 : 48,
    height: compact ? 40 : 48,
    borderRadius: VisualTokens.radius.md,
    background: VisualTokens.color.surfaceMuted,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    color: VisualTokens.color.textMuted,
    flexShrink: 0,
  };

  if (compact) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? `Invoice ${invoice.number}` : undefined}
        onClick={onClick ? () => onClick(invoice) : undefined}
        onKeyDown={onClick ? handleKeyDown : undefined}
        style={{ ...cardInteractive, ...row, justifyContent: 'space-between', padding: VisualTokens.spacing.xl }}
      >
        <div style={{ ...row, gap: VisualTokens.spacing.lg }}>
          <div style={iconBox}>
            <FileText size={20} />
          </div>
          <div>
            <p
              style={{
                fontSize: VisualTokens.fontSize.body,
                fontWeight: VisualTokens.fontWeight.medium,
                color: VisualTokens.color.textPrimary,
                margin: 0,
              }}
            >
              {invoice.number}
            </p>
            <p style={{ ...mutedText, fontSize: VisualTokens.fontSize.caption, margin: 0 }}>
              {new Date(invoice.date).toLocaleDateString(locale)}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p
            style={{
              fontWeight: VisualTokens.fontWeight.strong,
              color: VisualTokens.color.textPrimary,
              margin: 0,
            }}
          >
            {formatPrice(invoice.amount, invoice.currency)}
          </p>
          <p
            style={{
              fontSize: VisualTokens.fontSize.caption,
              fontWeight: VisualTokens.fontWeight.medium,
              color: TONE_PAIRS[statusTone].fg,
              margin: 0,
            }}
          >
            {labels.invoiceStatus[invoice.status]}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Invoice ${invoice.number}` : undefined}
      onClick={onClick ? () => onClick(invoice) : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      style={cardInteractive}
    >
      <div
        style={{
          ...row,
          justifyContent: 'space-between',
          gap: VisualTokens.spacing.lg,
          marginBottom: VisualTokens.spacing.xl,
        }}
      >
        <div style={{ ...row, gap: VisualTokens.spacing.lg }}>
          <div style={iconBox}>
            <FileText size={24} />
          </div>
          <div>
            <p
              style={{
                fontWeight: VisualTokens.fontWeight.strong,
                color: VisualTokens.color.textPrimary,
                margin: 0,
              }}
            >
              {invoice.number}
            </p>
            <p style={{ ...mutedText, margin: 0 }}>
              {new Date(invoice.date).toLocaleDateString(locale, DATE_FORMAT_OPTIONS)}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p
            style={{
              fontSize: VisualTokens.fontSize.display,
              fontWeight: VisualTokens.fontWeight.strong,
              color: VisualTokens.color.textPrimary,
              margin: 0,
            }}
          >
            {formatPrice(invoice.amount, invoice.currency)}
          </p>
          <p
            style={{
              fontSize: VisualTokens.fontSize.body,
              fontWeight: VisualTokens.fontWeight.medium,
              color: TONE_PAIRS[statusTone].fg,
              margin: 0,
            }}
          >
            {labels.invoiceStatus[invoice.status]}
          </p>
        </div>
      </div>

      {invoice.items && invoice.items.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: VisualTokens.spacing.sm,
            marginBottom: VisualTokens.spacing.xl,
          }}
        >
          {invoice.items.slice(0, 2).map((item, index) => (
            <div
              key={`${item.description}-${index}`}
              style={{ ...row, justifyContent: 'space-between', fontSize: VisualTokens.fontSize.body }}
            >
              <span style={{ color: VisualTokens.color.textMuted }}>{item.description}</span>
              <span style={{ color: VisualTokens.color.textPrimary }}>
                {formatPrice(item.amount, invoice.currency)}
              </span>
            </div>
          ))}
          {invoice.items.length > 2 && (
            <p style={{ ...mutedText, fontSize: VisualTokens.fontSize.caption, margin: 0 }}>
              +{formatNumber(invoice.items.length - 2, locale)} {labels.invoices.moreItems}
            </p>
          )}
        </div>
      )}

      <div
        style={{
          ...row,
          justifyContent: 'space-between',
          paddingTop: VisualTokens.spacing.xl,
          borderTop: `1px solid ${VisualTokens.color.borderSubtle}`,
        }}
      >
        <p style={{ ...mutedText, fontSize: VisualTokens.fontSize.caption, margin: 0 }}>
          {labels.invoices.due}{' '}
          {new Date(invoice.dueDate).toLocaleDateString(locale)}
        </p>

        <div style={{ ...row, gap: VisualTokens.spacing.sm }}>
          {invoice.invoiceUrl && (
            <PortalGhostIconButton
              label={labels.invoices.viewInvoice}
              onClick={(e) => {
                e.stopPropagation();
                openExternal(invoice.invoiceUrl!);
              }}
            >
              <ExternalLink size={16} />
            </PortalGhostIconButton>
          )}
          {invoice.pdfUrl && (
            <PortalGhostIconButton
              label={labels.invoices.downloadPdf}
              onClick={(e) => {
                e.stopPropagation();
                if (onDownload) {
                  onDownload(invoice);
                } else {
                  openExternal(invoice.pdfUrl!);
                }
              }}
            >
              <Download size={16} />
            </PortalGhostIconButton>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Small icon-only ghost button — kept local because it's an internal
 * leaf of InvoiceCard, not part of the portal's public surface.
 */
const PortalGhostIconButton = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: VisualTokens.spacing.xs,
      borderRadius: VisualTokens.radius.sm,
      border: '1px solid transparent',
      background: 'transparent',
      color: VisualTokens.color.textMuted,
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

export default InvoiceCard;

/** Re-export for type-safe callback in parent components. */
export type { Invoice } from '../types';
