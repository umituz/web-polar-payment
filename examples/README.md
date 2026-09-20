# Examples

## `basic/` — full account page

A complete account page wiring every public component:

```tsx
import { App } from './basic/App';
```

## `checkout-redirect/` — Polar return URL

Drop `<CheckoutReturn />` on the route that matches your `success_url`. It
reads `?checkout_id=…` from the URL and reconciles the subscription.

```tsx
import { CheckoutReturn } from './checkout-redirect/return-page';
```
