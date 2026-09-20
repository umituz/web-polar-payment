/**
 * BillingRepository — fetches the user's billing history through a Firebase
 * callable function. The backend is expected to return `{ orders: OrderItem[] }`.
 *
 * Failures here are non-critical (the user can still use the app), so the
 * error is reported through the injected `logger` and an empty list is
 * returned rather than crashing the UI. Applications that need to react to
 * failures can pass their own logger via `createFirebaseAdapter({ logger })`.
 */

import type { OrderItem } from '../../../domain/entities/order.entity';
import { BILLING_ERROR_CODE } from '../../../domain/enums/error-code.enum';
import { FirebaseBillingError } from '../../errors/firebase-billing.error';
import type { CallableClient } from './callable-client';
import type { BillingLogger } from './create-firebase-adapter';

export const defaultBillingLogger: BillingLogger = (error) => {
  console.error('[FirebaseBilling] Failed to load billing history:', error.code, error);
};

export class BillingRepository {
  constructor(
    private readonly callable: CallableClient,
    private readonly functionName: string,
    private readonly logger: BillingLogger = defaultBillingLogger,
  ) {}

  async getHistory(userId: string): Promise<OrderItem[]> {
    try {
      const result = await this.callable.call<{ userId: string }, { orders?: OrderItem[] }>(
        this.functionName,
        { userId },
        BILLING_ERROR_CODE.BILLING_HISTORY_FAILED,
      );
      return Array.isArray(result?.orders) ? result.orders : [];
    } catch (error) {
      // Billing history is non-critical — report through the logger but
      // never crash the caller. The provider/UI can retry on demand.
      this.logger(
        error instanceof FirebaseBillingError
          ? error
          : new FirebaseBillingError(
              'Failed to load billing history',
              BILLING_ERROR_CODE.BILLING_HISTORY_FAILED,
              error,
            ),
      );
      return [];
    }
  }
}
