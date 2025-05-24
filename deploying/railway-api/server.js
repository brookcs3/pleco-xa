import express from 'express';
import createSession from './createSession.js';
import success from './success.js';

const app = express();
app.use(express.json());

const DEBUG_ENABLED = Boolean(process.env.PLECO_DEBUG);

const REQUIRED_ENV = ['STRIPE_SECRET', 'PREMIUM_PRICE_ID', 'PREMIUM_TOKEN_SECRET', 'BASE_URL'];
REQUIRED_ENV.forEach((name) => {
  if (!process.env[name]) {
    console.warn(`Warning: environment variable ${name} is not set`);
  }
});

function debugLog(...args) {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
}

app.post('/create-session', createSession);
app.get('/success', success);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  debugLog(`Server listening on port ${port}`);
});
