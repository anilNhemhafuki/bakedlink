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
    resave: true,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for development
      maxAge: sessionTtl,
      sameSite: 'lax'
    },
    name: 'bakery.sid'
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
      passwordField: 'password',
      passReqToCallback: true
    }, async (req, email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          // Log failed login attempt
          const clientIP = (Array.isArray(req.headers['x-forwarded-for']) 
                          ? req.headers['x-forwarded-for'][0] 
                          : req.headers['x-forwarded-for']?.split(',')[0]) ||
                          req.headers['x-real-ip'] ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          '127.0.0.1';
          const userAgent = req.get('User-Agent') || '';
          const location = clientIP === '127.0.0.1' || clientIP === '::1' ||
                          clientIP.startsWith('192.168.') || clientIP.startsWith('10.') ||
                          clientIP.startsWith('172.') ? 'Local Network' : 'External';

          await logLoginAttempt('unknown', email, clientIP, userAgent, 'failed', location);

          console.warn('🚨 Failed Login Attempt:', {
            email,
            ip: clientIP,
            userAgent: userAgent,
            timestamp: new Date().toISOString(),
          });

          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.password) {
          // Log failed login attempt
          const clientIP = (Array.isArray(req.headers['x-forwarded-for']) 
                          ? req.headers['x-forwarded-for'][0] 
                          : req.headers['x-forwarded-for']?.split(',')[0]) ||
                          req.headers['x-real-ip'] ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          '127.0.0.1';
          const userAgent = req.get('User-Agent') || '';
          const location = clientIP === '127.0.0.1' || clientIP === '::1' ||
                          clientIP.startsWith('192.168.') || clientIP.startsWith('10.') ||
                          clientIP.startsWith('172.') ? 'Local Network' : 'External';

          await logLoginAttempt(user.id, email, clientIP, userAgent, 'failed', location);

          console.warn('🚨 Failed Login Attempt:', {
            email,
            ip: clientIP,
            userAgent: userAgent,
            timestamp: new Date().toISOString(),
          });

          return done(null, false, { message: 'Invalid email or password' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          // Log failed login attempt
          const clientIP = (Array.isArray(req.headers['x-forwarded-for']) 
                          ? req.headers['x-forwarded-for'][0] 
                          : req.headers['x-forwarded-for']?.split(',')[0]) ||
                          req.headers['x-real-ip'] ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          '127.0.0.1';
          const userAgent = req.get('User-Agent') || '';
          const location = clientIP === '127.0.0.1' || clientIP === '::1' ||
                          clientIP.startsWith('192.168.') || clientIP.startsWith('10.') ||
                          clientIP.startsWith('172.') ? 'Local Network' : 'External';

          await logLoginAttempt(user.id, email, clientIP, userAgent, 'failed', location);

          console.warn('🚨 Failed Login Attempt:', {
            email,
            ip: clientIP,
            userAgent: userAgent,
            timestamp: new Date().toISOString(),
          });

          return done(null, false, { message: 'Invalid email or password' });
        }

        // Enhanced login logging with geolocation and device tracking
        try {
          const clientIP = (Array.isArray(req.headers['x-forwarded-for']) 
                          ? req.headers['x-forwarded-for'][0] 
                          : req.headers['x-forwarded-for']?.split(',')[0]) ||
                          req.headers['x-real-ip'] ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          '127.0.0.1';

          // Enhanced device detection
          const userAgent = req.get('User-Agent') || '';

          // Basic geolocation (in production, use proper IP geolocation service)
          const location = clientIP === '127.0.0.1' || clientIP === '::1' ||
                          clientIP.startsWith('192.168.') || clientIP.startsWith('10.') ||
                          clientIP.startsWith('172.') ? 'Local Network' : 'External';

          await logLoginAttempt(user?.id || 'unknown', email, clientIP, userAgent, user ? 'success' : 'failed', location);

          // Log security events for failed attempts
          if (!user) {
            console.warn('🚨 Failed Login Attempt:', {
              email,
              ip: clientIP,
              userAgent: userAgent,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (logError) {
          console.error('Failed to log login attempt:', logError);
        }
        return done(null, user);
      } catch (error) {
        console.error('❌ Login error:', error);
        return done(error);
      }
    }));

    // Serialize user for session
    passport.serializeUser((user: any, done) => {
      console.log('Serializing user:', user.id);
      done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id: string, done) => {
      try {
        console.log('Deserializing user ID:', id);
        const user = await storage.getUserById(id);
        if (user) {
          console.log('User found:', user.email);
          done(null, user);
        } else {
          console.log('User not found for ID:', id);
          done(null, false);
        }
      } catch (error) {
        console.error('Deserialization error:', error);
        done(error);
      }
    });

    // Login route
    app.post("/api/auth/login", (req, res, next) => {
        console.log('Login attempt for:', req.body.email);
        
        passport.authenticate('local', (err: any, user: any, info: any) => {
          if (err) {
            console.error('Authentication error:', err);
            return res.status(500).json({ message: 'Authentication failed' });
          }
          
          if (!user) {
            console.log('Authentication failed:', info?.message);
            return res.status(401).json({ message: info?.message || 'Invalid credentials' });
          }

          // Log the user in
          req.logIn(user, (err) => {
            if (err) {
              console.error('Login error:', err);
              return res.status(500).json({ message: 'Login failed' });
            }

            console.log('User logged in successfully:', user.email);
            
            // Set session data
            (req.session as any).userId = user.id;
            (req.session as any).user = user;
            
            // Save session explicitly
            req.session.save((err) => {
              if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ message: 'Session creation failed' });
              }
              
              console.log('Session saved successfully for user:', user.email);
              
              // Return user data (excluding password)
              const { password: _, ...userWithoutPassword } = user;
              res.json({ user: userWithoutPassword });
            });
          });
        })(req, res, next);
      });

    // Logout route
    app.post("/api/auth/logout", async (req, res) => {
        const user = req.user;
        const clientIP = req.headers['x-forwarded-for']?.toString().split(',')[0] ||
                        req.headers['x-real-ip']?.toString() ||
                        req.connection.remoteAddress ||
                        req.socket.remoteAddress ||
                        '127.0.0.1';

        try {
          // Log logout before destroying session
          if (user) {
            await storage.logLogout((user as any).id, (user as any).email, `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim(), clientIP);
          }

          req.logout((err) => {
            if (err) {
              console.error("Logout error:", err);
              return res.status(500).json({ message: "Logout failed" });
            }
            
            req.session.destroy((err) => {
              if (err) {
                console.error("Session destroy error:", err);
                return res.status(500).json({ message: "Logout failed" });
              }
              
              res.clearCookie('connect.sid');
              res.json({ message: "Logged out successfully" });
            });
          });
        } catch (error) {
          console.error("Logout error:", error);
          res.status(500).json({ message: "Logout failed" });
        }
      });

  } catch (error) {
    console.error("❌ Authentication setup failed:", error);
    throw error;
  }
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  console.log('Checking authentication:', {
    isAuthenticated: req.isAuthenticated(),
    sessionID: req.sessionID,
    userId: (req.session as any)?.userId,
    user: req.user ? 'present' : 'absent'
  });
  
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  
  console.log('Authentication failed - redirecting to login');
  res.status(401).json({ message: 'Authentication required' });
};