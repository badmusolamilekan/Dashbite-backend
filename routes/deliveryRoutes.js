import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getDeliveryProfile, updateDeliveryAvailability, getAvailableDeliveries, acceptDelivery, rejectDelivery, getDeliveryEarnings } from '../controllers/deliveryController.js';

const router = express.Router();
router.use(protect, authorize('delivery'));
router.get('/profile', getDeliveryProfile);
router.patch('/availability', updateDeliveryAvailability);
router.get('/available-orders', getAvailableDeliveries);
router.patch('/orders/:id/accept', acceptDelivery);
router.patch('/orders/:id/reject', rejectDelivery);
router.get('/earnings', getDeliveryEarnings);

export default router;
