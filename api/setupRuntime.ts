import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { AgentRuntime } from "../src/runtime/AgentRuntime";

dotenv.config();

export function setupAgentRuntime() {
  let adminApp: any = null;

  if (!getApps()?.length) {
    try {
      const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
      let firebaseConfig = { projectId: process.env.FIREBASE_PROJECT_ID, firestoreDatabaseId: undefined };
      if (fs.existsSync(configPath)) {
        firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }
      
      const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

      if (projectId && clientEmail && privateKey) {
        adminApp = initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });
      } else if (projectId) {
        adminApp = initializeApp({
          credential: applicationDefault(),
          projectId: projectId,
        });
      }
    } catch (error) {
      console.error("[AgentRuntime] Firebase initialization error", error);
    }
  } else {
    adminApp = getApps()[0];
  }

  if (adminApp) {
    try {
      let db;
      try {
        const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
        if (fs.existsSync(configPath)) {
            const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
            db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
        } else {
            db = getFirestore(adminApp);
        }
      } catch(err) {
        db = getFirestore(adminApp);
      }
      const runtime = new AgentRuntime(db);
      runtime.start();
    } catch (err) {
      console.error("[AgentRuntime] Failed to start:", err);
    }
  }
}
