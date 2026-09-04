import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getAdminAnalytics, listUsers, updateUser, updateDeliveryApproval, deleteUser, listVendors, updateVendorApproval, listMenuItems, updateMenuItemApproval, deleteMenuItem } from '../controllers/adminController.js';

const router = express.Router();
router.use(protect, authorize('admin'));
router.get('/analytics', getAdminAnalytics);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.patch('/users/:id/delivery-approval', updateDeliveryApproval);
router.delete('/users/:id', deleteUser);
router.get('/vendors', listVendors);
router.patch('/vendors/:id/approval', updateVendorApproval);
router.get('/menu-items', listMenuItems);
router.patch('/menu-items/:id/approval', updateMenuItemApproval);
router.delete('/menu-items/:id', deleteMenuItem);

export default router;