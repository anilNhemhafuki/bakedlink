import { testDatabaseConnection } from "./db.js";
import { storage } from "./lib/storage.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is required. Please create a PostgreSQL database in Replit.",
  );
}

export async function initializeDatabase() {
  try {
    console.log("🔄 Initializing database...");

    // Test database connection first
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.warn(
        "⚠️ Database connection failed. Running in offline mode with limited functionality.",
      );
      return;
    }

    // Only initialize if database is connected
    await storage.ensureDefaultAdmin();

    // Initialize permissions
    await storage.initializeDefaultPermissions();

    console.log("\n" + "=".repeat(60));
    console.log("🔑 SYSTEM LOGIN CREDENTIALS");
    console.log("=".repeat(60));
    console.log("📧 Super Admin: superadmin@bakersoft.com");
    console.log("🔐 Password: superadmin123");
    console.log("---");
    console.log("📧 Admin: admin@bakersoft.com");
    console.log("🔐 Password: admin123");
    console.log("---");
    console.log("📧 Manager: manager@bakersoft.com");
    console.log("🔐 Password: manager123");
    console.log("---");
    console.log("📧 Staff: staff@bakersoft.com");
    console.log("🔐 Password: staff123");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
  }
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().catch(console.error);
}
