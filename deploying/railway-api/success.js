// success.js
// Validates a completed Checkout session and returns a JWT token.
// Environment: STRIPE_SECRET, PREMIUM_TOKEN_SECRET

import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

const stripe = new Stripe(process.env.STRIPE_SECRET, {
  apiVersion: '2023-08-16',
});

export default async function handler(req, res) {
  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not verified' });
    }
    const token = jwt.sign({ paid: true }, process.env.PREMIUM_TOKEN_SECRET, {
      expiresIn: '1y',
    });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
}
