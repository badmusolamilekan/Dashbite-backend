import express from 'express';
import { body } from 'express-validator';
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  verifyOtp,
  resendOtp
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('phone').matches(/^\+?[0-9]{7,15}$/).withMessage('Valid phone number is required'),
    body('role').optional().isIn(['customer', 'vendor', 'delivery']).withMessage('Invalid account role'),
  ],
  validateRequest,
  registerUser
);

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail(), body('password').notEmpty()],
  validateRequest,
  loginUser
);

router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.post('/verify-otp', [body('email').isEmail(), body('otp').matches(/^\d{6}$/)], validateRequest, verifyOtp);
router.post('/resend-otp', authLimiter, [body('email').isEmail()], validateRequest, resendOtp);





export default router;
