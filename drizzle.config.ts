import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/infrastructure/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://gungnir:gungnir@localhost:5432/gungnir',
  },
} satisfies Config;
