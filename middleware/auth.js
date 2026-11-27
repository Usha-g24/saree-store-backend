import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import HttpError from '../utils/HttpError.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Not authenticated');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
  // Role is always read from the database, never trusted from the token.
  const user = await User.findById(payload.id);
  if (!user) throw new HttpError(401, 'User no longer exists');
  req.user = user;
  next();
});

export const adminOnly = (req, _res, next) =>
  req.user?.role === 'admin' ? next() : next(new HttpError(403, 'Admin access required'));
