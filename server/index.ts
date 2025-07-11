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

    // Initialize database
    await initializeDatabase();

    // Initialize default units
    await initializeUnits();

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
      console.log(`   Admin: admin@sweetreats.com / admin123`);
      console.log(`   Manager: manager@sweetreats.com / manager123`);
      console.log(`   Staff: staff@sweetreats.com / staff123`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();