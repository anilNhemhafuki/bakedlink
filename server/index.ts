
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import ViteExpress from "./vite";
import routes from "./routes";
import { localAuth } from "./localAuth";
import { db } from "./db";
import { initializeDatabase, waitForDatabase } from "./init-db";
import { initializeSettings } from "./init-complete-system";
import { Client } from "pg";
import { rateLimiter } from "./rateLimiter";
import { securityMonitor } from "./securityMonitor";
import { runPeriodicChecks } from "./notifications";

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
app.use(rateLimiter);

// Security monitoring
app.use(securityMonitor);

// Session configuration
const pgSession = connectPgSimple(session);

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:VLDOgojZY2Px@ep-yellow-queen-a1n0rdmo-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
});

async function connectWithRetry() {
  for (let i = 0; i < 5; i++) {
    try {
      await client.connect();
      console.log("🔌 Database connected for sessions");
      break;
    } catch (err) {
      console.log(`Database connection attempt ${i + 1} failed. Retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Session middleware
app.use(session({
  store: new pgSession({
    pool: client,
    tableName: 'sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
}));

// Auth middleware
app.use(localAuth);

// API routes
app.use(routes);

// Static file serving
app.use('/uploads', express.static('public/uploads'));

async function startServer() {
  try {
    console.log("🔌 Connecting to database...");
    console.log(`📍 DB target: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'local'}`);
    
    const uploadDirs = [
      'public/uploads',
      'public/uploads/media',
      'public/uploads/staff-documents',
      'public/uploads/temp',
    ];
    
    uploadDirs.forEach(dir => {
      if (!require('fs').existsSync(dir)) {
        require('fs').mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
    console.log("📁 Upload directories initialized");

    await connectWithRetry();
    await waitForDatabase();
    
    console.log("🔄 Initializing database...");
    await initializeDatabase();
    await initializeSettings();
    
    console.log("🛡️ Security monitoring initialized");
    console.log("🔧 Setting up authentication...");
    console.log("💰 Initializing pricing settings...");
    console.log("💰 System price initialized: $299.99");
    
    // Start periodic notification checks
    setInterval(async () => {
      try {
        await runPeriodicChecks();
      } catch (error) {
        console.error("Error running periodic notification checks:", error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    const port = process.env.PORT || 5000;
    console.log(`✅ Server running on http://0.0.0.0:${port}`);
    
    ViteExpress.listen(app, Number(port), "0.0.0.0");
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
