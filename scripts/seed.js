import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import { requireEnv } from '../config/env.js';
import { UPLOAD_DIR, publicBase } from '../services/storage.js';
import slugify from '../utils/slugify.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const CATEGORIES = [
  ['Pattu Sarees', 'Handwoven pattu sarees with rich zari borders'],
  ['Silk Sarees', 'Lustrous silk sarees for festive and everyday elegance'],
  ['Cotton Sarees', 'Breathable handloom cottons for daily wear'],
  ['Wedding Sarees', 'Bridal and wedding-season sarees'],
  ['Designer Sarees', 'Contemporary designer drapes'],
];
// name, category, fabric, colour, price (INR), stock, featured, swatch
const PRODUCTS = [
  ['Kanchipuram Pattu Saree Maroon', 'Pattu Sarees', 'Kanchipuram Silk', 'Maroon', 18500, 6, true, '#7B2D3B'],
  ['Pochampally Ikat Pattu Saree Teal', 'Pattu Sarees', 'Pattu Silk', 'Teal', 9800, 8, false, '#2F6B6B'],
  ['Mysore Silk Saree Sage Green', 'Silk Sarees', 'Mysore Silk', 'Sage Green', 7200, 10, true, '#65745D'],
  ['Banarasi Silk Saree Ivory', 'Silk Sarees', 'Banarasi Silk', 'Ivory', 12400, 5, false, '#D9CCB0'],
  ['Handloom Cotton Saree Indigo', 'Cotton Sarees', 'Handloom Cotton', 'Indigo', 2400, 20, true, '#34406B'],
  ['Kota Doria Cotton Saree Mustard', 'Cotton Sarees', 'Kota Doria Cotton', 'Mustard', 3100, 15, false, '#C79A2E'],
  ['Bridal Kanchipuram Saree Red', 'Wedding Sarees', 'Kanchipuram Silk', 'Red', 32500, 3, true, '#A3202E'],
  ['Wedding Banarasi Saree Peach', 'Wedding Sarees', 'Banarasi Silk', 'Peach', 21500, 4, false, '#E3A58D'],
  ['Designer Organza Saree Dusty Rose', 'Designer Sarees', 'Organza', 'Dusty Rose', 8900, 7, true, '#C98B91'],
  ['Designer Georgette Saree Midnight Blue', 'Designer Sarees', 'Georgette', 'Midnight Blue', 6400, 9, false, '#1F2A44'],
];
const SPECS = [
  { label: 'Saree length', value: '5.5 m' },
  { label: 'Blouse piece', value: 'Included' },
  { label: 'Care', value: 'Dry clean recommended' },
];

// Sample artwork only (SVG). Replace with real photos from the admin panel.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const placeholder = (name, hex, v) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hex}"/><stop offset="1" stop-color="#3B3029" stop-opacity="${v ? 0.6 : 0.25}"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><rect x="40" y="${v ? 880 : 40}" width="720" height="70" fill="#B69A72"/><text x="400" y="500" font-family="Georgia,serif" font-size="34" fill="#FAF8F4" text-anchor="middle">${esc(name)}</text><text x="400" y="550" font-family="Georgia,serif" font-size="22" fill="#FAF8F4" text-anchor="middle" opacity="0.8">Sample image ${v + 1}</text></svg>`;

requireEnv();
await connectDB();
await fs.mkdir(UPLOAD_DIR, { recursive: true });

const { ADMIN_NAME = 'Store Admin', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({ name: ADMIN_NAME, email, password: ADMIN_PASSWORD, role: 'admin' });
    console.log(`Admin created: ${email}`);
  } else if (existing.role !== 'admin') {
    existing.role = 'admin';
    await existing.save();
    console.log(`Existing user promoted to admin: ${email}`);
  } else console.log(`Admin already exists: ${email}`);
} else console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set - skipped admin creation');

const cats = {};
for (const [name, description] of CATEGORIES) cats[name] = (await Category.findOne({ name })) || (await Category.create({ name, description }));

let added = 0;
for (const [name, cat, fabric, color, price, stock, featured, hex] of PRODUCTS) {
  if (await Product.exists({ name })) continue;
  const images = [];
  for (const v of [0, 1]) {
    const key = `seed-${slugify(name)}-${v + 1}.svg`;
    await fs.writeFile(path.join(UPLOAD_DIR, key), placeholder(name, hex, v));
    images.push({ url: `${publicBase()}/uploads/${key}`, key });
  }
  await Product.create({
    name, category: cats[cat]._id, fabric, color, price, stock, featured, images, specifications: SPECS,
    description: `Sample listing: ${name} in ${fabric.toLowerCase()}, ${color.toLowerCase()}. Edit this description from the admin dashboard.`,
  });
  added++;
}
console.log(`Seed complete: ${added} sample products added`);
await mongoose.disconnect();
