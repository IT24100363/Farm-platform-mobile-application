import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Promotion from '../models/Promotion.js';
import User from '../models/User.js';
import stripe from '../config/stripe.js';
import { applyBestPromotion } from '../utils/applyBestPromotion.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import { sendEmail } from '../utils/sendEmail.js';
import { handleLowStockAlert } from '../utils/lowStockAlerts.js';


const assignDeliveryPartner = async () => {
  return User.findOne({ role: 'delivery', isActive: true });
};

const DEMO_PAYMENT_MODES = ['CARD', 'PAYPAL', 'UPI', 'NETBANKING', 'WALLET'];
const PAYMENT_STATUS_OPTIONS = ['Pending', 'Paid', 'Returned'];
const ORDER_FLOW = {
  COD: ['Placed', 'In Transit', 'Out for Delivery', 'Delivered'],
  ONLINE: ['Confirmed', 'In Transit', 'Out for Delivery', 'Delivered']
};
const DELIVERY_TRACKING_STATUSES = ['Awaiting Acceptance', 'On the Way', 'Near Delivery Location', 'Delayed', 'Delivered'];
const DELIVERY_DELAY_THRESHOLD_MINUTES = Number(process.env.DELIVERY_DELAY_THRESHOLD_MINUTES || 30);
const CHECKOUT_TAX_PERCENT = Number(process.env.CHECKOUT_TAX_PERCENT || 0);
const CHECKOUT_DELIVERY_FEE = Number(process.env.CHECKOUT_DELIVERY_FEE || 0);
const CHECKOUT_FREE_DELIVERY_MIN = Number(process.env.CHECKOUT_FREE_DELIVERY_MIN || 0);
const ETA_REQUIRED_MESSAGE = 'Estimated delivery date and time is required when accepting an order';

const extractId = (value) => (value && value._id ? value._id : value);
const isSameId = (a, b) => {
  const left = extractId(a);
  const right = extractId(b);
  if (!left || !right) return false;
  return left.toString() === right.toString();
};

const resolveCurrentOrderStatus = (order) => {
  if (order.orderStatus === 'Pending') {
    return order.paymentMethod === 'ONLINE' ? 'Confirmed' : 'Placed';
  }
  return order.orderStatus;
};

const getNextOrderStatus = (order) => {
  const flow = ORDER_FLOW[order.paymentMethod] || ORDER_FLOW.COD;
  const current = resolveCurrentOrderStatus(order);
  const index = flow.indexOf(current);
  if (index < 0) return null;
  return flow[index + 1] || null;
};

const validateDemoPayment = (demoPayment = {}) => {
  const mode = String(demoPayment.mode || '').toUpperCase();
  if (!DEMO_PAYMENT_MODES.includes(mode)) {
    return { valid: false, message: 'Select a valid online payment option' };
  }

  if (mode === 'CARD') {
    const cardNumber = String(demoPayment.cardNumber || '').replace(/\s+/g, '');
    const name = String(demoPayment.cardName || '').trim();
    const expiry = String(demoPayment.expiry || '').trim();
    const cvv = String(demoPayment.cvv || '').trim();
    if (!/^\d{12,19}$/.test(cardNumber)) return { valid: false, message: 'Enter a valid card number' };
    if (!name) return { valid: false, message: 'Enter card holder name' };
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return { valid: false, message: 'Enter expiry as MM/YY' };
    if (!/^\d{3,4}$/.test(cvv)) return { valid: false, message: 'Enter a valid CVV' };
  }

  if (mode === 'PAYPAL') {
    const email = String(demoPayment.paypalEmail || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { valid: false, message: 'Enter a valid PayPal email' };
  }

  if (mode === 'UPI') {
    const upiId = String(demoPayment.upiId || '').trim();
    if (!/^[\w.-]+@[\w.-]+$/.test(upiId)) return { valid: false, message: 'Enter a valid UPI ID' };
  }

  if (mode === 'NETBANKING' || mode === 'WALLET') {
    const provider = String(demoPayment.provider || '').trim();
    if (!provider) return { valid: false, message: 'Select a provider' };
  }

  return { valid: true, mode };
};

const normalizePaymentStatus = (value) => {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === 'pending') return 'Pending';
  if (safe === 'paid') return 'Paid';
  if (safe === 'returned' || safe === 'refunded') return 'Returned';
  return null;
};

const isReturnedPaymentStatus = (value) => {
  const safe = String(value || '').trim().toLowerCase();
  return safe === 'returned' || safe === 'refunded';
};

const buildPaymentStatusMessage = (paymentStatus) => {
  if (paymentStatus === 'Paid') return 'Payment received';
  if (paymentStatus === 'Returned') return 'Payment returned';
  return `Payment status updated to ${String(paymentStatus || '').toLowerCase()}`;
};

