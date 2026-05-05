import Product from '../models/Product.js';
import Promotion from '../models/Promotion.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import { applyBestPromotion } from '../utils/applyBestPromotion.js';
import cloudinary from '../config/cloudinary.js';
import { handleLowStockAlert } from '../utils/lowStockAlerts.js';
import {
  PRODUCT_CATEGORIES,
  normalizeProductCategory,
  getCategoryMatchValues
} from '../constants/productCategories.js';

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const PRODUCT_NAME_MIN_LENGTH = 3;
const PRODUCT_NAME_MAX_LENGTH = 50;
const PRODUCT_DESCRIPTION_MAX_LENGTH = 500;

const sanitizeText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const resolvePublicBaseUrl = (req) => {
  const configured = String(process.env.SERVER_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  const host = req?.get?.('host');
  if (!host) return 'http://localhost:5000';
  return `${req.protocol}://${host}`.replace(/\/$/, '');
};

const formatDiscountBadge = (discountType, discountValue) => {
  if (!discountType || !Number.isFinite(Number(discountValue)) || Number(discountValue) <= 0) return null;
  if (discountType === 'percentage') {
    return `${Number(discountValue)}% OFF`;
  }
  const fixed = Number(discountValue);
  return `Rs ${Number.isInteger(fixed) ? fixed : fixed.toFixed(2)} OFF`;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const loadRatingMap = async (productIds = []) => {
  if (!productIds.length) return new Map();

  const stats = await Review.aggregate([
    { $match: { productId: { $in: productIds } } },
    {
      $group: {
        _id: '$productId',
        avg: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  return new Map(
    stats.map((entry) => [
      String(entry._id),
      {
        averageRating: Number(entry.avg.toFixed(2)),
        ratingCount: entry.count
      }
    ])
  );
};

const resolveAssignedFarmerId = async (farmerId) => {
  if (!farmerId) return { error: 'farmerId is required for admin-created products' };
  const farmer = await User.findOne({ _id: farmerId, role: 'farmer' });
  if (!farmer) return { error: 'Assigned farmer not found' };
  if (!farmer.isActive) return { error: 'Assigned farmer account is inactive' };
  if (!farmer.isApproved) return { error: 'Assigned farmer must be approved first' };
  return { farmerId: farmer._id };
};

export const createProduct = async (req, res, next) => {
  try {
    const productName = sanitizeText(req.body.productName);
    if (productName.length < PRODUCT_NAME_MIN_LENGTH || productName.length > PRODUCT_NAME_MAX_LENGTH) {
      return res.status(400).json({
        message: `Product name must be between ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters`
      });
    }

    const description = sanitizeText(req.body.description);
    if (description.length > PRODUCT_DESCRIPTION_MAX_LENGTH) {
      return res
        .status(400)
        .json({ message: `Product description cannot exceed ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters` });
    }

    const category = normalizeProductCategory(req.body.category);
    if (!category) {
      return res.status(400).json({ message: `Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}` });
    }

    const price = parseNumber(req.body.price);
    const quantity = parseNumber(req.body.quantity);
    if (price === null || price < 0) return res.status(400).json({ message: 'Price must be a valid non-negative number' });
    if (!Number.isInteger(quantity) || quantity < 0) return res.status(400).json({ message: 'Quantity must be a valid non-negative integer' });

    let farmerId = req.user._id;
    if (req.user.role === 'admin') {
      const assignment = await resolveAssignedFarmerId(req.body.farmerId);
      if (assignment.error) return res.status(400).json({ message: assignment.error });
      farmerId = assignment.farmerId;
    }

    const payload = {
      farmerId,
      productName,
      category,
      description: description || undefined,
      price,
      quantity,
      images: req.body.images || [],
      lowStockAlertSent: quantity < 5
    };
    const product = await Product.create(payload);
    res.status(201).json(product);
  } catch (err) { next(err); }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, farmerId: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const previousQuantity = product.quantity;

    if (req.body.productName !== undefined) {
      const productName = sanitizeText(req.body.productName);
      if (productName.length < PRODUCT_NAME_MIN_LENGTH || productName.length > PRODUCT_NAME_MAX_LENGTH) {
        return res.status(400).json({
          message: `Product name must be between ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters`
        });
      }
      product.productName = productName;
    }
    if (req.body.description !== undefined) {
      const description = sanitizeText(req.body.description);
      if (description.length > PRODUCT_DESCRIPTION_MAX_LENGTH) {
        return res
          .status(400)
          .json({ message: `Product description cannot exceed ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters` });
      }
      product.description = description;
    }
    if (req.body.images !== undefined) product.images = req.body.images;

    if (req.body.category !== undefined) {
      const category = normalizeProductCategory(req.body.category);
      if (!category) {
        return res.status(400).json({ message: `Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}` });
      }
      product.category = category;
    }

    if (req.body.price !== undefined) {
      const price = parseNumber(req.body.price);
      if (price === null || price < 0) return res.status(400).json({ message: 'Price must be a valid non-negative number' });
      product.price = price;
    }

    if (req.body.quantity !== undefined) {
      const quantity = parseNumber(req.body.quantity);
      if (!Number.isInteger(quantity) || quantity < 0) {
        return res.status(400).json({ message: 'Quantity must be a valid non-negative integer' });
      }
      product.quantity = quantity;
      if (quantity === 0) {
        product.isAvailable = false;
      }
    }

    if (req.body.isAvailable !== undefined && product.quantity > 0) {
      product.isAvailable = Boolean(req.body.isAvailable);
    }

    await product.save();
    await handleLowStockAlert({ product, previousQuantity, app: req.app });
    res.json(product);
  } catch (err) { next(err); }
};

export const updateStock = async (req, res, next) => {
  try {
    const quantity = parseNumber(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ message: 'Quantity must be a valid non-negative integer' });
    }

    const filter =
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, farmerId: req.user._id };

    const product = await Product.findOne(filter);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const previousQuantity = product.quantity;

    product.quantity = quantity;
    if (quantity === 0) {
      product.isAvailable = false;
    }
    await product.save();
    await handleLowStockAlert({ product, previousQuantity, app: req.app });
    res.json(product);
  } catch (err) { next(err); }
};

export const deleteProduct = async (req, res, next) => {
  try {
    await Product.deleteOne({ _id: req.params.id, farmerId: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

export const toggleProduct = async (req, res, next) => {
  try {
    const filter =
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, farmerId: req.user._id };
    const product = await Product.findOne(filter);
    if (!product) return res.status(404).json({ message: 'Not found' });
    product.isAvailable = !product.isAvailable;
    await product.save();
    res.json(product);
  } catch (err) { next(err); }
};

export const listMyProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ farmerId: req.user._id });
    res.json(products);
  } catch (err) { next(err); }
};

export const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const raw = req.file.path || req.file.secure_url || req.file.url;
    if (!raw) return res.status(500).json({ message: 'Upload failed: no url returned' });
    // cloudinary-storage returns an https URL in path; disk storage returns local path
    const url = raw.startsWith('http')
      ? raw
      : `${resolvePublicBaseUrl(req)}/uploads/${req.file.filename || raw.split(/[/\\\\]/).pop()}`;
    res.status(201).json({ url });
  } catch (err) { next(err); }
};

