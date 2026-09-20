/**
 * CallableClient — thin wrapper around Firebase `httpsCallable`.
 *
 * Translates Firebase Functions errors into `FirebaseBillingError` with a
 * stable, operation-scoped `BillingErrorCode` (the caller supplies the code
 * for the flow it is executing). The raw Firebase error — including its own
 * `code` such as `functions/unauthenticated` — is preserved on
 * `originalError` for diagnostics. The repositories depend on this contract
 * (not on Firebase directly), so they can be tested with a fake.
 */

import { FirebaseBillingError } from '../../errors/firebase-billing.error';
import { BILLING_ERROR_CODE } from '../../../domain/enums/error-code.enum';
import type { BillingErrorCode } from '../../../domain/enums/error-code.enum';
import { loadFunctionsApi } from './firebase-client';

interface FirebaseFunctionsError {
  code?: string;
  message?: string;
  details?: unknown;
}

function isFirebaseFunctionsError(value: unknown): value is FirebaseFunctionsError {
  return typeof value === 'object' && value !== null;
}

export class CallableClient {
  constructor(private readonly functions: unknown) {}

  async call<TData, TResult>(
    name: string,
    data?: TData,
    operationCode: BillingErrorCode = BILLING_ERROR_CODE.UNKNOWN,
  ): Promise<TResult> {
    try {
      const { httpsCallable } = await loadFunctionsApi();
      const fn = httpsCallable<TData, TResult>(this.functions, name);
      const result = await fn(data);
      return result.data;
    } catch (error) {
      const message = isFirebaseFunctionsError(error)
        ? (error.message ?? `Function ${name} failed`)
        : `Unknown error calling ${name}`;
      throw new FirebaseBillingError(message, operationCode, error);
    }
  }
}