const roundCurrency = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const buildCheckoutTotals = ({ subTotal, discountTotal }) => {
  const itemTotal = Math.max(0, roundCurrency(subTotal - discountTotal));
  const taxAmount = CHECKOUT_TAX_PERCENT > 0 ? roundCurrency((itemTotal * CHECKOUT_TAX_PERCENT) / 100) : 0;
  const deliveryCharge =
    CHECKOUT_DELIVERY_FEE > 0 &&
    !(CHECKOUT_FREE_DELIVERY_MIN > 0 && itemTotal >= CHECKOUT_FREE_DELIVERY_MIN)
      ? CHECKOUT_DELIVERY_FEE
      : 0;
  const totalAmount = roundCurrency(itemTotal + taxAmount + deliveryCharge);

  return {
    subTotal: roundCurrency(subTotal),
    discountTotal: roundCurrency(discountTotal),
    itemTotal,
    taxAmount,
    deliveryCharge,
    totalAmount,
    taxPercent: CHECKOUT_TAX_PERCENT
  };
};

const maskEmail = (email = '') => {
  const [name, domain] = String(email).split('@');
  if (!name || !domain) return email;
  const safeName = name.length <= 2 ? `${name[0] || ''}*` : `${name.slice(0, 2)}***`;
  return `${safeName}@${domain}`;
};

const maskUpi = (upiId = '') => {
  const [name, handle] = String(upiId).split('@');
  if (!name || !handle) return upiId;
  const safeName = name.length <= 2 ? `${name[0] || ''}*` : `${name.slice(0, 2)}***`;
  return `${safeName}@${handle}`;
};

const buildPaymentMetaForStorage = (demoPayment = {}, mode = '') => {
  const selectedMode = String(mode || '').toUpperCase();

  if (selectedMode === 'CARD') {
    const digits = String(demoPayment.cardNumber || '').replace(/\D/g, '');
    return {
      cardHolder: String(demoPayment.cardName || '').trim(),
      cardLast4: digits.slice(-4),
      cardExpiry: String(demoPayment.expiry || '').trim()
    };
  }

  if (selectedMode === 'PAYPAL') {
    return { paypalEmail: maskEmail(String(demoPayment.paypalEmail || '').trim()) };
  }

  if (selectedMode === 'UPI') {
    return { upiId: maskUpi(String(demoPayment.upiId || '').trim()) };
  }

  if (selectedMode === 'NETBANKING' || selectedMode === 'WALLET') {
    return { provider: String(demoPayment.provider || '').trim() };
  }

  return undefined;
};

const buildRefundDescriptor = (order) => {
  if (order.paymentProvider === 'CARD') {
    const holder = order.paymentMeta?.cardHolder || 'Card';
    const last4 = order.paymentMeta?.cardLast4 || '****';
    const expiry = order.paymentMeta?.cardExpiry ? ` (exp ${order.paymentMeta.cardExpiry})` : '';
    return `Card ${holder} ****${last4}${expiry}`;
  }
  if (order.paymentProvider === 'PAYPAL' && order.paymentMeta?.paypalEmail) {
    return `PayPal ${order.paymentMeta.paypalEmail}`;
  }
  if (order.paymentProvider === 'UPI' && order.paymentMeta?.upiId) {
    return `UPI ${order.paymentMeta.upiId}`;
  }
  if ((order.paymentProvider === 'NETBANKING' || order.paymentProvider === 'WALLET') && order.paymentMeta?.provider) {
    return `${order.paymentProvider} (${order.paymentMeta.provider})`;
  }
  return order.paymentProvider || 'ONLINE';
};

const parseEstimatedArrivalAt = (value) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return { error: ETA_REQUIRED_MESSAGE };
  }
  const eta = new Date(raw);
  if (Number.isNaN(eta.getTime())) {
    return { error: 'Invalid estimated delivery date/time' };
  }
  return { eta };
};

