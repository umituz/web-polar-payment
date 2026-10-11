/**
 * Usage Card
 *
 * Shows consumption of a metered resource with an accessible progress bar.
 * Surfaces the real percentage (including over-limit) instead of clamping
 * to 100%, so users see when they have actually exceeded their allowance.
 */

import { AlertTriangle, TrendingUp } from 'lucide-react';
import { VisualTokens, TONE_PAIRS } from '../../theme/visual-tokens';
import { useBillingLabels } from '../labels';
import type { UsageCardProps } from '../types';
import { card, mutedText, row } from '../styles';
import { calculateUsagePercentage, formatNumber, isNearLimit } from '../utils/billing';

export const UsageCard = ({
  metric,
  locale = 'en-US',
  showProgress = true,
  showLimit = true,
}: UsageCardProps) => {
  const labels = useBillingLabels();
  const { percentage, isOverLimit, nearLimit, isUnlimited } = evaluateUsage(metric);

  const tone = isOverLimit ? 'danger' : nearLimit ? 'warning' : 'active';
  const toneColor = TONE_PAIRS[tone].fg;
  const barColor = isOverLimit
    ? VisualTokens.color.brandDanger
    : nearLimit
      ? VisualTokens.color.badgeWarningFg
      : VisualTokens.color.brandPrimary;

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: VisualTokens.spacing.lg }}>
      <div style={{ ...row, justifyContent: 'space-between', gap: VisualTokens.spacing.lg }}>
        <div>
          <p style={{ ...mutedText, fontSize: VisualTokens.fontSize.caption, margin: 0, marginBottom: VisualTokens.spacing.xs }}>
            {metric.name}
          </p>
          <p
            style={{
              fontSize: VisualTokens.fontSize.display,
              fontWeight: VisualTokens.fontWeight.strong,
              color: VisualTokens.color.textPrimary,
              margin: 0,
            }}
          >
            {formatNumber(metric.current, locale)}
            <span
              style={{
                fontSize: VisualTokens.fontSize.body,
                fontWeight: VisualTokens.fontWeight.regular,
                color: VisualTokens.color.textMuted,
                marginLeft: VisualTokens.spacing.xs,
              }}
            >
              {metric.unit}
            </span>
          </p>
        </div>

        {(nearLimit || isOverLimit) && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: VisualTokens.radius.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: toneColor,
              background: TONE_PAIRS[tone].bg,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {isOverLimit ? (
              <AlertTriangle size={20} />
            ) : (
              <TrendingUp size={20} />
            )}
          </div>
        )}
      </div>

      {showProgress && !isUnlimited && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: VisualTokens.spacing.sm }}>
          <div
            style={{
              ...row,
              justifyContent: 'space-between',
              fontSize: VisualTokens.fontSize.caption,
            }}
          >
            {showLimit && (
              <span style={{ color: VisualTokens.color.textMuted }}>
                {formatNumber(metric.limit, locale)} {metric.unit} {labels.usage.limit}
              </span>
            )}
            <span
              style={{
                fontWeight: VisualTokens.fontWeight.medium,
                color: isOverLimit || nearLimit ? toneColor : VisualTokens.color.textPrimary,
              }}
            >
              {percentage.toFixed(0)}%
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: 8,
              background: VisualTokens.color.surfaceSubtle,
              borderRadius: VisualTokens.radius.pill,
              overflow: 'hidden',
            }}
            role="progressbar"
            aria-label={`${metric.name} ${labels.common.usage}`}
            aria-valuemin={0}
            aria-valuemax={Math.max(metric.limit, metric.current)}
            aria-valuenow={metric.current}
            aria-valuetext={`${formatNumber(metric.current, locale)} / ${formatNumber(metric.limit, locale)} ${metric.unit}`}
          >
            <div
              style={{
                height: '100%',
                background: barColor,
                width: `${Math.min(percentage, 100)}%`,
              }}
            />
          </div>

          {metric.resetAt && (
            <p style={{ ...mutedText, fontSize: VisualTokens.fontSize.caption, margin: 0 }}>
              {labels.usage.resets}{' '}
              {new Date(metric.resetAt).toLocaleDateString(locale)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

interface UsageEvaluation {
  percentage: number;
  isOverLimit: boolean;
  nearLimit: boolean;
  isUnlimited: boolean;
}

/**
 * Centralized usage evaluation. Returning all flags in one place
 * keeps the JSX above declarative and free of conditionals.
 */
const evaluateUsage = (metric: UsageCardProps['metric']): UsageEvaluation => {
  if (metric.limit <= 0) {
    return { percentage: 0, isOverLimit: false, nearLimit: false, isUnlimited: true };
  }
  return {
    percentage: calculateUsagePercentage(metric),
    isOverLimit: metric.current > metric.limit,
    nearLimit: isNearLimit(metric),
    isUnlimited: false,
  };
};

export default UsageCard;
