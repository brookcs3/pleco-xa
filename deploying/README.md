# Deploying Pleco Xa with Railway

This folder contains a minimal example for running a Stripe Checkout backend on
[Railway](https://railway.app/). After a successful payment the API returns a
signed token that your client-side paywall script can store to unlock premium
features.

## 1. Create a Railway Project

1. Install the [Railway CLI](https://docs.railway.app/cli/install).
2. From this folder run `railway init` and follow the prompts.
3. Set these environment variables in the Railway dashboard:
   - `STRIPE_SECRET` – your Stripe secret key
   - `PREMIUM_PRICE_ID` – the Stripe price ID
   - `PREMIUM_TOKEN_SECRET` – random string for signing tokens

   - `BASE_URL` – public URL of your static site (e.g. `https://pleco-xa.com`)

Example `.env` file:

```bash
STRIPE_SECRET=sk_test_your_key
PREMIUM_PRICE_ID=price_123
PREMIUM_TOKEN_SECRET=your_token_secret
BASE_URL=https://your-site.com
```

## 2. Deploy the API

The `railway-api` directory defines two serverless endpoints:

- `createSession.js` – creates a Checkout session and returns the redirect URL
- `success.js` – verifies the session and returns a signed token

Push the project with `railway up` to deploy these functions. Railway will
install the dependencies declared in `package.json` automatically.

## 3. Integrate with the Paywall

On your success page, call `/success?session_id=...` to obtain the token and save
it in `localStorage` using the provided `paywall.js` helper. The token can then
be checked on subsequent visits to unlock premium UI elements.

