import mongoose from 'mongoose';
import Promotion from '../models/Promotion.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { normalizeProductCategory, PRODUCT_CATEGORIES } from '../constants/productCategories.js';

const ALLOW_FARMER_SELF_ACTIVATE_PRODUCT_PROMOS =
  process.env.ALLOW_FARMER_SELF_ACTIVATE_PRODUCT_PROMOS
    ? process.env.ALLOW_FARMER_SELF_ACTIVATE_PRODUCT_PROMOS === 'true'
    : true;
const PRODUCT_PROMOTION_CONFLICT_MESSAGE =
  'An active promotion is already applied to this product. Please remove the existing promotion or wait until it expires before creating a new one.';
const PROMO_CODE_PATTERN = /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]+$/;

const PROMOTION_MUTABLE_FIELDS = [
  'title',
  'description',
  'discountType',
  'discountValue',
  'applicableTo',
  'productId',
  'category',
  'farmerId',
  'promoCode',
  'startDate',
  'endDate',
  'isApproved',
  'isActive'
];

const normalizeOptionalField = (obj, key) => {
  if (typeof obj[key] === 'string') {
    obj[key] = obj[key].trim();
    if (!obj[key]) obj[key] = undefined;
  }
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value));

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const toObjectIdString = (value) => {
  if (!value) return '';
  if (typeof value === 'object' && value._id) return value._id.toString();
  return value.toString();
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

// Date-only strings ("YYYY-MM-DD") are parsed by JS as midnight UTC.
// For endDate we want the promo to remain valid for the entire calendar day,
// so we set the time to 23:59:59.999 UTC instead of 00:00:00.000 UTC.
const toEndOfDayDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T23:59:59.999Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return toDate(value);
};

const getPromotionFlags = (promotion) => {
  const now = Date.now();
  const startAt = new Date(promotion.startDate).getTime();
  const endAt = new Date(promotion.endDate).getTime();
  const isExpired = now > endAt;
  const isScheduled = now < startAt;
  const isLiveNow = Boolean(promotion.isApproved && promotion.isActive && !isExpired && !isScheduled);
  return { isExpired, isScheduled, isLiveNow };
};

const isPromotionOwnedByFarmer = (promotion, farmerId) => {
  const farmerIdStr = toObjectIdString(farmerId);
  if (!farmerIdStr) return false;
  if (toObjectIdString(promotion.farmerId) === farmerIdStr) return true;
  if (toObjectIdString(promotion.ownerId) === farmerIdStr) return true;
  if (promotion.applicableTo === 'product' && toObjectIdString(promotion.productId?.farmerId) === farmerIdStr) return true;
  return false;
};

const decoratePromotion = (promotion, currentUser) => {
  const base = promotion.toObject ? promotion.toObject() : promotion;
  const flags = getPromotionFlags(base);
  const canFarmerToggle = Boolean(
    currentUser?.role === 'farmer' &&
      ALLOW_FARMER_SELF_ACTIVATE_PRODUCT_PROMOS &&
      base.applicableTo === 'product' &&
      base.isApproved &&
      !flags.isExpired &&
      isPromotionOwnedByFarmer(base, currentUser._id)
  );
  return { ...base, ...flags, canFarmerToggle };
};

const sanitizePayload = (payload) => {
  const body = { ...payload };
  ['title', 'description', 'productId', 'category', 'farmerId', 'promoCode'].forEach((key) => normalizeOptionalField(body, key));

  if (typeof body.discountValue !== 'undefined') body.discountValue = Number(body.discountValue);
  if (typeof body.promoCode === 'string') body.promoCode = body.promoCode.toUpperCase();

  return body;
};

const ensureNoConflictingActivePromotionForProduct = async ({
  productId,
  startDate,
  endDate,
  excludePromotionId = null
}) => {
  if (!productId || !startDate || !endDate) return;
  const targetProduct = await Product.findById(productId).select('_id category farmerId');
  if (!targetProduct) throw httpError(400, 'Target product not found');

  const normalizedCategory = normalizeProductCategory(targetProduct.category) || targetProduct.category;
  const query = {
    isApproved: true,
    isActive: true,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
    $or: [
      { applicableTo: 'product', productId: targetProduct._id },
      {
        applicableTo: 'category',
        category: normalizedCategory,
        farmerId: { $in: [null, targetProduct.farmerId] }
      },
      { applicableTo: 'farmer', farmerId: targetProduct.farmerId }
    ]
  };

  if (excludePromotionId) {
    query._id = { $ne: excludePromotionId };
  }

  const conflict = await Promotion.findOne(query).select('_id title applicableTo');
  if (conflict) {
    throw httpError(400, PRODUCT_PROMOTION_CONFLICT_MESSAGE);
  }
};

const ensureFarmerUser = async (farmerId) => {
  if (!isValidObjectId(farmerId)) throw httpError(400, 'Invalid farmerId format');
  const farmer = await User.findOne({ _id: farmerId, role: 'farmer' }).select('_id isApproved isActive');
  if (!farmer) throw httpError(400, 'Target farmer not found');
  if (!farmer.isActive) throw httpError(400, 'Target farmer account is inactive');
  return farmer;
};

