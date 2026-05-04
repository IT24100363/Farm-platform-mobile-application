import { describe, expect, it } from 'vitest';
import { applyBestPromotion } from '../utils/applyBestPromotion.js';

const baseProduct = {
  _id: 'product-1',
  farmerId: 'farmer-1',
  price: 100,
  category: 'Fresh Vegetables'
};

const activeWindow = {
  isActive: true,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
};

describe('applyBestPromotion', () => {
  it('applies an active category promotion when the product category matches', () => {
    const result = applyBestPromotion(baseProduct, [
      {
        _id: 'promo-1',
        title: 'Vegetable Week',
        applicableTo: 'category',
        category: 'Fresh Vegetables',
        discountType: 'percentage',
        discountValue: 12,
        ...activeWindow
      }
    ]);

    expect(result).toEqual({
      discountAmount: 12,
      promotionId: 'promo-1',
      discountType: 'percentage',
      discountValue: 12
    });
  });

  it('matches promo codes case-insensitively without blocking category promotions', () => {
    const result = applyBestPromotion(
      baseProduct,
      [
        {
          _id: 'promo-2',
          title: 'Vegetable Code Deal',
          applicableTo: 'category',
          category: 'fresh vegetables',
          promoCode: 'veg12',
          discountType: 'fixed',
          discountValue: 15,
          ...activeWindow
        }
      ],
      '  VEG12  '
    );

    expect(result).toEqual({
      discountAmount: 15,
      promotionId: 'promo-2',
      discountType: 'fixed',
      discountValue: 15
    });
  });
});
