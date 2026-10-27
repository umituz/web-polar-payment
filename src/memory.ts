/**
 * `@umituz/web-polar-payment/memory` entry point.
 *
 * In-memory `PolarAdapter` for sandboxes, automated tests, demos, or offline development.
 */

export { createMemoryPolarAdapter } from './infrastructure/services/memory/create-memory-adapter';
export type { MemoryAdapterConfig } from './infrastructure/services/memory/create-memory-adapter';
