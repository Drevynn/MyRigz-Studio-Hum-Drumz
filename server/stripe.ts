import Stripe from "stripe";
import type { Express } from "express";
import { storage } from "./storage";

import { isAuthenticated } from "./replit_integrations/auth";
import { TIER_LIMITS, subscriptions } from "../shared/schema";
import { eq } from "drizzle-orm";

// Initialize Stripe with the secret key
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Price IDs for each tier (set these in Stripe dashboard)
const TIER_PRICE_IDS: Record<string, string | undefined> = {
  basic: process.env.STRIPE_PRICE_BASIC,
  pro: process.env.STRIPE_PRICE_PRO,
  premium: process.env.STRIPE_PRICE_PREMIUM,
};

export function registerStripeRoutes(app: Express) {
  // Create checkout session
  app.post("/api/checkout", isAuthenticated, async (req: any, res) => {
    if (!stripe) {
      return res.status(503).json({ 
        error: "Payment processing not configured",
        message: "Please contact support to enable payments"
      });
    }

    try {
      const { tier } = req.body;
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;

      if (!tier || !["basic", "pro", "premium"].includes(tier)) {
        return res.status(400).json({ error: "Invalid tier" });
      }

      const priceId = TIER_PRICE_IDS[tier];
      if (!priceId) {
        return res.status(400).json({ 
          error: "Tier not available",
          message: "This tier is not yet configured for payments"
        });
      }

      // Get or create Stripe customer
      let subscription = await storage.getSubscription(userId);
      let customerId = subscription?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId },
        });
        customerId = customer.id;
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${req.protocol}://${req.hostname}/pricing?success=true`,
        cancel_url: `${req.protocol}://${req.hostname}/pricing?canceled=true`,
        metadata: {
          userId,
          tier,
        },
      });

      return res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error:", error);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Create billing portal session
  app.post("/api/billing-portal", isAuthenticated, async (req: any, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Payment processing not configured" });
    }

    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getSubscription(userId);

      if (!subscription?.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${req.protocol}://${req.hostname}/pricing`,
      });

      return res.json({ url: session.url });
    } catch (error) {
      console.error("Billing portal error:", error);
      return res.status(500).json({ error: "Failed to create billing portal session" });
    }
  });

  // Stripe webhook handler - uses raw body for signature verification
  app.post("/api/webhooks/stripe", async (req: any, res) => {
    if (!stripe) {
      return res.status(503).send("Stripe not configured");
    }

    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Stripe webhook secret not configured");
      return res.status(500).send("Webhook not configured");
    }

    let event: Stripe.Event;

    try {
      // Use rawBody captured by express.json verify callback
      const rawBody = req.rawBody;
      if (!rawBody) {
        throw new Error("Raw body not available");
      }
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const tier = session.metadata?.tier;

          if (userId && tier) {
            await storage.updateSubscription(userId, {
              tier,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              generationsThisMonth: 0, // Reset count on new subscription
              lastGenerationReset: new Date(),
            });
            console.log(`Subscription activated for user ${userId}: ${tier}`);
          }
          break;
        }

        case "customer.subscription.updated": {
          const stripeSubscription = event.data.object as any;
          const customerId = stripeSubscription.customer as string;
          
          // Find subscription by Stripe customer ID and update
          const priceId = stripeSubscription.items?.data?.[0]?.price?.id;
          let newTier = "free";
          
          if (priceId === process.env.STRIPE_PRICE_BASIC) newTier = "basic";
          else if (priceId === process.env.STRIPE_PRICE_PRO) newTier = "pro";
          else if (priceId === process.env.STRIPE_PRICE_PREMIUM) newTier = "premium";
          
          // Update subscription in database
          await storage.updateSubscriptionByCustomerId(customerId, {
              tier: newTier,
              currentPeriodStart: stripeSubscription.current_period_start 
                ? new Date(stripeSubscription.current_period_start * 1000) 
                : null,
              currentPeriodEnd: stripeSubscription.current_period_end 
                ? new Date(stripeSubscription.current_period_end * 1000) 
                : null,
            });
          
          console.log(`Subscription updated for customer ${customerId}: ${newTier}`);
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          
          // Downgrade to free tier when subscription is canceled
          await storage.updateSubscriptionByCustomerId(customerId, {
            tier: "free",
            stripeSubscriptionId: null,
            currentPeriodStart: null,
            currentPeriodEnd: null,
          });
          
          console.log(`Subscription canceled for customer ${customerId}`);
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          console.error(`Payment failed for invoice ${invoice.id}`);
          // Could send notification email to user here
          break;
        }
      }

      return res.json({ received: true });
    } catch (error) {
      console.error("Webhook handler error:", error);
      return res.status(500).send("Webhook handler error");
    }
  });
}
