const postgres = require("postgres");

const databaseUrl = process.env.DATABASE_URL;
const retryDelayMs = 2000;

if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

async function waitForPostgres() {
  for (;;) {
    const sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 1,
      connect_timeout: 2,
    });

    try {
      await sql.unsafe("select 1");
      await sql.end({ timeout: 1 });
      process.exit(0);
    } catch (error) {
      console.log("Waiting for postgres...");
      await sql.end({ timeout: 1 }).catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
}

void waitForPostgres();
