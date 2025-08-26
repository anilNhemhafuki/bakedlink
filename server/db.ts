import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL not found. Make sure the database is provisioned and environment variable is set",
  );
}

console.log('🔌 Connecting to database...');

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
    console.warn("⚠️ Database connection failed:", error.message);
    return false;
  }
}