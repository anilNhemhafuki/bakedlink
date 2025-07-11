import { db } from "./db.js";
import { storage } from "./lib/storage.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is required. Please create a PostgreSQL database in Replit.",
  );
}

export async function initializeDatabase() {
  try {
    console.log("🔄 Initializing database...");

    // Ensure default users exist
    console.log("🔄 Ensuring default users exist...");
    await storage.ensureDefaultAdmin();

    // Initialize permissions
    console.log("🔄 Initializing permissions...");
    await storage.initializeDefaultPermissions();
    console.log("✅ Default users created");

    console.log("📝 Default login credentials:");
    console.log("   Super Admin: superadmin@sweetreats.com / superadmin123");
    console.log("   Admin: admin@sweetreats.com / admin123");
    console.log("   Manager: manager@sweetreats.com / manager123");
    console.log("   Staff: staff@sweetreats.com / staff123");

    console.log("✅ Database initialization completed");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase().catch(console.error);
}