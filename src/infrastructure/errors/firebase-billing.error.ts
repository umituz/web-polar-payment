/**
 * Domain error for billing operations.
 *
 * Carries a stable error code from `BILLING_ERROR_CODE` plus the original
 * cause. Centralizes the shape so callers (UI, telemetry) can branch on
 * `code` instead of string-matching `message`.
 */

import type { BillingErrorCode } from '../../domain/enums/error-code.enum';
import { BILLING_ERROR_CODE } from '../../domain/enums/error-code.enum';

export class FirebaseBillingError extends Error {
  public readonly code: BillingErrorCode;
  public readonly originalError?: unknown;

  constructor(
    message: string,
    code: BillingErrorCode = BILLING_ERROR_CODE.UNKNOWN,
    originalError?: unknown,
  ) {
    super(message);
    this.name = 'FirebaseBillingError';
    this.code = code;
    this.originalError = originalError;
    Object.setPrototypeOf(this, FirebaseBillingError.prototype);
  }
}

/**
 * Type guard: narrows an unknown thrown value to a billing error.
 * Lets callers recover gracefully without `as` casts.
 */
export function isFirebaseBillingError(error: unknown): error is FirebaseBillingError {
  return error instanceof FirebaseBillingError;
}
