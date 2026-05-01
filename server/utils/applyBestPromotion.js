import { normalizeProductCategory } from '../constants/productCategories.js';

const toIdString = (value) => {
  if (!value) return '';
  if (typeof value === 'object' && value._id) return value._id.toString();
  return value.toString();
};

export const applyBestPromotion = (product, promotions = [], promoCode = null) => {
  const now = new Date();
  let best = { discountAmount: 0, promotionId: null, discountType: null, discountValue: 0 };

  promotions.forEach((promo) => {
    const active = promo.isActive && now >= promo.startDate && now <= promo.endDate;
    if (!active) return;

    const matchesCode = promoCode ? promo.promoCode === promoCode : true;
    const promoCategory = normalizeProductCategory(promo.category);
    const productCategory = normalizeProductCategory(product.category);
    const productId = toIdString(product._id);
    const productFarmerId = toIdString(product.farmerId);
    const promoProductId = toIdString(promo.productId);
    const promoFarmerId = toIdString(promo.farmerId);
    let applicable = false;
    if (promo.applicableTo === 'product' && promoProductId === productId) {
      // Product promotions can optionally be scoped to a specific farmer.
      applicable = !promoFarmerId || promoFarmerId === productFarmerId;
    }
    if (promo.applicableTo === 'category' && promoCategory && promoCategory === productCategory) {
      // Farmer-scoped category promos apply only to that farmer's products.
      applicable = !promoFarmerId || promoFarmerId === productFarmerId;
    }
    if (promo.applicableTo === 'farmer' && promoFarmerId === productFarmerId) applicable = true;
    if (!applicable || !matchesCode) return;

    const discount = promo.discountType === 'percentage'
      ? (product.price * promo.discountValue) / 100
      : promo.discountValue;

    if (discount > best.discountAmount) {
      best = {
        discountAmount: discount,
        promotionId: promo._id,
        discountType: promo.discountType,
        discountValue: promo.discountValue
      };
    }
  });

  return best;
};
