/**
 * SubscriptionRepository — Firestore-backed read of a user's subscription.
 *
 * The Polar.sh state is denormalized into a single user document by the
 * backend. This repository reads that document and projects it into the
 * domain `SubscriptionStatus` shape. Field names are configurable so
 * consuming apps can remap them without forking the SDK.
 */

import type { SubscriptionStatus } from '../../../domain/entities/subscription.entity';
import { FREE_SUBSCRIPTION_STATUS } from '../../../domain/entities/subscription.entity';
import { BILLING_ERROR_CODE } from '../../../domain/enums/error-code.enum';
import { FirebaseBillingError } from '../../errors/firebase-billing.error';
import { normalizeBillingCycle, normalizeStatus } from '../../utils/normalization.util';
import { asBoolean, asString, isTimestamp } from '../../utils/type-guards.util';
import { loadFirestoreApi, snapshotData, snapshotExists } from './firebase-client';

export interface SubscriptionRepositoryConfig {
  firestore: unknown;
  collection: string;
  planField: string;
  billingCycleField: string;
  subscriptionIdField: string;
  subscriptionStatusField: string;
  polarCustomerIdField: string;
  cancelAtPeriodEndField: string;
  currentPeriodEndField: string;
}

function readCurrentPeriodEnd(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (isTimestamp(raw)) return raw.toDate().toISOString();
  if (typeof raw === 'string') return raw;
  return undefined;
}

export class SubscriptionRepository {
  constructor(private readonly config: SubscriptionRepositoryConfig) {}

  async getStatus(userId: string): Promise<SubscriptionStatus> {
    if (!userId) {
      throw new FirebaseBillingError(
        'User ID is required and cannot be empty',
        BILLING_ERROR_CODE.INVALID_ARGUMENT,
      );
    }

    try {
      const { doc, getDoc } = await loadFirestoreApi();
      const docRef = doc(this.config.firestore, this.config.collection, userId);
      const snap = await getDoc(docRef);

      if (!snapshotExists(snap)) {
        return FREE_SUBSCRIPTION_STATUS;
      }

      const data = snapshotData(snap);
      return {
        plan: asString(data[this.config.planField]) ?? 'free',
        billingCycle: normalizeBillingCycle(
          asString(data[this.config.billingCycleField]),
        ),
        subscriptionId: asString(data[this.config.subscriptionIdField]),
        subscriptionStatus: normalizeStatus(
          asString(data[this.config.subscriptionStatusField]),
        ),
        polarCustomerId: asString(data[this.config.polarCustomerIdField]),
        cancelAtPeriodEnd: asBoolean(data[this.config.cancelAtPeriodEndField]),
        currentPeriodEnd: readCurrentPeriodEnd(data[this.config.currentPeriodEndField]),
      };
    } catch (error) {
      if (error instanceof FirebaseBillingError) throw error;
      throw new FirebaseBillingError(
        'Failed to load subscription status',
        BILLING_ERROR_CODE.STATUS_LOAD_FAILED,
        error,
      );
    }
  }
}