export const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', category, sort = 'newest', minPrice, maxPrice } = req.query;
    const filters = [];


    if (search) {
      filters.push({
        $or: [
        { productName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (category) {
      const categoryValues = getCategoryMatchValues(category);
      if (!categoryValues.length) {
        return res.status(400).json({ message: `Invalid category. Allowed values: ${PRODUCT_CATEGORIES.join(', ')}` });
      }
      filters.push({
        category: {
          $regex: `^(?:${categoryValues.map(escapeRegex).join('|')})$`,
          $options: 'i'
        }
      });
    }

    if (minPrice || maxPrice) {
      filters.push({
        price: {
          ...(minPrice ? { $gte: Number(minPrice) } : {}),
          ...(maxPrice ? { $lte: Number(maxPrice) } : {})
        }
      });
    }

    const query = filters.length ? { $and: filters } : {};

    let sortQuery = { createdAt: -1 };
    if (sort === 'price_asc') sortQuery = { price: 1 };
    if (sort === 'price_desc') sortQuery = { price: -1 };
    if (sort === 'rating') sortQuery = { averageRating: -1 };

    const [items, total] = await Promise.all([
      Product.find(query)
        .populate('farmerId', 'name email')
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Product.countDocuments(query)
    ]);
    const ratingMap = await loadRatingMap(items.map((item) => item._id));

    // attach best promo info
    const promoIds = await Promotion.find({ isActive: true, isApproved: true });
    const productsWithDiscount = items.map((p) => {
      const best = applyBestPromotion(p, promoIds);
      const rating = ratingMap.get(String(p._id));
      return {
        ...p.toObject(),
        averageRating: rating?.averageRating ?? 0,
        ratingCount: rating?.ratingCount ?? 0,
        discount: best.discountAmount,
        promotionId: best.promotionId,
        discountType: best.discountType,
        discountValue: best.discountValue,
        discountBadge: formatDiscountBadge(best.discountType, best.discountValue)
      };
    });

    if (sort === 'rating') {
      productsWithDiscount.sort((a, b) => {
        if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
        return (b.ratingCount || 0) - (a.ratingCount || 0);
      });
    }

    res.json({ items: productsWithDiscount, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('farmerId', 'name email');
    if (!product) return res.status(404).json({ message: 'Not found' });
    const ratingMap = await loadRatingMap([product._id]);
    const rating = ratingMap.get(String(product._id));
    const promotions = await Promotion.find({ isActive: true, isApproved: true });
    const best = applyBestPromotion(product, promotions);
    res.json({
      ...product.toObject(),
      averageRating: rating?.averageRating ?? 0,
      ratingCount: rating?.ratingCount ?? 0,
      discount: best.discountAmount,
      promotionId: best.promotionId,
      discountType: best.discountType,
      discountValue: best.discountValue,
      discountBadge: formatDiscountBadge(best.discountType, best.discountValue)
    });
  } catch (err) { next(err); }
};

export const getProductCategories = async (req, res) => {
  res.json(PRODUCT_CATEGORIES);
};

export const getProductInsights = async (req, res, next) => {
  try {
    const [products, reviewStats, salesStats] = await Promise.all([
      Product.find({})
        .populate('farmerId', 'name')
        .lean(),
      Review.aggregate([
        {
          $group: {
            _id: '$productId',
            averageRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 }
          }
        }
      ]),
      Order.aggregate([
        { $match: { orderStatus: { $nin: ['Cancelled', 'Refunded'] } } },
        { $unwind: '$products' },
        {
          $group: {
            _id: '$products.productId',
            unitsSold: { $sum: '$products.quantity' },
            orderCount: { $sum: 1 },
            revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
          }
        }
      ])
    ]);

    const reviewMap = new Map(reviewStats.map((item) => [String(item._id), item]));
    const salesMap = new Map(salesStats.map((item) => [String(item._id), item]));

    const enriched = products.map((product) => {
      const review = reviewMap.get(String(product._id)) || {};
      const sales = salesMap.get(String(product._id)) || {};
      const popularityScore =
        Number(sales.unitsSold || 0) * 3 + Number(review.reviewCount || 0) * 2 + Number(review.averageRating || product.averageRating || 0) * 10;

      return {
        ...product,
        averageRating: Number(review.averageRating ?? product.averageRating ?? 0),
        ratingCount: Number(review.reviewCount ?? product.ratingCount ?? 0),
        unitsSold: Number(sales.unitsSold || 0),
        orderCount: Number(sales.orderCount || 0),
        revenue: Number(sales.revenue || 0),
        popularityScore
      };
    });

    const topRated = [...enriched]
      .sort((a, b) => {
        if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
        if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
        return b.popularityScore - a.popularityScore;
      })
      .slice(0, 6);

    const bestSelling = [...enriched]
      .sort((a, b) => {
        if (b.unitsSold !== a.unitsSold) return b.unitsSold - a.unitsSold;
        if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
        return b.popularityScore - a.popularityScore;
      })
      .slice(0, 6);

    const mostPopular = [...enriched]
      .sort((a, b) => {
        if (b.popularityScore !== a.popularityScore) return b.popularityScore - a.popularityScore;
        if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
        return b.unitsSold - a.unitsSold;
      })
      .slice(0, 6);

    const topIds = new Set([...topRated, ...bestSelling, ...mostPopular].map((item) => String(item._id)));
    const recentReviews = await Review.find({ productId: { $in: [...topIds] } })
      .populate('customerId', 'name')
      .populate('productId', 'productName images category')
      .sort({ createdAt: -1 })
      .limit(8);

    const summary = {
      totalProducts: enriched.length,
      ratedProducts: enriched.filter((product) => Number(product.ratingCount || 0) > 0).length,
      totalReviews: reviewStats.reduce((sum, item) => sum + Number(item.reviewCount || 0), 0),
      totalUnitsSold: salesStats.reduce((sum, item) => sum + Number(item.unitsSold || 0), 0),
      totalRevenue: salesStats.reduce((sum, item) => sum + Number(item.revenue || 0), 0),
      averageRating: enriched.length
        ? Number((enriched.reduce((sum, item) => sum + Number(item.averageRating || 0), 0) / enriched.length).toFixed(2))
        : 0
    };

    res.json({
      summary,
      topRated,
      bestSelling,
      mostPopular,
      recentReviews
    });
  } catch (err) {
    next(err);
  }
};

// Admin utilities
export const adminListProducts = async (req, res, next) => {
  try {
    // reuse getProducts but includeInactive=true
    req.query.includeInactive = 'true';
    return getProducts(req, res, next);
  } catch (err) { next(err); }
};

export const adminUpdateProduct = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.farmerId === '') delete updates.farmerId;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });
    const previousQuantity = product.quantity;

    if (updates.category !== undefined) {
      const category = normalizeProductCategory(updates.category);
      if (!category) {
        return res.status(400).json({ message: `Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}` });
      }
      updates.category = category;
    }

    if (updates.farmerId !== undefined) {
      const assignment = await resolveAssignedFarmerId(updates.farmerId);
      if (assignment.error) return res.status(400).json({ message: assignment.error });
      updates.farmerId = assignment.farmerId;
    }

    if (updates.price !== undefined) {
      const price = parseNumber(updates.price);
      if (price === null || price < 0) return res.status(400).json({ message: 'Price must be a valid non-negative number' });
      updates.price = price;
    }
    if (updates.quantity !== undefined) {
      const quantity = parseNumber(updates.quantity);
      if (!Number.isInteger(quantity) || quantity < 0) {
        return res.status(400).json({ message: 'Quantity must be a valid non-negative integer' });
      }
      updates.quantity = quantity;
      if (quantity === 0) {
        updates.isAvailable = false;
      }
    }

    if (updates.productName !== undefined) {
      const productName = sanitizeText(updates.productName);
      if (productName.length < PRODUCT_NAME_MIN_LENGTH || productName.length > PRODUCT_NAME_MAX_LENGTH) {
        return res.status(400).json({
          message: `Product name must be between ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters`
        });
      }
      updates.productName = productName;
    }

    if (updates.description !== undefined) {
      const description = sanitizeText(updates.description);
      if (description.length > PRODUCT_DESCRIPTION_MAX_LENGTH) {
        return res
          .status(400)
          .json({ message: `Product description cannot exceed ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters` });
      }
      updates.description = description;
    }

    if (updates.productName !== undefined) product.productName = updates.productName;
    if (updates.description !== undefined) product.description = updates.description;
    if (updates.images !== undefined) product.images = updates.images;
    if (updates.farmerId !== undefined) product.farmerId = updates.farmerId;
    if (updates.category !== undefined) product.category = updates.category;
    if (updates.price !== undefined) product.price = updates.price;
    if (updates.quantity !== undefined) product.quantity = updates.quantity;
    if (updates.isAvailable !== undefined && product.quantity > 0) {
      product.isAvailable = Boolean(updates.isAvailable);
    }

    await product.save();
    await handleLowStockAlert({ product, previousQuantity, app: req.app });
    res.json(product);
  } catch (err) { next(err); }
};

export const adminDeleteProduct = async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
