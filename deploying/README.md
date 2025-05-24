# Deploying Pleco Xa with Railway

This guide shows how to run a minimal Stripe payment backend on Railway and use it to unlock premium features in a static site.

## 1. Create a Railway Project

1. Install the [Railway CLI](https://docs.railway.app/cli/install) and run `railway init` inside this folder.
2. Set environment variables in the Railway dashboard:
   - `STRIPE_SECRET` – your Stripe secret key
   - `PREMIUM_PRICE_ID` – the price ID for the subscription or product
   - `PREMIUM_TOKEN_SECRET` – random string used to sign tokens
   - `BASE_URL` – public URL of your static site (e.g. `https://pleco-xa.com`)

## 2. Deploy the API

The `railway-api` directory contains two serverless endpoints:

- `createSession.js` – creates a Stripe Checkout session and returns the redirect URL
- `success.js` – verifies the session after payment and returns a signed token

Railway will automatically deploy these functions when the project is pushed. Each file exports a default handler in the Vercel style so no additional framework is required.

```
railway up
```

## 3. Client Integration

Call `/createSession` to start the checkout flow and redirect users to `url` from the response. After payment, Stripe redirects to your static site's `/success` page with `session_id` in the query. On page load fetch `/success?session_id=...` to obtain the token and store it with the included `paywall.js` helper:

```javascript
import { setPremiumToken } from '/paywall.js';

const params = new URLSearchParams(window.location.search);
fetch(`/success?session_id=${params.get('session_id')}`)
  .then(r => r.json())
  .then(data => setPremiumToken(data.token));
```

Premium components will become visible once a token is stored in `localStorage`.

## 4. Further Ideas

- Protect API routes with rate limits using `@railway/limits`
- Use a webhook to revoke tokens if payments fail
- Expand the token payload with user details or expiration

This lightweight setup keeps infrastructure minimal while enabling a paywall for advanced Pleco Xa features.
