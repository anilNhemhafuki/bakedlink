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
      passwordField: 'password',
      passReqToCallback: true
    }, async (req, email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          // Log failed login attempt
          const clientIP = req.headers['x-forwarded-for']?.split(',')[0] ||
                          req.headers['x-real-ip'] ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          '127.0.0.1';
          const userAgent = req.get('User-Agent') || '';
          const deviceType = userAgent.includes('Mobile') ? 'mobile' :
                            userAgent.includes('Tablet') ? 'tablet' : 'desktop';
          const browser = userAgent.includes('Chrome') ? 'Chrome' :
                         userAgent.includes('Firefox') ? 'Firefox' :
                         userAgent.includes('Safari') ? 'Safari' :
                         userAgent.includes('Edge') ? 'Edge' : 'Other';
          const location = clientIP === '127.0.0.1' || clientIP === '::1' ||
                          clientIP.startsWith('192.168.') || clientIP.startsWith('10.') ||
                          clientIP.startsWith('172.') ? 'Local Network' : 'External';

          await storage.createLoginLog({
            userId: 'unknown',
            userEmail: email,
            loginTime: new Date(),
            ipAddress: clientIP,
            userAgent: userAgent,
            status: 'failed',
            failureReason: 'Invalid email or password',
            deviceType: deviceType,
            browser: browser,
            location: location,
            sessionId: req.sessionID || null,
            timestamp: new Date(),
          });

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
          const clientIPAddr = req.headers['x-forwarded-for']?.split(',')[0] ||
                          req.headers['x-real-ip'] ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          '127.0.0.1';
          const userAgent = req.get('User-Agent') || '';
          const deviceType = userAgent.includes('Mobile') ? 'mobile' :
                            userAgent.includes('Tablet') ? 'tablet' : 'desktop';
          const browser = userAgent.includes('Chrome') ? 'Chrome' :
                         userAgent.includes('Firefox') ? 'Firefox' :
                         userAgent.includes('Safari') ? 'Safari' :
                         userAgent.includes('Edge') ? 'Edge' : 'Other';
          const location = clientIP === '127.0.0.1' || clientIP === '::1' ||
                          clientIP.startsWith('192.168.') || clientIP.startsWith('10.') ||
                          clientIP.startsWith('172.') ? 'Local Network' : 'External';

          await storage.createLoginLog({
            userId: user.id,
            userEmail: email,
            loginTime: new Date(),
            ipAddress: clientIP,
            userAgent: userAgent,
            status: 'failed',
            failureReason: 'User has no password set',
            deviceType: deviceType,
            browser: browser,
            location: location,
            sessionId: req.sessionID || null,
            timestamp: new Date(),
          });

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
          const clientIPAddr = req.headers['x-forwarded-for']?.split(',')[0] ||
                          req.headers['x-real-ip'] ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          '127.0.0.1';
          const userAgent = req.get('User-Agent') || '';
          const deviceType = userAgent.includes('Mobile') ? 'mobile' :
                            userAgent.includes('Tablet') ? 'tablet' : 'desktop';
          const browser = userAgent.includes('Chrome') ? 'Chrome' :
                         userAgent.includes('Firefox') ? 'Firefox' :
                         userAgent.includes('Safari') ? 'Safari' :
                         userAgent.includes('Edge') ? 'Edge' : 'Other';
          const location = clientIP === '127.0.0.1' || clientIP === '::1' ||
                          clientIP.startsWith('192.168.') || clientIP.startsWith('10.') ||
                          clientIP.startsWith('172.') ? 'Local Network' : 'External';

          await storage.createLoginLog({
            userId: user.id,
            userEmail: email,
            loginTime: new Date(),
            ipAddress: clientIP,
            userAgent: userAgent,
            status: 'failed',
            failureReason: 'Invalid password',
            deviceType: deviceType,
            browser: browser,
            location: location,
            sessionId: req.sessionID || null,
            timestamp: new Date(),
          });

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
          const clientIP = req.headers['x-forwarded-for']?.split(',')[0] ||
                          req.headers['x-real-ip'] ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          '127.0.0.1';

          // Enhanced device detection
          const userAgent = req.get('User-Agent') || '';
          const deviceType = userAgent.includes('Mobile') ? 'mobile' :
                            userAgent.includes('Tablet') ? 'tablet' : 'desktop';

          const browser = userAgent.includes('Chrome') ? 'Chrome' :
                         userAgent.includes('Firefox') ? 'Firefox' :
                         userAgent.includes('Safari') ? 'Safari' :
                         userAgent.includes('Edge') ? 'Edge' : 'Other';

          // Basic geolocation (in production, use proper IP geolocation service)
          const location = clientIP === '127.0.0.1' || clientIP === '::1' ||
                          clientIP.startsWith('192.168.') || clientIP.startsWith('10.') ||
                          clientIP.startsWith('172.') ? 'Local Network' : 'External';

          const loginLogData = {
            userId: user?.id || 'unknown',
            userEmail: email,
            loginTime: new Date(),
            ipAddress: clientIP,
            userAgent: userAgent,
            status: user ? 'success' : 'failed',
            failureReason: user ? null : 'Invalid email or password',
            deviceType: deviceType,
            browser: browser,
            location: location,
            sessionId: req.sessionID || null,
            timestamp: new Date(),
          };

          await storage.createLoginLog(loginLogData);

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
    app.post("/api/auth/login", async (req, res) => {
        const clientIP = req.headers['x-forwarded-for']?.toString().split(',')[0] ||
                        req.headers['x-real-ip']?.toString() ||
                        req.connection.remoteAddress ||
                        req.socket.remoteAddress ||
                        '127.0.0.1';
        const userAgent = req.get('User-Agent') || 'Unknown';

        try {
          const { email, password } = req.body;

          if (!email || !password) {
            // Log failed login attempt - missing credentials
            await storage.logLogin('anonymous', email || 'unknown', 'Anonymous', clientIP, userAgent, false, 'Missing email or password');
            return res.status(400).json({ message: "Email and password are required" });
          }

          const user = await storage.getUserByEmail(email);
          if (!user) {
            // Log failed login attempt - user not found
            await storage.logLogin('unknown', email, 'Unknown User', clientIP, userAgent, false, 'User not found');
            return res.status(401).json({ message: "Invalid credentials" });
          }

          const isValidPassword = await bcrypt.compare(password, user.password || "");
          if (!isValidPassword) {
            // Log failed login attempt - invalid password
            await storage.logLogin(user.id, user.email, `${user.firstName || ''} ${user.lastName || ''}`.trim(), clientIP, userAgent, false, 'Invalid password');
            return res.status(401).json({ message: "Invalid credentials" });
          }

          // Create session
          req.session.userId = user.id;
          req.session.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          };

          // Log successful login
          await storage.logLogin(user.id, user.email, `${user.firstName || ''} ${user.lastName || ''}`.trim(), clientIP, userAgent, true);

          // Return user data (excluding password)
          const { password: _, ...userWithoutPassword } = user;
          res.json({ user: userWithoutPassword });
        } catch (error) {
          console.error("Login error:", error);
          // Log system error during login
          await storage.logLogin('system', req.body?.email || 'unknown', 'System', clientIP, userAgent, false, error instanceof Error ? error.message : 'System error during login');
          res.status(500).json({ message: "Login failed" });
        }
      });

    // Logout route
    app.post("/api/auth/logout", async (req, res) => {
        const user = req.session.user;
        const clientIP = req.headers['x-forwarded-for']?.toString().split(',')[0] ||
                        req.headers['x-real-ip']?.toString() ||
                        req.connection.remoteAddress ||
                        req.socket.remoteAddress ||
                        '127.0.0.1';

        try {
          // Log logout before destroying session
          if (user) {
            await storage.logLogout(user.id, user.email, `${user.firstName || ''} ${user.lastName || ''}`.trim(), clientIP);
          }

          req.session.destroy((err) => {
            if (err) {
              console.error("Logout error:", err);
              return res.status(500).json({ message: "Logout failed" });
            }

            res.json({ message: "Logged out successfully" });
          });
        } catch (error) {
          console.error("Logout audit log error:", error);
          // Still proceed with logout even if audit logging fails
          req.session.destroy((err) => {
            if (err) {
              console.error("Logout error:", err);
              return res.status(500).json({ message: "Logout failed" });
            }
            res.json({ message: "Logged out successfully" });
          });
        }
      });

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