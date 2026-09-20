/**
 * CancellationRepository — cancels the active subscription through a Firebase
 * callable function.
 */

import type {
  CancellationReason,
  CancelResult,
} from '../../../domain/entities/cancellation.entity';
import { BILLING_ERROR_CODE } from '../../../domain/enums/error-code.enum';
import { FirebaseBillingError } from '../../errors/firebase-billing.error';
import type { CallableClient } from './callable-client';

export class CancellationRepository {
  constructor(
    private readonly callable: CallableClient,
    private readonly functionName: string,
  ) {}

  async cancel(reason?: CancellationReason): Promise<CancelResult> {
    try {
      return await this.callable.call<{ reason?: CancellationReason }, CancelResult>(
        this.functionName,
        { reason },
        BILLING_ERROR_CODE.CANCEL_FAILED,
      );
    } catch (error) {
      if (error instanceof FirebaseBillingError) throw error;
      throw new FirebaseBillingError(
        'Failed to cancel subscription',
        BILLING_ERROR_CODE.CANCEL_FAILED,
        error,
      );
    }
  }
}
