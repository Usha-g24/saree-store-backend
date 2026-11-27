export function requireEnv() {
  for (const key of ['MONGO_URI', 'JWT_SECRET']) {
    if (!process.env[key]) throw new Error(`Missing ${key}. Copy .env.example to .env and fill it in.`);
  }
}
