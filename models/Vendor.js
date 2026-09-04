import mongoose from 'mongoose';

const operatingHoursSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      required: true,
    },
    open: { type: String, required: true },
    close: { type: String, required: true },
    isClosed: { type: Boolean, default: false },
  },
  { _id: false }
);

const vendorSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: 100,
    },
    description: { type: String, maxlength: 1000 },
    logoUrl: String,
    bannerUrl: String,
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    operatingHours: [operatingHoursSchema],
    commissionRate: {
      type: Number,
      default: 4,
      min: 0,
      max: 50,
    },
    menuItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
      },
    ],
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    isOpen: { type: Boolean, default: true },
    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsCount: { type: Number, default: 0 },
    minOrderAmount: { type: Number, default: 0 },
    estimatedPrepTimeMinutes: { type: Number, default: 20 },
    payoutDetails: {
      bankName: String,
      accountNumberLast4: String,
      routingNumberLast4: String,
    },
  },
  { timestamps: true }
);

vendorSchema.index({ 'address.city': 1 });
vendorSchema.index({ approvalStatus: 1 });
vendorSchema.index({ businessName: 'text', description: 'text' });

export default mongoose.model('Vendor', vendorSchema);
