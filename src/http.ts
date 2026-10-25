/**
 * `@umituz/web-polar-payment/http` entry point.
 *
 * Browser-side `PolarAdapter` over a conventional REST surface — for apps
 * whose billing backend is their own API. See `createHttpAdapter` for the
 * endpoint contract the server must implement.
 */

export { createHttpAdapter } from './infrastructure/services/http/create-http-adapter';
export type { HttpAdapterConfig } from './infrastructure/services/http/create-http-adapter';
