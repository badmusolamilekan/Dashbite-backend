import asyncHandler from 'express-async-handler';
import Vendor from '../models/Vendor.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';

const getVendorForUser = async (userId) => Vendor.findOne({ owner: userId });

export const getVendorProfile = asyncHandler(async (req, res) => {
  const vendor = await getVendorForUser(req.user._id);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor profile not found');
  }
  res.json({ success: true, vendor });
});

export const updateVendorProfile = asyncHandler(async (req, res) => {
  const vendor = await getVendorForUser(req.user._id);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor profile not found');
  }

  const allowedFields = ['businessName', 'description', 'logoUrl', 'bannerUrl', 'address', 'operatingHours', 'isOpen', 'minOrderAmount', 'estimatedPrepTimeMinutes'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) vendor[field] = req.body[field];
  });
  await vendor.save();
  res.json({ success: true, vendor });
});

export const listVendorMenu = asyncHandler(async (req, res) => {
  const vendor = await getVendorForUser(req.user._id);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor profile not found');
  }
  const menuItems = await MenuItem.find({ vendor: vendor._id }).sort({ name: 1 });
  res.json({ success: true, menuItems });
});

export const createMenuItem = asyncHandler(async (req, res) => {
  const vendor = await getVendorForUser(req.user._id);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor profile not found');
  }
  const menuItem = await MenuItem.create({ ...req.body, vendor: vendor._id });
  await Vendor.findByIdAndUpdate(vendor._id, { $addToSet: { menuItems: menuItem._id } });
  res.status(201).json({ success: true, menuItem });
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const vendor = await getVendorForUser(req.user._id);
  const menuItem = await MenuItem.findOne({ _id: req.params.id, vendor: vendor?._id });
  if (!menuItem) {
    res.status(404);
    throw new Error('Menu item not found');
  }
  const allowedFields = ['name', 'description', 'price', 'allergens', 'isAvailable', 'preparationTimeMinutes', 'imageUrl', 'calories', 'isVegetarian', 'isVegan', 'spicyLevel'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) menuItem[field] = req.body[field];
  });
  menuItem.approvalStatus = 'pending';
  await menuItem.save();
  res.json({ success: true, menuItem });
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  const vendor = await getVendorForUser(req.user._id);
  const menuItem = await MenuItem.findOneAndDelete({ _id: req.params.id, vendor: vendor?._id });
  if (!menuItem) {
    res.status(404);
    throw new Error('Menu item not found');
  }
  await Vendor.findByIdAndUpdate(vendor._id, { $pull: { menuItems: menuItem._id } });
  res.json({ success: true, message: 'Menu item deleted' });
});

export const getVendorOrders = asyncHandler(async (req, res) => {
  const vendor = await getVendorForUser(req.user._id);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor profile not found');
  }
  const orders = await Order.find({ vendor: vendor._id }).populate('customer', 'name phone').populate('deliveryPersonnel').sort('-createdAt');
  res.json({ success: true, count: orders.length, orders });
});

export const getVendorAnalytics = asyncHandler(async (req, res) => {
  const vendor = await getVendorForUser(req.user._id);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor profile not found');
  }
  const [summary] = await Order.aggregate([
    { $match: { vendor: vendor._id, 'payment.status': 'paid' } },
    { $group: { _id: null, revenue: { $sum: '$subtotal' }, commission: { $sum: '$platformCommission' }, orders: { $sum: 1 }, averageOrder: { $avg: '$totalAmount' } } },
  ]);
  const byStatus = await Order.aggregate([
    { $match: { vendor: vendor._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  res.json({ success: true, summary: summary || { revenue: 0, commission: 0, orders: 0, averageOrder: 0 }, byStatus });
});
