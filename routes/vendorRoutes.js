import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { getVendorProfile, updateVendorProfile, listVendorMenu, createMenuItem, updateMenuItem, deleteMenuItem, getVendorOrders, getVendorAnalytics } from '../controllers/vendorController.js';

const router = express.Router();
router.use(protect, authorize('vendor'));
router.get('/profile', getVendorProfile);
router.patch('/profile', updateVendorProfile);
router.get('/menu', listVendorMenu);
router.post('/menu', [body('name').trim().notEmpty(), body('price').isFloat({ min: 0 })], validateRequest, createMenuItem);
router.patch('/menu/:id', updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);
router.get('/orders', getVendorOrders);
router.get('/analytics', getVendorAnalytics);

export default router;
