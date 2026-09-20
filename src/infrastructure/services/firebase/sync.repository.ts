/**
 * SyncRepository — synchronizes a Polar checkout with the user's subscription
 * record in Firestore, typically called after a successful checkout redirect.
 */

import type { SyncResult } from '../../../domain/entities/sync.entity';
import { BILLING_ERROR_CODE } from '../../../domain/enums/error-code.enum';
import { FirebaseBillingError } from '../../errors/firebase-billing.error';
import type { CallableClient } from './callable-client';

export class SyncRepository {
  constructor(
    private readonly callable: CallableClient,
    private readonly functionName: string,
  ) {}

  async sync(userId: string, checkoutId?: string): Promise<SyncResult> {
    try {
      return await this.callable.call<{ userId: string; checkoutId?: string }, SyncResult>(
        this.functionName,
        { userId, checkoutId },
        BILLING_ERROR_CODE.SYNC_FAILED,
      );
    } catch (error) {
      if (error instanceof FirebaseBillingError) throw error;
      throw new FirebaseBillingError(
        'Failed to sync subscription',
        BILLING_ERROR_CODE.SYNC_FAILED,
        error,
      );
    }
  }
}
