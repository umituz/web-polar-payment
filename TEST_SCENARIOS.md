# Test Scenarios — @umituz/web-polar-payment + ios-polar-payment

Production QA-level test scenarios for manual verification. A tester can follow
these scenarios without prior knowledge of the codebase. Each scenario has
preconditions, step-by-step instructions, the expected outcome, and an
explicit failure condition.

> **Convention**:
> - "Expected" = the assertion that MUST hold.
> - "Fail if" = any deviation (these are the bug signals).
> - Tests are organized by area; each section is independent.

> **Scope (2026-09)**:
> - Sections 14–16 (iOS) cover the **separate** `ios-polar-payment` Swift
>   package, which mirrors this package's API. Run them against that repo;
>   they are kept here so both SDKs share one QA checklist.
> - §11.7 (stable error codes per operation) is now **enforced by automated
>   tests** (`tests/infrastructure/firebase-adapter.test.ts`) — the manual
>   steps remain as a cross-check against a real Firebase project.
> - §13.5 (localization) is implemented via per-component `labels` props
>   with `locale`-aware currency/date rendering; the manual matrix below
>   still applies for visual verification.

---

## Table of Contents

1. [Setup & Build Verification](#1-setup--build-verification)
2. [PolarProvider Lifecycle](#2-polarprovider-lifecycle)
3. [usePolarBilling Hook](#3-usepolarbilling-hook)
4. [usePolarProducts Hook](#4-usepolarproducts-hook)
5. [Components — PolarCheckoutButton](#5-components--polarcheckoutbutton)
6. [Components — SubscriptionStatusBadge](#6-components--subscriptionstatusbadge)
7. [Components — PricingTable](#7-components--pricingtable)
8. [Components — BillingHistoryList](#8-components--billinghistorylist)
9. [Components — CustomerPortalLink](#9-components--customerportallink)
10. [Components — CancelSubscriptionButton](#10-components--cancelsubscriptionbutton)
11. [Firebase Adapter](#11-firebase-adapter)
12. [Polar Product API](#12-polar-product-api)
13. [Security & Validation](#13-security--validation)
14. [iOS — PolarBillingService](#14-ios--polarbillingservice)
15. [iOS — PolarAdapterFactory](#15-ios--polaradapterfactory)
16. [iOS — Navigation & Checkout](#16-ios--navigation--checkout)
17. [Edge Cases](#17-edge-cases)
18. [Regression Risks](#18-regression-risks)

---

## 1. Setup & Build Verification

### 1.1 Web: Type Check
- **Test**: `npm run lint` produces no errors
- **Preconditions**: Fresh checkout
- **Steps**:
  1. From `web/web-npm-packages/web-polar-payment/` run `npm install`
  2. Run `npm run lint`
- **Expected**: Exit code 0, no TypeScript errors
- **Fail if**: Any `error TS…` message appears

### 1.2 Web: Build
- **Test**: `npm run build` produces dist artifacts
- **Steps**:
  1. Run `npm run build`
- **Expected**: `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`, `dist/index.d.mts` exist
- **Fail if**: Build fails or any dist file is missing

### 1.3 iOS: Tests
- **Test**: `swift test` passes
- **Preconditions**: macOS with Xcode 15+ and Swift 5.9+
- **Steps**:
  1. From `mobile/_packages/ios-polar-payment/` run `swift test`
- **Expected**: All test cases pass (5+ tests across 4 test files)
- **Fail if**: Any XCTest fails

### 1.4 iOS: Build
- **Test**: `swift build` produces a static library
- **Steps**:
  1. Run `swift build`
- **Expected**: `.build/debug/ios-polar-payment.build` is created
- **Fail if**: Build fails with errors

---

## 2. PolarProvider Lifecycle

### 2.1 Initial State Without User
- **Test**: Provider renders the free default
- **Preconditions**: App mounted, no `userId` prop
- **Steps**:
  1. Render `<PolarProvider adapter={stubAdapter}>...</PolarProvider>`
  2. Inside a child, call `usePolarBilling()`
- **Expected**:
  - `status.plan === 'free'`
  - `status.subscriptionStatus === 'none'`
  - `loading === true` (initial state)
- **Fail if**: `status` is anything else, or `loading` is `false` initially

### 2.2 Loading Completes
- **Test**: Initial load completes
- **Steps**:
  1. Mount with `userId="user_1"` and an adapter that resolves `getStatus` with a known status
  2. Wait one tick
- **Expected**:
  - `status` reflects the adapter's return value
  - `loading === false`
- **Fail if**: `loading` stays `true` after promise resolves, or `status` is the free default

### 2.3 User Change Triggers Reload
- **Test**: Changing `userId` reloads status
- **Preconditions**: Provider mounted with `userId="user_1"`
- **Steps**:
  1. Wait for initial load
  2. Update prop to `userId="user_2"` (adapter resolves with a different status)
- **Expected**:
  - Adapter's `getStatus` is called again with `"user_2"`
  - `status` updates to the new value
- **Fail if**: Status is stale (still showing user_1's plan)

### 2.4 Adapter Failure Resets to Free
- **Test**: Adapter that throws
- **Steps**:
  1. Mount with `userId="user_1"` and adapter whose `getStatus` rejects
- **Expected**:
  - `status` reverts to `{ plan: 'free', subscriptionStatus: 'none' }`
  - `loading === false`
- **Fail if**: The error propagates to React's error boundary

### 2.5 Refresh Re-loads Status
- **Test**: Calling `refresh()` from the context
- **Steps**:
  1. Mount with user and an adapter that records the call count
  2. Wait for initial load
  3. Call `refresh()` from the consumer
- **Expected**: `getStatus` is called a second time
- **Fail if**: `getStatus` is not re-invoked

### 2.6 Unmount Cancels In-flight Requests
- **Test**: Unmounting aborts pending requests
- **Steps**:
  1. Mount with a slow adapter (`getStatus` resolves after 1s)
  2. Unmount before the promise resolves
  3. Wait 1s
- **Expected**: No state-update warnings in the console
- **Fail if**: React warns "Can't perform a React state update on an unmounted component"

---

## 3. usePolarBilling Hook

### 3.1 Returns Context Value
- **Test**: Hook returns the same shape as the provider value
- **Expected**: `{ status, loading, refresh, startCheckout, syncSubscription, getBillingHistory, cancelSubscription, getPortalUrl }`
- **Fail if**: Any of these methods is missing or undefined

### 3.2 Throws Outside Provider
- **Test**: Hook used without provider
- **Steps**:
  1. Render a component using `usePolarBilling()` outside `<PolarProvider>`
- **Expected**: Throws `Error: usePolarBilling must be used within <PolarProvider>`
- **Fail if**: Returns `undefined` or returns an empty object

### 3.3 startCheckout Validates productId
- **Test**: Invalid productId rejected
- **Steps**:
  1. With a mounted provider, call `startCheckout({ productId: '' })`
- **Expected**: Rejects with an error whose message contains `Invalid productId`
- **Fail if**: Calls the adapter or accepts the empty value

### 3.4 startCheckout Rejects http:// in Production
- **Test**: A returned `http://` URL outside loopback is rejected
- **Steps**:
  1. Configure adapter to return `{ url: 'http://example.com/checkout' }`
  2. Call `startCheckout({ productId: 'prod_1' })`
- **Expected**: Throws an error mentioning `insecure`
- **Fail if**: The browser navigates to the http:// URL

### 3.5 startCheckout Allows http://localhost
- **Test**: Loopback exemption
- **Steps**:
  1. Configure adapter to return `{ url: 'http://localhost:3000/checkout' }`
  2. Inject a `navigation` strategy that records the URL
  3. Call `startCheckout({ productId: 'prod_1' })`
- **Expected**: Strategy receives the URL
- **Fail if**: Strategy is not called or an error is thrown

### 3.6 syncSubscription Reads URL Param
- **Test**: `checkout_id` from the URL is forwarded
- **Steps**:
  1. Navigate the page to `?checkout_id=ck_abc`
  2. With mounted provider + user, call `syncSubscription()`
- **Expected**: Adapter receives `syncSubscription(userId, 'ck_abc')`
- **Fail if**: The `checkoutId` argument is `undefined`

### 3.7 syncSubscription Refreshes on Success
- **Test**: A `synced: true` result triggers a refresh
- **Steps**:
  1. Adapter returns `{ synced: true, plan: 'pro' }`
  2. Call `syncSubscription()`
- **Expected**: `getStatus` is called after the sync
- **Fail if**: `getStatus` is not called

### 3.8 getPortalUrl Throws Without User
- **Test**: User missing
- **Steps**:
  1. With no userId, call `getPortalUrl()`
- **Expected**: Rejects with a clear "no authenticated user" error
- **Fail if**: Calls the adapter or returns a default

### 3.9 cancelSubscription Refreshes on Success
- **Test**: A `success: true` result triggers a refresh
- **Expected**: `getStatus` is called after the cancel
- **Fail if**: `getStatus` is not called

---

## 4. usePolarProducts Hook

### 4.1 Initial Loading State
- **Test**: Loading flag is true on mount
- **Expected**: `loading === true` until first fetch completes
- **Fail if**: Starts as `false`

### 4.2 Successful Fetch
- **Test**: Products populate from API
- **Steps**:
  1. Render `usePolarProducts({ apiToken, organizationId, isRecurring: true })` with a working API
- **Expected**: `products.length > 0`, `loading === false`, `error === null`
- **Fail if**: `error` is set or `products` is empty

### 4.3 Error Surfacing
- **Test**: Fetch error is exposed
- **Steps**:
  1. Render with a token that yields HTTP 401
- **Expected**: `error` is a non-null string
- **Fail if**: `error` is null and the hook silently fails

### 4.4 Disabled Flag
- **Test**: `enabled: false` skips the fetch
- **Steps**:
  1. Render with `enabled: false`
- **Expected**: `loading === false`, `products === []`, no network call
- **Fail if**: A network call is made

### 4.5 Cancellation
- **Test**: Re-render with new options cancels the in-flight request
- **Steps**:
  1. Render with a slow network (resolve after 1s)
  2. Before resolution, change `apiToken` to a different value
  3. Wait
- **Expected**: The first result does not overwrite the second; `products` reflects the latest fetch
- **Fail if**: Stale data appears after the second fetch resolves

### 4.6 Refetch
- **Test**: `refetch()` re-issues the request
- **Steps**:
  1. Wait for initial load
  2. Call `refetch()`
- **Expected**: A second request is made
- **Fail if**: `refetch` is a no-op

---

## 5. Components — PolarCheckoutButton

### 5.1 Renders the Label
- **Test**: Label is visible
- **Steps**:
  1. Render `<PolarCheckoutButton productId="prod_1" label="Upgrade" />`
- **Expected**: Button text is "Upgrade"
- **Fail if**: Label is missing or wrong

### 5.2 Disabled While Loading
- **Test**: Button is disabled during the redirect
- **Steps**:
  1. Render with a stub adapter whose `createCheckout` resolves after 500ms
  2. Click the button
- **Expected**:
  - Button text becomes "Redirecting…"
  - Button has `aria-busy="true"`
  - Button is disabled
- **Fail if**: User can click again while the first call is in flight

### 5.3 Error Display
- **Test**: Adapter failure shows an error
- **Steps**:
  1. Configure adapter to reject with a known message
  2. Click the button
- **Expected**: An inline error appears under the button with the message
- **Fail if**: Error is silently swallowed

### 5.4 Disabled Prop
- **Test**: `disabled` overrides click handler
- **Steps**:
  1. Render with `disabled={true}`
  2. Try to click
- **Expected**: Adapter is NOT called
- **Fail if**: Click triggers the adapter

---

## 6. Components — SubscriptionStatusBadge

### 6.1 Free Plan
- **Test**: Badge reads "Free"
- **Steps**:
  1. Render with `status={{ plan: 'free', subscriptionStatus: 'none' }}`
- **Expected**: Badge label is "Free"
- **Fail if**: Badge is empty or wrong

### 6.2 Active Plan
- **Test**: Badge reads "Active · {plan}"
- **Steps**:
  1. Render with `status={{ plan: 'pro', subscriptionStatus: 'active' }}`
- **Expected**: "Active · pro"
- **Fail if**: Plan name missing or status wrong

### 6.3 Cancel-At-Period-End
- **Test**: Shows "ends {date}"
- **Steps**:
  1. Render with `status={{ plan: 'pro', subscriptionStatus: 'active', cancelAtPeriodEnd: true, currentPeriodEnd: '2026-12-31T00:00:00Z' }}`
- **Expected**: Badge shows "ends 2026-12-31"
- **Fail if**: The ends date is not shown

### 6.4 Past Due
- **Test**: Warning tone for `past_due`
- **Expected**: Badge has warning styling
- **Fail if**: Same styling as "active"

---

## 7. Components — PricingTable

### 7.1 Empty State
- **Test**: Empty products list
- **Steps**:
  1. Render with API that returns no products
- **Expected**: Renders "No products available."
- **Fail if**: Renders an empty grid with no message

### 7.2 Loading State
- **Test**: Initial render
- **Expected**: "Loading pricing…" is visible
- **Fail if**: Products from a previous fetch are shown before the first load

### 7.3 Error State
- **Test**: Failed fetch
- **Steps**:
  1. Render with API that returns 500
- **Expected**: Error message + Retry button
- **Fail if**: No error UI

### 7.4 Click Checkout
- **Test**: Clicking the per-card button starts checkout
- **Steps**:
  1. Render with at least one product
  2. Click the button
- **Expected**: Adapter's `createCheckout` is called with the product's id
- **Fail if**: Wrong product id is sent

### 7.5 Filter Interval
- **Test**: `filterInterval='monthly'` only shows monthly products
- **Steps**:
  1. Render with mixed products (some monthly, some yearly)
- **Expected**: Only monthly products are visible
- **Fail if**: Yearly products are visible

---

## 8. Components — BillingHistoryList

### 8.1 Auto-load
- **Test**: `autoLoad=true` (default) loads on mount
- **Expected**: List is populated after the network call resolves
- **Fail if**: Empty list forever

### 8.2 Empty State
- **Test**: No orders
- **Steps**:
  1. Render with adapter that returns `[]`
- **Expected**: "No invoices yet."
- **Fail if**: Blank page

### 8.3 Error State
- **Test**: Adapter failure
- **Steps**:
  1. Force `getBillingHistory` to throw
- **Expected**: Inline error with a Retry button
- **Fail if**: Silent failure

### 8.4 Refresh
- **Test**: Clicking "Refresh" re-issues the request
- **Expected**: Network call is made
- **Fail if**: No-op

---

## 9. Components — CustomerPortalLink

### 9.1 Open in New Tab
- **Test**: `target='open'` calls `window.open`
- **Steps**:
  1. Render with a stub adapter that returns a URL
  2. Click
- **Expected**: `window.open` is called with the URL
- **Fail if**: The URL is not opened

### 9.2 Redirect Mode
- **Test**: `target='redirect'` sets `window.location.href`
- **Steps**:
  1. Render with `target='redirect'`
  2. Click
- **Expected**: `window.location.href` is set
- **Fail if**: New tab is opened instead

### 9.3 Loading State
- **Test**: Label changes to "Opening…"
- **Steps**:
  1. Use a slow stub
  2. Click
- **Expected**: Label is "Opening…", button is disabled
- **Fail if**: User can double-click and trigger duplicate requests

### 9.4 Failure
- **Test**: Adapter throws
- **Expected**: Inline error appears under the link
- **Fail if**: Silent failure

---

## 10. Components — CancelSubscriptionButton

### 10.1 Opens Prompt
- **Test**: Clicking the button reveals the prompt
- **Steps**:
  1. Render the component
  2. Click "Cancel subscription"
- **Expected**: A reason selector appears
- **Fail if**: Nothing happens

### 10.2 Cancel Without Reason
- **Test**: Confirm with no selection
- **Steps**:
  1. Click the cancel button
  2. Click "Confirm cancel" without picking a reason
- **Expected**: Adapter is called with `reason: undefined`
- **Fail if**: A default reason is sent

### 10.3 Cancel With Reason
- **Test**: Confirm with "Too expensive"
- **Steps**:
  1. Click the cancel button
  2. Select "Too expensive" in the dropdown
  3. Click "Confirm cancel"
- **Expected**: Adapter is called with `reason: 'too_expensive'`
- **Fail if**: Wrong reason or no reason

### 10.4 Back Out
- **Test**: "Keep subscription" dismisses the prompt
- **Steps**:
  1. Open the prompt
  2. Click "Keep subscription"
- **Expected**: Prompt is hidden, no adapter call
- **Fail if**: The adapter is called

### 10.5 onSuccess Fires
- **Test**: After a successful cancel, the callback is invoked
- **Steps**:
  1. Mount with `onSuccess` spy
  2. Cancel
- **Expected**: Spy is called
- **Fail if**: Spy never called

### 10.6 Failure Displays Inline
- **Test**: Adapter rejects
- **Expected**: Error message under the button
- **Fail if**: Silent failure

---

## 11. Firebase Adapter

### 11.1 createFirebaseAdapter Returns PolarAdapter
- **Test**: Returned object has all required methods
- **Steps**:
  1. Call `createFirebaseAdapter({ functions, firestore })`
- **Expected**: Object exposes `getStatus`, `createCheckout`, `syncSubscription`, `getBillingHistory`, `cancelSubscription`, `getPortalUrl`
- **Fail if**: Any method is missing

### 11.2 getStatus Reads Firestore
- **Test**: User document is fetched
- **Steps**:
  1. Set up adapter with a Firestore mock
  2. Call `getStatus('user_1')`
- **Expected**: Firestore is queried at `users/user_1`
- **Fail if**: Wrong collection or document

### 11.3 getStatus Maps snake_case
- **Test**: Raw Firestore fields are mapped
- **Steps**:
  1. Firestore returns `{ plan: 'pro', subscriptionStatus: 'active', currentPeriodEnd: Timestamp }`
  2. Call `getStatus('user_1')`
- **Expected**:
  - `status.plan === 'pro'`
  - `status.subscriptionStatus === 'active'`
  - `status.currentPeriodEnd` is an ISO string
- **Fail if**: The raw snake_case is exposed

### 11.4 getStatus Missing Document
- **Test**: Non-existent user
- **Steps**:
  1. Firestore returns "not found"
  2. Call `getStatus('user_1')`
- **Expected**: `{ plan: 'free', subscriptionStatus: 'none' }`
- **Fail if**: Throws

### 11.5 createCheckout Throws on Invalid ProductId
- **Test**: Empty product id
- **Expected**: Rejects with `FirebaseBillingError(code='invalid-argument')`
- **Fail if**: Calls the function anyway

### 11.6 getBillingHistory Returns Empty on Error
- **Test**: Network failure
- **Steps**:
  1. Force the callable to throw
- **Expected**: Resolves with `[]` (no throw)
- **Fail if**: Throws

### 11.7 cancelSubscription Wraps Errors
- **Test**: Callable throws
- **Expected**: Rejects with `FirebaseBillingError(code='cancel-failed')`
- **Fail if**: The raw Firebase error is propagated

### 11.8 getPortalUrl Validates URL
- **Test**: Empty URL from backend
- **Steps**:
  1. Callable returns `{ url: '' }`
  2. Call `getPortalUrl('user_1')`
- **Expected**: Rejects with `FirebaseBillingError(code='invalid-response')`
- **Fail if**: Returns the empty string

### 11.9 Custom Field Names
- **Test**: Override the field mapping
- **Steps**:
  1. Configure adapter with `db: { planField: 'tier', ... }`
  2. Firestore has the field under `tier`
- **Expected**: Status uses the custom field
- **Fail if**: Default field is used

---

## 12. Polar Product API

### 12.1 getProducts Decodes Response
- **Test**: Standard Polar.sh response
- **Steps**:
  1. Mock a 200 with a known body
  2. Call `getProducts({ apiToken, baseUrl })`
- **Expected**: Returns `ProductListResponse` with mapped items
- **Fail if**: Throws

### 12.2 getProducts Throws on Error
- **Test**: 500 response
- **Expected**: Rejects with `PolarApiError`
- **Fail if**: Resolves with `null`

### 12.3 getProductById 404 Returns Null
- **Test**: Product not found
- **Expected**: Resolves with `null`
- **Fail if**: Throws

### 12.4 getAllProducts Paginates
- **Test**: Multiple pages
- **Steps**:
  1. Mock page 1 with `max_page: 3` and 2 items
  2. Mock page 2 with 2 items
  3. Mock page 3 with 1 item
  4. Call `getAllProducts({...})`
- **Expected**: Returns all 5 items
- **Fail if**: Only the first page is returned

### 12.5 getAllProducts Respects AbortSignal
- **Test**: Cancellation
- **Steps**:
  1. Create an `AbortController`
  2. Call `getAllProducts(..., { signal: controller.signal })`
  3. After the first page, call `controller.abort()`
- **Expected**: Subsequent pages are NOT requested
- **Fail if**: All pages are requested

### 12.6 getProducts Clamps Limit
- **Test**: Limit > 100
- **Steps**:
  1. Pass `limit: 500`
  2. Inspect the request URL
- **Expected**: `limit=100` is sent
- **Fail if**: `limit=500` is sent

---

## 13. Security & Validation

### 13.1 isValidCheckoutURL
- **Test**: http and https are accepted
- **Expected**:
  - `https://…` → `true`
  - `http://…` → `true`
- **Fail if**: `http://` is rejected

### 13.2 isProductionInsecureURL
- **Test**: Loopback exemption
- **Expected**:
  - `http://example.com` → `true`
  - `http://localhost:3000` → `false`
  - `https://polar.sh` → `false`
- **Fail if**: Loopback is flagged or production https is flagged

### 13.3 normalizeUserId
- **Test**: Whitespace handling
- **Expected**:
  - `"  user  "` → `"user"`
  - `""` → `undefined`
  - `undefined` → `undefined`
- **Fail if**: Whitespace is preserved or empty is accepted

### 13.4 isValidProductId
- **Test**: Type safety
- **Expected**:
  - `"prod_1"` → `true`
  - `""` → `false`
  - `42` → `false`
- **Fail if**: Numeric input is accepted

### 13.5 No Hardcoded Strings
- **Test**: Public UI components use no hardcoded user-facing literals
- **Steps**:
  1. Grep the source for "free" or "active" in component JSX
- **Expected**: Strings come from a centralized source
- **Fail if**: Hardcoded English text appears in components

---

## 14. iOS — PolarBillingService

### 14.1 Initial State
- **Test**: Free status before any user
- **Steps**:
  1. `let service = PolarBillingService(adapter: stub)`
- **Expected**: `service.status.plan == "free"`, `service.loadingState == .idle`
- **Fail if**: Initial state is anything else

### 14.2 setUser Triggers Refresh
- **Test**: `setUser("user_1")` calls `getStatus`
- **Steps**:
  1. Use a stub adapter that records calls
  2. Call `setUser("user_1")`
- **Expected**: `getStatus(userId: "user_1")` is called
- **Fail if**: `getStatus` is not called

### 14.3 setUser with nil Resets
- **Test**: Logging out
- **Steps**:
  1. Set a user, then `setUser(nil)`
- **Expected**: `service.status == .free`, `loadingState == .loaded`
- **Fail if**: The previous user is still active

### 14.4 Adapter Failure Sets .failed
- **Test**: Adapter throws
- **Expected**: `loadingState == .failed("…")` with the error description
- **Fail if**: The error is silently dropped

### 14.5 startCheckout Throws on Empty ProductId
- **Test**: Empty productId
- **Expected**: Throws `PolarBillingError(code: .invalidArgument)`
- **Fail if**: The adapter is called

### 14.6 startCheckout Throws Without User
- **Test**: No user set
- **Expected**: Throws `PolarBillingError(code: .invalidArgument)`
- **Fail if**: Adapter is called

### 14.7 startCheckout Rejects Insecure URL
- **Test**: Adapter returns `http://example.com`
- **Expected**: Throws `PolarBillingError(code: .invalidResponse)`
- **Fail if**: `Navigation.redirect` is called

### 14.8 cancelSubscription Refreshes on Success
- **Test**: Adapter returns `CancelResult(success: true)`
- **Expected**: `getStatus` is called after cancel
- **Fail if**: Refresh is skipped

### 14.9 getBillingHistory Returns Empty on Error
- **Test**: Adapter throws
- **Expected**: Returns `[]` (no throw)
- **Fail if**: Throws

---

## 15. iOS — PolarAdapterFactory

### 15.1 Firebase Factory Returns Adapter
- **Test**: Factory composes all six repositories
- **Steps**:
  1. Build with `PolarAdapterFactory.firebase(...)`
- **Expected**: Object conforms to `PolarAdapter`
- **Fail if**: Any method is missing

### 15.2 Custom Callable Names
- **Test**: Override function names
- **Steps**:
  1. Configure `CallablesNames(createCheckout: "myCheckout")`
  2. Call `createCheckout`
- **Expected**: Callable is called with `"myCheckout"`
- **Fail if**: The default name is used

### 15.3 Custom Firestore Paths
- **Test**: Override field names
- **Steps**:
  1. Configure `SubscriptionRepositoryConfig(planField: "tier", ...)`
  2. Reader returns data with `tier`
- **Expected**: `status.plan` is the value from `tier`
- **Fail if**: Default field is used

---

## 16. iOS — Navigation & Checkout

### 16.1 Default Strategy
- **Test**: UIKit app navigates
- **Steps**:
  1. On a UIKit app, trigger `startCheckout`
- **Expected**: `UIApplication.shared.open` is called
- **Fail if**: Nothing happens

### 16.2 Custom Strategy
- **Test**: In-app browser strategy
- **Steps**:
  1. `Navigation.strategy = MyInAppBrowserStrategy()`
  2. Trigger `startCheckout`
- **Expected**: Custom strategy is invoked
- **Fail if**: Default strategy runs

---

## 17. Edge Cases

### 17.1 Adapter That Never Resolves
- **Test**: Slow adapter
- **Steps**:
  1. Mount with adapter whose `getStatus` never resolves
- **Expected**: `loading === true` forever, no errors
- **Fail if**: State updates or errors leak

### 17.2 Adapter That Throws Synchronously
- **Test**: Adapter that throws on entry
- **Expected**: Treated like a rejected promise; free status applied
- **Fail if**: App crashes

### 17.3 Multiple Rapid Refreshes
- **Test**: Spam refresh
- **Steps**:
  1. Call `refresh()` 10 times in a row
- **Expected**: All 10 calls are dispatched (no debounce)
- **Fail if**: Calls are dropped or only one fires

### 17.4 Concurrent Users
- **Test**: Quick user change
- **Steps**:
  1. Set user_1, then immediately user_2 (before the first load resolves)
- **Expected**: Final state reflects user_2
- **Fail if**: user_1's status leaks

### 17.5 Missing Polar product benefit
- **Test**: Product with no benefits
- **Steps**:
  1. Product with `benefits: null`
- **Expected**: Product renders without crashing; benefits list is empty
- **Fail if**: Crash on undefined

### 17.6 Negative price amount
- **Test**: Refund or credit product
- **Steps**:
  1. Product with `amount: -100`
- **Expected**: Money formatter renders a negative currency value
- **Fail if**: NaN or error

### 17.7 Unicode product names
- **Test**: Turkish / emoji-bearing names
- **Steps**:
  1. Product with name "Pro Üyelik ✨"
- **Expected**: Displayed as-is without HTML/JS escape
- **Fail if**: HTML entities appear

### 17.8 Offline
- **Test**: Network unreachable
- **Steps**:
  1. Disable network
  2. Refresh
- **Expected**: Error is surfaced to the user; UI does not hang
- **Fail if**: Permanent loading state

---

## 18. Regression Risks

### 18.1 Status Races
- **Test**: Stale response overwrites fresh one
- **Steps**:
  1. Use two adapters (one slow, one fast). Mount with slow, then change user to fast.
  2. Wait for both to resolve.
- **Expected**: Final state is the fast one (latest)
- **Fail if**: Slow adapter's result overwrites the fast one

### 18.2 Effect Cleanup
- **Test**: `useEffect` cleanup on user change
- **Steps**:
  1. Toggle `userId` between `null` and a real id 5 times
  2. Inspect call counts on the adapter
- **Expected**: Each call resolves to the latest `userId`
- **Fail if**: Older calls fire after newer ones

### 18.3 Memory Leaks
- **Test**: Many mount/unmount cycles
- **Steps**:
  1. Mount and unmount the provider 50 times
  2. Use a memory profiler
- **Expected**: No retained adapters or refs
- **Fail if**: Memory grows linearly with cycles

### 18.4 Bundle Size
- **Test**: Web bundle size
- **Steps**:
  1. Build the package
  2. Inspect `dist/index.mjs`
- **Expected**: ~30 KB
- **Fail if**: Unexpected growth

### 18.5 React 19 Compatibility
- **Test**: Hooks work in React 19
- **Steps**:
  1. Mount in a React 19 app
- **Expected**: No warnings
- **Fail if**: React 19 deprecation warnings appear

---

## Pass Criteria

A build is considered production-ready when **all** of the following hold:

- [ ] All 80+ scenarios above pass
- [ ] `npm run lint` exits 0
- [ ] `npm run build` produces a working bundle
- [ ] `swift test` is green
- [ ] No `TODO`, `FIXME`, or hardcoded user-facing strings
- [ ] No commented-out blocks of code
- [ ] No `console.log` left in production paths
- [ ] Public API surface matches the documented `src/index.ts`
- [ ] iOS service correctly types against `PolarAdapter`
