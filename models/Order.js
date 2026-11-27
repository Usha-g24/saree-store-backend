import mongoose from 'mongoose';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../utils/constants.js';

const str = { type: String, required: true, trim: true };
const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: str,
    price: { type: Number, required: true, min: 0 },
    image: String,
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [itemSchema], // price/name snapshot at purchase time
    shippingAddress: { fullName: str, phone: str, line1: str, line2: { type: String, trim: true }, city: str, state: str, pincode: str },
    payment: {
      method: { type: String, enum: ['cod', 'razorpay'], default: 'cod' },
      status: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
      razorpayOrderId: String, // reserved for the Razorpay integration
      razorpayPaymentId: String,
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'Pending', index: true },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    deliveredAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
