// createSession.js
// Creates a Stripe Checkout session and returns the redirect URL.
// Environment: STRIPE_SECRET, PREMIUM_PRICE_ID, BASE_URL

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET, {
  apiVersion: '2023-08-16',
});

export default async function handler(req, res) {
  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        { price: process.env.PREMIUM_PRICE_ID, quantity: 1 },
      ],

      mode: 'payment',
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/canceled`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create session' });

  }
}
