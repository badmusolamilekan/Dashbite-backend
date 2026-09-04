import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401);
      throw new Error('Not authorized, user no longer exists');
    }

    if (user.isSuspended) {
      res.status(403);
      throw new Error('Account suspended');
    }

    req.user = user;
    next();
  } catch (error) {
    if (res.statusCode === 403) {
      throw error;
    }
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
});

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Role '${req.user?.role}' is not permitted to access this resource`);
    }
    next();
  };
};

export const requireVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    res.status(403);
    throw new Error('Please verify your account before continuing');
  }
  next();
};
