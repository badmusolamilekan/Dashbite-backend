import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: 120,
    },
    description: { type: String, maxlength: 500 },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    allergens: {
      type: [String],
      enum: ['nuts', 'dairy', 'gluten', 'shellfish', 'soy', 'egg', 'fish', 'sesame'],
      default: [],
    },
    isAvailable: { type: Boolean, default: true },
    preparationTimeMinutes: { type: Number, default: 15, min: 1 },
    imageUrl: String,
    calories: Number,
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },
    spicyLevel: { type: Number, min: 0, max: 3, default: 0 },
  },
  { timestamps: true }
);

menuItemSchema.index({ vendor: 1, approvalStatus: 1, isAvailable: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('MenuItem', menuItemSchema);