export const previewOrder = async (req, res, next) => {
  try {
    const { items = [], promoCode } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'No items to preview' });
    }

    const normalizedItems = items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity)
    }));

    if (normalizedItems.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
      return res.status(400).json({ message: 'Each item requires valid productId and quantity' });
    }

    const productIds = normalizedItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const promotions = await Promotion.find({ isActive: true, isApproved: true });

    if (products.length !== normalizedItems.length) {
      return res.status(400).json({ message: 'One or more selected products were not found' });
    }

    let farmerOwnerId = null;
    let subTotal = 0;
    let discountTotal = 0;
    const lineItems = [];
    const usedPromotionIds = new Set();

    for (const item of normalizedItems) {
      const product = products.find((row) => row._id.toString() === item.productId.toString());
      if (!product) return res.status(400).json({ message: 'One or more selected products were not found' });
      if (!product.isAvailable || product.quantity <= 0) {
        return res.status(400).json({ message: `${product.productName} is currently unavailable` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.productName}. Available: ${product.quantity}` });
      }

      if (!farmerOwnerId) {
        farmerOwnerId = product.farmerId.toString();
      } else if (farmerOwnerId !== product.farmerId.toString()) {
        return res.status(400).json({ message: 'Cart items must belong to one farmer. Place separate orders for different farmers.' });
      }

      const best = applyBestPromotion(product, promotions, promoCode);
      const discountPerUnit = Math.min(Number(best.discountAmount || 0), Number(product.price || 0));
      const finalUnitPrice = roundCurrency(Math.max(0, Number(product.price || 0) - discountPerUnit));
      const lineSubTotal = roundCurrency(Number(product.price || 0) * item.quantity);
      const lineDiscount = roundCurrency(discountPerUnit * item.quantity);
      const lineTotal = roundCurrency(finalUnitPrice * item.quantity);

      subTotal += lineSubTotal;
      discountTotal += lineDiscount;
      if (best.promotionId) usedPromotionIds.add(best.promotionId.toString());

      lineItems.push({
        productId: product._id,
        productName: product.productName,
        quantity: item.quantity,
        unitPrice: Number(product.price || 0),
        discountPerUnit,
        finalUnitPrice,
        lineSubTotal,
        lineDiscount,
        lineTotal
      });
    }

    const appliedPromotions = usedPromotionIds.size
      ? await Promotion.find({ _id: { $in: Array.from(usedPromotionIds) } }).select('title promoCode discountType discountValue')
      : [];
    const summary = buildCheckoutTotals({ subTotal, discountTotal });

    return res.json({
      lineItems,
      summary,
      farmerId: farmerOwnerId,
      appliedPromotions
    });
  } catch (err) {
    next(err);
  }
};

const getDelayReferenceTimestamp = (order) => {
  if (order.orderStatus !== 'Out for Delivery') return null;
  if (order.estimatedArrivalAt) {
    return new Date(order.estimatedArrivalAt).getTime() + DELIVERY_DELAY_THRESHOLD_MINUTES * 60000;
  }
  if (order.outForDeliveryAt) {
    return new Date(order.outForDeliveryAt).getTime() + DELIVERY_DELAY_THRESHOLD_MINUTES * 60000;
  }
  return null;
};

const hasExceededDeliveryThreshold = (order) => {
  const ref = getDelayReferenceTimestamp(order);
  if (!ref) return false;
  return Date.now() > ref;
};

const notifyCustomerDeliveryDelay = async ({ order, app }) => {
  if (!order || order.isDeliveryDelayed) return false;
  if (order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled' || order.orderStatus === 'Refunded') {
    return false;
  }
  if (!hasExceededDeliveryThreshold(order)) return false;

  order.isDeliveryDelayed = true;
  order.delayNotifiedAt = new Date();
  await order.save();

  const orderCode = order._id.toString().slice(-6);
  const message = `Delivery delay for order #${orderCode}. You can contact support or cancel as per policy.`;
  const notification = await Notification.create({
    userId: order.customerId,
    message,
    type: 'delivery'
  });
  app.get('io')?.to(order.customerId.toString()).emit('notification', notification);
  const customer = await User.findById(order.customerId);
  if (customer) {
    sendEmail({
      to: customer.email,
      subject: 'Delivery delayed',
      html: `Order ${order._id} is delayed. You may cancel it if eligible.`
    }).catch(() => {});
  }
  return true;
};

export const createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items = [], paymentMethod = 'COD', promoCode, address, deliveryLocation, demoPayment = {} } = req.body;
    if (!items.length) return res.status(400).json({ message: 'No items' });
    const isOnlinePayment = paymentMethod === 'ONLINE';
    let demoPaymentMode = null;

    if (isOnlinePayment) {
      const validation = validateDemoPayment(demoPayment);
      if (!validation.valid) return res.status(400).json({ message: validation.message });
      demoPaymentMode = validation.mode;
    }

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } }).session(session);
    const promotions = await Promotion.find({ isActive: true, isApproved: true }).session(session);

    let subTotal = 0;
    let discountTotal = 0;
    const orderProducts = [];
    const lowStockRecipientIds = new Set();
    let farmerOwnerId = null;

    const usedPromoIds = new Set();

    for (const item of items) {
      const product = products.find((p) => p._id.toString() === item.productId);
      if (!product || !product.isAvailable) throw new Error('Product unavailable');
      if (product.quantity < item.quantity) throw new Error(`Insufficient stock for ${product.productName}`);
      if (!farmerOwnerId) {
        farmerOwnerId = product.farmerId.toString();
      } else if (farmerOwnerId !== product.farmerId.toString()) {
        throw new Error('Cart items must belong to one farmer. Place separate orders for different farmers.');
      }
      const best = applyBestPromotion(product, promotions, promoCode);
      const discountPerUnit = Math.min(Number(best.discountAmount || 0), Number(product.price || 0));
      const finalPrice = roundCurrency(Math.max(0, Number(product.price || 0) - discountPerUnit));
      orderProducts.push({ productId: product._id, quantity: item.quantity, price: finalPrice });
      subTotal += roundCurrency(Number(product.price || 0) * item.quantity);
      discountTotal += roundCurrency(discountPerUnit * item.quantity);
      if (best.promotionId) usedPromoIds.add(best.promotionId.toString());
      // atomic decrement with condition
      const dec = await Product.findOneAndUpdate(
        { _id: product._id, quantity: { $gte: item.quantity } },
        { $inc: { quantity: -item.quantity } },
        { new: true, session }
      );
      if (!dec) throw new Error(`Insufficient stock for ${product.productName}`);
      const lowStockNotifications = await handleLowStockAlert({
        product: dec,
        previousQuantity: product.quantity,
        session,
        app: req.app
      });
      lowStockNotifications.forEach((notification) => {
        if (notification.userId) lowStockRecipientIds.add(notification.userId.toString());
      });
    }

    const deliveryPartner = await assignDeliveryPartner();
    const paymentReference = isOnlinePayment
      ? `DEMO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      : undefined;
    if (!farmerOwnerId) throw new Error('Unable to determine farmer for selected cart items');
    const checkoutTotals = buildCheckoutTotals({ subTotal, discountTotal });

    const normalizedDeliveryLocation =
      deliveryLocation && typeof deliveryLocation === 'object'
        ? {
            label: String(deliveryLocation.label || '').trim(),
            address: String(deliveryLocation.address || address || '').trim(),
            latitude: Number(deliveryLocation.latitude),
            longitude: Number(deliveryLocation.longitude),
            source: ['manual', 'search', 'map'].includes(String(deliveryLocation.source || '').trim())
              ? String(deliveryLocation.source || '').trim()
              : 'manual'
          }
        : undefined;

    const orderPayload = {
      customerId: req.user._id,
      farmerId: farmerOwnerId,
      products: orderProducts,
      totalAmount: checkoutTotals.totalAmount,
      subTotal: checkoutTotals.subTotal,
      discountTotal: checkoutTotals.discountTotal,
      taxAmount: checkoutTotals.taxAmount,
      deliveryCharge: checkoutTotals.deliveryCharge,
      paymentMethod,
      shippingAddress: String(address || normalizedDeliveryLocation?.address || '').trim(),
      deliveryPartnerId: deliveryPartner?._id,
      paymentStatus: isOnlinePayment ? 'Paid' : 'Pending',
      orderStatus: isOnlinePayment ? 'Confirmed' : 'Placed'
    };

    if (normalizedDeliveryLocation?.address || normalizedDeliveryLocation?.label) {
      orderPayload.deliveryLocation = normalizedDeliveryLocation;
    }

    if (isOnlinePayment) {
      orderPayload.paymentProvider = demoPaymentMode;
      orderPayload.paymentReference = paymentReference;
      orderPayload.paymentMeta = buildPaymentMetaForStorage(demoPayment, demoPaymentMode);
    }

    const order = await Order.create([orderPayload], { session });

    if (usedPromoIds.size) {
      await Promotion.updateMany(
        { _id: { $in: Array.from(usedPromoIds) } },
        { $inc: { usageCount: 1 } },
        { session }
      );
    }

    const orderDoc = order[0];
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id').session(session);
    const notificationsPayload = [];

    if (deliveryPartner) {
      notificationsPayload.push({
        userId: deliveryPartner._id,
        message: `New delivery assigned for order #${orderDoc._id.toString().slice(-6)}`,
        type: 'delivery'
      });
    }

    notificationsPayload.push({
      userId: req.user._id,
      message: isOnlinePayment ? 'Order confirmed and payment successful' : 'Order placed successfully',
      type: 'order'
    });

    if (orderDoc.farmerId) {
      notificationsPayload.push({
        userId: orderDoc.farmerId,
        message: `New customer order received #${orderDoc._id.toString().slice(-6)}`,
        type: 'order'
      });
    }

    admins.forEach((admin) => {
      notificationsPayload.push({
        userId: admin._id,
        message: `New order placed #${orderDoc._id.toString().slice(-6)}`,
        type: 'order'
      });
    });

    if (isOnlinePayment) {
      notificationsPayload.push({
        userId: req.user._id,
        message: `Payment successful via ${demoPaymentMode}`,
        type: 'payment'
      });
    }

    const createdNotifications = notificationsPayload.length
      ? await Notification.insertMany(notificationsPayload, { session })
      : [];

    await session.commitTransaction();
    createdNotifications.forEach((notification) => {
      req.app.get('io')?.to(notification.userId.toString()).emit('notification', notification);
    });
    lowStockRecipientIds.forEach((userId) => {
      req.app.get('io')?.to(userId).emit('notification', { type: 'stock' });
    });
    sendEmail({ to: req.user.email, subject: 'Order placed', html: `Your order ${orderDoc._id} is placed.` }).catch(() => {});
    if (isOnlinePayment) {
      sendEmail({
        to: req.user.email,
        subject: 'Payment successful',
        html: `Your demo payment for order ${orderDoc._id} was successful via ${demoPaymentMode}.`
      }).catch(() => {});
    }
    res.status(201).json({
      order: orderDoc,
      demoPayment: isOnlinePayment
        ? { status: 'succeeded', provider: demoPaymentMode, reference: paymentReference }
        : undefined
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 'farmer' && !isSameId(order.farmerId, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (req.user.role === 'delivery' && !isSameId(order.deliveryPartnerId, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Refunded') {
      return res.status(400).json({ message: `${order.orderStatus} orders cannot be updated` });
    }

    const nextStatus = getNextOrderStatus(order);
    if (!nextStatus) {
      return res.status(400).json({ message: 'Order is already in final state' });
    }

    if (status !== nextStatus) {
      return res.status(400).json({ message: `Invalid status transition. Next allowed status is "${nextStatus}"` });
    }

    if (status === 'Out for Delivery' && req.user.role !== 'delivery') {
      return res.status(403).json({ message: 'Only delivery personnel can move order to Out for Delivery' });
    }
    if (status === 'Delivered' && req.user.role !== 'delivery') {
      return res.status(403).json({ message: 'Only delivery personnel can mark orders as Delivered' });
    }

    order.orderStatus = status;
    if (status === 'In Transit') {
      order.inTransitAt = new Date();
      order.deliveryTrackingStatus = 'Awaiting Acceptance';
      order.deliveryAcceptedAt = undefined;
      order.outForDeliveryAt = undefined;
      order.isDeliveryDelayed = false;
      order.delayNotifiedAt = undefined;
    }
    if (status === 'Out for Delivery') {
      const { eta, error } = parseEstimatedArrivalAt(req.body.estimatedArrivalAt);
      if (error) {
        return res.status(400).json({ message: error });
      }

      const now = new Date();
      order.deliveryAcceptedAt = order.deliveryAcceptedAt || now;
      order.outForDeliveryAt = order.outForDeliveryAt || now;
      order.estimatedArrivalAt = eta;
      if (!DELIVERY_TRACKING_STATUSES.includes(order.deliveryTrackingStatus)) {
        order.deliveryTrackingStatus = 'On the Way';
      } else if (order.deliveryTrackingStatus === 'Awaiting Acceptance') {
        order.deliveryTrackingStatus = 'On the Way';
      }
      order.isDeliveryDelayed = false;
      order.delayNotifiedAt = undefined;
    }
    if (status === 'Delivered') {
      order.deliveryTrackingStatus = 'Delivered';
      order.isDeliveryDelayed = false;
    }
    await order.save();

    const orderCode = order._id.toString().slice(-6);
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    const notificationMap = new Map();
    const enqueueNotification = (userId, message, type = 'order') => {
      if (!userId) return;
      const key = userId.toString();
      if (!notificationMap.has(key)) {
        notificationMap.set(key, { userId, message, type });
      }
    };

    enqueueNotification(order.customerId, `Order #${orderCode} status updated to ${status}`);
    enqueueNotification(order.farmerId, `Order #${orderCode} moved to ${status}`);
    if (status === 'In Transit') {
      enqueueNotification(
        order.deliveryPartnerId,
        `Order #${orderCode} is ready for delivery. Please accept it from Orders to Deliver.`,
        'delivery'
      );
    } else {
      enqueueNotification(order.deliveryPartnerId, `Order #${orderCode} moved to ${status}`, 'delivery');
    }
    admins.forEach((admin) => {
      enqueueNotification(admin._id, `Order #${orderCode} updated to ${status}`);
    });

    const notifications = notificationMap.size
      ? await Notification.insertMany(Array.from(notificationMap.values()))
      : [];

    res.json({ order, nextAllowedStatus: getNextOrderStatus(order) });
    notifications.forEach((notification) => {
      req.app.get('io')?.to(notification.userId.toString()).emit('notification', notification);
    });
    const cust = await User.findById(order.customerId);
    if (cust) sendEmail({ to: cust.email, subject: `Order ${status}`, html: `Your order status is now ${status}` }).catch(() => {});
  } catch (err) { next(err); }
};

export const markPaid = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { paymentStatus: 'Paid' }, { new: true });
    res.json(order);
    await Notification.create({ userId: order.customerId, message: 'Payment received', type: 'payment' });
    req.app.get('io')?.to(order.customerId.toString()).emit('notification', { message: 'Payment received' });
    const cust = await User.findById(order.customerId);
    if (cust) sendEmail({ to: cust.email, subject: 'Payment received', html: `We received payment for order ${order._id}` }).catch(() => {});
  } catch (err) { next(err); }
};

