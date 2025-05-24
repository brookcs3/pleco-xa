import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET, { apiVersion: '2023-08-16' });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: process.env.PREMIUM_PRICE_ID, quantity: 1 }],
      mode: 'payment',
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/canceled`,
    });

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ url: session.url }));
  } catch (err) {
    console.error('Stripe create session error:', err);
    res.statusCode = 500;
    res.end('Failed to create session');
  }
}