const resolveScopeAndValidate = async ({ body, user, existingPromotion = null }) => {
  const targetApplicableTo = body.applicableTo || existingPromotion?.applicableTo;
  if (!targetApplicableTo) throw httpError(400, 'applicableTo is required');
  if (!['product', 'category', 'farmer'].includes(targetApplicableTo)) {
    throw httpError(400, 'applicableTo must be product, category, or farmer');
  }
  body.applicableTo = targetApplicableTo;

  if (targetApplicableTo === 'product') {
    const productId = toObjectIdString(body.productId ?? existingPromotion?.productId);
    if (!productId) throw httpError(400, 'productId is required when applicableTo is product');
    if (!isValidObjectId(productId)) throw httpError(400, 'Invalid productId format');

    const product = await Product.findById(productId).select('_id farmerId');
    if (!product) throw httpError(400, 'Target product not found');
    if (user.role === 'farmer' && toObjectIdString(product.farmerId) !== user._id.toString()) {
      throw httpError(403, 'Farmers can create promotions only for their own products');
    }

    body.productId = product._id;
    body.farmerId = product.farmerId;
    body.category = undefined;
  }

  if (targetApplicableTo === 'category') {
    const categoryValue = body.category ?? existingPromotion?.category;
    const normalized = normalizeProductCategory(categoryValue);
    if (!normalized) {
      throw httpError(400, `Invalid category. Allowed values: ${PRODUCT_CATEGORIES.join(', ')}`);
    }

    body.category = normalized;
    body.productId = undefined;

    if (user.role === 'farmer') {
      body.farmerId = user._id;
    } else {
      const candidateFarmerId = toObjectIdString(body.farmerId ?? existingPromotion?.farmerId);
      if (candidateFarmerId) {
        const farmer = await ensureFarmerUser(candidateFarmerId);
        body.farmerId = farmer._id;
      } else {
        body.farmerId = undefined; // admin global category promotion
      }
    }
  }

  if (targetApplicableTo === 'farmer') {
    body.productId = undefined;
    body.category = undefined;
    const candidateFarmerId = toObjectIdString(body.farmerId ?? existingPromotion?.farmerId);
    if (user.role === 'farmer') {
      if (candidateFarmerId && toObjectIdString(candidateFarmerId) !== user._id.toString()) {
        throw httpError(403, 'Farmers can target only their own account');
      }
      body.farmerId = user._id;
    } else {
      if (!candidateFarmerId) throw httpError(400, 'farmerId is required when applicableTo is farmer');
      const farmer = await ensureFarmerUser(candidateFarmerId);
      body.farmerId = farmer._id;
    }
  }

  const startDate = body.startDate ? toDate(body.startDate) : toDate(existingPromotion?.startDate);
  const endDate = body.endDate ? toEndOfDayDate(body.endDate) : toDate(existingPromotion?.endDate);
  if (!startDate || !endDate) {
    throw httpError(400, 'startDate and endDate are required');
  }
  if (endDate <= startDate) throw httpError(400, 'endDate must be after startDate');
  body.startDate = startDate;
  body.endDate = endDate;

  const discountType = body.discountType || existingPromotion?.discountType;
  const discountValue = typeof body.discountValue !== 'undefined' ? body.discountValue : existingPromotion?.discountValue;
  if (!['percentage', 'fixed'].includes(discountType)) {
    throw httpError(400, 'discountType must be percentage or fixed');
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw httpError(400, 'discountValue must be greater than zero');
  }
  if (discountType === 'percentage' && discountValue > 100) {
    throw httpError(400, 'percentage discount cannot exceed 100');
  }
  body.discountType = discountType;
  body.discountValue = discountValue;

  if (!body.title && !existingPromotion?.title) throw httpError(400, 'title is required');
  if (body.promoCode !== undefined && body.promoCode && !PROMO_CODE_PATTERN.test(body.promoCode)) {
    throw httpError(400, 'Promo code must contain both letters and numbers (alphanumeric only)');
  }
};

const autoDisableExpiredPromotions = async () => {
  const now = new Date();
  await Promotion.updateMany({ endDate: { $lt: now }, isActive: true }, { isActive: false });
};

const assignMutableFields = (promotion, body) => {
  PROMOTION_MUTABLE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      promotion[field] = body[field];
    }
  });
};

export const createPromotion = async (req, res, next) => {
  try {
    const body = sanitizePayload(req.body);
    await resolveScopeAndValidate({ body, user: req.user });
    if (body.applicableTo === 'product') {
      await ensureNoConflictingActivePromotionForProduct({
        productId: body.productId,
        startDate: body.startDate,
        endDate: body.endDate
      });
    }

    const payload = {
      ...body,
      ownerId: req.user._id,
      isApproved: req.user.role === 'admin',
      isActive: req.user.role === 'admin' ? Boolean(body.isActive ?? true) : false
    };

    const promo = await Promotion.create(payload);
    res.status(201).json(decoratePromotion(promo, req.user));
  } catch (err) {
    next(err);
  }
};

