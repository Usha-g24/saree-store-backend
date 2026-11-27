import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_STATUSES } from './constants.js';

const str = (min = 1, max = 200) => z.string().trim().min(min).max(max);
const email = z.string().trim().toLowerCase().email();
const password = z.string().min(8, 'Password must be at least 8 characters').max(72);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const phone = z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, 'Enter a valid phone number');
const parseJson = (v) => {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
};
// multipart bodies arrive as strings
const bool = z.preprocess((v) => (v === undefined ? undefined : v === true || v === 'true'), z.boolean());

export const address = z.object({
  fullName: str(), phone, line1: str(), line2: z.string().trim().max(200).optional(),
  city: str(), state: str(), pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

export const registerSchema = z.object({ name: str(2, 80), email, password });
export const loginSchema = z.object({ email, password: z.string().min(1) });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ password });
export const profileSchema = z.object({ name: str(2, 80).optional(), phone: phone.optional(), addresses: z.array(address).max(5).optional() });

export const categorySchema = z.object({ name: str(2, 60), description: z.string().trim().max(500).optional(), image: z.string().trim().optional() });

const productBase = z.object({
  name: str(2, 150), description: str(1, 5000), price: z.coerce.number().positive(), category: objectId,
  fabric: str(), color: str(), stock: z.coerce.number().int().min(0), featured: bool.optional(),
  specifications: z.preprocess(parseJson, z.array(z.object({ label: str(), value: str() })).max(20)).optional(),
});
export const productSchema = productBase;
export const productUpdateSchema = productBase
  .extend({ removeImages: z.preprocess((v) => { const p = parseJson(v); return typeof p === 'string' ? [p] : p; }, z.array(z.string())) })
  .partial();
export const stockSchema = z.object({ stock: z.coerce.number().int().min(0) });

export const cartAddSchema = z.object({ productId: objectId, quantity: z.coerce.number().int().min(1).max(10).default(1) });
export const cartUpdateSchema = z.object({ quantity: z.coerce.number().int().min(0).max(10) });
export const orderSchema = z.object({ shippingAddress: address, paymentMethod: z.literal('cod').default('cod') });
export const orderStatusSchema = z
  .object({ status: z.enum(ORDER_STATUSES).optional(), paymentStatus: z.enum(PAYMENT_STATUSES).optional() })
  .refine((d) => d.status || d.paymentStatus, 'Provide status or paymentStatus');
