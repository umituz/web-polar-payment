/**
 * Plan Comparison
 *
 * Configurable plan selection with a true radio-group semantic.
 * The grid is a single radiogroup; each plan card is a radio option.
 * Discount shown in the toggle is derived from calculateDiscount
 * (no hardcoded "17%" — the magic number is gone).
 */

import { Check, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { VisualTokens } from '../../theme/visual-tokens';
import { useBillingLabels, BillingLabelsProvider, formatLabel } from '../labels';
import type { BillingCycle, PlanComparisonProps, PlanTier } from '../types';
import {
  formatPrice,
  getPlanPrice,
  calculateDiscount,
  isPopularPlan,
  formatFeature,
} from '../utils/billing';
import { PortalButton } from './PortalButton';
import { PortalSpinner } from './PortalSpinner';

/**
 * Plan cards are presented as a radio group so assistive tech
 * announces selection state correctly.
 */
const RADIO_GROUP_NAME = 'plan-comparison';

export const PlanComparison = ({
  plans,
  selectedPlan,
  cycle = 'monthly',
  showCycleToggle = true,
  showFeatures = true,
  onPlanSelect,
  onCycleChange,
  loading = false,
  labels: labelsOverride,
}: PlanComparisonProps) => {
  const labels = useBillingLabels();
  const discount = pickLargestDiscount(plans);

  return (
    <BillingLabelsProvider labels={labelsOverride}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: VisualTokens.spacing.page }}>
        {showCycleToggle && (
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            role="group"
          >
            <CycleToggle cycle={cycle} onChange={onCycleChange} discountPercent={discount} />
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: VisualTokens.spacing.section,
          }}
          role="radiogroup"
          aria-label={labels.planComparison.radiogroupLabel}
        >
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan === plan.id}
              isPopular={isPopularPlan(plan, plans)}
              cycle={cycle}
              showFeatures={showFeatures}
              loading={loading}
              onSelect={onPlanSelect}
              tabbable={selectedPlan === plan.id || (!selectedPlan && index === 0)}
            />
          ))}
        </div>
      </div>
    </BillingLabelsProvider>
  );
};

interface CycleToggleProps {
  cycle: BillingCycle;
  onChange?: (cycle: BillingCycle) => void;
  discountPercent: number;
}

const pillBase: CSSProperties = {
  padding: `${VisualTokens.spacing.sm}px ${VisualTokens.spacing.section}px`,
  borderRadius: VisualTokens.radius.pill,
  fontSize: VisualTokens.fontSize.body,
  fontWeight: VisualTokens.fontWeight.medium,
  cursor: 'pointer',
  border: '1px solid transparent',
};

const CycleToggle = ({ cycle, onChange, discountPercent }: CycleToggleProps) => {
  const labels = useBillingLabels();
  const active: CSSProperties = {
    background: VisualTokens.color.surfacePrimary,
    color: VisualTokens.color.textPrimary,
  };
  const inactive: CSSProperties = {
    background: 'transparent',
    color: VisualTokens.color.textMuted,
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: VisualTokens.color.surfaceSubtle,
        borderRadius: VisualTokens.radius.pill,
        padding: VisualTokens.spacing.xs,
        gap: VisualTokens.spacing.xs,
      }}
    >
      <button
        type="button"
        aria-pressed={cycle === 'monthly'}
        onClick={() => onChange?.('monthly')}
        style={{ ...pillBase, ...(cycle === 'monthly' ? active : inactive) }}
      >
        {labels.planComparison.monthly}
      </button>
      <button
        type="button"
        aria-pressed={cycle === 'yearly'}
        onClick={() => onChange?.('yearly')}
        style={{ ...pillBase, ...(cycle === 'yearly' ? active : inactive) }}
      >
        {labels.planComparison.yearly}
        {discountPercent > 0 && (
          <span
            style={{
              marginLeft: VisualTokens.spacing.xs,
              fontSize: VisualTokens.fontSize.caption,
              background: VisualTokens.color.brandPrimary,
              color: VisualTokens.color.textOnPrimary,
              padding: `${2}px ${VisualTokens.spacing.md}px`,
              borderRadius: VisualTokens.radius.pill,
            }}
          >
            {formatLabel(labels.planComparison.save, { percent: discountPercent })}
          </span>
        )}
      </button>
    </div>
  );
};

interface PlanCardProps {
  plan: PlanTier;
  isSelected: boolean;
  isPopular: boolean;
  cycle: BillingCycle;
  showFeatures: boolean;
  loading: boolean;
  onSelect?: (planId: string) => void;
  /** Roving-tabindex flag: exactly one card per group stays in tab order. */
  tabbable: boolean;
}

