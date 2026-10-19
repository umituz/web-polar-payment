# @umituz/web-polar-payment

Polar.sh subscription billing SDK with a Firebase adapter and React bindings.

The SDK is split into an **adapter-agnostic core** (`PolarAdapter` contract)
and a **React presentation layer** (`PolarProvider`, `usePolarBilling`).
The Firebase implementation is the default `PolarAdapter`; other backends
can be plugged in by implementing the same interface.

## Features

- Adapter-agnostic core (`PolarAdapter` interface)
- Firebase adapter (`createFirebaseAdapter`)
- Polar.sh product catalog (`getProducts`, `getProductById`, `getAllProducts`)
- React provider + hooks (`PolarProvider`, `usePolarBilling`, `usePolarProducts`)
- Ready-made UI: pricing table, checkout button, status badge, billing
  history, customer portal link, cancel flow — all localizable
- Strongly-typed domain models, stable error codes, abortable I/O

## Installation

```bash
npm install @umituz/web-polar-payment
```

Peers are **optional** — install only what you use:

| You use… | Also install | Runtime requirement |
|---|---|---|
| `…/core` | — | Any JS runtime (zero deps) |
| `…/products` | — | `fetch` (browsers, Node ≥ 18, workers) |
| `…/firebase` | `firebase` (v10 / v11 / v12) | Firebase app |
| `…/react` | `react` (≥ 18) | React DOM or React Native Web |
| root (`@umituz/web-polar-payment`) | `react` + `firebase` if you use those parts | Node ≥ 18 (`engines`) |

`react-dom` is **not** required. The package is fully tree-shakeable
(`sideEffects: false`, ESM + CJS + `.d.ts` via tsup).

## Subpath entries

Each surface pulls in only its own dependencies — importing `/react`
never loads Firebase code, importing `/core` loads nothing at all:

```ts
// Pure domain — types, enums, mappers, the PolarAdapter contract
import { BILLING_CYCLE, parseBillingCycle, mapProduct } from '@umituz/web-polar-payment/core';

// Polar.sh product catalog over a pluggable HttpClient
import { PolarProductRepository, FetchHttpClient } from '@umituz/web-polar-payment/products';

// The Firebase adapter (requires the firebase peer)
import { createFirebaseAdapter } from '@umituz/web-polar-payment/firebase';

// React layer: provider, hooks, components, theme tokens
import { PolarProvider, PricingTable } from '@umituz/web-polar-payment/react';

// Server-side Polar.sh operations: checkout sessions, customer portal,
// subscription management, webhook signature verification (server only!)
import { PolarBillingClient, verifyPolarWebhook } from '@umituz/web-polar-payment/server';

// Browser PolarAdapter over your own REST endpoints (non-Firebase backends)
import { createHttpAdapter } from '@umituz/web-polar-payment/http';

// Root entry = everything above (backwards-compatible import paths)
import { usePolarBilling } from '@umituz/web-polar-payment';
```

## Usage

### 1. Wrap the app

```tsx
import { PolarProvider, createFirebaseAdapter } from '@umituz/web-polar-payment';
import { getFunctions } from 'firebase/functions';
import { getFirestore } from 'firebase/firestore';

const adapter = createFirebaseAdapter({
  functions: getFunctions(),
  firestore: getFirestore(),
});

function App({ userId, children }) {
  return (
    <PolarProvider adapter={adapter} userId={userId}>
      {children}
    </PolarProvider>
  );
}
```

### 2. Read subscription state

```tsx
import { usePolarBilling } from '@umituz/web-polar-payment';

function PlanBadge() {
  const { status, loading } = usePolarBilling();
  if (loading) return null;
  return <span>{status.plan}</span>;
}
```

### 3. Start a checkout

```tsx
import { usePolarBilling } from '@umituz/web-polar-payment';

function UpgradeButton({ productId }) {
  const { startCheckout } = usePolarBilling();
  return (
    <button onClick={() => startCheckout({ productId, billingCycle: 'monthly' })}>
      Upgrade
    </button>
  );
}
```

