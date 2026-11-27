import mongoose from 'mongoose';
import slugify from '../utils/slugify.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 60 },
    slug: { type: String, unique: true, index: true },
    description: { type: String, trim: true, maxlength: 500 },
    image: { type: String, trim: true },
  },
  { timestamps: true }
);
categorySchema.pre('validate', function () {
  if (this.isModified('name')) this.slug = slugify(this.name);
});

export default mongoose.model('Category', categorySchema);
