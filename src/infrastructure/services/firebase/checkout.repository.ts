/**
 * CheckoutRepository — creates Polar checkout sessions through a Firebase
 * callable function.
 */

import type {
  CheckoutParams,
  CheckoutResult,
} from '../../../domain/entities/checkout.entity';
import { BILLING_ERROR_CODE } from '../../../domain/enums/error-code.enum';
import { FirebaseBillingError } from '../../errors/firebase-billing.error';
import { isValidProductId } from '../../utils/validation.util';
import type { CallableClient } from './callable-client';

export class CheckoutRepository {
  constructor(
    private readonly callable: CallableClient,
    private readonly functionName: string,
  ) {}

  async create(params: CheckoutParams): Promise<CheckoutResult> {
    if (!isValidProductId(params.productId)) {
      throw new FirebaseBillingError(
        'Product ID is required',
        BILLING_ERROR_CODE.INVALID_ARGUMENT,
      );
    }

    try {
      return await this.callable.call<CheckoutParams, CheckoutResult>(
        this.functionName,
        params,
        BILLING_ERROR_CODE.CHECKOUT_FAILED,
      );
    } catch (error) {
      if (error instanceof FirebaseBillingError) throw error;
      throw new FirebaseBillingError(
        'Failed to create checkout session',
        BILLING_ERROR_CODE.CHECKOUT_FAILED,
        error,
      );
    }
  }
}
