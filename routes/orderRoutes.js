import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { orderSchema } from '../utils/schemas.js';
import { createOrder, myOrders, getOrder, cancelOrder } from '../controllers/orderController.js';

const r = Router();
r.use(protect);
r.post('/', validate(orderSchema), createOrder);
r.get('/mine', myOrders);
r.get('/:id', getOrder);
r.put('/:id/cancel', cancelOrder);
export default r;
