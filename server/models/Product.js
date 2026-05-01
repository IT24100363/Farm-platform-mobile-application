import mongoose from 'mongoose';
import { PRODUCT_CATEGORIES, normalizeProductCategory } from '../constants/productCategories.js';

const productSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productName: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, 'Product name must be at least 3 characters'],
      maxlength: [50, 'Product name cannot exceed 50 characters']
    },
    category: {
      type: String,
      required: true,
      trim: true,
      set: (value) => normalizeProductCategory(value) || value,
      validate: {
        validator: (value) => PRODUCT_CATEGORIES.includes(normalizeProductCategory(value)),
        message: `Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Product description cannot exceed 500 characters']
    },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 0 },
    images: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    lowStockAlertSent: { type: Boolean, default: false },
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

productSchema.pre('save', function (next) {
  if (this.quantity === 0) this.isAvailable = false;
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
