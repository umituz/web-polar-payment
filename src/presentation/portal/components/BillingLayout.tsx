/**
 * Billing Layout
 *
 * Page wrapper for the billing portal. All copy comes from the labels
 * catalog; brand name, logo and the dashboard route come from config —
 * no hardcoded strings, no router dependency (`onBack` lets SPA hosts
 * navigate without reloading; the default is a plain anchor).
 */

import { VisualTokens } from '../../theme/visual-tokens';
import { useBillingLabels, formatLabel } from '../labels';
import type { BillingLayoutProps } from '../types';

/**
 * Default brand mark size used across billing pages. Centralized so
 * one tweak keeps every page visually consistent.
 */
const BRAND_LOGO_SIZE = 32;

/** Fallback brand mark — the brand's initial on the primary color. */
const DefaultBrandMark = ({ initial }: { initial: string }) => (
  <span
    aria-hidden="true"
    style={{
      width: BRAND_LOGO_SIZE,
      height: BRAND_LOGO_SIZE,
      borderRadius: VisualTokens.radius.md,
      background: VisualTokens.color.brandPrimary,
      color: VisualTokens.color.textOnPrimary,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: VisualTokens.fontWeight.strong,
      fontSize: VisualTokens.fontSize.body,
      flexShrink: 0,
    }}
  >
    {initial}
  </span>
);

const container = {
  maxWidth: 1152,
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: VisualTokens.spacing.section,
  paddingRight: VisualTokens.spacing.section,
} as const;

export const BillingLayout = ({ config, children, onBack }: BillingLayoutProps) => {
  const labels = useBillingLabels();
  const dashboardRoute = config.cancelRoute ?? '/dashboard';
  const contactAria = formatLabel(labels.page.contactAria, { email: config.supportEmail ?? '' });

  const backControl = () =>
    onBack ? (
      <button
        type="button"
        onClick={onBack}
        style={{
          fontSize: VisualTokens.fontSize.body,
          color: VisualTokens.color.textMuted,
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        {labels.page.backToDashboard}
      </button>
    ) : (
      <a
        href={dashboardRoute}
        style={{
          fontSize: VisualTokens.fontSize.body,
          color: VisualTokens.color.textMuted,
          textDecoration: 'none',
        }}
      >
        {labels.page.backToDashboard}
      </a>
    );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: VisualTokens.color.surfaceMuted,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          borderBottom: `1px solid ${VisualTokens.color.borderSubtle}`,
          padding: `${VisualTokens.spacing.xl}px ${VisualTokens.spacing.section}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: VisualTokens.color.surfacePrimary,
        }}
      >
        <a
          href={dashboardRoute}
          onClick={onBack ? (e) => { e.preventDefault(); onBack(); } : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: VisualTokens.spacing.sm, textDecoration: 'none' }}
          aria-label={config.brandName}
        >
          {config.logo ?? <DefaultBrandMark initial={config.brandName.charAt(0).toUpperCase() || '?'} />}
          <span
            style={{
              fontWeight: VisualTokens.fontWeight.strong,
              fontSize: VisualTokens.fontSize.title,
              color: VisualTokens.color.textPrimary,
            }}
          >
            {config.brandName}
          </span>
        </a>
        {backControl()}
      </header>

      <main style={{ flex: 1, ...container, paddingTop: 48, paddingBottom: 48, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: VisualTokens.spacing.page * 1.5 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: VisualTokens.fontWeight.strong,
              color: VisualTokens.color.textPrimary,
              margin: 0,
              marginBottom: VisualTokens.spacing.sm,
            }}
          >
            {labels.page.title}
          </h1>
          <p style={{ color: VisualTokens.color.textMuted, margin: 0 }}>
            {labels.page.description}
          </p>
        </div>

        {children}
      </main>

      {config.supportEmail && (
        <footer
          style={{
            borderTop: `1px solid ${VisualTokens.color.borderSubtle}`,
            padding: `${VisualTokens.spacing.xl}px ${VisualTokens.spacing.section}px`,
            background: VisualTokens.color.surfacePrimary,
          }}
        >
          <div style={{ ...container, textAlign: 'center' }}>
            <p
              style={{
                fontSize: VisualTokens.fontSize.body,
                color: VisualTokens.color.textMuted,
                margin: 0,
              }}
            >
              {labels.page.needHelp}{' '}
              <a
                href={`mailto:${config.supportEmail}`}
                style={{ color: VisualTokens.color.brandPrimary }}
                aria-label={contactAria}
              >
                {config.supportEmail}
              </a>
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default BillingLayout;
