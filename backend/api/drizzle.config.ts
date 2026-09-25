import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/infrastructure/database/schema.ts',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://vitanarr:replace_me@localhost:5432/vitanarr',
  },
  strict: true,
  verbose: true,
});
