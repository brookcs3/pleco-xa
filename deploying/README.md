# Deploying Pleco Xa with Railway

This folder contains a minimal example for running a Stripe Checkout backend on
[Railway](https://railway.app/). After a successful payment the API returns a
signed token that your client-side paywall script can store to unlock premium
features. These handlers can also be deployed on any Node-compatible
serverless provider such as Vercel or Netlify.

## 1. Create a Railway Project


1. Install the [Railway CLI](https://docs.railway.app/cli/install).
2. From this folder run `railway init` and follow the prompts.


### Environment Variables

Set these variables in the Railway dashboard or a local `.env` file:

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

This folder provides two serverless handlers you can deploy anywhere:

- `createSession.js` – creates a Checkout session and returns the redirect URL
- `success.js` – verifies the session and returns a signed token
These handlers are wired up by `server.js`, which starts an Express server when
`npm start` is run.

Run `railway up` from the same `railway-api` folder to deploy these functions.
Railway will install the dependencies declared in `package.json` automatically.
A `Dockerfile` is included so the service can be built and started without any
additional configuration.
Note: the Nixpacks configuration runs `npm ci`, which requires a `package-lock.json`. This example does not include a lockfile, so Railway falls back to `npm install` during deployment. Generate a lock file first if you want to use `npm ci` for reproducible installs.


## 3. Integrate with the Paywall

On your success page, call `/success?session_id=...` to obtain the token and save
it in `localStorage` using the provided `paywall.js` helper. The token can then
be checked on subsequent visits to unlock premium UI elements.

