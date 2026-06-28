import type { Express, RequestHandler } from "express";
import session from "express-session";
import memorystore from "memorystore";
import { authStorage } from "../../storage";

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
    const html = `
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
    `;
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

  app.get("/api/auth/mock-login", async (req: any, res) => {
    const tier = (req.query.tier as string) || "free";
    
    // Create random mock user ID
    const userId = "user-" + tier + "-" + Math.random().toString(36).substring(2, 6);
    const email = `${tier}-tester@humdrumz.xyz`;
    const firstName = tier.charAt(0).toUpperCase() + tier.slice(1);
    const lastName = "Tester";
    
    // Upsert into users database
    await authStorage.upsertUser({
      id: userId,
      email,
      firstName,
      lastName,
      profileImageUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`
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
