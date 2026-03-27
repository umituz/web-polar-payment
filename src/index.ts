export { PolarProvider } from './presentation/components/PolarProvider';
export { usePolarBilling } from './presentation/hooks/usePolarBilling';
export { usePolarProducts } from './presentation/hooks/usePolarProducts';
export type { PolarContextValue } from './presentation/hooks/usePolarBilling';
export type { UsePolarProductsOptions, UsePolarProductsResult } from './presentation/hooks/usePolarProducts';
export { createFirebaseAdapter } from './infrastructure/services/firebase-billing.service';
export type { FirebaseAdapterConfig } from './infrastructure/services/firebase-billing.service';
export { SUBSCRIPTION_STATUS } from './infrastructure/constants/billing.constants';
export type { SubscriptionStatusValue, BillingCycle } from './domain/entities/subscription.entity';
export type { SubscriptionStatus, CheckoutParams, CheckoutResult, OrderItem, CancellationReason, CancelResult, SyncResult } from './domain/entities';
export type { PolarAdapter } from './domain/interfaces';

// Product API
export { getProducts, getProductById, getAllProducts } from './infrastructure/services/polar-api.service';
export type { PolarApiConfig } from './infrastructure/services/polar-api.service';
export type { PolarProduct, PolarPrice, ProductListResponse, ProductListParams, RecurringInterval, PriceType } from './domain/entities/product.entity';
