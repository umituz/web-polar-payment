export const CANCELLATION_REASON = Object.freeze({
  TOO_EXPENSIVE: 'too_expensive',
  MISSING_FEATURES: 'missing_features',
  SWITCHED_SERVICE: 'switched_service',
  UNUSED: 'unused',
  CUSTOMER_SERVICE: 'customer_service',
  LOW_QUALITY: 'low_quality',
  TOO_COMPLEX: 'too_complex',
  OTHER: 'other',
} as const);

export const CANCELLATION_REASON_VALUES = Object.freeze([
  CANCELLATION_REASON.TOO_EXPENSIVE,
  CANCELLATION_REASON.MISSING_FEATURES,
  CANCELLATION_REASON.SWITCHED_SERVICE,
  CANCELLATION_REASON.UNUSED,
  CANCELLATION_REASON.CUSTOMER_SERVICE,
  CANCELLATION_REASON.LOW_QUALITY,
  CANCELLATION_REASON.TOO_COMPLEX,
  CANCELLATION_REASON.OTHER,
] as const);

export type CancellationReason = (typeof CANCELLATION_REASON_VALUES)[number];

export interface CancelResult {
  success: boolean;
  endsAt?: string;
}
