import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL not found. Make sure the database is provisioned and environment variable is set",
  );
}

console.log('🔌 Connecting to database...');

// Log database target for debugging (mask credentials)
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`📍 DB target: ${url.host}${url.pathname}`);
  } catch (e) {
    console.log('📍 DB target: [invalid URL format]');
  }
}

const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client);

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.warn("⚠️ Database connection failed:", error instanceof Error ? error.message : String(error));
    return false;
  }
}