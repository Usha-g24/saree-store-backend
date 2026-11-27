import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import asyncHandler from '../utils/asyncHandler.js';
import { pageParams } from '../utils/paginate.js';

const LOW_STOCK = 5;

export const stats = asyncHandler(async (_req, res) => {
  const [sales, byStatus, customers, products, lowStock, recentOrders] = await Promise.all([
    Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, bookedSales: { $sum: '$totalPrice' }, deliveredSales: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, '$totalPrice', 0] } } } },
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments(),
    Product.find({ stock: { $lte: LOW_STOCK } }).select('name stock images').sort('stock').limit(10).lean(),
    Order.find().sort('-createdAt').limit(5).populate('user', 'name email').lean(),
  ]);
  const ordersByStatus = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  res.json({
    success: true,
    stats: {
      totalOrders: byStatus.reduce((n, s) => n + s.count, 0),
      ordersByStatus,
      bookedSales: sales[0]?.bookedSales || 0, // all non-cancelled orders
      deliveredSales: sales[0]?.deliveredSales || 0,
      totalCustomers: customers,
      totalProducts: products,
      lowStock,
      recentOrders,
    },
  });
});

export const listCustomers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 20, 100);
  const filter = { role: 'customer' };
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const totals = await Order.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) } } },
    { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: { $cond: [{ $ne: ['$status', 'Cancelled'] }, '$totalPrice', 0] } } } },
  ]);
  const byUser = new Map(totals.map((t) => [String(t._id), t]));
  const customers = users.map((u) => ({ ...u, orders: byUser.get(String(u._id))?.orders || 0, spent: byUser.get(String(u._id))?.spent || 0 }));
  res.json({ success: true, customers, page, pages: Math.ceil(total / limit), total });
});

// Stock overview, lowest stock first. Change stock with PATCH /api/products/:id/stock.
export const inventory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 50, 200);
  const [products, total] = await Promise.all([
    Product.find().select('name price stock sold images category').populate('category', 'name').sort({ stock: 1, name: 1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(),
  ]);
  res.json({ success: true, lowStockThreshold: LOW_STOCK, products, page, pages: Math.ceil(total / limit), total });
});
