import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { approvedFarmerOnly } from '../middleware/approvedFarmer.js';
import {
  createOrder,
  previewOrder,
  updateOrderStatus,
  updatePaymentStatus,
  markPaid,
  cancelOrder,
  processRefund,
  deliveryOrdersToDeliver,
  acceptDeliveryOrder,
  updateDeliveryTracking,
  myOrders,
  farmerOrders,
  deliveryOrders,
  adminOrders,
  getOrderById
} from '../controllers/orderController.js';

const router = Router();

router.post('/', protect, authorizeRoles('customer'), createOrder);
router.post('/preview', protect, authorizeRoles('customer'), previewOrder);
router.get('/me', protect, authorizeRoles('customer'), myOrders);
router.get('/farmer', protect, authorizeRoles('farmer'), approvedFarmerOnly, farmerOrders);
router.get('/delivery', protect, authorizeRoles('delivery'), deliveryOrders);
router.get('/delivery/to-deliver', protect, authorizeRoles('delivery'), deliveryOrdersToDeliver);
router.get('/admin', protect, authorizeRoles('admin'), adminOrders);
router.put('/:id/delivery/accept', protect, authorizeRoles('delivery'), acceptDeliveryOrder);
router.put('/:id/delivery/tracking', protect, authorizeRoles('delivery'), updateDeliveryTracking);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, authorizeRoles('admin', 'delivery', 'farmer'), updateOrderStatus);
router.put('/:id/payment-status', protect, authorizeRoles('admin'), updatePaymentStatus);
router.put('/:id/paid', protect, markPaid);
router.post('/:id/cancel', protect, authorizeRoles('customer', 'admin'), cancelOrder);
router.post('/:id/refund', protect, authorizeRoles('admin'), processRefund);

export default router;
