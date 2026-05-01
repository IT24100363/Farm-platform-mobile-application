import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: {
      type: String,
      trim: true,
      maxlength: [200, 'Review comment cannot exceed 200 characters']
    },
    farmerReply: { type: String },
    farmerReplyAt: { type: Date },
    farmerReplyBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const Review = mongoose.model('Review', reviewSchema);
export default Review;
