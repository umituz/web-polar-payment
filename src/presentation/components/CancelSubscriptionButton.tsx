/**
 * `<CancelSubscriptionButton>` — cancel the active subscription.
 *
 * Prompts the user for a reason (optional) and calls the cancel flow.
 * The parent can override the prompt UX with `renderPrompt` if a custom
 * confirmation dialog is required.
 */

import { useState, type ReactNode } from 'react';
import { useCancelSubscription } from '../hooks/useCancelSubscription';
import type { CancellationReason } from '../../domain/entities/cancellation.entity';
import {
  CANCELLATION_REASON_CATALOG,
  type CancellationReasonOption,
} from '../utils/cancellation-reason-catalog';
import { InlineErrorVisual } from '../utils/inline-error-visual';
import { VisualTokens } from '../theme/visual-tokens';

export interface CancelSubscriptionButtonProps {
  label?: string;
  /**
   * Render a custom confirmation UI. Receives a `confirm(reason)`
   * callback that the implementation calls to actually perform the
   * cancel. Return `null` to use the built-in `<select>` prompt.
   */
  renderPrompt?: (confirm: (reason?: CancellationReason) => void) => ReactNode;
  onSuccess?: () => void;
  /** Locale-aware reason options; defaults to the built-in catalog. */
  reasonCatalog?: ReadonlyArray<CancellationReasonOption>;
  /** User-facing strings — override any subset for localization. */
  labels?: CancelSubscriptionButtonLabels;
}

/** User-facing strings — override any subset for localization. */
export interface CancelSubscriptionButtonLabels {
  /** The trigger button label (also settable via the `label` prop). */
  action?: string;
  /** Confirmation button inside the prompt. */
  confirm?: string;
  /** Dismiss button inside the prompt. */
  keep?: string;
  /** Shown while the cancel request is in flight. */
  canceling?: string;
  /** Title above the reason `<select>`. */
  promptTitle?: string;
  /** Label of the "no reason" option. */
  noReason?: string;
}

const DEFAULT_LABELS: Required<CancelSubscriptionButtonLabels> = Object.freeze({
  action: 'Cancel subscription',
  confirm: 'Confirm cancel',
  keep: 'Keep subscription',
  canceling: 'Canceling…',
  promptTitle: 'Why are you canceling? (optional)',
  noReason: 'Prefer not to say',
});

export function CancelSubscriptionButton({
  label,
  renderPrompt,
  onSuccess,
  reasonCatalog = CANCELLATION_REASON_CATALOG,
  labels,
}: CancelSubscriptionButtonProps) {
  const { cancel, loading, error } = useCancelSubscription({
    onSuccess: () => onSuccess?.(),
  });
  const [promptOpen, setPromptOpen] = useState(false);
  const [reason, setReason] = useState<CancellationReason | ''>('');

  const text = { ...DEFAULT_LABELS, ...labels };
  const triggerLabel = label ?? text.action;

  const onConfirm = async (selected?: CancellationReason) => {
    setPromptOpen(false);
    const result = await cancel(selected);
    if (result?.success) {
      setReason('');
    }
  };

  if (!promptOpen) {
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', gap: VisualTokens.spacing.xs }}>
        <button
          type="button"
          onClick={() => setPromptOpen(true)}
          style={{
            background: 'transparent',
            color: VisualTokens.color.brandDangerText,
            border: `1px solid ${VisualTokens.color.borderWarning}`,
            borderRadius: VisualTokens.radius.md,
            padding: `${VisualTokens.spacing.md}px ${VisualTokens.spacing.lg}px`,
            cursor: 'pointer',
            fontWeight: VisualTokens.fontWeight.strong,
          }}
        >
          {triggerLabel}
        </button>
        {InlineErrorVisual.element(error?.message)}
      </span>
    );
  }

  if (renderPrompt) {
    return <>{renderPrompt((selected) => void onConfirm(selected))}</>;
  }

  return (
    <div
      role="dialog"
      aria-label="Confirm cancellation"
      style={{
        border: `1px solid ${VisualTokens.color.borderWarning}`,
        background: VisualTokens.color.surfaceDangerMuted,
        borderRadius: VisualTokens.radius.md,
        padding: VisualTokens.spacing.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: VisualTokens.spacing.md,
      }}
    >
      <label style={{ fontSize: VisualTokens.fontSize.body, fontWeight: VisualTokens.fontWeight.strong }}>
        {text.promptTitle}
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as CancellationReason | '')}
          style={{
            display: 'block',
            marginTop: VisualTokens.spacing.xs,
            width: '100%',
            padding: VisualTokens.spacing.sm,
          }}
        >
          <option value="">{text.noReason}</option>
          {reasonCatalog.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: 'flex', gap: VisualTokens.spacing.md }}>
        <button
          type="button"
          onClick={() => void onConfirm(reason || undefined)}
          disabled={loading}
          style={{
            background: VisualTokens.color.brandDanger,
            color: VisualTokens.color.textOnPrimary,
            border: 'none',
            padding: `${VisualTokens.spacing.sm}px ${VisualTokens.spacing.lg}px`,
            borderRadius: VisualTokens.radius.sm,
          }}
        >
          {loading ? text.canceling : text.confirm}
        </button>
        <button
          type="button"
          onClick={() => setPromptOpen(false)}
          disabled={loading}
          style={{
            background: 'transparent',
            border: `1px solid ${VisualTokens.color.borderStrong}`,
            padding: `${VisualTokens.spacing.sm}px ${VisualTokens.spacing.lg}px`,
            borderRadius: VisualTokens.radius.sm,
          }}
        >
          {text.keep}
        </button>
      </div>
      {InlineErrorVisual.element(error?.message)}
    </div>
  );
}
