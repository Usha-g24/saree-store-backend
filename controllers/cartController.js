import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import HttpError from '../utils/HttpError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { shippingFor } from '../utils/pricing.js';

const load = async (userId) => (await Cart.findOne({ user: userId })) || new Cart({ user: userId, items: [] });

const respond = async (res, cart) => {
  await cart.populate('items.product', 'name price images stock');
  const items = cart.items.filter((i) => i.product);
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const shipping = shippingFor(subtotal);
  res.json({ success: true, cart: { items, itemCount: items.reduce((n, i) => n + i.quantity, 0), subtotal, shipping, total: subtotal + shipping } });
};

const checkStock = async (productId, qty) => {
  const product = await Product.findById(productId);
  if (!product) throw new HttpError(404, 'Product not found');
  if (product.stock < 1) throw new HttpError(400, 'This saree is out of stock');
  if (qty > product.stock) throw new HttpError(400, `Only ${product.stock} left in stock`);
};

export const getCart = asyncHandler(async (req, res) => respond(res, await load(req.user._id)));

export const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const cart = await load(req.user._id);
  const line = cart.items.find((i) => i.product.equals(productId));
  const qty = (line?.quantity || 0) + quantity;
  await checkStock(productId, qty);
  if (line) line.quantity = qty;
  else cart.items.push({ product: productId, quantity: qty });
  await cart.save();
  await respond(res, cart);
});

export const updateItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  const cart = await load(req.user._id);
  const line = cart.items.find((i) => i.product.equals(productId));
  if (!line) throw new HttpError(404, 'Item is not in your cart');
  if (quantity === 0) {
    cart.items = cart.items.filter((i) => !i.product.equals(productId));
  } else {
    await checkStock(productId, quantity);
    line.quantity = quantity;
  }
  await cart.save();
  await respond(res, cart);
});

export const removeItem = asyncHandler(async (req, res) => {
  const cart = await load(req.user._id);
  cart.items = cart.items.filter((i) => !i.product.equals(req.params.productId));
  await cart.save();
  await respond(res, cart);
});

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await load(req.user._id);
  cart.items = [];
  await cart.save();
  await respond(res, cart);
});
