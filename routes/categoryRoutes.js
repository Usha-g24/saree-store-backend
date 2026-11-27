import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { categorySchema } from '../utils/schemas.js';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';

const r = Router();
r.get('/', listCategories);
r.post('/', protect, adminOnly, validate(categorySchema), createCategory);
r.put('/:id', protect, adminOnly, validate(categorySchema.partial()), updateCategory);
r.delete('/:id', protect, adminOnly, deleteCategory);
export default r;
