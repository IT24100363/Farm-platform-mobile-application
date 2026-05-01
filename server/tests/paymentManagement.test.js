import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockApp, createMockDoc, createMockResponse, createObjectId } from './helpers/testUtils.js';

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

let markPaid;
let updatePaymentStatus;
let processRefund;

beforeAll(async () => {
  ({ markPaid, updatePaymentStatus, processRefund } = await import('../controllers/orderController.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Payment Management', () => {
  it('marks an order as paid and notifies the customer', async () => {
    const orderId = 'order-1';
    const customerId = 'customer-1';
    const order = createMockDoc({ _id: orderId, customerId, paymentStatus: 'Pending' });
    mocks.Order.findByIdAndUpdate.mockResolvedValue(order);
    mocks.Notification.create.mockResolvedValue(
      createMockDoc({ _id: 'notification-1', userId: customerId, message: 'Payment received', type: 'payment' })
    );
    mocks.User.findById.mockResolvedValue({ email: 'customer@example.com' });

    const { app, io } = createMockApp();
    const req = {
      params: { id: orderId },
      app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await markPaid(req, res, next);

    expect(mocks.Order.findByIdAndUpdate).toHaveBeenCalledWith(orderId, { paymentStatus: 'Paid' }, { new: true });
    expect(res.json).toHaveBeenCalledWith(order);
    expect(mocks.Notification.create).toHaveBeenCalledWith({
      userId: customerId,
      message: 'Payment received',
      type: 'payment'
    });
    expect(io.to).toHaveBeenCalledWith(customerId.toString());
    expect(io.emit).toHaveBeenCalledWith('notification', { message: 'Payment received' });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.com',
        subject: 'Payment received'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects refund processing for cash-on-delivery orders', async () => {
    const orderId = 'order-1';
    mocks.Order.findById.mockResolvedValue(
      createMockDoc({
        _id: orderId,
        customerId: 'customer-1',
        paymentMethod: 'COD',
        orderStatus: 'Cancelled',
        paymentStatus: 'Pending'
      })
    );

    const { app } = createMockApp();
    const req = {
      params: { id: orderId },
      app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await processRefund(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Refund processing is only available for online payments' });
    expect(mocks.stripe.refunds.create).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('allows admins to update payment status from the admin panel', async () => {
    const orderId = createObjectId();
    const customerId = createObjectId();
    const order = createMockDoc({
      _id: orderId,
      customerId,
      paymentStatus: 'Pending'
    });
    mocks.Order.findById.mockResolvedValue(order);
    mocks.Notification.create.mockResolvedValue(
      createMockDoc({ _id: createObjectId(), userId: customerId, message: 'Payment returned', type: 'payment' })
    );
    mocks.User.findById.mockResolvedValue({ email: 'customer@example.com' });

    const { app, io } = createMockApp();
    const req = {
      params: { id: orderId },
      body: { paymentStatus: 'returned' },
      user: { _id: createObjectId(), role: 'admin' },
      app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await updatePaymentStatus(req, res, next);

    expect(order.paymentStatus).toBe('Returned');
    expect(order.save).toHaveBeenCalledTimes(1);
    expect(mocks.Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: customerId,
        type: 'payment',
        message: expect.stringContaining('Payment returned for order #')
      })
    );
    expect(io.to).toHaveBeenCalledWith(customerId.toString());
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.com',
        subject: 'Payment status updated'
      })
    );
    expect(res.json).toHaveBeenCalledWith(order);
    expect(next).not.toHaveBeenCalled();
  });

  it('processes refunds and marks payment status as returned', async () => {
    const orderId = createObjectId();
    const customerId = createObjectId();
    const order = createMockDoc({
      _id: orderId,
      customerId,
      paymentMethod: 'ONLINE',
      paymentStatus: 'Paid',
      orderStatus: 'Cancelled',
      paymentReference: 'DEMO-ORDER-1001',
      paymentProvider: 'CARD',
      paymentMeta: {
        cardHolder: 'Test Customer',
        cardLast4: '1111',
        cardExpiry: '09/29'
      }
    });
    mocks.Order.findById.mockResolvedValue(order);
    mocks.Notification.create.mockResolvedValue(
      createMockDoc({ _id: createObjectId(), userId: customerId, message: 'Refund completed', type: 'refund' })
    );
    mocks.User.findById.mockResolvedValue({ email: 'customer@example.com' });

    const { app, io } = createMockApp();
    const req = {
      params: { id: orderId },
      body: {},
      user: { _id: createObjectId(), role: 'admin' },
      app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await processRefund(req, res, next);

    expect(order.paymentStatus).toBe('Returned');
    expect(order.orderStatus).toBe('Refunded');
    expect(order.save).toHaveBeenCalledTimes(1);
    expect(mocks.stripe.refunds.create).not.toHaveBeenCalled();
    expect(io.to).toHaveBeenCalledWith(customerId.toString());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        order,
        refundMessage: expect.stringContaining('Refund completed for order #')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
