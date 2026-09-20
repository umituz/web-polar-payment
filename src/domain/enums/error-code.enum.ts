/**
 * Error code enum for billing operations.
 *
 * Centralized codes prevent magic-string drift across the SDK.
 */

export const BILLING_ERROR_CODE = Object.freeze({
  INVALID_ARGUMENT: 'invalid-argument',
  STATUS_LOAD_FAILED: 'status-load-failed',
  CHECKOUT_FAILED: 'checkout-failed',
  SYNC_FAILED: 'sync-failed',
  BILLING_HISTORY_FAILED: 'billing-history-failed',
  CANCEL_FAILED: 'cancel-failed',
  PORTAL_FAILED: 'portal-failed',
  INVALID_RESPONSE: 'invalid-response',
  UNKNOWN: 'unknown',
} as const);

export type BillingErrorCode = (typeof BILLING_ERROR_CODE)[keyof typeof BILLING_ERROR_CODE];
