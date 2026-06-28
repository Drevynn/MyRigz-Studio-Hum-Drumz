import { 
  type DrumGeneration, 
  type InsertDrumGeneration,
  type Subscription,
  type InsertSubscription,
  TIER_LIMITS
} from "../shared/schema";
import { type User, type UpsertUser } from "../shared/models/auth";
import fs from "fs";
import path from "path";

const dbPath = path.resolve(process.cwd(), "server", "db.json");

interface DbData {
  users: Record<string, User>;
  subscriptions: Record<string, Subscription>;
  drumGenerations: Record<string, DrumGeneration>;
}

function loadDb(): DbData {
  try {
    if (fs.existsSync(dbPath)) {
      const content = fs.readFileSync(dbPath, "utf8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Error loading mock storage JSON:", e);
  }
  return { users: {}, subscriptions: {}, drumGenerations: {} };
}

function saveDb(data: DbData) {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving mock storage JSON:", e);
  }
}

export interface IStorage {
  createDrumGeneration(generation: InsertDrumGeneration & { userId: string | null }): Promise<DrumGeneration>;
  updateDrumGeneration(id: string, updates: Partial<DrumGeneration>): Promise<DrumGeneration | undefined>;
  getDrumGeneration(id: string): Promise<DrumGeneration | undefined>;
  getRecentGenerations(limit?: number): Promise<DrumGeneration[]>;
  getUserGenerations(userId: string, limit?: number): Promise<DrumGeneration[]>;
  
  getSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(userId: string, updates: Partial<Subscription>): Promise<Subscription | undefined>;
  updateSubscriptionByCustomerId(customerId: string, updates: Partial<Subscription>): Promise<Subscription | undefined>;
  incrementGenerationCount(userId: string): Promise<void>;
  canUserGenerate(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }>;
}

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  toggleFollow(followerId: string, targetId: string): Promise<{ followed: boolean }>;
}

class Storage implements IStorage, IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const data = loadDb();
    return data.users[id];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const data = loadDb();
    const id = userData.id!;
    const existing = data.users[id] as User | undefined;
    const updated: User = {
      id,
      email: userData.email || existing?.email || null,
      firstName: userData.firstName || existing?.firstName || null,
      lastName: userData.lastName || existing?.lastName || null,
      profileImageUrl: userData.profileImageUrl || existing?.profileImageUrl || null,
      createdAt: existing?.createdAt ? new Date(existing.createdAt) : new Date(),
      updatedAt: new Date(),
      username: userData.username || existing?.username || null,
      bio: userData.bio || existing?.bio || null,
      following: userData.following || existing?.following || []
    };
    data.users[id] = updated;
    saveDb(data);
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    const data = loadDb();
    return Object.values(data.users);
  }

  async toggleFollow(followerId: string, targetId: string): Promise<{ followed: boolean }> {
    const data = loadDb();
    const follower = data.users[followerId];
    if (!follower) throw new Error("Follower user not found");
    const target = data.users[targetId];
    if (!target) throw new Error("Target user not found");

    const followingList = follower.following || [];
    const isFollowing = followingList.includes(targetId);
    let followed = false;

    if (isFollowing) {
      // Unfollow
      follower.following = followingList.filter(id => id !== targetId);
    } else {
      // Follow
      follower.following = [...followingList, targetId];
      followed = true;
    }

    data.users[followerId] = follower;
    saveDb(data);
    return { followed };
  }

  async createDrumGeneration(insertGen: InsertDrumGeneration & { userId: string | null }): Promise<DrumGeneration> {
    const data = loadDb();
    const id = Math.random().toString(36).substring(2, 15);
    const generation: DrumGeneration = {
      id,
      userId: insertGen.userId || null,
      prompt: insertGen.prompt,
      bpm: insertGen.bpm ?? null,
      audioUrl: insertGen.audioUrl ?? null,
      status: insertGen.status || "pending",
      createdAt: new Date()
    };
    data.drumGenerations[id] = generation;
    saveDb(data);
    return generation;
  }

  async updateDrumGeneration(id: string, updates: Partial<DrumGeneration>): Promise<DrumGeneration | undefined> {
    const data = loadDb();
    const gen = data.drumGenerations[id];
    if (!gen) return undefined;
    const updated = { ...gen, ...updates };
    data.drumGenerations[id] = updated;
    saveDb(data);
    return updated;
  }

  async getDrumGeneration(id: string): Promise<DrumGeneration | undefined> {
    const data = loadDb();
    return data.drumGenerations[id];
  }

  async getRecentGenerations(limit: number = 10): Promise<DrumGeneration[]> {
    const data = loadDb();
    return Object.values(data.drumGenerations)
      .filter(g => g.status === "completed")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getUserGenerations(userId: string, limit: number = 50): Promise<DrumGeneration[]> {
    const data = loadDb();
    return Object.values(data.drumGenerations)
      .filter(g => g.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const data = loadDb();
    return data.subscriptions[userId];
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const data = loadDb();
    const id = Math.random().toString(36).substring(2, 15);
    const subscription: Subscription = {
      id,
      userId: sub.userId,
      tier: sub.tier ?? "free",
      stripeCustomerId: sub.stripeCustomerId ?? null,
      stripeSubscriptionId: sub.stripeSubscriptionId ?? null,
      currentPeriodStart: sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : null,
      currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
      generationsThisMonth: sub.generationsThisMonth ?? 0,
      lastGenerationReset: sub.lastGenerationReset ? new Date(sub.lastGenerationReset) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    data.subscriptions[sub.userId] = subscription;
    saveDb(data);
    return subscription;
  }

  async updateSubscription(userId: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const data = loadDb();
    const sub = data.subscriptions[userId];
    if (!sub) return undefined;
    const updated = {
      ...sub,
      ...updates,
      updatedAt: new Date()
    };
    data.subscriptions[userId] = updated;
    saveDb(data);
    return updated;
  }

  async updateSubscriptionByCustomerId(customerId: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const data = loadDb();
    const sub = Object.values(data.subscriptions).find(s => s.stripeCustomerId === customerId);
    if (!sub) return undefined;
    const updated = {
      ...sub,
      ...updates,
      updatedAt: new Date()
    };
    data.subscriptions[sub.userId] = updated;
    saveDb(data);
    return updated;
  }

  async incrementGenerationCount(userId: string): Promise<void> {
    let sub = await this.getSubscription(userId);
    if (!sub) {
      await this.createSubscription({
        userId,
        tier: "free",
        generationsThisMonth: 1,
        lastGenerationReset: new Date(),
      });
      return;
    }
    const currentCount = sub.generationsThisMonth || 0;
    await this.updateSubscription(userId, {
      generationsThisMonth: currentCount + 1
    });
  }

  async canUserGenerate(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
    let sub = await this.getSubscription(userId);
    if (!sub) {
      const tierLimits = TIER_LIMITS.free;
      return { allowed: true, remaining: tierLimits.generationsPerMonth };
    }
    const tier = sub.tier as keyof typeof TIER_LIMITS;
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    if (limits.generationsPerMonth === -1) {
      return { allowed: true, remaining: -1 };
    }
    const current = sub.generationsThisMonth || 0;
    const remaining = Math.max(0, limits.generationsPerMonth - current);
    if (remaining <= 0) {
      return {
        allowed: false,
        reason: `You've reached your monthly limit of ${limits.generationsPerMonth} generations. Upgrade to get more!`,
        remaining: 0
      };
    }
    return { allowed: true, remaining };
  }
}

export const storage = new Storage();
export const authStorage = storage;
