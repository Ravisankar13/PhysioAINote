import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Session cookie duration constants
const SESSION_DURATION = {
  DEFAULT: 1000 * 60 * 60 * 24 * 7, // 1 week (default)
  EXTENDED: 1000 * 60 * 60 * 24 * 30, // 30 days (remember me)
};

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session' 
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_DURATION.DEFAULT,
      httpOnly: true,
      sameSite: 'lax'
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send the password hash to the client
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        console.log(`User authenticated: ${user.username}, ID: ${user.id}`);
        
        // Check if "remember me" was selected
        if (req.body.rememberMe) {
          console.log(`Extended session requested for user: ${user.username}`);
          // Set the session cookie to longer duration (30 days)
          if (req.session.cookie) {
            req.session.cookie.maxAge = SESSION_DURATION.EXTENDED;
            console.log(`Session expiry extended to ${SESSION_DURATION.EXTENDED}ms`);
          }
        } else {
          console.log(`Standard session for user: ${user.username}`);
        }
        
        // Save session immediately to ensure it's stored with updated settings
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return next(err);
          }
          // Don't send the password hash to the client
          const { password, ...userWithoutPassword } = user;
          res.status(200).json(userWithoutPassword);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    // Don't send the password hash to the client
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });
  
  // Admin endpoint to view user statistics - only accessible by specific admin users
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Only specific users can access admin functions (for security)
    const adminUsernames = ["Fateofjustice"]; // You can add more admin usernames here
    if (!adminUsernames.includes(req.user!.username)) {
      return res.status(403).json({ message: "Not authorized for admin access" });
    }
    
    try {
      // Get user count
      const userCount = await storage.getUserCount();
      
      // Get list of users without passwords (sensitive information)
      const users = await storage.getAllUsers();
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return {
          ...userWithoutPassword,
          createdAt: user.createdAt || 'N/A'
        };
      });
      
      // Return user stats
      res.json({
        totalUsers: userCount,
        users: safeUsers,
        byMembership: {
          basic: safeUsers.filter(u => u.membershipTier === 'basic').length,
          standard: safeUsers.filter(u => u.membershipTier === 'standard').length,
          premium: safeUsers.filter(u => u.membershipTier === 'premium').length,
          none: safeUsers.filter(u => u.membershipTier === 'none').length
        }
      });
    } catch (error) {
      console.error("Error fetching admin user data:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });
}