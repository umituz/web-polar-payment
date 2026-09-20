# Changelog

All notable changes to `@umituz/web-polar-payment` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.23] — 2026-09-20

The platform release: subpath entries with real dependency isolation, a
normalized error contract, abortable I/O, and a full test suite. Also
carries the earlier refactor (camelCase domain, repository split,
adapter-based provider) that was staged under Unreleased.

### Added
- **Subpath exports** with per-surface dependency isolation:
  - `@umituz/web-polar-payment/core` — pure domain (types, enums, mappers,
    `PolarAdapter` contract). Zero runtime dependencies, any JS runtime.
  - `@umituz/web-polar-payment/products` — Polar.sh product catalog over a
    pluggable `HttpClient` (needs `fetch`, i.e. browsers / Node 18+ / workers).
  - `@umituz/web-polar-payment/firebase` — `createFirebaseAdapter` factory
    (requires the optional `firebase` peer).
  - `@umituz/web-polar-payment/react` — components, hooks, context, theme.
  - Root entry re-exports everything (backwards compatible import paths).
- **Abortable I/O**: `HttpRequest.signal` / `PolarRequestOptions.signal`
  flow through `FetchHttpClient` into `fetch`, and `PageIterator` aborts
  between pages. `usePolarProducts` aborts in-flight requests on dependency
  change and never commits stale results.
- **Error contract**: `FirebaseBillingError.code` is now always the stable
  operation code (`checkout-failed`, `sync-failed`, `cancel-failed`,
  `portal-failed`, `billing-history-failed`, …); the raw Firebase error
  (e.g. `functions/unauthenticated`) is preserved on `originalError`.
- `BillingLogger` injection — route recovered billing-history failures into
  your own telemetry via `createFirebaseAdapter({ logger })` instead of the
  default `console.error`.
- **Localization hooks**: every UI component accepts a `labels` prop
  (override any subset of user-facing strings) and a `locale` prop
  (currency + date rendering). English defaults; no i18n runtime dependency.
- `parseBillingCycle` (alias-tolerant: `'month'` → `'monthly'`) and a strict
  `isKnownBillingCycle` guard; `isKnownSubscriptionStatus` + value sets
  (`SUBSCRIPTION_STATUS_VALUES`, `BILLING_CYCLE_VALUES`,
  `CANCELLATION_REASON_VALUES`).
- `isPolarApiError` / `isFirebaseBillingError` type guards.
- Secure `PricingTable` path: pass server-fetched `products` directly and
  ship **no Polar token to the browser at all**.
- Automated test suite — 121 tests across domain, infrastructure
  (HTTP client, pagination, repositories, Firebase adapter with mocked SDK)
  and presentation (provider race-safety, components) — plus ESLint
  (flat config) and a CI workflow running install → typecheck → lint →
  test → build on every push/PR.
- React UI components: `<PolarCheckoutButton>`, `<SubscriptionStatusBadge>`,
  `<PricingTable>`, `<BillingHistoryList>`, `<CustomerPortalLink>`,
  `<CancelSubscriptionButton>`; hooks `useCheckoutButton`,
  `useCancelSubscription`.
- `NavigationStrategy` for swappable checkout redirects,
  `HttpClient` strategy for the Polar product transport,
  `QueryBuilder` (Builder) and `PageIterator` (Iterator) utilities.
- `examples/` directory and `TEST_SCENARIOS.md` (manual QA checklist).

### Changed
- **BREAKING**: domain `PolarProduct`, `PolarPrice`, `ProductListResponse`
  fields are now **camelCase** (was snake_case). `ProductMapper` is the
  single boundary translating Polar.sh's API contract.
- **BREAKING**: `HttpResponse.data` is now `T | null` — `null` when the
  response body was empty or not JSON (was unsoundly typed `T`). The raw
  body stays available via `response.text()`.
- **BREAKING**: `usePolarProducts().error` is now `Error | null`
  (was a `string`).
- **BREAKING**: `mapProduct(null | undefined)` now throws a `TypeError`
  (was silently returning a fake product); `mapProductList` returns an
  empty page instead.
- **BREAKING (packaging)**: `react-dom` is no longer a peer dependency
  (components only need `react`); `firebase` (^10 || ^11 || ^12) and
  `react` (>= 18) are now **optional** peers — install only what you use.
- `firebase` must now be installed by consumers of the `./firebase`
  subpath (it was previously a hard dependency — see Migration).
- `firebase-billing.service.ts` (236 lines, 6 responsibilities) split into
  six repositories + a facade + a client wrapper; `polar-api.service.ts`
  rewritten as `PolarProductRepository` + `HttpClient` + `QueryBuilder` +
  `PageIterator`.
- `PolarProvider` depends only on the `PolarAdapter` interface and guards
  refreshes with a monotonic generation counter — a slow earlier response
  can never overwrite a newer one.
- `HttpClient` reads the body exactly once (fixes "Body has already been
  consumed" when reading `text()` after a JSON parse failure).
- Billing history failures are non-fatal: reported through the injected
  logger and surfaced as `[]` instead of crashing the UI.
- Build: tsup multi-entry dual format (CJS + ESM + `.d.ts`), `sideEffects:
  false` for tree-shaking, `engines.node >= 18`.
- `BillingHistoryList` renders the (localized) empty state for an
  explicitly empty `orders` array instead of a header-only table.
- Adapter config `callables` / `firestorePaths` values are now properly
  typed as `string` (custom names were previously rejected by the type
  system even though the feature existed).

### Removed
- `subscription.tokens?` — tokens are not a subscription concern.
- Redundant `STATUS_MAP` (a 1:1 identity map of `SUBSCRIPTION_STATUS`).
- `firebase-helpers.util.ts` (renamed to `type-guards.util.ts`);
  `validations.util.ts` (split into `validation.util.ts` +
  `security.util.ts`).
- Dead barrel files (`src/infrastructure/index.ts`,
  `src/presentation/index.ts`) and the `any`-masking `declarations.d.ts`.
- The `firebase-billing.service.ts` backwards-compat shim — its public
  surface moved to `createFirebaseAdapter` (via the `./firebase` subpath);
  the shim had no consumers and only invited deep imports.
- `./domain`, `./infrastructure`, `./presentation` subpath exports (they
  pointed at TS sources and could not resolve at runtime).

### Migration guide (1.0.22 → 1.0.23)
1. **Snake_case accessors**: `product.recurring_interval` →
   `product.recurringInterval` (see `PolarProduct`). If you consumed raw
   Polar API objects, map them through `mapProduct` first.
2. **Optional peers**: nothing changes if you install `firebase` and
   `react` today. New minimal installs: `npm i @umituz/web-polar-payment
   react` for UI-only usage, or `… firebase` for the adapter. Consumers of
   `./firebase` must have `firebase` installed.
3. **Error handling**: switch any check like
   `error.code === 'functions/unauthenticated'` to
   `error.originalError?.code`; `error.code` is now always one of the
   stable `BILLING_ERROR_CODE` values (`isFirebaseBillingError(error)` to
   narrow first).
4. **`HttpResponse.data`**: handle the `null` case (empty/non-JSON body).
5. **`usePolarProducts`**: treat `error` as an `Error` (`.message`).
6. **`mapProduct` absent input**: guard before calling — it now throws
   `TypeError` instead of fabricating a product.
7. `react-dom` no longer needs to be installed for this package.

## [1.0.22] — 2026-09-19

Initial public release. Adapter + provider + product API.