export const updatePaymentStatus = async (req, res, next) => {
  try {
    const paymentStatus = normalizePaymentStatus(req.body.paymentStatus ?? req.body.status);
    if (!paymentStatus) {
      return res.status(400).json({
        message: `Invalid payment status. Allowed values: ${PAYMENT_STATUS_OPTIONS.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });

    order.paymentStatus = paymentStatus;
    await order.save();

    const orderCode = order._id.toString().slice(-6);
    const message = buildPaymentStatusMessage(paymentStatus);
    const notification = await Notification.create({
      userId: order.customerId,
      message: `${message} for order #${orderCode}`,
      type: 'payment'
    });

    req.app.get('io')?.to(order.customerId.toString()).emit('notification', notification);

    const cust = await User.findById(order.customerId);
    if (cust) {
      sendEmail({
        to: cust.email,
        subject: 'Payment status updated',
        html: `Your payment status for order ${order._id} is now ${paymentStatus.toLowerCase()}.`
      }).catch(() => {});
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });

    const isAdmin = req.user.role === 'admin';
    const isCustomer = req.user.role === 'customer';
    if (!isAdmin && !isCustomer) {
      return res.status(403).json({ message: 'Only customer or admin can cancel an order' });
    }
    if (isCustomer && !isSameId(order.customerId, req.user._id)) {
      return res.status(403).json({ message: 'You can cancel only your own orders' });
    }

    if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Refunded') {
      return res.status(400).json({ message: `Order already ${order.orderStatus.toLowerCase()}` });
    }
    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({ message: 'Delivered orders cannot be cancelled' });
    }

    const currentStatus = resolveCurrentOrderStatus(order);
    const diffMins = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
    const withinWindow = diffMins <= 30;
    const beforeTransit = currentStatus === 'Placed' || currentStatus === 'Confirmed';
    let delayedDeliveryCancel = Boolean(order.isDeliveryDelayed);
    if (!delayedDeliveryCancel && hasExceededDeliveryThreshold(order)) {
      await notifyCustomerDeliveryDelay({ order, app: req.app });
      delayedDeliveryCancel = true;
    }

    if (isCustomer && !(withinWindow || beforeTransit || delayedDeliveryCancel)) {
      return res.status(400).json({
        message: 'Cancellation is allowed within 30 minutes, before In Transit, or when delivery is marked delayed'
      });
    }

    order.orderStatus = 'Cancelled';
    // restock items
    for (const item of order.products) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
      const previousQuantity = product.quantity;
      product.quantity += item.quantity;
      if (product.quantity > 0) product.isAvailable = true;
      await product.save();
      await handleLowStockAlert({ product, previousQuantity, app: req.app });
    }
    await order.save();

    const orderCode = order._id.toString().slice(-6);
    const actor = isAdmin ? 'Admin' : 'Customer';
    const notificationsPayload = [];
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    const addNotification = (userId, message, type = 'order') => {
      if (!userId) return;
      notificationsPayload.push({ userId, message, type });
    };

    addNotification(order.customerId, `Order #${orderCode} cancelled by ${actor}`);
    addNotification(order.farmerId, `Order #${orderCode} was cancelled`);
    addNotification(order.deliveryPartnerId, `Order #${orderCode} was cancelled`);

    if (order.paymentMethod === 'ONLINE' && order.paymentStatus === 'Paid') {
      const refundMessage = `Order #${orderCode} cancelled. Refund is pending admin confirmation.`;
      addNotification(order.customerId, refundMessage, 'refund');
      admins.forEach((admin) => {
        addNotification(admin._id, refundMessage, 'refund');
      });
    } else {
      admins.forEach((admin) => {
        addNotification(admin._id, `Order #${orderCode} cancelled by ${actor}`);
      });
    }

    const createdNotifications = notificationsPayload.length
      ? await Notification.insertMany(notificationsPayload)
      : [];

    createdNotifications.forEach((notification) => {
      req.app.get('io')?.to(notification.userId.toString()).emit('notification', notification);
    });

    const cust = await User.findById(order.customerId);
    if (cust) {
      const emailText = order.paymentMethod === 'ONLINE' && order.paymentStatus === 'Paid'
        ? `Your order ${order._id} has been cancelled. Refund is pending admin confirmation.`
        : `Your order ${order._id} has been cancelled.`;
      sendEmail({ to: cust.email, subject: 'Order cancelled', html: emailText }).catch(() => {});
    }

    res.json(order);
  } catch (err) { next(err); }
};

