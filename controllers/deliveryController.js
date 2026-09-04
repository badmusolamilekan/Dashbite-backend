import asyncHandler from 'express-async-handler';
import DeliveryPersonnel from '../models/DeliveryPersonnel.js';
import Order from '../models/Order.js';

const getPersonnel = async (userId) => DeliveryPersonnel.findOne({ user: userId });

export const getDeliveryProfile = asyncHandler(async (req, res) => {
  const personnel = await DeliveryPersonnel.findOne({ user: req.user._id }).populate({
    path: 'activeOrder',
    populate: { path: 'vendor', select: 'businessName address' },
  });
  if (!personnel) {
    res.status(404);
    throw new Error('Delivery profile not found');
  }
  res.json({ success: true, personnel });
});

export const updateDeliveryAvailability = asyncHandler(async (req, res) => {
  const personnel = await getPersonnel(req.user._id);
  if (!personnel) {
    res.status(404);
    throw new Error('Delivery profile not found');
  }
  if (personnel.approvalStatus !== 'approved') {
    res.status(403);
    throw new Error('Delivery profile is not approved');
  }
  personnel.isAvailable = Boolean(req.body.isAvailable);
  if (req.body.location) personnel.currentLocation = { ...req.body.location, updatedAt: new Date() };
  await personnel.save();
  res.json({ success: true, personnel });
});

export const getAvailableDeliveries = asyncHandler(async (req, res) => {
  const personnel = await getPersonnel(req.user._id);
  if (!personnel || personnel.approvalStatus !== 'approved') {
    res.status(403);
    throw new Error('Approved delivery profile required');
  }
  const orders = await Order.find({ status: 'ready_for_pickup', deliveryPersonnel: null, rejectedByDelivery: { $ne: personnel._id } }).populate('vendor', 'businessName address').sort('createdAt');
  res.json({ success: true, orders });
});

export const rejectDelivery = asyncHandler(async (req, res) => {
  const personnel = await getPersonnel(req.user._id);
  if (!personnel || personnel.approvalStatus !== 'approved') {
    res.status(403);
    throw new Error('Approved delivery profile required');
  }
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: 'ready_for_pickup', deliveryPersonnel: null },
    { $addToSet: { rejectedByDelivery: personnel._id } },
    { new: true }
  );
  if (!order) {
    res.status(409);
    throw new Error('This delivery is no longer available');
  }
  res.json({ success: true, message: 'Delivery declined' });
});

export const acceptDelivery = asyncHandler(async (req, res) => {
  const personnel = await getPersonnel(req.user._id);
  if (!personnel || personnel.approvalStatus !== 'approved' || !personnel.isAvailable || personnel.activeOrder) {
    res.status(400);
    throw new Error('You are not available to accept a delivery');
  }
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: 'ready_for_pickup', deliveryPersonnel: null },
    { deliveryPersonnel: personnel._id },
    { new: true }
  );
  if (!order) {
    res.status(409);
    throw new Error('This delivery is no longer available');
  }
  personnel.activeOrder = order._id;
  personnel.isAvailable = false;
  await personnel.save();
  res.json({ success: true, order });
});

export const getDeliveryEarnings = asyncHandler(async (req, res) => {
  const personnel = await getPersonnel(req.user._id);
  if (!personnel) {
    res.status(404);
    throw new Error('Delivery profile not found');
  }
  const orders = await Order.find({ deliveryPersonnel: personnel._id }).select('vendor totalAmount deliveryFee status createdAt').populate('vendor', 'businessName').sort('-createdAt');
  res.json({ success: true, earnings: personnel.earnings, completedDeliveries: personnel.completedDeliveries, orders });
});
