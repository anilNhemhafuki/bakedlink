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
    console.log("🚀 Starting bakery management server...");
    
    let dbConnected = false;
    let retryCount = 0;
    const maxRetries = 3;

    // Retry database connection
    while (!dbConnected && retryCount < maxRetries) {
      try {
        await initializeDatabase();
        dbConnected = true;
        console.log("✅ Database connected successfully");
      } catch (error) {
        retryCount++;
        console.error(`❌ Database connection attempt ${retryCount} failed:`, (error as Error).message);
        
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying database connection in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    if (!dbConnected) {
      console.error("❌ Failed to connect to database after maximum retries");
      console.error("❌ Server starting in limited mode without database features");
    }

    // Initialize default units only if database is connected
    if (dbConnected) {
      try {
        await initializeUnits();
        console.log("✅ Units initialized successfully");
      } catch (error) {
        console.warn("⚠️ Unit initialization failed, continuing without default units:", (error as Error).message);
      }
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
      console.log(`   Admin: admin@bakesewa.com / admin123`);
      console.log(`   Manager: manager@bakesewa.com / manager123`);
      console.log(`   Staff: staff@bakesewa.com / staff123`);

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