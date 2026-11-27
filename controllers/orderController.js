import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import HttpError from '../utils/HttpError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { shippingFor } from '../utils/pricing.js';
import { pageParams } from '../utils/paginate.js';
import { ORDER_STATUSES } from '../utils/constants.js';

const restock = (items) =>
  Promise.all(items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity, sold: -i.quantity } })));

// Creates the order from the server-side cart. Prices/names come from the database, never the client.
// Payment is Cash on Delivery: payment.status stays "pending" - nothing is ever marked paid here.
export const createOrder = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  const lines = (cart?.items || []).filter((i) => i.product);
  if (!lines.length) throw new HttpError(400, 'Your cart is empty');
  const items = lines.map(({ product: p, quantity }) => ({ product: p._id, name: p.name, price: p.price, image: p.images[0]?.url, quantity }));

  const reserved = [];
  let order;
  try {
    for (const it of items) {
      const r = await Product.updateOne({ _id: it.product, stock: { $gte: it.quantity } }, { $inc: { stock: -it.quantity, sold: it.quantity } });
      if (!r.modifiedCount) throw new HttpError(409, `"${it.name}" does not have enough stock`);
      reserved.push(it);
    }
    const itemsPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingPrice = shippingFor(itemsPrice);
    order = await Order.create({
      user: req.user._id, items, shippingAddress: req.body.shippingAddress,
      payment: { method: 'cod', status: 'pending' },
      itemsPrice, shippingPrice, totalPrice: itemsPrice + shippingPrice,
    });
  } catch (err) {
    await restock(reserved);
    throw err;
  }
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
  res.status(201).json({ success: true, order });
});

export const myOrders = asyncHandler(async (req, res) => {
  res.json({ success: true, orders: await Order.find({ user: req.user._id }).sort('-createdAt').lean() });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  const mine = order && order.user._id.equals(req.user._id);
  if (!order || (!mine && req.user.role !== 'admin')) throw new HttpError(404, 'Order not found');
  res.json({ success: true, order });
});

async function applyStatus(order, status) {
  if (status === order.status) return;
  if (['Delivered', 'Cancelled'].includes(order.status)) throw new HttpError(409, `Order is already ${order.status.toLowerCase()}`);
  if (status === 'Cancelled') await restock(order.items);
  if (status === 'Delivered') order.deliveredAt = new Date();
  order.status = status;
}

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new HttpError(404, 'Order not found');
  if (!['Pending', 'Confirmed'].includes(order.status)) throw new HttpError(409, 'This order can no longer be cancelled');
  await applyStatus(order, 'Cancelled');
  await order.save();
  res.json({ success: true, order });
});

export const adminListOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 20, 100);
  const filter = ORDER_STATUSES.includes(req.query.status) ? { status: req.query.status } : {};
  const [orders, total] = await Promise.all([
    Order.find(filter).sort('-createdAt').skip(skip).limit(limit).populate('user', 'name email phone').lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, orders, page, pages: Math.ceil(total / limit), total });
});

export const adminUpdateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new HttpError(404, 'Order not found');
  const { status, paymentStatus } = req.body;
  if (status) await applyStatus(order, status);
  if (paymentStatus) order.payment.status = paymentStatus; // set explicitly by an admin, e.g. after cash is collected
  await order.save();
  res.json({ success: true, order });
});
