import Stripe from 'stripe';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-08-16' });

function signToken(sessionId) {
  const secret = process.env.PREMIUM_TOKEN_SECRET;
  const payload = `${sessionId}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

export default async function handler(req, res) {
  const { session_id } = req.query;
  if (!session_id) {
    res.statusCode = 400;
    res.end('Missing session_id');
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      res.statusCode = 402;
      res.end('Payment not completed');
      return;
    }

    const token = signToken(session_id);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ token }));
  } catch (err) {
    console.error('Stripe verify session error:', err);
    res.statusCode = 500;
    res.end('Failed to verify session');
  }
}
