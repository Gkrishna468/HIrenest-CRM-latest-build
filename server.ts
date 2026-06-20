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

  // 2. Pub/Sub webhook for Gmail Notifications
  app.post("/api/webhooks/gmail", async (req, res) => {
    try {
      const pubsubMessage = req.body.message;
      if (!pubsubMessage) {
        return res.status(400).send("Missing message");
      }

      // decode the pub/sub message payload
      const encodedData = pubsubMessage.data;
      const dataStr = Buffer.from(encodedData, "base64").toString("utf-8");
      const data = JSON.parse(dataStr);

      const emailAddress = data.emailAddress;
      const historyId = data.historyId;

      console.log(
        `[Gmail Webhook] Received notification for ${emailAddress}, historyId: ${historyId}`,
      );

      // Process the message (this handles fetching from Gmail and saving to Firestore)
      // Run it asynchronously to avoid webhook timeout
      processGmailMessage(emailAddress, historyId).catch(console.error);

      res.status(200).send("OK");
    } catch (error) {
      console.error("[Gmail Webhook] Error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // 3. Initiate Gmail OAuth Flow
  // This avoids browser OAuth completely by handling it purely Server-Side.
  app.get("/api/auth/gmail/url", (req, res) => {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI ||
          "http://localhost:3000/api/auth/gmail/callback", // MUST be an exact match with Google Cloud Console
      );

      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: "offline", // Demands a refresh token
        prompt: "consent", // Forces the consent screen to guarantee refresh token
        scope: scopes,
        // Pass user ID into state to link connection back to user
        state: req.query.userId as string,
      });

      res.json({ url });
    } catch (error: any) {
      console.error("[Gmail Auth URL Error]", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // 4. Gmail OAuth Callback
  app.get("/api/auth/gmail/callback", async (req, res) => {
    const code = req.query.code as string;
    const userId = req.query.state as string;

    if (!code) {
      return res.status(400).send("Missing authorization code");
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI ||
          "http://localhost:3000/api/auth/gmail/callback",
      );

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: "me" });
      const emailAddress = profile.data.emailAddress;

      if (!emailAddress) throw new Error("Could not get email address");

      let encryptedRefreshToken = "";
      if (tokens.refresh_token) {
        encryptedRefreshToken = encrypt(tokens.refresh_token);
      }

      // Auto-subscribe to push notifications
      let historyId = profile.data.historyId || "";
      if (process.env.PUBSUB_TOPIC_NAME) {
        const watchRes = await gmail.users.watch({
          userId: "me",
          requestBody: {
            labelIds: ["INBOX"],
            topicName: process.env.PUBSUB_TOPIC_NAME,
          },
        });
        historyId = watchRes.data.historyId || historyId;
        console.log(
          `[Gmail Auth] Watch registration successful for ${emailAddress}`,
        );
      }

      // Save to Firestore
      if (db) {
        const connRef = db.collection("gmail_connections").doc(); // Generate random ID or use userId
        await connRef.set({
          userId: userId || "unknown",
          email: emailAddress,
          status: "active",
          historyId: historyId,
          encryptedRefreshToken: encryptedRefreshToken,
          watchExpiration: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // Roughly 7 days
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Emit GMAIL_CONNECTED event
        await db.collection("system_events").add({
          eventType: "GMAIL_CONNECTED",
          entityCollection: "gmail_connections",
          entityId: connRef.id,
          metadata: { email: emailAddress },
          createdAt: new Date().toISOString(),
        });
        console.log(
          `[Gmail Auth] Saved connection and emitted GMAIL_CONNECTED for ${emailAddress}`,
        );
      }

      res.redirect("/settings?gmail_connected=true");
    } catch (error) {
      console.error("[Gmail Auth] Error:", error);
      res.redirect("/settings?gmail_error=failed_to_connect");
    }
  });

  // 5. Gmail List (Mail Dashboard)
  app.get("/api/gmail/list", async (req, res) => {
    try {
      const { default: handler } = await import("./api/gmail/list");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[Gmail List Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 6. Gmail Sync (Mail Dashboard)
  app.post("/api/gmail/sync", async (req, res) => {
    try {
      const { default: handler } = await import("./api/gmail/sync");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[Gmail Sync Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 7. AI Classify
  app.post("/api/ai/classify", async (req, res) => {
    try {
      const { default: handler } = await import("./api/ai/classify");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[AI Classify Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 8. AI Audit
  app.get("/api/ai/audit", async (req, res) => {
    try {
      const { default: handler } = await import("./api/ai/audit");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[AI Audit Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 9. AI Copilot
  app.post("/api/ai/copilot", async (req, res) => {
    try {
      const { default: handler } = await import("./api/ai/copilot");
      await handler(req as any, res as any);
    } catch (error) {
      console.error("[AI Copilot Error]", error);
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
