import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
export const publicBase = () => process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;

// Every driver exposes save(file) -> { url, key } and remove(key).
// To move to S3: add an `s3` driver here (PutObject / DeleteObject), return the same
// shape, and set STORAGE_DRIVER=s3. Controllers only call `storage`.
const local = {
  async save(file) {
    const key = `${crypto.randomUUID()}${EXT[file.mimetype] || '.jpg'}`;
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, key), file.buffer);
    return { url: `${publicBase()}/uploads/${key}`, key };
  },
  async remove(key) {
    if (!key || key.includes('/') || key.includes('..')) return;
    await fs.unlink(path.join(UPLOAD_DIR, key)).catch(() => {});
  },
};

const drivers = { local };
const driver = () => {
  const d = drivers[process.env.STORAGE_DRIVER || 'local'];
  if (!d) throw new Error(`Unknown STORAGE_DRIVER "${process.env.STORAGE_DRIVER}"`);
  return d;
};

export const storage = { save: (file) => driver().save(file), remove: (key) => driver().remove(key) };
