import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models (required for Replit Auth)
export * from "./models/auth";

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: "free",
  BASIC: "basic",
  PRO: "pro",
  PREMIUM: "premium",
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

// Tier features and limits
export const TIER_LIMITS = {
  free: {
    name: "Free",
    price: 0,
    generationsPerMonth: 5,
    downloadFormats: ["mp3"],
    maxBpmRange: true,
    priority: false,
    adFree: false,
    historyDays: 7,
  },
  basic: {
    name: "Basic",
    price: 4.99,
    generationsPerMonth: 25,
    downloadFormats: ["mp3"],
    maxBpmRange: true,
    priority: false,
    adFree: true,
    historyDays: 30,
  },
  pro: {
    name: "Pro",
    price: 9.99,
    generationsPerMonth: 100,
    downloadFormats: ["mp3", "wav"],
    maxBpmRange: true,
    priority: true,
    adFree: true,
    historyDays: 90,
  },
  premium: {
    name: "Premium",
    price: 19.99,
    generationsPerMonth: -1, // unlimited
    downloadFormats: ["mp3", "wav"],
    maxBpmRange: true,
    priority: true,
    adFree: true,
    historyDays: -1, // unlimited
  },
} as const;

// User subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tier: text("tier").notNull().default("free"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  generationsThisMonth: integer("generations_this_month").default(0),
  lastGenerationReset: timestamp("last_generation_reset").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Subscription = {
  id: string;
  userId: string;
  tier: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  generationsThisMonth: number | null;
  lastGenerationReset: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

export type InsertSubscription = {
  userId: string;
  tier?: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  generationsThisMonth?: number | null;
  lastGenerationReset?: Date | null;
};

// Drum generations table
export const drumGenerations = pgTable("drum_generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  prompt: text("prompt").notNull(),
  bpm: integer("bpm"),
  audioUrl: text("audio_url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DrumGeneration = {
  id: string;
  userId: string | null;
  prompt: string;
  bpm: number | null;
  audioUrl: string | null;
  status: string;
  createdAt: Date;
};

export type InsertDrumGeneration = {
  prompt: string;
  bpm?: number | null;
  audioUrl?: string | null;
  status?: string;
};

export const generateDrumRequestSchema = z.object({
  prompt: z.string().min(1, "Please describe what drums you want"),
  bpm: z.number().min(60).max(220).optional(),
});

export type GenerateDrumRequest = z.infer<typeof generateDrumRequestSchema>;