const PlanCard = ({
  plan,
  isSelected,
  isPopular,
  cycle,
  showFeatures,
  loading,
  onSelect,
  tabbable,
}: PlanCardProps) => {
  const labels = useBillingLabels();
  const price = getPlanPrice(plan, cycle);
  const discount = calculateDiscount(plan.monthlyPrice, plan.yearlyPrice);

  const cardStyle: CSSProperties = {
    position: 'relative',
    background: VisualTokens.color.surfacePrimary,
    border: `2px solid ${
      isSelected
        ? VisualTokens.color.brandPrimary
        : isPopular
          ? VisualTokens.color.brandPrimary
          : VisualTokens.color.borderSubtle
    }`,
    opacity: isPopular && !isSelected ? 0.85 : 1,
    borderRadius: VisualTokens.radius.lg,
    padding: VisualTokens.spacing.section,
    cursor: loading ? 'wait' : 'pointer',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => !loading && onSelect?.(plan.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!loading) onSelect?.(plan.id);
        }
      }}
      style={cardStyle}
    >
      {isPopular && (
        <div
          style={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <span
            style={{
              background: VisualTokens.color.brandPrimary,
              color: VisualTokens.color.textOnPrimary,
              fontSize: VisualTokens.fontSize.caption,
              fontWeight: VisualTokens.fontWeight.strong,
              padding: `${VisualTokens.spacing.xs}px ${VisualTokens.spacing.xl}px`,
              borderRadius: VisualTokens.radius.pill,
              whiteSpace: 'nowrap',
            }}
          >
            {labels.planComparison.mostPopular}
          </span>
        </div>
      )}

      {plan.badge && (
        <div style={{ marginBottom: VisualTokens.spacing.xl }}>
          <span
            style={{
              fontSize: VisualTokens.fontSize.caption,
              fontWeight: VisualTokens.fontWeight.strong,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: `${VisualTokens.spacing.xs}px ${VisualTokens.spacing.lg}px`,
              borderRadius: VisualTokens.radius.pill,
              background: VisualTokens.color.surfaceSubtle,
              color: VisualTokens.color.brandPrimary,
            }}
          >
            {plan.badge}
          </span>
        </div>
      )}

      <h3
        style={{
          fontSize: VisualTokens.fontSize.title,
          fontWeight: VisualTokens.fontWeight.strong,
          color: VisualTokens.color.textPrimary,
          margin: 0,
          marginBottom: VisualTokens.spacing.sm,
        }}
      >
        {plan.name}
      </h3>
      <p
        style={{
          fontSize: VisualTokens.fontSize.body,
          color: VisualTokens.color.textMuted,
          margin: 0,
          marginBottom: VisualTokens.spacing.section,
        }}
      >
        {plan.description}
      </p>

      <div style={{ marginBottom: VisualTokens.spacing.section }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: VisualTokens.spacing.xs }}>
          <span
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: VisualTokens.color.textPrimary,
            }}
          >
            {formatPrice(price, plan.currency)}
          </span>
          <span style={{ color: VisualTokens.color.textMuted, fontSize: VisualTokens.fontSize.body }}>
            /{cycle === 'monthly'
              ? labels.planComparison.monthlyShort
              : labels.planComparison.yearlyShort}
          </span>
        </div>

        {cycle === 'yearly' && discount > 0 && (
          <p
            style={{
              fontSize: VisualTokens.fontSize.body,
              color: VisualTokens.color.badgeActiveFg,
              margin: 0,
              marginTop: VisualTokens.spacing.xs,
            }}
          >
            {formatLabel(labels.planComparison.saveWithYearly, { percent: discount })}
          </p>
        )}
      </div>

      {showFeatures && plan.features.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: VisualTokens.spacing.lg,
            marginBottom: VisualTokens.spacing.section,
            flex: 1,
          }}
        >
          {plan.features.map((feature, index) => {
            const { text, bold, included } = formatFeature(feature);
            const isExcluded = included === false;
            return (
              <li
                key={`${plan.id}-feature-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: VisualTokens.spacing.lg,
                  fontSize: VisualTokens.fontSize.body,
                  opacity: isExcluded ? VisualTokens.opacity.disabled : 1,
                  textDecoration: isExcluded ? 'line-through' : 'none',
                }}
              >
                {isExcluded ? (
                  <X
                    size={20}
                    style={{ flexShrink: 0, marginTop: 2 }}
                    color={VisualTokens.color.textMuted}
                    aria-hidden="true"
                  />
                ) : (
                  <Check
                    size={20}
                    style={{ flexShrink: 0, marginTop: 2 }}
                    color={VisualTokens.color.brandPrimary}
                    aria-hidden="true"
                  />
                )}
                <span
                  style={{
                    fontWeight: bold ? VisualTokens.fontWeight.strong : VisualTokens.fontWeight.regular,
                    color: VisualTokens.color.textPrimary,
                  }}
                >
                  {text}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <PortalButton
        type="button"
        pill
        fullWidth
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(plan.id);
        }}
        disabled={loading}
        aria-label={isSelected
          ? labels.planComparison.currentPlan
          : `${labels.planComparison.selectPlan} — ${plan.name}`}
        variant={isSelected ? 'default' : 'ghost'}
        style={
          isSelected
            ? undefined
            : {
                background: VisualTokens.color.surfaceSubtle,
                color: VisualTokens.color.textPrimary,
                padding: `${VisualTokens.spacing.lg}px 0`,
              }
        }
      >
        {loading ? (
          <>
            <PortalSpinner size={16} />
            {labels.planComparison.processing}
          </>
        ) : isSelected ? (
          labels.planComparison.currentPlan
        ) : (
          labels.planComparison.selectPlan
        )}
      </PortalButton>
    </div>
  );
};

/**
 * Display the largest discount across all plans on the yearly toggle.
 * Computed from real plan prices — no hardcoded "17%".
 */
const pickLargestDiscount = (plans: PlanTier[]): number => {
  if (plans.length === 0) return 0;
  return plans.reduce((max, plan) => {
    const d = calculateDiscount(plan.monthlyPrice, plan.yearlyPrice);
    return d > max ? d : max;
  }, 0);
};

export default PlanComparison;

/**
 * Exposed for tests / extension.
 */
export { RADIO_GROUP_NAME };
