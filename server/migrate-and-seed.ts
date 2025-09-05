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

    console.log("\n🎉 Database setup completed!");
    console.log("\n=== LOGIN CREDENTIALS ===");
    console.log("You can use any of these accounts to login:");
    console.log("\n1. Super Admin Account:");
    console.log("   Email: superadmin@bakesewa.com");
    console.log("   Password: superadmin123");
    console.log("   Role: super_admin");

    console.log("\n2. Admin Account:");
    console.log("   Email: admin@bakesewa.com");
    console.log("   Password: admin123");
    console.log("   Role: admin");

    console.log("\n3. Manager Account:");
    console.log("   Email: manager@bakesewa.com");
    console.log("   Password: manager123");
    console.log("   Role: manager");

    console.log("\n4. Staff Account:");
    console.log("   Email: staff@bakesewa.com");
    console.log("   Password: staff123");
    console.log("   Role: staff");

    console.log("\n=========================");
    console.log("🚀 You can now start the application and login with any of the above credentials!");

  } catch (error) {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAndSeed().then(() => {
    console.log("✅ Process completed");
    process.exit(0);
  }).catch((error) => {
    console.error("❌ Process failed:", error);
    process.exit(1);
  });
}

export { migrateAndSeed };