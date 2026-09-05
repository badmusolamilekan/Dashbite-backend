import crypto from 'node:crypto';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import DeliveryPersonnel from '../models/DeliveryPersonnel.js';
import generateToken, { setTokenCookie } from '../services/generateToken.js';
import sendEmail, { verificationEmail } from '../services/sendEmail.js';

const normalizeEmail = (email) => email.trim().toLowerCase();

const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');

const isValidVendorProfile = (profile) => (
  profile?.businessName
  && profile.address?.street
  && profile.address?.city
  && profile.address?.state
  && profile.address?.zipCode
);

const isValidDeliveryProfile = (profile) => (
  profile?.vehicleType
  && profile.licenseNumber
  && profile.licenseExpiry
);

const createRoleProfile = async (user, role, vendorProfile, deliveryProfile) => {
  if (role === 'vendor') {
    await Vendor.create({
      owner: user._id,
      businessName: vendorProfile.businessName,
      description: vendorProfile.description,
      address: vendorProfile.address,
      approvalStatus: 'pending',
    });
  }

  if (role === 'delivery') {
    await DeliveryPersonnel.create({
      user: user._id,
      vehicle: { type: deliveryProfile.vehicleType, plateNumber: deliveryProfile.plateNumber, color: deliveryProfile.vehicleColor },
      license: { number: deliveryProfile.licenseNumber, expiryDate: deliveryProfile.licenseExpiry },
      approvalStatus: 'pending',
    });
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  const { name, password, phone, role = 'customer', vendorProfile, deliveryProfile } = req.body;
  const email = normalizeEmail(req.body.email);

  const allowedRoles = ['customer', 'vendor', 'delivery'];
  if (!allowedRoles.includes(role)) {
    res.status(400);
    throw new Error('Please select a valid account role');
  }

  if (role === 'vendor' && !isValidVendorProfile(vendorProfile)) {
    res.status(400);
    throw new Error('Vendor business details are required');
  }

  if (role === 'delivery' && !isValidDeliveryProfile(deliveryProfile)) {
    res.status(400);
    throw new Error('Delivery vehicle and license details are required');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const verificationOtp = crypto.randomInt(100000, 1000000).toString();

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role,
    verificationOtp: verificationOtp,
    verificationOtpExpires: Date.now() + 10 * 60 * 1000,
  });

  await createRoleProfile(user, role, vendorProfile, deliveryProfile);

  // Send response immediately - don't wait for email
  res.status(201).json({
    success: true,
    verificationRequired: true,
    email: user.email,
    message: 'Account created! Check your email for verification code.',
  });

  // Send email in background (non-blocking)
  sendEmail({
    to: user.email,
    subject: 'Your Dash verification code',
    html: verificationEmail({ heading: 'Welcome', name: user.name, message: 'Use this code to finish setting up your account.', otp: verificationOtp }),
  }).then(() => {
    console.log(`[EMAIL] OTP sent successfully to ${user.email}`);
  }).catch((err) => {
    console.warn(`[EMAIL] Failed to send OTP to ${user.email}: ${err.message}`);
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = req.body.otp.trim();
  const verificationOtp = otp;
  const user = await User.findOne({
    email,
    verificationOtp: verificationOtp,
    verificationOtpExpires: { $gt: Date.now() },
  }).select('+verificationOtp');

  if (!user) {
    res.status(400);
    throw new Error('That code is invalid or has expired');
  }

  user.isVerified = true;
  user.verificationOtp = undefined;
  user.verificationOtpExpires = undefined;
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id, user.role);
  setTokenCookie(res, token);
  res.json({ success: true, token, user: user.toSafeObject() });
});

export const resendOtp = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ email }).select('+verificationOtp');

  if (!user || user.isVerified) {
    res.json({ success: true, message: 'If verification is needed, a new code has been sent' });
    return;
  }

  const otp = crypto.randomInt(100000, 1000000).toString();

  user.verificationOtp = otp;
  user.verificationOtpExpires = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  // Send response immediately - don't wait for email
  res.json({
    success: true,
    message: 'A new verification code has been sent.',
  });

  // Send email in background (non-blocking)
  sendEmail({
    to: user.email,
    subject: 'Your new Dash verification code',
    html: verificationEmail({ heading: 'Your new code', message: 'Enter this code in Dash to verify your email.', otp }),
  }).then(() => {
    console.log(`[EMAIL] Resent OTP successfully to ${user.email}`);
  }).catch((err) => {
    console.warn(`[EMAIL] Failed to resend OTP to ${user.email}: ${err.message}`);
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const email = normalizeEmail(req.body.email);

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (user.isSuspended) {
    res.status(403);
    throw new Error('This account has been suspended');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id, user.role);
  setTokenCookie(res, token);

  res.json({
    success: true,
    token,
    user: user.toSafeObject(),
  });
});

export const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});


