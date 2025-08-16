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
import Stripe from "stripe";

const PostgresSessionStore = connectPg(session);

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51RP2StQgGBJQM85ZPrDkbY7AHdR6P5wrPjnA6pduuVnGjWX6kzSTQoQBp13lzq2ICGsKWay6NmVsym7whYJqWqqX009jZOQTgI', {
  apiVersion: '2023-10-16',
});

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
        // Special case for Fateofjustice admin user
        if (username.toLowerCase() === "fateofjustice") {
          console.log("Admin login attempt for Fateofjustice");
          
          // Check if the password matches the required admin password
          const requiredAdminPassword = "Ruchi0boy!123";
          if (password !== requiredAdminPassword) {
            console.log("Invalid admin password provided");
            return done(null, false);
          }
          
          let user = await storage.getUserByUsername("Fateofjustice");
          if (user) {
            console.log("Admin user found, logging in");
            return done(null, user);
          } else {
            // Create the admin user if it doesn't exist
            console.log("Creating admin user Fateofjustice");
            const adminUser = await storage.createUser({
              username: "Fateofjustice",
              password: await hashPassword(requiredAdminPassword),
              email: "",
              fullName: "Admin User",
              // We don't need to specify these fields as they're handled in the storage layer
            });
            return done(null, adminUser);
          }
        }
        
        // Normal authentication for all other users
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        console.error("Authentication error:", err);
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

      // Create user with onboarding required flag
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        membershipTier: "basic", // Default tier
        hasUsedTrial: false, // They haven't used their trial yet
        onboardingRequired: true, // Mark that they need to complete Stripe onboarding
      });

      req.login(user, async (err) => {
        if (err) return next(err);
        
        // Immediately create Stripe checkout session for trial
        try {
          // Get or create Stripe customer
          let customerId = user.stripeCustomerId;
          
          if (!customerId) {
            const customer = await stripe.customers.create({
              email: user.email || undefined,
              metadata: {
                userId: user.id.toString(),
                username: user.username || '',
              },
            });
            customerId = customer.id;
            await storage.updateStripeCustomerId(user.id, customerId);
          }

          // Create or get products and prices
          const products = await stripe.products.list({ limit: 100 });
          
          // Default to basic tier for new registrations
          const tierInfo = { 
            key: 'basic', 
            name: 'Basic Plan', 
            price: 3900, 
            description: '10 PhysioGPT sessions/month' 
          };
          
          let product = products.data.find(p => p.name === `PhysioAI ${tierInfo.name}`);
          
          if (!product) {
            product = await stripe.products.create({
              name: `PhysioAI ${tierInfo.name}`,
              description: tierInfo.description,
            });
          }
          
          // Check if price exists for this product
          const prices = await stripe.prices.list({ 
            product: product.id,
            limit: 100 
          });
          
          let price = prices.data.find(p => 
            p.unit_amount === tierInfo.price && 
            p.recurring?.interval === 'month'
          );
          
          if (!price) {
            price = await stripe.prices.create({
              product: product.id,
              unit_amount: tierInfo.price,
              currency: 'usd',
              recurring: {
                interval: 'month',
              },
            });
          }

          // Create checkout session with 14-day trial
          const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
              price: price.id,
              quantity: 1,
            }],
            mode: 'subscription',
            subscription_data: {
              trial_period_days: 14,
              metadata: {
                userId: user.id.toString(),
                tier: 'basic',
              },
            },
            success_url: `${req.protocol}://${req.get('host')}/onboarding-complete?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.protocol}://${req.get('host')}/registration-incomplete`,
            metadata: {
              userId: user.id.toString(),
              tier: 'basic',
            },
          });

          console.log("Stripe checkout session created:", session.id, "URL:", session.url);

          // Don't send the password hash to the client
          const { password, ...userWithoutPassword } = user;
          const responseData = {
            ...userWithoutPassword,
            checkoutUrl: session.url, // Send Stripe checkout URL for immediate redirect
            message: "Registration successful. Redirecting to secure payment setup..."
          };
          
          console.log("Sending registration response with checkout URL:", session.url);
          res.status(201).json(responseData);
        } catch (stripeError) {
          console.error("Error creating Stripe checkout session:", stripeError);
          // Still return success but without checkout URL (fallback)
          const { password, ...userWithoutPassword } = user;
          res.status(201).json({
            ...userWithoutPassword,
            requiresOnboarding: true
          });
        }
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
          
          // Calculate trial information if user has trial dates
          let trialInfo = null;
          if (user.trialStartDate && user.trialEndDate) {
            const now = new Date();
            const trialEnd = new Date(user.trialEndDate);
            const isInTrial = now <= trialEnd;
            const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            
            trialInfo = {
              isInTrial,
              trialEndsAt: user.trialEndDate,
              daysRemaining
            };
          }
          
          // Don't send the password hash to the client
          const { password, ...userWithoutPassword } = user;
          res.status(200).json({
            ...userWithoutPassword,
            trialInfo
          });
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
    
    const user = req.user as SelectUser;
    const { password, ...userWithoutPassword } = user;
    
    // Calculate trial information if user has trial dates
    let trialInfo = null;
    if (user.trialStartDate && user.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(user.trialEndDate);
      const isInTrial = now <= trialEnd;
      const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      trialInfo = {
        isInTrial,
        trialEndsAt: user.trialEndDate,
        daysRemaining
      };
    }
    
    res.json({
      ...userWithoutPassword,
      trialInfo
    });
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