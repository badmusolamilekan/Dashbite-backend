import express from 'express';
import { body } from 'express-validator';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  assignDeliveryPersonnel,
  cancelOrder,
  submitOrderReview,
} from '../controllers/orderController.js';
import { protect, authorize, requireVerified } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

router.use(protect);

router.post(
  '/',
  authorize('customer'),
  requireVerified,
  [
    body('vendorId').isMongoId().withMessage('Valid vendorId is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.menuItemId').isMongoId().withMessage('Valid menuItemId is required'),
    body('items.*.quantity').isInt({ min: 1, max: 50 }).withMessage('Quantity must be between 1 and 50'),
    body('deliveryAddress.street').trim().notEmpty().withMessage('Street is required'),
    body('deliveryAddress.city').trim().notEmpty().withMessage('City is required'),
    body('deliveryAddress.state').trim().notEmpty().withMessage('State is required'),
    body('deliveryAddress.zipCode').trim().notEmpty().withMessage('ZIP code is required'),
  ],
  validateRequest,
  createOrder
);
router.get('/my-orders', authorize('customer'), getMyOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', authorize('vendor', 'delivery', 'admin'), updateOrderStatus);
router.patch('/:id/assign-delivery', authorize('delivery'), assignDeliveryPersonnel);
router.patch('/:id/cancel', authorize('customer', 'vendor', 'admin'), cancelOrder);
router.post('/:id/review', authorize('customer'), submitOrderReview);

export default router;