export const deliveryOrdersToDeliver = async (req, res, next) => {
  try {
    const orders = await Order.find({
      deliveryPartnerId: req.user._id,
      orderStatus: 'In Transit'
    })
      .populate('customerId', 'name email phone address')
      .populate('farmerId', 'name email phone')
      .populate('products.productId', 'productName images')
      .sort({ updatedAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

export const acceptDeliveryOrder = async (req, res, next) => {
  try {
    const { eta, error } = parseEstimatedArrivalAt(req.body.estimatedArrivalAt);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    if (!isSameId(order.deliveryPartnerId, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (order.orderStatus !== 'In Transit') {
      return res.status(400).json({ message: 'Only In Transit orders can be accepted for delivery' });
    }

    const now = new Date();
    order.orderStatus = 'Out for Delivery';
    order.deliveryAcceptedAt = now;
    order.outForDeliveryAt = now;
    order.deliveryTrackingStatus = 'On the Way';
    order.isDeliveryDelayed = false;
    order.delayNotifiedAt = undefined;
    order.estimatedArrivalAt = eta;
    await order.save();

    const orderCode = order._id.toString().slice(-6);
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    const payload = [
      {
        userId: order.customerId,
        message: `Order #${orderCode} is Out for Delivery`,
        type: 'delivery'
      },
      {
        userId: order.farmerId,
        message: `Order #${orderCode} accepted by delivery partner`,
        type: 'delivery'
      }
    ];
    admins.forEach((admin) => {
      payload.push({
        userId: admin._id,
        message: `Order #${orderCode} accepted by delivery partner`,
        type: 'delivery'
      });
    });
    const notifications = await Notification.insertMany(payload);
    notifications.forEach((notification) => {
      req.app.get('io')?.to(notification.userId.toString()).emit('notification', notification);
    });

    const customer = await User.findById(order.customerId);
    if (customer) {
      const etaText = order.estimatedArrivalAt ? ` ETA: ${order.estimatedArrivalAt.toLocaleString()}.` : '';
      sendEmail({
        to: customer.email,
        subject: 'Order out for delivery',
        html: `Your order ${order._id} is now out for delivery.${etaText}`
      }).catch(() => {});
    }

    return res.json(order);
  } catch (err) {
    next(err);
  }
};

export const updateDeliveryTracking = async (req, res, next) => {
  try {
    const { trackingStatus, estimatedArrivalAt } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    if (!isSameId(order.deliveryPartnerId, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (order.orderStatus !== 'Out for Delivery') {
      return res.status(400).json({ message: 'Tracking can be updated only for Out for Delivery orders' });
    }

    if (trackingStatus) {
      if (!DELIVERY_TRACKING_STATUSES.includes(trackingStatus) || trackingStatus === 'Awaiting Acceptance' || trackingStatus === 'Delivered') {
        return res.status(400).json({ message: 'Invalid tracking status' });
      }
      order.deliveryTrackingStatus = trackingStatus;
      if (trackingStatus === 'Delayed') {
        order.isDeliveryDelayed = true;
        order.delayNotifiedAt = new Date();
      }
    }

    if (estimatedArrivalAt) {
      const eta = new Date(estimatedArrivalAt);
      if (Number.isNaN(eta.getTime())) {
        return res.status(400).json({ message: 'Invalid ETA value' });
      }
      order.estimatedArrivalAt = eta;
      if (eta.getTime() < Date.now()) {
        order.isDeliveryDelayed = true;
        order.delayNotifiedAt = order.delayNotifiedAt || new Date();
      }
    }

    await order.save();

    if (!order.isDeliveryDelayed) {
      await notifyCustomerDeliveryDelay({ order, app: req.app });
    }

    const orderCode = order._id.toString().slice(-6);
    const trackingMsg = `Order #${orderCode} update: ${order.deliveryTrackingStatus || 'Tracking updated'}${
      order.estimatedArrivalAt ? ` • ETA ${new Date(order.estimatedArrivalAt).toLocaleString()}` : ''
    }`;
    const notification = await Notification.create({
      userId: order.customerId,
      message: trackingMsg,
      type: 'delivery'
    });
    req.app.get('io')?.to(order.customerId.toString()).emit('notification', notification);

    const customer = await User.findById(order.customerId);
    if (customer) {
      sendEmail({
        to: customer.email,
        subject: 'Delivery tracking update',
        html: trackingMsg
      }).catch(() => {});
    }

    return res.json(order);
  } catch (err) {
    next(err);
  }
};

export const processRefund = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });

    if (order.paymentMethod !== 'ONLINE') {
      return res.status(400).json({ message: 'Refund processing is only available for online payments' });
    }
    if (order.orderStatus !== 'Cancelled') {
      return res.status(400).json({ message: 'Only cancelled orders can be marked as refunded' });
    }
    if (isReturnedPaymentStatus(order.paymentStatus) || order.orderStatus === 'Refunded') {
      return res.status(400).json({ message: 'Refund already processed for this order' });
    }
    if (order.paymentStatus !== 'Paid') {
      return res.status(400).json({ message: 'Only paid online orders can be refunded' });
    }

    const paymentIntentId = req.body.paymentIntentId || order.paymentIntentId;
    const isDemoPayment = typeof order.paymentReference === 'string' && order.paymentReference.startsWith('DEMO-');
    if (paymentIntentId && !isDemoPayment) {
      await stripe.refunds.create({ payment_intent: paymentIntentId });
    }

    order.paymentStatus = 'Returned';
    order.orderStatus = 'Refunded';
    await order.save();

    const orderCode = order._id.toString().slice(-6);
    const refundDetails = buildRefundDescriptor(order);
    const refundMessage = `Refund completed for order #${orderCode}. Method: ${refundDetails}${order.paymentReference ? ` • Ref: ${order.paymentReference}` : ''}`;

    const notification = await Notification.create({
      userId: order.customerId,
      message: refundMessage,
      type: 'refund'
    });

    req.app.get('io')?.to(order.customerId.toString()).emit('notification', notification);
    const customer = await User.findById(order.customerId);
    if (customer) {
      sendEmail({
        to: customer.email,
        subject: 'Refund processed',
        html: `Refund has been processed for order ${order._id}.`
      }).catch(() => {});
    }

    return res.json({ order, refundMessage });
  } catch (err) {
    next(err);
  }
};

export const myOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customerId: req.user._id })
      .populate('farmerId', 'name email phone')
      .populate('deliveryPartnerId', 'name email phone')
      .populate('products.productId', 'productName images')
      .sort({ createdAt: -1 });
    await Promise.all(orders.map((order) => notifyCustomerDeliveryDelay({ order, app: req.app })));
    res.json(orders);
  } catch (err) { next(err); }
};

