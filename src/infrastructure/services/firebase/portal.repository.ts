/**
 * PortalRepository — fetches a Polar customer-portal URL for the user.
 *
 * The portal URL is sensitive (it grants direct access to billing UI), so we
 * validate that the response is a non-empty string before returning.
 */

import { BILLING_ERROR_CODE } from '../../../domain/enums/error-code.enum';
import { FirebaseBillingError } from '../../errors/firebase-billing.error';
import type { CallableClient } from './callable-client';

export class PortalRepository {
  constructor(
    private readonly callable: CallableClient,
    private readonly functionName: string,
  ) {}

  async getUrl(userId: string): Promise<string> {
    try {
      const result = await this.callable.call<{ userId: string }, { url: string }>(
        this.functionName,
        { userId },
        BILLING_ERROR_CODE.PORTAL_FAILED,
      );

      if (!result || typeof result.url !== 'string' || result.url.length === 0) {
        throw new FirebaseBillingError(
          'Invalid portal URL returned',
          BILLING_ERROR_CODE.INVALID_RESPONSE,
        );
      }

      return result.url;
    } catch (error) {
      if (error instanceof FirebaseBillingError) throw error;
      throw new FirebaseBillingError(
        'Failed to get customer portal URL',
        BILLING_ERROR_CODE.PORTAL_FAILED,
        error,
      );
    }
  }
}
