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
    console.log("🔄 Ensuring default users exist...");
    await storage.ensureDefaultAdmin();

    // Initialize permissions
    await storage.initializeDefaultPermissions();
    console.log("📝 Default login credentials:");
    console.log("   Super Admin: superadmin@bakesewa.com / superadmin123");
    console.log("   Admin: admin@bakesewa.com / admin123");
    console.log("   Manager: manager@bakesewa.com / manager123");
    console.log("   Staff: staff@bakesewa.com / staff123");

  } catch (error) {
    console.error("❌ Database initialization failed:", error);
  }
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().catch(console.error);
}
