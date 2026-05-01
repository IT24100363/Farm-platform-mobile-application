import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockDoc, createMockResponse, createQuery, createObjectId, daysFromNow } from './helpers/testUtils.js';

process.env.ALLOW_FARMER_SELF_ACTIVATE_PRODUCT_PROMOS = 'true';

const mocks = vi.hoisted(() => ({
  Promotion: {
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    updateMany: vi.fn()
  },
  Product: {
    findById: vi.fn()
  },
  User: {
    findOne: vi.fn()
  }
}));

vi.mock('../models/Promotion.js', () => ({ default: mocks.Promotion }));
vi.mock('../models/Product.js', () => ({ default: mocks.Product }));
vi.mock('../models/User.js', () => ({ default: mocks.User }));

let createPromotion;
let togglePromotion;

beforeAll(async () => {
  ({ createPromotion, togglePromotion } = await import('../controllers/promotionController.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Offers and Promotion Management', () => {
  it('creates a farmer category promotion as inactive and unapproved', async () => {
    const farmerId = 'farmer-1';
    const promoId = 'promo-1';
    const createdPromo = createMockDoc({
      _id: promoId,
      title: 'Farm Fresh Week',
      description: 'Seasonal fruits on offer',
      discountType: 'percentage',
      discountValue: 15,
      applicableTo: 'category',
      category: 'Seasonal Fruits',
      farmerId,
      ownerId: farmerId,
      startDate: daysFromNow(-1),
      endDate: daysFromNow(7),
      isApproved: false,
      isActive: false
    });
    mocks.Promotion.create.mockResolvedValue(createdPromo);

    const req = {
      body: {
        title: 'Farm Fresh Week',
        description: 'Seasonal fruits on offer',
        discountType: 'percentage',
        discountValue: 15,
        applicableTo: 'category',
        category: 'Seasonal Fruits',
        startDate: daysFromNow(-1).toISOString(),
        endDate: daysFromNow(7).toISOString()
      },
      user: { _id: farmerId, role: 'farmer' }
    };
    const res = createMockResponse();
    const next = vi.fn();

    await createPromotion(req, res, next);

    expect(mocks.Promotion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Farm Fresh Week',
        description: 'Seasonal fruits on offer',
        discountType: 'percentage',
        discountValue: 15,
        applicableTo: 'category',
        category: 'Seasonal Fruits',
        farmerId,
        ownerId: farmerId,
        isApproved: false,
        isActive: false
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ canFarmerToggle: false }));
    expect(next).not.toHaveBeenCalled();
  });

  it('activates an approved farmer-owned product promotion', async () => {
    const farmerId = createObjectId();
    const productId = createObjectId();
    const promoId = createObjectId();
    const promo = createMockDoc({
      _id: promoId,
      title: 'Mango Flash Deal',
      discountType: 'fixed',
      discountValue: 20,
      applicableTo: 'product',
      productId,
      farmerId,
      ownerId: farmerId,
      startDate: daysFromNow(-1),
      endDate: daysFromNow(7),
      isApproved: true,
      isActive: false
    });
    const productQueryResult = createMockDoc({
      _id: productId,
      category: 'Seasonal Fruits',
      farmerId
    });

    mocks.Promotion.findById.mockReturnValue(createQuery(promo));
    mocks.Product.findById.mockReturnValue(createQuery(productQueryResult));
    mocks.Promotion.findOne.mockReturnValue(createQuery(null));

    const req = {
      params: { id: promoId },
      user: { _id: farmerId, role: 'farmer' }
    };
    const res = createMockResponse();
    const next = vi.fn();

    await togglePromotion(req, res, next);

    expect(mocks.Promotion.findById).toHaveBeenCalledWith(promoId);
    expect(promo.isActive).toBe(true);
    expect(promo.save).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isActive: true, canFarmerToggle: true }));
    expect(next).not.toHaveBeenCalled();
  });
});
