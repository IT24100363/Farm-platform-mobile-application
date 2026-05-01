import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { approvedFarmerOnly } from '../middleware/approvedFarmer.js';
import { upload } from '../middleware/uploadMiddleware.js';
import {
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
  toggleProduct,
  listMyProducts,
  getProducts,
  getProductById,
  getProductCategories,
  getProductInsights,
  uploadProductImage,
  adminListProducts,
  adminUpdateProduct,
  adminDeleteProduct
} from '../controllers/productController.js';

const router = Router();

// list / read must keep specific routes above id route to avoid conflicts
router.get('/farmer/my', protect, authorizeRoles('farmer'), approvedFarmerOnly, listMyProducts);
router.post('/upload', protect, authorizeRoles('farmer'), approvedFarmerOnly, upload.single('file'), uploadProductImage);
router.get('/admin/all', protect, authorizeRoles('admin'), adminListProducts);
router.post('/admin', protect, authorizeRoles('admin'), createProduct);
router.get('/categories', getProductCategories);
router.get('/insights', getProductInsights);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', protect, authorizeRoles('farmer'), approvedFarmerOnly, createProduct);
router.put('/:id', protect, authorizeRoles('farmer'), approvedFarmerOnly, updateProduct);
router.put('/:id/stock', protect, authorizeRoles('farmer', 'admin'), approvedFarmerOnly, updateStock);
router.patch('/:id/toggle', protect, authorizeRoles('farmer', 'admin'), approvedFarmerOnly, toggleProduct);
router.delete('/:id', protect, authorizeRoles('farmer'), approvedFarmerOnly, deleteProduct);
router.put('/admin/:id', protect, authorizeRoles('admin'), adminUpdateProduct);
router.delete('/admin/:id', protect, authorizeRoles('admin'), adminDeleteProduct);

export default router;
