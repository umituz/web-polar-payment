/**
 * InlineErrorVisual — the small red-text error message that appears
 * under a control when its async action fails.
 *
 * Centralized so every component uses the same typography and color,
 * and so the markup stays consistent (role="alert" etc.).
 *
 * The renderer is implemented with `React.createElement` so the file
 * stays a plain `.ts` module. Components that need a node can pass the
 * result directly to JSX: `{InlineErrorVisual.element(err)}`.
 */

import { createElement, type CSSProperties, type ReactNode } from 'react';
import { VisualTokens } from '../theme/visual-tokens';

export class InlineErrorVisual {
  static style(): CSSProperties {
    return {
      color: VisualTokens.color.textError,
      fontSize: VisualTokens.fontSize.caption,
    };
  }

  static element(message: string | null | undefined): ReactNode {
    if (!message) return null;
    return createElement(
      'span',
      { role: 'alert', style: InlineErrorVisual.style() },
      message,
    );
  }
}
