import Category from '../models/Category.js';
import Product from '../models/Product.js';
import HttpError from '../utils/HttpError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listCategories = asyncHandler(async (_req, res) => {
  const [categories, counts] = await Promise.all([
    Category.find().sort('name').lean(),
    Product.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json({ success: true, categories: categories.map((c) => ({ ...c, productCount: byId.get(String(c._id)) || 0 })) });
});

export const createCategory = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, category: await Category.create(req.body) });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new HttpError(404, 'Category not found');
  Object.assign(category, req.body);
  await category.save();
  res.json({ success: true, category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  if (await Product.exists({ category: req.params.id })) throw new HttpError(409, 'Move or delete this category\'s products first');
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new HttpError(404, 'Category not found');
  res.json({ success: true, message: 'Category deleted' });
});
