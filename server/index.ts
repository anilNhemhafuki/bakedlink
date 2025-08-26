import express from "express";
import fileUpload from "express-fileupload";
import { createServer } from "http";
import { setupVite, serveStatic } from "./vite";
import { setupAuth } from "./localAuth";
import { initializeDatabase } from "./init-db";
import { registerRoutes } from "./routes";
import { initializeUnits } from "./init-units"; // Import initializeUnits

const app = express();

// Trust proxy for production
app.set('trust proxy', 1);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // File upload middleware
  app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    useTempFiles: true,
    tempFileDir: '/tmp/',
    createParentPath: true
  }));

async function startServer() {
  try {
    console.log("🚀 Starting server...");

    // Initialize database (with graceful fallback)
    await initializeDatabase();

    // Initialize default units (gracefully handle DB failures)
    try {
      await initializeUnits();
    } catch (error) {
      console.warn("⚠️ Unit initialization failed, continuing without units:", error.message);
    }

    // Setup authentication
    await setupAuth(app);

    // Register routes
    const server = await registerRoutes(app);

    const port = parseInt(process.env.PORT || "5000");

    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server running on http://0.0.0.0:${port}`);
      console.log(`📝 Default login credentials:`);
      console.log(`   Admin: admin@bakery.com / password123`);
      console.log(`   Manager: manager@bakery.com / password123`);
      console.log(`   Staff: staff@bakery.com / password123`);

      console.log(`\n🔍 To fix database issues:`);
      console.log(`   1. The Neon database endpoint is disabled`);
      console.log(`   2. Enable it using the Neon API or create a new database`);
      console.log(`   3. Run: npm run db:push to sync schema`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    console.error("❌ This appears to be a database connectivity issue.");
    console.error("❌ Please check the DATABASE_URL and ensure the database is accessible.");
    process.exit(1);
  }
}

startServer();