### 4. Sync after a Polar redirect

```tsx
import { useEffect } from 'react';
import { usePolarBilling } from '@umituz/web-polar-payment';

function CheckoutReturn() {
  const { syncSubscription } = usePolarBilling();
  useEffect(() => {
    void syncSubscription();
  }, [syncSubscription]);
  return null;
}
```

### 5. Pricing table — the secure pattern

Fetch products **on your server** and pass them down; no Polar token ever
reaches the browser bundle:

```tsx
// server.ts
import { getAllProducts } from '@umituz/web-polar-payment/products';

const products = await getAllProducts(
  { apiToken: process.env.POLAR_OAT_TOKEN! }, // server-side secret
  { isRecurring: true },
);

// PricingPage.tsx
<PricingTable products={products} ctaLabel="Subscribe" />
```

> ⚠️ OAT tokens grant full account access — never ship them to a public
> browser bundle. The `apiToken` prop on `PricingTable` exists for local
> development only.

### 6. Localize any component

Every component takes an optional `labels` subset and `locale`:

```tsx
<SubscriptionStatusBadge
  loading={false}
  status={status}
  locale="de-DE"
  labels={{ statuses: { active: 'Aktiv' }, endsPrefix: 'endet' }}
/>
```

### 7. Own REST backend — `./server` + `./http`

When the backend is your own API worker (any runtime with `fetch`), split the
work with the two transport entry points:

```ts
// api/billing.ts — server side
import { PolarBillingClient, verifyPolarWebhook } from '@umituz/web-polar-payment/server';

const polar = new PolarBillingClient({
  apiToken: env.POLAR_ACCESS_TOKEN!,     // OAT token, server only
  sandbox: env.POLAR_SANDBOX === 'true', // sandbox-api.polar.sh
});

// Checkout: POST /v1/checkouts — metadata is copied onto the subscription
const checkout = await polar.createCheckout({
  productId,
  successUrl: `${appUrl}/billing/return?checkout_id={CHECKOUT_ID}`,
  customerId,
  metadata: { organizationId },
});

// Managed billing portal (payment methods, invoices, cancellation)
const { url } = await polar.createPortalSession(customerId, appUrl);

// Cancel at period end (reversible) vs revoke (immediate)
await polar.updateSubscription(subscriptionId, { cancelAtPeriodEnd: true });

// Webhooks: Standard Webhooks spec — verify the RAW body, before JSON.parse
const raw = await request.text();
if (!(await verifyPolarWebhook(raw, request.headers, env.POLAR_WEBHOOK_SECRET))) {
  return new Response('invalid signature', { status: 401 });
}
```

The browser side binds the same `PolarAdapter` contract to six endpoints under
one base path — implement them on your worker to match:

```ts
// app/billing.ts — browser side
import { createHttpAdapter } from '@umituz/web-polar-payment/http';

const adapter = createHttpAdapter({
  baseUrl: '/api/billing',
  getUserId: () => session.organizationId, // used when a call has no id
});

//   GET  /status?userId=    POST /checkout { productId, billingCycle?, ... }
//   POST /sync { checkoutId? }              GET  /history?userId=
//   POST /cancel { reason? }                GET  /portal?userId=
```

Failures return a `{ "error": string | { "message": string } }` envelope with
a non-2xx status; the adapter surfaces it as `Error("detail (HTTP status)")`.

### 8. Turnkey billing page — `./portal` over any adapter

`PolarBillingPage` composes the whole portal (plan comparison, subscription
tabs, invoices, hosted-portal payment methods) over a `PolarAdapter`. The
host binds the adapter and the server-fetched catalog; everything else —
data loading, checkout redirects, cancellation — is wired inside:

```tsx
import { PolarBillingPage } from '@umituz/web-polar-payment/portal';
import { createHttpAdapter } from '@umituz/web-polar-payment/http';

// products: fetched from your server (metadata.planId tags plan keys)
<PolarBillingPage
  adapter={createHttpAdapter({ baseUrl: '/api/billing', getUserId: () => orgId })}
  products={products}
  config={{ brandName: 'Acme', supportEmail: 'billing@acme.dev' }}
/>
```

