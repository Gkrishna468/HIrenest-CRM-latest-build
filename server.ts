import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Server-side OAuth logic and Webhook handling for Gmail integration
 */

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON parser for webhook bodies
  app.use(express.json());

  // Use API Gateway Auth
  const { requireAuth } = await import("./api/authMiddleware");
  app.use("/api", requireAuth);

  // API ROUTES

  // 1. Health check
  app.all("/api/health", async (req, res) => { 
    if (req.query.action || (req.body && req.body.action)) {
      try {
        const { default: handler } = await import("./api/health");
        await handler(req as any, res as any);
      } catch (error) {
        console.error("[Health Error]", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    } else {
      res.json({ status: "ok", service: "hirenest-backend" });
    }
  });

  // 2. Webhooks
  app.all("/api/webhooks", async (req, res) => {
    try {
      const { default: handler } = await import("./api/webhooks");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[Webhooks Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 3. Auth Gateway
  app.all("/api/auth", async (req, res) => {
    try {
      const { default: handler } = await import("./api/auth");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[Auth Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 4. Gmail Gateway
  app.all("/api/gmail", async (req, res) => {
    try {
      const { default: handler } = await import("./api/gmail");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[Gmail Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 5. Candidates Gateway
  app.all("/api/candidates", async (req, res) => {
    try {
      const { default: handler } = await import("./api/candidates");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[Candidates Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 6. AI Gateway
  app.all("/api/ai", async (req, res) => {
    try {
      const { default: handler } = await import("./api/ai");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[AI Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 7. Agents Gateway
  app.all("/api/agents", async (req, res) => {
    try {
      const { default: handler } = await import("./api/agents");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[Agents Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 8. Firebase Token Gateway
  app.all("/api/firebase-token", async (req, res) => {
    try {
      const { default: handler } = await import("./api/firebase-token");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[Firebase Token Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 9. Health Gateway
  app.all("/api/health/checks", async (req, res) => {
    try {
      const { default: handler } = await import("./api/health");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[Health Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Setup the internal Agent Runtime (Listens to system_events)
  try {
    const { setupAgentRuntime } = await import("./api/setupRuntime");
    setupAgentRuntime();
  } catch (error) {
    console.error("[AgentRuntime] Failed to import/execute setupAgentRuntime", error);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
