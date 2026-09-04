import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtOrder: { type: Number, required: true, min: 0 },
    specialInstructions: String,
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    note: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    deliveryPersonnel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryPersonnel',
      default: null,
    },
    rejectedByDelivery: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryPersonnel',
    }],
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    platformCommission: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    tip: { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
    },
    statusHistory: [statusHistorySchema],
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    payment: {
      stripePaymentIntentId: String,
      stripeSessionId: String,
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
      },
      method: { type: String, default: 'card' },
      provider: String,
      cardLast4: { type: String, match: /^\d{4}$/ },
      cardExpiry: { type: String, match: /^\d{2}\/\d{2}$/ },
      paidAt: Date,
    },
    estimatedDeliveryAt: Date,
    deliveredAt: Date,
    cancellationReason: String,
    rating: {
      foodRating: { type: Number, min: 1, max: 5 },
      deliveryRating: { type: Number, min: 1, max: 5 },
      comment: String,
      ratedAt: Date,
    },
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ vendor: 1, status: 1 });
orderSchema.index({ deliveryPersonnel: 1, status: 1 });
orderSchema.index({ 'payment.stripeSessionId': 1 });

orderSchema.pre('save', function trackStatusHistory(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      note: this.$locals.statusNote,
    });
  }
  next();
});

export default mongoose.model('Order', orderSchema);
