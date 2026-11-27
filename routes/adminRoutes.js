import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { orderStatusSchema } from '../utils/schemas.js';
import { stats, listCustomers, inventory } from '../controllers/adminController.js';
import { adminListOrders, adminUpdateOrder } from '../controllers/orderController.js';

const r = Router();
r.use(protect, adminOnly);
r.get('/stats', stats);
r.get('/customers', listCustomers);
r.get('/inventory', inventory);
r.get('/orders', adminListOrders);
r.put('/orders/:id', validate(orderStatusSchema), adminUpdateOrder);
export default r;
