import type { drizzle } from 'drizzle-orm/postgres-js';
import type * as schema from './schema';

export type AppDb = ReturnType<typeof drizzle<typeof schema>>;
