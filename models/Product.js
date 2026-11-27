import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({ url: { type: String, required: true }, key: { type: String, required: true } }, { _id: false });

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    fabric: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    images: { type: [imageSchema], default: [] },
    stock: { type: Number, required: true, min: 0, default: 0 },
    featured: { type: Boolean, default: false },
    sold: { type: Number, default: 0, min: 0 },
    specifications: [{ _id: false, label: String, value: String }],
  },
  { timestamps: true } // createdAt = created date
);
productSchema.index({ createdAt: -1 });

export default mongoose.model('Product', productSchema);
