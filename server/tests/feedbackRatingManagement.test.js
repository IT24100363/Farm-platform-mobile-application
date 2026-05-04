import mongoose from 'mongoose';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockApp, createMockDoc, createMockResponse, createQuery, createObjectId } from './helpers/testUtils.js';

const mocks = vi.hoisted(() => ({
  Review: {
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    aggregate: vi.fn()
  },
  Order: {
    findOne: vi.fn()
  },
  Product: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn()
  },
  Notification: {
    create: vi.fn()
  }
}));

vi.mock('../models/Review.js', () => ({ default: mocks.Review }));
vi.mock('../models/Order.js', () => ({ default: mocks.Order }));
vi.mock('../models/Product.js', () => ({ default: mocks.Product }));
vi.mock('../models/Notification.js', () => ({ default: mocks.Notification }));

let addReview;
let updateReview;
let deleteReview;
let replyToReview;

beforeAll(async () => {
  ({ addReview, updateReview, deleteReview, replyToReview } = await import('../controllers/reviewController.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Feedback and Rating Management', () => {
  it('stores a review for a delivered order and updates the product rating', async () => {
    const customerId = createObjectId();
    const farmerId = createObjectId();
    const productId = createObjectId();
    const orderId = createObjectId();
    const reviewId = createObjectId();
    const { app, io } = createMockApp();

    mocks.Product.findById.mockReturnValue(
      createQuery(
        createMockDoc({
          _id: productId,
          productName: 'Mango Box',
          farmerId
        })
      )
    );
    mocks.Order.findOne.mockResolvedValue(
      createMockDoc({
        _id: orderId,
        customerId,
        orderStatus: 'Delivered',
        products: [{ productId }]
      })
    );
    mocks.Review.create.mockResolvedValue(
      createMockDoc({
        _id: reviewId,
        customerId,
        productId,
        rating: 5,
        comment: 'Great mangoes!'
      })
    );
    mocks.Review.aggregate.mockResolvedValue([{ _id: productId, avg: 4.5, count: 2 }]);
    mocks.Product.findByIdAndUpdate.mockResolvedValue(createMockDoc({ _id: productId }));
    mocks.Notification.create.mockResolvedValue(
      createMockDoc({
        _id: createObjectId(),
        userId: farmerId,
        message: 'New review submitted for Mango Box',
        type: 'review'
      })
    );

    const req = {
      body: {
        productId,
        rating: 5,
        comment: ' Great mangoes! '
      },
      user: { _id: customerId, role: 'customer' },
      app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await addReview(req, res, next);

    expect(mocks.Review.create).toHaveBeenCalledWith({
      customerId,
      productId,
      rating: 5,
      comment: 'Great mangoes!'
    });
    expect(String(mocks.Review.aggregate.mock.calls[0][0][0].$match.productId)).toBe(productId.toString());
    expect(String(mocks.Product.findByIdAndUpdate.mock.calls[0][0])).toBe(productId.toString());
    expect(mocks.Notification.create).toHaveBeenCalledWith({
      userId: farmerId,
      message: 'New review submitted for Mango Box',
      type: 'review'
    });
    expect(io.to).toHaveBeenCalledWith(farmerId.toString());
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('lets a customer edit their own review and recomputes the rating', async () => {
    const customerId = createObjectId();
    const productId = createObjectId();
    const reviewId = createObjectId();

    mocks.Review.findOneAndUpdate.mockResolvedValue(
      createMockDoc({
        _id: reviewId,
        customerId,
        productId,
        rating: 4,
        comment: 'Updated review'
      })
    );
    mocks.Review.aggregate.mockResolvedValue([{ _id: productId, avg: 4, count: 1 }]);
    mocks.Product.findByIdAndUpdate.mockResolvedValue(createMockDoc({ _id: productId }));

    const req = {
      params: { id: reviewId },
      body: {
        rating: 4,
        comment: ' Updated review '
      },
      user: { _id: customerId, role: 'customer' }
    };
    const res = createMockResponse();
    const next = vi.fn();

    await updateReview(req, res, next);

    expect(mocks.Review.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: reviewId, customerId },
      { rating: 4, comment: 'Updated review' },
      { new: true }
    );
    expect(String(mocks.Review.aggregate.mock.calls[0][0][0].$match.productId)).toBe(productId.toString());
    expect(String(mocks.Product.findByIdAndUpdate.mock.calls[0][0])).toBe(productId.toString());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ rating: 4, comment: 'Updated review' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('lets a customer delete their own review', async () => {
    const customerId = createObjectId();
    const productId = createObjectId();
    const reviewId = createObjectId();

    mocks.Review.findOneAndDelete.mockResolvedValue(
      createMockDoc({
        _id: reviewId,
        customerId,
        productId
      })
    );
    mocks.Review.aggregate.mockResolvedValue([]);
    mocks.Product.findByIdAndUpdate.mockResolvedValue(createMockDoc({ _id: productId }));

    const req = {
      params: { id: reviewId },
      user: { _id: customerId, role: 'customer' }
    };
    const res = createMockResponse();
    const next = vi.fn();

    await deleteReview(req, res, next);

    expect(mocks.Review.findOneAndDelete).toHaveBeenCalledWith({ _id: reviewId, customerId });
    expect(String(mocks.Product.findByIdAndUpdate.mock.calls[0][0])).toBe(productId.toString());
    expect(res.json).toHaveBeenCalledWith({ message: 'Deleted' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects farmer replies when the review does not belong to their product', async () => {
    const farmerId = createObjectId();
    const otherFarmerId = createObjectId();
    const customerId = createObjectId();
    const reviewId = createObjectId();

    mocks.Review.findById.mockReturnValue(
      createQuery(
        createMockDoc({
          _id: reviewId,
          customerId,
          productId: {
            productName: 'Mango Box',
            farmerId: otherFarmerId
          }
        })
      )
    );

    const req = {
      params: { id: reviewId },
      body: { reply: 'Thanks for the feedback' },
      user: { _id: farmerId, role: 'farmer' },
      app: createMockApp().app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await replyToReview(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: not your product review' });
    expect(next).not.toHaveBeenCalled();
  });
});
