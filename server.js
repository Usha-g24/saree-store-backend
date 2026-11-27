import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { requireEnv } from './config/env.js';

try {
  requireEnv();
  await connectDB();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
