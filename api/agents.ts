import { VercelRequest, VercelResponse } from "@vercel/node";
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
dotenv.config();

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action } = req.body;

  if (action === "vendor_broadcast") {
    try {
      if (!db) throw new Error("Database not initialized");

      const { requirementId } = req.body;

      if (!requirementId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // 1. Get requirement
      const reqRef = await db.collection("jobs").doc(requirementId).get();
      if (!reqRef.exists) {
        return res.status(404).json({ error: "Requirement not found" });
      }
      
      const requirementTitle = reqRef.data()?.title || "Requirement";

      // 2. Fetch active vendors
      const vendorsQuery = await db.collection("clients").where("isVendor", "==", true).get();
      const vendors = vendorsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 3. For each vendor, create vendor_broadcasts entry
      const batch = db.batch();
      let sentCount = 0;

      for (const vendor of vendors) {
        const broadcastRef = db.collection("vendor_broadcasts").doc();
        batch.set(broadcastRef, {
          broadcastId: `BRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          requirementId,
          requirementTitle,
          channel: "whatsapp",
          vendorId: vendor.id,
          vendorName: (vendor as any).name || (vendor as any).company,
          sentAt: new Date().toISOString(),
          status: "sent",
          source: "mailos"
        });
        
        sentCount++;
      }

      // 4. Create Activity Ledger Entry
      const activityRef = db.collection("activity_ledger").doc();
      batch.set(activityRef, {
        entityType: "requirement_broadcast",
        entityId: requirementId,
        event: "broadcast_sent",
        performedBy: "vendor_broadcast_agent",
        timestamp: new Date().toISOString(),
        metadata: {
          vendorsTargeted: sentCount,
          channel: "whatsapp"
        }
      });

      // 5. Update agent_activities
      const agentRef = db.collection("agent_activities").doc();
      batch.set(agentRef, {
        agent: "Vendor Broadcast Agent",
        status: `Broadcast to ${sentCount} vendors via WhatsApp.`,
        state: "completed",
        timestamp: new Date().toISOString(),
        metadata: {
          requirementId,
          sentCount
        }
      });
      
      // Update requirement metrics
      const requirementUpdateRef = db.collection("jobs").doc(requirementId);
      batch.update(requirementUpdateRef, {
         broadcastsSent: (reqRef.data()?.broadcastsSent || 0) + sentCount
      });

      await batch.commit();

      return res.status(200).json({ success: true, count: sentCount });
    } catch (e: any) {
      console.error("Vendor Broadcast Error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: "Invalid action" });
}
