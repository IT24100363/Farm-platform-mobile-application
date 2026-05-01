import mongoose from 'mongoose';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockApp, createMockDoc, createMockResponse, createQuery, createObjectId } from './helpers/testUtils.js';

const mocks = vi.hoisted(() => ({
  Order: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn()
  },
  Product: {
    find: vi.fn(),
    findOneAndUpdate: vi.fn()
  },
  Promotion: {
    find: vi.fn(),
    findOne: vi.fn(),
    updateMany: vi.fn()
  },
  User: {
    findOne: vi.fn(),
    find: vi.fn(),
    findById: vi.fn()
  },
  Notification: {
    create: vi.fn(),
    insertMany: vi.fn()
  },
  stripe: {
    refunds: {
      create: vi.fn()
    }
  },
  sendEmail: vi.fn().mockResolvedValue(undefined),
  handleLowStockAlert: vi.fn().mockResolvedValue([]),
  applyBestPromotion: vi.fn()
}));

vi.mock('../models/Order.js', () => ({ default: mocks.Order }));
vi.mock('../models/Product.js', () => ({ default: mocks.Product }));
vi.mock('../models/Promotion.js', () => ({ default: mocks.Promotion }));
vi.mock('../models/User.js', () => ({ default: mocks.User }));
vi.mock('../models/Notification.js', () => ({ default: mocks.Notification }));
vi.mock('../config/stripe.js', () => ({ default: mocks.stripe }));
vi.mock('../utils/sendEmail.js', () => ({ sendEmail: mocks.sendEmail }));
vi.mock('../utils/lowStockAlerts.js', () => ({ handleLowStockAlert: mocks.handleLowStockAlert }));
vi.mock('../utils/applyBestPromotion.js', () => ({ applyBestPromotion: mocks.applyBestPromotion }));

let previewOrder;
let getOrderById;

beforeAll(async () => {
  ({ previewOrder, getOrderById } = await import('../controllers/orderController.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Order Management', () => {
  it('builds a checkout preview for a single-farmer cart item', async () => {
    const productId = createObjectId();
    const promoId = createObjectId();
    const farmerId = createObjectId();
    const product = createMockDoc({
      _id: productId,
      productName: 'Mango Box',
      price: 10,
      quantity: 5,
      isAvailable: true,
      farmerId
    });

    mocks.Product.find.mockResolvedValue([product]);
    mocks.Promotion.find.mockImplementation((query) => {
      if (query?._id?.$in) {
        return createQuery([
          {
            _id: promoId,
            title: 'Spring Sale',
            promoCode: 'SAVE10',
            discountType: 'fixed',
            discountValue: 2
          }
        ]);
      }
      return Promise.resolve([]);
    });
    mocks.applyBestPromotion.mockReturnValue({
      discountAmount: 2,
      promotionId: promoId,
      discountType: 'fixed',
      discountValue: 2
    });

    const req = {
      body: {
        items: [{ productId, quantity: 2 }],
        promoCode: 'SAVE10'
      }
    };
    const res = createMockResponse();
    const next = vi.fn();

    await previewOrder(req, res, next);

    expect(mocks.Product.find).toHaveBeenCalledWith({ _id: { $in: [productId] } });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        lineItems: [
          expect.objectContaining({
            productId,
            productName: 'Mango Box',
            quantity: 2,
            unitPrice: 10,
            discountPerUnit: 2,
            finalUnitPrice: 8,
            lineSubTotal: 20,
            lineDiscount: 4,
            lineTotal: 16
          })
        ],
        summary: expect.objectContaining({
          subTotal: 20,
          discountTotal: 4,
          itemTotal: 16,
          taxAmount: 0,
          deliveryCharge: 0,
          totalAmount: 16
        }),
        appliedPromotions: [
          expect.objectContaining({
            _id: promoId,
            title: 'Spring Sale',
            promoCode: 'SAVE10',
            discountType: 'fixed',
            discountValue: 2
          })
        ]
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects access when a customer requests an order that is not theirs', async () => {
    const orderId = createObjectId();
    const customerId = createObjectId();
    const otherCustomerId = createObjectId();
    const farmerId = createObjectId();
    const deliveryPartnerId = createObjectId();
    const order = createMockDoc({
      _id: orderId,
      customerId,
      farmerId,
      deliveryPartnerId,
      orderStatus: 'Placed',
      createdAt: new Date()
    });
    mocks.Order.findById.mockReturnValue(createQuery(order));

    const { app } = createMockApp();
    const req = {
      params: { id: orderId },
      user: { _id: otherCustomerId, role: 'customer' },
      app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await getOrderById(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });
});
