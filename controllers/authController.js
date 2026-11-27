import crypto from 'node:crypto';
import User from '../models/User.js';
import HttpError from '../utils/HttpError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signToken } from '../utils/token.js';

const send = (res, status, user) => res.status(status).json({ success: true, token: signToken(user), user });
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists');
  // Role is never read from the request: public sign-ups are always customers.
  send(res, 201, await User.create({ name, email, password }));
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password))) throw new HttpError(401, 'Invalid email or password');
  send(res, 200, user);
});

export const me = (req, res) => res.json({ success: true, user: req.user });

export const updateMe = asyncHandler(async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.json({ success: true, user: req.user });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hash(token);
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;
    // TODO: email this link (add services/mailer.js). No mail provider is configured yet,
    // so outside production it is printed to the server console only.
    if (process.env.NODE_ENV !== 'production') console.log(`[dev] password reset link for ${user.email}: ${link}`);
  }
  res.json({ success: true, message: 'If an account exists for that email, a reset link has been generated.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ resetPasswordToken: hash(req.params.token), resetPasswordExpires: { $gt: new Date() } });
  if (!user) throw new HttpError(400, 'Reset link is invalid or has expired');
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  send(res, 200, user);
});
