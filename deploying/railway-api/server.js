import express from 'express';
import createSession from './createSession.js';
import success from './success.js';

const app = express();
app.use(express.json());

const DEBUG_ENABLED = Boolean(process.env.PLECO_DEBUG);

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
