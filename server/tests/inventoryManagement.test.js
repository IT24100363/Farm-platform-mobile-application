import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockApp, createMockDoc, createMockResponse } from './helpers/testUtils.js';

const mocks = vi.hoisted(() => ({
  Product: {
    create: vi.fn(),
    findOne: vi.fn(),
    deleteOne: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn()
  },
  Promotion: {
    find: vi.fn()
  },
  User: {
    findOne: vi.fn()
  },
  Review: {
    aggregate: vi.fn()
  },
  handleLowStockAlert: vi.fn().mockResolvedValue([]),
  applyBestPromotion: vi.fn(),
  cloudinary: {
    config: vi.fn(),
    uploader: {
      upload: vi.fn()
    }
  }
}));

vi.mock('../models/Product.js', () => ({ default: mocks.Product }));
vi.mock('../models/Promotion.js', () => ({ default: mocks.Promotion }));
vi.mock('../models/User.js', () => ({ default: mocks.User }));
vi.mock('../models/Review.js', () => ({ default: mocks.Review }));
vi.mock('../utils/lowStockAlerts.js', () => ({ handleLowStockAlert: mocks.handleLowStockAlert }));
vi.mock('../utils/applyBestPromotion.js', () => ({ applyBestPromotion: mocks.applyBestPromotion }));
vi.mock('../config/cloudinary.js', () => ({ default: mocks.cloudinary }));

let updateStock;

beforeAll(async () => {
  ({ updateStock } = await import('../controllers/productController.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Inventory Management', () => {
  it('updates stock and marks the product unavailable when quantity becomes zero', async () => {
    const { app } = createMockApp();
    const product = createMockDoc({ _id: 'product-1', quantity: 7, isAvailable: true });
    mocks.Product.findOne.mockResolvedValue(product);

    const req = {
      body: { quantity: 0 },
      params: { id: 'product-1' },
      user: { _id: 'farmer-1', role: 'farmer' },
      app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await updateStock(req, res, next);

    expect(mocks.Product.findOne).toHaveBeenCalledWith({ _id: 'product-1', farmerId: 'farmer-1' });
    expect(product.quantity).toBe(0);
    expect(product.isAvailable).toBe(false);
    expect(product.save).toHaveBeenCalledTimes(1);
    expect(mocks.handleLowStockAlert).toHaveBeenCalledWith({ product, previousQuantity: 7, app });
    expect(res.json).toHaveBeenCalledWith(product);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid stock quantities', async () => {
    const { app } = createMockApp();
    const req = {
      body: { quantity: -1 },
      params: { id: 'product-1' },
      user: { _id: 'farmer-1', role: 'farmer' },
      app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await updateStock(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Quantity must be a valid non-negative integer' });
    expect(mocks.Product.findOne).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
