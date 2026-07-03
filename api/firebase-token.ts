import type { Request, Response } from "express";
import { initializeApp, getApps, applicationDefault, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

let adminApp: any = null;

if (!getApps()?.length) {
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    let projectId = process.env.FIREBASE_PROJECT_ID;
    
    try {
      if (fs.existsSync(configPath)) {
        const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
        if (!projectId) projectId = firebaseConfig.projectId;
      }
    } catch (e) {
      console.log("[Firebase Token Init] Warning: Could not read firebase-applet-config.json");
    }

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: projectId || "hirenest-os",
      });
    }
  } catch (error) {
    console.error("Firebase initialization error", error);
  }
} else {
  adminApp = getApps()[0];
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    if (!adminApp) {
      return res.status(500).json({ error: "Firebase Admin not initialized" });
    }

    let user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing token" });
    }

    const customClaims = {
      role: user.role || "viewer",
      email: user.email,
    };

    const firebaseToken = await getAdminAuth(adminApp).createCustomToken(user.id, customClaims);
    res.status(200).json({ firebaseToken });
  } catch (error: any) {
    console.error("[FIREBASE TOKEN ERROR] Failed creating Firebase custom token:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
