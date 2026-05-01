import mongoose from 'mongoose';

const promoCodeRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]+$/;

const promotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    applicableTo: { type: String, enum: ['product', 'category', 'farmer'], required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    category: { type: String },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // target farmer
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // creator
    promoCode: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator(value) {
          if (!value) return true;
          if (!this.isNew && !this.isModified('promoCode')) return true;
          return promoCodeRegex.test(value);
        },
        message: 'Promo code must contain both letters and numbers (alphanumeric only)'
      }
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const Promotion = mongoose.model('Promotion', promotionSchema);
export default Promotion;
