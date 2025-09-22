import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import bcrypt from "bcrypt";
import { users } from "../shared/schema";
import { runMigrations } from "./db";
import { initializeCompleteSystem } from "./init-complete-system";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

async function migrateAndSeed() {
  try {
    console.log("🔄 Running database migrations...");
    await runMigrations();
    console.log("✅ Database migrations completed");

    console.log("👤 Initializing complete system...");
    await initializeCompleteSystem();
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAndSeed()
    .then(() => {
      console.log("✅ Process completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Process failed:", error);
      process.exit(1);
    });
}

export { migrateAndSeed };
