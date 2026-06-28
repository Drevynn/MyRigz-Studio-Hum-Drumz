import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('--- STARTING BULK MIGRATION ---');

const COPY_MAP = {
  // Client source files
  'temp_repo/client/src/App.tsx': 'src/App.tsx',
  'temp_repo/client/src/main.tsx': 'src/main.tsx',
  'temp_repo/client/src/index.css': 'src/index.css',
  'temp_repo/client/index.html': 'index.html',
};

// Ensure base directories exist
const DIRECTORIES = [
  'src/components/ui',
  'src/pages',
  'src/hooks',
  'src/lib',
  'shared/models',
  'server/replit_integrations/auth',
  'public',
  'attached_assets'
];

DIRECTORIES.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Recursively copy directories
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyDir(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 1. Copy simple static files
Object.entries(COPY_MAP).forEach(([src, dest]) => {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} -> ${dest}`);
  } else {
    console.warn(`File does not exist: ${src}`);
  }
});

// 2. Copy entire folder trees
console.log('Copying components...');
copyDir('temp_repo/client/src/components', 'src/components');

console.log('Copying pages...');
copyDir('temp_repo/client/src/pages', 'src/pages');

console.log('Copying hooks...');
copyDir('temp_repo/client/src/hooks', 'src/hooks');

console.log('Copying lib...');
copyDir('temp_repo/client/src/lib', 'src/lib');

console.log('Copying static public files...');
copyDir('temp_repo/client/public', 'public');

console.log('Copying attached_assets...');
copyDir('temp_repo/attached_assets', 'attached_assets');

// 3. Copy Shared schemas
console.log('Copying shared definitions...');
fs.copyFileSync('temp_repo/shared/schema.ts', 'shared/schema.ts');
fs.copyFileSync('temp_repo/shared/models/auth.ts', 'shared/models/auth.ts');

// 4. Create custom mocked server storage
console.log('Writing customized client-friendly in-memory/JSON storage...');
const storageCode = `import { 
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
}

class Storage implements IStorage, IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const data = loadDb();
    return data.users[id];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const data = loadDb();
    const id = userData.id!;
    const existing = data.users[id] || {};
    const updated: User = {
      id,
      email: userData.email || existing.email || null,
      firstName: userData.firstName || existing.firstName || null,
      lastName: userData.lastName || existing.lastName || null,
      profileImageUrl: userData.profileImageUrl || existing.profileImageUrl || null,
      createdAt: existing.createdAt || new Date(),
      updatedAt: new Date()
    };
    data.users[id] = updated;
    saveDb(data);
    return updated;
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
        reason: \`You've reached your monthly limit of \${limits.generationsPerMonth} generations. Upgrade to get more!\`,
        remaining: 0
      };
    }
    return { allowed: true, remaining };
  }
}

export const storage = new Storage();
export const authStorage = storage;
`;

fs.writeFileSync('server/storage.ts', storageCode, 'utf8');

// 5. Create local session and mock Auth module
console.log('Writing customized platform-friendly mock Auth setup...');
const replitAuthCode = `import type { Express, RequestHandler } from "express";
import session from "express-session";
import memorystore from "memorystore";
import { authStorage } from "./storage";

const MemoryStore = memorystore(session);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  return session({
    secret: process.env.SESSION_SECRET || "hum-drumz-secret-key-123",
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // in development inside iframe, we keep it false for easier cross-origin
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  // Use session
  app.use(getSession());

  // Passport middleware mock compatibility
  app.use((req: any, res, next) => {
    // If the session has logged in as mock user, assign req.user
    if (req.session && req.session.userId) {
      req.user = {
        claims: {
          sub: req.session.userId,
          email: req.session.userEmail || "tester@example.com"
        }
      };
    }
    next();
  });

  // Serve a beautiful, polished mock login selector
  app.get("/api/login", (req: any, res) => {
    const redirectUrl = "/generate";
    // Check if user is looking to log into a specific tier
    const html = \`
      <!DOCTYPE html>
      <html class="dark">
        <head>
          <title>Mock Login Selector</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-[#1c0f2a] text-white flex flex-col justify-center items-center min-h-screen font-sans">
          <div class="bg-[#24143a]/80 p-8 rounded-2xl shadow-xl max-w-sm w-full border border-purple-500/20 text-center animate-fade-in">
            <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2">Hum Drumz</h1>
            <p class="text-xs text-purple-200/80 mb-6">Select a mock tier account to explore all features instantly</p>
            <div class="space-y-3">
              <a href="/api/auth/mock-login?tier=free" class="block w-full py-2 px-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-sm font-semibold border border-gray-600 transition-all text-center">
                Sign in as Free User (5 beats/mo)
              </a>
              <a href="/api/auth/mock-login?tier=basic" class="block w-full py-2 px-4 rounded-lg bg-yellow-600/30 hover:bg-yellow-600/50 text-sm font-semibold border border-yellow-500/20 transition-all text-center">
                Sign in as Basic User (25 beats/mo)
              </a>
              <a href="/api/auth/mock-login?tier=pro" class="block w-full py-2 px-4 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-sm font-semibold border border-purple-500/20 transition-all text-center">
                Sign in as Pro User (100 beats/mo)
              </a>
              <a href="/api/auth/mock-login?tier=premium" class="block w-full py-2 px-4 rounded-lg bg-pink-600/30 hover:bg-pink-600/50 text-sm font-semibold border border-pink-500/40 transition-all text-center text-pink-200">
                Sign in as Premium User (Unlimited)
              </a>
            </div>
            <a href="/" class="block mt-6 text-xs text-purple-400 hover:underline">Cancel & Go Home</a>
          </div>
        </body>
      </html>
    \`;
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

  app.get("/api/auth/mock-login", async (req: any, res) => {
    const tier = (req.query.tier as string) || "free";
    
    // Create random mock user ID
    const userId = "user-" + tier + "-" + Math.random().toString(36).substring(2, 6);
    const email = \`\${tier}-tester@humdrumz.xyz\`;
    const firstName = tier.charAt(0).toUpperCase() + tier.slice(1);
    const lastName = "Tester";
    
    // Upsert into users database
    await authStorage.upsertUser({
      id: userId,
      email,
      firstName,
      lastName,
      profileImageUrl: \`https://api.dicebear.com/7.x/bottts/svg?seed=\${userId}\`
    });

    // Seed empty subscription tier
    await authStorage.updateSubscription(userId, {
      userId,
      tier,
      generationsThisMonth: 0,
      lastGenerationReset: new Date()
    });

    req.session.userId = userId;
    req.session.userEmail = email;
    req.session.save(() => {
      res.redirect("/generate");
    });
  });

  app.get("/api/logout", (req: any, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
`;

fs.writeFileSync('server/replit_integrations/auth/replitAuth.ts', replitAuthCode, 'utf8');

// Copy auth index.ts and routes.ts
fs.copyFileSync('temp_repo/server/replit_integrations/auth/index.ts', 'server/replit_integrations/auth/index.ts');
fs.copyFileSync('temp_repo/server/replit_integrations/auth/routes.ts', 'server/replit_integrations/auth/routes.ts');

// 6. Copy routes.ts and update its DB storage references to exclude pg / drizzle directly
console.log('Writing customized router definitions...');
let routesCode = fs.readFileSync('temp_repo/server/routes.ts', 'utf8');
// Replace @shared/schema imports to match workspace structure
routesCode = routesCode.replace(/from "@shared\/schema"/g, 'from "../shared/schema"');
routesCode = routesCode.replace(/from "\.\/replit_integrations\/auth"/g, 'from "./replit_integrations/auth"');
routesCode = routesCode.replace(/from "\.\/stripe"/g, 'from "./stripe"');
routesCode = routesCode.replace(/from "\.\/storage"/g, 'from "./storage"');
fs.writeFileSync('server/routes.ts', routesCode, 'utf8');

// 7. Copy stripe.ts and adapt DB updates to use storage
console.log('Writing customized stripe definitions...');
let stripeCode = fs.readFileSync('temp_repo/server/stripe.ts', 'utf8');
stripeCode = stripeCode.replace(/from "@shared\/schema"/g, 'from "../shared/schema"');
stripeCode = stripeCode.replace(/from "\.\/replit_integrations\/auth"/g, 'from "./replit_integrations/auth"');
stripeCode = stripeCode.replace(/from "\.\/storage"/g, 'from "./storage"');
// replace database direct updates
stripeCode = stripeCode.replace(/import { db } from "\.\/db";/g, '');
const dbQueryPattern = /await db\.update\(subscriptions\)[\s\S]*?\.where\(eq\(subscriptions\.stripeCustomerId, customerId\)\);/g;
stripeCode = stripeCode.replace(dbQueryPattern, `await storage.updateSubscriptionByCustomerId(customerId, {
              tier: newTier,
              currentPeriodStart: stripeSubscription.current_period_start 
                ? new Date(stripeSubscription.current_period_start * 1000) 
                : null,
              currentPeriodEnd: stripeSubscription.current_period_end 
                ? new Date(stripeSubscription.current_period_end * 1000) 
                : null,
            });`);

const dbQueryPattern2 = /await db\.update\(subscriptions\)[\s\S]*?\.where\(eq\(subscriptions\.stripeCustomerId, customerId\)\);/g;
stripeCode = stripeCode.replace(dbQueryPattern2, `await storage.updateSubscriptionByCustomerId(customerId, {
              tier: "free",
              stripeSubscriptionId: null,
              currentPeriodStart: null,
              currentPeriodEnd: null,
            });`);

fs.writeFileSync('server/stripe.ts', stripeCode, 'utf8');

// 8. Create Server Entry Point in server.ts at root
console.log('Creating Express + Vite central entry point (server.ts)...');
const serverCode = `import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";
import { registerRoutes } from "./server/routes";

async function startServer() {
  const app = express();
  
  // Custom middleware for stripe body signature validation
  app.use((req: any, res, next) => {
    if (req.originalUrl === "/api/webhooks/stripe") {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        req.rawBody = Buffer.from(data);
        next();
      });
    } else {
      next();
    }
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const server = http.createServer(app);

  // Register API routes
  await registerRoutes(server, app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}

startServer();
`;

fs.writeFileSync('server.ts', serverCode, 'utf8');

// 9. Fix client imports of @shared and css references
console.log('Fixing typescript source import mappings...');
const clientSrcMain = fs.readFileSync('src/main.tsx', 'utf8');
// Fix css import if needed
fs.writeFileSync('src/main.tsx', clientSrcMain.replace(/'\.\/index\.css'/g, "'./index.css'"), 'utf8');

// Ensure standard `@/` prefix is compiled by vite
console.log('Bulk Migration completed successfully!');
