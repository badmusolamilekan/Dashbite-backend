import mongoose from 'mongoose';

const deliveryPersonnelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    vehicle: {
      type: {
        type: String,
        enum: ['bike', 'motorcycle', 'car', 'scooter', 'on_foot'],
        required: true,
      },
      plateNumber: String,
      color: String,
    },
    license: {
      number: { type: String, required: true },
      expiryDate: { type: Date, required: true },
      documentUrl: String,
    },
    isAvailable: { type: Boolean, default: false },
    currentLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    activeOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    earnings: {
      totalEarned: { type: Number, default: 0 },
      pendingPayout: { type: Number, default: 0 },
      lastPayoutAt: Date,
    },
    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsCount: { type: Number, default: 0 },
    completedDeliveries: { type: Number, default: 0 },
  },
  { timestamps: true }
);

deliveryPersonnelSchema.index({ isAvailable: 1, approvalStatus: 1 });
deliveryPersonnelSchema.index({ 'currentLocation.lat': 1, 'currentLocation.lng': 1 });

export default mongoose.model('DeliveryPersonnel', deliveryPersonnelSchema);