export const farmerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ farmerId: req.user._id })
      .populate('customerId', 'name email phone address')
      .populate('deliveryPartnerId', 'name email phone')
      .populate('products.productId', 'productName images')
      .sort({ createdAt: -1 });
    await Promise.all(orders.map((order) => notifyCustomerDeliveryDelay({ order, app: req.app })));
    res.json(orders);
  } catch (err) { next(err); }
};

export const deliveryOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ deliveryPartnerId: req.user._id })
      .populate('customerId', 'name email phone address')
      .populate('farmerId', 'name email phone')
      .populate('products.productId', 'productName images')
      .sort({ createdAt: -1 });
    await Promise.all(orders.map((order) => notifyCustomerDeliveryDelay({ order, app: req.app })));
    res.json(orders);
  } catch (err) { next(err); }
};

export const adminOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('customerId', 'name email phone address')
      .populate('farmerId', 'name email phone')
      .populate('deliveryPartnerId', 'name email phone')
      .populate('products.productId', 'productName images')
      .sort({ createdAt: -1 });
    await Promise.all(orders.map((order) => notifyCustomerDeliveryDelay({ order, app: req.app })));
    res.json(orders);
  } catch (err) { next(err); }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'name email phone address')
      .populate('farmerId', 'name email phone')
      .populate('deliveryPartnerId', 'name email phone')
      .populate('products.productId', 'productName images price');
    if (!order) return res.status(404).json({ message: 'Not found' });
    if (
      req.user.role !== 'admin' &&
      !isSameId(order.customerId, req.user._id) &&
      !isSameId(order.farmerId, req.user._id) &&
      !isSameId(order.deliveryPartnerId, req.user._id)
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await notifyCustomerDeliveryDelay({ order, app: req.app });
    res.json(order);
  } catch (err) { next(err); }
};
