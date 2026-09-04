import express from 'express';
import { createCheckoutSession, handleStripeWebhook } from '../controllers/stripeController.js';
import { protect, authorize } from '../middleware/auth.js';

const checkoutRouter = express.Router();
checkoutRouter.post('/create-checkout-session', protect, authorize('customer'), createCheckoutSession);

const webhookRouter = express.Router();
webhookRouter.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

export { checkoutRouter, webhookRouter };
