import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { approvedFarmerOnly } from '../middleware/approvedFarmer.js';
import {
  addReview,
  updateReview,
  deleteReview,
  getReviewsForProduct,
  listManageReviews,
  replyToReview
} from '../controllers/reviewController.js';

const router = Router();

router.get('/manage', protect, authorizeRoles('admin', 'farmer'), approvedFarmerOnly, listManageReviews);
router.get('/product/:productId', getReviewsForProduct);
router.post('/', protect, authorizeRoles('customer'), addReview);
router.put('/:id', protect, authorizeRoles('customer'), updateReview);
router.put('/:id/reply', protect, authorizeRoles('admin', 'farmer'), approvedFarmerOnly, replyToReview);
router.delete('/:id', protect, authorizeRoles('customer', 'admin'), deleteReview);

export default router;
