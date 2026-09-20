/**
 * `@umituz/web-polar-payment/products` — Polar.sh product catalog API.
 *
 * Requires a Polar access token. Tokens grant full account access — use
 * from a server / edge function or a development build only.
 */

export {
  PolarProductRepository,
  PolarApiError,
  isPolarApiError,
  getProducts,
  getProductById,
  getAllProducts,
} from './infrastructure/services/polar-product.repository';
export type {
  PolarApiConfig,
  PolarRequestOptions,
} from './infrastructure/services/polar-product.repository';

export { FetchHttpClient } from './infrastructure/http/http-client';
export type {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from './infrastructure/http/http-client';
