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

let createProduct;
let updateProduct;
let uploadProductImage;

beforeAll(async () => {
  ({ createProduct, updateProduct, uploadProductImage } = await import('../controllers/productController.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Product Management', () => {
  it('creates a farmer-owned product and flags low stock at creation', async () => {
    const { app } = createMockApp();
    const farmerId = 'farmer-1';
    const payload = {
      productName: 'Carrot Bundle',
      description: 'Fresh carrots from the morning harvest',
      category: 'Fresh Vegetables',
      price: '120',
      quantity: '3',
      images: ['carrot.jpg']
    };
    const createdProduct = createMockDoc({
      _id: 'product-1',
      farmerId,
      ...payload,
      price: 120,
      quantity: 3,
      lowStockAlertSent: true
    });
    mocks.Product.create.mockResolvedValue(createdProduct);

    const req = {
      body: payload,
      user: { _id: farmerId, role: 'farmer' },
      app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await createProduct(req, res, next);

    expect(mocks.Product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        farmerId,
        productName: 'Carrot Bundle',
        category: 'Fresh Vegetables',
        price: 120,
        quantity: 3,
        images: ['carrot.jpg'],
        lowStockAlertSent: true
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(createdProduct);
    expect(next).not.toHaveBeenCalled();
  });

  it('updates a product and triggers the low stock alert check', async () => {
    const { app } = createMockApp();
    const farmerId = 'farmer-1';
    const product = createMockDoc({
      _id: 'product-1',
      farmerId,
      productName: 'Tomato Pack',
      description: 'Red tomatoes',
      category: 'Fresh Vegetables',
      price: 100,
      quantity: 8,
      isAvailable: true
    });
    mocks.Product.findOne.mockResolvedValue(product);

    const req = {
      body: {
        productName: '  Tomato Premium Pack  ',
        description: '  Better quality tomatoes  ',
        category: 'Seasonal Fruits',
        price: '90',
        quantity: '4',
        isAvailable: false
      },
      params: { id: 'product-1' },
      user: { _id: farmerId, role: 'farmer' },
      app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await updateProduct(req, res, next);

    expect(mocks.Product.findOne).toHaveBeenCalledWith({ _id: 'product-1', farmerId });
    expect(product.productName).toBe('Tomato Premium Pack');
    expect(product.description).toBe('Better quality tomatoes');
    expect(product.category).toBe('Seasonal Fruits');
    expect(product.price).toBe(90);
    expect(product.quantity).toBe(4);
    expect(product.isAvailable).toBe(false);
    expect(product.save).toHaveBeenCalledTimes(1);
    expect(mocks.handleLowStockAlert).toHaveBeenCalledWith({ product, previousQuantity: 8, app });
    expect(res.json).toHaveBeenCalledWith(product);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns a public upload url for device images using the request host', async () => {
    const req = {
      file: {
        filename: 'product-123.jpg',
        path: 'uploads/product-123.jpg'
      },
      protocol: 'http',
      get: vi.fn((header) => (header === 'host' ? '192.168.1.25:5000' : null))
    };
    const res = createMockResponse();
    const next = vi.fn();

    const previousServerUrl = process.env.SERVER_URL;
    delete process.env.SERVER_URL;

    try {
      await uploadProductImage(req, res, next);
    } finally {
      if (previousServerUrl === undefined) {
        delete process.env.SERVER_URL;
      } else {
        process.env.SERVER_URL = previousServerUrl;
      }
    }

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ url: 'http://192.168.1.25:5000/uploads/product-123.jpg' });
    expect(next).not.toHaveBeenCalled();
  });
});
