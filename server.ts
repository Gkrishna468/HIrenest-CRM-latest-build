import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import * as crypto from "crypto";
import {
  initializeApp,
  getApps,
  applicationDefault,
  cert,
} from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

let db: Firestore | null = null;
let adminApp: any = null;

if (!getApps()?.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: projectId,
      });
    }
    db = getFirestore(adminApp);
  } catch (error) {
    console.error("Firebase initialization error", error);
  }
} else {
  db = getFirestore();
}

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "default-insecure-key-32-chars!!!";
const IV_LENGTH = 16;
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

export const decrypt = (text: string): string => {
  const textParts = text.split(":");
  const ivStr = textParts.shift();
  if (!ivStr) return text;
  const iv = Buffer.from(ivStr, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv,
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

async function processGmailMessage(emailAddress: string, historyId: string) {
  if (!db) {
    console.warn("processGmailMessage: Firestore not initialized");
    return;
  }
  const connectionSnapshot = await db
    .collection("gmail_connections")
    .where("email", "==", emailAddress)
    .limit(1)
    .get();
  if (connectionSnapshot.empty) {
    console.error(`[GmailService] No connection found for ${emailAddress}`);
    return;
  }
  const connectionDoc = connectionSnapshot.docs[0];
  const connectionData = connectionDoc.data();
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI,
  );
  const refreshToken = decrypt(connectionData.encryptedRefreshToken);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  try {
    const historyRes = await gmail.users.history.list({
      userId: "me",
      startHistoryId: connectionData.historyId,
    });
    if (historyRes.data.historyId) {
      await connectionDoc.ref.update({
        historyId: historyRes.data.historyId,
        lastSyncAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error(
      `[GmailService] Error fetching history for ${emailAddress}:`,
      error,
    );
  }
}

/**
 * Server-side OAuth logic and Webhook handling for Gmail integration
 */

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON parser for webhook bodies
  app.use(express.json());

  // API ROUTES

  // 1. Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "hirenest-backend" });
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

  // 5. AI Gateway
  app.all("/api/ai", async (req, res) => {
    try {
      const { default: handler } = await import("./api/ai");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[AI Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

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
