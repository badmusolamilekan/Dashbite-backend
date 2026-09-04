import Stripe from 'stripe';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error('Stripe is not configured');
    error.statusCode = 503;
    throw error;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

export const createCheckoutSession = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findOne({ _id: orderId, customer: req.user._id }).populate('vendor', 'businessName');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.payment.status !== 'pending') {
    res.status(400);
    throw new Error('This order is no longer payable');
  }

  const stripe = getStripe();
  const lineItems = order.items.map((item) => ({
    price_data: {
      currency: 'ngn',
      product_data: { name: item.name },
      unit_amount: Math.round(item.priceAtOrder * 100),
    },
    quantity: item.quantity,
  }));

  if (order.tax > 0) {
    lineItems.push({
      price_data: {
        currency: 'ngn',
        product_data: { name: 'Tax' },
        unit_amount: Math.round(order.tax * 100),
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: Math.round(order.deliveryFee * 100), currency: 'ngn' },
          display_name: 'Delivery',
        },
      },
    ],
    customer_email: req.user.email,
    success_url: `${process.env.CLIENT_URL}/orders/${order._id}?payment=success`,
    cancel_url: `${process.env.CLIENT_URL}/orders/${order._id}?payment=cancelled`,
    metadata: { orderId: order._id.toString() },
  });

  order.payment.stripeSessionId = session.id;
  await order.save();

  res.json({ success: true, id: session.id, url: session.url });
});

export const handleStripeWebhook = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    res.status(400);
    throw new Error(`Stripe webhook signature verification failed: ${error.message}`);
  }

  const session = event.data.object;
  const orderId = session.metadata?.orderId;

  if (orderId && event.type === 'checkout.session.completed') {
    await Order.findByIdAndUpdate(orderId, {
      'payment.status': 'paid',
      'payment.stripePaymentIntentId': session.payment_intent,
      'payment.paidAt': new Date(),
    });
  }

  if (orderId && event.type === 'checkout.session.async_payment_failed') {
    await Order.findByIdAndUpdate(orderId, { 'payment.status': 'failed' });
  }

  res.json({ received: true });
});
