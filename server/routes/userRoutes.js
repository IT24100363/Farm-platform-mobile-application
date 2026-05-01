import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import {
  getProfile,
  updateProfile,
  changeMyPassword,
  deactivateMyAccount,
  listUsers,
  getUserById,
  createUser,
  updateUserAdmin,
  approveFarmer,
  rejectFarmer,
  deactivateUser,
  activateUser,
  getUserOrders,
  dashboardStats,
  analytics
} from '../controllers/userController.js';

const router = Router();

router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile);
router.put('/me/password', protect, changeMyPassword);
router.put('/me/deactivate', protect, deactivateMyAccount);
router.get('/stats', protect, authorizeRoles('admin'), dashboardStats);
router.get('/analytics', protect, authorizeRoles('admin'), analytics);
router.get('/', protect, authorizeRoles('admin'), listUsers);
router.post('/', protect, authorizeRoles('admin'), createUser);
router.put('/approve/:id', protect, authorizeRoles('admin'), approveFarmer);
router.put('/reject/:id', protect, authorizeRoles('admin'), rejectFarmer);
router.put('/deactivate/:id', protect, authorizeRoles('admin'), deactivateUser);
router.put('/activate/:id', protect, authorizeRoles('admin'), activateUser);
router.get('/:id/orders', protect, authorizeRoles('admin'), getUserOrders);
router.get('/:id', protect, authorizeRoles('admin'), getUserById);
router.put('/:id', protect, authorizeRoles('admin'), updateUserAdmin);

export default router;
