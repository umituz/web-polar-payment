/**
 * Cancellation Entity
 * @description Types for subscription cancellation reasons and outcomes
 */

export type CancellationReason =
  | 'too_expensive'
  | 'missing_features'
  | 'switched_service'
  | 'unused'
  | 'customer_service'
  | 'low_quality'
  | 'too_complex'
  | 'other';

export interface CancelResult {
  success: boolean;
  endsAt?: string;
}
