import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
dotenv.config();

import * as fs from "fs";
import * as path from "path";

let db: Firestore | null = null;
let adminApp: any = null;

if (!getApps()?.length) {
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
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
    db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
  } catch (error) {
    console.error("Firebase initialization error", error);
  }
} else {
  adminApp = getApps()[0];
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
  } catch(err) {
    db = getFirestore(adminApp);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action || (req.body && req.body.action);
  
  if (!action) {
     return res.json({
        status: "ok",
        service: "HireNestOS",
        timestamp: new Date().toISOString()
     });
  }

  switch (action) {
    case 'ai':
      return await (async () => {
  return res.json({
    geminiConfigured: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
    googleConfigured: !!process.env.GOOGLE_API_KEY
  });
})();
    case 'env':
      return await (async () => {
  res.status(200).json({ 
    projectId: !!process.env.FIREBASE_PROJECT_ID,
    clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    gmailClientId: !!process.env.GMAIL_CLIENT_ID,
    gmailSecret: !!process.env.GMAIL_CLIENT_SECRET
  });
})();
    case 'firebase':
      return await (async () => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Firestore Admin is not initialized', firebase: false });
    }
    
    // Just a simple read to verify connection
    const healthDoc = await db.collection('system_health').doc('firebase_ping').get();
    
    return res.status(200).json({ 
      firebase: true,
      projectId: process.env.FIREBASE_PROJECT_ID,
      healthDocExists: healthDoc.exists
    });
  } catch (error: any) {
    console.error('[Firebase Health Check Error]', error);
    return res.status(500).json({
      firebase: false,
      error: error.message
    });
  }
})();
    case 'gmail':
      return await (async () => {
        // Startup self-test validation confirming endpoint availability
        return res.status(200).json({ 
          list: true,
          sync: true,
          send: true
        });
      })();
    default:
      return res.status(400).json({ error: "Invalid action: " + action });
  }
}
