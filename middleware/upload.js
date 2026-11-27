import multer from 'multer';
import HttpError from '../utils/HttpError.js';

const allowed = ['image/jpeg', 'image/png', 'image/webp'];

// Files are kept in memory and handed to services/storage.js, which decides
// where they live (local disk now, S3 later). Routes never touch the disk.
export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) =>
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new HttpError(400, 'Only JPG, PNG or WEBP images are allowed')),
}).array('images', 8);