export const updatePromotion = async (req, res, next) => {
  try {
    const promo = await Promotion.findById(req.params.id).populate('productId', 'farmerId');
    if (!promo) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 'farmer' && !isPromotionOwnedByFarmer(promo, req.user._id)) {
      return res.status(403).json({ message: 'Farmers can manage only promotions for their own products' });
    }

    const body = sanitizePayload(req.body);
    await resolveScopeAndValidate({ body, user: req.user, existingPromotion: promo });
    const effectiveApplicableTo = body.applicableTo || promo.applicableTo;
    if (effectiveApplicableTo === 'product') {
      await ensureNoConflictingActivePromotionForProduct({
        productId: body.productId || promo.productId,
        startDate: body.startDate || promo.startDate,
        endDate: body.endDate || promo.endDate,
        excludePromotionId: promo._id
      });
    }

    if (req.user.role === 'farmer') {
      body.isApproved = false;
      body.isActive = false;
    }
    if (req.user.role !== 'admin') {
      delete body.ownerId;
    }

    assignMutableFields(promo, body);
    await promo.save();
    res.json(decoratePromotion(promo, req.user));
  } catch (err) {
    next(err);
  }
};

export const listPromotions = async (req, res, next) => {
  try {
    await autoDisableExpiredPromotions();
    const now = new Date();
    const promos = await Promotion.find({
      isApproved: true,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .populate('productId', 'productName category farmerId')
      .populate('farmerId', 'name');

    res.json(promos.map((promo) => decoratePromotion(promo, req.user)));
  } catch (err) {
    next(err);
  }
};

export const managePromotions = async (req, res, next) => {
  try {
    await autoDisableExpiredPromotions();

    let query = {};
    if (req.user.role === 'farmer') {
      query = {
        $or: [{ ownerId: req.user._id }, { farmerId: req.user._id }]
      };
    }

    const promos = await Promotion.find(query)
      .populate('productId', 'productName farmerId')
      .populate('farmerId', 'name email')
      .populate('ownerId', 'name email role')
      .sort({ createdAt: -1 });

    const filtered = req.user.role === 'farmer'
      ? promos.filter((promo) => isPromotionOwnedByFarmer(promo, req.user._id))
      : promos;

    res.json(filtered.map((promo) => decoratePromotion(promo, req.user)));
  } catch (err) {
    next(err);
  }
};

export const togglePromotion = async (req, res, next) => {
  try {
    const promo = await Promotion.findById(req.params.id).populate('productId', 'farmerId');
    if (!promo) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 'farmer') {
      if (!ALLOW_FARMER_SELF_ACTIVATE_PRODUCT_PROMOS) {
        return res.status(403).json({ message: 'Farmer self-activation is disabled by business rule' });
      }
      if (promo.applicableTo !== 'product') {
        return res.status(403).json({ message: 'Farmers can toggle only product-level promotions' });
      }
      if (!isPromotionOwnedByFarmer(promo, req.user._id)) {
        return res.status(403).json({ message: 'Farmers can toggle only promotions for their own products' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const targetState = !promo.isActive;
    if (targetState) {
      if (!promo.isApproved) {
        return res.status(400).json({ message: 'Promotion must be approved before activation' });
      }
      if (new Date(promo.endDate) < new Date()) {
        return res.status(400).json({ message: 'Expired promotions cannot be activated' });
      }
      if (promo.applicableTo === 'product') {
        await ensureNoConflictingActivePromotionForProduct({
          productId: promo.productId,
          startDate: promo.startDate,
          endDate: promo.endDate,
          excludePromotionId: promo._id
        });
      }
    }

    promo.isActive = targetState;
    await promo.save();
    res.json(decoratePromotion(promo, req.user));
  } catch (err) {
    next(err);
  }
};

export const approvePromotion = async (req, res, next) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Not found' });

    const approved = req.body.approved === undefined ? true : Boolean(req.body.approved);
    const activate = req.body.activate === undefined ? approved : Boolean(req.body.activate);

    promo.isApproved = approved;
    if (!approved) {
      promo.isActive = false;
    } else if (new Date(promo.endDate) < new Date()) {
      promo.isActive = false;
    } else {
      if (activate && promo.applicableTo === 'product') {
        await ensureNoConflictingActivePromotionForProduct({
          productId: promo.productId,
          startDate: promo.startDate,
          endDate: promo.endDate,
          excludePromotionId: promo._id
        });
      }
      promo.isActive = activate;
    }

    await promo.save();
    res.json(decoratePromotion(promo, req.user));
  } catch (err) {
    next(err);
  }
};

export const deletePromotion = async (req, res, next) => {
  try {
    const promo = await Promotion.findById(req.params.id).populate('productId', 'farmerId');
    if (!promo) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 'farmer' && !isPromotionOwnedByFarmer(promo, req.user._id)) {
      return res.status(403).json({ message: 'Farmers can delete only promotions for their own products' });
    }
    if (!['admin', 'farmer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await promo.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
