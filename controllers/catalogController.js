import asyncHandler from 'express-async-handler';
import Vendor from '../models/Vendor.js';
import MenuItem from '../models/MenuItem.js';

export const getCatalog = asyncHandler(async (req, res) => {
  const search = req.query.search?.trim();
  const vendorQuery = {
    approvalStatus: 'approved',
    isOpen: true,
  };

  const vendorSearchQuery = search ? {
    ...vendorQuery,
    $or: [
      { businessName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ],
  } : vendorQuery;

  const eligibleVendors = await Vendor.find(vendorQuery)
    .select('businessName description logoUrl bannerUrl address ratingsAverage ratingsCount minOrderAmount estimatedPrepTimeMinutes')
    .sort({ ratingsAverage: -1, businessName: 1 })
    .lean();

  const vendorIds = eligibleVendors.map((vendor) => vendor._id);
  const itemQuery = { vendor: { $in: vendorIds }, approvalStatus: 'approved', isAvailable: true };

  if (search) {
    itemQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const menuItems = await MenuItem.find(itemQuery)
    .select('vendor name description price imageUrl isVegetarian isVegan preparationTimeMinutes')
    .sort({ createdAt: -1 })
    .lean();

  const vendorMatches = search ? await Vendor.find(vendorSearchQuery).select('_id').lean() : eligibleVendors;
  const matchingVendorIds = new Set([
    ...vendorMatches.map((vendor) => vendor._id.toString()),
    ...menuItems.map((item) => item.vendor.toString()),
  ]);
  const vendors = search
    ? eligibleVendors.filter((vendor) => matchingVendorIds.has(vendor._id.toString()))
    : eligibleVendors;

  res.json({
    success: true,
    vendors,
    menuItems,
  });
});
