import Notification from '../models/Notification.js';
import User from '../models/User.js';

const LOW_STOCK_THRESHOLD = 5;

const resolveOwnerId = (farmerId) => {
  if (!farmerId) return null;
  if (typeof farmerId === 'object') return farmerId._id || null;
  return farmerId;
};

const buildMessage = (productName, quantity) => {
  const units = quantity === 1 ? 'unit' : 'units';
  return `Low stock alert: "${productName}" has only ${quantity} ${units} left.`;
};

export const handleLowStockAlert = async ({
  product,
  previousQuantity = null,
  session = null,
  app = null
}) => {
  if (!product) return [];

  const currentQuantity = Number(product.quantity ?? 0);
  const previous = previousQuantity === null || previousQuantity === undefined
    ? null
    : Number(previousQuantity);

  const crossedBelowThreshold = previous !== null
    ? previous >= LOW_STOCK_THRESHOLD && currentQuantity < LOW_STOCK_THRESHOLD
    : currentQuantity < LOW_STOCK_THRESHOLD && !product.lowStockAlertSent;

  const recoveredStock = currentQuantity >= LOW_STOCK_THRESHOLD && product.lowStockAlertSent;

  if (crossedBelowThreshold && !product.lowStockAlertSent) {
    const farmerId = resolveOwnerId(product.farmerId);
    const adminsQuery = User.find({ role: 'admin', isActive: true }).select('_id');
    const admins = session ? await adminsQuery.session(session) : await adminsQuery;

    const recipientIds = new Set(
      [farmerId, ...admins.map((admin) => admin._id)].map((id) => (id ? id.toString() : null)).filter(Boolean)
    );

    const notifications = [...recipientIds].map((userId) => ({
      userId,
      type: 'stock',
      message: buildMessage(product.productName, currentQuantity)
    }));

    let created = [];
    if (notifications.length) {
      created = session
        ? await Notification.insertMany(notifications, { session })
        : await Notification.insertMany(notifications);
    }

    product.lowStockAlertSent = true;
    if (session) {
      await product.save({ session });
    } else {
      await product.save();
    }

    if (!session && app) {
      created.forEach((notification) => {
        app.get('io')?.to(notification.userId.toString()).emit('notification', notification);
      });
    }
    return created;
  }

  if (recoveredStock) {
    product.lowStockAlertSent = false;
    if (session) {
      await product.save({ session });
    } else {
      await product.save();
    }
  }

  return [];
};

export { LOW_STOCK_THRESHOLD };
