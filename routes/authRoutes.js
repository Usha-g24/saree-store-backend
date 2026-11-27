import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, forgotSchema, resetSchema, profileSchema } from '../utils/schemas.js';
import { register, login, me, updateMe, forgotPassword, resetPassword } from '../controllers/authController.js';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});
const r = Router();
r.post('/register', limiter, validate(registerSchema), register);
r.post('/login', limiter, validate(loginSchema), login);
r.post('/forgot-password', limiter, validate(forgotSchema), forgotPassword);
r.post('/reset-password/:token', limiter, validate(resetSchema), resetPassword);
r.route('/me').get(protect, me).put(protect, validate(profileSchema), updateMe);
export default r;
