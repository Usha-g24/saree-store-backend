import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import HttpError from '../utils/HttpError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { pageParams } from '../utils/paginate.js';
import { storage } from '../services/storage.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTS = {
  newest: { createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 },
  name: { name: 1 }, bestselling: { sold: -1, createdAt: -1 },
};
const MAX_IMAGES = 8;
const saveFiles = (files = []) => Promise.all(files.map((f) => storage.save(f)));
const removeKeys = (keys = []) => Promise.all(keys.map((k) => storage.remove(k)));

// GET /api/products?search=&category=<slug|id>&fabric=&color=&minPrice=&maxPrice=&featured=true&inStock=true
//                  &sort=newest|price_asc|price_desc|name|bestselling&page=&limit=
// Home sections: featured -> ?featured=true, new arrivals -> ?sort=newest, best sellers -> ?sort=bestselling
export const listProducts = asyncHandler(async (req, res) => {
  const { search, category, fabric, color, featured, inStock, minPrice, maxPrice, sort } = req.query;
  const { page, limit, skip } = pageParams(req.query);
  const filter = {};
  if (search) {
    const rx = new RegExp(escapeRegex(String(search).slice(0, 60)), 'i');
    filter.$or = [{ name: rx }, { description: rx }, { fabric: rx }, { color: rx }];
  }
  if (category) {
    const c = String(category);
    const cat = /^[a-f\d]{24}$/i.test(c) ? await Category.findById(c) : await Category.findOne({ slug: c });
    filter.category = cat ? cat._id : null;
  }
  if (fabric) filter.fabric = new RegExp(`^${escapeRegex(String(fabric))}$`, 'i');
  if (color) filter.color = new RegExp(`^${escapeRegex(String(color))}$`, 'i');
  if (featured === 'true') filter.featured = true;
  if (inStock === 'true') filter.stock = { $gt: 0 };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort(SORTS[sort] || SORTS.newest).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ success: true, products, page, pages: Math.ceil(total / limit), total });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) throw new HttpError(404, 'Product not found');
  res.json({ success: true, product });
});

export const relatedProducts = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');
  const products = await Product.find({ category: product.category, _id: { $ne: product._id } }).sort('-createdAt').limit(4).lean();
  res.json({ success: true, products });
});

const ensureCategory = async (id) => {
  if (!(await Category.exists({ _id: id }))) throw new HttpError(400, 'Category does not exist');
};

export const createProduct = asyncHandler(async (req, res) => {
  await ensureCategory(req.body.category);
  if (!req.files?.length) throw new HttpError(400, 'At least one product image is required (field name: images)');
  const images = await saveFiles(req.files);
  try {
    const product = await Product.create({ ...req.body, images });
    res.status(201).json({ success: true, product });
  } catch (err) {
    await removeKeys(images.map((i) => i.key));
    throw err;
  }
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');
  const { removeImages = [], ...fields } = req.body;
  if (fields.category) await ensureCategory(fields.category);
  const kept = product.images.filter((i) => !removeImages.includes(i.key));
  if (kept.length + (req.files?.length || 0) > MAX_IMAGES) throw new HttpError(400, `A product can have at most ${MAX_IMAGES} images`);
  if (kept.length + (req.files?.length || 0) === 0) throw new HttpError(400, 'A product needs at least one image');
  const added = await saveFiles(req.files);
  product.set(fields);
  product.images = [...kept, ...added];
  try {
    await product.save();
  } catch (err) {
    await removeKeys(added.map((i) => i.key));
    throw err;
  }
  await removeKeys(removeImages);
  res.json({ success: true, product });
});

export const updateStock = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { stock: req.body.stock }, { new: true, runValidators: true });
  if (!product) throw new HttpError(404, 'Product not found');
  res.json({ success: true, product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');
  await Promise.all([
    Cart.updateMany({}, { $pull: { items: { product: product._id } } }),
    Wishlist.updateMany({}, { $pull: { products: product._id } }),
    removeKeys(product.images.map((i) => i.key)),
  ]);
  res.json({ success: true, message: 'Product deleted' });
});
