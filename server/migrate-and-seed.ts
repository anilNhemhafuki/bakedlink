
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import bcrypt from "bcrypt";
import { users } from "../shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

async function migrateAndSeed() {
  try {
    console.log("🔄 Running database migrations...");
    
    // Run migrations
    await migrate(db, { migrationsFolder: "./migrations" });
    console.log("✅ Database migrations completed");

    // Create test users
    console.log("👤 Creating test users...");
    
    const testUsers = [
      {
        id: `user_${Date.now()}_1`,
        email: "admin@bakesewa.com",
        password: await bcrypt.hash("admin123", 10),
        firstName: "Admin",
        lastName: "User",
        role: "admin"
      },
      {
        id: `user_${Date.now()}_2`,
        email: "superadmin@bakesewa.com",
        password: await bcrypt.hash("superadmin123", 10),
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin"
      },
      {
        id: `user_${Date.now()}_3`,
        email: "manager@bakesewa.com",
        password: await bcrypt.hash("manager123", 10),
        firstName: "Manager",
        lastName: "User",
        role: "manager"
      },
      {
        id: `user_${Date.now()}_4`,
        email: "staff@bakesewa.com",
        password: await bcrypt.hash("staff123", 10),
        firstName: "Staff",
        lastName: "User",
        role: "staff"
      }
    ];

    // Insert users
    await db.insert(users).values(testUsers).onConflictDoNothing();
    
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
    console.error("❌ Migration and seeding failed:", error);
    throw error;
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
