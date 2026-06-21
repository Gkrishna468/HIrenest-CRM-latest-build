import { VercelRequest, VercelResponse } from "@vercel/node";
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
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

  const { action } = req.query;

  if (action === "submitVendorCandidate") {
    try {
      if (!db) throw new Error("Database not initialized");

      const { candidateHash, vendorId, candidateName, identityData } = req.body;

      if (!candidateHash || !vendorId || !candidateName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check candidateOwnership
      const ownershipRef = db.collection("candidateOwnership");
      const existingQuery = await ownershipRef.where("candidateHash", "==", candidateHash).get();

      if (!existingQuery.empty) {
        const existing = existingQuery.docs[0].data();
        if (existing.vendorId !== vendorId) {
          return res.status(409).json({ 
            error: "Candidate Ownership Conflict", 
            message: `This profile is already owned by another entity across our network.` 
          });
        } else {
          return res.status(409).json({ 
            error: "Duplicate Submission", 
            message: `You have already claimed ownership of this profile.` 
          });
        }
      }

      // Validate done - create ownership
      const payload = {
        candidateHash,
        vendorId,
        candidateName,
        createdAt: new Date().toISOString(),
        source: "vendor",
        identityData,
      };

      await ownershipRef.add(payload);
      
      // We can also create a candidatePool record or rely on DataContext's addCandidate.
      const candRef = await db.collection("candidates").add({
        name: candidateName,
        vendorId: vendorId, // Add standard vendorId mapping
        vendor_company_id: vendorId,
        stage: "submission", // Update to submission stage directly for vendor flows
        source: "vendor_submit",
        created_at: new Date().toISOString(),
        ...identityData
      });

      // Sprint 4: Add to submission_ledger
      await db.collection("submission_ledger").add({
        requirementId: "UNKNOWN", // In a real flow, the vendor submits against a specific req
        candidateId: candRef.id,
        vendorId: vendorId,
        ownershipHash: candidateHash,
        submittedAt: new Date().toISOString(),
        status: "submitted"
      });

      // Sprint 4: Add to activity_ledger
      await db.collection("activity_ledger").add({
        entityType: "candidate_submission",
        entityId: candRef.id,
        event: "candidate_submitted",
        performedBy: vendorId,
        timestamp: new Date().toISOString(),
        metadata: {
          vendorId,
          candidateHash
        }
      });

      return res.status(200).json({ success: true, candidateId: candRef.id });

    } catch (e: any) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: "Invalid action" });
}
