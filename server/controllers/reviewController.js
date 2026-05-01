import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

const REVIEW_COMMENT_MAX_LENGTH = 200;

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const raw = String(value).trim();
  return mongoose.Types.ObjectId.isValid(raw) ? new mongoose.Types.ObjectId(raw) : null;
};

const recomputeRating = async (productId) => {
  const normalizedProductId = toObjectId(productId);
  if (!normalizedProductId) return;

  const stats = await Review.aggregate([
    { $match: { productId: normalizedProductId } },
    { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  if (stats.length) {
    await Product.findByIdAndUpdate(normalizedProductId, {
      averageRating: Number(stats[0].avg.toFixed(2)),
      ratingCount: stats[0].count
    });
  } else {
    await Product.findByIdAndUpdate(normalizedProductId, { averageRating: 0, ratingCount: 0 });
  }
};

export const addReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;
    const normalizedComment = String(comment || '').trim();
    if (normalizedComment.length > REVIEW_COMMENT_MAX_LENGTH) {
      return res.status(400).json({ message: `Review comment cannot exceed ${REVIEW_COMMENT_MAX_LENGTH} characters` });
    }

    const normalizedProductId = toObjectId(productId);
    if (!normalizedProductId) return res.status(400).json({ message: 'Invalid product id' });
    const product = await Product.findById(normalizedProductId).select('_id farmerId productName');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const deliveredOrder = await Order.findOne({
      customerId: req.user._id,
      'products.productId': normalizedProductId,
      orderStatus: 'Delivered'
    });
    if (!deliveredOrder) return res.status(400).json({ message: 'You can review only delivered orders' });
    const review = await Review.create({
      customerId: req.user._id,
      productId: normalizedProductId,
      rating,
      comment: normalizedComment
    });

    await recomputeRating(normalizedProductId);
    if (product.farmerId) {
      const notification = await Notification.create({
        userId: product.farmerId,
        message: `New review submitted for ${product.productName}`,
        type: 'review'
      });
      req.app.get('io')?.to(product.farmerId.toString()).emit('notification', notification);
    }

    res.status(201).json(review);
  } catch (err) { next(err); }
};

export const updateReview = async (req, res, next) => {
  try {
    const payload = {};
    if (req.body.rating !== undefined) payload.rating = req.body.rating;
    if (req.body.comment !== undefined) {
      const normalizedComment = String(req.body.comment || '').trim();
      if (normalizedComment.length > REVIEW_COMMENT_MAX_LENGTH) {
        return res.status(400).json({ message: `Review comment cannot exceed ${REVIEW_COMMENT_MAX_LENGTH} characters` });
      }
      payload.comment = normalizedComment;
    }
    if (!Object.keys(payload).length) {
      return res.status(400).json({ message: 'No review fields to update' });
    }

    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, customerId: req.user._id },
      payload,
      { new: true }
    );
    if (!review) return res.status(404).json({ message: 'Review not found' });
    await recomputeRating(review.productId);
    res.json(review);
  } catch (err) { next(err); }
};

export const deleteReview = async (req, res, next) => {
  try {
    const query =
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, customerId: req.user._id };

    const deleted = await Review.findOneAndDelete(query);
    if (!deleted) return res.status(404).json({ message: 'Review not found' });

    await recomputeRating(deleted.productId);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

export const getReviewsForProduct = async (req, res, next) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .populate('customerId', 'name')
      .populate('farmerReplyBy', 'name role')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) { next(err); }
};

export const listManageReviews = async (req, res, next) => {
  try {
    const { rating, search = '' } = req.query;
    const filter = {};

    if (rating !== undefined && rating !== '') {
      const parsedRating = Number(rating);
      if (Number.isInteger(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
        filter.rating = parsedRating;
      }
    }

    if (req.user.role === 'farmer') {
      const farmerProducts = await Product.find({ farmerId: req.user._id }).select('_id');
      const ids = farmerProducts.map((product) => product._id);
      if (!ids.length) return res.json([]);
      filter.productId = { $in: ids };
    }

    const reviews = await Review.find(filter)
      .populate('customerId', 'name email')
      .populate({ path: 'productId', select: 'productName farmerId images' })
      .populate('farmerReplyBy', 'name role')
      .sort({ createdAt: -1 });

    const normalizedSearch = String(search || '').trim().toLowerCase();
    const filtered = normalizedSearch
      ? reviews.filter((review) => {
        const productName = review.productId?.productName?.toLowerCase() || '';
        const customerName = review.customerId?.name?.toLowerCase() || '';
        const comment = String(review.comment || '').toLowerCase();
        const reply = String(review.farmerReply || '').toLowerCase();
        return (
          productName.includes(normalizedSearch) ||
          customerName.includes(normalizedSearch) ||
          comment.includes(normalizedSearch) ||
          reply.includes(normalizedSearch)
        );
      })
      : reviews;

    res.json(filtered);
  } catch (err) { next(err); }
};

export const replyToReview = async (req, res, next) => {
  try {
    const reply = String(req.body.reply || '').trim();
    if (!reply) return res.status(400).json({ message: 'Reply is required' });

    const review = await Review.findById(req.params.id)
      .populate({ path: 'productId', select: 'productName farmerId' });
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (!review.productId) {
      return res.status(400).json({ message: 'Cannot reply: linked product is missing' });
    }

    if (
      req.user.role === 'farmer' &&
      review.productId.farmerId?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Forbidden: not your product review' });
    }

    review.farmerReply = reply;
    review.farmerReplyAt = new Date();
    review.farmerReplyBy = req.user._id;
    await review.save();

    const reloaded = await Review.findById(review._id)
      .populate('customerId', 'name email')
      .populate({ path: 'productId', select: 'productName farmerId images' })
      .populate('farmerReplyBy', 'name role');

    const replier = req.user.role === 'admin' ? 'Admin' : 'Farmer';
    const notification = await Notification.create({
      userId: review.customerId,
      message: `${replier} replied to your review on ${review.productId.productName}`,
      type: 'review'
    });
    req.app.get('io')?.to(review.customerId.toString()).emit('notification', notification);

    res.json(reloaded);
  } catch (err) { next(err); }
};
