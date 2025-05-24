import express from 'express';
import createSession from './createSession.js';
import success from './success.js';

const app = express();
app.use(express.json());

app.post('/create-session', createSession);
app.get('/success', success);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
