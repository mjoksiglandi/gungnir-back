import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const client = postgres(process.env.DATABASE_URL ?? 'postgres://gungnir:gungnir@localhost:5432/gungnir', {
    max: 1,
    prepare: false,
  });

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

  await client.end();
}

void main();
