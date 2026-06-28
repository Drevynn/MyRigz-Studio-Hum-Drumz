import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { generateDrumRequestSchema, TIER_LIMITS } from "../shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerStripeRoutes } from "./stripe";
import { GoogleGenAI, Type } from "@google/genai";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Replit Auth (must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Setup Stripe payment routes
  registerStripeRoutes(app);
  
  // Generate drums endpoint
  app.post("/api/generate", async (req: any, res) => {
    try {
      const parseResult = generateDrumRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.flatten() 
        });
      }

      const { prompt, bpm } = parseResult.data;
      const userId = req.user?.claims?.sub || null;

      // Check generation limits for authenticated users
      if (userId) {
        const canGenerate = await storage.canUserGenerate(userId);
        if (!canGenerate.allowed) {
          return res.status(403).json({ 
            error: canGenerate.reason,
            upgradeRequired: true
          });
        }
      }

      const generation = await storage.createDrumGeneration({
        prompt,
        bpm: bpm || null,
        audioUrl: null,
        status: "generating",
        userId,
      });

      // Increment generation count for authenticated users
      if (userId) {
        await storage.incrementGenerationCount(userId);
      }

      try {
        const apiKey = process.env.ARTIFICIAL_STUDIO_API_KEY;
        
        if (!apiKey) {
          const demoGeneration = await storage.updateDrumGeneration(generation.id, {
            status: "completed",
            audioUrl: getDemoAudioUrl(),
          });
          return res.json(demoGeneration);
        }

        const fullPrompt = buildPrompt(prompt, bpm);
        
        const response = await fetch("https://api.artificialstudio.ai/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "drum-generator",
            input: {
              prompt: fullPrompt,
              seed: "-1",
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Artificial Studio API error:", errorText);
          
          const demoGeneration = await storage.updateDrumGeneration(generation.id, {
            status: "completed",
            audioUrl: getDemoAudioUrl(),
          });
          return res.json(demoGeneration);
        }

        const data = await response.json();
        
        const updatedGeneration = await storage.updateDrumGeneration(generation.id, {
          status: "completed",
          audioUrl: data.output?.audio_url || data.audio_url || getDemoAudioUrl(),
        });

        return res.json(updatedGeneration);
      } catch (apiError) {
        console.error("API call failed:", apiError);
        
        const demoGeneration = await storage.updateDrumGeneration(generation.id, {
          status: "completed",
          audioUrl: getDemoAudioUrl(),
        });
        return res.json(demoGeneration);
      }
    } catch (error) {
      console.error("Generate error:", error);
      return res.status(500).json({ error: "Failed to generate drums" });
    }
  });

  // Get history (public - returns recent generations)
  app.get("/api/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const generations = await storage.getRecentGenerations(limit);
      return res.json(generations);
    } catch (error) {
      console.error("History error:", error);
      return res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // Get user's own generations (authenticated)
  app.get("/api/my-generations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const generations = await storage.getUserGenerations(userId, limit);
      return res.json(generations);
    } catch (error) {
      console.error("My generations error:", error);
      return res.status(500).json({ error: "Failed to fetch generations" });
    }
  });

  // Get specific generation
  app.get("/api/generation/:id", async (req, res) => {
    try {
      const generation = await storage.getDrumGeneration(req.params.id);
      if (!generation) {
        return res.status(404).json({ error: "Generation not found" });
      }
      return res.json(generation);
    } catch (error) {
      console.error("Get generation error:", error);
      return res.status(500).json({ error: "Failed to fetch generation" });
    }
  });

  // Get subscription status
  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let subscription = await storage.getSubscription(userId);
      
      if (!subscription) {
        // Create free tier for new user
        subscription = await storage.createSubscription({
          userId,
          tier: "free",
          generationsThisMonth: 0,
          lastGenerationReset: new Date(),
        });
      }

      const tier = subscription.tier as keyof typeof TIER_LIMITS;
      const tierLimits = TIER_LIMITS[tier] || TIER_LIMITS.free;
      const canGenerate = await storage.canUserGenerate(userId);

      return res.json({
        subscription,
        limits: tierLimits,
        usage: {
          generationsUsed: subscription.generationsThisMonth || 0,
          generationsRemaining: canGenerate.remaining,
        }
      });
    } catch (error) {
      console.error("Subscription error:", error);
      return res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Get pricing tiers (public)
  app.get("/api/pricing", (req, res) => {
    return res.json({
      tiers: Object.entries(TIER_LIMITS).map(([key, value]) => ({
        id: key,
        ...value,
      }))
    });
  });

  // AI Guitar matching fallback presets database
  const FALLBACK_PRESETS: Record<string, { bpm: number, genre: string, description: string, grid: Record<string, number[]> }> = {
    "heavy-metal": {
      bpm: 140,
      genre: "Heavy Metal",
      description: "Driving double-kick patterns paired with heavy snare hits and aggressive open hats to anchor thrashing guitar riffs.",
      grid: {
        kick:      [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0],
        snare:     [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        closedHat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        openHat:   [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0],
        highTom:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        lowTom:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        clap:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        cowbell:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      }
    },
    "funk-wah": {
      bpm: 105,
      genre: "Groovy Funk",
      description: "Highly syncopated ghost snares and responsive handclaps tailored to interlock with rhythmic wah-wah guitar strums.",
      grid: {
        kick:      [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        snare:     [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
        closedHat: [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        openHat:   [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0],
        highTom:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lowTom:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        clap:      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
        cowbell:   [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      }
    },
    "acoustic-folk": {
      bpm: 92,
      genre: "Acoustic Folk / Indie",
      description: "Warm, understated kick support and handclaps that complement delicate acoustic picking without overpowering the dynamics.",
      grid: {
        kick:      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        snare:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        closedHat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        openHat:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        highTom:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lowTom:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        clap:      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        cowbell:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      }
    },
    "punk-rock": {
      bpm: 165,
      genre: "Upbeat Punk Rock",
      description: "Fast-paced alternating kick and crisp snare pattern with riding open hats, standard for fast energetic punk progressions.",
      grid: {
        kick:      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
        snare:     [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
        closedHat: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        openHat:   [0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0],
        highTom:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lowTom:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        clap:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        cowbell:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      }
    },
    "blues-solo": {
      bpm: 82,
      genre: "Slow Blues Shuffle",
      description: "A relaxed, swung shuffle pattern with heavy triplets on the hi-hat and an occasional cowbell accent to accompany a soul-stirring blues solo.",
      grid: {
        kick:      [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
        snare:     [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        closedHat: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0],
        openHat:   [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
        highTom:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lowTom:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        clap:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        cowbell:   [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      }
    }
  };

  // AI Guitar matcher endpoint
  app.post("/api/match-guitar-drums", async (req, res) => {
    try {
      const { audioData, mimeType, guitarStyle, customPrompt } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.log("No GEMINI_API_KEY found, fallback to simulated match.");
        const styleKey = guitarStyle && FALLBACK_PRESETS[guitarStyle] ? guitarStyle : "heavy-metal";
        const matched = FALLBACK_PRESETS[styleKey];
        return res.json({
          ...matched,
          isSimulated: true,
          description: matched.description + " (Configure GEMINI_API_KEY in secrets to process custom audio!)"
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let response;
      if (audioData) {
        const base64Data = audioData.includes(";base64,") ? audioData.split(";base64,")[1] : audioData;
        const finalMime = mimeType || "audio/webm";

        console.log(`Analyzing recorded guitar audio of mime: ${finalMime}...`);

        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: finalMime
              }
            },
            {
              text: "You are an expert session drummer. Analyze the provided guitar track audio. " +
                    "First, identify its approximate BPM (tempo) and primary style/genre/energy. " +
                    "Next, create a matching 16-step drum loop for our virtual drum kit. " +
                    "Return a JSON object matching the requested schema. Ensure the grid has arrays of exactly 16 values (each value must be 1 for a hit or 0 for silence)."
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                bpm: { type: Type.INTEGER, description: "BPM of the detected track (between 60 and 180)" },
                genre: { type: Type.STRING, description: "Style or genre detected (e.g. Punk Rock, Slow Blues, Heavy Metal)" },
                description: { type: Type.STRING, description: "A detailed 1-2 sentence description explaining the drumming strategy to match this guitar track." },
                grid: {
                  type: Type.OBJECT,
                  properties: {
                    kick: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    snare: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    closedHat: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    openHat: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    highTom: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    lowTom: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    clap: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    cowbell: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                  },
                  required: ["kick", "snare", "closedHat", "openHat", "highTom", "lowTom", "clap", "cowbell"]
                }
              },
              required: ["bpm", "genre", "description", "grid"]
            }
          }
        });
      } else {
        const textPrompt = `Guitar style: ${guitarStyle || 'Custom riff'}. Notes: ${customPrompt || 'none'}.`;
        console.log(`Generating matching pattern for text prompt: ${textPrompt}`);

        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            {
              text: "You are an expert session drummer. " +
                    `Analyze this guitar track description: "${textPrompt}". ` +
                    "Design a matching 16-step drum loop for our virtual drum kit. " +
                    "Return a JSON object containing the BPM, detected genre, drumming strategy description, " +
                    "and a 16-step grid of 0s and 1s for: kick, snare, closedHat, openHat, highTom, lowTom, clap, cowbell. " +
                    "Each of the 8 instruments must have exactly 16 values."
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                bpm: { type: Type.INTEGER, description: "BPM of the matched track (between 60 and 180)" },
                genre: { type: Type.STRING, description: "Matching genre/style" },
                description: { type: Type.STRING, description: "A detailed 1-2 sentence description explaining the drumming strategy." },
                grid: {
                  type: Type.OBJECT,
                  properties: {
                    kick: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    snare: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    closedHat: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    openHat: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    highTom: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    lowTom: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    clap: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                    cowbell: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "16 numbers: 0 or 1" },
                  },
                  required: ["kick", "snare", "closedHat", "openHat", "highTom", "lowTom", "clap", "cowbell"]
                }
              },
              required: ["bpm", "genre", "description", "grid"]
            }
          }
        });
      }

      const rawText = response.text || "{}";
      const parsedData = JSON.parse(rawText.trim());
      
      const instrumentsList = ["kick", "snare", "closedHat", "openHat", "highTom", "lowTom", "clap", "cowbell"];
      if (!parsedData.grid) {
        parsedData.grid = {};
      }
      for (const inst of instrumentsList) {
        if (!parsedData.grid[inst] || !Array.isArray(parsedData.grid[inst])) {
          parsedData.grid[inst] = Array(16).fill(0);
        } else {
          while (parsedData.grid[inst].length < 16) parsedData.grid[inst].push(0);
          parsedData.grid[inst] = parsedData.grid[inst].slice(0, 16);
        }
      }

      return res.json(parsedData);
    } catch (err: any) {
      console.error("Match guitar drums error:", err);
      return res.status(200).json({
        bpm: 110,
        genre: "Modern Rock Match",
        description: "A steady driving rock groove applied as a backup match due to temporary processing overload. Play along now!",
        grid: {
          kick:      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
          snare:     [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
          closedHat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
          openHat:   [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
          highTom:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          lowTom:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          clap:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          cowbell:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        }
      });
    }
  });

  // Get pricing tiers (public)
  app.get("/api/pricing", (req, res) => {
    return res.json({
      tiers: Object.entries(TIER_LIMITS).map(([key, value]) => ({
        id: key,
        ...value,
      }))
    });
  });

  // Get all users (discovery/social directory)
  app.get("/api/users", async (req, res) => {
    try {
      const usersList = await storage.getAllUsers();
      const profiles = usersList.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username || `${u.firstName || 'user'}_${u.id.substring(0, 4)}`,
        bio: u.bio,
        profileImageUrl: u.profileImageUrl,
        following: u.following || []
      }));
      return res.json(profiles);
    } catch (error) {
      console.error("Fetch users directory error:", error);
      return res.status(500).json({ error: "Failed to fetch users directory" });
    }
  });

  // Get single user profile (details, beats, follower count)
  app.get("/api/users/:userId", async (req: any, res) => {
    try {
      const targetUserId = req.params.userId;
      let targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        // Fallback: search by username
        const allUsers = await storage.getAllUsers();
        targetUser = allUsers.find(u => u.username?.toLowerCase() === targetUserId.toLowerCase());
      }
      
      if (!targetUser) {
        return res.status(404).json({ error: "User profile not found" });
      }

      // Fetch target user's beats
      const beats = await storage.getUserGenerations(targetUser.id, 50);

      // Analyze followers list (who has targetUser.id in their following array)
      const allUsers = await storage.getAllUsers();
      const followers = allUsers.filter(u => (u.following || []).includes(targetUser!.id)).map(u => u.id);

      const callerUserId = req.user?.claims?.sub || null;
      let isFollowing = false;
      if (callerUserId) {
        const callerUser = await storage.getUser(callerUserId);
        isFollowing = callerUser ? (callerUser.following || []).includes(targetUser.id) : false;
      }

      return res.json({
        user: {
          id: targetUser.id,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          username: targetUser.username || `${targetUser.firstName || 'user'}_${targetUser.id.substring(0, 4)}`,
          bio: targetUser.bio,
          profileImageUrl: targetUser.profileImageUrl,
          following: targetUser.following || [],
          followers: followers
        },
        beats,
        isFollowing
      });
    } catch (error) {
      console.error("Get user profile error:", error);
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // Edit user profile details (authenticated user editing own)
  app.post("/api/users/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const targetUserId = req.params.userId;
      const callerUserId = req.user.claims.sub;

      if (targetUserId !== callerUserId) {
        return res.status(403).json({ error: "Unauthorized to edit this profile" });
      }

      const { username, bio, profileImageUrl, firstName, lastName } = req.body;
      
      // If username is supplied, ensure it is unique among other users
      if (username) {
        const allUsers = await storage.getAllUsers();
        const existingUsernameMatch = allUsers.find(u => u.id !== targetUserId && u.username?.toLowerCase() === username.toLowerCase());
        if (existingUsernameMatch) {
          return res.status(400).json({ error: "Username is already taken" });
        }
      }

      const updatedUser = await storage.upsertUser({
        id: targetUserId,
        username,
        bio,
        profileImageUrl,
        firstName,
        lastName
      });

      return res.json(updatedUser);
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Follow/unfollow toggle
  app.post("/api/users/:userId/follow", isAuthenticated, async (req: any, res) => {
    try {
      const targetUserId = req.params.userId;
      const followerUserId = req.user.claims.sub;

      if (targetUserId === followerUserId) {
        return res.status(400).json({ error: "You cannot follow yourself" });
      }

      const result = await storage.toggleFollow(followerUserId, targetUserId);
      return res.json({ 
        success: true, 
        following: result.followed 
      });
    } catch (error) {
      console.error("Toggle follow error:", error);
      return res.status(500).json({ error: "Failed to toggle follow" });
    }
  });

  return httpServer;
}

function buildPrompt(userPrompt: string, bpm?: number): string {
  let prompt = `drums, drum pattern, ${userPrompt}`;
  
  if (bpm) {
    prompt += `, ${bpm} BPM`;
  }

  return prompt;
}

function getDemoAudioUrl(): string {
  const demoUrls = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  ];
  return demoUrls[Math.floor(Math.random() * demoUrls.length)];
}
