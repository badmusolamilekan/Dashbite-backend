import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Vendor from "../models/Vendor.js";
import Order from "../models/Order.js";
import MenuItem from "../models/MenuItem.js";
import DeliveryPersonnel from "../models/DeliveryPersonnel.js";

export const getAdminAnalytics = asyncHandler(async (req, res) => {
  const [users, vendors, orders, financials] = await Promise.all([
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    Vendor.aggregate([
      { $group: { _id: "$approvalStatus", count: { $sum: 1 } } },
    ]),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { "payment.status": "paid" } },
      {
        $group: {
          _id: null,
          gross: { $sum: "$totalAmount" },
          commission: { $sum: "$platformCommission" },
          orderCount: { $sum: 1 },
        },
      },
    ]),
  ]);
  res.json({
    success: true,
    users,
    vendors,
    orders,
    financials: financials[0] || { gross: 0, commission: 0, orderCount: 0 },
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select("-password -verificationToken -resetPasswordToken")
    .sort("-createdAt");
  const deliveryIds = users
    .filter((user) => user.role === "delivery")
    .map((user) => user._id);
  const deliveryProfiles = await DeliveryPersonnel.find({
    user: { $in: deliveryIds },
  }).select("user approvalStatus");
  const approvalByUser = new Map(
    deliveryProfiles.map((profile) => [
      profile.user.toString(),
      profile.approvalStatus,
    ]),
  );
  const usersWithApproval = users.map((user) => ({
    ...user.toSafeObject(),
    ...(user.role === "delivery"
      ? {
          deliveryApprovalStatus:
            approvalByUser.get(user._id.toString()) || "missing",
        }
      : {}),
  }));
  res.json({
    success: true,
    count: usersWithApproval.length,
    users: usersWithApproval,
  });
});

export const updateDeliveryApproval = asyncHandler(async (req, res) => {
  const { approvalStatus } = req.body;
  if (!["approved", "rejected", "suspended"].includes(approvalStatus)) {
    res.status(400);
    throw new Error("Invalid delivery approval status");
  }
  const personnel = await DeliveryPersonnel.findOneAndUpdate(
    { user: req.params.id },
    {
      approvalStatus,
      ...(approvalStatus !== "approved" ? { isAvailable: false } : {}),
    },
    { new: true, runValidators: true },
  );
  if (!personnel) {
    res.status(404);
    throw new Error("Delivery profile not found");
  }
  res.json({ success: true, personnel });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  ["name", "phone", "role", "isVerified", "isSuspended"].forEach((field) => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, user: user.toSafeObject() });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json({ success: true, message: "User deleted" });
});

export const listVendors = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find()
    .populate("owner", "name email phone")
    .sort("-createdAt");
  res.json({ success: true, count: vendors.length, vendors });
});

export const updateVendorApproval = asyncHandler(async (req, res) => {
  const { approvalStatus, commissionRate } = req.body;
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    res.status(404);
    throw new Error("Vendor not found");
  }
  if (approvalStatus !== undefined) vendor.approvalStatus = approvalStatus;
  if (commissionRate !== undefined) vendor.commissionRate = commissionRate;
  await vendor.save();
  res.json({ success: true, vendor });
});

export const listMenuItems = asyncHandler(async (req, res) => {
  const menuItems = await MenuItem.find()
    .populate({
      path: "vendor",
      select: "businessName owner",
      populate: { path: "owner", select: "name email" },
    })
    .sort("-createdAt");
  res.json({ success: true, count: menuItems.length, menuItems });
});

export const updateMenuItemApproval = asyncHandler(async (req, res) => {
  const { approvalStatus } = req.body;
  if (!["pending", "approved", "rejected"].includes(approvalStatus)) {
    res.status(400);
    throw new Error("Invalid menu item approval status");
  }
  const menuItem = await MenuItem.findByIdAndUpdate(
    req.params.id,
    { approvalStatus },
    { new: true, runValidators: true },
  );
  if (!menuItem) {
    res.status(404);
    throw new Error("Menu item not found");
  }
  res.json({ success: true, menuItem });
});
export const deleteMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
  if (!menuItem) {
    res.status(404);
    throw new Error("Menu item not found");
  }
  res.json({ success: true, message: "Menu item deleted" });
});
