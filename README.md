# @umituz/web-polar-payment

Polar payment integration for web applications with subscription management.

## Features

- Checkout integration
- Subscription management
- Webhook handling
- Customer portal

## Installation

```bash
npm install @umituz/web-polar-payment
```

## Usage

```typescript
import { PolarCheckout } from '@umituz/web-polar-payment';

<PolarCheckout
  productId="prod_xxx"
  onSuccess={(session) => console.log(session)}
/>
```

## License

MIT
