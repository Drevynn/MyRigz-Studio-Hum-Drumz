import express from "express";
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

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: false, limit: "15mb" }));

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
