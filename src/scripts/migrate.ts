import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import 'dotenv/config';
import postgres from 'postgres';

const retryDelayMs = 2000;
const maxAttempts = 20;

function isRetryable(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { code?: string; errno?: number };
  return maybeError.code === '57P03'
    || maybeError.code === 'ECONNRESET'
    || maybeError.code === 'ECONNREFUSED'
    || maybeError.code === 'ETIMEDOUT';
}

async function runMigrations() {
  const client = postgres(process.env.DATABASE_URL ?? 'postgres://gungnir:gungnir@localhost:5432/gungnir', {
    max: 1,
    prepare: false,
  });

  try {
    const migrationsDir = path.join(process.cwd(), 'drizzle');
    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sqlText = await readFile(path.join(migrationsDir, file), 'utf8');
      if (sqlText.trim().length === 0) {
        continue;
      }
      await client.unsafe(sqlText);
      console.log(`Applied migration ${file}`);
    }
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await runMigrations();
      return;
    } catch (error) {
      if (!isRetryable(error) || attempt === maxAttempts) {
        throw error;
      }

      console.log(`Postgres not ready for migrations yet (attempt ${attempt}/${maxAttempts}). Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
}

void main();
