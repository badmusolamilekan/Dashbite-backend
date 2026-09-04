import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Vendor from '../models/Vendor.js';
import MenuItem from '../models/MenuItem.js';
import DeliveryPersonnel from '../models/DeliveryPersonnel.js';

const TAX_RATE = 0.075; 
const BASE_DELIVERY_FEE = 700; 

export const createOrder = asyncHandler(async (req, res) => {
  const { vendorId, items, deliveryAddress, payment } = req.body;

  if (payment?.method !== 'fake-payment' || payment?.status !== 'paid' || !/^\d{4}$/.test(payment.last4 || '') || !/^\d{2}\/\d{2}$/.test(payment.expiry || '')) {
    res.status(400);
    throw new Error('A valid fake bank card is required');
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('At least one order item is required');
  }

  const itemIds = items.map((item) => item.menuItemId);
  if (new Set(itemIds).size !== itemIds.length) {
    res.status(400);
    throw new Error('Duplicate menu items are not allowed');
  }

  const vendor = await Vendor.findById(vendorId);
  if (!vendor || vendor.approvalStatus !== 'approved') {
    res.status(404);
    throw new Error('Vendor not found or not currently accepting orders');
  }

  if (!vendor.isOpen) {
    res.status(400);
    throw new Error('This vendor is currently closed');
  }

  const menuItems = await MenuItem.find({ _id: { $in: itemIds }, vendor: vendorId, approvalStatus: 'approved' });

  if (menuItems.length !== itemIds.length) {
    res.status(400);
    throw new Error('One or more menu items are invalid for this vendor');
  }

  const orderItems = items.map((reqItem) => {
    const menuItem = menuItems.find((m) => m._id.toString() === reqItem.menuItemId);
    if (!menuItem.isAvailable) {
      res.status(400);
      throw new Error(`${menuItem.name} is currently unavailable`);
    }
    return {
      menuItem: menuItem._id,
      name: menuItem.name,
      quantity: reqItem.quantity,
      priceAtOrder: menuItem.price,
      specialInstructions: reqItem.specialInstructions,
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.priceAtOrder * item.quantity, 0);

  if (subtotal < vendor.minOrderAmount) {
    res.status(400);
    throw new Error(`Minimum order amount for this vendor is $${vendor.minOrderAmount}`);
  }

  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const deliveryFee = BASE_DELIVERY_FEE;
  const platformCommission = Number(((subtotal * vendor.commissionRate) / 100).toFixed(2));
  const totalAmount = Number((subtotal + tax + deliveryFee).toFixed(2));

  const prepMinutes = vendor.estimatedPrepTimeMinutes || 20;

  const order = await Order.create({
    customer: req.user._id,
    vendor: vendor._id,
    items: orderItems,
    subtotal,
    tax,
    deliveryFee,
    platformCommission,
    totalAmount,
    deliveryAddress,
    status: 'placed',
    estimatedDeliveryAt: new Date(Date.now() + (prepMinutes + 25) * 60 * 1000),
    payment: {
      method: 'fake-payment',
      status: 'paid',
      provider: 'demo',
      cardLast4: payment.last4,
      cardExpiry: payment.expiry,
      paidAt: new Date(),
    },
  });

  // Auto-assign the order to an active (available + approved) delivery partner.
  const availableDelivery = await DeliveryPersonnel.findOne({
    isAvailable: true,
    approvalStatus: 'approved',
    activeOrder: null,
  }).sort({ ratingsAverage: -1, updatedAt: 1 });

  if (availableDelivery) {
    order.deliveryPersonnel = availableDelivery._id;
    await order.save();
    availableDelivery.isAvailable = false;
    availableDelivery.activeOrder = order._id;
    await availableDelivery.save();
  }

  res.status(201).json({ success: true, order });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .populate('vendor', 'businessName logoUrl')
    .populate({
      path: 'deliveryPersonnel',
      select: 'user vehicle ratingsAverage',
      populate: { path: 'user', select: 'name phone' },
    })
    .sort('-createdAt');
  res.json({ success: true, count: orders.length, orders });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('vendor', 'owner businessName logoUrl address')
    .populate('customer', 'name phone')
    .populate('deliveryPersonnel');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const isOwner = order.customer._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const vendor = order.vendor;
  const isAssignedVendor =
    req.user.role === 'vendor' && vendor.owner?.toString() === req.user._id.toString();
  const isAssignedDelivery =
    order.deliveryPersonnel && order.deliveryPersonnel.user?.toString() === req.user._id.toString();

  if (!isOwner && !isAdmin && !isAssignedVendor && !isAssignedDelivery) {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }

  res.json({ success: true, order });
});

const VALID_TRANSITIONS = {
  placed: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const order = await Order.findById(req.params.id)
    .populate('vendor', 'owner')
    .populate('deliveryPersonnel', 'user');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const isAdmin = req.user.role === 'admin';
  const isVendorOwner =
    req.user.role === 'vendor' && order.vendor.owner.toString() === req.user._id.toString();
  const isAssignedDelivery =
    req.user.role === 'delivery' &&
    order.deliveryPersonnel?.user?.toString() === req.user._id.toString();

  if (isAssignedDelivery && !['out_for_delivery', 'delivered'].includes(status)) {
    res.status(403);
    throw new Error('Delivery personnel can only update delivery statuses');
  }

  if (req.user.role === 'vendor' && !isVendorOwner) {
    res.status(403);
    throw new Error('Not authorized to update this order');
  }

  if (!isAdmin && !isVendorOwner && !isAssignedDelivery) {
    res.status(403);
    throw new Error('Not authorized to update this order');
  }

  // A repeated request from a second tab or double-click is already complete.
  if (order.status === status) {
    res.json({ success: true, order });
    return;
  }

  const allowedNext = VALID_TRANSITIONS[order.status] || [];
  if (!allowedNext.includes(status)) {
    res.status(400);
    throw new Error(`Cannot transition order from '${order.status}' to '${status}'`);
  }

  if (['out_for_delivery', 'delivered'].includes(status) && !order.deliveryPersonnel) {
    res.status(400);
    throw new Error('A delivery person must be assigned first');
  }

  order.status = status;
  order.$locals.statusNote = note;
  if (status === 'delivered') {
    order.deliveredAt = new Date();
    if (order.deliveryPersonnel) {
      const deliveryPersonnelId = order.deliveryPersonnel._id || order.deliveryPersonnel;
      await DeliveryPersonnel.findByIdAndUpdate(deliveryPersonnelId, {
        $inc: {
          completedDeliveries: 1,
          'earnings.totalEarned': order.deliveryFee,
          'earnings.pendingPayout': order.deliveryFee,
        },
        activeOrder: null,
        isAvailable: true,
      });
    }
  }

  await order.save();

  res.json({ success: true, order });
});

export const assignDeliveryPersonnel = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.status !== 'ready_for_pickup' && order.status !== 'preparing') {
    res.status(400);
    throw new Error('Order is not ready for delivery assignment');
  }

  const deliveryPerson = await DeliveryPersonnel.findOne({
    user: req.user._id,
    isAvailable: true,
    approvalStatus: 'approved',
  });

  if (!deliveryPerson) {
    res.status(400);
    throw new Error('You are not currently available to accept deliveries');
  }

  if (order.deliveryPersonnel) {
    res.status(400);
    throw new Error('A delivery person is already assigned');
  }

  order.deliveryPersonnel = deliveryPerson._id;
  await order.save();

  deliveryPerson.isAvailable = false;
  deliveryPerson.activeOrder = order._id;
  await deliveryPerson.save();

  res.json({ success: true, order });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const isOwner = order.customer.toString() === req.user._id.toString();
  let isVendorOwner = false;
  if (req.user.role === 'vendor') {
    const vendor = await Vendor.findById(order.vendor).select('owner');
    isVendorOwner = vendor?.owner.toString() === req.user._id.toString();
  }

  if (!isOwner && req.user.role !== 'admin' && !isVendorOwner) {
    res.status(403);
    throw new Error('Not authorized to cancel this order');
  }

  if (!['placed', 'accepted'].includes(order.status)) {
    res.status(400);
    throw new Error('Order can no longer be cancelled at this stage');
  }

  // Free the assigned delivery partner so they can take new orders.
  if (order.deliveryPersonnel) {
    await DeliveryPersonnel.findByIdAndUpdate(order.deliveryPersonnel, {
      activeOrder: null,
      isAvailable: true,
    });
  }

  order.status = 'cancelled';
  await order.save();

  res.json({ success: true, order });
});

export const submitOrderReview = asyncHandler(async (req, res) => {
  const { foodRating, deliveryRating, comment } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.customer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to review this order');
  }

  if (order.status !== 'delivered') {
    res.status(400);
    throw new Error('Only delivered orders can be reviewed');
  }

  if (order.rating?.ratedAt) {
    res.status(400);
    throw new Error('This order has already been reviewed');
  }

  if (![foodRating, deliveryRating].every((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
    res.status(400);
    throw new Error('Ratings must be whole numbers from 1 to 5');
  }

  order.rating = { foodRating, deliveryRating, comment, ratedAt: new Date() };
  await order.save();

  const vendor = await Vendor.findById(order.vendor);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }
  const newCount = vendor.ratingsCount + 1;
  const newAverage = (vendor.ratingsAverage * vendor.ratingsCount + foodRating) / newCount;
  vendor.ratingsAverage = Number(newAverage.toFixed(2));
  vendor.ratingsCount = newCount;
  await vendor.save();

  res.json({ success: true, order });
});
