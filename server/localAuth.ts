
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./lib/storage";
import bcrypt from "bcrypt";
import { db } from "./db";
import { loginLogs } from "../shared/schema";

// Utility function to log login attempts
async function logLoginAttempt(userId: string, email: string, ipAddress: string, userAgent: string | undefined, status: 'success' | 'failed', location?: string) {
  try {
    const deviceType = userAgent ? detectDeviceType(userAgent) : 'Unknown';
    
    await db.insert(loginLogs).values({
      userId,
      email,
      ipAddress,
      userAgent: userAgent || null,
      status,
      location: location || null,
      deviceType,
    });
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

// Simple device detection from user agent
function detectDeviceType(userAgent: string): string {
  if (userAgent.includes('Mobile')) return 'Mobile';
  if (userAgent.includes('Tablet')) return 'Tablet';
  if (userAgent.includes('Windows')) return 'Desktop - Windows';
  if (userAgent.includes('Mac')) return 'Desktop - Mac';
  if (userAgent.includes('Linux')) return 'Desktop - Linux';
  return 'Unknown';
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "bakery-management-secret-key-2024",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax'
    },
  });
}

export async function setupAuth(app: Express) {
  try {
    console.log("🔧 Setting up authentication...");
    
    app.use(getSession());
    app.use(passport.initialize());
    app.use(passport.session());

    // Configure local strategy
    passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      try {
        console.log('🔍 Attempting login for email:', email);
        
        const user = await storage.getUserByEmail(email);
        if (!user) {
          console.log('❌ User not found:', email);
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.password) {
          console.log('❌ User has no password set:', email);
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          console.log('❌ Invalid password for user:', email);
          return done(null, false, { message: 'Invalid email or password' });
        }

        console.log('✅ Login successful for user:', email);
        return done(null, user);
      } catch (error) {
        console.error('❌ Login error:', error);
        return done(error);
      }
    }));

    // Serialize user for session
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await storage.getUserById(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });

    // Login route
    app.post('/api/login', (req, res, next) => {
      console.log('🔐 Login attempt for:', req.body.email);
      const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
      const userAgent = req.get('User-Agent');
      
      passport.authenticate('local', async (err: any, user: any, info: any) => {
        if (err) {
          console.error('❌ Authentication error:', err);
          return res.status(500).json({ message: 'Authentication error' });
        }
        
        if (!user) {
          console.log('❌ Authentication failed:', info?.message);
          // Log failed login attempt
          await logLoginAttempt('unknown', req.body.email, ipAddress, userAgent, 'failed');
          return res.status(401).json({ message: info?.message || 'Invalid credentials' });
        }
        
        req.logIn(user, async (err) => {
          if (err) {
            console.error('❌ Login error:', err);
            await logLoginAttempt(user.id, user.email, ipAddress, userAgent, 'failed');
            return res.status(500).json({ message: 'Login error' });
          }
          
          console.log('✅ User logged in successfully:', user.email);
          // Log successful login
          await logLoginAttempt(user.id, user.email, ipAddress, userAgent, 'success');
          res.json({ user: { id: user.id, email: user.email, role: user.role } });
        });
      })(req, res, next);
    });

    // Logout route
    app.post('/api/logout', (req, res) => {
      req.logout((err) => {
        if (err) {
          console.error('❌ Logout error:', err);
          return res.status(500).json({ message: 'Logout error' });
        }
        res.json({ message: 'Logged out successfully' });
      });
    });

    console.log("✅ Authentication setup completed");
  } catch (error) {
    console.error("❌ Authentication setup failed:", error);
    throw error;
  }
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};
