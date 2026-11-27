import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { cartAddSchema, cartUpdateSchema } from '../utils/schemas.js';
import { getCart, addItem, updateItem, removeItem, clearCart } from '../controllers/cartController.js';

const r = Router();
r.use(protect);
r.get('/', getCart);
r.post('/', validate(cartAddSchema), addItem);
r.delete('/', clearCart);
r.put('/:productId', validate(cartUpdateSchema), updateItem);
r.delete('/:productId', removeItem);
export default r;