Prefer composing yourself? `createPolarPortalClient({ adapter, products })`
returns the portal's `BillingApiClient` seam (plus `selectPlan` /
`openPortal`) for direct use with `useBilling`.

## Error handling

All adapter failures throw `FirebaseBillingError` with a **stable
operation code** — safe to switch on:

```ts
import { BILLING_ERROR_CODE, isFirebaseBillingError } from '@umituz/web-polar-payment/firebase';

try {
  await adapter.cancelSubscription('too_expensive');
} catch (error) {
  if (isFirebaseBillingError(error) && error.code === BILLING_ERROR_CODE.CANCEL_FAILED) {
    // the raw transport error (e.g. functions/unauthenticated) is on error.originalError
  }
}
```

Recovered (non-throwing) failures — billing history is treated as
non-critical — can be routed to your telemetry:

```ts
createFirebaseAdapter({ functions, firestore, logger: (err) => telemetry.capture(err) });
```

## Architecture

```
src/
├── core.ts / products.ts / firebase.ts / react.tsx   # subpath entries
├── domain/                       # Pure types + interfaces (no I/O)
│   ├── entities/                 #   Subscription, Checkout, Order, ...
│   ├── enums/                    #   SubscriptionStatus, BillingCycle, ...
│   ├── interfaces/               #   PolarAdapter contract
│   └── mappers/                  #   snake_case DTO → camelCase domain
├── infrastructure/               # Transport, repositories, utilities
│   ├── http/                     #   HttpClient (Strategy, AbortSignal-aware)
│   ├── query/                    #   QueryBuilder (Builder)
│   ├── pagination/               #   PageIterator (Iterator)
│   ├── services/                 #   PolarProductRepository, Firebase facade
│   ├── errors/                   #   FirebaseBillingError + codes
│   ├── constants/                #   SUBSCRIPTION_STATUS, defaults
│   └── utils/                    #   validation, security, type-guards
└── presentation/                 # React layer
    ├── context/                  #   PolarContext (race-safe refresh)
    ├── hooks/                    #   usePolarBilling, usePolarProducts
    ├── navigation/               #   NavigationStrategy
    ├── theme/                    #   VisualTokens (self-contained)
    └── components/               #   Provider + UI components
```

### Patterns in use

- **Adapter** — `PolarAdapter` interface, Firebase implementation
- **Facade** — `FirebaseBillingFacade` composes six repositories
- **Repository** — one repository per business operation
- **Strategy** — `HttpClient` (swap `fetch` for tests), `NavigationStrategy`
- **Builder** — `QueryBuilder` for URL search params
- **Iterator** — `PageIterator` for paginated Polar.sh lists
- **Factory** — `createFirebaseAdapter(config)` wires the dependency graph
- **Error as a value** — stable `BillingErrorCode`, raw cause preserved

### Design decisions

- **Dependency direction points inward.** `presentation` and
  `infrastructure` depend on `domain`; `domain` depends on nothing. This is
  what lets each subpath ship with only its own dependencies.
- **VisualTokens are self-contained** rather than depending on a shared
  design-system package: a billing SDK must be droppable into any app
  without dragging a UI framework along. Override styles via `labels`,
  `locale`, and component composition instead.
- **Localization via prop injection, not an i18n framework** — `labels`
  objects with English defaults keep the runtime dependency-free while
  still allowing full translation.
- **Optimistic-free state**: `PolarProvider` serializes refreshes behind a
  generation counter; a slow earlier response can never overwrite a newer
  one.

## Development

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (flat config)
npm test            # vitest — 121 tests (domain, infra, presentation)
npm run build       # tsup — CJS + ESM + d.ts for every subpath entry
npm pack --dry-run  # inspect the publishable tarball
```

## License

MIT
