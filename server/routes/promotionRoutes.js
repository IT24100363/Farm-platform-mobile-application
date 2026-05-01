import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { approvedFarmerOnly } from '../middleware/approvedFarmer.js';
import { createPromotion, updatePromotion, listPromotions, managePromotions, togglePromotion, approvePromotion, deletePromotion } from '../controllers/promotionController.js';

const router = Router();

router.get('/', listPromotions); // public/active
router.get('/manage', protect, authorizeRoles('admin', 'farmer'), managePromotions);
router.post('/', protect, authorizeRoles('admin', 'farmer'), approvedFarmerOnly, createPromotion);
router.put('/:id', protect, authorizeRoles('admin', 'farmer'), approvedFarmerOnly, updatePromotion);
router.delete('/:id', protect, authorizeRoles('admin', 'farmer'), approvedFarmerOnly, deletePromotion);
router.patch('/:id/toggle', protect, authorizeRoles('admin', 'farmer'), approvedFarmerOnly, togglePromotion);
router.patch('/:id/approve', protect, authorizeRoles('admin'), approvePromotion);

export default router;
