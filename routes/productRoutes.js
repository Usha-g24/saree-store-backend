import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadImages } from '../middleware/upload.js';
import { productSchema, productUpdateSchema, stockSchema } from '../utils/schemas.js';
import { listProducts, getProduct, relatedProducts, createProduct, updateProduct, updateStock, deleteProduct } from '../controllers/productController.js';

const r = Router();
r.get('/', listProducts);
r.get('/:id', getProduct);
r.get('/:id/related', relatedProducts);
r.post('/', protect, adminOnly, uploadImages, validate(productSchema), createProduct);
r.put('/:id', protect, adminOnly, uploadImages, validate(productUpdateSchema), updateProduct);
r.patch('/:id/stock', protect, adminOnly, validate(stockSchema), updateStock);
r.delete('/:id', protect, adminOnly, deleteProduct);
export default r;
