import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

async function run() {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  
  const adminApp = initializeApp({
    credential: applicationDefault(),
    projectId: firebaseConfig.projectId,
  });

  const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

  console.log("=== ALL COLLECTION IDS ===");
  const collections = await db.listCollections();
  for (const col of collections) {
    const snap = await col.get();
    console.log(`Collection '${col.id}': ${snap.size} documents`);
    if (snap.size > 0) {
      console.log(`  Sample doc of '${col.id}':`, JSON.stringify(snap.docs[0].data()).slice(0, 300));
    }
  }
}

run().catch(console.error);
