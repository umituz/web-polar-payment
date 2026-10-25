/**
 * Public SDK surface — `@umituz/web-polar-payment` (root entry).
 *
 * Re-exports every subpath entry. This preserves the historical
 * single-entry import style; consumers that want a smaller dependency
 * footprint can import the specific entries instead:
 *
 *   - `@umituz/web-polar-payment/core`     — types + adapter contract (no React, no fetch)
 *   - `@umituz/web-polar-payment/products` — Polar.sh product catalog API
 *   - `@umituz/web-polar-payment/react`    — provider, hooks, components
 *
 * The root entry requires React (it re-exports the React layer), so
 * non-React applications should import from `core` / `products` directly.
 */

export * from './core';
export * from './products';
export * from './react';
