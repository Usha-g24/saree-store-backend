import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const str = { type: String, required: true, trim: true };
const addressSchema = new mongoose.Schema({
  fullName: str, phone: str, line1: str, line2: { type: String, trim: true }, city: str, state: str, pincode: str,
});

const userSchema = new mongoose.Schema(
  {
    name: { ...str, maxlength: 80 },
    email: { ...str, lowercase: true, unique: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    addresses: [addressSchema],
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password; delete ret.resetPasswordToken; delete ret.resetPasswordExpires; delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
