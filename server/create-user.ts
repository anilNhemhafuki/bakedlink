
import { db } from "./db";
import { users } from "../shared/schema";
import bcrypt from "bcrypt";

async function createUser() {
  try {
    console.log("👤 Creating new user...");
    
    const userEmail = "test@bakersoft.com";
    const userPassword = "test123";
    const hashedPassword = await bcrypt.hash(userPassword, 10);
    
    const newUser = {
      id: `user_${Date.now()}`,
      email: userEmail,
      password: hashedPassword,
      firstName: "Test",
      lastName: "User",
      role: "admin"
    };

    await db.insert(users).values(newUser);
    
    console.log("\n✅ User created successfully!");
    console.log("\n=== LOGIN CREDENTIALS ===");
    console.log("Email:", userEmail);
    console.log("Password:", userPassword);
    console.log("Role: admin");
    console.log("=========================");
    console.log("\n🚀 You can now login with these credentials!");
    
  } catch (error) {
    console.error("❌ Error creating user:", error);
    
    if (error.message?.includes('relation "users" does not exist')) {
      console.log("\n💡 It looks like the database tables don't exist yet.");
      console.log("Please run the migration script first:");
      console.log("npx tsx server/migrate-and-seed.ts");
    }
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createUser().then(() => {
    console.log("Process completed");
    process.exit(0);
  }).catch((error) => {
    console.error("Process failed:", error);
    process.exit(1);
  });
}

export { createUser };
