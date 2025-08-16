import { Router, Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { storage } from "../storage";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
});

const router = Router();

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized - Please log in" });
};

// Stripe Price IDs for each tier (you'll need to create these in Stripe Dashboard)
const PRICE_IDS = {
  basic: process.env.STRIPE_PRICE_BASIC || 'price_basic_placeholder',
  standard: process.env.STRIPE_PRICE_STANDARD || 'price_standard_placeholder',
  premium: process.env.STRIPE_PRICE_PREMIUM || 'price_premium_placeholder',
};

// Get current subscription status
router.get("/status", isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has an active subscription
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        return res.json({
          hasSubscription: true,
          tier: user.membershipTier,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          trialEnd: subscription.trial_end,
          isOnTrial: subscription.status === 'trialing',
        });
      } catch (error) {
        // Subscription might not exist in Stripe
        console.error("Error retrieving subscription:", error);
      }
    }

    // Check trial status
    const trialStatus = await storage.getUserTrialStatus(req.user.id);
    
    res.json({
      hasSubscription: false,
      tier: user.membershipTier || 'none',
      ...trialStatus,
    });
  } catch (error: any) {
    console.error("Error getting subscription status:", error);
    res.status(500).json({ message: "Failed to get subscription status" });
  }
});

// Create checkout session for new subscription with 14-day trial
router.post("/create-checkout-session", isAuthenticated, async (req: any, res) => {
  try {
    const { tier } = req.body;
    
    if (!['basic', 'standard', 'premium'].includes(tier)) {
      return res.status(400).json({ message: "Invalid tier selected" });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user already has used their trial
    const trialStatus = await storage.getUserTrialStatus(req.user.id);
    if (trialStatus.hasUsedTrial) {
      return res.status(400).json({ 
        message: "You have already used your free trial. Please select a paid plan." 
      });
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          userId: user.id.toString(),
          username: user.username,
        },
      });
      customerId = customer.id;
      await storage.updateStripeCustomerId(user.id, customerId);
    }

    // Create subscription with 14-day trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: PRICE_IDS[tier as keyof typeof PRICE_IDS],
      }],
      trial_period_days: 14,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
    });

    // Update user record with subscription info
    await storage.updateUserStripeInfo(user.id, {
      subscriptionId: subscription.id,
      priceId: PRICE_IDS[tier as keyof typeof PRICE_IDS],
      tier: tier as "basic" | "standard" | "premium",
      status: 'trialing',
    });

    // Mark trial as started
    await storage.startFreeTrial(user.id);

    // Get the client secret for payment method collection
    let clientSecret: string | null = null;
    
    if (subscription.pending_setup_intent && typeof subscription.pending_setup_intent === 'object') {
      clientSecret = subscription.pending_setup_intent.client_secret;
    } else if (subscription.latest_invoice && 
               typeof subscription.latest_invoice === 'object' && 
               subscription.latest_invoice.payment_intent &&
               typeof subscription.latest_invoice.payment_intent === 'object') {
      clientSecret = subscription.latest_invoice.payment_intent.client_secret;
    }

    res.json({
      subscriptionId: subscription.id,
      clientSecret,
      trialEnd: subscription.trial_end,
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ 
      message: "Failed to create subscription", 
      error: error.message 
    });
  }
});

// Upgrade or downgrade subscription
router.post("/change-plan", isAuthenticated, async (req: any, res) => {
  try {
    const { newTier } = req.body;
    
    if (!['basic', 'standard', 'premium'].includes(newTier)) {
      return res.status(400).json({ message: "Invalid tier selected" });
    }

    const user = await storage.getUser(req.user.id);
    if (!user || !user.stripeSubscriptionId) {
      return res.status(400).json({ message: "No active subscription found" });
    }

    // Retrieve current subscription
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    // Update subscription to new price
    const updatedSubscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: PRICE_IDS[newTier as keyof typeof PRICE_IDS],
        }],
        proration_behavior: 'always_invoice', // Prorate the change
      }
    );

    // Update user record
    await storage.updateUserStripeInfo(user.id, {
      priceId: PRICE_IDS[newTier as keyof typeof PRICE_IDS],
      tier: newTier as "basic" | "standard" | "premium",
    });

    res.json({
      message: "Subscription updated successfully",
      subscription: updatedSubscription,
    });
  } catch (error: any) {
    console.error("Error changing subscription plan:", error);
    res.status(500).json({ 
      message: "Failed to change subscription plan", 
      error: error.message 
    });
  }
});

// Cancel subscription
router.post("/cancel", isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || !user.stripeSubscriptionId) {
      return res.status(400).json({ message: "No active subscription found" });
    }

    // Cancel at period end (user keeps access until end of billing period)
    const subscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    res.json({
      message: "Subscription will be cancelled at the end of the current billing period",
      cancelAt: subscription.cancel_at,
    });
  } catch (error: any) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ 
      message: "Failed to cancel subscription", 
      error: error.message 
    });
  }
});

// Reactivate cancelled subscription
router.post("/reactivate", isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || !user.stripeSubscriptionId) {
      return res.status(400).json({ message: "No subscription found" });
    }

    // Remove cancellation
    const subscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
      }
    );

    res.json({
      message: "Subscription reactivated successfully",
      subscription,
    });
  } catch (error: any) {
    console.error("Error reactivating subscription:", error);
    res.status(500).json({ 
      message: "Failed to reactivate subscription", 
      error: error.message 
    });
  }
});

// Create portal session for managing subscription
router.post("/create-portal-session", isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ message: "No customer record found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${req.protocol}://${req.get('host')}/subscription`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Error creating portal session:", error);
    res.status(500).json({ 
      message: "Failed to create portal session", 
      error: error.message 
    });
  }
});

export default router;