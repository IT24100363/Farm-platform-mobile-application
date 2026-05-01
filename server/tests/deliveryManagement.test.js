import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockApp, createMockDoc, createMockResponse, createQuery, createObjectId, daysFromNow } from './helpers/testUtils.js';

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

let acceptDeliveryOrder;
let updateDeliveryTracking;

beforeAll(async () => {
  ({ acceptDeliveryOrder, updateDeliveryTracking } = await import('../controllers/orderController.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Delivery Management', () => {
  it('moves an in-transit order to out for delivery and notifies the customer', async () => {
    const deliveryPartnerId = createObjectId();
    const customerId = createObjectId();
    const farmerId = createObjectId();
    const orderId = createObjectId();
    const order = createMockDoc({
      _id: orderId,
      customerId,
      farmerId,
      deliveryPartnerId,
      orderStatus: 'In Transit',
      deliveryTrackingStatus: 'Awaiting Acceptance',
      estimatedArrivalAt: null,
      isDeliveryDelayed: false
    });

    mocks.Order.findById.mockResolvedValue(order);
    mocks.User.find.mockReturnValue(createQuery([]));
    mocks.Notification.insertMany.mockResolvedValue([
      createMockDoc({ _id: createObjectId(), userId: customerId, type: 'delivery' }),
      createMockDoc({ _id: createObjectId(), userId: farmerId, type: 'delivery' })
    ]);
    mocks.User.findById.mockResolvedValue({ email: 'customer@example.com' });

    const { app, io } = createMockApp();
    const req = {
      params: { id: orderId },
      body: { estimatedArrivalAt: daysFromNow(1).toISOString() },
      user: { _id: deliveryPartnerId, role: 'delivery' },
      app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await acceptDeliveryOrder(req, res, next);

    expect(order.orderStatus).toBe('Out for Delivery');
    expect(order.deliveryTrackingStatus).toBe('On the Way');
    expect(order.deliveryAcceptedAt).toBeInstanceOf(Date);
    expect(order.outForDeliveryAt).toBeInstanceOf(Date);
    expect(order.estimatedArrivalAt).toBeInstanceOf(Date);
    expect(order.save).toHaveBeenCalledTimes(1);
    expect(mocks.User.find).toHaveBeenCalledWith({ role: 'admin', isActive: true });
    expect(mocks.Notification.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: customerId, type: 'delivery' }),
        expect.objectContaining({ userId: farmerId, type: 'delivery' })
      ])
    );
    expect(io.to).toHaveBeenCalled();
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.com',
        subject: 'Order out for delivery'
      })
    );
    expect(res.json).toHaveBeenCalledWith(order);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid tracking status updates', async () => {
    const deliveryPartnerId = createObjectId();
    const customerId = createObjectId();
    const farmerId = createObjectId();
    const orderId = createObjectId();
    const order = createMockDoc({
      _id: orderId,
      customerId,
      farmerId,
      deliveryPartnerId,
      orderStatus: 'Out for Delivery',
      deliveryTrackingStatus: 'On the Way'
    });
    mocks.Order.findById.mockResolvedValue(order);

    const req = {
      params: { id: orderId },
      body: { trackingStatus: 'Delivered' },
      user: { _id: deliveryPartnerId, role: 'delivery' },
      app: createMockApp().app
    };
    const res = createMockResponse();
    const next = vi.fn();

    await updateDeliveryTracking(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid tracking status' });
    expect(order.save).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
