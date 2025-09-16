import express from "express";
import fileUpload from "express-fileupload";
import { createServer } from "http";
import { setupVite, serveStatic } from "./vite";
import { setupAuth } from "./localAuth";
import { initializeDatabase } from "./init-db";
import router from "./routes";
import { initializeUnits } from "./init-units"; // Import initializeUnits
import { securityMonitor } from "./securityMonitor";
import { alertService } from "./alertService";

const app = express();

// Trust proxy for production
app.set("trust proxy", 1);

// Parse JSON bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// File upload middleware
app.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    useTempFiles: true,
    tempFileDir: "/tmp/",
    createParentPath: true,
  }),
);

async function startServer() {
  try {
    let dbConnected = false;
    let retryCount = 0;
    const maxRetries = 3;

    // Retry database connection
    while (!dbConnected && retryCount < maxRetries) {
      try {
        await initializeDatabase();
        dbConnected = true;
      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    if (!dbConnected) {
      console.error("❌ Database connection failed - starting in limited mode");
    }

    // Initialize default units only if database is connected
    if (dbConnected) {
      try {
        await initializeUnits();
        console.log("✅ Units initialized successfully");
      } catch (error) {
        console.warn("⚠️ Unit initialization failed:", (error as Error).message);
      }
    }

    // Initialize security monitoring
    if (dbConnected) {
      try {
        // Connect security monitor to alert service
        securityMonitor.onAlert(async (alert) => {
          await alertService.sendAlert(alert);
        });
        console.log("🛡️ Security monitoring initialized");
      } catch (error) {
        console.warn("⚠️ Security monitoring initialization failed:", (error as Error).message);
      }
    }

    // Setup authentication
    await setupAuth(app);

    // Register routes
    app.use('/api', router);
    const server = createServer(app);

    const port = parseInt(process.env.PORT || "5000");

    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server running on http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
