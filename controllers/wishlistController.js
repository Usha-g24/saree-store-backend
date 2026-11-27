import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import HttpError from '../utils/HttpError.js';
import asyncHandler from '../utils/asyncHandler.js';

const load = async (userId) => (await Wishlist.findOne({ user: userId })) || new Wishlist({ user: userId, products: [] });
const respond = async (res, wishlist) => {
  await wishlist.populate('products', 'name price images stock fabric color');
  res.json({ success: true, products: wishlist.products });
};

export const getWishlist = asyncHandler(async (req, res) => respond(res, await load(req.user._id)));

export const addToWishlist = asyncHandler(async (req, res) => {
  if (!(await Product.exists({ _id: req.params.productId }))) throw new HttpError(404, 'Product not found');
  const wishlist = await load(req.user._id);
  if (!wishlist.products.some((p) => p.equals(req.params.productId))) wishlist.products.push(req.params.productId);
  await wishlist.save();
  await respond(res, wishlist);
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await load(req.user._id);
  wishlist.products = wishlist.products.filter((p) => !p.equals(req.params.productId));
  await wishlist.save();
  await respond(res, wishlist);
});
